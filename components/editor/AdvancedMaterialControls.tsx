"use client"

import type { MaterialSettingKey, MaterialSettings } from "./EditorModel"
import { InspectorDisclosure, InspectorRow } from "./InspectorPrimitives"
import { InspectorSlider } from "./InspectorSlider"
import { MATERIAL_CONTROLS } from "./MaterialControlModel"

type AdvancedMaterialControlsProps = {
  isOpen: boolean
  keyframeCount: number
  settings: MaterialSettings
  onOpenChange: (open: boolean) => void
  onSettingChange: (
    key: MaterialSettingKey,
    value: number,
    min: number,
    max: number
  ) => void
}

export function AdvancedMaterialControls({
  isOpen,
  keyframeCount,
  settings,
  onOpenChange,
  onSettingChange,
}: AdvancedMaterialControlsProps) {
  return (
    <InspectorDisclosure
      title="ADVANCED"
      open={isOpen}
      onOpenChange={onOpenChange}
      badge={
        keyframeCount > 0 ? (
          <span className="ml-1 size-1.5 rounded-full bg-violet-400" />
        ) : null
      }
    >
      {MATERIAL_CONTROLS.map(
        ({ key, label, min, max, sliderMax, step, precision }) => (
          <InspectorRow key={key} label={label}>
            <InspectorSlider
              value={settings[key]}
              min={min}
              max={max}
              sliderMax={sliderMax}
              step={step}
              precision={precision}
              onChange={(next) => onSettingChange(key, next, min, max)}
            />
          </InspectorRow>
        )
      )}
    </InspectorDisclosure>
  )
}
