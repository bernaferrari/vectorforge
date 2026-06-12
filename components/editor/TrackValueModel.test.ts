import { describe, expect, it } from "vitest"
import { setScalarTrackValueAtTime } from "./TrackValueModel"
import type { TimelineTrack } from "./TimelineModel"

const scaleTrack = (keyframes: TimelineTrack["keyframes"] = []) => ({
  id: "scale",
  name: "Scale",
  color: "#a78bfa",
  min: 0.1,
  max: 3,
  defaultValue: 1,
  keyframes,
})

describe("setScalarTrackValueAtTime", () => {
  it("keeps scalar edits static until animation is armed", () => {
    const result = setScalarTrackValueAtTime({
      tracks: [scaleTrack()],
      trackId: "scale",
      value: 1.5,
      time: 1,
      duration: 5,
    })

    expect(result.tracks[0].defaultValue).toBe(1.5)
    expect(result.tracks[0].keyframes).toHaveLength(0)
  })

  it("creates a scalar keyframe when auto-key is armed", () => {
    const result = setScalarTrackValueAtTime({
      tracks: [scaleTrack()],
      trackId: "scale",
      value: 1.5,
      time: 1,
      duration: 5,
      createIfMissing: true,
    })

    expect(result.tracks[0].defaultValue).toBe(1.5)
    expect(result.tracks[0].keyframes).toEqual([
      expect.objectContaining({
        time: 1,
        value: 1.5,
        easing: "ease-in-out",
      }),
    ])
  })

  it("does not add new scalar keyframes to an animated track when auto-key is off", () => {
    const result = setScalarTrackValueAtTime({
      tracks: [
        scaleTrack([
          {
            id: "scale-a",
            time: 0,
            value: 1,
            easing: "ease-in-out",
          },
        ]),
      ],
      trackId: "scale",
      value: 1.5,
      time: 1,
      duration: 5,
      createIfMissing: false,
    })

    expect(result.tracks[0].defaultValue).toBe(1.5)
    expect(result.tracks[0].keyframes).toHaveLength(1)
    expect(result.tracks[0].keyframes[0]).toEqual(
      expect.objectContaining({ id: "scale-a", value: 1 })
    )
  })

  it("updates an existing playhead keyframe while auto-key is off", () => {
    const result = setScalarTrackValueAtTime({
      tracks: [
        scaleTrack([
          {
            id: "scale-a",
            time: 1,
            value: 1,
            easing: "ease-in-out",
          },
        ]),
      ],
      trackId: "scale",
      value: 1.5,
      time: 1,
      duration: 5,
      createIfMissing: false,
    })

    expect(result.tracks[0].keyframes[0]).toEqual(
      expect.objectContaining({ id: "scale-a", value: 1.5 })
    )
  })
})
