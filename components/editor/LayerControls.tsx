"use client"

import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react"
import { memo, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { PathOverride } from "../3d/SvgTypes"
import { ALL_LAYERS_ID, type SvgLayer } from "./SvgLayerModel"
import { InspectorSlider } from "./InspectorSlider"

type ShapeNavigation = {
  label: string
  index: number
  total: number
  onPrevious: () => void
  onNext: () => void
}

type LayerControlsProps = {
  layers: SvgLayer[]
  selectedLayer: SvgLayer | null
  selectedLayerId: string
  selectedLayerOverride: PathOverride | null
  shapeNavigation?: ShapeNavigation
  onSelectLayer: (id: string) => void
  onToggleVisibility: () => void
  onScaleChange: (value: number) => void
  onDepthChange: (value: number) => void
}

function ShapeNavigator({
  shapeNavigation,
}: {
  shapeNavigation?: ShapeNavigation
}) {
  if (!shapeNavigation || shapeNavigation.total <= 1) return null

  return (
    <div className="flex min-w-0 items-center gap-1 rounded-lg bg-muted/25 p-0.5">
      <button
        type="button"
        aria-label="Select previous shape"
        onClick={shapeNavigation.onPrevious}
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        <ChevronLeft className="size-3.5" />
      </button>
      <div className="min-w-0 px-1.5 text-center">
        <div
          className="max-w-20 truncate text-[11px] text-foreground"
          title={shapeNavigation.label}
        >
          {shapeNavigation.label}
        </div>
        <div className="font-mono text-[10px] text-muted-foreground tabular-nums">
          {shapeNavigation.index + 1}/{shapeNavigation.total}
        </div>
      </div>
      <button
        type="button"
        aria-label="Select next shape"
        onClick={shapeNavigation.onNext}
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        <ChevronRight className="size-3.5" />
      </button>
    </div>
  )
}

function LayerTargetPicker({
  layers,
  selectedLayerId,
  visible,
  onToggleVisibility,
  onSelectLayer,
}: {
  layers: SvgLayer[]
  selectedLayerId: string
  visible: boolean
  onToggleVisibility: () => void
  onSelectLayer: (id: string) => void
}) {
  const layerOptions = [
    { id: ALL_LAYERS_ID, label: "All", name: "All layers" },
    ...layers.map((layer, index) => ({
      id: layer.id,
      label: `${index + 1}`,
      name: layer.name,
    })),
  ]
  const activeOption =
    layerOptions.find((option) => option.id === selectedLayerId) ??
    layerOptions[0]

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <div
          className="min-w-0 truncate text-[11px] text-muted-foreground"
          title={activeOption.name}
        >
          Editing {activeOption.name.toLowerCase()}
        </div>
        <button
          type="button"
          aria-label={visible ? "Hide selected layer" : "Show selected layer"}
          title={visible ? "Hide layer" : "Show layer"}
          onClick={onToggleVisibility}
          className={cn(
            "flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[11px] transition-colors focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none",
            visible
              ? "border-border/55 bg-background/35 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              : "border-border/45 bg-muted/35 text-muted-foreground/55 hover:text-foreground"
          )}
        >
          {visible ? (
            <Eye className="size-3.5" />
          ) : (
            <EyeOff className="size-3.5" />
          )}
          <span>{visible ? "Visible" : "Hidden"}</span>
        </button>
      </div>
      <div className="flex min-w-0 items-center gap-1 rounded-lg bg-muted/25 p-1">
        {layerOptions.map((option) => {
          const active = option.id === selectedLayerId
          return (
            <button
              key={option.id}
              type="button"
              title={option.name}
              aria-label={
                option.id === ALL_LAYERS_ID
                  ? "Select all layers"
                  : `Select ${option.name}`
              }
              aria-pressed={active}
              onClick={() => onSelectLayer(option.id)}
              className={cn(
                "h-8 min-w-0 rounded-md border px-2 text-[12px] transition-colors focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none",
                option.id === ALL_LAYERS_ID ? "flex-[1.45]" : "flex-1",
                active
                  ? "border-border/70 bg-background text-foreground shadow-[0_1px_0_rgba(255,255,255,0.04)]"
                  : "border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function LayerSliderRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="grid min-h-8 grid-cols-[3.75rem_minmax(0,1fr)] items-center gap-3">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

function LayerControlsComponent({
  layers,
  selectedLayer,
  selectedLayerId,
  selectedLayerOverride,
  shapeNavigation,
  onSelectLayer,
  onToggleVisibility,
  onScaleChange,
  onDepthChange,
}: LayerControlsProps) {
  if (layers.length === 0 || !selectedLayerOverride) return null

  const targetLabel =
    selectedLayerId === ALL_LAYERS_ID
      ? "All layers"
      : (selectedLayer?.name ?? "Layer")

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/55 bg-muted/8 p-3.5">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <div className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Layers
          </div>
          <div
            className="min-w-0 truncate text-[12px] text-muted-foreground"
            title={targetLabel}
          >
            {layers.length}
          </div>
        </div>
        <ShapeNavigator shapeNavigation={shapeNavigation} />
      </div>

      <LayerTargetPicker
        layers={layers}
        selectedLayerId={selectedLayerId}
        visible={selectedLayerOverride.visible}
        onToggleVisibility={onToggleVisibility}
        onSelectLayer={onSelectLayer}
      />
      <div className="space-y-2.5 border-t border-border/40 pt-3">
        <LayerSliderRow label="Scale">
          <InspectorSlider
            value={selectedLayerOverride.scale?.x ?? 1}
            min={0.1}
            max={2.25}
            sliderMax={1.6}
            step={0.01}
            scrubStep={0.03}
            precision={2}
            inputClassName="w-[60px]"
            onChange={onScaleChange}
          />
        </LayerSliderRow>
        <LayerSliderRow label="Depth">
          <InspectorSlider
            value={selectedLayerOverride.depthMultiplier}
            min={0.05}
            max={2.5}
            sliderMax={1.8}
            step={0.05}
            precision={2}
            inputClassName="w-[60px]"
            onChange={onDepthChange}
          />
        </LayerSliderRow>
      </div>
    </div>
  )
}

export const LayerControls = memo(LayerControlsComponent)
