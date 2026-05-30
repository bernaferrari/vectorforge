"use client"

import { useRef } from "react"
import type { PointerEvent, ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { CompactColorInput } from "@/components/ui/color-picker"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { bindWindowPointerDrag } from "@/lib/drag-events"
import { NumberField } from "./NumberField"

const LIGHT_RANGE = 9

const clampNumber = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

export function LightDirectionPicker({
  position,
  color,
  softness,
  onDirectionChange,
  onColorChange,
  onSoftnessChange,
  isKeyed,
  onToggleKeyframe,
  keyframeControls,
}: {
  position: { x: number; y: number; z: number }
  color: string
  softness: number
  onDirectionChange: (x: number, y: number) => void
  onColorChange: (color: string) => void
  onSoftnessChange: (value: number) => void
  isKeyed: boolean
  onToggleKeyframe: () => void
  keyframeControls?: ReactNode
}) {
  const padRef = useRef<HTMLDivElement>(null)
  const nx = clampNumber(position.x / LIGHT_RANGE, -1, 1)
  const ny = clampNumber(position.y / LIGHT_RANGE, -1, 1)
  const hx = 50 + nx * 42
  const hy = 50 - ny * 42

  const setFromPointer = (clientX: number, clientY: number) => {
    const rect = padRef.current?.getBoundingClientRect()
    if (!rect) return
    let px = ((clientX - rect.left) / rect.width) * 2 - 1
    let py = -(((clientY - rect.top) / rect.height) * 2 - 1)
    const len = Math.hypot(px, py)
    if (len > 1) {
      px /= len
      py /= len
    }
    onDirectionChange(
      Number((px * LIGHT_RANGE).toFixed(2)),
      Number((py * LIGHT_RANGE).toFixed(2))
    )
  }

  const handlePadDown = (e: PointerEvent) => {
    e.preventDefault()
    setFromPointer(e.clientX, e.clientY)
    bindWindowPointerDrag({
      onMove: (ev) => setFromPointer(ev.clientX, ev.clientY),
    })
  }

  const triggerSphere = `radial-gradient(circle at ${hx}% ${hy}%, #f8fafc 0%, ${color} 32%, #3f3f46 72%, #18181b 100%)`

  const horizontal = nx < -0.15 ? "Left" : nx > 0.15 ? "Right" : ""
  const vertical = ny > 0.15 ? "Top" : ny < -0.15 ? "Bottom" : ""
  const directionLabel =
    [vertical, horizontal].filter(Boolean).join(" ") || "Center"

  return (
    <Popover>
      <PopoverTrigger
        title="Light direction & color"
        className="flex h-7 min-w-0 flex-1 items-center gap-2 rounded-lg border-0 bg-foreground/[0.06] pr-2 pl-1.5 text-left text-foreground transition-colors hover:bg-foreground/[0.09] focus:outline-none focus-visible:ring-1 focus-visible:ring-ring/30"
      >
        <span className="relative size-5 shrink-0 overflow-hidden rounded-full border border-border bg-background/50 dark:bg-background/30">
          <span
            className="absolute inset-[2px] rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.38),inset_0_-1px_1px_rgba(0,0,0,0.2)]"
            style={{ background: triggerSphere }}
          />
        </span>
        <span className="min-w-0 flex-1 truncate text-[12px]">
          {directionLabel}
        </span>
        <ChevronDown className="size-3 shrink-0 text-muted-foreground/70" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-[196px] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Light Source
          </span>
          {keyframeControls ?? (
            <button
              type="button"
              aria-label={`${isKeyed ? "Remove" : "Add"} light keyframe`}
              title={`${isKeyed ? "Remove" : "Add"} light keyframe`}
              onClick={onToggleKeyframe}
              className={`flex size-5 items-center justify-center rounded border transition-colors ${
                isKeyed
                  ? "border-ring/50 bg-accent"
                  : "border-border bg-muted/45 hover:bg-muted/60"
              }`}
            >
              <span
                className="size-2 rotate-45 border border-ring/50"
                style={{ backgroundColor: isKeyed ? "#ffd9a0" : "transparent" }}
              />
            </button>
          )}
        </div>

        <div className="mt-2.5 aspect-square w-full rounded-full bg-border p-px shadow-inner">
          <div
            ref={padRef}
            onPointerDown={handlePadDown}
            className="relative size-full cursor-grab touch-none overflow-hidden rounded-full active:cursor-grabbing"
            style={{
              background: `radial-gradient(circle at ${hx}% ${hy}%, #f8fafc 0%, ${color} 24%, #27272a 68%, #0b0b0d 100%)`,
            }}
          >
            <span
              className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.7)] ring-1 ring-black/40"
              style={{ left: `${hx}%`, top: `${hy}%` }}
            />
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Drag to move the light
        </p>

        <div className="mt-2.5">
          <CompactColorInput
            value={color}
            onChange={onColorChange}
            ariaLabel="Light color"
            side="top"
            align="end"
            className="w-full"
          />
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <span className="w-14 shrink-0 text-[10px] font-medium text-muted-foreground">
            Softbox
          </span>
          <span className="flex-1" />
          <NumberField
            value={softness}
            min={0}
            max={1}
            step={0.05}
            precision={2}
            onChange={onSoftnessChange}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
