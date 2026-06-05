import * as THREE from "three"
import { Earcut } from "three/src/extras/Earcut.js"
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

const withoutClosingPoint = (points: THREE.Vector2[]) => {
  if (points.length < 2) return points
  const first = points[0]
  const last = points[points.length - 1]
  if (first.distanceToSquared(last) < 0.000001) return points.slice(0, -1)
  return points
}

const pointInContour = (point: THREE.Vector2, contour: THREE.Vector2[]) => {
  let inside = false
  for (
    let current = 0, previous = contour.length - 1;
    current < contour.length;
    previous = current, current += 1
  ) {
    const currentPoint = contour[current]
    const previousPoint = contour[previous]
    const crosses =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x
    if (crosses) inside = !inside
  }
  return inside
}

const pointInShapeFill = (
  point: THREE.Vector2,
  outerContour: THREE.Vector2[],
  holeContours: THREE.Vector2[][]
) =>
  pointInContour(point, outerContour) &&
  !holeContours.some((hole) => pointInContour(point, hole))

const nearestPointOnSegmentDistance = (
  point: THREE.Vector2,
  a: THREE.Vector2,
  b: THREE.Vector2
) => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy
  if (lengthSq <= 0) return point.distanceTo(a)

  const t = Math.max(
    0,
    Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq)
  )
  return Math.hypot(point.x - (a.x + dx * t), point.y - (a.y + dy * t))
}

const nearestContourDistance = (
  point: THREE.Vector2,
  contours: THREE.Vector2[][]
) => {
  let nearest = Infinity
  contours.forEach((contour) => {
    for (let index = 0; index < contour.length; index += 1) {
      nearest = Math.min(
        nearest,
        nearestPointOnSegmentDistance(
          point,
          contour[index],
          contour[(index + 1) % contour.length]
        )
      )
    }
  })
  return nearest
}

type RidgeSample = {
  point: THREE.Vector2
  distance: number
}

const cross2 = (a: THREE.Vector2, b: THREE.Vector2) => a.x * b.y - a.y * b.x

const rayContourDistance = (
  origin: THREE.Vector2,
  direction: THREE.Vector2,
  contour: THREE.Vector2[]
) => {
  let nearest = Infinity
  for (let index = 0; index < contour.length; index += 1) {
    const a = contour[index]
    const b = contour[(index + 1) % contour.length]
    const segment = new THREE.Vector2(b.x - a.x, b.y - a.y)
    const denominator = cross2(direction, segment)
    if (Math.abs(denominator) < 0.000001) continue

    const relative = new THREE.Vector2(a.x - origin.x, a.y - origin.y)
    const rayDistance = cross2(relative, segment) / denominator
    const segmentDistance = cross2(relative, direction) / denominator
    if (
      rayDistance > 0.0001 &&
      segmentDistance >= -0.0001 &&
      segmentDistance <= 1.0001
    ) {
      nearest = Math.min(nearest, rayDistance)
    }
  }
  return Number.isFinite(nearest) ? nearest : null
}

const createContourPairRidgeSamples = (
  outerContour: THREE.Vector2[],
  holeContours: THREE.Vector2[][],
  baseExtrude: SvgExtrudeBaseSettings
) => {
  if (holeContours.length === 0) return []

  const contours = [outerContour, ...holeContours]
  const ridgeSamples: RidgeSample[] = []
  holeContours.forEach((hole) => {
    const holeBox = new THREE.Box2().setFromPoints(hole)
    const holeSize = new THREE.Vector2()
    holeBox.getSize(holeSize)
    const origin = holeBox.getCenter(new THREE.Vector2())
    const sampleCount = Math.max(
      24,
      Math.min(96, Math.round(hole.length * 1.5))
    )

    for (let index = 0; index < sampleCount; index += 1) {
      const angle = (index / sampleCount) * Math.PI * 2
      const direction = new THREE.Vector2(Math.cos(angle), Math.sin(angle))
      const holeDistance = rayContourDistance(origin, direction, hole)
      const outerDistance = rayContourDistance(origin, direction, outerContour)
      if (
        holeDistance === null ||
        outerDistance === null ||
        outerDistance <= holeDistance
      ) {
        continue
      }

      const point = origin
        .clone()
        .addScaledVector(direction, (holeDistance + outerDistance) / 2)
      if (!pointInShapeFill(point, outerContour, holeContours)) continue
      ridgeSamples.push({
        point,
        distance: nearestContourDistance(point, contours),
      })
    }
  })

  const minSpacing =
    Math.max(0.08, baseExtrude.crownInset) *
    Math.max(1.2, baseExtrude.curveSegments / 16)
  const spaced: RidgeSample[] = []
  ridgeSamples
    .sort((a, b) => b.distance - a.distance)
    .forEach((candidate) => {
      if (
        spaced.some(
          (sample) => sample.point.distanceTo(candidate.point) < minSpacing
        )
      ) {
        return
      }
      spaced.push(candidate)
    })
  return spaced.slice(0, 96)
}

