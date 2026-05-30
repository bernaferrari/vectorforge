"use client"

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

const INSPECTOR_LABEL_WIDTH = "w-[58px]"

const inspectorPropertyRowClass = (isActive?: boolean) =>
  `flex min-h-8 items-center gap-1 rounded-[8px] -mx-1 px-1 py-0.5 transition-colors duration-100 ${
    isActive ? "bg-muted/50" : "hover:bg-muted/25"
  }`

export type SidebarStyleProps = Omit<
  StyleInspectorSectionProps,
  "labelWidthClass" | "propertyRowClassName"
>

export type SidebarGeometryProps = Omit<
  GeometryInspectorSectionProps,
  "labelWidthClass" | "propertyRowClassName"
>

export type SidebarTransformProps = Omit<
  TransformInspectorSectionProps,
  "labelWidthClass" | "propertyRowClassName"
>

export type SidebarLightProps = Omit<
  LightInspectorSectionProps,
  "labelWidthClass" | "propertyRowClassName"
>

export type InspectorSidebarProps = {
  zenMode: boolean
  styleProps: SidebarStyleProps
  geometryProps: SidebarGeometryProps
  transformProps: SidebarTransformProps
  lightProps: SidebarLightProps
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
          : "w-[328px] gap-3 border-l border-border/40 px-3 py-3"
      }`}
    >
      <StyleInspectorSection
        labelWidthClass={INSPECTOR_LABEL_WIDTH}
        propertyRowClassName={inspectorPropertyRowClass}
        {...styleProps}
      />

      <GeometryInspectorSection
        labelWidthClass={INSPECTOR_LABEL_WIDTH}
        propertyRowClassName={inspectorPropertyRowClass}
        {...geometryProps}
      />

      <div className="h-px bg-border/40" />

      <TransformInspectorSection
        labelWidthClass={INSPECTOR_LABEL_WIDTH}
        propertyRowClassName={inspectorPropertyRowClass}
        {...transformProps}
      />

      <div className="h-px bg-border/40" />

      <LightInspectorSection
        labelWidthClass={INSPECTOR_LABEL_WIDTH}
        propertyRowClassName={inspectorPropertyRowClass}
        {...lightProps}
      />
    </div>
  )
}
