'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, Sliders,
  Upload, Download, RefreshCw, Undo2,
  ArrowUpLeft, ArrowUp, ArrowUpRight, ArrowLeft, ArrowRight, ArrowDownLeft, ArrowDown, ArrowDownRight, Compass,
  Box, Wand2, Palette, Cuboid, Orbit, PanelLeftClose, PanelLeftOpen, Rows3, Blend, ChevronDown,
  Sun, Maximize2, ChevronLeft, ChevronRight, SkipBack, SkipForward
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ColorPicker } from '@/components/ui/color-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PRESET_ICONS, PresetIcon } from './IconLibrary';
import { SvgCanvas, SvgCanvasRef } from '../3d/SvgCanvas';
import { MaterialPresetId } from '../3d/MaterialPresets';
import { Timeline, TimelineTrack, interpolateKeyframes, interpolateFillKeyframes, applyEasing, EasingType, ShapeStop, FillStop, FillGradientType } from './Timeline';
import { ExportModal } from './ExportModal';
import { MOTION_RECIPES } from './MotionRecipes';

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
  clay: {
    name: "Matte Clay",
    subtitle: "Plaster Feel",
    description: "A soft, non-reflective plaster finish. Ideal for showcasing raw geometry, structural contours, and smooth, clean shadows.",
    glowColor: "rgba(230, 230, 230, 0.15)"
  },
  glass: {
    name: "Satin Glass",
    subtitle: "Translucent Refract",
    description: "Ultra-premium glassmorphism with dynamic light refraction, subtle varnish coats, and high physical background transmission.",
    glowColor: "rgba(14, 165, 233, 0.25)"
  },
  chrome: {
    name: "Liquid Silver",
    subtitle: "Mirror Metal",
    description: "Highly polished, mirror-like chrome finish. Provides infinite environmental reflections and striking metallic highlights.",
    glowColor: "rgba(161, 161, 170, 0.25)"
  },
  gold: {
    name: "Royal Gold",
    subtitle: "Polished Luxury",
    description: "Deep, rich metallic gold with customized micro-roughness. Evokes luxury, premium craftsmanship, and warm ambient reflections.",
    glowColor: "rgba(234, 179, 8, 0.25)"
  },
  glow: {
    name: "Neon Emissive",
    subtitle: "Illuminated",
    description: "Self-illuminating high-energy neon paint. Projects an intensive electric glow onto adjacent geometry and scene elements.",
    glowColor: "rgba(244, 63, 94, 0.25)"
  },
  custom: {
    name: "Custom Studio",
    subtitle: "Manual Control",
    description: "Access the absolute parameter level. Fine-tune your own physical finish using roughness, metalness, clearcoat, and transmission.",
    glowColor: "rgba(124, 92, 255, 0.25)"
  }
};

// Sphere-like preview gradients so each material reads at a glance.
const MATERIAL_PREVIEW: Record<MaterialPresetId, string> = {
  clay: 'radial-gradient(circle at 33% 27%, #fafafa, #d4d4d8 55%, #9ca3af)',
  glass: 'radial-gradient(circle at 33% 27%, #ffffff, #7dd3fc 45%, #0284c7)',
  chrome: 'radial-gradient(circle at 33% 27%, #ffffff, #d4d4d8 38%, #52525b 78%, #18181b)',
  gold: 'radial-gradient(circle at 33% 27%, #fff7cc, #facc15 45%, #a16207)',
  glow: 'radial-gradient(circle at 33% 27%, #fecdd3, #fb7185 42%, #e11d48)',
  custom: 'radial-gradient(circle at 33% 27%, #ede9fe, #a78bfa 45%, #6d28d9)',
};

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

const normalizeDegrees = (value: number) => ((value % 360) + 360) % 360;

type FillMode = 'solid' | 'gradient';
type MotionTrackId = 'extrusion' | 'rotation' | 'scale' | 'lighting';
type LightPosition = { x: number; y: number; z: number };
type LightPositionKeyframe = {
  id: string;
  time: number;
  value: LightPosition;
  easing: EasingType;
};

const FILL_MODES: Array<{ id: FillMode; label: string }> = [
  { id: 'solid', label: 'Solid' },
  { id: 'gradient', label: 'Gradient' },
];

const EXTRUDE_DEFAULT = 10;
const EXTRUDE_MAX = 20;
const SCALE_DEFAULT = 1;
const SCALE_MAX = 3;
const LIGHT_MAX = 10;

const MOTION_TRACK_NAMES: Record<MotionTrackId, string> = {
  extrusion: 'Extrude',
  rotation: 'Spin',
  scale: 'Scale',
  lighting: 'Brightness',
};

const makeFillStops = (color: string, colorSecondary: string, solid = false): FillStop[] => [
  { id: 'start', color, position: 0 },
  { id: 'end', color: solid ? color : colorSecondary, position: 1 },
];

