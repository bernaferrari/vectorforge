"use client"

import React, { useEffect, useRef, useState } from "react"
import { ChevronDown, Link2, Unlink2 } from "lucide-react"
import { CompactColorInput } from "@/components/ui/color-picker"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { bindWindowPointerDrag } from "@/lib/drag-events"

const clampNumber = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

let inputDragActive = false

export const isInspectorInputDragActive = () => inputDragActive

export function NumberField({
  value,
  min,
  max,
  step,
  scrubStep,
  prefix,
  prefixColor,
  suffix = "",
  precision = 1,
  className = "w-[62px]",
  inputClassName = "text-right",
  onChange,
}: {
  value: number
  min: number
  max: number
  step: number
  scrubStep?: number
  prefix?: string
  prefixColor?: string
  suffix?: string
  precision?: number
  className?: string
  inputClassName?: string
  onChange: (value: number) => void
}) {
  const [draft, setDraft] = useState(() => value.toFixed(precision))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(value.toFixed(precision))
  }, [value, precision])

  const commit = () => {
    const parsed = Number.parseFloat(draft)
    if (!Number.isFinite(parsed)) {
      setDraft(value.toFixed(precision))
      return
    }
    onChange(clampNumber(parsed, min, max))
  }

  const startScrub = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const startX = e.clientX
    const startValue = value
    const effectiveScrubStep = scrubStep ?? (step < 0.05 ? step * 2 : step)
    let moved = false
    inputDragActive = true
    bindWindowPointerDrag({
      onMove: (ev) => {
        const dx = ev.clientX - startX
        if (Math.abs(dx) > 3) moved = true
        if (!moved) return
        document.body.style.cursor = "ew-resize"
        const next = clampNumber(
          startValue + Math.round(dx / 3) * effectiveScrubStep,
          min,
          max
        )
        const rounded = Number(next.toFixed(precision))
        setDraft(rounded.toFixed(precision))
        onChange(rounded)
      },
      onEnd: () => {
        inputDragActive = false
        document.body.style.cursor = ""
        if (!moved) inputRef.current?.focus()
      },
    })
  }

  return (
    <div
      onPointerDown={startScrub}
      onLostPointerCapture={() => {
        document.body.style.cursor = ""
      }}
      title="Drag to adjust · click to type"
      className={`flex h-7 cursor-ew-resize items-center rounded-[8px] bg-muted/70 px-2 text-foreground transition-colors focus-within:bg-muted focus-within:ring-1 focus-within:ring-ring/25 hover:bg-muted ${className}`}
    >
      {prefix && (
        <span
          className={`mr-1 text-[11px] leading-none ${prefixColor ? "font-medium" : "font-medium text-muted-foreground"}`}
          style={prefixColor ? { color: prefixColor } : undefined}
        >
          {prefix}
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        value={draft}
        inputMode="decimal"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commit()
            event.currentTarget.blur()
          }
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault()
            const direction = event.key === "ArrowUp" ? 1 : -1
            onChange(clampNumber(value + step * direction, min, max))
          }
        }}
        className={`min-w-0 flex-1 cursor-ew-resize bg-transparent text-[12px] text-foreground tabular-nums outline-none focus:cursor-text ${inputClassName}`}
      />
      {suffix && (
        <span className="pl-0.5 text-[10px] text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  )
}

export function InspectorSlider({
  value,
  min,
  max,
  sliderMin = min,
  sliderMax = max,
  step,
  scrubStep,
  precision,
  inputClassName = "w-[58px]",
  sliderClassName = "flex-1",
  onChange,
}: {
  value: number
  min: number
  max: number
  sliderMin?: number
  sliderMax?: number
  step: number
  scrubStep?: number
  precision: number
  inputClassName?: string
  sliderClassName?: string
  onChange: (value: number) => void
}) {
  const sliderValue = clampNumber(value, sliderMin, sliderMax)
  const progress =
    sliderMax > sliderMin
      ? clampNumber((sliderValue - sliderMin) / (sliderMax - sliderMin), 0, 1)
      : 0
  const thumbInset = 12
  const thumbPosition = `calc(${thumbInset}px + ${progress} * (100% - ${thumbInset * 2}px))`

  return (
    <>
      <NumberField
        value={value}
        min={min}
        max={max}
        step={step}
        scrubStep={scrubStep}
        precision={precision}
        className={inputClassName}
        onChange={onChange}
      />
      <label
        className={`relative h-7 min-w-0 overflow-visible rounded-[8px] transition-opacity hover:opacity-95 ${sliderClassName}`}
        onClick={(event) => event.stopPropagation()}
        style={{
          background: `linear-gradient(to right, var(--inspector-slider-active) 0 ${thumbPosition}, var(--inspector-slider-track) ${thumbPosition} 100%)`,
        }}
      >
        <span
          className="pointer-events-none absolute inset-y-0 w-6 -translate-x-1/2 rounded-[8px] bg-[var(--inspector-slider-thumb)] shadow-[inset_0_1px_0_rgba(255,255,255,0.26)] transition-colors"
          style={{ left: thumbPosition }}
        />
        <input
          type="range"
          min={sliderMin}
          max={sliderMax}
          step={step}
          value={sliderValue}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="absolute inset-y-0 right-3 left-3 h-full w-auto cursor-ew-resize appearance-none opacity-0"
        />
      </label>
    </>
  )
}

export function AxisLockButton({
  locked,
  label,
  onToggle,
}: {
  locked: boolean
  label: string
  onToggle: () => void
}) {
  const Icon = locked ? Link2 : Unlink2
  return (
    <button
      type="button"
      aria-label={`${locked ? "Unlock" : "Lock"} ${label} axes`}
      title={locked ? `${label}: linked axes` : `${label}: separate axes`}
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
      className={`ml-1 flex size-5 shrink-0 items-center justify-center rounded-[6px] transition-colors focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none ${
        locked
          ? "bg-muted text-foreground hover:bg-muted/80"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className="size-3" />
    </button>
  )
}

const LIGHT_RANGE = 9

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
  keyframeControls?: React.ReactNode
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

  const handlePadDown = (e: React.PointerEvent) => {
    e.preventDefault()
    setFromPointer(e.clientX, e.clientY)
    bindWindowPointerDrag({
      onMove: (ev) => setFromPointer(ev.clientX, ev.clientY),
    })
  }

  const triggerSphere = `radial-gradient(circle at ${hx}% ${hy}%, #f8fafc 0%, ${color} 32%, #3f3f46 72%, #18181b 100%)`

  return (
    <Popover>
      <PopoverTrigger
        title="Light direction & color"
        className="flex h-7 shrink-0 items-center gap-1 rounded-md border border-border bg-muted/45 pr-1.5 pl-1 transition-colors hover:border-ring/50 hover:bg-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <span className="relative size-5 shrink-0 overflow-hidden rounded-full border border-border bg-background/50 dark:bg-background/30">
          <span
            className="absolute inset-[2px] rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.38),inset_0_-1px_1px_rgba(0,0,0,0.2)]"
            style={{ background: triggerSphere }}
          />
        </span>
        <ChevronDown className="size-3 text-muted-foreground" />
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
