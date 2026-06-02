import * as THREE from "three"
import {
  union,
  type Geometry,
  type MultiPolygon,
  type Polygon,
} from "martinez-polygon-clipping"

const UNION_SAMPLE_SEGMENTS = 48
const MIN_RING_POINTS = 4

const closeRing = (points: THREE.Vector2[]) => {
  const ring = points
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .map((point) => [point.x, point.y] as [number, number])

  if (ring.length < 3) return null

  const first = ring[0]
  const last = ring[ring.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]])
  }

  return ring.length >= MIN_RING_POINTS ? ring : null
}

const shapeToPolygon = (shape: THREE.Shape): Polygon | null => {
  const outer = closeRing(shape.getPoints(UNION_SAMPLE_SEGMENTS))
  if (!outer) return null

  const holes = shape.holes
    .map((hole) => closeRing(hole.getPoints(UNION_SAMPLE_SEGMENTS)))
    .filter((ring): ring is NonNullable<typeof ring> => ring !== null)

  return [outer, ...holes]
}

const ringToVector2 = (ring: Polygon[number]) =>
  ring
    .slice(0, -1)
    .map(([x, y]) => new THREE.Vector2(x, y))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))

const polygonToShape = (polygon: Polygon): THREE.Shape | null => {
  const [outerRing, ...holeRings] = polygon
  if (!outerRing) return null

  const outer = ringToVector2(outerRing)
  if (outer.length < 3) return null

  const shape = new THREE.Shape(outer)
  shape.holes = holeRings
    .map((ring) => {
      const points = ringToVector2(ring)
      return points.length >= 3 ? new THREE.Path(points) : null
    })
    .filter((path): path is THREE.Path => path !== null)

  return shape
}

const shapeBounds = (shape: THREE.Shape) => {
  const points = shape.getPoints(UNION_SAMPLE_SEGMENTS)
  if (points.length < 2) return null
  const box = new THREE.Box2().setFromPoints(points)
  return Number.isFinite(box.min.x) &&
    Number.isFinite(box.min.y) &&
    Number.isFinite(box.max.x) &&
    Number.isFinite(box.max.y)
    ? box
    : null
}

const boxesOverlap = (a: THREE.Box2, b: THREE.Box2) =>
  a.max.x > b.min.x &&
  a.min.x < b.max.x &&
  a.max.y > b.min.y &&
  a.min.y < b.max.y

const hasOverlappingBounds = (shapes: THREE.Shape[]) => {
  const boxes = shapes.map(shapeBounds)
  for (let i = 0; i < boxes.length; i += 1) {
    const a = boxes[i]
    if (!a) continue
    for (let j = i + 1; j < boxes.length; j += 1) {
      const b = boxes[j]
      if (b && boxesOverlap(a, b)) return true
    }
  }
  return false
}

const geometryToShapes = (geometry: Geometry | null) => {
  if (!geometry) return null

  const first = geometry[0]
  const second = Array.isArray(first) ? first[0] : undefined
  const isPolygon = Array.isArray(second) && typeof second[0] === "number"
  const multiPolygon: MultiPolygon = isPolygon
    ? [geometry as Polygon]
    : (geometry as MultiPolygon)

  const shapes = multiPolygon
    .map((polygon) => polygonToShape(polygon))
    .filter((shape): shape is THREE.Shape => shape !== null)

  return shapes.length > 0 ? shapes : null
}

export const unionOverlappingSvgShapes = (shapes: THREE.Shape[]) => {
  if (shapes.length < 2 || !hasOverlappingBounds(shapes)) return shapes

  const polygons = shapes
    .map((shape) => shapeToPolygon(shape))
    .filter((polygon): polygon is Polygon => polygon !== null)
  if (polygons.length !== shapes.length) return shapes

  try {
    const merged = polygons
      .slice(1)
      .reduce<Geometry | null>(
        (current, polygon) => (current ? union(current, polygon) : null),
        polygons[0]
      )
    return geometryToShapes(merged) ?? shapes
  } catch (error) {
    console.warn(
      "Falling back to unmerged SVG shapes after union failed",
      error
    )
    return shapes
  }
}
