'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play, Pause,
  Upload, Download,
  ArrowUpLeft, ArrowUp, ArrowUpRight, ArrowLeft, ArrowRight, ArrowDownLeft, ArrowDown, ArrowDownRight, Compass,
  PanelLeftClose, PanelLeftOpen, ChevronDown,
  MoreHorizontal, ChevronLeft, ChevronRight, SkipBack, SkipForward, Moon, Sun, Link2, Unlink2
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ColorPicker, CompactColorInput } from '@/components/ui/color-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { fetchMaterialSymbolIcon, PRESET_ICONS, PresetIcon } from './IconLibrary';
import { SvgCanvas, SvgCanvasRef } from '../3d/SvgCanvas';
import { MaterialPresetId } from '../3d/MaterialPresets';
import { Timeline, TimelineTrack, TimelinePropertyRow, interpolateKeyframes, interpolateFillKeyframes, applyEasing, EasingType, ShapeStop, FillStop, FillKeyframe, FillGradientType, DEFAULT_TRANSITION_START, DEFAULT_TRANSITION_END } from './Timeline';
import { ExportModal } from './ExportModal';
import { MOTION_RECIPES } from './MotionRecipes';
import { MATERIAL_WIPE_READY_PAIRS } from './MaterialWipePairs';
import { bindWindowPointerDrag } from '@/lib/drag-events';

const directions = [
  { label: '↖', x: -0.707, y: 0.707, tooltip: 'Top Left to Bottom Right' },
  { label: '↑', x: 0, y: 1, tooltip: 'Bottom to Top' },
  { label: '↗', x: 0.707, y: 0.707, tooltip: 'Top Right to Bottom Left' },
  { label: '←', x: -1, y: 0, tooltip: 'Right to Left' },
  { label: '•', x: 0, y: 0, tooltip: 'Cinematic Cross-Fade' },
  { label: '→', x: 1, y: 0, tooltip: 'Left to Right' },
  { label: '↙', x: -0.707, y: -0.707, tooltip: 'Bottom Left to Top Right' },
  { label: '↓', x: 0, y: -1, tooltip: 'Top to Bottom' },
  { label: '↘', x: 0.707, y: -0.707, tooltip: 'Bottom Right to Top Left' },
];

const MATERIAL_METADATA: Record<MaterialPresetId, { name: string; subtitle: string; description: string; glowColor: string }> = {
  frost: {
    name: "Frost",
    subtitle: "Soft Translucent",
    description: "A milky translucent finish with soft internal color and restrained highlights. Distinct from satin without becoming full glass.",
    glowColor: "rgba(186, 230, 253, 0.24)"
  },
  satin: {
    name: "Satin",
    subtitle: "Google PBR",
    description: "A Google-inspired tactile surface with moderate roughness, a tiny metallic lift, and a small emissive boost.",
    glowColor: "rgba(66, 133, 244, 0.24)"
  },
  glass: {
    name: "Glass",
    subtitle: "Clear Refraction",
    description: "A subtle translucent finish with controlled highlights. Useful when depth matters without making the shape disappear.",
    glowColor: "rgba(14, 165, 233, 0.25)"
  },
  chrome: {
    name: "Metal",
    subtitle: "Studio Chrome",
    description: "A vivid reflective finish with studio-box highlights. It keeps mesh color readable instead of crushing it into black.",
    glowColor: "rgba(125, 211, 252, 0.28)"
  },
  pearl: {
    name: "Pearl",
    subtitle: "Soft Iridescent",
    description: "A bright ceramic finish with soft pearlescent sheen. It feels lighter and more dimensional than glossy paint.",
    glowColor: "rgba(216, 180, 254, 0.24)"
  },
  lacquer: {
    name: "Lacquer",
    subtitle: "Gloss Paint",
    description: "A polished enamel-like finish with strong clearcoat and clean color. Useful for app-icon surfaces.",
    glowColor: "rgba(244, 63, 94, 0.2)"
  },
  custom: {
    name: "Custom",
    subtitle: "Advanced",
    description: "Manual roughness, metal, coat, transparency, and emission controls.",
    glowColor: "rgba(124, 92, 255, 0.25)"
  }
};

// Sphere-like preview gradients so each material reads at a glance.
const MATERIAL_PREVIEW: Record<MaterialPresetId, string> = {
  frost: 'radial-gradient(circle at 32% 24%, #ffffff 0%, rgba(226,244,255,.9) 28%, rgba(148,197,255,.42) 56%, rgba(196,181,253,.38) 100%)',
  satin: 'radial-gradient(circle at 28% 24%, #ffffff 0%, #ff9900 16%, #807aff 42%, #00c796 72%, #1759ff 100%)',
  glass: 'radial-gradient(circle at 30% 24%, #ffffff, rgba(186,230,253,.92) 30%, rgba(59,130,246,.18) 62%, rgba(14,116,144,.46))',
  chrome: 'radial-gradient(circle at 30% 22%, #ffffff 0%, #e0f2fe 18%, #64748b 31%, #ffffff 43%, #38bdf8 58%, #f8fafc 68%, #27272a 100%)',
  pearl: 'radial-gradient(circle at 30% 24%, #ffffff 0%, #fdf4ff 24%, #bae6fd 44%, #d8b4fe 66%, #64748b 100%)',
  lacquer: 'radial-gradient(circle at 34% 26%, #ffffff 0%, #fecdd3 18%, #fb7185 48%, #be123c 100%)',
  custom: 'radial-gradient(circle at 34% 28%, #ede9fe, #a78bfa 45%, #6d28d9)',
};

const FINISH_PRESETS: MaterialPresetId[] = ['frost', 'satin', 'glass', 'chrome', 'pearl', 'lacquer'];

interface CuratedPalette {
  name: string;
  enableGradient: boolean;
  colorA: string;
  colorASecondary?: string;
  colorB: string;
  colorBSecondary?: string;
  glowColor: string;
}

const CURATED_PALETTES: CuratedPalette[] = [
  {
    name: "Sunset Silk",
    enableGradient: true,
    colorA: "#ff5b9a",
    colorASecondary: "#7c5cff",
    colorB: "#ffd23f",
    colorBSecondary: "#ff5b9a",
    glowColor: "linear-gradient(135deg, #ff5b9a 0%, #7c5cff 50%, #ffd23f 100%)"
  },
  {
    name: "Midnight Neon",
    enableGradient: true,
    colorA: "#7c5cff",
    colorASecondary: "#0ea5e9",
    colorB: "#0ea5e9",
    colorBSecondary: "#4ee2a3",
    glowColor: "linear-gradient(135deg, #7c5cff 0%, #0ea5e9 50%, #4ee2a3 100%)"
  },
  {
    name: "Emerald Aurora",
    enableGradient: true,
    colorA: "#10b981",
    colorASecondary: "#06b6d4",
    colorB: "#84cc16",
    colorBSecondary: "#10b981",
    glowColor: "linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #84cc16 100%)"
  },
  {
    name: "Royal Velvet",
    enableGradient: true,
    colorA: "#db2777",
    colorASecondary: "#6d28d9",
    colorB: "#a21caf",
    colorBSecondary: "#f43f5e",
    glowColor: "linear-gradient(135deg, #db2777 0%, #6d28d9 50%, #f43f5e 100%)"
  },
  {
    name: "Warm Gold",
    enableGradient: false,
    colorA: "#ffd700",
    colorB: "#ffcc4d",
    glowColor: "linear-gradient(135deg, #ffd700 0%, #ffcc4d 100%)"
  },
  {
    name: "Monochrome Steel",
    enableGradient: false,
    colorA: "#f4f4f5",
    colorB: "#71717a",
    glowColor: "linear-gradient(135deg, #f4f4f5 0%, #71717a 100%)"
  }
];

const getDirectionIcon = (label: string, className = "w-4 h-4") => {
  switch (label) {
    case '↖': return <ArrowUpLeft className={className} />;
    case '↑': return <ArrowUp className={className} />;
    case '↗': return <ArrowUpRight className={className} />;
    case '←': return <ArrowLeft className={className} />;
    case '•': return <Compass className={className} />;
    case '→': return <ArrowRight className={className} />;
    case '↙': return <ArrowDownLeft className={className} />;
    case '↓': return <ArrowDown className={className} />;
    case '↘': return <ArrowDownRight className={className} />;
    default: return <Compass className={className} />;
  }
};

const finiteNumber = (value: number | undefined | null, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const clampNumber = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const TIMELINE_FRAME_RATE = 60;
const quantizeTimeToFrame = (time: number) =>
  Number((Math.round(time * TIMELINE_FRAME_RATE) / TIMELINE_FRAME_RATE).toFixed(3));

const isEditableShortcutTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'));

const normalizeDegrees = (value: number) => ((value % 360) + 360) % 360;

type FillMode = 'solid' | 'gradient';
type MotionTrackId = 'extrusion' | 'rotation' | 'scale' | 'move' | 'lighting';
type LightPosition = { x: number; y: number; z: number };
type Vector3Keyframe = {
  id: string;
  time: number;
  value: LightPosition;
  easing: EasingType;
};
type LightPositionKeyframe = Vector3Keyframe;
type ScalarKeyframe = {
  id: string;
  time: number;
  value: number;
  easing: EasingType;
};
type MaterialSettings = {
  roughness: number;
  metalness: number;
  reflectance: number;
  clearcoat: number;
  clearcoatRoughness: number;
  transmission: number;
  thickness: number;
  emissiveIntensity: number;
};
type MaterialSettingKey = keyof MaterialSettings;
type MaterialKeyframe = {
  id: string;
  time: number;
  value: MaterialSettings;
  easing: EasingType;
};
type TimeKeyframe = { time: number };
type EditorSnapshot = {
  activeRecipeId: string | null;
  shapes: ShapeStop[];
  duration: number;
  materialPreset: MaterialPresetId;
  roughness: number;
  metalness: number;
  reflectance: number;
  clearcoat: number;
  clearcoatRoughness: number;
  transmission: number;
  thickness: number;
  emissiveIntensity: number;
  materialKeyframes: MaterialKeyframe[];
  extrusionDepth: number;
  bevelEnabled: boolean;
  bevelThickness: number;
  bevelSize: number;
  bevelSegments: number;
  geometryQuality: number;
  qualityKeyframes: ScalarKeyframe[];
  layerSpacing: number;
  innerElementScale: LightPosition;
  innerScaleKeyframes: Vector3Keyframe[];
  objectScale: number;
  objectScaleAxes: LightPosition;
  moveOffset: LightPosition;
  moveKeyframes: Vector3Keyframe[];
  enableGradient: boolean;
  fillMode: FillMode;
  fillColor: string;
  fillColorSecondary: string;
  fillGradientType: FillGradientType;
  fillStops?: FillStop[];
  fillKeyframes: FillKeyframe[];
  rotationOffset: LightPosition;
  keyLightColor: string;
  keyLightIntensity: number;
  keyLightPosition: LightPosition;
  keyLightSoftness: number;
  keyLightPositionKeyframes: LightPositionKeyframe[];
  tracks: TimelineTrack[];
};

const FILL_MODES: Array<{ id: FillMode; label: string }> = [
  { id: 'solid', label: 'Solid' },
  { id: 'gradient', label: 'Gradient' },
];

const EXTRUDE_DEFAULT = 10;
const EXTRUDE_MAX = 60;
const SCALE_DEFAULT = 1;
const SCALE_MAX = 3;
const GEOMETRY_QUALITY_DEFAULT = 0.045;
const LIGHT_MAX = 25;
const MAX_BEVEL_SEGMENTS = 24;
const DEFAULT_ROTATION_START = 0;
const DEFAULT_ROTATION_END = 360;
const ROTATION_MIN = -1440;
const ROTATION_MAX = 1440;
const MOVE_COLOR = '#38bdf8';
const MAX_UNDO_STEPS = 80;

const AXIS_COLORS: Record<string, string> = {
  X: '#c4766f',
  Y: '#7dac8e',
  Z: '#7e9bbe',
};

const MOTION_TRACK_NAMES: Record<MotionTrackId, string> = {
  extrusion: 'Extrude',
  rotation: 'Rotation',
  scale: 'Scale',
  move: 'Move',
  lighting: 'Brightness',
};

const makeFillStops = (color: string, colorSecondary: string, solid = false, positions: [number, number] = [0, 1]): FillStop[] => [
  { id: 'start', color, position: positions[0] },
  { id: 'end', color: solid ? color : colorSecondary, position: positions[1] },
];

const GOOGLE_MESH_FILL_STOPS: FillStop[] = [
  { id: 'google-top-left', color: '#FF9900', position: 0 },
  { id: 'google-top-center', color: '#FF360A', position: 0.125 },
  { id: 'google-top-right', color: '#D13AB3', position: 0.25 },
  { id: 'google-middle-left', color: '#FFC700', position: 0.375 },
  { id: 'google-center', color: '#807AFF', position: 0.5 },
  { id: 'google-middle-right', color: '#1759FF', position: 0.625 },
  { id: 'google-bottom-left', color: '#63E600', position: 0.75 },
  { id: 'google-bottom-center', color: '#00C796', position: 0.875 },
  { id: 'google-bottom-right', color: '#00ADF0', position: 1 },
];

const googleMeshFillStops = (): FillStop[] => GOOGLE_MESH_FILL_STOPS.map((stop) => ({ ...stop }));

const normalizeFillStops = (stops: Array<{ id?: string; color: string; position: number }>): FillStop[] => {
  const usedIds = new Set<string>();
  const nextStopId = (id: string | undefined, index: number) => {
    const baseId = id?.trim() || `stop-${index}`;
    if (!usedIds.has(baseId)) {
      usedIds.add(baseId);
      return baseId;
    }
    let suffix = 2;
    let nextId = `${baseId}-${suffix}`;
    while (usedIds.has(nextId)) {
      suffix += 1;
      nextId = `${baseId}-${suffix}`;
    }
    usedIds.add(nextId);
    return nextId;
  };

  return stops
    .map((stop, index) => ({
      id: nextStopId(stop.id, index),
      color: stop.color.startsWith('#') ? stop.color : `#${stop.color}`,
      position: clampNumber(stop.position, 0, 1),
    }))
    .sort((a, b) => a.position - b.position);
};

const stopsForGradientType = (
  current: { color: string; colorSecondary: string; gradientType?: FillGradientType; stops?: FillStop[] },
  nextType: FillGradientType,
  solid = false
) => {
  const stops = normalizeFillStops(current.stops?.length
    ? current.stops
    : makeFillStops(current.color, current.colorSecondary, solid));

  if (solid) return makeFillStops(current.color, current.color, true);
  return stops;
};

const interpolateLightPositionKeyframes = (
  time: number,
  fallback: LightPosition,
  keyframes: Vector3Keyframe[]
): LightPosition => {
  if (keyframes.length === 0) return fallback;
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  if (time <= sorted[0].time) return sorted[0].value;
  if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;

  const next = sorted.find((keyframe) => keyframe.time >= time);
  const previous = [...sorted].reverse().find((keyframe) => keyframe.time <= time);
  if (!previous || !next || previous.id === next.id) return previous?.value ?? next?.value ?? fallback;

  const rawProgress = (time - previous.time) / (next.time - previous.time);
  const eased = applyEasing(previous.easing, rawProgress);
  return {
    x: previous.value.x + (next.value.x - previous.value.x) * eased,
    y: previous.value.y + (next.value.y - previous.value.y) * eased,
    z: previous.value.z + (next.value.z - previous.value.z) * eased,
  };
};

const interpolateScalarKeyframes = (
  time: number,
  fallback: number,
  keyframes: ScalarKeyframe[]
): number => {
  if (keyframes.length === 0) return fallback;
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  if (time <= sorted[0].time) return sorted[0].value;
  if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;

  const next = sorted.find((kf) => kf.time >= time);
  const previous = [...sorted].reverse().find((kf) => kf.time <= time);
  if (!previous || !next || previous.id === next.id) return previous?.value ?? next?.value ?? fallback;

  const eased = applyEasing(previous.easing, (time - previous.time) / (next.time - previous.time));
  return previous.value + (next.value - previous.value) * eased;
};

const interpolateMaterialKeyframes = (
  time: number,
  fallback: MaterialSettings,
  keyframes: MaterialKeyframe[]
): MaterialSettings => {
  if (keyframes.length === 0) return fallback;
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  if (time <= sorted[0].time) return sorted[0].value;
  if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;

  const next = sorted.find((keyframe) => keyframe.time >= time);
  const previous = [...sorted].reverse().find((keyframe) => keyframe.time <= time);
  if (!previous || !next || previous.id === next.id) return previous?.value ?? next?.value ?? fallback;

  const eased = applyEasing(previous.easing, (time - previous.time) / (next.time - previous.time));
  return (Object.keys(fallback) as MaterialSettingKey[]).reduce((settings, key) => {
    settings[key] = previous.value[key] + (next.value[key] - previous.value[key]) * eased;
    return settings;
  }, { ...fallback });
};

// Module-level drag flag — lets the undo effect skip snapshots during scrub
let __inputDragActive = false;

function NumberField({
  value,
  min,
  max,
  step,
  scrubStep,
  prefix,
  prefixColor,
  suffix = '',
  precision = 1,
  className = 'w-[62px]',
  inputClassName = 'text-right',
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  scrubStep?: number;
  prefix?: string;
  prefixColor?: string;
  suffix?: string;
  precision?: number;
  className?: string;
  inputClassName?: string;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(() => value.toFixed(precision));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value.toFixed(precision));
  }, [value, precision]);

  const commit = () => {
    const parsed = Number.parseFloat(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(value.toFixed(precision));
      return;
    }
    onChange(clampNumber(parsed, min, max));
  };

  // Figma-style scrub: drag horizontally to change the value; a clean click focuses for typing.
  const startScrub = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const startX = e.clientX;
    const startValue = value;
    const effectiveScrubStep = scrubStep ?? (step < 0.05 ? step * 2 : step);
    let moved = false;
    __inputDragActive = true;
    bindWindowPointerDrag({
      onMove: (ev) => {
        const dx = ev.clientX - startX;
        if (Math.abs(dx) > 3) moved = true;
        if (!moved) return;
        document.body.style.cursor = 'ew-resize';
        const next = clampNumber(startValue + Math.round(dx / 3) * effectiveScrubStep, min, max);
        const rounded = Number(next.toFixed(precision));
        setDraft(rounded.toFixed(precision));
        onChange(rounded);
      },
      onEnd: () => {
        __inputDragActive = false;
        document.body.style.cursor = '';
        if (!moved) inputRef.current?.focus();
      },
    });
  };

  return (
    <div
      onPointerDown={startScrub}
      onLostPointerCapture={() => {
        document.body.style.cursor = '';
      }}
      title="Drag to adjust · click to type"
      className={`flex h-7 cursor-ew-resize items-center rounded-[8px] bg-muted/70 px-2 text-foreground transition-colors hover:bg-muted focus-within:bg-muted focus-within:ring-1 focus-within:ring-ring/25 ${className}`}
    >
      {prefix && <span className={`mr-1 text-[11px] leading-none ${prefixColor ? 'font-medium' : 'font-medium text-muted-foreground'}`} style={prefixColor ? { color: prefixColor } : undefined}>{prefix}</span>}
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
          if (event.key === 'Enter') {
            commit();
            event.currentTarget.blur();
          }
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            const direction = event.key === 'ArrowUp' ? 1 : -1;
            onChange(clampNumber(value + step * direction, min, max));
          }
        }}
        className={`min-w-0 flex-1 cursor-ew-resize bg-transparent text-[12px] tabular-nums text-foreground outline-none focus:cursor-text ${inputClassName}`}
      />
      {suffix && <span className="pl-0.5 text-[10px] text-muted-foreground">{suffix}</span>}
    </div>
  );
}

