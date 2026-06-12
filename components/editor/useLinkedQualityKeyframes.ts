import { Dispatch, SetStateAction, useEffect } from "react"
import { ScalarKeyframe } from "./EditorModel"
import { keyframeTimeMatches } from "./EditorKeyframeModel"
import { TimelineTrack } from "./TimelineModel"

const keyframesAreEqual = (
  previous: ScalarKeyframe[],
  next: ScalarKeyframe[]
) =>
  previous.length === next.length &&
  previous.every((keyframe, index) => {
    const candidate = next[index]
    return (
      keyframe.id === candidate.id &&
      Math.abs(keyframe.time - candidate.time) < 0.001 &&
      Math.abs(keyframe.value - candidate.value) < 0.0001 &&
      keyframe.easing === candidate.easing
    )
  })

export const useLinkedQualityKeyframes = ({
  tracks,
  geometryQuality,
  setQualityKeyframes,
}: {
  tracks: TimelineTrack[]
  geometryQuality: number
  setQualityKeyframes: Dispatch<SetStateAction<ScalarKeyframe[]>>
}) => {
  useEffect(() => {
    const geometryTrack = tracks.find((track) => track.id === "extrusion")
    if (!geometryTrack || geometryTrack.keyframes.length === 0) {
      setQualityKeyframes((previous) => (previous.length === 0 ? previous : []))
      return
    }

    setQualityKeyframes((previous) => {
      const previousByLinkedId = new Map(
        previous.map((keyframe) => [keyframe.id, keyframe])
      )
      const next = geometryTrack.keyframes.map((keyframe) => {
        const linkedId = `quality-${keyframe.id}`
        const existing =
          previousByLinkedId.get(linkedId) ??
          previous.find((item) => keyframeTimeMatches(item.time, keyframe.time))

        return {
          id: linkedId,
          time: keyframe.time,
          value: existing?.value ?? geometryQuality,
          easing: keyframe.easing,
        }
      })

      return keyframesAreEqual(previous, next) ? previous : next
    })
  }, [tracks, geometryQuality, setQualityKeyframes])
}
