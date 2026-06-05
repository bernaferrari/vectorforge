import * as THREE from "three"
import { describe, expect, it } from "vitest"
import {
  safeShapeExtrudeSettings,
  type SvgExtrudeBaseSettings,
} from "./SvgExtrudeSettings"

const createHoledIconShape = () => {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.lineTo(24, 0)
  shape.lineTo(24, 24)
  shape.lineTo(0, 24)
  shape.lineTo(0, 0)

  const hole = new THREE.Path()
  hole.moveTo(11, 11)
  hole.lineTo(13, 11)
  hole.lineTo(13, 13)
  hole.lineTo(11, 13)
  hole.lineTo(11, 11)
  shape.holes.push(hole)

  return shape
}

const baseSettings = (crownEnabled: boolean): SvgExtrudeBaseSettings => ({
  depth: 1,
  bevelSize: 0.4,
  bevelThickness: 0.4,
  bevelSegments: 4,
  curveSegments: 24,
  crownEnabled,
  crownProfile: "outer",
  crownAmount: crownEnabled ? 0.8 : 0,
  crownHeight: crownEnabled ? 0.36 : 0,
  crownWidth: crownEnabled ? 1.6 : 0,
  crownInset: crownEnabled ? 0.1 : 0,
})

describe("safeShapeExtrudeSettings", () => {
  it("allows graphite crown cuts to remain visible on holed account-style icons", () => {
    const shape = createHoledIconShape()
    const shapeSize = new THREE.Vector2(24, 24)

    const normal = safeShapeExtrudeSettings({
      shape,
      shapeSize,
      base: baseSettings(false),
      depthMultiplier: 1,
      bevelEnabled: true,
      slashDepthRatio: 0.35,
      isSlashOverlay: false,
    })
    const graphiteCut = safeShapeExtrudeSettings({
      shape,
      shapeSize,
      base: baseSettings(true),
      depthMultiplier: 1,
      bevelEnabled: true,
      slashDepthRatio: 0.35,
      isSlashOverlay: false,
    })

    expect(graphiteCut.bevelEnabled).toBe(true)
    expect(graphiteCut.bevelSize).toBeGreaterThan(normal.bevelSize * 4)
    expect(graphiteCut.bevelThickness).toBeGreaterThan(
      normal.bevelThickness * 4
    )
  })

  it("lets cut bevels approach the contour medial limit", () => {
    const shape = createHoledIconShape()
    const shapeSize = new THREE.Vector2(24, 24)

    const graphiteCut = safeShapeExtrudeSettings({
      shape,
      shapeSize,
      base: {
        ...baseSettings(true),
        depth: 10,
        bevelSize: 10,
        bevelThickness: 10,
      },
      depthMultiplier: 1,
      bevelEnabled: true,
      slashDepthRatio: 0.35,
      isSlashOverlay: false,
    })

    expect(graphiteCut.bevelSize).toBeCloseTo(0.98)
    expect(graphiteCut.bevelThickness).toBeCloseTo(0.98)
    expect(graphiteCut.bevelSegments).toBe(1)
  })
})
