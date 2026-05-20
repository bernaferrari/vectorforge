import { MaterialPresetId } from '../3d/MaterialPresets';
import { TimelineTrack } from './Timeline';

export interface MotionRecipe {
  id: string;
  name: string;
  description: string;
  emoji: string;
  tag: string;
  
  // Design properties
  materialPreset: MaterialPresetId;
  enableGradient: boolean;
  colorA: string;
  colorASecondary: string;
  colorB: string;
  colorBSecondary: string;
  
  roughness: number;
  metalness: number;
  clearcoat: number;
  transmission: number;
  emissiveIntensity: number;
  
  extrusionDepth: number;
  bevelEnabled: boolean;
  bevelThickness: number;
  bevelSize: number;
  bevelSegments: number;
  layerSpacing: number;
  
  transitionType: 'none' | 'wipe';
  wipeDirection: { x: number; y: number };
  
  rotationSpeed: { x: number; y: number; z: number };
  keyLightIntensity: number;
  
  // Custom pre-configured timeline tracks
  tracks: TimelineTrack[];
}

export const MOTION_RECIPES: MotionRecipe[] = [
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
    roughness: 0.1,
    metalness: 0.0,
    clearcoat: 1.0,
    transmission: 0.9,
    emissiveIntensity: 0.0,
    extrusionDepth: 1.1,
    bevelEnabled: true,
    bevelThickness: 0.14,
    bevelSize: 0.07,
    bevelSegments: 4,
    layerSpacing: 0.7,
    transitionType: 'wipe',
    wipeDirection: { x: 0, y: 0 }, // Cinematic cross-fade
    rotationSpeed: { x: 0.1, y: 0.4, z: 0 },
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
        max: 3.0,
        defaultValue: 1.1,
        keyframes: [
          { id: 'kf-sg-e1', time: 0.6, value: 1.1, easing: 'spring' },
          { id: 'kf-sg-e2', time: 2.4, value: 2.2, easing: 'spring' },
          { id: 'kf-sg-e3', time: 4.2, value: 1.1, easing: 'spring' }
        ]
      },
      {
        id: 'rotation',
        name: 'Spin',
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
        max: 3.0,
        defaultValue: 1.3,
        keyframes: []
      }
    ]
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Vaporwave',
    description: 'Glowing neon pulse with bold retro energy.',
    emoji: '⚡',
    tag: 'NEON',
    materialPreset: 'glow',
    enableGradient: true,
    colorA: '#7b2cbf',
    colorASecondary: '#ff007f',
    colorB: '#ffb703',
    colorBSecondary: '#fb8500',
    roughness: 0.45,
    metalness: 0.3,
    clearcoat: 0.0,
    transmission: 0.0,
    emissiveIntensity: 2.5,
    extrusionDepth: 1.4,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.08,
    bevelSegments: 3,
    layerSpacing: 0.9,
    transitionType: 'wipe',
    wipeDirection: { x: 1, y: 0 }, // Left to Right
    rotationSpeed: { x: 0.15, y: 0.6, z: 0 },
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
        max: 3.0,
        defaultValue: 1.4,
        keyframes: []
      },
      {
        id: 'rotation',
        name: 'Spin',
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
        max: 3.0,
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
    id: 'liquid-gold',
    name: 'Liquid Gold Sweep',
    description: 'Rich metallic gold with a smooth directional sweep.',
    emoji: '🏆',
    tag: 'PREMIUM',
    materialPreset: 'gold',
    enableGradient: false,
    colorA: '#ffd700',
    colorASecondary: '#ffd700',
    colorB: '#ffc837',
    colorBSecondary: '#ffc837',
    roughness: 0.18,
    metalness: 0.95,
    clearcoat: 0.5,
    transmission: 0.0,
    emissiveIntensity: 0.0,
    extrusionDepth: 1.2,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.06,
    bevelSegments: 5,
    layerSpacing: 0.75,
    transitionType: 'wipe',
    wipeDirection: { x: 0.707, y: -0.707 }, // Bottom Right to Top Left
    rotationSpeed: { x: 0.05, y: 0.35, z: 0 },
    keyLightIntensity: 1.8,
    tracks: [
      {
        id: 'transition',
        name: 'Morph',
        color: '#ffd700',
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
        max: 3.0,
        defaultValue: 1.2,
        keyframes: [
          { id: 'kf-lg-e1', time: 1.0, value: 1.2, easing: 'ease-in-out' },
          { id: 'kf-lg-e2', time: 2.5, value: 0.6, easing: 'ease-in-out' },
          { id: 'kf-lg-e3', time: 4.0, value: 1.2, easing: 'ease-in-out' }
        ]
      },
      {
        id: 'rotation',
        name: 'Spin Speed Y',
        color: '#a48bff',
        min: 0.0,
        max: 2.0,
        defaultValue: 0.35,
        keyframes: []
      },
      {
        id: 'lighting',
        name: 'Light',
        color: '#fb8500',
        min: 0.0,
        max: 3.0,
        defaultValue: 1.8,
        keyframes: []
      }
    ]
  }
];
