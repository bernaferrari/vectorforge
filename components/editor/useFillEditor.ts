import { useState } from "react"
import type { MOTION_RECIPES } from "./MotionRecipes"
import {
  type FillGradientType,
  type FillKeyframe,
  type FillStop,
  interpolateFillKeyframes,
} from "./TimelineModel"
import { upsertFillKeyframe } from "./FillEditorModel"
import {
  googleMeshFillStops,
  makeFillStops,
  normalizeFillStops,
  stopsForGradientType,
} from "./FillStopModel"
import { type FillMode, clampNumber, quantizeTimeToFrame } from "./EditorModel"

type FillRecipe = (typeof MOTION_RECIPES)[number]

type FillEditorSnapshot = {
  enableGradient: boolean
  fillMode: FillMode
  fillColor: string
  fillColorSecondary: string
  fillGradientType: FillGradientType
  fillStops?: FillKeyframe["stops"]
  fillKeyframes: FillKeyframe[]
}

export const useFillEditor = ({
  currentTime,
  duration,
  onEdit,
}: {
  currentTime: number
  duration: number
  onEdit: () => void
}) => {
  const [enableGradient, setEnableGradient] = useState<boolean>(true)
  const [fillMode, setFillMode] = useState<FillMode>("gradient")
  const [fillColor, setFillColor] = useState<string>("#4285F4")
  const [fillColorSecondary, setFillColorSecondary] =
    useState<string>("#00C796")
  const [fillGradientType, setFillGradientType] =
    useState<FillGradientType>("mesh")
  const [fillStops, setFillStops] = useState<FillStop[] | undefined>(
    googleMeshFillStops()
  )
  const [fillKeyframes, setFillKeyframes] = useState<FillKeyframe[]>([])

  const activeFillBase = {
    color: fillColor,
    colorSecondary: fillColorSecondary,
    gradientType: fillGradientType,
    stops: fillStops,
  }

  const playheadTime = () =>
    clampNumber(quantizeTimeToFrame(currentTime), 0, duration)

  const restoreFillState = (snapshot: FillEditorSnapshot) => {
    setEnableGradient(snapshot.enableGradient)
    setFillMode(snapshot.fillMode)
    setFillColor(snapshot.fillColor)
    setFillColorSecondary(snapshot.fillColorSecondary)
    setFillGradientType(snapshot.fillGradientType)
    setFillStops(snapshot.fillStops)
    setFillKeyframes(snapshot.fillKeyframes)
  }

  const applyRecipeFill = (recipe: FillRecipe) => {
    setEnableGradient(recipe.enableGradient)
    setFillMode(recipe.enableGradient ? "gradient" : "solid")
    setFillColor(recipe.colorA)
    setFillColorSecondary(
      recipe.colorASecondary ?? recipe.colorB ?? recipe.colorA
    )
    setFillGradientType(recipe.fillGradientType ?? "linear")
    setFillStops(
      recipe.id === "google-metal"
        ? googleMeshFillStops()
        : makeFillStops(
            recipe.colorA,
            recipe.colorASecondary ?? recipe.colorB ?? recipe.colorA,
            !recipe.enableGradient
          )
    )
    setFillKeyframes([])
  }

  const setGradientEnabled = (enabled: boolean) => {
    setFillMode(enabled ? "gradient" : "solid")
    setEnableGradient(enabled)
    onEdit()
  }

  const updateFillColor = (value: string, secondary = false) => {
    const time = playheadTime()
    onEdit()
    setFillKeyframes((keyframes) => {
      const activeFill = interpolateFillKeyframes(
        currentTime,
        activeFillBase,
        keyframes
      )
      const nextColor = secondary ? activeFill.color : value
      const nextColorSecondary = secondary ? value : activeFill.colorSecondary
      const nextStops = makeFillStops(
        nextColor,
        nextColorSecondary,
        fillMode === "solid",
        [
          activeFill.stops?.[0]?.position ?? 0,
          activeFill.stops?.[1]?.position ?? 1,
        ]
      )

      setFillColor(nextColor)
      setFillColorSecondary(nextStops[1].color)
      if (keyframes.length === 0) {
        setFillStops(fillMode === "gradient" ? nextStops : undefined)
        return keyframes
      }

      return upsertFillKeyframe({
        keyframes,
        time,
        patch: { stops: nextStops, gradientType: fillGradientType },
      })
    })
  }

  const updateGradientType = (gradientType: FillGradientType) => {
    const time = playheadTime()
    onEdit()
    setFillKeyframes((keyframes) => {
      const activeFill = interpolateFillKeyframes(
        currentTime,
        activeFillBase,
        keyframes
      )
      const nextStops = stopsForGradientType(
        activeFill,
        gradientType,
        fillMode === "solid"
      )
      const nextColor = nextStops[0]?.color ?? activeFill.color
      const nextColorSecondary = nextStops[1]?.color ?? nextColor

      setFillColor(nextColor)
      setFillColorSecondary(nextColorSecondary)
      setFillGradientType(gradientType)
      setFillStops(nextStops)
      if (keyframes.length === 0) return keyframes

      return upsertFillKeyframe({
        keyframes,
        time,
        patch: { stops: nextStops, gradientType },
      })
    })
  }

  const updateFillStops = (
    stops: Array<{ id?: string; color: string; position: number }>
  ) => {
    const time = playheadTime()
    const nextStops = normalizeFillStops(stops)
    if (nextStops.length === 0) return
    onEdit()
    setFillKeyframes((keyframes) => {
      setFillColor(nextStops[0]?.color ?? fillColor)
      setFillColorSecondary(
        nextStops[1]?.color ?? nextStops[0]?.color ?? fillColorSecondary
      )
      setFillStops(nextStops)
      if (keyframes.length === 0) return keyframes

      return upsertFillKeyframe({
        keyframes,
        time,
        patch: { stops: nextStops, gradientType: fillGradientType },
      })
    })
  }

  return {
    enableGradient,
    fillMode,
    fillColor,
    fillColorSecondary,
    fillGradientType,
    fillStops,
    fillKeyframes,
    setFillKeyframes,
    restoreFillState,
    applyRecipeFill,
    setGradientEnabled,
    updateFillColor,
    updateGradientType,
    updateFillStops,
  }
}
