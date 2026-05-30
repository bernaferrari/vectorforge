import type { ShapeStop } from "../TimelineModel"
import type { ShapeOption } from "./TimelineTypes"

export function ShapePresetGrid({
  stop,
  visibleShapeOptions,
  onShapeIconChange,
  onOpenShapePicker,
}: {
  stop: ShapeStop
  visibleShapeOptions: ShapeOption[]
  onShapeIconChange: (id: string, option: ShapeOption) => void
  onOpenShapePicker: (id: string | null) => void
}) {
  if (visibleShapeOptions.length === 0) return null

  return (
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
              style={active ? { borderColor: option.defaultTint } : undefined}
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
  )
}
