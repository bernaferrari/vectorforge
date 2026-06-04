import type { ReactNode } from "react"
import type { MaterialPresetId } from "../3d/MaterialPresets"
import type { PathOverride } from "../3d/SvgTypes"
import type {
  FillMode,
  LightPosition,
  MaterialSettingKey,
  MaterialSettings,
  MotionTrackId,
} from "./EditorModel"
import type {
  SidebarGeometryProps,
  SidebarLightProps,
  SidebarStyleProps,
  SidebarTransformProps,
} from "./InspectorSidebar"
import type { SvgLayer } from "./SvgLayerModel"
import type { FillGradientType, FillStop, TimelineTrack } from "./TimelineModel"

export type UseInspectorSidebarPropsArgs = {
  fillRef: SidebarStyleProps["fillRef"]
  materialRef: SidebarStyleProps["materialRef"]
  materialPreset: MaterialPresetId
  materialKeyframeCount: number
  activeMaterialSettings: MaterialSettings
  isAdvancedMaterialOpen: boolean
  selectedShapeFill: string
  selectedShapeFillSecondary: string
  selectedShapeGradientType: FillGradientType
  selectedShapeFillStops: FillStop[]
  fillMode: FillMode
  styleKeyframeControl: ReactNode
  onFillColorChange: (value: string, secondary?: boolean) => void
  onGradientToggle: (enabled: boolean) => void
  onGradientTypeChange: (gradientType: FillGradientType) => void
  onStopsChange: SidebarStyleProps["onStopsChange"]
  onMaterialPresetChange: (preset: MaterialPresetId) => void
  onAdvancedMaterialOpenChange: (open: boolean) => void
  onMaterialSettingChange: (
    key: MaterialSettingKey,
    value: number,
    min: number,
    max: number
  ) => void

  extrusionRef: SidebarGeometryProps["extrusionRef"]
  selectedMotionTrackId: MotionTrackId
  extrusionTrack: TimelineTrack
  activeExtrusionDepth: number
  extrusionDepth: number
  activeGeometryQuality: number
  bevelEnabled: boolean
  bevelThickness: number
  bevelSize: number
  bevelSegments: number
  renderKeyframeControl: (track: TimelineTrack, value: number) => ReactNode
  setSelectedMotionTrackId: (trackId: MotionTrackId) => void
  onDepthChange: (value: number) => void
  onBevelEnabledChange: (enabled: boolean) => void
  onBevelThicknessChange: (value: number) => void
  onBevelSizeChange: (value: number) => void
  onBevelSegmentsChange: (segments: number) => void
  onQualityChange: (value: number) => void
  onCustomEdit: () => void

  scaleRef: SidebarTransformProps["scaleRef"]
  rotationRef: SidebarTransformProps["rotationRef"]
  moveRef: SidebarTransformProps["moveRef"]
  scaleTrack: TimelineTrack
  activeObjectScale: number
  objectScale: number
  objectScaleAxes: LightPosition
  isScaleLocked: boolean
  rotationOffset: LightPosition
  rotationAxisKeyframes: Array<{ time: number }>
  moveKeyframesLength: number
  activeMoveOffset: LightPosition
  selectedShapeLayers: SvgLayer[]
  selectedLayerId: string
  selectedLayerOverride: PathOverride | null
  shapeNavigation?: SidebarTransformProps["shapeNavigation"]
  transformKeyframeControl: ReactNode
  onScaleLockChange: (locked: boolean) => void
  onScaleChange: (value: number) => void
  onScaleAxisChange: (axis: keyof LightPosition, value: number) => void
  onRotationAxisChange: (axis: keyof LightPosition, value: number) => void
  onMoveAxisChange: (axis: keyof LightPosition, value: number) => void
  onSelectLayer: (id: string) => void
  onToggleLayerVisibility: () => void
  onLayerScaleChange: (value: number) => void
  onLayerDepthChange: (value: number) => void

  lightingRef: SidebarLightProps["lightingRef"]
  lightingTrack: TimelineTrack
  activeKeyLightIntensity: number
  keyLightIntensity: number
  activeKeyLightPosition: LightPosition
  keyLightColor: string
  keyLightSoftness: number
  lightPositionIsKeyed: boolean
  lightPositionKeyframeControl: ReactNode
  onLightPositionChange: (x: number, y: number) => void
  onLightColorChange: (color: string) => void
  onLightSoftnessChange: (value: number) => void
  onToggleLightPositionKeyframe: () => void
  onBrightnessChange: (value: number) => void
}

