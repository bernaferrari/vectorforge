"use client"

import { ChevronRight } from "lucide-react"
import type { MaterialSettingKey, MaterialSettings } from "./EditorModel"
import { InspectorSlider } from "./InspectorSlider"
import { MATERIAL_CONTROLS } from "./MaterialControlModel"

type AdvancedMaterialControlsProps = {
  isOpen: boolean
  keyframeCount: number
  settings: MaterialSettings
  propertyRowClassName: (isActive?: boolean) => string
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
  propertyRowClassName,
  onOpenChange,
  onSettingChange,
}: AdvancedMaterialControlsProps) {
  return (
    <div className="pt-1">
      <div className="mb-1 flex items-center">
        <button
          type="button"
          onClick={() => onOpenChange(!isOpen)}
          className="flex h-5 min-w-0 flex-1 items-center gap-1 rounded text-left text-[10px] font-medium text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none"
          aria-expanded={isOpen}
        >
          <ChevronRight
            className={`size-2.5 transition-transform duration-150 ${
              isOpen ? "rotate-90" : ""
            }`}
          />
          ADVANCED
          {keyframeCount > 0 && (
            <span className="ml-1 size-1.5 rounded-full bg-violet-400" />
          )}
        </button>
      </div>

      {isOpen &&
        MATERIAL_CONTROLS.map(
          ({ key, label, min, max, sliderMax, step, precision }) => (
            <div key={key} className={`${propertyRowClassName()} gap-2`}>
              <span
                className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground"
                title={label}
              >
                {label}
              </span>
              <InspectorSlider
                value={settings[key]}
                min={min}
                max={max}
                sliderMax={sliderMax}
                step={step}
                precision={precision}
                className="w-[172px] shrink-0"
                inputClassName="w-[52px]"
                sliderClassName="min-w-0 flex-1"
                onChange={(next) => onSettingChange(key, next, min, max)}
              />
            </div>
          )
        )}
    </div>
  )
}
