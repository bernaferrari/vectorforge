import { useEffect } from "react"
import { useLatestRef } from "@/lib/use-latest-ref"
import type {
  ShapeStop,
  TimelinePropertyRow,
  TimelineTrack,
} from "../TimelineModel"
import type { SelectedTimelineKeyframe } from "./TimelineTypes"
import { isEditableTarget } from "./TimelineGeometry"

type TimelineDeletionOptions = {
  selectedKeyframe: SelectedTimelineKeyframe
  selectedShapeId: string | null
  shapes: ShapeStop[]
  tracks: TimelineTrack[]
  propertyRows: TimelinePropertyRow[]
  onClearSelection: () => void
  onRemoveShape: (shapeId: string) => void
  onRemoveTrackKeyframe: (trackId: string, keyframeId: string) => void
  onRemovePropertyKeyframe?: (rowId: string, keyframeId: string) => void
}

export const useTimelineDeletion = ({
  selectedKeyframe,
  selectedShapeId,
  shapes,
  tracks,
  propertyRows,
  onClearSelection,
  onRemoveShape,
  onRemoveTrackKeyframe,
  onRemovePropertyKeyframe,
}: TimelineDeletionOptions) => {
  const optionsRef = useLatestRef({
    selectedKeyframe,
    selectedShapeId,
    shapes,
    tracks,
    propertyRows,
    onClearSelection,
    onRemoveShape,
    onRemoveTrackKeyframe,
    onRemovePropertyKeyframe,
  })

  useEffect(() => {
    const handleDeleteSelectedKeyframe = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (event.key !== "Delete" && event.key !== "Backspace") return
      if (isEditableTarget(event.target)) return

      const {
        selectedKeyframe,
        selectedShapeId,
        shapes,
        tracks,
        propertyRows,
        onClearSelection,
        onRemoveShape,
        onRemoveTrackKeyframe,
        onRemovePropertyKeyframe,
      } = optionsRef.current

      if (!selectedKeyframe) {
        if (!selectedShapeId || shapes.length <= 1) return
        event.preventDefault()
        onRemoveShape(selectedShapeId)
        return
      }

      if (selectedKeyframe.type === "track") {
        const track = tracks.find(
          (item) => item.id === selectedKeyframe.trackId
        )
        if (
          !track?.keyframes.some(
            (keyframe) => keyframe.id === selectedKeyframe.kfId
          )
        )
          return
        event.preventDefault()
        onRemoveTrackKeyframe(selectedKeyframe.trackId, selectedKeyframe.kfId)
        return
      }

      const row = propertyRows.find(
        (item) => item.id === selectedKeyframe.rowId
      )
      if (
        !row?.keyframes.some(
          (keyframe) => keyframe.id === selectedKeyframe.kfId
        )
      )
        return
      event.preventDefault()
      onClearSelection()
      onRemovePropertyKeyframe?.(selectedKeyframe.rowId, selectedKeyframe.kfId)
    }

    window.addEventListener("keydown", handleDeleteSelectedKeyframe)
    return () =>
      window.removeEventListener("keydown", handleDeleteSelectedKeyframe)
  }, [])
}
