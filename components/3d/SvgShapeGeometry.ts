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

type CapPoint = {
  point: THREE.Vector2
  height: number
}

type BoundaryHit = {
  contourIndex: number
  distance: number
  point: THREE.Vector2
}

type RidgeHit = {
  opposite: THREE.Vector2
  ridge: THREE.Vector2
  targetContourIndex: number
}

const withoutClosingPoint = (points: THREE.Vector2[]) => {
  if (points.length < 2) return points
  const first = points[0]
  const last = points[points.length - 1]
  return first.distanceToSquared(last) < 0.000001 ? points.slice(0, -1) : points
}

const triangleArea = (a: THREE.Vector2, b: THREE.Vector2, c: THREE.Vector2) =>
  (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)

const pushCapTriangle = (
  positions: number[],
  a: CapPoint,
  b: CapPoint,
  c: CapPoint,
  baseZ: number,
  direction: number,
  front: boolean
) => {
  const shouldSwap = front
    ? triangleArea(a.point, b.point, c.point) < 0
    : triangleArea(a.point, b.point, c.point) > 0
  const ordered = shouldSwap ? [a, c, b] : [a, b, c]

  ordered.forEach((vertex) => {
    positions.push(
      vertex.point.x,
      vertex.point.y,
      baseZ + direction * vertex.height
    )
  })
}

const pushCapQuad = (
  positions: number[],
  a: CapPoint,
  b: CapPoint,
  c: CapPoint,
  d: CapPoint,
  baseZ: number,
  direction: number,
  front: boolean
) => {
  pushCapTriangle(positions, a, b, c, baseZ, direction, front)
  pushCapTriangle(positions, a, c, d, baseZ, direction, front)
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

const midpoint = (a: THREE.Vector2, b: THREE.Vector2) =>
  new THREE.Vector2((a.x + b.x) / 2, (a.y + b.y) / 2)

const averagePoint = (points: THREE.Vector2[]) => {
  const point = new THREE.Vector2()
  points.forEach((item) => point.add(item))
  return point.divideScalar(points.length)
}

const cross2 = (a: THREE.Vector2, b: THREE.Vector2) => a.x * b.y - a.y * b.x

const rayContourHit = (
  origin: THREE.Vector2,
  direction: THREE.Vector2,
  contour: THREE.Vector2[]
) => {
  let nearest = Infinity
  let nearestPoint: THREE.Vector2 | null = null
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
      if (rayDistance < nearest) {
        nearest = rayDistance
        nearestPoint = origin.clone().addScaledVector(direction, rayDistance)
      }
    }
  }
  return nearestPoint && Number.isFinite(nearest)
    ? { distance: nearest, point: nearestPoint }
    : null
}

const rayBoundaryHit = (
  origin: THREE.Vector2,
  direction: THREE.Vector2,
  contours: THREE.Vector2[][]
): BoundaryHit | null => {
  let nearest: BoundaryHit | null = null
  contours.forEach((contour, contourIndex) => {
    const hit = rayContourHit(origin, direction, contour)
    if (!hit) return
    if (!nearest || hit.distance < nearest.distance) {
      nearest = { ...hit, contourIndex }
    }
  })
  return nearest
}

const inwardNormalAt = (
  contour: THREE.Vector2[],
  index: number,
  outerContour: THREE.Vector2[],
  holeContours: THREE.Vector2[][]
) => {
  const point = contour[index]
  const previous = contour[(index - 1 + contour.length) % contour.length]
  const next = contour[(index + 1) % contour.length]
  const tangent = new THREE.Vector2(next.x - previous.x, next.y - previous.y)
  const length = tangent.length()
  if (length <= 0) return null
  tangent.divideScalar(length)

  const normalA = new THREE.Vector2(-tangent.y, tangent.x)
  const normalB = new THREE.Vector2(tangent.y, -tangent.x)
  const probeDistance = 0.015
  const probeA = point.clone().addScaledVector(normalA, probeDistance)
  const probeB = point.clone().addScaledVector(normalB, probeDistance)
  if (pointInShapeFill(probeA, outerContour, holeContours)) return normalA
  if (pointInShapeFill(probeB, outerContour, holeContours)) return normalB
  return null
}

