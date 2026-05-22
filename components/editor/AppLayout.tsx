'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Layers, Sliders,
  Upload, Plus, Download, RefreshCw, Undo2,
  Eye, EyeOff,
  ArrowUpLeft, ArrowUp, ArrowUpRight, ArrowLeft, ArrowRight, ArrowDownLeft, ArrowDown, ArrowDownRight, Compass,
  Box, Wand2, Palette, Cuboid, Orbit, SunMedium, PanelLeftClose, PanelLeftOpen, Rows3, UploadCloud, Blend
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ColorPicker } from '@/components/ui/color-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PRESET_ICONS, PresetIcon } from './IconLibrary';
import { SvgCanvas, SvgCanvasRef, PathOverride } from '../3d/SvgCanvas';
import { MaterialPresetId } from '../3d/MaterialPresets';
import { Timeline, TimelineTrack, interpolateKeyframes } from './Timeline';
import { ExportModal } from './ExportModal';
import { MOTION_RECIPES } from './MotionRecipes';

interface DecomposedPath {
  id: string;
  d: string;
  fill: string;
  nodeName: string;
}

// Utility: Parses a raw SVG content XML string and decomposes it into individual visual paths
const parseSvgPaths = (svgContent: string): DecomposedPath[] => {
  if (typeof window === 'undefined' || !svgContent) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  if (doc.querySelector('parsererror')) return [];
  
  const pathElements = doc.querySelectorAll('path, circle, rect, polygon, polyline, ellipse');
  const results: DecomposedPath[] = [];

  pathElements.forEach((el, index) => {
    let d = '';
    const nodeName = el.nodeName.toLowerCase();
    
    if (nodeName === 'path') {
      d = el.getAttribute('d') || '';
    } else if (nodeName === 'circle') {
      const cx = parseFloat(el.getAttribute('cx') || '0');
      const cy = parseFloat(el.getAttribute('cy') || '0');
      const r = parseFloat(el.getAttribute('r') || '0');
      d = `M ${cx - r}, ${cy} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${r * 2},0`;
    } else if (nodeName === 'rect') {
      const x = parseFloat(el.getAttribute('x') || '0');
      const y = parseFloat(el.getAttribute('y') || '0');
      const w = parseFloat(el.getAttribute('width') || '0');
      const h = parseFloat(el.getAttribute('height') || '0');
      d = `M ${x},${y} h ${w} v ${h} h -${w} Z`;
    } else if (nodeName === 'polygon' || nodeName === 'polyline') {
      const ptsAttr = el.getAttribute('points') || '';
      const pts = ptsAttr.trim().split(/\s+|,/);
      if (pts.length >= 4) {
        d = `M ${pts[0]},${pts[1]} ` + pts.slice(2).reduce((acc, p, i) => acc + (i % 2 === 0 ? `L ${p}` : `,${p} `), '') + ' Z';
      }
    } else if (nodeName === 'ellipse') {
      const cx = parseFloat(el.getAttribute('cx') || '0');
      const cy = parseFloat(el.getAttribute('cy') || '0');
      const rx = parseFloat(el.getAttribute('rx') || '0');
      const ry = parseFloat(el.getAttribute('ry') || '0');
      d = `M ${cx - rx}, ${cy} a ${rx},${ry} 0 1,0 ${rx * 2},0 a ${rx},${ry} 0 1,0 -${rx * 2},0`;
    }

    if (!d) return;

    let fill = el.getAttribute('fill') || '';
    if (fill === 'none' || !fill) {
      fill = el.getAttribute('stroke') || '';
    }
    if (!fill || fill === 'none') {
      fill = 'currentColor';
    }

    results.push({
      id: index.toString(),
      d,
      fill,
      nodeName: nodeName.toUpperCase()
    });
  });

  return results;
};

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

type FillMode = 'solid' | 'gradient';
type MotionTrackId = 'transition' | 'extrusion' | 'rotation' | 'lighting';

const FILL_MODES: Array<{ id: FillMode; label: string }> = [
  { id: 'solid', label: 'Solid' },
  { id: 'gradient', label: 'Gradient' },
];

const MOTION_TRACK_NAMES: Record<MotionTrackId, string> = {
  transition: 'Shape Blend',
  extrusion: 'Extrude',
  rotation: 'Rotation',
  lighting: 'Lighting',
};

