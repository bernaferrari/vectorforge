"use client"

import { Eye, EyeOff, Layers } from "lucide-react"
import { memo } from "react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { PathOverride } from "../3d/SvgTypes"
import { ALL_LAYERS_ID, type SvgLayer } from "./SvgLayerModel"

type LayerSwitcherProps = {
  layers: SvgLayer[]
  selectedLayer: SvgLayer | null
  selectedLayerId: string
  selectedLayerOverride: PathOverride | null
  onSelectLayer: (id: string) => void
  onToggleVisibility: () => void
}

function LayerSwatch({ color }: { color?: string | null }) {
  return (
    <span
      className="size-3 shrink-0 rounded-[3px] ring-1 ring-black/25 ring-inset"
      style={{ backgroundColor: color || "transparent" }}
    />
  )
}

function LayerSwitcherComponent({
  layers,
  selectedLayer,
  selectedLayerId,
  selectedLayerOverride,
  onSelectLayer,
  onToggleVisibility,
}: LayerSwitcherProps) {
  // Single-layer shapes have nothing to switch between — hide the bar entirely.
  if (layers.length < 2) return null

  const isAllLayers = selectedLayerId === ALL_LAYERS_ID
  const visible = selectedLayerOverride?.visible ?? true
  const activeLabel = isAllLayers
    ? "All layers"
    : (selectedLayer?.name ?? "Layer")

  return (
    <div className="mb-2 flex items-center gap-1.5">
      <Select
        value={selectedLayerId}
        onValueChange={(next) => {
          if (next) onSelectLayer(next)
        }}
      >
        <SelectTrigger
          size="sm"
          className="h-8 min-w-0 flex-1 rounded-lg border border-border/50 bg-foreground/[0.04] px-2.5 text-[12px] text-foreground transition-colors hover:bg-foreground/[0.07] focus-visible:ring-0"
        >
          <SelectValue>
            <span className="flex min-w-0 items-center gap-2">
              {isAllLayers ? (
                <Layers className="size-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <LayerSwatch color={selectedLayer?.color} />
              )}
              <span className="truncate font-medium">{activeLabel}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start">
          <SelectItem value={ALL_LAYERS_ID}>
            <Layers className="size-3.5 shrink-0 text-muted-foreground" />
            <span>All layers</span>
          </SelectItem>
          {layers.map((layer) => (
            <SelectItem key={layer.id} value={layer.id}>
              <LayerSwatch color={layer.color} />
              <span className="truncate">{layer.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!isAllLayers ? (
        <button
          type="button"
          aria-label={visible ? "Hide layer" : "Show layer"}
          aria-pressed={!visible}
          title={visible ? "Hide layer" : "Show layer"}
          onClick={onToggleVisibility}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/50 transition-colors focus-visible:outline-none",
            visible
              ? "text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
              : "bg-foreground/[0.04] text-muted-foreground/40 hover:bg-foreground/10"
          )}
        >
          {visible ? (
            <Eye className="size-3.5" />
          ) : (
            <EyeOff className="size-3.5" />
          )}
        </button>
      ) : null}
    </div>
  )
}

export const LayerSwitcher = memo(LayerSwitcherComponent)
