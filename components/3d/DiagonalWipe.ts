import * as THREE from "three"

export type DiagonalWipeDirection = {
  x: number
  y: number
}

export type DiagonalWipePlaneResult = {
  basePlane: THREE.Plane
  wipedPlane: THREE.Plane
  boundaryStart: THREE.Vector2
  boundaryEnd: THREE.Vector2
}

const EPSILON = 0.0001

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

const wipeAxis = (direction: DiagonalWipeDirection) => {
  const length = Math.hypot(direction.x, direction.y)
  if (length < EPSILON) return new THREE.Vector2(1, 0)
  return new THREE.Vector2(direction.x / length, direction.y / length)
}

const wipeTravelRange = (
  width: number,
  height: number,
  axis: THREE.Vector2
) => {
  const halfWidth = width * 0.5
  const halfHeight = height * 0.5
  const corners = [
    new THREE.Vector2(-halfWidth, -halfHeight),
    new THREE.Vector2(halfWidth, -halfHeight),
    new THREE.Vector2(halfWidth, halfHeight),
    new THREE.Vector2(-halfWidth, halfHeight),
  ]
  const values = corners.map((corner) => axis.dot(corner))
  const min = Math.min(...values)
  const max = Math.max(...values)
  return {
    min,
    max,
    distance: Math.max(1, max - min),
  }
}

const wipeBoundaryThreshold = (
  width: number,
  height: number,
  progress: number,
  axis: THREE.Vector2
) => {
  const p0 = 0
  const p1 = axis.x * width
  const p2 = axis.x * width + axis.y * height
  const p3 = axis.y * height
  const min = Math.min(p0, p1, p2, p3)
  const max = Math.max(p0, p1, p2, p3)
  return min + (max - min) * clamp01(progress)
}

const clipRectangleWithHalfPlane = (
  width: number,
  height: number,
  axis: THREE.Vector2,
  threshold: number
) => {
  const input = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(width, 0),
    new THREE.Vector2(width, height),
    new THREE.Vector2(0, height),
  ]
  const output: THREE.Vector2[] = []

  const addOutputPoint = (point: THREE.Vector2) => {
    const previous = output[output.length - 1]
    if (previous && previous.distanceToSquared(point) < 0.0001) return
    output.push(point)
  }

  let previous = input[input.length - 1]
  let previousValue = axis.dot(previous) - threshold
  let previousInside = previousValue <= EPSILON

  input.forEach((current) => {
    const currentValue = axis.dot(current) - threshold
    const currentInside = currentValue <= EPSILON

    if (previousInside && currentInside) {
      addOutputPoint(current.clone())
    } else if (previousInside && !currentInside) {
      const denominator = previousValue - currentValue
      if (Math.abs(denominator) >= EPSILON) {
        const t = Math.max(0, Math.min(1, previousValue / denominator))
        addOutputPoint(previous.clone().lerp(current, t))
      }
    } else if (!previousInside && currentInside) {
      const denominator = previousValue - currentValue
      if (Math.abs(denominator) >= EPSILON) {
        const t = Math.max(0, Math.min(1, previousValue / denominator))
        addOutputPoint(previous.clone().lerp(current, t))
      }
      addOutputPoint(current.clone())
    }

    previous = current
    previousValue = currentValue
    previousInside = currentInside
  })

  if (
    output.length > 1 &&
    output[0].distanceToSquared(output[output.length - 1]) < 0.0001
  ) {
    output.pop()
  }

  return output
}

