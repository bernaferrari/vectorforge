import { useMemo } from "react"
import { GradientType } from "../3d/SvgTypes"
import { FillMode, clampNumber } from "./EditorModel"
import { makeFillStops } from "./FillStopModel"
import {
  DEFAULT_TRANSITION_END,
  DEFAULT_TRANSITION_START,
  FillGradientType,
  FillKeyframe,
  FillStop,
  ShapeStop,
  applyEasing,
  interpolateFillKeyframes,
  shapeTransitionType,
} from "./TimelineModel"

type FillRenderValue = {
  color: string
  colorSecondary: string
  gradientType?: FillGradientType
  stops?: FillStop[]
}

type MorphState = {
  from: ShapeStop
  to: ShapeStop
  progress: number
}

type MorphRenderStateInput = {
  shapes: ShapeStop[]
  currentTime: number
  fillColor: string
  fillColorSecondary: string
  fillGradientType: FillGradientType
  fillStops?: FillStop[]
  fillKeyframes: FillKeyframe[]
  fillMode: FillMode
  enableGradient: boolean
}

const EMPTY_SHAPE: ShapeStop = {
  id: "empty",
  time: 0,
  iconId: "",
  iconName: "Shape",
  svgContent: "",
  color: "#ffffff",
  colorSecondary: "#ffffff",
  fillGradientType: "linear",
  fillStops: undefined,
  fillKeyframes: [],
  pathOverrides: [],
  easing: "ease-in-out",
  transitionType: "fade",
  wipeDirection: { x: 0, y: 0 },
}

const deriveMorph = (
  sortedShapes: ShapeStop[],
  currentTime: number
): MorphState => {
  if (sortedShapes.length === 0) {
    return { from: EMPTY_SHAPE, to: EMPTY_SHAPE, progress: 0 }
  }

  const first = sortedShapes[0]
  const last = sortedShapes[sortedShapes.length - 1]

  if (sortedShapes.length === 1) return { from: first, to: first, progress: 0 }

  // Keep the same two icon meshes mounted outside the transition window.
  // Returning first->first before the window and last->last after it forces
  // SvgCanvas to rebuild geometry twice per loop, which shows up as playback
  // stutter. Holding the surrounding pair and clamping progress avoids that.
  if (currentTime <= first.time)
    return { from: first, to: sortedShapes[1], progress: 0 }
  if (currentTime >= last.time) {
    return {
      from: sortedShapes[sortedShapes.length - 2],
      to: last,
      progress: 1,
    }
  }

  let index = 0
  while (
    index < sortedShapes.length - 1 &&
    !(
      currentTime >= sortedShapes[index].time &&
      currentTime <= sortedShapes[index + 1].time
    )
  ) {
    index++
  }

  const from = sortedShapes[index]
  const to = sortedShapes[index + 1]
  const span = to.time - from.time
  const gapProgress = span > 0 ? (currentTime - from.time) / span : 1
  const start = from.transitionStart ?? DEFAULT_TRANSITION_START
  const end = from.transitionEnd ?? DEFAULT_TRANSITION_END
  const windowProgress =
    gapProgress <= start
      ? 0
      : gapProgress >= end
        ? 1
        : (gapProgress - start) / Math.max(1e-6, end - start)

  const transitionType = shapeTransitionType(from)
  const progress =
    transitionType === "cut"
      ? gapProgress < start
        ? 0
        : 1
      : clampNumber(applyEasing(from.easing, windowProgress), 0, 1)

  return { from, to, progress }
}

const solidStops = (color: string) => makeFillStops(color, color, true)

const getRenderFill = (
  fill: FillRenderValue,
  fillMode: FillMode,
  fallbackGradientType: FillGradientType
) => {
  const color = fill.color
  const colorSecondary = fill.colorSecondary
  const gradientType = fill.gradientType ?? fallbackGradientType
  const isSolid = fillMode === "solid"

  return {
    color,
    colorSecondary: isSolid ? color : colorSecondary,
    stops: isSolid ? solidStops(color) : fill.stops,
    gradientType: isSolid ? ("linear" as GradientType) : gradientType,
  }
}

