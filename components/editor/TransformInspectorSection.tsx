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
import { InspectorRow, InspectorSection } from "./InspectorPrimitives"
import { InspectorSlider } from "./InspectorSlider"
import type { SvgLayer } from "./SvgLayerModel"
import type { TimelineTrack } from "./TimelineModel"
import { Vector3NumberFields } from "./Vector3NumberFields"

type Axis = keyof LightPosition

export type TransformInspectorSectionProps = {
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
  onLayerScaleChange: (value: number) => void
  onLayerDepthChange: (value: number) => void
  onCustomEdit: () => void
}

export function TransformInspectorSection({
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
  transformKeyframeControl,
  onActivateTrack,
  onScaleLockChange,
  onScaleChange,
  onScaleAxisChange,
  onRotationAxisChange,
  onMoveAxisChange,
  onCustomEdit,
}: TransformInspectorSectionProps) {
  const scaleValue = finiteNumber(
    scaleTrack.keyframes.length > 0 ? activeObjectScale : objectScale,
    SCALE_DEFAULT
  )

  return (
    <InspectorSection title="TRANSFORM" action={transformKeyframeControl}>
      <InspectorRow
        label="Scale"
        rowRef={scaleRef}
        dot={scaleTrack.keyframes.length > 0 ? scaleTrack.color : null}
        active={activeTrackId === "scale"}
        onClick={() => onActivateTrack("scale")}
        labelAction={
          <AxisLockButton
            locked={isScaleLocked}
            label="Scale"
            onToggle={() => onScaleLockChange(!isScaleLocked)}
          />
        }
      >
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
      </InspectorRow>

      <InspectorRow
        label="Rotation"
        rowRef={rotationRef}
        dot={rotationAxisKeyframes.length > 0 ? ROTATION_COLOR : null}
        active={activeTrackId === "rotation"}
        onClick={() => onActivateTrack("rotation")}
      >
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
      </InspectorRow>

      <InspectorRow
        label="Position"
        rowRef={moveRef}
        dot={moveKeyframesLength > 0 ? MOVE_COLOR : null}
        active={activeTrackId === "move"}
        onClick={() => onActivateTrack("move")}
      >
        <Vector3NumberFields
          values={activeMoveOffset}
          min={-100}
          max={100}
          step={1}
          precision={0}
          onChange={onMoveAxisChange}
        />
      </InspectorRow>
    </InspectorSection>
  )
}
