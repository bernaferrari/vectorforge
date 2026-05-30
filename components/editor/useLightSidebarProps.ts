"use client"

import { useMemo } from "react"
import { finiteNumber } from "./EditorModel"
import type { SidebarLightProps } from "./InspectorSidebar"
import type { LightSidebarPropsArgs } from "./InspectorSidebarPropsModel"

export function useLightSidebarProps({
  lightingRef,
  selectedMotionTrackId,
  lightingTrack,
  activeKeyLightIntensity,
  keyLightIntensity,
  activeKeyLightPosition,
  keyLightColor,
  keyLightSoftness,
  lightPositionIsKeyed,
  lightPositionKeyframeControl,
  renderKeyframeControl,
  setSelectedMotionTrackId,
  onLightPositionChange,
  onLightColorChange,
  onLightSoftnessChange,
  onToggleLightPositionKeyframe,
  onBrightnessChange,
  onCustomEdit,
}: LightSidebarPropsArgs) {
  return useMemo<SidebarLightProps>(
    () => ({
      lightingRef,
      isActive: selectedMotionTrackId === "lighting",
      lightingTrack,
      activeKeyLightIntensity,
      keyLightIntensity,
      activeKeyLightPosition,
      keyLightColor,
      keyLightSoftness,
      lightPositionIsKeyed,
      lightPositionKeyframeControl,
      brightnessKeyframeControl: renderKeyframeControl(
        lightingTrack,
        finiteNumber(
          lightingTrack.keyframes.length > 0
            ? activeKeyLightIntensity
            : keyLightIntensity,
          1
        )
      ),
      onActivate: () => setSelectedMotionTrackId("lighting"),
      onLightPositionChange,
      onLightColorChange,
      onLightSoftnessChange,
      onToggleLightPositionKeyframe,
      onBrightnessChange,
      onCustomEdit,
    }),
    [
      lightingRef,
      selectedMotionTrackId,
      lightingTrack,
      activeKeyLightIntensity,
      keyLightIntensity,
      activeKeyLightPosition,
      keyLightColor,
      keyLightSoftness,
      lightPositionIsKeyed,
      lightPositionKeyframeControl,
      renderKeyframeControl,
      setSelectedMotionTrackId,
      onLightPositionChange,
      onLightColorChange,
      onLightSoftnessChange,
      onToggleLightPositionKeyframe,
      onBrightnessChange,
      onCustomEdit,
    ]
  )
}
