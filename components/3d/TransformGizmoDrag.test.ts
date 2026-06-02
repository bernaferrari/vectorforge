import { describe, expect, it } from "vitest"
import {
  nextRotationDragUpdate,
  rotationDialAngleFromPointer,
  shortestAngleDelta,
  type RotationDragScreenFrame,
} from "./TransformGizmoDrag"

const baseDragFrame: RotationDragScreenFrame = {
  startAngle: 0,
  lastAngle: 0,
  sweepDelta: 0,
  startValue: 15,
  center: { x: 100, y: 100 },
  basisX: { x: 50, y: 0 },
  basisY: { x: 0, y: 50 },
}

describe("TransformGizmoDrag", () => {
  it("unwraps angle deltas across the -180/180 boundary", () => {
    expect(shortestAngleDelta(-170, 170)).toBe(20)
    expect(shortestAngleDelta(170, -170)).toBe(-20)
  })

  it("accumulates rotation sweeps beyond a single half-turn", () => {
    const first = nextRotationDragUpdate(
      { ...baseDragFrame, lastAngle: 170, sweepDelta: 170 },
      -170
    )
    const second = nextRotationDragUpdate(first.frame, -90)

    expect(first.delta).toBe(190)
    expect(first.value).toBe(205)
    expect(second.delta).toBe(270)
    expect(second.value).toBe(285)
  })

  it("projects pointer coordinates into the frozen drag ellipse basis", () => {
    expect(
      rotationDialAngleFromPointer({
        frame: baseDragFrame,
        clientX: 150,
        clientY: 100,
      })
    ).toBeCloseTo(0)

    expect(
      rotationDialAngleFromPointer({
        frame: baseDragFrame,
        clientX: 100,
        clientY: 150,
      })
    ).toBeCloseTo(90)
  })
})
