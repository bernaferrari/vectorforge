import * as THREE from "three"
import { describe, expect, it } from "vitest"
import { createSvgShapeGeometry } from "./SvgShapeGeometry"

const squareShape = () => {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.lineTo(10, 0)
  shape.lineTo(10, 10)
  shape.lineTo(0, 10)
  shape.lineTo(0, 0)
  return shape
}

describe("createSvgShapeGeometry", () => {
  it("insets and raises the front cap for crown geometry", () => {
    const result = createSvgShapeGeometry({
      shape: squareShape(),
      shapeSize: new THREE.Vector2(10, 10),
      baseExtrude: {
        depth: 1,
        bevelSize: 0.4,
        bevelThickness: 0.4,
        bevelSegments: 4,
        curveSegments: 12,
        crownEnabled: true,
        crownHeight: 0.35,
        crownWidth: 2,
        crownInset: 0.12,
      },
      depthMultiplier: 1,
      bevelEnabled: true,
      isSlashOverlay: false,
      slashDepthRatio: 0.35,
    })

    expect(result).not.toBeNull()
    const position = result!.geometry.getAttribute("position")
    let maxZ = -Infinity
    for (let index = 0; index < position.count; index += 1) {
      maxZ = Math.max(maxZ, position.getZ(index))
    }

    let maxXAtRaisedCap = -Infinity
    for (let index = 0; index < position.count; index += 1) {
      if (position.getZ(index) > maxZ - 0.001) {
        maxXAtRaisedCap = Math.max(maxXAtRaisedCap, position.getX(index))
      }
    }

    expect(maxZ).toBeGreaterThan(0.65)
    expect(maxXAtRaisedCap).toBeLessThan(10)
    result!.geometry.dispose()
  })

})