const ridgeHitAt = (
  outerContour: THREE.Vector2[],
  holeContours: THREE.Vector2[][],
  contours: THREE.Vector2[][],
  contour: THREE.Vector2[],
  index: number
): RidgeHit | null => {
  const normal = inwardNormalAt(contour, index, outerContour, holeContours)
  if (!normal) return null

  const point = contour[index]
  const probeOffset = 0.012
  const probe = point.clone().addScaledVector(normal, probeOffset)
  const hit = rayBoundaryHit(probe, normal, contours)
  if (!hit || hit.distance < 0.03) return null

  const ridge = point
    .clone()
    .addScaledVector(normal, probeOffset + hit.distance * 0.5)
  if (!pointInShapeFill(ridge, outerContour, holeContours)) return null
  if (!pointInShapeFill(hit.point, outerContour, holeContours)) {
    const inwardHit = hit.point.clone().addScaledVector(normal, -probeOffset)
    if (!pointInShapeFill(inwardHit, outerContour, holeContours)) return null
  }

  return {
    opposite: hit.point,
    ridge,
    targetContourIndex: hit.contourIndex,
  }
}

const roofQuadIsClean = (
  boundaryA: THREE.Vector2,
  boundaryB: THREE.Vector2,
  ridgeA: THREE.Vector2,
  ridgeB: THREE.Vector2,
  outerContour: THREE.Vector2[],
  holeContours: THREE.Vector2[][]
) => {
  const widthA = boundaryA.distanceTo(ridgeA)
  const widthB = boundaryB.distanceTo(ridgeB)
  const maxWidth = Math.max(widthA, widthB, 0.001)
  const boundaryLength = boundaryA.distanceTo(boundaryB)
  const ridgeLength = ridgeA.distanceTo(ridgeB)

  if (ridgeLength > boundaryLength + maxWidth * 1.2) return false

  const boundaryMid = midpoint(boundaryA, boundaryB)
  const ridgeMid = midpoint(ridgeA, ridgeB)
  const samples = [
    ridgeMid,
    midpoint(boundaryA, ridgeA),
    midpoint(boundaryB, ridgeB),
    midpoint(boundaryMid, ridgeMid),
    averagePoint([boundaryA, boundaryB, ridgeB]),
    averagePoint([boundaryA, ridgeB, ridgeA]),
  ]

  return samples.every((sample) =>
    pointInShapeFill(sample, outerContour, holeContours)
  )
}

const createBoundaryRoofCaps = (
  outerContour: THREE.Vector2[],
  holeContours: THREE.Vector2[][],
  depth: number,
  lift: number,
  profileSign: number
) => {
  const positions: number[] = []
  const contours = [outerContour, ...holeContours]

  contours.forEach((contour, sourceContourIndex) => {
    const ridgeHits = contour.map((_, index) =>
      ridgeHitAt(outerContour, holeContours, contours, contour, index)
    )

    for (let index = 0; index < contour.length; index += 1) {
      const next = (index + 1) % contour.length
      const hitA = ridgeHits[index]
      const hitB = ridgeHits[next]
      if (!hitA || !hitB) continue
      if (hitA.targetContourIndex !== hitB.targetContourIndex) continue
      if (
        sourceContourIndex !== hitA.targetContourIndex &&
        sourceContourIndex > hitA.targetContourIndex
      ) {
        continue
      }

      if (
        !roofQuadIsClean(
          contour[index],
          contour[next],
          hitA.ridge,
          hitB.ridge,
          outerContour,
          holeContours
        ) ||
        !roofQuadIsClean(
          hitA.opposite,
          hitB.opposite,
          hitA.ridge,
          hitB.ridge,
          outerContour,
          holeContours
        )
      ) {
        continue
      }

      const boundaryA = { point: contour[index], height: 0 }
      const boundaryB = { point: contour[next], height: 0 }
      const oppositeA = { point: hitA.opposite, height: 0 }
      const oppositeB = { point: hitB.opposite, height: 0 }
      const medialA = { point: hitA.ridge, height: lift }
      const medialB = { point: hitB.ridge, height: lift }

      pushCapQuad(
        positions,
        boundaryA,
        boundaryB,
        medialB,
        medialA,
        depth,
        profileSign,
        true
      )
      pushCapQuad(
        positions,
        oppositeA,
        medialA,
        medialB,
        oppositeB,
        depth,
        profileSign,
        true
      )
      pushCapQuad(
        positions,
        boundaryA,
        medialA,
        medialB,
        boundaryB,
        0,
        -profileSign,
        false
      )
      pushCapQuad(
        positions,
        oppositeA,
        oppositeB,
        medialB,
        medialA,
        0,
        -profileSign,
        false
      )
    }
  })

  if (positions.length === 0) return null
  return positions
}

