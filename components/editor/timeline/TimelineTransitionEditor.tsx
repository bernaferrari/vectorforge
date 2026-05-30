"use client"

import { ArrowRight, Blend, SquareSplitHorizontal } from "lucide-react"
import type { EasingType, ShapeStop } from "../TimelineModel"
import type { WipeDirectionOption } from "./TimelineTypes"
import { EasingPicker } from "./TimelineEasingControls"
import type { TransitionMode } from "./TimelineTransitionModel"

type TimelineTransitionEditorProps = {
  mode: TransitionMode
  stop: ShapeStop
  wipeDirections: WipeDirectionOption[]
  onShapeBlendChange: (
    id: string,
    patch: Partial<Pick<ShapeStop, "transitionType" | "wipeDirection">>
  ) => void
  onShapeEasingChange: (id: string, easing: EasingType) => void
}

const TRANSITION_MODES = [
  {
    id: "fade" as const,
    label: "Fade",
    icon: <Blend className="size-3.5" />,
  },
  {
    id: "wipe" as const,
    label: "Wipe",
    icon: <ArrowRight className="size-3.5" />,
  },
  {
    id: "none" as const,
    label: "None",
    icon: <SquareSplitHorizontal className="size-3.5" />,
  },
]

export function TimelineTransitionEditor({
  mode,
  stop,
  wipeDirections,
  onShapeBlendChange,
  onShapeEasingChange,
}: TimelineTransitionEditorProps) {
  const selectMode = (nextMode: TransitionMode) => {
    if (nextMode === "none") {
      onShapeBlendChange(stop.id, { transitionType: "none" })
      return
    }

    if (nextMode === "fade") {
      onShapeBlendChange(stop.id, {
        transitionType: "wipe",
        wipeDirection: { x: 0, y: 0 },
      })
      return
    }

    onShapeBlendChange(stop.id, {
      transitionType: "wipe",
      wipeDirection: mode === "fade" ? { x: 1, y: 0 } : stop.wipeDirection,
    })
  }

  return (
    <>
      <div className="flex items-center justify-between px-0.5 pb-2.5">
        <span className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Transition
        </span>
        {mode !== "none" && (
          <EasingPicker
            value={stop.easing}
            onChange={(easing) => onShapeEasingChange(stop.id, easing)}
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {TRANSITION_MODES.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => selectMode(option.id)}
            className={`flex flex-col items-center gap-1 rounded-lg border py-2 text-[10px] font-medium transition-colors ${
              mode === option.id
                ? "border-ring/60 bg-accent text-foreground"
                : "border-border bg-muted/45 text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>

      {mode === "wipe" && (
        <div className="mt-3 flex justify-center">
          <WipeDirectionPicker
            stop={stop}
            wipeDirections={wipeDirections}
            onShapeBlendChange={onShapeBlendChange}
          />
        </div>
      )}
    </>
  )
}

function WipeDirectionPicker({
  stop,
  wipeDirections,
  onShapeBlendChange,
}: {
  stop: ShapeStop
  wipeDirections: WipeDirectionOption[]
  onShapeBlendChange: TimelineTransitionEditorProps["onShapeBlendChange"]
}) {
  return (
    <div className="relative size-[104px] rounded-full">
      <span className="pointer-events-none absolute top-1/2 left-1/2 size-[76px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-muted/30" />
      {wipeDirections
        .filter((dir) => !(dir.x === 0 && dir.y === 0))
        .map((dir) => {
          const active =
            stop.wipeDirection.x === dir.x && stop.wipeDirection.y === dir.y
          const len = Math.hypot(dir.x, dir.y) || 1
          const left = `calc(50% + ${(dir.x / len) * 38}px)`
          const top = `calc(50% - ${(dir.y / len) * 38}px)`

          return (
            <button
              key={dir.label}
              type="button"
              title={dir.tooltip}
              onClick={() =>
                onShapeBlendChange(stop.id, {
                  wipeDirection: { x: dir.x, y: dir.y },
                })
              }
              className={`absolute z-10 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[11px] transition-colors ${
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-muted/50 text-muted-foreground hover:border-ring/50 hover:text-foreground"
              }`}
              style={{ left, top }}
            >
              {dir.label}
            </button>
          )
        })}
      <span className="pointer-events-none absolute top-1/2 left-1/2 size-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/50" />
    </div>
  )
}
