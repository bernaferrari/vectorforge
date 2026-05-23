'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Diamond, Plus, Magnet, RotateCw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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

export type FillGradientType = 'linear' | 'radial' | 'conic';

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

// A shape on the morph timeline. The animation blends between consecutive stops.
// transitionType/wipeDirection/easing describe the transition LEAVING this stop.
export interface ShapeStop {
  id: string;
  time: number;
  iconId: string;
  svgContent: string;
  color: string;
  colorSecondary: string;
  fillGradientType?: FillGradientType;
  fillKeyframes?: FillKeyframe[];
  easing: EasingType;
  transitionType: 'none' | 'wipe';
  wipeDirection: { x: number; y: number };
}

export interface ShapeOption {
  id: string;
  name: string;
  svgContent: string;
  defaultTint: string;
}

export interface WipeDirectionOption {
  label: string;
  x: number;
  y: number;
  tooltip: string;
}

interface TimelineProps {
  duration: number; // in seconds
  currentTime: number;
  onTimeChange: (time: number) => void;
  onScrubStart?: () => void;
  loop: boolean;
  onLoopChange: (loop: boolean) => void;
  tracks: TimelineTrack[];
  onTracksChange: (tracks: TimelineTrack[]) => void;
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
      className="flex size-5 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
      onClick={(e) => e.stopPropagation()}
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d={easingCurvePath(value)} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </PopoverTrigger>
    <PopoverContent align="end" side="top" sideOffset={6} className="w-40 border-white/[0.09] bg-[#15171a] p-1 text-zinc-100">
      {EASING_OPTIONS.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors ${active ? 'bg-white/[0.1] text-white' : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100'}`}
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

const EASING_OPTIONS: Array<{ value: EasingType; label: string }> = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease-in-out', label: 'Smooth' },
  { value: 'spring', label: 'Spring' },
  { value: 'bounce', label: 'Bounce' },
];

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

export const interpolateFillKeyframes = (
  time: number,
  fallback: { color: string; colorSecondary: string; gradientType?: FillGradientType },
  keyframes: FillKeyframe[] = []
) => {
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  const fallbackStops: FillStop[] = [
    { id: 'start', color: fallback.color, position: 0 },
    { id: 'end', color: fallback.colorSecondary, position: 1 },
  ];

  const stopsAt = (index: number) => sorted[index]?.stops?.length ? sorted[index].stops : fallbackStops;
  const maxStops = Math.max(fallbackStops.length, ...sorted.map((keyframe) => keyframe.stops?.length ?? 0));
  const stops = Array.from({ length: maxStops }).map((_, index) => {
    const fallbackStop = fallbackStops[index] ?? fallbackStops[fallbackStops.length - 1];
    return {
      id: fallbackStop.id,
      position: fallbackStop.position,
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
// Horizontal breathing room so keyframes at t=0 and t=duration aren't clipped at the edges.
const EDGE_INSET = 12;
// Map a 0..1 fraction of the timeline to a CSS position inside the inset lane area.
const xForFrac = (frac: number, offsetPx = 0) =>
  `calc(${EDGE_INSET}px + (100% - ${EDGE_INSET * 2}px) * ${frac}${offsetPx ? ` + ${offsetPx}px` : ''})`;
const widthForSpan = (span: number) => `calc((100% - ${EDGE_INSET * 2}px) * ${span})`;

export const Timeline: React.FC<TimelineProps> = ({
  duration,
  currentTime,
  onTimeChange,
  onScrubStart,
  loop,
  onLoopChange,
  tracks,
  onTracksChange,
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
  onUploadShape,
  onShapeBlendChange,
  openShapePicker,
  onOpenShapePicker,
  wipeDirections,
}) => {
  const [selectedKeyframe, setSelectedKeyframe] = useState<{ trackId: string; kfId: string } | null>(null);
  const [openClipEditor, setOpenClipEditor] = useState<string | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const shapeDraggedRef = useRef(false);
  const laneRef = useRef<HTMLDivElement>(null);


  // Clear a stale keyframe selection if the keyframe disappears.
  useEffect(() => {
    if (!selectedKeyframe) return;
    const track = tracks.find((t) => t.id === selectedKeyframe.trackId);
    if (!track || !track.keyframes.some((k) => k.id === selectedKeyframe.kfId)) {
      setSelectedKeyframe(null);
    }
  }, [tracks, selectedKeyframe]);

  const selectTrack = (trackId: string) => {
    onActiveTrackChange?.(trackId);
  };

  const sortedShapes = [...shapes].sort((a, b) => a.time - b.time);
  const selectedShape = shapes.find((s) => s.id === selectedShapeId) ?? null;

  const breakpointTimes = ({
    excludeShapeId,
    excludeKeyframe,
    excludeTrackId,
  }: {
    excludeShapeId?: string;
    excludeKeyframe?: { trackId: string; kfId: string };
    excludeTrackId?: string;
  } = {}) => {
    const shapeTimes = shapes
      .filter((shape) => shape.id !== excludeShapeId)
      .map((shape) => shape.time);
    const numericKeyframeTimes = tracks.flatMap((track) => {
      if (track.id === excludeTrackId) return [];
      return track.keyframes
        .filter((keyframe) => !(excludeKeyframe?.trackId === track.id && excludeKeyframe.kfId === keyframe.id))
        .map((keyframe) => keyframe.time);
    });
    const colorKeyframeTimes = shapes
      .filter((shape) => shape.id !== excludeShapeId)
      .flatMap((shape) => (shape.fillKeyframes ?? []).map((keyframe) => keyframe.time));

    return Array.from(new Set([...shapeTimes, ...numericKeyframeTimes, ...colorKeyframeTimes, 0, duration]))
      .filter((time) => Number.isFinite(time))
      .sort((a, b) => a - b);
  };

  const snapTime = (
    rawTime: number,
    options: {
      bypass?: boolean;
      excludeShapeId?: string;
      excludeKeyframe?: { trackId: string; kfId: string };
      excludeTrackId?: string;
    } = {}
  ) => {
    const clamped = Math.max(0, Math.min(duration, rawTime));
    if (!snapEnabled || options.bypass) return clamped;

    const nearest = breakpointTimes(options).reduce<{ time: number; distance: number } | null>((closest, time) => {
      const distance = Math.abs(time - clamped);
      if (distance > SNAP_THRESHOLD_SECONDS) return closest;
      if (!closest || distance < closest.distance) return { time, distance };
      return closest;
    }, null);

    return nearest ? nearest.time : clamped;
  };

  const rawTimeFromClientX = (clientX: number) => {
    if (!laneRef.current) return currentTime;
    const rect = laneRef.current.getBoundingClientRect();
    const usable = Math.max(1, rect.width - EDGE_INSET * 2);
    const x = Math.max(0, Math.min(clientX - rect.left - EDGE_INSET, usable));
    return Number(((x / usable) * duration).toFixed(3));
  };

  const timeFromClientX = (
    clientX: number,
    options: Parameters<typeof snapTime>[1] = {}
  ) => Number(snapTime(rawTimeFromClientX(clientX), options).toFixed(3));

  const handleScrubStart = (e: React.MouseEvent) => {
    onScrubStart?.();
    onTimeChange(timeFromClientX(e.clientX, { bypass: e.altKey }));
    const move = (ev: MouseEvent) => onTimeChange(timeFromClientX(ev.clientX, { bypass: ev.altKey }));
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const toggleKeyframeAtPlayhead = (trackId: string) => {
    const t = Number(currentTime.toFixed(2));
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

  const handleKeyframeDrag = (e: React.MouseEvent, trackId: string, kfId: string) => {
    e.stopPropagation();
    if (!laneRef.current) return;
    onScrubStart?.();
    const rect = laneRef.current.getBoundingClientRect();
    const usable = Math.max(1, rect.width - EDGE_INSET * 2);
    const move = (ev: MouseEvent) => {
      const x = Math.max(0, Math.min(ev.clientX - rect.left - EDGE_INSET, usable));
      const rawTime = (x / usable) * duration;
      const newTime = Number(snapTime(rawTime, {
        bypass: ev.altKey,
        excludeKeyframe: { trackId, kfId },
      }).toFixed(2));
      onTracksChange(
        tracks.map((track) =>
          track.id === trackId
            ? { ...track, keyframes: track.keyframes.map((k) => (k.id === kfId ? { ...k, time: newTime } : k)).sort((a, b) => a.time - b.time) }
            : track
        )
      );
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
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

    const move = (ev: MouseEvent) => {
      let delta = ((ev.clientX - startX) / usable) * duration;
      if (minT + delta < 0) delta = -minT;
      if (maxT + delta > duration) delta = duration - maxT;
      if (snapEnabled && !ev.altKey) {
        const movedTimes = initial.map((keyframe) => keyframe.time + delta);
        const targets = breakpointTimes({ excludeTrackId: trackId });
        const snapCandidate = movedTimes.reduce<{ delta: number; distance: number } | null>((closest, movedTime) => {
          const target = targets.reduce<{ time: number; distance: number } | null>((nearest, targetTime) => {
            const distance = Math.abs(targetTime - movedTime);
            if (distance > SNAP_THRESHOLD_SECONDS) return nearest;
            if (!nearest || distance < nearest.distance) return { time: targetTime, distance };
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
                  return init ? { ...k, time: Number((init.time + delta).toFixed(2)) } : k;
                }),
              }
        )
      );
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  // Set the easing for an entire effect (all of a track's keyframes share one curve).
  const setTrackEasing = (trackId: string, easing: EasingType) => {
    onTracksChange(
      tracks.map((t) =>
        t.id === trackId ? { ...t, keyframes: t.keyframes.map((k) => ({ ...k, easing })) } : t
      )
    );
  };

  // Drag a shape stop along the time axis. Sets shapeDraggedRef so a real drag
  // doesn't also fire the click that would open the picker popover.
  const handleShapeDrag = (e: React.PointerEvent<HTMLElement>, shapeId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!laneRef.current) return;
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // Synthetic pointer events used by tests may not be eligible for capture.
    }
    onSelectShape(shapeId);
    setSelectedKeyframe(null);
    shapeDraggedRef.current = false;
    const rect = laneRef.current.getBoundingClientRect();
    const usable = Math.max(1, rect.width - EDGE_INSET * 2);
    const startX = e.clientX;
    const move = (ev: PointerEvent) => {
      if (Math.abs(ev.clientX - startX) > 3) {
        if (!shapeDraggedRef.current) onScrubStart?.();
        shapeDraggedRef.current = true;
      }
      const x = Math.max(0, Math.min(ev.clientX - rect.left - EDGE_INSET, usable));
      const rawTime = (x / usable) * duration;
      const newTime = Number(snapTime(rawTime, { bypass: ev.altKey, excludeShapeId: shapeId }).toFixed(2));
      onShapesChange(shapes.map((s) => (s.id === shapeId ? { ...s, time: newTime } : s)));
    };
    const up = (ev: PointerEvent) => {
      try {
        e.currentTarget.releasePointerCapture?.(ev.pointerId);
      } catch {
        // Ignore release failures when the pointer was never captured.
      }
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const playheadX = xForFrac(currentTime / duration);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0f1012] font-sans select-none">
      {/* Tracks */}
      <div className="flex min-h-0 flex-1">
        {/* Left rail: track names */}
        <div className="shrink-0 border-r border-white/[0.06] bg-[#101113]" style={{ width: RAIL_WIDTH }}>
          <div className="flex h-7 items-center gap-2 border-b border-white/[0.05] bg-black/15 px-2 font-mono text-[10px] tabular-nums">
            <div className="min-w-0 flex-1">
              <span className="text-zinc-300">{currentTime.toFixed(2)}</span>
              <span className="px-1 text-zinc-700">/</span>
              <span className="text-zinc-600">{duration.toFixed(1)}s</span>
            </div>
            <button
              type="button"
              aria-label={snapEnabled ? 'Disable timeline snapping' : 'Enable timeline snapping'}
              aria-pressed={snapEnabled}
              title={snapEnabled ? 'Snapping on · hold Option/Alt to bypass' : 'Snapping off'}
              onClick={() => setSnapEnabled((enabled) => !enabled)}
              className={`flex size-5 shrink-0 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 ${
                snapEnabled
                  ? 'bg-white/[0.1] text-zinc-100'
                  : 'text-zinc-600 hover:bg-white/[0.06] hover:text-zinc-300'
              }`}
            >
              <Magnet className="size-3" />
            </button>
            <button
              type="button"
              aria-label={loop ? 'Disable loop playback' : 'Enable loop playback'}
              aria-pressed={loop}
              title={loop ? 'Looping on' : 'Looping off'}
              onClick={() => onLoopChange(!loop)}
              className={`flex size-5 shrink-0 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 ${
                loop
                  ? 'bg-white/[0.1] text-zinc-100'
                  : 'text-zinc-600 hover:bg-white/[0.06] hover:text-zinc-300'
              }`}
            >
              <RotateCw className="size-3" />
            </button>
          </div>
          {/* Shape lane label + add */}
          <div className={`group flex h-9 items-center gap-2 border-b border-white/[0.04] px-3 transition-colors ${selectedShapeId ? 'bg-white/[0.06]' : 'hover:bg-white/[0.025]'}`}>
            <span className={`flex-1 truncate text-[11px] font-semibold ${selectedShapeId ? 'text-zinc-100' : 'text-zinc-300'}`}>Shape</span>
            <button
              type="button"
              aria-label="Add shape"
              title="Add shape at playhead"
              onClick={onAddShape}
              className="flex size-5 shrink-0 items-center justify-center rounded text-zinc-500 hover:text-white"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          {tracks.map((track) => {
            const isActive = activeTrackId === track.id;
            const animated = track.keyframes.length > 0;
            const keyedAtPlayhead = track.keyframes.some((k) => Math.abs(k.time - Number(currentTime.toFixed(2))) < 0.05);
            return (
              <div
                key={track.id}
                role="button"
                tabIndex={0}
                onClick={() => selectTrack(track.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectTrack(track.id);
                  }
                }}
                className={`group flex h-9 items-center gap-2 border-b border-white/[0.04] px-3 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/30 ${
                  isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.025]'
                }`}
              >
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: track.color }} />
                <span className={`flex-1 truncate text-[11px] font-medium ${isActive ? 'text-zinc-100' : 'text-zinc-400'}`}>
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
                      ? 'text-white opacity-100'
                      : animated
                      ? 'text-zinc-500 opacity-0 hover:text-white group-hover:opacity-100'
                      : 'text-zinc-600 hover:text-white'
                  }`}
                >
                  <Diamond className="size-3" style={{ fill: keyedAtPlayhead ? track.color : 'transparent', color: keyedAtPlayhead ? track.color : undefined }} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Right: ruler + lanes */}
        <div className="relative min-w-0 flex-1">
          {/* Ruler */}
          <div
            ref={laneRef}
            onMouseDown={handleScrubStart}
            className="relative h-7 cursor-col-resize border-b border-white/[0.05] bg-black/15"
          >
            {Array.from({ length: Math.floor(duration) + 1 }).map((_, i) => (
              <div key={i} className="pointer-events-none absolute top-0 bottom-0" style={{ left: xForFrac(i / duration) }}>
                {i > 0 && <div className="absolute top-0 bottom-0 w-px bg-white/[0.04]" />}
                <span className="absolute top-1 pl-1 font-mono text-[9px] text-zinc-600">{i}s</span>
              </div>
            ))}
            <div className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-white" style={{ left: playheadX }}>
              <div className="absolute -top-px -left-[5px] size-2.5 rounded-full bg-white shadow" />
            </div>
          </div>

          {/* Lanes */}
          <div className="relative">
            {/* Shape lane: the morph sequence */}
            <div
              className={`relative h-9 border-b border-white/[0.04] transition-colors ${selectedShapeId ? 'bg-white/[0.03]' : 'hover:bg-white/[0.015]'}`}
              onMouseDown={(e) => { onScrubStart?.(); onTimeChange(timeFromClientX(e.clientX)); }}
            >
              {/* Transition clips — click to customize that transition */}
              {sortedShapes.slice(0, -1).map((stop, i) => {
                const next = sortedShapes[i + 1];
                return (
                  <Popover key={`clip-${stop.id}`} open={openClipEditor === stop.id} onOpenChange={(o) => setOpenClipEditor(o ? stop.id : null)}>
                    <PopoverTrigger
                      title="Transition — click to edit blend & easing"
                      onMouseDown={(e) => e.stopPropagation()}
                      className="group/clip absolute top-1/2 flex h-7 -translate-y-1/2 items-center justify-center focus-visible:outline-none"
                      style={{
                        left: xForFrac(stop.time / duration),
                        width: widthForSpan((next.time - stop.time) / duration),
                      }}
                    >
                      {/* Track line */}
                      <span
                        className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full opacity-45 transition-opacity group-hover/clip:opacity-70"
                        style={{ background: `linear-gradient(90deg, ${stop.color}, ${next.color})` }}
                      />
                      {/* Distinct, always-visible transition badge with the easing curve */}
                      <span className="relative z-10 flex size-5 items-center justify-center rounded-full border border-white/25 bg-[#0c0d0f] shadow-[0_1px_4px_rgba(0,0,0,0.6)] transition-transform group-hover/clip:scale-110 group-focus-visible/clip:ring-2 group-focus-visible/clip:ring-white/40">
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                          <path d={easingCurvePath(stop.easing)} stroke={stop.color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </PopoverTrigger>
                    <PopoverContent align="center" side="top" sideOffset={10} className="w-56 border-white/[0.09] bg-[#15171a] p-2.5 text-zinc-100 shadow-2xl">
                      <div className="flex items-center justify-between px-0.5 pb-2">
                        <span className="text-[11px] font-medium text-zinc-300">Transition</span>
                        <EasingPicker value={stop.easing} onChange={(easing) => onShapeEasingChange(stop.id, easing)} />
                      </div>
                      <div className="flex rounded-md border border-white/[0.07] bg-black/25 p-0.5">
                        {([['none', 'Dissolve'], ['wipe', 'Wipe']] as const).map(([id, label]) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => onShapeBlendChange(stop.id, { transitionType: id })}
                            className={`h-7 flex-1 rounded text-[11px] font-medium transition-colors ${stop.transitionType === id ? 'bg-white text-zinc-950' : 'text-zinc-500 hover:text-zinc-200'}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {stop.transitionType === 'wipe' && (
                        <div className="mt-2 grid grid-cols-3 gap-1">
                          {wipeDirections.map((dir) => {
                            const active = stop.wipeDirection.x === dir.x && stop.wipeDirection.y === dir.y;
                            return (
                              <button
                                key={dir.label}
                                type="button"
                                title={dir.tooltip}
                                onClick={() => onShapeBlendChange(stop.id, { wipeDirection: { x: dir.x, y: dir.y } })}
                                className={`flex size-8 items-center justify-center rounded-md border text-sm transition-colors ${active ? 'border-white bg-white text-zinc-950' : 'border-white/[0.08] bg-white/[0.035] text-zinc-400 hover:text-white'}`}
                              >
                                {dir.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                );
              })}
              {/* Shape handles — drag to retime, click to pick/upload/remove */}
              {sortedShapes.map((stop) => {
                const selected = stop.id === selectedShapeId;
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
                      title={`Shape @ ${stop.time.toFixed(2)}s — drag to retime, click to edit`}
                      onPointerDown={(e) => handleShapeDrag(e, stop.id)}
                      className="absolute top-1/2 flex size-6 -translate-y-1/2 touch-none cursor-grab items-center justify-center rounded-md border bg-[#0c0d0f] transition-transform hover:scale-110 active:cursor-grabbing focus-visible:outline-none"
                      style={{
                        left: xForFrac(stop.time / duration, -12),
                        borderColor: selected ? '#ffffff' : 'rgba(255,255,255,0.22)',
                        boxShadow: selected ? `0 0 0 2px ${stop.color}` : 'none',
                        zIndex: selected ? 30 : 16,
                      }}
                    >
                      <div
                        className="size-4 [&_svg]:h-full [&_svg]:w-full [&_svg]:fill-current [&_svg]:stroke-current"
                        style={{ color: stop.color }}
                        dangerouslySetInnerHTML={{ __html: stop.svgContent }}
                      />
                    </PopoverTrigger>
                    <PopoverContent align="center" side="top" sideOffset={10} className="w-72 border-white/[0.09] bg-[#15171a] p-2.5 text-zinc-100 shadow-2xl">
                      <div className="flex items-center justify-between px-1 pb-2">
                        <span className="text-[11px] font-medium text-zinc-300">Shape</span>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => { onUploadShape(stop.id); onOpenShapePicker(null); }} className="h-6 rounded-md px-2 text-[10px] text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200">Upload SVG</button>
                          {shapes.length > 1 && (
                            <button type="button" aria-label="Remove shape" title="Remove shape" onClick={() => { onRemoveShape(stop.id); onOpenShapePicker(null); }} className="flex size-6 items-center justify-center rounded-md text-zinc-500 hover:bg-red-500/10 hover:text-red-400">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {shapeOptions.map((opt) => {
                          const active = stop.iconId === opt.id;
                          return (
                            <button
                              key={`pick-${stop.id}-${opt.id}`}
                              type="button"
                              title={opt.name}
                              onClick={() => { onShapeIconChange(stop.id, opt); onOpenShapePicker(null); }}
                              className={`aspect-square rounded-md border p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${active ? 'bg-white/[0.08]' : 'border-white/[0.08] bg-white/[0.035] text-zinc-400 hover:border-white/[0.18] hover:bg-white/[0.06]'}`}
                              style={active ? { borderColor: opt.defaultTint } : undefined}
                            >
                              <div className="size-5 mx-auto [&_svg]:h-full [&_svg]:w-full [&_svg]:fill-current [&_svg]:stroke-current" style={{ color: opt.defaultTint }} dangerouslySetInnerHTML={{ __html: opt.svgContent }} />
                            </button>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })}
            </div>

            {tracks.map((track) => {
              const isActive = activeTrackId === track.id;
              const animated = track.keyframes.length > 0;
              const sorted = [...track.keyframes].sort((a, b) => a.time - b.time);
              const first = sorted[0];
              const last = sorted[sorted.length - 1];
              return (
                <div
                  key={track.id}
                  className={`relative h-9 border-b border-white/[0.04] transition-colors ${
                    isActive ? 'bg-white/[0.03]' : 'hover:bg-white/[0.015]'
                  }`}
                  onMouseDown={(e) => {
                    onScrubStart?.();
                    selectTrack(track.id);
                    onTimeChange(timeFromClientX(e.clientX));
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
                      time: Number(t.toFixed(2)),
                      value,
                      easing: prev?.easing ?? 'ease-in-out',
                    };
                    selectTrack(track.id);
                    setSelectedKeyframe({ trackId: track.id, kfId: kf.id });
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
                    <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center">
                      <div className="h-px w-full bg-white/[0.05]" />
                      <span className="absolute left-2 rounded bg-[#0f1012] pr-1 text-[10px] text-zinc-600">
                        {formatValueLabel(track, track.defaultValue)} · constant
                      </span>
                    </div>
                  )}

                  {/* Keyframe diamonds */}
                  {track.keyframes.map((kf) => {
                    const selected = selectedKeyframe?.trackId === track.id && selectedKeyframe?.kfId === kf.id;
                    const startMouseDown = (e: React.MouseEvent) => {
                      e.stopPropagation();
                      selectTrack(track.id);
                      setSelectedKeyframe({ trackId: track.id, kfId: kf.id });
                      handleKeyframeDrag(e, track.id, kf.id);
                    };

                    return (
                      <div
                        key={kf.id}
                        title={`${track.name} · ${formatValueLabel(track, kf.value)} @ ${kf.time.toFixed(2)}s`}
                        className="absolute top-1/2 size-3 -translate-y-1/2 rotate-45 cursor-grab border transition-transform hover:scale-125 active:cursor-grabbing"
                        style={{
                          left: xForFrac(kf.time / duration, -6),
                          backgroundColor: selected ? '#ffffff' : track.color,
                          borderColor: selected ? '#ffffff' : 'rgba(0,0,0,0.85)',
                          boxShadow: selected ? `0 0 0 3px ${track.color}55` : 'none',
                          zIndex: selected ? 30 : 15,
                        }}
                        onMouseDown={startMouseDown}
                      />
                    );
                  })}
                </div>
              );
            })}

            {/* Playhead across all lanes */}
            <div className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-white/25" style={{ left: playheadX }} />
          </div>
        </div>
      </div>
    </div>
  );
};
