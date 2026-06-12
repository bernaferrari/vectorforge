import {
  escapeTemplateSvg,
  type ExportCodeTemplateParams,
} from "./ExportCodeTemplateModel"
import { shapeTransitionType } from "./TimelineModel"

const safeJson = (value: unknown) =>
  JSON.stringify(value, null, 2).replace(/</g, "\\u003c")

export const generateR3fCode = ({
  duration,
  shapes,
  tracks,
  rotationOffset,
  rotationAxisKeyframes,
  objectScale,
  objectScaleAxes,
  moveOffset,
  moveKeyframes,
  fillKeyframes,
  materialSettings,
  materialKeyframes,
  materialPreset,
  colorA,
  colorB,
  roughness,
  metalness,
  reflectance,
  clearcoat,
  clearcoatRoughness,
  transmission,
  thickness,
  emissiveIntensity,
  extrusionDepth,
  bevelEnabled,
  bevelThickness,
  bevelSize,
  bevelSegments,
  layerSpacing,
  ambientIntensity,
  keyLightIntensity,
  rimLightIntensity,
  svgPathA,
  svgPathB,
}: ExportCodeTemplateParams) => {
  const exportShapes =
    shapes.length > 0
      ? shapes.map((shape) => ({
          id: shape.id,
          time: shape.time,
          name: shape.iconName ?? shape.iconId,
          svgContent: shape.svgContent,
          easing: shape.easing,
          transitionType: shapeTransitionType(shape),
          transitionStart: shape.transitionStart ?? 0.25,
          transitionEnd: shape.transitionEnd ?? 0.75,
        }))
      : [
          {
            id: "shape-a",
            time: 0,
            name: "Shape A",
            svgContent: escapeTemplateSvg(svgPathA),
            easing: "ease-in-out",
            transitionType: "fade",
            transitionStart: 0.25,
            transitionEnd: 0.75,
          },
          {
            id: "shape-b",
            time: duration,
            name: "Shape B",
            svgContent: escapeTemplateSvg(svgPathB),
            easing: "ease-in-out",
            transitionType: "fade",
            transitionStart: 0.25,
            transitionEnd: 0.75,
          },
        ]

  const animation = {
    duration,
    tracks,
    extrusionDepth,
    rotationOffset,
    rotationAxisKeyframes,
    objectScale,
    objectScaleAxes,
    moveOffset,
    moveKeyframes,
    keyLightIntensity,
  }

  const baseFill = { color: colorA, colorSecondary: colorB }
  const baseMaterial = {
    ...materialSettings,
    roughness,
    metalness,
    reflectance,
    clearcoat,
    clearcoatRoughness,
    transmission,
    thickness,
    emissiveIntensity,
  }

  return `'use client';

import React, { useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Center } from '@react-three/drei';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';

type EasingType = 'linear' | 'ease-in-out' | 'spring' | 'bounce';
type Vec3 = { x: number; y: number; z: number };
type ScalarKeyframe = { id: string; time: number; value: number; easing: EasingType };
type VectorKeyframe = { id: string; time: number; value: Vec3; easing: EasingType };
type TimelineTrack = { id: string; defaultValue: number; keyframes: ScalarKeyframe[] };
type FillKeyframe = {
  id: string;
  time: number;
  stops: Array<{ color: string; position: number }>;
  gradientType?: string;
  easing: EasingType;
};
type ShapeStop = {
  id: string;
  time: number;
  name?: string;
  svgContent: string;
  easing: EasingType;
  transitionType: 'cut' | 'fade' | 'wipe';
  transitionStart?: number;
  transitionEnd?: number;
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
type MaterialKeyframe = {
  id: string;
  time: number;
  value: MaterialSettings;
  easing: EasingType;
};
type MotionState = {
  time: number;
  fromId: string;
  toId: string;
  progress: number;
  extrusionDepth: number;
  rotation: Vec3;
  move: Vec3;
  scale: number;
  scaleAxes: Vec3;
  keyLightIntensity: number;
  fill: { color: string; colorSecondary: string };
  material: MaterialSettings;
};

const SHAPES: ShapeStop[] = ${safeJson(exportShapes)};
const BASE_FILL = ${safeJson(baseFill)};
const FILL_KEYFRAMES: FillKeyframe[] = ${safeJson(fillKeyframes)};
const BASE_MATERIAL: MaterialSettings = ${safeJson(baseMaterial)};
const MATERIAL_KEYFRAMES: MaterialKeyframe[] = ${safeJson(materialKeyframes)};
const ANIMATION: {
  duration: number;
  tracks: TimelineTrack[];
  extrusionDepth: number;
  rotationOffset: Vec3;
  rotationAxisKeyframes: VectorKeyframe[];
  objectScale: number;
  objectScaleAxes?: Vec3;
  moveOffset: Vec3;
  moveKeyframes: VectorKeyframe[];
  keyLightIntensity: number;
} = ${safeJson(animation)};
const ICON_VIEWBOX_SIZE = 24;
const MODEL_SCALE = 0.12;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const extractSvgInner = (svgContent: string) =>
  svgContent
    .replace(/^<svg[^>]*>/i, '')
    .replace(/<\\/svg>\\s*$/i, '')
    .trim();

const normalizeSvgToIconViewBox = (svgContent: string) => {
  const viewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/i);
  if (!viewBoxMatch) return svgContent;

  const [minX, minY, width, height] = viewBoxMatch[1]
    .trim()
    .split(/[\\s,]+/)
    .map(Number);
  if (
    ![minX, minY, width, height].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0
  ) {
    return svgContent;
  }

  if (minX === 0 && minY === 0 && width === ICON_VIEWBOX_SIZE && height === ICON_VIEWBOX_SIZE) {
    return svgContent;
  }

  const scaleX = ICON_VIEWBOX_SIZE / width;
  const scaleY = ICON_VIEWBOX_SIZE / height;
  const translateX = -minX * scaleX;
  const translateY = -minY * scaleY;

  return \`<svg viewBox="0 0 \${ICON_VIEWBOX_SIZE} \${ICON_VIEWBOX_SIZE}"><g transform="matrix(\${scaleX} 0 0 \${scaleY} \${translateX} \${translateY})">\${extractSvgInner(svgContent)}</g></svg>\`;
};

const applyEasing = (easing: EasingType, t: number) => {
  if (easing === 'ease-in-out') return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  if (easing === 'spring') {
    if (t === 0 || t === 1) return t;
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }
  if (easing === 'bounce') {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
  return t;
};

const keyframePair = <T extends { time: number }>(time: number, keyframes: T[]) => {
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  if (sorted.length === 0) return null;
  if (time <= sorted[0].time) return { previous: sorted[0], next: sorted[0], progress: 0 };
  if (time >= sorted[sorted.length - 1].time) {
    const last = sorted[sorted.length - 1];
    return { previous: last, next: last, progress: 1 };
  }
  for (let index = 0; index < sorted.length - 1; index++) {
    const previous = sorted[index];
    const next = sorted[index + 1];
    if (time >= previous.time && time <= next.time) {
      return {
        previous,
        next,
        progress: (time - previous.time) / Math.max(1e-6, next.time - previous.time),
      };
    }
  }
  const last = sorted[sorted.length - 1];
  return { previous: last, next: last, progress: 1 };
};

const interpolateTrack = (time: number, trackId: string, fallback: number) => {
  const track = ANIMATION.tracks.find((candidate) => candidate.id === trackId);
  const keyframes = track?.keyframes ?? [];
  const pair = keyframePair(time, keyframes);
  if (!pair) return track?.defaultValue ?? fallback;
  if (pair.previous === pair.next) return pair.previous.value;
  const eased = applyEasing(pair.previous.easing, pair.progress);
  return pair.previous.value + (pair.next.value - pair.previous.value) * eased;
};

const interpolateVector = (time: number, fallback: Vec3, keyframes: VectorKeyframe[]) => {
  const pair = keyframePair(time, keyframes);
  if (!pair) return fallback;
  if (pair.previous === pair.next) return pair.previous.value;
  const eased = applyEasing(pair.previous.easing, pair.progress);
  return {
    x: pair.previous.value.x + (pair.next.value.x - pair.previous.value.x) * eased,
    y: pair.previous.value.y + (pair.next.value.y - pair.previous.value.y) * eased,
    z: pair.previous.value.z + (pair.next.value.z - pair.previous.value.z) * eased,
  };
};

const parseHexColor = (value: string) => {
  const hex = value.trim().replace(/^#/, '');
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
  return \`#\${channel(r)}\${channel(g)}\${channel(b)}\`;
};

const interpolateColor = (a: string, b: string, t: number) => {
  const from = parseHexColor(a);
  const to = parseHexColor(b);
  if (!from || !to) return a;
  return toHexColor({
    r: from.r + (to.r - from.r) * t,
    g: from.g + (to.g - from.g) * t,
    b: from.b + (to.b - from.b) * t,
  });
};

const interpolateFill = (time: number) => {
  const keyframes = [...FILL_KEYFRAMES].sort((a, b) => a.time - b.time);
  const pair = keyframePair(time, keyframes);
  if (!pair) return BASE_FILL;
  const colorAt = (keyframe: any, index: number, fallback: string) =>
    keyframe?.stops?.[index]?.color ?? keyframe?.stops?.[0]?.color ?? fallback;
  if (pair.previous === pair.next) {
    return {
      color: colorAt(pair.previous, 0, BASE_FILL.color),
      colorSecondary: colorAt(pair.previous, 1, BASE_FILL.colorSecondary),
    };
  }
  const eased = applyEasing(pair.previous.easing, pair.progress);
  return {
    color: interpolateColor(
      colorAt(pair.previous, 0, BASE_FILL.color),
      colorAt(pair.next, 0, BASE_FILL.color),
      eased
    ),
    colorSecondary: interpolateColor(
      colorAt(pair.previous, 1, BASE_FILL.colorSecondary),
      colorAt(pair.next, 1, BASE_FILL.colorSecondary),
      eased
    ),
  };
};

const interpolateMaterial = (time: number) => {
  const pair = keyframePair(time, MATERIAL_KEYFRAMES);
  if (!pair) return BASE_MATERIAL;
  if (pair.previous === pair.next) return pair.previous.value;
  const eased = applyEasing(pair.previous.easing, pair.progress);
  return Object.keys(BASE_MATERIAL).reduce((settings, key) => {
    const materialKey = key as keyof MaterialSettings;
    settings[materialKey] =
      pair.previous.value[materialKey] +
      (pair.next.value[materialKey] - pair.previous.value[materialKey]) * eased;
    return settings;
  }, { ...BASE_MATERIAL });
};

const deriveShapePair = (time: number) => {
  const sorted = [...SHAPES].sort((a, b) => a.time - b.time);
  if (sorted.length === 0) return { fromId: '', toId: '', progress: 0 };
  if (sorted.length === 1) return { fromId: sorted[0].id, toId: sorted[0].id, progress: 0 };
  if (time <= sorted[0].time) return { fromId: sorted[0].id, toId: sorted[1].id, progress: 0 };
  if (time >= sorted[sorted.length - 1].time) {
    return {
      fromId: sorted[sorted.length - 2].id,
      toId: sorted[sorted.length - 1].id,
      progress: 1,
    };
  }

  let index = 0;
  while (
    index < sorted.length - 1 &&
    !(time >= sorted[index].time && time <= sorted[index + 1].time)
  ) {
    index++;
  }

  const from = sorted[index];
  const to = sorted[index + 1];
  const gap = Math.max(1e-6, to.time - from.time);
  const gapProgress = (time - from.time) / gap;
  const start = from.transitionStart ?? 0.25;
  const end = from.transitionEnd ?? 0.75;
  const windowProgress =
    gapProgress <= start ? 0 : gapProgress >= end ? 1 : (gapProgress - start) / Math.max(1e-6, end - start);
  const progress =
    from.transitionType === 'cut'
      ? gapProgress < start ? 0 : 1
      : clamp01(applyEasing(from.easing, windowProgress));
  return { fromId: from.id, toId: to.id, progress };
};

const evaluateMotion = (time: number): MotionState => {
  const shapePair = deriveShapePair(time);
  return {
    time,
    ...shapePair,
    extrusionDepth: interpolateTrack(time, 'extrusion', ANIMATION.extrusionDepth),
    rotation: interpolateVector(time, ANIMATION.rotationOffset, ANIMATION.rotationAxisKeyframes),
    move: interpolateVector(time, ANIMATION.moveOffset, ANIMATION.moveKeyframes),
    scale: interpolateTrack(time, 'scale', ANIMATION.objectScale),
    scaleAxes: ANIMATION.objectScaleAxes ?? { x: 1, y: 1, z: 1 },
    keyLightIntensity: interpolateTrack(time, 'lighting', ANIMATION.keyLightIntensity),
    fill: interpolateFill(time),
    material: interpolateMaterial(time),
  };
};

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0e0b16' }}>
      <Canvas
        camera={{ position: [0, 0, 15], fov: 40 }}
        shadows
        gl={{ localClippingEnabled: true }}
      >
        <AnimatedScene />
      </Canvas>
    </div>
  );
}

function AnimatedScene() {
  const [motion, setMotion] = useState<MotionState>(() => evaluateMotion(0));

  useFrame(({ clock }) => {
    const duration = Math.max(0.001, ANIMATION.duration);
    setMotion(evaluateMotion(clock.elapsedTime % duration));
  });

  return (
    <>
      <ambientLight intensity={${ambientIntensity}} />
      <directionalLight position={[5, 5, 4]} intensity={motion.keyLightIntensity} castShadow />
      <directionalLight position={[-6, -3, 3]} intensity={${rimLightIntensity}} />
      <Center>
        <ExtrudedIcon motion={motion} />
      </Center>
    </>
  );
}

function buildGeometries(svgContent: string) {
  const loader = new SVGLoader();
  const parsed = loader.parse(normalizeSvgToIconViewBox(svgContent));
  return parsed.paths.flatMap((path, pathIndex) => {
    const shapes = SVGLoader.createShapes(path);
    return shapes.map((shape) => {
      const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: ${extrusionDepth} + pathIndex * ${layerSpacing} * 0.1,
          bevelEnabled: ${bevelEnabled},
          bevelThickness: ${bevelThickness},
          bevelSize: ${bevelSize},
          bevelSegments: ${bevelSegments},
          curveSegments: 16,
      });
      geometry.translate(-ICON_VIEWBOX_SIZE / 2, -ICON_VIEWBOX_SIZE / 2, 0);
      return geometry;
    });
  });
}

function ExtrudedIcon({ motion }: { motion: MotionState }) {
  const geometryByShape = useMemo(() => {
    const map = new Map<string, THREE.ExtrudeGeometry[]>();
    for (const shape of SHAPES) {
      map.set(shape.id, buildGeometries(shape.svgContent));
    }
    return map;
  }, []);

  const materialA = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: motion.fill.color,
        roughness: motion.material.roughness,
        metalness: motion.material.metalness,
        reflectivity: motion.material.reflectance,
        envMapIntensity: motion.material.reflectance,
        clearcoat: motion.material.clearcoat,
        clearcoatRoughness: motion.material.clearcoatRoughness,
        transmission: motion.material.transmission,
        thickness: motion.material.thickness,
        emissive:
          motion.material.emissiveIntensity > 0
            ? new THREE.Color(motion.fill.color)
            : new THREE.Color('#000000'),
        emissiveIntensity: motion.material.emissiveIntensity,
        transparent: true,
        opacity: 1 - motion.progress,
      }),
    [motion]
  );

  const materialB = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: motion.fill.colorSecondary,
        roughness: motion.material.roughness,
        metalness: motion.material.metalness,
        reflectivity: motion.material.reflectance,
        envMapIntensity: motion.material.reflectance,
        clearcoat: motion.material.clearcoat,
        clearcoatRoughness: motion.material.clearcoatRoughness,
        transmission: motion.material.transmission,
        thickness: motion.material.thickness,
        emissive:
          motion.material.emissiveIntensity > 0
            ? new THREE.Color(motion.fill.colorSecondary)
            : new THREE.Color('#000000'),
        emissiveIntensity: motion.material.emissiveIntensity,
        transparent: true,
        opacity: motion.progress,
      }),
    [motion]
  );

  const fromGeometries = geometryByShape.get(motion.fromId) ?? [];
  const toGeometries = geometryByShape.get(motion.toId) ?? fromGeometries;
  const renderIncoming = motion.fromId !== motion.toId && motion.progress > 0;
  const scale = Math.max(0.05, motion.scale);
  const depthScale = Math.max(0.001, motion.extrusionDepth) / Math.max(0.001, ANIMATION.extrusionDepth);

  return (
    <group
      position={[motion.move.x * 0.02, motion.move.y * 0.02, motion.move.z * 0.02]}
      rotation={[
        THREE.MathUtils.degToRad(motion.rotation.x),
        THREE.MathUtils.degToRad(motion.rotation.y),
        THREE.MathUtils.degToRad(motion.rotation.z),
      ]}
      scale={[
        MODEL_SCALE * scale * motion.scaleAxes.x,
        -MODEL_SCALE * scale * motion.scaleAxes.y,
        MODEL_SCALE * scale * motion.scaleAxes.z * depthScale,
      ]}
    >
      {fromGeometries.map((geometry, index) => (
        <mesh key={\`from-\${index}\`} geometry={geometry} material={materialA} castShadow receiveShadow />
      ))}
      {renderIncoming &&
        toGeometries.map((geometry, index) => (
          <mesh key={\`to-\${index}\`} geometry={geometry} material={materialB} castShadow receiveShadow />
        ))}
    </group>
  );
}

// Material tuning based on: ${materialPreset}
`
}
