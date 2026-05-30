"use client"

import { ReactNode, RefObject } from "react"
import type { PathOverride } from "../3d/SvgTypes"
import {
  LightPosition,
  MOVE_COLOR,
  MotionTrackId,
  ROTATION_COLOR,
  ROTATION_MAX,
  ROTATION_MIN,
  SCALE_DEFAULT,
  SCALE_MAX,
  clampNumber,
  finiteNumber,
} from "./EditorModel"
import { AxisLockButton } from "./AxisLockButton"
import { InspectorSlider } from "./InspectorSlider"
import { InspectorSectionHeader } from "./InspectorSectionHeader"
import { LayerControls } from "./LayerControls"
import type { SvgLayer } from "./SvgLayerModel"
import type { TimelineTrack } from "./TimelineModel"
import { Vector3NumberFields } from "./Vector3NumberFields"

type Axis = keyof LightPosition

export type TransformInspectorSectionProps = {
  labelWidthClass: string
  propertyRowClassName: (isActive?: boolean) => string
  scaleRef: RefObject<HTMLDivElement | null>
  rotationRef: RefObject<HTMLDivElement | null>
  moveRef: RefObject<HTMLDivElement | null>
  activeTrackId: MotionTrackId
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
  selectedLayer: SvgLayer | null
  selectedLayerId: string
  selectedLayerOverride: PathOverride | null
  shapeNavigation?: {
    label: string
    index: number
    total: number
    onPrevious: () => void
    onNext: () => void
  }
  transformKeyframeControl: ReactNode
  onActivateTrack: (trackId: MotionTrackId) => void
  onScaleLockChange: (locked: boolean) => void
  onScaleChange: (value: number) => void
  onScaleAxisChange: (axis: Axis, value: number) => void
  onRotationAxisChange: (axis: Axis, value: number) => void
  onMoveAxisChange: (axis: Axis, value: number) => void
  onSelectLayer: (id: string) => void
  onToggleLayerVisibility: () => void
  onLayerScaleChange: (value: number) => void
  onLayerDepthChange: (value: number) => void
  onCustomEdit: () => void
}

export function TransformInspectorSection({
  labelWidthClass,
  propertyRowClassName,
  scaleRef,
  rotationRef,
  moveRef,
  activeTrackId,
  scaleTrack,
  activeObjectScale,
  objectScale,
  objectScaleAxes,
  isScaleLocked,
  rotationOffset,
  rotationAxisKeyframes,
  moveKeyframesLength,
  activeMoveOffset,
  selectedShapeLayers,
  selectedLayer,
  selectedLayerId,
  selectedLayerOverride,
  shapeNavigation,
  transformKeyframeControl,
  onActivateTrack,
  onScaleLockChange,
  onScaleChange,
  onScaleAxisChange,
  onRotationAxisChange,
  onMoveAxisChange,
  onSelectLayer,
  onToggleLayerVisibility,
  onLayerScaleChange,
  onLayerDepthChange,
  onCustomEdit,
}: TransformInspectorSectionProps) {
  const scaleValue = finiteNumber(
    scaleTrack.keyframes.length > 0 ? activeObjectScale : objectScale,
    SCALE_DEFAULT
  )

  return (
    <div className="flex flex-col gap-1.5">
      <InspectorSectionHeader
        title="TRANSFORM"
        action={transformKeyframeControl}
      />

      <div
        ref={scaleRef}
        className={propertyRowClassName(activeTrackId === "scale")}
        onClick={() => onActivateTrack("scale")}
      >
        <span
          className={`${labelWidthClass} flex shrink-0 items-center text-[11px] text-muted-foreground`}
        >
          <span>
            Scale
            {scaleTrack.keyframes.length > 0 && (
              <span
                className="ml-1 inline-block size-1 rounded-full align-middle"
                style={{ backgroundColor: scaleTrack.color }}
              />
            )}
          </span>
          <AxisLockButton
            locked={isScaleLocked}
            label="Scale"
            onToggle={() => onScaleLockChange(!isScaleLocked)}
          />
        </span>
        {isScaleLocked ? (
          <InspectorSlider
            value={scaleValue}
            min={0.1}
            max={SCALE_MAX}
            sliderMax={2}
            step={0.05}
            precision={2}
            onChange={(value) => {
              onScaleChange(value)
              onCustomEdit()
            }}
          />
        ) : (
          <Vector3NumberFields
            values={objectScaleAxes}
            min={0.1}
            max={SCALE_MAX}
            step={0.05}
            precision={2}
            onChange={onScaleAxisChange}
          />
        )}
      </div>

      <LayerControls
        layers={selectedShapeLayers}
        selectedLayer={selectedLayer}
        selectedLayerId={selectedLayerId}
        selectedLayerOverride={selectedLayerOverride}
        shapeNavigation={shapeNavigation}
        onSelectLayer={onSelectLayer}
        onToggleVisibility={onToggleLayerVisibility}
        onScaleChange={onLayerScaleChange}
        onDepthChange={onLayerDepthChange}
      />

      <div
        ref={rotationRef}
        className={propertyRowClassName(activeTrackId === "rotation")}
        onClick={() => onActivateTrack("rotation")}
      >
        <span
          className={`${labelWidthClass} shrink-0 text-[11px] text-muted-foreground`}
        >
          Rotation
          {rotationAxisKeyframes.length > 0 && (
            <span
              className="ml-1 inline-block size-1 rounded-full align-middle"
              style={{ backgroundColor: ROTATION_COLOR }}
            />
          )}
        </span>
        <Vector3NumberFields
          values={rotationOffset}
          min={ROTATION_MIN}
          max={ROTATION_MAX}
          step={1}
          scrubStep={3}
          suffix="°"
          precision={0}
          onChange={(axis, value) =>
            onRotationAxisChange(
              axis,
              clampNumber(value, ROTATION_MIN, ROTATION_MAX)
            )
          }
        />
      </div>

      <div
        ref={moveRef}
        className={propertyRowClassName(activeTrackId === "move")}
        onClick={() => onActivateTrack("move")}
      >
        <span
          className={`${labelWidthClass} shrink-0 text-[11px] text-muted-foreground`}
        >
          Position
          {moveKeyframesLength > 0 && (
            <span
              className="ml-1 inline-block size-1 rounded-full align-middle"
              style={{ backgroundColor: MOVE_COLOR }}
            />
          )}
        </span>
        <Vector3NumberFields
          values={activeMoveOffset}
          min={-100}
          max={100}
          step={1}
          precision={0}
          onChange={onMoveAxisChange}
        />
      </div>
    </div>
  )
}
