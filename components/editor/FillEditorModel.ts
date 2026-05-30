import { createEditorId } from "./EditorModel"
import type { FillKeyframe } from "./TimelineModel"

const FILL_KEYFRAME_TIME_THRESHOLD = 0.04

export const previousFillEasing = (
  keyframes: FillKeyframe[],
  time: number
): FillKeyframe["easing"] =>
  [...keyframes]
    .sort((a, b) => a.time - b.time)
    .filter((keyframe) => keyframe.time <= time)
    .pop()?.easing ?? "ease-in-out"

export const upsertFillKeyframe = ({
  keyframes,
  time,
  patch,
}: {
  keyframes: FillKeyframe[]
  time: number
  patch: Pick<FillKeyframe, "stops" | "gradientType">
}) => {
  const existing = keyframes.find(
    (keyframe) => Math.abs(keyframe.time - time) < FILL_KEYFRAME_TIME_THRESHOLD
  )

  if (existing) {
    return keyframes.map((keyframe) =>
      keyframe.id === existing.id ? { ...keyframe, ...patch } : keyframe
    )
  }

  return [
    ...keyframes,
    {
      id: createEditorId("fill"),
      time,
      ...patch,
      easing: previousFillEasing(keyframes, time),
    },
  ].sort((a, b) => a.time - b.time)
}
