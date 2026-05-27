'use client';

import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { createThreeMaterial, MaterialPresetId } from './MaterialPresets';
import { createDiagonalWipePlanes } from './DiagonalWipe';
import { isPrimaryButtonReleased } from '@/lib/drag-events';

export interface PathOverride {
  id: string;
  visible: boolean;
  color: string;
  depthMultiplier: number;
}

export interface GradientStop {
  id?: string;
  color: string;
  position: number;
}

export interface SvgCanvasProps {
  iconAContent: string;
  iconBContent: string;
  materialPreset: MaterialPresetId;
  colorA: string;
  colorB: string;
  colorASecondary?: string;
  colorBSecondary?: string;
  colorAStops?: GradientStop[];
  colorBStops?: GradientStop[];
  enableGradient?: boolean;
  gradientType?: 'linear' | 'radial' | 'conic' | 'mesh';
  roughness: number;
  metalness: number;
  reflectance: number;
  clearcoat: number;
  clearcoatRoughness: number;
  transmission: number;
  thickness: number;
  emissiveIntensity: number;
  wireframe: boolean;
  extrusionDepth: number;
  bevelEnabled: boolean;
  bevelThickness: number;
  bevelSize: number;
  bevelSegments: number;
  geometryQuality: number;
  layerSpacing: number;
  innerElementScale: { x: number; y: number; z: number };
  transitionType: 'none' | 'wipe';
  wipeDirection: { x: number; y: number }; // (0,0) means Crossfade / Dissolve
  transitionProgress: number; // 0 to 1
  rotationOffset: { x: number; y: number; z: number };
  objectScale: number;
  moveOffset: { x: number; y: number; z: number };
  isPlaying: boolean;
  ambientColor: string;
  ambientIntensity: number;
  keyLightColor: string;
  keyLightIntensity: number;
  keyLightPosition: { x: number; y: number; z: number };
  keyLightSoftness: number;
  rimLightColor: string;
  rimLightIntensity: number;
  zoom: number;
  viewInertiaEnabled?: boolean;
  showCenterPoint?: boolean;
  pathOverridesA?: PathOverride[];
  pathOverridesB?: PathOverride[];
  onZoomChange?: (zoom: number) => void;
  onViewRotationCommit?: (rotationDelta: { x: number; y: number; z: number }) => void;
  onViewRotationSet?: (rotation: Partial<{ x: number; y: number; z: number }>, options?: { commit?: boolean }) => void;
  onModelReadyChange?: (ready: boolean) => void;
}

export interface SvgCanvasRef {
  exportGltf: () => void;
  startRecording: () => void;
  stopRecording: (callback: (blob: Blob) => void) => void;
  resetRotation: () => void;
}

// Module-level cache for gradient canvas textures to prevent memory leaks
const gradientCache = new Map<string, THREE.CanvasTexture>();
const MODEL_SCALE = 0.12;
const ICON_VIEWBOX_SIZE = 24;
const DEFAULT_VIEWPORT_FRACTION = 0.5;
const CAMERA_FOV = 40;
const MAX_BEVEL_SEGMENTS = 24;
const GIZMO_SNAP_DEGREES = 45;
const SVG_PATH_LAYER_GAP_RATIO = 0.018;
const SVG_PATH_LAYER_GAP_MIN = 0.035;
const VECTORFORGE_SLASH_DEPTH_RATIO = 0.16;
const WIPE_SEAM_OVERLAP_WORLD = 0.8 * MODEL_SCALE;

const applySvgModelScale = (group: THREE.Group) => {
  group.scale.set(MODEL_SCALE, -MODEL_SCALE, MODEL_SCALE);
};

const framedCameraDistance = (camera: THREE.PerspectiveCamera) => {
  const smallerViewportAxis = Math.max(0.2, Math.min(1, camera.aspect));
  const iconWorldSize = ICON_VIEWBOX_SIZE * MODEL_SCALE;
  const targetVisibleWorldSize = iconWorldSize / DEFAULT_VIEWPORT_FRACTION;
  const visibleWorldPerDistance = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * smallerViewportAxis;
  return targetVisibleWorldSize / visibleWorldPerDistance;
};

const normalizeSvgToIconViewBox = (svgContent: string) => {
  const viewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/i);
  if (!viewBoxMatch) return svgContent;

  const [minX, minY, width, height] = viewBoxMatch[1]
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (![minX, minY, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    return svgContent;
  }

  if (minX === 0 && minY === 0 && width === 24 && height === 24) {
    return svgContent;
  }

  const inner = svgContent
    .replace(/^<svg\b[^>]*>/i, '')
    .replace(/<\/svg>\s*$/i, '')
    .trim();
  const scaleX = 24 / width;
  const scaleY = 24 / height;
  const translateX = -minX * scaleX;
  const translateY = -minY * scaleY;

  return `<svg viewBox="0 0 24 24"><g transform="matrix(${scaleX} 0 0 ${scaleY} ${translateX} ${translateY})">${inner}</g></svg>`;
};

const finiteNumber = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const containsInvalidPositions = (geometry: THREE.BufferGeometry) => {
  const position = geometry.getAttribute('position');
  if (!position) return true;
  const values = position.array;
  for (let i = 0; i < values.length; i++) {
    if (!Number.isFinite(values[i])) return true;
  }
  return false;
};

const addMeshVolumeCentroid = (
  geometry: THREE.BufferGeometry,
  matrix: THREE.Matrix4,
  centerAccumulator: THREE.Vector3,
  fallbackBox: THREE.Box3
) => {
  const position = geometry.getAttribute('position');
  if (!position) return 0;

  const index = geometry.getIndex();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const cross = new THREE.Vector3();
  const triangleCenter = new THREE.Vector3();
  let signedVolume = 0;

  const readVertex = (vertexIndex: number, target: THREE.Vector3) => {
    target.fromBufferAttribute(position, vertexIndex).applyMatrix4(matrix);
    if (!Number.isFinite(target.x) || !Number.isFinite(target.y) || !Number.isFinite(target.z)) return false;
    fallbackBox.expandByPoint(target);
    return true;
  };

  const addTriangle = (ia: number, ib: number, ic: number) => {
    if (!readVertex(ia, a) || !readVertex(ib, b) || !readVertex(ic, c)) return;

    const volume = a.dot(cross.crossVectors(b, c)) / 6;
    if (!Number.isFinite(volume) || Math.abs(volume) < 1e-10) return;

    triangleCenter.copy(a).add(b).add(c).multiplyScalar(0.25);
    centerAccumulator.addScaledVector(triangleCenter, volume);
    signedVolume += volume;
  };

  if (index) {
    for (let i = 0; i < index.count - 2; i += 3) {
      addTriangle(index.getX(i), index.getX(i + 1), index.getX(i + 2));
    }
  } else {
    for (let i = 0; i < position.count - 2; i += 3) {
      addTriangle(i, i + 1, i + 2);
    }
  }

  return signedVolume;
};

const getGroupMassCenter = (group: THREE.Group, space: 'local' | 'world') => {
  const center = new THREE.Vector3();
  const fallbackBox = new THREE.Box3();
  let signedVolume = 0;

  group.updateMatrixWorld(true);
  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible || !mesh.geometry) return;
    mesh.updateMatrix();
    signedVolume += addMeshVolumeCentroid(
      mesh.geometry,
      space === 'world' ? mesh.matrixWorld : mesh.matrix,
      center,
      fallbackBox
    );
  });

  if (Math.abs(signedVolume) > 1e-8 && Number.isFinite(signedVolume)) {
    return center.multiplyScalar(1 / signedVolume);
  }

  return fallbackBox.isEmpty() ? null : fallbackBox.getCenter(new THREE.Vector3());
};

const getVisibleIconCenter = (groups: Array<THREE.Group | null>) => {
  const center = new THREE.Vector3();
  let count = 0;

  groups.forEach((group) => {
    if (!group?.visible || group.children.length === 0) return;
    const groupCenter = getGroupMassCenter(group, 'world');
    if (!groupCenter) return;
    center.add(groupCenter);
    count += 1;
  });

  if (count === 0) return null;
  return center.multiplyScalar(1 / count);
};

const getVisiblePivotBounds = (groups: Array<THREE.Group | null>, pivot: THREE.Group) => {
  const bounds = new THREE.Box3();
  const vertex = new THREE.Vector3();

  pivot.updateMatrixWorld(true);
  groups.forEach((group) => {
    if (!group?.visible || group.children.length === 0) return;
    group.updateMatrixWorld(true);
    group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || !mesh.visible || !mesh.geometry) return;

      const position = mesh.geometry.getAttribute('position');
      if (!position) return;

      for (let i = 0; i < position.count; i++) {
        vertex.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
        pivot.worldToLocal(vertex);
        if (!Number.isFinite(vertex.x) || !Number.isFinite(vertex.y) || !Number.isFinite(vertex.z)) continue;
        bounds.expandByPoint(vertex);
      }
    });
  });

  return bounds.isEmpty() ? null : bounds;
};

