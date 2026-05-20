export interface PresetIcon {
  id: string;
  name: string;
  defaultTint: string;
  svgContent: string;
}

export const PRESET_ICONS: PresetIcon[] = [
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
