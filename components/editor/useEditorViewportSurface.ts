"use client"

import type { Dispatch, SetStateAction } from "react"
import type { MaterialPresetId } from "../3d/MaterialPresets"
import type { PathOverride } from "../3d/SvgTypes"
import type { LightPosition, MaterialSettings } from "./EditorModel"
import { ALL_LAYERS_ID } from "./SvgLayerModel"
import { useViewportStageProps } from "./useViewportStageProps"
import type { FillGradientType, FillStop } from "./TimelineModel"
import type { SvgCanvasProps } from "../3d/SvgCanvas"

type UseEditorViewportSurfaceArgs = {
  iconAContent: string
  iconBContent: string
  materialPreset: MaterialPresetId
  colorA: string
  colorB: string
  colorASecondary?: string
  colorBSecondary?: string
  colorAStops?: FillStop[]
  colorBStops?: FillStop[]
  enableGradient: boolean
  gradientType: FillGradientType
  activeMaterialSettings: MaterialSettings
  wireframe: boolean
  extrusionDepth: number
  bevelEnabled: boolean
  bevelThickness: number
  bevelSize: number
  bevelSegments: number
  geometryQuality: number
  layerSpacing: number
  innerElementScale: LightPosition
  transitionType: SvgCanvasProps["transitionType"]
  wipeDirection: SvgCanvasProps["wipeDirection"]
  transitionProgress: number
  rotationOffset: LightPosition
  objectScale: number
  objectScaleAxes: LightPosition
  moveOffset: LightPosition
  isPlaying: boolean
  ambientColor: string
  ambientIntensity: number
  keyLightColor: string
  keyLightIntensity: number
  keyLightPosition: LightPosition
  keyLightSoftness: number
  rimLightColor: string
  rimLightIntensity: number
  zoom: number
  viewInertiaEnabled: boolean
  showCenterPoint: boolean
  showTransformGizmo: boolean
  selectedLayerId: string
  pathOverridesA?: PathOverride[]
  pathOverridesB?: PathOverride[]
  exportAnimation?: SvgCanvasProps["exportAnimation"]
  playbackProgress: number
  atTimelineStart: boolean
  atTimelineEnd: boolean
  hasPreviousBreakpoint: boolean
  hasNextBreakpoint: boolean
  zenMode: boolean
  animatedSeekEnabled: boolean
  setZoom: Dispatch<SetStateAction<number>>
  handleViewRotationCommit: NonNullable<SvgCanvasProps["onViewRotationCommit"]>
  handleViewRotationSet: NonNullable<SvgCanvasProps["onViewRotationSet"]>
  handleScaleChange: (scale: number) => void
  handleScaleAxisChange: NonNullable<SvgCanvasProps["onObjectScaleAxisChange"]>
  updateMoveAxis: NonNullable<SvgCanvasProps["onMoveOffsetChange"]>
  handleRotationAxisChange: NonNullable<SvgCanvasProps["onRotationAxisChange"]>
  setIsPreviewModelReady: Dispatch<SetStateAction<boolean>>
  resetView: () => void
  setViewInertiaEnabled: Dispatch<SetStateAction<boolean>>
  setShowCenterPoint: Dispatch<SetStateAction<boolean>>
  setShowTransformGizmo: Dispatch<SetStateAction<boolean>>
  setAnimatedSeekEnabled: (enabled: boolean) => void
  handleReset: () => void
  goToPreviousBreakpoint: () => void
  handlePlayToggle: () => void
  goToNextBreakpoint: () => void
  goToEnd: () => void
  setZenMode: Dispatch<SetStateAction<boolean>>
  markCustom: () => void
}

