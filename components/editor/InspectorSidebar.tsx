"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { LayerSwitcher } from "./LayerSwitcher"
import {
  GeometryInspectorSection,
  type GeometryInspectorSectionProps,
} from "./GeometryInspectorSection"
import {
  LightInspectorSection,
  type LightInspectorSectionProps,
} from "./LightInspectorSection"
import {
  StyleInspectorSection,
  type StyleInspectorSectionProps,
} from "./StyleInspectorSection"
import {
  TransformInspectorSection,
  type TransformInspectorSectionProps,
} from "./TransformInspectorSection"

export type SidebarStyleProps = StyleInspectorSectionProps
export type SidebarGeometryProps = GeometryInspectorSectionProps
export type SidebarTransformProps = TransformInspectorSectionProps & {
  onSelectLayer: (id: string) => void
  onToggleLayerVisibility: () => void
}
export type SidebarLightProps = LightInspectorSectionProps

export type InspectorSidebarProps = {
  zenMode: boolean
  styleProps: SidebarStyleProps
  geometryProps: SidebarGeometryProps
  transformProps: SidebarTransformProps
  lightProps: SidebarLightProps
}

function ShapeHeader({
  shapeNavigation,
}: {
  shapeNavigation: SidebarTransformProps["shapeNavigation"]
}) {
  if (!shapeNavigation || shapeNavigation.total <= 1) return null

  return (
    <div className="-mx-3 mb-2.5 flex items-center justify-between gap-2 border-b border-border/40 px-3 pb-2.5">
      <span
        className="min-w-0 truncate text-[13px] font-semibold text-foreground"
        title={shapeNavigation.label}
      >
        {shapeNavigation.label}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label="Previous shape"
          title="Previous shape"
          onClick={shapeNavigation.onPrevious}
          className="flex size-6 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-[28px] text-center font-mono text-[10px] text-muted-foreground/70 tabular-nums">
          {shapeNavigation.index + 1}/{shapeNavigation.total}
        </span>
        <button
          type="button"
          aria-label="Next shape"
          title="Next shape"
          onClick={shapeNavigation.onNext}
          className="flex size-6 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}

export function InspectorSidebar({
  zenMode,
  styleProps,
  geometryProps,
  transformProps,
  lightProps,
}: InspectorSidebarProps) {
  return (
    <div
      className={`flex shrink-0 flex-col overflow-y-auto bg-background transition-[width,padding,border-color,opacity] duration-300 ease-out ${
        zenMode
          ? "pointer-events-none w-0 border-l-0 p-0 opacity-0"
          : "w-[328px] border-l border-border/40 px-3 py-3"
      }`}
    >
      <ShapeHeader shapeNavigation={transformProps.shapeNavigation} />

      <LayerSwitcher
        layers={transformProps.selectedShapeLayers}
        selectedLayerId={transformProps.selectedLayerId}
        selectedLayerOverride={transformProps.selectedLayerOverride}
        onSelectLayer={transformProps.onSelectLayer}
        onToggleVisibility={transformProps.onToggleLayerVisibility}
        onScaleChange={transformProps.onLayerScaleChange}
        onDepthChange={transformProps.onLayerDepthChange}
      />

      <div className="flex flex-col divide-y divide-border/30">
        <StyleInspectorSection {...styleProps} />
        <GeometryInspectorSection {...geometryProps} />
        <TransformInspectorSection {...transformProps} />
        <LightInspectorSection {...lightProps} />
      </div>
    </div>
  )
}
