"use client"

import React from "react"
import type { ShapeStop } from "../TimelineModel"
import { TimelineShapeClip } from "./TimelineShapeClip"
import type { ShapeClipBounds } from "./TimelineLayoutModel"
import type { TimelineMenuItem } from "./TimelineMenuModel"
import type { ShapeOption } from "./TimelineTypes"
import type { useShapePickerCatalog } from "./useShapePickerCatalog"

export function TimelineShapeClips({
  duration,
  sortedShapes,
  shapes,
  selectedShapeId,
  openShapePicker,
  shapePicker,
  clipBounds,
  shapeLabel,
  shapeDraggedRef,
  onSelectShape,
  onOpenShapePicker,
  onShapeIconChange,
  onUploadShape,
  onRemoveShape,
  onShapeDrag,
  onOpenContextMenu,
  createGoToMenuItem,
  onAddShape,
}: {
  duration: number
  sortedShapes: ShapeStop[]
  shapes: ShapeStop[]
  selectedShapeId: string | null
  openShapePicker: string | null
  shapePicker: ReturnType<typeof useShapePickerCatalog>
  clipBounds: ShapeClipBounds[]
  shapeLabel: (stop: ShapeStop) => string
  shapeDraggedRef: React.MutableRefObject<boolean>
  onSelectShape: (id: string) => void
  onOpenShapePicker: (id: string | null) => void
  onShapeIconChange: (id: string, option: ShapeOption) => void
  onUploadShape: (id: string) => void
  onRemoveShape: (id: string) => void
  onShapeDrag: (event: React.PointerEvent<HTMLElement>, shapeId: string) => void
  onOpenContextMenu: (
    event: React.MouseEvent,
    title: string,
    items: TimelineMenuItem[]
  ) => void
  createGoToMenuItem: (
    event: React.MouseEvent,
    time: number,
    onBeforeOpen?: () => void
  ) => TimelineMenuItem
  onAddShape: () => void
}) {
  return (
    <>
      {sortedShapes.map((stop, index) => {
        const bounds = clipBounds[index]
        return (
          <TimelineShapeClip
            key={stop.id}
            duration={duration}
            stop={stop}
            index={index}
            shapeCount={shapes.length}
            sortedShapeCount={sortedShapes.length}
            selectedShapeId={selectedShapeId}
            openShapePicker={openShapePicker}
            shapePicker={shapePicker}
            bounds={bounds}
            shapeDraggedRef={shapeDraggedRef}
            shapeLabel={shapeLabel}
            onSelectShape={onSelectShape}
            onOpenShapePicker={onOpenShapePicker}
            onShapeIconChange={onShapeIconChange}
            onUploadShape={onUploadShape}
            onRemoveShape={onRemoveShape}
            onShapeDrag={onShapeDrag}
            onOpenContextMenu={onOpenContextMenu}
            createGoToMenuItem={createGoToMenuItem}
            onAddShape={onAddShape}
          />
        )
      })}
    </>
  )
}
