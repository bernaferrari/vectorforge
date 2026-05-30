"use client"

import { ReactNode, RefObject } from "react"
import { LIGHT_MAX, LightPosition, finiteNumber } from "./EditorModel"
import { InspectorSlider } from "./InspectorSlider"
import { InspectorSectionHeader } from "./InspectorSectionHeader"
import { LightDirectionPicker } from "./LightDirectionPicker"
import type { TimelineTrack } from "./TimelineModel"

export type LightInspectorSectionProps = {
  labelWidthClass: string
  propertyRowClassName: (isActive?: boolean) => string
  lightingRef: RefObject<HTMLDivElement | null>
  isActive: boolean
  lightingTrack: TimelineTrack
  activeKeyLightIntensity: number
  keyLightIntensity: number
  activeKeyLightPosition: LightPosition
  keyLightColor: string
  keyLightSoftness: number
  lightPositionIsKeyed: boolean
  lightPositionKeyframeControl: ReactNode
  brightnessKeyframeControl: ReactNode
  onActivate: () => void
  onLightPositionChange: (x: number, y: number) => void
  onLightColorChange: (color: string) => void
  onLightSoftnessChange: (value: number) => void
  onToggleLightPositionKeyframe: () => void
  onBrightnessChange: (value: number) => void
  onCustomEdit: () => void
}

export function LightInspectorSection({
  labelWidthClass,
  propertyRowClassName,
  lightingRef,
  isActive,
  lightingTrack,
  activeKeyLightIntensity,
  keyLightIntensity,
  activeKeyLightPosition,
  keyLightColor,
  keyLightSoftness,
  lightPositionIsKeyed,
  lightPositionKeyframeControl,
  brightnessKeyframeControl,
  onActivate,
  onLightPositionChange,
  onLightColorChange,
  onLightSoftnessChange,
  onToggleLightPositionKeyframe,
  onBrightnessChange,
  onCustomEdit,
}: LightInspectorSectionProps) {
  const brightnessValue = finiteNumber(
    lightingTrack.keyframes.length > 0
      ? activeKeyLightIntensity
      : keyLightIntensity,
    1
  )

  return (
    <div className="flex flex-col gap-1.5">
      <InspectorSectionHeader
        title="LIGHT"
        action={brightnessKeyframeControl}
      />

      <div
        ref={lightingRef}
        className={propertyRowClassName(isActive)}
        onClick={onActivate}
      >
        <span
          className={`${labelWidthClass} flex shrink-0 items-center text-[11px] text-muted-foreground`}
        >
          <span onClick={(event) => event.stopPropagation()}>
            <LightDirectionPicker
              position={activeKeyLightPosition}
              color={keyLightColor}
              softness={keyLightSoftness}
              onDirectionChange={onLightPositionChange}
              onColorChange={(color) => {
                onLightColorChange(color)
                onCustomEdit()
              }}
              onSoftnessChange={(value) => {
                onLightSoftnessChange(value)
                onCustomEdit()
              }}
              isKeyed={lightPositionIsKeyed}
              onToggleKeyframe={onToggleLightPositionKeyframe}
              keyframeControls={lightPositionKeyframeControl}
            />
          </span>
          {lightingTrack.keyframes.length > 0 && (
            <span
              className="ml-1.5 inline-block size-1 rounded-full"
              style={{ backgroundColor: lightingTrack.color }}
            />
          )}
        </span>
        <InspectorSlider
          value={brightnessValue}
          min={0}
          max={LIGHT_MAX}
          sliderMax={12}
          step={0.1}
          precision={1}
          onChange={(value) => {
            onBrightnessChange(value)
            onCustomEdit()
          }}
        />
      </div>
    </div>
  )
}
