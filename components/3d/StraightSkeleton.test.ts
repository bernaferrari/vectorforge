import { describe, expect, it } from "vitest"
import {
  computeSkeletonRoofFaces,
  type RoofVertex,
  type SkeletonPoint,
} from "./StraightSkeleton"

const square = (size = 10): SkeletonPoint[] => [
  { x: 0, y: 0 },
  { x: size, y: 0 },
  { x: size, y: size },
  { x: 0, y: size },
]

const rectangle = (width: number, height: number): SkeletonPoint[] => [
  { x: 0, y: 0 },
  { x: width, y: 0 },
  { x: width, y: height },
  { x: 0, y: height },
]

const circle = (
  cx: number,
  cy: number,
  radius: number,
  segments: number,
  clockwise = false
): SkeletonPoint[] => {
  const points: SkeletonPoint[] = []
  for (let index = 0; index < segments; index += 1) {
    const angle = ((clockwise ? -index : index) / segments) * Math.PI * 2
    points.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    })
  }
  return points
}

const maxHeight = (faces: RoofVertex[][]) =>
  Math.max(...faces.flatMap((face) => face.map((vertex) => vertex.h)))

const pointInContour = (point: SkeletonPoint, contour: SkeletonPoint[]) => {
  let inside = false
  for (
    let current = 0, previous = contour.length - 1;
    current < contour.length;
    previous = current, current += 1
  ) {
    const a = contour[current]
    const b = contour[previous]
    const crosses =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    if (crosses) inside = !inside
  }
  return inside
}

const ridgeCentroidsStayInside = (
  faces: RoofVertex[][],
  outer: SkeletonPoint[],
  holes: SkeletonPoint[][]
) =>
  faces.every((face) => {
    const centroid = {
      x: face.reduce((sum, vertex) => sum + vertex.x, 0) / face.length,
      y: face.reduce((sum, vertex) => sum + vertex.y, 0) / face.length,
    }
    return (
      pointInContour(centroid, outer) &&
      !holes.some((hole) => pointInContour(centroid, hole))
    )
  })

