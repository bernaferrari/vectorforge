"use client"

import { memo } from "react"
import { Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
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
// thumbnail. The switcher is a labeled chip group ([All · 1 · 2 · 3], each chip
// carrying the layer's fill color so they're scannable) that WRAPS for many
// layers, and it OWNS everything per-layer: Scale / Depth / Visible all live in
// the controls block that drops in when a single layer is targeted.
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
  const isAllLayers = selectedLayerId === ALL_LAYERS_ID
  const visible = selectedLayerOverride?.visible ?? true
  const showLayerControls = !isAllLayers && selectedLayerOverride
  const onlyLayer = layers.length === 1 ? layers[0] : null

  if (onlyLayer) {
    return (
      <div className="flex min-h-9 items-center gap-2 px-2.5 py-1.5">
        <span className="flex h-6 shrink-0 items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          <Layers className="size-3.5" />
          Layer
        </span>
        <span className="ml-auto flex h-6 items-center gap-1.5 rounded-[6px] px-2 text-[11px] font-medium text-muted-foreground">
          <span
            className="size-2 shrink-0 rounded-full ring-1 ring-black/25 ring-inset"
            style={{ backgroundColor: onlyLayer.color }}
          />
          1
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="flex min-h-9 items-start gap-2 px-2.5 py-1.5">
        <span className="flex h-6 shrink-0 items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          <Layers className="size-3.5" />
          Layers
        </span>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
          <button
            type="button"
            aria-pressed={isAllLayers}
            onClick={() => onSelectLayer(ALL_LAYERS_ID)}
            className={cn(
              "flex h-6 shrink-0 items-center justify-center rounded-[6px] px-2 text-[11px] font-medium transition-colors focus-visible:outline-none",
              isAllLayers
                ? "bg-foreground/[0.10] text-foreground shadow-[inset_0_0_0_1px_rgba(140,140,160,0.18)]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          {layers.map((layer, index) => {
            const active = layer.id === selectedLayerId
            return (
              <button
                key={layer.id}
                type="button"
                aria-pressed={active}
                title={`Layer ${index + 1}`}
                onClick={() => onSelectLayer(layer.id)}
                className={cn(
                  "flex h-6 min-w-6 shrink-0 items-center justify-center gap-1.5 rounded-[6px] px-2 text-[11px] font-medium tabular-nums transition-colors focus-visible:outline-none",
                  active
                    ? "bg-foreground/[0.10] text-foreground shadow-[inset_0_0_0_1px_rgba(140,140,160,0.18)]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className="size-2 shrink-0 rounded-full ring-1 ring-black/25 ring-inset"
                  style={{ backgroundColor: layer.color }}
                />
                {index + 1}
              </button>
            )
          })}
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
          <InspectorRow label="Visible">
            <div className="flex flex-1 justify-end pr-1">
              <Switch
                checked={visible}
                onCheckedChange={onToggleVisibility}
                size="sm"
                aria-label={visible ? "Hide layer" : "Show layer"}
              />
            </div>
          </InspectorRow>
        </div>
      ) : null}
    </div>
  )
}

export const LayerSwitcher = memo(LayerSwitcherComponent)