function InspectorSlider({
  value,
  min,
  max,
  sliderMin = min,
  sliderMax = max,
  step,
  scrubStep,
  precision,
  inputClassName = 'w-[58px]',
  sliderClassName = 'flex-1',
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  sliderMin?: number;
  sliderMax?: number;
  step: number;
  scrubStep?: number;
  precision: number;
  inputClassName?: string;
  sliderClassName?: string;
  onChange: (value: number) => void;
}) {
  const sliderValue = clampNumber(value, sliderMin, sliderMax);
  const progress = sliderMax > sliderMin
    ? clampNumber((sliderValue - sliderMin) / (sliderMax - sliderMin), 0, 1)
    : 0;
  const thumbInset = 12;
  const thumbPosition = `calc(${thumbInset}px + ${progress} * (100% - ${thumbInset * 2}px))`;

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
        className={`relative h-7 min-w-0 overflow-hidden rounded-[8px] ${sliderClassName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <span
          className="pointer-events-none absolute inset-0 rounded-[8px] bg-muted/70 transition-colors"
        />
        <span
          className="pointer-events-none absolute inset-y-0 w-6 -translate-x-1/2 rounded-[8px] bg-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.26)] transition-colors"
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
          className="absolute inset-0 h-full w-full cursor-ew-resize appearance-none opacity-0"
        />
      </label>
    </>
  );
}

function AxisLockButton({
  locked,
  label,
  onToggle,
}: {
  locked: boolean;
  label: string;
  onToggle: () => void;
}) {
  const Icon = locked ? Link2 : Unlink2;
  return (
    <button
      type="button"
      aria-label={`${locked ? 'Unlock' : 'Lock'} ${label} axes`}
      title={locked ? `${label}: linked axes` : `${label}: separate axes`}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className={`ml-1 flex size-5 shrink-0 items-center justify-center rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40 ${
        locked
          ? 'bg-muted text-foreground hover:bg-muted/80'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <Icon className="size-3" />
    </button>
  );
}

const LIGHT_RANGE = 9;
// A draggable mini "lit sphere": the highlight marks where the key light sits,
// so dragging it visually orbits the light around the icon. Only mounts inside its popover.
function LightDirectionPicker({
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
  position: { x: number; y: number; z: number };
  color: string;
  softness: number;
  onDirectionChange: (x: number, y: number) => void;
  onColorChange: (color: string) => void;
  onSoftnessChange: (value: number) => void;
  isKeyed: boolean;
  onToggleKeyframe: () => void;
  keyframeControls?: React.ReactNode;
}) {
  const padRef = useRef<HTMLDivElement>(null);
  const nx = clampNumber(position.x / LIGHT_RANGE, -1, 1);
  const ny = clampNumber(position.y / LIGHT_RANGE, -1, 1);
  // Screen-space highlight (Y inverted so "up" on screen raises the light).
  const hx = 50 + nx * 42;
  const hy = 50 - ny * 42;

  const setFromPointer = (clientX: number, clientY: number) => {
    const rect = padRef.current?.getBoundingClientRect();
    if (!rect) return;
    let px = ((clientX - rect.left) / rect.width) * 2 - 1;
    let py = -(((clientY - rect.top) / rect.height) * 2 - 1);
    const len = Math.hypot(px, py);
    if (len > 1) { px /= len; py /= len; }
    onDirectionChange(Number((px * LIGHT_RANGE).toFixed(2)), Number((py * LIGHT_RANGE).toFixed(2)));
  };

  const handlePadDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setFromPointer(e.clientX, e.clientY);
    bindWindowPointerDrag({
      onMove: (ev) => setFromPointer(ev.clientX, ev.clientY),
    });
  };

  const triggerSphere = `radial-gradient(circle at ${hx}% ${hy}%, #f8fafc 0%, ${color} 32%, #3f3f46 72%, #18181b 100%)`;

  return (
    <Popover>
      <PopoverTrigger
        title="Light direction & color"
        className="flex h-7 shrink-0 items-center gap-1 rounded-md border border-border bg-muted/45 pl-1 pr-1.5 transition-colors hover:border-ring/50 hover:bg-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
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
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Light Source</span>
          {keyframeControls ?? (
            <button
              type="button"
              aria-label={`${isKeyed ? 'Remove' : 'Add'} light keyframe`}
              title={`${isKeyed ? 'Remove' : 'Add'} light keyframe`}
              onClick={onToggleKeyframe}
              className={`flex size-5 items-center justify-center rounded border transition-colors ${
                isKeyed ? 'border-ring/50 bg-accent' : 'border-border bg-muted/45 hover:bg-muted/60'
              }`}
            >
              <span className="size-2 rotate-45 border border-ring/50" style={{ backgroundColor: isKeyed ? '#ffd9a0' : 'transparent' }} />
            </button>
          )}
        </div>

        <div className="mt-2.5 aspect-square w-full rounded-full bg-border p-px shadow-inner">
          <div
            ref={padRef}
            onPointerDown={handlePadDown}
            className="relative size-full cursor-grab touch-none overflow-hidden rounded-full active:cursor-grabbing"
            style={{ background: `radial-gradient(circle at ${hx}% ${hy}%, #f8fafc 0%, ${color} 24%, #27272a 68%, #0b0b0d 100%)` }}
          >
            <span
              className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.7)] ring-1 ring-black/40"
              style={{ left: `${hx}%`, top: `${hy}%` }}
            />
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">Drag to move the light</p>

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
          <span className="w-14 shrink-0 text-[10px] font-medium text-muted-foreground">Softbox</span>
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
  );
}