const updateGroupMaterialState = (
  group: THREE.Group | null,
  {
    opacity,
    clippingPlanes = null,
    transparent = opacity < 1,
  }: {
    opacity: number;
    clippingPlanes?: THREE.Plane[] | null;
    transparent?: boolean;
  }
) => {
  if (!group) return;
  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      const baseOpacity = finiteNumber(material.userData?.baseOpacity, 1);
      const baseTransparent = Boolean(material.userData?.baseTransparent);
      const nextOpacity = Math.max(0, Math.min(1, baseOpacity * opacity));
      const nextTransparent = baseTransparent || transparent || nextOpacity < 1;
      const currentPlanes = material.clippingPlanes;
      const nextPlaneCount = clippingPlanes?.length ?? 0;
      const currentPlaneCount = currentPlanes?.length ?? 0;
      const samePlanes =
        currentPlaneCount === nextPlaneCount &&
        (nextPlaneCount === 0 || clippingPlanes?.every((plane, index) => currentPlanes?.[index] === plane));

      if (Math.abs(material.opacity - nextOpacity) > 0.0005) {
        material.opacity = nextOpacity;
      }
      if (material.transparent !== nextTransparent) {
        material.transparent = nextTransparent;
        material.needsUpdate = true;
      }
      if (!samePlanes) {
        material.clippingPlanes = clippingPlanes;
        material.clipShadows = nextPlaneCount > 0;
        material.needsUpdate = true;
      }
    });
  });
};

const clamp01Number = (value: unknown, fallback = 0) =>
  Math.max(0, Math.min(1, finiteNumber(value, fallback)));

const materialLightMultiplier = (preset: MaterialPresetId) => {
  if (preset === 'chrome') return 2.35;
  if (preset === 'glass') return 1.65;
  if (preset === 'satin') return 1.08;
  if (preset === 'pearl') return 1.35;
  if (preset === 'lacquer') return 1.2;
  return 1;
};

const createFilamentSafeMaterial = (source: THREE.Material) => {
  const material = source as THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
  const hasVertexColors = Boolean(material.vertexColors);
  const baseColor = hasVertexColors ? new THREE.Color('#ffffff') : material.color?.clone?.() ?? new THREE.Color('#ffffff');
  const opacity = finiteNumber(material.opacity, 1);
  const transmission = finiteNumber((material as THREE.MeshPhysicalMaterial).transmission, 0);
  const isPhysical = source.type === 'MeshPhysicalMaterial' || transmission > 0 || finiteNumber((material as THREE.MeshPhysicalMaterial).clearcoat, 0) > 0;

  const shared = {
    name: source.name,
    color: baseColor,
    roughness: Math.max(0, Math.min(1, finiteNumber(material.roughness, 0.5))),
    metalness: Math.max(0, Math.min(1, finiteNumber(material.metalness, 0))),
    map: material.map ?? null,
    vertexColors: hasVertexColors,
    transparent: opacity < 0.999 || transmission > 0,
    opacity: Math.max(0, Math.min(1, opacity)),
    side: THREE.DoubleSide,
    depthWrite: opacity >= 0.999,
  };

  const safeMaterial = isPhysical
    ? new THREE.MeshPhysicalMaterial({
      ...shared,
      clearcoat: Math.max(0, Math.min(1, finiteNumber((material as THREE.MeshPhysicalMaterial).clearcoat, 0))),
      clearcoatRoughness: Math.max(0, Math.min(1, finiteNumber((material as THREE.MeshPhysicalMaterial).clearcoatRoughness, 0.1))),
      transmission: Math.max(0, Math.min(1, transmission)),
      thickness: Math.max(0, finiteNumber((material as THREE.MeshPhysicalMaterial).thickness, 0)),
      ior: Math.max(1, Math.min(2.333, finiteNumber((material as THREE.MeshPhysicalMaterial).ior, 1.5))),
    })
    : new THREE.MeshStandardMaterial(shared);

  // Filament receives color through COLOR_0 for mesh gradients. Avoid exporting the
  // editor-only surface-emissive shader as a white emissive factor.
  if (!hasVertexColors && material.emissive && material.emissiveIntensity > 0) {
    safeMaterial.emissive = material.emissive.clone();
    safeMaterial.emissiveIntensity = Math.max(0, Math.min(1, finiteNumber(material.emissiveIntensity, 0)));
  }

  safeMaterial.clippingPlanes = null;
  safeMaterial.clipShadows = false;
  safeMaterial.onBeforeCompile = () => {};
  safeMaterial.needsUpdate = true;
  return safeMaterial;
};

const prepareFilamentExportObject = (
  group: THREE.Group,
  props: SvgCanvasProps,
  sourceGroups: Array<THREE.Group | null>
) => {
  const root = new THREE.Group();
  root.name = 'VectorForgeIcon';
  root.userData = {
    generator: 'VectorForge',
    target: 'Filament glTF 2.0',
    materialPreset: props.materialPreset,
    colorMode: props.enableGradient ? props.gradientType ?? 'linear' : 'solid',
  };

  root.rotation.set(
    THREE.MathUtils.degToRad(finiteNumber(props.rotationOffset.x, 0)),
    THREE.MathUtils.degToRad(finiteNumber(props.rotationOffset.y, 0)),
    THREE.MathUtils.degToRad(finiteNumber(props.rotationOffset.z, 0))
  );
  const scale = Math.max(0.05, finiteNumber(props.objectScale, 1));
  root.scale.set(scale, scale, scale);
  root.position.set(
    finiteNumber(props.moveOffset.x, 0) * 0.02,
    finiteNumber(props.moveOffset.y, 0) * 0.02,
    finiteNumber(props.moveOffset.z, 0) * 0.02
  );

  const progress = Math.max(0, Math.min(1, finiteNumber(props.transitionProgress, 0)));
  const exportIndex = progress >= 0.5 ? 1 : 0;
  const selectedGroup = sourceGroups[exportIndex] ?? sourceGroups.find(Boolean);
  if (!selectedGroup) return root;

  selectedGroup.updateMatrixWorld(true);
  group.updateMatrixWorld(true);
  const clone = selectedGroup.clone(true);
  clone.name = exportIndex === 1 ? 'Icon_B' : 'Icon_A';
  clone.visible = true;
  clone.position.set(0, 0, 0);
  applySvgModelScale(clone);

  clone.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry || !mesh.material) return;
    mesh.name ||= 'IconMesh';
    mesh.geometry = mesh.geometry.clone();
    if (containsInvalidPositions(mesh.geometry)) {
      mesh.visible = false;
      return;
    }
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeBoundingBox();
    mesh.geometry.computeBoundingSphere();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const safeMaterials = materials.map(createFilamentSafeMaterial);
    mesh.material = Array.isArray(mesh.material) ? safeMaterials : safeMaterials[0];
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
  });

  root.add(clone);
  return root;
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const createStudioEnvironmentTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const sky = context.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#ffffff');
  sky.addColorStop(0.16, '#dbeafe');
  sky.addColorStop(0.34, '#334155');
  sky.addColorStop(0.52, '#07070a');
  sky.addColorStop(0.74, '#111827');
  sky.addColorStop(1, '#fafafa');
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const addSoftBox = (x: number, y: number, w: number, h: number, color: string, alpha: number) => {
    const gradient = context.createRadialGradient(x + w * 0.5, y + h * 0.5, 1, x + w * 0.5, y + h * 0.5, Math.max(w, h) * 0.65);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.globalAlpha = alpha;
    context.fillStyle = gradient;
    context.fillRect(x, y, w, h);
    context.globalAlpha = 1;
  };

  addSoftBox(20, 12, 190, 78, '#ffffff', 0.95);
  addSoftBox(342, 28, 140, 52, '#93c5fd', 0.7);
  addSoftBox(160, 172, 190, 42, '#ffffff', 0.55);

  context.globalAlpha = 0.8;
  context.fillStyle = 'rgba(255,255,255,0.9)';
  context.fillRect(0, 104, canvas.width, 5);
  context.fillStyle = 'rgba(96,165,250,0.42)';
  context.fillRect(0, 118, canvas.width, 3);
  context.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
};

const GOOGLE_MESH_PALETTE = [
  ['#FF9900', '#FF360A', '#D13AB3'],
  ['#FFC700', '#807AFF', '#1759FF'],
  ['#63E600', '#00C796', '#00ADF0'],
] as const;

const fallbackGoogleMeshStops: GradientStop[] = GOOGLE_MESH_PALETTE.flatMap((row, rowIndex) =>
  row.map((color, columnIndex) => ({
    color,
    position: (rowIndex * 3 + columnIndex) / 8,
  }))
);

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const x = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
};

const mixColor = (a: THREE.Color, b: THREE.Color, t: number) => a.clone().lerp(b, t);

const bezierColor = (a: THREE.Color, b: THREE.Color, c: THREE.Color, t: number) =>
  mixColor(mixColor(a, b, t), mixColor(b, c, t), t);

const clampColor = (color: THREE.Color) =>
  new THREE.Color(
    Math.max(0, Math.min(1, color.r)),
    Math.max(0, Math.min(1, color.g)),
    Math.max(0, Math.min(1, color.b))
  );

