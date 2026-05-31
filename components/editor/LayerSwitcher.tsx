"use client"

import { Eye, EyeOff, Layers } from "lucide-react"
import { memo } from "react"
import { cn } from "@/lib/utils"
import type { PathOverride } from "../3d/SvgTypes"
import { ALL_LAYERS_ID, type SvgLayer } from "./SvgLayerModel"

type LayerSwitcherProps = {
  layers: SvgLayer[]
  selectedLayerId: string
  selectedLayerOverride: PathOverride | null
  onSelectLayer: (id: string) => void
  onToggleVisibility: () => void
}

// Layers in this app are anonymous SVG paths — no real names, no meaningful
// thumbnail. The switcher is a labeled segmented control so its purpose is
// obvious: a Layers icon + caption on the left, then [All · 1 · 2 · 3]. The eye
// toggle only appears when a single layer is targeted.
function LayerSwitcherComponent({
  layers,
  selectedLayerId,
  selectedLayerOverride,
  onSelectLayer,
  onToggleVisibility,
}: LayerSwitcherProps) {
  // Single-layer shapes have nothing to switch between — hide the bar entirely.
  if (layers.length < 2) return null

  const isAllLayers = selectedLayerId === ALL_LAYERS_ID
  const visible = selectedLayerOverride?.visible ?? true

  const chip = (key: string, label: string, active: boolean, value: string) => (
    <button
      key={key}
      type="button"
      aria-pressed={active}
      onClick={() => onSelectLayer(value)}
      className={cn(
        "flex h-6 min-w-6 shrink-0 items-center justify-center rounded-[6px] px-2 text-[11px] font-medium tabular-nums transition-colors focus-visible:outline-none",
        active
          ? "bg-foreground/[0.10] text-foreground shadow-[inset_0_0_0_1px_rgba(140,140,160,0.18)]"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </button>
  )

  return (
    <div className="mb-2 flex h-9 items-center gap-2 rounded-lg border border-border/40 bg-foreground/[0.02] pr-1 pl-2.5">
      <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Layers className="size-3.5" />
        Layers
      </span>

      <div className="ml-auto flex min-w-0 items-center gap-0.5 overflow-x-auto">
        {chip("all", "All", isAllLayers, ALL_LAYERS_ID)}
        {layers.map((layer, index) =>
          chip(
            layer.id,
            String(index + 1),
            layer.id === selectedLayerId,
            layer.id
          )
        )}
      </div>

      {!isAllLayers ? (
        <>
          <span className="h-4 w-px shrink-0 bg-border/50" />
          <button
            type="button"
            aria-label={visible ? "Hide layer" : "Show layer"}
            aria-pressed={!visible}
            title={visible ? "Hide layer" : "Show layer"}
            onClick={onToggleVisibility}
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none",
              visible
                ? "text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                : "text-muted-foreground/40 hover:bg-foreground/10"
            )}
          >
            {visible ? (
              <Eye className="size-3.5" />
            ) : (
              <EyeOff className="size-3.5" />
            )}
          </button>
        </>
      ) : null}
    </div>
  )
}

export const LayerSwitcher = memo(LayerSwitcherComponent)
