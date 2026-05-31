import * as THREE from "three"
import { MAX_BEVEL_SEGMENTS } from "./SvgSceneUtils"
import { finiteNumber, minContourDimension } from "./SvgGeometry"
import type { SvgCanvasProps } from "./SvgTypes"

export type SvgExtrudeBaseSettings = {
  depth: number
  bevelSize: number
  bevelThickness: number
  bevelSegments: number
  curveSegments: number
}

export type SafeShapeExtrudeSettings = {
  shapeDepth: number
  bevelSize: number
  bevelThickness: number
  bevelEnabled: boolean
}

export const svgExtrudeBaseSettings = (
  props: SvgCanvasProps
): SvgExtrudeBaseSettings => ({
  depth: Math.max(0.02, finiteNumber(props.extrusionDepth, 1)),
  bevelSize: Math.max(0, finiteNumber(props.bevelSize, 0)),
  bevelThickness: Math.max(0, finiteNumber(props.bevelThickness, 0)),
  bevelSegments: Math.max(
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
})

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
  const bevelContourLimit = hasHoles
    ? contourMinDim * 0.025
    : shapeMinDim * 0.05
  const bevelDepthLimit = hasHoles ? shapeDepth * 0.12 : shapeDepth * 0.18
  const safeBevelSize = bevelEnabled
    ? Math.max(
        0.001,
        Math.min(base.bevelSize, bevelContourLimit, bevelDepthLimit)
      )
    : 0
  const safeBevelThickness = bevelEnabled
    ? Math.max(
        0.001,
        Math.min(
          base.bevelThickness,
          hasHoles ? contourMinDim * 0.04 : shapeMinDim * 0.08,
          hasHoles ? shapeDepth * 0.16 : shapeDepth * 0.25
        )
      )
    : 0

  return {
    shapeDepth,
    bevelSize: safeBevelSize,
    bevelThickness: safeBevelThickness,
    bevelEnabled:
      bevelEnabled && safeBevelSize > 0.001 && safeBevelThickness > 0.001,
  }
}