const interpolateLightPositionKeyframes = (
  time: number,
  fallback: LightPosition,
  keyframes: LightPositionKeyframe[]
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

function NumberField({
  value,
  min,
  max,
  step,
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
    const startX = e.clientX;
    const startValue = value;
    let moved = false;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      if (!moved) return;
      document.body.style.cursor = 'ew-resize';
      const next = clampNumber(startValue + Math.round(dx / 4) * step, min, max);
      const rounded = Number(next.toFixed(precision));
      setDraft(rounded.toFixed(precision));
      onChange(rounded);
    };
    const up = () => {
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (!moved) inputRef.current?.focus();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div
      onPointerDown={startScrub}
      title="Drag to adjust · click to type"
      className={`flex h-7 cursor-ew-resize items-center rounded-md border border-white/[0.08] bg-black/20 px-1.5 focus-within:border-white/20 ${className}`}
    >
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
        className={`min-w-0 flex-1 cursor-ew-resize bg-transparent font-mono text-[10px] text-zinc-300 outline-none focus:cursor-text ${inputClassName}`}
      />
      {suffix && <span className="pl-0.5 text-[10px] text-zinc-600">{suffix}</span>}
    </div>
  );
}

const LIGHT_RANGE = 9;
const LIGHT_TEMPERATURES: Array<{ label: string; color: string }> = [
  { label: 'Warm', color: '#ffd9a0' },
  { label: 'Neutral', color: '#ffffff' },
  { label: 'Cool', color: '#cfe3ff' },
];

// A draggable mini "lit sphere": the highlight marks where the key light sits,
// so dragging it visually orbits the light around the icon. Only mounts inside its popover.
function LightDirectionPicker({
  position,
  color,
  onDirectionChange,
  onColorChange,
  isKeyed,
  onToggleKeyframe,
}: {
  position: { x: number; y: number; z: number };
  color: string;
  onDirectionChange: (x: number, y: number) => void;
  onColorChange: (color: string) => void;
  isKeyed: boolean;
  onToggleKeyframe: () => void;
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
    const move = (ev: PointerEvent) => setFromPointer(ev.clientX, ev.clientY);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const triggerSphere = `radial-gradient(circle at ${hx}% ${hy}%, #ffffff, ${color} 30%, #3f3f46 72%, #18181b)`;

  return (
    <Popover>
      <PopoverTrigger
        title="Light direction"
        className="flex h-7 shrink-0 items-center gap-1 rounded-md border border-white/[0.08] bg-black/20 px-1.5 transition-colors hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      >
        <span className="size-4 rounded-full border border-white/15 shadow-inner" style={{ background: triggerSphere }} />
        <ChevronDown className="size-3 text-zinc-500" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-[196px] rounded-xl border border-white/[0.1] bg-[#141518]/95 p-3 text-white shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">Light Source</span>
          <button
            type="button"
            aria-label={`${isKeyed ? 'Remove' : 'Add'} light keyframe`}
            title={`${isKeyed ? 'Remove' : 'Add'} light keyframe`}
            onClick={onToggleKeyframe}
            className={`flex size-5 items-center justify-center rounded border transition-colors ${
              isKeyed ? 'border-white/30 bg-white/[0.09]' : 'border-white/[0.08] bg-black/20 hover:bg-white/[0.05]'
            }`}
          >
            <span className="size-2 rotate-45 border border-white/30" style={{ backgroundColor: isKeyed ? '#ffd9a0' : 'transparent' }} />
          </button>
        </div>

        <div
          ref={padRef}
          onPointerDown={handlePadDown}
          className="relative mt-2.5 aspect-square w-full cursor-grab touch-none overflow-hidden rounded-full border border-white/10 shadow-inner active:cursor-grabbing"
          style={{ background: `radial-gradient(circle at ${hx}% ${hy}%, #ffffff, ${color} 24%, #27272a 68%, #0b0b0d)` }}
        >
          <span
            className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.7)] ring-1 ring-black/40"
            style={{ left: `${hx}%`, top: `${hy}%` }}
          />
        </div>
        <p className="mt-2 text-center text-[10px] text-zinc-500">Drag to move the light</p>

        <div className="mt-2.5 flex items-center gap-1.5">
          {LIGHT_TEMPERATURES.map((temp) => {
            const active = color.toLowerCase() === temp.color.toLowerCase();
            return (
              <button
                key={temp.label}
                type="button"
                title={temp.label}
                onClick={() => onColorChange(temp.color)}
                className={`h-7 flex-1 rounded-md border transition-all ${
                  active ? 'border-white/60 ring-1 ring-white/30' : 'border-white/10 hover:border-white/30'
                }`}
                style={{ background: temp.color }}
              />
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function AppLayout() {
  // --- 1. Shape sequence (the morph is a timeline of shapes) ---
  const makeStop = (icon: PresetIcon, time: number): ShapeStop => ({
    id: `shape-${Math.random().toString(36).slice(2, 9)}`,
    time,
    iconId: icon.id,
    svgContent: icon.svgContent,
    color: icon.defaultTint,
    colorSecondary: '#7c5cff',
    fillGradientType: 'linear',
    fillKeyframes: [],
    easing: 'ease-in-out',
    transitionType: 'wipe',
    wipeDirection: { x: 0, y: 0 },
  });

  const [shapes, setShapes] = useState<ShapeStop[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [openShapePicker, setOpenShapePicker] = useState<string | null>(null);
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>('spring-glass');

  const markCustom = () => setActiveRecipeId(null);

  // Apply a recipe's palette + transition style to a sequence (alternating its two color pairs).
  const recolorShapes = (list: ShapeStop[], recipe: typeof MOTION_RECIPES[0]): ShapeStop[] =>
    list.map((stop, index) => ({
      ...stop,
      color: index % 2 === 0 ? recipe.colorA : recipe.colorB,
      colorSecondary: index % 2 === 0 ? recipe.colorASecondary : recipe.colorBSecondary,
      fillGradientType: 'linear',
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
            min: 0,
            max: 360,
            defaultValue: 0,
            keyframes: [
              { id: `${track.id}-start`, time: 0, value: 0, easing: 'linear' as const },
              { id: `${track.id}-end`, time: timelineDuration, value: 360, easing: 'linear' as const },
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
    setShapes((prev) => recolorShapes(shapeList ?? prev, recipe));

    setRoughness(recipe.roughness);
    setMetalness(recipe.metalness);
    setClearcoat(recipe.clearcoat);
    setTransmission(recipe.transmission);
    setEmissiveIntensity(recipe.emissiveIntensity);

    setExtrusionDepth(recipe.extrusionDepth);
    setBevelEnabled(recipe.bevelEnabled);
    setBevelThickness(recipe.bevelThickness);
    setBevelSize(recipe.bevelSize);
    setBevelSegments(recipe.bevelSegments);
    setLayerSpacing(recipe.layerSpacing);

    setRotationOffset({ x: 0, y: 0, z: 0 });
    setObjectScale(SCALE_DEFAULT);
    setKeyLightIntensity(recipe.keyLightIntensity);
    setKeyLightPosition({ x: 5, y: 5, z: 4 });
    setKeyLightPositionKeyframes([]);

    setTracks(normalizeRecipeTracks(recipe, duration));
    setSelectedMotionTrackId('rotation');
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleResetRecipe = () => {
    const recipe = MOTION_RECIPES.find((r) => r.id === (activeRecipeId || 'spring-glass'));
    if (recipe) applyRecipe(recipe);
  };

  // Seed the default heart→star sequence and apply the default look on mount.
  useEffect(() => {
    const heart = PRESET_ICONS.find((i) => i.id === 'heart');
    const star = PRESET_ICONS.find((i) => i.id === 'star');
    if (!heart || !star) return;
    const initial = [makeStop(heart, 1.0), makeStop(star, 4.0)];
    setShapes(initial);
    setSelectedShapeId(initial[0].id);
    const recipe = MOTION_RECIPES.find((r) => r.id === 'spring-glass');
    if (recipe) applyRecipe(recipe, initial);
  }, []);

  // --- Shape sequence operations ---
  const setShapeIcon = (shapeId: string, icon: PresetIcon) => {
    markCustom();
    setShapes((prev) => prev.map((s) => s.id === shapeId ? { ...s, iconId: icon.id, svgContent: icon.svgContent } : s));
  };

  const updateSelectedShapeColor = (value: string, secondary = false) => {
    if (!selectedShapeId) return;
    const playheadTime = clampNumber(Number(currentTime.toFixed(2)), 0, duration);
    markCustom();
    setShapes((prev) => prev.map((s) => {
      if (s.id !== selectedShapeId) return s;
      const keyframes = s.fillKeyframes ?? [];
      const activeFill = interpolateFillKeyframes(
        currentTime,
        { color: s.color, colorSecondary: s.colorSecondary },
        s.fillKeyframes
      );
      const nextColor = secondary ? activeFill.color : value;
      const nextColorSecondary = secondary ? value : activeFill.colorSecondary;
      const nextStops = makeFillStops(nextColor, nextColorSecondary, fillMode === 'solid');

      if (keyframes.length === 0) {
        return {
          ...s,
          color: nextColor,
          colorSecondary: nextStops[1].color,
        };
      }

      const existing = keyframes.find((keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04);
      const nextKeyframes = existing
        ? keyframes.map((keyframe) => keyframe.id === existing.id
          ? { ...keyframe, stops: nextStops }
          : keyframe)
        : [
            ...keyframes,
            {
              id: `${s.id}-fill-${Date.now().toString(36)}`,
              time: playheadTime,
              stops: nextStops,
              gradientType: s.fillGradientType ?? 'linear',
              easing: [...keyframes].sort((a, b) => a.time - b.time).filter((keyframe) => keyframe.time <= playheadTime).pop()?.easing ?? 'ease-in-out' as const,
            },
          ].sort((a, b) => a.time - b.time);

      return {
        ...s,
        color: nextColor,
        colorSecondary: nextStops[1].color,
        fillKeyframes: nextKeyframes,
      };
    }));
  };

  const updateSelectedShapeGradientType = (gradientType: FillGradientType) => {
    if (!selectedShapeId) return;
    const playheadTime = clampNumber(Number(currentTime.toFixed(2)), 0, duration);
    markCustom();
    setShapes((prev) => prev.map((shape) => {
      if (shape.id !== selectedShapeId) return shape;
      const keyframes = shape.fillKeyframes ?? [];
      const activeFill = interpolateFillKeyframes(
        currentTime,
        { color: shape.color, colorSecondary: shape.colorSecondary, gradientType: shape.fillGradientType },
        shape.fillKeyframes
      );

      if (keyframes.length === 0) {
        return { ...shape, fillGradientType: gradientType };
      }

      const existing = keyframes.find((keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04);
      const nextKeyframes = existing
        ? keyframes.map((keyframe) => keyframe.id === existing.id ? { ...keyframe, gradientType } : keyframe)
        : [
            ...keyframes,
            {
              id: `${shape.id}-fill-${Date.now().toString(36)}`,
              time: playheadTime,
              stops: makeFillStops(activeFill.color, activeFill.colorSecondary, fillMode === 'solid'),
              gradientType,
              easing: [...keyframes].sort((a, b) => a.time - b.time).filter((keyframe) => keyframe.time <= playheadTime).pop()?.easing ?? 'ease-in-out' as const,
            },
          ].sort((a, b) => a.time - b.time);

      return { ...shape, fillGradientType: gradientType, fillKeyframes: nextKeyframes };
    }));
  };

  const addShapeAtPlayhead = () => {
    markCustom();
    setShapes((prev) => {
      const icon = PRESET_ICONS[prev.length % PRESET_ICONS.length];
      const t = clampNumber(Number(currentTime.toFixed(2)), 0, duration);
      const stop = makeStop(icon, t);
      setSelectedShapeId(stop.id);
      setOpenShapePicker(stop.id);
      return [...prev, stop].sort((a, b) => a.time - b.time);
    });
  };

  const removeShape = (shapeId: string) => {
    setShapes((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((s) => s.id !== shapeId);
      if (selectedShapeId === shapeId) setSelectedShapeId(next[0]?.id ?? null);
      return next;
    });
  };

  // --- 2. Appearance & geometry state ---
  const [materialPreset, setMaterialPreset] = useState<MaterialPresetId>('glass');

  // Custom Advanced Material Finish parameters
  const [roughness, setRoughness] = useState<number>(0.15);
  const [metalness, setMetalness] = useState<number>(0.4);
  const [clearcoat, setClearcoat] = useState<number>(0.5);
  const [clearcoatRoughness, setClearcoatRoughness] = useState<number>(0.1);
  const [transmission, setTransmission] = useState<number>(0.0);
  const [thickness, setThickness] = useState<number>(1.0);
  const [emissiveIntensity, setEmissiveIntensity] = useState<number>(0.0);

  const [wireframe, setWireframe] = useState<boolean>(false);
  const [extrusionDepth, setExtrusionDepth] = useState<number>(EXTRUDE_DEFAULT);
  const [bevelEnabled, setBevelEnabled] = useState<boolean>(true);
  const [bevelThickness, setBevelThickness] = useState<number>(0.15);
  const [bevelSize, setBevelSize] = useState<number>(0.08);
  const [bevelSegments, setBevelSegments] = useState<number>(3);
  const [layerSpacing, setLayerSpacing] = useState<number>(0.8);
  const [objectScale, setObjectScale] = useState<number>(SCALE_DEFAULT);

  const [enableGradient, setEnableGradient] = useState<boolean>(false);
  const [fillMode, setFillMode] = useState<FillMode>('solid');
  const [rotationOffset, setRotationOffset] = useState<LightPosition>({ x: 0, y: 0, z: 0 });

  // Lighting & perspective
  const [ambientColor] = useState<string>('#ffffff');
  const [ambientIntensity] = useState<number>(0.6);
  const [keyLightColor, setKeyLightColor] = useState<string>('#ffffff');
  const [keyLightIntensity, setKeyLightIntensity] = useState<number>(1.2);
  const [keyLightPosition, setKeyLightPosition] = useState<LightPosition>({ x: 5, y: 5, z: 4 });
  const [keyLightPositionKeyframes, setKeyLightPositionKeyframes] = useState<LightPositionKeyframe[]>([]);
  const [rimLightColor] = useState<string>('#a48bff');
  const [rimLightIntensity] = useState<number>(0.8);
  const [zoom, setZoom] = useState<number>(1.0);
  const [zenMode, setZenMode] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Synchronize presets with customized sliders when a predefined preset is clicked
  useEffect(() => {
    if (materialPreset === 'clay') {
      setRoughness(0.85);
      setMetalness(0.1);
      setClearcoat(0.0);
      setTransmission(0.0);
      setEmissiveIntensity(0.0);
    } else if (materialPreset === 'glass') {
      setRoughness(0.1);
      setMetalness(0.0);
      setClearcoat(1.0);
      setClearcoatRoughness(0.1);
      setTransmission(0.9);
      setThickness(1.5);
      setEmissiveIntensity(0.0);
    } else if (materialPreset === 'chrome') {
      setRoughness(0.05);
      setMetalness(1.0);
      setClearcoat(0.0);
      setTransmission(0.0);
      setEmissiveIntensity(0.0);
    } else if (materialPreset === 'gold') {
      setRoughness(0.2);
      setMetalness(0.95);
      setClearcoat(0.0);
      setTransmission(0.0);
      setEmissiveIntensity(0.0);
    } else if (materialPreset === 'glow') {
      setRoughness(0.5);
      setMetalness(0.2);
      setClearcoat(0.0);
      setTransmission(0.0);
      setEmissiveIntensity(2.0);
    }
  }, [materialPreset]);

  // --- 3. Timeline Playback & Keyframe Tracks State ---
  const [duration, setDuration] = useState<number>(5.0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loop, setLoop] = useState<boolean>(true);
  const [selectedMotionTrackId, setSelectedMotionTrackId] = useState<MotionTrackId>('rotation');

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

      const playheadTime = clampNumber(Number(currentTime.toFixed(2)), 0, duration);
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

  const handleViewRotationCommit = (delta: { x: number; y: number; z: number }) => {
    const nextY = normalizeDegrees(activeRotationY + delta.y);
    setRotationOffset((prev) => ({
      x: normalizeDegrees(prev.x + delta.x),
      y: nextY,
      z: normalizeDegrees(prev.z + delta.z)
    }));
    handleSpinChange(nextY);
  };

  const handleBrightnessChange = (newValue: number) => {
    setTrackValue('lighting', newValue, setKeyLightIntensity);
  };

  const playheadRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

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
      name: 'Spin',
      color: '#ffd23f',
      min: 0,
      max: 360,
      defaultValue: 0,
      keyframes: [
        { id: 'kf-rot1', time: 0, value: 0, easing: 'linear' },
        { id: 'kf-rot2', time: 5.0, value: 360, easing: 'linear' }
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

  // --- Derived morph state: which two shapes surround the playhead, and the blend between them ---
  const sortedShapes = [...shapes].sort((a, b) => a.time - b.time);
  const morph = (() => {
    const fallback: ShapeStop = {
      id: 'empty', time: 0, iconId: '', svgContent: '', color: '#ffffff', colorSecondary: '#ffffff',
      fillGradientType: 'linear', fillKeyframes: [],
      easing: 'ease-in-out', transitionType: 'wipe', wipeDirection: { x: 0, y: 0 },
    };
    if (sortedShapes.length === 0) return { from: fallback, to: fallback, progress: 0 };
    const first = sortedShapes[0];
    const last = sortedShapes[sortedShapes.length - 1];
    if (sortedShapes.length === 1 || currentTime <= first.time) return { from: first, to: first, progress: 0 };
    if (currentTime >= last.time) return { from: last, to: last, progress: 1 };
    let i = 0;
    while (i < sortedShapes.length - 1 && !(currentTime >= sortedShapes[i].time && currentTime <= sortedShapes[i + 1].time)) i++;
    const from = sortedShapes[i];
    const to = sortedShapes[i + 1];
    const span = to.time - from.time;
    const raw = span > 0 ? (currentTime - from.time) / span : 1;
    return { from, to, progress: clampNumber(applyEasing(from.easing, raw), 0, 1) };
  })();

  const selectedShape = shapes.find((s) => s.id === selectedShapeId) ?? sortedShapes[0] ?? null;
  const shapeName = (stop: ShapeStop | null) =>
    stop ? (PRESET_ICONS.find((i) => i.id === stop.iconId)?.name ?? 'Custom') : 'Shape';

  const selectedShapeFillValue = selectedShape
    ? interpolateFillKeyframes(
        currentTime,
        { color: selectedShape.color, colorSecondary: selectedShape.colorSecondary, gradientType: selectedShape.fillGradientType },
        selectedShape.fillKeyframes
      )
    : { color: '#ffffff', colorSecondary: '#ffffff', gradientType: 'linear' as const };
  const selectedShapeFill = selectedShapeFillValue.color;
  const selectedShapeFillSecondary = selectedShapeFillValue.colorSecondary;
  const selectedShapeGradientType = selectedShapeFillValue.gradientType ?? selectedShape?.fillGradientType ?? 'linear';

  // Engine-facing values derived from the surrounding shapes (SvgCanvas keeps its 2-shape crossfade).
  const iconAContent = morph.from.svgContent;
  const iconBContent = morph.to.svgContent;
  const fillA = interpolateFillKeyframes(
    currentTime,
    { color: morph.from.color, colorSecondary: morph.from.colorSecondary, gradientType: morph.from.fillGradientType },
    morph.from.fillKeyframes
  );
  const fillB = interpolateFillKeyframes(
    currentTime,
    { color: morph.to.color, colorSecondary: morph.to.colorSecondary, gradientType: morph.to.fillGradientType },
    morph.to.fillKeyframes
  );
  const colorA = fillA.color;
  const colorASecondary = fillA.colorSecondary;
  const colorB = fillB.color;
  const colorBSecondary = fillB.colorSecondary;
  const activeGradientType = fillA.gradientType ?? morph.from.fillGradientType ?? 'linear';
  const activeTransitionProgress = morph.progress;
  // The active transition's blend style comes from the shape we're morphing FROM.
  const transitionType = morph.from.transitionType;
  const wipeDirection = morph.from.wipeDirection;

  const activeExtrusionDepth = extrusionTrack.keyframes.length > 0
    ? interpolateKeyframes(currentTime, extrusionTrack)
    : extrusionDepth;

  const activeRotationY = rotationTrack.keyframes.length > 0
    ? interpolateKeyframes(currentTime, rotationTrack)
    : rotationOffset.y;

  const activeObjectScale = scaleTrack.keyframes.length > 0
    ? interpolateKeyframes(currentTime, scaleTrack)
    : objectScale;

  const activeKeyLightIntensity = lightingTrack.keyframes.length > 0
    ? interpolateKeyframes(currentTime, lightingTrack)
    : keyLightIntensity;
  const activeKeyLightPosition = interpolateLightPositionKeyframes(currentTime, keyLightPosition, keyLightPositionKeyframes);

  const hasLayerGapControls = false;

  const keyframeAtPlayhead = (track: TimelineTrack) => {
    const playheadTime = Number(currentTime.toFixed(2));
    return track.keyframes.find((keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04);
  };

  const toggleKeyframeAtPlayhead = (track: TimelineTrack, value: number) => {
    const playheadTime = clampNumber(Number(currentTime.toFixed(2)), 0, duration);
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
    const playheadTime = Number(currentTime.toFixed(2));
    return keyLightPositionKeyframes.find((keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04);
  };

  const toggleLightPositionKeyframeAtPlayhead = () => {
    const playheadTime = clampNumber(Number(currentTime.toFixed(2)), 0, duration);
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

  const updateLightPositionAxis = (axis: keyof LightPosition, value: number) => {
    const clamped = clampNumber(value, -12, 12);
    const playheadTime = clampNumber(Number(currentTime.toFixed(2)), 0, duration);
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
    const playheadTime = clampNumber(Number(currentTime.toFixed(2)), 0, duration);
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

  const renderLightPositionKeyframeControl = () => {
    const isKeyedHere = Boolean(lightPositionKeyframeAtPlayhead());
    return (
      <button
        type="button"
        aria-label={`${isKeyedHere ? 'Remove' : 'Add'} light position keyframe at current time`}
        title={`${isKeyedHere ? 'Remove' : 'Add'} light position keyframe`}
        onClick={(event) => {
          event.stopPropagation();
          toggleLightPositionKeyframeAtPlayhead();
        }}
        className={`size-6 shrink-0 rounded-md border flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
          isKeyedHere
            ? 'border-white/30 bg-white/[0.09]'
            : 'border-white/[0.08] bg-black/20 hover:bg-white/[0.05]'
        }`}
      >
        <span
          className={`size-2.5 rotate-45 border ${isKeyedHere ? 'border-black/80' : 'border-white/20'}`}
          style={{ backgroundColor: isKeyedHere ? '#ff5b9a' : 'transparent' }}
        />
      </button>
    );
  };

  const motionPropertyRowClass = (trackId: MotionTrackId) =>
    `flex items-center gap-3 rounded-md -mx-1 px-1 py-1 transition-colors ${
      selectedMotionTrackId === trackId ? 'bg-white/[0.055]' : 'hover:bg-white/[0.025]'
    }`;

  const renderKeyframeControl = (track: TimelineTrack, value: number) => {
    const isKeyedHere = Boolean(keyframeAtPlayhead(track));
    return (
      <button
        type="button"
        aria-label={`${isKeyedHere ? 'Remove' : 'Add'} ${track.name} keyframe at current time`}
        title={`${isKeyedHere ? 'Remove' : 'Add'} ${track.name} keyframe`}
        onClick={(event) => {
          event.stopPropagation();
          toggleKeyframeAtPlayhead(track, value);
        }}
        className={`size-6 shrink-0 rounded-md border flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
          isKeyedHere
            ? 'border-white/30 bg-white/[0.09]'
            : 'border-white/[0.08] bg-black/20 hover:bg-white/[0.05]'
        }`}
      >
        <span
          className={`size-2.5 rotate-45 border ${isKeyedHere ? 'border-black/80' : 'border-white/20'}`}
          style={{ backgroundColor: isKeyedHere ? track.color : 'transparent' }}
        />
      </button>
    );
  };

  const colorKeyframeAtPlayhead = () => {
    if (!selectedShape) return undefined;
    const playheadTime = Number(currentTime.toFixed(2));
    return selectedShape.fillKeyframes?.find((keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04);
  };

  const toggleSelectedShapeColorKeyframe = () => {
    if (!selectedShape) return;
    const playheadTime = clampNumber(Number(currentTime.toFixed(2)), 0, duration);
    const currentKeyframe = colorKeyframeAtPlayhead();
    markCustom();

    setShapes((prev) => prev.map((shape) => {
      if (shape.id !== selectedShape.id) return shape;
      const keyframes = shape.fillKeyframes ?? [];

      if (currentKeyframe) {
        return {
          ...shape,
          fillKeyframes: keyframes.filter((keyframe) => keyframe.id !== currentKeyframe.id),
        };
      }

      const previousKeyframe = [...keyframes]
        .sort((a, b) => a.time - b.time)
        .filter((keyframe) => keyframe.time <= playheadTime)
        .pop();

      return {
        ...shape,
        fillKeyframes: [
          ...keyframes,
          {
            id: `${shape.id}-fill-${Date.now().toString(36)}`,
            time: playheadTime,
            stops: makeFillStops(selectedShapeFill, selectedShapeFillSecondary, fillMode === 'solid'),
            easing: previousKeyframe?.easing ?? 'ease-in-out',
          },
        ].sort((a, b) => a.time - b.time),
      };
    }));
  };

  const renderColorKeyframeControl = () => {
    const isKeyedHere = Boolean(colorKeyframeAtPlayhead());

    return (
      <button
        type="button"
        aria-label={`${isKeyedHere ? 'Remove' : 'Add'} Fill keyframe at current time`}
        title={`${isKeyedHere ? 'Remove' : 'Add'} Fill keyframe`}
        onClick={(event) => {
          event.stopPropagation();
          toggleSelectedShapeColorKeyframe();
        }}
        className={`size-6 shrink-0 rounded-md border flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
          isKeyedHere
            ? 'border-white/30 bg-white/[0.09]'
            : 'border-white/[0.08] bg-black/20 hover:bg-white/[0.05]'
        }`}
      >
        <span
          className={`size-2.5 rotate-45 border ${isKeyedHere ? 'border-black/80' : 'border-white/20'}`}
          style={{
            background: isKeyedHere
              ? `linear-gradient(135deg, ${selectedShapeFill}, ${selectedShapeFillSecondary})`
              : 'transparent',
          }}
        />
      </button>
    );
  };

  // Real-time playhead progress loop
  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      const tick = () => {
        const now = performance.now();
        const delta = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;

        setCurrentTime((prev) => {
          let next = prev + delta;
          if (next >= duration) {
            if (loop) {
              next = next % duration;
            } else {
              next = duration;
              setIsPlaying(false);
            }
          }
          return Number(next.toFixed(3));
        });

        playheadRef.current = requestAnimationFrame(tick);
      };

      playheadRef.current = requestAnimationFrame(tick);
    } else {
      if (playheadRef.current) {
        cancelAnimationFrame(playheadRef.current);
        playheadRef.current = null;
      }
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
  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const timelineBreakpoints = Array.from(new Set([
    0,
    duration,
    ...shapes.map((shape) => shape.time),
    ...shapes.flatMap((shape) => (shape.fillKeyframes ?? []).map((keyframe) => keyframe.time)),
    ...tracks.flatMap((track) => track.keyframes.map((keyframe) => keyframe.time)),
    ...keyLightPositionKeyframes.map((keyframe) => keyframe.time),
  ].map((time) => Number(clampNumber(time, 0, duration).toFixed(2)))))
    .sort((a, b) => a - b);

  const goToTime = (time: number) => {
    setIsPlaying(false);
    setCurrentTime(clampNumber(Number(time.toFixed(3)), 0, duration));
  };

  const previousBreakpoint = [...timelineBreakpoints].reverse().find((time) => time < currentTime - 0.04);
  const nextBreakpoint = timelineBreakpoints.find((time) => time > currentTime + 0.04);
  const atTimelineStart = currentTime <= 0.04;
  const atTimelineEnd = currentTime >= duration - 0.04;

  const goToPreviousBreakpoint = () => {
    if (previousBreakpoint !== undefined) goToTime(previousBreakpoint);
  };

  const goToNextBreakpoint = () => {
    if (nextBreakpoint !== undefined) goToTime(nextBreakpoint);
  };

  const goToEnd = () => goToTime(duration);

  const handleTracksChange = (nextTracks: TimelineTrack[]) => {
    setTracks(nextTracks);
    setActiveRecipeId(null);
  };

  const handleScrubStart = () => setIsPlaying(false);

  // --- 4. Exporter modal ---
  const [isExportOpen, setIsExportOpen] = useState(false);
  const canvas3DRef = useRef<SvgCanvasRef>(null);

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
        setShapes((prev) => prev.map((s) => s.id === shapeId ? { ...s, iconId: 'custom', svgContent: content } : s));
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
      if (text) setShapes((prev) => prev.map((s) => s.id === selectedShapeId ? { ...s, iconId: 'custom', svgContent: text } : s));
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
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-zinc-950 text-zinc-50 font-sans select-none antialiased">
      
      {/* =========================================================================
          1. TOP BAR
          ========================================================================= */}
      <div className="h-14 border-b border-white/[0.07] flex items-center justify-between px-3 bg-[#0d0e10]/95 backdrop-blur-xl shrink-0 relative z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            aria-label={zenMode ? "Show panels" : "Hide panels"}
            onClick={() => setZenMode(!zenMode)}
            className="size-9 rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            {zenMode ? <PanelLeftOpen className="mx-auto size-4" /> : <PanelLeftClose className="mx-auto size-4" />}
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-lg bg-white text-zinc-950 flex items-center justify-center">
              <Box className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm tracking-tight">VectorForge</span>
                <span className="hidden sm:inline text-[10px] uppercase tracking-[0.18em] text-zinc-600">3D Motion Studio</span>
              </div>
              <div className="text-[11px] text-zinc-500 truncate">
                {sortedShapes.map((s) => shapeName(s)).join(' → ')} · {activeRecipeId ? MOTION_RECIPES.find(r => r.id === activeRecipeId)?.name : 'Custom setup'}
              </div>
            </div>
          </div>
        </div>

        <div />

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-white/[0.06] h-8 rounded-lg text-xs" onClick={handleResetRecipe}>
            <RefreshCw className="size-3.5" />
            Reset Look
          </Button>

          <Button size="sm" className="bg-white hover:bg-zinc-200 text-zinc-950 gap-1.5 font-medium h-8 rounded-lg text-xs" onClick={() => setIsExportOpen(true)}>
            <Download className="size-3.5" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 bg-[#111214]">

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
              zenMode ? 'rounded-none border-0' : 'rounded-lg border border-white/[0.07] overflow-hidden bg-[#0b0c0e]'
            }`}
          >
            <SvgCanvas
              ref={canvas3DRef}
              iconAContent={iconAContent}
              iconBContent={iconBContent}
              materialPreset={materialPreset}
              colorA={colorA}
              colorB={colorB}
              colorASecondary={colorASecondary}
              colorBSecondary={colorBSecondary}
              enableGradient={enableGradient}
              gradientType={activeGradientType}
              roughness={roughness}
              metalness={metalness}
              clearcoat={clearcoat}
              clearcoatRoughness={clearcoatRoughness}
              transmission={transmission}
              thickness={thickness}
              emissiveIntensity={emissiveIntensity}
              wireframe={wireframe}
              extrusionDepth={activeExtrusionDepth}
              bevelEnabled={bevelEnabled}
              bevelThickness={bevelThickness}
              bevelSize={bevelSize}
              bevelSegments={bevelSegments}
              layerSpacing={layerSpacing}
              transitionType={transitionType}
              wipeDirection={wipeDirection}
              transitionProgress={activeTransitionProgress}
              rotationOffset={{ x: rotationOffset.x, y: activeRotationY, z: rotationOffset.z }}
              objectScale={activeObjectScale}
              isPlaying={isPlaying}
              ambientColor={ambientColor}
              ambientIntensity={ambientIntensity}
              keyLightColor={keyLightColor}
              keyLightIntensity={activeKeyLightIntensity}
              keyLightPosition={activeKeyLightPosition}
              rimLightColor={rimLightColor}
              rimLightIntensity={rimLightIntensity}
              zoom={zoom}
              onZoomChange={setZoom}
              onViewRotationCommit={handleViewRotationCommit}
            />

            {/* Drag & drop an SVG to replace the selected shape */}
            {isDragging && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 backdrop-blur-md animate-fade-in">
                <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-white/25 p-8">
                  <Upload className="size-8 text-white/70" />
                  <div className="text-center">
                    <span className="block text-sm font-semibold text-white">Drop SVG here</span>
                    <span className="mt-1 block text-[10px] uppercase tracking-wider text-zinc-500">Replaces the selected shape</span>
                  </div>
                </div>
              </div>
            )}

            {/* Viewport hint */}
            <div className="absolute top-3 left-3 z-10">
              <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 bg-black/55 border border-white/[0.08] rounded-md text-zinc-400 backdrop-blur-sm">
                <Orbit className="size-3" />
                Drag to rotate · Scroll to zoom
              </div>
            </div>

            <div className="absolute top-3 right-3 z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRotationOffset({ x: 0, y: 0, z: 0 });
                  setZoom(1);
                  canvas3DRef.current?.resetRotation();
                }}
                className="bg-black/55 border border-white/[0.08] hover:bg-black/70 text-zinc-400 hover:text-white backdrop-blur-sm text-[11px] gap-1.5 h-7 rounded-lg"
              >
                <Undo2 className="w-3 h-3" />
                Reset View
              </Button>
            </div>

            <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/65 px-3 py-2 shadow-2xl backdrop-blur-xl transition-colors hover:border-white/20">
              <Button
                size="icon"
                variant="ghost"
                onClick={handleReset}
                disabled={atTimelineStart}
                aria-label="Go to start"
                title="Go to start"
                className="size-8 rounded-full text-zinc-400 hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
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
                className="size-8 rounded-full text-zinc-400 hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                size="icon"
                onClick={handlePlayToggle}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="size-10 rounded-full bg-white text-zinc-950 hover:bg-zinc-200"
              >
                {isPlaying ? <Pause size={16} className="fill-current" /> : <Play size={16} className="fill-current" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={goToNextBreakpoint}
                disabled={nextBreakpoint === undefined}
                aria-label="Next breakpoint"
                title="Next breakpoint"
                className="size-8 rounded-full text-zinc-400 hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
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
                className="size-8 rounded-full text-zinc-400 hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
              >
                <SkipForward size={14} />
              </Button>
              {zenMode && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setZenMode(false)}
                  className="h-7 rounded-full px-2 text-[11px] text-zinc-500 hover:bg-white/10 hover:text-white"
                >
                  Exit
                </Button>
              )}
            </div>
          </div>

        </div>

        <div className={`transition-all duration-300 ease-out flex flex-col shrink-0 overflow-y-auto bg-[#0f1012] ${
          zenMode ? 'w-0 opacity-0 border-l-0 pointer-events-none p-0' : 'w-[328px] border-l border-white/[0.07] px-4 py-4 gap-5'
        }`}>

          {/* Looks — quick-start style presets */}
          <div className="flex flex-col gap-2.5 border-b border-white/[0.07] pb-4">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              <Wand2 className="size-3.5" />
              Looks
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MOTION_RECIPES.map((recipe) => {
                const isActive = activeRecipeId === recipe.id;
                return (
                  <button
                    key={recipe.id}
                    type="button"
                    title={recipe.name}
                    onClick={() => applyRecipe(recipe)}
                    className={`group relative flex flex-col gap-1.5 rounded-xl p-1 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                      isActive ? 'bg-white/[0.08] ring-1 ring-white/40' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <span
                      className="relative block h-12 w-full overflow-hidden rounded-lg border border-white/10 shadow-inner"
                      style={{ background: `linear-gradient(135deg, ${recipe.colorA}, ${recipe.colorASecondary} 50%, ${recipe.colorB})` }}
                    >
                      <span className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    </span>
                    <span className="truncate px-1 pb-0.5 text-[10px] font-medium text-zinc-300">{recipe.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Material — preview chips */}
          <div className="flex flex-col gap-2.5 border-b border-white/[0.07] pb-4">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              <Palette className="size-3.5" />
              Material
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(MATERIAL_METADATA) as MaterialPresetId[]).map((preset) => {
                const isActive = materialPreset === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    title={MATERIAL_METADATA[preset].name}
                    onClick={() => { setMaterialPreset(preset); setActiveRecipeId(null); }}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                      isActive ? 'bg-white/[0.08] ring-1 ring-white/40' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="size-8 rounded-full border border-white/10 shadow-[0_2px_6px_rgba(0,0,0,0.5)]" style={{ background: MATERIAL_PREVIEW[preset] }} />
                    <span className={`truncate text-[10px] font-medium ${isActive ? 'text-zinc-100' : 'text-zinc-400'}`}>{MATERIAL_METADATA[preset].name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fill — solid or gradient (type lives inside the swatch popover) */}
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              <Rows3 className="size-3.5" />
              Fill
            </div>
            <div className="flex items-center gap-2">
              <div className="w-[150px]">
              <ColorPicker
                value={selectedShapeFill}
                onChange={(val) => updateSelectedShapeColor(val)}
                gradient={fillMode === 'gradient'}
                onGradientToggle={(on) => { setFillMode(on ? 'gradient' : 'solid'); setEnableGradient(on); markCustom(); }}
                gradientType={selectedShapeGradientType}
                onGradientTypeChange={updateSelectedShapeGradientType}
                secondaryValue={selectedShapeFillSecondary}
                onSecondaryChange={(val) => updateSelectedShapeColor(val, true)}
                className="rounded-lg bg-white/[0.035] border-white/[0.08]"
              />
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                {renderColorKeyframeControl()}
              </div>
            </div>
          </div>

          {materialPreset === 'custom' && (
            <div className="flex flex-col gap-3 border-b border-white/[0.07] pb-4 animate-fade-in">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                <Sliders className="size-3.5" />
                Material
              </div>

              {/* Compact property rows: label + direct value, closer to Figma/Framer inspectors. */}
              {[
                { label: 'Smoothness', value: roughness, set: setRoughness, min: 0, max: 1, step: 0.02, fmt: (v: number) => v.toFixed(2) },
                { label: 'Metallic', value: metalness, set: setMetalness, min: 0, max: 1, step: 0.02, fmt: (v: number) => v.toFixed(2) },
                { label: 'Gloss Coat', value: clearcoat, set: setClearcoat, min: 0, max: 1, step: 0.05, fmt: (v: number) => v.toFixed(2) },
                { label: 'Transparency', value: transmission, set: setTransmission, min: 0, max: 1, step: 0.05, fmt: (v: number) => v.toFixed(2) },
                { label: 'Glow', value: emissiveIntensity, set: setEmissiveIntensity, min: 0, max: 5, step: 0.1, fmt: (v: number) => v.toFixed(1) },
              ].map(({ label, value, set, min, max, step, fmt }) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-zinc-400 w-24 shrink-0">{label}</span>
                  <NumberField value={value} min={min} max={max} step={step} precision={fmt(value).includes('.') ? fmt(value).split('.')[1].length : 0} onChange={(next) => { set(next); setActiveRecipeId(null); }} />
                </div>
              ))}
            </div>
          )}



          {/* Shape */}
          <div className="flex flex-col gap-3 border-b border-white/[0.07] pb-4">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              <Cuboid className="size-3.5" />
              Geometry
            </div>

            {/* Extrude */}
            <div className={motionPropertyRowClass('extrusion')} onClick={() => setSelectedMotionTrackId('extrusion')}>
              <span className="text-[11px] text-zinc-400 w-24 shrink-0">
                Extrude
                {extrusionTrack.keyframes.length > 0 && <span className="inline-block w-1 h-1 rounded-full bg-emerald-500 ml-1 align-middle" />}
              </span>
              {(() => {
                const depthValue = finiteNumber(extrusionTrack.keyframes.length > 0 ? activeExtrusionDepth : extrusionDepth, EXTRUDE_DEFAULT);
                return (
                  <>
                    <span className="flex-1" />
                    <NumberField value={depthValue} min={0.2} max={EXTRUDE_MAX} step={0.25} precision={2} onChange={(value) => { handleDepthChange(value); setActiveRecipeId(null); }} />
                    {renderKeyframeControl(extrusionTrack, depthValue)}
                  </>
                );
              })()}
            </div>

            {hasLayerGapControls && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-zinc-400 w-24 shrink-0">Layer Gap</span>
                {(() => {
                  const gapValue = finiteNumber(layerSpacing, 0);
                  return (
                    <>
                      <span className="flex-1" />
                      <NumberField value={gapValue} min={0} max={2} step={0.05} precision={2} onChange={(value) => { setLayerSpacing(value); setActiveRecipeId(null); }} />
                    </>
                  );
                })()}
              </div>
            )}

            {/* Rounded edges + segments */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-400">Rounded Edges</span>
              <div className="flex items-center gap-2">
                {bevelEnabled && (
                  <div className="flex items-center gap-1 animate-fade-in">
                    <span className="text-[10px] text-zinc-500">Smoothness</span>
                    <input 
                      type="number" min="1" max="10" 
                      value={bevelSegments} onChange={(e) => { setBevelSegments(parseInt(e.target.value) || 1); setActiveRecipeId(null); }}
                      className="w-8 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-center text-white outline-none py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                )}
                <Switch
                  checked={bevelEnabled}
                  onCheckedChange={(val) => {
                    setBevelEnabled(val);
                    setActiveRecipeId(null);
                  }}
                  size="sm"
                />
              </div>
            </div>
          </div>

          {/* Motion & View */}
          <div className="flex flex-col gap-3 pb-4">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              <Orbit className="size-3.5" />
              Motion &amp; View
            </div>

            <div className={motionPropertyRowClass('rotation')} onClick={() => setSelectedMotionTrackId('rotation')}>
              <div className="flex flex-1 items-center gap-1">
                {([
                  { label: 'X', axis: 'x' as const, value: normalizeDegrees(rotationOffset.x) },
                  { label: 'Y', axis: 'y' as const, value: normalizeDegrees(activeRotationY), animated: true },
                  { label: 'Z', axis: 'z' as const, value: normalizeDegrees(rotationOffset.z) },
                ]).map(({ label, axis, value, animated }) => (
                  <div key={axis} className="flex h-7 min-w-0 items-center rounded-md border border-white/[0.07] bg-black/20 px-1.5">
                    <span className="shrink-0 text-[9px] font-medium text-zinc-500">{label}</span>
                    <NumberField
                      value={value}
                      min={0}
                      max={360}
                      step={1}
                      suffix="°"
                      precision={0}
                      className="h-6 w-[38px] border-0 bg-transparent px-0"
                      inputClassName="text-left"
                      onChange={(nextValue) => {
                        const normalized = normalizeDegrees(nextValue);
                        if (animated) {
                          handleSpinChange(normalized);
                        } else {
                          setRotationOffset((prev) => ({ ...prev, [axis]: normalized }));
                          setActiveRecipeId(null);
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
              {renderKeyframeControl(rotationTrack, normalizeDegrees(activeRotationY))}
            </div>

            <div className={motionPropertyRowClass('scale')} onClick={() => setSelectedMotionTrackId('scale')}>
              <span className="w-16 shrink-0 text-[11px] text-zinc-300">
                Scale
                {scaleTrack.keyframes.length > 0 && <span className="inline-block w-1 h-1 rounded-full bg-emerald-500 ml-1 align-middle" />}
              </span>
              {(() => {
                const scaleValue = finiteNumber(scaleTrack.keyframes.length > 0 ? activeObjectScale : objectScale, SCALE_DEFAULT);
                return (
                  <>
                    <span className="flex-1" />
                    <NumberField
                      value={scaleValue}
                      min={0.1}
                      max={SCALE_MAX}
                      step={0.05}
                      precision={2}
                      onChange={(value) => { handleScaleChange(value); setActiveRecipeId(null); }}
                    />
                    {renderKeyframeControl(scaleTrack, scaleValue)}
                  </>
                );
              })()}
            </div>

            {/* Light — brightness inline; direction & temperature live in the orb popover */}
            <div className={motionPropertyRowClass('lighting')} onClick={() => setSelectedMotionTrackId('lighting')}>
              <div onClick={(e) => e.stopPropagation()}>
                <LightDirectionPicker
                  position={activeKeyLightPosition}
                  color={keyLightColor}
                  onDirectionChange={updateLightPositionXY}
                  onColorChange={(color) => { setKeyLightColor(color); setActiveRecipeId(null); }}
                  isKeyed={Boolean(lightPositionKeyframeAtPlayhead())}
                  onToggleKeyframe={toggleLightPositionKeyframeAtPlayhead}
                />
              </div>
              <span className="w-12 shrink-0 text-[11px] text-zinc-300">Light</span>
              {(() => {
                const brightnessValue = finiteNumber(lightingTrack.keyframes.length > 0 ? activeKeyLightIntensity : keyLightIntensity, 1);
                return (
                  <>
                    <span className="flex-1" />
                    <NumberField value={brightnessValue} min={0} max={LIGHT_MAX} step={0.1} precision={1} onChange={(value) => { handleBrightnessChange(value); setActiveRecipeId(null); }} />
                    {renderKeyframeControl(lightingTrack, brightnessValue)}
                  </>
                );
              })()}
            </div>

            {/* Zoom (view only) */}
            <div className="flex items-center gap-3 -mx-1 px-1 py-1">
              <Maximize2 className="size-3.5 shrink-0 text-zinc-500" />
              <span className="w-16 shrink-0 text-[11px] text-zinc-300">Zoom</span>
              <span className="flex-1" />
              <NumberField value={finiteNumber(zoom, 1)} min={0.5} max={2} step={0.1} precision={1} onChange={(value) => { setZoom(value); setActiveRecipeId(null); }} />
              <span className="size-6 shrink-0" />
            </div>
          </div>

        </div>

      </div>

      {/* =========================================================================
          3. KEYFRAME TIMELINE Scrubber
          ========================================================================= */}
      <div className={`transition-all duration-500 ease-in-out shrink-0 overflow-hidden ${zenMode ? 'h-0 border-t-0' : 'h-[184px] border-t border-white/[0.07] bg-[#0f1012]'}`}>
        <Timeline
          duration={duration}
          currentTime={currentTime}
          onTimeChange={setCurrentTime}
          onScrubStart={handleScrubStart}
          loop={loop}
          onLoopChange={setLoop}
          tracks={tracks}
          onTracksChange={handleTracksChange}
          activeTrackId={selectedMotionTrackId}
          onActiveTrackChange={(trackId) => { setSelectedMotionTrackId(trackId as MotionTrackId); setSelectedShapeId(null); }}
          shapes={shapes}
          selectedShapeId={selectedShapeId}
          onSelectShape={setSelectedShapeId}
          onShapesChange={(next) => { markCustom(); setShapes(next); }}
          onAddShape={addShapeAtPlayhead}
          onRemoveShape={removeShape}
          onShapeEasingChange={(id, easing) => { markCustom(); setShapes((prev) => prev.map((s) => s.id === id ? { ...s, easing } : s)); }}
          shapeOptions={PRESET_ICONS}
          onShapeIconChange={setShapeIcon}
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
        onStartRecording={() => canvas3DRef.current?.startRecording()}
        onStopRecording={(cb) => canvas3DRef.current?.stopRecording(cb)}
        materialPreset={materialPreset}
        colorA={colorA}
        colorB={colorB}
        roughness={roughness}
        metalness={metalness}
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