function NumberField({
  value,
  min,
  max,
  step,
  suffix = '',
  precision = 1,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  precision?: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(() => value.toFixed(precision));

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

  return (
    <div className="flex h-7 w-[62px] items-center rounded-md border border-white/[0.08] bg-black/20 px-1.5 focus-within:border-white/20">
      <input
        type="number"
        value={draft}
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
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
        className="min-w-0 flex-1 bg-transparent text-right font-mono text-[10px] text-zinc-300 outline-none"
      />
      {suffix && <span className="pl-0.5 text-[10px] text-zinc-600">{suffix}</span>}
    </div>
  );
}

export default function AppLayout() {
  // --- 1. Selection & Assets State ---
  const [iconA, setIconA] = useState<string>('heart');
  const [iconB, setIconB] = useState<string>('star');
  const [iconAContent, setIconAContent] = useState<string>('');
  const [iconBContent, setIconBContent] = useState<string>('');
  const [activePanelTab, setActivePanelTab] = useState<'library' | 'presets' | 'layers'>('presets');
  const [activeLayersIcon, setActiveLayersIcon] = useState<'A' | 'B'>('A');
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>('spring-glass');
  const [activeColorTab, setActiveColorTab] = useState<'A' | 'B'>('A');

  // Decomposed parts & path-level overrides
  const [decomposedPathsA, setDecomposedPathsA] = useState<DecomposedPath[]>([]);
  const [decomposedPathsB, setDecomposedPathsB] = useState<DecomposedPath[]>([]);
  const [pathOverridesA, setPathOverridesA] = useState<PathOverride[]>([]);
  const [pathOverridesB, setPathOverridesB] = useState<PathOverride[]>([]);

  const normalizeRecipeTracks = (recipe: typeof MOTION_RECIPES[0], timelineDuration = 5): TimelineTrack[] => {
    return recipe.tracks.map((track) => {
      const trackName = MOTION_TRACK_NAMES[track.id as MotionTrackId] ?? track.name;
      if (track.id === 'transition') {
        const first = track.keyframes[0];
        const last = track.keyframes[track.keyframes.length - 1] || first;
        return {
          ...track,
          name: trackName,
          defaultValue: 0,
          keyframes: [
            {
              id: `${track.id}-start`,
              time: 0,
              value: 0,
              easing: first?.easing || 'ease-in-out'
            },
            {
              id: `${track.id}-end`,
              time: timelineDuration,
              value: 1,
              easing: last?.easing || first?.easing || 'ease-in-out'
            }
          ]
        };
      }

      if (track.id === 'extrusion') {
        return { ...track, name: trackName, defaultValue: recipe.extrusionDepth, keyframes: [] };
      }

      if (track.id === 'rotation') {
        return { ...track, name: trackName, min: -180, max: 180, defaultValue: 0, keyframes: [] };
      }

      if (track.id === 'lighting') {
        return { ...track, name: trackName, defaultValue: recipe.keyLightIntensity, keyframes: [] };
      }

      return { ...track, name: trackName, keyframes: [] };
    });
  };

  // Function to apply a recipe's exact styling & animation parameters
  const applyRecipe = (recipe: typeof MOTION_RECIPES[0]) => {
    setActiveRecipeId(recipe.id);
    setMaterialPreset(recipe.materialPreset);
    setEnableGradient(recipe.enableGradient);
    setFillMode(recipe.enableGradient ? 'gradient' : 'solid');
    setColorA(recipe.colorA);
    previousColorARef.current = recipe.colorA;
    setColorASecondary(recipe.colorASecondary);
    setColorB(recipe.colorB);
    previousColorBRef.current = recipe.colorB;
    setColorBSecondary(recipe.colorBSecondary);
    
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
    
    setTransitionType(recipe.transitionType);
    setWipeDirection(recipe.wipeDirection);
    setRotationSpeed(recipe.rotationSpeed);
    setKeyLightIntensity(recipe.keyLightIntensity);
    
    setTracks(normalizeRecipeTracks(recipe));
    setSelectedMotionTrackId('transition');
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleResetRecipe = () => {
    const targetRecipeId = activeRecipeId || 'spring-glass';
    const recipe = MOTION_RECIPES.find(r => r.id === targetRecipeId);
    if (recipe) {
      applyRecipe(recipe);
    }
  };

  // Load default icon contents on mount and apply default spring-glass recipe
  useEffect(() => {
    const defaultA = PRESET_ICONS.find(i => i.id === 'heart')?.svgContent || '';
    const defaultB = PRESET_ICONS.find(i => i.id === 'star')?.svgContent || '';
    setIconAContent(defaultA);
    setIconBContent(defaultB);

    const initialRecipe = MOTION_RECIPES.find(r => r.id === 'spring-glass');
    if (initialRecipe) {
      applyRecipe(initialRecipe);
    }
  }, []);

  // Parse paths whenever active contents change
  useEffect(() => {
    setDecomposedPathsA(parseSvgPaths(iconAContent));
  }, [iconAContent]);

  useEffect(() => {
    setDecomposedPathsB(parseSvgPaths(iconBContent));
  }, [iconBContent]);

  // --- 2. Sliders & Rendering Tweak Suite State ---
  const [materialPreset, setMaterialPreset] = useState<MaterialPresetId>('glass');
  const [colorA, setColorA] = useState<string>('#ff5b9a');
  const [colorB, setColorB] = useState<string>('#ffcc4d');
  const previousColorARef = useRef('#ff5b9a');
  const previousColorBRef = useRef('#ffcc4d');

  const markCustom = () => setActiveRecipeId(null);

  const updatePrimaryColor = (shape: 'A' | 'B', value: string) => {
    markCustom();
    if (shape === 'A') {
      const previous = previousColorARef.current;
      setColorA(value);
      previousColorARef.current = value;
      setPathOverridesA((overrides) => overrides.map((override) =>
        override.color === previous ? { ...override, color: value } : override
      ));
    } else {
      const previous = previousColorBRef.current;
      setColorB(value);
      previousColorBRef.current = value;
      setPathOverridesB((overrides) => overrides.map((override) =>
        override.color === previous ? { ...override, color: value } : override
      ));
    }
  };

  const selectPresetIcon = (shape: 'A' | 'B', icon: PresetIcon) => {
    markCustom();
    if (shape === 'A') {
      setIconA(icon.id);
      setIconAContent(icon.svgContent);
      setActiveColorTab('A');
      updatePrimaryColor('A', icon.defaultTint);
    } else {
      setIconB(icon.id);
      setIconBContent(icon.svgContent);
      setActiveColorTab('B');
      updatePrimaryColor('B', icon.defaultTint);
    }
  };
  
  // Custom Advanced Material Finish parameters
  const [roughness, setRoughness] = useState<number>(0.15);
  const [metalness, setMetalness] = useState<number>(0.4);
  const [clearcoat, setClearcoat] = useState<number>(0.5);
  const [clearcoatRoughness, setClearcoatRoughness] = useState<number>(0.1);
  const [transmission, setTransmission] = useState<number>(0.0);
  const [thickness, setThickness] = useState<number>(1.0);
  const [emissiveIntensity, setEmissiveIntensity] = useState<number>(0.0);

  const [wireframe, setWireframe] = useState<boolean>(false);
  const [extrusionDepth, setExtrusionDepth] = useState<number>(1.2);
  const [bevelEnabled, setBevelEnabled] = useState<boolean>(true);
  const [bevelThickness, setBevelThickness] = useState<number>(0.15);
  const [bevelSize, setBevelSize] = useState<number>(0.08);
  const [bevelSegments, setBevelSegments] = useState<number>(3);
  const [layerSpacing, setLayerSpacing] = useState<number>(0.8);

  const [transitionType, setTransitionType] = useState<'none' | 'wipe'>('wipe');
  const [enableGradient, setEnableGradient] = useState<boolean>(false);
  const [fillMode, setFillMode] = useState<FillMode>('solid');
  const [colorASecondary, setColorASecondary] = useState<string>('#7c5cff');
  const [colorBSecondary, setColorBSecondary] = useState<string>('#4ee2a3');
  const [wipeDirection, setWipeDirection] = useState<{ x: number; y: number }>({ x: 1, y: 0 });
  const [rotationSpeed, setRotationSpeed] = useState<{ x: number; y: number; z: number }>({ x: 0.1, y: 0.4, z: 0 });
  const [rotationOffset, setRotationOffset] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });

  // Lighting & perspective
  const [ambientColor] = useState<string>('#ffffff');
  const [ambientIntensity] = useState<number>(0.6);
  const [keyLightColor] = useState<string>('#ffffff');
  const [keyLightIntensity, setKeyLightIntensity] = useState<number>(1.2);
  const [rimLightColor] = useState<string>('#a48bff');
  const [rimLightIntensity] = useState<number>(0.8);
  const [zoom, setZoom] = useState<number>(1.0);
  const [zenMode, setZenMode] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOverHalf, setDragOverHalf] = useState<'left' | 'right' | null>(null);

  // Initialize path overrides dynamically
  useEffect(() => {
    setPathOverridesA((previous) => decomposedPathsA.map((path) => {
      const existing = previous.find((override) => override.id === path.id);
      return existing ?? {
        id: path.id,
        visible: true,
        color: path.fill === 'currentColor' ? colorA : path.fill,
        depthMultiplier: 1.0
      };
    }));
  }, [decomposedPathsA]);

  useEffect(() => {
    setPathOverridesB((previous) => decomposedPathsB.map((path) => {
      const existing = previous.find((override) => override.id === path.id);
      return existing ?? {
        id: path.id,
        visible: true,
        color: path.fill === 'currentColor' ? colorB : path.fill,
        depthMultiplier: 1.0
      };
    }));
  }, [decomposedPathsB]);

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
  const [duration] = useState<number>(5.0); 
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedMotionTrackId, setSelectedMotionTrackId] = useState<MotionTrackId>('transition');

  const setTrackValue = (
    trackId: MotionTrackId,
    nextValue: number,
    syncStaticValue?: (value: number) => void,
    mode: 'property' | 'morph' = 'property'
  ) => {
    setSelectedMotionTrackId(trackId);
    setActiveRecipeId(null);

    const sourceTrack = tracks.find((track) => track.id === trackId);
    const clampedValue = sourceTrack ? clampNumber(nextValue, sourceTrack.min, sourceTrack.max) : nextValue;
    syncStaticValue?.(clampedValue);

    setTracks((prevTracks) => prevTracks.map((track) => {
      if (track.id !== trackId) return track;

      const playheadTime = clampNumber(Number(currentTime.toFixed(2)), 0, duration);
      const exactKeyframe = track.keyframes.find((keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04);

      if (track.keyframes.length === 0) {
        return { ...track, defaultValue: clampedValue };
      }

      if (exactKeyframe) {
        return {
          ...track,
          defaultValue: clampedValue,
          keyframes: track.keyframes.map((keyframe) =>
            keyframe.id === exactKeyframe.id ? { ...keyframe, value: clampedValue } : keyframe
        )
      };
    }

      if (mode === 'property') {
        return {
          ...track,
          defaultValue: clampedValue,
          keyframes: track.keyframes.map((keyframe) => ({ ...keyframe, value: clampedValue }))
        };
      }

      return {
        ...track,
        defaultValue: clampedValue,
        keyframes: [
          ...track.keyframes,
          {
            id: `${track.id}-${Date.now().toString(36)}`,
            time: playheadTime,
            value: clampedValue,
            easing: 'ease-in-out' as const
          }
        ].sort((a, b) => a.time - b.time)
      };
    }));
  };

  const handleMorphChange = (newValue: number) => {
    setTrackValue('transition', newValue, undefined, 'morph');
  };

  const handleDepthChange = (newValue: number) => {
    setTrackValue('extrusion', newValue, setExtrusionDepth);
  };

  const handleSpinChange = (newValue: number) => {
    setTrackValue('rotation', newValue, (value) => setRotationOffset((prev) => ({ ...(prev ?? { x: 0, y: 0, z: 0 }), y: value })));
  };

  const handleBrightnessChange = (newValue: number) => {
    setTrackValue('lighting', newValue, setKeyLightIntensity);
  };

  const playheadRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Keyframe timeline tracks
  const [tracks, setTracks] = useState<TimelineTrack[]>([
    {
      id: 'transition',
      name: 'Shape Blend',
      color: '#7c5cff',
      min: 0,
      max: 1.0,
      defaultValue: 0.0,
      keyframes: [
        { id: 'kf-tr1', time: 1.0, value: 0.0, easing: 'ease-in-out' },
        { id: 'kf-tr2', time: 3.5, value: 1.0, easing: 'ease-in-out' }
      ]
    },
    {
      id: 'extrusion',
      name: 'Extrude',
      color: '#4ee2a3',
      min: 0.2,
      max: 3.0,
      defaultValue: 1.2,
      keyframes: []
    },
    {
      id: 'rotation',
      name: 'Rotation',
      color: '#ffd23f',
      min: -180,
      max: 180,
      defaultValue: 0,
      keyframes: []
    },
    {
      id: 'lighting',
      name: 'Lighting',
      color: '#ff5b9a',
      min: 0.0,
      max: 3.0,
      defaultValue: 1.2,
      keyframes: []
    }
  ]);

  const transitionTrack = tracks.find((track) => track.id === 'transition') ?? tracks[0];
  const extrusionTrack = tracks.find((track) => track.id === 'extrusion') ?? tracks[1];
  const rotationTrack = tracks.find((track) => track.id === 'rotation') ?? tracks[2];
  const lightingTrack = tracks.find((track) => track.id === 'lighting') ?? tracks[3];

  // Interpolated variables resulting from timeline position
  const activeTransitionProgress = transitionTrack.keyframes.length > 0
    ? interpolateKeyframes(currentTime, transitionTrack)
    : transitionTrack.defaultValue;

  const activeExtrusionDepth = extrusionTrack.keyframes.length > 0
    ? interpolateKeyframes(currentTime, extrusionTrack)
    : extrusionDepth;

  const activeRotationY = rotationTrack.keyframes.length > 0
    ? interpolateKeyframes(currentTime, rotationTrack)
    : rotationOffset.y;

  const activeKeyLightIntensity = lightingTrack.keyframes.length > 0
    ? interpolateKeyframes(currentTime, lightingTrack)
    : keyLightIntensity;

  const hasLayerGapControls = Math.max(decomposedPathsA.length, decomposedPathsB.length) > 1;

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
            next = 0; 
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
  }, [isPlaying, duration]);

  const handlePlayToggle = () => setIsPlaying(!isPlaying);
  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleTracksChange = (nextTracks: TimelineTrack[]) => {
    setTracks(nextTracks);
    setActiveRecipeId(null);
  };

  // --- 4. Exporter modal ---
  const [isExportOpen, setIsExportOpen] = useState(false);
  const canvas3DRef = useRef<SvgCanvasRef>(null);

  // --- 5. File input loader for custom SVGs ---
  const fileInputARef = useRef<HTMLInputElement>(null);
  const fileInputBRef = useRef<HTMLInputElement>(null);

  const handleSvgFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isIconA: boolean) => {
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
      if (isIconA) {
        setIconA('custom-a');
        setIconAContent(content);
        setActiveColorTab('A');
      } else {
        setIconB('custom-b');
        setIconBContent(content);
        setActiveColorTab('B');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleDragDropSvg = (e: React.DragEvent, isIconA: boolean) => {
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'image/svg+xml') {
      markCustom();
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          if (isIconA) {
            setIconA('custom-a');
            setIconAContent(text);
            setActiveColorTab('A');
          } else {
            setIconB('custom-b');
            setIconBContent(text);
            setActiveColorTab('B');
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const iconAName = PRESET_ICONS.find((icon) => icon.id === iconA)?.name || 'Shape 1';
  const iconBName = PRESET_ICONS.find((icon) => icon.id === iconB)?.name || 'Shape 2';

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
                {iconAName} to {iconBName} · {activeRecipeId ? MOTION_RECIPES.find(r => r.id === activeRecipeId)?.name : 'Custom setup'}
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
        
        {/* LEFT PANEL: Layers & Library */}
        <div className={`transition-[width,opacity] duration-300 ease-out bg-[#0f1012] flex flex-col shrink-0 overflow-hidden ${
          zenMode ? 'w-0 opacity-0 border-r-0 pointer-events-none' : 'w-[304px] border-r border-white/[0.07]'
        }`}>
          <Tabs value={activePanelTab} onValueChange={(val) => setActivePanelTab(val as any)} className="flex-1 flex flex-col min-h-0 gap-0">
            <div className="shrink-0 border-b border-white/[0.055] px-3 py-3">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold tracking-tight text-zinc-100">Source</div>
                  <div className="mt-0.5 text-[11px] text-zinc-600">
                    {decomposedPathsA.length + decomposedPathsB.length} paths
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveColorTab('A');
                    setActivePanelTab('library');
                  }}
                  className="h-7 rounded-md border border-white/[0.08] bg-white/[0.035] px-2 text-[11px] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                >
                  Replace
                </button>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveColorTab('A');
                    setActivePanelTab('library');
                  }}
                  className="flex h-10 min-w-0 items-center gap-2 rounded-md border border-white/[0.075] bg-white/[0.035] px-2 text-left hover:bg-white/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                >
                  <div className="size-6 shrink-0 [&_svg]:h-full [&_svg]:w-full [&_svg]:fill-current [&_svg]:stroke-current" style={{ color: colorA }} dangerouslySetInnerHTML={{ __html: iconAContent }} />
                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-medium text-zinc-200">{iconAName}</div>
                    <div className="text-[10px] text-zinc-600">Current</div>
                  </div>
                </button>
                <Blend className="size-3.5 text-zinc-600" />
                <button
                  type="button"
                  onClick={() => setActivePanelTab('library')}
                  className="flex h-10 min-w-0 items-center gap-2 rounded-md border border-white/[0.075] bg-white/[0.035] px-2 text-left hover:bg-white/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                >
                  <div className="size-6 shrink-0 [&_svg]:h-full [&_svg]:w-full [&_svg]:fill-current [&_svg]:stroke-current" style={{ color: colorB }} dangerouslySetInnerHTML={{ __html: iconBContent }} />
                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-medium text-zinc-200">{iconBName}</div>
                    <div className="text-[10px] text-zinc-600">Next</div>
                  </div>
                </button>
              </div>

              <TabsList className="mt-3 grid grid-cols-2 w-full bg-transparent p-0 rounded-none border-0">
                <TabsTrigger value="presets" className="h-8 rounded-md text-[11px] font-medium text-zinc-500 data-[state=active]:bg-white/[0.075] data-[state=active]:text-zinc-100 gap-1"><Wand2 className="size-3" /> Looks</TabsTrigger>
                <TabsTrigger value="layers" className="h-8 rounded-md text-[11px] font-medium text-zinc-500 data-[state=active]:bg-white/[0.075] data-[state=active]:text-zinc-100 gap-1"><Layers className="size-3" /> Parts</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="presets" className="flex-1 overflow-y-auto px-2 py-2 outline-none flex flex-col gap-1 animate-fade-in">
              {MOTION_RECIPES.map((recipe) => {
                const isActive = activeRecipeId === recipe.id;
                return (
                  <button 
                    key={recipe.id}
                    type="button"
                    onClick={() => applyRecipe(recipe)}
                    className={`group text-left w-full cursor-pointer rounded-md px-2.5 py-2 flex items-center gap-2.5 transition-[background,border-color,color] duration-150 border focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                      isActive 
                        ? "bg-white/[0.075] border-white/[0.12] text-zinc-50"
                        : "bg-transparent border-transparent hover:bg-white/[0.04] text-zinc-400"
                    }`}
                  >
                    <div className="flex h-8 w-11 shrink-0 items-center justify-center">
                      <div className="flex items-center gap-0.5">
                        <span className="h-5 w-3 rounded-sm border border-white/10" style={{ background: recipe.enableGradient ? `linear-gradient(180deg, ${recipe.colorA}, ${recipe.colorASecondary})` : recipe.colorA }} />
                        <span className="h-5 w-3 rounded-sm border border-white/10" style={{ background: recipe.enableGradient ? `linear-gradient(180deg, ${recipe.colorB}, ${recipe.colorBSecondary})` : recipe.colorB }} />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-white text-[12px] truncate">{recipe.name}</span>
                        <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-zinc-600 shrink-0">{recipe.tag}</span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full w-full"
                          style={{ background: `linear-gradient(90deg, ${recipe.colorA}, ${recipe.colorB})` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </TabsContent>

            <TabsContent value="library" className="flex-1 overflow-y-auto px-3 py-3 outline-none flex flex-col gap-4 animate-fade-in">
              {/* Upload */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[11px] font-medium text-zinc-500">Import</span>
                  <span className="text-[10px] text-zinc-700">SVG only</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => fileInputARef.current?.click()}
                    className="h-9 rounded-md border border-dashed border-white/[0.12] px-2 hover:bg-white/[0.04] transition-colors flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                  >
                    <UploadCloud className="size-3.5" />
                    <span>Start</span>
                    <input ref={fileInputARef} type="file" accept=".svg" className="hidden" onChange={(e) => handleSvgFileUpload(e, true)} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => fileInputBRef.current?.click()}
                    className="h-9 rounded-md border border-dashed border-white/[0.12] px-2 hover:bg-white/[0.04] transition-colors flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                  >
                    <UploadCloud className="size-3.5" />
                    <span>End</span>
                    <input ref={fileInputBRef} type="file" accept=".svg" className="hidden" onChange={(e) => handleSvgFileUpload(e, false)} />
                  </button>
                </div>
              </div>

              {/* Built-in Vector Registry (With Premium SVG Swatches instead of letter shorthand) */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-medium text-zinc-500 px-0.5">Start</span>
                  
                  <div className="flex flex-col gap-1.5">
                    <div className="grid grid-cols-6 gap-1">
                      {PRESET_ICONS.map((icon) => {
                        const isActive = iconA === icon.id;
                        return (
                          <button
                            key={`A-${icon.id}`}
                            type="button"
                            aria-label={`Set ${icon.name} as start shape`}
                            onClick={() => {
                              selectPresetIcon('A', icon);
                            }}
                            className={`aspect-square rounded-md p-2 flex items-center justify-center border transition-[background,border-color] duration-150 group/swatch relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                              isActive
                                ? 'border-[var(--glow-color)] text-white'
                                : 'bg-white/[0.035] border-white/[0.07] text-zinc-400 hover:text-zinc-100 hover:border-white/[0.16]'
                            }`}
                            style={{
                              '--glow-color': icon.defaultTint,
                              borderColor: isActive ? icon.defaultTint : undefined,
                              backgroundColor: isActive ? `${icon.defaultTint}1a` : undefined,
                            } as React.CSSProperties}
                            title={icon.name}
                          >
                            <div 
                              className="size-5 shrink-0 [&_svg]:h-full [&_svg]:w-full [&_svg]:fill-current [&_svg]:stroke-current"
                              style={{ 
                                color: isActive ? icon.defaultTint : 'currentColor',
                              }} 
                              dangerouslySetInnerHTML={{ __html: icon.svgContent }} 
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-medium text-zinc-500 px-0.5">End</span>
                  <div className="flex flex-col gap-1.5">
                    <div className="grid grid-cols-6 gap-1">
                      {PRESET_ICONS.map((icon) => {
                        const isActive = iconB === icon.id;
                        return (
                          <button
                            key={`B-${icon.id}`}
                            type="button"
                            aria-label={`Set ${icon.name} as end shape`}
                            onClick={() => {
                              selectPresetIcon('B', icon);
                            }}
                            className={`aspect-square rounded-md p-2 flex items-center justify-center border transition-[background,border-color] duration-150 group/swatch relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                              isActive
                                ? 'border-[var(--glow-color)] text-white'
                                : 'bg-white/[0.035] border-white/[0.07] text-zinc-400 hover:text-zinc-100 hover:border-white/[0.16]'
                            }`}
                            style={{
                              '--glow-color': icon.defaultTint,
                              borderColor: isActive ? icon.defaultTint : undefined,
                              backgroundColor: isActive ? `${icon.defaultTint}1a` : undefined,
                            } as React.CSSProperties}
                            title={icon.name}
                          >
                            <div 
                              className="size-5 shrink-0 [&_svg]:h-full [&_svg]:w-full [&_svg]:fill-current [&_svg]:stroke-current"
                              style={{ 
                                color: isActive ? icon.defaultTint : 'currentColor',
                              }} 
                              dangerouslySetInnerHTML={{ __html: icon.svgContent }} 
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="layers" className="flex-1 overflow-y-auto px-3 py-3 outline-none flex flex-col gap-3 animate-fade-in">
              <div className="flex bg-white/[0.035] p-0.5 rounded-md border border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => setActiveLayersIcon('A')}
                  className={`flex-1 py-1.5 text-center text-[11px] font-medium rounded transition-colors ${
                    activeLayersIcon === 'A' 
                      ? 'bg-white/[0.09] text-zinc-50' 
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  Start ({decomposedPathsA.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLayersIcon('B')}
                  className={`flex-1 py-1.5 text-center text-[11px] font-medium rounded transition-colors ${
                    activeLayersIcon === 'B' 
                      ? 'bg-white/[0.09] text-zinc-50' 
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  End ({decomposedPathsB.length})
                </button>
              </div>
              
              {/* Decomposed path layers list */}
              <div className="flex flex-col gap-2">
                {(activeLayersIcon === 'A' ? decomposedPathsA : decomposedPathsB).length === 0 && (
                  <div className="rounded-md border border-dashed border-white/[0.1] px-3 py-8 text-center">
                    <div className="mx-auto mb-2 flex size-8 items-center justify-center rounded-md bg-white/[0.035] text-zinc-600">
                      <Layers className="size-4" />
                    </div>
                    <div className="text-[11px] font-medium text-zinc-400">No parts yet</div>
                    <div className="mt-1 text-[10px] text-zinc-600">Choose or import an SVG shape.</div>
                  </div>
                )}
                {(activeLayersIcon === 'A' ? decomposedPathsA : decomposedPathsB).map((path, idx) => {
                  const overrides = activeLayersIcon === 'A' ? pathOverridesA : pathOverridesB;
                  const setOverrides = activeLayersIcon === 'A' ? setPathOverridesA : setPathOverridesB;
                  const override = overrides.find(o => o.id === path.id);
                  if (!override) return null;

                  return (
                    <div 
                      key={`${activeLayersIcon}-${path.id}`}
                      className="bg-white/[0.03] border border-white/[0.07] rounded-md p-2.5 flex flex-col gap-2 transition-colors hover:border-white/[0.14]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <svg className="w-6 h-6 rounded bg-black/30 border border-white/[0.07] p-0.5 shrink-0" viewBox="0 0 24 24">
                            <path d={path.d} fill={override.color} />
                          </svg>
                          <span className="text-[11px] font-medium text-zinc-300">Layer {idx + 1}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            aria-label={override.visible ? 'Hide part' : 'Show part'}
                            onClick={() => {
                              setOverrides(overrides.map(o => o.id === path.id ? { ...o, visible: !o.visible } : o));
                            }}
                            className={`p-1 rounded hover:bg-zinc-800 transition-colors ${
                              override.visible ? 'text-zinc-300' : 'text-zinc-600'
                            }`}
                          >
                            {override.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          </button>
                          <ColorPicker
                            value={override.color}
                            onChange={(val) => {
                              setOverrides(overrides.map(o => o.id === path.id ? { ...o, color: val } : o));
                            }}
                            className="w-20 px-1 py-0.5 rounded border-zinc-800"
                          />
                        </div>
                      </div>

                      {override.visible && (
                        <div className="flex items-center gap-2 pl-8">
                          <span className="text-[10px] text-zinc-500 shrink-0">Extrude</span>
                          <Slider
                            value={[override.depthMultiplier]}
                            min={0.2}
                            max={3.0}
                            step={0.1}
                            onValueChange={(val) => {
                              setOverrides(overrides.map(o => o.id === path.id ? { ...o, depthMultiplier: (val as number[])[0] } : o));
                            }}
                            className="flex-1"
                          />
                          <span className="text-[10px] font-mono text-zinc-500 w-8 text-right">{finiteNumber(override.depthMultiplier, 1).toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>

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
              const x = e.clientX;
              const y = e.clientY;
              if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                setIsDragging(false);
                setDragOverHalf(null);
              }
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
              rotationSpeed={rotationSpeed}
              rotationOffset={{ ...rotationOffset, y: activeRotationY }}
              isPlaying={isPlaying}
              ambientColor={ambientColor}
              ambientIntensity={ambientIntensity}
              keyLightColor={keyLightColor}
              keyLightIntensity={activeKeyLightIntensity}
              rimLightColor={rimLightColor}
              rimLightIntensity={rimLightIntensity}
              zoom={zoom}
              pathOverridesA={pathOverridesA}
              pathOverridesB={pathOverridesB}
              onZoomChange={setZoom}
            />

            {/* Drag & Drop Visual Split Overlay */}
            {isDragging && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-md z-30 flex animate-fade-in transition-all">
                {/* Left Drop Zone */}
                <div 
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverHalf('left');
                  }}
                  onDragLeave={() => setDragOverHalf(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    setDragOverHalf(null);
                    handleDragDropSvg(e, true);
                  }}
                  className={`flex-1 flex flex-col items-center justify-center gap-4 transition-all duration-300 relative border-r border-white/10 ${
                    dragOverHalf === 'left' 
                      ? 'bg-[oklch(0.7_0.15_280)]/15 scale-[0.99] rounded-l-2xl' 
                      : 'bg-transparent'
                  }`}
                >
                  <div className={`p-6 rounded-2xl border-2 border-dashed transition-all duration-300 ${
                    dragOverHalf === 'left' 
                      ? 'border-[oklch(0.7_0.15_280)] bg-[oklch(0.7_0.15_280)]/10 shadow-[0_0_30px_oklch(0.7_0.15_280)/20]' 
                      : 'border-white/20'
                  } flex flex-col items-center gap-3 animate-pulse`}>
                    <Upload className={`w-8 h-8 ${dragOverHalf === 'left' ? 'text-[oklch(0.7_0.15_280)] scale-110' : 'text-white/60'} transition-transform`} />
                    <div className="text-center">
                      <span className="block font-bold text-white text-sm">Drop SVG here</span>
                      <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Set as Start Icon A</span>
                    </div>
                  </div>
                </div>

                {/* Right Drop Zone */}
                <div 
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverHalf('right');
                  }}
                  onDragLeave={() => setDragOverHalf(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    setDragOverHalf(null);
                    handleDragDropSvg(e, false);
                  }}
                  className={`flex-1 flex flex-col items-center justify-center gap-4 transition-all duration-300 relative ${
                    dragOverHalf === 'right' 
                      ? 'bg-emerald-500/10 scale-[0.99] rounded-r-2xl' 
                      : 'bg-transparent'
                  }`}
                >
                  <div className={`p-6 rounded-2xl border-2 border-dashed transition-all duration-300 ${
                    dragOverHalf === 'right' 
                      ? 'border-emerald-400 bg-emerald-400/5 shadow-[0_0_30px_rgba(52,211,153,0.15)]' 
                      : 'border-white/20'
                  } flex flex-col items-center gap-3 animate-pulse`}>
                    <Upload className={`w-8 h-8 ${dragOverHalf === 'right' ? 'text-emerald-400 scale-110' : 'text-white/60'} transition-transform`} />
                    <div className="text-center">
                      <span className="block font-bold text-white text-sm">Drop SVG here</span>
                      <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Set as End Icon B</span>
                    </div>
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

            {/* Floating Zen Transport Pill Overlay */}
            {zenMode && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2.5 bg-black/60 border border-white/10 hover:border-white/20 rounded-full shadow-2xl backdrop-blur-xl z-20 transition-all duration-300 animate-fade-in">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={handlePlayToggle}
                  className="w-8 h-8 rounded-full text-white hover:bg-white/10 animate-hover"
                >
                  {isPlaying ? <Pause size={14} className="fill-white" /> : <Play size={14} className="fill-white" />}
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={handleReset}
                  className="w-8 h-8 rounded-full text-white hover:bg-white/10 animate-hover"
                >
                  <Undo2 size={14} />
                </Button>
                <div className="text-xs text-white/95 font-mono">
                  <span>{currentTime.toFixed(2)}s</span>
                  <span className="text-white/40 mx-1">/</span>
                  <span>{duration.toFixed(1)}s</span>
                </div>
                
                {/* Mini scrub progress bar */}
                <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden relative cursor-pointer group"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = (e.clientX - rect.left) / rect.width;
                    setCurrentTime(pct * duration);
                  }}
                >
                  <div 
                    className="h-full bg-gradient-to-r from-[oklch(0.7_0.15_280)] to-[#a48bff] transition-all"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setZenMode(false)}
                  className="text-[11px] text-zinc-500 hover:text-white px-2 py-1 h-6 rounded-md hover:bg-white/5"
                >
                  Exit
                </Button>
              </div>
            )}
          </div>

          {!zenMode && (
            <div className="h-11 shrink-0 rounded-lg border border-white/[0.07] bg-[#15171a] px-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Button size="icon-sm" variant="ghost" aria-label={isPlaying ? "Pause preview" : "Play preview"} onClick={handlePlayToggle} className="text-zinc-200 hover:text-white hover:bg-white/[0.08]">
                  {isPlaying ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current" />}
                </Button>
                <Button size="icon-sm" variant="ghost" aria-label="Reset preview" onClick={handleReset} className="text-zinc-500 hover:text-white hover:bg-white/[0.08]">
                  <Undo2 className="size-3.5" />
                </Button>
                <div className="ml-2 text-[11px] font-mono tabular-nums text-zinc-500">
                  <span className="text-zinc-200">{currentTime.toFixed(2)}</span>
                  <span className="px-1 text-zinc-700">/</span>
                  <span>{duration.toFixed(1)}s</span>
                </div>
              </div>

              <div
                className="mx-4 hidden sm:block h-1 flex-1 max-w-[420px] rounded-full bg-black/40 overflow-hidden cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setCurrentTime(((e.clientX - rect.left) / rect.width) * duration);
                }}
              >
                <div className="h-full bg-white/70" style={{ width: `${(currentTime / duration) * 100}%` }} />
              </div>

              <div className="hidden md:flex items-center gap-2 text-[11px] text-zinc-500">
                <span className="font-mono tabular-nums text-zinc-300">{Math.round(activeTransitionProgress * 100)}%</span>
                <span>{transitionType === 'wipe' ? 'wipe' : 'dissolve'}</span>
              </div>
            </div>
          )}
        </div>

        <div className={`transition-all duration-300 ease-out flex flex-col shrink-0 overflow-y-auto bg-[#0f1012] ${
          zenMode ? 'w-0 opacity-0 border-l-0 pointer-events-none p-0' : 'w-[328px] border-l border-white/[0.07] px-4 py-4 gap-5'
        }`}>
          
          {/* Material Presets */}
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              <Palette className="size-3.5" />
              Material
            </div>
            <Popover>
              <PopoverTrigger className="h-8 min-w-36 rounded-md border border-white/[0.08] bg-white/[0.035] px-2.5 text-left text-[11px] text-zinc-200 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30">
                {MATERIAL_METADATA[materialPreset].name}
              </PopoverTrigger>
              <PopoverContent align="end" side="bottom" sideOffset={6} className="w-56 border-white/[0.09] bg-[#15171a] p-1.5 text-zinc-100">
                {(Object.keys(MATERIAL_METADATA) as MaterialPresetId[]).map((preset) => {
                  const meta = MATERIAL_METADATA[preset];
                  const isActive = materialPreset === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setMaterialPreset(preset);
                        setActiveRecipeId(null);
                      }}
                      className={`flex h-8 w-full items-center justify-between rounded-md px-2 text-left text-[11px] transition-colors ${
                        isActive ? 'bg-white/[0.09] text-white' : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100'
                      }`}
                    >
                      <span>{meta.name}</span>
                      {isActive && <span className="size-1.5 rounded-full bg-white" />}
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-3 border-b border-white/[0.07] pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                <Rows3 className="size-3.5" />
                Fill
              </div>
              <div className="flex items-center rounded-md border border-white/[0.07] bg-black/25 p-0.5">
                {(['A', 'B'] as const).map((shape) => {
                  const isActive = activeColorTab === shape;
                  const swatchColor = shape === 'A' ? colorA : colorB;
                  return (
                    <button
                      key={shape}
                      type="button"
                      aria-label={`Edit ${shape === 'A' ? iconAName : iconBName} fill`}
                      onClick={() => setActiveColorTab(shape)}
                      className={`h-6 px-2 rounded text-[10px] font-medium transition-colors ${
                        isActive ? 'bg-white/[0.1] text-white' : 'text-zinc-500 hover:text-zinc-200'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ backgroundColor: swatchColor }} />
                        {shape === 'A' ? iconAName : iconBName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-white/[0.08] bg-black/20 p-2.5 flex flex-col gap-2.5">
              <div className="flex items-center gap-1 rounded-md bg-black/25 p-0.5">
                {FILL_MODES.map((mode) => {
                  const isActive = fillMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        setFillMode(mode.id);
                        setEnableGradient(mode.id !== 'solid');
                        markCustom();
                      }}
                      className={`h-7 flex-1 rounded text-[11px] font-medium transition-colors ${
                        isActive ? 'bg-white text-zinc-950' : 'text-zinc-500 hover:text-zinc-200'
                      }`}
                    >
                      {mode.label}
                    </button>
                  );
                })}
              </div>

              <div
                className="h-10 rounded-md border border-white/[0.08]"
                style={{
                  background: fillMode === 'solid'
                    ? (activeColorTab === 'A' ? colorA : colorB)
                    : `linear-gradient(90deg, ${activeColorTab === 'A' ? colorA : colorB}, ${activeColorTab === 'A' ? colorASecondary : colorBSecondary})`
                }}
              />

              <div className={`grid gap-2 ${fillMode === 'solid' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <ColorPicker
                  value={activeColorTab === 'A' ? colorA : colorB}
                  onChange={(val) => {
                    updatePrimaryColor(activeColorTab, val);
                  }}
                  className="rounded-md bg-white/[0.035] border-white/[0.08]"
                />
                {fillMode !== 'solid' && (
                  <ColorPicker
                    value={activeColorTab === 'A' ? colorASecondary : colorBSecondary}
                    onChange={(val) => {
                      if (activeColorTab === 'A') setColorASecondary(val);
                      else setColorBSecondary(val);
                      markCustom();
                    }}
                    className="rounded-md bg-white/[0.035] border-white/[0.08]"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-6 gap-1.5">
              {CURATED_PALETTES.map((palette) => {
                const isCurrent =
                  fillMode !== 'solid'
                    ? activeColorTab === 'A'
                      ? colorA === palette.colorA && colorASecondary === (palette.colorASecondary || palette.colorA)
                      : colorB === palette.colorB && colorBSecondary === (palette.colorBSecondary || palette.colorB)
                    : activeColorTab === 'A'
                      ? colorA === palette.colorA
                      : colorB === palette.colorB;

                return (
                  <button
                    key={palette.name}
                    type="button"
                    title={palette.name}
                    onClick={() => {
                      const nextMode: FillMode = palette.enableGradient ? 'gradient' : 'solid';
                      setFillMode(nextMode);
                      setEnableGradient(nextMode !== 'solid');
                      if (activeColorTab === 'A') {
                        updatePrimaryColor('A', palette.colorA);
                        setColorASecondary(palette.colorASecondary || palette.colorA);
                      } else {
                        updatePrimaryColor('B', palette.colorB);
                        setColorBSecondary(palette.colorBSecondary || palette.colorB);
                      }
                    }}
                    className={`h-6 rounded-md border transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                      isCurrent ? 'border-white/80' : 'border-white/[0.09]'
                    }`}
                    style={{ background: palette.glowColor }}
                  />
                );
              })}
            </div>
          </div>

          {materialPreset === 'custom' && (
            <div className="flex flex-col gap-3 border-b border-white/[0.07] pb-4 animate-fade-in">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                <Sliders className="size-3.5" />
                Material
              </div>

              {/* Clean Apple-style property rows: Label [slider] Value */}
              {[
                { label: 'Smoothness', value: roughness, set: setRoughness, min: 0, max: 1, step: 0.02, fmt: (v: number) => v.toFixed(2) },
                { label: 'Metallic', value: metalness, set: setMetalness, min: 0, max: 1, step: 0.02, fmt: (v: number) => v.toFixed(2) },
                { label: 'Gloss Coat', value: clearcoat, set: setClearcoat, min: 0, max: 1, step: 0.05, fmt: (v: number) => v.toFixed(2) },
                { label: 'Transparency', value: transmission, set: setTransmission, min: 0, max: 1, step: 0.05, fmt: (v: number) => v.toFixed(2) },
                { label: 'Glow', value: emissiveIntensity, set: setEmissiveIntensity, min: 0, max: 5, step: 0.1, fmt: (v: number) => v.toFixed(1) },
              ].map(({ label, value, set, min, max, step, fmt }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-400 w-24 shrink-0">{label}</span>
                  <Slider 
                    value={[value]} 
                    min={min} 
                    max={max} 
                    step={step} 
                    onValueChange={(val) => { set((val as number[])[0]); setActiveRecipeId(null); }}
                    className="flex-1"
                  />
                  <span className="text-[10px] font-mono text-zinc-500 w-8 text-right">{fmt(value)}</span>
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
                const depthValue = finiteNumber(extrusionTrack.keyframes.length > 0 ? activeExtrusionDepth : extrusionDepth, 1.2);
                return (
                  <>
              <Slider
                value={[depthValue]}
                min={0.2}
                max={3.0}
                step={0.05}
                onValueChange={(val) => {
                  handleDepthChange((val as number[])[0]);
                  setActiveRecipeId(null);
                }}
                className="flex-1"
              />
                    <NumberField value={depthValue} min={0.2} max={3} step={0.05} precision={2} onChange={(value) => { handleDepthChange(value); setActiveRecipeId(null); }} />
                    {renderKeyframeControl(extrusionTrack, depthValue)}
                  </>
                );
              })()}
            </div>

            {hasLayerGapControls && (
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-zinc-400 w-24 shrink-0">Layer Gap</span>
                {(() => {
                  const gapValue = finiteNumber(layerSpacing, 0);
                  return (
                    <>
                      <Slider
                        value={[gapValue]}
                        min={0.0}
                        max={2.0}
                        step={0.05}
                        onValueChange={(val) => { setLayerSpacing((val as number[])[0]); setActiveRecipeId(null); }}
                        className="flex-1"
                      />
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

          {/* Shape Blend */}
          <div className="flex flex-col gap-2.5 border-b border-white/[0.07] pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                <Blend className="size-3.5" />
                Shape Blend
              </div>
              <span className="text-[10px] font-mono tabular-nums text-zinc-500">{Math.round(activeTransitionProgress * 100)}%</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex rounded-md border border-white/[0.07] bg-black/25 p-0.5">
                {[
                  { id: 'none' as const, label: 'Dissolve' },
                  { id: 'wipe' as const, label: 'Wipe' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => { setTransitionType(mode.id); setActiveRecipeId(null); }}
                    className={`h-7 rounded px-3 text-[11px] font-medium transition-colors ${
                      transitionType === mode.id ? 'bg-white text-zinc-950' : 'text-zinc-500 hover:text-zinc-200'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {transitionType === 'wipe' && (
                <Popover>
                  <PopoverTrigger className="h-8 rounded-md border border-white/[0.08] bg-white/[0.035] px-2.5 text-zinc-300 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30">
                    {getDirectionIcon(directions.find((dir) => dir.x === wipeDirection.x && dir.y === wipeDirection.y)?.label || '•', 'size-3.5')}
                  </PopoverTrigger>
                  <PopoverContent align="end" side="top" sideOffset={6} className="w-auto border-white/[0.09] bg-[#15171a] p-2">
                    <div className="grid grid-cols-3 gap-1">
                      {directions.map((dir) => {
                        const isActive = wipeDirection.x === dir.x && wipeDirection.y === dir.y;
                        return (
                          <button
                            key={dir.label}
                            type="button"
                            title={dir.tooltip}
                            onClick={() => { setWipeDirection({ x: dir.x, y: dir.y }); setActiveRecipeId(null); }}
                            className={`size-8 rounded-md flex items-center justify-center border transition-colors ${
                              isActive
                                ? 'bg-white border-white text-zinc-950'
                                : 'bg-white/[0.035] border-white/[0.08] text-zinc-500 hover:text-white hover:border-white/[0.16]'
                            }`}
                          >
                            {getDirectionIcon(dir.label, 'size-3.5')}
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <div className={motionPropertyRowClass('transition')} onClick={() => setSelectedMotionTrackId('transition')}>
              <span className="text-[11px] text-zinc-400 w-24 shrink-0">
                Blend
                {transitionTrack.keyframes.length > 0 && <span className="inline-block w-1 h-1 rounded-full bg-emerald-500 ml-1 align-middle" />}
              </span>
              <Slider
                value={[finiteNumber(activeTransitionProgress, 0)]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={(val) => {
                  handleMorphChange((val as number[])[0]);
                  setActiveRecipeId(null);
                }}
                className="flex-1"
              />
              <NumberField
                value={finiteNumber(activeTransitionProgress, 0)}
                min={0}
                max={1}
                step={0.01}
                precision={2}
                onChange={(value) => {
                  handleMorphChange(value);
                  setActiveRecipeId(null);
                }}
              />
              {renderKeyframeControl(transitionTrack, finiteNumber(activeTransitionProgress, 0))}
            </div>
          </div>

          {/* Camera */}
          <div className="flex flex-col gap-3 pb-4">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              <SunMedium className="size-3.5" />
              View & Lighting
            </div>

            {[
              { label: 'X Rotation', axis: 'x' as const },
              { label: 'Y Rotation', axis: 'y' as const },
              { label: 'Z Rotation', axis: 'z' as const },
            ].map(({ label, axis }) => {
              const isAnimatedRotation = axis === 'y';
              const axisValue = isAnimatedRotation
                ? finiteNumber(activeRotationY, 0)
                : finiteNumber(rotationOffset?.[axis], 0);
              const updateAxis = (value: number) => {
                if (isAnimatedRotation) {
                  handleSpinChange(value);
                } else {
                  setRotationOffset((prev) => ({ ...(prev ?? { x: 0, y: 0, z: 0 }), [axis]: value }));
                }
                setActiveRecipeId(null);
              };
              return (
                <div
                  key={axis}
                  className={isAnimatedRotation ? motionPropertyRowClass('rotation') : 'flex items-center gap-3'}
                  onClick={() => {
                    if (isAnimatedRotation) setSelectedMotionTrackId('rotation');
                  }}
                >
                  <span className="text-[11px] text-zinc-400 w-24 shrink-0">
                    {label}
                    {isAnimatedRotation && rotationTrack.keyframes.length > 0 && <span className="inline-block w-1 h-1 rounded-full bg-emerald-500 ml-1 align-middle" />}
                  </span>
                  <Slider
                    value={[axisValue]}
                    min={-180}
                    max={180}
                    step={1}
                    onValueChange={(val) => {
                      const value = (val as number[])[0] ?? 0;
                      updateAxis(value);
                    }}
                    className="flex-1"
                  />
                  <NumberField
                    value={axisValue}
                    min={-180}
                    max={180}
                    step={1}
                    suffix="°"
                    precision={0}
                    onChange={(value) => {
                      updateAxis(value);
                    }}
                  />
                  {isAnimatedRotation && renderKeyframeControl(rotationTrack, axisValue)}
                </div>
              );
            })}

            {/* Brightness */}
            <div className={motionPropertyRowClass('lighting')} onClick={() => setSelectedMotionTrackId('lighting')}>
              <span className="text-[11px] text-zinc-400 w-24 shrink-0">
                Brightness
                {lightingTrack.keyframes.length > 0 && <span className="inline-block w-1 h-1 rounded-full bg-emerald-500 ml-1 align-middle" />}
              </span>
              {(() => {
                const brightnessValue = finiteNumber(lightingTrack.keyframes.length > 0 ? activeKeyLightIntensity : keyLightIntensity, 1);
                return (
                  <>
              <Slider
                value={[brightnessValue]}
                min={0.0}
                max={3.0}
                step={0.1}
                onValueChange={(val) => {
                  handleBrightnessChange((val as number[])[0]);
                  setActiveRecipeId(null);
                }}
                className="flex-1"
              />
              <NumberField
                value={brightnessValue}
                min={0}
                max={3}
                step={0.1}
                precision={1}
                onChange={(value) => {
                  handleBrightnessChange(value);
                  setActiveRecipeId(null);
                }}
              />
              {renderKeyframeControl(lightingTrack, brightnessValue)}
                  </>
                );
              })()}
            </div>

            {/* Zoom */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-zinc-400 w-24 shrink-0">Zoom</span>
              <Slider
                value={[finiteNumber(zoom, 1)]}
                min={0.5}
                max={2.0}
                step={0.1}
                onValueChange={(val) => { setZoom((val as number[])[0]); setActiveRecipeId(null); }}
                className="flex-1"
              />
              <NumberField
                value={finiteNumber(zoom, 1)}
                min={0.5}
                max={2}
                step={0.1}
                precision={1}
                onChange={(value) => { setZoom(value); setActiveRecipeId(null); }}
              />
            </div>
          </div>

        </div>

      </div>

      {/* =========================================================================
          3. KEYFRAME TIMELINE Scrubber
          ========================================================================= */}
      <div className={`transition-all duration-500 ease-in-out shrink-0 overflow-hidden ${zenMode ? 'h-0 border-t-0' : 'h-[136px] border-t border-white/[0.07] bg-[#0f1012]'}`}>
        <Timeline
          duration={duration}
          currentTime={currentTime}
          isPlaying={isPlaying}
          onTimeChange={setCurrentTime}
          onPlayToggle={handlePlayToggle}
          onReset={handleReset}
          tracks={tracks}
          onTracksChange={handleTracksChange}
          activeTrackId={selectedMotionTrackId}
          onActiveTrackChange={(trackId) => setSelectedMotionTrackId(trackId as MotionTrackId)}
          sequenceSlot={
            <div className="flex w-full items-center gap-2">
              <div className="flex min-w-[320px] max-w-[720px] flex-1 items-center">
                <button
                  type="button"
                  className="h-7 min-w-0 flex-1 rounded-l-md border border-white/[0.08] bg-white/[0.045] px-2.5 flex items-center gap-2 text-left hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                  onClick={() => setActivePanelTab('library')}
                >
                  <div className="size-5 shrink-0 flex items-center justify-center [&_svg]:h-full [&_svg]:w-full [&_svg]:fill-current [&_svg]:stroke-current" style={{ color: colorA }} dangerouslySetInnerHTML={{ __html: iconAContent }} />
                  <span className="truncate text-[11px] font-medium text-zinc-200">{PRESET_ICONS.find(i => i.id === iconA)?.name || 'Shape 1'}</span>
                </button>

                <button
                  type="button"
                  aria-label={`Edit ${transitionType === 'wipe' ? 'wipe' : 'dissolve'} overlap`}
                  title={`Edit ${transitionType === 'wipe' ? 'wipe' : 'dissolve'} overlap`}
                  className="relative h-7 w-8 -mx-px border-y border-white/[0.11] bg-black/30 overflow-hidden hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                >
                  <div className="absolute inset-0 opacity-60" style={{ background: `linear-gradient(90deg, ${colorA}55, ${colorB}55)` }} />
                  <div className="absolute inset-0 opacity-35 [background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.45)_0,rgba(255,255,255,.45)_1px,transparent_1px,transparent_5px)]" />
                  <div
                    className="absolute bottom-0 left-0 h-0.5 bg-white/70"
                    style={{ width: `${activeTransitionProgress * 100}%` }}
                  />
                </button>

                <button
                  type="button"
                  className="h-7 min-w-0 flex-1 rounded-r-md border border-white/[0.08] bg-white/[0.045] px-2.5 flex items-center gap-2 text-left hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                  onClick={() => setActivePanelTab('library')}
                >
                  <div className="size-5 shrink-0 flex items-center justify-center [&_svg]:h-full [&_svg]:w-full [&_svg]:fill-current [&_svg]:stroke-current" style={{ color: colorB }} dangerouslySetInnerHTML={{ __html: iconBContent }} />
                  <span className="truncate text-[11px] font-medium text-zinc-200">{PRESET_ICONS.find(i => i.id === iconB)?.name || 'Shape 2'}</span>
                </button>
              </div>

              <Popover>
                <PopoverTrigger
                  className="h-7 min-w-28 rounded-md border border-dashed border-white/[0.14] px-2 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                >
                  <Plus className="size-3.5" />
                  Set next
                </PopoverTrigger>
                <PopoverContent align="end" side="top" sideOffset={8} className="w-72 border-white/[0.09] bg-[#15171a] p-2.5 text-zinc-100 shadow-2xl">
                  <div className="flex items-center justify-between px-1 pb-2">
                    <span className="text-[11px] font-medium text-zinc-300">Choose next shape</span>
                    <button
                      type="button"
                      onClick={() => fileInputBRef.current?.click()}
                      className="h-6 rounded-md px-2 text-[10px] text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"
                    >
                      Upload SVG
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {PRESET_ICONS.map((icon) => (
                      <button
                        key={`add-${icon.id}`}
                        type="button"
                        aria-label={`Add ${icon.name} as next shape`}
                        title={icon.name}
                        onClick={() => {
                          selectPresetIcon('B', icon);
                          setActivePanelTab('library');
                        }}
                        className="aspect-square rounded-md border border-white/[0.08] bg-white/[0.035] p-2 text-zinc-400 hover:border-white/[0.18] hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                      >
                        <div
                          className="size-5 mx-auto [&_svg]:h-full [&_svg]:w-full [&_svg]:fill-current [&_svg]:stroke-current"
                          style={{ color: icon.defaultTint }}
                          dangerouslySetInnerHTML={{ __html: icon.svgContent }}
                        />
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          }
        />
      </div>

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
