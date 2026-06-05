import * as THREE from "three"
import { describe, expect, it } from "vitest"
import { createSvgShapeGeometry } from "./SvgShapeGeometry"
import type { SvgExtrudeBaseSettings } from "./SvgExtrudeSettings"

const squareShape = () => {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.lineTo(10, 0)
  shape.lineTo(10, 10)
  shape.lineTo(0, 10)
  shape.lineTo(0, 0)
  return shape
}

const holedCircleShape = () => {
  const shape = new THREE.Shape()
  shape.absarc(5, 5, 5, 0, Math.PI * 2, false)

  const hole = new THREE.Path()
  hole.absarc(5, 5, 1.6, 0, Math.PI * 2, true)
  shape.holes.push(hole)

  return shape
}

const cutBase = (
  overrides: Partial<SvgExtrudeBaseSettings> = {}
): SvgExtrudeBaseSettings => ({
  depth: 1,
  bevelSize: 0.35,
  bevelThickness: 0.35,
  bevelSegments: 1,
  curveSegments: 24,
  crownEnabled: true,
  crownProfile: "outer",
  crownAmount: 0.8,
  crownHeight: 0.9,
  crownWidth: 1.4,
  crownInset: 0.1,
  ...overrides,
})

const countUniqueZ = (geometry: THREE.BufferGeometry) => {
  const position = geometry.getAttribute("position")
  const values = new Set<string>()
  for (let index = 0; index < position.count; index += 1) {
    values.add(position.getZ(index).toFixed(4))
  }
  return values.size
}

const countHorizontalTriangles = (geometry: THREE.BufferGeometry) => {
  const position = geometry.getAttribute("position")
  let count = 0
  for (let index = 0; index < position.count; index += 3) {
    const z0 = position.getZ(index)
    const z1 = position.getZ(index + 1)
    const z2 = position.getZ(index + 2)
    if (Math.abs(z0 - z1) < 0.0001 && Math.abs(z0 - z2) < 0.0001) count += 1
  }
  return count
}

describe("createSvgShapeGeometry", () => {
  it("splits cut caps into sharp triangular facets", () => {
    const result = createSvgShapeGeometry({
      shape: squareShape(),
      shapeSize: new THREE.Vector2(10, 10),
      baseExtrude: cutBase({ bevelSegments: 5 }),
      depthMultiplier: 1,
      bevelEnabled: true,
      isSlashOverlay: false,
      slashDepthRatio: 0.35,
    })

    expect(result).not.toBeNull()
    expect(result!.extrude.bevelEnabled).toBe(true)
    expect(result!.extrude.bevelSegments).toBe(1)
    expect(countUniqueZ(result!.geometry)).toBe(4)
    expect(countHorizontalTriangles(result!.geometry)).toBe(0)
    result!.geometry.dispose()
  })

  it("keeps native bevels valid on icons with counters", () => {
    const result = createSvgShapeGeometry({
      shape: holedCircleShape(),
      shapeSize: new THREE.Vector2(10, 10),
      baseExtrude: cutBase(),
      depthMultiplier: 1,
      bevelEnabled: true,
      isSlashOverlay: false,
      slashDepthRatio: 0.35,
    })

    expect(result).not.toBeNull()
    expect(result!.geometry.getAttribute("position").count).toBeGreaterThan(0)
    expect(result!.extrude.bevelEnabled).toBe(true)
    expect(result!.extrude.bevelSegments).toBe(1)
    result!.geometry.dispose()
  })

  it("keeps slash overlays shallower and less beveled than cut bodies", () => {
    const shape = squareShape()
    const shapeSize = new THREE.Vector2(10, 10)
    const baseExtrude = cutBase()

    const body = createSvgShapeGeometry({
      shape,
      shapeSize,
      baseExtrude,
      depthMultiplier: 1,
      bevelEnabled: true,
      isSlashOverlay: false,
      slashDepthRatio: 0.16,
    })
    const slash = createSvgShapeGeometry({
      shape,
      shapeSize,
      baseExtrude,
      depthMultiplier: 1,
      bevelEnabled: true,
      isSlashOverlay: true,
      slashDepthRatio: 0.16,
    })

    expect(body).not.toBeNull()
    expect(slash).not.toBeNull()
    expect(slash!.extrude.shapeDepth).toBeLessThan(body!.extrude.shapeDepth)
    expect(slash!.extrude.bevelSize).toBeLessThan(body!.extrude.bevelSize)
    expect(slash!.extrude.bevelThickness).toBeLessThan(
      body!.extrude.bevelThickness
    )
    body!.geometry.dispose()
    slash!.geometry.dispose()
  })
})
