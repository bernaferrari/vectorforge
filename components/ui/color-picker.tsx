"use client"

import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// Color conversion helpers between HEX and HSV (Hue, Saturation, Value/Brightness)
function hexToHsv(hex: string): { h: number; s: number; v: number } {
  hex = hex.replace(/^#/, "")
  if (hex.length === 3) {
    hex = hex.split("").map(c => c + c).join("")
  }
  if (hex.length !== 6) {
    return { h: 0, s: 0, v: 100 }
  }
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  
  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100)
  }
}

function hsvToHex(h: number, s: number, v: number): string {
  s /= 100
  v /= 100
  h /= 360

  let r = 0, g = 0, b = 0

  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16)
    return hex.length === 1 ? "0" + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

interface ColorPickerProps {
  value: string
  onChange: (hex: string) => void
  className?: string
  // Optional gradient support — when onGradientToggle is provided, the popover
  // shows a Solid/Gradient toggle and (in gradient mode) two editable stops.
  gradient?: boolean
  onGradientToggle?: (on: boolean) => void
  gradientType?: "linear" | "radial" | "conic"
  onGradientTypeChange?: (type: "linear" | "radial" | "conic") => void
  secondaryValue?: string
  onSecondaryChange?: (hex: string) => void
}

const GRADIENT_TYPES: Array<{ id: "linear" | "radial" | "conic"; label: string }> = [
  { id: "linear", label: "Linear" },
  { id: "radial", label: "Radial" },
  { id: "conic", label: "Conic" },
]

