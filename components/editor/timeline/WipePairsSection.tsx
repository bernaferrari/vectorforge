import { Switch } from "@/components/ui/switch"
import type { MaterialWipeIconPair } from "../MaterialWipePairs"
import type { ShapeStop } from "../TimelineModel"
import { WipePairPreview } from "./WipePairPreview"

export function WipePairsSection({
  stop,
  filteredWipePairs,
  materialSymbolClass,
  symbolStyle,
  wipePairMode,
  onChooseWipePair,
  onWipePairModeChange,
}: {
  stop: ShapeStop
  filteredWipePairs: MaterialWipeIconPair[]
  materialSymbolClass: string
  symbolStyle: React.CSSProperties
  wipePairMode: "slash" | "morph"
  onChooseWipePair: (shapeId: string, pair: MaterialWipeIconPair) => void
  onWipePairModeChange: (mode: "slash" | "morph") => void
}) {
  if (filteredWipePairs.length === 0) return null

  return (
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
            title={`${pair.label}: ${pair.enabled} -> ${wipePairMode === "morph" ? pair.disabled : `${pair.disabled} (slash overlay)`}`}
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
  )
}