const boundaryLineForThreshold = (
  width: number,
  height: number,
  axis: THREE.Vector2,
  threshold: number
) => {
  const halfWidth = width * 0.5
  const halfHeight = height * 0.5
  const points: THREE.Vector2[] = []

  const addIfInBounds = (point: THREE.Vector2) => {
    const inBounds =
      point.x >= -halfWidth - EPSILON &&
      point.x <= halfWidth + EPSILON &&
      point.y >= -halfHeight - EPSILON &&
      point.y <= halfHeight + EPSILON
    if (!inBounds) return
    if (points.some((candidate) => candidate.distanceToSquared(point) < 0.0001))
      return
    points.push(point)
  }

  if (Math.abs(axis.y) > EPSILON) {
    addIfInBounds(
      new THREE.Vector2(-halfWidth, (threshold - axis.x * -halfWidth) / axis.y)
    )
    addIfInBounds(
      new THREE.Vector2(halfWidth, (threshold - axis.x * halfWidth) / axis.y)
    )
  }
  if (Math.abs(axis.x) > EPSILON) {
    addIfInBounds(
      new THREE.Vector2(
        (threshold - axis.y * -halfHeight) / axis.x,
        -halfHeight
      )
    )
    addIfInBounds(
      new THREE.Vector2((threshold - axis.y * halfHeight) / axis.x, halfHeight)
    )
  }

  if (points.length < 2) {
    return {
      start: new THREE.Vector2(),
      end: new THREE.Vector2(),
    }
  }

  let start = points[0]
  let end = points[1]
  let bestDistance = start.distanceToSquared(end)
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const distance = points[i].distanceToSquared(points[j])
      if (distance > bestDistance) {
        bestDistance = distance
        start = points[i]
        end = points[j]
      }
    }
  }

  return { start, end }
}

export const createDiagonalWipePlanes = ({
  width,
  height,
  progress,
  direction,
  seamOverlap = 0,
}: {
  width: number
  height: number
  progress: number
  direction: DiagonalWipeDirection
  seamOverlap?: number
}): DiagonalWipePlaneResult => {
  const safeWidth = Math.max(1, width)
  const safeHeight = Math.max(1, height)
  const axis = wipeAxis(direction)
  const range = wipeTravelRange(safeWidth, safeHeight, axis)
  const threshold = range.max - range.distance * clamp01(progress)
  const seam = Math.max(0, seamOverlap)

  const baseNormal = new THREE.Vector3(-axis.x, -axis.y, 0)
  const wipedNormal = new THREE.Vector3(axis.x, axis.y, 0)
  const boundary = boundaryLineForThreshold(
    safeWidth,
    safeHeight,
    axis,
    threshold
  )

  return {
    basePlane: new THREE.Plane(baseNormal, threshold + seam),
    wipedPlane: new THREE.Plane(wipedNormal, -threshold + seam),
    boundaryStart: boundary.start,
    boundaryEnd: boundary.end,
  }
}

export const buildDiagonalWipeClipPath = ({
  width,
  height,
  progress,
  direction,
  seamOverlap = 0,
}: {
  width: number
  height: number
  progress: number
  direction: DiagonalWipeDirection
  seamOverlap?: number
}) => {
  const safeWidth = Math.max(1, width)
  const safeHeight = Math.max(1, height)
  const axis = wipeAxis(direction)
  const travelDistance = wipeTravelRange(safeWidth, safeHeight, axis).distance
  const adjustedProgress = clamp01(
    (clamp01(progress) * travelDistance + Math.max(0, seamOverlap)) /
      travelDistance
  )

  if (adjustedProgress <= 0) return "polygon(0% 0%, 0% 0%, 0% 0%, 0% 0%)"
  if (adjustedProgress >= 1)
    return "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)"

  const threshold = wipeBoundaryThreshold(
    safeWidth,
    safeHeight,
    adjustedProgress,
    axis
  )
  const points = clipRectangleWithHalfPlane(
    safeWidth,
    safeHeight,
    axis,
    threshold
  )
  if (points.length === 0) return "polygon(0% 0%, 0% 0%, 0% 0%, 0% 0%)"

  return `polygon(${points
    .map(
      (point) =>
        `${(point.x / safeWidth) * 100}% ${(point.y / safeHeight) * 100}%`
    )
    .join(", ")})`
}
