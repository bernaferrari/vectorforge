"use client"

import { ReactNode, RefObject } from "react"
import { EXTRUDE_DEFAULT, EXTRUDE_MAX, finiteNumber } from "./EditorModel"
import { InspectorRow, InspectorSection } from "./InspectorPrimitives"
import { InspectorSlider } from "./InspectorSlider"
import { MAX_BEVEL_SEGMENTS } from "./EditorModel"
import type { TimelineTrack } from "./TimelineModel"

export type GeometryInspectorSectionProps = {
  extrusionRef: RefObject<HTMLDivElement | null>
  isActive: boolean
  extrusionTrack: TimelineTrack
  activeExtrusionDepth: number
  extrusionDepth: number
  activeGeometryQuality: number
  bevelEnabled: boolean
  bevelThickness: number
  bevelSize: number
  bevelSegments: number
  keyframeControl: ReactNode
  onActivate: () => void
  onDepthChange: (value: number) => void
  onBevelEnabledChange: (enabled: boolean) => void
  onBevelThicknessChange: (value: number) => void
  onBevelSizeChange: (value: number) => void
  onBevelSegmentsChange: (segments: number) => void
  onQualityChange: (value: number) => void
  onCustomEdit: () => void
}

export function GeometryInspectorSection({
  extrusionRef,
  isActive,
  extrusionTrack,
  activeExtrusionDepth,
  extrusionDepth,
  activeGeometryQuality,
  bevelEnabled,
  bevelThickness,
  bevelSize,
  bevelSegments,
  keyframeControl,
  onActivate,
  onDepthChange,
  onBevelEnabledChange,
  onBevelThicknessChange,
  onBevelSizeChange,
  onBevelSegmentsChange,
  onQualityChange,
  onCustomEdit,
}: GeometryInspectorSectionProps) {
  const depthValue = finiteNumber(
    extrusionTrack.keyframes.length > 0 ? activeExtrusionDepth : extrusionDepth,
    EXTRUDE_DEFAULT
  )
  const crownValue = bevelEnabled
    ? Math.max(
        0,
        Math.min(
          1,
          (finiteNumber(bevelSize, 0) / 0.2 +
            finiteNumber(bevelThickness, 0) / 0.36) /
            2
        )
      )
    : 0

  return (
    <InspectorSection title="SHAPE" action={keyframeControl}>
      <InspectorRow
        label="Extrude"
        rowRef={extrusionRef}
        dot={extrusionTrack.keyframes.length > 0 ? extrusionTrack.color : null}
        active={isActive}
        onClick={onActivate}
      >
        <InspectorSlider
          value={depthValue}
          min={0.2}
          max={EXTRUDE_MAX}
          sliderMax={40}
          step={0.25}
          scrubStep={1}
          precision={2}
          onChange={(value) => {
            onDepthChange(value)
            onCustomEdit()
          }}
        />
      </InspectorRow>

      <InspectorRow label="Crown">
        <InspectorSlider
          value={crownValue}
          min={0}
          max={1}
          sliderMax={1}
          step={0.02}
          precision={2}
          onChange={(value) => {
            const next = Math.max(0, Math.min(1, value))
            onBevelEnabledChange(next > 0)
            onBevelSizeChange(next * 0.2)
            onBevelThicknessChange(next * 0.36)
            if (next > 0 && bevelSegments < 2) {
              onBevelSegmentsChange(3)
            }
            onCustomEdit()
          }}
        />
      </InspectorRow>

      <InspectorRow label="Bevel">
        <InspectorSlider
          value={bevelEnabled ? bevelSegments : 0}
          min={0}
          max={MAX_BEVEL_SEGMENTS}
          sliderMax={12}
          step={1}
          precision={0}
          onChange={(value) => {
            const nextSegments = Math.max(0, Math.round(value))
            onBevelEnabledChange(nextSegments > 0)
            if (nextSegments > 0) {
              onBevelSegmentsChange(nextSegments)
            }
            onCustomEdit()
          }}
        />
      </InspectorRow>

      <InspectorRow label="Quality">
        <InspectorSlider
          value={activeGeometryQuality}
          min={0.015}
          max={0.12}
          sliderMin={0.015}
          sliderMax={0.08}
          step={0.005}
          precision={3}
          onChange={onQualityChange}
        />
      </InspectorRow>
    </InspectorSection>
  )
}
