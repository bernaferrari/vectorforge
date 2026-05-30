"use client"

import type { MaterialPresetId } from "../3d/MaterialPresets"
import {
  FINISH_PRESETS,
  MATERIAL_METADATA,
  MATERIAL_PREVIEW,
} from "./FinishRegistry"

type FinishPresetPickerProps = {
  value: MaterialPresetId
  onChange: (preset: MaterialPresetId) => void
}

// Swatch row only — the "Finish" label is supplied by the enclosing InspectorRow.
export function FinishPresetPicker({
  value,
  onChange,
}: FinishPresetPickerProps) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      {FINISH_PRESETS.map((preset) => {
        const isActive = value === preset
        const name = MATERIAL_METADATA[preset].name

        return (
          <button
            key={preset}
            type="button"
            aria-label={name}
            aria-pressed={isActive}
            title={name}
            onClick={() => onChange(preset)}
            className="group/finish relative flex items-center justify-center focus-visible:outline-none"
          >
            <span
              className={`size-6 rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.35),inset_0_-1px_2px_rgba(0,0,0,0.2)] transition-[box-shadow] duration-100 ${
                isActive
                  ? "ring-2 ring-ring/60 ring-offset-1 ring-offset-background"
                  : "hover:ring-2 hover:ring-foreground/20 hover:ring-offset-1 hover:ring-offset-background"
              }`}
              style={{ background: MATERIAL_PREVIEW[preset] }}
            />
            <span className="pointer-events-none absolute -top-7 left-1/2 z-30 -translate-x-1/2 rounded border border-border bg-popover px-2 py-1 text-[10px] font-medium whitespace-nowrap text-popover-foreground opacity-0 shadow-md transition-opacity duration-100 group-hover/finish:opacity-100">
              {name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
