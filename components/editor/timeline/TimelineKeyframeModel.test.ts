import { describe, expect, it } from "vitest"
import type { TimelineTrack } from "../TimelineModel"
import {
  clampTrackKeyframeBlockDelta,
  offsetTrackKeyframeBlock,
  setTrackKeyframeTime,
  snapTrackKeyframeBlockDelta,
} from "./TimelineKeyframeModel"

const rotationTrack: TimelineTrack = {
  id: "rotation",
  name: "Rotation",
  color: "#ffd23f",
  min: 0,
  max: 360,
  defaultValue: 0,
  keyframes: [
    { id: "a", time: 1, value: 0, easing: "linear" },
    { id: "b", time: 3, value: 360, easing: "ease-in-out" },
  ],
}

describe("TimelineKeyframeModel", () => {
  it("clamps block movement so grouped keyframes stay inside the timeline", () => {
    const initial = rotationTrack.keyframes.map(({ id, time }) => ({
      id,
      time,
    }))

    expect(
      clampTrackKeyframeBlockDelta({ initial, delta: -2, duration: 5 })
    ).toBe(-1)
    expect(
      clampTrackKeyframeBlockDelta({ initial, delta: 3, duration: 5 })
    ).toBe(2)
  })

  it("snaps a keyframe block to nearby targets", () => {
    expect(
      snapTrackKeyframeBlockDelta({
        initial: [{ id: "a", time: 1 }],
        delta: 0.48,
        targets: [{ time: 1.5, threshold: 0.05 }],
        duration: 5,
      })
    ).toBeCloseTo(0.5)
  })

  it("moves all keyframes in a dragged block by the same delta", () => {
    const [track] = offsetTrackKeyframeBlock({
      tracks: [rotationTrack],
      trackId: "rotation",
      initial: [
        { id: "a", time: 1 },
        { id: "b", time: 3 },
      ],
      delta: 1,
      duration: 5,
      frameSnapActive: false,
    })

    expect(track.keyframes.map((keyframe) => keyframe.time)).toEqual([2, 4])
  })

  it("quantizes edited keyframe time when frame snapping is active", () => {
    const [track] = setTrackKeyframeTime({
      tracks: [rotationTrack],
      trackId: "rotation",
      keyframeId: "a",
      time: 1.123,
      duration: 5,
      frameSnapActive: true,
    })

    expect(track.keyframes[0].time).toBe(1.117)
  })
})
