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

const inwardNormalAt = (
  contour: THREE.Vector2[],
  index: number,
  outerContour: THREE.Vector2[],
  holeContours: THREE.Vector2[]
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
  const holes = holeContours as unknown as THREE.Vector2[][]
  if (pointInShapeFill(probeA, outerContour, holes)) return normalA
  if (pointInShapeFill(probeB, outerContour, holes)) return normalB
  return null
}

const createInsetContour = (
  contour: THREE.Vector2[],
  outerContour: THREE.Vector2[],
  holeContours: THREE.Vector2[][],
  amount: number
) => {
  const inset: THREE.Vector2[] = []
  for (let index = 0; index < contour.length; index += 1) {
    const normal = inwardNormalAt(
      contour,
      index,
      outerContour,
      holeContours as unknown as THREE.Vector2[]
    )
    if (!normal) continue

    const point = contour[index]
    const probe = point.clone().addScaledVector(normal, 0.015)
    let oppositeDistance = rayContourDistance(probe, normal, outerContour) ?? 0
    holeContours.forEach((hole) => {
      const holeDistance = rayContourDistance(probe, normal, hole)
      if (holeDistance !== null) {
        oppositeDistance = oppositeDistance
          ? Math.min(oppositeDistance, holeDistance)
          : holeDistance
      }
    })
    const localAmount = oppositeDistance
      ? Math.min(amount, oppositeDistance * 0.5)
      : amount
    const candidate = point.clone().addScaledVector(normal, localAmount)
    if (pointInShapeFill(candidate, outerContour, holeContours)) {
      inset.push(candidate)
    }
  }
  return inset.length >= 3 ? inset : null
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

const createSolidRoofCaps = (
  outerContour: THREE.Vector2[],
  holeContours: THREE.Vector2[][],
  depth: number,
  lift: number,
  insetAmount: number,
  profileSign: number
) => {
  const insetContour = createInsetContour(
    outerContour,
    outerContour,
    holeContours,
    insetAmount
  )
  if (!insetContour) return null

  const center = new THREE.Box2()
    .setFromPoints(insetContour)
    .getCenter(new THREE.Vector2())
  const centerPoint = pointInShapeFill(center, outerContour, holeContours)
    ? center
    : insetContour[0]
  const frontCenter = { point: centerPoint, height: lift * 1.16 }
  const backCenter = { point: centerPoint, height: lift * 1.16 }
  const positions: number[] = []
  const count = Math.min(outerContour.length, insetContour.length)

  for (let index = 0; index < count; index += 1) {
    const next = (index + 1) % count
    const outerA = { point: outerContour[index], height: 0 }
    const outerB = { point: outerContour[next], height: 0 }
    const ridgeA = { point: insetContour[index], height: lift }
    const ridgeB = { point: insetContour[next], height: lift }

    pushCapQuad(
      positions,
      outerA,
      outerB,
      ridgeB,
      ridgeA,
      depth,
      profileSign,
      true
    )
    pushCapQuad(
      positions,
      outerA,
      ridgeA,
      ridgeB,
      outerB,
      0,
      -profileSign,
      false
    )
    pushCapTriangle(
      positions,
      ridgeA,
      ridgeB,
      frontCenter,
      depth,
      profileSign,
      true
    )
    pushCapTriangle(
      positions,
      ridgeA,
      backCenter,
      ridgeB,
      0,
      -profileSign,
      false
    )
  }

  return positions
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

const createSingleHoleRoofCaps = (
  outerContour: THREE.Vector2[],
  hole: THREE.Vector2[],
  depth: number,
  lift: number,
  profileSign: number
) => {
  const positions: number[] = []
  const holeBox = new THREE.Box2().setFromPoints(hole)
  const origin = holeBox.getCenter(new THREE.Vector2())
  const sampleCount = Math.max(48, Math.min(160, hole.length * 3))
  const outer: CapPoint[] = []
  const inner: CapPoint[] = []
  const ridge: CapPoint[] = []

  for (let index = 0; index < sampleCount; index += 1) {
    const angle = (index / sampleCount) * Math.PI * 2
    const direction = new THREE.Vector2(Math.cos(angle), Math.sin(angle))
    const innerDistance = rayContourDistance(origin, direction, hole)
    const outerDistance = rayContourDistance(origin, direction, outerContour)
    if (
      innerDistance === null ||
      outerDistance === null ||
      outerDistance <= innerDistance
    ) {
      continue
    }

    const ridgeDistance = (innerDistance + outerDistance) / 2
    inner.push({
      point: origin.clone().addScaledVector(direction, innerDistance),
      height: 0,
    })
    outer.push({
      point: origin.clone().addScaledVector(direction, outerDistance),
      height: 0,
    })
    ridge.push({
      point: origin.clone().addScaledVector(direction, ridgeDistance),
      height: lift,
    })
  }

  const count = Math.min(outer.length, inner.length, ridge.length)
  if (count < 3) return null

  for (let index = 0; index < count; index += 1) {
    const next = (index + 1) % count

    pushCapQuad(
      positions,
      outer[index],
      outer[next],
      ridge[next],
      ridge[index],
      depth,
      profileSign,
      true
    )
    pushCapQuad(
      positions,
      inner[index],
      ridge[index],
      ridge[next],
      inner[next],
      depth,
      profileSign,
      true
    )
    pushCapQuad(
      positions,
      outer[index],
      ridge[index],
      ridge[next],
      outer[next],
      0,
      -profileSign,
      false
    )
    pushCapQuad(
      positions,
      inner[index],
      inner[next],
      ridge[next],
      ridge[index],
      0,
      -profileSign,
      false
    )
  }

  return positions.length > 0 ? positions : null
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
  if (holeContours.length > 1) return null

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
  const insetAmount = Math.max(
    0.08,
    Math.min(1.6, Math.max(baseExtrude.crownInset * 9, extrude.bevelSize * 0.7))
  )

  const positions =
    holeContours.length === 1
      ? createSingleHoleRoofCaps(
          outerContour,
          holeContours[0],
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
            holeContours,
            extrude.shapeDepth,
            lift,
            insetAmount,
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
    baseExtrude.crownEnabled && !isSlashOverlay && shape.holes.length <= 1
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
