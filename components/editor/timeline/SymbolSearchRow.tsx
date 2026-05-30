import { ArrowRight } from "lucide-react"
import {
  type MaterialSymbolFontSettings,
  type MaterialSymbolStyle,
} from "../IconLibrary"
import type { ShapeStop } from "../TimelineModel"
import {
  type MaterialSymbolSettingChange,
  type MaterialSymbolStatus,
} from "./ShapePickerSymbolModel"
import { SymbolOptionsPopover } from "./SymbolOptionsPopover"

export function SymbolSearchRow({
  stop,
  materialSymbolClass,
  symbolStyle,
  materialSymbolStyle,
  materialSymbolSettings,
  materialSymbolOptionsOpen,
  materialSymbolStatus,
  normalizedShapeQuery,
  shapeSearchQuery,
  onMaterialSymbolOptionsOpenChange,
  onMaterialSymbolStyleChange,
  onMaterialSymbolSettingChange,
  onMaterialSymbolStatusChange,
  onShapeSearchQueryChange,
  onImportMaterialSymbol,
}: {
  stop: ShapeStop
  materialSymbolClass: string
  symbolStyle: React.CSSProperties
  materialSymbolStyle: MaterialSymbolStyle
  materialSymbolSettings: MaterialSymbolFontSettings
  materialSymbolOptionsOpen: boolean
  materialSymbolStatus: MaterialSymbolStatus
  normalizedShapeQuery: string
  shapeSearchQuery: string
  onMaterialSymbolOptionsOpenChange: (open: boolean) => void
  onMaterialSymbolStyleChange: (style: MaterialSymbolStyle) => void
  onMaterialSymbolSettingChange: MaterialSymbolSettingChange
  onMaterialSymbolStatusChange: (status: MaterialSymbolStatus) => void
  onShapeSearchQueryChange: (value: string) => void
  onImportMaterialSymbol: (shapeId: string) => void
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <SymbolOptionsPopover
        materialSymbolClass={materialSymbolClass}
        symbolStyle={symbolStyle}
        materialSymbolStyle={materialSymbolStyle}
        materialSymbolSettings={materialSymbolSettings}
        materialSymbolOptionsOpen={materialSymbolOptionsOpen}
        onMaterialSymbolOptionsOpenChange={onMaterialSymbolOptionsOpenChange}
        onMaterialSymbolStyleChange={onMaterialSymbolStyleChange}
        onMaterialSymbolSettingChange={onMaterialSymbolSettingChange}
      />
      <input
        value={shapeSearchQuery}
        onChange={(event) => {
          onShapeSearchQueryChange(event.currentTarget.value)
          if (materialSymbolStatus.state === "error")
            onMaterialSymbolStatusChange({ state: "idle" })
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            onImportMaterialSymbol(stop.id)
          }
        }}
        placeholder="Search symbols"
        className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-muted/50 px-3 text-[12px] text-foreground outline-none placeholder:text-muted-foreground focus:border-ring/50"
      />
      <button
        type="button"
        aria-label="Use typed symbol"
        title="Use typed symbol"
        disabled={
          !normalizedShapeQuery || materialSymbolStatus.state === "loading"
        }
        onClick={() => onImportMaterialSymbol(stop.id)}
        className="grid size-9 shrink-0 place-items-center rounded-lg bg-foreground text-background transition-colors hover:bg-foreground/85 disabled:cursor-not-allowed disabled:bg-accent disabled:text-muted-foreground"
      >
        {materialSymbolStatus.state === "loading" ? (
          <span className="size-3 animate-pulse rounded-full bg-current" />
        ) : (
          <ArrowRight className="size-4" />
        )}
      </button>
    </div>
  )
}
