import * as THREE from "three"
import { containsInvalidPositions } from "./SvgGeometry"
import {
  safeShapeExtrudeSettings,
  type SafeShapeExtrudeSettings,
  type SvgExtrudeBaseSettings,
} from "./SvgExtrudeSettings"

export type SvgShapeGeometryResult = {
  geometry: THREE.BufferGeometry
  extrude: SafeShapeExtrudeSettings
}

export type SvgShapeGeometryOptions = {
  shape: THREE.Shape
  shapeSize: THREE.Vector2
  baseExtrude: SvgExtrudeBaseSettings
  depthMultiplier: number
  bevelEnabled: boolean
  isSlashOverlay: boolean
  slashDepthRatio: number
}

export const createSvgShapeGeometry = ({
  shape,
  shapeSize,
  baseExtrude,
  depthMultiplier,
  bevelEnabled,
  isSlashOverlay,
  slashDepthRatio,
}: SvgShapeGeometryOptions): SvgShapeGeometryResult | null => {
  const extrude = safeShapeExtrudeSettings({
    shape,
    shapeSize,
    base: baseExtrude,
    depthMultiplier,
    bevelEnabled,
    slashDepthRatio,
    isSlashOverlay,
  })

  let geometry: THREE.BufferGeometry
  try {
    geometry = new THREE.ExtrudeGeometry(shape, {
      depth: extrude.shapeDepth,
      bevelEnabled: extrude.bevelEnabled,
      bevelThickness: extrude.bevelThickness,
      bevelSize: extrude.bevelSize,
      bevelSegments: extrude.bevelSegments,
      curveSegments: baseExtrude.curveSegments,
      steps: 1,
    })
  } catch (error) {
    console.warn("Skipping SVG shape that failed extrusion", error)
    return null
  }

  if (containsInvalidPositions(geometry)) {
    geometry.dispose()
    console.warn("Skipping SVG shape with invalid geometry positions")
    return null
  }

  geometry.translate(0, 0, -extrude.shapeDepth / 2)

  return { geometry, extrude }
}
