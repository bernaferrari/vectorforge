import { createEditorId } from "./EditorModel"
import { keyframeTimeMatches } from "./EditorKeyframeModel"
import type { FillKeyframe } from "./TimelineModel"

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
  createIfMissing = true,
}: {
  keyframes: FillKeyframe[]
  time: number
  patch: Pick<FillKeyframe, "stops" | "gradientType">
  createIfMissing?: boolean
}) => {
  const existing = keyframes.find((keyframe) =>
    keyframeTimeMatches(keyframe.time, time)
  )

  if (existing) {
    return keyframes.map((keyframe) =>
      keyframe.id === existing.id ? { ...keyframe, ...patch } : keyframe
    )
  }

  if (!createIfMissing) return keyframes

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
