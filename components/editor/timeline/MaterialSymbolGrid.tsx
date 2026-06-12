"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { ShapeStop } from "../TimelineModel"
import { cn } from "@/lib/utils"
import { Star } from "lucide-react"
import type { MaterialSymbolStatus } from "./ShapePickerSymbolModel"

const DEFAULT_COLUMN_COUNT = 12
const DEFAULT_ROW_HEIGHT = 50
const GRID_OVERSCAN_ROWS = 3

export function MaterialSymbolGrid({
  stop,
  filteredMaterialSymbols,
  normalizedShapeQuery,
  materialSymbolClass,
  symbolStyle,
  materialSymbolStatus,
  className,
  favoriteMaterialSymbols = [],
  onToggleMaterialSymbolFavorite,
  onChooseMaterialSymbol,
  onImportMaterialSymbol,
}: {
  stop: ShapeStop
  filteredMaterialSymbols: string[]
  normalizedShapeQuery: string
  materialSymbolClass: string
  symbolStyle: React.CSSProperties
  materialSymbolStatus: MaterialSymbolStatus
  className?: string
  favoriteMaterialSymbols?: string[]
  onToggleMaterialSymbolFavorite?: (symbolName: string) => void
  onChooseMaterialSymbol: (shapeId: string, symbolName: string) => void
  onImportMaterialSymbol: (shapeId: string) => void
}) {
  const favorites = useMemo(
    () => new Set(favoriteMaterialSymbols),
    [favoriteMaterialSymbols]
  )
  const gridRef = useRef<HTMLDivElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [gridMetrics, setGridMetrics] = useState({
    columns: DEFAULT_COLUMN_COUNT,
    rowHeight: DEFAULT_ROW_HEIGHT,
    rowGap: 6,
    viewportHeight: 250,
  })
  const listKey = `${filteredMaterialSymbols.length}:${filteredMaterialSymbols[0] ?? ""}:${filteredMaterialSymbols.at(-1) ?? ""}`

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return

    const measure = () => {
      const styles = window.getComputedStyle(grid)
      const columns = styles.gridTemplateColumns
        .split(" ")
        .filter(Boolean).length
      const rowGap = Number.parseFloat(styles.rowGap) || 0
      const firstTile = grid.querySelector<HTMLElement>("[data-symbol-tile]")
      const itemHeight = firstTile?.getBoundingClientRect().height
      setGridMetrics({
        columns: Math.max(1, columns || DEFAULT_COLUMN_COUNT),
        rowHeight: Math.max(1, (itemHeight || DEFAULT_ROW_HEIGHT) + rowGap),
        rowGap,
        viewportHeight: grid.clientHeight || 250,
      })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(grid)
    return () => observer.disconnect()
  }, [listKey])

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    grid.scrollTop = 0
    setScrollTop(0)
  }, [normalizedShapeQuery, listKey])

  const totalRows = Math.ceil(
    filteredMaterialSymbols.length / gridMetrics.columns
  )
  const visibleStartRow = Math.max(
    0,
    Math.floor(scrollTop / gridMetrics.rowHeight) - GRID_OVERSCAN_ROWS
  )
  const visibleEndRow = Math.min(
    totalRows,
    Math.ceil(
      (scrollTop + gridMetrics.viewportHeight) / gridMetrics.rowHeight
    ) + GRID_OVERSCAN_ROWS
  )
  const visibleSymbols = filteredMaterialSymbols.slice(
    visibleStartRow * gridMetrics.columns,
    Math.min(filteredMaterialSymbols.length, visibleEndRow * gridMetrics.columns)
  )
  const topSpacerHeight = Math.max(
    0,
    visibleStartRow * gridMetrics.rowHeight - gridMetrics.rowGap
  )
  const bottomSpacerHeight = Math.max(
    0,
    (totalRows - visibleEndRow) * gridMetrics.rowHeight - gridMetrics.rowGap
  )

  return (
    <div
      ref={gridRef}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      className={cn(
        "mb-3 grid max-h-[250px] grid-cols-[repeat(auto-fill,minmax(44px,44px))] justify-between gap-2 overflow-y-auto pr-1",
        className
      )}
    >
      {topSpacerHeight > 0 && (
        <div
          aria-hidden="true"
          className="col-span-full"
          style={{ height: topSpacerHeight }}
        />
      )}
      {visibleSymbols.map((symbolName) => (
        <div
          key={`material-symbol-${stop.id}-${symbolName}`}
          data-symbol-tile
          className="group/symbol relative aspect-square"
        >
          <button
            type="button"
            title={symbolName.replace(/_/g, " ")}
            onClick={() => onChooseMaterialSymbol(stop.id, symbolName)}
            className="grid size-full place-items-center rounded-lg border border-transparent text-foreground transition-colors hover:border-border hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            <span
              className={`${materialSymbolClass} text-[22px] leading-none`}
              style={symbolStyle}
            >
              {symbolName}
            </span>
          </button>
          {onToggleMaterialSymbolFavorite && (
            <button
              type="button"
              aria-label={
                favorites.has(symbolName)
                  ? `Remove ${symbolName.replace(/_/g, " ")} from favorites`
                  : `Add ${symbolName.replace(/_/g, " ")} to favorites`
              }
              title={favorites.has(symbolName) ? "Unfavorite" : "Favorite"}
              onClick={(event) => {
                event.stopPropagation()
                onToggleMaterialSymbolFavorite(symbolName)
              }}
              className={`absolute top-1 right-1 grid size-5 place-items-center rounded-md border text-[10px] opacity-0 transition-[background-color,border-color,color,opacity] group-hover/symbol:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none ${
                favorites.has(symbolName)
                  ? "border-primary/40 bg-primary/15 text-primary opacity-100"
                  : "border-border bg-background/90 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Star
                className="size-3"
                fill={favorites.has(symbolName) ? "currentColor" : "none"}
              />
            </button>
          )}
        </div>
      ))}
      {bottomSpacerHeight > 0 && (
        <div
          aria-hidden="true"
          className="col-span-full"
          style={{ height: bottomSpacerHeight }}
        />
      )}
      {filteredMaterialSymbols.length === 0 && normalizedShapeQuery && (
        <button
          type="button"
          onClick={() => onImportMaterialSymbol(stop.id)}
          disabled={materialSymbolStatus.state === "loading"}
          className="col-span-full flex h-10 items-center justify-between rounded-lg border border-dashed border-border bg-muted/40 px-3 text-left text-[11px] text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="truncate">
            {normalizedShapeQuery.replace(/_/g, " ")}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Use typed name
          </span>
        </button>
      )}
    </div>
  )
}
