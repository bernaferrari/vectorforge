"use client"

import { useMemo } from "react"
import type { SidebarStyleProps } from "./InspectorSidebar"
import type { StyleSidebarPropsArgs } from "./InspectorSidebarPropsModel"

export function useStyleSidebarProps({
  fillRef,
  materialRef,
  materialPreset,
  materialKeyframeCount,
  activeMaterialSettings,
  isAdvancedMaterialOpen,
  selectedShapeFill,
  selectedShapeFillSecondary,
  selectedShapeGradientType,
  selectedShapeFillStops,
  fillMode,
  styleKeyframeControl,
  onFillColorChange,
  onGradientToggle,
  onGradientTypeChange,
  onStopsChange,
  onMaterialPresetChange,
  onAdvancedMaterialOpenChange,
  onMaterialSettingChange,
}: StyleSidebarPropsArgs) {
  return useMemo<SidebarStyleProps>(
    () => ({
      fillRef,
      materialRef,
      materialPreset,
      materialKeyframeCount,
      activeMaterialSettings,
      isAdvancedMaterialOpen,
      selectedShapeFill,
      selectedShapeFillSecondary,
      selectedShapeGradientType,
      selectedShapeFillStops,
      fillMode,
      styleKeyframeControl,
      onFillColorChange,
      onGradientToggle,
      onGradientTypeChange,
      onStopsChange,
      onMaterialPresetChange,
      onAdvancedMaterialOpenChange,
      onMaterialSettingChange,
    }),
    [
      fillRef,
      materialRef,
      materialPreset,
      materialKeyframeCount,
      activeMaterialSettings,
      isAdvancedMaterialOpen,
      selectedShapeFill,
      selectedShapeFillSecondary,
      selectedShapeGradientType,
      selectedShapeFillStops,
      fillMode,
      styleKeyframeControl,
      onFillColorChange,
      onGradientToggle,
      onGradientTypeChange,
      onStopsChange,
      onMaterialPresetChange,
      onAdvancedMaterialOpenChange,
      onMaterialSettingChange,
    ]
  )
}
