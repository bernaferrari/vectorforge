'use client';

import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { createThreeMaterial, MaterialPresetId } from './MaterialPresets';

export interface PathOverride {
  id: string;
  visible: boolean;
  color: string;
  depthMultiplier: number;
}

export interface SvgCanvasProps {
  iconAContent: string;
  iconBContent: string;
  materialPreset: MaterialPresetId;
  colorA: string;
  colorB: string;
  colorASecondary?: string;
  colorBSecondary?: string;
  enableGradient?: boolean;
  roughness: number;
  metalness: number;
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
  layerSpacing: number;
  transitionType: 'none' | 'wipe';
  wipeDirection: { x: number; y: number }; // (0,0) means Crossfade / Dissolve
  transitionProgress: number; // 0 to 1
  rotationSpeed: { x: number; y: number; z: number };
  ambientColor: string;
  ambientIntensity: number;
  keyLightColor: string;
  keyLightIntensity: number;
  rimLightColor: string;
  rimLightIntensity: number;
  zoom: number;
  pathOverridesA?: PathOverride[];
  pathOverridesB?: PathOverride[];
  onZoomChange?: (zoom: number) => void;
}

export interface SvgCanvasRef {
  exportGltf: () => void;
  startRecording: () => void;
  stopRecording: (callback: (blob: Blob) => void) => void;
  resetRotation: () => void;
}

// Module-level cache for gradient canvas textures to prevent memory leaks
const gradientCache = new Map<string, THREE.CanvasTexture>();

