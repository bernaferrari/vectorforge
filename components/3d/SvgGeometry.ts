import * as THREE from "three"

export const finiteNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback

export const containsInvalidPositions = (geometry: THREE.BufferGeometry) => {
  const position = geometry.getAttribute("position")
  if (!position) return true
  const values = position.array
  for (let i = 0; i < values.length; i++) {
    if (!Number.isFinite(values[i])) return true
  }
  return false
}

export const minContourDimension = (shape: THREE.Shape) => {
  const contourBoxes = [shape, ...shape.holes]
    .map((contour) => {
      const pts = contour.getPoints(16)
      if (
        pts.length < 2 ||
        pts.some((pt) => !Number.isFinite(pt.x) || !Number.isFinite(pt.y))
      )
        return null
      const box = new THREE.Box2().setFromPoints(pts)
      const size = new THREE.Vector2()
      box.getSize(size)
      if (!Number.isFinite(size.x) || !Number.isFinite(size.y)) return null
      return Math.min(Math.abs(size.x), Math.abs(size.y))
    })
    .filter((value): value is number => value !== null && value > 0)

  return contourBoxes.length ? Math.min(...contourBoxes) : 0
}
