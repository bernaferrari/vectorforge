import * as THREE from 'three';

export type MaterialPresetId = 'clay' | 'glass' | 'chrome' | 'gold' | 'glow' | 'custom';

export interface MaterialProps {
  color: string;
  roughness: number;
  metalness: number;
  emissive: string;
  emissiveIntensity: number;
  opacity: number;
  wireframe: boolean;
  clearcoat: number;
  clearcoatRoughness: number;
  transmission: number;
  thickness: number;
  ior: number;
  map?: THREE.Texture | null;
}

export function createThreeMaterial(
  preset: MaterialPresetId,
  props: Partial<MaterialProps>
): THREE.Material {
  const color = new THREE.Color(props.color || '#a48bff');
  const opacity = props.opacity !== undefined ? props.opacity : 1.0;
  const wireframe = !!props.wireframe;
  const map = props.map || undefined;

  switch (preset) {
    case 'clay':
      return new THREE.MeshStandardMaterial({
        color,
        roughness: props.roughness !== undefined ? props.roughness : 0.85,
        metalness: props.metalness !== undefined ? props.metalness : 0.1,
        wireframe,
        transparent: opacity < 1.0,
        opacity,
        map,
      });

    case 'glass':
      return new THREE.MeshPhysicalMaterial({
        color,
        roughness: props.roughness !== undefined ? props.roughness : 0.1,
        metalness: props.metalness !== undefined ? props.metalness : 0.0,
        transmission: 0.9,
        thickness: 1.5,
        ior: 1.5,
        transparent: true,
        opacity: opacity,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        wireframe,
        map,
      });

    case 'chrome':
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color('#ffffff'), // Chrome base is white
        roughness: props.roughness !== undefined ? props.roughness : 0.05,
        metalness: props.metalness !== undefined ? props.metalness : 1.0,
        wireframe,
        transparent: opacity < 1.0,
        opacity,
        map,
      });

    case 'gold':
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color('#ffd700'), // Gold base
        roughness: props.roughness !== undefined ? props.roughness : 0.2,
        metalness: props.metalness !== undefined ? props.metalness : 0.95,
        wireframe,
        transparent: opacity < 1.0,
        opacity,
        map,
      });

    case 'glow':
      return new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: props.emissiveIntensity !== undefined ? props.emissiveIntensity : 2.0,
        roughness: 0.5,
        metalness: 0.2,
        wireframe,
        transparent: opacity < 1.0,
        opacity,
        map,
      });

    case 'custom':
      return new THREE.MeshPhysicalMaterial({
        color,
        roughness: props.roughness !== undefined ? props.roughness : 0.5,
        metalness: props.metalness !== undefined ? props.metalness : 0.0,
        clearcoat: props.clearcoat !== undefined ? props.clearcoat : 0.0,
        clearcoatRoughness: props.clearcoatRoughness !== undefined ? props.clearcoatRoughness : 0.1,
        transmission: props.transmission !== undefined ? props.transmission : 0.0,
        thickness: props.thickness !== undefined ? props.thickness : 1.0,
        ior: props.ior !== undefined ? props.ior : 1.5,
        emissive: props.emissive || (props.emissiveIntensity && props.emissiveIntensity > 0 ? color : new THREE.Color('#000000')),
        emissiveIntensity: props.emissiveIntensity !== undefined ? props.emissiveIntensity : 0.0,
        wireframe,
        transparent: opacity < 1.0 || (props.transmission !== undefined && props.transmission > 0),
        opacity,
        map,
      });

    default:
      return new THREE.MeshStandardMaterial({ color, wireframe, map });
  }
}
