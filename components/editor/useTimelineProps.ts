"use client"

import { useMemo, type Dispatch, type SetStateAction } from "react"
import { PRESET_ICONS } from "./IconLibrary"
import { TIMELINE_WIPE_DIRECTIONS } from "./timeline/TimelineWipeDirections"
import type {
  EasingType,
  ShapeStop,
  TimelinePropertyRow,
  TimelineTrack,
} from "./TimelineModel"
import type { TimelineProps } from "./timeline/TimelineTypes"

type UseTimelinePropsArgs = {
  duration: number
  onDurationChange: (duration: number) => void
  currentTime: number
  onTimeChange: (time: number) => void
  onScrubStart: () => void
  isPlaying: boolean
  isPreviewLoading: boolean
  loop: boolean
  onLoopChange: (loop: boolean) => void
  tracks: TimelineTrack[]
  onTracksChange: (tracks: TimelineTrack[]) => void
  propertyRows: TimelinePropertyRow[]
  onClearTrackKeyframes: (trackId: string) => void
  onClearPropertyRow: (rowId: string) => void
  onTogglePropertyKeyframe: (rowId: string, keyframeId?: string | null) => void
  onRemovePropertyKeyframe: (rowId: string, keyframeId: string) => void
  onMovePropertyKeyframe: (
    rowId: string,
    keyframeId: string,
    time: number
  ) => void
  onSetPropertyEasing: (
    rowId: string,
    keyframeId: string | null,
    easing: EasingType
  ) => void
  activeTrackId: string | null
  onActiveTrackChange: (trackId: string) => void
  onActivePropertyRowChange: (rowId: string) => void
  shapes: ShapeStop[]
  selectedShapeId: string | null
  onSelectShape: (id: string) => void
  onShapesChange: Dispatch<SetStateAction<ShapeStop[]>>
  onAddShape: () => void
  onRemoveShape: (id: string) => void
  onShapeIconChange: TimelineProps["onShapeIconChange"]
  onShapeWipePairChange: TimelineProps["onShapeWipePairChange"]
  onUploadShape: (id: string) => void
  onShapeBlendChange: TimelineProps["onShapeBlendChange"]
  openShapePicker: string | null
  onOpenShapePicker: (id: string | null) => void
  markCustom: () => void
}

export function useTimelineProps({
  duration,
  onDurationChange,
  currentTime,
  onTimeChange,
  onScrubStart,
  isPlaying,
  isPreviewLoading,
  loop,
  onLoopChange,
  tracks,
  onTracksChange,
  propertyRows,
  onClearTrackKeyframes,
  onClearPropertyRow,
  onTogglePropertyKeyframe,
  onRemovePropertyKeyframe,
  onMovePropertyKeyframe,
  onSetPropertyEasing,
  activeTrackId,
  onActiveTrackChange,
  onActivePropertyRowChange,
  shapes,
  selectedShapeId,
  onSelectShape,
  onShapesChange,
  onAddShape,
  onRemoveShape,
  onShapeIconChange,
  onShapeWipePairChange,
  onUploadShape,
  onShapeBlendChange,
  openShapePicker,
  onOpenShapePicker,
  markCustom,
}: UseTimelinePropsArgs): TimelineProps {
  return useMemo(
    () => ({
      duration,
      onDurationChange,
      currentTime,
      onTimeChange,
      onScrubStart,
      isPlaying,
      isPreviewLoading,
      loop,
      onLoopChange,
      tracks,
      onTracksChange,
      propertyRows,
      onClearTrackKeyframes,
      onClearPropertyRow,
      onTogglePropertyKeyframe,
      onRemovePropertyKeyframe,
      onMovePropertyKeyframe,
      onSetPropertyEasing,
      activeTrackId,
      onActiveTrackChange,
      onActivePropertyRowChange,
      shapes,
      selectedShapeId,
      onSelectShape,
      onShapesChange: (nextShapes: ShapeStop[]) => {
        markCustom()
        onShapesChange(nextShapes)
      },
      onAddShape,
      onRemoveShape,
      onShapeEasingChange: (id: string, easing: EasingType) => {
        markCustom()
        onShapesChange((currentShapes) =>
          currentShapes.map((shape) =>
            shape.id === id ? { ...shape, easing } : shape
          )
        )
      },
      shapeOptions: PRESET_ICONS,
      onShapeIconChange,
      onShapeWipePairChange,
      onUploadShape,
      onShapeBlendChange,
      openShapePicker,
      onOpenShapePicker,
      wipeDirections: TIMELINE_WIPE_DIRECTIONS,
    }),
    [
      duration,
      onDurationChange,
      currentTime,
      onTimeChange,
      onScrubStart,
      isPlaying,
      isPreviewLoading,
      loop,
      onLoopChange,
      tracks,
      onTracksChange,
      propertyRows,
      onClearTrackKeyframes,
      onClearPropertyRow,
      onTogglePropertyKeyframe,
      onRemovePropertyKeyframe,
      onMovePropertyKeyframe,
      onSetPropertyEasing,
      activeTrackId,
      onActiveTrackChange,
      onActivePropertyRowChange,
      shapes,
      selectedShapeId,
      onSelectShape,
      onShapesChange,
      onAddShape,
      onRemoveShape,
      onShapeIconChange,
      onShapeWipePairChange,
      onUploadShape,
      onShapeBlendChange,
      openShapePicker,
      onOpenShapePicker,
      markCustom,
    ]
  )
}
