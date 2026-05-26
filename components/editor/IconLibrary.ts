import type { CSSProperties } from 'react';

export interface PresetIcon {
  id: string;
  name: string;
  defaultTint: string;
  category?: string;
  tags?: string[];
  svgContent: string;
}

const materialPath = (path: string) => `<svg viewBox="0 0 24 24"><path d="${path}"/></svg>`;
const materialSymbolCache = new Map<string, PresetIcon>();
let materialSymbolNamesCache: string[] | null = null;

export type MaterialSymbolStyle = 'outlined' | 'rounded' | 'sharp';

const materialSymbolFolder: Record<MaterialSymbolStyle, string> = {
  outlined: 'materialsymbolsoutlined',
  rounded: 'materialsymbolsrounded',
  sharp: 'materialsymbolssharp',
};

export const normalizeMaterialSymbolName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

export interface MaterialSymbolFontSettings {
  fill: 0 | 1;
  weight: number;
  grade: number;
  opticalSize: number;
}

export const materialSymbolFontStyle = (settings: MaterialSymbolFontSettings): CSSProperties => ({
  fontVariationSettings: `'FILL' ${settings.fill}, 'wght' ${settings.weight}, 'GRAD' ${settings.grade}, 'opsz' ${settings.opticalSize}`,
});

const titleFromMaterialSymbolName = (name: string) =>
  name
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');

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

