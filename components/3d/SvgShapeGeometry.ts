import * as THREE from "three"
import { containsInvalidPositions } from "./SvgGeometry"
import {
  safeShapeExtrudeSettings,
  type SafeShapeExtrudeSettings,
  type SvgExtrudeBaseSettings,
} from "./SvgExtrudeSettings"

export type SvgShapeGeometryResult = {
  geometry: THREE.ExtrudeGeometry
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

const pointSegmentDistance = (
  x: number,
  y: number,
  a: THREE.Vector2,
  b: THREE.Vector2
) => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy
  if (lengthSq <= 0) return Math.hypot(x - a.x, y - a.y)

  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / lengthSq))
  return Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t))
}

const contourDistance = (
  x: number,
  y: number,
  contours: THREE.Vector2[][]
) => {
  let nearest = Infinity
  contours.forEach((points) => {
    for (let index = 0; index < points.length; index += 1) {
      const a = points[index]
      const b = points[(index + 1) % points.length]
      nearest = Math.min(nearest, pointSegmentDistance(x, y, a, b))
    }
  })
  return nearest
}

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

const applyRaisedCrown = (
  geometry: THREE.ExtrudeGeometry,
  shape: THREE.Shape,
  baseExtrude: SvgExtrudeBaseSettings
) => {
  if (!baseExtrude.crownEnabled || baseExtrude.crownHeight <= 0) return

  const position = geometry.getAttribute("position")
  const normal = geometry.getAttribute("normal")
  if (!position || !normal) return

  const contours = [shape.getPoints(48), ...shape.holes.map((hole) => hole.getPoints(48))]
    .filter((points) => points.length > 2)
  if (contours.length === 0) return
  const shapeBox = new THREE.Box2().setFromPoints(contours.flat())
  const shapeCenter = new THREE.Vector2()
  shapeBox.getCenter(shapeCenter)

  let maxZ = -Infinity
  for (let index = 0; index < position.count; index += 1) {
    maxZ = Math.max(maxZ, position.getZ(index))
  }

  const crownWidth = Math.max(0.001, baseExtrude.crownWidth)
  for (let index = 0; index < position.count; index += 1) {
    const z = position.getZ(index)
    const normalZ = normal.getZ(index)
    if (z < maxZ - 0.001 || normalZ < 0.45) continue

    const x = position.getX(index)
    const y = position.getY(index)
    const distance = contourDistance(x, y, contours)
    const crown = smoothstep(0, crownWidth, distance)
    const inset = baseExtrude.crownInset * (1 - crown * 0.35)
    position.setX(index, shapeCenter.x + (x - shapeCenter.x) * (1 - inset))
    position.setY(index, shapeCenter.y + (y - shapeCenter.y) * (1 - inset))
    position.setZ(index, z + crown * baseExtrude.crownHeight)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
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

  let geometry: THREE.ExtrudeGeometry
  try {
    geometry = new THREE.ExtrudeGeometry(shape, {
      depth: extrude.shapeDepth,
      bevelEnabled: extrude.bevelEnabled,
      bevelThickness: extrude.bevelThickness,
      bevelSize: extrude.bevelSize,
      bevelSegments: baseExtrude.bevelSegments,
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

  applyRaisedCrown(geometry, shape, baseExtrude)
  geometry.translate(0, 0, -extrude.shapeDepth / 2)

  return { geometry, extrude }
}