const getOrCreateGradientTexture = (color1: string, color2: string): THREE.CanvasTexture => {
  const key = `${color1}_${color2}`;
  if (gradientCache.has(key)) {
    return gradientCache.get(key)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
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

  // Three.js instances refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const clockRef = useRef<THREE.Clock | null>(null);
  
  // Lighting refs
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Pivot and Mesh group refs
  const pivotGroupRef = useRef<THREE.Group | null>(null);
  const iconAGroupRef = useRef<THREE.Group | null>(null);
  const iconBGroupRef = useRef<THREE.Group | null>(null);

  // Drag interaction states with inertia
  const isDraggingRef = useRef(false);
  const previousPointerPositionRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ x: 0.1, y: 0.4 }); // default angle
  const currentRotationRef = useRef({ x: 0.1, y: 0.4 });

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
  const headXRef = useRef<SVGCircleElement>(null);
  const headYRef = useRef<SVGCircleElement>(null);
  const headZRef = useRef<SVGCircleElement>(null);
  const labelXRef = useRef<SVGTextElement>(null);
  const labelYRef = useRef<SVGTextElement>(null);
  const labelZRef = useRef<SVGTextElement>(null);

  // Handle outside actions via ref
  useImperativeHandle(ref, () => ({
    exportGltf() {
      if (!sceneRef.current) return;
      const exporter = new GLTFExporter();
      
      const exportGroup = new THREE.Group();
      if (iconAGroupRef.current) exportGroup.add(iconAGroupRef.current.clone());
      if (iconBGroupRef.current) exportGroup.add(iconBGroupRef.current.clone());
      
      exporter.parse(
        exportGroup,
        (gltf) => {
          const output = JSON.stringify(gltf, null, 2);
          const blob = new Blob([output], { type: 'application/json' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = '3d-shape-shifter-icon.gltf';
          link.click();
        },
        (error) => {
          console.error('An error occurred during glTF export:', error);
        },
        { binary: false }
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
      targetRotationRef.current = { x: 0.1, y: 0.4 };
      targetZoomRef.current = 1.0;
      props.onZoomChange?.(1.0);
    }
  }));

  // Update clipping plane direction normals
  useEffect(() => {
    if (clipPlaneARef.current && clipPlaneBRef.current) {
      const vx = props.wipeDirection.x;
      const vy = props.wipeDirection.y;
      if (vx !== 0 || vy !== 0) {
        clipPlaneARef.current.normal.set(-vx, -vy, 0).normalize();
        clipPlaneBRef.current.normal.set(vx, vy, 0).normalize();
      }
    }
  }, [props.wipeDirection]);

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
      svgData = loader.parse(svgContent);
    } catch (e) {
      console.error('Failed to parse SVG content:', e);
      return group;
    }

    const paths = svgData.paths;
    const centerOffset = new THREE.Vector3();

    const extrudeSettings = {
      depth: props.extrusionDepth,
      bevelEnabled: props.bevelEnabled,
      bevelThickness: props.bevelThickness,
      bevelSize: props.bevelSize,
      bevelSegments: props.bevelSegments,
      curveSegments: 16,
      steps: 1
    };

    const clippingPlanes: THREE.Plane[] = [];
    const isWipeActive = props.transitionType === 'wipe' && (props.wipeDirection.x !== 0 || props.wipeDirection.y !== 0);
    
    if (isWipeActive) {
      if (isIconA && clipPlaneARef.current) clippingPlanes.push(clipPlaneARef.current);
      if (!isIconA && clipPlaneBRef.current) clippingPlanes.push(clipPlaneBRef.current);
    }

    const isCrossfade = props.transitionType === 'wipe' && props.wipeDirection.x === 0 && props.wipeDirection.y === 0;

    paths.forEach((path, pathIndex) => {
      // Apply path level overrides
      const overrides = isIconA ? props.pathOverridesA : props.pathOverridesB;
      const override = overrides?.find(o => o.id === pathIndex.toString());
      
      const isVisible = override ? override.visible : true;
      if (!isVisible) return;

      const customColor = override?.color || (path.color ? `#${path.color.getHexString()}` : (isIconA ? props.colorA : props.colorB));
      const depthMultiplier = override ? override.depthMultiplier : 1.0;

      const textureMap = props.enableGradient ? getOrCreateGradientTexture(
        isIconA ? props.colorA : props.colorB,
        isIconA ? (props.colorASecondary || props.colorA) : (props.colorBSecondary || props.colorB)
      ) : null;

      const pathMaterial = createThreeMaterial(props.materialPreset, {
        color: props.enableGradient ? '#ffffff' : customColor,
        roughness: props.roughness,
        metalness: props.metalness,
        clearcoat: props.clearcoat,
        clearcoatRoughness: props.clearcoatRoughness,
        transmission: props.transmission,
        thickness: props.thickness,
        emissiveIntensity: props.emissiveIntensity,
        wireframe: props.wireframe,
        opacity: isIconA ? (isCrossfade ? 1.0 - props.transitionProgress : 1.0)
                          : (isCrossfade ? props.transitionProgress : 1.0),
        map: textureMap
      }) as any;

      if (props.emissiveIntensity && props.emissiveIntensity > 0) {
        pathMaterial.emissive = new THREE.Color(customColor);
      }

      if (clippingPlanes.length > 0) {
        pathMaterial.clippingPlanes = clippingPlanes;
        pathMaterial.clipShadows = true;
      }

      let shapes = SVGLoader.createShapes(path);

      // --- Mathematical 2D Nested Containment Solver & Winding Order Correction ---
      // Fixes the filled-holes bug by flattening all parsed shapes/holes, computing exact polygon
      // areas using THREE.ShapeUtils.area, checking actual containment via raycasting point-in-polygon,
      // and building a containment tree to assign even depths as solid CCW shapes and odd depths as CW holes.
      if (shapes.length > 0) {
        // 1. Flatten all shapes and their holes into a single flat list of simple contours (shapes)
        const flatShapes: THREE.Shape[] = [];
        shapes.forEach((s) => {
          const outer = new THREE.Shape();
          outer.curves = s.curves;
          flatShapes.push(outer);

          s.holes.forEach((h) => {
            const holeShape = new THREE.Shape();
            holeShape.curves = h.curves;
            flatShapes.push(holeShape);
          });
        });

        // 2. Helper functions for 2D polygon computations
        const findInteriorPoint = (pts: THREE.Vector2[]): THREE.Vector2 => {
          if (pts.length < 3) {
            let x = 0, y = 0;
            pts.forEach(p => { x += p.x; y += p.y; });
            return new THREE.Vector2(x / (pts.length || 1), y / (pts.length || 1));
          }

          // Clean up consecutive duplicates
          const cleanPts: THREE.Vector2[] = [];
          for (let i = 0; i < pts.length; i++) {
            const curr = pts[i];
            const next = pts[(i + 1) % pts.length];
            if (curr.distanceTo(next) > 1e-6) {
              cleanPts.push(curr);
            }
          }

          if (cleanPts.length < 3) {
            let x = 0, y = 0;
            pts.forEach(p => { x += p.x; y += p.y; });
            return new THREE.Vector2(x / (pts.length || 1), y / (pts.length || 1));
          }

          try {
            // Triangulate using Three.js built-in optimizer
            const triangles = THREE.ShapeUtils.triangulateShape(cleanPts, []);
            if (triangles && triangles.length > 0) {
              const tri = triangles[0];
              const p0 = cleanPts[tri[0]];
              const p1 = cleanPts[tri[1]];
              const p2 = cleanPts[tri[2]];
              return new THREE.Vector2(
                (p0.x + p1.x + p2.x) / 3,
                (p0.y + p1.y + p2.y) / 3
              );
            }
          } catch (e) {
            console.warn('Triangulation failed, falling back to coordinate average', e);
          }

          let x = 0, y = 0;
          cleanPts.forEach(p => { x += p.x; y += p.y; });
          return new THREE.Vector2(x / cleanPts.length, y / cleanPts.length);
        };

        const isPointInPolygon = (point: THREE.Vector2, polygon: THREE.Vector2[]): boolean => {
          let inside = false;
          const x = point.x, y = point.y;
          for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            const intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
          }
          return inside;
        };

        const reverseCurve = (curve: any): any => {
          if (curve instanceof THREE.LineCurve) {
            return new THREE.LineCurve(curve.v2, curve.v1);
          } else if (curve instanceof THREE.QuadraticBezierCurve) {
            return new THREE.QuadraticBezierCurve(curve.v2, curve.v1, curve.v0);
          } else if (curve instanceof THREE.CubicBezierCurve) {
            return new THREE.CubicBezierCurve(curve.v3, curve.v2, curve.v1, curve.v0);
          }
          return curve;
        };

        const reverseCurves = (curves: any[]): any[] => {
          const reversed: any[] = [];
          for (let i = curves.length - 1; i >= 0; i--) {
            reversed.push(reverseCurve(curves[i]));
          }
          return reversed;
        };

        // 3. Gather shape infos with tessellated points and strict interior point
        const shapeInfos = flatShapes.map((shape) => {
          const pts = shape.getPoints(12);
          const box = new THREE.Box2().setFromPoints(pts);
          const area = Math.abs(THREE.ShapeUtils.area(pts));
          const interiorPoint = findInteriorPoint(pts);
          return {
            shape,
            pts,
            box,
            area,
            interiorPoint,
            parentIndex: -1,
            depth: 0
          };
        });

        // 4. Find immediate parents using nested containment checks
        for (let i = 0; i < shapeInfos.length; i++) {
          const child = shapeInfos[i];
          let smallestParentArea = Infinity;
          let parentIdx = -1;

          for (let j = 0; j < shapeInfos.length; j++) {
            if (i === j) continue;
            const parentCandidate = shapeInfos[j];

            // Area check + Raycasted point-in-polygon check using the strict interior point!
            if (parentCandidate.area > child.area && isPointInPolygon(child.interiorPoint, parentCandidate.pts)) {
              if (parentCandidate.area < smallestParentArea) {
                smallestParentArea = parentCandidate.area;
                parentIdx = j;
              }
            }
          }
          child.parentIndex = parentIdx;
        }

        // 5. Compute depths in containment tree
        for (let i = 0; i < shapeInfos.length; i++) {
          let depth = 0;
          let curr = shapeInfos[i].parentIndex;
          while (curr !== -1) {
            depth++;
            curr = shapeInfos[curr].parentIndex;
          }
          shapeInfos[i].depth = depth;
        }

        // 6. Build final corrected shapes with winding order enforcement
        const finalShapes: THREE.Shape[] = [];

        // Sort by depth so outer/parent shapes are created and added to finalShapes before children
        const sortedIndices = shapeInfos
          .map((info, index) => ({ info, index }))
          .sort((a, b) => a.info.depth - b.info.depth);

        sortedIndices.forEach(({ info }) => {
          const isEvenDepth = info.depth % 2 === 0;
          const currentPts = info.shape.getPoints(12);
          const cw = THREE.ShapeUtils.isClockWise(currentPts);

          if (isEvenDepth) {
            // Even depth = Solid boundary: Must be Counter-Clockwise (CCW)
            if (cw) {
              info.shape.curves = reverseCurves(info.shape.curves);
            }
            finalShapes.push(info.shape);
          } else {
            // Odd depth = Hole: Must be Clockwise (CW)
            if (!cw) {
              info.shape.curves = reverseCurves(info.shape.curves);
            }
            const parentInfo = shapeInfos[info.parentIndex];
            const holePath = new THREE.Path();
            holePath.curves = info.shape.curves;
            parentInfo.shape.holes.push(holePath);
          }
        });

        shapes = finalShapes;
      }

      shapes.forEach((shape) => {
        const shapePts = shape.getPoints(12);
        const shapeBox = new THREE.Box2().setFromPoints(shapePts);
        const shapeSize = new THREE.Vector2();
        shapeBox.getSize(shapeSize);
        const shapeMinDim = Math.max(0.1, Math.min(shapeSize.x, shapeSize.y));

        const shapeDepth = (extrudeSettings.depth * depthMultiplier) + (pathIndex * props.layerSpacing * 0.1);
        const safeBevelSize = props.bevelEnabled 
          ? Math.max(0.002, Math.min(props.bevelSize, shapeMinDim * 0.05, shapeDepth * 0.18))
          : 0;
        const safeBevelThickness = props.bevelEnabled
          ? Math.max(0.002, Math.min(props.bevelThickness, shapeMinDim * 0.08, shapeDepth * 0.25))
          : 0;

        const geometry = new THREE.ExtrudeGeometry(shape, {
          ...extrudeSettings,
          depth: shapeDepth,
          bevelSize: safeBevelSize,
          bevelThickness: safeBevelThickness,
          bevelEnabled: props.bevelEnabled && safeBevelSize > 0.002
        });

        const mesh = new THREE.Mesh(geometry, pathMaterial);
        mesh.position.z = pathIndex * props.layerSpacing * 0.1;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        group.add(mesh);
      });
    });

    group.scale.set(0.12, -0.12, 0.12);

    const box = new THREE.Box3().setFromObject(group);
    box.getCenter(centerOffset);
    group.children.forEach((child) => {
      child.position.x -= centerOffset.x / group.scale.x;
      child.position.y -= centerOffset.y / group.scale.y;
    });

    return group;
  };

  // 2D SVG Orientation Compass Updater (updates line/circle/text endpoints)
  const updateGizmo = (rx: number, ry: number) => {
    const cx = 40;
    const cy = 40;
    const L = 22; // axis length in pixels

    const cosX = Math.cos(rx);
    const sinX = Math.sin(rx);
    const cosY = Math.cos(ry);
    const sinY = Math.sin(ry);

    const project = (x: number, y: number, z: number) => {
      // Rotate Y (yaw)
      const x1 = x * cosY + z * sinY;
      const y1 = y;
      const z1 = -x * sinY + z * cosY;

      // Rotate X (pitch)
      const x2 = x1;
      const y2 = y1 * cosX - z1 * sinX;
      const z2 = y1 * sinX + z1 * cosX;

      return {
        x: cx + x2 * L,
        y: cy - y2 * L, // Negate Y for screen projection
        z: z2
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

    if (headXRef.current) {
      headXRef.current.setAttribute('cx', ptX.x.toFixed(1));
      headXRef.current.setAttribute('cy', ptX.y.toFixed(1));
    }
    if (headYRef.current) {
      headYRef.current.setAttribute('cx', ptY.x.toFixed(1));
      headYRef.current.setAttribute('cy', ptY.y.toFixed(1));
    }
    if (headZRef.current) {
      headZRef.current.setAttribute('cx', ptZ.x.toFixed(1));
      headZRef.current.setAttribute('cy', ptZ.y.toFixed(1));
    }

    if (labelXRef.current) {
      labelXRef.current.setAttribute('x', ptX.x.toFixed(1));
      labelXRef.current.setAttribute('y', ptX.y.toFixed(1));
    }
    if (labelYRef.current) {
      labelYRef.current.setAttribute('x', ptY.x.toFixed(1));
      labelYRef.current.setAttribute('y', ptY.y.toFixed(1));
    }
    if (labelZRef.current) {
      labelZRef.current.setAttribute('x', ptZ.x.toFixed(1));
      labelZRef.current.setAttribute('y', ptZ.y.toFixed(1));
    }
  };

  // Effect: Initializes Scene, Camera, Renderer, and Lights
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

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
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    rendererRef.current = renderer;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 16);
    cameraRef.current = camera;

    const clock = new THREE.Clock();
    clockRef.current = clock;

    const pivotGroup = new THREE.Group();
    scene.add(pivotGroup);
    pivotGroupRef.current = pivotGroup;

    // Define Clipping planes
    const clipPlaneA = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 2.5);
    const clipPlaneB = new THREE.Plane(new THREE.Vector3(1, 0, 0), 2.5);
    clipPlaneARef.current = clipPlaneA;
    clipPlaneBRef.current = clipPlaneB;

    const ambientLight = new THREE.AmbientLight(props.ambientColor, props.ambientIntensity);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const keyLight = new THREE.DirectionalLight(props.keyLightColor, props.keyLightIntensity);
    keyLight.position.set(5, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    const rimLight = new THREE.DirectionalLight(props.rimLightColor, props.rimLightIntensity);
    rimLight.position.set(-6, -3, 3);
    scene.add(rimLight);
    rimLightRef.current = rimLight;

    // Direct Pointer Drag-to-Rotate Interaction with damping inertia
    const canvas = canvasRef.current;
    
    const handlePointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      previousPointerPositionRef.current = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - previousPointerPositionRef.current.x;
      const deltaY = e.clientY - previousPointerPositionRef.current.y;
      
      targetRotationRef.current.y += deltaX * 0.006;
      targetRotationRef.current.x += deltaY * 0.006;
      
      targetRotationRef.current.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, targetRotationRef.current.x));
      
      previousPointerPositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      isDraggingRef.current = false;
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
      targetRotationRef.current = { x: 0.1, y: 0.4 };
      targetZoomRef.current = 1.0;
      props.onZoomChange?.(1.0);
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('dblclick', handleDoubleClick);

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (canvas) {
        canvas.removeEventListener('pointerdown', handlePointerDown);
        canvas.removeEventListener('pointermove', handlePointerMove);
        canvas.removeEventListener('pointerup', handlePointerUp);
        canvas.removeEventListener('pointerleave', handlePointerUp);
        canvas.removeEventListener('wheel', handleWheel);
        canvas.removeEventListener('dblclick', handleDoubleClick);
      }
      renderer.dispose();
    };
  }, [props.onZoomChange]);

  // Effect: Updates Lights
  useEffect(() => {
    if (ambientLightRef.current) {
      ambientLightRef.current.color.set(props.ambientColor);
      ambientLightRef.current.intensity = props.ambientIntensity;
    }
    if (keyLightRef.current) {
      keyLightRef.current.color.set(props.keyLightColor);
      keyLightRef.current.intensity = props.keyLightIntensity;
    }
    if (rimLightRef.current) {
      rimLightRef.current.color.set(props.rimLightColor);
      rimLightRef.current.intensity = props.rimLightIntensity;
    }
  }, [props.ambientColor, props.ambientIntensity, props.keyLightColor, props.keyLightIntensity, props.rimLightColor, props.rimLightIntensity]);

  // Effect: Rebuilds SVG 3D models when properties change
  useEffect(() => {
    const scene = sceneRef.current;
    const pivot = pivotGroupRef.current;
    if (!scene || !pivot) return;

    if (iconAGroupRef.current) pivot.remove(iconAGroupRef.current);
    if (iconBGroupRef.current) pivot.remove(iconBGroupRef.current);

    const groupA = buildSvgGroup(props.iconAContent, true);
    const groupB = buildSvgGroup(props.iconBContent, false);

    pivot.add(groupA);
    pivot.add(groupB);

    iconAGroupRef.current = groupA;
    iconBGroupRef.current = groupB;
  }, [
    props.iconAContent,
    props.iconBContent,
    props.extrusionDepth,
    props.bevelEnabled,
    props.bevelThickness,
    props.bevelSize,
    props.bevelSegments,
    props.layerSpacing,
    props.materialPreset,
    props.colorA,
    props.colorB,
    props.colorASecondary,
    props.colorBSecondary,
    props.enableGradient,
    props.roughness,
    props.metalness,
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
      const clock = clockRef.current;

      if (!scene || !renderer || !camera || !clock) return;

      const elapsed = clock.getElapsedTime();
      const progress = props.transitionProgress;

      // 1. Smoothly interpolate (damp) manual dragging rotation
      const dampingFactor = 0.08;
      currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * dampingFactor;
      currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * dampingFactor;

      if (pivotGroupRef.current) {
        pivotGroupRef.current.rotation.x = currentRotationRef.current.x;
        pivotGroupRef.current.rotation.y = currentRotationRef.current.y;
      }

      // 2. Smoothly damp the scroll-wheel camera zoom
      currentZoomRef.current += (targetZoomRef.current - currentZoomRef.current) * dampingFactor;
      camera.position.z = 16 / currentZoomRef.current;

      // 3. Update the 2D SVG Orientation Gizmo
      updateGizmo(currentRotationRef.current.x, currentRotationRef.current.y);

      // Apply subtle automatic spin addition on meshes inside the pivot
      if (iconAGroupRef.current) {
        iconAGroupRef.current.rotation.y = elapsed * props.rotationSpeed.y * 0.15;
        iconAGroupRef.current.rotation.x = elapsed * props.rotationSpeed.x * 0.15;
      }
      if (iconBGroupRef.current) {
        iconBGroupRef.current.rotation.y = elapsed * props.rotationSpeed.y * 0.15;
        iconBGroupRef.current.rotation.x = elapsed * props.rotationSpeed.x * 0.15;
      }

      // 4. Compute Transition Wipe boundaries
      const isWipeActive = props.transitionType === 'wipe' && (props.wipeDirection.x !== 0 || props.wipeDirection.y !== 0);
      const isCrossfade = props.transitionType === 'wipe' && props.wipeDirection.x === 0 && props.wipeDirection.y === 0;

      if (isWipeActive && clipPlaneARef.current && clipPlaneBRef.current) {
        const range = 5.0; 
        const pos = (progress * range) - (range / 2);
        
        clipPlaneARef.current.constant = -pos; 
        clipPlaneBRef.current.constant = pos;  

        if (iconAGroupRef.current) {
          iconAGroupRef.current.visible = true;
          iconAGroupRef.current.scale.setScalar(0.12);
          iconAGroupRef.current.children.forEach((c) => {
            const mesh = c as THREE.Mesh;
            const mat = mesh.material as THREE.Material;
            mat.opacity = 1.0;
          });
        }
        if (iconBGroupRef.current) {
          iconBGroupRef.current.visible = true;
          iconBGroupRef.current.scale.setScalar(0.12);
          iconBGroupRef.current.children.forEach((c) => {
            const mesh = c as THREE.Mesh;
            const mat = mesh.material as THREE.Material;
            mat.opacity = 1.0;
          });
        }
      } 
      else if (isCrossfade) {
        if (iconAGroupRef.current) {
          iconAGroupRef.current.visible = true;
          iconAGroupRef.current.scale.setScalar(0.12);
          iconAGroupRef.current.children.forEach((c) => {
            const mesh = c as THREE.Mesh;
            const mat = mesh.material as THREE.Material;
            mat.opacity = 1.0 - progress;
            mat.transparent = true;
          });
        }
        if (iconBGroupRef.current) {
          iconBGroupRef.current.visible = true;
          iconBGroupRef.current.scale.setScalar(0.12);
          iconBGroupRef.current.children.forEach((c) => {
            const mesh = c as THREE.Mesh;
            const mat = mesh.material as THREE.Material;
            mat.opacity = progress;
            mat.transparent = true;
          });
        }
      } 
      else {
        // No transition active (display only Icon A)
        if (iconAGroupRef.current) {
          iconAGroupRef.current.visible = true;
          iconAGroupRef.current.scale.setScalar(0.12);
          iconAGroupRef.current.children.forEach((c) => {
            const mesh = c as THREE.Mesh;
            const mat = mesh.material as THREE.Material;
            mat.opacity = 1.0;
          });
        }
        if (iconBGroupRef.current) {
          iconBGroupRef.current.visible = false;
        }
      }

      renderer.render(scene, camera);
      animFrameId = requestAnimationFrame(renderLoop);
    };

    animFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [props.transitionType, props.transitionProgress, props.rotationSpeed, props.wipeDirection]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[400px] overflow-hidden rounded-xl border border-border/10 bg-[oklch(0.13_0.012_280)] shadow-2xl">
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />
      
      {/* Interactive 3D Orientation Gizmo SVG Overlay */}
      <svg className="absolute bottom-4 right-4 w-20 h-20 pointer-events-auto select-none bg-[oklch(0.16_0.012_280)]/80 backdrop-blur-md rounded-full border border-border/10 shadow-lg z-20">
        <circle cx="40" cy="40" r="36" className="fill-none stroke-border/5 stroke-1" />
        
        {/* Basis Axis Lines */}
        <line ref={lineXRef} x1="40" y1="40" x2="40" y2="40" className="stroke-red-500 stroke-[2.5]" />
        <line ref={lineYRef} x1="40" y1="40" x2="40" y2="40" className="stroke-emerald-500 stroke-[2.5]" />
        <line ref={lineZRef} x1="40" y1="40" x2="40" y2="40" className="stroke-blue-500 stroke-[2.5]" />
        
        {/* Interactive Axis Endpoints */}
        <g className="cursor-pointer group" onClick={() => { targetRotationRef.current = { x: 0, y: -Math.PI / 2 }; }}>
          <circle ref={headXRef} cx="40" cy="40" r="6.5" className="fill-red-500 hover:fill-red-400 active:scale-95 transition-all duration-100" />
          <text ref={labelXRef} x="40" y="40" className="fill-white font-mono font-bold text-[8px] select-none" textAnchor="middle" dominantBaseline="central">X</text>
        </g>

        <g className="cursor-pointer group" onClick={() => { targetRotationRef.current = { x: -Math.PI / 2, y: 0 }; }}>
          <circle ref={headYRef} cx="40" cy="40" r="6.5" className="fill-emerald-500 hover:fill-emerald-400 active:scale-95 transition-all duration-100" />
          <text ref={labelYRef} x="40" y="40" className="fill-white font-mono font-bold text-[8px] select-none" textAnchor="middle" dominantBaseline="central">Y</text>
        </g>

        <g className="cursor-pointer group" onClick={() => { targetRotationRef.current = { x: 0, y: 0 }; }}>
          <circle ref={headZRef} cx="40" cy="40" r="6.5" className="fill-blue-500 hover:fill-blue-400 active:scale-95 transition-all duration-100" />
          <text ref={labelZRef} x="40" y="40" className="fill-white font-mono font-bold text-[8px] select-none" textAnchor="middle" dominantBaseline="central">Z</text>
        </g>
        
        {/* Center Origin Anchor */}
        <circle cx="40" cy="40" r="2" className="fill-white/90" />
      </svg>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[oklch(0.11_0.012_280)]/80 via-transparent to-[oklch(0.18_0.012_280)]/20 mix-blend-overlay" />
    </div>
  );
});

SvgCanvas.displayName = 'SvgCanvas';
