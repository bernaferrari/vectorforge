"use client"

import React from "react"
import type { ShapeStop } from "../TimelineModel"
import { ShapePickerContent } from "./ShapePickerContent"
import { widthForSpan, xForFrac } from "./TimelineGeometry"
import type { ShapeClipBounds } from "./TimelineLayoutModel"
import type { TimelineMenuItem } from "./TimelineMenuModel"
import type { ShapeOption } from "./TimelineTypes"
import type { useShapePickerCatalog } from "./useShapePickerCatalog"

export type TimelineShapeClipProps = {
  duration: number
  stop: ShapeStop
  index: number
  shapeCount: number
  sortedShapeCount: number
  selectedShapeId: string | null
  openShapePicker: string | null
  shapePicker: ReturnType<typeof useShapePickerCatalog>
  bounds: ShapeClipBounds
  shapeDraggedRef: React.MutableRefObject<boolean>
  shapeLabel: (stop: ShapeStop) => string
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

export function TimelineShapeClip({
  duration,
  stop,
  index,
  shapeCount,
  sortedShapeCount,
  selectedShapeId,
  openShapePicker,
  shapePicker,
  bounds,
  shapeDraggedRef,
  shapeLabel,
  onSelectShape,
  onOpenShapePicker,
  onShapeIconChange,
  onUploadShape,
  onRemoveShape,
  onShapeDrag,
  onOpenContextMenu,
  createGoToMenuItem,
  onAddShape,
}: TimelineShapeClipProps) {
  const selected = stop.id === selectedShapeId
  const isOnly = bounds.isOnly
  const roundClass = isOnly
    ? "rounded-md"
    : `${index === 0 ? "rounded-l-md" : ""} ${
        index === sortedShapeCount - 1 ? "rounded-r-md" : ""
      }`

  return (
    <>
      <button
        type="button"
        title={
          isOnly
            ? `${shapeLabel(stop)} - click to edit · add another shape to animate`
            : `${shapeLabel(stop)} @ ${stop.time.toFixed(2)}s - drag to retime, click to edit`
        }
        onMouseDown={(event) => event.stopPropagation()}
        onClick={() => {
          if (shapeDraggedRef.current) {
            shapeDraggedRef.current = false
            return
          }
          onSelectShape(stop.id)
          onOpenShapePicker(stop.id)
        }}
        onContextMenu={(event) =>
          onOpenContextMenu(event, shapeLabel(stop), [
            createGoToMenuItem(event, stop.time, () => onSelectShape(stop.id)),
            { type: "separator" },
            {
              label: "Edit shape",
              onSelect: () => {
                onSelectShape(stop.id)
                onOpenShapePicker(stop.id)
              },
            },
            {
              label: "Upload SVG",
              onSelect: () => onUploadShape(stop.id),
            },
            { type: "separator" },
            {
              label: "Add shape at playhead",
              onSelect: onAddShape,
            },
            {
              label: "Remove shape",
              danger: true,
              disabled: shapeCount <= 1,
              onSelect: () => onRemoveShape(stop.id),
            },
          ])
        }
        onPointerDown={
          isOnly ? undefined : (event) => onShapeDrag(event, stop.id)
        }
        className={`group/clip absolute top-1/2 flex h-7 -translate-y-1/2 touch-none items-center gap-1.5 overflow-hidden border pr-2 pl-1 text-left transition-[background-color,border-color] hover:brightness-110 focus-visible:outline-none ${
          isOnly ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
        } ${roundClass}`}
        style={{
          left: xForFrac(bounds.left / duration),
          width: widthForSpan(
            Math.max(0, bounds.right - bounds.left) / duration
          ),
          minWidth: 32,
          backgroundColor: selected ? `${stop.color}24` : `${stop.color}10`,
          borderColor: selected ? `${stop.color}f2` : `${stop.color}30`,
          boxShadow: "none",
        }}
      >
        <span
          className="grid size-5 shrink-0 place-items-center rounded-[5px] [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:fill-current [&_svg]:stroke-current"
          style={{
            color: stop.color,
            backgroundColor: `${stop.color}26`,
          }}
          dangerouslySetInnerHTML={{ __html: stop.svgContent }}
        />
        <span className="min-w-0 truncate text-[10px] font-medium text-foreground">
          {shapeLabel(stop)}
        </span>
        {isOnly && (
          <span className="ml-auto shrink truncate pl-2 text-[10px] text-muted-foreground">
            add another shape to animate
          </span>
        )}
      </button>
      <ShapePickerContent
        open={openShapePicker === stop.id}
        onOpenChange={(open) => {
          if (!open) {
            onOpenShapePicker(null)
            return
          }
          onSelectShape(stop.id)
          onOpenShapePicker(stop.id)
        }}
        stop={stop}
        shapeCount={shapeCount}
        visibleShapeOptions={shapePicker.visibleShapeOptions}
        favoriteMaterialSymbols={shapePicker.favoriteMaterialSymbols}
        recentMaterialSymbols={shapePicker.recentMaterialSymbols}
        filteredMaterialSymbols={shapePicker.filteredMaterialSymbols}
        filteredWipePairs={shapePicker.filteredWipePairs}
        normalizedShapeQuery={shapePicker.normalizedShapeQuery}
        shapeSearchQuery={shapePicker.shapeSearchQuery}
        onShapeSearchQueryChange={shapePicker.setShapeSearchQuery}
        materialSymbolStyle={shapePicker.materialSymbolStyle}
        onMaterialSymbolStyleChange={shapePicker.setMaterialSymbolStyle}
        materialSymbolSettings={shapePicker.materialSymbolSettings}
        onMaterialSymbolSettingChange={shapePicker.updateMaterialSymbolSetting}
        materialSymbolOptionsOpen={shapePicker.materialSymbolOptionsOpen}
        onMaterialSymbolOptionsOpenChange={
          shapePicker.setMaterialSymbolOptionsOpen
        }
        materialSymbolStatus={shapePicker.materialSymbolStatus}
        onMaterialSymbolStatusChange={shapePicker.setMaterialSymbolStatus}
        onToggleMaterialSymbolFavorite={shapePicker.toggleMaterialSymbolFavorite}
        onImportMaterialSymbol={shapePicker.importMaterialSymbol}
        onChooseMaterialSymbol={shapePicker.chooseMaterialSymbol}
        onChooseWipePair={shapePicker.chooseWipePair}
        onShapeIconChange={onShapeIconChange}
        onOpenShapePicker={onOpenShapePicker}
        onUploadShape={onUploadShape}
        onRemoveShape={onRemoveShape}
      />
    </>
  )
}
