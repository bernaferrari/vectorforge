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
}

const SWATCH_GROUPS = [
  {
    name: "Monochrome & Slate",
    swatches: [
      { name: "White", hex: "#ffffff" },
      { name: "Zinc 200", hex: "#e4e4e7" },
      { name: "Zinc 400", hex: "#a1a1aa" },
      { name: "Zinc 600", hex: "#52525b" },
      { name: "Zinc 800", hex: "#27272a" },
      { name: "Black", hex: "#09090b" }
    ]
  },
  {
    name: "Electric & Neon",
    swatches: [
      { name: "Neon Violet", hex: "#8b5cf6" },
      { name: "Electric Indigo", hex: "#6366f1" },
      { name: "Sunset Pink", hex: "#f43f5e" },
      { name: "Teal Glow", hex: "#14b8a6" },
      { name: "Emerald Mint", hex: "#10b981" },
      { name: "Lime Punch", hex: "#84cc16" }
    ]
  },
  {
    name: "Satin Pastels",
    swatches: [
      { name: "Blossom Pink", hex: "#ffb3c6" },
      { name: "Warm Peach", hex: "#ffe5ec" },
      { name: "Vanilla Sand", hex: "#fde2e4" },
      { name: "Sky Mist", hex: "#b3e5fc" },
      { name: "Mint Foam", hex: "#c8e6c9" },
      { name: "Lavender Glow", hex: "#e1bee7" }
    ]
  }
]

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const hex = value.startsWith("#") ? value : `#${value}`

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
    onChange(hsvToHex(h, newS, newV))
  }, [h, onChange])

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
    onChange(hsvToHex(newH, s, v))
  }, [s, v, onChange])

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
      onChange(formatted)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      let formatted = inputText.trim()
      if (!formatted.startsWith("#")) {
        formatted = `#${formatted}`
      }
      if (/^#[0-9A-Fa-f]{6}$/.test(formatted)) {
        onChange(formatted)
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
      onChange(formatted)
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
          style={{ backgroundColor: hex }}
        />
        <span className="font-mono text-[11px] text-zinc-300 font-semibold tracking-wider uppercase flex-1">
          {hex}
        </span>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[268px] p-4 bg-zinc-950 border border-zinc-850 rounded-2xl shadow-2xl text-white select-none flex flex-col gap-4 z-50 animate-fade-in backdrop-blur-xl bg-zinc-950/95"
        align="start"
        sideOffset={6}
      >
        {/* Header Title */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-0.5">
          <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Color Studio</span>
          <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900/60 border border-zinc-800 rounded px-1.5 py-0.5 uppercase">{hex}</span>
        </div>

        {/* Saturation-Value Canvas Area */}
        <div
          ref={canvasRef}
          onMouseDown={handleCanvasStart}
          onTouchStart={handleCanvasStart}
          className="h-32 w-full relative rounded-lg overflow-hidden cursor-crosshair select-none border border-white/5 shadow-inner"
          style={{
            backgroundColor: `hsl(${h}, 100%, 50%)`,
            backgroundImage: "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
            backgroundBlendMode: "multiply"
          }}
        >
          {/* Draggable indicator dot (Precise transparent hairline cursor) */}
          <div
            className="absolute w-4 h-4 rounded-full border border-white shadow-[0_0_0_1px_rgba(0,0,0,0.8),0_1px_5px_rgba(0,0,0,0.5)] -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-[transform] duration-75 flex items-center justify-center"
            style={{
              left: `${s}%`,
              top: `${100 - v}%`,
            }}
          >
            {/* Inner tiny dot for center alignment */}
            <div className="w-1 h-1 rounded-full bg-white/60" />
          </div>
        </div>

        {/* Hue Slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[9px] text-zinc-500 font-bold uppercase tracking-wider pl-0.5">
            <span>Spectrum Hue</span>
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
            {/* Hue Slider Thumb (Glassmorphic ring thumb) */}
            <div
              className="absolute w-4 h-4 rounded-full border-2 border-white bg-zinc-950/20 backdrop-blur-sm shadow-[0_1px_4px_rgba(0,0,0,0.6)] -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: `${(h / 360) * 100}%`
              }}
            />
          </div>
        </div>

        {/* Input HEX field */}
        <div className="flex items-center justify-between gap-3 border-t border-zinc-900 pt-3.5">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 flex-1">
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
            className="w-8 h-8 rounded-xl border border-white/10 shadow-inner shrink-0"
            style={{ backgroundColor: hex }}
          />
        </div>

        {/* Curated Palette Sections */}
        <div className="flex flex-col gap-3 border-t border-zinc-900 pt-3.5">
          {SWATCH_GROUPS.map((group) => (
            <div key={group.name} className="flex flex-col gap-1.5">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-0.5">
                {group.name}
              </span>
              <div className="flex items-center gap-2">
                {group.swatches.map((swatch) => {
                  const isSelected = hex.toLowerCase() === swatch.hex.toLowerCase();
                  return (
                    <button
                      key={swatch.hex + swatch.name}
                      onClick={() => {
                        onChange(swatch.hex)
                        setInputText(swatch.hex)
                      }}
                      className={cn(
                        "w-5 h-5 rounded-md cursor-pointer border border-white/5 hover:scale-110 active:scale-95 transition-all shadow-inner focus:outline-none shrink-0 relative",
                        isSelected && "ring-1 ring-white/80 ring-offset-1 ring-offset-zinc-950 scale-105"
                      )}
                      style={{ backgroundColor: swatch.hex }}
                      title={swatch.name}
                    >
                      {isSelected && (
                        <div className="absolute inset-0 border border-white rounded-md pointer-events-none" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
