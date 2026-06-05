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
  crownHeight: number
  crownWidth: number
  crownInset: number
}

export type SafeShapeExtrudeSettings = {
  shapeDepth: number
  bevelSize: number
  bevelThickness: number
  bevelEnabled: boolean
}

export const svgExtrudeBaseSettings = (
  props: SvgCanvasProps
): SvgExtrudeBaseSettings => {
  const forceCrown = isGraphiteCutPreset(props.materialPreset)
  const bevelSize = Math.max(
    forceCrown ? 0.2 : 0,
    finiteNumber(props.bevelSize, 0)
  )
  const bevelThickness = Math.max(
    forceCrown ? 0.32 : 0,
    finiteNumber(props.bevelThickness, 0)
  )
  return {
    depth: Math.max(0.02, finiteNumber(props.extrusionDepth, 1)),
    bevelSize,
    bevelThickness,
    bevelSegments: Math.max(
      forceCrown ? 2 : 0,
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
    crownHeight: forceCrown
      ? Math.max(0.55, bevelThickness * 2.1, bevelSize * 2.4)
      : 0,
    crownWidth: forceCrown ? Math.max(0.9, bevelSize * 7) : 0,
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
  const shapeDepth = isSlashOverlay
    ? Math.max(0.08, base.depth * slashDepthRatio)
    : Math.max(0.02, base.depth * depthMultiplier)
  const bevelContourLimit = base.crownEnabled
    ? hasHoles
      ? Math.min(shapeMinDim * 0.12, contourMinDim * 0.32)
      : shapeMinDim * 0.12
    : hasHoles
      ? contourMinDim * 0.025
      : shapeMinDim * 0.05
  const bevelDepthLimit = base.crownEnabled
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
            base.crownEnabled
              ? hasHoles
                ? Math.min(shapeMinDim * 0.16, contourMinDim * 0.38)
                : shapeMinDim * 0.16
              : hasHoles
                ? contourMinDim * 0.04
                : shapeMinDim * 0.08,
            base.crownEnabled
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
    bevelEnabled:
      (bevelEnabled || base.bevelSize > 0 || base.bevelThickness > 0) &&
      safeBevelSize > 0.001 &&
      safeBevelThickness > 0.001,
  }
}
