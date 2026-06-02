"use client"

import { useCallback, type Dispatch, type SetStateAction } from "react"
import type {
  LightPosition,
  MaterialKeyframe,
  MaterialSettings,
  MotionTrackId,
  ScalarKeyframe,
  Vector3Keyframe,
} from "./EditorModel"
import { useTimelineDockController } from "./useTimelineDockController"
import { useTimelineProps } from "./useTimelineProps"
import type { ShapeOption } from "./timeline/TimelineTypes"
import type { FillKeyframe, ShapeStop, TimelineTrack } from "./TimelineModel"

type UseEditorTimelineSurfaceArgs = {
  currentTime: number
  setCurrentTime: Dispatch<SetStateAction<number>>
  duration: number
  setDuration: Dispatch<SetStateAction<number>>
  seekToTime: (time: number, options?: { animated?: boolean }) => void
  cancelAnimatedSeek: () => void
  stopPlayback: () => void
  isPlaying: boolean
  isPreviewModelReady: boolean
  loop: boolean
  setLoop: Dispatch<SetStateAction<boolean>>
  tracks: TimelineTrack[]
  setTracks: Dispatch<SetStateAction<TimelineTrack[]>>
  sortedShapes: ShapeStop[]
  shapes: ShapeStop[]
  setShapes: Dispatch<SetStateAction<ShapeStop[]>>
  selectedShapeId: string | null
  setSelectedShapeId: Dispatch<SetStateAction<string | null>>
  openShapePicker: string | null
  setOpenShapePicker: Dispatch<SetStateAction<string | null>>
  selectedMotionTrackId: string | null
  selectTimelineTrack: (trackId: string) => void
  selectTimelinePropertyRow: (rowId: string) => void
  fillKeyframes: FillKeyframe[]
  setFillKeyframes: Dispatch<SetStateAction<FillKeyframe[]>>
  materialKeyframes: MaterialKeyframe[]
  setMaterialKeyframes: Dispatch<SetStateAction<MaterialKeyframe[]>>
  keyLightPositionKeyframes: Vector3Keyframe[]
  setKeyLightPositionKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  rotationAxisKeyframes: Vector3Keyframe[]
  setRotationAxisKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  moveKeyframes: Vector3Keyframe[]
  setMoveKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  setQualityKeyframes: Dispatch<SetStateAction<ScalarKeyframe[]>>
  setInnerScaleKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  selectedShapeFillStops: FillKeyframe["stops"]
  selectedShapeGradientType: FillKeyframe["gradientType"]
  activeMaterialSettings: MaterialSettings
  activeKeyLightPosition: LightPosition
  activeRotationOffset: LightPosition
  activeMoveOffset: LightPosition
  setShapeIcon: (id: string, option: ShapeOption) => void
  setShapeWipePair: (
    id: string,
    enabled: ShapeOption,
    disabled: ShapeOption
  ) => void
  addShapeAtPlayhead: () => void
  removeShape: (id: string) => void
  triggerShapeUpload: (id: string) => void
  markCustom: () => void
}