const saturateIcon3DColor = (color: THREE.Color) => {
  const luminance = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
  const saturated = mixColor(new THREE.Color(luminance, luminance, luminance), color, 1.6);
  return clampColor(new THREE.Color(
    (saturated.r - 0.5) * 1.2 + 0.5,
    (saturated.g - 0.5) * 1.2 + 0.5,
    (saturated.b - 0.5) * 1.2 + 0.5
  ));
};

const meshGradientColor = (u: number, v: number) => {
  const x = smoothstep(0.02, 0.98, u);
  const y = smoothstep(0.02, 0.98, v);
  const rows = GOOGLE_MESH_PALETTE.map((row) =>
    bezierColor(new THREE.Color(row[0]), new THREE.Color(row[1]), new THREE.Color(row[2]), x)
  );
  const body = bezierColor(rows[0], rows[1], rows[2], y);
  return saturateIcon3DColor(body);
};

const colorAtPalettePosition = (palette: THREE.Color[], t: number) => {
  if (palette.length === 0) return new THREE.Color('#ffffff');
  if (palette.length === 1) return palette[0].clone();

  const scaled = Math.max(0, Math.min(1, t)) * Math.max(1, palette.length - 1);
  const start = Math.max(0, Math.min(palette.length - 1, Math.floor(scaled)));
  const end = Math.min(palette.length - 1, start + 1);
  return palette[start].clone().lerp(palette[end], scaled - start);
};

const meshGradientColorFromPalette = (palette: THREE.Color[], u: number, v: number) => {
  const grid = Array.from({ length: 9 }, (_, index) =>
    palette.length >= 9 ? palette[index] : colorAtPalettePosition(palette, index / 8)
  );
  const x = smoothstep(0.02, 0.98, u);
  const y = smoothstep(0.02, 0.98, v);
  const topRow = bezierColor(grid[0], grid[1], grid[2], x);
  const midRow = bezierColor(grid[3], grid[4], grid[5], x);
  const bottomRow = bezierColor(grid[6], grid[7], grid[8], x);
  return saturateIcon3DColor(bezierColor(topRow, midRow, bottomRow, y));
};

const gradientColorFromStops = (stops: Array<{ color: string; position: number }>, t: number) => {
  if (stops.length === 0) return new THREE.Color('#ffffff');
  if (stops.length === 1) return new THREE.Color(stops[0].color);

  const position = Math.max(0, Math.min(1, t));
  const previous = [...stops].reverse().find((stop) => stop.position <= position) ?? stops[0];
  const next = stops.find((stop) => stop.position >= position) ?? stops[stops.length - 1];
  const span = Math.max(0.0001, next.position - previous.position);
  const localT = previous === next ? 0 : (position - previous.position) / span;
  return new THREE.Color(previous.color).lerp(new THREE.Color(next.color), localT);
};

const iconSpaceGradientColor = (
  type: 'linear' | 'radial' | 'conic' | 'mesh',
  stops: Array<{ color: string; position: number }>,
  u: number,
  v: number
) => {
  if (type === 'mesh') {
    return meshGradientColorFromPalette(stops.map((stop) => new THREE.Color(stop.color)), u, v);
  }
  if (type === 'radial') {
    const cx = 0.5;
    const cy = 0.5;
    const farthest = Math.max(
      Math.hypot(cx, cy),
      Math.hypot(1 - cx, cy),
      Math.hypot(cx, 1 - cy),
      Math.hypot(1 - cx, 1 - cy)
    );
    return gradientColorFromStops(stops, Math.hypot(u - cx, v - cy) / farthest);
  }
  if (type === 'conic') {
    const angle = Math.atan2(v - 0.5, u - 0.5) / (Math.PI * 2) + 0.5;
    return gradientColorFromStops(stops, angle - Math.floor(angle));
  }

  // Default to a recognizable diagonal 2D fill across the icon bounds.
  const angle = THREE.MathUtils.degToRad(35);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const projection = u * dx + (1 - v) * dy;
  const corners = [
    0,
    dx,
    dy,
    dx + dy,
  ];
  const min = Math.min(...corners);
  const max = Math.max(...corners);
  return gradientColorFromStops(stops, (projection - min) / Math.max(0.0001, max - min));
};

const paletteFromStops = (stops: GradientStop[] | undefined, fallbackA: string, fallbackB: string) => {
  const source = stops?.length ? stops : [
    { color: fallbackA, position: 0 },
    { color: fallbackB, position: 1 },
  ];
  return [...source]
    .sort((a, b) => a.position - b.position)
    .map((stop) => new THREE.Color(stop.color.startsWith('#') ? stop.color : `#${stop.color}`));
};

const gradientStopsFromFill = (stops: GradientStop[] | undefined, fallbackA: string, fallbackB: string) => {
  const source = stops?.length ? stops : [
    { color: fallbackA, position: 0 },
    { color: fallbackB, position: 1 },
  ];
  return [...source]
    .map((stop) => ({
      color: stop.color.startsWith('#') ? stop.color : `#${stop.color}`,
      position: Math.max(0, Math.min(1, finiteNumber(stop.position, 0))),
    }))
    .sort((a, b) => a.position - b.position);
};

const applyGradientVertexColors = (
  geometry: THREE.BufferGeometry,
  type: 'linear' | 'radial' | 'conic' | 'mesh',
  stops: Array<{ color: string; position: number }>,
  iconBounds: THREE.Box2
) => {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
  if (!position) return;
  const width = Math.max(0.0001, iconBounds.max.x - iconBounds.min.x);
  const height = Math.max(0.0001, iconBounds.max.y - iconBounds.min.y);

  const colors = new Float32Array(position.count * 3);
  for (let index = 0; index < position.count; index += 1) {
    const u = Math.max(0, Math.min(1, (position.getX(index) - iconBounds.min.x) / width));
    const v = Math.max(0, Math.min(1, (position.getY(index) - iconBounds.min.y) / height));
    const color = iconSpaceGradientColor(type, stops, u, v);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
};

const minContourDimension = (shape: THREE.Shape) => {
  const contourBoxes = [shape, ...shape.holes].map((contour) => {
    const pts = contour.getPoints(16);
    if (pts.length < 2 || pts.some((pt) => !Number.isFinite(pt.x) || !Number.isFinite(pt.y))) return null;
    const box = new THREE.Box2().setFromPoints(pts);
    const size = new THREE.Vector2();
    box.getSize(size);
    if (!Number.isFinite(size.x) || !Number.isFinite(size.y)) return null;
    return Math.min(Math.abs(size.x), Math.abs(size.y));
  }).filter((value): value is number => value !== null && value > 0);

  return contourBoxes.length ? Math.min(...contourBoxes) : 0;
};

const scaleInnerGeometryElements = (group: THREE.Group, scale: { x: number; y: number; z: number }) => {
  const normalizedScale = {
    x: Math.max(0.35, Math.min(1.35, finiteNumber(scale.x, 1))),
    y: Math.max(0.35, Math.min(1.35, finiteNumber(scale.y, 1))),
    z: Math.max(0.2, Math.min(1.35, finiteNumber(scale.z, 1))),
  };
  if (
    Math.abs(normalizedScale.x - 1) < 0.001 &&
    Math.abs(normalizedScale.y - 1) < 0.001 &&
    Math.abs(normalizedScale.z - 1) < 0.001
  ) return;

  const candidates: Array<{ mesh: THREE.Mesh; area: number; center: THREE.Vector3; box: THREE.Box3 }> = [];
  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    if (!box || box.isEmpty()) return;
    const size = new THREE.Vector3();
    box.getSize(size);
    const area = Math.abs(size.x * size.y);
    if (!Number.isFinite(area) || area <= 0) return;
    candidates.push({ mesh, area, center: box.getCenter(new THREE.Vector3()), box: box.clone() });
  });

  if (candidates.length < 2) return;
  const outer = candidates.reduce((largest, candidate) => candidate.area > largest.area ? candidate : largest, candidates[0]);
  const largestArea = outer.area;
  const innerAreaThreshold = largestArea * 0.72;
  const outerSize = new THREE.Vector3();
  outer.box.getSize(outerSize);
  const marginX = Math.max(0.04, outerSize.x * 0.035);
  const marginY = Math.max(0.04, outerSize.y * 0.035);
  const matrix = new THREE.Matrix4();

  candidates.forEach(({ mesh, area, center, box }) => {
    if (mesh === outer.mesh) return;
    if (area >= innerAreaThreshold) return;
    const isInsideOuterSilhouette =
      box.min.x >= outer.box.min.x + marginX &&
      box.max.x <= outer.box.max.x - marginX &&
      box.min.y >= outer.box.min.y + marginY &&
      box.max.y <= outer.box.max.y - marginY;
    if (!isInsideOuterSilhouette) return;

    matrix.identity()
      .makeTranslation(-center.x, -center.y, -center.z)
      .premultiply(new THREE.Matrix4().makeScale(normalizedScale.x, normalizedScale.y, normalizedScale.z))
      .premultiply(new THREE.Matrix4().makeTranslation(center.x, center.y, center.z));
    mesh.geometry.applyMatrix4(matrix);
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeBoundingBox();
    mesh.geometry.computeBoundingSphere();
  });
};

