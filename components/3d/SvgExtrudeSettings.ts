import * as THREE from "three"
import { MAX_BEVEL_SEGMENTS } from "./SvgSceneUtils"
import { finiteNumber, minContourDimension } from "./SvgGeometry"
import { isGraphiteCutPreset } from "./MaterialPresets"
import type { SvgCanvasProps } from "./SvgTypes"

export type SvgExtrudeBaseSettings = {
  depth: number
  bevelSize: number
  bevelThickness: number
  bevelSegments: number
  curveSegments: number
  crownEnabled: boolean
  crownProfile: "center" | "inset" | "outer"
  crownAmount: number
  crownHeight: number
  crownWidth: number
  crownInset: number
}

export type SafeShapeExtrudeSettings = {
  shapeDepth: number
  bevelSize: number
  bevelThickness: number
  bevelSegments: number
  bevelEnabled: boolean
}

export const svgExtrudeBaseSettings = (
  props: SvgCanvasProps
): SvgExtrudeBaseSettings => {
  const forceCrown = isGraphiteCutPreset(props.materialPreset)
  const crownProfile =
    props.materialPreset === "cutInner"
      ? "inset"
      : props.materialPreset === "cutOuter"
        ? "outer"
        : "center"
  const requestedBevelSize = finiteNumber(props.bevelSize, 0)
  const requestedBevelThickness = finiteNumber(props.bevelThickness, 0)
  const crownAmount = forceCrown
    ? Math.max(
        0,
        Math.min(
          1,
          (requestedBevelSize / 0.2 + requestedBevelThickness / 0.36) / 2
        )
      )
    : 0
  const bevelSize = Math.max(
    forceCrown ? 1.8 + crownAmount * 4.2 : 0,
    requestedBevelSize
  )
  const bevelThickness = Math.max(
    forceCrown ? 0.85 + crownAmount * 1.65 : 0,
    requestedBevelThickness
  )
  const crownHeight = forceCrown
    ? crownProfile === "outer"
      ? Math.max(0.9, crownAmount * 2.2, bevelThickness * 2.8)
      : crownProfile === "inset"
        ? Math.max(0.82, crownAmount * 1.9, bevelThickness * 2.5)
        : Math.max(0.72, crownAmount * 1.65, bevelThickness * 2.2)
    : 0
  const crownWidth = forceCrown
    ? Math.max(1.25, 0.9 + crownAmount * 4.2, bevelSize * 8)
    : 0
  return {
    depth: Math.max(0.02, finiteNumber(props.extrusionDepth, 1)),
    bevelSize,
    bevelThickness,
    bevelSegments: forceCrown
      ? 1
      : Math.max(
          0,
          Math.min(
            MAX_BEVEL_SEGMENTS,
            Math.round(finiteNumber(props.bevelSegments, 1))
          )
        ),
    curveSegments: Math.max(
      8,
      Math.min(
        64,
        Math.round(
          1 / Math.max(0.015, finiteNumber(props.geometryQuality, 0.045))
        )
      )
    ),
    crownEnabled: forceCrown,
    crownProfile,
    crownAmount,
    crownHeight,
    crownWidth,
    crownInset: forceCrown
      ? Math.max(0.06, Math.min(0.16, bevelSize * 0.7))
      : 0,
  }
}

export const safeShapeExtrudeSettings = ({
  shape,
  shapeSize,
  base,
  depthMultiplier,
  bevelEnabled,
  slashDepthRatio,
  isSlashOverlay,
}: {
  shape: THREE.Shape
  shapeSize: THREE.Vector2
  base: SvgExtrudeBaseSettings
  depthMultiplier: number
  bevelEnabled: boolean
  slashDepthRatio: number
  isSlashOverlay: boolean
}): SafeShapeExtrudeSettings => {
  const shapeMinDim = Math.max(
    0.1,
    Math.min(Math.abs(shapeSize.x), Math.abs(shapeSize.y))
  )
  const contourMinDim = Math.max(0.1, minContourDimension(shape) || shapeMinDim)
  const hasHoles = shape.holes.length > 0
  const useCrownBevel = base.crownEnabled && !isSlashOverlay
  const shapeDepth = isSlashOverlay
    ? Math.max(0.08, base.depth * slashDepthRatio)
    : Math.max(0.02, base.depth * depthMultiplier)
  const medialContourLimit = Math.max(0.001, contourMinDim * 0.49)
  const medialShapeLimit = Math.max(0.001, shapeMinDim * 0.49)
  const bevelContourLimit = useCrownBevel
    ? hasHoles
      ? Math.min(medialShapeLimit, medialContourLimit)
      : medialShapeLimit
    : hasHoles
      ? contourMinDim * 0.025
      : shapeMinDim * 0.05
  const bevelDepthLimit = useCrownBevel
    ? shapeDepth * 0.38
    : hasHoles
      ? shapeDepth * 0.12
      : shapeDepth * 0.18
  const safeBevelSize =
    bevelEnabled || base.bevelSize > 0
      ? Math.max(
          0.001,
          Math.min(base.bevelSize, bevelContourLimit, bevelDepthLimit)
        )
      : 0
  const safeBevelThickness =
    bevelEnabled || base.bevelThickness > 0
      ? Math.max(
          0.001,
          Math.min(
            base.bevelThickness,
            useCrownBevel
              ? hasHoles
                ? Math.min(medialShapeLimit, medialContourLimit)
                : medialShapeLimit
              : hasHoles
                ? contourMinDim * 0.04
                : shapeMinDim * 0.08,
            useCrownBevel
              ? shapeDepth * 0.45
              : hasHoles
                ? shapeDepth * 0.16
                : shapeDepth * 0.25
          )
        )
      : 0

  return {
    shapeDepth,
    bevelSize: safeBevelSize,
    bevelThickness: safeBevelThickness,
    bevelSegments: useCrownBevel ? 1 : base.bevelSegments,
    bevelEnabled:
      (bevelEnabled || base.bevelSize > 0 || base.bevelThickness > 0) &&
      safeBevelSize > 0.001 &&
      safeBevelThickness > 0.001,
  }
}
