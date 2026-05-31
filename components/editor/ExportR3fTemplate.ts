import {
  escapeTemplateSvg,
  type ExportCodeTemplateParams,
} from "./ExportCodeTemplateModel"

export const generateR3fCode = ({
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
  const escA = escapeTemplateSvg(svgPathA)
  const escB = escapeTemplateSvg(svgPathB)

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
    reflectivity: ${reflectance},
    envMapIntensity: ${reflectance},
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
    reflectivity: ${reflectance},
    envMapIntensity: ${reflectance},
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
`
}
