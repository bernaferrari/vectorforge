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

const twoShape = () => {
  // Rough polygonal outline of a "2" (no holes, varying stroke, diagonal, curves approximated)
  const s = new THREE.Shape()
  s.moveTo(3, 9)
  s.lineTo(7.5, 9)
  s.lineTo(8, 8)
  s.lineTo(7.2, 6.8)
  s.lineTo(4.5, 5.5)
  s.lineTo(8, 5.5)
  s.lineTo(8, 3.8)
  s.lineTo(3, 3.8)
  s.lineTo(2.2, 4.5)
  s.lineTo(2, 1.2)
  s.lineTo(3, 0.6)
  s.lineTo(8, 0.6)
  s.lineTo(8, 0)
  s.lineTo(2, 0)
  s.lineTo(1.5, 1.5)
  s.lineTo(1.5, 5)
  s.lineTo(6.2, 5)
  s.lineTo(8, 7)
  s.lineTo(8, 9.5)
  s.lineTo(3, 9.5)
  s.lineTo(3, 9)
  return s
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

describe("createSvgShapeGeometry", () => {
  it("cut presets produce clean beveled extrusion geometry (Blender-style side chamfers + corner bevels)", () => {
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
    // For cut modes we now use the standard beveled extrude path (no custom medial roof caps)
    // so shapes like "2" get proper 3D side chamfers and corner bevels like the desired reference.
    expect(result!.extrude.bevelEnabled).toBe(true)
    expect(result!.extrude.bevelSegments).toBe(1)
    // Beveled geo has multiple Z levels from the chamfer shoulders + front/back.
    expect(countUniqueZ(result!.geometry)).toBeGreaterThanOrEqual(4)
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

  it("produces clean beveled geometry for solid shapes like digit 2 under cut presets", () => {
    const shape = twoShape()
    const result = createSvgShapeGeometry({
      shape,
      shapeSize: new THREE.Vector2(9, 10),
      baseExtrude: cutBase({ crownProfile: "inset" }),
      depthMultiplier: 1,
      bevelEnabled: true,
      isSlashOverlay: false,
      slashDepthRatio: 0.3,
    })
    expect(result).not.toBeNull()
    const position = result!.geometry.getAttribute("position")
    expect(position.count).toBeGreaterThan(30)
    // Standard beveled extrude path for cut modes now gives clean 3D "2" with side chamfers
    // to the corners + extended center, matching the desired reference photo.
    expect(countUniqueZ(result!.geometry)).toBeGreaterThanOrEqual(4)
    result!.geometry.dispose()
  })
})
