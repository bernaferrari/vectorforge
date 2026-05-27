'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Trash2, Diamond, Plus, Minus, Magnet, RotateCw, Blend, ArrowRight, SquareSplitHorizontal, Loader2 } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { bindWindowMouseDrag, bindWindowPointerDrag } from '@/lib/drag-events';
import {
  fetchMaterialSymbolIcon,
  fetchMaterialSymbolNames,
  materialSymbolFontStyle,
  normalizeMaterialSymbolName,
  type MaterialSymbolFontSettings,
  type MaterialSymbolStyle,
} from './IconLibrary';
import { MATERIAL_WIPE_READY_PAIRS, type MaterialWipeIconPair } from './MaterialWipePairs';

export type EasingType = 'linear' | 'ease-in-out' | 'spring' | 'bounce';

export interface Keyframe {
  id: string;
  time: number; // in seconds, 0 to duration
  value: number; // generalized 0 to 1
  easing: EasingType;
}

export interface FillStop {
  id: string;
  color: string;
  position: number;
}

export type FillGradientType = 'linear' | 'radial' | 'conic' | 'mesh';

export interface FillKeyframe {
  id: string;
  time: number;
  stops: FillStop[];
  gradientType?: FillGradientType;
  easing: EasingType;
}

export interface TimelineTrack {
  id: string;
  name: string;
  color: string;
  min: number;
  max: number;
  defaultValue: number;
  keyframes: Keyframe[];
}

export interface TimelinePropertyRow {
  id: string;
  name: string;
  color: string;
  keyframes: Array<{ id: string; time: number; label?: string }>;
}

// Where the morph window sits inside a gap, as fractions of the gap (0..1).
// Outside [start, end] the shape holds; inside it blends to the next shape.
export const DEFAULT_TRANSITION_START = 0.25;
export const DEFAULT_TRANSITION_END = 0.75;

// A shape on the morph timeline. The animation blends between consecutive stops.
// transitionType/wipeDirection/easing describe the transition LEAVING this stop,
// and transitionStart/End mark when (within the gap) that morph happens.
export interface ShapeStop {
  id: string;
  time: number;
  iconId: string;
  iconName?: string;
  svgContent: string;
  color: string;
  colorSecondary: string;
  fillStops?: FillStop[];
  fillGradientType?: FillGradientType;
  fillKeyframes?: FillKeyframe[];
  easing: EasingType;
  transitionType: 'none' | 'wipe';
  wipeDirection: { x: number; y: number };
  transitionStart?: number;
  transitionEnd?: number;
}

export interface ShapeOption {
  id: string;
  name: string;
  svgContent: string;
  defaultTint: string;
  category?: string;
  tags?: string[];
}

export interface WipeDirectionOption {
  label: string;
  x: number;
  y: number;
  tooltip: string;
}

interface TimelineProps {
  duration: number; // in seconds
  onDurationChange: (duration: number) => void;
  currentTime: number;
  onTimeChange: (time: number) => void;
  onScrubStart?: () => void;
  isPlaying?: boolean;
  isPreviewLoading?: boolean;
  loop: boolean;
  onLoopChange: (loop: boolean) => void;
  tracks: TimelineTrack[];
  onTracksChange: (tracks: TimelineTrack[]) => void;
  propertyRows?: TimelinePropertyRow[];
  onClearTrackKeyframes?: (trackId: string) => void;
  onClearPropertyRow?: (rowId: string) => void;
  onRemovePropertyKeyframe?: (rowId: string, keyframeId: string) => void;
  onActivePropertyRowChange?: (rowId: string) => void;
  activeTrackId?: string | null;
  onActiveTrackChange?: (trackId: string) => void;
  // The shape sequence rendered as the top "Shape" lane.
  shapes: ShapeStop[];
  selectedShapeId: string | null;
  onSelectShape: (id: string) => void;
  onShapesChange: (shapes: ShapeStop[]) => void;
  onAddShape: () => void;
  onRemoveShape: (id: string) => void;
  onShapeEasingChange: (id: string, easing: EasingType) => void;
  shapeOptions: ShapeOption[];
  onShapeIconChange: (id: string, option: ShapeOption) => void;
  onShapeWipePairChange: (id: string, enabled: ShapeOption, disabled: ShapeOption) => void;
  onUploadShape: (id: string) => void;
  onShapeBlendChange: (id: string, patch: Partial<Pick<ShapeStop, 'transitionType' | 'wipeDirection'>>) => void;
  openShapePicker: string | null;
  onOpenShapePicker: (id: string | null) => void;
  wipeDirections: WipeDirectionOption[];
}

// Sample an easing into an SVG path for a little preview curve in a 16x16 box.
const easingCurvePath = (easing: EasingType): string => {
  const pts: string[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const v = applyEasing(easing, t);
    pts.push(`${(t * 14 + 1).toFixed(1)},${(15 - v * 13).toFixed(1)}`);
  }
  return `M ${pts.join(' L ')}`;
};

// AE/DaVinci-style per-property easing picker: a curve glyph that opens a menu of curves.
const EasingPicker: React.FC<{ value: EasingType; onChange: (e: EasingType) => void; color?: string }> = ({ value, onChange, color = '#a1a1aa' }) => (
  <Popover>
    <PopoverTrigger
      title={`Easing: ${EASING_OPTIONS.find((o) => o.value === value)?.label ?? value}`}
      className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40"
      onClick={(e) => e.stopPropagation()}
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d={easingCurvePath(value)} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </PopoverTrigger>
    <PopoverContent align="end" side="top" sideOffset={6} className="w-40 border-border bg-popover p-1 text-foreground">
      {EASING_OPTIONS.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors ${active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <path d={easingCurvePath(o.value)} stroke={active ? '#fff' : '#71717a'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {o.label}
          </button>
        );
      })}
    </PopoverContent>
  </Popover>
);

const WipePairPreview: React.FC<{
  pair: MaterialWipeIconPair;
  className: string;
  style: React.CSSProperties;
  mode: 'slash' | 'real';
}> = ({ pair, className, style, mode }) => {
  const disabledUsesSlash = mode === 'slash' && pair.disabled.endsWith('_off');
  const disabledSymbol = disabledUsesSlash ? pair.disabled.slice(0, -4) : pair.disabled;

  return (
    <span className="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted/45 ring-1 ring-border transition-[background-color,box-shadow] duration-200 ease-out group-hover/pair:bg-muted/65 group-hover/pair:ring-ring/45">
      <span className="absolute inset-0 bg-ring/10 opacity-0 transition-opacity duration-200 ease-out group-hover/pair:opacity-100" />
      <span className="wipe-pair-preview-layer wipe-pair-preview-base absolute inset-0 grid place-items-center">
        <span className={`${className} absolute left-1/2 top-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center text-center text-[24px] leading-[24px] text-foreground`} style={style}>
          {pair.enabled}
        </span>
      </span>
      <span className="wipe-pair-preview-layer wipe-pair-preview-wiped absolute inset-0 grid place-items-center">
        <span className={`${className} absolute left-1/2 top-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center text-center text-[24px] leading-[24px] text-foreground`} style={style}>
          {disabledSymbol}
        </span>
        {disabledUsesSlash && (
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-[25px] w-[3px] -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] rounded-full bg-foreground shadow-[0_0_0_1px_hsl(var(--background))]"
          />
        )}
      </span>
    </span>
  );
};

const EASING_OPTIONS: Array<{ value: EasingType; label: string }> = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease-in-out', label: 'Smooth' },
  { value: 'spring', label: 'Spring' },
  { value: 'bounce', label: 'Bounce' },
];

const easingMenuItems = (current: EasingType, onSelect: (easing: EasingType) => void): TimelineMenuItem[] => [
  { type: 'separator' },
  {
    type: 'submenu',
    label: 'Ease',
    shortcut: EASING_OPTIONS.find((option) => option.value === current)?.label,
    items: EASING_OPTIONS.map((option) => ({
      label: option.label,
      active: option.value === current,
      easing: option.value,
      onSelect: () => onSelect(option.value),
    })),
  },
];

type TimelineMenuItem =
  | { type?: 'item'; label: string; shortcut?: string; danger?: boolean; disabled?: boolean; active?: boolean; easing?: EasingType; onSelect: () => void }
  | { type: 'submenu'; label: string; shortcut?: string; items: Array<{ label: string; active?: boolean; easing?: EasingType; onSelect: () => void }> }
  | { type: 'separator' };

type TimelineMenuState = {
  x: number;
  y: number;
  title?: string;
  items: TimelineMenuItem[];
} | null;

const parseTimelineTimeInput = (value: string) => {
  const cleaned = value.trim().toLowerCase().replace(/s$/, '').replace(',', '.');
  if (cleaned.includes(':')) {
    const parts = cleaned.split(':').map((part) => Number.parseFloat(part));
    if (parts.some((part) => !Number.isFinite(part))) return Number.NaN;
    return parts.reduce((total, part) => total * 60 + part, 0);
  }
  return Number.parseFloat(cleaned);
};

