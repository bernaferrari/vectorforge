import { ArrowRight, Trash2 } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import {
  materialSymbolFontStyle,
  type MaterialSymbolFontSettings,
  type MaterialSymbolStyle,
} from "../IconLibrary"
import type { MaterialWipeIconPair } from "../MaterialWipePairs"
import type { ShapeStop } from "../TimelineModel"
import { WipePairPreview } from "./WipePairPreview"
import type { ShapeOption } from "./TimelineTypes"

type MaterialSymbolStatus = {
  state: "idle" | "loading" | "error"
  message?: string
}

const SYMBOL_SETTING_CONTROLS = [
  { key: "weight" as const, label: "W", min: 100, max: 700, step: 100 },
  { key: "grade" as const, label: "G", min: -50, max: 200, step: 25 },
  { key: "opticalSize" as const, label: "O", min: 20, max: 48, step: 1 },
]

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
  const symbolStyle = materialSymbolFontStyle(materialSymbolSettings)

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

      <div className="mb-3 flex items-center gap-2">
        <Popover
          open={materialSymbolOptionsOpen}
          onOpenChange={onMaterialSymbolOptionsOpenChange}
        >
          <PopoverTrigger
            aria-label="Symbol options"
            title="Symbol options"
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-muted/50 text-muted-foreground transition-colors hover:border-border hover:bg-muted/75 hover:text-foreground focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none"
          >
            <span
              className={`${materialSymbolClass} text-[21px] leading-none`}
              style={symbolStyle}
            >
              tune
            </span>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side="left"
            sideOffset={8}
            className="w-64 border-border bg-popover p-2.5 text-foreground shadow-2xl"
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.stopPropagation()}
          >
            <div className="mb-2 text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Symbol options
            </div>
            <div className="mb-2 grid grid-cols-3 rounded-lg bg-muted/50 p-0.5">
              {(["outlined", "rounded", "sharp"] as const).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => onMaterialSymbolStyleChange(style)}
                  className={`h-7 rounded-md text-[10px] capitalize transition-colors ${
                    materialSymbolStyle === style
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                title="Toggle filled symbol preview"
                onClick={() =>
                  onMaterialSymbolSettingChange(
                    "fill",
                    materialSymbolSettings.fill ? 0 : 1
                  )
                }
                className={`h-8 rounded-lg px-2 text-[10px] font-medium transition-colors ${
                  materialSymbolSettings.fill
                    ? "bg-foreground text-background"
                    : "bg-muted/50 text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                Fill
              </button>
              {SYMBOL_SETTING_CONTROLS.map((control) => (
                <label
                  key={control.key}
                  className="flex h-8 items-center rounded-lg bg-muted/50 ring-1 ring-white/[0.07]"
                >
                  <span className="px-2 text-[9px] font-medium text-muted-foreground">
                    {control.label}
                  </span>
                  <input
                    type="number"
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    value={materialSymbolSettings[control.key]}
                    onChange={(event) => {
                      const next = Math.max(
                        control.min,
                        Math.min(
                          control.max,
                          Number(event.currentTarget.value) || control.min
                        )
                      )
                      onMaterialSymbolSettingChange(control.key, next)
                    }}
                    className="min-w-0 flex-1 bg-transparent pr-2 text-right font-mono text-[10px] text-foreground outline-none"
                  />
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
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

      {materialSymbolStatus.state === "error" && (
        <p className="mb-2 px-0.5 text-[10px] text-red-300">
          {materialSymbolStatus.message}
        </p>
      )}

      {filteredWipePairs.length > 0 && (
        <div className="mb-3 border-t border-border pt-2">
          <div className="mb-2 flex items-center justify-between px-0.5">
            <span className="text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Wipe pairs
            </span>
            <label
              className="flex cursor-pointer items-center gap-1.5 text-[10px] text-muted-foreground"
              title="Morph uses the real Material Symbol off glyph. Slash adds a clean overlay to the base glyph."
            >
              <span>{wipePairMode === "morph" ? "Morph" : "Slash"}</span>
              <Switch
                size="sm"
                checked={wipePairMode === "morph"}
                onCheckedChange={(checked) =>
                  onWipePairModeChange(checked ? "morph" : "slash")
                }
                onClick={(event) => event.stopPropagation()}
              />
            </label>
          </div>
          <div className="grid max-h-[132px] grid-cols-3 gap-1.5 overflow-y-auto pr-1">
            {filteredWipePairs.map((pair) => (
              <button
                key={`wipe-pair-${stop.id}-${pair.enabled}-${pair.disabled}`}
                type="button"
                title={`${pair.label}: ${pair.enabled} → ${wipePairMode === "morph" ? pair.disabled : `${pair.disabled} (slash overlay)`}`}
                onClick={() => onChooseWipePair(stop.id, pair)}
                className="wipe-pair-option group/pair flex h-11 min-w-0 items-center gap-2 rounded-lg border border-border bg-muted/35 px-2 text-left transition-colors hover:border-ring/45 hover:bg-muted/65 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                <WipePairPreview
                  pair={pair}
                  className={materialSymbolClass}
                  style={symbolStyle}
                  mode={wipePairMode === "morph" ? "real" : "slash"}
                />
                <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground">
                  {pair.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {visibleShapeOptions.length > 0 && (
        <details className="border-t border-border pt-2">
          <summary className="flex cursor-pointer list-none items-center justify-between px-0.5 text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase marker:hidden">
            <span>Presets</span>
            <span className="tracking-normal text-muted-foreground normal-case">
              fallback
            </span>
          </summary>
          <div className="mt-2 grid max-h-20 grid-cols-10 gap-1 overflow-y-auto pr-1">
            {visibleShapeOptions.map((option) => {
              const active = stop.iconId === option.id
              return (
                <button
                  key={`pick-${stop.id}-${option.id}`}
                  type="button"
                  title={option.name}
                  onClick={() => {
                    onShapeIconChange(stop.id, option)
                    onOpenShapePicker(null)
                  }}
                  className={`grid aspect-square place-items-center rounded-lg border focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none ${active ? "bg-accent" : "border-border bg-muted/40 text-muted-foreground hover:border-border hover:bg-muted/60"}`}
                  style={
                    active ? { borderColor: option.defaultTint } : undefined
                  }
                >
                  <div
                    className="size-4 [&_svg]:h-full [&_svg]:w-full [&_svg]:fill-current [&_svg]:stroke-current"
                    style={{ color: option.defaultTint }}
                    dangerouslySetInnerHTML={{ __html: option.svgContent }}
                  />
                </button>
              )
            })}
          </div>
        </details>
      )}
    </PopoverContent>
  )
}
