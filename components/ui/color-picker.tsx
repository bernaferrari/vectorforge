"use client"

import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Move, Shuffle } from "lucide-react"
import { cn } from "@/lib/utils"
import { bindWindowPointerDrag, bindWindowTouchMouseDrag } from "@/lib/drag-events"

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

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace(/^#/, "")
  return {
    r: parseInt(normalized.slice(0, 2), 16) || 0,
    g: parseInt(normalized.slice(2, 4), 16) || 0,
    b: parseInt(normalized.slice(4, 6), 16) || 0,
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const channel = (value: number) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0")
  return `#${channel(r)}${channel(g)}${channel(b)}`
}

function parseHexColorInput(value: string): string | null {
  const cleaned = value.trim().replace(/^#/, "")
  if (/^[0-9A-Fa-f]{3}$/.test(cleaned)) {
    return `#${cleaned.split("").map((char) => char + char).join("").toUpperCase()}`
  }
  if (/^[0-9A-Fa-f]{6}$/.test(cleaned)) {
    return `#${cleaned.toUpperCase()}`
  }
  return null
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex)
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break
      case gn: h = (bn - rn) / d + 2; break
      case bn: h = (rn - gn) / d + 4; break
    }
    h /= 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c }
  else { r = c; b = x }
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255)
}

interface ColorPickerProps {
  value: string
  onChange: (hex: string) => void
  alpha?: number
  onAlphaChange?: (alpha: number) => void
  className?: string
  // Optional gradient support — when onGradientToggle is provided, the popover
  // shows a Solid/Gradient toggle and editable stops.
  gradient?: boolean
  onGradientToggle?: (on: boolean) => void
  gradientType?: "linear" | "radial" | "conic" | "mesh"
  onGradientTypeChange?: (type: "linear" | "radial" | "conic" | "mesh") => void
  stops?: Array<{ id?: string; color: string; position: number }>
  onStopsChange?: (stops: Array<{ id?: string; color: string; position: number }>) => void
  onStopPositionChange?: (stop: number, position: number) => void
  onStopRemove?: (stop: number) => void
  secondaryValue?: string
  onSecondaryChange?: (hex: string) => void
  secondaryAlpha?: number
  onSecondaryAlphaChange?: (alpha: number) => void
}

interface CompactColorInputProps {
  value: string
  onChange: (hex: string) => void
  className?: string
  ariaLabel?: string
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
}

const GRADIENT_TYPES: Array<{ id: "linear" | "radial" | "conic" | "mesh"; label: string }> = [
  { id: "linear", label: "Linear" },
  { id: "radial", label: "Radial" },
  { id: "conic", label: "Conic" },
  { id: "mesh", label: "Mesh" },
]
const SHOW_EXPERIMENTAL_GRADIENT_TYPES = false
const VISIBLE_GRADIENT_TYPES = SHOW_EXPERIMENTAL_GRADIENT_TYPES
  ? GRADIENT_TYPES
  : GRADIENT_TYPES.filter((type) => type.id === "mesh")

const GOOGLE_MESH_STOPS = [
  { color: "#FF9900", position: 0 },
  { color: "#FF360A", position: 0.125 },
  { color: "#D13AB3", position: 0.25 },
  { color: "#FFC700", position: 0.375 },
  { color: "#807AFF", position: 0.5 },
  { color: "#1759FF", position: 0.625 },
  { color: "#63E600", position: 0.75 },
  { color: "#00C796", position: 0.875 },
  { color: "#00ADF0", position: 1 },
]

const AURORA_MESH_STOPS = [
  { color: "#FFF6E8", position: 0 },
  { color: "#EFC7A8", position: 0.125 },
  { color: "#D98F76", position: 0.25 },
  { color: "#DCE8C8", position: 0.375 },
  { color: "#AFC7A3", position: 0.5 },
  { color: "#8FCFC1", position: 0.625 },
  { color: "#F6D5BA", position: 0.75 },
  { color: "#C7B8D9", position: 0.875 },
  { color: "#F2BBAA", position: 1 },
]

const CANDY_MESH_STOPS = [
  { color: "#FFF7AD", position: 0 },
  { color: "#FF8BC7", position: 0.125 },
  { color: "#C9A7FF", position: 0.25 },
  { color: "#FFB86B", position: 0.375 },
  { color: "#FF4FA3", position: 0.5 },
  { color: "#8B6DFF", position: 0.625 },
  { color: "#62EAD9", position: 0.75 },
  { color: "#29C7FF", position: 0.875 },
  { color: "#6E7BFF", position: 1 },
]

const LAGOON_MESH_STOPS = [
  { color: "#FFF7F1", position: 0 },
  { color: "#FFD6E8", position: 0.125 },
  { color: "#BBA7FF", position: 0.25 },
  { color: "#D9F8CF", position: 0.375 },
  { color: "#9FF0D1", position: 0.5 },
  { color: "#88D8FF", position: 0.625 },
  { color: "#7DEBD7", position: 0.75 },
  { color: "#8BB8FF", position: 0.875 },
  { color: "#D7B5FF", position: 1 },
]

const EMBER_MESH_STOPS = [
  { color: "#F7F2E8", position: 0 },
  { color: "#D6C7A8", position: 0.125 },
  { color: "#A68C6D", position: 0.25 },
  { color: "#DDE2D0", position: 0.375 },
  { color: "#8FA996", position: 0.5 },
  { color: "#6CA6A4", position: 0.625 },
  { color: "#CDBFA8", position: 0.75 },
  { color: "#9FB6C3", position: 0.875 },
  { color: "#B8A6C7", position: 1 },
]

const ORCHID_MESH_STOPS = [
  { color: "#FDF2F8", position: 0 },
  { color: "#FDA4D9", position: 0.125 },
  { color: "#B999FF", position: 0.25 },
  { color: "#F5B8FF", position: 0.375 },
  { color: "#9A5CFF", position: 0.5 },
  { color: "#35D8F0", position: 0.625 },
  { color: "#D879FF", position: 0.75 },
  { color: "#2FC4D9", position: 0.875 },
  { color: "#8F7DFF", position: 1 },
]

const OPAL_MESH_STOPS = [
  { color: "#FFF4B8", position: 0 },
  { color: "#FFD166", position: 0.125 },
  { color: "#FFB15E", position: 0.25 },
  { color: "#E8F56C", position: 0.375 },
  { color: "#9CF27A", position: 0.5 },
  { color: "#52E6B8", position: 0.625 },
  { color: "#B8F7D4", position: 0.75 },
  { color: "#65D6D2", position: 0.875 },
  { color: "#46C8B8", position: 1 },
]