export function useEditorTimelineSurface({
  currentTime,
  setCurrentTime,
  duration,
  setDuration,
  seekToTime,
  cancelAnimatedSeek,
  stopPlayback,
  isPlaying,
  isPreviewModelReady,
  loop,
  setLoop,
  tracks,
  setTracks,
  sortedShapes,
  shapes,
  setShapes,
  selectedShapeId,
  setSelectedShapeId,
  openShapePicker,
  setOpenShapePicker,
  selectedMotionTrackId,
  selectTimelineTrack,
  selectTimelinePropertyRow,
  fillKeyframes,
  setFillKeyframes,
  materialKeyframes,
  setMaterialKeyframes,
  keyLightPositionKeyframes,
  setKeyLightPositionKeyframes,
  rotationAxisKeyframes,
  setRotationAxisKeyframes,
  moveKeyframes,
  setMoveKeyframes,
  setQualityKeyframes,
  setInnerScaleKeyframes,
  selectedShapeFillStops,
  selectedShapeGradientType,
  activeMaterialSettings,
  activeKeyLightPosition,
  activeRotationOffset,
  activeMoveOffset,
  setShapeIcon,
  setShapeWipePair,
  addShapeAtPlayhead,
  removeShape,
  triggerShapeUpload,
  markCustom,
}: UseEditorTimelineSurfaceArgs) {
  const {
    timelinePropertyRows,
    previousBreakpoint,
    nextBreakpoint,
    atTimelineStart,
    atTimelineEnd,
    playbackProgress,
    goToPreviousBreakpoint,
    goToNextBreakpoint,
    goToEnd,
    handleDurationChange,
    handleTracksChange,
    clearTimelineTrackRow,
    clearTimelinePropertyRow,
    toggleTimelinePropertyKeyframe,
    removeTimelinePropertyKeyframe,
    moveTimelinePropertyKeyframe,
    setTimelinePropertyEasing,
    setShapeBlend,
  } = useTimelineDockController({
    currentTime,
    duration,
    setDuration,
    seekToTime,
    tracks,
    setTracks,
    sortedShapes,
    setShapes,
    fillKeyframes,
    setFillKeyframes,
    materialKeyframes,
    setMaterialKeyframes,
    keyLightPositionKeyframes,
    setKeyLightPositionKeyframes,
    rotationAxisKeyframes,
    setRotationAxisKeyframes,
    moveKeyframes,
    setMoveKeyframes,
    setQualityKeyframes,
    setInnerScaleKeyframes,
    selectedShapeFillStops,
    selectedShapeGradientType,
    activeMaterialSettings,
    activeKeyLightPosition,
    activeRotationOffset,
    activeMoveOffset,
    markCustom,
  })

  const handleScrubStart = useCallback(() => {
    cancelAnimatedSeek()
    stopPlayback()
  }, [cancelAnimatedSeek, stopPlayback])

  const timelineProps = useTimelineProps({
    duration,
    onDurationChange: handleDurationChange,
    currentTime,
    onTimeChange: setCurrentTime,
    onScrubStart: handleScrubStart,
    isPlaying,
    isPreviewLoading: !isPreviewModelReady,
    loop,
    onLoopChange: setLoop,
    tracks,
    onTracksChange: handleTracksChange,
    propertyRows: timelinePropertyRows,
    onClearTrackKeyframes: clearTimelineTrackRow,
    onClearPropertyRow: clearTimelinePropertyRow,
    onTogglePropertyKeyframe: toggleTimelinePropertyKeyframe,
    onRemovePropertyKeyframe: removeTimelinePropertyKeyframe,
    onMovePropertyKeyframe: moveTimelinePropertyKeyframe,
    onSetPropertyEasing: setTimelinePropertyEasing,
    activeTrackId: selectedMotionTrackId as MotionTrackId | null,
    onActiveTrackChange: selectTimelineTrack,
    onActivePropertyRowChange: selectTimelinePropertyRow,
    shapes,
    selectedShapeId,
    onSelectShape: setSelectedShapeId,
    onShapesChange: setShapes,
    onAddShape: addShapeAtPlayhead,
    onRemoveShape: removeShape,
    onShapeIconChange: setShapeIcon,
    onShapeWipePairChange: setShapeWipePair,
    onUploadShape: triggerShapeUpload,
    onShapeBlendChange: setShapeBlend,
    openShapePicker,
    onOpenShapePicker: setOpenShapePicker,
    markCustom,
  })

  return {
    timelineProps,
    previousBreakpoint,
    nextBreakpoint,
    atTimelineStart,
    atTimelineEnd,
    playbackProgress,
    goToPreviousBreakpoint,
    goToNextBreakpoint,
    goToEnd,
  }
}