const createRidgeSamples = (
  outerContour: THREE.Vector2[],
  holeContours: THREE.Vector2[][],
  baseExtrude: SvgExtrudeBaseSettings
) => {
  const contourPairSamples = createContourPairRidgeSamples(
    outerContour,
    holeContours,
    baseExtrude
  )
  if (contourPairSamples.length > 0) return contourPairSamples

  const contours = [outerContour, ...holeContours]
  const contourBox = new THREE.Box2().setFromPoints(contours.flat())
  const contourSize = new THREE.Vector2()
  contourBox.getSize(contourSize)
  const maxAxis = Math.max(contourSize.x, contourSize.y)
  if (maxAxis <= 0) return []

  const cells = Math.max(
    14,
    Math.min(30, Math.round(1 / Math.max(0.035, baseExtrude.crownInset * 0.32)))
  )
  const columns = Math.max(6, Math.round((contourSize.x / maxAxis) * cells))
  const rows = Math.max(6, Math.round((contourSize.y / maxAxis) * cells))
  const stepX = contourSize.x / columns
  const stepY = contourSize.y / rows
  if (stepX <= 0 || stepY <= 0) return []

  const samples: Array<Array<RidgeSample | null>> = []
  for (let row = 0; row <= rows; row += 1) {
    const sampleRow: Array<RidgeSample | null> = []
    for (let column = 0; column <= columns; column += 1) {
      const point = new THREE.Vector2(
        contourBox.min.x + stepX * column,
        contourBox.min.y + stepY * row
      )
      if (!pointInShapeFill(point, outerContour, holeContours)) {
        sampleRow.push(null)
        continue
      }
      sampleRow.push({
        point,
        distance: nearestContourDistance(point, contours),
      })
    }
    samples.push(sampleRow)
  }

  const candidates: RidgeSample[] = []
  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const sample = samples[row][column]
      if (!sample || sample.distance < Math.min(stepX, stepY) * 0.7) continue

      let localMaximum = true
      for (let y = -1; y <= 1; y += 1) {
        for (let x = -1; x <= 1; x += 1) {
          if (x === 0 && y === 0) continue
          const neighbor = samples[row + y][column + x]
          if (neighbor && neighbor.distance > sample.distance) {
            localMaximum = false
          }
        }
      }
      if (localMaximum) candidates.push(sample)
    }
  }

  if (candidates.length === 0) {
    const center = contourBox.getCenter(new THREE.Vector2())
    if (pointInShapeFill(center, outerContour, holeContours)) {
      candidates.push({
        point: center,
        distance: nearestContourDistance(center, contours),
      })
    }
  }

  candidates.sort((a, b) => b.distance - a.distance)
  const minSpacing = Math.max(stepX, stepY) * 1.35
  const ridgeSamples: RidgeSample[] = []
  candidates.forEach((candidate) => {
    if (
      ridgeSamples.some(
        (sample) => sample.point.distanceTo(candidate.point) < minSpacing
      )
    ) {
      return
    }
    ridgeSamples.push(candidate)
  })
  return ridgeSamples.slice(0, 84)
}

const stripFlatCaps = (geometry: THREE.BufferGeometry) => {
  const source = geometry.index ? geometry.toNonIndexed() : geometry.clone()
  source.computeVertexNormals()

  const position = source.getAttribute("position") as THREE.BufferAttribute
  const normal = source.getAttribute("normal") as THREE.BufferAttribute
  const positions: number[] = []
  for (let index = 0; index < position.count; index += 3) {
    const normalZ =
      (normal.getZ(index) + normal.getZ(index + 1) + normal.getZ(index + 2)) / 3
    if (Math.abs(normalZ) > 0.96) continue

    for (let offset = 0; offset < 3; offset += 1) {
      const vertex = index + offset
      positions.push(
        position.getX(vertex),
        position.getY(vertex),
        position.getZ(vertex)
      )
    }
  }
  source.dispose()

  const sides = new THREE.BufferGeometry()
  sides.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  return sides
}