const getOrCreateGradientTexture = (
  color1: string,
  color2: string,
  type: 'linear' | 'radial' | 'conic' | 'mesh' = 'linear',
  stops?: GradientStop[]
): THREE.CanvasTexture => {
  const normalizedStops = gradientStopsFromFill(stops, color1, color2);
  const stopsKey = normalizedStops.map((stop) => `${stop.color}:${stop.position.toFixed(3)}`).join('|');
  const key = `${type}_${stopsKey}`;
  if (gradientCache.has(key)) {
    return gradientCache.get(key)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    if (type === 'mesh') {
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const color = meshGradientColor(x / (canvas.width - 1), y / (canvas.height - 1));
          const index = (y * canvas.width + x) * 4;
          imageData.data[index] = Math.max(0, Math.min(255, Math.round(color.r * 255)));
          imageData.data[index + 1] = Math.max(0, Math.min(255, Math.round(color.g * 255)));
          imageData.data[index + 2] = Math.max(0, Math.min(255, Math.round(color.b * 255)));
          imageData.data[index + 3] = 255;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    } else {
      const grad = type === 'radial'
      ? ctx.createRadialGradient(88, 88, 8, 128, 128, 170)
      : type === 'conic' && typeof ctx.createConicGradient === 'function'
        ? ctx.createConicGradient(Math.PI / 4, 128, 128)
        : ctx.createLinearGradient(0, 0, 256, 256);
      normalizedStops.forEach((stop) => {
        grad.addColorStop(stop.position, stop.color);
      });
      if (type === 'conic' && normalizedStops[0]) {
        grad.addColorStop(1, normalizedStops[0].color);
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  gradientCache.set(key, texture);
  return texture;
};

export const SvgCanvas = forwardRef<SvgCanvasRef, SvgCanvasProps>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [modelReady, setModelReady] = useState(false);
  const colorAStopsKey = (props.colorAStops ?? []).map((stop) => `${stop.color}:${Number(stop.position).toFixed(3)}`).join('|');
  const colorBStopsKey = (props.colorBStops ?? []).map((stop) => `${stop.color}:${Number(stop.position).toFixed(3)}`).join('|');

  // Three.js instances refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationStartRef = useRef<number>(performance.now());
  
  // Lighting refs
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const softboxLightRef = useRef<THREE.RectAreaLight | null>(null);
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Pivot and Mesh group refs
  const pivotGroupRef = useRef<THREE.Group | null>(null);
  const iconAGroupRef = useRef<THREE.Group | null>(null);
  const iconBGroupRef = useRef<THREE.Group | null>(null);
  const centerMarkerRef = useRef<THREE.Group | null>(null);

  // Drag interaction states with inertia
  const isDraggingRef = useRef(false);
  const isInertiaActiveRef = useRef(false);
  const hasViewDragMovedRef = useRef(false);
  const pointerStartPositionRef = useRef({ x: 0, y: 0 });
  const previousPointerPositionRef = useRef({ x: 0, y: 0 });
  const rotationVelocityRef = useRef({ x: 0, y: 0 });
  const activePointerIdRef = useRef<number | null>(null);
  const onViewRotationCommitRef = useRef(props.onViewRotationCommit);
  const onViewRotationSetRef = useRef(props.onViewRotationSet);
  const liveRenderPropsRef = useRef({
    transitionType: props.transitionType,
    transitionProgress: props.transitionProgress,
    wipeDirection: props.wipeDirection,
    rotationOffset: props.rotationOffset,
    objectScale: props.objectScale,
    moveOffset: props.moveOffset,
    showCenterPoint: props.showCenterPoint,
    isPlaying: props.isPlaying,
    keyLightIntensity: props.keyLightIntensity
  });
  const viewInertiaEnabledRef = useRef(props.viewInertiaEnabled ?? true);

  // Camera Zoom Refs (with damping)
  const targetZoomRef = useRef<number>(props.zoom);
  const currentZoomRef = useRef<number>(props.zoom);

  // Clipping Plane refs
  const clipPlaneARef = useRef<THREE.Plane | null>(null);
  const clipPlaneBRef = useRef<THREE.Plane | null>(null);

  // Video recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // SVG Orientation Gizmo Elements Refs
  const lineXRef = useRef<SVGLineElement>(null);
  const lineYRef = useRef<SVGLineElement>(null);
  const lineZRef = useRef<SVGLineElement>(null);
  const markerXRef = useRef<SVGGElement>(null);
  const markerYRef = useRef<SVGGElement>(null);
  const markerZRef = useRef<SVGGElement>(null);
  const viewNudgeFrameRef = useRef<number | null>(null);
  const viewNudgeStateRef = useRef<Record<'x' | 'y', { value: number | null; target: number | null }>>({
    x: { value: null, target: null },
    y: { value: null, target: null },
  });

  liveRenderPropsRef.current = {
    transitionType: props.transitionType,
    transitionProgress: props.transitionProgress,
    wipeDirection: props.wipeDirection,
    rotationOffset: props.rotationOffset,
    objectScale: props.objectScale,
    moveOffset: props.moveOffset,
    showCenterPoint: props.showCenterPoint,
    isPlaying: props.isPlaying,
    keyLightIntensity: props.keyLightIntensity
  };
  onViewRotationCommitRef.current = props.onViewRotationCommit;
  onViewRotationSetRef.current = props.onViewRotationSet;
  viewInertiaEnabledRef.current = props.viewInertiaEnabled ?? true;

  useEffect(() => {
    props.onModelReadyChange?.(modelReady);
  }, [modelReady, props.onModelReadyChange]);

  const applyViewRotationDelta = (delta: { x: number; y: number }) => {
    const rotationDelta = {
      x: THREE.MathUtils.radToDeg(delta.x),
      y: THREE.MathUtils.radToDeg(delta.y),
      z: 0,
    };
    if (Math.abs(rotationDelta.x) > 0.1 || Math.abs(rotationDelta.y) > 0.1) {
      onViewRotationCommitRef.current?.(rotationDelta);
    }
  };

  // Handle outside actions via ref
  useImperativeHandle(ref, () => ({
    exportGltf() {
      if (!pivotGroupRef.current) return;
      const exporter = new GLTFExporter();
      const exportGroup = prepareFilamentExportObject(
        pivotGroupRef.current,
        props,
        [iconAGroupRef.current, iconBGroupRef.current]
      );
      
      exporter.parse(
        exportGroup,
        (gltf) => {
          if (gltf instanceof ArrayBuffer) {
            downloadBlob(new Blob([gltf], { type: 'model/gltf-binary' }), 'vectorforge-icon.glb');
            return;
          }
          const output = JSON.stringify(gltf);
          downloadBlob(new Blob([output], { type: 'model/gltf+json' }), 'vectorforge-icon.gltf');
        },
        (error) => {
          console.error('An error occurred during glTF export:', error);
        },
        {
          binary: true,
          onlyVisible: true,
          trs: false,
          truncateDrawRange: true,
          maxTextureSize: 2048,
        }
      );
    },

    startRecording() {
      const canvas = canvasRef.current;
      if (!canvas || !rendererRef.current) return;

      recordedChunksRef.current = [];
      const stream = canvas.captureStream(60);
      
      const options = { mimeType: 'video/webm;codecs=vp9' };
      let recorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        recorder = new MediaRecorder(stream);
      }

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
    },

    stopRecording(callback: (blob: Blob) => void) {
      const recorder = mediaRecorderRef.current;
      if (!recorder) return;

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        callback(blob);
      };

      recorder.stop();
      mediaRecorderRef.current = null;
    },

    resetRotation() {
      targetZoomRef.current = 1.0;
      currentZoomRef.current = 1.0;
      animationStartRef.current = performance.now();
      if (iconAGroupRef.current) iconAGroupRef.current.rotation.set(0, 0, 0);
      if (iconBGroupRef.current) iconBGroupRef.current.rotation.set(0, 0, 0);
      props.onZoomChange?.(1.0);
    }
  }));

  // Synchronize sidebar zooms with internal targetZoomRef
  useEffect(() => {
    targetZoomRef.current = props.zoom;
  }, [props.zoom]);

  // Helper: Parses SVG paths and builds a 3D Group with granular path overrides
  const buildSvgGroup = (svgContent: string, isIconA: boolean): THREE.Group => {
    const group = new THREE.Group();
    if (!svgContent) return group;

    const loader = new SVGLoader();
    let svgData;
    try {
      svgData = loader.parse(normalizeSvgToIconViewBox(svgContent));
    } catch (e) {
      console.error('Failed to parse SVG content:', e);
      return group;
    }

    const paths = svgData.paths;
    const centerOffset = new THREE.Vector3();
    const baseDepth = Math.max(0.02, finiteNumber(props.extrusionDepth, 1));
    const baseBevelSize = Math.max(0, finiteNumber(props.bevelSize, 0));
    const baseBevelThickness = Math.max(0, finiteNumber(props.bevelThickness, 0));
    const baseBevelSegments = Math.max(0, Math.min(MAX_BEVEL_SEGMENTS, Math.round(finiteNumber(props.bevelSegments, 1))));
    const curveSegments = Math.max(8, Math.min(64, Math.round(1 / Math.max(0.015, finiteNumber(props.geometryQuality, 0.045)))));
    const layerSpacing = finiteNumber(props.layerSpacing, 0);
    const pathLayerGap = paths.length > 1
      ? Math.max(SVG_PATH_LAYER_GAP_MIN, baseDepth * SVG_PATH_LAYER_GAP_RATIO, layerSpacing * 0.06)
      : 0;

    const extrudeSettings = {
      depth: baseDepth,
      bevelEnabled: props.bevelEnabled,
      bevelThickness: baseBevelThickness,
      bevelSize: baseBevelSize,
      bevelSegments: baseBevelSegments,
      curveSegments,
      steps: 1
    };

    const clippingPlanes: THREE.Plane[] = [];
    const isWipeActive = props.transitionType === 'wipe' && (props.wipeDirection.x !== 0 || props.wipeDirection.y !== 0);
    
    if (isWipeActive) {
      if (isIconA && clipPlaneARef.current) clippingPlanes.push(clipPlaneARef.current);
      if (!isIconA && clipPlaneBRef.current) clippingPlanes.push(clipPlaneBRef.current);
    }

    const isCrossfade = props.transitionType === 'wipe' && props.wipeDirection.x === 0 && props.wipeDirection.y === 0;
    // Material Symbols are authored in a stable 24x24 icon space. Keep color
    // sampling in that same space so wipe pairs do not remap/reverse gradients
    // when the incoming glyph has a different local bounding box.
    const iconBounds = new THREE.Box2(
      new THREE.Vector2(0, 0),
      new THREE.Vector2(ICON_VIEWBOX_SIZE, ICON_VIEWBOX_SIZE)
    );

    paths.forEach((path, pathIndex) => {
      // Apply path level overrides
      const overrides = isIconA ? props.pathOverridesA : props.pathOverridesB;
      const override = overrides?.find(o => o.id === pathIndex.toString());
      
      const isVisible = override ? override.visible : true;
      if (!isVisible) return;
      const isSlashOverlay = path.userData?.node?.getAttribute?.('data-vectorforge-slash') === 'true';

      const customColor = override?.color || (path.color ? `#${path.color.getHexString()}` : (isIconA ? props.colorA : props.colorB));
      const depthMultiplier = Math.max(0.02, finiteNumber(override ? override.depthMultiplier : 1.0, 1.0));

      const gradientType = props.gradientType ?? 'linear';
      const gradientStops = gradientStopsFromFill(
        isIconA ? props.colorAStops : props.colorBStops,
        isIconA ? props.colorA : props.colorB,
        isIconA ? (props.colorASecondary || props.colorA) : (props.colorBSecondary || props.colorB)
      );
      const useGradientVertexColors = Boolean(props.enableGradient);

      const pathMaterial = createThreeMaterial(props.materialPreset, {
        color: props.enableGradient ? '#ffffff' : customColor,
        roughness: props.roughness,
        metalness: props.metalness,
        reflectance: props.reflectance,
        clearcoat: props.clearcoat,
        clearcoatRoughness: props.clearcoatRoughness,
        transmission: props.transmission,
        thickness: props.thickness,
        emissiveIntensity: props.emissiveIntensity,
        wireframe: props.wireframe,
        opacity: isIconA ? (isCrossfade ? 1.0 - props.transitionProgress : 1.0)
                          : (isCrossfade ? props.transitionProgress : 1.0),
        vertexColors: useGradientVertexColors
      }) as any;

      if (props.emissiveIntensity && props.emissiveIntensity > 0 && !props.enableGradient) {
        pathMaterial.emissive = new THREE.Color(customColor);
      }

      if (pathIndex > 0 || isSlashOverlay) {
        pathMaterial.polygonOffset = true;
        pathMaterial.polygonOffsetFactor = -pathIndex * 2;
        pathMaterial.polygonOffsetUnits = -pathIndex * 2;
      }

      if (clippingPlanes.length > 0) {
        pathMaterial.clippingPlanes = clippingPlanes;
        pathMaterial.clipShadows = true;
      }

      const shapes = SVGLoader.createShapes(path);

      shapes.forEach((shape) => {
        const shapePts = shape.getPoints(12);
        if (shapePts.length < 2 || shapePts.some((pt) => !Number.isFinite(pt.x) || !Number.isFinite(pt.y))) {
          return;
        }

        const shapeBox = new THREE.Box2().setFromPoints(shapePts);
        const shapeSize = new THREE.Vector2();
        shapeBox.getSize(shapeSize);
        if (!Number.isFinite(shapeSize.x) || !Number.isFinite(shapeSize.y)) {
          return;
        }

        const shapeMinDim = Math.max(0.1, Math.min(Math.abs(shapeSize.x), Math.abs(shapeSize.y)));
        const contourMinDim = Math.max(0.1, minContourDimension(shape) || shapeMinDim);
        const hasHoles = shape.holes.length > 0;

        const shapeDepth = isSlashOverlay
          ? Math.max(0.08, baseDepth * VECTORFORGE_SLASH_DEPTH_RATIO)
          : Math.max(0.02, baseDepth * depthMultiplier);
        const bevelContourLimit = hasHoles ? contourMinDim * 0.025 : shapeMinDim * 0.05;
        const bevelDepthLimit = hasHoles ? shapeDepth * 0.12 : shapeDepth * 0.18;
        const safeBevelSize = props.bevelEnabled 
          ? Math.max(0.001, Math.min(baseBevelSize, bevelContourLimit, bevelDepthLimit))
          : 0;
        const safeBevelThickness = props.bevelEnabled
          ? Math.max(0.001, Math.min(baseBevelThickness, hasHoles ? contourMinDim * 0.04 : shapeMinDim * 0.08, hasHoles ? shapeDepth * 0.16 : shapeDepth * 0.25))
          : 0;

        let geometry: THREE.ExtrudeGeometry;
        try {
          geometry = new THREE.ExtrudeGeometry(shape, {
            ...extrudeSettings,
            depth: shapeDepth,
            bevelSize: safeBevelSize,
            bevelThickness: safeBevelThickness,
            bevelSegments: baseBevelSegments,
            bevelEnabled: props.bevelEnabled && safeBevelSize > 0.001 && safeBevelThickness > 0.001
          });
        } catch (error) {
          console.warn('Skipping SVG shape that failed extrusion', error);
          return;
        }

        if (containsInvalidPositions(geometry)) {
          geometry.dispose();
          console.warn('Skipping SVG shape with invalid geometry positions');
          return;
        }

        if (useGradientVertexColors) {
          const stops = gradientStops.length > 0
            ? gradientStops
            : gradientStopsFromFill(fallbackGoogleMeshStops, props.colorA, props.colorB);
          applyGradientVertexColors(geometry, gradientType, stops, iconBounds);
        }

        const mesh = new THREE.Mesh(geometry, pathMaterial);
        mesh.position.z = isSlashOverlay ? baseDepth + pathLayerGap : pathIndex * pathLayerGap;
        mesh.renderOrder = isSlashOverlay ? 100 + pathIndex : pathIndex;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        group.add(mesh);
      });
    });

    scaleInnerGeometryElements(group, props.innerElementScale);

    if (group.children.length > 0) {
      // Align paired icons by the SVG coordinate system, not by each icon's
      // individual mass. Otherwise adding a slash changes the origin and the
      // base glyph no longer overlaps the unslashed version during a wipe.
      centerOffset.set(ICON_VIEWBOX_SIZE / 2, ICON_VIEWBOX_SIZE / 2, baseDepth / 2);
      group.children.forEach((child) => {
        child.position.x -= centerOffset.x;
        child.position.y -= centerOffset.y;
        child.position.z -= centerOffset.z;
      });
    }

    applySvgModelScale(group);

    return group;
  };

  const setViewRotation = (rotation: { x: number; y: number }) => {
    isInertiaActiveRef.current = false;
    rotationVelocityRef.current = { x: 0, y: 0 };
    const current = liveRenderPropsRef.current.rotationOffset;
    onViewRotationCommitRef.current?.({
      x: THREE.MathUtils.radToDeg(rotation.x) - current.x,
      y: THREE.MathUtils.radToDeg(rotation.y) - current.y,
      z: -current.z,
    });
  };

  const nudgeViewRotation = (axis: 'x' | 'y', direction: -1 | 1) => {
    isInertiaActiveRef.current = false;
    rotationVelocityRef.current = { x: 0, y: 0 };
    const current = liveRenderPropsRef.current.rotationOffset;
    const nudgeState = viewNudgeStateRef.current[axis];
    const startValue = nudgeState.value ?? current[axis];
    const targetBase = nudgeState.target ?? current[axis];
    const epsilon = 0.001;
    const targetValue = direction > 0
      ? Math.floor((targetBase + epsilon) / GIZMO_SNAP_DEGREES) * GIZMO_SNAP_DEGREES + GIZMO_SNAP_DEGREES
      : Math.ceil((targetBase - epsilon) / GIZMO_SNAP_DEGREES) * GIZMO_SNAP_DEGREES - GIZMO_SNAP_DEGREES;

    if (viewNudgeFrameRef.current !== null) {
      cancelAnimationFrame(viewNudgeFrameRef.current);
      viewNudgeFrameRef.current = null;
    }
    nudgeState.target = targetValue;
    const startTime = performance.now();
    const duration = 220;
    const tick = (now: number) => {
      const t = Math.max(0, Math.min(1, (now - startTime) / duration));
      const eased = 1 - Math.pow(1 - t, 3);
      const next = startValue + (targetValue - startValue) * eased;
      nudgeState.value = next;
      onViewRotationSetRef.current?.({ [axis]: next }, { commit: t >= 1 });
      if (t < 1) {
        viewNudgeFrameRef.current = requestAnimationFrame(tick);
      } else {
        viewNudgeFrameRef.current = null;
        nudgeState.value = null;
        nudgeState.target = null;
      }
    };
    viewNudgeFrameRef.current = requestAnimationFrame(tick);
  };

  // 2D SVG Orientation Compass Updater (updates line/circle/text endpoints)
  const updateGizmo = (rx: number, ry: number, rz: number) => {
    const cx = 40;
    const cy = 40;
    const L = 22; // axis length in pixels

    const euler = new THREE.Euler(rx, ry, rz, 'XYZ');

    const project = (x: number, y: number, z: number) => {
      const vector = new THREE.Vector3(x, y, z).applyEuler(euler);

      return {
        x: cx + vector.x * L,
        y: cy - vector.y * L, // Negate Y for screen projection
        z: vector.z
      };
    };

    const ptX = project(1, 0, 0);
    const ptY = project(0, 1, 0);
    const ptZ = project(0, 0, 1);

    // Apply values to DOM nodes for max performance (60 FPS without React re-renders)
    if (lineXRef.current) {
      lineXRef.current.setAttribute('x2', ptX.x.toFixed(1));
      lineXRef.current.setAttribute('y2', ptX.y.toFixed(1));
    }
    if (lineYRef.current) {
      lineYRef.current.setAttribute('x2', ptY.x.toFixed(1));
      lineYRef.current.setAttribute('y2', ptY.y.toFixed(1));
    }
    if (lineZRef.current) {
      lineZRef.current.setAttribute('x2', ptZ.x.toFixed(1));
      lineZRef.current.setAttribute('y2', ptZ.y.toFixed(1));
    }

    markerXRef.current?.setAttribute('transform', `translate(${ptX.x.toFixed(1)} ${ptX.y.toFixed(1)})`);
    markerYRef.current?.setAttribute('transform', `translate(${ptY.x.toFixed(1)} ${ptY.y.toFixed(1)})`);
    markerZRef.current?.setAttribute('transform', `translate(${ptZ.x.toFixed(1)} ${ptZ.y.toFixed(1)})`);
  };

  // Effect: Initializes Scene, Camera, Renderer, and Lights
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    RectAreaLightUniformsLib.init();

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.localClippingEnabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const materialLight = props.keyLightIntensity * materialLightMultiplier(props.materialPreset);
    renderer.toneMappingExposure = Math.max(0.45, Math.min(1.8, 0.75 + materialLight * 0.08));
    rendererRef.current = renderer;

    const studioEnvironment = createStudioEnvironmentTexture();
    scene.environment = studioEnvironment;

    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, width / height, 0.1, 100);
    camera.position.set(0, 0, framedCameraDistance(camera));
    cameraRef.current = camera;

    animationStartRef.current = performance.now();

    const pivotGroup = new THREE.Group();
    scene.add(pivotGroup);
    pivotGroupRef.current = pivotGroup;

    const markerMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.92,
      depthTest: false,
      depthWrite: false,
    });
    const markerBackMaterial = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.72,
      depthTest: false,
      depthWrite: false,
    });
    const markerFrontMaterial = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.82,
      depthTest: false,
      depthWrite: false,
    });
    const markerLineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.38,
      depthTest: false,
      depthWrite: false,
    });
    const centerMarker = new THREE.Group();
    centerMarker.visible = Boolean(props.showCenterPoint);
    centerMarker.renderOrder = 1000;
    centerMarker.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 18, 12), markerMaterial));
    const markerBack = new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 10), markerBackMaterial);
    markerBack.name = 'center-marker-back';
    const markerFront = new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 10), markerFrontMaterial);
    markerFront.name = 'center-marker-front';
    const markerLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -0.35),
      new THREE.Vector3(0, 0, 0.35),
    ]), markerLineMaterial);
    markerLine.name = 'center-marker-axis';
    centerMarker.add(markerLine, markerBack, markerFront);
    pivotGroup.add(centerMarker);
    centerMarkerRef.current = centerMarker;

    // Define Clipping planes
    const clipPlaneA = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 2.5);
    const clipPlaneB = new THREE.Plane(new THREE.Vector3(1, 0, 0), 2.5);
    clipPlaneARef.current = clipPlaneA;
    clipPlaneBRef.current = clipPlaneB;

    const ambientLight = new THREE.AmbientLight(props.ambientColor, props.ambientIntensity);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const keyLight = new THREE.DirectionalLight(props.keyLightColor, props.keyLightIntensity * materialLightMultiplier(props.materialPreset));
    keyLight.position.set(props.keyLightPosition.x, props.keyLightPosition.y, props.keyLightPosition.z);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    const softboxLight = new THREE.RectAreaLight(props.keyLightColor, 0, 3.5, 1.6);
    softboxLight.position.set(props.keyLightPosition.x, props.keyLightPosition.y, props.keyLightPosition.z);
    softboxLight.lookAt(0, 0, 0);
    scene.add(softboxLight);
    softboxLightRef.current = softboxLight;

    const rimLight = new THREE.DirectionalLight(props.rimLightColor, props.rimLightIntensity);
    rimLight.position.set(-6, -3, 3);
    scene.add(rimLight);
    rimLightRef.current = rimLight;

    // Direct Pointer Drag-to-Rotate Interaction
    const canvas = canvasRef.current;
    
    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || !canvas) return;
      isDraggingRef.current = true;
      hasViewDragMovedRef.current = false;
      activePointerIdRef.current = e.pointerId;
      pointerStartPositionRef.current = { x: e.clientX, y: e.clientY };
      previousPointerPositionRef.current = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      if (activePointerIdRef.current !== e.pointerId) return;
      if (isPrimaryButtonReleased(e)) {
        handlePointerUp(e);
        return;
      }
      const totalDeltaX = e.clientX - pointerStartPositionRef.current.x;
      const totalDeltaY = e.clientY - pointerStartPositionRef.current.y;
      if (!hasViewDragMovedRef.current) {
        if (Math.hypot(totalDeltaX, totalDeltaY) < 3) return;
        hasViewDragMovedRef.current = true;
        isInertiaActiveRef.current = false;
        rotationVelocityRef.current = { x: 0, y: 0 };
        previousPointerPositionRef.current = { x: e.clientX, y: e.clientY };
        return;
      }
      const deltaX = e.clientX - previousPointerPositionRef.current.x;
      const deltaY = e.clientY - previousPointerPositionRef.current.y;
      
      const velocity = {
        x: deltaY * 0.006,
        y: deltaX * 0.006
      };

      rotationVelocityRef.current = velocity;
      applyViewRotationDelta(velocity);
      
      previousPointerPositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      isDraggingRef.current = false;
      activePointerIdRef.current = null;
      if (!hasViewDragMovedRef.current) {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch (err) {}
        return;
      }
      hasViewDragMovedRef.current = false;
      const speed = Math.hypot(rotationVelocityRef.current.x, rotationVelocityRef.current.y);
      if (viewInertiaEnabledRef.current && speed > 0.002) {
        isInertiaActiveRef.current = true;
      } else {
        isInertiaActiveRef.current = false;
        rotationVelocityRef.current = { x: 0, y: 0 };
      }
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (err) {}
    };

    const handlePointerCancel = (e: PointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      isDraggingRef.current = false;
      hasViewDragMovedRef.current = false;
      activePointerIdRef.current = null;
      isInertiaActiveRef.current = false;
      rotationVelocityRef.current = { x: 0, y: 0 };
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (err) {}
    };

    // Smooth Scroll-Wheel Zooming
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!props.onZoomChange) return;
      const zoomStep = 0.08;
      const direction = e.deltaY > 0 ? -1 : 1;
      const newZoom = Math.max(0.3, Math.min(3.0, targetZoomRef.current + direction * zoomStep));
      targetZoomRef.current = newZoom;
      props.onZoomChange(Number(newZoom.toFixed(2)));
    };

    const handleDoubleClick = () => {
      targetZoomRef.current = 1.0;
      currentZoomRef.current = 1.0;
      animationStartRef.current = performance.now();
      if (iconAGroupRef.current) iconAGroupRef.current.rotation.set(0, 0, 0);
      if (iconBGroupRef.current) iconBGroupRef.current.rotation.set(0, 0, 0);
      props.onZoomChange?.(1.0);
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerCancel);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('dblclick', handleDoubleClick);

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w <= 0 || h <= 0) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      if (canvas) {
        canvas.removeEventListener('pointerdown', handlePointerDown);
        canvas.removeEventListener('pointermove', handlePointerMove);
        canvas.removeEventListener('pointerup', handlePointerUp);
        canvas.removeEventListener('pointercancel', handlePointerCancel);
        canvas.removeEventListener('wheel', handleWheel);
        canvas.removeEventListener('dblclick', handleDoubleClick);
      }
      renderer.dispose();
      studioEnvironment?.dispose();
      if (viewNudgeFrameRef.current !== null) {
        cancelAnimationFrame(viewNudgeFrameRef.current);
        viewNudgeFrameRef.current = null;
      }
    };
  }, [props.onZoomChange]);

  // Effect: Updates Lights
  useEffect(() => {
    const materialLight = props.keyLightIntensity * materialLightMultiplier(props.materialPreset);
    const softness = clamp01Number(props.keyLightSoftness, 0);
    if (ambientLightRef.current) {
      ambientLightRef.current.color.set(props.ambientColor);
      ambientLightRef.current.intensity = props.ambientIntensity + materialLight * (0.035 + softness * 0.025);
    }
    if (keyLightRef.current) {
      keyLightRef.current.color.set(props.keyLightColor);
      keyLightRef.current.intensity = materialLight * (1 - softness * 0.48);
      keyLightRef.current.position.set(props.keyLightPosition.x, props.keyLightPosition.y, props.keyLightPosition.z);
    }
    if (softboxLightRef.current) {
      softboxLightRef.current.color.set(props.keyLightColor);
      softboxLightRef.current.intensity = materialLight * softness * 1.75;
      softboxLightRef.current.width = 1.4 + softness * 5.2;
      softboxLightRef.current.height = 0.8 + softness * 2.4;
      softboxLightRef.current.position.set(props.keyLightPosition.x, props.keyLightPosition.y, props.keyLightPosition.z);
      softboxLightRef.current.lookAt(0, 0, 0);
    }
    if (rimLightRef.current) {
      rimLightRef.current.color.set(props.rimLightColor);
      rimLightRef.current.intensity = props.rimLightIntensity;
    }
    if (rendererRef.current) {
      rendererRef.current.toneMappingExposure = Math.max(0.45, Math.min(1.8, 0.75 + materialLight * 0.08));
    }
  }, [props.ambientColor, props.ambientIntensity, props.keyLightColor, props.keyLightIntensity, props.keyLightPosition, props.keyLightSoftness, props.rimLightColor, props.rimLightIntensity, props.materialPreset]);

  // Effect: Rebuilds SVG 3D models when properties change
  useEffect(() => {
    const scene = sceneRef.current;
    const pivot = pivotGroupRef.current;
    if (!scene || !pivot) return;

    const hadModel = Boolean(iconAGroupRef.current || iconBGroupRef.current);
    if (!hadModel) setModelReady(false);

    if (iconAGroupRef.current) pivot.remove(iconAGroupRef.current);
    if (iconBGroupRef.current) pivot.remove(iconBGroupRef.current);

    const groupA = buildSvgGroup(props.iconAContent, true);
    const groupB = buildSvgGroup(props.iconBContent, false);

    pivot.add(groupA);
    pivot.add(groupB);

    iconAGroupRef.current = groupA;
    iconBGroupRef.current = groupB;
    setModelReady(groupA.children.length > 0 || groupB.children.length > 0);
  }, [
    props.iconAContent,
    props.iconBContent,
    props.extrusionDepth,
    props.bevelEnabled,
    props.bevelThickness,
    props.bevelSize,
    props.bevelSegments,
    props.geometryQuality,
    props.layerSpacing,
    props.innerElementScale,
    props.materialPreset,
    props.colorA,
    props.colorB,
    props.colorASecondary,
    props.colorBSecondary,
    colorAStopsKey,
    colorBStopsKey,
    props.enableGradient,
    props.gradientType,
    props.roughness,
    props.metalness,
    props.reflectance,
    props.clearcoat,
    props.clearcoatRoughness,
    props.transmission,
    props.thickness,
    props.emissiveIntensity,
    props.wireframe,
    props.transitionType,
    props.wipeDirection,
    props.pathOverridesA,
    props.pathOverridesB
  ]);

  // Effect: Real-time rendering animation loop
  useEffect(() => {
    let animFrameId: number;

    const renderLoop = () => {
      const scene = sceneRef.current;
      const renderer = rendererRef.current;
      const camera = cameraRef.current;

      if (!scene || !renderer || !camera) return;

      const liveProps = liveRenderPropsRef.current;
      const progress = liveProps.transitionProgress;

      // 1. Use direct view rotation while editing, with optional release inertia.
      const dampingFactor = 0.08;
      if (isInertiaActiveRef.current) {
        applyViewRotationDelta(rotationVelocityRef.current);
        rotationVelocityRef.current = {
          x: rotationVelocityRef.current.x * 0.92,
          y: rotationVelocityRef.current.y * 0.92
        };
        if (Math.hypot(rotationVelocityRef.current.x, rotationVelocityRef.current.y) < 0.0007) {
          isInertiaActiveRef.current = false;
          rotationVelocityRef.current = { x: 0, y: 0 };
        }
      }

      const displayRotation = {
        x: THREE.MathUtils.degToRad(liveProps.rotationOffset.x),
        y: THREE.MathUtils.degToRad(liveProps.rotationOffset.y),
        z: THREE.MathUtils.degToRad(liveProps.rotationOffset.z)
      };

      if (pivotGroupRef.current) {
        pivotGroupRef.current.rotation.x = displayRotation.x;
        pivotGroupRef.current.rotation.y = displayRotation.y;
        pivotGroupRef.current.rotation.z = displayRotation.z;
        const baseScale = Math.max(0.05, finiteNumber(liveProps.objectScale, 1));
        pivotGroupRef.current.scale.set(baseScale, baseScale, baseScale);
        pivotGroupRef.current.position.set(
          finiteNumber(liveProps.moveOffset.x, 0) * 0.02,
          finiteNumber(liveProps.moveOffset.y, 0) * 0.02,
          finiteNumber(liveProps.moveOffset.z, 0) * 0.02
        );
      }

      // 2. Smoothly damp the scroll-wheel camera zoom
      currentZoomRef.current += (targetZoomRef.current - currentZoomRef.current) * dampingFactor;
      camera.position.z = framedCameraDistance(camera) / currentZoomRef.current;

      // 3. Update the 2D SVG Orientation Gizmo
      updateGizmo(displayRotation.x, displayRotation.y, displayRotation.z);

      // All rotation is driven by the timeline via the pivot group (rotationOffset),
      // so the inner shape groups stay neutral and spin together with the pivot.

      // 4. Compute Transition Wipe boundaries
      const transitionIsActive = progress > 0.001 && progress < 0.999;
      const isWipeActive = transitionIsActive && liveProps.transitionType === 'wipe' && (liveProps.wipeDirection.x !== 0 || liveProps.wipeDirection.y !== 0);
      const isCrossfade = transitionIsActive && liveProps.transitionType === 'wipe' && liveProps.wipeDirection.x === 0 && liveProps.wipeDirection.y === 0;

      if (isWipeActive && clipPlaneARef.current && clipPlaneBRef.current) {
        const wipePlanes = createDiagonalWipePlanes({
          width: ICON_VIEWBOX_SIZE * MODEL_SCALE,
          height: ICON_VIEWBOX_SIZE * MODEL_SCALE,
          progress,
          direction: liveProps.wipeDirection,
          seamOverlap: WIPE_SEAM_OVERLAP_WORLD,
        });

        if (pivotGroupRef.current) {
          pivotGroupRef.current.updateMatrixWorld(true);
          clipPlaneARef.current.copy(wipePlanes.basePlane).applyMatrix4(pivotGroupRef.current.matrixWorld);
          clipPlaneBRef.current.copy(wipePlanes.wipedPlane).applyMatrix4(pivotGroupRef.current.matrixWorld);
        } else {
          clipPlaneARef.current.copy(wipePlanes.basePlane);
          clipPlaneBRef.current.copy(wipePlanes.wipedPlane);
        }

        if (iconAGroupRef.current) {
          iconAGroupRef.current.visible = true;
          iconAGroupRef.current.position.set(0, 0, 0);
          applySvgModelScale(iconAGroupRef.current);
          updateGroupMaterialState(iconAGroupRef.current, { opacity: 1, clippingPlanes: [clipPlaneARef.current] });
        }
        if (iconBGroupRef.current) {
          iconBGroupRef.current.visible = true;
          iconBGroupRef.current.position.set(0, 0, 0);
          applySvgModelScale(iconBGroupRef.current);
          updateGroupMaterialState(iconBGroupRef.current, { opacity: 1, clippingPlanes: [clipPlaneBRef.current] });
        }
      } 
      else if (isCrossfade) {
        if (iconAGroupRef.current) {
          iconAGroupRef.current.visible = true;
          iconAGroupRef.current.position.set(0, 0, 0);
          applySvgModelScale(iconAGroupRef.current);
          updateGroupMaterialState(iconAGroupRef.current, { opacity: 1 - progress, transparent: true });
        }
        if (iconBGroupRef.current) {
          iconBGroupRef.current.visible = true;
          iconBGroupRef.current.position.set(0, 0, 0);
          applySvgModelScale(iconBGroupRef.current);
          updateGroupMaterialState(iconBGroupRef.current, { opacity: progress, transparent: true });
        }
      } 
      else {
        // "None" — hard cut: show A in the first half, B in the second (no blend).
        const showB = progress >= 0.5;
        if (iconAGroupRef.current) {
          iconAGroupRef.current.visible = !showB;
          iconAGroupRef.current.position.set(0, 0, 0);
          applySvgModelScale(iconAGroupRef.current);
          updateGroupMaterialState(iconAGroupRef.current, { opacity: 1 });
        }
        if (iconBGroupRef.current) {
          iconBGroupRef.current.visible = showB;
          iconBGroupRef.current.position.set(0, 0, 0);
          applySvgModelScale(iconBGroupRef.current);
          updateGroupMaterialState(iconBGroupRef.current, { opacity: 1 });
        }
      }

      if (centerMarkerRef.current && pivotGroupRef.current) {
        const marker = centerMarkerRef.current;
        marker.visible = Boolean(liveProps.showCenterPoint);
        pivotGroupRef.current.updateMatrixWorld(true);
        const visibleCenter = getVisibleIconCenter([iconAGroupRef.current, iconBGroupRef.current]);

        if (liveProps.showCenterPoint && visibleCenter) {
          marker.visible = true;
          marker.position.copy(pivotGroupRef.current.worldToLocal(visibleCenter.clone()));

          const bounds = getVisiblePivotBounds([iconAGroupRef.current, iconBGroupRef.current], pivotGroupRef.current);
          const halfDepth = bounds ? Math.max(0.16, Math.min(1.2, (bounds.max.z - bounds.min.z) / 2)) : 0.35;
          const back = marker.getObjectByName('center-marker-back');
          const front = marker.getObjectByName('center-marker-front');
          const axis = marker.getObjectByName('center-marker-axis') as THREE.Line | undefined;
          if (back) back.position.z = -halfDepth;
          if (front) front.position.z = halfDepth;
          if (axis?.geometry) {
            const position = axis.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
            if (position) {
              position.setXYZ(0, 0, 0, -halfDepth);
              position.setXYZ(1, 0, 0, halfDepth);
              position.needsUpdate = true;
              axis.geometry.computeBoundingSphere();
            }
          }
        } else {
          marker.visible = false;
        }
      }

      if (isCrossfade && iconAGroupRef.current && iconBGroupRef.current) {
        const iconA = iconAGroupRef.current;
        const iconB = iconBGroupRef.current;
        const marker = centerMarkerRef.current;
        const iconAVisible = iconA.visible;
        const iconBVisible = iconB.visible;
        const markerVisible = marker?.visible ?? false;

        if (marker) marker.visible = false;

        renderer.autoClear = true;
        iconA.visible = true;
        iconB.visible = false;
        renderer.render(scene, camera);

        renderer.autoClear = false;
        renderer.clearDepth();
        iconA.visible = false;
        iconB.visible = true;
        renderer.render(scene, camera);

        if (marker && markerVisible) {
          renderer.clearDepth();
          iconA.visible = false;
          iconB.visible = false;
          marker.visible = true;
          renderer.render(scene, camera);
        }

        iconA.visible = iconAVisible;
        iconB.visible = iconBVisible;
        if (marker) marker.visible = markerVisible;
        renderer.autoClear = true;
      } else {
        renderer.render(scene, camera);
      }
      animFrameId = requestAnimationFrame(renderLoop);
    };

    animFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[400px] overflow-hidden rounded-xl border border-border/10 bg-[oklch(0.13_0.012_280)] shadow-2xl">
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />
      {!modelReady && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-background/5 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-2 text-[11px] font-medium text-white/75 shadow-2xl">
            <span className="size-2 rounded-full bg-white/70 animate-pulse" />
            Preparing 3D icon
          </div>
        </div>
      )}
      
      {/* Interactive 3D Orientation Gizmo — minimal, Figma-like (no chrome, centered with the play bar) */}
      <svg
        viewBox="0 0 80 80"
        className="group/gizmo absolute bottom-0.5 right-5 w-[84px] h-[84px] pointer-events-auto select-none z-20"
      >
        {/* Basis Axis Lines (thin, muted) */}
        <line ref={lineXRef} x1="40" y1="40" x2="40" y2="40" className="stroke-rose-400/70 stroke-[1.5]" strokeLinecap="round" />
        <line ref={lineYRef} x1="40" y1="40" x2="40" y2="40" className="stroke-emerald-400/70 stroke-[1.5]" strokeLinecap="round" />
        <line ref={lineZRef} x1="40" y1="40" x2="40" y2="40" className="stroke-sky-400/70 stroke-[1.5]" strokeLinecap="round" />

        {/* Axis Endpoints */}
        <g ref={markerXRef} transform="translate(40 40)">
          <circle cx="0" cy="0" r="8" className="fill-black/35 blur-[1px]" />
          <circle cx="0" cy="0" r="7" className="fill-rose-500/18 stroke-rose-400/85 stroke-1" />
          <text x="0" y="0.3" className="fill-rose-200 font-sans font-semibold text-[7px] select-none" textAnchor="middle" dominantBaseline="central">X</text>
        </g>

        <g ref={markerYRef} transform="translate(40 40)">
          <circle cx="0" cy="0" r="8" className="fill-black/35 blur-[1px]" />
          <circle cx="0" cy="0" r="7" className="fill-emerald-500/18 stroke-emerald-400/85 stroke-1" />
          <text x="0" y="0.3" className="fill-emerald-200 font-sans font-semibold text-[7px] select-none" textAnchor="middle" dominantBaseline="central">Y</text>
        </g>

        <g ref={markerZRef} transform="translate(40 40)">
          <circle cx="0" cy="0" r="8" className="fill-black/35 blur-[1px]" />
          <circle cx="0" cy="0" r="7" className="fill-sky-500/18 stroke-sky-400/85 stroke-1" />
          <text x="0" y="0.3" className="fill-sky-200 font-sans font-semibold text-[7px] select-none" textAnchor="middle" dominantBaseline="central">Z</text>
        </g>

        {/* Center Origin Anchor */}
        <circle cx="40" cy="40" r="1.5" className="fill-white/50" />

        <g className="pointer-events-none opacity-0 transition-opacity duration-150 group-hover/gizmo:pointer-events-auto group-hover/gizmo:opacity-100 group-focus-within/gizmo:pointer-events-auto group-focus-within/gizmo:opacity-100">
          <g className="cursor-pointer text-emerald-300/65 transition-colors hover:text-emerald-200" onClick={() => nudgeViewRotation('x', 1)}>
            <title>Tilt up 45 degrees</title>
            <rect x="28" y="0" width="24" height="22" rx="11" className="fill-transparent" />
            <path d="M40 5.7 C42.9 7.8 44.6 10.8 44.8 14.4 C43.4 13.2 41.8 12.5 40 12.5 C38.2 12.5 36.6 13.2 35.2 14.4 C35.4 10.8 37.1 7.8 40 5.7Z" className="fill-current opacity-90" />
          </g>
          <g className="cursor-pointer text-emerald-300/65 transition-colors hover:text-emerald-200" onClick={() => nudgeViewRotation('x', -1)}>
            <title>Tilt down 45 degrees</title>
            <rect x="28" y="58" width="24" height="22" rx="11" className="fill-transparent" />
            <path d="M40 74.3 C37.1 72.2 35.4 69.2 35.2 65.6 C36.6 66.8 38.2 67.5 40 67.5 C41.8 67.5 43.4 66.8 44.8 65.6 C44.6 69.2 42.9 72.2 40 74.3Z" className="fill-current opacity-90" />
          </g>
          <g className="cursor-pointer text-rose-300/65 transition-colors hover:text-rose-200" onClick={() => nudgeViewRotation('y', 1)}>
            <title>Rotate left 45 degrees</title>
            <rect x="0" y="28" width="22" height="24" rx="11" className="fill-transparent" />
            <path d="M5.7 40 C7.8 37.1 10.8 35.4 14.4 35.2 C13.2 36.6 12.5 38.2 12.5 40 C12.5 41.8 13.2 43.4 14.4 44.8 C10.8 44.6 7.8 42.9 5.7 40Z" className="fill-current opacity-90" />
          </g>
          <g className="cursor-pointer text-rose-300/65 transition-colors hover:text-rose-200" onClick={() => nudgeViewRotation('y', -1)}>
            <title>Rotate right 45 degrees</title>
            <rect x="58" y="28" width="22" height="24" rx="11" className="fill-transparent" />
            <path d="M74.3 40 C72.2 42.9 69.2 44.6 65.6 44.8 C66.8 43.4 67.5 41.8 67.5 40 C67.5 38.2 66.8 36.6 65.6 35.2 C69.2 35.4 72.2 37.1 74.3 40Z" className="fill-current opacity-90" />
          </g>
        </g>
      </svg>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[oklch(0.11_0.012_280)]/80 via-transparent to-[oklch(0.18_0.012_280)]/20 mix-blend-overlay" />
    </div>
  );
});

SvgCanvas.displayName = 'SvgCanvas';
