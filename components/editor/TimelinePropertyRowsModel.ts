import type { MaterialKeyframe, Vector3Keyframe } from "./EditorModel"
import { MOVE_COLOR, ROTATION_COLOR, clampNumber } from "./EditorModel"
import type { FillKeyframe, TimelinePropertyRow } from "./TimelineModel"

export const createStyleTimelineKeyframeTimes = ({
  fillKeyframes,
  materialKeyframes,
  duration,
}: {
  fillKeyframes: FillKeyframe[]
  materialKeyframes: MaterialKeyframe[]
  duration: number
}) =>
  Array.from(
    new Map(
      [...fillKeyframes, ...materialKeyframes].map((keyframe) => [
        Number(keyframe.time.toFixed(3)),
        clampNumber(keyframe.time, 0, duration),
      ])
    ).values()
  ).sort((a, b) => a - b)

export const createTimelinePropertyRows = ({
  fillKeyframes,
  materialKeyframes,
  keyLightPositionKeyframes,
  rotationAxisKeyframes,
  moveKeyframes,
  duration,
}: {
  fillKeyframes: FillKeyframe[]
  materialKeyframes: MaterialKeyframe[]
  keyLightPositionKeyframes: Vector3Keyframe[]
  rotationAxisKeyframes: Vector3Keyframe[]
  moveKeyframes: Vector3Keyframe[]
  duration: number
}): TimelinePropertyRow[] => {
  const styleTimes = createStyleTimelineKeyframeTimes({
    fillKeyframes,
    materialKeyframes,
    duration,
  })

  return [
    ...(styleTimes.length
      ? [
          {
            id: "style",
            name: "Style",
            color: "#a78bfa",
            keyframes: styleTimes.map((time) => ({
              id: `style-${time.toFixed(3)}`,
              time,
              label: "Style",
              easing:
                fillKeyframes.find(
                  (keyframe) => Math.abs(keyframe.time - time) < 0.04
                )?.easing ??
                materialKeyframes.find(
                  (keyframe) => Math.abs(keyframe.time - time) < 0.04
                )?.easing,
            })),
          },
        ]
      : []),
    ...(keyLightPositionKeyframes.length
      ? [
          {
            id: "light-position",
            name: "Light Position",
            color: "#ffd166",
            keyframes: keyLightPositionKeyframes.map((keyframe) => ({
              id: keyframe.id,
              time: keyframe.time,
              label: `X ${keyframe.value.x.toFixed(1)} Y ${keyframe.value.y.toFixed(1)} Z ${keyframe.value.z.toFixed(1)}`,
              easing: keyframe.easing,
            })),
          },
        ]
      : []),
    ...(rotationAxisKeyframes.length
      ? [
          {
            id: "rotation",
            name: "Rotation",
            color: ROTATION_COLOR,
            keyframes: rotationAxisKeyframes.map((keyframe) => ({
              id: keyframe.id,
              time: keyframe.time,
              label: `X ${keyframe.value.x.toFixed(0)} Y ${keyframe.value.y.toFixed(0)} Z ${keyframe.value.z.toFixed(0)}`,
              easing: keyframe.easing,
            })),
          },
        ]
      : []),
    ...(moveKeyframes.length
      ? [
          {
            id: "move",
            name: "Move",
            color: MOVE_COLOR,
            keyframes: moveKeyframes.map((keyframe) => ({
              id: keyframe.id,
              time: keyframe.time,
              label: `X ${keyframe.value.x.toFixed(0)} Y ${keyframe.value.y.toFixed(0)} Z ${keyframe.value.z.toFixed(0)}`,
              easing: keyframe.easing,
            })),
          },
        ]
      : []),
  ]
}