const shapeFillValue = ({
  shape,
  currentTime,
  fallback,
  fillKeyframes,
}: {
  shape: ShapeStop
  currentTime: number
  fallback: FillRenderValue
  fillKeyframes: FillKeyframe[]
}) =>
  interpolateFillKeyframes(
    currentTime,
    {
      color: shape.color || fallback.color,
      colorSecondary: shape.colorSecondary || fallback.colorSecondary,
      gradientType: shape.fillGradientType ?? fallback.gradientType,
      stops: shape.fillStops ?? fallback.stops,
    },
    shape.fillKeyframes?.length ? shape.fillKeyframes : fillKeyframes
  )

export const useMorphRenderState = ({
  shapes,
  currentTime,
  fillColor,
  fillColorSecondary,
  fillGradientType,
  fillStops,
  fillKeyframes,
  fillMode,
  enableGradient,
}: MorphRenderStateInput) => {
  const sortedShapes = useMemo(
    () => [...shapes].sort((a, b) => a.time - b.time),
    [shapes]
  )

  const morph = useMemo(
    () => deriveMorph(sortedShapes, currentTime),
    [currentTime, sortedShapes]
  )

  const selectedShapeFillValue = interpolateFillKeyframes(
    currentTime,
    {
      color: fillColor,
      colorSecondary: fillColorSecondary,
      gradientType: fillGradientType,
      stops: fillStops,
    },
    fillKeyframes
  )

  const selectedShapeFill = selectedShapeFillValue.color
  const selectedShapeFillSecondary = selectedShapeFillValue.colorSecondary
  const selectedShapeGradientType =
    selectedShapeFillValue.gradientType ?? fillGradientType
  const selectedShapeFillStops =
    selectedShapeFillValue.stops ??
    makeFillStops(
      selectedShapeFill,
      selectedShapeFillSecondary,
      fillMode === "solid"
    )

  const fallbackFill = {
    color: fillColor,
    colorSecondary: fillColorSecondary,
    gradientType: fillGradientType,
    stops: fillStops,
  }
  const fillA = shapeFillValue({
    shape: morph.from,
    currentTime,
    fallback: fallbackFill,
    fillKeyframes,
  })
  const fillB = shapeFillValue({
    shape: morph.to,
    currentTime,
    fallback: fallbackFill,
    fillKeyframes,
  })
  const renderA = getRenderFill(fillA, fillMode, fillGradientType)
  const renderB = getRenderFill(fillB, fillMode, fillGradientType)
  const transitionType = shapeTransitionType(morph.from)
  const shareOutgoingFillDuringWipe =
    transitionType === "wipe" && morph.from.id !== morph.to.id
  const renderColorB = shareOutgoingFillDuringWipe
    ? renderA.color
    : renderB.color
  const renderColorBSecondary = shareOutgoingFillDuringWipe
    ? renderA.colorSecondary
    : renderB.colorSecondary
  const renderColorBStops = shareOutgoingFillDuringWipe
    ? renderA.stops
    : renderB.stops

  return {
    sortedShapes,
    morph,
    selectedShapeFill,
    selectedShapeFillSecondary,
    selectedShapeGradientType,
    selectedShapeFillStops,
    iconAContent: morph.from.svgContent,
    iconBContent: morph.to.svgContent,
    colorA: renderA.color,
    renderColorASecondary: renderA.colorSecondary,
    renderColorAStops: renderA.stops,
    renderColorB,
    renderColorBSecondary,
    renderColorBStops,
    activeTransitionProgress: morph.progress,
    transitionType,
    wipeDirection: morph.from.wipeDirection,
    renderEnableGradient: fillMode === "solid" ? true : enableGradient,
    renderGradientType: renderA.gradientType,
  }
}
