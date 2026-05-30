import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  type MaterialSymbolFontSettings,
  type MaterialSymbolStyle,
} from "../IconLibrary"
import type { MaterialSymbolSettingChange } from "./ShapePickerSymbolModel"

const SYMBOL_SETTING_CONTROLS = [
  { key: "weight" as const, label: "W", min: 100, max: 700, step: 100 },
  { key: "grade" as const, label: "G", min: -50, max: 200, step: 25 },
  { key: "opticalSize" as const, label: "O", min: 20, max: 48, step: 1 },
]

const stopPopoverPropagation = {
  onPointerDown: (event: React.PointerEvent) => event.stopPropagation(),
  onMouseDown: (event: React.MouseEvent) => event.stopPropagation(),
  onClick: (event: React.MouseEvent) => event.stopPropagation(),
  onContextMenu: (event: React.MouseEvent) => event.stopPropagation(),
}

export function SymbolOptionsPopover({
  materialSymbolClass,
  symbolStyle,
  materialSymbolStyle,
  materialSymbolSettings,
  materialSymbolOptionsOpen,
  onMaterialSymbolOptionsOpenChange,
  onMaterialSymbolStyleChange,
  onMaterialSymbolSettingChange,
}: {
  materialSymbolClass: string
  symbolStyle: React.CSSProperties
  materialSymbolStyle: MaterialSymbolStyle
  materialSymbolSettings: MaterialSymbolFontSettings
  materialSymbolOptionsOpen: boolean
  onMaterialSymbolOptionsOpenChange: (open: boolean) => void
  onMaterialSymbolStyleChange: (style: MaterialSymbolStyle) => void
  onMaterialSymbolSettingChange: MaterialSymbolSettingChange
}) {
  return (
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
        {...stopPopoverPropagation}
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
  )
}
