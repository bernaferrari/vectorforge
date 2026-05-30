import { Trash2 } from "lucide-react"
import { PopoverContent } from "@/components/ui/popover"
import {
  type MaterialSymbolFontSettings,
  type MaterialSymbolStyle,
} from "../IconLibrary"
import type { MaterialWipeIconPair } from "../MaterialWipePairs"
import type { ShapeStop } from "../TimelineModel"
import { MaterialSymbolGrid } from "./MaterialSymbolGrid"
import { ShapePresetGrid } from "./ShapePresetGrid"
import {
  type MaterialSymbolStatus,
  shapePickerSymbolStyle,
} from "./ShapePickerSymbolModel"
import { SymbolSearchRow } from "./SymbolSearchRow"
import type { ShapeOption } from "./TimelineTypes"
import { WipePairsSection } from "./WipePairsSection"

export function ShapePickerContent({
  stop,
  shapeCount,
  visibleShapeOptions,
  filteredMaterialSymbols,
  filteredWipePairs,
  normalizedShapeQuery,
  shapeSearchQuery,
  onShapeSearchQueryChange,
  materialSymbolStyle,
  onMaterialSymbolStyleChange,
  materialSymbolSettings,
  onMaterialSymbolSettingChange,
  materialSymbolOptionsOpen,
  onMaterialSymbolOptionsOpenChange,
  materialSymbolStatus,
  onMaterialSymbolStatusChange,
  wipePairMode,
  onWipePairModeChange,
  onImportMaterialSymbol,
  onChooseMaterialSymbol,
  onChooseWipePair,
  onShapeIconChange,
  onOpenShapePicker,
  onUploadShape,
  onRemoveShape,
}: {
  stop: ShapeStop
  shapeCount: number
  visibleShapeOptions: ShapeOption[]
  filteredMaterialSymbols: string[]
  filteredWipePairs: MaterialWipeIconPair[]
  normalizedShapeQuery: string
  shapeSearchQuery: string
  onShapeSearchQueryChange: (value: string) => void
  materialSymbolStyle: MaterialSymbolStyle
  onMaterialSymbolStyleChange: (style: MaterialSymbolStyle) => void
  materialSymbolSettings: MaterialSymbolFontSettings
  onMaterialSymbolSettingChange: <K extends keyof MaterialSymbolFontSettings>(
    key: K,
    value: MaterialSymbolFontSettings[K]
  ) => void
  materialSymbolOptionsOpen: boolean
  onMaterialSymbolOptionsOpenChange: (open: boolean) => void
  materialSymbolStatus: MaterialSymbolStatus
  onMaterialSymbolStatusChange: (status: MaterialSymbolStatus) => void
  wipePairMode: "slash" | "morph"
  onWipePairModeChange: (mode: "slash" | "morph") => void
  onImportMaterialSymbol: (shapeId: string) => void
  onChooseMaterialSymbol: (shapeId: string, symbolName: string) => void
  onChooseWipePair: (shapeId: string, pair: MaterialWipeIconPair) => void
  onShapeIconChange: (id: string, option: ShapeOption) => void
  onOpenShapePicker: (id: string | null) => void
  onUploadShape: (id: string) => void
  onRemoveShape: (id: string) => void
}) {
  const materialSymbolClass = `material-symbols-${materialSymbolStyle}`
  const symbolStyle = shapePickerSymbolStyle(materialSymbolSettings)

  return (
    <PopoverContent
      align="center"
      side="top"
      sideOffset={10}
      className="w-[520px] border-border bg-popover p-3 text-foreground shadow-2xl"
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[12px] font-medium text-foreground">Shape</div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              onUploadShape(stop.id)
              onOpenShapePicker(null)
            }}
            className="h-7 rounded-md px-2 text-[10px] text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          >
            Upload SVG
          </button>
          {shapeCount > 1 && (
            <button
              type="button"
              aria-label="Remove shape"
              title="Remove shape"
              onClick={() => {
                onRemoveShape(stop.id)
                onOpenShapePicker(null)
              }}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <SymbolSearchRow
        stop={stop}
        materialSymbolClass={materialSymbolClass}
        symbolStyle={symbolStyle}
        materialSymbolStyle={materialSymbolStyle}
        materialSymbolSettings={materialSymbolSettings}
        materialSymbolOptionsOpen={materialSymbolOptionsOpen}
        materialSymbolStatus={materialSymbolStatus}
        normalizedShapeQuery={normalizedShapeQuery}
        shapeSearchQuery={shapeSearchQuery}
        onMaterialSymbolOptionsOpenChange={onMaterialSymbolOptionsOpenChange}
        onMaterialSymbolStyleChange={onMaterialSymbolStyleChange}
        onMaterialSymbolSettingChange={onMaterialSymbolSettingChange}
        onMaterialSymbolStatusChange={onMaterialSymbolStatusChange}
        onShapeSearchQueryChange={onShapeSearchQueryChange}
        onImportMaterialSymbol={onImportMaterialSymbol}
      />

      <MaterialSymbolGrid
        stop={stop}
        filteredMaterialSymbols={filteredMaterialSymbols}
        normalizedShapeQuery={normalizedShapeQuery}
        materialSymbolClass={materialSymbolClass}
        symbolStyle={symbolStyle}
        materialSymbolStatus={materialSymbolStatus}
        onChooseMaterialSymbol={onChooseMaterialSymbol}
        onImportMaterialSymbol={onImportMaterialSymbol}
      />

      {materialSymbolStatus.state === "error" && (
        <p className="mb-2 px-0.5 text-[10px] text-red-300">
          {materialSymbolStatus.message}
        </p>
      )}

      <WipePairsSection
        stop={stop}
        filteredWipePairs={filteredWipePairs}
        materialSymbolClass={materialSymbolClass}
        symbolStyle={symbolStyle}
        wipePairMode={wipePairMode}
        onChooseWipePair={onChooseWipePair}
        onWipePairModeChange={onWipePairModeChange}
      />

      <ShapePresetGrid
        stop={stop}
        visibleShapeOptions={visibleShapeOptions}
        onShapeIconChange={onShapeIconChange}
        onOpenShapePicker={onOpenShapePicker}
      />
    </PopoverContent>
  )
}
