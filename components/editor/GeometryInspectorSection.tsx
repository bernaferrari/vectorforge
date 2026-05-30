"use client"

import { ReactNode, RefObject } from "react"
import { EXTRUDE_DEFAULT, EXTRUDE_MAX, finiteNumber } from "./EditorModel"
import { InspectorSlider } from "./InspectorSlider"
import { MAX_BEVEL_SEGMENTS } from "./EditorModel"
import { InspectorSectionHeader } from "./InspectorSectionHeader"
import type { TimelineTrack } from "./TimelineModel"

export type GeometryInspectorSectionProps = {
  labelWidthClass: string
  propertyRowClassName: (isActive?: boolean) => string
  extrusionRef: RefObject<HTMLDivElement | null>
  isActive: boolean
  extrusionTrack: TimelineTrack
  activeExtrusionDepth: number
  extrusionDepth: number
  activeGeometryQuality: number
  bevelEnabled: boolean
  bevelSegments: number
  keyframeControl: ReactNode
  onActivate: () => void
  onDepthChange: (value: number) => void
  onBevelEnabledChange: (enabled: boolean) => void
  onBevelSegmentsChange: (segments: number) => void
  onQualityChange: (value: number) => void
  onCustomEdit: () => void
}

export function GeometryInspectorSection({
  labelWidthClass,
  propertyRowClassName,
  extrusionRef,
  isActive,
  extrusionTrack,
  activeExtrusionDepth,
  extrusionDepth,
  activeGeometryQuality,
  bevelEnabled,
  bevelSegments,
  keyframeControl,
  onActivate,
  onDepthChange,
  onBevelEnabledChange,
  onBevelSegmentsChange,
  onQualityChange,
  onCustomEdit,
}: GeometryInspectorSectionProps) {
  const depthValue = finiteNumber(
    extrusionTrack.keyframes.length > 0 ? activeExtrusionDepth : extrusionDepth,
    EXTRUDE_DEFAULT
  )

  return (
    <div className="flex flex-col gap-1.5">
      <InspectorSectionHeader title="SHAPE" action={keyframeControl} />

      <div
        className={`-mx-1 rounded-xl p-1 transition-colors duration-100 ${
          isActive ? "bg-muted/50" : ""
        }`}
      >
        <div
          ref={extrusionRef}
          className={propertyRowClassName(false)}
          onClick={onActivate}
        >
          <span
            className={`${labelWidthClass} shrink-0 text-[11px] text-muted-foreground`}
          >
            Extrude
          </span>
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
        </div>

        <div className={propertyRowClassName(false)} onClick={onActivate}>
          <span
            className={`${labelWidthClass} shrink-0 text-[11px] text-muted-foreground`}
          >
            Bevel
          </span>
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
        </div>

        <div className={propertyRowClassName(false)} onClick={onActivate}>
          <span
            className={`${labelWidthClass} shrink-0 text-[11px] text-muted-foreground`}
          >
            Quality
          </span>
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
        </div>
      </div>
    </div>
  )
}