const NIGHT_MESH_STOPS = [
  { color: "#FFF06A", position: 0 },
  { color: "#FF7A59", position: 0.125 },
  { color: "#FF4FB8", position: 0.25 },
  { color: "#B7F55E", position: 0.375 },
  { color: "#2EE6A6", position: 0.5 },
  { color: "#00C2FF", position: 0.625 },
  { color: "#F4FF8A", position: 0.75 },
  { color: "#72F2E8", position: 0.875 },
  { color: "#FFB84D", position: 1 },
]

const GRADIENT_PRESETS: Array<{
  name: string
  type: "linear" | "radial" | "conic" | "mesh"
  stops: Array<{ color: string; position: number }>
}> = [
  {
    name: "Google Mesh",
    type: "mesh",
    stops: GOOGLE_MESH_STOPS,
  },
  {
    name: "Ceramic Mesh",
    type: "mesh",
    stops: AURORA_MESH_STOPS,
  },
  {
    name: "Candy Mesh",
    type: "mesh",
    stops: CANDY_MESH_STOPS,
  },
  {
    name: "Lagoon Mesh",
    type: "mesh",
    stops: LAGOON_MESH_STOPS,
  },
  {
    name: "Mineral Mesh",
    type: "mesh",
    stops: EMBER_MESH_STOPS,
  },
  {
    name: "Orchid Mesh",
    type: "mesh",
    stops: ORCHID_MESH_STOPS,
  },
  {
    name: "Opal Mesh",
    type: "mesh",
    stops: OPAL_MESH_STOPS,
  },
  {
    name: "Tropic Mesh",
    type: "mesh",
    stops: NIGHT_MESH_STOPS,
  },
]

const gradientPreviewCss = (
  type: "linear" | "radial" | "conic" | "mesh",
  stops: Array<{ color: string; position: number }>
) => {
  const stopList = stops.map((stop) => `${stop.color} ${Math.round(stop.position * 100)}%`).join(", ")
  if (type === "mesh") {
    const colors = stops.map((stop) => stop.color)
    if (colors.length >= 9) {
      return `radial-gradient(circle at 18% 18%, ${colors[0]} 0 12%, transparent 30%), radial-gradient(circle at 50% 20%, ${colors[1]} 0 13%, transparent 34%), radial-gradient(circle at 82% 20%, ${colors[2]} 0 13%, transparent 34%), radial-gradient(circle at 18% 52%, ${colors[3]} 0 15%, transparent 36%), radial-gradient(circle at 50% 50%, ${colors[4]} 0 18%, transparent 42%), radial-gradient(circle at 82% 52%, ${colors[5]} 0 15%, transparent 36%), radial-gradient(circle at 18% 84%, ${colors[6]} 0 14%, transparent 36%), radial-gradient(circle at 50% 84%, ${colors[7]} 0 15%, transparent 38%), radial-gradient(circle at 82% 84%, ${colors[8]} 0 15%, transparent 38%), linear-gradient(135deg, ${colors[0]}, ${colors[8]})`
    }
    return `linear-gradient(135deg, ${stopList})`
  }
  if (type === "radial") return `radial-gradient(circle at 35% 35%, ${stopList})`
  if (type === "conic") return `conic-gradient(from 45deg, ${stopList}, ${stops[0]?.color ?? "#fff"})`
  return `linear-gradient(90deg, ${stopList})`
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const x = clamp01((value - edge0) / (edge1 - edge0))
  return x * x * (3 - 2 * x)
}

const mixChannel = (a: number, b: number, t: number) => a + (b - a) * t

const mixHex = (fromColor: string, toColor: string, t: number) => {
  const from = hexToRgb(fromColor)
  const to = hexToRgb(toColor)
  return rgbToHex(
    mixChannel(from.r, to.r, t),
    mixChannel(from.g, to.g, t),
    mixChannel(from.b, to.b, t)
  )
}

const bezierHex = (a: string, b: string, c: string, t: number) =>
  mixHex(mixHex(a, b, t), mixHex(b, c, t), t)

const colorAtStopPosition = (
  stops: Array<{ color: string; position: number }>,
  position: number,
  fallback: string
) => {
  const sorted = [...stops].sort((a, b) => a.position - b.position)
  const previous = [...sorted].reverse().find((stop) => stop.position <= position) ?? sorted[0]
  const next = sorted.find((stop) => stop.position >= position) ?? sorted[sorted.length - 1]
  if (!previous || !next || previous.position === next.position) return previous?.color ?? fallback

  return mixHex(previous.color, next.color, (position - previous.position) / (next.position - previous.position))
}

const colorAtGradientPoint = (
  type: "linear" | "radial" | "conic" | "mesh",
  stops: Array<{ color: string; position: number }>,
  point: { x: number; y: number },
  fallback: string
) => {
  if (type === "radial") {
    const cx = 0.35
    const cy = 0.35
    const farthest = Math.max(
      Math.hypot(cx, cy),
      Math.hypot(1 - cx, cy),
      Math.hypot(cx, 1 - cy),
      Math.hypot(1 - cx, 1 - cy)
    )
    return colorAtStopPosition(stops, clamp01(Math.hypot(point.x - cx, point.y - cy) / farthest), fallback)
  }

  if (type === "conic") {
    const angle = Math.atan2(point.y - 0.5, point.x - 0.5)
    const turn = (angle + Math.PI * 2 - Math.PI / 4) / (Math.PI * 2)
    return colorAtStopPosition(stops, clamp01(turn - Math.floor(turn)), fallback)
  }

  if (type === "mesh") {
    const palette = Array.from({ length: 9 }, (_, index) =>
      stops.length >= 9
        ? [...stops].sort((a, b) => a.position - b.position)[index]?.color ?? fallback
        : colorAtStopPosition(stops, index / 8, fallback)
    )
    const x = smoothstep(0.02, 0.98, point.x)
    const y = smoothstep(0.02, 0.98, point.y)
    const top = bezierHex(palette[0], palette[1], palette[2], x)
    const middle = bezierHex(palette[3], palette[4], palette[5], x)
    const bottom = bezierHex(palette[6], palette[7], palette[8], x)
    return bezierHex(top, middle, bottom, y)
  }

  return colorAtStopPosition(stops, point.x, fallback)
}

type ColorFormat = "HEX" | "RGB" | "HSL" | "HSB"

const ENABLE_ALPHA = false

const normalizeStopId = (id: string | undefined, index: number, usedIds: Set<string>) => {
  const baseId = id?.trim() || `stop-${index}`
  if (!usedIds.has(baseId)) {
    usedIds.add(baseId)
    return baseId
  }
  let suffix = 2
  let nextId = `${baseId}-${suffix}`
  while (usedIds.has(nextId)) {
    suffix += 1
    nextId = `${baseId}-${suffix}`
  }
  usedIds.add(nextId)
  return nextId
}

