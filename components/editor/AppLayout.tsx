'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Sparkles, Layers, Sliders, Settings, 
  HelpCircle, Upload, Plus, Download, RefreshCw, Undo2, 
  Maximize2, Eye, EyeOff, Lock, LockOpen, HelpCircle as HelpIcon, Bell, Star,
  ArrowUpLeft, ArrowUp, ArrowUpRight, ArrowLeft, ArrowRight, ArrowDownLeft, ArrowDown, ArrowDownRight, Compass
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ColorPicker } from '@/components/ui/color-picker';
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
  
  const pathElements = doc.querySelectorAll('path, circle, rect, polygon, ellipse');
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

const MATERIAL_METADATA: Record<MaterialPresetId, { name: string; emoji: string; subtitle: string; description: string; glowColor: string }> = {
  clay: {
    name: "Matte Clay",
    emoji: "🎨",
    subtitle: "Plaster Feel",
    description: "A soft, non-reflective plaster finish. Ideal for showcasing raw geometry, structural contours, and smooth, clean shadows.",
    glowColor: "rgba(230, 230, 230, 0.15)"
  },
  glass: {
    name: "Satin Glass",
    emoji: "💎",
    subtitle: "Translucent Refract",
    description: "Ultra-premium glassmorphism with dynamic light refraction, subtle varnish coats, and high physical background transmission.",
    glowColor: "rgba(14, 165, 233, 0.25)"
  },
  chrome: {
    name: "Liquid Silver",
    emoji: "💿",
    subtitle: "Mirror Metal",
    description: "Highly polished, mirror-like chrome finish. Provides infinite environmental reflections and striking metallic highlights.",
    glowColor: "rgba(161, 161, 170, 0.25)"
  },
  gold: {
    name: "Royal Gold",
    emoji: "✨",
    subtitle: "Polished Luxury",
    description: "Deep, rich metallic gold with customized micro-roughness. Evokes luxury, premium craftsmanship, and warm ambient reflections.",
    glowColor: "rgba(234, 179, 8, 0.25)"
  },
  glow: {
    name: "Neon Emissive",
    emoji: "⚡",
    subtitle: "Illuminated",
    description: "Self-illuminating high-energy neon paint. Projects an intensive electric glow onto adjacent geometry and scene elements.",
    glowColor: "rgba(244, 63, 94, 0.25)"
  },
  custom: {
    name: "Custom Studio",
    emoji: "🛠️",
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

  // Function to apply a recipe's exact styling & animation parameters
  const applyRecipe = (recipe: typeof MOTION_RECIPES[0]) => {
    setActiveRecipeId(recipe.id);
    setMaterialPreset(recipe.materialPreset);
    setEnableGradient(recipe.enableGradient);
    setColorA(recipe.colorA);
    setColorASecondary(recipe.colorASecondary);
    setColorB(recipe.colorB);
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
    
    setTracks(recipe.tracks);
    setCurrentTime(recipe.tracks[0]?.keyframes[0]?.time || 0);
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
  const [colorASecondary, setColorASecondary] = useState<string>('#7c5cff');
  const [colorBSecondary, setColorBSecondary] = useState<string>('#4ee2a3');
  const [wipeDirection, setWipeDirection] = useState<{ x: number; y: number }>({ x: 1, y: 0 });
  const [rotationSpeed, setRotationSpeed] = useState<{ x: number; y: number; z: number }>({ x: 0.1, y: 0.4, z: 0 });

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
    setPathOverridesA(decomposedPathsA.map(path => ({
      id: path.id,
      visible: true,
      color: path.fill === 'currentColor' ? colorA : path.fill,
      depthMultiplier: 1.0
    })));
  }, [decomposedPathsA, colorA]);

  useEffect(() => {
    setPathOverridesB(decomposedPathsB.map(path => ({
      id: path.id,
      visible: true,
      color: path.fill === 'currentColor' ? colorB : path.fill,
      depthMultiplier: 1.0
    })));
  }, [decomposedPathsB, colorB]);

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

  const handleAnimatedSliderChange = (trackId: string, newValue: number, fallbackSetter: (val: number) => void) => {
    setTracks(prevTracks => {
      const trackIndex = prevTracks.findIndex(t => t.id === trackId);
      if (trackIndex === -1) return prevTracks;
      
      const track = prevTracks[trackIndex];
      if (track.keyframes.length === 0) {
        // Not animated, just update the static state fallback
        fallbackSetter(newValue);
        return prevTracks;
      }
      
      // Animated! Find the closest keyframe to the current playhead time
      let closestKf = track.keyframes[0];
      let minDiff = Math.abs(currentTime - closestKf.time);
      
      for (const kf of track.keyframes) {
        const diff = Math.abs(currentTime - kf.time);
        if (diff < minDiff) {
          minDiff = diff;
          closestKf = kf;
        }
      }
      
      // Update the closest keyframe's value
      const updatedKeyframes = track.keyframes.map(k => {
        if (k.id === closestKf.id) {
          return { ...k, value: newValue };
        }
        return k;
      });
      
      const newTracks = [...prevTracks];
      newTracks[trackIndex] = { ...track, keyframes: updatedKeyframes };
      return newTracks;
    });
  };
  const playheadRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Keyframe timeline tracks
  const [tracks, setTracks] = useState<TimelineTrack[]>([
    {
      id: 'transition',
      name: 'Transition Progress',
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
      name: 'Extrusion Depth',
      color: '#4ee2a3',
      min: 0.2,
      max: 3.0,
      defaultValue: 1.2,
      keyframes: []
    },
    {
      id: 'rotation',
      name: 'Spin Speed Y',
      color: '#ffd23f',
      min: 0.0,
      max: 2.0,
      defaultValue: 0.4,
      keyframes: []
    },
    {
      id: 'lighting',
      name: 'Key Light Intensity',
      color: '#ff5b9a',
      min: 0.0,
      max: 3.0,
      defaultValue: 1.2,
      keyframes: []
    }
  ]);

  // Interpolated variables resulting from timeline position
  const activeTransitionProgress = tracks[0].keyframes.length > 0
    ? interpolateKeyframes(currentTime, tracks[0])
    : 0.5;

  const activeExtrusionDepth = tracks[1].keyframes.length > 0
    ? interpolateKeyframes(currentTime, tracks[1])
    : extrusionDepth;

  const activeRotationSpeedY = tracks[2].keyframes.length > 0
    ? interpolateKeyframes(currentTime, tracks[2])
    : rotationSpeed.y;

  const activeKeyLightIntensity = tracks[3].keyframes.length > 0
    ? interpolateKeyframes(currentTime, tracks[3])
    : keyLightIntensity;

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

  // --- 4. Exporter modal ---
  const [isExportOpen, setIsExportOpen] = useState(false);
  const canvas3DRef = useRef<SvgCanvasRef>(null);

  // --- 5. File input loader for custom SVGs ---
  const fileInputARef = useRef<HTMLInputElement>(null);
  const fileInputBRef = useRef<HTMLInputElement>(null);

  const handleSvgFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isIconA: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (isIconA) {
        setIconA('custom-a');
        setIconAContent(content);
      } else {
        setIconB('custom-b');
        setIconBContent(content);
      }
    };
    reader.readAsText(file);
  };

  const handleDragDropSvg = (e: React.DragEvent, isIconA: boolean) => {
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          if (isIconA) {
            setIconA('custom-a');
            setIconAContent(text);
          } else {
            setIconB('custom-b');
            setIconBContent(text);
          }
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-zinc-950 text-zinc-50 font-sans select-none antialiased">
      
      {/* =========================================================================
          1. TOP BAR
          ========================================================================= */}
      <div className="h-12 border-b border-zinc-800/50 flex items-center justify-between px-4 bg-zinc-950/95 backdrop-blur-md shrink-0 relative z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800">
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <span className="font-semibold text-white text-[13px] tracking-tight">Shape Shifter</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`text-xs gap-1.5 rounded-lg h-8 transition-all ${
              zenMode ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
            }`} 
            onClick={() => setZenMode(!zenMode)}
          >
            {zenMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {zenMode ? 'Exit Focus' : 'Focus'}
          </Button>

          <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white text-xs gap-1.5 hover:bg-zinc-900 h-8 rounded-lg" onClick={handleResetRecipe}>
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </Button>

          <Button size="sm" className="bg-white hover:bg-zinc-200 text-zinc-950 gap-1.5 font-medium h-8 rounded-lg text-xs" onClick={() => setIsExportOpen(true)}>
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 bg-zinc-950">
        
        {/* LEFT PANEL: Layers & Library */}
        <div className={`transition-all duration-500 ease-in-out bg-zinc-900/95 flex flex-col shrink-0 overflow-hidden ${
          zenMode ? 'w-0 opacity-0 border-r-0 pointer-events-none' : 'w-[310px] border-r border-zinc-800'
        }`}>
          <Tabs value={activePanelTab} onValueChange={(val) => setActivePanelTab(val as any)} className="flex-1 flex flex-col min-h-0 gap-0">
            {/* Tabs Header */}
            <div className="p-2 border-b border-zinc-800 bg-zinc-950/40 shrink-0">
              <TabsList className="grid grid-cols-3 w-full bg-zinc-950 p-1 border border-zinc-800 rounded-lg">
                <TabsTrigger value="presets" className="text-xs font-semibold rounded-md">Recipes</TabsTrigger>
                <TabsTrigger value="library" className="text-xs font-semibold rounded-md">Library</TabsTrigger>
                <TabsTrigger value="layers" className="text-xs font-semibold rounded-md">Layers</TabsTrigger>
              </TabsList>
            </div>

            {/* Motion Recipes Catalog Tab */}
            <TabsContent value="presets" className="flex-1 overflow-y-auto p-4 outline-none flex flex-col gap-4 animate-fade-in">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Preloaded Motion Recipes</span>
                <span className="text-xs text-muted-foreground/60 leading-relaxed">
                  Instantly load professional styling preset templates with pre-configured timeline tracks, lights, and materials.
                </span>
              </div>
              
              <div className="flex flex-col gap-3.5">
                {MOTION_RECIPES.map((recipe) => {
                  const isActive = activeRecipeId === recipe.id;
                  return (
                    <button 
                      key={recipe.id}
                      type="button"
                      onClick={() => {
                        applyRecipe(recipe);
                      }}
                      className={`group text-left w-full cursor-pointer rounded-xl p-4 flex flex-col gap-2.5 transition-all duration-300 hover:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.4)] hover:scale-[1.01] border focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 ${
                        isActive 
                          ? "bg-zinc-950 border-zinc-200 shadow-[0_0_12px_rgba(255,255,255,0.06)] ring-1 ring-zinc-200/20 text-zinc-50"
                          : "bg-zinc-900 border-zinc-800 hover:border-zinc-700/80 text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{recipe.emoji}</span>
                          <span className={`font-bold text-white text-xs group-hover:text-zinc-300 transition-colors ${
                            isActive ? "text-white" : ""
                          }`}>{recipe.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded transition-colors tracking-wide ${
                            isActive 
                              ? "bg-zinc-850 text-zinc-200 border border-zinc-800" 
                              : "bg-zinc-850 text-muted-foreground group-hover:bg-zinc-800 group-hover:text-zinc-200"
                          }`}>
                            {recipe.tag}
                          </span>
                          {isActive && (
                            <span className="flex h-2 w-2 relative shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <p className={`text-[11px] leading-normal transition-colors ${
                        isActive ? "text-zinc-300" : "text-muted-foreground/80"
                      }`}>
                        {recipe.description}
                      </p>
                      
                      {/* Recipe Stats Swatches */}
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex -space-x-1.5">
                          <div className="w-3.5 h-3.5 rounded-full border border-black/40" style={{ backgroundColor: recipe.colorA }} />
                          {recipe.enableGradient && (
                            <div className="w-3.5 h-3.5 rounded-full border border-black/40" style={{ backgroundColor: recipe.colorASecondary }} />
                          )}
                          <div className="w-3.5 h-3.5 rounded-full border border-black/40" style={{ backgroundColor: recipe.colorB }} />
                          {recipe.enableGradient && (
                            <div className="w-3.5 h-3.5 rounded-full border border-black/40" style={{ backgroundColor: recipe.colorBSecondary }} />
                          )}
                        </div>
                        
                        <span className={`text-[9px] font-mono capitalize transition-colors ${
                          isActive ? "text-zinc-400" : "text-muted-foreground/50"
                        }`}>
                          Preset: {recipe.materialPreset} • {recipe.tracks.filter(t => t.keyframes.length > 0).length} tracks animated
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </TabsContent>

            {/* Library Tab content */}
            <TabsContent value="library" className="flex-1 overflow-y-auto p-4 outline-none flex flex-col gap-4 animate-fade-in">
              {/* Custom SVG uploads */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Upload Custom Vector SVGs</span>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => fileInputARef.current?.click()}
                    className="border border-dashed border-zinc-800 rounded-lg p-3 hover:bg-zinc-850/50 transition-all flex flex-col items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100"
                  >
                    <Upload className="w-4 h-4 text-zinc-400" />
                    <span>SVG Icon A</span>
                    <input ref={fileInputARef} type="file" accept=".svg" className="hidden" onChange={(e) => handleSvgFileUpload(e, true)} />
                  </button>
                  <button 
                    onClick={() => fileInputBRef.current?.click()}
                    className="border border-dashed border-zinc-800 rounded-lg p-3 hover:bg-zinc-850/50 transition-all flex flex-col items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100"
                  >
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>SVG Icon B</span>
                    <input ref={fileInputBRef} type="file" accept=".svg" className="hidden" onChange={(e) => handleSvgFileUpload(e, false)} />
                  </button>
                </div>
              </div>

              {/* Built-in Vector Registry (With Premium SVG Swatches instead of letter shorthand) */}
              <div className="flex flex-col gap-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Preset Library Catalogs</span>
                <div className="flex flex-col gap-4">
                  
                  {/* Icon A selection */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-white/70">Source Icon A (Start Shape)</span>
                    <div className="grid grid-cols-5 gap-2">
                      {PRESET_ICONS.map((icon) => {
                        const isActive = iconA === icon.id;
                        return (
                          <button
                            key={`A-${icon.id}`}
                            type="button"
                            onClick={() => {
                              setIconA(icon.id);
                              setIconAContent(icon.svgContent);
                              setColorA(icon.defaultTint);
                            }}
                            className={`aspect-square rounded-xl p-2.5 flex items-center justify-center border transition-all duration-350 hover:scale-[1.06] active:scale-[0.94] group/swatch relative cursor-pointer ${
                              isActive
                                ? 'border-[var(--glow-color)] text-white shadow-[0_0_15px_-3px_var(--glow-color)]'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700'
                            }`}
                            style={{
                              '--glow-color': icon.defaultTint,
                              borderColor: isActive ? icon.defaultTint : undefined,
                              backgroundColor: isActive ? `${icon.defaultTint}1a` : undefined,
                            } as React.CSSProperties}
                            title={icon.name}
                          >
                            <div 
                              className="w-6 h-6 shrink-0 transition-all duration-300 group-hover/swatch:scale-110 fill-current"
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

                  {/* Icon B selection */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-white/70">Target Icon B (End Shape)</span>
                    <div className="grid grid-cols-5 gap-2">
                      {PRESET_ICONS.map((icon) => {
                        const isActive = iconB === icon.id;
                        return (
                          <button
                            key={`B-${icon.id}`}
                            type="button"
                            onClick={() => {
                              setIconB(icon.id);
                              setIconBContent(icon.svgContent);
                              setColorB(icon.defaultTint);
                            }}
                            className={`aspect-square rounded-xl p-2.5 flex items-center justify-center border transition-all duration-350 hover:scale-[1.06] active:scale-[0.94] group/swatch relative cursor-pointer ${
                              isActive
                                ? 'border-[var(--glow-color)] text-white shadow-[0_0_15px_-3px_var(--glow-color)]'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700'
                            }`}
                            style={{
                              '--glow-color': icon.defaultTint,
                              borderColor: isActive ? icon.defaultTint : undefined,
                              backgroundColor: isActive ? `${icon.defaultTint}1a` : undefined,
                            } as React.CSSProperties}
                            title={icon.name}
                          >
                            <div 
                              className="w-6 h-6 shrink-0 transition-all duration-300 group-hover/swatch:scale-110 fill-current"
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

            {/* Granular Scene Layers Tab: Fully Decomposes SVG Paths to "Preview parts of the icon" */}
            <TabsContent value="layers" className="flex-1 overflow-y-auto p-4 outline-none flex flex-col gap-4 animate-fade-in">
              {/* Switch between A and B parts */}
              <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                <button
                  onClick={() => setActiveLayersIcon('A')}
                  className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-md transition-all ${
                    activeLayersIcon === 'A' 
                      ? 'bg-zinc-850 border border-zinc-800 text-zinc-50 shadow-sm' 
                      : 'text-muted-foreground hover:text-white'
                  }`}
                >
                  Icon A Parts ({decomposedPathsA.length})
                </button>
                <button
                  onClick={() => setActiveLayersIcon('B')}
                  className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-md transition-all ${
                    activeLayersIcon === 'B' 
                      ? 'bg-zinc-850 border border-zinc-800 text-zinc-50 shadow-sm' 
                      : 'text-muted-foreground hover:text-white'
                  }`}
                >
                  Icon B Parts ({decomposedPathsB.length})
                </button>
              </div>

              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Decomposed Path Parts</span>
              
              {/* Decomposed path layers list */}
              <div className="flex flex-col gap-2">
                {(activeLayersIcon === 'A' ? decomposedPathsA : decomposedPathsB).map((path, idx) => {
                  const overrides = activeLayersIcon === 'A' ? pathOverridesA : pathOverridesB;
                  const setOverrides = activeLayersIcon === 'A' ? setPathOverridesA : setPathOverridesB;
                  const override = overrides.find(o => o.id === path.id);
                  if (!override) return null;

                  return (
                    <div 
                      key={`${activeLayersIcon}-${path.id}`}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex flex-col gap-2.5 transition-all hover:border-zinc-700/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Isolated path miniature preview! */}
                          <svg className="w-8 h-8 rounded-md bg-zinc-950 border border-zinc-800 p-1 shrink-0 text-zinc-100 fill-current" viewBox="0 0 24 24">
                            <path d={path.d} fill={override.color} />
                          </svg>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[11.5px] font-semibold text-white truncate">Part #{idx + 1}</span>
                            <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground/60">{path.nodeName} Contour</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Visibility eyeball */}
                          <button
                            onClick={() => {
                              setOverrides(overrides.map(o => o.id === path.id ? { ...o, visible: !o.visible } : o));
                            }}
                            className={`p-1.5 rounded hover:bg-zinc-850 transition-colors ${
                              override.visible ? 'text-zinc-50' : 'text-zinc-500'
                            }`}
                            title={override.visible ? "Hide Part" : "Show Part"}
                          >
                            {override.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>

                          {/* Color override picker */}
                          <ColorPicker
                            value={override.color}
                            onChange={(val) => {
                              setOverrides(overrides.map(o => o.id === path.id ? { ...o, color: val } : o));
                            }}
                            className="w-24 px-1 py-0.5 rounded border-zinc-800"
                          />
                        </div>
                      </div>

                      {/* Individual depth multiplier slider */}
                      {override.visible && (
                        <div className="flex flex-col gap-1 pl-10">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Part Depth Factor</span>
                            <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-md px-1 py-0.5 max-w-[55px] shadow-inner">
                              <input
                                type="number"
                                min="0.05"
                                max="5.0"
                                step="0.05"
                                value={Number(override.depthMultiplier.toFixed(2))}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val)) {
                                    setOverrides(overrides.map(o => o.id === path.id ? { ...o, depthMultiplier: val } : o));
                                  }
                                }}
                                className="w-full bg-transparent font-mono text-[9px] text-white outline-none border-0 text-right p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <span className="text-[9px] text-muted-foreground/60">x</span>
                            </div>
                          </div>
                          <Slider
                            value={[override.depthMultiplier]}
                            min={0.2}
                            max={3.0}
                            step={0.1}
                            onValueChange={(val) => {
                              setOverrides(overrides.map(o => o.id === path.id ? { ...o, depthMultiplier: (val as number[])[0] } : o));
                            }}
                            className="my-1.5"
                          />
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
        <div className={`transition-all duration-500 ease-in-out flex-1 flex flex-col min-w-0 ${
          zenMode ? 'p-0 gap-0' : 'p-6 gap-6'
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
            className={`flex-1 min-h-0 relative transition-all duration-500 ease-in-out ${
              zenMode ? 'rounded-none border-0' : 'rounded-2xl border border-border/10 overflow-hidden shadow-2xl bg-black/10'
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
              rotationSpeed={{ ...rotationSpeed, y: activeRotationSpeedY }}
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

            {/* Viewport indicators (Overlay) */}
            <div className="absolute top-4 left-4 flex gap-2 z-10">
              <div className="text-[10px] font-mono px-2 py-1 bg-black/60 border border-border/10 rounded-md text-white backdrop-blur-sm">
                FPS: <span className="text-emerald-400">60</span>
              </div>
              <div className="text-[10px] font-mono px-2 py-1 bg-black/60 border border-border/10 rounded-md text-white backdrop-blur-sm">
                RENDER: <span className="text-[oklch(0.7_0.15_280)] uppercase font-bold">{materialPreset}</span>
              </div>
              <div className="text-[10px] font-mono px-2 py-1 bg-black/60 border border-border/10 rounded-md text-white/50 backdrop-blur-sm">
                🖱️ drag to rotate | 📜 scroll to zoom
              </div>
            </div>

            {/* Floating Reset overlay */}
            <div className="absolute top-4 right-4 flex gap-2 z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => canvas3DRef.current?.resetRotation()}
                className="bg-black/60 border border-white/10 hover:border-white/20 hover:bg-black/80 text-white backdrop-blur-sm text-xs gap-1.5 h-8 font-semibold rounded-lg shadow-md"
              >
                <Undo2 className="w-3.5 h-3.5" />
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
                  className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground hover:text-white px-2.5 py-1 h-6 rounded-md hover:bg-white/5"
                >
                  Exit Zen
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Tweaks Panel (Tweak Suite) */}
        <div className={`transition-all duration-500 ease-in-out bg-zinc-900/95 flex flex-col shrink-0 overflow-y-auto gap-5 ${
          zenMode ? 'w-0 opacity-0 border-l-0 pointer-events-none p-0' : 'w-[340px] border-l border-zinc-800 p-5'
        }`}>
          
          {/* Material Presets */}
          <div className="flex flex-col gap-3.5">
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">3D Material Finish Studio</span>
            
            <div className="grid grid-cols-2 gap-2 mt-1">
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
                    className={`text-left p-3 rounded-xl border flex flex-col gap-1 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-1 focus:ring-zinc-700 ${
                      isActive
                        ? 'bg-zinc-900 border-zinc-200 text-zinc-50 shadow-lg'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                    style={{
                      boxShadow: isActive ? `0 4px 20px -2px ${meta.glowColor}` : undefined
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm shrink-0">{meta.emoji}</span>
                      <span className="font-bold text-[11px] uppercase tracking-wider text-white">
                        {meta.name}
                      </span>
                    </div>
                    <span className="text-[9px] text-muted-foreground/60 leading-none">
                      {meta.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Dynamic material information feedback banner */}
            <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-xl flex flex-col gap-1.5 transition-all duration-300">
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">
                Material Description
              </span>
              <p className="text-[11px] text-zinc-400/90 leading-relaxed font-medium">
                {MATERIAL_METADATA[materialPreset].description}
              </p>
            </div>
          </div>

          {/* Color & Designer Gradient Studio */}
          <div className="flex flex-col gap-4 border-b border-zinc-800 pb-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Color & Styling Studio</span>
              <span className="text-[8.5px] text-zinc-500 font-semibold uppercase tracking-wider">Mesh Tints</span>
            </div>

            {/* Segmented Control to choose Shape A or Shape B */}
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 shadow-sm relative">
              <button
                type="button"
                onClick={() => setActiveColorTab('A')}
                className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer relative ${
                  activeColorTab === 'A'
                    ? 'bg-zinc-900 text-white border border-zinc-800 shadow-md'
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <div className="w-2 h-2 rounded-full border border-white/10" style={{ backgroundColor: colorA }} />
                  <span>Start Shape A</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setActiveColorTab('B')}
                className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer relative ${
                  activeColorTab === 'B'
                    ? 'bg-zinc-900 text-white border border-zinc-800 shadow-md'
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <div className="w-2 h-2 rounded-full border border-white/10" style={{ backgroundColor: colorB }} />
                  <span>End Shape B</span>
                </div>
              </button>
            </div>

            {/* Solid vs Gradient Toggle Switch */}
            <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 shadow-sm hover:border-zinc-700/50 transition-all">
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-xs text-white">Enable Gradient Blend</span>
                <span className="text-[10px] text-muted-foreground/60 truncate">Blends starting and ending colors across shape</span>
              </div>
              <Switch
                checked={enableGradient}
                onCheckedChange={(val) => {
                  setEnableGradient(val);
                  setActiveRecipeId(null);
                }}
                size="default"
              />
            </div>

            {/* Curated Palette Catalog */}
            <div className="flex flex-col gap-2 bg-zinc-950/20 p-3 rounded-xl border border-zinc-800/40">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">
                  Designer Studio Palettes
                </span>
                <span className="text-[8.5px] text-zinc-500 font-medium">One-Click Apply</span>
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-850 scrollbar-track-transparent">
                {CURATED_PALETTES.map((palette) => {
                  const isCurrent = 
                    enableGradient === palette.enableGradient &&
                    colorA === palette.colorA &&
                    colorB === palette.colorB &&
                    (!palette.enableGradient || (colorASecondary === palette.colorASecondary && colorBSecondary === palette.colorBSecondary));

                  return (
                    <button
                      key={palette.name}
                      type="button"
                      onClick={() => {
                        setEnableGradient(palette.enableGradient);
                        setColorA(palette.colorA);
                        setColorB(palette.colorB);
                        if (palette.enableGradient) {
                          setColorASecondary(palette.colorASecondary!);
                          setColorBSecondary(palette.colorBSecondary!);
                        }
                        setActiveRecipeId(null);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap cursor-pointer hover:scale-[1.03] hover:border-zinc-700 active:scale-[0.97] transition-all duration-300 ${
                        isCurrent
                          ? "bg-zinc-900 border-zinc-200 text-white shadow-[0_0_12px_rgba(255,255,255,0.04)]"
                          : "bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <div 
                        className="w-2.5 h-2.5 rounded-full border border-black/40 shadow-inner shrink-0" 
                        style={{ background: palette.glowColor }} 
                      />
                      <span className="text-[10px] tracking-wide">{palette.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dual color inputs or Single picker */}
            {enableGradient ? (
              <div className="flex flex-col gap-3.5 animate-fade-in">
                <div className="grid grid-cols-2 gap-3.5 relative">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-widest pl-0.5">Start Tint</span>
                    <ColorPicker
                      value={activeColorTab === 'A' ? colorA : colorB}
                      onChange={(val) => {
                        if (activeColorTab === 'A') {
                          setColorA(val);
                        } else {
                          setColorB(val);
                        }
                        setActiveRecipeId(null);
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-widest pl-0.5">End Tint</span>
                    <ColorPicker
                      value={activeColorTab === 'A' ? colorASecondary : colorBSecondary}
                      onChange={(val) => {
                        if (activeColorTab === 'A') {
                          setColorASecondary(val);
                        } else {
                          setColorBSecondary(val);
                        }
                        setActiveRecipeId(null);
                      }}
                    />
                  </div>
                </div>

                {/* Gorgeous Connecting CSS Gradient Bar with direction arrow indicator */}
                <div className="flex flex-col gap-2 bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 shadow-inner mt-1">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider px-0.5">
                    <span>Gradient Blend Ribbon</span>
                    <span className="font-mono text-zinc-400">
                      {activeColorTab === 'A' ? `${colorA} → ${colorASecondary}` : `${colorB} → ${colorBSecondary}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border border-white/10 shrink-0" style={{ backgroundColor: activeColorTab === 'A' ? colorA : colorB }} />
                    <div className="flex-1 h-3 rounded-full border border-white/5 relative overflow-hidden shadow-inner flex items-center justify-center">
                      <div
                        className="absolute inset-0 transition-all duration-300"
                        style={{
                          background: `linear-gradient(to right, ${activeColorTab === 'A' ? colorA : colorB}, ${activeColorTab === 'A' ? colorASecondary : colorBSecondary})`
                        }}
                      />
                      {/* Flow chevron indicator in the center */}
                      <span className="relative z-10 text-[8px] font-black text-black/55 select-none tracking-widest font-mono">{"&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;"}</span>
                    </div>
                    <div className="w-4 h-4 rounded-full border border-white/10 shrink-0" style={{ backgroundColor: activeColorTab === 'A' ? colorASecondary : colorBSecondary }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 animate-fade-in">
                <span className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-widest pl-0.5">Solid Fill Tint</span>
                <ColorPicker
                  value={activeColorTab === 'A' ? colorA : colorB}
                  onChange={(val) => {
                    if (activeColorTab === 'A') {
                      setColorA(val);
                    } else {
                      setColorB(val);
                    }
                    setActiveRecipeId(null);
                  }}
                  className="w-full py-2.5"
                />
              </div>
            )}
          </div>

          {/* Advanced Physical Material Parameters (Visible and active when Custom material is selected) */}
          {materialPreset === 'custom' && (
            <div className="flex flex-col gap-3.5 border-b border-zinc-800 bg-zinc-950 p-4 rounded-xl border border-zinc-800/60 animate-fade-in mb-2">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-white">Custom Physical Finish sliders</span>
              </div>

              {/* Roughness */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70">Roughness (Glossiness)</span>
                  <span className="font-mono text-muted-foreground">{roughness.toFixed(2)}</span>
                </div>
                <Slider 
                  value={[roughness]} 
                  min={0.0} 
                  max={1.0} 
                  step={0.02} 
                  onValueChange={(val) => { setRoughness((val as number[])[0]); setActiveRecipeId(null); }}
                  className="my-1.5"
                />
              </div>

              {/* Metalness */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70">Metalness (Reflectivity)</span>
                  <span className="font-mono text-muted-foreground">{metalness.toFixed(2)}</span>
                </div>
                <Slider 
                  value={[metalness]} 
                  min={0.0} 
                  max={1.0} 
                  step={0.02} 
                  onValueChange={(val) => { setMetalness((val as number[])[0]); setActiveRecipeId(null); }}
                  className="my-1.5"
                />
              </div>

              {/* Clearcoat */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70">Clearcoat (Varnish Coat)</span>
                  <span className="font-mono text-muted-foreground">{clearcoat.toFixed(2)}</span>
                </div>
                <Slider 
                  value={[clearcoat]} 
                  min={0.0} 
                  max={1.0} 
                  step={0.05} 
                  onValueChange={(val) => { setClearcoat((val as number[])[0]); setActiveRecipeId(null); }}
                  className="my-1.5"
                />
              </div>

              {/* Glass Transmission */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70">Transmission (Glassiness)</span>
                  <span className="font-mono text-muted-foreground">{transmission.toFixed(2)}</span>
                </div>
                <Slider 
                  value={[transmission]} 
                  min={0.0} 
                  max={1.0} 
                  step={0.05} 
                  onValueChange={(val) => { setTransmission((val as number[])[0]); setActiveRecipeId(null); }}
                  className="my-1.5"
                />
              </div>

              {/* Glowing intensity */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70">Emissive Neon Glow</span>
                  <span className="font-mono text-muted-foreground">{emissiveIntensity.toFixed(1)}x</span>
                </div>
                <Slider 
                  value={[emissiveIntensity]} 
                  min={0.0} 
                  max={5.0} 
                  step={0.1} 
                  onValueChange={(val) => { setEmissiveIntensity((val as number[])[0]); setActiveRecipeId(null); }}
                  className="my-1.5"
                />
              </div>
            </div>
          )}

          {/* Unified 3D Geometry Panel */}
          <div className="flex flex-col gap-3.5 border-b border-zinc-800 pb-4 bg-zinc-950/20 p-4 rounded-2xl border border-zinc-800/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-white">3D Shape Volume & Bevel</span>
              </div>
              <span className="text-[8.5px] text-zinc-500 font-semibold uppercase tracking-wider">Mesh Contours</span>
            </div>

            {/* Volume Thickness (Extrusion Depth) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="text-white/80">3D Extrusion Depth</span>
                  {tracks[1].keyframes.length > 0 && (
                    <span className="inline-flex items-center text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse shrink-0">
                      • KEYFRAMES ACTIVE
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-md px-1.5 py-0.5 max-w-[70px] shadow-inner">
                  <input
                    type="number"
                    min="0.1"
                    max="10.0"
                    step="0.05"
                    value={Number((tracks[1].keyframes.length > 0 ? activeExtrusionDepth : extrusionDepth).toFixed(2))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        handleAnimatedSliderChange('extrusion', val, setExtrusionDepth);
                        setActiveRecipeId(null);
                      }
                    }}
                    className="w-full bg-transparent font-mono text-[10px] text-white outline-none border-0 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[9px] text-muted-foreground/60">x</span>
                </div>
              </div>
              <span className="text-[9.5px] text-muted-foreground/50 leading-none -mt-0.5">
                Controls the depth of extruded sides along the Z axis
              </span>
              <Slider
                value={[tracks[1].keyframes.length > 0 ? activeExtrusionDepth : extrusionDepth]}
                min={0.2}
                max={3.0}
                step={0.05}
                onValueChange={(val) => {
                  handleAnimatedSliderChange('extrusion', (val as number[])[0], setExtrusionDepth);
                  setActiveRecipeId(null);
                }}
                className={`my-1.5 transition-all ${
                  tracks[1].keyframes.length > 0
                    ? '[&_[data-slot=slider-range]]:bg-emerald-500 [&_[data-slot=slider-thumb]]:border-emerald-500 [&_[data-slot=slider-range]]:shadow-[0_0_8px_rgba(16,185,129,0.4)] [&_[data-slot=slider-thumb]]:shadow-[0_0_8px_#10b981]'
                    : ''
                }`}
              />
            </div>

            {/* Layer spacing */}
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-white/80">Multi-Layer Z Spacing</span>
                <span className="font-mono text-muted-foreground text-[10px]">{layerSpacing.toFixed(2)}px</span>
              </div>
              <span className="text-[9.5px] text-muted-foreground/50 leading-none -mt-0.5">
                Adjusts distance between overlapping visual contour layers
              </span>
              <Slider
                value={[layerSpacing]}
                min={0.0}
                max={2.0}
                step={0.05}
                onValueChange={(val) => { setLayerSpacing((val as number[])[0]); setActiveRecipeId(null); }}
                className="my-1.5"
              />
            </div>

            {/* Bevel Settings */}
            <div className="grid grid-cols-2 gap-2 text-xs mt-1.5">
              <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-3 shadow-sm text-white/90">
                <div className="flex flex-col">
                  <span className="font-bold text-[10.5px]">Beveled Edges</span>
                  <span className="text-[9px] text-muted-foreground/60">Smoothed boundaries</span>
                </div>
                <Switch
                  checked={bevelEnabled}
                  onCheckedChange={(val) => {
                    setBevelEnabled(val);
                    setActiveRecipeId(null);
                  }}
                  size="sm"
                />
              </div>
              <div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl p-2.5">
                <span className="text-[9px] uppercase font-bold text-muted-foreground/60 px-1">
                  Bevel Segments
                </span>
                <input 
                  type="number" min="1" max="10" 
                  value={bevelSegments} onChange={(e) => { setBevelSegments(parseInt(e.target.value) || 1); setActiveRecipeId(null); }}
                  className="bg-transparent text-xs font-semibold outline-none border-0 text-white px-1 mt-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
          </div>

          {/* Transition Motion Configuration */}
          <div className="flex flex-col gap-3.5 border-b border-zinc-800 pb-4 bg-zinc-950/20 p-4 rounded-2xl border border-zinc-800/40">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-white">Transition Shape Morphs</span>
            </div>

            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                <button
                  type="button"
                  onClick={() => { setTransitionType('none'); setActiveRecipeId(null); }}
                  className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-md transition-all ${
                    transitionType === 'none' 
                      ? 'bg-zinc-850 text-white shadow-sm font-bold' 
                      : 'text-muted-foreground hover:text-white'
                  }`}
                >
                  Dissolve
                </button>
                <button
                  type="button"
                  onClick={() => { setTransitionType('wipe'); setActiveRecipeId(null); }}
                  className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-md transition-all ${
                    transitionType === 'wipe' 
                      ? 'bg-zinc-850 text-white shadow-sm font-bold' 
                      : 'text-muted-foreground hover:text-white'
                  }`}
                >
                  Directional Sweep
                </button>
              </div>

              {transitionType === 'wipe' && (
                <div className="flex flex-col gap-3.5 animate-fade-in pt-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Sweep Vector angle</span>
                    <span className="font-mono text-white/80 font-bold bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5">
                      {wipeDirection.x === 0 && wipeDirection.y === 0 
                        ? 'Radial Center' 
                        : `V = (${wipeDirection.x.toFixed(2)}, ${wipeDirection.y.toFixed(2)})`}
                    </span>
                  </div>

                  {/* Circular Vector Compass D-Pad widget */}
                  <div className="relative w-44 h-44 mx-auto bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-full flex items-center justify-center p-3 shadow-inner">
                    {/* Subtle design guide lines */}
                    <div className="absolute inset-4 border border-dashed border-zinc-800/60 rounded-full pointer-events-none" />
                    <div className="absolute w-[1px] h-full bg-zinc-800/30 left-1/2 -translate-x-1/2 top-0 pointer-events-none" />
                    <div className="absolute h-[1px] w-full bg-zinc-800/30 top-1/2 -translate-y-1/2 left-0 pointer-events-none" />

                    <div className="grid grid-cols-3 gap-2 w-full h-full relative z-10">
                      {directions.map((dir) => {
                        const isActive = wipeDirection.x === dir.x && wipeDirection.y === dir.y;
                        return (
                          <button
                            key={dir.label}
                            type="button"
                            onClick={() => { setWipeDirection({ x: dir.x, y: dir.y }); setActiveRecipeId(null); }}
                            className={`rounded-xl flex items-center justify-center border transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer hover:z-20 ${
                              isActive
                                ? 'bg-zinc-100 border-zinc-50 text-zinc-950 shadow-[0_0_15px_rgba(255,255,255,0.15)] font-bold scale-105'
                                : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-50 hover:border-zinc-700'
                            }`}
                            title={dir.tooltip}
                          >
                            {getDirectionIcon(dir.label, `w-4.5 h-4.5 ${isActive ? 'stroke-[2.5px]' : ''}`)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Camera & Studio Lighting Panel */}
          <div className="flex flex-col gap-3.5 pb-4 bg-zinc-950/20 p-4 rounded-2xl border border-zinc-800/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-white">Camera & Studio Lighting</span>
              </div>
              <span className="text-[8.5px] text-zinc-500 font-semibold uppercase tracking-wider">Viewport Settings</span>
            </div>

            {/* Auto-Rotation Spin */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="text-white/80">Auto-Rotation Y-Spin</span>
                  {tracks[2].keyframes.length > 0 && (
                    <span className="inline-flex items-center text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse shrink-0">
                      • KEYFRAMES ACTIVE
                    </span>
                  )}
                </div>
                <span className="font-mono text-muted-foreground text-[10px] bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5">
                  {(tracks[2].keyframes.length > 0 ? activeRotationSpeedY : rotationSpeed.y).toFixed(2)} rad/s
                </span>
              </div>
              <span className="text-[9.5px] text-muted-foreground/50 leading-none -mt-0.5">
                Sets the speed of the shape spinning horizontally
              </span>
              <Slider
                value={[tracks[2].keyframes.length > 0 ? activeRotationSpeedY : rotationSpeed.y]}
                min={0.0}
                max={2.0}
                step={0.05}
                onValueChange={(val) => {
                  handleAnimatedSliderChange('rotation', (val as number[])[0], (v) => setRotationSpeed(prev => ({ ...prev, y: v })));
                  setActiveRecipeId(null);
                }}
                className={`my-1.5 transition-all ${
                  tracks[2].keyframes.length > 0
                    ? '[&_[data-slot=slider-range]]:bg-emerald-500 [&_[data-slot=slider-thumb]]:border-emerald-500 [&_[data-slot=slider-range]]:shadow-[0_0_8px_rgba(16,185,129,0.4)] [&_[data-slot=slider-thumb]]:shadow-[0_0_8px_#10b981]'
                    : ''
                }`}
              />
            </div>

            {/* Studio Key Light Power */}
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="text-white/80">Studio Key Light Power</span>
                  {tracks[3].keyframes.length > 0 && (
                    <span className="inline-flex items-center text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse shrink-0">
                      • KEYFRAMES ACTIVE
                    </span>
                  )}
                </div>
                <span className="font-mono text-muted-foreground text-[10px] bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5">
                  {(tracks[3].keyframes.length > 0 ? activeKeyLightIntensity : keyLightIntensity).toFixed(1)}W
                </span>
              </div>
              <span className="text-[9.5px] text-muted-foreground/50 leading-none -mt-0.5">
                Adjusts intensity of the primary directional spotlight
              </span>
              <Slider
                value={[tracks[3].keyframes.length > 0 ? activeKeyLightIntensity : keyLightIntensity]}
                min={0.0}
                max={3.0}
                step={0.1}
                onValueChange={(val) => {
                  handleAnimatedSliderChange('lighting', (val as number[])[0], setKeyLightIntensity);
                  setActiveRecipeId(null);
                }}
                className={`my-1.5 transition-all ${
                  tracks[3].keyframes.length > 0
                    ? '[&_[data-slot=slider-range]]:bg-emerald-500 [&_[data-slot=slider-thumb]]:border-emerald-500 [&_[data-slot=slider-range]]:shadow-[0_0_8px_rgba(16,185,129,0.4)] [&_[data-slot=slider-thumb]]:shadow-[0_0_8px_#10b981]'
                    : ''
                }`}
              />
            </div>

            {/* Lens Zoom Magnify */}
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-white/80">Lens Zoom Magnify</span>
                <span className="font-mono text-muted-foreground text-[10px] bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5">
                  {zoom.toFixed(2)}x
                </span>
              </div>
              <span className="text-[9.5px] text-muted-foreground/50 leading-none -mt-0.5">
                Closer zoom shows fine surface texture reflections
              </span>
              <Slider
                value={[zoom]}
                min={0.5}
                max={2.0}
                step={0.1}
                onValueChange={(val) => { setZoom((val as number[])[0]); setActiveRecipeId(null); }}
                className="my-1.5"
              />
            </div>
          </div>

        </div>

      </div>

      {/* =========================================================================
          3. KEYFRAME TIMELINE Scrubber
          ========================================================================= */}
      <div className={`transition-all duration-500 ease-in-out shrink-0 overflow-hidden ${zenMode ? 'h-0 border-t-0' : 'h-[240px] border-t border-zinc-800 bg-zinc-950'}`}>
        <Timeline
          duration={duration}
          currentTime={currentTime}
          isPlaying={isPlaying}
          onTimeChange={setCurrentTime}
          onPlayToggle={handlePlayToggle}
          onReset={handleReset}
          tracks={tracks}
          onTracksChange={setTracks}
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