const createSolidRoofCaps = (
  outerContour: THREE.Vector2[],
  depth: number,
  lift: number,
  profileSign: number
) => {
  if (isCompactConvexContour(outerContour)) {
    return createPointRoofCaps(outerContour, depth, lift, profileSign)
  }

  return createBoundaryRoofCaps(outerContour, [], depth, lift, profileSign)
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

const createPointRoofCaps = (
  outerContour: THREE.Vector2[],
  depth: number,
  lift: number,
  profileSign: number
) => {
  const center = new THREE.Box2()
    .setFromPoints(outerContour)
    .getCenter(new THREE.Vector2())
  const frontCenter = { point: center, height: lift }
  const backCenter = { point: center, height: lift }
  const positions: number[] = []

  for (let index = 0; index < outerContour.length; index += 1) {
    const next = (index + 1) % outerContour.length
    const outerA = { point: outerContour[index], height: 0 }
    const outerB = { point: outerContour[next], height: 0 }

    pushCapTriangle(
      positions,
      outerA,
      outerB,
      frontCenter,
      depth,
      profileSign,
      true
    )
    pushCapTriangle(
      positions,
      outerA,
      backCenter,
      outerB,
      0,
      -profileSign,
      false
    )
  }

  return positions
}

const isCompactContour = (contour: THREE.Vector2[]) => {
  const size = new THREE.Vector2()
  new THREE.Box2().setFromPoints(contour).getSize(size)
  const minDim = Math.max(0.001, Math.min(Math.abs(size.x), Math.abs(size.y)))
  const maxDim = Math.max(Math.abs(size.x), Math.abs(size.y))
  return maxDim / minDim < 1.35
}

const isConvexContour = (contour: THREE.Vector2[]) => {
  let sign = 0
  for (let index = 0; index < contour.length; index += 1) {
    const a = contour[index]
    const b = contour[(index + 1) % contour.length]
    const c = contour[(index + 2) % contour.length]
    const ab = new THREE.Vector2(b.x - a.x, b.y - a.y)
    const bc = new THREE.Vector2(c.x - b.x, c.y - b.y)
    const turn = cross2(ab, bc)
    if (Math.abs(turn) < 0.000001) continue
    const nextSign = Math.sign(turn)
    if (sign !== 0 && nextSign !== sign) return false
    sign = nextSign
  }
  return sign !== 0
}

const isCompactConvexContour = (contour: THREE.Vector2[]) =>
  isCompactContour(contour) && isConvexContour(contour)

const createCenteredRoofCaps = (
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

  const profileSign = baseExtrude.crownProfile === "inset" ? -1 : 1

  const lift = Math.max(
    0.06,
    Math.min(
      extrude.shapeDepth * 0.48,
      Math.max(
        baseExtrude.crownHeight,
        extrude.bevelThickness * 1.4,
        extrude.shapeDepth * 0.34
      )
    )
  )
  const positions =
    holeContours.length > 0
      ? createBoundaryRoofCaps(
          outerContour,
          holeContours,
          extrude.shapeDepth,
          lift,
          profileSign
        )
      : isCompactConvexContour(outerContour)
        ? createPointRoofCaps(
            outerContour,
            extrude.shapeDepth,
            lift,
            profileSign
          )
        : createSolidRoofCaps(
            outerContour,
            extrude.shapeDepth,
            lift,
            profileSign
          )
  if (!positions) return null

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
  const useCenteredRoof =
    baseExtrude.crownEnabled && !isSlashOverlay && shape.holes.length !== 1
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
      bevelEnabled: useCenteredRoof ? false : extrude.bevelEnabled,
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

  if (useCenteredRoof) {
    const caps = createCenteredRoofCaps(shape, extrude, baseExtrude)
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