describe("computeSkeletonRoofFaces", () => {
  it("builds a four-face pyramid for a square", () => {
    const faces = computeSkeletonRoofFaces(square(), [])
    expect(faces).not.toBeNull()
    expect(faces!.length).toBe(4)
    faces!.forEach((face) => expect(face.length).toBe(3))
    expect(maxHeight(faces!)).toBeCloseTo(5, 3)
    faces!.forEach((face) => {
      const apex = face.find((vertex) => vertex.h > 1)
      expect(apex).toBeDefined()
      expect(apex!.x).toBeCloseTo(5, 3)
      expect(apex!.y).toBeCloseTo(5, 3)
    })
  })

  it("builds a ridge roof for a rectangle", () => {
    const faces = computeSkeletonRoofFaces(rectangle(20, 10), [])
    expect(faces).not.toBeNull()
    expect(faces!.length).toBe(4)
    expect(maxHeight(faces!)).toBeCloseTo(5, 3)

    // The ridge runs between (5,5) and (15,5): the two long edges produce
    // quads, the two short edges produce the triangular end facets.
    const sizes = faces!.map((face) => face.length).sort()
    expect(sizes).toEqual([3, 3, 4, 4])
    const ridgeXs = new Set(
      faces!
        .flatMap((face) => face.filter((vertex) => vertex.h > 1))
        .map((vertex) => Math.round(vertex.x))
    )
    expect(ridgeXs).toEqual(new Set([5, 15]))
  })

  it("keeps every boundary vertex at height zero", () => {
    const faces = computeSkeletonRoofFaces(rectangle(20, 10), [])
    const boundary = faces!
      .flatMap((face) => face)
      .filter((vertex) => vertex.h < 0.001)
    expect(boundary.length).toBeGreaterThan(0)
    boundary.forEach((vertex) => {
      const onEdge =
        Math.abs(vertex.x) < 0.001 ||
        Math.abs(vertex.x - 20) < 0.001 ||
        Math.abs(vertex.y) < 0.001 ||
        Math.abs(vertex.y - 10) < 0.001
      expect(onEdge).toBe(true)
    })
  })

  it("handles an L-shaped polygon without leaking outside the fill", () => {
    const outer: SkeletonPoint[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 4 },
      { x: 4, y: 4 },
      { x: 4, y: 10 },
      { x: 0, y: 10 },
    ]
    const faces = computeSkeletonRoofFaces(outer, [])
    expect(faces).not.toBeNull()
    expect(faces!.length).toBe(6)
    expect(maxHeight(faces!)).toBeLessThanOrEqual(2.001)
    expect(maxHeight(faces!)).toBeGreaterThan(1.5)
    expect(ridgeCentroidsStayInside(faces!, outer, [])).toBe(true)
  })

  it("builds a centered ridge ring for a square donut (split events)", () => {
    const outer = square(10)
    const hole = [
      { x: 3, y: 3 },
      { x: 7, y: 3 },
      { x: 7, y: 7 },
      { x: 3, y: 7 },
    ]
    const faces = computeSkeletonRoofFaces(outer, [hole])
    expect(faces).not.toBeNull()
    expect(faces!.length).toBe(8)
    expect(maxHeight(faces!)).toBeCloseTo(1.5, 3)
    expect(ridgeCentroidsStayInside(faces!, outer, [hole])).toBe(true)
  })

  it("builds a circular ridge for an annulus", () => {
    const outer = circle(0, 0, 5, 48)
    const hole = circle(0, 0, 2, 32, true)
    const faces = computeSkeletonRoofFaces(outer, [hole])
    expect(faces).not.toBeNull()
    expect(faces!.length).toBe(80)
    const top = maxHeight(faces!)
    expect(top).toBeGreaterThan(1.3)
    expect(top).toBeLessThan(1.6)
    // Ridge vertices sit near the annulus midline radius 3.5.
    faces!.forEach((face) =>
      face.forEach((vertex) => {
        if (vertex.h > 1.2) {
          expect(Math.hypot(vertex.x, vertex.y)).toBeGreaterThan(3.1)
          expect(Math.hypot(vertex.x, vertex.y)).toBeLessThan(3.9)
        }
      })
    )
    expect(ridgeCentroidsStayInside(faces!, outer, [hole])).toBe(true)
  })

  it("handles a gear-like star with a center hole", () => {
    const outer: SkeletonPoint[] = []
    const toothCount = 10
    const pointsPerTooth = 4
    for (let index = 0; index < toothCount * pointsPerTooth; index += 1) {
      const angle = (index / (toothCount * pointsPerTooth)) * Math.PI * 2
      const phase = index % pointsPerTooth
      const radius = phase === 0 || phase === 1 ? 10 : 7.25
      outer.push({
        x: 10 + Math.cos(angle) * radius,
        y: 10 + Math.sin(angle) * radius,
      })
    }
    const hole = circle(10, 10, 3.2, 32, true)
    const faces = computeSkeletonRoofFaces(outer, [hole])
    expect(faces).not.toBeNull()
    expect(faces!.length).toBeGreaterThan(60)
    expect(maxHeight(faces!)).toBeGreaterThan(1)
    expect(ridgeCentroidsStayInside(faces!, outer, [hole])).toBe(true)
  })

  it("normalizes input orientation", () => {
    const reversedOuter = [...square()].reverse()
    const faces = computeSkeletonRoofFaces(reversedOuter, [])
    expect(faces).not.toBeNull()
    expect(faces!.length).toBe(4)
    expect(maxHeight(faces!)).toBeCloseTo(5, 3)
  })

  it("rejects degenerate input", () => {
    expect(computeSkeletonRoofFaces([], [])).toBeNull()
    expect(
      computeSkeletonRoofFaces(
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        []
      )
    ).toBeNull()
    expect(
      computeSkeletonRoofFaces(
        [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
          { x: 0, y: 0 },
        ],
        []
      )
    ).toBeNull()
  })
})