function SolidColorEditor({
  h,
  s,
  v,
  hex,
  alpha,
  inputText,
  format,
  setFormat,
  canvasRef,
  hueRef,
  alphaRef,
  handleCanvasStart,
  handleHueStart,
  handleAlphaStart,
  handleAlphaChange,
  handleTextChange,
  handleKeyDown,
  handleBlur,
  framed = true,
  compact = false,
}: {
  h: number
  s: number
  v: number
  hex: string
  alpha: number
  inputText: string
  format: ColorFormat
  setFormat: (format: ColorFormat) => void
  setInputText: (value: string) => void
  canvasRef: React.RefObject<HTMLDivElement | null>
  hueRef: React.RefObject<HTMLDivElement | null>
  alphaRef: React.RefObject<HTMLDivElement | null>
  handleCanvasStart: (e: React.MouseEvent | React.TouchEvent) => void
  handleHueStart: (e: React.MouseEvent | React.TouchEvent) => void
  handleAlphaStart: (e: React.MouseEvent | React.TouchEvent) => void
  handleAlphaChange: (value: string) => void
  handleTextChange: (value: string) => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  handleBlur: () => void
  framed?: boolean
  compact?: boolean
}) {
  const rgb = hexToRgb(hex)
  const hsl = hexToHsl(hex)
  const formatValues =
    format === "RGB" ? [rgb.r, rgb.g, rgb.b]
    : format === "HSL" ? [hsl.h, hsl.s, hsl.l]
    : [h, s, v]
  const updateFormatValue = (index: number, rawValue: string) => {
    const parsed = Number.parseFloat(rawValue)
    if (!Number.isFinite(parsed)) return
    if (format === "RGB") {
      const next = [rgb.r, rgb.g, rgb.b]
      next[index] = Math.max(0, Math.min(255, parsed))
      handleTextChange(rgbToHex(next[0], next[1], next[2]))
    } else if (format === "HSL") {
      const next = [hsl.h, hsl.s, hsl.l]
      next[index] = index === 0 ? Math.max(0, Math.min(360, parsed)) : Math.max(0, Math.min(100, parsed))
      handleTextChange(hslToHex(next[0], next[1], next[2]))
    } else {
      const next = [h, s, v]
      next[index] = index === 0 ? Math.max(0, Math.min(360, parsed)) : Math.max(0, Math.min(100, parsed))
      handleTextChange(hsvToHex(next[0], next[1], next[2]))
    }
  }
  const formatSelect = (
    <Select value={format} onValueChange={(next) => setFormat(next as ColorFormat)}>
      <SelectTrigger
        size="sm"
        className="h-8 w-[72px] shrink-0 rounded-lg border-border bg-muted/60 px-3 text-[11px] text-foreground hover:bg-muted/75"
      >
        <SelectValue>{format}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start" className="min-w-[72px]">
        <SelectItem value="HEX">HEX</SelectItem>
        <SelectItem value="RGB">RGB</SelectItem>
        <SelectItem value="HSL">HSL</SelectItem>
        <SelectItem value="HSB">HSB</SelectItem>
      </SelectContent>
    </Select>
  )

  return (
    <div className={cn("space-y-3", framed && "rounded-xl border border-border bg-popover p-3 pb-2 text-popover-foreground shadow-xl")}>
      <div
        ref={canvasRef}
        onMouseDown={handleCanvasStart}
        onTouchStart={handleCanvasStart}
        className={cn(
          "relative w-full cursor-crosshair select-none overflow-hidden rounded-lg border border-border bg-muted shadow-[inset_0_0_0_1px_hsl(var(--border)/0.45)]",
          compact ? "h-40" : "h-56"
        )}
      >
        <div
          className="absolute inset-px rounded-[7px]"
          style={{
            backgroundImage: `linear-gradient(to top, #000 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(to right, #fff 0%, hsl(${h}, 100%, 50%) 100%)`,
          }}
        />
        <div
          className="absolute z-10 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-background bg-transparent shadow-[0_1px_7px_rgba(0,0,0,0.45)]"
          style={{
            left: `${s}%`,
            top: `${100 - v}%`,
          }}
        />
      </div>

      <div
        ref={hueRef}
        onMouseDown={handleHueStart}
        onTouchStart={handleHueStart}
        className="relative h-4.5 w-full cursor-pointer rounded-full border border-border shadow-inner"
        style={{
          background: "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)",
        }}
      >
        <div
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-transparent shadow-[0_1px_4px_rgba(0,0,0,0.38)]"
          style={{ left: `clamp(8px, ${(h / 360) * 100}%, calc(100% - 8px))` }}
        />
      </div>

      {ENABLE_ALPHA && (
        <div
          ref={alphaRef}
          onMouseDown={handleAlphaStart}
          onTouchStart={handleAlphaStart}
          className="relative h-4.5 w-full cursor-pointer rounded-full border border-border shadow-inner"
          style={{
            backgroundColor: "#fff",
            backgroundImage: `linear-gradient(to right, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0), rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)), linear-gradient(45deg, #8b8b8b 25%, transparent 25%), linear-gradient(-45deg, #8b8b8b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #8b8b8b 75%), linear-gradient(-45deg, transparent 75%, #8b8b8b 75%)`,
            backgroundPosition: "0 0, 0 0, 0 5px, 5px -5px, -5px 0",
            backgroundSize: "100% 100%, 10px 10px, 10px 10px, 10px 10px, 10px 10px",
          }}
        >
          <div
            className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-transparent shadow-[0_1px_4px_rgba(0,0,0,0.38)]"
            style={{ left: `clamp(8px, ${alpha * 100}%, calc(100% - 8px))` }}
          />
        </div>
      )}

      {format === "HEX" ? null : (
        <div className="flex items-center gap-2 text-[12px]">
          {formatSelect}
          <div className={cn(
            "grid min-w-0 flex-1 gap-px rounded-lg bg-border",
            ENABLE_ALPHA ? "grid-cols-4" : "grid-cols-3"
          )}>
          {formatValues.map((value, index) => (
            <input
              key={`${format}-${index}`}
              type="text"
              value={Math.round(value)}
              onChange={(event) => updateFormatValue(index, event.target.value)}
              className={cn(
                "h-8 min-w-0 border border-border bg-muted/45 text-center font-mono text-foreground outline-none",
                index === 0 && "rounded-l-lg",
                index === formatValues.length - 1 && !ENABLE_ALPHA && "rounded-r-lg"
              )}
            />
          ))}
          {ENABLE_ALPHA && (
            <div className="flex h-8 min-w-0 items-center rounded-r-lg border border-border bg-muted/45 px-1 font-mono text-foreground">
              <input
                type="text"
                value={Math.round(alpha * 100)}
                onChange={(event) => handleAlphaChange(event.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-center font-mono text-foreground outline-none"
              />
              <span className="text-muted-foreground">%</span>
            </div>
          )}
          </div>
        </div>
      )}

      {format === "HEX" && (
      <div className="flex items-center gap-2">
        {formatSelect}
        <div className="flex h-8 min-w-0 flex-1 items-center gap-1 rounded-lg border border-border bg-muted/45 px-2.5">
          <span className="font-mono text-[10px] font-bold text-muted-foreground">#</span>
          <input
            type="text"
            value={inputText.replace(/^#/, "")}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="FFFFFF"
            className="min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-xs uppercase text-foreground outline-none focus:ring-0"
          />
        </div>
      </div>
      )}
    </div>
  )
}

export function CompactColorInput({
  value,
  onChange,
  className,
  ariaLabel = "Color",
  side = "top",
  align = "end",
}: CompactColorInputProps) {
  const hex = value.startsWith("#") ? value : `#${value}`
  const [format, setFormat] = React.useState<ColorFormat>("HEX")
  const [inputText, setInputText] = React.useState(hex)
  const canvasRef = React.useRef<HTMLDivElement>(null)
  const hueRef = React.useRef<HTMLDivElement>(null)
  const alphaRef = React.useRef<HTMLDivElement>(null)
  const alpha = 1

  const { h, s, v } = React.useMemo(() => {
    try {
      return hexToHsv(hex)
    } catch {
      return { h: 0, s: 0, v: 100 }
    }
  }, [hex])

  React.useEffect(() => {
    setInputText(hex)
  }, [hex])

  const handleCanvasDrag = React.useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height))
    onChange(hsvToHex(h, Math.round(x * 100), Math.round(y * 100)))
  }, [h, onChange])

  const handleCanvasStart = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const clientX = "touches" in event ? event.touches[0].clientX : event.clientX
    const clientY = "touches" in event ? event.touches[0].clientY : event.clientY
    handleCanvasDrag(clientX, clientY)
    bindWindowTouchMouseDrag({
      onMove: (moveEvent) => {
        const moveX = "touches" in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX
        const moveY = "touches" in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY
        handleCanvasDrag(moveX, moveY)
      },
    })
  }

  const handleHueDrag = React.useCallback((clientX: number) => {
    if (!hueRef.current) return
    const rect = hueRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    onChange(hsvToHex(Math.round(x * 360), s, v))
  }, [onChange, s, v])

  const handleHueStart = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const clientX = "touches" in event ? event.touches[0].clientX : event.clientX
    handleHueDrag(clientX)
    bindWindowTouchMouseDrag({
      onMove: (moveEvent) => {
        const moveX = "touches" in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX
        handleHueDrag(moveX)
      },
    })
  }

  const handleTextChange = (nextValue: string) => {
    setInputText(nextValue)
    const nextColor = parseHexColorInput(nextValue)
    if (nextColor) onChange(nextColor)
  }

  const commitInput = () => {
    const nextColor = parseHexColorInput(inputText)
    if (nextColor) {
      onChange(nextColor)
      setInputText(nextColor)
    } else {
      setInputText(hex)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      commitInput()
      event.currentTarget.blur()
    }
    if (event.key === "Escape") {
      setInputText(hex)
      event.currentTarget.blur()
    }
  }

  const handleAlphaChange = () => {}
  const handleAlphaStart = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <span
      className={cn(
        "flex h-8 min-w-0 items-center gap-2 rounded-lg bg-muted/45 px-2 font-mono uppercase text-foreground transition-colors focus-within:ring-2 focus-within:ring-ring/35",
        className
      )}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <Popover>
        <PopoverTrigger
          aria-label={ariaLabel}
          className="size-4.5 shrink-0 rounded-[4px] border border-border focus:outline-none focus:ring-2 focus:ring-ring/35"
          style={{ backgroundColor: hex }}
          onClick={(event) => event.stopPropagation()}
        />
        <PopoverContent
          align={align}
          side={side}
          sideOffset={8}
          className="w-[210px] rounded-xl border border-border bg-popover p-3 pb-2 text-popover-foreground shadow-2xl backdrop-blur-xl"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <SolidColorEditor
            h={h}
            s={s}
            v={v}
            hex={hex}
            alpha={alpha}
            inputText={inputText}
            format={format}
            setFormat={setFormat}
            setInputText={setInputText}
            canvasRef={canvasRef}
            hueRef={hueRef}
            alphaRef={alphaRef}
            handleCanvasStart={handleCanvasStart}
            handleHueStart={handleHueStart}
            handleAlphaStart={handleAlphaStart}
            handleAlphaChange={handleAlphaChange}
            handleTextChange={handleTextChange}
            handleKeyDown={handleKeyDown}
            handleBlur={commitInput}
            framed={false}
            compact
          />
        </PopoverContent>
      </Popover>
      <span className="text-muted-foreground">#</span>
      <input
        type="text"
        spellCheck={false}
        aria-label={`${ariaLabel} hex value`}
        value={inputText.replace(/^#/, "")}
        onChange={(event) => handleTextChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitInput}
        className="h-full min-w-0 flex-1 bg-transparent p-0 font-mono text-[12px] uppercase text-foreground outline-none"
      />
    </span>
  )
}