export async function fetchMaterialSymbolIcon(name: string, style: MaterialSymbolStyle = 'outlined'): Promise<PresetIcon> {
  const symbolName = normalizeMaterialSymbolName(name);
  if (!symbolName) throw new Error('Enter a Material Symbol name.');

  const cacheKey = `${style}:${symbolName}`;
  const cached = materialSymbolCache.get(cacheKey);
  if (cached) return cached;

  const folder = materialSymbolFolder[style];
  const url = `https://raw.githubusercontent.com/google/material-design-icons/master/symbols/web/${symbolName}/${folder}/${symbolName}_24px.svg`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Material Symbol "${symbolName}" was not found.`);

  const svgContent = normalizeSvgToIconViewBox((await response.text()).trim());
  if (!svgContent.startsWith('<svg') || !svgContent.includes('<path')) {
    throw new Error(`Material Symbol "${symbolName}" did not return a usable SVG.`);
  }

  const icon: PresetIcon = {
    id: `material-symbol-${style}-${symbolName}`,
    name: titleFromMaterialSymbolName(symbolName),
    category: 'Material Symbols',
    tags: [symbolName, style],
    defaultTint: '#4285F4',
    svgContent,
  };
  materialSymbolCache.set(cacheKey, icon);
  return icon;
}

export async function fetchMaterialSymbolNames(): Promise<string[]> {
  if (materialSymbolNamesCache) return materialSymbolNamesCache;

  const response = await fetch('https://api.github.com/repos/google/material-design-icons/git/trees/master?recursive=1');
  if (!response.ok) throw new Error('Material Symbols catalog unavailable.');
  const data = await response.json() as { tree?: Array<{ path?: string; type?: string }> };
  const names = new Set<string>();
  for (const entry of data.tree ?? []) {
    const match = entry.path?.match(/^symbols\/web\/([^/]+)\/materialsymbolsoutlined\/\1_24px\.svg$/);
    if (match) names.add(match[1]);
  }
  materialSymbolNamesCache = Array.from(names).sort((a, b) => a.localeCompare(b));
  return materialSymbolNamesCache;
}

const CORE_ICONS: PresetIcon[] = [
  {
    id: 'heart',
    name: 'Heart',
    defaultTint: '#ff5b9a',
    svgContent: `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`
  },
  {
    id: 'star',
    name: 'Star',
    defaultTint: '#ffcc4d',
    svgContent: `<svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`
  },
  {
    id: 'bell',
    name: 'Bell',
    defaultTint: '#f1ad36',
    svgContent: `<svg viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>`
  },
  {
    id: 'cloud',
    name: 'Cloud',
    defaultTint: '#bcd1ff',
    svgContent: `<svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>`
  },
  {
    id: 'gift',
    name: 'Gift',
    defaultTint: '#a48bff',
    svgContent: `<svg viewBox="0 0 24 24"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.62 0-2.95 1.29-2.99 2.91L12 5l-.01-.09C11.95 3.29 10.62 2 9 2c-1.66 0-3 1.34-3 3 0 .35.07.69.18 1H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 14H4v-2h16v2zm0-5H4V8h16v5z"/></svg>`
  },
  {
    id: 'sparkle',
    name: 'Sparkle',
    defaultTint: '#ff8fc5',
    svgContent: `<svg viewBox="0 0 24 24"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z"/></svg>`
  },
  {
    id: 'trophy',
    name: 'Trophy',
    defaultTint: '#ffd700',
    svgContent: `<svg viewBox="0 0 24 24"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v3c0 2.42 1.72 4.44 4 4.9V17c0 1.1.9 2 2 2h1v3h6v-3h1c1.1 0 2-.9 2-2v-4.1c2.28-.46 4-2.48 4-4.9V7c0-1.1-.9-2-2-2zM5 10V7h2v3H5zm14 0h-2V7h2v3z"/></svg>`
  },
  {
    id: 'shield',
    name: 'Shield',
    defaultTint: '#4ee2a3',
    svgContent: `<svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>`
  },
  {
    id: 'bolt',
    name: 'Lightning Bolt',
    defaultTint: '#ffd23f',
    svgContent: `<svg viewBox="0 0 24 24"><path d="M11 21h-1l1-7H7.5c-.5 0-.8-.3-.9-.5-.1-.2-.1-.6.1-.8L13 3h1l-1 7h3.5c.4 0 .7.2.9.5.1.2.1.6-.1.8L11 21z"/></svg>`
  },
  {
    id: 'smile',
    name: 'Smile',
    defaultTint: '#5bc0be',
    svgContent: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 14s1.5 2 4 2 4-2 4-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="9" r="1.5"/><circle cx="15" cy="9" r="1.5"/></svg>`
  }
];

const MATERIAL_SYMBOL_ICONS: PresetIcon[] = [
  { id: 'material-home', name: 'Home', category: 'Material', tags: ['house', 'place'], defaultTint: '#4285F4', svgContent: materialPath('M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z') },
  { id: 'material-search', name: 'Search', category: 'Material', tags: ['find', 'zoom'], defaultTint: '#94a3b8', svgContent: materialPath('M9.5 3a6.5 6.5 0 0 1 5.18 10.43l4.44 4.45-1.41 1.41-4.45-4.44A6.5 6.5 0 1 1 9.5 3zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z') },
  { id: 'material-settings', name: 'Settings', category: 'Material', tags: ['gear', 'control'], defaultTint: '#94a3b8', svgContent: materialPath('M19.43 12.98c.04-.32.07-.65.07-.98s-.02-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.37-.31-.6-.22l-2.49 1a7.28 7.28 0 0 0-1.69-.98L14.5 2.42A.49.49 0 0 0 14 2h-4c-.25 0-.46.17-.5.42L9.12 5.07c-.61.23-1.18.55-1.69.98l-2.49-1a.49.49 0 0 0-.6.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.08.65-.08.98s.03.66.08.98l-2.11 1.65a.49.49 0 0 0-.12.64l2 3.46c.12.22.37.31.6.22l2.49-1c.51.4 1.08.73 1.69.98l.38 2.65c.04.25.25.42.5.42h4c.25 0 .46-.17.5-.42l.38-2.65c.61-.25 1.18-.58 1.69-.98l2.49 1c.23.08.48 0 .6-.22l2-3.46a.49.49 0 0 0-.12-.64l-2.11-1.65zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z') },
  { id: 'material-person', name: 'Person', category: 'Material', tags: ['user', 'profile'], defaultTint: '#60a5fa', svgContent: materialPath('M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z') },
  { id: 'material-check-circle', name: 'Check Circle', category: 'Material', tags: ['done', 'success'], defaultTint: '#22c55e', svgContent: materialPath('M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 14.2L6.6 12l1.4-1.4 2.8 2.8 5.2-5.2 1.4 1.4-6.6 6.6z') },
  { id: 'material-close', name: 'Close', category: 'Material', tags: ['x', 'remove'], defaultTint: '#f87171', svgContent: materialPath('M18.3 5.71 12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3l6.3 6.29 6.3-6.29z') },
  { id: 'material-add-circle', name: 'Add Circle', category: 'Material', tags: ['plus', 'create'], defaultTint: '#4ade80', svgContent: materialPath('M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z') },
  { id: 'material-play', name: 'Play', category: 'Media', tags: ['video', 'start'], defaultTint: '#22d3ee', svgContent: materialPath('M8 5v14l11-7z') },
  { id: 'material-pause', name: 'Pause', category: 'Media', tags: ['video', 'stop'], defaultTint: '#38bdf8', svgContent: materialPath('M6 5h4v14H6zm8 0h4v14h-4z') },
  { id: 'material-camera', name: 'Camera', category: 'Media', tags: ['photo', 'capture'], defaultTint: '#a78bfa', svgContent: materialPath('M9 2 7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-2.2a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6z') },
  { id: 'material-image', name: 'Image', category: 'Media', tags: ['photo', 'picture'], defaultTint: '#38bdf8', svgContent: materialPath('M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 11.5l2.5 3.01L14.5 10l4.5 6H5l3.5-4.5z') },
  { id: 'material-music', name: 'Music Note', category: 'Media', tags: ['audio', 'song'], defaultTint: '#f472b6', svgContent: materialPath('M12 3v10.55A4 4 0 1 0 14 17V7h6V3h-8z') },
  { id: 'material-mail', name: 'Mail', category: 'Communication', tags: ['email', 'message'], defaultTint: '#60a5fa', svgContent: materialPath('M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z') },
  { id: 'material-chat', name: 'Chat', category: 'Communication', tags: ['message', 'bubble'], defaultTint: '#34d399', svgContent: materialPath('M4 4h16c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H7l-5 4V6c0-1.1.9-2 2-2z') },
  { id: 'material-phone', name: 'Phone', category: 'Communication', tags: ['call'], defaultTint: '#22c55e', svgContent: materialPath('M6.62 10.79a15.1 15.1 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z') },
  { id: 'material-calendar', name: 'Calendar', category: 'Productivity', tags: ['date', 'event'], defaultTint: '#818cf8', svgContent: materialPath('M7 2v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-2V2h-2v2H9V2H7zm12 18H5V9h14v11z') },
  { id: 'material-lock', name: 'Lock', category: 'Productivity', tags: ['secure', 'private'], defaultTint: '#fbbf24', svgContent: materialPath('M18 8h-1V6A5 5 0 0 0 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-3 0H9V6a3 3 0 0 1 6 0v2z') },
  { id: 'material-folder', name: 'Folder', category: 'Productivity', tags: ['file', 'project'], defaultTint: '#facc15', svgContent: materialPath('M10 4 12 6h8c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h6z') },
  { id: 'material-cart', name: 'Cart', category: 'Commerce', tags: ['shop', 'store'], defaultTint: '#fb923c', svgContent: materialPath('M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7l1.1-2h7.45c.75 0 1.41-.41 1.75-1.03L21 5H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2z') },
  { id: 'material-location', name: 'Location', category: 'Travel', tags: ['pin', 'map'], defaultTint: '#ef4444', svgContent: materialPath('M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z') },
  { id: 'material-public', name: 'Globe', category: 'Travel', tags: ['world', 'web'], defaultTint: '#06b6d4', svgContent: materialPath('M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.93 6h-2.95a15.5 15.5 0 0 0-1.38-3.03A8.03 8.03 0 0 1 18.93 8zM12 4.04A14.1 14.1 0 0 1 13.91 8h-3.82A14.1 14.1 0 0 1 12 4.04zM4.26 14a8.5 8.5 0 0 1 0-4h3.33a16.5 16.5 0 0 0 0 4H4.26zm.81 2h2.95c.32 1.1.78 2.13 1.38 3.03A8.03 8.03 0 0 1 5.07 16zm2.95-8H5.07A8.03 8.03 0 0 1 9.4 4.97 15.5 15.5 0 0 0 8.02 8zM12 19.96A14.1 14.1 0 0 1 10.09 16h3.82A14.1 14.1 0 0 1 12 19.96zM14.34 14H9.66a14.4 14.4 0 0 1 0-4h4.68a14.4 14.4 0 0 1 0 4zm.26 5.03c.6-.9 1.06-1.93 1.38-3.03h2.95a8.03 8.03 0 0 1-4.33 3.03zM16.41 14a16.5 16.5 0 0 0 0-4h3.33a8.5 8.5 0 0 1 0 4h-3.33z') },
  { id: 'material-rocket', name: 'Rocket', category: 'Objects', tags: ['launch', 'space'], defaultTint: '#f97316', svgContent: materialPath('M12 2c3.2.8 5.6 3.2 6.4 6.4l-3.3 3.3 1.2 5.2-2.4 2.4-2.1-4.6-2.5-2.5-4.6-2.1 2.4-2.4 5.2 1.2L15.6 5.6C14.5 4.7 13.3 4.2 12 4V2zM5 15c1.1 0 2 .9 2 2 0 2.2-2 4-5 5 1-3 2.8-5 5-5z') },
  { id: 'material-diamond', name: 'Diamond', category: 'Objects', tags: ['gem', 'premium'], defaultTint: '#67e8f9', svgContent: materialPath('M6 2h12l4 6-10 14L2 8l4-6zm1 2L4.4 8H9l1.5-4H7zm4.5 0L10 8h4l-1.5-4h-1zM15 8h4.6L17 4h-3.5L15 8zm3.2 2H15l-2.2 7.1L18.2 10zM12 17.1 14 10h-4l2 7.1zM9 10H5.8l5.4 7.1L9 10z') },
];

export const PRESET_ICONS: PresetIcon[] = [...CORE_ICONS, ...MATERIAL_SYMBOL_ICONS];
