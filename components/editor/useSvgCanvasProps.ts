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
  exportAnimation?: SvgCanvasProps["exportAnimation"]
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
  exportAnimation,
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
  const {
    roughness,
    metalness,
    reflectance,
    clearcoat,
    clearcoatRoughness,
    transmission,
    thickness,
    emissiveIntensity,
  } = activeMaterialSettings
  const innerScaleX = innerElementScale.x
  const innerScaleY = innerElementScale.y
  const innerScaleZ = innerElementScale.z
  const wipeDirectionX = wipeDirection.x
  const wipeDirectionY = wipeDirection.y
  const rotationX = rotationOffset.x
  const rotationY = rotationOffset.y
  const rotationZ = rotationOffset.z
  const objectScaleX = objectScaleAxes?.x
  const objectScaleY = objectScaleAxes?.y
  const objectScaleZ = objectScaleAxes?.z
  const moveX = moveOffset.x
  const moveY = moveOffset.y
  const moveZ = moveOffset.z
  const keyLightX = keyLightPosition.x
  const keyLightY = keyLightPosition.y
  const keyLightZ = keyLightPosition.z

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
      roughness,
      metalness,
      reflectance,
      clearcoat,
      clearcoatRoughness,
      transmission,
      thickness,
      emissiveIntensity,
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
      roughness,
      metalness,
      reflectance,
      clearcoat,
      clearcoatRoughness,
      transmission,
      thickness,
      emissiveIntensity,
      wireframe,
      extrusionDepth,
      bevelEnabled,
      bevelThickness,
      bevelSize,
      bevelSegments,
      geometryQuality,
      layerSpacing,
      innerScaleX,
      innerScaleY,
      innerScaleZ,
      transitionType,
      wipeDirectionX,
      wipeDirectionY,
      transitionProgress,
      rotationX,
      rotationY,
      rotationZ,
      objectScale,
      objectScaleX,
      objectScaleY,
      objectScaleZ,
      moveX,
      moveY,
      moveZ,
      isPlaying,
      ambientColor,
      ambientIntensity,
      keyLightColor,
      keyLightIntensity,
      keyLightX,
      keyLightY,
      keyLightZ,
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
