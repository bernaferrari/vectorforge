"use client"

import React, { useEffect, useRef, useState } from "react"
import { bindWindowPointerDrag } from "@/lib/drag-events"
import {
  clampInspectorValue,
  setInspectorInputDragActive,
  useRafNumberChange,
} from "./InspectorControlModel"

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
  const { flush: flushScrubChange, schedule: scheduleScrubChange } =
    useRafNumberChange(onChange)

  useEffect(() => {
    setDraft(value.toFixed(precision))
  }, [value, precision])

  const commit = () => {
    const parsed = Number.parseFloat(draft)
    if (!Number.isFinite(parsed)) {
      setDraft(value.toFixed(precision))
      return
    }
    onChange(clampInspectorValue(parsed, min, max))
  }

  const startScrub = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const startX = e.clientX
    const startValue = value
    const effectiveScrubStep = scrubStep ?? (step < 0.05 ? step * 2 : step)
    let moved = false
    setInspectorInputDragActive(true)
    bindWindowPointerDrag({
      onMove: (ev) => {
        const dx = ev.clientX - startX
        if (Math.abs(dx) > 3) moved = true
        if (!moved) return
        document.body.style.cursor = "ew-resize"
        const next = clampInspectorValue(
          startValue + Math.round(dx / 3) * effectiveScrubStep,
          min,
          max
        )
        const rounded = Number(next.toFixed(precision))
        setDraft(rounded.toFixed(precision))
        scheduleScrubChange(rounded)
      },
      onEnd: () => {
        flushScrubChange()
        setInspectorInputDragActive(false)
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
      className={`flex h-7 cursor-ew-resize items-center rounded-[7px] bg-foreground/[0.05] px-2 text-foreground transition-colors focus-within:bg-foreground/[0.07] focus-within:ring-1 focus-within:ring-ring/25 hover:bg-foreground/[0.08] ${className}`}
    >
      {prefix && (
        <span
          className={`mr-1 text-[10px] leading-none ${prefixColor ? "font-medium" : "font-medium text-muted-foreground/70"}`}
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
            onChange(clampInspectorValue(value + step * direction, min, max))
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
