import type { MaterialWipeIconPair } from "../MaterialWipePairs"
import type { ShapeStop } from "../TimelineModel"
import { cn } from "@/lib/utils"
import { WipePairPreview } from "./WipePairPreview"

export function WipePairsSection({
  stop,
  filteredWipePairs,
  materialSymbolClass,
  symbolStyle,
  className,
  onChooseWipePair,
}: {
  stop: ShapeStop
  filteredWipePairs: MaterialWipeIconPair[]
  materialSymbolClass: string
  symbolStyle: React.CSSProperties
  className?: string
  onChooseWipePair: (shapeId: string, pair: MaterialWipeIconPair) => void
}) {
  if (filteredWipePairs.length === 0) return null

  return (
    <div className={cn("mb-3 border-t border-border pt-2", className)}>
      <div className="grid max-h-[min(36vh,300px)] grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
        {filteredWipePairs.map((pair) => (
          <button
            key={`wipe-pair-${stop.id}-${pair.enabled}-${pair.disabled}`}
            type="button"
            title={`${pair.label}: ${pair.enabled} -> ${pair.disabled}`}
            onClick={() => onChooseWipePair(stop.id, pair)}
            className="wipe-pair-option group/pair flex h-11 min-w-0 items-center gap-2 rounded-lg border border-border bg-muted/35 px-2 text-left transition-colors hover:border-ring/45 hover:bg-muted/65 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            <WipePairPreview
              pair={pair}
              className={materialSymbolClass}
              style={symbolStyle}
              mode={pair.disabled.endsWith("_off") ? "slash" : "real"}
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