export type StyleSidebarPropsArgs = Pick<
  UseInspectorSidebarPropsArgs,
  | "fillRef"
  | "materialRef"
  | "materialPreset"
  | "materialKeyframeCount"
  | "activeMaterialSettings"
  | "isAdvancedMaterialOpen"
  | "selectedShapeFill"
  | "selectedShapeFillSecondary"
  | "selectedShapeGradientType"
  | "selectedShapeFillStops"
  | "fillMode"
  | "styleKeyframeControl"
  | "onFillColorChange"
  | "onGradientToggle"
  | "onGradientTypeChange"
  | "onStopsChange"
  | "onMaterialPresetChange"
  | "onAdvancedMaterialOpenChange"
  | "onMaterialSettingChange"
>

export type GeometrySidebarPropsArgs = Pick<
  UseInspectorSidebarPropsArgs,
  | "extrusionRef"
  | "selectedMotionTrackId"
  | "extrusionTrack"
  | "activeExtrusionDepth"
  | "extrusionDepth"
  | "activeGeometryQuality"
  | "bevelEnabled"
  | "bevelThickness"
  | "bevelSize"
  | "bevelSegments"
  | "renderKeyframeControl"
  | "setSelectedMotionTrackId"
  | "onDepthChange"
  | "onBevelEnabledChange"
  | "onBevelThicknessChange"
  | "onBevelSizeChange"
  | "onBevelSegmentsChange"
  | "onQualityChange"
  | "onCustomEdit"
>

export type TransformSidebarPropsArgs = Pick<
  UseInspectorSidebarPropsArgs,
  | "scaleRef"
  | "rotationRef"
  | "moveRef"
  | "selectedMotionTrackId"
  | "scaleTrack"
  | "activeObjectScale"
  | "objectScale"
  | "objectScaleAxes"
  | "isScaleLocked"
  | "rotationOffset"
  | "rotationAxisKeyframes"
  | "moveKeyframesLength"
  | "activeMoveOffset"
  | "selectedShapeLayers"
  | "selectedLayerId"
  | "selectedLayerOverride"
  | "shapeNavigation"
  | "transformKeyframeControl"
  | "setSelectedMotionTrackId"
  | "onScaleLockChange"
  | "onScaleChange"
  | "onScaleAxisChange"
  | "onRotationAxisChange"
  | "onMoveAxisChange"
  | "onSelectLayer"
  | "onToggleLayerVisibility"
  | "onLayerScaleChange"
  | "onLayerDepthChange"
  | "onCustomEdit"
>

export type LightSidebarPropsArgs = Pick<
  UseInspectorSidebarPropsArgs,
  | "lightingRef"
  | "selectedMotionTrackId"
  | "lightingTrack"
  | "activeKeyLightIntensity"
  | "keyLightIntensity"
  | "activeKeyLightPosition"
  | "keyLightColor"
  | "keyLightSoftness"
  | "lightPositionIsKeyed"
  | "lightPositionKeyframeControl"
  | "renderKeyframeControl"
  | "setSelectedMotionTrackId"
  | "onLightPositionChange"
  | "onLightColorChange"
  | "onLightSoftnessChange"
  | "onToggleLightPositionKeyframe"
  | "onBrightnessChange"
  | "onCustomEdit"
>