export default function AppLayout() {
  const { resolvedTheme, setTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);
  const isLightTheme = themeMounted && resolvedTheme === 'light';
  const themeToggleLabel = themeMounted
    ? isLightTheme ? 'Switch to dark theme' : 'Switch to light theme'
    : 'Toggle theme';

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  // --- 1. Shape sequence (the morph is a timeline of shapes) ---
  const makeStop = (icon: PresetIcon, time: number): ShapeStop => ({
    id: `shape-${Math.random().toString(36).slice(2, 9)}`,
    time,
    iconId: icon.id,
    iconName: icon.name,
    svgContent: icon.svgContent,
    color: icon.defaultTint,
    colorSecondary: '#7c5cff',
    fillGradientType: 'linear',
    fillStops: undefined,
    fillKeyframes: [],
    easing: 'ease-in-out',
    transitionType: 'wipe',
    wipeDirection: { x: 0, y: 0 },
    transitionStart: DEFAULT_TRANSITION_START,
    transitionEnd: DEFAULT_TRANSITION_END,
  });

  const [shapes, setShapes] = useState<ShapeStop[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [openShapePicker, setOpenShapePicker] = useState<string | null>(null);
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>('google-metal');

  const markCustom = () => setActiveRecipeId(null);

  // Apply a recipe's palette + transition style to a sequence (alternating its two color pairs).
  const recolorShapes = (list: ShapeStop[], recipe: typeof MOTION_RECIPES[0]): ShapeStop[] =>
    list.map((stop, index) => ({
      ...stop,
      color: index % 2 === 0 ? recipe.colorA : recipe.colorB,
      colorSecondary: index % 2 === 0 ? recipe.colorASecondary : recipe.colorBSecondary,
      fillGradientType: recipe.fillGradientType ?? 'linear',
      fillStops: recipe.id === 'google-metal' ? googleMeshFillStops() : undefined,
      fillKeyframes: [],
      transitionType: recipe.transitionType,
      wipeDirection: recipe.wipeDirection,
    }));

  const normalizeRecipeTracks = (recipe: typeof MOTION_RECIPES[0], timelineDuration = 5): TimelineTrack[] => {
    const normalized: TimelineTrack[] = recipe.tracks
      .filter((track) => track.id !== 'transition') // the morph now lives on the Shape track
      .map((track) => {
        const trackName = MOTION_TRACK_NAMES[track.id as MotionTrackId] ?? track.name;
        if (track.id === 'extrusion') {
          return { ...track, name: trackName, max: EXTRUDE_MAX, defaultValue: recipe.extrusionDepth, keyframes: [] };
        }
        if (track.id === 'rotation') {
          // Hero motion: a full, seamless 360° spin across the loop.
          return {
            ...track,
            name: trackName,
            min: ROTATION_MIN,
            max: ROTATION_MAX,
            defaultValue: DEFAULT_ROTATION_START,
            keyframes: [
              { id: `${track.id}-start`, time: 0, value: DEFAULT_ROTATION_START, easing: 'ease-in-out' as const },
              { id: `${track.id}-end`, time: timelineDuration, value: DEFAULT_ROTATION_END, easing: 'ease-in-out' as const },
            ],
          };
        }
        if (track.id === 'lighting') {
          return { ...track, name: trackName, max: LIGHT_MAX, defaultValue: recipe.keyLightIntensity, keyframes: [] };
        }
        return { ...track, name: trackName, keyframes: [] };
      });
    if (!normalized.some((track) => track.id === 'scale')) {
      normalized.splice(2, 0, {
        id: 'scale',
        name: 'Scale',
        color: '#a78bfa',
        min: 0.1,
        max: SCALE_MAX,
        defaultValue: SCALE_DEFAULT,
        keyframes: [],
      });
    }
    return normalized;
  };

  // Apply a recipe's styling & animation. Recolors the existing shape sequence.
  const applyRecipe = (recipe: typeof MOTION_RECIPES[0], shapeList?: ShapeStop[]) => {
    setActiveRecipeId(recipe.id);
    setMaterialPreset(recipe.materialPreset);
    setEnableGradient(recipe.enableGradient);
    setFillMode(recipe.enableGradient ? 'gradient' : 'solid');
    setFillColor(recipe.colorA);
    setFillColorSecondary(recipe.colorASecondary ?? recipe.colorB ?? recipe.colorA);
    setFillGradientType(recipe.fillGradientType ?? 'linear');
    setFillStops(recipe.id === 'google-metal'
      ? googleMeshFillStops()
      : makeFillStops(recipe.colorA, recipe.colorASecondary ?? recipe.colorB ?? recipe.colorA, !recipe.enableGradient)
    );
    setFillKeyframes([]);
    setShapes((prev) => recolorShapes(shapeList ?? prev, recipe));

    setRoughness(recipe.roughness);
    setMetalness(recipe.metalness);
    setReflectance(recipe.reflectance ?? 0.5);
    setClearcoat(recipe.clearcoat);
    setClearcoatRoughness(recipe.clearcoatRoughness ?? 0.1);
    setTransmission(recipe.transmission);
    setThickness(recipe.thickness ?? 1.0);
    setEmissiveIntensity(recipe.emissiveIntensity);

    setExtrusionDepth(recipe.extrusionDepth);
    setBevelEnabled(recipe.bevelEnabled);
    setBevelThickness(recipe.bevelThickness);
    setBevelSize(recipe.bevelSize);
    setBevelSegments(recipe.bevelSegments);
    setGeometryQuality(recipe.geometryQuality ?? GEOMETRY_QUALITY_DEFAULT);
    setLayerSpacing(recipe.layerSpacing);
    setInnerElementScale({ x: 1, y: 1, z: 1 });

    setRotationOffset({ x: 0, y: 0, z: 0 });
    setObjectScale(SCALE_DEFAULT);
    setMoveOffset({
      x: recipe.translateX ?? 0,
      y: recipe.translateY ?? 0,
      z: recipe.translateZ ?? 0,
    });
    setMoveKeyframes([]);
    setQualityKeyframes([]);
    setInnerScaleKeyframes([]);
    setKeyLightIntensity(recipe.keyLightIntensity);
    setKeyLightPosition({ x: 5, y: 5, z: 4 });
    setKeyLightSoftness(0.35);
    setKeyLightPositionKeyframes([]);

    setTracks(normalizeRecipeTracks(recipe, duration));
    setSelectedMotionTrackId('rotation');
    setCurrentTime(0);
    setIsPlaying(false);
  };

  // Seed the default sequence with a wipe-ready Material Symbol pair.
  useEffect(() => {
    let cancelled = false;
    const recipe = MOTION_RECIPES.find((r) => r.id === 'google-metal');
    const applyInitialShapes = (initial: ShapeStop[]) => {
      if (cancelled) return;
      setShapes(initial);
      setSelectedShapeId(initial[0]?.id ?? null);
      if (recipe) applyRecipe(recipe, initial);
    };

    void (async () => {
      const pair = MATERIAL_WIPE_READY_PAIRS[0];
      try {
        const [enabled, disabled] = await Promise.all([
          fetchMaterialSymbolIcon(pair.enabled, 'outlined'),
          fetchMaterialSymbolIcon(pair.disabled, 'outlined', { syntheticOffSlash: true }),
        ]);
        const initial = [
          {
            ...makeStop(enabled, 1.0),
            transitionType: 'wipe' as const,
            wipeDirection: { x: 0.707, y: -0.707 },
            easing: 'ease-in-out' as const,
          },
          makeStop(disabled, 4.0),
        ];
        applyInitialShapes(initial);
      } catch {
        const heart = PRESET_ICONS.find((i) => i.id === 'heart');
        const star = PRESET_ICONS.find((i) => i.id === 'star');
        if (!heart || !star) return;
        applyInitialShapes([makeStop(heart, 1.0), makeStop(star, 4.0)]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // --- Shape sequence operations ---
  const setShapeIcon = (shapeId: string, icon: PresetIcon) => {
    markCustom();
    setShapes((prev) => prev.map((s) => s.id === shapeId ? { ...s, iconId: icon.id, iconName: icon.name, svgContent: icon.svgContent } : s));
  };

  const setShapeWipePair = (shapeId: string, enabled: PresetIcon, disabled: PresetIcon) => {
    markCustom();
    setShapes((prev) => {
      const sorted = [...prev].sort((a, b) => a.time - b.time);
      const index = sorted.findIndex((shape) => shape.id === shapeId);
      if (index < 0) return prev;

      const current = sorted[index];
      const next = sorted[index + 1];
      const nextTime = next
        ? next.time
        : current.time < duration - 0.1
          ? clampNumber(quantizeTimeToFrame(Math.min(duration, current.time + Math.max(0.85, duration * 0.25))), current.time + 0.1, duration)
          : duration;
      const nextId = next?.id ?? `shape-${Math.random().toString(36).slice(2, 9)}`;
      const disabledStop: ShapeStop = {
        ...(next ?? current),
        id: nextId,
        time: nextTime,
        iconId: disabled.id,
        iconName: disabled.name,
        svgContent: disabled.svgContent,
        color: disabled.defaultTint,
      };
      const withCurrent = sorted.map((shape) => shape.id === current.id
        ? {
            ...shape,
            iconId: enabled.id,
            iconName: enabled.name,
            svgContent: enabled.svgContent,
            color: enabled.defaultTint,
            transitionType: 'wipe' as const,
            wipeDirection: { x: 0.707, y: -0.707 },
            easing: 'ease-in-out' as const,
          }
        : shape.id === nextId
          ? disabledStop
          : shape);

      return (next ? withCurrent : [...withCurrent, disabledStop]).sort((a, b) => a.time - b.time);
    });
    setSelectedShapeId(shapeId);
  };

  const updateSelectedShapeColor = (value: string, secondary = false) => {
    const playheadTime = clampNumber(quantizeTimeToFrame(currentTime), 0, duration);
    markCustom();
    setFillKeyframes((keyframes) => {
      const activeFill = interpolateFillKeyframes(currentTime, {
        color: fillColor,
        colorSecondary: fillColorSecondary,
        gradientType: fillGradientType,
        stops: fillStops,
      }, keyframes);
      const nextColor = secondary ? activeFill.color : value;
      const nextColorSecondary = secondary ? value : activeFill.colorSecondary;
      const nextPositions: [number, number] = [
        activeFill.stops?.[0]?.position ?? 0,
        activeFill.stops?.[1]?.position ?? 1,
      ];
      const nextStops = makeFillStops(nextColor, nextColorSecondary, fillMode === 'solid', nextPositions);

      if (keyframes.length === 0) {
        setFillColor(nextColor);
        setFillColorSecondary(nextStops[1].color);
        setFillStops(fillMode === 'gradient' ? nextStops : undefined);
        return keyframes;
      }

      const existing = keyframes.find((keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04);
      setFillColor(nextColor);
      setFillColorSecondary(nextStops[1].color);
      return existing
        ? keyframes.map((keyframe) => keyframe.id === existing.id
          ? { ...keyframe, stops: nextStops }
          : keyframe)
        : [
            ...keyframes,
            {
              id: `fill-${Date.now().toString(36)}`,
              time: playheadTime,
              stops: nextStops,
              gradientType: fillGradientType,
              easing: [...keyframes].sort((a, b) => a.time - b.time).filter((keyframe) => keyframe.time <= playheadTime).pop()?.easing ?? 'ease-in-out' as const,
            },
          ].sort((a, b) => a.time - b.time);
    });
  };

  const updateSelectedShapeGradientType = (gradientType: FillGradientType) => {
    const playheadTime = clampNumber(quantizeTimeToFrame(currentTime), 0, duration);
    markCustom();
    setFillKeyframes((keyframes) => {
      const activeFill = interpolateFillKeyframes(currentTime, {
        color: fillColor,
        colorSecondary: fillColorSecondary,
        gradientType: fillGradientType,
        stops: fillStops,
      }, keyframes);
      const nextStops = stopsForGradientType(activeFill, gradientType, fillMode === 'solid');
      const nextColor = nextStops[0]?.color ?? activeFill.color;
      const nextColorSecondary = nextStops[1]?.color ?? nextColor;

      if (keyframes.length === 0) {
        setFillColor(nextColor);
        setFillColorSecondary(nextColorSecondary);
        setFillGradientType(gradientType);
        setFillStops(nextStops);
        return keyframes;
      }

      const existing = keyframes.find((keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04);
      setFillColor(nextColor);
      setFillColorSecondary(nextColorSecondary);
      setFillGradientType(gradientType);
      setFillStops(nextStops);
      return existing
        ? keyframes.map((keyframe) => keyframe.id === existing.id ? { ...keyframe, gradientType, stops: nextStops } : keyframe)
        : [
            ...keyframes,
            {
              id: `fill-${Date.now().toString(36)}`,
              time: playheadTime,
              stops: nextStops,
              gradientType,
              easing: [...keyframes].sort((a, b) => a.time - b.time).filter((keyframe) => keyframe.time <= playheadTime).pop()?.easing ?? 'ease-in-out' as const,
            },
          ].sort((a, b) => a.time - b.time);
    });
  };

  const updateSelectedShapeFillStops = (stops: Array<{ id?: string; color: string; position: number }>) => {
    const playheadTime = clampNumber(quantizeTimeToFrame(currentTime), 0, duration);
    const nextStops = normalizeFillStops(stops);
    if (nextStops.length === 0) return;
    markCustom();
    setFillKeyframes((keyframes) => {
      if (keyframes.length === 0) {
        setFillColor(nextStops[0]?.color ?? fillColor);
        setFillColorSecondary(nextStops[1]?.color ?? nextStops[0]?.color ?? fillColorSecondary);
        setFillStops(nextStops);
        return keyframes;
      }

      const existing = keyframes.find((keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04);
      setFillColor(nextStops[0]?.color ?? fillColor);
      setFillColorSecondary(nextStops[1]?.color ?? nextStops[0]?.color ?? fillColorSecondary);
      setFillStops(nextStops);
      return existing
        ? keyframes.map((keyframe) => keyframe.id === existing.id ? { ...keyframe, stops: nextStops } : keyframe)
        : [
            ...keyframes,
            {
              id: `fill-${Date.now().toString(36)}`,
              time: playheadTime,
              stops: nextStops,
              gradientType: fillGradientType,
              easing: [...keyframes].sort((a, b) => a.time - b.time).filter((keyframe) => keyframe.time <= playheadTime).pop()?.easing ?? 'ease-in-out' as const,
            },
          ].sort((a, b) => a.time - b.time);
    });
  };

  const updateSelectedShapeFillStopPosition = (stopIndex: number, position: number) => {
    const nextPosition = clampNumber(position, 0, 1);
    updateSelectedShapeFillStops(selectedShapeFillStops.map((stop, index) =>
      index === stopIndex ? { ...stop, position: nextPosition } : stop
    ));
  };

  const addShapeAtPlayhead = () => {
    markCustom();
    setShapes((prev) => {
      const icon = PRESET_ICONS[prev.length % PRESET_ICONS.length];
      const t = clampNumber(quantizeTimeToFrame(currentTime), 0, duration);
      const stop = makeStop(icon, t);
      setSelectedShapeId(stop.id);
      setOpenShapePicker(stop.id);
      return [...prev, stop].sort((a, b) => a.time - b.time);
    });
  };

  const removeShape = (shapeId: string) => {
    setShapes((prev) => {
      const removedIndex = prev.findIndex((shape) => shape.id === shapeId);
      if (prev.length <= 1 || removedIndex < 0) return prev;
      const next = prev.filter((s) => s.id !== shapeId);
      markCustom();
      setOpenShapePicker(null);
      if (selectedShapeId === shapeId) {
        setSelectedShapeId(next[Math.min(removedIndex, next.length - 1)]?.id ?? null);
      }
      return next;
    });
  };

  // --- 2. Appearance & geometry state ---
  const [materialPreset, setMaterialPreset] = useState<MaterialPresetId>('chrome');

  // Custom Advanced Material Finish parameters
  const [roughness, setRoughness] = useState<number>(0.075);
  const [metalness, setMetalness] = useState<number>(0.48);
  const [reflectance, setReflectance] = useState<number>(1.0);
  const [clearcoat, setClearcoat] = useState<number>(1.0);
  const [clearcoatRoughness, setClearcoatRoughness] = useState<number>(0.02);
  const [transmission, setTransmission] = useState<number>(0.0);
  const [thickness, setThickness] = useState<number>(1.0);
  const [emissiveIntensity, setEmissiveIntensity] = useState<number>(0.08);
  const [materialKeyframes, setMaterialKeyframes] = useState<MaterialKeyframe[]>([]);
  const [isAdvancedMaterialOpen, setIsAdvancedMaterialOpen] = useState<boolean>(false);

  const [wireframe, setWireframe] = useState<boolean>(false);
  const [extrusionDepth, setExtrusionDepth] = useState<number>(EXTRUDE_DEFAULT);
  const [bevelEnabled, setBevelEnabled] = useState<boolean>(true);
  const [bevelThickness, setBevelThickness] = useState<number>(0.15);
  const [bevelSize, setBevelSize] = useState<number>(0.08);
  const [bevelSegments, setBevelSegments] = useState<number>(3);
  const [geometryQuality, setGeometryQuality] = useState<number>(GEOMETRY_QUALITY_DEFAULT);
  const [qualityKeyframes, setQualityKeyframes] = useState<ScalarKeyframe[]>([]);
  const [layerSpacing, setLayerSpacing] = useState<number>(0.8);
  const [innerElementScale, setInnerElementScale] = useState({ x: 1, y: 1, z: 1 });
  const [innerScaleKeyframes, setInnerScaleKeyframes] = useState<Vector3Keyframe[]>([]);
  const [objectScale, setObjectScale] = useState<number>(SCALE_DEFAULT);
  const [objectScaleAxes, setObjectScaleAxes] = useState<LightPosition>({ x: 1, y: 1, z: 1 });
  const [moveOffset, setMoveOffset] = useState<LightPosition>({ x: 0, y: 0, z: 0 });
  const [moveKeyframes, setMoveKeyframes] = useState<Vector3Keyframe[]>([]);

  const [enableGradient, setEnableGradient] = useState<boolean>(true);
  const [fillMode, setFillMode] = useState<FillMode>('gradient');
  const [fillColor, setFillColor] = useState<string>('#4285F4');
  const [fillColorSecondary, setFillColorSecondary] = useState<string>('#00C796');
  const [fillGradientType, setFillGradientType] = useState<FillGradientType>('mesh');
  const [fillStops, setFillStops] = useState<FillStop[] | undefined>(googleMeshFillStops());
  const [fillKeyframes, setFillKeyframes] = useState<FillKeyframe[]>([]);
  const [rotationOffset, setRotationOffset] = useState<LightPosition>({ x: 0, y: 0, z: 0 });
  const [previewRotationY, setPreviewRotationY] = useState<number | null>(null);

  // Lighting & perspective
  const [ambientColor] = useState<string>('#ffffff');
  const [ambientIntensity] = useState<number>(0.6);
  const [keyLightColor, setKeyLightColor] = useState<string>('#ffffff');
  const [keyLightIntensity, setKeyLightIntensity] = useState<number>(1.2);
  const [keyLightPosition, setKeyLightPosition] = useState<LightPosition>({ x: 5, y: 5, z: 4 });
  const [keyLightSoftness, setKeyLightSoftness] = useState<number>(0.35);
  const [keyLightPositionKeyframes, setKeyLightPositionKeyframes] = useState<LightPositionKeyframe[]>([]);
  const [rimLightColor] = useState<string>('#a48bff');
  const [rimLightIntensity] = useState<number>(0.8);
  const [zoom, setZoom] = useState<number>(1.0);
  const [viewInertiaEnabled, setViewInertiaEnabled] = useState<boolean>(true);
  const [showCenterPoint, setShowCenterPoint] = useState<boolean>(false);
  const [showTransformGizmo, setShowTransformGizmo] = useState<boolean>(false);
  const [isScaleLocked, setIsScaleLocked] = useState<boolean>(true);
  const [isInnerScaleLocked, setIsInnerScaleLocked] = useState<boolean>(true);
  const [zenMode, setZenMode] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Synchronize presets with customized sliders when a predefined preset is clicked
  useEffect(() => {
    if (materialPreset === 'frost') {
      setRoughness(0.72);
      setMetalness(0.0);
      setReflectance(0.76);
      setClearcoat(0.18);
      setClearcoatRoughness(0.62);
      setTransmission(0.28);
      setThickness(0.65);
      setEmissiveIntensity(0.035);
    } else if (materialPreset === 'satin') {
      setRoughness(0.34);
      setMetalness(0.04);
      setReflectance(0.62);
      setClearcoat(0.0);
      setClearcoatRoughness(0.35);
      setTransmission(0.0);
      setThickness(0.4);
      setEmissiveIntensity(0.0744);
    } else if (materialPreset === 'glass') {
      setRoughness(0.12);
      setMetalness(0.0);
      setReflectance(0.72);
      setClearcoat(1.0);
      setClearcoatRoughness(0.08);
      setTransmission(0.38);
      setThickness(0.85);
      setEmissiveIntensity(0.0);
    } else if (materialPreset === 'chrome') {
      setRoughness(0.075);
      setMetalness(0.48);
      setReflectance(1.0);
      setClearcoat(1.0);
      setClearcoatRoughness(0.02);
      setTransmission(0.0);
      setThickness(0.4);
      setEmissiveIntensity(0.08);
    } else if (materialPreset === 'pearl') {
      setRoughness(0.42);
      setMetalness(0.0);
      setReflectance(0.86);
      setClearcoat(0.72);
      setClearcoatRoughness(0.22);
      setTransmission(0.0);
      setThickness(0.6);
      setEmissiveIntensity(0.035);
    } else if (materialPreset === 'lacquer') {
      setRoughness(0.2);
      setMetalness(0.0);
      setReflectance(0.72);
      setClearcoat(1.0);
      setClearcoatRoughness(0.03);
      setTransmission(0.0);
      setThickness(0.5);
      setEmissiveIntensity(0.04);
    }
  }, [materialPreset]);

  // --- 3. Timeline Playback & Keyframe Tracks State ---
  const [duration, setDuration] = useState<number>(5.0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loop, setLoop] = useState<boolean>(true);
  const [isPreviewModelReady, setIsPreviewModelReady] = useState(false);
  const exportVideoResolveRef = useRef<(() => void) | null>(null);
  const exportVideoRejectRef = useRef<((error: Error) => void) | null>(null);
  const exportVideoTimeoutRef = useRef<number | null>(null);
  const [selectedMotionTrackId, setSelectedMotionTrackId] = useState<MotionTrackId>('rotation');
  const inspectorRefs = {
    fill: useRef<HTMLDivElement>(null),
    material: useRef<HTMLDivElement>(null),
    extrusion: useRef<HTMLDivElement>(null),
    rotation: useRef<HTMLDivElement>(null),
    scale: useRef<HTMLDivElement>(null),
    move: useRef<HTMLDivElement>(null),
    lighting: useRef<HTMLDivElement>(null),
  };

  const scrollInspectorPropertyIntoView = (id: MotionTrackId | 'fill' | 'material' | 'light-position') => {
    if (id === 'material') setIsAdvancedMaterialOpen(true);
    const target =
      id === 'light-position'
        ? inspectorRefs.lighting.current
        : inspectorRefs[id]?.current;
    if (!target) return;
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  };

  const selectTimelineTrack = (trackId: string) => {
    const nextTrackId = trackId as MotionTrackId;
    setSelectedMotionTrackId(nextTrackId);
    setSelectedShapeId(null);
    scrollInspectorPropertyIntoView(nextTrackId);
  };

  const selectTimelinePropertyRow = (rowId: string) => {
    if (rowId === 'move') setSelectedMotionTrackId('move');
    scrollInspectorPropertyIntoView(rowId as 'fill' | 'material' | 'light-position' | 'move');
  };

  // Single predictable rule for editing a property value:
  //  - If the track is NOT animated (no keyframes) → set a constant value.
  //  - If the track IS animated → update the keyframe under the playhead, or add one there.
  // This removes the old "dragging silently rewrites the whole animation" surprise.
  const setTrackValue = (
    trackId: MotionTrackId,
    nextValue: number,
    syncStaticValue?: (value: number) => void
  ) => {
    setSelectedMotionTrackId(trackId);
    setActiveRecipeId(null);

    const sourceTrack = tracks.find((track) => track.id === trackId);
    const clampedValue = sourceTrack ? clampNumber(nextValue, sourceTrack.min, sourceTrack.max) : nextValue;
    syncStaticValue?.(clampedValue);

    setTracks((prevTracks) => prevTracks.map((track) => {
      if (track.id !== trackId) return track;

      // Constant (un-animated) property: just move the single value.
      if (track.keyframes.length === 0) {
        return { ...track, defaultValue: clampedValue };
      }

      const playheadTime = clampNumber(quantizeTimeToFrame(currentTime), 0, duration);
      const exactKeyframe = track.keyframes.find((keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04);

      // Edit the keyframe already at the playhead.
      if (exactKeyframe) {
        return {
          ...track,
          defaultValue: clampedValue,
          keyframes: track.keyframes.map((keyframe) =>
            keyframe.id === exactKeyframe.id ? { ...keyframe, value: clampedValue } : keyframe
          )
        };
      }

      // Otherwise drop a new keyframe at the playhead, inheriting easing from the previous one.
      const previousKeyframe = [...track.keyframes]
        .sort((a, b) => a.time - b.time)
        .filter((keyframe) => keyframe.time <= playheadTime)
        .pop();

      return {
        ...track,
        defaultValue: clampedValue,
        keyframes: [
          ...track.keyframes,
          {
            id: `${track.id}-${Date.now().toString(36)}`,
            time: playheadTime,
            value: clampedValue,
            easing: previousKeyframe?.easing ?? 'ease-in-out'
          }
        ].sort((a, b) => a.time - b.time)
      };
    }));
  };

  const handleDepthChange = (newValue: number) => {
    setTrackValue('extrusion', newValue, setExtrusionDepth);
  };

  const handleSpinChange = (newValue: number) => {
    setTrackValue('rotation', newValue, (value) => setRotationOffset((prev) => ({ ...(prev ?? { x: 0, y: 0, z: 0 }), y: value })));
  };

  const handleScaleChange = (newValue: number) => {
    setTrackValue('scale', newValue, setObjectScale);
  };

  const handleScaleAxisChange = (axis: keyof LightPosition, newValue: number) => {
    setSelectedMotionTrackId('scale');
    setActiveRecipeId(null);
    setIsScaleLocked(false);
    setObjectScaleAxes((prev) => ({ ...prev, [axis]: clampNumber(newValue, 0.1, SCALE_MAX) }));
  };

  const handleViewRotationCommit = (delta: { x: number; y: number; z: number }) => {
    setSelectedMotionTrackId('rotation');
    setActiveRecipeId(null);
    setPreviewRotationY(null);
    const playheadTime = clampNumber(quantizeTimeToFrame(currentTime), 0, duration);
    const rotation = tracks.find((track) => track.id === 'rotation');
    const currentY = rotation && rotation.keyframes.length > 0
      ? interpolateKeyframes(playheadTime, rotation)
      : rotationOffset.y;
    const nextY = clampNumber(currentY + delta.y, ROTATION_MIN, ROTATION_MAX);

    setRotationOffset((prev) => ({
      x: clampNumber(prev.x + delta.x, ROTATION_MIN, ROTATION_MAX),
      y: nextY,
      z: clampNumber(prev.z + delta.z, ROTATION_MIN, ROTATION_MAX)
    }));

    setTracks((prevTracks) => {
      return prevTracks.map((track) => {
        if (track.id !== 'rotation') return track;
        const clampedValue = clampNumber(nextY, track.min, track.max);

        if (track.keyframes.length === 0) {
          return { ...track, defaultValue: clampedValue };
        }

        const exactKeyframe = track.keyframes.find((keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04);
        if (exactKeyframe) {
          return {
            ...track,
            defaultValue: clampedValue,
            keyframes: track.keyframes.map((keyframe) =>
              keyframe.id === exactKeyframe.id ? { ...keyframe, value: clampedValue } : keyframe
            )
          };
        }

        const previousKeyframe = [...track.keyframes]
          .sort((a, b) => a.time - b.time)
          .filter((keyframe) => keyframe.time <= playheadTime)
          .pop();

        return {
          ...track,
          defaultValue: clampedValue,
          keyframes: [
            ...track.keyframes,
            {
              id: `${track.id}-${Date.now().toString(36)}`,
              time: playheadTime,
              value: clampedValue,
              easing: previousKeyframe?.easing ?? 'ease-in-out'
            }
          ].sort((a, b) => a.time - b.time)
        };
      });
    });
  };

  const handleViewRotationSet = (
    target: Partial<{ x: number; y: number; z: number }>,
    options: { commit?: boolean; updateTimeline?: boolean } = {}
  ) => {
    setSelectedMotionTrackId('rotation');
    setActiveRecipeId(null);
    const playheadTime = clampNumber(quantizeTimeToFrame(currentTime), 0, duration);
    const clampedTarget = {
      x: target.x === undefined ? undefined : clampNumber(target.x, ROTATION_MIN, ROTATION_MAX),
      y: target.y === undefined ? undefined : clampNumber(target.y, ROTATION_MIN, ROTATION_MAX),
      z: target.z === undefined ? undefined : clampNumber(target.z, ROTATION_MIN, ROTATION_MAX),
    };

    setRotationOffset((prev) => ({
      x: clampedTarget.x ?? prev.x,
      y: clampedTarget.y ?? prev.y,
      z: clampedTarget.z ?? prev.z,
    }));

    if (options.updateTimeline === false) {
      if (clampedTarget.y !== undefined) {
        setPreviewRotationY(clampedTarget.y);
      }
      return;
    }

    const targetY = clampedTarget.y;
    if (targetY !== undefined && options.commit === false) {
      setPreviewRotationY(targetY);
      return;
    }

    setPreviewRotationY(null);
    if (targetY === undefined) return;
    setTracks((prevTracks) => prevTracks.map((track) => {
      if (track.id !== 'rotation') return track;
      const clampedValue = clampNumber(targetY, track.min, track.max);
      if (track.keyframes.length === 0) {
        return { ...track, defaultValue: clampedValue };
      }

      const exactKeyframe = track.keyframes.find((keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04);
      if (exactKeyframe) {
        return {
          ...track,
          defaultValue: clampedValue,
          keyframes: track.keyframes.map((keyframe) =>
            keyframe.id === exactKeyframe.id ? { ...keyframe, value: clampedValue } : keyframe
          )
        };
      }

      const previousKeyframe = [...track.keyframes]
        .sort((a, b) => a.time - b.time)
        .filter((keyframe) => keyframe.time <= playheadTime)
        .pop();

      return {
        ...track,
        defaultValue: clampedValue,
        keyframes: [
          ...track.keyframes,
          {
            id: `${track.id}-${Date.now().toString(36)}`,
            time: playheadTime,
            value: clampedValue,
            easing: previousKeyframe?.easing ?? 'ease-in-out'
          }
        ].sort((a, b) => a.time - b.time)
      };
    }));
  };

  const handleBrightnessChange = (newValue: number) => {
    setTrackValue('lighting', newValue, setKeyLightIntensity);
  };

  const playheadRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const playbackTimeRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);

  useEffect(() => {
    currentTimeRef.current = currentTime;
    if (!isPlaying) playbackTimeRef.current = currentTime;
  }, [currentTime, isPlaying]);

  // Keyframe timeline tracks (the morph itself lives on the separate Shape track)
  const [tracks, setTracks] = useState<TimelineTrack[]>([
    {
      id: 'extrusion',
      name: 'Extrude',
      color: '#4ee2a3',
      min: 0.2,
      max: EXTRUDE_MAX,
      defaultValue: EXTRUDE_DEFAULT,
      keyframes: []
    },
    {
      id: 'rotation',
      name: 'Rotation',
      color: '#ffd23f',
      min: ROTATION_MIN,
      max: ROTATION_MAX,
      defaultValue: DEFAULT_ROTATION_START,
      keyframes: [
        { id: 'kf-rot1', time: 0, value: DEFAULT_ROTATION_START, easing: 'ease-in-out' },
        { id: 'kf-rot2', time: 5.0, value: DEFAULT_ROTATION_END, easing: 'ease-in-out' }
      ]
    },
    {
      id: 'scale',
      name: 'Scale',
      color: '#a78bfa',
      min: 0.1,
      max: SCALE_MAX,
      defaultValue: SCALE_DEFAULT,
      keyframes: []
    },
    {
      id: 'lighting',
      name: 'Brightness',
      color: '#ff5b9a',
      min: 0.0,
      max: LIGHT_MAX,
      defaultValue: 1.2,
      keyframes: []
    }
  ]);

  const extrusionTrack = tracks.find((track) => track.id === 'extrusion') ?? tracks[0];
  const rotationTrack = tracks.find((track) => track.id === 'rotation') ?? tracks[1];
  const scaleTrack = tracks.find((track) => track.id === 'scale') ?? tracks[2];
  const lightingTrack = tracks.find((track) => track.id === 'lighting') ?? tracks[3];
  const undoStackRef = useRef<EditorSnapshot[]>([]);
  const redoStackRef = useRef<EditorSnapshot[]>([]);
  const lastUndoSnapshotKeyRef = useRef('');
  const isRestoringUndoRef = useRef(false);

  const createEditorSnapshot = (): EditorSnapshot => ({
    activeRecipeId,
    shapes,
    duration,
    materialPreset,
    roughness,
    metalness,
    reflectance,
    clearcoat,
    clearcoatRoughness,
    transmission,
    thickness,
    emissiveIntensity,
    materialKeyframes,
    extrusionDepth,
    bevelEnabled,
    bevelThickness,
    bevelSize,
    bevelSegments,
    geometryQuality,
    qualityKeyframes,
    layerSpacing,
    innerElementScale,
    innerScaleKeyframes,
    objectScale,
    objectScaleAxes,
    moveOffset,
    moveKeyframes,
    enableGradient,
    fillMode,
    fillColor,
    fillColorSecondary,
    fillGradientType,
    fillStops,
    fillKeyframes,
    rotationOffset,
    keyLightColor,
    keyLightIntensity,
    keyLightPosition,
    keyLightSoftness,
    keyLightPositionKeyframes,
    tracks,
  });

  const restoreEditorSnapshot = (snapshot: EditorSnapshot) => {
    isRestoringUndoRef.current = true;
    lastUndoSnapshotKeyRef.current = JSON.stringify(snapshot);
    setActiveRecipeId(snapshot.activeRecipeId);
    setShapes(snapshot.shapes);
    // Validate current selection against restored shapes (don't restore selection — it's UI state)
    setSelectedShapeId((currentId) =>
      currentId && snapshot.shapes.some((s) => s.id === currentId) ? currentId : snapshot.shapes[0]?.id ?? null
    );
    setOpenShapePicker(null);
    setDuration(snapshot.duration);
    setCurrentTime((time) => clampNumber(time, 0, snapshot.duration));
    setMaterialPreset(snapshot.materialPreset);
    setRoughness(snapshot.roughness);
    setMetalness(snapshot.metalness);
    setReflectance(snapshot.reflectance);
    setClearcoat(snapshot.clearcoat);
    setClearcoatRoughness(snapshot.clearcoatRoughness);
    setTransmission(snapshot.transmission);
    setThickness(snapshot.thickness);
    setEmissiveIntensity(snapshot.emissiveIntensity);
    setMaterialKeyframes(snapshot.materialKeyframes);
    setExtrusionDepth(snapshot.extrusionDepth);
    setBevelEnabled(snapshot.bevelEnabled);
    setBevelThickness(snapshot.bevelThickness);
    setBevelSize(snapshot.bevelSize);
    setBevelSegments(snapshot.bevelSegments);
    setGeometryQuality(snapshot.geometryQuality);
    setQualityKeyframes(snapshot.qualityKeyframes);
    setLayerSpacing(snapshot.layerSpacing);
    setInnerElementScale(snapshot.innerElementScale);
    setInnerScaleKeyframes(snapshot.innerScaleKeyframes);
    setObjectScale(snapshot.objectScale);
    setObjectScaleAxes(snapshot.objectScaleAxes ?? { x: 1, y: 1, z: 1 });
    setMoveOffset(snapshot.moveOffset);
    setMoveKeyframes(snapshot.moveKeyframes);
    setEnableGradient(snapshot.enableGradient);
    setFillMode(snapshot.fillMode);
    setFillColor(snapshot.fillColor);
    setFillColorSecondary(snapshot.fillColorSecondary);
    setFillGradientType(snapshot.fillGradientType);
    setFillStops(snapshot.fillStops);
    setFillKeyframes(snapshot.fillKeyframes);
    setRotationOffset(snapshot.rotationOffset);
    setPreviewRotationY(null);
    setKeyLightColor(snapshot.keyLightColor);
    setKeyLightIntensity(snapshot.keyLightIntensity);
    setKeyLightPosition(snapshot.keyLightPosition);
    setKeyLightSoftness(snapshot.keyLightSoftness);
    setKeyLightPositionKeyframes(snapshot.keyLightPositionKeyframes);
    setTracks(snapshot.tracks);
    setIsPlaying(false);
  };

  const undoLastEditorChange = () => {
    const stack = undoStackRef.current;
    if (stack.length <= 1) return;
    const current = stack.pop()!;
    redoStackRef.current = [...redoStackRef.current, current].slice(-MAX_UNDO_STEPS);
    const previous = stack[stack.length - 1];
    if (previous) restoreEditorSnapshot(previous);
  };

  const redoLastEditorChange = () => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return;
    const next = stack.pop()!;
    isRestoringUndoRef.current = true;
    lastUndoSnapshotKeyRef.current = JSON.stringify(next);
    undoStackRef.current = [...undoStackRef.current, next].slice(-MAX_UNDO_STEPS);
    restoreEditorSnapshot(next);
  };

  // Push undo snapshot only when state settles (not during active drags)
  const pendingDragSnapshotRef = useRef(false);
  useEffect(() => {
    if (shapes.length === 0) return;

    if (isRestoringUndoRef.current) {
      isRestoringUndoRef.current = false;
      return;
    }

    // During scrub drags, defer snapshot until drag ends
    if (__inputDragActive) {
      pendingDragSnapshotRef.current = true;
      return;
    }

    const snapshot = createEditorSnapshot();
    undoStackRef.current = [...undoStackRef.current, snapshot].slice(-MAX_UNDO_STEPS);
    redoStackRef.current = [];
    pendingDragSnapshotRef.current = false;
  }, [
    activeRecipeId,
    shapes,
    duration,
    materialPreset,
    roughness,
    metalness,
    reflectance,
    clearcoat,
    clearcoatRoughness,
    transmission,
    thickness,
    emissiveIntensity,
    materialKeyframes,
    extrusionDepth,
    bevelEnabled,
    bevelThickness,
    bevelSize,
    bevelSegments,
    geometryQuality,
    qualityKeyframes,
    layerSpacing,
    innerElementScale,
    innerScaleKeyframes,
    objectScale,
    objectScaleAxes,
    moveOffset,
    moveKeyframes,
    enableGradient,
    fillMode,
    fillColor,
    fillColorSecondary,
    fillGradientType,
    fillStops,
    fillKeyframes,
    rotationOffset,
    keyLightColor,
    keyLightIntensity,
    keyLightPosition,
    keyLightSoftness,
    keyLightPositionKeyframes,
    tracks,
  ]);

  // Flush deferred snapshot when a scrub drag ends
  useEffect(() => {
    const flush = () => {
      if (pendingDragSnapshotRef.current && !__inputDragActive) {
        pendingDragSnapshotRef.current = false;
        const snapshot = createEditorSnapshot();
        undoStackRef.current = [...undoStackRef.current, snapshot].slice(-MAX_UNDO_STEPS);
        redoStackRef.current = [];
      }
    };
    window.addEventListener('pointerup', flush);
    return () => window.removeEventListener('pointerup', flush);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Derived morph state: which two shapes surround the playhead, and the blend between them ---
  const sortedShapes = useMemo(() => [...shapes].sort((a, b) => a.time - b.time), [shapes]);
  const morph = useMemo(() => {
    const fallback: ShapeStop = {
      id: 'empty', time: 0, iconId: '', iconName: 'Shape', svgContent: '', color: '#ffffff', colorSecondary: '#ffffff',
      fillGradientType: 'linear', fillStops: undefined, fillKeyframes: [],
      easing: 'ease-in-out', transitionType: 'wipe', wipeDirection: { x: 0, y: 0 },
    };
    if (sortedShapes.length === 0) return { from: fallback, to: fallback, progress: 0 };
    const first = sortedShapes[0];
    const last = sortedShapes[sortedShapes.length - 1];
    if (sortedShapes.length === 1) return { from: first, to: first, progress: 0 };

    // Keep the same two icon meshes mounted outside the transition window.
    // Returning first→first before the window and last→last after it forces
    // SvgCanvas to rebuild geometry twice per loop, which shows up as playback
    // stutter. Holding the surrounding pair and clamping progress avoids that.
    if (currentTime <= first.time) return { from: first, to: sortedShapes[1], progress: 0 };
    if (currentTime >= last.time) return { from: sortedShapes[sortedShapes.length - 2], to: last, progress: 1 };
    let i = 0;
    while (i < sortedShapes.length - 1 && !(currentTime >= sortedShapes[i].time && currentTime <= sortedShapes[i + 1].time)) i++;
    const from = sortedShapes[i];
    const to = sortedShapes[i + 1];
    const span = to.time - from.time;
    const gapFrac = span > 0 ? (currentTime - from.time) / span : 1;
    // The morph only happens inside [transitionStart, transitionEnd] of the gap;
    // outside that window the shape holds (0 = fully `from`, 1 = fully `to`).
    const startFrac = from.transitionStart ?? DEFAULT_TRANSITION_START;
    const endFrac = from.transitionEnd ?? DEFAULT_TRANSITION_END;
    const windowProgress = gapFrac <= startFrac
      ? 0
      : gapFrac >= endFrac
        ? 1
        : (gapFrac - startFrac) / Math.max(1e-6, endFrac - startFrac);
    // Fade/Wipe ease across the window; "None" is a hard cut at its midpoint.
    const progress = from.transitionType === 'none'
      ? (windowProgress < 0.5 ? 0 : 1)
      : clampNumber(applyEasing(from.easing, windowProgress), 0, 1);
    return { from, to, progress };
  }, [currentTime, sortedShapes]);

  const selectedShape = shapes.find((s) => s.id === selectedShapeId) ?? sortedShapes[0] ?? null;
  const shapeName = (stop: ShapeStop | null) =>
    stop ? (stop.iconName ?? PRESET_ICONS.find((i) => i.id === stop.iconId)?.name ?? 'Custom') : 'Shape';

  const selectedShapeFillValue = interpolateFillKeyframes(
    currentTime,
    { color: fillColor, colorSecondary: fillColorSecondary, gradientType: fillGradientType, stops: fillStops },
    fillKeyframes
  );
  const selectedShapeFill = selectedShapeFillValue.color;
  const selectedShapeFillSecondary = selectedShapeFillValue.colorSecondary;
  const selectedShapeGradientType = selectedShapeFillValue.gradientType ?? fillGradientType;
  const selectedShapeFillStops = selectedShapeFillValue.stops ?? makeFillStops(selectedShapeFill, selectedShapeFillSecondary, fillMode === 'solid');

  // Engine-facing values derived from the surrounding shapes (SvgCanvas keeps its 2-shape crossfade).
  const iconAContent = morph.from.svgContent;
  const iconBContent = morph.to.svgContent;
  const fillA = selectedShapeFillValue;
  const fillB = selectedShapeFillValue;
  const colorA = fillA.color;
  const colorASecondary = fillA.colorSecondary;
  const colorB = fillB.color;
  const colorBSecondary = fillB.colorSecondary;
  const activeGradientType = fillA.gradientType ?? fillGradientType;
  const renderAsSolid = fillMode === 'solid';
  const renderEnableGradient = renderAsSolid ? true : enableGradient;
  const renderGradientType = renderAsSolid ? 'linear' : activeGradientType;
  const renderColorASecondary = renderAsSolid ? colorA : colorASecondary;
  const renderColorAStops = renderAsSolid ? makeFillStops(colorA, colorA, true) : fillA.stops;
  const activeTransitionProgress = morph.progress;
  // The active transition's blend style comes from the shape we're morphing FROM.
  const transitionType = morph.from.transitionType;
  const wipeDirection = morph.from.wipeDirection;
  const shareOutgoingFillDuringWipe = transitionType === 'wipe' && morph.from.id !== morph.to.id;
  const renderColorB = shareOutgoingFillDuringWipe ? colorA : colorB;
  const renderColorBSecondary = shareOutgoingFillDuringWipe
    ? renderColorASecondary
    : renderAsSolid ? colorB : colorBSecondary;
  const renderColorBStops = shareOutgoingFillDuringWipe
    ? renderColorAStops
    : renderAsSolid ? makeFillStops(colorB, colorB, true) : fillB.stops;

  const activeExtrusionDepth = extrusionTrack.keyframes.length > 0
    ? interpolateKeyframes(currentTime, extrusionTrack)
    : extrusionDepth;

  const activeRotationY = previewRotationY ?? (
    rotationTrack.keyframes.length > 0
      ? interpolateKeyframes(currentTime, rotationTrack)
      : rotationOffset.y
  );

  const activeObjectScale = scaleTrack.keyframes.length > 0
    ? interpolateKeyframes(currentTime, scaleTrack)
    : objectScale;

  const activeMoveOffset = interpolateLightPositionKeyframes(currentTime, moveOffset, moveKeyframes);

  const activeKeyLightIntensity = lightingTrack.keyframes.length > 0
    ? interpolateKeyframes(currentTime, lightingTrack)
    : keyLightIntensity;
  const activeKeyLightPosition = interpolateLightPositionKeyframes(currentTime, keyLightPosition, keyLightPositionKeyframes);
  const baseMaterialSettings: MaterialSettings = {
    roughness,
    metalness,
    reflectance,
    clearcoat,
    clearcoatRoughness,
    transmission,
    thickness,
    emissiveIntensity,
  };
  const activeMaterialSettings = interpolateMaterialKeyframes(currentTime, baseMaterialSettings, materialKeyframes);

  const activeGeometryQuality = interpolateScalarKeyframes(currentTime, geometryQuality, qualityKeyframes);
  const activeInnerScale = interpolateLightPositionKeyframes(currentTime, innerElementScale, innerScaleKeyframes);

  const hasLayerGapControls = false;

  const keyframeAtPlayhead = (track: TimelineTrack) => {
    const playheadTime = quantizeTimeToFrame(currentTime);
    return track.keyframes.find((keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04);
  };

  const getAdjacentKeyframeTimes = (keyframes: TimeKeyframe[]) => {
    const sortedTimes = Array.from(new Set(
      keyframes
        .map((keyframe) => Number(clampNumber(keyframe.time, 0, duration).toFixed(2)))
        .filter(Number.isFinite)
    )).sort((a, b) => a - b);

    return {
      previous: [...sortedTimes].reverse().find((time) => time < currentTime - 0.04),
      next: sortedTimes.find((time) => time > currentTime + 0.04),
    };
  };

  const jumpToPropertyKeyframe = (time: number | undefined) => {
    if (time === undefined) return;
    setIsPlaying(false);
    setCurrentTime(clampNumber(Number(time.toFixed(3)), 0, duration));
  };

  const keyframeNavButtonClass =
    'flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground/45 transition-colors duration-100 hover:bg-muted/50 hover:text-foreground focus-visible:outline-none';

  const getPropertyKeyframeNavigator = (keyframes: TimeKeyframe[]) => {
    if (keyframes.length === 0) return null;
    const { previous, next } = getAdjacentKeyframeTimes(keyframes);

    return { previous, next };
  };

  // Always rendered (takes space), invisible when there is no adjacent keyframe to jump to.
  // Made smaller + lower opacity for Figma-like minimalism.
  const renderPreviousPropertyKeyframeButton = (time: number | undefined, label: string) => (
    <button
      type="button"
      aria-label={`Previous ${label} keyframe`}
      title={time !== undefined ? `Previous ${label} keyframe` : undefined}
      disabled={time === undefined}
      onClick={(event) => {
        event.stopPropagation();
        jumpToPropertyKeyframe(time);
      }}
      className={`${keyframeNavButtonClass} ${time === undefined ? 'invisible' : 'opacity-60 hover:opacity-100'}`}
    >
      <ChevronLeft className="size-2.5" />
    </button>
  );

  const renderNextPropertyKeyframeButton = (time: number | undefined, label: string) => (
    <button
      type="button"
      aria-label={`Next ${label} keyframe`}
      title={time !== undefined ? `Next ${label} keyframe` : undefined}
      disabled={time === undefined}
      onClick={(event) => {
        event.stopPropagation();
        jumpToPropertyKeyframe(time);
      }}
      className={`${keyframeNavButtonClass} ${time === undefined ? 'invisible' : 'opacity-60 hover:opacity-100'}`}
    >
      <ChevronRight className="size-2.5" />
    </button>
  );

  const renderPropertyKeyframeControlGroup = (
    keyframes: TimeKeyframe[],
    label: string,
    keyframeButton: React.ReactNode
  ) => {
    const navigator = getPropertyKeyframeNavigator(keyframes);

    return (
      <div className="flex w-[44px] shrink-0 items-center justify-between -mr-1">
        {renderPreviousPropertyKeyframeButton(navigator?.previous, label)}
        {keyframeButton}
        {renderNextPropertyKeyframeButton(navigator?.next, label)}
      </div>
    );
  };

  const toggleKeyframeAtPlayhead = (track: TimelineTrack, value: number) => {
    const playheadTime = clampNumber(quantizeTimeToFrame(currentTime), 0, duration);
    setSelectedMotionTrackId(track.id as MotionTrackId);
    setActiveRecipeId(null);
    setTracks((prevTracks) => prevTracks.map((item) => {
      if (item.id !== track.id) return item;
      const existing = item.keyframes.find((keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04);
      if (existing) {
        return {
          ...item,
          defaultValue: clampNumber(value, item.min, item.max),
          keyframes: item.keyframes.filter((keyframe) => keyframe.id !== existing.id)
        };
      }

      return {
        ...item,
        defaultValue: clampNumber(value, item.min, item.max),
        keyframes: [
          ...item.keyframes,
          {
            id: `${item.id}-${Date.now().toString(36)}`,
            time: playheadTime,
            value: clampNumber(value, item.min, item.max),
            easing: 'ease-in-out' as const
          }
        ].sort((a, b) => a.time - b.time)
      };
    }));
  };

  const lightPositionKeyframeAtPlayhead = () => {
    const playheadTime = quantizeTimeToFrame(currentTime);
    return keyLightPositionKeyframes.find((keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04);
  };

  const toggleLightPositionKeyframeAtPlayhead = () => {
    const playheadTime = clampNumber(quantizeTimeToFrame(currentTime), 0, duration);
    setActiveRecipeId(null);
    setKeyLightPositionKeyframes((prev) => {
      const existing = prev.find((keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04);
      if (existing) return prev.filter((keyframe) => keyframe.id !== existing.id);

      const previousKeyframe = [...prev]
        .sort((a, b) => a.time - b.time)
        .filter((keyframe) => keyframe.time <= playheadTime)
        .pop();

      return [
        ...prev,
        {
          id: `light-position-${Date.now().toString(36)}`,
          time: playheadTime,
          value: activeKeyLightPosition,
          easing: previousKeyframe?.easing ?? 'ease-in-out',
        }
      ].sort((a, b) => a.time - b.time);
    });
  };

  const moveKeyframeAtPlayhead = () => {
    const playheadTime = quantizeTimeToFrame(currentTime);
    return moveKeyframes.find((keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04);
  };

  const toggleMoveKeyframeAtPlayhead = () => {
    const playheadTime = clampNumber(quantizeTimeToFrame(currentTime), 0, duration);
    setSelectedMotionTrackId('move');
    setActiveRecipeId(null);
    setMoveKeyframes((prev) => {
      const existing = prev.find((keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04);
      if (existing) return prev.filter((keyframe) => keyframe.id !== existing.id);

      const previousKeyframe = [...prev]
        .sort((a, b) => a.time - b.time)
        .filter((keyframe) => keyframe.time <= playheadTime)
        .pop();

      return [
        ...prev,
        {
          id: `move-${Date.now().toString(36)}`,
          time: playheadTime,
          value: activeMoveOffset,
          easing: previousKeyframe?.easing ?? 'ease-in-out',
        }
      ].sort((a, b) => a.time - b.time);
    });
  };

  const updateMoveAxis = (axis: keyof LightPosition, value: number) => {
    const clamped = clampNumber(value, -100, 100);
    const playheadTime = clampNumber(quantizeTimeToFrame(currentTime), 0, duration);
    const nextMove = { ...activeMoveOffset, [axis]: clamped };
    setSelectedMotionTrackId('move');
    setActiveRecipeId(null);
    setMoveOffset(nextMove);
    setMoveKeyframes((prev) => {
      if (prev.length === 0) return prev;
      const existing = prev.find((keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04);
      if (existing) {
        return prev.map((keyframe) => keyframe.id === existing.id ? { ...keyframe, value: nextMove } : keyframe);
      }
      const previousKeyframe = [...prev]
        .sort((a, b) => a.time - b.time)
        .filter((keyframe) => keyframe.time <= playheadTime)
        .pop();
      return [
        ...prev,
        {
          id: `move-${Date.now().toString(36)}`,
          time: playheadTime,
          value: nextMove,
          easing: previousKeyframe?.easing ?? 'ease-in-out',
        }
      ].sort((a, b) => a.time - b.time);
    });
  };

  // --- Quality keyframe helpers ---
  const qualityKeyframeAtPlayhead = () => {
    const playheadTime = quantizeTimeToFrame(currentTime);
    return qualityKeyframes.find((kf) => Math.abs(kf.time - playheadTime) < 0.04);
  };

  const toggleQualityKeyframeAtPlayhead = () => {
    const playheadTime = clampNumber(quantizeTimeToFrame(currentTime), 0, duration);
    setActiveRecipeId(null);
    setQualityKeyframes((prev) => {
      const existing = prev.find((kf) => Math.abs(kf.time - playheadTime) < 0.04);
      if (existing) return prev.filter((kf) => kf.id !== existing.id);
      const previousKf = [...prev].sort((a, b) => a.time - b.time).filter((kf) => kf.time <= playheadTime).pop();
      return [...prev, {
        id: `quality-${Date.now().toString(36)}`,
        time: playheadTime,
        value: activeGeometryQuality,
        easing: previousKf?.easing ?? 'ease-in-out' as const,
      }].sort((a, b) => a.time - b.time);
    });
  };

  const updateQuality = (value: number) => {
    const clamped = clampNumber(value, 0.015, 0.12);
    const playheadTime = clampNumber(quantizeTimeToFrame(currentTime), 0, duration);
    setActiveRecipeId(null);
    setGeometryQuality(clamped);
    setQualityKeyframes((prev) => {
      if (prev.length === 0) return prev;
      const existing = prev.find((kf) => Math.abs(kf.time - playheadTime) < 0.04);
      if (existing) return prev.map((kf) => kf.id === existing.id ? { ...kf, value: clamped } : kf);
      const previousKf = [...prev].sort((a, b) => a.time - b.time).filter((kf) => kf.time <= playheadTime).pop();
      return [...prev, {
        id: `quality-${Date.now().toString(36)}`,
        time: playheadTime,
        value: clamped,
        easing: previousKf?.easing ?? 'ease-in-out' as const,
      }].sort((a, b) => a.time - b.time);
    });
  };

  // --- Inner Scale keyframe helpers ---
  const innerScaleKeyframeAtPlayhead = () => {
    const playheadTime = quantizeTimeToFrame(currentTime);
    return innerScaleKeyframes.find((kf) => Math.abs(kf.time - playheadTime) < 0.04);
  };

  const toggleInnerScaleKeyframeAtPlayhead = () => {
    const playheadTime = clampNumber(quantizeTimeToFrame(currentTime), 0, duration);
    setActiveRecipeId(null);
    setInnerScaleKeyframes((prev) => {
      const existing = prev.find((kf) => Math.abs(kf.time - playheadTime) < 0.04);
      if (existing) return prev.filter((kf) => kf.id !== existing.id);
      const previousKf = [...prev].sort((a, b) => a.time - b.time).filter((kf) => kf.time <= playheadTime).pop();
      return [...prev, {
        id: `inner-scale-${Date.now().toString(36)}`,
        time: playheadTime,
        value: activeInnerScale,
        easing: previousKf?.easing ?? 'ease-in-out' as const,
      }].sort((a, b) => a.time - b.time);
    });
  };

  const updateInnerScaleAxis = (axis: keyof LightPosition, value: number) => {
    const clamped = clampNumber(value, axis === 'z' ? 0.2 : 0.35, 1.35);
    const playheadTime = clampNumber(quantizeTimeToFrame(currentTime), 0, duration);
    const nextScale = { ...activeInnerScale, [axis]: clamped };
    setActiveRecipeId(null);
    setInnerElementScale(nextScale);
    setInnerScaleKeyframes((prev) => {
      if (prev.length === 0) return prev;
      const existing = prev.find((kf) => Math.abs(kf.time - playheadTime) < 0.04);
      if (existing) return prev.map((kf) => kf.id === existing.id ? { ...kf, value: nextScale } : kf);
      const previousKf = [...prev].sort((a, b) => a.time - b.time).filter((kf) => kf.time <= playheadTime).pop();
      return [...prev, {
        id: `inner-scale-${Date.now().toString(36)}`,
        time: playheadTime,
        value: nextScale,
        easing: previousKf?.easing ?? 'ease-in-out' as const,
      }].sort((a, b) => a.time - b.time);
    });
  };

  const updateInnerScaleAll = (value: number) => {
    const clamped = clampNumber(value, 0.35, 1.35);
    const playheadTime = clampNumber(quantizeTimeToFrame(currentTime), 0, duration);
    const nextScale = { x: clamped, y: clamped, z: clamped };
    setActiveRecipeId(null);
    setInnerElementScale(nextScale);
    setInnerScaleKeyframes((prev) => {
      if (prev.length === 0) return prev;
      const existing = prev.find((kf) => Math.abs(kf.time - playheadTime) < 0.04);
      if (existing) return prev.map((kf) => kf.id === existing.id ? { ...kf, value: nextScale } : kf);
      const previousKf = [...prev].sort((a, b) => a.time - b.time).filter((kf) => kf.time <= playheadTime).pop();
      return [...prev, {
        id: `inner-scale-${Date.now().toString(36)}`,
        time: playheadTime,
        value: nextScale,
        easing: previousKf?.easing ?? 'ease-in-out' as const,
      }].sort((a, b) => a.time - b.time);
    });
  };

  const updateLightPositionAxis = (axis: keyof LightPosition, value: number) => {
    const clamped = clampNumber(value, -12, 12);
    const playheadTime = clampNumber(quantizeTimeToFrame(currentTime), 0, duration);
    const nextPosition = { ...activeKeyLightPosition, [axis]: clamped };
    setActiveRecipeId(null);
    setKeyLightPosition(nextPosition);
    setKeyLightPositionKeyframes((prev) => {
      if (prev.length === 0) return prev;
      const existing = prev.find((keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04);
      if (existing) {
        return prev.map((keyframe) => keyframe.id === existing.id ? { ...keyframe, value: nextPosition } : keyframe);
      }
      const previousKeyframe = [...prev]
        .sort((a, b) => a.time - b.time)
        .filter((keyframe) => keyframe.time <= playheadTime)
        .pop();
      return [
        ...prev,
        {
          id: `light-position-${Date.now().toString(36)}`,
          time: playheadTime,
          value: nextPosition,
          easing: previousKeyframe?.easing ?? 'ease-in-out',
        }
      ].sort((a, b) => a.time - b.time);
    });
  };

  // Drag-the-orb light control sets X and Y together (Z is left untouched).
  const updateLightPositionXY = (x: number, y: number) => {
    const clampedX = clampNumber(x, -12, 12);
    const clampedY = clampNumber(y, -12, 12);
    const playheadTime = clampNumber(quantizeTimeToFrame(currentTime), 0, duration);
    const nextPosition = { ...activeKeyLightPosition, x: clampedX, y: clampedY };
    setActiveRecipeId(null);
    setKeyLightPosition(nextPosition);
    setKeyLightPositionKeyframes((prev) => {
      if (prev.length === 0) return prev;
      const existing = prev.find((keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04);
      if (existing) {
        return prev.map((keyframe) => keyframe.id === existing.id ? { ...keyframe, value: nextPosition } : keyframe);
      }
      const previousKeyframe = [...prev]
        .sort((a, b) => a.time - b.time)
        .filter((keyframe) => keyframe.time <= playheadTime)
        .pop();
      return [
        ...prev,
        {
          id: `light-position-${Date.now().toString(36)}`,
          time: playheadTime,
          value: nextPosition,
          easing: previousKeyframe?.easing ?? 'ease-in-out',
        }
      ].sort((a, b) => a.time - b.time);
    });
  };

  const setMaterialBaseSetting = (key: MaterialSettingKey, value: number) => {
    if (key === 'roughness') setRoughness(value);
    if (key === 'metalness') setMetalness(value);
    if (key === 'reflectance') setReflectance(value);
    if (key === 'clearcoat') setClearcoat(value);
    if (key === 'clearcoatRoughness') setClearcoatRoughness(value);
    if (key === 'transmission') setTransmission(value);
    if (key === 'thickness') setThickness(value);
    if (key === 'emissiveIntensity') setEmissiveIntensity(value);
  };

  const updateMaterialSetting = (key: MaterialSettingKey, value: number, min: number, max: number) => {
    const clamped = clampNumber(value, min, max);
    const playheadTime = clampNumber(quantizeTimeToFrame(currentTime), 0, duration);
    setActiveRecipeId(null);
    setMaterialBaseSetting(key, clamped);
    setMaterialKeyframes((prev) => {
      if (prev.length === 0) return prev;
      const nextValue = { ...activeMaterialSettings, [key]: clamped };
      const existing = prev.find((keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04);
      if (existing) {
        return prev.map((keyframe) => keyframe.id === existing.id ? { ...keyframe, value: nextValue } : keyframe);
      }
      const previousKeyframe = [...prev]
        .sort((a, b) => a.time - b.time)
        .filter((keyframe) => keyframe.time <= playheadTime)
        .pop();
      return [
        ...prev,
        {
          id: `material-${Date.now().toString(36)}`,
          time: playheadTime,
          value: nextValue,
          easing: previousKeyframe?.easing ?? 'ease-in-out',
        }
      ].sort((a, b) => a.time - b.time);
    });
  };

  const materialKeyframeAtPlayhead = () => {
    const playheadTime = quantizeTimeToFrame(currentTime);
    return materialKeyframes.find((keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04);
  };

  const toggleMaterialKeyframeAtPlayhead = () => {
    const playheadTime = clampNumber(quantizeTimeToFrame(currentTime), 0, duration);
    setActiveRecipeId(null);
    setMaterialKeyframes((prev) => {
      const existing = prev.find((keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04);
      if (existing) return prev.filter((keyframe) => keyframe.id !== existing.id);

      const previousKeyframe = [...prev]
        .sort((a, b) => a.time - b.time)
        .filter((keyframe) => keyframe.time <= playheadTime)
        .pop();

      return [
        ...prev,
        {
          id: `material-${Date.now().toString(36)}`,
          time: playheadTime,
          value: activeMaterialSettings,
          easing: previousKeyframe?.easing ?? 'ease-in-out',
        }
      ].sort((a, b) => a.time - b.time);
    });
  };

  const renderMaterialKeyframeControl = () => {
    const isKeyedHere = Boolean(materialKeyframeAtPlayhead());
    const keyframeButton = (
      <button
        type="button"
        aria-label={`${isKeyedHere ? 'Remove' : 'Add'} material keyframe at current time`}
        title={`${isKeyedHere ? 'Remove' : 'Add'} material keyframe`}
        onClick={(event) => {
          event.stopPropagation();
          toggleMaterialKeyframeAtPlayhead();
        }}
        className={`size-4 shrink-0 rounded flex items-center justify-center transition-colors duration-100 focus-visible:outline-none ${
          isKeyedHere ? '' : 'hover:bg-muted/40'
        }`}
      >
        <span
          className={`size-[7px] rotate-45 rounded-[1px] border transition-all ${isKeyedHere ? 'border-transparent' : 'border-muted-foreground/40'}`}
          style={{ backgroundColor: isKeyedHere ? '#a78bfa' : 'transparent' }}
        />
      </button>
    );

    return renderPropertyKeyframeControlGroup(materialKeyframes, 'material', keyframeButton);
  };

  const renderLightPositionKeyframeControl = () => {
    const isKeyedHere = Boolean(lightPositionKeyframeAtPlayhead());
    const keyframeButton = (
      <button
        type="button"
        aria-label={`${isKeyedHere ? 'Remove' : 'Add'} light position keyframe at current time`}
        title={`${isKeyedHere ? 'Remove' : 'Add'} light position keyframe`}
        onClick={(event) => {
          event.stopPropagation();
          toggleLightPositionKeyframeAtPlayhead();
        }}
        className={`size-4 shrink-0 rounded flex items-center justify-center transition-colors duration-100 focus-visible:outline-none ${
          isKeyedHere ? '' : 'hover:bg-muted/40'
        }`}
      >
        <span
          className={`size-[7px] rotate-45 rounded-[1px] border transition-all ${isKeyedHere ? 'border-transparent' : 'border-muted-foreground/40'}`}
          style={{ backgroundColor: isKeyedHere ? '#ff5b9a' : 'transparent' }}
        />
      </button>
    );

    return renderPropertyKeyframeControlGroup(keyLightPositionKeyframes, 'light position', keyframeButton);
  };

  const renderMoveKeyframeControl = () => {
    const isKeyedHere = Boolean(moveKeyframeAtPlayhead());
    const keyframeButton = (
      <button
        type="button"
        aria-label={`${isKeyedHere ? 'Remove' : 'Add'} move keyframe at current time`}
        title={`${isKeyedHere ? 'Remove' : 'Add'} move keyframe`}
        onClick={(event) => {
          event.stopPropagation();
          toggleMoveKeyframeAtPlayhead();
        }}
        className={`size-4 shrink-0 rounded flex items-center justify-center transition-colors duration-100 focus-visible:outline-none ${
          isKeyedHere ? '' : 'hover:bg-muted/40'
        }`}
      >
        <span
          className={`size-[7px] rotate-45 rounded-[1px] border transition-all ${isKeyedHere ? 'border-transparent' : 'border-muted-foreground/40'}`}
          style={{ backgroundColor: isKeyedHere ? MOVE_COLOR : 'transparent' }}
        />
      </button>
    );

    return renderPropertyKeyframeControlGroup(moveKeyframes, 'move', keyframeButton);
  };

  const renderQualityKeyframeControl = () => {
    const isKeyedHere = Boolean(qualityKeyframeAtPlayhead());
    const keyframeButton = (
      <button
        type="button"
        aria-label={`${isKeyedHere ? 'Remove' : 'Add'} quality keyframe at current time`}
        title={`${isKeyedHere ? 'Remove' : 'Add'} quality keyframe`}
        onClick={(event) => {
          event.stopPropagation();
          toggleQualityKeyframeAtPlayhead();
        }}
        className={`size-4 shrink-0 rounded flex items-center justify-center transition-colors duration-100 focus-visible:outline-none ${
          isKeyedHere ? '' : 'hover:bg-muted/40'
        }`}
      >
        <span
          className={`size-[7px] rotate-45 rounded-[1px] border transition-all ${isKeyedHere ? 'border-transparent' : 'border-muted-foreground/40'}`}
          style={{ backgroundColor: isKeyedHere ? '#94a3b8' : 'transparent' }}
        />
      </button>
    );
    return renderPropertyKeyframeControlGroup(qualityKeyframes, 'quality', keyframeButton);
  };

  const renderInnerScaleKeyframeControl = () => {
    const isKeyedHere = Boolean(innerScaleKeyframeAtPlayhead());
    const keyframeButton = (
      <button
        type="button"
        aria-label={`${isKeyedHere ? 'Remove' : 'Add'} inner scale keyframe at current time`}
        title={`${isKeyedHere ? 'Remove' : 'Add'} inner scale keyframe`}
        onClick={(event) => {
          event.stopPropagation();
          toggleInnerScaleKeyframeAtPlayhead();
        }}
        className={`size-4 shrink-0 rounded flex items-center justify-center transition-colors duration-100 focus-visible:outline-none ${
          isKeyedHere ? '' : 'hover:bg-muted/40'
        }`}
      >
        <span
          className={`size-[7px] rotate-45 rounded-[1px] border transition-all ${isKeyedHere ? 'border-transparent' : 'border-muted-foreground/40'}`}
          style={{ backgroundColor: isKeyedHere ? '#fb923c' : 'transparent' }}
        />
      </button>
    );
    return renderPropertyKeyframeControlGroup(innerScaleKeyframes, 'inner scale', keyframeButton);
  };

  const motionPropertyRowClass = (trackId: MotionTrackId) =>
    `flex min-h-8 items-center gap-1 rounded-[8px] -mx-1.5 px-1.5 py-0.5 transition-colors duration-100 ${
      selectedMotionTrackId === trackId ? 'bg-muted/50' : 'hover:bg-muted/25'
    }`;

  // Figma/Framer-style consistent label + control rows
  const LABEL_WIDTH = 'w-[66px]';
  const propertyRowClass = (isActive?: boolean) =>
    `flex min-h-8 items-center gap-1 rounded-[8px] -mx-1.5 px-1.5 py-0.5 transition-colors duration-100 ${
      isActive ? 'bg-muted/50' : 'hover:bg-muted/25'
    }`;

  const renderKeyframeControl = (track: TimelineTrack, value: number) => {
    const isKeyedHere = Boolean(keyframeAtPlayhead(track));
    const keyframeButton = (
      <button
        type="button"
        aria-label={`${isKeyedHere ? 'Remove' : 'Add'} ${track.name} keyframe at current time`}
        title={`${isKeyedHere ? 'Remove' : 'Add'} ${track.name} keyframe`}
        onClick={(event) => {
          event.stopPropagation();
          toggleKeyframeAtPlayhead(track, value);
        }}
        className={`size-4 shrink-0 rounded flex items-center justify-center transition-colors duration-100 focus-visible:outline-none ${
          isKeyedHere ? '' : 'hover:bg-muted/40'
        }`}
      >
        <span
          className={`size-[7px] rotate-45 rounded-[1px] border transition-all ${isKeyedHere ? 'border-transparent' : 'border-muted-foreground/40'}`}
          style={{ backgroundColor: isKeyedHere ? track.color : 'transparent' }}
        />
      </button>
    );

    return renderPropertyKeyframeControlGroup(track.keyframes, track.name.toLowerCase(), keyframeButton);
  };

  const colorKeyframeAtPlayhead = () => {
    const playheadTime = quantizeTimeToFrame(currentTime);
    return fillKeyframes.find((keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04);
  };

  const toggleSelectedShapeColorKeyframe = () => {
    const playheadTime = clampNumber(quantizeTimeToFrame(currentTime), 0, duration);
    const currentKeyframe = colorKeyframeAtPlayhead();
    markCustom();

    setFillKeyframes((keyframes) => {
      if (currentKeyframe) {
        return keyframes.filter((keyframe) => keyframe.id !== currentKeyframe.id);
      }

      const previousKeyframe = [...keyframes]
        .sort((a, b) => a.time - b.time)
        .filter((keyframe) => keyframe.time <= playheadTime)
        .pop();

      return [
        ...keyframes,
        {
          id: `fill-${Date.now().toString(36)}`,
          time: playheadTime,
          stops: selectedShapeFillStops,
          gradientType: selectedShapeGradientType,
          easing: previousKeyframe?.easing ?? 'ease-in-out',
        },
      ].sort((a, b) => a.time - b.time);
    });
  };

  const renderColorKeyframeControl = () => {
    const isKeyedHere = Boolean(colorKeyframeAtPlayhead());

    const keyframeButton = (
      <button
        type="button"
        aria-label={`${isKeyedHere ? 'Remove' : 'Add'} Fill keyframe at current time`}
        title={`${isKeyedHere ? 'Remove' : 'Add'} Fill keyframe`}
        onClick={(event) => {
          event.stopPropagation();
          toggleSelectedShapeColorKeyframe();
        }}
        className={`size-4 shrink-0 rounded flex items-center justify-center transition-colors duration-100 focus-visible:outline-none ${
          isKeyedHere ? '' : 'hover:bg-muted/40'
        }`}
      >
        <span
          className={`size-[7px] rotate-45 rounded-[1px] border transition-all ${isKeyedHere ? 'border-transparent' : 'border-muted-foreground/40'}`}
          style={{
            background: isKeyedHere
              ? `linear-gradient(135deg, ${selectedShapeFill}, ${selectedShapeFillSecondary})`
              : 'transparent',
          }}
        />
      </button>
    );

    return renderPropertyKeyframeControlGroup(fillKeyframes, 'fill', keyframeButton);
  };

  // Real-time playhead progress loop
  useEffect(() => {
    if (isPlaying) {
      playbackTimeRef.current = clampNumber(currentTimeRef.current, 0, duration);
      lastTimeRef.current = performance.now();
      const tick = () => {
        const now = performance.now();
        const delta = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;

        setCurrentTime((prev) => {
          let next = playbackTimeRef.current + delta;
          if (next >= duration) {
            if (loop) {
              next = next % duration;
            } else {
              next = duration;
              setIsPlaying(false);
              if (exportVideoResolveRef.current) {
                window.requestAnimationFrame(() => {
                  canvas3DRef.current?.stopRecording(finishVideoExport);
                });
              }
            }
          }
          playbackTimeRef.current = next;
          const quantized = quantizeTimeToFrame(next);
          return quantized === prev ? prev : quantized;
        });

        playheadRef.current = requestAnimationFrame(tick);
      };

      playheadRef.current = requestAnimationFrame(tick);
    } else {
      if (playheadRef.current) {
        cancelAnimationFrame(playheadRef.current);
        playheadRef.current = null;
      }
      playbackTimeRef.current = currentTimeRef.current;
    }

    return () => {
      if (playheadRef.current) cancelAnimationFrame(playheadRef.current);
    };
  }, [isPlaying, duration, loop]);

  const handlePlayToggle = () => {
    // Restart from the top if we're paused at the very end.
    if (!isPlaying && currentTime >= duration - 0.001) {
      setCurrentTime(0);
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    const handleEditorShortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      if (isEditableShortcutTarget(event.target)) return;

      // Redo: Cmd+Shift+Z (must check before undo)
      const isRedoShortcut =
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === 'z';

      if (isRedoShortcut) {
        event.preventDefault();
        redoLastEditorChange();
        return;
      }

      // Undo: Cmd+Z
      const isUndoShortcut =
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === 'z';

      if (isUndoShortcut) {
        event.preventDefault();
        undoLastEditorChange();
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.code === 'Space') {
        event.preventDefault();
        handlePlayToggle();
      }
    };

    window.addEventListener('keydown', handleEditorShortcut);
    return () => window.removeEventListener('keydown', handleEditorShortcut);
  }, [handlePlayToggle, undoLastEditorChange, redoLastEditorChange]);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const shapeTransitionBreakpoints = sortedShapes.slice(0, -1).flatMap((from, index) => {
    const to = sortedShapes[index + 1];
    const gap = Math.max(0, to.time - from.time);
    const start = from.time + (from.transitionStart ?? DEFAULT_TRANSITION_START) * gap;
    const end = from.time + (from.transitionEnd ?? DEFAULT_TRANSITION_END) * gap;
    return [start, end];
  });

  const timelineBreakpoints = Array.from(new Set([
    0,
    duration,
    ...shapeTransitionBreakpoints,
    ...fillKeyframes.map((keyframe) => keyframe.time),
    ...tracks.flatMap((track) => track.keyframes.map((keyframe) => keyframe.time)),
    ...moveKeyframes.map((keyframe) => keyframe.time),
    ...keyLightPositionKeyframes.map((keyframe) => keyframe.time),
    ...materialKeyframes.map((keyframe) => keyframe.time),
    ...qualityKeyframes.map((keyframe) => keyframe.time),
    ...innerScaleKeyframes.map((keyframe) => keyframe.time),
  ].map((time) => Number(clampNumber(time, 0, duration).toFixed(3)))))
    .sort((a, b) => a - b);

  const goToTime = (time: number) => {
    setIsPlaying(false);
    setCurrentTime(quantizeTimeToFrame(clampNumber(time, 0, duration)));
  };

  const previousBreakpoint = [...timelineBreakpoints].reverse().find((time) => time < currentTime - 0.04);
  const nextBreakpoint = timelineBreakpoints.find((time) => time > currentTime + 0.04);
  const atTimelineStart = currentTime <= 0.04;
  const atTimelineEnd = currentTime >= duration - 0.04;
  const playbackProgress = duration > 0 ? clampNumber(currentTime / duration, 0, 1) : 0;

  const goToPreviousBreakpoint = () => {
    if (previousBreakpoint !== undefined) goToTime(previousBreakpoint);
  };

  const goToNextBreakpoint = () => {
    if (nextBreakpoint !== undefined) goToTime(nextBreakpoint);
  };

  const goToEnd = () => goToTime(duration);
  const handleDurationChange = (value: number) => {
    const next = clampNumber(value, 0.5, 30);
    setDuration(next);
    setCurrentTime((time) => clampNumber(time, 0, next));
    setActiveRecipeId(null);
  };

  const handleTracksChange = (nextTracks: TimelineTrack[]) => {
    setTracks(nextTracks);
    setActiveRecipeId(null);
  };

  const timelinePropertyRows: TimelinePropertyRow[] = [
    ...(fillKeyframes.length ? [{
      id: 'fill',
      name: 'Fill',
      color: '#ff5b9a',
      keyframes: fillKeyframes.map((keyframe) => ({
        id: keyframe.id,
        time: keyframe.time,
        label: `${keyframe.stops?.[0]?.color ?? fillColor}`,
      })),
    }] : []),
    ...(keyLightPositionKeyframes.length ? [{
      id: 'light-position',
      name: 'Light Position',
      color: '#ffd166',
      keyframes: keyLightPositionKeyframes.map((keyframe) => ({
        id: keyframe.id,
        time: keyframe.time,
        label: `X ${keyframe.value.x.toFixed(1)} Y ${keyframe.value.y.toFixed(1)} Z ${keyframe.value.z.toFixed(1)}`,
      })),
    }] : []),
    ...(moveKeyframes.length ? [{
      id: 'move',
      name: 'Move',
      color: MOVE_COLOR,
      keyframes: moveKeyframes.map((keyframe) => ({
        id: keyframe.id,
        time: keyframe.time,
        label: `X ${keyframe.value.x.toFixed(0)} Y ${keyframe.value.y.toFixed(0)} Z ${keyframe.value.z.toFixed(0)}`,
      })),
    }] : []),
    ...(materialKeyframes.length ? [{
      id: 'material',
      name: 'Material',
      color: '#a78bfa',
      keyframes: materialKeyframes.map((keyframe) => ({
        id: keyframe.id,
        time: keyframe.time,
        label: `M ${keyframe.value.metalness.toFixed(2)} R ${keyframe.value.roughness.toFixed(2)}`,
      })),
    }] : []),
    ...(qualityKeyframes.length ? [{
      id: 'quality',
      name: 'Quality',
      color: '#94a3b8',
      keyframes: qualityKeyframes.map((kf) => ({
        id: kf.id,
        time: kf.time,
        label: kf.value.toFixed(3),
      })),
    }] : []),
    ...(innerScaleKeyframes.length ? [{
      id: 'inner-scale',
      name: 'Inner Scale',
      color: '#fb923c',
      keyframes: innerScaleKeyframes.map((kf) => ({
        id: kf.id,
        time: kf.time,
        label: `X ${kf.value.x.toFixed(2)} Y ${kf.value.y.toFixed(2)} Z ${kf.value.z.toFixed(2)}`,
      })),
    }] : []),
  ];

  const clearTimelineTrackRow = (trackId: string) => {
    setTracks((prev) => prev.map((track) => track.id === trackId ? { ...track, keyframes: [] } : track));
    setActiveRecipeId(null);
  };

  const clearTimelinePropertyRow = (rowId: string) => {
    if (rowId === 'fill') {
      setFillKeyframes([]);
      markCustom();
    }
    if (rowId === 'light-position') {
      setKeyLightPositionKeyframes([]);
      markCustom();
    }
    if (rowId === 'move') {
      setMoveKeyframes([]);
      markCustom();
    }
    if (rowId === 'material') {
      setMaterialKeyframes([]);
      markCustom();
    }
    if (rowId === 'quality') {
      setQualityKeyframes([]);
      markCustom();
    }
    if (rowId === 'inner-scale') {
      setInnerScaleKeyframes([]);
      markCustom();
    }
  };

  const removeTimelinePropertyKeyframe = (rowId: string, keyframeId: string) => {
    if (rowId === 'fill') {
      setFillKeyframes((prev) => prev.filter((keyframe) => keyframe.id !== keyframeId));
      markCustom();
    }
    if (rowId === 'light-position') {
      setKeyLightPositionKeyframes((prev) => prev.filter((keyframe) => keyframe.id !== keyframeId));
      markCustom();
    }
    if (rowId === 'move') {
      setMoveKeyframes((prev) => prev.filter((keyframe) => keyframe.id !== keyframeId));
      markCustom();
    }
    if (rowId === 'material') {
      setMaterialKeyframes((prev) => prev.filter((keyframe) => keyframe.id !== keyframeId));
      markCustom();
    }
    if (rowId === 'quality') {
      setQualityKeyframes((prev) => prev.filter((kf) => kf.id !== keyframeId));
      markCustom();
    }
    if (rowId === 'inner-scale') {
      setInnerScaleKeyframes((prev) => prev.filter((kf) => kf.id !== keyframeId));
      markCustom();
    }
  };

  const handleScrubStart = () => setIsPlaying(false);

  // --- 4. Exporter modal ---
  const [isExportOpen, setIsExportOpen] = useState(false);
  const canvas3DRef = useRef<SvgCanvasRef>(null);

  const finishVideoExport = (blob: Blob) => {
    if (exportVideoTimeoutRef.current !== null) {
      window.clearTimeout(exportVideoTimeoutRef.current);
      exportVideoTimeoutRef.current = null;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vectorforge-timeline.webm';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    exportVideoResolveRef.current?.();
    exportVideoResolveRef.current = null;
    exportVideoRejectRef.current = null;
  };

  const exportTimelineVideo = () => new Promise<void>((resolve, reject) => {
    if (!canvas3DRef.current) {
      reject(new Error('Canvas is not ready.'));
      return;
    }
    if (exportVideoResolveRef.current) {
      reject(new Error('Video export is already running.'));
      return;
    }

    exportVideoResolveRef.current = resolve;
    exportVideoRejectRef.current = reject;
    setLoop(false);
    setIsPlaying(false);
    setCurrentTime(0);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        try {
          canvas3DRef.current?.startRecording();
          setCurrentTime(0);
          setIsPlaying(true);
          exportVideoTimeoutRef.current = window.setTimeout(() => {
            try {
              canvas3DRef.current?.stopRecording(finishVideoExport);
            } catch (error) {
              exportVideoRejectRef.current?.(error instanceof Error ? error : new Error('Video export failed.'));
              exportVideoResolveRef.current = null;
              exportVideoRejectRef.current = null;
            }
          }, Math.ceil(duration * 1000) + 250);
        } catch (error) {
          exportVideoResolveRef.current = null;
          exportVideoRejectRef.current = null;
          reject(error instanceof Error ? error : new Error('Video export failed.'));
        }
      });
    });
  });

  // --- 5. File input loader for custom SVGs ---
  // Upload a custom SVG into a specific shape stop.
  const uploadSvgToShape = (e: React.ChangeEvent<HTMLInputElement>, shapeId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type && file.type !== 'image/svg+xml') {
      e.target.value = '';
      return;
    }
    markCustom();
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setShapes((prev) => prev.map((s) => s.id === shapeId ? { ...s, iconId: 'custom', iconName: 'Custom', svgContent: content } : s));
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleDropSvg = (e: React.DragEvent) => {
    const file = e.dataTransfer.files[0];
    if (!file || file.type !== 'image/svg+xml' || !selectedShapeId) return;
    markCustom();
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) setShapes((prev) => prev.map((s) => s.id === selectedShapeId ? { ...s, iconId: 'custom', iconName: 'Custom', svgContent: text } : s));
    };
    reader.readAsText(file);
  };

  const uploadFileRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<string | null>(null);
  const triggerShapeUpload = (shapeId: string) => {
    uploadTargetRef.current = shapeId;
    uploadFileRef.current?.click();
  };

  // Customize the transition leaving a given shape (blend style / direction).
  const setShapeBlend = (shapeId: string, patch: Partial<Pick<ShapeStop, 'transitionType' | 'wipeDirection'>>) => {
    markCustom();
    setShapes((prev) => prev.map((s) => s.id === shapeId ? { ...s, ...patch } : s));
  };

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-background text-foreground font-sans select-none antialiased">
      
      {/* =========================================================================
          1. TOP BAR
          ========================================================================= */}
      <div className="h-14 border-b border-border flex items-center justify-between px-3 bg-background/95 backdrop-blur-xl shrink-0 relative z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            aria-label={zenMode ? "Show panels" : "Hide panels"}
            onClick={() => setZenMode(!zenMode)}
            className="size-9 rounded-lg border border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            {zenMode ? <PanelLeftOpen className="mx-auto size-4" /> : <PanelLeftClose className="mx-auto size-4" />}
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground text-sm tracking-tight">VectorForge</span>
                <span className="hidden sm:inline text-[10px] uppercase tracking-[0.18em] text-muted-foreground">3D Motion Studio</span>
              </div>
            </div>
          </div>
        </div>

        <div />

        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="ghost"
            aria-label={themeToggleLabel}
            title={themeToggleLabel}
            onClick={() => {
              if (!themeMounted) return;
              setTheme(isLightTheme ? 'dark' : 'light');
            }}
            className="size-8 rounded-lg border border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {isLightTheme ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
          </Button>
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 font-medium h-8 rounded-lg text-xs" onClick={() => setIsExportOpen(true)}>
            <Download className="size-3.5" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 bg-muted/40 dark:bg-[#111214]">

        {/* MIDDLE SECTION: Interactive WebGL Viewport Canvas */}
        <div className={`transition-all duration-300 ease-out flex-1 flex flex-col min-w-0 ${
          zenMode ? 'p-0 gap-0' : 'p-4 gap-2'
        }`}>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
                setIsDragging(false);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleDropSvg(e);
            }}
            className={`flex-1 min-h-0 relative transition-all duration-300 ease-out ${
              zenMode ? 'rounded-none border-0' : 'rounded-lg border border-border overflow-hidden bg-muted/40 dark:bg-[#0b0c0e]'
            }`}
          >
            <SvgCanvas
              ref={canvas3DRef}
              iconAContent={iconAContent}
              iconBContent={iconBContent}
              materialPreset={materialPreset}
              colorA={colorA}
              colorB={renderColorB}
              colorASecondary={renderColorASecondary}
              colorBSecondary={renderColorBSecondary}
              colorAStops={renderColorAStops}
              colorBStops={renderColorBStops}
              enableGradient={renderEnableGradient}
              gradientType={renderGradientType}
              roughness={activeMaterialSettings.roughness}
              metalness={activeMaterialSettings.metalness}
              reflectance={activeMaterialSettings.reflectance}
              clearcoat={activeMaterialSettings.clearcoat}
              clearcoatRoughness={activeMaterialSettings.clearcoatRoughness}
              transmission={activeMaterialSettings.transmission}
              thickness={activeMaterialSettings.thickness}
              emissiveIntensity={activeMaterialSettings.emissiveIntensity}
              wireframe={wireframe}
              extrusionDepth={activeExtrusionDepth}
              bevelEnabled={bevelEnabled}
              bevelThickness={bevelThickness}
              bevelSize={bevelSize}
              bevelSegments={bevelSegments}
              geometryQuality={activeGeometryQuality}
              layerSpacing={layerSpacing}
              innerElementScale={activeInnerScale}
              transitionType={transitionType}
              wipeDirection={wipeDirection}
              transitionProgress={activeTransitionProgress}
              rotationOffset={{ x: rotationOffset.x, y: activeRotationY, z: rotationOffset.z }}
              objectScale={activeObjectScale}
              objectScaleAxes={objectScaleAxes}
              moveOffset={activeMoveOffset}
              isPlaying={isPlaying}
              ambientColor={ambientColor}
              ambientIntensity={ambientIntensity}
              keyLightColor={keyLightColor}
              keyLightIntensity={activeKeyLightIntensity}
              keyLightPosition={activeKeyLightPosition}
              keyLightSoftness={keyLightSoftness}
              rimLightColor={rimLightColor}
              rimLightIntensity={rimLightIntensity}
              zoom={zoom}
              viewInertiaEnabled={viewInertiaEnabled}
              showCenterPoint={showCenterPoint}
              showTransformGizmo={showTransformGizmo}
              onZoomChange={setZoom}
              onViewRotationCommit={handleViewRotationCommit}
              onViewRotationSet={handleViewRotationSet}
              onObjectScaleChange={(value) => {
                handleScaleChange(value);
                setActiveRecipeId(null);
              }}
              onObjectScaleAxisChange={handleScaleAxisChange}
              onMoveOffsetChange={(axis, value) => {
                updateMoveAxis(axis, value);
                setActiveRecipeId(null);
              }}
              onRotationAxisChange={(axis, value) => {
                if (axis === 'y') {
                  handleSpinChange(value);
                } else {
                  setRotationOffset((current) => ({ ...current, [axis]: value }));
                  setActiveRecipeId(null);
                }
              }}
              onModelReadyChange={setIsPreviewModelReady}
            />

            {/* Drag & drop an SVG to replace the selected shape */}
            {isDragging && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 backdrop-blur-md animate-fade-in">
                <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-white/25 p-8">
                  <Upload className="size-8 text-white/70" />
                  <div className="text-center">
                    <span className="block text-sm font-semibold text-white">Drop SVG here</span>
                    <span className="mt-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Replaces the selected shape</span>
                  </div>
                </div>
              </div>
            )}

            <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
              <Popover>
                <PopoverTrigger
                  aria-label="View options"
                  title="View options"
                  className="flex h-7 w-8 items-center justify-center rounded-lg border border-border bg-background/70 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 dark:bg-black/55 dark:hover:bg-black/70"
                >
                  <MoreHorizontal className="size-4" />
                </PopoverTrigger>
                <PopoverContent align="end" side="bottom" sideOffset={8} className="w-44 border-border bg-popover p-1.5 text-popover-foreground">
                  <button
                    type="button"
                    onClick={() => {
                      canvas3DRef.current?.resetRotation();
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    <span className="text-[11px] text-foreground">Reset view</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewInertiaEnabled((enabled) => !enabled)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    <span className="text-[11px] text-foreground">Inertia</span>
                    <Switch
                      checked={viewInertiaEnabled}
                      onCheckedChange={(checked) => setViewInertiaEnabled(checked)}
                      onClick={(event) => event.stopPropagation()}
                      size="sm"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCenterPoint((visible) => !visible)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    <span className="text-[11px] text-foreground">Center point</span>
                    <Switch
                      checked={showCenterPoint}
                      onCheckedChange={(checked) => setShowCenterPoint(checked)}
                      onClick={(event) => event.stopPropagation()}
                      size="sm"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTransformGizmo((visible) => !visible)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    <span className="text-[11px] text-foreground">Transform gizmo</span>
                    <Switch
                      checked={showTransformGizmo}
                      onCheckedChange={(checked) => setShowTransformGizmo(checked)}
                      onClick={(event) => event.stopPropagation()}
                      size="sm"
                    />
                  </button>
                </PopoverContent>
              </Popover>
            </div>

            <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/75 px-3 py-2 shadow-2xl backdrop-blur-xl transition-colors hover:border-border dark:border-white/10 dark:bg-black/65 dark:hover:border-border">
              <Button
                size="icon"
                variant="ghost"
                onClick={handleReset}
                disabled={atTimelineStart}
                aria-label="Go to start"
                title="Go to start"
                className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <SkipBack size={14} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={goToPreviousBreakpoint}
                disabled={previousBreakpoint === undefined}
                aria-label="Previous breakpoint"
                title="Previous breakpoint"
                className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </Button>
              <div className="relative grid size-11 place-items-center">
                {zenMode && (
                  <svg className="pointer-events-none absolute inset-0 -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
                    <circle
                      cx="22"
                      cy="22"
                      r="20"
                      fill="none"
                      stroke="var(--border)"
                      strokeOpacity="0.5"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx="22"
                      cy="22"
                      r="20"
                      fill="none"
                      stroke="var(--foreground)"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeDasharray={`${(playbackProgress * 125.66).toFixed(2)} 125.66`}
                    />
                  </svg>
                )}
                <Button
                  size="icon"
                  onClick={handlePlayToggle}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="size-10 rounded-full bg-foreground text-background hover:bg-foreground/85"
                >
                  {isPlaying ? <Pause size={16} className="fill-current" /> : <Play size={16} className="fill-current" />}
                </Button>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={goToNextBreakpoint}
                disabled={nextBreakpoint === undefined}
                aria-label="Next breakpoint"
                title="Next breakpoint"
                className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={goToEnd}
                disabled={atTimelineEnd}
                aria-label="Go to end"
                title="Go to end"
                className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <SkipForward size={14} />
              </Button>
              {zenMode && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setZenMode(false)}
                  className="h-7 rounded-full px-2 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Exit
                </Button>
              )}
            </div>
          </div>

        </div>

        <div className={`transition-all duration-300 ease-out flex flex-col shrink-0 overflow-y-auto bg-background dark:bg-[#111113] ${
          zenMode ? 'w-0 opacity-0 border-l-0 pointer-events-none p-0' : 'w-[312px] border-l border-border/40 px-4 py-3 gap-3'
        }`}>

          {/* Style */}
          <div className="flex flex-col gap-1.5">
            <div className="flex h-6 items-center justify-between">
              <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground/70">STYLE</div>
              <div className="text-[10px] text-muted-foreground/50 tabular-nums">{MATERIAL_METADATA[materialPreset].name}</div>
            </div>

            <div ref={inspectorRefs.fill} className={propertyRowClass()}>
              <span className={`${LABEL_WIDTH} shrink-0 text-[11px] text-muted-foreground`}>Fill</span>
              <div className="flex-1 min-w-0">
                <ColorPicker
                  value={selectedShapeFill}
                  onChange={(val) => updateSelectedShapeColor(val)}
                  gradient={fillMode === 'gradient'}
                  onGradientToggle={(on) => { setFillMode(on ? 'gradient' : 'solid'); setEnableGradient(on); markCustom(); }}
                  gradientType={selectedShapeGradientType}
                  onGradientTypeChange={updateSelectedShapeGradientType}
                  stops={selectedShapeFillStops}
                  onStopsChange={updateSelectedShapeFillStops}
                  secondaryValue={selectedShapeFillSecondary}
                  onSecondaryChange={(val) => updateSelectedShapeColor(val, true)}
                  className="h-7 w-full rounded-[5px] px-2 py-0 bg-foreground/[0.06] border-0 text-foreground hover:bg-foreground/[0.09]"
                />
              </div>
              {renderColorKeyframeControl()}
            </div>

            <div className="pt-0.5">
              <div className="mb-1 flex h-5 items-center text-[10px] font-semibold tracking-[0.12em] text-muted-foreground/70">FINISH</div>
              <div className="flex items-center gap-2.5">
                {FINISH_PRESETS.map((preset) => {
                  const isActive = materialPreset === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      aria-label={MATERIAL_METADATA[preset].name}
                      title={MATERIAL_METADATA[preset].name}
                      onClick={() => {
                        setMaterialPreset(preset);
                        setActiveRecipeId(null);
                        setMaterialKeyframes([]);
                      }}
                      className="group/finish relative flex items-center justify-center focus-visible:outline-none"
                    >
                      <span
                        className={`size-6 rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.35),inset_0_-1px_2px_rgba(0,0,0,0.2)] transition-all duration-100 ${
                          isActive ? 'ring-2 ring-ring/60 ring-offset-1 ring-offset-background' : 'hover:ring-2 hover:ring-foreground/20 hover:ring-offset-1 hover:ring-offset-background'
                        }`}
                        style={{ background: MATERIAL_PREVIEW[preset] }}
                      />
                      <span className="pointer-events-none absolute -top-7 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded border border-border bg-popover px-2 py-1 text-[10px] font-medium text-popover-foreground opacity-0 shadow-md transition-opacity duration-100 group-hover/finish:opacity-100">
                        {MATERIAL_METADATA[preset].name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div ref={inspectorRefs.material} className="pt-1">
              <div className="flex items-center gap-2 mb-1">
                <button
                  type="button"
                  onClick={() => setIsAdvancedMaterialOpen((open) => !open)}
                  className="flex h-5 min-w-0 flex-1 items-center gap-1 rounded text-left text-[10px] font-medium text-muted-foreground/70 hover:text-foreground transition-colors focus-visible:outline-none"
                  aria-expanded={isAdvancedMaterialOpen}
                >
                  <ChevronRight className={`size-2.5 transition-transform duration-150 ${isAdvancedMaterialOpen ? 'rotate-90' : ''}`} />
                  ADVANCED
                  {materialKeyframes.length > 0 && <span className="ml-1 size-1.5 rounded-full bg-violet-400" />}
                </button>
                {renderMaterialKeyframeControl()}
              </div>
              {isAdvancedMaterialOpen && [
                { key: 'roughness' as const, label: 'Smoothness', value: activeMaterialSettings.roughness, min: 0, max: 1, sliderMax: 1, step: 0.02, precision: 2 },
                { key: 'metalness' as const, label: 'Metallic', value: activeMaterialSettings.metalness, min: 0, max: 1, sliderMax: 1, step: 0.02, precision: 2 },
                { key: 'reflectance' as const, label: 'Reflectance', value: activeMaterialSettings.reflectance, min: 0, max: 1, sliderMax: 1, step: 0.02, precision: 2 },
                { key: 'clearcoat' as const, label: 'Clearcoat', value: activeMaterialSettings.clearcoat, min: 0, max: 1, sliderMax: 1, step: 0.05, precision: 2 },
                { key: 'clearcoatRoughness' as const, label: 'Coat Soft', value: activeMaterialSettings.clearcoatRoughness, min: 0, max: 1, sliderMax: 1, step: 0.05, precision: 2 },
                { key: 'transmission' as const, label: 'Transparency', value: activeMaterialSettings.transmission, min: 0, max: 1, sliderMax: 1, step: 0.05, precision: 2 },
                { key: 'thickness' as const, label: 'Glass Depth', value: activeMaterialSettings.thickness, min: 0.1, max: 4, sliderMax: 2, step: 0.1, precision: 1 },
                { key: 'emissiveIntensity' as const, label: 'Emission', value: activeMaterialSettings.emissiveIntensity, min: 0, max: 5, sliderMax: 2, step: 0.1, precision: 1 },
              ].map(({ key, label, value, min, max, sliderMax, step, precision }) => (
                <div key={key} className={propertyRowClass()}>
                  <span className={`${LABEL_WIDTH} shrink-0 text-[11px] text-muted-foreground`}>{label}</span>
                  <InspectorSlider
                    value={value}
                    min={min}
                    max={max}
                    sliderMax={sliderMax}
                    step={step}
                    precision={precision}
                    inputClassName="w-[58px]"
                    onChange={(next) => updateMaterialSetting(key, next, min, max)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Shape */}
          <div className="flex flex-col gap-1.5">
            <div className="flex h-6 items-center text-[10px] font-semibold tracking-[0.12em] text-muted-foreground/70">SHAPE</div>

            {/* Extrude */}
            <div ref={inspectorRefs.extrusion} className={propertyRowClass(selectedMotionTrackId === 'extrusion')} onClick={() => setSelectedMotionTrackId('extrusion')}>
              <span className={`${LABEL_WIDTH} shrink-0 text-[11px] text-muted-foreground`}>
                Extrude
                {extrusionTrack.keyframes.length > 0 && <span className="inline-block size-1 rounded-full ml-1 align-middle" style={{ backgroundColor: extrusionTrack.color }} />}
              </span>
              {(() => {
                const depthValue = finiteNumber(extrusionTrack.keyframes.length > 0 ? activeExtrusionDepth : extrusionDepth, EXTRUDE_DEFAULT);
                return (
                  <>
                    <InspectorSlider
                      value={depthValue}
                      min={0.2}
                      max={EXTRUDE_MAX}
                      sliderMax={40}
                      step={0.25}
                      scrubStep={1}
                      precision={2}
                      onChange={(value) => { handleDepthChange(value); setActiveRecipeId(null); }}
                    />
                    {renderKeyframeControl(extrusionTrack, depthValue)}
                  </>
                );
              })()}
            </div>

            {/* Bevel */}
            <div className={propertyRowClass()}>
              <span className={`${LABEL_WIDTH} shrink-0 text-[11px] text-muted-foreground`}>Bevel</span>
              {bevelEnabled && (
                <>
                  <InspectorSlider
                    value={bevelSegments}
                    min={1}
                    max={MAX_BEVEL_SEGMENTS}
                    sliderMax={12}
                    step={1}
                    precision={0}
                    onChange={(value) => { setBevelSegments(Math.round(value)); setActiveRecipeId(null); }}
                  />
                </>
              )}
              {!bevelEnabled && <span className="h-7 flex-1" />}
              <div className="flex w-[44px] shrink-0 justify-center -mr-1">
                <Switch
                  checked={bevelEnabled}
                  onCheckedChange={(val) => { setBevelEnabled(val); setActiveRecipeId(null); }}
                  size="sm"
                />
              </div>
            </div>

            {/* Quality */}
            <div className={propertyRowClass()}>
              <span className={`${LABEL_WIDTH} shrink-0 text-[11px] text-muted-foreground`}>
                Quality
                {qualityKeyframes.length > 0 && <span className="inline-block size-1 rounded-full ml-1 align-middle" style={{ backgroundColor: '#94a3b8' }} />}
              </span>
              <InspectorSlider
                value={activeGeometryQuality}
                min={0.015}
                max={0.12}
                sliderMin={0.015}
                sliderMax={0.08}
                step={0.005}
                precision={3}
                onChange={updateQuality}
              />
              {renderQualityKeyframeControl()}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border/40" />

          {/* Transform — Scale + Inner Scale grouped together (Figma-like) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex h-6 items-center text-[10px] font-semibold tracking-[0.12em] text-muted-foreground/70">TRANSFORM</div>

            {/* Scale */}
            <div ref={inspectorRefs.scale} className={propertyRowClass(selectedMotionTrackId === 'scale')} onClick={() => setSelectedMotionTrackId('scale')}>
              <span className={`${LABEL_WIDTH} flex shrink-0 items-center text-[11px] text-muted-foreground`}>
                <span>
                  Scale
                  {scaleTrack.keyframes.length > 0 && <span className="inline-block size-1 rounded-full ml-1 align-middle" style={{ backgroundColor: scaleTrack.color }} />}
                </span>
                <AxisLockButton locked={isScaleLocked} label="Scale" onToggle={() => setIsScaleLocked((locked) => !locked)} />
              </span>
              {(() => {
                const scaleValue = finiteNumber(scaleTrack.keyframes.length > 0 ? activeObjectScale : objectScale, SCALE_DEFAULT);
                return (
                  <>
                    {isScaleLocked ? (
                      <InspectorSlider
                        value={scaleValue}
                        min={0.1}
                        max={SCALE_MAX}
                        sliderMax={2}
                        step={0.05}
                        precision={2}
                        onChange={(value) => { handleScaleChange(value); setActiveRecipeId(null); }}
                      />
                    ) : (
                      <div className="flex flex-1 items-center justify-start gap-1">
                        {(['X', 'Y', 'Z'] as const).map((axis) => (
                          <NumberField
                            key={axis}
                            value={objectScaleAxes[axis.toLowerCase() as keyof LightPosition]}
                            min={0.1}
                            max={SCALE_MAX}
                            step={0.05}
                            prefix={axis}
                            prefixColor={AXIS_COLORS[axis]}
                            precision={2}
                            className="w-[50px]"
                            inputClassName="text-right"
                            onChange={(value) => handleScaleAxisChange(axis.toLowerCase() as keyof LightPosition, value)}
                          />
                        ))}
                      </div>
                    )}
                    {renderKeyframeControl(scaleTrack, scaleValue)}
                  </>
                );
              })()}
            </div>

            {/* Inner Scale — now lives right under Scale (user request) */}
            <div className={propertyRowClass()}>
              <span className={`${LABEL_WIDTH} flex shrink-0 items-center text-[11px] text-muted-foreground`}>
                <span>
                  Inner
                  {innerScaleKeyframes.length > 0 && <span className="inline-block size-1 rounded-full ml-1 align-middle" style={{ backgroundColor: '#fb923c' }} />}
                </span>
                <AxisLockButton locked={isInnerScaleLocked} label="Inner scale" onToggle={() => setIsInnerScaleLocked((locked) => !locked)} />
              </span>
              {isInnerScaleLocked ? (
                <InspectorSlider
                  value={(activeInnerScale.x + activeInnerScale.y + activeInnerScale.z) / 3}
                  min={0.35}
                  max={1.35}
                  sliderMax={1.25}
                  step={0.01}
                  scrubStep={0.03}
                  precision={2}
                  onChange={updateInnerScaleAll}
                />
              ) : (
                <div className="flex flex-1 items-center justify-start gap-1">
                  {(['x', 'y', 'z'] as const).map((axis) => (
                    <NumberField
                      key={axis}
                      value={activeInnerScale[axis]}
                      min={axis === 'z' ? 0.2 : 0.35}
                      max={1.35}
                      step={0.01}
                      scrubStep={0.03}
                      precision={2}
                      prefix={axis.toUpperCase()}
                      prefixColor={AXIS_COLORS[axis.toUpperCase()]}
                      className="w-[50px]"
                      inputClassName="text-right"
                      onChange={(value) => updateInnerScaleAxis(axis, value)}
                    />
                  ))}
                </div>
              )}
              {renderInnerScaleKeyframeControl()}
            </div>

            {/* Rotation */}
            <div ref={inspectorRefs.rotation} className={propertyRowClass(selectedMotionTrackId === 'rotation')} onClick={() => setSelectedMotionTrackId('rotation')}>
              <span className={`${LABEL_WIDTH} shrink-0 text-[11px] text-muted-foreground`}>
                Rotation
                {rotationTrack.keyframes.length > 0 && <span className="inline-block size-1 rounded-full ml-1 align-middle" style={{ backgroundColor: rotationTrack.color }} />}
              </span>
              <div className="flex flex-1 items-center justify-start gap-1">
                {([
                  { label: 'X', axis: 'x' as const, value: rotationOffset.x },
                  { label: 'Y', axis: 'y' as const, value: activeRotationY, animated: true },
                  { label: 'Z', axis: 'z' as const, value: rotationOffset.z },
                ]).map(({ label, axis, value, animated }) => (
                  <NumberField
                    key={axis}
                    value={value}
                    min={ROTATION_MIN}
                    max={ROTATION_MAX}
                    step={1}
                    scrubStep={3}
                    prefix={label}
                    prefixColor={AXIS_COLORS[label]}
                    suffix="°"
                    precision={0}
                    className="w-[50px]"
                    inputClassName="text-right"
                    onChange={(nextValue) => {
                      const clamped = clampNumber(nextValue, ROTATION_MIN, ROTATION_MAX);
                      if (animated) {
                        handleSpinChange(clamped);
                      } else {
                        setRotationOffset((prev) => ({ ...prev, [axis]: clamped }));
                        setActiveRecipeId(null);
                      }
                    }}
                  />
                ))}
              </div>
              {renderKeyframeControl(rotationTrack, activeRotationY)}
            </div>

            {/* Move */}
            <div ref={inspectorRefs.move} className={propertyRowClass(selectedMotionTrackId === 'move')} onClick={() => setSelectedMotionTrackId('move')}>
              <span className={`${LABEL_WIDTH} shrink-0 text-[11px] text-muted-foreground`}>
                Position
                {moveKeyframes.length > 0 && <span className="inline-block size-1 rounded-full ml-1 align-middle" style={{ backgroundColor: MOVE_COLOR }} />}
              </span>
              <div className="flex flex-1 items-center justify-start gap-1">
                {([
                  { label: 'X', axis: 'x' as const },
                  { label: 'Y', axis: 'y' as const },
                  { label: 'Z', axis: 'z' as const },
                ]).map(({ label, axis }) => (
                  <NumberField
                    key={axis}
                    value={activeMoveOffset[axis]}
                    min={-100}
                    max={100}
                    step={1}
                    prefix={label}
                    prefixColor={AXIS_COLORS[label]}
                    precision={0}
                    className="w-[50px]"
                    inputClassName="text-right"
                    onChange={(value) => { updateMoveAxis(axis, value); }}
                  />
                ))}
              </div>
              {renderMoveKeyframeControl()}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border/40" />

          {/* Light */}
          <div className="flex flex-col gap-1.5">
            <div className="flex h-6 items-center text-[10px] font-semibold tracking-[0.12em] text-muted-foreground/70">LIGHT</div>

            <div ref={inspectorRefs.lighting} className={propertyRowClass(selectedMotionTrackId === 'lighting')} onClick={() => setSelectedMotionTrackId('lighting')}>
              <span className={`${LABEL_WIDTH} shrink-0 text-[11px] text-muted-foreground`}>
                Light
                {lightingTrack.keyframes.length > 0 && <span className="inline-block size-1 rounded-full ml-1 align-middle" style={{ backgroundColor: lightingTrack.color }} />}
              </span>
              <div className="flex flex-1 items-center justify-end gap-1">
                <div onClick={(e) => e.stopPropagation()}>
                  <LightDirectionPicker
                    position={activeKeyLightPosition}
                    color={keyLightColor}
                    softness={keyLightSoftness}
                    onDirectionChange={updateLightPositionXY}
                    onColorChange={(color) => { setKeyLightColor(color); setActiveRecipeId(null); }}
                    onSoftnessChange={(value) => { setKeyLightSoftness(value); setActiveRecipeId(null); }}
                    isKeyed={Boolean(lightPositionKeyframeAtPlayhead())}
                    onToggleKeyframe={toggleLightPositionKeyframeAtPlayhead}
                    keyframeControls={renderLightPositionKeyframeControl()}
                  />
                </div>
                <NumberField value={finiteNumber(lightingTrack.keyframes.length > 0 ? activeKeyLightIntensity : keyLightIntensity, 1)} min={0} max={LIGHT_MAX} step={0.1} precision={1} className="w-[58px]" onChange={(value) => { handleBrightnessChange(value); setActiveRecipeId(null); }} />
              </div>
              {renderKeyframeControl(lightingTrack, finiteNumber(lightingTrack.keyframes.length > 0 ? activeKeyLightIntensity : keyLightIntensity, 1))}
            </div>
          </div>

        </div>

      </div>

      {/* =========================================================================
          3. KEYFRAME TIMELINE Scrubber
          ========================================================================= */}
      <div className={`transition-all duration-500 ease-in-out shrink-0 overflow-hidden ${zenMode ? 'h-0 border-t-0' : 'h-[184px] border-t border-border bg-background dark:bg-[#0f1012]'}`}>
        <Timeline
          duration={duration}
          onDurationChange={handleDurationChange}
          currentTime={currentTime}
          onTimeChange={setCurrentTime}
          onScrubStart={handleScrubStart}
          isPlaying={isPlaying}
          isPreviewLoading={!isPreviewModelReady}
          loop={loop}
          onLoopChange={setLoop}
          tracks={tracks}
          onTracksChange={handleTracksChange}
          propertyRows={timelinePropertyRows}
          onClearTrackKeyframes={clearTimelineTrackRow}
          onClearPropertyRow={clearTimelinePropertyRow}
          onRemovePropertyKeyframe={removeTimelinePropertyKeyframe}
          activeTrackId={selectedMotionTrackId}
          onActiveTrackChange={selectTimelineTrack}
          onActivePropertyRowChange={selectTimelinePropertyRow}
          shapes={shapes}
          selectedShapeId={selectedShapeId}
          onSelectShape={setSelectedShapeId}
          onShapesChange={(next) => { markCustom(); setShapes(next); }}
          onAddShape={addShapeAtPlayhead}
          onRemoveShape={removeShape}
          onShapeEasingChange={(id, easing) => { markCustom(); setShapes((prev) => prev.map((s) => s.id === id ? { ...s, easing } : s)); }}
          shapeOptions={PRESET_ICONS}
          onShapeIconChange={setShapeIcon}
          onShapeWipePairChange={setShapeWipePair}
          onUploadShape={triggerShapeUpload}
          onShapeBlendChange={setShapeBlend}
          openShapePicker={openShapePicker}
          onOpenShapePicker={setOpenShapePicker}
          wipeDirections={directions}
        />
      </div>

      <input
        ref={uploadFileRef}
        type="file"
        accept=".svg"
        className="hidden"
        onChange={(e) => { const id = uploadTargetRef.current; if (id) uploadSvgToShape(e, id); }}
      />

      {/* =========================================================================
          4. EXPORT STUDIO MODAL
          ========================================================================= */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onExportGltf={() => canvas3DRef.current?.exportGltf()}
        onExportVideo={exportTimelineVideo}
        materialPreset={materialPreset}
        colorA={colorA}
        colorB={colorB}
        roughness={roughness}
        metalness={metalness}
        reflectance={reflectance}
        clearcoat={clearcoat}
        clearcoatRoughness={clearcoatRoughness}
        transmission={transmission}
        thickness={thickness}
        emissiveIntensity={emissiveIntensity}
        extrusionDepth={activeExtrusionDepth}
        bevelEnabled={bevelEnabled}
        bevelThickness={bevelThickness}
        bevelSize={bevelSize}
        bevelSegments={bevelSegments}
        layerSpacing={layerSpacing}
        transitionType={transitionType}
        ambientIntensity={ambientIntensity}
        keyLightIntensity={activeKeyLightIntensity}
        rimLightIntensity={rimLightIntensity}
        svgPathA={iconAContent}
        svgPathB={iconBContent}
      />

    </div>
  );
}
