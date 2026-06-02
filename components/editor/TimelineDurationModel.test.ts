import { describe, expect, it } from "vitest"
import {
  clampTimelineDuration,
  scaleKeyframeTimes,
  scaleShapeStopTimes,
  scaleTimelineTime,
  scaleTimelineTrackTimes,
} from "./TimelineDurationModel"
import type { ShapeStop, TimelineTrack } from "./TimelineModel"

describe("TimelineDurationModel", () => {
  it("clamps editable durations to the supported timeline range", () => {
    expect(clampTimelineDuration(0.1)).toBe(0.5)
    expect(clampTimelineDuration(4.46)).toBe(4.5)
    expect(clampTimelineDuration(90)).toBe(30)
  })

  it("scales and frame-quantizes a single timeline time", () => {
    expect(scaleTimelineTime({ time: 2.5, ratio: 2, duration: 5 })).toBe(5)
    expect(scaleTimelineTime({ time: 10, ratio: 2, duration: 5 })).toBe(5)
    expect(scaleTimelineTime({ time: 0.123, ratio: 1, duration: 5 })).toBe(
      0.117
    )
  })

  it("keeps keyframes sorted after proportional scaling", () => {
    const scaled = scaleKeyframeTimes(
      [
        { id: "b", time: 3, value: 2 },
        { id: "a", time: 1, value: 1 },
      ],
      0.5,
      5
    )

    expect(scaled.map((keyframe) => keyframe.id)).toEqual(["a", "b"])
    expect(scaled.map((keyframe) => keyframe.time)).toEqual([0.5, 1.5])
  })

  it("rescales nested shape fill keyframes with shape stops", () => {
    const shape: ShapeStop = {
      id: "shape-a",
      time: 2,
      iconId: "heart",
      iconName: "Heart",
      svgContent: "<svg />",
      color: "#ffffff",
      colorSecondary: "#000000",
      easing: "ease-in-out",
      transitionType: "wipe",
      wipeDirection: { x: 1, y: 0 },
      fillKeyframes: [
        {
          id: "fill-a",
          time: 1,
          easing: "linear",
          gradientType: "mesh",
          stops: [{ id: "stop-a", color: "#fff", position: 0 }],
        },
      ],
    }

    const [scaled] = scaleShapeStopTimes([shape], 2, 8)

    expect(scaled.time).toBe(4)
    expect(scaled.fillKeyframes?.[0]?.time).toBe(2)
  })

  it("rescales timeline track keyframes without changing track metadata", () => {
    const track: TimelineTrack = {
      id: "rotation",
      name: "Rotation",
      color: "#ffd23f",
      min: 0,
      max: 360,
      defaultValue: 0,
      keyframes: [
        { id: "start", time: 0, value: 0, easing: "ease-in-out" },
        { id: "end", time: 5, value: 360, easing: "ease-in-out" },
      ],
    }

    const [scaled] = scaleTimelineTrackTimes([track], 0.5, 2.5)

    expect(scaled.name).toBe("Rotation")
    expect(scaled.keyframes.map((keyframe) => keyframe.time)).toEqual([0, 2.5])
  })
})