const TimelineContextMenu = ({ menu, onClose }: { menu: TimelineMenuState; onClose: () => void }) => {
  if (!menu) return null;

  return (
    <ContextMenuContent
      className="min-w-44 rounded-xl border-border bg-popover/98 p-1.5 text-foreground backdrop-blur-xl"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {menu.title && (
        <div className="px-2 pb-1 pt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {menu.title}
        </div>
      )}
      {menu.items.map((item, index) => {
        if (item.type === 'separator') {
          return <ContextMenuSeparator key={`separator-${index}`} className="my-1 bg-muted/75" />;
        }

        if (item.type === 'submenu') {
          return (
            <ContextMenuSub key={`${item.label}-${index}`}>
              <ContextMenuSubTrigger className="h-7 gap-5 rounded-lg px-2 text-[11px]">
                <span className="truncate">{item.label}</span>
                {item.shortcut && <ContextMenuShortcut className="text-[10px] tracking-normal">{item.shortcut}</ContextMenuShortcut>}
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="min-w-36 rounded-xl border-border bg-popover/98 p-1.5 text-foreground backdrop-blur-xl">
                {item.items.map((child, childIndex) => (
                  <ContextMenuItem
                    key={`${child.label}-${childIndex}`}
                    onClick={() => {
                      child.onSelect();
                      onClose();
                    }}
                    className="h-7 justify-between gap-4 rounded-lg px-2 text-[11px]"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {child.easing && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                          <path
                            d={easingCurvePath(child.easing)}
                            stroke="currentColor"
                            className={child.active ? 'text-foreground' : 'text-muted-foreground'}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                      <span className="truncate">{child.label}</span>
                    </span>
                    {child.active && <span className="size-1.5 rounded-full bg-foreground" />}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          );
        }

        return (
          <ContextMenuItem
            key={`${item.label}-${index}`}
            disabled={item.disabled}
            variant={item.danger ? 'destructive' : 'default'}
            onClick={() => {
              if (item.disabled) return;
              item.onSelect();
              onClose();
            }}
            className="h-7 justify-between gap-5 rounded-lg px-2 text-[11px]"
          >
            <span className="flex min-w-0 items-center gap-2">
              {item.easing && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <path
                    d={easingCurvePath(item.easing)}
                    stroke="currentColor"
                    className={item.active ? 'text-foreground' : 'text-muted-foreground'}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              <span className="truncate">{item.label}</span>
            </span>
            {item.shortcut && <ContextMenuShortcut className="font-mono text-[10px] tracking-normal">{item.shortcut}</ContextMenuShortcut>}
            {item.active && !item.shortcut && <span className="size-1.5 rounded-full bg-foreground" />}
          </ContextMenuItem>
        );
      })}
    </ContextMenuContent>
  );
};

const formatValueLabel = (track: TimelineTrack, value: number) => {
  if (track.id === 'transition') return `${Math.round(value * 100)}%`;
  if (track.id === 'rotation') return `${Math.round(value)}°`;
  if (track.id === 'scale') return `${value.toFixed(2)}x`;
  if (track.id === 'lighting') return value.toFixed(1);
  return value.toFixed(2);
};

// Math Easing Formulas
const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

const springEase = (t: number) => {
  if (t === 0 || t === 1) return t;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

const bounceEase = (t: number) => {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

export const applyEasing = (easing: EasingType, t: number): number => {
  if (easing === 'ease-in-out') return easeInOut(t);
  if (easing === 'spring') return springEase(t);
  if (easing === 'bounce') return bounceEase(t);
  return t;
};

export const interpolateKeyframes = (time: number, track: TimelineTrack): number => {
  const keyframes = [...track.keyframes].sort((a, b) => a.time - b.time);

  if (keyframes.length === 0) {
    return track.defaultValue;
  }

  if (time <= keyframes[0].time) {
    return keyframes[0].value;
  }

  if (time >= keyframes[keyframes.length - 1].time) {
    return keyframes[keyframes.length - 1].value;
  }

  let prev = keyframes[0];
  let next = keyframes[0];
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
      prev = keyframes[i];
      next = keyframes[i + 1];
      break;
    }
  }

  const timeDiff = next.time - prev.time;
  if (timeDiff === 0) return prev.value;

  const ratio = (time - prev.time) / timeDiff;

  let easedRatio = ratio;
  if (prev.easing === 'ease-in-out') easedRatio = easeInOut(ratio);
  else if (prev.easing === 'spring') easedRatio = springEase(ratio);
  else if (prev.easing === 'bounce') easedRatio = bounceEase(ratio);

  return prev.value + (next.value - prev.value) * easedRatio;
};

const parseHexColor = (value: string): { r: number; g: number; b: number } | null => {
  let hex = value.trim().replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map((char) => char + char).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
};

const toHexColor = ({ r, g, b }: { r: number; g: number; b: number }) => {
  const channel = (next: number) =>
    Math.max(0, Math.min(255, Math.round(next))).toString(16).padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
};

const interpolateColorKeyframes = (
  time: number,
  fallback: string,
  keyframes: Array<{ time: number; value: string; easing: EasingType }> = []
): string => {
  const sorted = keyframes
    .filter((keyframe) => parseHexColor(keyframe.value))
    .sort((a, b) => a.time - b.time);

  if (sorted.length === 0) return fallback;
  if (time <= sorted[0].time) return sorted[0].value;
  if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;

  let prev = sorted[0];
  let next = sorted[0];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (time >= sorted[i].time && time <= sorted[i + 1].time) {
      prev = sorted[i];
      next = sorted[i + 1];
      break;
    }
  }

  const prevColor = parseHexColor(prev.value);
  const nextColor = parseHexColor(next.value);
  if (!prevColor || !nextColor) return fallback;

  const span = next.time - prev.time;
  const ratio = span > 0 ? (time - prev.time) / span : 0;
  const eased = applyEasing(prev.easing, ratio);

  return toHexColor({
    r: prevColor.r + (nextColor.r - prevColor.r) * eased,
    g: prevColor.g + (nextColor.g - prevColor.g) * eased,
    b: prevColor.b + (nextColor.b - prevColor.b) * eased,
  });
};

const interpolateNumericKeyframes = (
  time: number,
  fallback: number,
  keyframes: Array<{ time: number; value: number; easing: EasingType }> = []
) => {
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  if (sorted.length === 0) return fallback;
  if (time <= sorted[0].time) return sorted[0].value;
  if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;

  let prev = sorted[0];
  let next = sorted[0];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (time >= sorted[i].time && time <= sorted[i + 1].time) {
      prev = sorted[i];
      next = sorted[i + 1];
      break;
    }
  }

  const span = next.time - prev.time;
  const ratio = span > 0 ? (time - prev.time) / span : 0;
  const eased = applyEasing(prev.easing, ratio);
  return prev.value + (next.value - prev.value) * eased;
};

export const interpolateFillKeyframes = (
  time: number,
  fallback: { color: string; colorSecondary: string; gradientType?: FillGradientType; stops?: FillStop[] },
  keyframes: FillKeyframe[] = []
) => {
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  const fallbackStops: FillStop[] = fallback.stops?.length
    ? fallback.stops
    : [
        { id: 'start', color: fallback.color, position: 0 },
        { id: 'end', color: fallback.colorSecondary, position: 1 },
      ];

  const stopsAt = (index: number) => sorted[index]?.stops?.length ? sorted[index].stops : fallbackStops;
  const maxStops = Math.max(fallbackStops.length, ...sorted.map((keyframe) => keyframe.stops?.length ?? 0));
  const stopIdAt = (index: number) =>
    sorted.find((keyframe) => keyframe.stops?.[index])?.stops[index].id
    ?? fallbackStops[index]?.id
    ?? `stop-${index}`;
  const stops = Array.from({ length: maxStops }).map((_, index) => {
    const fallbackStop = fallbackStops[index] ?? fallbackStops[fallbackStops.length - 1];
    return {
      id: stopIdAt(index),
      position: interpolateNumericKeyframes(
        time,
        fallbackStop.position,
        sorted.map((keyframe, keyframeIndex) => {
          const stop = stopsAt(keyframeIndex)[index] ?? stopsAt(keyframeIndex)[stopsAt(keyframeIndex).length - 1] ?? fallbackStop;
          return {
            time: keyframe.time,
            value: stop.position,
            easing: keyframe.easing,
          };
        })
      ),
      color: interpolateColorKeyframes(
        time,
        fallbackStop.color,
        sorted.map((keyframe, keyframeIndex) => {
          const stop = stopsAt(keyframeIndex)[index] ?? stopsAt(keyframeIndex)[stopsAt(keyframeIndex).length - 1] ?? fallbackStop;
          return {
            time: keyframe.time,
            value: stop.color,
            easing: keyframe.easing,
          };
        })
      ),
    };
  });

  return {
    color: stops[0]?.color ?? fallback.color,
    colorSecondary: stops[1]?.color ?? stops[0]?.color ?? fallback.colorSecondary,
    gradientType: [...sorted].reverse().find((keyframe) => keyframe.time <= time)?.gradientType ?? fallback.gradientType ?? 'linear',
    stops,
  };
};

const RAIL_WIDTH = 140;
const SNAP_THRESHOLD_SECONDS = 0.08;
const PLAYHEAD_SNAP_THRESHOLD_SECONDS = 0.06;
const SECOND_SNAP_THRESHOLD_SECONDS = 0.035;
const TIMELINE_ZOOM_MIN = 1;
const TIMELINE_ZOOM_MAX = 3;
const TIMELINE_ZOOM_STEP = 0.25;
const TIMELINE_FRAME_RATE = 60;
const TIMELINE_EDGE_SCROLL_ZONE = 44;
const TIMELINE_EDGE_SCROLL_MAX = 14;
const isEditableTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'));
// Horizontal breathing room so keyframes at t=0 and t=duration aren't clipped at the edges.
const EDGE_INSET = 12;
// Map a 0..1 fraction of the timeline to a CSS position inside the inset lane area.
const xForFrac = (frac: number, offsetPx = 0) =>
  `calc(${EDGE_INSET}px + (100% - ${EDGE_INSET * 2}px) * ${frac}${offsetPx ? ` + ${offsetPx}px` : ''})`;
const widthForSpan = (span: number) => `calc((100% - ${EDGE_INSET * 2}px) * ${span})`;

const formatTimelineTick = (time: number) => {
  return time.toFixed(2);
};

const quantizeTimeToFrame = (time: number) =>
  Number((Math.round(time * TIMELINE_FRAME_RATE) / TIMELINE_FRAME_RATE).toFixed(3));

type TimelineGeometry = {
  laneLeft: number;
  laneWidth: number;
  usableWidth: number;
  viewportLeft: number;
  viewportRight: number;
};

const TimelineDiamond = ({
  color,
  borderColor = 'rgba(0,0,0,0.85)',
  selected = false,
  className = '',
}: {
  color: string;
  borderColor?: string;
  selected?: boolean;
  className?: string;
}) => (
  <svg viewBox="0 0 16 16" className={`size-4 ${className}`} aria-hidden="true">
    {selected && (
      <rect
        x="2.55"
        y="2.55"
        width="10.9"
        height="10.9"
        rx="1.05"
        fill="none"
        stroke={color}
        strokeOpacity="0.45"
        strokeWidth="1.35"
        transform="rotate(45 8 8)"
        vectorEffect="non-scaling-stroke"
      />
    )}
    <rect
      x="3.35"
      y="3.35"
      width="9.3"
      height="9.3"
      rx="0.9"
      fill={color}
      stroke={selected ? '#ffffff' : borderColor}
      strokeWidth={selected ? '1.25' : '1'}
      transform="rotate(45 8 8)"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
);

export const Timeline: React.FC<TimelineProps> = ({
  duration,
  onDurationChange,
  currentTime,
  onTimeChange,
  onScrubStart,
  isPlaying = false,
  isPreviewLoading = false,
  loop,
  onLoopChange,
  tracks,
  onTracksChange,
  propertyRows = [],
  onClearTrackKeyframes,
  onClearPropertyRow,
  onRemovePropertyKeyframe,
  onActivePropertyRowChange,
  activeTrackId,
  onActiveTrackChange,
  shapes,
  selectedShapeId,
  onSelectShape,
  onShapesChange,
  onAddShape,
  onRemoveShape,
  onShapeEasingChange,
  shapeOptions,
  onShapeIconChange,
  onShapeWipePairChange,
  onUploadShape,
  onShapeBlendChange,
  openShapePicker,
  onOpenShapePicker,
  wipeDirections,
}) => {
  const [selectedKeyframe, setSelectedKeyframe] = useState<
    | { type: 'track'; trackId: string; kfId: string }
    | { type: 'property'; rowId: string; kfId: string }
    | null
  >(null);
  const [openClipEditor, setOpenClipEditor] = useState<string | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [timeEditor, setTimeEditor] = useState<{ trackId: string; kfId: string; draft: string } | null>(null);
  const [durationEditor, setDurationEditor] = useState<string | null>(null);
  const [goToEditor, setGoToEditor] = useState<{ x: number; y: number; draft: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<TimelineMenuState>(null);
  const [shapeSearchQuery, setShapeSearchQuery] = useState('');
  const [materialSymbolStyle, setMaterialSymbolStyle] = useState<MaterialSymbolStyle>('outlined');
  const [materialSymbolSettings, setMaterialSymbolSettings] = useState<MaterialSymbolFontSettings>({
    fill: 0,
    weight: 400,
    grade: 0,
    opticalSize: 24,
  });
  const [materialSymbolOptionsOpen, setMaterialSymbolOptionsOpen] = useState(false);
  const [materialSymbolNames, setMaterialSymbolNames] = useState<string[]>([]);
  const [materialCatalogLoading, setMaterialCatalogLoading] = useState(false);
  const [materialSymbolStatus, setMaterialSymbolStatus] = useState<{ state: 'idle' | 'loading' | 'error'; message?: string }>({ state: 'idle' });
  const [wipePairMode, setWipePairMode] = useState<'slash' | 'morph'>('slash');
  const shapeDraggedRef = useRef(false);
  const morphResizedRef = useRef(false);
  const keyframeDraggedRef = useRef(false);
  const skipGoToCommitRef = useRef(false);
  const scrubEdgeClientXRef = useRef<number | null>(null);
  const scrubEdgeRafRef = useRef<number | null>(null);
  const scrubGeometryRef = useRef<TimelineGeometry | null>(null);
  const scrubSnapTimesRef = useRef<number[] | null>(null);
  const scrubLastTimeRef = useRef<number | null>(null);
  const scrubPendingTimeRef = useRef<number | null>(null);
  const scrubEmitRafRef = useRef<number | null>(null);
  const laneRef = useRef<HTMLDivElement>(null);
  const leftRailBodyRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('wheel', close, { passive: true });
    window.addEventListener('resize', close);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('wheel', close);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  const fitTimeline = () => {
    setTimelineZoom(1);
    window.requestAnimationFrame(() => {
      if (timelineScrollRef.current) timelineScrollRef.current.scrollLeft = 0;
    });
  };

  const commitDurationEditor = () => {
    if (durationEditor === null) return;
    const parsed = Number.parseFloat(durationEditor);
    if (Number.isFinite(parsed)) {
      onDurationChange(Math.max(0.5, Math.min(30, Number(parsed.toFixed(1)))));
    }
    setDurationEditor(null);
  };

  const openDurationEditor = () => setDurationEditor(duration.toFixed(1));

  const applyDuration = (value: number) => {
    onDurationChange(Math.max(0.5, Math.min(30, Number(value.toFixed(1)))));
    setDurationEditor(null);
  };

  const adjustTimelineZoom = (delta: number) => {
    setTimelineZoom((zoom) => Number(Math.max(TIMELINE_ZOOM_MIN, Math.min(TIMELINE_ZOOM_MAX, zoom + delta)).toFixed(2)));
  };

  useEffect(() => {
    const handleTimelineZoomShortcut = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        adjustTimelineZoom(TIMELINE_ZOOM_STEP);
      }
      if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        adjustTimelineZoom(-TIMELINE_ZOOM_STEP);
      }
      if (event.key === '0') {
        event.preventDefault();
        fitTimeline();
      }
    };

    window.addEventListener('keydown', handleTimelineZoomShortcut);
    return () => window.removeEventListener('keydown', handleTimelineZoomShortcut);
  }, []);

  const openContextMenu = (event: React.MouseEvent, title: string, items: TimelineMenuItem[]) => {
    setGoToEditor(null);
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      title,
      items,
    });
  };

  // Clear a stale keyframe selection if the keyframe disappears.
  useEffect(() => {
    if (!selectedKeyframe) return;
    const exists = selectedKeyframe.type === 'track'
      ? tracks.some((track) => track.id === selectedKeyframe.trackId && track.keyframes.some((keyframe) => keyframe.id === selectedKeyframe.kfId))
      : propertyRows.some((row) => row.id === selectedKeyframe.rowId && row.keyframes.some((keyframe) => keyframe.id === selectedKeyframe.kfId));
    if (!exists) {
      setSelectedKeyframe(null);
    }
  }, [propertyRows, tracks, selectedKeyframe]);

  useEffect(() => {
    if (!timeEditor) return;
    const track = tracks.find((t) => t.id === timeEditor.trackId);
    if (!track || !track.keyframes.some((k) => k.id === timeEditor.kfId)) {
      setTimeEditor(null);
    }
  }, [tracks, timeEditor]);

  useEffect(() => {
    if (!openShapePicker || materialSymbolNames.length > 0 || materialCatalogLoading) return;
    let cancelled = false;
    setMaterialCatalogLoading(true);
    fetchMaterialSymbolNames()
      .then((names) => {
        if (!cancelled) setMaterialSymbolNames(names);
      })
      .catch(() => {
        if (!cancelled) setMaterialSymbolNames([]);
      })
      .finally(() => {
        if (!cancelled) setMaterialCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [materialCatalogLoading, materialSymbolNames.length, openShapePicker]);

  const selectTrack = (trackId: string) => {
    onActiveTrackChange?.(trackId);
  };

  const sortedShapes = [...shapes].sort((a, b) => a.time - b.time);
  const selectedShape = shapes.find((s) => s.id === selectedShapeId) ?? null;
  const shapeLabel = (stop: ShapeStop) => stop.iconName ?? shapeOptions.find((o) => o.id === stop.iconId)?.name ?? 'Custom';
  const visiblePropertyRows = propertyRows.filter((row) => row.keyframes.length > 0);
  const frameSnapActive = timelineZoom >= TIMELINE_ZOOM_MAX - 0.001;
  const normalizedShapeQuery = normalizeMaterialSymbolName(shapeSearchQuery);
  const visibleShapeOptions = useMemo(() => {
    const query = shapeSearchQuery.trim().toLowerCase();
    if (!query) return shapeOptions;
    return shapeOptions.filter((option) => {
      const haystack = [option.name, option.id, option.category, ...(option.tags ?? [])].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query) || haystack.includes(normalizedShapeQuery);
    });
  }, [normalizedShapeQuery, shapeOptions, shapeSearchQuery]);
  const materialSymbolClass = `material-symbols-${materialSymbolStyle}`;
  const filteredMaterialSymbols = useMemo(() => {
    const query = normalizedShapeQuery;
    const source = materialSymbolNames.length > 0
      ? materialSymbolNames
      : [
          'home', 'search', 'settings', 'person', 'favorite', 'star', 'arrow_forward', 'event_list', 'palette', 'bolt',
          'play_arrow', 'shopping_cart', 'add', 'close', 'check', 'menu', 'camera_alt', 'image', 'music_note', 'mail',
          'chat', 'call', 'calendar_month', 'lock', 'folder', 'shopping_bag', 'location_on', 'public', 'rocket_launch', 'diamond',
          'notifications', 'cloud', 'shield', 'trophy', 'mood', 'download', 'upload', 'edit', 'delete', 'visibility',
          'favorite', 'bookmark', 'share', 'refresh', 'sync', 'layers', 'dashboard', 'terminal', 'code', 'auto_awesome',
          'brush', 'format_paint', 'lightbulb', 'extension', 'widgets', 'animation', 'view_in_ar', 'deployed_code', 'gesture', 'emoji_objects',
        ];
    const uniqueSource = Array.from(new Set(source));
    const filtered = query
      ? uniqueSource.filter((name) => name.includes(query))
      : uniqueSource;
    return filtered.slice(0, 80);
  }, [materialSymbolNames, normalizedShapeQuery]);
  const filteredWipePairs = useMemo(() => {
    const query = normalizedShapeQuery;
    const source = MATERIAL_WIPE_READY_PAIRS;
    const filtered = query
      ? source.filter((pair) =>
          normalizeMaterialSymbolName(`${pair.label} ${pair.enabled} ${pair.disabled}`).includes(query)
        )
      : source;
    return filtered.slice(0, 24);
  }, [normalizedShapeQuery]);

  const updateMaterialSymbolSetting = <K extends keyof MaterialSymbolFontSettings>(
    key: K,
    value: MaterialSymbolFontSettings[K]
  ) => {
    setMaterialSymbolSettings((current) => ({ ...current, [key]: value }));
  };

  const importMaterialSymbol = async (shapeId: string) => {
    const symbolName = normalizeMaterialSymbolName(shapeSearchQuery);
    if (!symbolName || materialSymbolStatus.state === 'loading') return;
    setMaterialSymbolStatus({ state: 'loading' });
    try {
      const icon = await fetchMaterialSymbolIcon(symbolName, materialSymbolStyle);
      onShapeIconChange(shapeId, icon);
      setShapeSearchQuery('');
      setMaterialSymbolStatus({ state: 'idle' });
      onOpenShapePicker(null);
    } catch (error) {
      setMaterialSymbolStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'Could not import that symbol.',
      });
    }
  };

  const chooseMaterialSymbol = (shapeId: string, symbolName: string) => {
    setMaterialSymbolStatus({ state: 'idle' });
    void (async () => {
      setMaterialSymbolStatus({ state: 'loading' });
      try {
        const icon = await fetchMaterialSymbolIcon(symbolName, materialSymbolStyle);
        onShapeIconChange(shapeId, icon);
        setShapeSearchQuery('');
        setMaterialSymbolStatus({ state: 'idle' });
        onOpenShapePicker(null);
      } catch (error) {
        setMaterialSymbolStatus({
          state: 'error',
          message: error instanceof Error ? error.message : 'Could not import that symbol.',
        });
      }
    })();
  };

  const chooseWipePair = (shapeId: string, pair: MaterialWipeIconPair) => {
    setMaterialSymbolStatus({ state: 'loading' });
    void (async () => {
      try {
        const [enabled, disabled] = await Promise.all([
          fetchMaterialSymbolIcon(pair.enabled, materialSymbolStyle),
          fetchMaterialSymbolIcon(pair.disabled, materialSymbolStyle, {
            syntheticOffSlash: wipePairMode === 'slash',
          }),
        ]);
        onShapeWipePairChange(shapeId, enabled, disabled);
        setShapeSearchQuery('');
        setMaterialSymbolStatus({ state: 'idle' });
        onOpenShapePicker(null);
      } catch (error) {
        setMaterialSymbolStatus({
          state: 'error',
          message: error instanceof Error ? error.message : 'Could not import that wipe pair.',
        });
      }
    })();
  };

  // For each gap (between consecutive stops) the morph window is the sub-range
  // [mStart, mEnd] where the actual blend happens; the stops hold on either side.
  const morphWindows = sortedShapes.slice(0, -1).map((stop, i) => {
    const next = sortedShapes[i + 1];
    const gap = Math.max(0, next.time - stop.time);
    const startFrac = stop.transitionStart ?? DEFAULT_TRANSITION_START;
    const endFrac = stop.transitionEnd ?? DEFAULT_TRANSITION_END;
    return {
      stop,
      next,
      mStart: stop.time + startFrac * gap,
      mEnd: stop.time + endFrac * gap,
    };
  });
  // Each stop's hold clip fills the lane between the morph windows around it.
  const clipBounds = sortedShapes.map((stop, i) => {
    if (sortedShapes.length === 1) return { left: 0, right: duration, isOnly: true };
    // First/last clips fill to the timeline edges — the engine holds those shapes
    // before/after their stop anyway, so tiling the lane reads cleaner.
    const left = i === 0 ? 0 : morphWindows[i - 1].mEnd;
    const right = i === sortedShapes.length - 1 ? duration : morphWindows[i].mStart;
    return { left, right, isOnly: false };
  });

  const breakpointTimes = React.useCallback(({
    excludeShapeId,
    excludeKeyframe,
    excludeTrackId,
  }: {
    excludeShapeId?: string;
    excludeKeyframe?: { trackId: string; kfId: string };
    excludeTrackId?: string;
  } = {}) => {
    const shapeTransitionTimes = morphWindows.flatMap(({ stop, next, mStart, mEnd }) => {
      if (stop.id === excludeShapeId || next.id === excludeShapeId) return [];
      return [mStart, mEnd];
    });
    const numericKeyframeTimes = tracks.flatMap((track) => {
      if (track.id === excludeTrackId) return [];
      return track.keyframes
        .filter((keyframe) => !(excludeKeyframe?.trackId === track.id && excludeKeyframe.kfId === keyframe.id))
        .map((keyframe) => keyframe.time);
    });
    const colorKeyframeTimes = shapes
      .filter((shape) => shape.id !== excludeShapeId)
      .flatMap((shape) => (shape.fillKeyframes ?? []).map((keyframe) => keyframe.time));
    const propertyRowTimes = visiblePropertyRows.flatMap((row) => row.keyframes.map((keyframe) => keyframe.time));

    return Array.from(new Set([...shapeTransitionTimes, ...numericKeyframeTimes, ...colorKeyframeTimes, ...propertyRowTimes, 0, duration]))
      .filter((time) => Number.isFinite(time))
      .sort((a, b) => a - b);
  }, [duration, morphWindows, shapes, tracks, visiblePropertyRows]);

  const baseBreakpointTimes = useMemo(() => breakpointTimes(), [breakpointTimes]);

  const snapTime = (
    rawTime: number,
    options: {
      bypass?: boolean;
    excludeShapeId?: string;
    excludeKeyframe?: { trackId: string; kfId: string };
    excludeTrackId?: string;
    snapToPlayhead?: boolean;
    snapToWholeSeconds?: boolean;
  } = {}
) => {
    const clamped = Math.max(0, Math.min(duration, rawTime));
    const quantizeIfNeeded = (time: number) =>
      frameSnapActive && !options.bypass ? Math.max(0, Math.min(duration, quantizeTimeToFrame(time))) : time;

    if (!snapEnabled || options.bypass) return clamped;

    const nearestWithin = (times: number[], threshold: number) => times.reduce<{ time: number; distance: number } | null>((closest, time) => {
      const distance = Math.abs(time - clamped);
      if (distance > threshold) return closest;
      if (!closest || distance < closest.distance) return { time, distance };
      return closest;
    }, null);

    if (options.snapToPlayhead) {
      const playheadTime = frameSnapActive ? quantizeTimeToFrame(currentTime) : currentTime;
      if (Math.abs(playheadTime - clamped) <= PLAYHEAD_SNAP_THRESHOLD_SECONDS && playheadTime >= 0 && playheadTime <= duration) {
        return quantizeIfNeeded(playheadTime);
      }
    }

    const hasExcludedSnapTarget = Boolean(options.excludeShapeId || options.excludeKeyframe || options.excludeTrackId);
    const candidateTimes = hasExcludedSnapTarget
      ? breakpointTimes(options)
      : scrubSnapTimesRef.current ?? baseBreakpointTimes;

    const nearest = nearestWithin(candidateTimes, SNAP_THRESHOLD_SECONDS);
    if (nearest) return quantizeIfNeeded(nearest.time);

    if (options.snapToWholeSeconds) {
      const wholeSecond = Math.round(clamped);
      if (wholeSecond > 0 && wholeSecond <= duration && Math.abs(wholeSecond - clamped) <= SECOND_SNAP_THRESHOLD_SECONDS) {
        return quantizeIfNeeded(wholeSecond);
      }
    }

    return quantizeIfNeeded(clamped);
  };

  const getTimelineGeometry = (): TimelineGeometry | null => {
    if (!laneRef.current) return null;
    const laneRect = laneRef.current.getBoundingClientRect();
    const scrollerRect = timelineScrollRef.current?.getBoundingClientRect();

    return {
      laneLeft: laneRect.left,
      laneWidth: laneRect.width,
      usableWidth: Math.max(1, laneRect.width - EDGE_INSET * 2),
      viewportLeft: scrollerRect?.left ?? laneRect.left,
      viewportRight: scrollerRect?.right ?? laneRect.right,
    };
  };

  const clampClientXToTimelineViewport = (clientX: number, geometry?: TimelineGeometry | null) => {
    const scroller = timelineScrollRef.current;
    const viewportLeft = geometry?.viewportLeft;
    const viewportRight = geometry?.viewportRight;
    if (viewportLeft !== undefined && viewportRight !== undefined) {
      return Math.max(viewportLeft + EDGE_INSET, Math.min(viewportRight - EDGE_INSET, clientX));
    }
    if (!scroller) return clientX;
    const rect = scroller.getBoundingClientRect();
    return Math.max(rect.left + EDGE_INSET, Math.min(rect.right - EDGE_INSET, clientX));
  };

  const rawTimeFromClientX = (clientX: number, options: { clampToViewport?: boolean; geometry?: TimelineGeometry | null } = {}) => {
    const geometry = options.geometry ?? getTimelineGeometry();
    if (!geometry) return currentTime;
    const effectiveClientX = options.clampToViewport ? clampClientXToTimelineViewport(clientX, geometry) : clientX;
    const x = Math.max(0, Math.min(effectiveClientX - geometry.laneLeft - EDGE_INSET, geometry.usableWidth));
    return Number(((x / geometry.usableWidth) * duration).toFixed(3));
  };

  const timeFromClientX = (
    clientX: number,
    options: Parameters<typeof snapTime>[1] & { clampToViewport?: boolean; geometry?: TimelineGeometry | null } = {}
  ) => Number(snapTime(rawTimeFromClientX(clientX, { clampToViewport: options.clampToViewport, geometry: options.geometry }), options).toFixed(3));

  const flushScrubTime = () => {
    const time = scrubPendingTimeRef.current;
    scrubPendingTimeRef.current = null;
    scrubEmitRafRef.current = null;
    if (time === null) return;
    if (scrubLastTimeRef.current !== null && Math.abs(scrubLastTimeRef.current - time) < 0.0005) return;
    scrubLastTimeRef.current = time;
    onTimeChange(time);
  };

  const emitScrubTime = (time: number, options: { immediate?: boolean } = {}) => {
    if (scrubLastTimeRef.current !== null && Math.abs(scrubLastTimeRef.current - time) < 0.0005) return;
    if (scrubPendingTimeRef.current !== null && Math.abs(scrubPendingTimeRef.current - time) < 0.0005) return;

    scrubPendingTimeRef.current = time;
    if (options.immediate) {
      if (scrubEmitRafRef.current !== null) {
        cancelAnimationFrame(scrubEmitRafRef.current);
      }
      flushScrubTime();
      return;
    }

    if (scrubEmitRafRef.current === null) {
      scrubEmitRafRef.current = requestAnimationFrame(flushScrubTime);
    }
  };

  const scrollTimelineNearEdge = (clientX: number) => {
    const scroller = timelineScrollRef.current;
    if (!scroller || timelineZoom <= 1) return false;

    const rect = scroller.getBoundingClientRect();
    const leftDistance = clientX - rect.left;
    const rightDistance = rect.right - clientX;
    let delta = 0;

    if (leftDistance < TIMELINE_EDGE_SCROLL_ZONE) {
      delta = -((TIMELINE_EDGE_SCROLL_ZONE - Math.max(0, leftDistance)) / TIMELINE_EDGE_SCROLL_ZONE) * TIMELINE_EDGE_SCROLL_MAX;
    } else if (rightDistance < TIMELINE_EDGE_SCROLL_ZONE) {
      delta = ((TIMELINE_EDGE_SCROLL_ZONE - Math.max(0, rightDistance)) / TIMELINE_EDGE_SCROLL_ZONE) * TIMELINE_EDGE_SCROLL_MAX;
    }

    if (delta !== 0) {
      scroller.scrollLeft += delta;
      return true;
    }

    return false;
  };

  const stopScrubEdgeScroll = () => {
    if (scrubEmitRafRef.current !== null) {
      cancelAnimationFrame(scrubEmitRafRef.current);
      scrubEmitRafRef.current = null;
    }
    flushScrubTime();
    scrubEdgeClientXRef.current = null;
    scrubGeometryRef.current = null;
    scrubSnapTimesRef.current = null;
    scrubLastTimeRef.current = null;
    scrubPendingTimeRef.current = null;
    if (scrubEdgeRafRef.current !== null) {
      cancelAnimationFrame(scrubEdgeRafRef.current);
      scrubEdgeRafRef.current = null;
    }
  };

  const startScrubEdgeScroll = (options: Parameters<typeof snapTime>[1]) => {
    if (scrubEdgeRafRef.current !== null) {
      cancelAnimationFrame(scrubEdgeRafRef.current);
      scrubEdgeRafRef.current = null;
    }
    const tick = () => {
      const clientX = scrubEdgeClientXRef.current;
      if (clientX === null) {
        scrubEdgeRafRef.current = null;
        return;
      }
      const didScroll = scrollTimelineNearEdge(clientX);
      if (didScroll) {
        scrubGeometryRef.current = getTimelineGeometry();
        emitScrubTime(timeFromClientX(clientX, { ...options, clampToViewport: true, geometry: scrubGeometryRef.current }));
      }
      scrubEdgeRafRef.current = requestAnimationFrame(tick);
    };
    scrubEdgeRafRef.current = requestAnimationFrame(tick);
  };

  const openGoToEditor = (clientX: number, clientY: number, time: number) => {
    const width = 132;
    const height = 76;
    skipGoToCommitRef.current = false;
    setContextMenu(null);
    setGoToEditor({
      x: Math.min(clientX, window.innerWidth - width - 8),
      y: Math.min(clientY, window.innerHeight - height - 8),
      draft: Math.max(0, Math.min(duration, time)).toFixed(2),
    });
  };

  const goToMenuItem = (
    event: React.MouseEvent,
    time: number,
    onBeforeOpen?: () => void
  ): TimelineMenuItem => {
    const x = event.clientX;
    const y = event.clientY;
    const t = Math.max(0, Math.min(duration, time));
    return {
      label: 'Go to...',
      shortcut: `${t.toFixed(2)}s`,
      onSelect: () => {
        onBeforeOpen?.();
        openGoToEditor(x, y, t);
      },
    };
  };

  const commitGoToEditor = () => {
    if (skipGoToCommitRef.current) {
      skipGoToCommitRef.current = false;
      return;
    }
    if (!goToEditor) return;
    const parsed = parseTimelineTimeInput(goToEditor.draft);
    if (Number.isFinite(parsed)) {
      onScrubStart?.();
      onTimeChange(Number(Math.max(0, Math.min(duration, parsed)).toFixed(3)));
    }
    setGoToEditor(null);
  };

  const cancelGoToEditor = () => {
    skipGoToCommitRef.current = true;
    setGoToEditor(null);
  };

  const handleScrubStart = (e: React.MouseEvent) => {
    setSelectedKeyframe(null);
    onScrubStart?.();
    const initialOptions = { bypass: e.altKey, snapToWholeSeconds: true };
    scrubGeometryRef.current = getTimelineGeometry();
    scrubSnapTimesRef.current = baseBreakpointTimes;
    scrubLastTimeRef.current = null;
    scrubEdgeClientXRef.current = e.clientX;
    emitScrubTime(timeFromClientX(e.clientX, { ...initialOptions, geometry: scrubGeometryRef.current }), { immediate: true });
    startScrubEdgeScroll(initialOptions);
    bindWindowMouseDrag({
      onMove: (ev) => {
        const options = { bypass: ev.altKey, snapToWholeSeconds: true };
        scrubEdgeClientXRef.current = ev.clientX;
        emitScrubTime(timeFromClientX(ev.clientX, { ...options, clampToViewport: true, geometry: scrubGeometryRef.current }));
      },
      onEnd: stopScrubEdgeScroll,
    });
  };

  const toggleKeyframeAtPlayhead = (trackId: string) => {
    const t = quantizeTimeToFrame(currentTime);
    let nextSelected: { trackId: string; kfId: string } | null = null;
    const updated = tracks.map((track) => {
      if (track.id !== trackId) return track;
      const existing = track.keyframes.find((k) => Math.abs(k.time - t) < 0.05);
      if (existing) {
        return { ...track, keyframes: track.keyframes.filter((k) => k.id !== existing.id) };
      }
      const value = interpolateKeyframes(currentTime, track);
      const prev = [...track.keyframes].sort((a, b) => a.time - b.time).filter((k) => k.time <= t).pop();
      const kf: Keyframe = {
        id: Math.random().toString(36).slice(2, 10),
        time: t,
        value,
        easing: prev?.easing ?? 'ease-in-out',
      };
      nextSelected = { trackId, kfId: kf.id };
      return { ...track, keyframes: [...track.keyframes, kf].sort((a, b) => a.time - b.time) };
    });
    selectTrack(trackId);
    setSelectedKeyframe(nextSelected);
    onTracksChange(updated);
  };

  const addTrackKeyframeAtTime = (trackId: string, time: number) => {
    const clamped = Math.max(0, Math.min(duration, time));
    const t = Number((frameSnapActive ? quantizeTimeToFrame(clamped) : clamped).toFixed(3));
    let nextSelected: { trackId: string; kfId: string } | null = null;
    const updated = tracks.map((track) => {
      if (track.id !== trackId) return track;
      const existing = track.keyframes.find((keyframe) => Math.abs(keyframe.time - t) < 0.05);
      if (existing) {
        nextSelected = { trackId, kfId: existing.id };
        return track;
      }
      const prev = [...track.keyframes].sort((a, b) => a.time - b.time).filter((keyframe) => keyframe.time <= t).pop();
      const kf: Keyframe = {
        id: Math.random().toString(36).slice(2, 10),
        time: t,
        value: interpolateKeyframes(t, track),
        easing: prev?.easing ?? 'ease-in-out',
      };
      nextSelected = { trackId, kfId: kf.id };
      return { ...track, keyframes: [...track.keyframes, kf].sort((a, b) => a.time - b.time) };
    });
    selectTrack(trackId);
    setSelectedKeyframe(nextSelected);
    onTimeChange(t);
    onTracksChange(updated);
  };

  const removeTrackKeyframe = (trackId: string, kfId: string) => {
    setSelectedKeyframe(null);
    onTracksChange(
      tracks.map((track) =>
        track.id === trackId
          ? { ...track, keyframes: track.keyframes.filter((keyframe) => keyframe.id !== kfId) }
          : track
      )
    );
  };

  useEffect(() => {
    const handleDeleteSelectedKeyframe = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

      if (!selectedKeyframe) {
        if (!selectedShapeId || shapes.length <= 1) return;
        event.preventDefault();
        onRemoveShape(selectedShapeId);
        return;
      }

      if (selectedKeyframe.type === 'track') {
        const track = tracks.find((item) => item.id === selectedKeyframe.trackId);
        if (!track?.keyframes.some((keyframe) => keyframe.id === selectedKeyframe.kfId)) return;
        event.preventDefault();
        removeTrackKeyframe(selectedKeyframe.trackId, selectedKeyframe.kfId);
        return;
      }

      const row = propertyRows.find((item) => item.id === selectedKeyframe.rowId);
      if (!row?.keyframes.some((keyframe) => keyframe.id === selectedKeyframe.kfId)) return;
      event.preventDefault();
      setSelectedKeyframe(null);
      onRemovePropertyKeyframe?.(selectedKeyframe.rowId, selectedKeyframe.kfId);
    };
    window.addEventListener('keydown', handleDeleteSelectedKeyframe);
    return () => window.removeEventListener('keydown', handleDeleteSelectedKeyframe);
  }, [onRemovePropertyKeyframe, onRemoveShape, propertyRows, selectedKeyframe, selectedShapeId, shapes.length, tracks]);

  const handleKeyframeDrag = (e: React.MouseEvent, trackId: string, kfId: string) => {
    e.stopPropagation();
    if (!laneRef.current) return;
    onScrubStart?.();
    keyframeDraggedRef.current = false;
    const rect = laneRef.current.getBoundingClientRect();
    const usable = Math.max(1, rect.width - EDGE_INSET * 2);
    const startX = e.clientX;
    const startY = e.clientY;
    bindWindowMouseDrag({
      onMove: (ev) => {
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 3) {
        keyframeDraggedRef.current = true;
      }
      const x = Math.max(0, Math.min(ev.clientX - rect.left - EDGE_INSET, usable));
      const rawTime = (x / usable) * duration;
      const newTime = Number(snapTime(rawTime, {
        bypass: ev.altKey,
        excludeKeyframe: { trackId, kfId },
        snapToPlayhead: true,
      }).toFixed(3));
      onTracksChange(
        tracks.map((track) =>
          track.id === trackId
            ? { ...track, keyframes: track.keyframes.map((k) => (k.id === kfId ? { ...k, time: newTime } : k)).sort((a, b) => a.time - b.time) }
            : track
          )
      );
      },
    });
  };

  const setTrackKeyframeTime = (trackId: string, kfId: string, time: number) => {
    selectTrack(trackId);
    const clamped = Math.max(0, Math.min(duration, time));
    const nextTime = Number((frameSnapActive ? quantizeTimeToFrame(clamped) : clamped).toFixed(3));
    onTracksChange(
      tracks.map((track) =>
        track.id === trackId
          ? { ...track, keyframes: track.keyframes.map((keyframe) => keyframe.id === kfId ? { ...keyframe, time: nextTime } : keyframe).sort((a, b) => a.time - b.time) }
          : track
      )
    );
  };

  const commitTimeEditor = () => {
    if (!timeEditor) return;
    const parsed = Number.parseFloat(timeEditor.draft);
    if (!Number.isFinite(parsed)) return;
    setTrackKeyframeTime(timeEditor.trackId, timeEditor.kfId, parsed);
    setTimeEditor(null);
  };

  // Drag the whole keyframe span of a track (the "clip") left/right, keeping its shape.
  const handleBlockDrag = (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation();
    if (!laneRef.current) return;
    onScrubStart?.();
    selectTrack(trackId);
    const rect = laneRef.current.getBoundingClientRect();
    const usable = Math.max(1, rect.width - EDGE_INSET * 2);
    const startX = e.clientX;
    const track = tracks.find((t) => t.id === trackId);
    if (!track || track.keyframes.length === 0) return;
    const initial = track.keyframes.map((k) => ({ id: k.id, time: k.time }));
    const minT = Math.min(...initial.map((k) => k.time));
    const maxT = Math.max(...initial.map((k) => k.time));

    bindWindowMouseDrag({
      onMove: (ev) => {
      let delta = ((ev.clientX - startX) / usable) * duration;
      if (minT + delta < 0) delta = -minT;
      if (maxT + delta > duration) delta = duration - maxT;
      if (snapEnabled && !ev.altKey) {
        const movedTimes = initial.map((keyframe) => keyframe.time + delta);
        const playheadTime = frameSnapActive ? quantizeTimeToFrame(currentTime) : currentTime;
        const targets = [
          ...breakpointTimes({ excludeTrackId: trackId }).map((time) => ({ time, threshold: SNAP_THRESHOLD_SECONDS })),
          ...(playheadTime >= 0 && playheadTime <= duration ? [{ time: playheadTime, threshold: PLAYHEAD_SNAP_THRESHOLD_SECONDS }] : []),
        ];
        const snapCandidate = movedTimes.reduce<{ delta: number; distance: number } | null>((closest, movedTime) => {
          const target = targets.reduce<{ time: number; distance: number } | null>((nearest, target) => {
            const distance = Math.abs(target.time - movedTime);
            if (distance > target.threshold) return nearest;
            if (!nearest || distance < nearest.distance) return { time: target.time, distance };
            return nearest;
          }, null);
          if (!target) return closest;
          const candidateDelta = target.time - movedTime;
          if (!closest || target.distance < closest.distance) return { delta: candidateDelta, distance: target.distance };
          return closest;
        }, null);
        if (snapCandidate) {
          delta += snapCandidate.delta;
          if (minT + delta < 0) delta = -minT;
          if (maxT + delta > duration) delta = duration - maxT;
        }
      }
      onTracksChange(
        tracks.map((t) =>
          t.id !== trackId
            ? t
            : {
                ...t,
                keyframes: t.keyframes.map((k) => {
                  const init = initial.find((i) => i.id === k.id);
                  const nextTime = init ? Math.max(0, Math.min(duration, init.time + delta)) : k.time;
                  return init ? { ...k, time: Number((frameSnapActive ? quantizeTimeToFrame(nextTime) : nextTime).toFixed(3)) } : k;
                }),
            }
        )
      );
      },
    });
  };

  // Set the easing for an entire effect (all of a track's keyframes share one curve).
  const setTrackEasing = (trackId: string, easing: EasingType) => {
    onTracksChange(
      tracks.map((t) =>
        t.id === trackId ? { ...t, keyframes: t.keyframes.map((k) => ({ ...k, easing })) } : t
      )
    );
  };

  const setSingleKeyframeEasing = (trackId: string, kfId: string, easing: EasingType) => {
    onTracksChange(
      tracks.map((track) =>
        track.id === trackId
          ? { ...track, keyframes: track.keyframes.map((keyframe) => keyframe.id === kfId ? { ...keyframe, easing } : keyframe) }
          : track
      )
    );
  };

  // Shapes can't cross each other: clamp a stop's time between its immediate
  // neighbors (minus a small gap) so dragging never inverts order or collapses a
  // clip to zero width. Neighbors are read from the pre-drag order, so the set is
  // stable for the whole gesture.
  const SHAPE_MIN_GAP = 0.05;
  const clampShapeTime = (shapeId: string, rawTime: number) => {
    const selfTime = shapes.find((s) => s.id === shapeId)?.time ?? 0;
    const lower = shapes.filter((s) => s.id !== shapeId && s.time < selfTime).map((s) => s.time);
    const upper = shapes.filter((s) => s.id !== shapeId && s.time > selfTime).map((s) => s.time);
    const lo = lower.length ? Math.max(...lower) + SHAPE_MIN_GAP : 0;
    const hi = upper.length ? Math.min(...upper) - SHAPE_MIN_GAP : duration;
    return Math.max(Math.min(lo, hi), Math.min(Math.max(lo, hi), rawTime));
  };

  // Retime a single shape stop by dragging. `draggedRef` guards the click that
  // would otherwise open a popover after a real drag. Used for both the clip body
  // (move the shape) and the seam (move the boundary = retime the next shape).
  const retimeShapeByDrag = (
    e: React.PointerEvent<HTMLElement>,
    shapeId: string,
    draggedRef: React.MutableRefObject<boolean>,
    options: { select?: boolean } = {}
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (!laneRef.current) return;
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // Synthetic pointer events used by tests may not be eligible for capture.
    }
    if (options.select) {
      onSelectShape(shapeId);
      setSelectedKeyframe(null);
    }
    draggedRef.current = false;
    const startX = e.clientX;
    const startTime = shapes.find((s) => s.id === shapeId)?.time ?? 0;
    // Keep the grab point fixed within the clip so a wide block doesn't snap its
    // start to the cursor — it moves relative to where it was picked up.
    const grabOffset = rawTimeFromClientX(e.clientX) - startTime;
    bindWindowPointerDrag({
      onMove: (ev) => {
      if (Math.abs(ev.clientX - startX) > 3) {
        if (!draggedRef.current) onScrubStart?.();
        draggedRef.current = true;
      }
      const snapped = snapTime(rawTimeFromClientX(ev.clientX) - grabOffset, { bypass: ev.altKey, excludeShapeId: shapeId, snapToPlayhead: true });
      const newTime = Number(clampShapeTime(shapeId, snapped).toFixed(3));
      onShapesChange(shapes.map((s) => (s.id === shapeId ? { ...s, time: newTime } : s)));
      },
      onEnd: (ev) => {
      try {
        if (ev instanceof PointerEvent) e.currentTarget.releasePointerCapture?.(ev.pointerId);
      } catch {
        // Ignore release failures when the pointer was never captured.
      }
      },
    });
  };

  // Drag the clip body to move that shape stop.
  const handleShapeDrag = (e: React.PointerEvent<HTMLElement>, shapeId: string) =>
    retimeShapeByDrag(e, shapeId, shapeDraggedRef, { select: true });

  // Drag a morph block's edge to resize the transition window. The window is stored
  // as fractions of the gap, so it stays put when the surrounding stops are retimed.
  const MORPH_MIN_FRAC = 0.04;
  const handleMorphEdgeDrag = (
    e: React.PointerEvent<HTMLElement>,
    shapeId: string,
    edge: 'start' | 'end',
    fromTime: number,
    toTime: number
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (!laneRef.current) return;
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // Synthetic pointer events used by tests may not be eligible for capture.
    }
    morphResizedRef.current = false;
    const startX = e.clientX;
    const gap = Math.max(1e-6, toTime - fromTime);
    bindWindowPointerDrag({
      onMove: (ev) => {
      if (Math.abs(ev.clientX - startX) > 3) {
        if (!morphResizedRef.current) onScrubStart?.();
        morphResizedRef.current = true;
      }
      const frac = Math.max(0, Math.min(1, (rawTimeFromClientX(ev.clientX) - fromTime) / gap));
      onShapesChange(shapes.map((s) => {
        if (s.id !== shapeId) return s;
        const curStart = s.transitionStart ?? DEFAULT_TRANSITION_START;
        const curEnd = s.transitionEnd ?? DEFAULT_TRANSITION_END;
        return edge === 'start'
          ? { ...s, transitionStart: Number(Math.min(frac, curEnd - MORPH_MIN_FRAC).toFixed(3)) }
          : { ...s, transitionEnd: Number(Math.max(frac, curStart + MORPH_MIN_FRAC).toFixed(3)) };
      }));
      },
      onEnd: (ev) => {
      try {
        if (ev instanceof PointerEvent) e.currentTarget.releasePointerCapture?.(ev.pointerId);
      } catch {
        // Ignore release failures when the pointer was never captured.
      }
      },
    });
  };

  const visibleCurrentTime = frameSnapActive ? quantizeTimeToFrame(currentTime) : currentTime;
  const playheadX = xForFrac(visibleCurrentTime / duration);
  const majorTickStep = timelineZoom >= TIMELINE_ZOOM_MAX - 0.001 ? 0.25 : timelineZoom >= 2 ? 0.5 : 1;
  const minorTickStep = frameSnapActive ? 1 / TIMELINE_FRAME_RATE : majorTickStep / 4;
  const tickCount = Math.floor(duration / minorTickStep) + 1;
  const timelineTicks = Array.from({ length: tickCount }, (_, index) => {
    const rawTime = Number((index * minorTickStep).toFixed(3));
    const time = index === tickCount - 1 ? Math.min(rawTime, duration) : rawTime;
    const major = Math.abs(time / majorTickStep - Math.round(time / majorTickStep)) < 0.001;
    return { time, major };
  }).filter((tick) => tick.time <= duration + 0.001);
  const secondGridTicks = Array.from({ length: Math.floor(duration) + 1 }, (_, index) => index)
    .filter((time) => time > 0 && time < duration);

  useEffect(() => {
    if (!isPlaying || !timelineScrollRef.current || !laneRef.current || timelineZoom <= 1) return;
    const scroller = timelineScrollRef.current;
    const usable = Math.max(1, laneRef.current.offsetWidth - EDGE_INSET * 2);
    const playheadLeft = EDGE_INSET + usable * Math.max(0, Math.min(1, visibleCurrentTime / duration));
    const viewportLeft = scroller.scrollLeft;
    const viewportRight = viewportLeft + scroller.clientWidth;
    const margin = Math.min(160, scroller.clientWidth * 0.28);

    if (playheadLeft > viewportRight - margin || playheadLeft < viewportLeft + margin) {
      const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      const target = Math.max(0, Math.min(maxScroll, playheadLeft - scroller.clientWidth * 0.5));
      scroller.scrollLeft = target;
    }
  }, [duration, isPlaying, timelineZoom, visibleCurrentTime]);

  return (
    <ContextMenu onOpenChange={(open) => {
      if (!open) setContextMenu(null);
    }}>
      <ContextMenuTrigger className="contents">
    <div className="flex h-full flex-col overflow-hidden bg-background  font-sans select-none">
      {/* Tracks */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left rail: track names */}
        <div className="flex shrink-0 flex-col overflow-visible border-r border-border bg-muted/35" style={{ width: RAIL_WIDTH }}>
          <div className="flex h-7 shrink-0 items-center gap-2 border-b border-border bg-background py-0 pl-2 pr-1 font-mono text-[10px] tabular-nums">
            <Popover
              open={durationEditor !== null}
              onOpenChange={(open) => {
                if (open) openDurationEditor();
                else commitDurationEditor();
              }}
            >
              <PopoverTrigger
                title="Timeline duration"
                className="min-w-0 flex flex-1 items-center rounded px-1 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40"
              >
                <span className="text-foreground">{currentTime.toFixed(2)}</span>
                <span className="px-1 text-muted-foreground">/</span>
                <span className="text-muted-foreground">{duration.toFixed(1)}s</span>
              </PopoverTrigger>
              <PopoverContent align="start" side="top" sideOffset={8} className="w-52 border-border bg-popover p-3 text-popover-foreground shadow-2xl">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Duration</span>
                  <span className="font-mono text-[10px] text-muted-foreground">0.5-30s</span>
                </div>
                <div className="flex h-9 items-center rounded-lg border border-border bg-muted/55 focus-within:border-ring/50">
                  <input
                    autoFocus
                    value={durationEditor ?? duration.toFixed(1)}
                    onChange={(event) => setDurationEditor(event.currentTarget.value)}
                    onFocus={(event) => event.currentTarget.select()}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        commitDurationEditor();
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        setDurationEditor(null);
                      }
                    }}
                    className="min-w-0 flex-1 bg-transparent px-2 text-right font-mono text-[13px] text-foreground outline-none"
                  />
                  <span className="pr-2 text-[11px] text-muted-foreground">s</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1">
                  {[3, 5, 10].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => applyDuration(value)}
                      className="h-7 rounded-md text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40"
                    >
                      {value}s
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex shrink-0 items-center gap-1">
              <Tooltip>
                <TooltipTrigger
                  aria-label={snapEnabled ? 'Disable timeline snapping' : 'Enable timeline snapping'}
                  aria-pressed={snapEnabled}
                  onClick={() => setSnapEnabled((enabled) => !enabled)}
                  className={`flex size-5 shrink-0 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40 ${
                    snapEnabled
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  }`}
                >
                  <Magnet className="size-3" />
                </TooltipTrigger>
                <TooltipContent side="bottom">Snap to keyframes</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  aria-label={loop ? 'Disable loop playback' : 'Enable loop playback'}
                  aria-pressed={loop}
                  onClick={() => onLoopChange(!loop)}
                  className={`flex size-5 shrink-0 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40 ${
                    loop
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  }`}
                >
                  <RotateCw className="size-3" />
                </TooltipTrigger>
                <TooltipContent side="bottom">Loop playback</TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div
            className="relative min-h-0 flex-1 overflow-hidden"
            onWheel={(event) => {
              const scroller = timelineScrollRef.current;
              if (!scroller) return;
              event.preventDefault();
              scroller.scrollTop += event.deltaY;
              scroller.scrollLeft += event.deltaX;
            }}
          >
          <div ref={leftRailBodyRef} className="will-change-transform">
          {/* Shape lane label + add */}
          <div className={`group flex h-9 items-center gap-2 border-b border-border px-3 transition-colors ${selectedShapeId ? 'bg-muted/70' : 'hover:bg-muted/40'}`}>
            <span className={`flex-1 truncate text-[11px] font-semibold ${selectedShapeId ? 'text-foreground' : 'text-foreground'}`}>Shape</span>
            {isPreviewLoading && (
              <Loader2
                aria-label="Preparing 3D icon"
                className="size-3.5 shrink-0 animate-spin text-muted-foreground"
              />
            )}
            <button
              type="button"
              aria-label="Add shape"
              title="Add shape at playhead"
              onClick={onAddShape}
              className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          {visiblePropertyRows.map((row) => (
            <div
              key={row.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                setSelectedKeyframe(null);
                onActivePropertyRowChange?.(row.id);
              }}
              onContextMenu={(event) => openContextMenu(event, row.name, [
                goToMenuItem(event, currentTime, () => onActivePropertyRowChange?.(row.id)),
                { type: 'separator' },
                { label: 'Select property', onSelect: () => onActivePropertyRowChange?.(row.id) },
                { type: 'separator' },
                {
                  label: 'Clear keyframes',
                  danger: true,
                  disabled: row.keyframes.length === 0,
                  onSelect: () => onClearPropertyRow?.(row.id),
                },
              ])}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedKeyframe(null);
                  onActivePropertyRowChange?.(row.id);
                }
              }}
              className="group flex h-9 items-center gap-2 border-b border-border px-3 transition-colors hover:bg-muted/40"
            >
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
              <span className="flex-1 truncate text-[11px] font-medium text-muted-foreground">{row.name}</span>
              <span className="flex size-5 shrink-0 items-center justify-center" aria-label={`${row.keyframes.length} keyframes`}>
                <span
                  className="size-[7px] rotate-45 rounded-[1px] border border-transparent"
                  style={{ backgroundColor: row.color }}
                />
              </span>
            </div>
          ))}
          {tracks.map((track) => {
            const isActive = activeTrackId === track.id;
            const animated = track.keyframes.length > 0;
            const keyedAtPlayhead = track.keyframes.some((k) => Math.abs(k.time - quantizeTimeToFrame(currentTime)) < 0.05);
            return (
              <div
                key={track.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedKeyframe(null);
                  selectTrack(track.id);
                }}
                onContextMenu={(event) => openContextMenu(event, track.name, [
                  goToMenuItem(event, currentTime, () => selectTrack(track.id)),
                  { type: 'separator' },
                  { label: 'Select property', onSelect: () => selectTrack(track.id) },
                  {
                    label: keyedAtPlayhead ? 'Remove keyframe here' : 'Add keyframe here',
                    shortcut: currentTime.toFixed(2),
                    onSelect: () => toggleKeyframeAtPlayhead(track.id),
                  },
                  ...(animated ? [
                    ...easingMenuItems(track.keyframes[0]?.easing ?? 'ease-in-out', (easing) => setTrackEasing(track.id, easing)),
                    { type: 'separator' as const },
                    {
                      label: 'Clear keyframes',
                      danger: true,
                      onSelect: () => onClearTrackKeyframes?.(track.id),
                    },
                  ] : []),
                ])}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedKeyframe(null);
                    selectTrack(track.id);
                  }
                }}
                className={`group flex h-9 items-center gap-2 border-b border-border px-3 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring/40 ${
                  isActive ? 'bg-muted/70' : 'hover:bg-muted/40'
                }`}
              >
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: track.color }} />
                <span className={`flex-1 truncate text-[11px] font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {track.name}
                </span>
                {animated && (
                  <EasingPicker
                    value={track.keyframes[0]?.easing ?? 'ease-in-out'}
                    onChange={(easing) => setTrackEasing(track.id, easing)}
                    color={track.color}
                  />
                )}
                <button
                  type="button"
                  aria-label={keyedAtPlayhead ? `Remove ${track.name} keyframe` : `Add ${track.name} keyframe`}
                  title={keyedAtPlayhead ? 'Remove keyframe at playhead' : 'Add keyframe at playhead'}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleKeyframeAtPlayhead(track.id);
                  }}
                  className={`flex size-5 shrink-0 items-center justify-center rounded transition-colors ${
                    keyedAtPlayhead
                      ? 'text-foreground opacity-100'
                      : animated
                      ? 'text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Diamond className="size-3" style={{ fill: keyedAtPlayhead ? track.color : 'transparent', color: keyedAtPlayhead ? track.color : undefined }} />
                </button>
              </div>
            );
          })}
          </div>
          </div>
        </div>

        {/* Right: ruler + lanes */}
        <div
          ref={timelineScrollRef}
          className="relative min-w-0 flex-1 overflow-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(event) => {
            if (leftRailBodyRef.current) {
              leftRailBodyRef.current.style.transform = `translateY(${-event.currentTarget.scrollTop}px)`;
            }
          }}
        >
          <div className="flex min-w-full">
          <div className="relative shrink-0" style={{ width: `${timelineZoom * 100}%`, minWidth: '100%' }}>
          {/* Ruler */}
          <div
            ref={laneRef}
            onMouseDown={handleScrubStart}
            onContextMenu={(event) => {
              const t = timeFromClientX(event.clientX, { bypass: event.altKey });
              openContextMenu(event, 'Timeline', [
                goToMenuItem(event, t),
              ]);
            }}
            className="sticky top-0 z-40 h-7 cursor-col-resize bg-background"
          >
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border" aria-hidden="true" />
            <div
              className="pointer-events-none absolute inset-y-0 left-0 bg-muted/70 dark:bg-muted/35"
              style={{ width: EDGE_INSET }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 bg-muted/70 dark:bg-muted/35"
              style={{ width: EDGE_INSET }}
              aria-hidden="true"
            />
            {timelineTicks.map((tick) => {
              const isFinalTick = Math.abs(tick.time - duration) < 0.001;
              return (
                <div key={`ruler-${tick.time}`} className="pointer-events-none absolute top-0 bottom-0" style={{ left: xForFrac(tick.time / duration) }}>
                  {tick.time > 0 && (
                    <div
                      className={`absolute top-0 w-px ${
                        tick.major ? 'bottom-0 bg-border' : 'h-2 bg-muted-foreground/25'
                      }`}
                    />
                  )}
                  {tick.major && !isFinalTick && (
                    <span className="absolute top-[13px] pl-1 font-mono text-[9px] leading-none text-muted-foreground">
                      {formatTimelineTick(tick.time)}
                    </span>
                  )}
                </div>
              );
            })}
            <div className="pointer-events-none absolute top-0 bottom-0 z-10 w-px -translate-x-1/2 bg-red-500 dark:bg-red-400" style={{ left: playheadX }}>
              <div className="absolute top-1 left-1/2 z-20 h-4 w-4 -translate-x-1/2 rounded-[5px] border border-red-600/70 bg-red-500 shadow-[0_2px_6px_rgba(0,0,0,0.28)] dark:border-red-300/70 dark:bg-red-400" />
            </div>
          </div>

          {/* Lanes */}
          <div className="relative">
            {secondGridTicks.map((time) => (
              <div
                key={`second-grid-${time}`}
                className="pointer-events-none absolute inset-y-0 w-px bg-border/70 dark:bg-muted/45"
                style={{ left: xForFrac(time / duration) }}
                aria-hidden="true"
              />
            ))}
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-[1] bg-muted/60 dark:bg-muted/25"
              style={{ width: EDGE_INSET }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 z-[1] bg-muted/60 dark:bg-muted/25"
              style={{ width: EDGE_INSET }}
              aria-hidden="true"
            />
            {/* Shape lane: the morph sequence */}
            <div
              className={`relative h-9 border-b border-border transition-colors ${selectedShapeId ? 'bg-muted/45' : 'hover:bg-muted/35'}`}
              onMouseDown={(e) => {
                setSelectedKeyframe(null);
                onScrubStart?.();
                onTimeChange(timeFromClientX(e.clientX));
              }}
              onContextMenu={(event) => {
                const t = timeFromClientX(event.clientX, { bypass: event.altKey });
                openContextMenu(event, 'Shape', [
                  goToMenuItem(event, t),
                ]);
              }}
            >
              {/* Morph blocks — the transition window between two stops. Drag an
                  edge handle to set how long the morph takes; click to edit style. */}
              {morphWindows.map(({ stop, next, mStart, mEnd }) => {
                const blockFade = stop.wipeDirection.x === 0 && stop.wipeDirection.y === 0;
                const blockMode: 'fade' | 'wipe' | 'none' = stop.transitionType === 'none' ? 'none' : blockFade ? 'fade' : 'wipe';
                const BlockIcon = blockMode === 'none' ? SquareSplitHorizontal : blockMode === 'fade' ? Blend : ArrowRight;
                return (
                  <React.Fragment key={`morph-${stop.id}`}>
                  <Popover
                    open={openClipEditor === stop.id}
                    onOpenChange={(o) => setOpenClipEditor(o ? stop.id : null)}
                  >
                    <PopoverTrigger
                      title={`Transition: ${blockMode} — drag edges to set duration, click to edit`}
                      onMouseDown={(e) => e.stopPropagation()}
                      onContextMenu={(event) => {
                        const isFade = stop.wipeDirection.x === 0 && stop.wipeDirection.y === 0;
                        const t = timeFromClientX(event.clientX, { bypass: event.altKey });
                        openContextMenu(event, `${shapeLabel(stop)} transition`, [
                          goToMenuItem(event, t),
                          { type: 'separator' },
                          { label: 'Edit transition', onSelect: () => setOpenClipEditor(stop.id) },
                          { type: 'separator' },
                          { label: 'Fade', onSelect: () => onShapeBlendChange(stop.id, { transitionType: 'wipe', wipeDirection: { x: 0, y: 0 } }) },
                          { label: 'Wipe', onSelect: () => onShapeBlendChange(stop.id, { transitionType: 'wipe', wipeDirection: isFade ? { x: 1, y: 0 } : stop.wipeDirection }) },
                          { label: 'None', onSelect: () => onShapeBlendChange(stop.id, { transitionType: 'none' }) },
                          ...easingMenuItems(stop.easing, (easing) => onShapeEasingChange(stop.id, easing)),
                        ]);
                      }}
                      className="group/morph absolute top-1/2 flex h-7 -translate-y-1/2 cursor-pointer items-center justify-center overflow-hidden border-y border-border transition-[filter] hover:brightness-125 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring/40"
                      style={{
                        left: xForFrac(mStart / duration),
                        width: widthForSpan(Math.max(0, mEnd - mStart) / duration),
                        minWidth: 20,
                        background: `linear-gradient(90deg, ${stop.color}26, ${next.color}26)`,
                      }}
                    >
                      <BlockIcon className="size-3 text-foreground/65 transition-colors group-hover/morph:text-foreground" strokeWidth={2.25} />
                    </PopoverTrigger>
                    <PopoverContent
                      align="center"
                      side="top"
                      sideOffset={10}
                      className="w-60 border-border bg-popover p-3 text-foreground shadow-2xl"
                      onPointerDown={(event) => event.stopPropagation()}
                      onMouseDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                      onContextMenu={(event) => event.stopPropagation()}
                    >
                      {(() => {
                        const isFade = stop.wipeDirection.x === 0 && stop.wipeDirection.y === 0;
                        const mode: 'fade' | 'wipe' | 'none' =
                          stop.transitionType === 'none' ? 'none' : isFade ? 'fade' : 'wipe';
                        const selectMode = (m: 'fade' | 'wipe' | 'none') => {
                          if (m === 'none') onShapeBlendChange(stop.id, { transitionType: 'none' });
                          else if (m === 'fade') onShapeBlendChange(stop.id, { transitionType: 'wipe', wipeDirection: { x: 0, y: 0 } });
                          else onShapeBlendChange(stop.id, { transitionType: 'wipe', wipeDirection: isFade ? { x: 1, y: 0 } : stop.wipeDirection });
                        };
                        const modes = [
                          { id: 'fade' as const, label: 'Fade', icon: <Blend className="size-3.5" /> },
                          { id: 'wipe' as const, label: 'Wipe', icon: <ArrowRight className="size-3.5" /> },
                          { id: 'none' as const, label: 'None', icon: <SquareSplitHorizontal className="size-3.5" /> },
                        ];
                        return (
                          <>
                            <div className="flex items-center justify-between px-0.5 pb-2.5">
                              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Transition</span>
                              {mode !== 'none' && (
                                <EasingPicker value={stop.easing} onChange={(easing) => onShapeEasingChange(stop.id, easing)} />
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-1.5">
                              {modes.map((opt) => (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => selectMode(opt.id)}
                                  className={`flex flex-col items-center gap-1 rounded-lg border py-2 text-[10px] font-medium transition-colors ${
                                    mode === opt.id
                                      ? 'border-ring/60 bg-accent text-foreground'
                                      : 'border-border bg-muted/45 text-muted-foreground hover:border-border hover:text-foreground'
                                  }`}
                                >
                                  {opt.icon}
                                  {opt.label}
                                </button>
                              ))}
                            </div>

                            {mode === 'wipe' && (
                              <div className="mt-3 flex justify-center">
                                <div className="relative size-[104px] rounded-full">
                                  <span className="pointer-events-none absolute left-1/2 top-1/2 size-[76px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-muted/30" />
                                  {wipeDirections
                                    .filter((dir) => !(dir.x === 0 && dir.y === 0))
                                    .map((dir) => {
                                      const active = stop.wipeDirection.x === dir.x && stop.wipeDirection.y === dir.y;
                                      const len = Math.hypot(dir.x, dir.y) || 1;
                                      const left = `calc(50% + ${(dir.x / len) * 38}px)`;
                                      const top = `calc(50% - ${(dir.y / len) * 38}px)`;
                                      return (
                                        <button
                                          key={dir.label}
                                          type="button"
                                          title={dir.tooltip}
                                          onClick={() => onShapeBlendChange(stop.id, { wipeDirection: { x: dir.x, y: dir.y } })}
                                          className={`absolute z-10 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[11px] transition-colors ${
                                            active
                                              ? 'border-foreground bg-foreground text-background'
                                              : 'border-border bg-muted/50 text-muted-foreground hover:border-ring/50 hover:text-foreground'
                                          }`}
                                          style={{ left, top }}
                                        >
                                          {dir.label}
                                        </button>
                                      );
                                    })}
                                  <span className="pointer-events-none absolute left-1/2 top-1/2 size-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/50" />
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </PopoverContent>
                  </Popover>
                  {/* Resize handles: drag to change when the morph starts / ends */}
                  <div
                    title="Drag to set when the morph starts"
                    onPointerDown={(e) => handleMorphEdgeDrag(e, stop.id, 'start', stop.time, next.time)}
                    className="absolute top-1/2 flex h-7 w-2.5 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center"
                    style={{ left: xForFrac(mStart / duration) }}
                  >
                    <span className="h-5 w-[3px] rounded-full bg-foreground/45 transition-colors hover:bg-foreground" />
                  </div>
                  <div
                    title="Drag to set when the morph ends"
                    onPointerDown={(e) => handleMorphEdgeDrag(e, stop.id, 'end', stop.time, next.time)}
                    className="absolute top-1/2 flex h-7 w-2.5 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center"
                    style={{ left: xForFrac(mEnd / duration) }}
                  >
                    <span className="h-5 w-[3px] rounded-full bg-foreground/45 transition-colors hover:bg-foreground" />
                  </div>
                  </React.Fragment>
                );
              })}
              {/* Shape clips — drag to retime, click to pick/upload/remove.
                  A lone shape has nothing to morph against, so its time is
                  meaningless: pin it full-width and non-draggable instead of
                  letting the user strand it somewhere confusing. */}
              {sortedShapes.map((stop, i) => {
                const selected = stop.id === selectedShapeId;
                const bounds = clipBounds[i];
                const isOnly = bounds.isOnly;
                // Only the outer ends of the sequence are rounded; inner edges stay
                // square so each clip butts flush against the adjacent morph region.
                const roundCls = isOnly
                  ? 'rounded-md'
                  : `${i === 0 ? 'rounded-l-md' : ''} ${i === sortedShapes.length - 1 ? 'rounded-r-md' : ''}`;
                return (
                  <Popover
                    key={stop.id}
                    open={openShapePicker === stop.id}
                    onOpenChange={(o) => {
                      if (o && shapeDraggedRef.current) { shapeDraggedRef.current = false; return; }
                      onOpenShapePicker(o ? stop.id : null);
                    }}
                  >
                    <PopoverTrigger
                      title={isOnly
                        ? `${shapeLabel(stop)} — click to edit · add another shape to animate`
                        : `${shapeLabel(stop)} @ ${stop.time.toFixed(2)}s — drag to retime, click to edit`}
                      onMouseDown={(e) => e.stopPropagation()}
                      onContextMenu={(event) => openContextMenu(event, shapeLabel(stop), [
                        goToMenuItem(event, stop.time, () => onSelectShape(stop.id)),
                        { type: 'separator' },
                        { label: 'Edit shape', onSelect: () => { onSelectShape(stop.id); onOpenShapePicker(stop.id); } },
                        { label: 'Upload SVG', onSelect: () => onUploadShape(stop.id) },
                        { type: 'separator' },
                        { label: 'Add shape at playhead', onSelect: onAddShape },
                        {
                          label: 'Remove shape',
                          danger: true,
                          disabled: shapes.length <= 1,
                          onSelect: () => onRemoveShape(stop.id),
                        },
                      ])}
                      onPointerDown={isOnly ? undefined : (e) => handleShapeDrag(e, stop.id)}
                      className={`group/clip absolute top-1/2 flex h-7 -translate-y-1/2 touch-none items-center gap-1.5 overflow-hidden border pl-1 pr-2 text-left transition-[background-color,border-color] hover:brightness-110 focus-visible:outline-none ${roundCls} ${isOnly ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
                      style={{
                        left: xForFrac(bounds.left / duration),
                        width: widthForSpan(Math.max(0, bounds.right - bounds.left) / duration),
                        minWidth: 32,
                        backgroundColor: selected ? `${stop.color}33` : `${stop.color}1c`,
                        borderColor: selected ? '#ffffff' : `${stop.color}59`,
                        boxShadow: 'none',
                      }}
                    >
                      <span
                        className="grid size-5 shrink-0 place-items-center rounded-[5px] [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:fill-current [&_svg]:stroke-current"
                        style={{ color: stop.color, backgroundColor: `${stop.color}26` }}
                        dangerouslySetInnerHTML={{ __html: stop.svgContent }}
                      />
                      <span className="min-w-0 truncate text-[10px] font-medium text-foreground">{shapeLabel(stop)}</span>
                      {isOnly && (
                        <span className="ml-auto shrink truncate pl-2 text-[10px] text-muted-foreground">add another shape to animate</span>
                      )}
                    </PopoverTrigger>
                    <PopoverContent
                      align="center"
                      side="top"
                      sideOffset={10}
                      className="w-[520px] border-border bg-popover p-3 text-foreground shadow-2xl"
                      onPointerDown={(event) => event.stopPropagation()}
                      onMouseDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                      onContextMenu={(event) => event.stopPropagation()}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-[12px] font-medium text-foreground">Shape</div>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => { onUploadShape(stop.id); onOpenShapePicker(null); }} className="h-7 rounded-md px-2 text-[10px] text-muted-foreground hover:bg-muted/70 hover:text-foreground">Upload SVG</button>
                          {shapes.length > 1 && (
                            <button type="button" aria-label="Remove shape" title="Remove shape" onClick={() => { onRemoveShape(stop.id); onOpenShapePicker(null); }} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-400">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mb-3 flex items-center gap-2">
                        <Popover open={materialSymbolOptionsOpen} onOpenChange={setMaterialSymbolOptionsOpen}>
                          <PopoverTrigger
                            aria-label="Symbol options"
                            title="Symbol options"
                            className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-muted/50 text-muted-foreground transition-colors hover:border-border hover:bg-muted/75 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
                          >
                            <span className={`${materialSymbolClass} text-[21px] leading-none`} style={materialSymbolFontStyle(materialSymbolSettings)}>tune</span>
                          </PopoverTrigger>
                          <PopoverContent
                            align="start"
                            side="left"
                            sideOffset={8}
                            className="w-64 border-border bg-popover p-2.5 text-foreground shadow-2xl"
                            onPointerDown={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={(event) => event.stopPropagation()}
                            onContextMenu={(event) => event.stopPropagation()}
                          >
                            <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Symbol options</div>
                            <div className="mb-2 grid grid-cols-3 rounded-lg bg-muted/50 p-0.5">
                              {(['outlined', 'rounded', 'sharp'] as const).map((style) => (
                                <button
                                  key={style}
                                  type="button"
                                  onClick={() => setMaterialSymbolStyle(style)}
                                  className={`h-7 rounded-md text-[10px] capitalize transition-colors ${
                                    materialSymbolStyle === style
                                      ? 'bg-foreground text-background'
                                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                                  }`}
                                >
                                  {style}
                                </button>
                              ))}
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                title="Toggle filled symbol preview"
                                onClick={() => updateMaterialSymbolSetting('fill', materialSymbolSettings.fill ? 0 : 1)}
                                className={`h-8 rounded-lg px-2 text-[10px] font-medium transition-colors ${
                                  materialSymbolSettings.fill
                                    ? 'bg-foreground text-background'
                                    : 'bg-muted/50 text-muted-foreground hover:bg-accent hover:text-foreground'
                                }`}
                              >
                                Fill
                              </button>
                              {[
                                { key: 'weight' as const, label: 'W', min: 100, max: 700, step: 100 },
                                { key: 'grade' as const, label: 'G', min: -50, max: 200, step: 25 },
                                { key: 'opticalSize' as const, label: 'O', min: 20, max: 48, step: 1 },
                              ].map((control) => (
                                <label key={control.key} className="flex h-8 items-center rounded-lg bg-muted/50 ring-1 ring-white/[0.07]">
                                  <span className="px-2 text-[9px] font-medium text-muted-foreground">{control.label}</span>
                                  <input
                                    type="number"
                                    min={control.min}
                                    max={control.max}
                                    step={control.step}
                                    value={materialSymbolSettings[control.key]}
                                    onChange={(event) => {
                                      const next = Math.max(control.min, Math.min(control.max, Number(event.currentTarget.value) || control.min));
                                      updateMaterialSymbolSetting(control.key, next);
                                    }}
                                    className="min-w-0 flex-1 bg-transparent pr-2 text-right font-mono text-[10px] text-foreground outline-none"
                                  />
                                </label>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <input
                          value={shapeSearchQuery}
                          onChange={(event) => {
                            setShapeSearchQuery(event.currentTarget.value);
                            if (materialSymbolStatus.state === 'error') setMaterialSymbolStatus({ state: 'idle' });
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              importMaterialSymbol(stop.id);
                            }
                          }}
                          placeholder="Search symbols"
                          className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-muted/50 px-3 text-[12px] text-foreground outline-none placeholder:text-muted-foreground focus:border-ring/50"
                        />
                        <button
                          type="button"
                          aria-label="Use typed symbol"
                          title="Use typed symbol"
                          disabled={!normalizedShapeQuery || materialSymbolStatus.state === 'loading'}
                          onClick={() => importMaterialSymbol(stop.id)}
                          className="grid size-9 shrink-0 place-items-center rounded-lg bg-foreground text-background transition-colors hover:bg-foreground/85 disabled:cursor-not-allowed disabled:bg-accent disabled:text-muted-foreground"
                        >
                          {materialSymbolStatus.state === 'loading' ? (
                            <span className="size-3 animate-pulse rounded-full bg-current" />
                          ) : (
                            <ArrowRight className="size-4" />
                          )}
                        </button>
                      </div>

                      <div className="mb-3 grid max-h-[250px] grid-cols-10 gap-1.5 overflow-y-auto pr-1">
                        {filteredMaterialSymbols.map((symbolName) => (
                          <button
                            key={`material-symbol-${stop.id}-${symbolName}`}
                            type="button"
                            title={symbolName.replace(/_/g, ' ')}
                            onClick={() => chooseMaterialSymbol(stop.id, symbolName)}
                            className="grid aspect-square place-items-center rounded-lg border border-transparent text-foreground transition-colors hover:border-border hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                          >
                            <span className={`${materialSymbolClass} text-[24px] leading-none`} style={materialSymbolFontStyle(materialSymbolSettings)}>{symbolName}</span>
                          </button>
                        ))}
                        {filteredMaterialSymbols.length === 0 && normalizedShapeQuery && (
                          <button
                            type="button"
                            onClick={() => importMaterialSymbol(stop.id)}
                            disabled={materialSymbolStatus.state === 'loading'}
                            className="col-span-10 flex h-10 items-center justify-between rounded-lg border border-dashed border-border bg-muted/40 px-3 text-left text-[11px] text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <span className="truncate">{normalizedShapeQuery.replace(/_/g, ' ')}</span>
                            <span className="text-[10px] text-muted-foreground">Use typed name</span>
                          </button>
                        )}
                      </div>

                      {materialSymbolStatus.state === 'error' && (
                        <p className="mb-2 px-0.5 text-[10px] text-red-300">{materialSymbolStatus.message}</p>
                      )}

                      {filteredWipePairs.length > 0 && (
                        <div className="mb-3 border-t border-border pt-2">
                          <div className="mb-2 flex items-center justify-between px-0.5">
                            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Wipe pairs</span>
                            <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-muted-foreground" title="Morph uses the real Material Symbol off glyph. Slash adds a clean overlay to the base glyph.">
                              <span>{wipePairMode === 'morph' ? 'Morph' : 'Slash'}</span>
                              <Switch
                                size="sm"
                                checked={wipePairMode === 'morph'}
                                onCheckedChange={(checked) => setWipePairMode(checked ? 'morph' : 'slash')}
                                onClick={(event) => event.stopPropagation()}
                              />
                            </label>
                          </div>
                          <div className="grid max-h-[132px] grid-cols-3 gap-1.5 overflow-y-auto pr-1">
                            {filteredWipePairs.map((pair) => (
                              <button
                                key={`wipe-pair-${stop.id}-${pair.enabled}-${pair.disabled}`}
                                type="button"
                                title={`${pair.label}: ${pair.enabled} → ${wipePairMode === 'morph' ? pair.disabled : `${pair.disabled} (slash overlay)`}`}
                                onClick={() => chooseWipePair(stop.id, pair)}
                                className="wipe-pair-option group/pair flex h-11 min-w-0 items-center gap-2 rounded-lg border border-border bg-muted/35 px-2 text-left transition-colors hover:border-ring/45 hover:bg-muted/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                              >
                                <WipePairPreview
                                  pair={pair}
                                  className={materialSymbolClass}
                                  style={materialSymbolFontStyle(materialSymbolSettings)}
                                  mode={wipePairMode === 'morph' ? 'real' : 'slash'}
                                />
                                <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground">{pair.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {visibleShapeOptions.length > 0 && (
                        <details className="border-t border-border pt-2">
                          <summary className="flex cursor-pointer list-none items-center justify-between px-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground marker:hidden">
                            <span>Presets</span>
                            <span className="normal-case tracking-normal text-muted-foreground">fallback</span>
                          </summary>
                          <div className="mt-2 grid max-h-20 grid-cols-10 gap-1 overflow-y-auto pr-1">
                            {visibleShapeOptions.map((opt) => {
                              const active = stop.iconId === opt.id;
                              return (
                                <button
                                  key={`pick-${stop.id}-${opt.id}`}
                                  type="button"
                                  title={opt.name}
                                  onClick={() => { onShapeIconChange(stop.id, opt); onOpenShapePicker(null); }}
                                  className={`grid aspect-square place-items-center rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${active ? 'bg-accent' : 'border-border bg-muted/40 text-muted-foreground hover:border-border hover:bg-muted/60'}`}
                                  style={active ? { borderColor: opt.defaultTint } : undefined}
                                >
                                  <div className="size-4 [&_svg]:h-full [&_svg]:w-full [&_svg]:fill-current [&_svg]:stroke-current" style={{ color: opt.defaultTint }} dangerouslySetInnerHTML={{ __html: opt.svgContent }} />
                                </button>
                              );
                            })}
                          </div>
                        </details>
                      )}
                    </PopoverContent>
                  </Popover>
                );
              })}
            </div>

            {visiblePropertyRows.map((row) => (
              <div
                key={row.id}
                className="relative h-9 border-b border-border transition-colors hover:bg-muted/35"
                onMouseDown={(e) => {
                  setSelectedKeyframe(null);
                  onScrubStart?.();
                  onTimeChange(timeFromClientX(e.clientX));
                }}
              >
                {row.keyframes.length > 1 && (
                  <div
                    className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full opacity-45"
                    style={{
                      left: xForFrac(Math.min(...row.keyframes.map((keyframe) => keyframe.time)) / duration),
                      width: widthForSpan((Math.max(...row.keyframes.map((keyframe) => keyframe.time)) - Math.min(...row.keyframes.map((keyframe) => keyframe.time))) / duration),
                      backgroundColor: row.color,
                    }}
                  />
                )}
                {row.keyframes.map((keyframe) => (
                  (() => {
                    const selected = selectedKeyframe?.type === 'property' && selectedKeyframe.rowId === row.id && selectedKeyframe.kfId === keyframe.id;
                    return (
                      <button
                        type="button"
                        key={keyframe.id}
                        title={`${row.name}${keyframe.label ? ` · ${keyframe.label}` : ''} @ ${keyframe.time.toFixed(2)}s`}
                        className="absolute top-1/2 flex size-4 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40"
                        style={{
                          left: xForFrac(keyframe.time / duration),
                          zIndex: 14,
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setSelectedKeyframe({ type: 'property', rowId: row.id, kfId: keyframe.id });
                          onActivePropertyRowChange?.(row.id);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedKeyframe({ type: 'property', rowId: row.id, kfId: keyframe.id });
                          onActivePropertyRowChange?.(row.id);
                        }}
                        onContextMenu={(event) => openContextMenu(event, row.name, [
                          goToMenuItem(event, keyframe.time, () => onActivePropertyRowChange?.(row.id)),
                          { label: 'Select property', onSelect: () => onActivePropertyRowChange?.(row.id) },
                          { type: 'separator' },
                          {
                            label: 'Remove keyframe',
                            danger: true,
                            onSelect: () => onRemovePropertyKeyframe?.(row.id, keyframe.id),
                          },
                        ])}
                      >
                        <TimelineDiamond color={row.color} borderColor="rgba(0,0,0,0.8)" selected={selected} />
                      </button>
                    );
                  })()
                ))}
              </div>
            ))}

            {tracks.map((track) => {
              const isActive = activeTrackId === track.id;
              const animated = track.keyframes.length > 0;
              const sorted = [...track.keyframes].sort((a, b) => a.time - b.time);
              const first = sorted[0];
              const last = sorted[sorted.length - 1];
              return (
                <div
                  key={track.id}
                  className={`relative h-9 border-b border-border transition-colors ${
                    isActive ? 'bg-muted/45' : 'hover:bg-muted/35'
                  }`}
                  onMouseDown={(e) => {
                    setSelectedKeyframe(null);
                    onScrubStart?.();
                    selectTrack(track.id);
                    onTimeChange(timeFromClientX(e.clientX));
                  }}
                  onContextMenu={(event) => {
                    const t = timeFromClientX(event.clientX, { bypass: event.altKey });
                    openContextMenu(event, track.name, [
                      { label: 'Add keyframe', shortcut: `${t.toFixed(2)}s`, onSelect: () => addTrackKeyframeAtTime(track.id, t) },
                      goToMenuItem(event, t, () => selectTrack(track.id)),
                      ...(animated ? [
                        ...easingMenuItems(track.keyframes[0]?.easing ?? 'ease-in-out', (easing) => setTrackEasing(track.id, easing)),
                        { type: 'separator' as const },
                        {
                          label: 'Clear keyframes',
                          danger: true,
                          onSelect: () => onClearTrackKeyframes?.(track.id),
                        },
                      ] : []),
                    ]);
                  }}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    // Add a keyframe exactly where the user double-clicked.
                    const t = timeFromClientX(e.clientX);
                    const exists = track.keyframes.some((k) => Math.abs(k.time - t) < 0.05);
                    if (exists) return;
                    const value = interpolateKeyframes(t, track);
                    const prev = [...track.keyframes].sort((a, b) => a.time - b.time).filter((k) => k.time <= t).pop();
                    const kf: Keyframe = {
                      id: Math.random().toString(36).slice(2, 10),
                      time: Number(t.toFixed(3)),
                      value,
                      easing: prev?.easing ?? 'ease-in-out',
                    };
                    selectTrack(track.id);
                    setSelectedKeyframe({ type: 'track', trackId: track.id, kfId: kf.id });
                    onTracksChange(
                      tracks.map((tr) => (tr.id === track.id ? { ...tr, keyframes: [...tr.keyframes, kf].sort((a, b) => a.time - b.time) } : tr))
                    );
                  }}
                >
                  {/* Draggable "clip" spanning first→last keyframe: drag body to move the whole window */}
                  {animated && first && last && last.time > first.time && (
                    <div
                      title="Drag to move · drag the diamonds to resize"
                      className="absolute top-1/2 h-2 -translate-y-1/2 cursor-grab rounded-full opacity-55 transition-opacity hover:opacity-80 active:cursor-grabbing"
                      style={{
                        left: xForFrac(first.time / duration),
                        width: widthForSpan((last.time - first.time) / duration),
                        backgroundColor: track.color,
                      }}
                      onMouseDown={(e) => handleBlockDrag(e, track.id)}
                    />
                  )}

                  {/* Constant (un-animated) hint */}
                  {!animated && (
                    <div className="pointer-events-none absolute inset-y-0 left-2 flex items-center">
                      <span className="rounded bg-background/95 px-1 text-[10px] text-muted-foreground">
                        {formatValueLabel(track, track.defaultValue)} · constant
                      </span>
                    </div>
                  )}

                  {/* Keyframe diamonds */}
                  {track.keyframes.map((kf) => {
                    const selected = selectedKeyframe?.type === 'track' && selectedKeyframe.trackId === track.id && selectedKeyframe.kfId === kf.id;
                    const editingTime = timeEditor?.trackId === track.id && timeEditor.kfId === kf.id;
                    const startMouseDown = (e: React.MouseEvent) => {
                      e.stopPropagation();
                      selectTrack(track.id);
                      setSelectedKeyframe({ type: 'track', trackId: track.id, kfId: kf.id });
                      if (e.button !== 0) return;
                      handleKeyframeDrag(e, track.id, kf.id);
                    };

                    return (
                      <Popover
                        key={kf.id}
                        open={editingTime}
                        onOpenChange={(open) => {
                          if (open) return;
                          if (timeEditor?.trackId === track.id && timeEditor.kfId === kf.id) commitTimeEditor();
                        }}
                      >
                      <PopoverTrigger
                        type="button"
                        title={`${track.name} · ${formatValueLabel(track, kf.value)} @ ${kf.time.toFixed(2)}s`}
                        className={`absolute top-1/2 flex size-4 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center transition-transform hover:scale-110 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40 ${selected ? 'scale-110' : ''}`}
                        style={{
                          left: xForFrac(kf.time / duration),
                          zIndex: selected ? 30 : 15,
                        }}
                        onMouseDown={startMouseDown}
                        onContextMenu={(e) => {
                          selectTrack(track.id);
                          setSelectedKeyframe({ type: 'track', trackId: track.id, kfId: kf.id });
                          openContextMenu(e, track.name, [
                            { label: 'Edit time', shortcut: `${kf.time.toFixed(2)}s`, onSelect: () => setTimeEditor({ trackId: track.id, kfId: kf.id, draft: kf.time.toFixed(2) }) },
                            goToMenuItem(e, kf.time, () => {
                              selectTrack(track.id);
                              setSelectedKeyframe({ type: 'track', trackId: track.id, kfId: kf.id });
                            }),
                            ...easingMenuItems(kf.easing, (easing) => setSingleKeyframeEasing(track.id, kf.id, easing)),
                            { type: 'separator' },
                            { label: 'Remove keyframe', danger: true, onSelect: () => removeTrackKeyframe(track.id, kf.id) },
                          ]);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (keyframeDraggedRef.current) {
                            keyframeDraggedRef.current = false;
                            return;
                          }
                          selectTrack(track.id);
                          setSelectedKeyframe({ type: 'track', trackId: track.id, kfId: kf.id });
                          onTimeChange(kf.time);
                        }}
                      >
                          <TimelineDiamond
                            color={track.color}
                            borderColor="rgba(0,0,0,0.85)"
                            selected={selected}
                          />
                      </PopoverTrigger>
                        {editingTime && (
                          <PopoverContent
                            side="top"
                            align="center"
                            sideOffset={8}
                            className="w-32 border-border bg-popover p-2 text-popover-foreground"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            onContextMenu={(e) => e.stopPropagation()}
                          >
                            <label className="mb-1 block text-left text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Time</label>
                            <div className="flex h-8 items-center rounded-md bg-muted/70 ring-1 ring-border">
                              <input
                                autoFocus
                                value={timeEditor.draft}
                                onChange={(event) => setTimeEditor((current) => current ? { ...current, draft: event.target.value } : current)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    commitTimeEditor();
                                  }
                                  if (event.key === 'Escape') {
                                    event.preventDefault();
                                    setTimeEditor(null);
                                  }
                                }}
                                className="min-w-0 flex-1 bg-transparent px-2 text-right font-mono text-[12px] text-foreground outline-none"
                              />
                              <span className="pr-2 text-[10px] text-muted-foreground">s</span>
                            </div>
                          </PopoverContent>
                        )}
                      </Popover>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div className="pointer-events-none absolute top-7 bottom-0 z-[35] w-px -translate-x-1/2 bg-red-500 dark:bg-red-400" style={{ left: playheadX }} />
          <div className="w-24 shrink-0 border-l border-border bg-muted/60 dark:bg-muted/25" aria-hidden="true" />
          </div>
          <div className="pointer-events-auto fixed bottom-2 right-2 z-[70] flex h-auto w-max items-center gap-px rounded-full border border-border bg-background/85 p-0.5 shadow-md backdrop-blur-xl">
            <button
              type="button"
              aria-label="Zoom timeline out"
              title="Zoom out (-)"
              disabled={timelineZoom <= TIMELINE_ZOOM_MIN}
              onClick={() => adjustTimelineZoom(-TIMELINE_ZOOM_STEP)}
              className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40"
            >
              <Minus className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Fit timeline"
              title="Fit timeline (0)"
              onClick={fitTimeline}
              className="flex h-6 min-w-10 shrink-0 items-center justify-center rounded-full px-2 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40"
            >
              {Math.round(timelineZoom * 100)}%
            </button>
            <button
              type="button"
              aria-label="Zoom timeline in"
              title="Zoom in (+)"
              disabled={timelineZoom >= TIMELINE_ZOOM_MAX}
              onClick={() => adjustTimelineZoom(TIMELINE_ZOOM_STEP)}
              className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
      </div>
      {goToEditor && (
        <Popover
          open
          onOpenChange={(open) => {
            if (!open) commitGoToEditor();
          }}
        >
        <PopoverTrigger
          aria-hidden="true"
          tabIndex={-1}
          className="fixed size-px opacity-0"
          style={{ left: goToEditor.x, top: goToEditor.y }}
        />
        <PopoverContent
          side="bottom"
          align="start"
          sideOffset={6}
          className="w-32 border-border bg-popover p-2 text-popover-foreground"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Go to</label>
          <div className="flex h-8 items-center rounded-md bg-muted/70 ring-1 ring-border">
            <input
              autoFocus
              value={goToEditor.draft}
              onChange={(event) => setGoToEditor((current) => current ? { ...current, draft: event.currentTarget.value } : current)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitGoToEditor();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  cancelGoToEditor();
                }
              }}
              onBlur={commitGoToEditor}
              className="min-w-0 flex-1 bg-transparent px-2 text-right font-mono text-[12px] text-foreground outline-none"
            />
            <span className="pr-2 text-[10px] text-muted-foreground">s</span>
          </div>
        </PopoverContent>
        </Popover>
      )}
    </div>
      </ContextMenuTrigger>
      <TimelineContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} />
    </ContextMenu>
  );
};
