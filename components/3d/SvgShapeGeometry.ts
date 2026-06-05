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

  const t = Math.max(
    0,
    Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / lengthSq)
  )
  return Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t))
}

const contourDistance = (x: number, y: number, contours: THREE.Vector2[][]) => {
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

const pointInContour = (x: number, y: number, contour: THREE.Vector2[]) => {
  let inside = false
  for (
    let current = 0, previous = contour.length - 1;
    current < contour.length;
    previous = current, current += 1
  ) {
    const currentPoint = contour[current]
    const previousPoint = contour[previous]
    const crosses =
      currentPoint.y > y !== previousPoint.y > y &&
      x <
        ((previousPoint.x - currentPoint.x) * (y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x
    if (crosses) inside = !inside
  }
  return inside
}

const pointInShapeFill = (
  x: number,
  y: number,
  outerContour: THREE.Vector2[],
  holeContours: THREE.Vector2[][]
) =>
  pointInContour(x, y, outerContour) &&
  !holeContours.some((hole) => pointInContour(x, y, hole))

const cloneAsNonIndexed = (geometry: THREE.BufferGeometry) => {
  const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry.clone()
  nonIndexed.deleteAttribute("uv")
  return nonIndexed
}

const mergePositionNormalGeometries = (
  geometries: THREE.BufferGeometry[]
): THREE.BufferGeometry => {
  const positions: number[] = []
  const normals: number[] = []

  geometries.forEach((sourceGeometry) => {
    const geometry = cloneAsNonIndexed(sourceGeometry)
    const position = geometry.getAttribute("position")
    const normal = geometry.getAttribute("normal")

    for (let index = 0; index < position.count; index += 1) {
      positions.push(
        position.getX(index),
        position.getY(index),
        position.getZ(index)
      )
      if (normal) {
        normals.push(normal.getX(index), normal.getY(index), normal.getZ(index))
      } else {
        normals.push(0, 0, 1)
      }
    }

    geometry.dispose()
  })

  const merged = new THREE.BufferGeometry()
  merged.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  )
  merged.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3))
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
}

const createRaisedCenterCapGeometry = (
  shape: THREE.Shape,
  shapeSize: THREE.Vector2,
  shapeDepth: number,
  baseExtrude: SvgExtrudeBaseSettings
) => {
  if (!baseExtrude.crownEnabled || baseExtrude.crownHeight <= 0) return null

  const extractedPoints = shape.extractPoints(baseExtrude.curveSegments)
  const outerContour = extractedPoints.shape.filter(
    (point) => Number.isFinite(point.x) && Number.isFinite(point.y)
  )
  const holeContours = extractedPoints.holes
    .map((hole) =>
      hole.filter(
        (point) => Number.isFinite(point.x) && Number.isFinite(point.y)
      )
    )
    .filter((hole) => hole.length > 2)
  const contours = [outerContour, ...holeContours].filter(
    (points) => points.length > 2
  )
  if (outerContour.length < 3 || contours.length === 0) return null

  const shapeBox = new THREE.Box2().setFromPoints(contours.flat())
  const boxSize = new THREE.Vector2()
  shapeBox.getSize(boxSize)
  if (boxSize.x <= 0 || boxSize.y <= 0) return null

  const maxAxis = Math.max(shapeSize.x, shapeSize.y)
  const targetCells = Math.max(
    18,
    Math.min(
      58,
      Math.round(maxAxis / Math.max(0.28, baseExtrude.crownWidth * 0.32))
    )
  )
  const columns = Math.max(4, Math.round((boxSize.x / maxAxis) * targetCells))
  const rows = Math.max(4, Math.round((boxSize.y / maxAxis) * targetCells))
  const stepX = boxSize.x / columns
  const stepY = boxSize.y / rows

  type CrownSample = {
    x: number
    y: number
    inside: boolean
    distance: number
    vertexIndex: number
  }

  const samples: CrownSample[][] = []
  let maxDistance = 0
  for (let yIndex = 0; yIndex <= rows; yIndex += 1) {
    const sampleRow: CrownSample[] = []
    const y = shapeBox.min.y + stepY * yIndex
    for (let xIndex = 0; xIndex <= columns; xIndex += 1) {
      const x = shapeBox.min.x + stepX * xIndex
      const inside = pointInShapeFill(x, y, outerContour, holeContours)
      const distance = inside ? contourDistance(x, y, contours) : 0
      if (inside) maxDistance = Math.max(maxDistance, distance)
      sampleRow.push({ x, y, inside, distance, vertexIndex: -1 })
    }
    samples.push(sampleRow)
  }
  if (maxDistance <= 0) return null

  const positions: number[] = []
  samples.forEach((sampleRow) => {
    sampleRow.forEach((sample) => {
      if (!sample.inside) return
      sample.vertexIndex = positions.length / 3
      const normalizedDistance = sample.distance / maxDistance
      const ridge = Math.pow(smoothstep(0, 1, normalizedDistance), 1.35)
      const z = shapeDepth + 0.002 + ridge * baseExtrude.crownHeight
      positions.push(sample.x, sample.y, z)
    })
  })

  const indices: number[] = []
  const addTriangle = (a: CrownSample, b: CrownSample, c: CrownSample) => {
    if (
      !a.inside ||
      !b.inside ||
      !c.inside ||
      a.vertexIndex < 0 ||
      b.vertexIndex < 0 ||
      c.vertexIndex < 0
    )
      return
    const centroidX = (a.x + b.x + c.x) / 3
    const centroidY = (a.y + b.y + c.y) / 3
    if (!pointInShapeFill(centroidX, centroidY, outerContour, holeContours))
      return
    indices.push(a.vertexIndex, b.vertexIndex, c.vertexIndex)
  }

  for (let yIndex = 0; yIndex < rows; yIndex += 1) {
    for (let xIndex = 0; xIndex < columns; xIndex += 1) {
      const topLeft = samples[yIndex][xIndex]
      const topRight = samples[yIndex][xIndex + 1]
      const bottomLeft = samples[yIndex + 1][xIndex]
      const bottomRight = samples[yIndex + 1][xIndex + 1]
      addTriangle(topLeft, topRight, bottomLeft)
      addTriangle(topRight, bottomRight, bottomLeft)
    }
  }

  if (positions.length === 0 || indices.length === 0) return null

  const crownGeometry = new THREE.BufferGeometry()
  crownGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  )
  crownGeometry.setIndex(indices)
  crownGeometry.computeVertexNormals()
  crownGeometry.computeBoundingBox()
  crownGeometry.computeBoundingSphere()
  return crownGeometry
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

  const crownGeometry = createRaisedCenterCapGeometry(
    shape,
    shapeSize,
    extrude.shapeDepth,
    baseExtrude
  )
  if (crownGeometry) {
    const mergedGeometry = mergePositionNormalGeometries([
      geometry,
      crownGeometry,
    ])
    geometry.dispose()
    crownGeometry.dispose()
    geometry = mergedGeometry
  }

  geometry.translate(0, 0, -extrude.shapeDepth / 2)

  return { geometry, extrude }
}
