"use client"

import { useMemo } from "react"
import { EXTRUDE_DEFAULT, finiteNumber } from "./EditorModel"
import type { SidebarGeometryProps } from "./InspectorSidebar"
import type { GeometrySidebarPropsArgs } from "./InspectorSidebarPropsModel"

export function useGeometrySidebarProps({
  extrusionRef,
  selectedMotionTrackId,
  extrusionTrack,
  activeExtrusionDepth,
  extrusionDepth,
  activeGeometryQuality,
  bevelEnabled,
  bevelThickness,
  bevelSize,
  bevelSegments,
  renderKeyframeControl,
  setSelectedMotionTrackId,
  onDepthChange,
  onBevelEnabledChange,
  onBevelThicknessChange,
  onBevelSizeChange,
  onBevelSegmentsChange,
  onQualityChange,
  onCustomEdit,
}: GeometrySidebarPropsArgs) {
  return useMemo<SidebarGeometryProps>(
    () => ({
      extrusionRef,
      isActive: selectedMotionTrackId === "extrusion",
      extrusionTrack,
      activeExtrusionDepth,
      extrusionDepth,
      activeGeometryQuality,
      bevelEnabled,
      bevelThickness,
      bevelSize,
      bevelSegments,
      keyframeControl: renderKeyframeControl(
        extrusionTrack,
        finiteNumber(
          extrusionTrack.keyframes.length > 0
            ? activeExtrusionDepth
            : extrusionDepth,
          EXTRUDE_DEFAULT
        )
      ),
      onActivate: () => setSelectedMotionTrackId("extrusion"),
      onDepthChange,
      onBevelEnabledChange,
      onBevelThicknessChange,
      onBevelSizeChange,
      onBevelSegmentsChange,
      onQualityChange,
      onCustomEdit,
    }),
    [
      extrusionRef,
      selectedMotionTrackId,
      extrusionTrack,
      activeExtrusionDepth,
      extrusionDepth,
      activeGeometryQuality,
      bevelEnabled,
      bevelThickness,
      bevelSize,
      bevelSegments,
      renderKeyframeControl,
      setSelectedMotionTrackId,
      onDepthChange,
      onBevelEnabledChange,
      onBevelThicknessChange,
      onBevelSizeChange,
      onBevelSegmentsChange,
      onQualityChange,
      onCustomEdit,
    ]
  )
}
