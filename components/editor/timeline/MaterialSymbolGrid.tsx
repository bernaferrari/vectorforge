import type { ShapeStop } from "../TimelineModel"
import type { MaterialSymbolStatus } from "./ShapePickerSymbolModel"

export function MaterialSymbolGrid({
  stop,
  filteredMaterialSymbols,
  normalizedShapeQuery,
  materialSymbolClass,
  symbolStyle,
  materialSymbolStatus,
  onChooseMaterialSymbol,
  onImportMaterialSymbol,
}: {
  stop: ShapeStop
  filteredMaterialSymbols: string[]
  normalizedShapeQuery: string
  materialSymbolClass: string
  symbolStyle: React.CSSProperties
  materialSymbolStatus: MaterialSymbolStatus
  onChooseMaterialSymbol: (shapeId: string, symbolName: string) => void
  onImportMaterialSymbol: (shapeId: string) => void
}) {
  return (
    <div className="mb-3 grid max-h-[250px] grid-cols-10 gap-1.5 overflow-y-auto pr-1">
      {filteredMaterialSymbols.map((symbolName) => (
        <button
          key={`material-symbol-${stop.id}-${symbolName}`}
          type="button"
          title={symbolName.replace(/_/g, " ")}
          onClick={() => onChooseMaterialSymbol(stop.id, symbolName)}
          className="grid aspect-square place-items-center rounded-lg border border-transparent text-foreground transition-colors hover:border-border hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
        >
          <span
            className={`${materialSymbolClass} text-[24px] leading-none`}
            style={symbolStyle}
          >
            {symbolName}
          </span>
        </button>
      ))}
      {filteredMaterialSymbols.length === 0 && normalizedShapeQuery && (
        <button
          type="button"
          onClick={() => onImportMaterialSymbol(stop.id)}
          disabled={materialSymbolStatus.state === "loading"}
          className="col-span-10 flex h-10 items-center justify-between rounded-lg border border-dashed border-border bg-muted/40 px-3 text-left text-[11px] text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
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
