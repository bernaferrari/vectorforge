# VectorForge

VectorForge is a browser-based 3D motion editor for turning SVG and Material Symbols icons into animated, extruded 3D assets. It combines a Three.js viewport, a keyframe timeline, Figma-style color controls, shape-to-shape wipe pairs, and export tooling for web and Android Filament handoff.

The product direction is intentionally closer to Figma, Framer, After Effects, Premiere, and DaVinci Resolve than to a parameter playground: the user should see an object, adjust it directly, add breakpoints only when they want animation, and understand what will export.

## What It Does

- Converts SVG paths into extruded Three.js geometry with safe bevel and depth limits.
- Imports Material Symbols and includes curated wipe pairs for common slash/unslash transitions.
- Animates icon sequences on a timeline with shape clips, transition windows, property rows, keyframes, easing, snapping, zoom, and context menus.
- Renders a direct-manipulation 3D viewport with rotation, inertia, reset view, orientation controls, center-point debugging, and a transform gizmo.
- Edits style through compact inspector controls for fill, finish, geometry, transform, and light.
- Supports solid color and mesh gradients in the main color picker. Linear, radial, and conic modes are still present in code behind `SHOW_EXPERIMENTAL_GRADIENT_TYPES`.
- Exports WebM recordings and glTF/GLB-oriented assets, with React and Android Filament reference snippets.
- Uses light and dark editor themes through Tailwind/shadcn semantic tokens.

## Tech Stack

- **Next.js 16** and **React 19**
- **Three.js** for SVG parsing, geometry generation, scene rendering, recording, and glTF export
- **Tailwind CSS 4** with shadcn-style primitives
- **Base UI** interaction primitives
- **next-themes** for theme switching
- **TypeScript** across app, editor, timeline, and renderer logic
- **oxlint** and **oxfmt** for linting and formatting

## Getting Started

Install dependencies:

```bash
pnpm install
```

Start the editor:

```bash
pnpm dev
```

Open the local app:

```text
http://localhost:3000
```

Run the core quality gates:

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

`next/font` fetches Google font assets during production builds. If the environment blocks network access, `pnpm build` can fail even when the source is valid.

## Scripts

```bash
pnpm dev           # Start Next.js with Turbopack
pnpm build         # Production build
pnpm start         # Serve the production build
pnpm typecheck     # TypeScript validation
pnpm lint          # oxlint
pnpm lint:fix      # oxlint --fix
pnpm format        # oxfmt --write
pnpm format:check  # oxfmt --check
```

There is no ESLint workflow in this project. Use oxlint/oxfmt.

## Product Model

VectorForge is organized around four user-facing concepts:

1. **Shape sequence**
   The top timeline row contains icon clips. Adjacent clips can overlap through transition windows, so an icon can wipe, fade, cut, or morph toward the next one.

2. **Timeline properties**
   Animated properties live in timeline rows. Shape, style, geometry, rotation, scale, move, and light-related values can be keyed and edited from the timeline or inspector.

3. **Inspector controls**
   The right panel edits the selected shape and the current evaluated state. Property edits stay static unless the user opts into animation by adding a breakpoint.

4. **Renderer state**
   The editor evaluates the current time, shape transition, material, color, transform, layer overrides, and lighting, then passes that resolved state into the Three.js canvas.

## Architecture Map

