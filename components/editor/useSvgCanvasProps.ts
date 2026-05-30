"use client"

import { useMemo } from "react"
import type { SvgCanvasProps } from "../3d/SvgCanvas"
import type { MaterialSettings } from "./EditorModel"

export type UseSvgCanvasPropsArgs = {
  iconAContent: string
  iconBContent: string
  materialPreset: SvgCanvasProps["materialPreset"]
  colorA: string
  colorB: string
  colorASecondary?: string
  colorBSecondary?: string
  colorAStops?: SvgCanvasProps["colorAStops"]
  colorBStops?: SvgCanvasProps["colorBStops"]
  enableGradient?: boolean
  gradientType?: SvgCanvasProps["gradientType"]
  activeMaterialSettings: MaterialSettings
  wireframe: boolean
  extrusionDepth: number
  bevelEnabled: boolean
  bevelThickness: number
  bevelSize: number
  bevelSegments: number
  geometryQuality: number
  layerSpacing: number
  innerElementScale: SvgCanvasProps["innerElementScale"]
  transitionType: SvgCanvasProps["transitionType"]
  wipeDirection: SvgCanvasProps["wipeDirection"]
  transitionProgress: number
  rotationOffset: SvgCanvasProps["rotationOffset"]
  objectScale: number
  objectScaleAxes: SvgCanvasProps["objectScaleAxes"]
  moveOffset: SvgCanvasProps["moveOffset"]
  isPlaying: boolean
  ambientColor: string
  ambientIntensity: number
  keyLightColor: string
  keyLightIntensity: number
  keyLightPosition: SvgCanvasProps["keyLightPosition"]
  keyLightSoftness: number
  rimLightColor: string
  rimLightIntensity: number
  zoom: number
  viewInertiaEnabled: boolean
  showCenterPoint: boolean
  showTransformGizmo: boolean
  selectedLayerId?: string | null
  pathOverridesA: SvgCanvasProps["pathOverridesA"]
  pathOverridesB: SvgCanvasProps["pathOverridesB"]
  onZoomChange: (zoom: number) => void
  onViewRotationCommit: NonNullable<SvgCanvasProps["onViewRotationCommit"]>
  onViewRotationSet: NonNullable<SvgCanvasProps["onViewRotationSet"]>
  onObjectScaleChange: (scale: number) => void
  onObjectScaleAxisChange: NonNullable<
    SvgCanvasProps["onObjectScaleAxisChange"]
  >
  onMoveOffsetChange: NonNullable<SvgCanvasProps["onMoveOffsetChange"]>
  onRotationAxisChange: NonNullable<SvgCanvasProps["onRotationAxisChange"]>
  onModelReadyChange: (ready: boolean) => void
  markCustom: () => void
}

export function useSvgCanvasProps({
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
  onZoomChange,
  onViewRotationCommit,
  onViewRotationSet,
  onObjectScaleChange,
  onObjectScaleAxisChange,
  onMoveOffsetChange,
  onRotationAxisChange,
  onModelReadyChange,
  markCustom,
}: UseSvgCanvasPropsArgs): SvgCanvasProps {
  return useMemo(
    () => ({
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
      roughness: activeMaterialSettings.roughness,
      metalness: activeMaterialSettings.metalness,
      reflectance: activeMaterialSettings.reflectance,
      clearcoat: activeMaterialSettings.clearcoat,
      clearcoatRoughness: activeMaterialSettings.clearcoatRoughness,
      transmission: activeMaterialSettings.transmission,
      thickness: activeMaterialSettings.thickness,
      emissiveIntensity: activeMaterialSettings.emissiveIntensity,
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
      onZoomChange,
      onViewRotationCommit,
      onViewRotationSet,
      onObjectScaleChange: (value) => {
        onObjectScaleChange(value)
        markCustom()
      },
      onObjectScaleAxisChange,
      onMoveOffsetChange: (axis, value) => {
        onMoveOffsetChange(axis, value)
        markCustom()
      },
      onRotationAxisChange: (axis, value) => {
        onRotationAxisChange(axis, value)
        markCustom()
      },
      onModelReadyChange,
    }),
    [
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
      onZoomChange,
      onViewRotationCommit,
      onViewRotationSet,
      onObjectScaleChange,
      onObjectScaleAxisChange,
      onMoveOffsetChange,
      onRotationAxisChange,
      onModelReadyChange,
      markCustom,
    ]
  )
}
