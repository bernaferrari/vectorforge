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
  it("adds a raised center surface for crown geometry", () => {
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
        crownProfile: "outer",
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

    let raisedInteriorVertexCount = 0
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index)
      const y = position.getY(index)
      const z = position.getZ(index)
      if (z > 0.65 && x > 2 && x < 8 && y > 2 && y < 8)
        raisedInteriorVertexCount += 1
    }

    expect(maxZ).toBeGreaterThan(0.65)
    expect(raisedInteriorVertexCount).toBeGreaterThan(0)
    result!.geometry.dispose()
  })

  it("keeps raised center geometry out of counters and holes", () => {
    const shape = squareShape()
    const hole = new THREE.Path()
    hole.moveTo(4, 4)
    hole.lineTo(6, 4)
    hole.lineTo(6, 6)
    hole.lineTo(4, 6)
    hole.lineTo(4, 4)
    shape.holes.push(hole)

    const result = createSvgShapeGeometry({
      shape,
      shapeSize: new THREE.Vector2(10, 10),
      baseExtrude: {
        depth: 1,
        bevelSize: 0.35,
        bevelThickness: 0.35,
        bevelSegments: 3,
        curveSegments: 12,
        crownEnabled: true,
        crownProfile: "outer",
        crownHeight: 0.45,
        crownWidth: 1.4,
        crownInset: 0,
      },
      depthMultiplier: 1,
      bevelEnabled: true,
      isSlashOverlay: false,
      slashDepthRatio: 0.35,
    })

    expect(result).not.toBeNull()
    const position = result!.geometry.getAttribute("position")
    let raisedVertexCount = 0
    let raisedHoleVertexCount = 0
    let maxZ = -Infinity

    for (let index = 0; index < position.count; index += 1) {
      maxZ = Math.max(maxZ, position.getZ(index))
    }

    for (let index = 0; index < position.count; index += 1) {
      const z = position.getZ(index)
      if (z < maxZ - 0.1) continue
      raisedVertexCount += 1
      const x = position.getX(index)
      const y = position.getY(index)
      if (x > 4 && x < 6 && y > 4 && y < 6) raisedHoleVertexCount += 1
    }

    expect(raisedVertexCount).toBeGreaterThan(0)
    expect(raisedHoleVertexCount).toBe(0)
    result!.geometry.dispose()
  })

  it("inverts the center height for incut geometry", () => {
    const result = createSvgShapeGeometry({
      shape: squareShape(),
      shapeSize: new THREE.Vector2(10, 10),
      baseExtrude: {
        depth: 1,
        bevelSize: 0.35,
        bevelThickness: 0.35,
        bevelSegments: 3,
        curveSegments: 12,
        crownEnabled: true,
        crownProfile: "inset",
        crownHeight: 0.5,
        crownWidth: 1.4,
        crownInset: 0,
      },
      depthMultiplier: 1,
      bevelEnabled: true,
      isSlashOverlay: false,
      slashDepthRatio: 0.35,
    })

    expect(result).not.toBeNull()
    const position = result!.geometry.getAttribute("position")
    let centerMaxZ = -Infinity
    let edgeMaxZ = -Infinity

    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index)
      const y = position.getY(index)
      const z = position.getZ(index)
      if (x > 4 && x < 6 && y > 4 && y < 6) centerMaxZ = Math.max(centerMaxZ, z)
      if (x < 1 || x > 9 || y < 1 || y > 9) edgeMaxZ = Math.max(edgeMaxZ, z)
    }

    expect(edgeMaxZ).toBeGreaterThan(centerMaxZ + 0.1)
    result!.geometry.dispose()
  })
})
