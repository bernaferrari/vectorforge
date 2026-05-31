"use client"

import { Eye, EyeOff, Layers } from "lucide-react"
import { memo } from "react"
import { cn } from "@/lib/utils"
import type { PathOverride } from "../3d/SvgTypes"
import { InspectorRow } from "./InspectorPrimitives"
import { InspectorSlider } from "./InspectorSlider"
import { ALL_LAYERS_ID, type SvgLayer } from "./SvgLayerModel"

type LayerSwitcherProps = {
  layers: SvgLayer[]
  selectedLayerId: string
  selectedLayerOverride: PathOverride | null
  onSelectLayer: (id: string) => void
  onToggleVisibility: () => void
  onScaleChange: (value: number) => void
  onDepthChange: (value: number) => void
}

// Layers in this app are anonymous SVG paths — no real names, no meaningful
// thumbnail. The switcher is a labeled segmented control ([All · 1 · 2 · 3]) and
// it OWNS everything per-layer: visibility + the layer's Scale/Depth overrides
// appear right here when a single layer is targeted, so the controls live next
// to the thing they affect instead of being stranded at the bottom of TRANSFORM.
//
// Rendered BORDERLESS — the parent InspectorContextHeader provides the card so
// the shape navigation and the layer switcher read as one "what am I editing"
// unit, separated from the property editors below.
function LayerSwitcherComponent({
  layers,
  selectedLayerId,
  selectedLayerOverride,
  onSelectLayer,
  onToggleVisibility,
  onScaleChange,
  onDepthChange,
}: LayerSwitcherProps) {
  // Single-layer shapes have nothing to switch between — hide the bar entirely.
  if (layers.length < 2) return null

  const isAllLayers = selectedLayerId === ALL_LAYERS_ID
  const visible = selectedLayerOverride?.visible ?? true
  const showLayerControls = !isAllLayers && selectedLayerOverride

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
    <div className="flex flex-col">
      <div className="flex h-9 items-center gap-2 pr-1 pl-2.5">
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
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

        {/* Trailing slot is always reserved so toggling a layer never shifts the
            chips left/right. It just becomes interactive when a layer is active. */}
        <div
          className={cn(
            "flex shrink-0 items-center gap-1 pl-1",
            isAllLayers && "pointer-events-none invisible"
          )}
        >
          <span className="h-4 w-px bg-border/50" />
          <button
            type="button"
            aria-label={visible ? "Hide layer" : "Show layer"}
            aria-pressed={!visible}
            title={visible ? "Hide layer" : "Show layer"}
            onClick={onToggleVisibility}
            className={cn(
              "flex size-7 items-center justify-center rounded-md transition-colors focus-visible:outline-none",
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
        </div>
      </div>

      {showLayerControls ? (
        <div className="flex flex-col gap-0.5 border-t border-border/40 p-1">
          <InspectorRow label="Scale">
            <InspectorSlider
              value={selectedLayerOverride.scale?.x ?? 1}
              min={0.1}
              max={2.25}
              sliderMax={1.6}
              step={0.01}
              scrubStep={0.03}
              precision={2}
              onChange={onScaleChange}
            />
          </InspectorRow>
          <InspectorRow label="Depth">
            <InspectorSlider
              value={selectedLayerOverride.depthMultiplier}
              min={0.05}
              max={2.5}
              sliderMax={1.8}
              step={0.05}
              precision={2}
              onChange={onDepthChange}
            />
          </InspectorRow>
        </div>
      ) : null}
    </div>
  )
}

export const LayerSwitcher = memo(LayerSwitcherComponent)
