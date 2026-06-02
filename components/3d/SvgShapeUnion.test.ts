import * as THREE from "three"
import { describe, expect, it } from "vitest"
import { unionOverlappingSvgShapes } from "./SvgShapeUnion"

const rectangleShape = (
  x: number,
  y: number,
  width: number,
  height: number
) => {
  const shape = new THREE.Shape()
  shape.moveTo(x, y)
  shape.lineTo(x + width, y)
  shape.lineTo(x + width, y + height)
  shape.lineTo(x, y + height)
  shape.closePath()
  return shape
}

const shapeArea = (shape: THREE.Shape) =>
  Math.abs(THREE.ShapeUtils.area(shape.getPoints(4)))

describe("SvgShapeUnion", () => {
  it("keeps non-overlapping shapes separate", () => {
    const shapes = [rectangleShape(0, 0, 10, 10), rectangleShape(20, 0, 10, 10)]

    const merged = unionOverlappingSvgShapes(shapes)

    expect(merged).toBe(shapes)
    expect(merged).toHaveLength(2)
  })

  it("merges overlapping contours into one planar shape", () => {
    const merged = unionOverlappingSvgShapes([
      rectangleShape(0, 0, 10, 10),
      rectangleShape(5, 0, 10, 10),
    ])

    expect(merged).toHaveLength(1)
    expect(shapeArea(merged[0])).toBeCloseTo(150, 0)
  })
})
