"use client"

import { ReactNode, RefObject } from "react"
import { LIGHT_MAX, LightPosition, finiteNumber } from "./EditorModel"
import { InspectorRow, InspectorSection } from "./InspectorPrimitives"
import { InspectorSlider } from "./InspectorSlider"
import { LightDirectionPicker } from "./LightDirectionPicker"
import type { TimelineTrack } from "./TimelineModel"

export type LightInspectorSectionProps = {
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
    <InspectorSection title="LIGHT" action={brightnessKeyframeControl}>
      <InspectorRow
        label="Brightness"
        rowRef={lightingRef}
        dot={lightingTrack.keyframes.length > 0 ? lightingTrack.color : null}
        active={isActive}
        onClick={onActivate}
      >
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
      </InspectorRow>

      <InspectorRow label="Direction">
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
      </InspectorRow>
    </InspectorSection>
  )
}
