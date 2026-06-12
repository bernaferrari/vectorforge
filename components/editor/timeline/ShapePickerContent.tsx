import { Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  open,
  onOpenChange,
  stop,
  shapeCount,
  visibleShapeOptions,
  favoriteMaterialSymbols,
  recentMaterialSymbols,
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
  onToggleMaterialSymbolFavorite,
  onImportMaterialSymbol,
  onChooseMaterialSymbol,
  onChooseWipePair,
  onShapeIconChange,
  onOpenShapePicker,
  onUploadShape,
  onRemoveShape,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  stop: ShapeStop
  shapeCount: number
  visibleShapeOptions: ShapeOption[]
  favoriteMaterialSymbols: string[]
  recentMaterialSymbols: string[]
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
  onToggleMaterialSymbolFavorite: (symbolName: string) => void
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!flex !w-[min(720px,calc(100vw-32px))] !max-w-[min(720px,calc(100vw-32px))] max-h-[min(78vh,620px)] flex-col gap-0 overflow-hidden p-0 shadow-2xl"
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.stopPropagation()}
      >
        <DialogHeader className="shrink-0 border-b border-border px-3 py-2.5 pr-10">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-muted/50 text-foreground [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:fill-current [&_svg]:stroke-current"
              style={{ color: stop.color }}
              dangerouslySetInnerHTML={{ __html: stop.svgContent }}
            />
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-sm font-semibold text-foreground">
                Shape
              </DialogTitle>
              <DialogDescription className="sr-only">
                Choose the symbol, wipe pair, or preset for this timeline shape.
              </DialogDescription>
              <div className="mt-1 truncate text-[11px] text-muted-foreground">
                {stop.iconName ?? stop.iconId}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => {
                  onUploadShape(stop.id)
                  onOpenShapePicker(null)
                }}
              >
                <Upload className="size-3.5" />
                <span className="hidden sm:inline">Upload SVG</span>
              </Button>
              {shapeCount > 1 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  aria-label="Remove shape"
                  title="Remove shape"
                  onClick={() => {
                    onRemoveShape(stop.id)
                    onOpenShapePicker(null)
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background p-3">
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

          <Tabs defaultValue="symbols" className="min-h-0 flex-1 gap-2">
            <TabsList className="grid h-8 w-full grid-cols-4">
              <TabsTrigger value="symbols">Symbols</TabsTrigger>
              <TabsTrigger value="wipe">Wipe pairs</TabsTrigger>
              <TabsTrigger value="presets">Presets</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
            </TabsList>

            <TabsContent
              value="symbols"
              className="min-h-0 overflow-hidden outline-none"
            >
              {favoriteMaterialSymbols.length > 0 && (
                <section className="mb-3">
                  <div className="mb-1.5 px-0.5 text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                    Favorites
                  </div>
                  <MaterialSymbolGrid
                    stop={stop}
                    filteredMaterialSymbols={favoriteMaterialSymbols}
                    normalizedShapeQuery={normalizedShapeQuery}
                    materialSymbolClass={materialSymbolClass}
                    symbolStyle={symbolStyle}
                    materialSymbolStatus={materialSymbolStatus}
                    favoriteMaterialSymbols={favoriteMaterialSymbols}
                    className="mb-0 max-h-24"
                    onChooseMaterialSymbol={onChooseMaterialSymbol}
                    onImportMaterialSymbol={onImportMaterialSymbol}
                    onToggleMaterialSymbolFavorite={
                      onToggleMaterialSymbolFavorite
                    }
                  />
                </section>
              )}

              {recentMaterialSymbols.length > 0 && (
                <section className="mb-3">
                  <div className="mb-1.5 px-0.5 text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                    Recent
                  </div>
                  <MaterialSymbolGrid
                    stop={stop}
                    filteredMaterialSymbols={recentMaterialSymbols}
                    normalizedShapeQuery={normalizedShapeQuery}
                    materialSymbolClass={materialSymbolClass}
                    symbolStyle={symbolStyle}
                    materialSymbolStatus={materialSymbolStatus}
                    favoriteMaterialSymbols={favoriteMaterialSymbols}
                    className="mb-0 max-h-24"
                    onChooseMaterialSymbol={onChooseMaterialSymbol}
                    onImportMaterialSymbol={onImportMaterialSymbol}
                    onToggleMaterialSymbolFavorite={
                      onToggleMaterialSymbolFavorite
                    }
                  />
                </section>
              )}

              <MaterialSymbolGrid
                stop={stop}
                filteredMaterialSymbols={filteredMaterialSymbols}
                normalizedShapeQuery={normalizedShapeQuery}
                materialSymbolClass={materialSymbolClass}
                symbolStyle={symbolStyle}
                materialSymbolStatus={materialSymbolStatus}
                favoriteMaterialSymbols={favoriteMaterialSymbols}
                className="mb-0 max-h-[min(36vh,300px)]"
                onChooseMaterialSymbol={onChooseMaterialSymbol}
                onImportMaterialSymbol={onImportMaterialSymbol}
                onToggleMaterialSymbolFavorite={onToggleMaterialSymbolFavorite}
              />

              {materialSymbolStatus.state === "error" && (
                <p className="mt-2 px-0.5 text-[11px] text-red-300">
                  {materialSymbolStatus.message}
                </p>
              )}
            </TabsContent>

            <TabsContent
              value="wipe"
              className="min-h-0 overflow-hidden outline-none"
            >
              {filteredWipePairs.length > 0 ? (
                <WipePairsSection
                  stop={stop}
                  filteredWipePairs={filteredWipePairs}
                  materialSymbolClass={materialSymbolClass}
                  symbolStyle={symbolStyle}
                  className="mb-0 border-t-0 pt-0"
                  onChooseWipePair={onChooseWipePair}
                />
              ) : (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-[12px] text-muted-foreground">
                  No wipe pairs match
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="presets"
              className="min-h-0 overflow-hidden outline-none"
            >
              {visibleShapeOptions.length > 0 ? (
                <ShapePresetGrid
                  stop={stop}
                  visibleShapeOptions={visibleShapeOptions}
                  className="max-h-[min(36vh,300px)]"
                  onShapeIconChange={onShapeIconChange}
                  onOpenShapePicker={onOpenShapePicker}
                />
              ) : (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-[12px] text-muted-foreground">
                  No presets match
                </div>
              )}
            </TabsContent>

            <TabsContent value="upload" className="min-h-0 outline-none">
              <div className="grid min-h-40 place-items-center rounded-lg border border-dashed border-border bg-muted/25 p-6">
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    onUploadShape(stop.id)
                    onOpenShapePicker(null)
                  }}
                >
                  <Upload className="size-4" />
                  Upload SVG
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