```text
app/
  layout.tsx                  Root shell, fonts, providers
  page.tsx                    Editor entry point
  globals.css                 Tailwind theme tokens and Material Symbols classes

components/3d/
  SvgCanvas.tsx               Canvas boundary and imperative export surface
  SvgModelBuilder.ts          Builds icon groups from parsed SVG paths
  SvgShapeGeometry.ts         Safe ExtrudeGeometry creation and invalid-position checks
  SvgExtrudeSettings.ts       Bevel/depth safety rules
  SvgPathMaterial.ts          Per-path material creation, clipping, opacity, polygon offset
  SvgColor.ts                 Solid/mesh gradient sampling and vertex colors
  SvgSceneLifecycle.ts        Scene/camera/light lifecycle helpers
  TransformGizmo*.ts          3D transform gizmo rendering and interactions
  DiagonalWipe.ts             Wipe transition math and clipping state

components/editor/
  AppLayout.tsx               High-level editor composition and state wiring
  AppLayoutView.tsx           Pure layout shell
  useEditorBaseState.ts       Root editor state groups
  useEditorRenderState.ts     Evaluated render data for current time
  useEditor*Surface.ts        Props/adapters for viewport, timeline, inspector, export
  ShapeSequenceModel.ts       Shape clip creation, deletion, and wipe-pair application
  TimelineModel.ts            Shared timeline/keyframe types and interpolation
  TimelineProperty*Model.ts   Property row and keyframe modeling
  FinishRegistry.ts           Finish labels, previews, and default material settings
  Export*.tsx/ts              Export dialog, code snippets, scene snapshots

components/editor/timeline/
  Timeline.tsx                Timeline shell
  useTimelineController.ts    Timeline controller composition
  Timeline*Model.ts           Pure timeline geometry, snapping, menus, keyframes
  Timeline*Row/Clip.tsx       Shape, track, and property lane rendering
  ShapePicker*.tsx            Material Symbols and preset icon picker
  WipePairPreview.tsx         Slash/unslash pair previews

components/ui/
  color-picker.tsx            Solid/mesh color picker
  color-gradient-*.tsx/ts     Gradient rail, stops, presets, and pure stop operations
  color-solid-*.tsx/ts        Solid color editor
  button/dialog/popover/...   shadcn-style primitives

lib/
  drag-events.ts              Shared drag binding and pointer helpers
  use-latest-ref.ts           Stable latest-value refs for interaction callbacks
  utils.ts                    Tailwind class merging
```

## Timeline Behavior

- Click the timeline time readout to edit the duration.
- Use `+`, `-`, and `0` to zoom in, zoom out, and fit.
- Toggle snapping from the magnet control.
- Right-click timeline space, clips, transitions, and keyframes for contextual actions.
- Click a property's left-rail diamond to add or remove a breakpoint at the playhead.
- Drag keyframes or clips to retime them.
- Drag transition handles to resize the morph window.
- Press Space to play or pause.

## Viewport Behavior

- Drag the viewport to rotate the camera/object view.
- Optional inertia keeps rotation moving after release.
- Reset view animates back to the default view.
- The orientation widget gives quick 45-degree nudges.
- The transform gizmo supports direct manipulation of rotation, position, and scale.
- Center-point debugging marks the object center, not the screen center.

## Color, Finish, and Materials

The visible color picker intentionally keeps the main choice simple:

- **Solid** for one-color icons.
- **Mesh** for high-saturation multi-point palettes.

The code still contains linear, radial, and conic gradient support behind `SHOW_EXPERIMENTAL_GRADIENT_TYPES` in [color-gradient-mode-toggle.tsx](components/ui/color-gradient-mode-toggle.tsx), but those modes are hidden until their 3D application is good enough.

Finish presets are editor-level labels. They are not custom Filament material semantics. Exported assets use standard glTF PBR fields such as `metallicFactor`, `roughnessFactor`, `emissiveFactor`, double-sided rendering, and vertex colors when mesh color is active.

## Export

The export dialog is built with the local shadcn-style dialog and tabs. It currently provides:

- **Assets**: WebM recording and glTF export actions.
- **React**: a React Three Fiber reference snippet.
- **Android**: Gradle and Kotlin snippets for loading the exported GLB with Filament.

Android/Filament is a first-class handoff target. The intended asset path in the sample code is:

```text
app/src/main/assets/exports/icon.glb
```

## Development Principles

- Use Tailwind/shadcn semantic tokens: `bg-background`, `bg-popover`, `bg-muted`, `text-foreground`, `text-muted-foreground`, and `border-border`.
- Avoid hard-coded black/white UI values except for the 3D viewport or asset preview itself.
- Keep editor controls compact and scannable. This is a production tool surface, not a marketing page.
- Prefer pure model helpers for timeline math, keyframe changes, gradient stop operations, SVG geometry safety, and material creation.
- Keep interaction code centralized through shared drag helpers in [drag-events.ts](lib/drag-events.ts).
- Do not create animation data as a side effect of ordinary property edits. Animation starts when the user adds a breakpoint.
- Preserve export compatibility by keeping generated material data standard glTF PBR where possible.

## Current Focus

The app is actively being refined toward a professional editor standard. The main engineering priorities are:

- Keep extracting large surfaces into focused model, hook, and component modules.
- Make timeline and inspector behavior feel connected and predictable.
- Keep 3D interactions fast during drag-heavy operations.
- Keep color/material controls powerful without making the right inspector dense.
- Keep export output production-ready for React and Android Filament handoff.
