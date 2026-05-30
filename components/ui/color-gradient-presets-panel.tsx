"use client"

import { Move, Shuffle } from "lucide-react"
import { GRADIENT_PRESETS, type GradientPreset } from "./color-gradient-presets"
import { type GradientType } from "./color-gradient-mode-toggle"
import { gradientPreviewCss } from "./color-picker-utils"

interface ColorGradientPresetsPanelProps {
  gradientType: GradientType
  onPresetSelect: (preset: GradientPreset) => void
  onShuffleMeshColors: () => void
  onShuffleMeshPoints: () => void
}

export function ColorGradientPresetsPanel({
  gradientType,
  onPresetSelect,
  onShuffleMeshColors,
  onShuffleMeshPoints,
}: ColorGradientPresetsPanelProps) {
  return (
    <div className="space-y-1.5 px-2">
      <div className="flex h-6 items-center justify-between">
        <div className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Presets
        </div>
        {gradientType === "mesh" && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Shuffle mesh point positions"
              aria-label="Shuffle mesh point positions"
              className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus:ring-2 focus:ring-ring/35 focus:outline-none"
              onClick={(event) => {
                event.stopPropagation()
                onShuffleMeshPoints()
              }}
            >
              <Move className="size-3.5" />
            </button>
            <button
              type="button"
              title="Shuffle mesh colors"
              aria-label="Shuffle mesh colors"
              className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus:ring-2 focus:ring-ring/35 focus:outline-none"
              onClick={(event) => {
                event.stopPropagation()
                onShuffleMeshColors()
              }}
            >
              <Shuffle className="size-3.5" />
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {GRADIENT_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            title={preset.name}
            aria-label={`Use ${preset.name} gradient`}
            className="group flex h-8 min-w-0 items-center justify-center rounded-md border border-border bg-muted/35 p-1 transition-colors hover:border-ring/50 hover:bg-muted/60 focus:ring-2 focus:ring-ring/35 focus:outline-none"
            onPointerDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onPresetSelect(preset)
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <span
              className="block h-full w-full rounded-[5px] border border-border shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
              style={{
                background: gradientPreviewCss(preset.type, preset.stops),
              }}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
