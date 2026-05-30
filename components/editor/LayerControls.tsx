"use client"

import { memo } from "react"
import type { PathOverride } from "../3d/SvgTypes"
import { ALL_LAYERS_ID, type SvgLayer } from "./SvgLayerModel"
import { InspectorRow } from "./InspectorPrimitives"
import { InspectorSlider } from "./InspectorSlider"

type LayerControlsProps = {
  layers: SvgLayer[]
  selectedLayer: SvgLayer | null
  selectedLayerId: string
  selectedLayerOverride: PathOverride | null
  onSelectLayer: (id: string) => void
  onToggleVisibility: () => void
  onScaleChange: (value: number) => void
  onDepthChange: (value: number) => void
}

// Per-layer overrides shown inside TRANSFORM when a SPECIFIC layer is the active
// edit target. Picking *which* layer (and toggling its visibility) now lives in
// the pinned LayerSwitcher at the top of the inspector, so this component only
// renders the contextual Scale/Depth tweaks for the selected layer.
function LayerControlsComponent({
  layers,
  selectedLayerId,
  selectedLayerOverride,
  onScaleChange,
  onDepthChange,
}: LayerControlsProps) {
  const isAllLayers = selectedLayerId === ALL_LAYERS_ID
  // Nothing to override for "All layers", single-layer shapes, or before the
  // override has resolved — those would just duplicate object-level Scale/Extrude.
  if (isAllLayers || layers.length < 2 || !selectedLayerOverride) return null

  return (
    <div className="mt-1 flex flex-col gap-0.5 border-t border-foreground/[0.06] pt-1.5">
      <InspectorRow label="Layer scale">
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
      <InspectorRow label="Layer depth">
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
  )
}

export const LayerControls = memo(LayerControlsComponent)