export function ColorPicker({ value, onChange, alpha, onAlphaChange, className, gradient, onGradientToggle, gradientType = "linear", onGradientTypeChange, stops, onStopsChange, onStopPositionChange, onStopRemove, secondaryValue, onSecondaryChange, secondaryAlpha, onSecondaryAlphaChange }: ColorPickerProps) {
  const supportsGradient = !!onGradientToggle
  const isGradient = !!gradient
  const [isOpen, setIsOpen] = React.useState(false)
  const [activeStop, setActiveStop] = React.useState(0)
  const [openStopEditor, setOpenStopEditor] = React.useState<number | null>(null)
  const [format, setFormat] = React.useState<ColorFormat>("HEX")
  const [internalAlpha, setInternalAlpha] = React.useState(1)
  const [internalSecondaryAlpha, setInternalSecondaryAlpha] = React.useState(1)
  const rootTriggerRef = React.useRef<HTMLButtonElement | null>(null)
  const rootContentRef = React.useRef<HTMLDivElement | null>(null)
  const stopContentRef = React.useRef<HTMLDivElement | null>(null)
  const rootOutsidePointerRef = React.useRef<{ x: number; y: number } | null>(null)
  const stopOutsidePointerRef = React.useRef<{ x: number; y: number } | null>(null)
  React.useEffect(() => {
    if (!isGradient) setActiveStop(0)
    setOpenStopEditor(null)
  }, [isGradient])

  React.useEffect(() => {
    if (isGradient && !SHOW_EXPERIMENTAL_GRADIENT_TYPES && gradientType !== "mesh") {
      onGradientTypeChange?.("mesh")
    }
  }, [gradientType, isGradient, onGradientTypeChange])

  React.useEffect(() => {
    if (!isOpen && openStopEditor !== null) setOpenStopEditor(null)
  }, [isOpen, openStopEditor])

  React.useEffect(() => {
    if (!isOpen && openStopEditor === null) return

    const isInside = (element: HTMLElement | null, target: EventTarget | null) =>
      Boolean(element && target instanceof Node && element.contains(target))

    const handlePointerDown = (event: PointerEvent) => {
      if (
        openStopEditor !== null &&
        !isInside(stopContentRef.current, event.target)
      ) {
        stopOutsidePointerRef.current = { x: event.clientX, y: event.clientY }
      }

      if (
        isOpen &&
        !isInside(rootContentRef.current, event.target) &&
        !isInside(rootTriggerRef.current, event.target)
      ) {
        rootOutsidePointerRef.current = { x: event.clientX, y: event.clientY }
      }
    }

    const handlePointerUp = (event: PointerEvent) => {
      const closeIfClick = (
        ref: React.MutableRefObject<{ x: number; y: number } | null>,
        close: () => void
      ) => {
        const start = ref.current
        if (!start) return
        ref.current = null
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 4) close()
      }

      closeIfClick(stopOutsidePointerRef, () => setOpenStopEditor(null))
      closeIfClick(rootOutsidePointerRef, () => {
        setOpenStopEditor(null)
        setIsOpen(false)
      })
    }

    window.addEventListener("pointerdown", handlePointerDown, true)
    window.addEventListener("pointerup", handlePointerUp, true)
    window.addEventListener("pointercancel", handlePointerUp, true)
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true)
      window.removeEventListener("pointerup", handlePointerUp, true)
      window.removeEventListener("pointercancel", handlePointerUp, true)
    }
  }, [isOpen, openStopEditor])

  const primaryHex = value.startsWith("#") ? value : `#${value}`
  const secondaryHex = (secondaryValue ?? value).startsWith("#") ? (secondaryValue ?? value) : `#${secondaryValue ?? value}`
  const normalizedStops = React.useMemo(() => {
    const source = stops?.length
      ? stops
      : onSecondaryChange
        ? [{ color: primaryHex, position: 0 }, { color: secondaryHex, position: 1 }]
        : [{ color: primaryHex, position: 0 }]

    const usedIds = new Set<string>()
    return source
      .map((stop, index) => ({
        id: normalizeStopId(stop.id, index, usedIds),
        color: stop.color.startsWith("#") ? stop.color : `#${stop.color}`,
        position: Math.max(0, Math.min(1, stop.position)),
      }))
      .sort((a, b) => a.position - b.position)
  }, [onSecondaryChange, primaryHex, secondaryHex, stops])

  React.useEffect(() => {
    if (activeStop >= normalizedStops.length) setActiveStop(Math.max(0, normalizedStops.length - 1))
    if (openStopEditor !== null && openStopEditor >= normalizedStops.length) setOpenStopEditor(null)
  }, [activeStop, normalizedStops.length, openStopEditor])

  const updateStops = React.useCallback((nextStops: Array<{ id?: string; color: string; position: number }>) => {
    const usedIds = new Set<string>()
    const normalized = nextStops
      .map((stop, index) => ({
        id: normalizeStopId(stop.id, index, usedIds),
        color: stop.color.startsWith("#") ? stop.color : `#${stop.color}`,
        position: Math.max(0, Math.min(1, stop.position)),
      }))
      .sort((a, b) => a.position - b.position)
    onStopsChange?.(normalized)
  }, [onStopsChange])

  const applyGradientPreset = React.useCallback((preset: typeof GRADIENT_PRESETS[number]) => {
    onGradientToggle?.(true)
    onGradientTypeChange?.(preset.type)
    updateStops(preset.stops)
    setActiveStop(0)
    setOpenStopEditor(null)
  }, [onGradientToggle, onGradientTypeChange, updateStops])

  const shuffleMeshStops = React.useCallback(() => {
    const palette = normalizedStops.length >= 9
      ? normalizedStops
      : GRADIENT_PRESETS[Math.floor(Math.random() * GRADIENT_PRESETS.length)].stops
    const offset = Math.floor(Math.random() * palette.length)
    const hueShift = Math.floor(24 + Math.random() * 96)
    const shouldShiftHue = Math.random() > 0.35
    const nextStops = normalizedStops.map((stop, index) => {
      const source = palette[(index + offset) % palette.length] ?? stop
      const hsv = hexToHsv(source.color)
      return {
        ...stop,
        color: shouldShiftHue ? hsvToHex((hsv.h + hueShift) % 360, hsv.s, hsv.v) : source.color,
      }
    })
    onGradientToggle?.(true)
    onGradientTypeChange?.("mesh")
    updateStops(nextStops)
    setOpenStopEditor(null)
  }, [normalizedStops, onGradientToggle, onGradientTypeChange, updateStops])

  const shuffleMeshPoints = React.useCallback(() => {
    if (normalizedStops.length < 2) return
    const positions = normalizedStops.map((stop) => stop.position).sort((a, b) => a - b)
    const permutations = [
      [2, 5, 8, 1, 4, 7, 0, 3, 6],
      [6, 3, 0, 7, 4, 1, 8, 5, 2],
      [8, 7, 6, 5, 4, 3, 2, 1, 0],
      [1, 2, 5, 0, 4, 8, 3, 6, 7],
      [3, 0, 1, 6, 4, 2, 7, 8, 5],
    ]
    const permutation = permutations[Math.floor(Math.random() * permutations.length)]
    const nextStops = normalizedStops.map((stop, index) => ({
      ...stop,
      position: positions[permutation[index % permutation.length] % positions.length] ?? stop.position,
    }))
    onGradientToggle?.(true)
    onGradientTypeChange?.("mesh")
    updateStops(nextStops)
    setOpenStopEditor(null)
  }, [normalizedStops, onGradientToggle, onGradientTypeChange, updateStops])

  const updateActiveStopColor = React.useCallback((nextColor: string) => {
    if (onStopsChange) {
      updateStops(normalizedStops.map((stop, index) => index === activeStop ? { ...stop, color: nextColor } : stop))
      return
    }
    if (isGradient && activeStop === 1 && onSecondaryChange) onSecondaryChange(nextColor)
    else onChange(nextColor)
  }, [activeStop, isGradient, normalizedStops, onChange, onSecondaryChange, onStopsChange, updateStops])

  // The stop currently being edited (stop 1 only exists in gradient mode).
  const activeValue = normalizedStops[activeStop]?.color ?? value
  const activeOnChange = updateActiveStopColor
  const editingSecondary = isGradient && activeStop === 1 && !!onSecondaryChange
  const activeAlpha = editingSecondary ? (secondaryAlpha ?? internalSecondaryAlpha) : (alpha ?? internalAlpha)
  const activeOnAlphaChange = editingSecondary ? (onSecondaryAlphaChange ?? setInternalSecondaryAlpha) : (onAlphaChange ?? setInternalAlpha)

  const hex = activeValue.startsWith("#") ? activeValue : `#${activeValue}`
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
  const alphaRef = React.useRef<HTMLDivElement>(null)
  const gradientRailRef = React.useRef<HTMLDivElement>(null)
  const stopCount = normalizedStops.length
  const visibleStops = normalizedStops.map((_, index) => index)
  const canRemoveStop = stopCount > 1
  const gradientStopsCss = normalizedStops
    .map((stop) => `${stop.color} ${Math.round(stop.position * 100)}%`)
    .join(", ")
  const gradientCss =
    stopCount <= 1
      ? primaryHex
      :
    gradientType === "mesh"
      ? gradientPreviewCss("mesh", normalizedStops)
      : gradientType === "radial"
      ? `radial-gradient(circle at 35% 35%, ${gradientStopsCss})`
      : gradientType === "conic"
        ? `conic-gradient(from 45deg, ${gradientStopsCss}, ${normalizedStops[0]?.color ?? primaryHex})`
        : `linear-gradient(90deg, ${gradientStopsCss})`

  // Direct text input binding
  const [inputText, setInputText] = React.useState(hex)
  const hexInputValue = React.useMemo(() => {
    const normalizedHex = hex.replace(/^#/, "").slice(0, 6)
    if (!ENABLE_ALPHA) return `#${normalizedHex}`
    const alphaHex = Math.round(Math.max(0, Math.min(1, activeAlpha)) * 255).toString(16).padStart(2, "0")
    return activeAlpha < 1 ? `#${normalizedHex}${alphaHex}` : `#${normalizedHex}`
  }, [hex, activeAlpha])
  React.useEffect(() => {
    setInputText(hexInputValue)
  }, [hexInputValue])

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

    bindWindowTouchMouseDrag({
      onMove: (moveEvent) => {
      const moveX = "touches" in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX
      const moveY = "touches" in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY
      handleCanvasDrag(moveX, moveY)
      },
    })
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

    bindWindowTouchMouseDrag({
      onMove: (moveEvent) => {
      const moveX = "touches" in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX
      handleHueDrag(moveX)
      },
    })
  }

  const handleAlphaDrag = React.useCallback((clientX: number) => {
    if (!alphaRef.current) return
    const rect = alphaRef.current.getBoundingClientRect()
    const nextAlpha = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    activeOnAlphaChange(Number(nextAlpha.toFixed(3)))
  }, [activeOnAlphaChange])

  const handleAlphaStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    handleAlphaDrag(clientX)

    bindWindowTouchMouseDrag({
      onMove: (moveEvent) => {
      const moveX = "touches" in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX
      handleAlphaDrag(moveX)
      },
    })
  }

  const updateStopPosition = React.useCallback((stopId: string, nextPosition: number) => {
    const position = Number(Math.max(0, Math.min(1, nextPosition)).toFixed(3))
    const previousIndex = normalizedStops.findIndex((stop) => stop.id === stopId)
    if (previousIndex < 0) return
    if (onStopsChange) {
      const nextStops = normalizedStops
        .map((item) => item.id === stopId ? { ...item, position } : item)
        .sort((a, b) => a.position - b.position)
      updateStops(nextStops)
      const nextIndex = nextStops.findIndex((stop) => stop.id === stopId)
      setActiveStop(Math.max(0, nextIndex))
      setOpenStopEditor((open) => open === previousIndex ? Math.max(0, nextIndex) : open)
    }
    onStopPositionChange?.(previousIndex, position)
  }, [normalizedStops, onStopPositionChange, onStopsChange, updateStops])

  const updateStopColor = React.useCallback((stopId: string, nextColor: string) => {
    const stopIndex = normalizedStops.findIndex((stop) => stop.id === stopId)
    if (stopIndex < 0) return
    setActiveStop(stopIndex)
    if (onStopsChange) {
      updateStops(normalizedStops.map((stop) => stop.id === stopId ? { ...stop, color: nextColor } : stop))
      return
    }
    if (isGradient && stopIndex === 1 && onSecondaryChange) onSecondaryChange(nextColor)
    else onChange(nextColor)
  }, [isGradient, normalizedStops, onChange, onSecondaryChange, onStopsChange, updateStops])

  const handleStopDrag = (stopId: string, clientX: number) => {
    if (!gradientRailRef.current) return
    const rect = gradientRailRef.current.getBoundingClientRect()
    const position = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    updateStopPosition(stopId, position)
  }

  const handleStopPointerDown = (stop: number, e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const stopId = normalizedStops[stop]?.id
    if (!stopId) return
    const startX = e.clientX
    let moved = false
    setActiveStop(stop)
    bindWindowPointerDrag({
      onMove: (event) => {
        if (!moved && Math.abs(event.clientX - startX) < 3) return
        moved = true
        handleStopDrag(stopId, event.clientX)
      },
      onEnd: () => {
        if (!moved) {
          window.setTimeout(() => {
            setActiveStop(stop)
            setOpenStopEditor(stop)
          }, 0)
        }
      },
    })
  }

  const commitStopPositionInput = (stopId: string, rawValue: string) => {
    const parsed = Number.parseFloat(rawValue.replace("%", ""))
    if (!Number.isFinite(parsed)) return
    updateStopPosition(stopId, parsed / 100)
  }

  const commitStopColorInput = (stopId: string, rawValue: string, input?: HTMLInputElement) => {
    const nextColor = parseHexColorInput(rawValue)
    if (!nextColor) {
      const currentColor = normalizedStops.find((stop) => stop.id === stopId)?.color
      if (input && currentColor) input.value = currentColor.replace(/^#/, "").toUpperCase()
      return
    }
    updateStopColor(stopId, nextColor)
    if (input) input.value = nextColor.replace(/^#/, "")
  }

  const colorAtPosition = React.useCallback((position: number) => {
    return colorAtStopPosition(normalizedStops, position, primaryHex)
  }, [normalizedStops, primaryHex])

  const addStopAtRailPosition = (clientX: number, clientY?: number) => {
    if (!gradientRailRef.current || !onStopsChange) return
    const rect = gradientRailRef.current.getBoundingClientRect()
    const position = Number(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)).toFixed(3))
    const point = {
      x: position,
      y: clientY === undefined ? 0.5 : clamp01((clientY - rect.top) / rect.height),
    }
    const sampledColor = colorAtGradientPoint(gradientType, normalizedStops, point, primaryHex)
    const nextStops = [...normalizedStops, { color: sampledColor, position }]
      .sort((a, b) => a.position - b.position)
    const nextIndex = nextStops.findIndex((stop) => Math.abs(stop.position - position) < 0.0005 && stop.color.toLowerCase() === sampledColor.toLowerCase())
    updateStops(nextStops)
    setActiveStop(Math.max(0, nextIndex))
    setOpenStopEditor(Math.max(0, nextIndex))
  }

  // Keyboard hex inputs
  const handleTextChange = (val: string) => {
    setInputText(val)
    let formatted = val.trim()
    if (!formatted.startsWith("#")) {
      formatted = `#${formatted}`
    }
    const hexMatch = formatted.match(/^#([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})?$/)
    if (hexMatch) {
      activeOnChange(`#${hexMatch[1]}`)
      if (ENABLE_ALPHA && hexMatch[2]) {
        activeOnAlphaChange(Number((parseInt(hexMatch[2], 16) / 255).toFixed(3)))
      }
    }
  }

  const handleAlphaChange = (val: string) => {
    const parsed = Number.parseFloat(val)
    if (!Number.isFinite(parsed)) return
    activeOnAlphaChange(Math.max(0, Math.min(1, parsed / 100)))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      let formatted = inputText.trim()
      if (!formatted.startsWith("#")) {
        formatted = `#${formatted}`
      }
      const hexMatch = formatted.match(/^#([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})?$/)
      if (hexMatch) {
        activeOnChange(`#${hexMatch[1]}`)
        if (ENABLE_ALPHA && hexMatch[2]) {
          activeOnAlphaChange(Number((parseInt(hexMatch[2], 16) / 255).toFixed(3)))
        }
      } else {
        setInputText(hexInputValue) // revert
      }
      e.currentTarget.blur()
    }
  }

  const handleBlur = () => {
    let formatted = inputText.trim()
    if (!formatted.startsWith("#")) {
      formatted = `#${formatted}`
    }
    const hexMatch = formatted.match(/^#([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})?$/)
    if (hexMatch) {
      activeOnChange(`#${hexMatch[1]}`)
      if (ENABLE_ALPHA && hexMatch[2]) {
        activeOnAlphaChange(Number((parseInt(hexMatch[2], 16) / 255).toFixed(3)))
      }
    } else {
      setInputText(hexInputValue) // revert
    }
  }

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open, eventDetails) => {
        if (!open && eventDetails.reason === "outside-press") {
          const event = eventDetails.event
          if ("clientX" in event && "clientY" in event) {
            rootOutsidePointerRef.current = { x: event.clientX, y: event.clientY }
            eventDetails.cancel()
            return
          }
        }
        setIsOpen(open)
      }}
    >
      <PopoverTrigger
        ref={rootTriggerRef}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-border bg-muted/45 px-2.5 py-2 text-left transition-colors hover:border-ring/50 hover:bg-muted/70 focus:outline-none focus:ring-2 focus:ring-ring/35 active:scale-[0.99]",
          className
        )}
      >
        <div
          className="size-4 shrink-0 rounded-md border border-border shadow-sm"
          style={{ background: isGradient ? gradientCss : primaryHex }}
        />
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] font-medium uppercase tracking-wide text-foreground">
          {isGradient ? "Gradient" : primaryHex}
        </span>
      </PopoverTrigger>

      <PopoverContent
        ref={rootContentRef}
        className={cn(
          "z-50 select-none overflow-hidden rounded-xl border border-border bg-popover p-0 text-popover-foreground shadow-2xl backdrop-blur-xl",
          "w-[260px]"
        )}
        align="start"
        sideOffset={6}
      >
        <div className={cn("space-y-3", isGradient ? "py-2 pb-2" : "p-3 pb-2")}>
          {supportsGradient && (
            <div className={cn(
              "flex items-center gap-1 rounded-lg border border-border bg-muted/45 p-0.5",
              isGradient && "mx-2"
            )}>
              <button
                type="button"
                onClick={() => onGradientToggle?.(false)}
                className={cn(
                  "h-7 flex-1 rounded-md text-[10px] font-medium transition-colors",
                  !isGradient ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                Solid
              </button>
              {VISIBLE_GRADIENT_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => {
                    onGradientToggle?.(true)
                    onGradientTypeChange?.(type.id)
                  }}
                  className={cn(
                    "h-7 flex-1 rounded-md text-[10px] font-medium transition-colors",
                    isGradient && gradientType === type.id ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          )}

          {isGradient && (
            <div className="space-y-3">
              <div
                ref={gradientRailRef}
                className="relative mx-5 mt-7 h-9 rounded-md border border-border bg-muted/35"
                onPointerDown={(event) => {
                  if (event.button !== 0) return
                  event.preventDefault()
                  addStopAtRailPosition(event.clientX, event.clientY)
                }}
              >
                <div
                  className="absolute inset-px rounded-[5px]"
                  style={{ background: gradientCss }}
                />
                {visibleStops.map((stop) => (
                  <button
                    key={`gradient-stop-${normalizedStops[stop].id}`}
                    type="button"
                    aria-label={stop === 0 ? "Edit first gradient stop" : "Edit second gradient stop"}
                    onPointerDown={(event) => handleStopPointerDown(stop, event)}
                    className={cn(
                      "absolute -top-5 flex size-7 -translate-x-1/2 touch-none items-center justify-center rounded-[7px] shadow-[0_2px_7px_rgba(0,0,0,0.35)] transition-colors after:absolute after:left-1/2 after:bottom-[-5px] after:h-0 after:w-0 after:-translate-x-1/2 after:border-x-[5px] after:border-t-[6px] after:border-x-transparent",
                      activeStop === stop || openStopEditor === stop
                        ? "bg-primary after:border-t-primary"
                        : "bg-muted after:border-t-muted hover:bg-muted/80 hover:after:border-t-muted/80"
                    )}
                    style={{ left: `${normalizedStops[stop].position * 100}%` }}
                  >
                    <span className="relative z-10 size-4.5 rounded-[5px] border border-background/65 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]" style={{ backgroundColor: normalizedStops[stop].color }} />
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <div className="grid h-6 grid-cols-[1fr_28px] items-center gap-1 px-2">
                  <span className="text-[13px] font-semibold text-foreground">Stops</span>
                  <button
                    type="button"
                    className="ml-1 flex size-6 items-center justify-center rounded-md text-xl font-light leading-none text-foreground hover:bg-muted"
                    onClick={() => {
                      const position = 0.5
                      const nextStops = [...normalizedStops, { color: colorAtPosition(position), position }]
                        .sort((a, b) => a.position - b.position)
                      updateStops(nextStops)
                      const nextIndex = nextStops.findIndex((stop) => Math.abs(stop.position - position) < 0.0005)
                      setActiveStop(Math.max(0, nextIndex))
                      setOpenStopEditor(Math.max(0, nextIndex))
                    }}
                  >
                    +
                  </button>
                </div>
                {visibleStops.map((stop) => {
                  const active = openStopEditor === stop
                  const stopItem = normalizedStops[stop]
                  const stopColor = stopItem.color
                  return (
                    <div
                      key={`stop-row-${stopItem.id}`}
                      onClick={() => {
                        setActiveStop(stop)
                      }}
                      className={cn(
                        "grid h-8 w-full grid-cols-[48px_minmax(0,1fr)_28px] items-center gap-x-1.5 px-2 text-left text-[13px]",
                        active ? "bg-accent text-accent-foreground" : "hover:bg-muted/60"
                      )}
                    >
                      <label
                        className="flex h-7 items-center rounded-md bg-muted/60 px-1.5 font-mono tabular-nums text-foreground focus-within:ring-2 focus-within:ring-ring/35"
                        onClick={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        <input
                          key={`${stopItem.id}-${Math.round(stopItem.position * 1000)}`}
                          type="text"
                          inputMode="decimal"
                          aria-label={`Stop ${stop + 1} position`}
                          defaultValue={Math.round(stopItem.position * 100)}
                          className="h-full min-w-0 flex-1 bg-transparent p-0 text-center font-mono text-[13px] text-foreground outline-none"
                          onFocus={(event) => {
                            setActiveStop(stop)
                            event.currentTarget.select()
                          }}
                          onBlur={(event) => commitStopPositionInput(stopItem.id, event.currentTarget.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              commitStopPositionInput(stopItem.id, event.currentTarget.value)
                              event.currentTarget.blur()
                            }
                            if (event.key === "Escape") {
                              event.currentTarget.value = String(Math.round(stopItem.position * 100))
                              event.currentTarget.blur()
                            }
                          }}
                        />
                        <span className="text-[12px] text-muted-foreground">%</span>
                      </label>
                      <span className="flex h-7 min-w-0 items-center gap-2 rounded-md bg-muted/60 px-2 font-mono uppercase text-foreground focus-within:ring-2 focus-within:ring-ring/35" onClick={(event) => event.stopPropagation()}>
                        <Popover
                          open={openStopEditor === stop}
                          onOpenChange={(open, eventDetails) => {
                            if (!open && eventDetails.reason === "outside-press") {
                              const event = eventDetails.event
                              if ("clientX" in event && "clientY" in event) {
                                stopOutsidePointerRef.current = { x: event.clientX, y: event.clientY }
                                eventDetails.cancel()
                                return
                              }
                            }
                            setOpenStopEditor(open ? stop : null)
                            if (open) setActiveStop(stop)
                          }}
                        >
                          <PopoverTrigger className="size-4.5 shrink-0 rounded-[4px] border border-border focus:outline-none focus:ring-2 focus:ring-ring/35" style={{ backgroundColor: stopColor }} />
                          <PopoverContent
                            ref={stopContentRef}
                            align="start"
                            side="left"
                            sideOffset={12}
                            className="w-[210px] rounded-xl border border-border bg-popover p-3 pb-2 text-popover-foreground shadow-2xl backdrop-blur-xl"
                            onClick={(event) => event.stopPropagation()}
                            onPointerDown={(event) => event.stopPropagation()}
                          >
                            <SolidColorEditor
                              h={h}
                              s={s}
                              v={v}
                              hex={hex}
                              alpha={activeAlpha}
                              inputText={inputText}
                              format={format}
                              setFormat={setFormat}
                              setInputText={setInputText}
                              canvasRef={canvasRef}
                              hueRef={hueRef}
                              alphaRef={alphaRef}
                              handleCanvasStart={handleCanvasStart}
                              handleHueStart={handleHueStart}
                              handleAlphaStart={handleAlphaStart}
                              handleAlphaChange={handleAlphaChange}
                              handleTextChange={handleTextChange}
                              handleKeyDown={handleKeyDown}
                              handleBlur={handleBlur}
                              framed={false}
                              compact
                            />
                          </PopoverContent>
                        </Popover>
                        <input
                          key={`${stopItem.id}-${stopColor}`}
                          type="text"
                          spellCheck={false}
                          aria-label={`Stop ${stop + 1} color`}
                          defaultValue={stopColor.replace(/^#/, "").toUpperCase()}
                          className="h-full min-w-0 flex-1 bg-transparent p-0 font-mono text-[12px] uppercase text-foreground outline-none"
                          onFocus={(event) => {
                            setActiveStop(stop)
                            event.currentTarget.select()
                          }}
                          onBlur={(event) => commitStopColorInput(stopItem.id, event.currentTarget.value, event.currentTarget)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              commitStopColorInput(stopItem.id, event.currentTarget.value, event.currentTarget)
                              event.currentTarget.blur()
                            }
                            if (event.key === "Escape") {
                              event.currentTarget.value = stopColor.replace(/^#/, "").toUpperCase()
                              event.currentTarget.blur()
                            }
                          }}
                          onClick={(event) => event.stopPropagation()}
                          onPointerDown={(event) => event.stopPropagation()}
                        />
                      </span>
                      <button
                        type="button"
                        aria-label="Remove gradient stop"
                        disabled={!canRemoveStop}
                        className={cn(
                          "ml-0.5 flex size-6 items-center justify-center rounded-md text-xl font-light focus:outline-none focus:ring-2 focus:ring-ring/35",
                          canRemoveStop
                            ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                            : "cursor-default text-muted-foreground/35"
                        )}
                        onClick={(event) => {
                          event.stopPropagation()
                          if (!canRemoveStop) return
                          onStopRemove?.(stop)
                        }}
                      >
                        −
                      </button>
                    </div>
                  )}
                )}
              </div>

              <div className="space-y-1.5 px-2">
                <div className="flex h-6 items-center justify-between">
                  <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Presets</div>
                  {gradientType === "mesh" && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title="Shuffle mesh point positions"
                        aria-label="Shuffle mesh point positions"
                        className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/35"
                        onClick={(event) => {
                          event.stopPropagation()
                          shuffleMeshPoints()
                        }}
                      >
                        <Move className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Shuffle mesh colors"
                        aria-label="Shuffle mesh colors"
                        className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/35"
                        onClick={(event) => {
                          event.stopPropagation()
                          shuffleMeshStops()
                        }}
                      >
                        <Shuffle className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {GRADIENT_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      title={preset.name}
                      aria-label={`Use ${preset.name} gradient`}
                      className="group flex h-8 min-w-0 items-center justify-center rounded-md border border-border bg-muted/35 p-1 transition-colors hover:border-ring/50 hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-ring/35"
                      onPointerDown={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        applyGradientPreset(preset)
                      }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <span
                        className="block h-full w-full rounded-[5px] border border-border shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
                        style={{ background: gradientPreviewCss(preset.type, preset.stops) }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!isGradient && (
            <SolidColorEditor
              h={h}
              s={s}
              v={v}
              hex={hex}
              alpha={activeAlpha}
              inputText={inputText}
              format={format}
              setFormat={setFormat}
              setInputText={setInputText}
              canvasRef={canvasRef}
              hueRef={hueRef}
              alphaRef={alphaRef}
              handleCanvasStart={handleCanvasStart}
              handleHueStart={handleHueStart}
              handleAlphaStart={handleAlphaStart}
              handleAlphaChange={handleAlphaChange}
              handleTextChange={handleTextChange}
              handleKeyDown={handleKeyDown}
              handleBlur={handleBlur}
              framed={false}
              compact
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
