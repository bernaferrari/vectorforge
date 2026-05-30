"use client"

import { Dispatch, SetStateAction, useEffect } from "react"
import type { TimelinePropertyRow, TimelineTrack } from "../TimelineModel"
import type { TrackTimeEditor } from "./TimelineTypes"
import type { SelectedTimelineKeyframe } from "./TimelineTypes"

type TimelineSelectionGuardsOptions = {
  selectedKeyframe: SelectedTimelineKeyframe
  setSelectedKeyframe: Dispatch<SetStateAction<SelectedTimelineKeyframe>>
  timeEditor: TrackTimeEditor | null
  setTimeEditor: Dispatch<SetStateAction<TrackTimeEditor | null>>
  tracks: TimelineTrack[]
  propertyRows: TimelinePropertyRow[]
}

export function useTimelineSelectionGuards({
  selectedKeyframe,
  setSelectedKeyframe,
  timeEditor,
  setTimeEditor,
  tracks,
  propertyRows,
}: TimelineSelectionGuardsOptions) {
  useEffect(() => {
    if (!selectedKeyframe) return
    const exists =
      selectedKeyframe.type === "track"
        ? tracks.some(
            (track) =>
              track.id === selectedKeyframe.trackId &&
              track.keyframes.some(
                (keyframe) => keyframe.id === selectedKeyframe.kfId
              )
          )
        : propertyRows.some(
            (row) =>
              row.id === selectedKeyframe.rowId &&
              row.keyframes.some(
                (keyframe) => keyframe.id === selectedKeyframe.kfId
              )
          )
    if (!exists) {
      setSelectedKeyframe(null)
    }
  }, [propertyRows, selectedKeyframe, setSelectedKeyframe, tracks])

  useEffect(() => {
    if (!timeEditor) return
    const track = tracks.find((item) => item.id === timeEditor.trackId)
    if (
      !track ||
      !track.keyframes.some((item) => item.id === timeEditor.kfId)
    ) {
      setTimeEditor(null)
    }
  }, [setTimeEditor, timeEditor, tracks])
}