export function ColorPicker({ value, onChange, className, gradient, onGradientToggle, gradientType = "linear", onGradientTypeChange, secondaryValue, onSecondaryChange }: ColorPickerProps) {
  const supportsGradient = !!onGradientToggle
  const isGradient = !!gradient
  const [activeStop, setActiveStop] = React.useState<0 | 1>(0)
  React.useEffect(() => { if (!isGradient) setActiveStop(0) }, [isGradient])

  // The stop currently being edited (stop 1 only exists in gradient mode).
  const editingSecondary = isGradient && activeStop === 1 && !!onSecondaryChange
  const activeValue = editingSecondary ? (secondaryValue ?? value) : value
  const activeOnChange = editingSecondary ? onSecondaryChange! : onChange

  const hex = activeValue.startsWith("#") ? activeValue : `#${activeValue}`
  const primaryHex = value.startsWith("#") ? value : `#${value}`
  const secondaryHex = (secondaryValue ?? value).startsWith("#") ? (secondaryValue ?? value) : `#${secondaryValue ?? value}`
  const gradientCss =
    gradientType === "radial"
      ? `radial-gradient(circle at 35% 35%, ${primaryHex}, ${secondaryHex})`
      : gradientType === "conic"
        ? `conic-gradient(from 45deg, ${primaryHex}, ${secondaryHex}, ${primaryHex})`
        : `linear-gradient(90deg, ${primaryHex}, ${secondaryHex})`

  // Parse HSV color model dynamically
  const { h, s, v } = React.useMemo(() => {
    try {
      return hexToHsv(hex)
    } catch {
      return { h: 0, s: 0, v: 100 }
    }
  }, [hex])

  // Refs for 2D Saturation-Brightness Canvas & Hue Slider Track
  const canvasRef = React.useRef<HTMLDivElement>(null)
  const hueRef = React.useRef<HTMLDivElement>(null)

  // Direct text input binding
  const [inputText, setInputText] = React.useState(hex)
  React.useEffect(() => {
    setInputText(hex)
  }, [hex])

  // 2D Saturation-Brightness Handler
  const handleCanvasDrag = React.useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height))
    
    const newS = Math.round(x * 100)
    const newV = Math.round(y * 100)
    activeOnChange(hsvToHex(h, newS, newV))
  }, [h, activeOnChange])

  const handleCanvasStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    handleCanvasDrag(clientX, clientY)

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const moveX = "touches" in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX
      const moveY = "touches" in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY
      handleCanvasDrag(moveX, moveY)
    }

    const handleEnd = () => {
      window.removeEventListener("mousemove", handleMove)
      window.removeEventListener("mouseup", handleEnd)
      window.removeEventListener("touchmove", handleMove)
      window.removeEventListener("touchend", handleEnd)
    }

    window.addEventListener("mousemove", handleMove)
    window.addEventListener("mouseup", handleEnd)
    window.addEventListener("touchmove", handleMove, { passive: true })
    window.addEventListener("touchend", handleEnd)
  }

  // Hue Slider Handler
  const handleHueDrag = React.useCallback((clientX: number) => {
    if (!hueRef.current) return
    const rect = hueRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const newH = Math.round(x * 360)
    activeOnChange(hsvToHex(newH, s, v))
  }, [s, v, activeOnChange])

  const handleHueStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    handleHueDrag(clientX)

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const moveX = "touches" in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX
      handleHueDrag(moveX)
    }

    const handleEnd = () => {
      window.removeEventListener("mousemove", handleMove)
      window.removeEventListener("mouseup", handleEnd)
      window.removeEventListener("touchmove", handleMove)
      window.removeEventListener("touchend", handleEnd)
    }

    window.addEventListener("mousemove", handleMove)
    window.addEventListener("mouseup", handleEnd)
    window.addEventListener("touchmove", handleMove, { passive: true })
    window.addEventListener("touchend", handleEnd)
  }

  // Keyboard hex inputs
  const handleTextChange = (val: string) => {
    setInputText(val)
    let formatted = val.trim()
    if (!formatted.startsWith("#")) {
      formatted = `#${formatted}`
    }
    if (/^#[0-9A-Fa-f]{6}$/.test(formatted)) {
      activeOnChange(formatted)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      let formatted = inputText.trim()
      if (!formatted.startsWith("#")) {
        formatted = `#${formatted}`
      }
      if (/^#[0-9A-Fa-f]{6}$/.test(formatted)) {
        activeOnChange(formatted)
      } else {
        setInputText(hex) // revert
      }
      e.currentTarget.blur()
    }
  }

  const handleBlur = () => {
    let formatted = inputText.trim()
    if (!formatted.startsWith("#")) {
      formatted = `#${formatted}`
    }
    if (/^#[0-9A-Fa-f]{6}$/.test(formatted)) {
      activeOnChange(formatted)
    } else {
      setInputText(hex) // revert
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700/80 transition-all select-none cursor-pointer text-left w-full focus:outline-none focus:ring-2 focus:ring-zinc-850 hover:shadow-[0_0_12px_rgba(255,255,255,0.02)] active:scale-[0.98]",
          className
        )}
      >
        <div
          className="w-4 h-4 rounded-md shadow-sm border border-white/10 shrink-0"
          style={{ background: isGradient ? gradientCss : primaryHex }}
        />
        <span className="font-mono text-[11px] text-zinc-300 font-semibold tracking-wider uppercase flex-1">
          {isGradient ? "Gradient" : primaryHex}
        </span>
      </PopoverTrigger>

      <PopoverContent
        className="w-[260px] rounded-xl border border-white/[0.1] bg-[#141518]/95 p-3 text-white shadow-2xl backdrop-blur-xl z-50 animate-fade-in select-none"
        align="start"
        sideOffset={6}
      >
        {supportsGradient && (
          <div className="flex items-center gap-1 rounded-lg border border-white/[0.07] bg-black/25 p-0.5">
            <button
              type="button"
              onClick={() => onGradientToggle?.(false)}
              className={cn(
                "h-7 flex-1 rounded-md text-[10px] font-medium transition-colors",
                !isGradient ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
              )}
            >
              Solid
            </button>
            {GRADIENT_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => {
                  onGradientToggle?.(true)
                  onGradientTypeChange?.(type.id)
                }}
                className={cn(
                  "h-7 flex-1 rounded-md text-[10px] font-medium transition-colors",
                  isGradient && gradientType === type.id ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
                )}
              >
                {type.label}
              </button>
            ))}
          </div>
        )}

        {isGradient && (
          <div className="mt-3 rounded-lg border border-white/[0.07] bg-black/20 p-2">
            <div
              className="relative mb-2 h-8 rounded-md border border-white/[0.08]"
              style={{ background: gradientCss }}
            >
              {([0, 1] as const).map((stop) => (
                <button
                  key={`gradient-stop-${stop}`}
                  type="button"
                  aria-label={stop === 0 ? "Edit first gradient stop" : "Edit second gradient stop"}
                  onClick={() => setActiveStop(stop)}
                  className={cn(
                    "absolute top-1/2 size-4 -translate-y-1/2 rounded-full border-2 shadow-[0_1px_6px_rgba(0,0,0,0.45)] transition-transform",
                    activeStop === stop ? "scale-110 border-white" : "border-black/55 hover:scale-105"
                  )}
                  style={{
                    left: stop === 0 ? 8 : "auto",
                    right: stop === 1 ? 8 : "auto",
                    backgroundColor: stop === 0 ? primaryHex : secondaryHex,
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
            {([0, 1] as const).map((stop) => (
              <button
                key={stop}
                type="button"
                onClick={() => setActiveStop(stop)}
                className={cn(
                  "flex h-8 flex-1 items-center gap-2 rounded-md border px-2 transition-colors",
                  activeStop === stop ? "border-white/50 bg-white/[0.08]" : "border-white/[0.07] bg-black/20 hover:border-white/20"
                )}
              >
                <span className="size-4 rounded border border-white/10" style={{ backgroundColor: stop === 0 ? primaryHex : secondaryHex }} />
                <span className="font-mono text-[10px] text-zinc-400">{stop === 0 ? "Start" : "End"}</span>
              </button>
            ))}
            </div>
          </div>
        )}

        <div
          ref={canvasRef}
          onMouseDown={handleCanvasStart}
          onTouchStart={handleCanvasStart}
          className="mt-3 h-36 w-full relative rounded-lg overflow-hidden cursor-crosshair select-none border border-white/[0.08] shadow-inner"
          style={{
            backgroundColor: `hsl(${h}, 100%, 50%)`,
            backgroundImage: "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
            backgroundBlendMode: "multiply"
          }}
        >
          <div
            className="absolute w-4 h-4 rounded-full border border-white shadow-[0_0_0_1px_rgba(0,0,0,0.8),0_1px_5px_rgba(0,0,0,0.5)] -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-[transform] duration-75 flex items-center justify-center"
            style={{
              left: `${s}%`,
              top: `${100 - v}%`,
            }}
          >
            <div className="w-1 h-1 rounded-full bg-white/60" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="mt-3 flex items-center justify-between text-[9px] text-zinc-500 font-bold uppercase tracking-wider pl-0.5">
            <span>Hue</span>
            <span className="font-mono text-zinc-400 font-semibold">{h}°</span>
          </div>
          <div
            ref={hueRef}
            onMouseDown={handleHueStart}
            onTouchStart={handleHueStart}
            className="h-2.5 w-full relative rounded-full cursor-pointer select-none border border-white/5 shadow-inner"
            style={{
              background: "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)"
            }}
          >
            <div
              className="absolute w-4 h-4 rounded-full border-2 border-white bg-zinc-950/20 backdrop-blur-sm shadow-[0_1px_4px_rgba(0,0,0,0.6)] -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: `${(h / 360) * 100}%`
              }}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
          <div className="flex items-center gap-2 bg-black/25 border border-white/[0.08] rounded-lg px-3 py-2 flex-1">
            <span className="text-[10px] text-zinc-500 font-mono font-bold select-none">#</span>
            <input
              type="text"
              value={inputText.replace(/^#/, "")}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              placeholder="FFFFFF"
              className="w-full bg-transparent border-0 text-white font-mono text-xs outline-none uppercase p-0 focus:ring-0"
            />
          </div>
          <div
            className="w-8 h-8 rounded-lg border border-white/10 shadow-inner shrink-0"
            style={{ backgroundColor: hex }}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
