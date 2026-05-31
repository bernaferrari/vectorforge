"use client"

import { useEditorPlaybackState } from "./useEditorPlaybackState"
import { useEditorSelectionNavigation } from "./useEditorSelectionNavigation"
import { useFillEditor } from "./useFillEditor"
import { useGeometryEditor } from "./useGeometryEditor"
import { useLightEditor } from "./useLightEditor"
import { useMaterialEditor } from "./useMaterialEditor"
import { useShapeSequenceEditor } from "./useShapeSequenceEditor"
import { useThemeControls } from "./useThemeControls"
import { useTimelineTracks } from "./useTimelineTracks"
import { useTransformEditor } from "./useTransformEditor"
import { useViewportOptions } from "./useViewportOptions"

export function useEditorBaseState() {
  const theme = useThemeControls()
  const playback = useEditorPlaybackState()
  const shapes = useShapeSequenceEditor({
    currentTime: playback.currentTime,
    duration: playback.duration,
  })
  const geometry = useGeometryEditor()
  const transform = useTransformEditor()
  const fill = useFillEditor({
    currentTime: playback.currentTime,
    duration: playback.duration,
    onEdit: shapes.markCustom,
  })
  const viewport = useViewportOptions()
  const material = useMaterialEditor({
    currentTime: playback.currentTime,
    duration: playback.duration,
    onEdit: shapes.markCustom,
  })
  const light = useLightEditor({
    currentTime: playback.currentTime,
    duration: playback.duration,
    onEdit: shapes.markCustom,
  })
  const selection = useEditorSelectionNavigation({
    setAdvancedMaterialOpen: material.setIsAdvancedMaterialOpen,
    setSelectedShapeId: shapes.setSelectedShapeId,
  })
  const timelineTracks = useTimelineTracks()

  return {
    theme,
    playback,
    shapes,
    geometry,
    transform,
    fill,
    viewport,
    material,
    light,
    selection,
    timelineTracks,
  }
}

export type EditorBaseState = ReturnType<typeof useEditorBaseState>
