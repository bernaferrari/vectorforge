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

const appendVertex = (
  positions: number[],
  position: THREE.BufferAttribute,
  index: number
) => {
  positions.push(
    position.getX(index),
    position.getY(index),
    position.getZ(index)
  )
}

const appendPoint = (positions: number[], point: THREE.Vector3) => {
  positions.push(point.x, point.y, point.z)
}

const roofCutCaps = (
  geometry: THREE.BufferGeometry,
  extrude: SafeShapeExtrudeSettings,
  baseExtrude: SvgExtrudeBaseSettings
) => {
  if (!baseExtrude.crownEnabled || extrude.bevelSegments !== 1) return geometry

  const source = geometry.index ? geometry.toNonIndexed() : geometry.clone()
  source.computeVertexNormals()

  const position = source.getAttribute("position") as THREE.BufferAttribute
  const normal = source.getAttribute("normal") as THREE.BufferAttribute
  const positions: number[] = []
  const lift = Math.max(
    0.02,
    Math.min(
      extrude.shapeDepth * 0.22,
      extrude.bevelThickness * 1.25,
      baseExtrude.crownHeight * 0.45
    )
  )

  for (let index = 0; index < position.count; index += 3) {
    const normalZ =
      (normal.getZ(index) + normal.getZ(index + 1) + normal.getZ(index + 2)) / 3

    if (Math.abs(normalZ) < 0.96) {
      appendVertex(positions, position, index)
      appendVertex(positions, position, index + 1)
      appendVertex(positions, position, index + 2)
      continue
    }

    const outward = normalZ > 0 ? 1 : -1
    const direction = baseExtrude.crownProfile === "inset" ? -outward : outward
    const center = new THREE.Vector3(
      (position.getX(index) +
        position.getX(index + 1) +
        position.getX(index + 2)) /
        3,
      (position.getY(index) +
        position.getY(index + 1) +
        position.getY(index + 2)) /
        3,
      (position.getZ(index) +
        position.getZ(index + 1) +
        position.getZ(index + 2)) /
        3 +
        direction * lift
    )

    appendVertex(positions, position, index)
    appendVertex(positions, position, index + 1)
    appendPoint(positions, center)
    appendVertex(positions, position, index + 1)
    appendVertex(positions, position, index + 2)
    appendPoint(positions, center)
    appendVertex(positions, position, index + 2)
    appendVertex(positions, position, index)
    appendPoint(positions, center)
  }

  source.dispose()

  const roofed = new THREE.BufferGeometry()
  roofed.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  )
  roofed.computeVertexNormals()
  roofed.computeBoundingBox()
  roofed.computeBoundingSphere()
  return roofed
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

  if (baseExtrude.crownEnabled && !isSlashOverlay) {
    const roofed = roofCutCaps(geometry, extrude, baseExtrude)
    if (roofed !== geometry) {
      geometry.dispose()
      geometry = roofed
    }
  }

  geometry.translate(0, 0, -extrude.shapeDepth / 2)

  return { geometry, extrude }
}