export function useEditorViewportSurface({
  iconAContent,
  iconBContent,
  materialPreset,
  colorA,
  colorB,
  colorASecondary,
  colorBSecondary,
  colorAStops,
  colorBStops,
  enableGradient,
  gradientType,
  activeMaterialSettings,
  wireframe,
  extrusionDepth,
  bevelEnabled,
  bevelThickness,
  bevelSize,
  bevelSegments,
  geometryQuality,
  layerSpacing,
  innerElementScale,
  transitionType,
  wipeDirection,
  transitionProgress,
  rotationOffset,
  objectScale,
  objectScaleAxes,
  moveOffset,
  isPlaying,
  ambientColor,
  ambientIntensity,
  keyLightColor,
  keyLightIntensity,
  keyLightPosition,
  keyLightSoftness,
  rimLightColor,
  rimLightIntensity,
  zoom,
  viewInertiaEnabled,
  showCenterPoint,
  showTransformGizmo,
  selectedLayerId,
  pathOverridesA,
  pathOverridesB,
  exportAnimation,
  playbackProgress,
  atTimelineStart,
  atTimelineEnd,
  hasPreviousBreakpoint,
  hasNextBreakpoint,
  zenMode,
  animatedSeekEnabled,
  setZoom,
  handleViewRotationCommit,
  handleViewRotationSet,
  handleScaleChange,
  handleScaleAxisChange,
  updateMoveAxis,
  handleRotationAxisChange,
  setIsPreviewModelReady,
  resetView,
  setViewInertiaEnabled,
  setShowCenterPoint,
  setShowTransformGizmo,
  setAnimatedSeekEnabled,
  handleReset,
  goToPreviousBreakpoint,
  handlePlayToggle,
  goToNextBreakpoint,
  goToEnd,
  setZenMode,
  markCustom,
}: UseEditorViewportSurfaceArgs) {
  return useViewportStageProps({
    iconAContent,
    iconBContent,
    materialPreset,
    colorA,
    colorB,
    colorASecondary,
    colorBSecondary,
    colorAStops,
    colorBStops,
    enableGradient,
    gradientType,
    activeMaterialSettings,
    wireframe,
    extrusionDepth,
    bevelEnabled,
    bevelThickness,
    bevelSize,
    bevelSegments,
    geometryQuality,
    layerSpacing,
    innerElementScale,
    transitionType,
    wipeDirection,
    transitionProgress,
    rotationOffset,
    objectScale,
    objectScaleAxes,
    moveOffset,
    isPlaying,
    ambientColor,
    ambientIntensity,
    keyLightColor,
    keyLightIntensity,
    keyLightPosition,
    keyLightSoftness,
    rimLightColor,
    rimLightIntensity,
    zoom,
    viewInertiaEnabled,
    showCenterPoint,
    showTransformGizmo,
    selectedLayerId: selectedLayerId === ALL_LAYERS_ID ? null : selectedLayerId,
    pathOverridesA,
    pathOverridesB,
    exportAnimation,
    playbackProgress,
    atTimelineStart,
    atTimelineEnd,
    hasPreviousBreakpoint,
    hasNextBreakpoint,
    zenMode,
    onZoomChange: setZoom,
    onViewRotationCommit: handleViewRotationCommit,
    onViewRotationSet: handleViewRotationSet,
    onObjectScaleChange: handleScaleChange,
    onObjectScaleAxisChange: handleScaleAxisChange,
    onMoveOffsetChange: updateMoveAxis,
    onRotationAxisChange: handleRotationAxisChange,
    onModelReadyChange: setIsPreviewModelReady,
    onResetView: resetView,
    onViewInertiaChange: setViewInertiaEnabled,
    onShowCenterPointChange: setShowCenterPoint,
    onShowTransformGizmoChange: setShowTransformGizmo,
    animatedSeekEnabled,
    onAnimatedSeekChange: setAnimatedSeekEnabled,
    onResetPlayback: handleReset,
    onPreviousBreakpoint: goToPreviousBreakpoint,
    onPlayToggle: handlePlayToggle,
    onNextBreakpoint: goToNextBreakpoint,
    onGoToEnd: goToEnd,
    onExitZenMode: () => setZenMode(false),
    markCustom,
  })
}
