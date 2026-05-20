'use client';

import React, { useState } from 'react';
import { Download, Code2, Video, Check, Copy, Sparkles, FileCode, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportGltf: () => void;
  onStartRecording: () => void;
  onStopRecording: (callback: (blob: Blob) => void) => void;
  // parameters to populate dynamic code generators
  materialPreset: string;
  colorA: string;
  colorB: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  transmission: number;
  thickness: number;
  emissiveIntensity: number;
  extrusionDepth: number;
  bevelEnabled: boolean;
  bevelThickness: number;
  bevelSize: number;
  bevelSegments: number;
  layerSpacing: number;
  transitionType: string;
  ambientIntensity: number;
  keyLightIntensity: number;
  rimLightIntensity: number;
  svgPathA: string;
  svgPathB: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExportGltf,
  onStartRecording,
  onStopRecording,
  materialPreset,
  colorA,
  colorB,
  roughness,
  metalness,
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
  transitionType,
  ambientIntensity,
  keyLightIntensity,
  rimLightIntensity,
  svgPathA,
  svgPathB
}) => {
  const [activeTab, setActiveTab] = useState<'options' | 'r3f' | 'vanilla'>('options');
  const [isRecording, setIsRecording] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  // Generate dynamic React Three Fiber code template
  const generateR3fCode = () => {
    const escA = svgPathA.replace(/`/g, '\\`').trim();
    const escB = svgPathB.replace(/`/g, '\\`').trim();

    return `'use client';

import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Center } from '@react-three/drei';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';

interface ExtrudedIconProps {
  progress?: number; // 0 to 1
}

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0e0b16' }}>
      <Canvas 
        camera={{ position: [0, 0, 15], fov: 40 }}
        shadows
        gl={{ localClippingEnabled: true }}
      >
        <ambientLight intensity={${ambientIntensity}} />
        <directionalLight position={[5, 5, 4]} intensity={${keyLightIntensity}} castShadow />
        <directionalLight position={[-6, -3, 3]} intensity={${rimLightIntensity}} />
        <Center>
          <ExtrudedIcon progress={0.5} />
        </Center>
      </Canvas>
    </div>
  );
}

function ExtrudedIcon({ progress = 0 }: ExtrudedIconProps) {
  const svgAContent = \`${escA}\`;
  const svgBContent = \`${escB}\`;
  
  // Custom SVGLoader Parser
  const [geometryA, geometryB] = useMemo(() => {
    const loader = new SVGLoader();
    const parsedA = loader.parse(svgAContent);
    const parsedB = loader.parse(svgBContent);
    
    const geomA = parsedA.paths.flatMap((path, i) => {
      const shapes = SVGLoader.createShapes(path);
      return shapes.map(shape => new THREE.ExtrudeGeometry(shape, {
        depth: ${extrusionDepth} + i * ${layerSpacing} * 0.1,
        bevelEnabled: ${bevelEnabled},
        bevelThickness: ${bevelThickness},
        bevelSize: ${bevelSize},
        bevelSegments: ${bevelSegments},
        curveSegments: 16
      }));
    });

    const geomB = parsedB.paths.flatMap((path, i) => {
      const shapes = SVGLoader.createShapes(path);
      return shapes.map(shape => new THREE.ExtrudeGeometry(shape, {
        depth: ${extrusionDepth} + i * ${layerSpacing} * 0.1,
        bevelEnabled: ${bevelEnabled},
        bevelThickness: ${bevelThickness},
        bevelSize: ${bevelSize},
        bevelSegments: ${bevelSegments},
        curveSegments: 16
      }));
    });

    return [geomA, geomB];
  }, []);

  // Material tuning based on: ${materialPreset}
  const materialA = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '${colorA}',
    roughness: ${roughness},
    metalness: ${metalness},
    clearcoat: ${clearcoat},
    clearcoatRoughness: ${clearcoatRoughness},
    transmission: ${transmission},
    thickness: ${thickness},
    emissive: ${emissiveIntensity} > 0 ? new THREE.Color('${colorA}') : new THREE.Color('#000000'),
    emissiveIntensity: ${emissiveIntensity},
    transparent: true,
    opacity: 1 - progress
  }), [progress]);

  const materialB = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '${colorB}',
    roughness: ${roughness},
    metalness: ${metalness},
    clearcoat: ${clearcoat},
    clearcoatRoughness: ${clearcoatRoughness},
    transmission: ${transmission},
    thickness: ${thickness},
    emissive: ${emissiveIntensity} > 0 ? new THREE.Color('${colorB}') : new THREE.Color('#000000'),
    emissiveIntensity: ${emissiveIntensity},
    transparent: true,
    opacity: progress
  }), [progress]);

  return (
    <group scale={[0.12, -0.12, 0.12]}>
      {/* Icon A Group */}
      {geometryA.map((geom, idx) => (
        <mesh key={\`a-\${idx}\`} geometry={geom} material={materialA} castShadow receiveShadow />
      ))}
      
      {/* Icon B Group */}
      {geometryB.map((geom, idx) => (
        <mesh key={\`b-\${idx}\`} geometry={geom} material={materialB} castShadow receiveShadow />
      ))}
    </group>
  );
}
`;
  };

  // Generate dynamic single-file vanilla HTML/Three.js template
  const generateVanillaCode = () => {
    const escA = svgPathA.replace(/`/g, '\\`').trim();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>3D Shape Shifter Render</title>
  <style>
    body { margin: 0; background: #0f0a1d; overflow: hidden; }
    canvas { width: 100vw; height: 100vh; display: block; }
  </style>
</head>
<body>
  <script type="module">
    import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
    import { SVGLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/SVGLoader.js';

    // 1. Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 15);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // 2. Lights
    const ambient = new THREE.AmbientLight(0xffffff, ${ambientIntensity});
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, ${keyLightIntensity});
    key.position.set(5, 5, 4);
    key.castShadow = true;
    scene.add(key);

    // 3. SVG Parse & 3D Extrusion
    const svgContent = \`${escA}\`;
    const loader = new SVGLoader();
    const svgData = loader.parse(svgContent);
    const group = new THREE.Group();

    const mat = new THREE.MeshPhysicalMaterial({
      color: '${colorA}',
      roughness: ${roughness},
      metalness: ${metalness},
      clearcoat: ${clearcoat},
      clearcoatRoughness: ${clearcoatRoughness},
      transmission: ${transmission},
      thickness: ${thickness},
      emissive: ${emissiveIntensity} > 0 ? new THREE.Color('${colorA}') : new THREE.Color('#000000'),
      emissiveIntensity: ${emissiveIntensity}
    });

    svgData.paths.forEach((path, i) => {
      const shapes = SVGLoader.createShapes(path);
      shapes.forEach((shape) => {
        const geom = new THREE.ExtrudeGeometry(shape, {
          depth: ${extrusionDepth} + i * ${layerSpacing} * 0.1,
          bevelEnabled: ${bevelEnabled},
          bevelThickness: ${bevelThickness},
          bevelSize: ${bevelSize},
          bevelSegments: ${bevelSegments}
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.z = i * ${layerSpacing} * 0.1;
        group.add(mesh);
      });
    });

    group.scale.set(0.12, -0.12, 0.12);
    
    // Center logic
    const box = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();
    box.getCenter(center);
    group.children.forEach(c => {
      c.position.x -= center.x / group.scale.x;
      c.position.y -= center.y / group.scale.y;
    });
    scene.add(group);

    // 4. Animate Rotation loop
    function animate() {
      requestAnimationFrame(animate);
      group.rotation.y += 0.01;
      renderer.render(scene, camera);
    }
    animate();

    // Window resizing
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  </script>
</body>
</html>
`;
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#7c5cff', '#ff5b9a', '#ffd700']
    });
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleVideoRecordingToggle = () => {
    if (!isRecording) {
      setIsRecording(true);
      onStartRecording();
    } else {
      setIsRecording(false);
      onStopRecording((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = '3d-icon-transition-render.webm';
        link.click();
        
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#4ee2a3', '#7c5cff', '#ffffff']
        });
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-[620px] max-h-[85vh] bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans">
        
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <h2 className="text-base font-semibold text-white">Export & Code Center</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors text-sm">
            ✕ Close
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="flex-1 flex flex-col min-h-0 gap-0">
          {/* Tab selection */}
          <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-950 flex items-center justify-center shrink-0">
            <TabsList className="grid grid-cols-3 w-full bg-zinc-950 p-1 border border-zinc-800 rounded-lg">
              <TabsTrigger value="options" className="text-xs font-semibold py-1.5 rounded-md">Asset Exports</TabsTrigger>
              <TabsTrigger value="r3f" className="text-xs font-semibold py-1.5 rounded-md">React Three Fiber TSX</TabsTrigger>
              <TabsTrigger value="vanilla" className="text-xs font-semibold py-1.5 rounded-md">Vanilla HTML / JS</TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 min-h-0 relative bg-zinc-900 flex flex-col">
            <TabsContent value="options" className="flex-1 p-6 overflow-y-auto outline-none">
              <div className="grid grid-cols-2 gap-4">
                {/* glTF block */}
                <div className="border border-zinc-800 bg-zinc-950 p-5 rounded-lg flex flex-col justify-between h-[210px] group hover:border-violet-500/30 transition-all">
                  <div>
                    <div className="w-10 h-10 bg-violet-500/10 border border-violet-500/25 rounded-lg flex items-center justify-center mb-3">
                      <Download className="w-5 h-5 text-violet-400" />
                    </div>
                    <h3 className="font-semibold text-white text-sm mb-1">glTF / glb File</h3>
                    <p className="text-[12px] text-muted-foreground leading-normal">
                      Export the current 3D extrusion as a fully textured glTF mesh. Ready to load directly into Blender, Unity, or custom engines.
                    </p>
                  </div>
                  <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-2 font-medium" onClick={onExportGltf}>
                    Download 3D Model
                  </Button>
                </div>

                {/* Video render block */}
                <div className={`border p-5 rounded-lg flex flex-col justify-between h-[210px] transition-all ${
                  isRecording 
                    ? 'border-red-500 bg-red-950/20' 
                    : 'border-zinc-800 bg-zinc-950 hover:border-violet-500/30'
                }`}>
                  <div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 border ${
                      isRecording 
                        ? 'bg-red-500/20 border-red-500/30' 
                        : 'bg-emerald-500/10 border-emerald-500/25'
                    }`}>
                      <Video className={`w-5 h-5 ${isRecording ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`} />
                    </div>
                    <h3 className="font-semibold text-white text-sm mb-1">60fps Video Capture</h3>
                    <p className="text-[12px] text-muted-foreground leading-normal">
                      Record your 3D transitions locally in real-time. Automatically exports as transparent WebM to embed inside your website or presentation layers.
                    </p>
                  </div>
                  <Button 
                    onClick={handleVideoRecordingToggle} 
                    className={`w-full font-medium gap-2 ${
                      isRecording 
                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    }`}
                  >
                    {isRecording ? 'Stop Recording' : 'Start Studio Capture'}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="r3f" className="flex-1 p-6 outline-none flex flex-col min-h-0 relative">
              <div className="absolute top-2 right-2 z-10">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="bg-black/60 hover:bg-black text-white hover:text-white gap-1.5 h-8 font-medium border border-border/10"
                  onClick={() => handleCopyCode(generateR3fCode())}
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopied ? 'Copied!' : 'Copy Code'}
                </Button>
              </div>
              <pre className="flex-1 w-full bg-black/60 rounded-lg p-4 font-mono text-[11px] overflow-auto text-muted-foreground leading-relaxed border border-border/5">
                <code>{generateR3fCode()}</code>
              </pre>
            </TabsContent>

            <TabsContent value="vanilla" className="flex-1 p-6 outline-none flex flex-col min-h-0 relative">
              <div className="absolute top-2 right-2 z-10">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="bg-black/60 hover:bg-black text-white hover:text-white gap-1.5 h-8 font-medium border border-border/10"
                  onClick={() => handleCopyCode(generateVanillaCode())}
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopied ? 'Copied!' : 'Copy Code'}
                </Button>
              </div>
              <pre className="flex-1 w-full bg-black/60 rounded-lg p-4 font-mono text-[11px] overflow-auto text-muted-foreground leading-relaxed border border-border/5">
                <code>{generateVanillaCode()}</code>
              </pre>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>💖 Rendered client-side. Zero server uploads.</span>
          <span>Press Copy to apply to your app.</span>
        </div>
      </div>
    </div>
  );
};
