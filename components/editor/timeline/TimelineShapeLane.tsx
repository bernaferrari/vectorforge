"use client"

import React from "react"
import type { EasingType, ShapeStop } from "../TimelineModel"
import type { ShapeClipBounds, MorphWindow } from "./TimelineLayoutModel"
import type { TimelineMenuItem } from "./TimelineMenuModel"
import { TimelineMorphWindows } from "./TimelineMorphWindows"
import { TimelineShapeClips } from "./TimelineShapeClips"
import type { ShapeOption, WipeDirectionOption } from "./TimelineTypes"
import type { useShapePickerCatalog } from "./useShapePickerCatalog"

type TimelineShapeLaneProps = {
  duration: number
  shapes: ShapeStop[]
  sortedShapes: ShapeStop[]
  selectedShapeId: string | null
  openShapePicker: string | null
  openClipEditor: string | null
  wipeDirections: WipeDirectionOption[]
  morphWindows: MorphWindow[]
  clipBounds: ShapeClipBounds[]
  shapePicker: ReturnType<typeof useShapePickerCatalog>
  shapeDraggedRef: React.MutableRefObject<boolean>
  shapeLabel: (stop: ShapeStop) => string
  timeFromClientX: (
    clientX: number,
    options?: { bypass?: boolean; clampToViewport?: boolean }
  ) => number
  onClearSelectedKeyframe: () => void
  onScrubStart?: () => void
  onTimeChange: (time: number) => void
  onOpenClipEditorChange: (shapeId: string | null) => void
  onShapeBlendChange: (
    id: string,
    patch: Partial<Pick<ShapeStop, "transitionType" | "wipeDirection">>
  ) => void
  onShapeEasingChange: (id: string, easing: EasingType) => void
  onMorphEdgeDrag: (
    event: React.PointerEvent<HTMLElement>,
    shapeId: string,
    edge: "start" | "end",
    fromTime: number,
    toTime: number
  ) => void
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
}

export function TimelineShapeLane({
  duration,
  shapes,
  sortedShapes,
  selectedShapeId,
  openShapePicker,
  openClipEditor,
  wipeDirections,
  morphWindows,
  clipBounds,
  shapePicker,
  shapeDraggedRef,
  shapeLabel,
  timeFromClientX,
  onClearSelectedKeyframe,
  onScrubStart,
  onTimeChange,
  onOpenClipEditorChange,
  onShapeBlendChange,
  onShapeEasingChange,
  onMorphEdgeDrag,
  onSelectShape,
  onOpenShapePicker,
  onShapeIconChange,
  onUploadShape,
  onRemoveShape,
  onShapeDrag,
  onOpenContextMenu,
  createGoToMenuItem,
  onAddShape,
}: TimelineShapeLaneProps) {
  return (
    <div
      className={`relative h-9 border-b border-border transition-colors ${
        selectedShapeId ? "bg-muted/45" : "hover:bg-muted/35"
      }`}
      onMouseDown={(event) => {
        if (event.button !== 0) return
        onClearSelectedKeyframe()
        onScrubStart?.()
        onTimeChange(timeFromClientX(event.clientX))
      }}
      onContextMenu={(event) => {
        const time = timeFromClientX(event.clientX, {
          bypass: event.altKey,
        })
        onOpenContextMenu(event, "Shape", [createGoToMenuItem(event, time)])
      }}
    >
      <TimelineMorphWindows
        duration={duration}
        morphWindows={morphWindows}
        openClipEditor={openClipEditor}
        wipeDirections={wipeDirections}
        onOpenClipEditorChange={onOpenClipEditorChange}
        onShapeBlendChange={onShapeBlendChange}
        onShapeEasingChange={onShapeEasingChange}
        onMorphEdgeDrag={onMorphEdgeDrag}
        onOpenContextMenu={onOpenContextMenu}
        createGoToMenuItem={createGoToMenuItem}
        shapeLabel={shapeLabel}
        timeFromClientX={timeFromClientX}
      />
      <TimelineShapeClips
        duration={duration}
        sortedShapes={sortedShapes}
        shapes={shapes}
        selectedShapeId={selectedShapeId}
        openShapePicker={openShapePicker}
        shapePicker={shapePicker}
        clipBounds={clipBounds}
        shapeLabel={shapeLabel}
        shapeDraggedRef={shapeDraggedRef}
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
    </div>
  )
}
