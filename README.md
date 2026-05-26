# VectorForge

VectorForge is a browser-based 3D motion editor for turning SVG icons into animated, extruded 3D assets. It combines a Three.js viewport, a keyframe timeline, Material Symbols import, Figma-style color controls, and export tooling aimed at handoff to web video or Android Filament pipelines.

The product goal is simple: make icon motion feel editable like a professional design tool instead of a parameter demo. The UI favors direct manipulation, compact inspector controls, timeline breakpoints, and predictable visual feedback.

## Highlights

- **SVG to 3D conversion** with extrusion, bevels, rounded edges, mesh color sampling, and PBR materials.
- **Interactive 3D viewport** with drag rotation, optional inertia, zoom, reset, center-of-mass debugging, and a compact orientation gizmo.
- **Motion timeline** with draggable shape clips, morph windows, keyframes, easing, snapping, zoom controls, timeline duration editing, and right-click context menus.
- **Shape sequencing** for transitioning from one icon to another, including fade, wipe, and cut-style morph windows.
- **Figma-inspired color picker** with solid, linear, radial, conic, and mesh gradient modes, editable stops, preset palettes, and keyframe support.
- **Material/finish system** for satin, glass, chrome, pearl, lacquer, frost, and custom PBR tuning.
- **Material Symbols import** using Google Material Symbols SVG sources, with style controls for outlined, rounded, and sharp symbol families.
- **Export tools** for WebM recording, glTF download, and an Android Filament integration reference.
- **Light and dark editor themes** using shadcn/Tailwind semantic color tokens.

## Tech Stack

- **Next.js 16** with React 19
- **Three.js** for scene rendering, SVG loading, geometry generation, and glTF export
- **Tailwind CSS 4** and shadcn-style UI primitives
- **Base UI** for popovers and interaction primitives
- **next-themes** for editor theme switching
- **TypeScript** throughout the editor surface

## Getting Started

Install dependencies:

```bash
pnpm install
```

Run the local editor:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

Run a type check:

```bash
pnpm typecheck
```

Build for production:

```bash
pnpm build
```

## Project Structure

```text
app/
  globals.css              Theme tokens, Tailwind setup, Material Symbols font classes
  layout.tsx               App shell and font preloads
  page.tsx                 Editor entry point

components/
  3d/
    SvgCanvas.tsx          Three.js viewport, SVG extrusion, animation preview, export hooks
    MaterialPresets.ts     PBR finish presets and material factory
  editor/
    AppLayout.tsx          Main editor layout, inspector state, playback, property wiring
    Timeline.tsx           Shape sequence, keyframes, easing, duration, zoom, context menus
    IconLibrary.ts         Preset icons and Material Symbols SVG import
    ExportModal.tsx        WebM/glTF export UI and Filament reference
    MotionRecipes.ts       Starter motion presets
  ui/
    color-picker.tsx       Solid/gradient/mesh color editor
    button.tsx, popover.tsx, tabs.tsx, switch.tsx, slider.tsx

lib/
  drag-events.ts           Shared pointer/mouse drag helpers
  utils.ts                 Class merging helper
```

## Editor Model

VectorForge separates the editor into four main concepts:

1. **Shape sequence**
   Shapes are arranged on the top timeline row. Each shape is a clip. Adjacent clips can have a transition window that defines how one icon becomes the next.

2. **Timeline properties**
   Animated values are represented as breakpoint rows. The current model supports shape transitions, fill, extrusion, rotation, scale, move, and lighting-related properties.

3. **Inspector properties**
   The right inspector edits the selected shape and active properties. Properties only create animation data when the user explicitly adds breakpoints.

4. **Renderer state**
   `SvgCanvas` receives the evaluated state for the current time and renders the extruded icon with the active material, lighting, transform, and transition settings.

## Timeline Interaction

- Click the time readout in the top-left timeline rail to edit max duration.
- Use `+`, `-`, and `0` to zoom the timeline in, out, and back to fit.
- Enable or disable snap from the magnet control.
- Right-click timeline space, clips, transitions, or keyframes for contextual actions.
- Click a property breakpoint in the left rail to add/remove it at the playhead.
- Click normal timeline space to clear selected keyframes.
- Drag shape clips to retime them.
- Drag transition handles to control morph duration.

## Color and Materials

The color system treats solid color as the simplest gradient case, so the editor can later support richer interpolation without changing the user model. Mesh gradients use a 3x3 palette-style sampling path for high-saturation icon finishes.

Materials are app-level finish presets, not native Filament semantic material types. Exported glTF uses standard PBR fields such as metallic factor, roughness factor, emissive factor, double-sided rendering, and vertex colors where applicable.

## Export

The export modal supports:

- **WebM recording** from the canvas stream.
- **glTF export** of the current 3D icon scene.
- **Android Filament reference code** for loading exported glTF assets in an Android renderer.

The Android target is intentional: exported material data should remain standard glTF PBR so Filament can consume it without editor-specific shader semantics.

## Development Notes

- Prefer shadcn/Tailwind semantic tokens such as `bg-background`, `bg-popover`, `bg-muted`, `text-foreground`, `text-muted-foreground`, and `border-border`.
- Avoid hard-coded black/white UI colors except where they are part of the rendered 3D viewport or actual asset preview.
- Keep timeline and inspector interactions connected: if a value is keyframed, edits should update the breakpoint at the playhead or create one only after the user opted into animation.
- Keep controls compact. This is an editor, not a landing page.
- There is intentionally no ESLint workflow in this project.

## Scripts

```bash
pnpm dev        # Start the Next.js development server
pnpm build      # Build the app
pnpm start      # Run the production build
pnpm typecheck  # Run TypeScript checks
pnpm format     # Format TypeScript/React files with Prettier
```

## Status

VectorForge is actively evolving. The current focus is editor ergonomics: making timeline behavior, material controls, color editing, and viewport manipulation feel coherent, fast, and professional.
