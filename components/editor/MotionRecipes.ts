import { MaterialPresetId } from '../3d/MaterialPresets';
import { FillGradientType, TimelineTrack } from './Timeline';

export interface MotionRecipe {
  id: string;
  name: string;
  description: string;
  emoji: string;
  tag: string;
  
  // Design properties
  materialPreset: MaterialPresetId;
  enableGradient: boolean;
  fillGradientType?: FillGradientType;
  colorA: string;
  colorASecondary: string;
  colorB: string;
  colorBSecondary: string;
  
  roughness: number;
  metalness: number;
  reflectance?: number;
  clearcoat: number;
  clearcoatRoughness?: number;
  transmission: number;
  thickness?: number;
  emissiveIntensity: number;
  
  extrusionDepth: number;
  bevelEnabled: boolean;
  bevelThickness: number;
  bevelSize: number;
  bevelSegments: number;
  geometryQuality?: number;
  layerSpacing: number;
  translateX?: number;
  translateY?: number;
  translateZ?: number;
  
  transitionType: 'none' | 'wipe';
  wipeDirection: { x: number; y: number };

  keyLightIntensity: number;
  
  // Custom pre-configured timeline tracks
  tracks: TimelineTrack[];
}

export const MOTION_RECIPES: MotionRecipe[] = [
  {
    id: 'google-metal',
    name: 'Google Metal',
    description: 'Google-style mesh color with a bright studio metal finish.',
    emoji: 'G',
    tag: 'GOOGLE',
    materialPreset: 'chrome',
    enableGradient: true,
    fillGradientType: 'mesh',
    colorA: '#4285F4',
    colorASecondary: '#00C796',
    colorB: '#FF9900',
    colorBSecondary: '#D13AB3',
    roughness: 0.075,
    metalness: 0.48,
    reflectance: 1.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    transmission: 0.0,
    thickness: 0.4,
    emissiveIntensity: 0.08,
    extrusionDepth: 10,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.06,
    bevelSegments: 4,
    geometryQuality: 0.045,
    layerSpacing: 0.16,
    translateY: -2,
    transitionType: 'wipe',
    wipeDirection: { x: 0.707, y: -0.707 },
    keyLightIntensity: 1.08,
    tracks: [
      {
        id: 'transition',
        name: 'Morph',
        color: '#4285F4',
        min: 0,
        max: 1.0,
        defaultValue: 0.0,
        keyframes: []
      },
      {
        id: 'extrusion',
        name: 'Depth',
        color: '#00C796',
        min: 0.2,
        max: 20,
        defaultValue: 10,
        keyframes: []
      },
      {
        id: 'rotation',
        name: 'Rotation',
        color: '#807AFF',
        min: 0,
        max: 360,
        defaultValue: 0,
        keyframes: [
          { id: 'kf-google-r1', time: 0, value: 356, easing: 'spring' },
          { id: 'kf-google-r2', time: 2.6, value: 360, easing: 'ease-in-out' },
        ]
      },
      {
        id: 'scale',
        name: 'Scale',
        color: '#FF9900',
        min: 0.1,
        max: 4,
        defaultValue: 1,
        keyframes: [
          { id: 'kf-google-s1', time: 0, value: 1.0, easing: 'spring' },
          { id: 'kf-google-s2', time: 1.35, value: 0.92, easing: 'spring' },
          { id: 'kf-google-s3', time: 2.6, value: 1.0, easing: 'ease-in-out' },
        ]
      },
      {
        id: 'lighting',
        name: 'Light',
        color: '#FFC700',
        min: 0.0,
        max: 10,
        defaultValue: 1.08,
        keyframes: []
      }
    ]
  },
  {
    id: 'spring-glass',
    name: 'Spring Glass Pulse',
    description: 'Smooth glass-like bounce with soft pastel tones.',
    emoji: '🌸',
    tag: 'ELEGANT',
    materialPreset: 'glass',
    enableGradient: true,
    colorA: '#ff5c93',
    colorASecondary: '#8a2be2',
    colorB: '#00f5ff',
    colorBSecondary: '#00ff7f',
    roughness: 0.12,
    metalness: 0.0,
    clearcoat: 1.0,
    transmission: 0.38,
    emissiveIntensity: 0.0,
    extrusionDepth: 10,
    bevelEnabled: true,
    bevelThickness: 0.14,
    bevelSize: 0.07,
    bevelSegments: 4,
    layerSpacing: 0.7,
    transitionType: 'wipe',
    wipeDirection: { x: 0, y: 0 }, // Cinematic cross-fade
    keyLightIntensity: 1.3,
    tracks: [
      {
        id: 'transition',
        name: 'Morph',
        color: '#ff5c93',
        min: 0,
        max: 1.0,
        defaultValue: 0.0,
        keyframes: [
          { id: 'kf-sg-t1', time: 0.6, value: 0.0, easing: 'spring' },
          { id: 'kf-sg-t2', time: 4.2, value: 1.0, easing: 'spring' }
        ]
      },
      {
        id: 'extrusion',
        name: 'Depth',
        color: '#00f5ff',
        min: 0.2,
        max: 20,
        defaultValue: 10,
        keyframes: [
          { id: 'kf-sg-e1', time: 0.6, value: 10, easing: 'spring' },
          { id: 'kf-sg-e2', time: 2.4, value: 12, easing: 'spring' },
          { id: 'kf-sg-e3', time: 4.2, value: 10, easing: 'spring' }
        ]
      },
      {
        id: 'rotation',
        name: 'Rotation',
        color: '#ffd23f',
        min: 0.0,
        max: 2.0,
        defaultValue: 0.4,
        keyframes: [
          { id: 'kf-sg-r1', time: 0.6, value: 0.3, easing: 'ease-in-out' },
          { id: 'kf-sg-r2', time: 2.4, value: 1.4, easing: 'ease-in-out' },
          { id: 'kf-sg-r3', time: 4.2, value: 0.3, easing: 'ease-in-out' }
        ]
      },
      {
        id: 'lighting',
        name: 'Light',
        color: '#ff5b9a',
        min: 0.0,
        max: 10,
        defaultValue: 1.3,
        keyframes: []
      }
    ]
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Vaporwave',
    description: 'Glossy color pulse with bold retro energy.',
    emoji: '⚡',
    tag: 'NEON',
    materialPreset: 'lacquer',
    enableGradient: true,
    colorA: '#7b2cbf',
    colorASecondary: '#ff007f',
    colorB: '#ffb703',
    colorBSecondary: '#fb8500',
    roughness: 0.45,
    metalness: 0.3,
    clearcoat: 0.0,
    transmission: 0.0,
    emissiveIntensity: 0.04,
    extrusionDepth: 10,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.08,
    bevelSegments: 3,
    layerSpacing: 0.9,
    transitionType: 'wipe',
    wipeDirection: { x: 1, y: 0 }, // Left to Right
    keyLightIntensity: 1.0,
    tracks: [
      {
        id: 'transition',
        name: 'Morph',
        color: '#ff007f',
        min: 0,
        max: 1.0,
        defaultValue: 0.0,
        keyframes: [
          { id: 'kf-cp-t1', time: 0.8, value: 0.0, easing: 'ease-in-out' },
          { id: 'kf-cp-t2', time: 3.8, value: 1.0, easing: 'ease-in-out' }
        ]
      },
      {
        id: 'extrusion',
        name: 'Depth',
        color: '#ffb703',
        min: 0.2,
        max: 20,
        defaultValue: 10,
        keyframes: []
      },
      {
        id: 'rotation',
        name: 'Rotation',
        color: '#a48bff',
        min: 0.0,
        max: 2.0,
        defaultValue: 0.6,
        keyframes: [
          { id: 'kf-cp-r1', time: 0.8, value: 0.6, easing: 'bounce' },
          { id: 'kf-cp-r2', time: 3.8, value: 1.8, easing: 'bounce' }
        ]
      },
      {
        id: 'lighting',
        name: 'Light',
        color: '#00ff7f',
        min: 0.0,
        max: 10,
        defaultValue: 1.0,
        keyframes: [
          { id: 'kf-cp-l1', time: 0.8, value: 0.8, easing: 'ease-in-out' },
          { id: 'kf-cp-l2', time: 2.3, value: 2.6, easing: 'ease-in-out' },
          { id: 'kf-cp-l3', time: 3.8, value: 0.8, easing: 'ease-in-out' }
        ]
      }
    ]
  },
  {
    id: 'pearl-shift',
    name: 'Pearl Shift',
    description: 'Soft iridescent ceramic with a polished directional sweep.',
    emoji: 'P',
    tag: 'SOFT',
    materialPreset: 'pearl',
    enableGradient: true,
    colorA: '#FDF4FF',
    colorASecondary: '#BAE6FD',
    colorB: '#E9D5FF',
    colorBSecondary: '#F8FAFC',
    roughness: 0.42,
    metalness: 0.0,
    reflectance: 0.86,
    clearcoat: 0.72,
    clearcoatRoughness: 0.22,
    transmission: 0.0,
    thickness: 0.6,
    emissiveIntensity: 0.035,
    extrusionDepth: 10,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.06,
    bevelSegments: 5,
    layerSpacing: 0.75,
    transitionType: 'wipe',
    wipeDirection: { x: 0.707, y: -0.707 }, // Bottom Right to Top Left
    keyLightIntensity: 1.8,
    tracks: [
      {
        id: 'transition',
        name: 'Morph',
        color: '#d8b4fe',
        min: 0,
        max: 1.0,
        defaultValue: 0.0,
        keyframes: [
          { id: 'kf-lg-t1', time: 1.0, value: 0.0, easing: 'bounce' },
          { id: 'kf-lg-t2', time: 4.0, value: 1.0, easing: 'bounce' }
        ]
      },
      {
        id: 'extrusion',
        name: 'Depth',
        color: '#ffffff',
        min: 0.2,
        max: 20,
        defaultValue: 10,
        keyframes: [
          { id: 'kf-lg-e1', time: 1.0, value: 10, easing: 'ease-in-out' },
          { id: 'kf-lg-e2', time: 2.5, value: 8, easing: 'ease-in-out' },
          { id: 'kf-lg-e3', time: 4.0, value: 10, easing: 'ease-in-out' }
        ]
      },
      {
        id: 'rotation',
        name: 'Rotation',
        color: '#a48bff',
        min: 0.0,
        max: 2.0,
        defaultValue: 0.35,
        keyframes: []
      },
      {
        id: 'lighting',
        name: 'Light',
        color: '#bae6fd',
        min: 0.0,
        max: 10,
        defaultValue: 1.8,
        keyframes: []
      }
    ]
  }
];
