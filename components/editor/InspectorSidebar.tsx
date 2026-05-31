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

function ShapeNavRow({
  shapeNavigation,
}: {
  shapeNavigation: NonNullable<SidebarTransformProps["shapeNavigation"]>
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-2 pr-1 pl-2">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background text-foreground shadow-sm [&_svg]:size-4 [&_svg_*]:fill-current"
          style={{ color: shapeNavigation.color }}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: shapeNavigation.svgContent }}
        />
        <span
          className="min-w-0 truncate text-[12px] font-semibold text-foreground"
          title={shapeNavigation.label}
        >
          {shapeNavigation.label}
        </span>
      </div>
      {shapeNavigation.canNavigate ? (
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            aria-label="Previous shape"
            title="Previous shape"
            onClick={shapeNavigation.onPrevious}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <span className="min-w-[30px] text-center font-mono text-[10px] text-muted-foreground/70 tabular-nums">
            {shapeNavigation.index + 1}/{shapeNavigation.total}
          </span>
          <button
            type="button"
            aria-label="Next shape"
            title="Next shape"
            onClick={shapeNavigation.onNext}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  )
}

// One "what am I editing" card grouping the two selection controls — shape
// navigation (which shape in the sequence) on top, layer switcher (which path
// within it) below — separated from the property editors by the card boundary
// itself rather than a floating divider line.
function InspectorContextHeader({
  transformProps,
}: {
  transformProps: SidebarTransformProps
}) {
  const { shapeNavigation } = transformProps
  const showShapeNav = !!shapeNavigation
  const showLayers = transformProps.selectedShapeLayers.length >= 2
  if (!showShapeNav && !showLayers) return null

  return (
    <div className="mb-3 flex shrink-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-muted/25 shadow-sm">
      {showShapeNav ? <ShapeNavRow shapeNavigation={shapeNavigation} /> : null}
      {showShapeNav && showLayers ? (
        <div className="h-px bg-border/40" />
      ) : null}
      {showLayers ? (
        <LayerSwitcher
          layers={transformProps.selectedShapeLayers}
          selectedLayerId={transformProps.selectedLayerId}
          selectedLayerOverride={transformProps.selectedLayerOverride}
          onSelectLayer={transformProps.onSelectLayer}
          onToggleVisibility={transformProps.onToggleLayerVisibility}
          onScaleChange={transformProps.onLayerScaleChange}
          onDepthChange={transformProps.onLayerDepthChange}
        />
      ) : null}
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
      <InspectorContextHeader transformProps={transformProps} />

      <div className="flex flex-col divide-y divide-border/30">
        <StyleInspectorSection {...styleProps} />
        <GeometryInspectorSection {...geometryProps} />
        <TransformInspectorSection {...transformProps} />
        <LightInspectorSection {...lightProps} />
      </div>
    </div>
  )
}