const appendCapTriangle = (
  positions: number[],
  vertices: THREE.Vector2[],
  heights: number[],
  aIndex: number,
  bIndex: number,
  cIndex: number,
  baseZ: number,
  direction: number,
  reverse: boolean
) => {
  const ordered = reverse ? [cIndex, bIndex, aIndex] : [aIndex, bIndex, cIndex]
  ordered.forEach((index) => {
    const point = vertices[index]
    positions.push(point.x, point.y, baseZ + direction * heights[index])
  })
}

const createMedialRoofCaps = (
  shape: THREE.Shape,
  extrude: SafeShapeExtrudeSettings,
  baseExtrude: SvgExtrudeBaseSettings
) => {
  const extracted = shape.extractPoints(baseExtrude.curveSegments)
  const outerContour = withoutClosingPoint(extracted.shape).filter(
    (point) => Number.isFinite(point.x) && Number.isFinite(point.y)
  )
  const holeContours = extracted.holes
    .map((hole) =>
      withoutClosingPoint(hole).filter(
        (point) => Number.isFinite(point.x) && Number.isFinite(point.y)
      )
    )
    .filter((hole) => hole.length > 2)
  if (outerContour.length < 3) return null

  const ridgeSamples = createRidgeSamples(
    outerContour,
    holeContours,
    baseExtrude
  )
  if (ridgeSamples.length === 0) return null

  const vertices = [...outerContour]
  const holeIndices: number[] = []
  holeContours.forEach((hole) => {
    holeIndices.push(vertices.length)
    vertices.push(...hole)
  })

  const heights = Array.from({ length: vertices.length }, () => 0)
  const lift = Math.max(
    0.02,
    Math.min(
      extrude.shapeDepth * 0.32,
      extrude.bevelThickness * 1.35,
      baseExtrude.crownHeight * 0.55
    )
  )

  ridgeSamples.forEach((sample) => {
    holeIndices.push(vertices.length)
    vertices.push(sample.point)
    heights.push(lift)
  })

  const data = vertices.flatMap((point) => [point.x, point.y])
  const triangles = Earcut.triangulate(data, holeIndices, 2)
  if (triangles.length === 0) return null

  const positions: number[] = []
  for (let index = 0; index < triangles.length; index += 3) {
    const a = triangles[index]
    const b = triangles[index + 1]
    const c = triangles[index + 2]
    appendCapTriangle(
      positions,
      vertices,
      heights,
      a,
      b,
      c,
      extrude.shapeDepth,
      baseExtrude.crownProfile === "inset" ? -1 : 1,
      false
    )
    appendCapTriangle(
      positions,
      vertices,
      heights,
      a,
      b,
      c,
      0,
      baseExtrude.crownProfile === "inset" ? 1 : -1,
      true
    )
  }

  const caps = new THREE.BufferGeometry()
  caps.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  return caps
}

const mergeGeometries = (geometries: THREE.BufferGeometry[]) => {
  const positions: number[] = []
  geometries.forEach((geometry) => {
    const source = geometry.index ? geometry.toNonIndexed() : geometry
    const position = source.getAttribute("position") as THREE.BufferAttribute
    for (let index = 0; index < position.count; index += 1) {
      positions.push(
        position.getX(index),
        position.getY(index),
        position.getZ(index)
      )
    }
  })

  const merged = new THREE.BufferGeometry()
  merged.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  )
  merged.computeVertexNormals()
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
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
  const useMedialRoof = baseExtrude.crownEnabled && !isSlashOverlay
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
      bevelEnabled: useMedialRoof ? false : extrude.bevelEnabled,
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

  if (useMedialRoof) {
    const caps = createMedialRoofCaps(shape, extrude, baseExtrude)
    if (caps) {
      const sides = stripFlatCaps(geometry)
      const merged = mergeGeometries([sides, caps])
      geometry.dispose()
      sides.dispose()
      caps.dispose()
      geometry = merged
    }
  }

  geometry.translate(0, 0, -extrude.shapeDepth / 2)

  return { geometry, extrude }
}
