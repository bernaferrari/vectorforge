"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { Upload, ChevronLeft, ChevronRight } from "lucide-react"
import { useTheme } from "next-themes"
import { ColorPicker } from "@/components/ui/color-picker"
import {
  fetchMaterialSymbolIcon,
  PRESET_ICONS,
  PresetIcon,
} from "./IconLibrary"
import { SvgCanvas, SvgCanvasRef } from "../3d/SvgCanvas"
import { Timeline } from "./Timeline"
import {
  DEFAULT_TRANSITION_END,
  DEFAULT_TRANSITION_START,
  TimelineTrack,
  TimelinePropertyRow,
  interpolateKeyframes,
  interpolateFillKeyframes,
  applyEasing,
  ShapeStop,
  FillStop,
  FillKeyframe,
  FillGradientType,
} from "./TimelineModel"
import { ExportModal } from "./ExportModal"
import { MOTION_RECIPES } from "./MotionRecipes"
import { MATERIAL_WIPE_READY_PAIRS } from "./MaterialWipePairs"
import {
  AxisLockButton,
  InspectorSlider,
  LightDirectionPicker,
  NumberField,
  isInspectorInputDragActive,
} from "./InspectorControls"
import {
  AXIS_COLORS,
  EXTRUDE_DEFAULT,
  EXTRUDE_MAX,
  EditorSnapshot,
  FillMode,
  GEOMETRY_QUALITY_DEFAULT,
  LIGHT_MAX,
  LightPosition,
  MAX_BEVEL_SEGMENTS,
  MAX_UNDO_STEPS,
  MOVE_COLOR,
  MotionTrackId,
  ROTATION_MAX,
  ROTATION_MIN,
  SCALE_DEFAULT,
  SCALE_MAX,
  ScalarKeyframe,
  TimeKeyframe,
  Vector3Keyframe,
  clampNumber,
  createEditorId,
  finiteNumber,
  googleMeshFillStops,
  interpolateLightPositionKeyframes,
  interpolateScalarKeyframes,
  isEditableShortcutTarget,
  makeFillStops,
  normalizeFillStops,
  quantizeTimeToFrame,
  stopsForGradientType,
} from "./EditorModel"
import {
  createInitialTimelineTracks,
  timelineTrackById,
} from "./PropertyRegistry"
import {
  FINISH_PRESETS,
  MATERIAL_METADATA,
  MATERIAL_PREVIEW,
} from "./FinishRegistry"
import {
  pushEditorSnapshot,
  rememberRestoredSnapshot,
  stepEditorHistoryBack,
  stepEditorHistoryForward,
} from "./EditorHistory"
import { normalizeRecipeTracks, recolorShapesForRecipe } from "./RecipeModel"
import { useVideoExport } from "./useVideoExport"
import { useSvgUpload } from "./useSvgUpload"
import { AppTopBar } from "./AppTopBar"
import { PlaybackControls, ViewOptionsPopover } from "./ViewportControls"
import { useLightEditor } from "./useLightEditor"
import { useMaterialEditor } from "./useMaterialEditor"

const directions = [
  { label: "↖", x: -0.707, y: 0.707, tooltip: "Top Left to Bottom Right" },
  { label: "↑", x: 0, y: 1, tooltip: "Bottom to Top" },
  { label: "↗", x: 0.707, y: 0.707, tooltip: "Top Right to Bottom Left" },
  { label: "←", x: -1, y: 0, tooltip: "Right to Left" },
  { label: "•", x: 0, y: 0, tooltip: "Cinematic Cross-Fade" },
  { label: "→", x: 1, y: 0, tooltip: "Left to Right" },
  { label: "↙", x: -0.707, y: -0.707, tooltip: "Bottom Left to Top Right" },
  { label: "↓", x: 0, y: -1, tooltip: "Top to Bottom" },
  { label: "↘", x: 0.707, y: -0.707, tooltip: "Bottom Right to Top Left" },
]

export default function AppLayout() {
  const { resolvedTheme, setTheme } = useTheme()
  const [themeMounted, setThemeMounted] = useState(false)
  const isLightTheme = themeMounted && resolvedTheme === "light"
  const themeToggleLabel = themeMounted
    ? isLightTheme
      ? "Switch to dark theme"
      : "Switch to light theme"
    : "Toggle theme"

  useEffect(() => {
    setThemeMounted(true)
  }, [])

  // --- 1. Shape sequence (the morph is a timeline of shapes) ---
  const makeStop = (icon: PresetIcon, time: number): ShapeStop => ({
    id: createEditorId("shape"),
    time,
    iconId: icon.id,
    iconName: icon.name,
    svgContent: icon.svgContent,
    color: icon.defaultTint,
    colorSecondary: "#7c5cff",
    fillGradientType: "linear",
    fillStops: undefined,
    fillKeyframes: [],
    easing: "ease-in-out",
    transitionType: "wipe",
    wipeDirection: { x: 0, y: 0 },
    transitionStart: DEFAULT_TRANSITION_START,
    transitionEnd: DEFAULT_TRANSITION_END,
  })

  const [shapes, setShapes] = useState<ShapeStop[]>([])
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null)
  const [openShapePicker, setOpenShapePicker] = useState<string | null>(null)
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(
    "google-metal"
  )

  const markCustom = () => setActiveRecipeId(null)

  // Apply a recipe's styling & animation. Recolors the existing shape sequence.
  const applyRecipe = (
    recipe: (typeof MOTION_RECIPES)[0],
    shapeList?: ShapeStop[]
  ) => {
    setActiveRecipeId(recipe.id)
    setMaterialPreset(recipe.materialPreset)
    setEnableGradient(recipe.enableGradient)
    setFillMode(recipe.enableGradient ? "gradient" : "solid")
    setFillColor(recipe.colorA)
    setFillColorSecondary(
      recipe.colorASecondary ?? recipe.colorB ?? recipe.colorA
    )
    setFillGradientType(recipe.fillGradientType ?? "linear")
    setFillStops(
      recipe.id === "google-metal"
        ? googleMeshFillStops()
        : makeFillStops(
            recipe.colorA,
            recipe.colorASecondary ?? recipe.colorB ?? recipe.colorA,
            !recipe.enableGradient
          )
    )
    setFillKeyframes([])
    setShapes((prev) => recolorShapesForRecipe(shapeList ?? prev, recipe))

    setMaterialBaseSettings({
      roughness: recipe.roughness,
      metalness: recipe.metalness,
      reflectance: recipe.reflectance ?? 0.5,
      clearcoat: recipe.clearcoat,
      clearcoatRoughness: recipe.clearcoatRoughness ?? 0.1,
      transmission: recipe.transmission,
      thickness: recipe.thickness ?? 1.0,
      emissiveIntensity: recipe.emissiveIntensity,
    })

    setExtrusionDepth(recipe.extrusionDepth)
    setBevelEnabled(recipe.bevelEnabled)
    setBevelThickness(recipe.bevelThickness)
    setBevelSize(recipe.bevelSize)
    setBevelSegments(recipe.bevelSegments)
    setGeometryQuality(recipe.geometryQuality ?? GEOMETRY_QUALITY_DEFAULT)
    setLayerSpacing(recipe.layerSpacing)
    setInnerElementScale({ x: 1, y: 1, z: 1 })

    setRotationOffset({ x: 0, y: 0, z: 0 })
    setObjectScale(SCALE_DEFAULT)
    setMoveOffset({
      x: recipe.translateX ?? 0,
      y: recipe.translateY ?? 0,
      z: recipe.translateZ ?? 0,
    })
    setMoveKeyframes([])
    setQualityKeyframes([])
    setInnerScaleKeyframes([])
    setKeyLightIntensity(recipe.keyLightIntensity)
    setKeyLightPosition({ x: 5, y: 5, z: 4 })
    setKeyLightSoftness(0.35)
    setKeyLightPositionKeyframes([])

    setTracks(normalizeRecipeTracks(recipe, duration))
    setSelectedMotionTrackId("rotation")
    setCurrentTime(0)
    setIsPlaying(false)
  }

  // Seed the default sequence with a wipe-ready Material Symbol pair.
  useEffect(() => {
    let cancelled = false
    const recipe = MOTION_RECIPES.find((r) => r.id === "google-metal")
    const applyInitialShapes = (initial: ShapeStop[]) => {
      if (cancelled) return
      setShapes(initial)
      setSelectedShapeId(initial[0]?.id ?? null)
      if (recipe) applyRecipe(recipe, initial)
    }

    void (async () => {
      const pair = MATERIAL_WIPE_READY_PAIRS[0]
      try {
        const [enabled, disabled] = await Promise.all([
          fetchMaterialSymbolIcon(pair.enabled, "outlined"),
          fetchMaterialSymbolIcon(pair.disabled, "outlined", {
            syntheticOffSlash: true,
          }),
        ])
        const initial = [
          {
            ...makeStop(enabled, 1.0),
            transitionType: "wipe" as const,
            wipeDirection: { x: 0.707, y: -0.707 },
            easing: "ease-in-out" as const,
          },
          makeStop(disabled, 4.0),
        ]
        applyInitialShapes(initial)
      } catch {
        const heart = PRESET_ICONS.find((i) => i.id === "heart")
        const star = PRESET_ICONS.find((i) => i.id === "star")
        if (!heart || !star) return
        applyInitialShapes([makeStop(heart, 1.0), makeStop(star, 4.0)])
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // --- Shape sequence operations ---
  const setShapeIcon = (shapeId: string, icon: PresetIcon) => {
    markCustom()
    setShapes((prev) =>
      prev.map((s) =>
        s.id === shapeId
          ? {
              ...s,
              iconId: icon.id,
              iconName: icon.name,
              svgContent: icon.svgContent,
            }
          : s
      )
    )
  }

  const setShapeWipePair = (
    shapeId: string,
    enabled: PresetIcon,
    disabled: PresetIcon
  ) => {
    markCustom()
    setShapes((prev) => {
      const sorted = [...prev].sort((a, b) => a.time - b.time)
      const index = sorted.findIndex((shape) => shape.id === shapeId)
      if (index < 0) return prev

      const current = sorted[index]
      const next = sorted[index + 1]
      const nextTime = next
        ? next.time
        : current.time < duration - 0.1
          ? clampNumber(
              quantizeTimeToFrame(
                Math.min(
                  duration,
                  current.time + Math.max(0.85, duration * 0.25)
                )
              ),
              current.time + 0.1,
              duration
            )
          : duration
      const nextId = next?.id ?? createEditorId("shape")
      const disabledStop: ShapeStop = {
        ...(next ?? current),
        id: nextId,
        time: nextTime,
        iconId: disabled.id,
        iconName: disabled.name,
        svgContent: disabled.svgContent,
        color: disabled.defaultTint,
      }
      const withCurrent = sorted.map((shape) =>
        shape.id === current.id
          ? {
              ...shape,
              iconId: enabled.id,
              iconName: enabled.name,
              svgContent: enabled.svgContent,
              color: enabled.defaultTint,
              transitionType: "wipe" as const,
              wipeDirection: { x: 0.707, y: -0.707 },
              easing: "ease-in-out" as const,
            }
          : shape.id === nextId
            ? disabledStop
            : shape
      )

      return (next ? withCurrent : [...withCurrent, disabledStop]).sort(
        (a, b) => a.time - b.time
      )
    })
    setSelectedShapeId(shapeId)
  }

  const updateSelectedShapeColor = (value: string, secondary = false) => {
    const playheadTime = clampNumber(
      quantizeTimeToFrame(currentTime),
      0,
      duration
    )
    markCustom()
    setFillKeyframes((keyframes) => {
      const activeFill = interpolateFillKeyframes(
        currentTime,
        {
          color: fillColor,
          colorSecondary: fillColorSecondary,
          gradientType: fillGradientType,
          stops: fillStops,
        },
        keyframes
      )
      const nextColor = secondary ? activeFill.color : value
      const nextColorSecondary = secondary ? value : activeFill.colorSecondary
      const nextPositions: [number, number] = [
        activeFill.stops?.[0]?.position ?? 0,
        activeFill.stops?.[1]?.position ?? 1,
      ]
      const nextStops = makeFillStops(
        nextColor,
        nextColorSecondary,
        fillMode === "solid",
        nextPositions
      )

      if (keyframes.length === 0) {
        setFillColor(nextColor)
        setFillColorSecondary(nextStops[1].color)
        setFillStops(fillMode === "gradient" ? nextStops : undefined)
        return keyframes
      }

      const existing = keyframes.find(
        (keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04
      )
      setFillColor(nextColor)
      setFillColorSecondary(nextStops[1].color)
      return existing
        ? keyframes.map((keyframe) =>
            keyframe.id === existing.id
              ? { ...keyframe, stops: nextStops }
              : keyframe
          )
        : [
            ...keyframes,
            {
              id: createEditorId("fill"),
              time: playheadTime,
              stops: nextStops,
              gradientType: fillGradientType,
              easing:
                [...keyframes]
                  .sort((a, b) => a.time - b.time)
                  .filter((keyframe) => keyframe.time <= playheadTime)
                  .pop()?.easing ?? ("ease-in-out" as const),
            },
          ].sort((a, b) => a.time - b.time)
    })
  }

  const updateSelectedShapeGradientType = (gradientType: FillGradientType) => {
    const playheadTime = clampNumber(
      quantizeTimeToFrame(currentTime),
      0,
      duration
    )
    markCustom()
    setFillKeyframes((keyframes) => {
      const activeFill = interpolateFillKeyframes(
        currentTime,
        {
          color: fillColor,
          colorSecondary: fillColorSecondary,
          gradientType: fillGradientType,
          stops: fillStops,
        },
        keyframes
      )
      const nextStops = stopsForGradientType(
        activeFill,
        gradientType,
        fillMode === "solid"
      )
      const nextColor = nextStops[0]?.color ?? activeFill.color
      const nextColorSecondary = nextStops[1]?.color ?? nextColor

      if (keyframes.length === 0) {
        setFillColor(nextColor)
        setFillColorSecondary(nextColorSecondary)
        setFillGradientType(gradientType)
        setFillStops(nextStops)
        return keyframes
      }

      const existing = keyframes.find(
        (keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04
      )
      setFillColor(nextColor)
      setFillColorSecondary(nextColorSecondary)
      setFillGradientType(gradientType)
      setFillStops(nextStops)
      return existing
        ? keyframes.map((keyframe) =>
            keyframe.id === existing.id
              ? { ...keyframe, gradientType, stops: nextStops }
              : keyframe
          )
        : [
            ...keyframes,
            {
              id: createEditorId("fill"),
              time: playheadTime,
              stops: nextStops,
              gradientType,
              easing:
                [...keyframes]
                  .sort((a, b) => a.time - b.time)
                  .filter((keyframe) => keyframe.time <= playheadTime)
                  .pop()?.easing ?? ("ease-in-out" as const),
            },
          ].sort((a, b) => a.time - b.time)
    })
  }

  const updateSelectedShapeFillStops = (
    stops: Array<{ id?: string; color: string; position: number }>
  ) => {
    const playheadTime = clampNumber(
      quantizeTimeToFrame(currentTime),
      0,
      duration
    )
    const nextStops = normalizeFillStops(stops)
    if (nextStops.length === 0) return
    markCustom()
    setFillKeyframes((keyframes) => {
      if (keyframes.length === 0) {
        setFillColor(nextStops[0]?.color ?? fillColor)
        setFillColorSecondary(
          nextStops[1]?.color ?? nextStops[0]?.color ?? fillColorSecondary
        )
        setFillStops(nextStops)
        return keyframes
      }

      const existing = keyframes.find(
        (keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04
      )
      setFillColor(nextStops[0]?.color ?? fillColor)
      setFillColorSecondary(
        nextStops[1]?.color ?? nextStops[0]?.color ?? fillColorSecondary
      )
      setFillStops(nextStops)
      return existing
        ? keyframes.map((keyframe) =>
            keyframe.id === existing.id
              ? { ...keyframe, stops: nextStops }
              : keyframe
          )
        : [
            ...keyframes,
            {
              id: createEditorId("fill"),
              time: playheadTime,
              stops: nextStops,
              gradientType: fillGradientType,
              easing:
                [...keyframes]
                  .sort((a, b) => a.time - b.time)
                  .filter((keyframe) => keyframe.time <= playheadTime)
                  .pop()?.easing ?? ("ease-in-out" as const),
            },
          ].sort((a, b) => a.time - b.time)
    })
  }

  const addShapeAtPlayhead = () => {
    markCustom()
    setShapes((prev) => {
      const icon = PRESET_ICONS[prev.length % PRESET_ICONS.length]
      const t = clampNumber(quantizeTimeToFrame(currentTime), 0, duration)
      const stop = makeStop(icon, t)
      setSelectedShapeId(stop.id)
      setOpenShapePicker(stop.id)
      return [...prev, stop].sort((a, b) => a.time - b.time)
    })
  }

  const removeShape = (shapeId: string) => {
    setShapes((prev) => {
      const removedIndex = prev.findIndex((shape) => shape.id === shapeId)
      if (prev.length <= 1 || removedIndex < 0) return prev
      const next = prev.filter((s) => s.id !== shapeId)
      markCustom()
      setOpenShapePicker(null)
      if (selectedShapeId === shapeId) {
        setSelectedShapeId(
          next[Math.min(removedIndex, next.length - 1)]?.id ?? null
        )
      }
      return next
    })
  }

  // --- 2. Appearance & geometry state ---
  const [wireframe] = useState<boolean>(false)
  const [extrusionDepth, setExtrusionDepth] = useState<number>(EXTRUDE_DEFAULT)
  const [bevelEnabled, setBevelEnabled] = useState<boolean>(true)
  const [bevelThickness, setBevelThickness] = useState<number>(0.15)
  const [bevelSize, setBevelSize] = useState<number>(0.08)
  const [bevelSegments, setBevelSegments] = useState<number>(3)
  const [geometryQuality, setGeometryQuality] = useState<number>(
    GEOMETRY_QUALITY_DEFAULT
  )
  const [qualityKeyframes, setQualityKeyframes] = useState<ScalarKeyframe[]>([])
  const [layerSpacing, setLayerSpacing] = useState<number>(0.8)
  const [innerElementScale, setInnerElementScale] = useState({
    x: 1,
    y: 1,
    z: 1,
  })
  const [innerScaleKeyframes, setInnerScaleKeyframes] = useState<
    Vector3Keyframe[]
  >([])
  const [objectScale, setObjectScale] = useState<number>(SCALE_DEFAULT)
  const [objectScaleAxes, setObjectScaleAxes] = useState<LightPosition>({
    x: 1,
    y: 1,
    z: 1,
  })
  const [moveOffset, setMoveOffset] = useState<LightPosition>({
    x: 0,
    y: 0,
    z: 0,
  })
  const [moveKeyframes, setMoveKeyframes] = useState<Vector3Keyframe[]>([])

  const [enableGradient, setEnableGradient] = useState<boolean>(true)
  const [fillMode, setFillMode] = useState<FillMode>("gradient")
  const [fillColor, setFillColor] = useState<string>("#4285F4")
  const [fillColorSecondary, setFillColorSecondary] =
    useState<string>("#00C796")
  const [fillGradientType, setFillGradientType] =
    useState<FillGradientType>("mesh")
  const [fillStops, setFillStops] = useState<FillStop[] | undefined>(
    googleMeshFillStops()
  )
  const [fillKeyframes, setFillKeyframes] = useState<FillKeyframe[]>([])
  const [rotationOffset, setRotationOffset] = useState<LightPosition>({
    x: 0,
    y: 0,
    z: 0,
  })
  const [previewRotationY, setPreviewRotationY] = useState<number | null>(null)

  // View controls
  const [zoom, setZoom] = useState<number>(1.0)
  const [viewInertiaEnabled, setViewInertiaEnabled] = useState<boolean>(true)
  const [showCenterPoint, setShowCenterPoint] = useState<boolean>(false)
  const [showTransformGizmo, setShowTransformGizmo] = useState<boolean>(false)
  const [isScaleLocked, setIsScaleLocked] = useState<boolean>(true)
  const [isInnerScaleLocked, setIsInnerScaleLocked] = useState<boolean>(true)
  const [zenMode, setZenMode] = useState<boolean>(false)
  const [isDragging, setIsDragging] = useState<boolean>(false)

  // --- 3. Timeline Playback & Keyframe Tracks State ---
  const [duration, setDuration] = useState<number>(5.0)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [loop, setLoop] = useState<boolean>(true)
  const [isPreviewModelReady, setIsPreviewModelReady] = useState(false)
  const {
    materialPreset,
    setMaterialPreset,
    roughness,
    metalness,
    reflectance,
    clearcoat,
    clearcoatRoughness,
    transmission,
    thickness,
    emissiveIntensity,
    materialKeyframes,
    setMaterialKeyframes,
    isAdvancedMaterialOpen,
    setIsAdvancedMaterialOpen,
    activeMaterialSettings,
    setMaterialBaseSettings,
    updateMaterialSetting,
    applyMaterialPreset,
    materialKeyframeAtPlayhead,
  } = useMaterialEditor({
    currentTime,
    duration,
    onEdit: markCustom,
  })
  const {
    ambientColor,
    ambientIntensity,
    keyLightColor,
    setKeyLightColor,
    keyLightIntensity,
    setKeyLightIntensity,
    keyLightPosition,
    setKeyLightPosition,
    keyLightSoftness,
    setKeyLightSoftness,
    keyLightPositionKeyframes,
    setKeyLightPositionKeyframes,
    activeKeyLightPosition,
    lightPositionKeyframeAtPlayhead,
    toggleLightPositionKeyframeAtPlayhead,
    updateLightPositionXY,
    rimLightColor,
    rimLightIntensity,
  } = useLightEditor({
    currentTime,
    duration,
    onEdit: markCustom,
  })
  const canvas3DRef = useRef<SvgCanvasRef>(null)
  const {
    isVideoExportPendingRef,
    exportTimelineVideo,
    stopVideoExportRecording,
  } = useVideoExport({
    canvasRef: canvas3DRef,
    duration,
    setLoop,
    setIsPlaying,
    setCurrentTime,
  })
  const [selectedMotionTrackId, setSelectedMotionTrackId] =
    useState<MotionTrackId>("rotation")
  const inspectorRefs = {
    fill: useRef<HTMLDivElement>(null),
    material: useRef<HTMLDivElement>(null),
    extrusion: useRef<HTMLDivElement>(null),
    rotation: useRef<HTMLDivElement>(null),
    scale: useRef<HTMLDivElement>(null),
    move: useRef<HTMLDivElement>(null),
    lighting: useRef<HTMLDivElement>(null),
  }

  const scrollInspectorPropertyIntoView = (
    id: MotionTrackId | "fill" | "material" | "light-position"
  ) => {
    if (id === "material") setIsAdvancedMaterialOpen(true)
    const target =
      id === "light-position"
        ? inspectorRefs.lighting.current
        : inspectorRefs[id]?.current
    if (!target) return
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ block: "center", behavior: "smooth" })
    })
  }

  const selectTimelineTrack = (trackId: string) => {
    const nextTrackId = trackId as MotionTrackId
    setSelectedMotionTrackId(nextTrackId)
    setSelectedShapeId(null)
    scrollInspectorPropertyIntoView(nextTrackId)
  }

  const selectTimelinePropertyRow = (rowId: string) => {
    if (rowId === "move") setSelectedMotionTrackId("move")
    if (rowId === "style") {
      scrollInspectorPropertyIntoView("fill")
      return
    }
    scrollInspectorPropertyIntoView(
      rowId as "fill" | "material" | "light-position" | "move"
    )
  }

  // Single predictable rule for editing a property value:
  //  - If the track is NOT animated (no keyframes) → set a constant value.
  //  - If the track IS animated → update the keyframe under the playhead, or add one there.
  // This removes the old "dragging silently rewrites the whole animation" surprise.
  const setTrackValue = (
    trackId: MotionTrackId,
    nextValue: number,
    syncStaticValue?: (value: number) => void
  ) => {
    setSelectedMotionTrackId(trackId)
    setActiveRecipeId(null)

    const sourceTrack = tracks.find((track) => track.id === trackId)
    const clampedValue = sourceTrack
      ? clampNumber(nextValue, sourceTrack.min, sourceTrack.max)
      : nextValue
    syncStaticValue?.(clampedValue)

    setTracks((prevTracks) =>
      prevTracks.map((track) => {
        if (track.id !== trackId) return track

        // Constant (un-animated) property: just move the single value.
        if (track.keyframes.length === 0) {
          return { ...track, defaultValue: clampedValue }
        }

        const playheadTime = clampNumber(
          quantizeTimeToFrame(currentTime),
          0,
          duration
        )
        const exactKeyframe = track.keyframes.find(
          (keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04
        )

        // Edit the keyframe already at the playhead.
        if (exactKeyframe) {
          return {
            ...track,
            defaultValue: clampedValue,
            keyframes: track.keyframes.map((keyframe) =>
              keyframe.id === exactKeyframe.id
                ? { ...keyframe, value: clampedValue }
                : keyframe
            ),
          }
        }

        // Otherwise drop a new keyframe at the playhead, inheriting easing from the previous one.
        const previousKeyframe = [...track.keyframes]
          .sort((a, b) => a.time - b.time)
          .filter((keyframe) => keyframe.time <= playheadTime)
          .pop()

        return {
          ...track,
          defaultValue: clampedValue,
          keyframes: [
            ...track.keyframes,
            {
              id: createEditorId(track.id),
              time: playheadTime,
              value: clampedValue,
              easing: previousKeyframe?.easing ?? "ease-in-out",
            },
          ].sort((a, b) => a.time - b.time),
        }
      })
    )
  }

  const handleDepthChange = (newValue: number) => {
    setTrackValue("extrusion", newValue, setExtrusionDepth)
  }

  const handleSpinChange = (newValue: number) => {
    setTrackValue("rotation", newValue, (value) =>
      setRotationOffset((prev) => ({
        ...(prev ?? { x: 0, y: 0, z: 0 }),
        y: value,
      }))
    )
  }

  const handleScaleChange = (newValue: number) => {
    setTrackValue("scale", newValue, setObjectScale)
  }

  const handleScaleAxisChange = (
    axis: keyof LightPosition,
    newValue: number
  ) => {
    setSelectedMotionTrackId("scale")
    setActiveRecipeId(null)
    setIsScaleLocked(false)
    setObjectScaleAxes((prev) => ({
      ...prev,
      [axis]: clampNumber(newValue, 0.1, SCALE_MAX),
    }))
  }

  const handleViewRotationCommit = (delta: {
    x: number
    y: number
    z: number
  }) => {
    setSelectedMotionTrackId("rotation")
    setActiveRecipeId(null)
    setPreviewRotationY(null)
    const playheadTime = clampNumber(
      quantizeTimeToFrame(currentTime),
      0,
      duration
    )
    const rotation = tracks.find((track) => track.id === "rotation")
    const currentY =
      rotation && rotation.keyframes.length > 0
        ? interpolateKeyframes(playheadTime, rotation)
        : rotationOffset.y
    const nextY = clampNumber(currentY + delta.y, ROTATION_MIN, ROTATION_MAX)

    setRotationOffset((prev) => ({
      x: clampNumber(prev.x + delta.x, ROTATION_MIN, ROTATION_MAX),
      y: nextY,
      z: clampNumber(prev.z + delta.z, ROTATION_MIN, ROTATION_MAX),
    }))

    setTracks((prevTracks) => {
      return prevTracks.map((track) => {
        if (track.id !== "rotation") return track
        const clampedValue = clampNumber(nextY, track.min, track.max)

        if (track.keyframes.length === 0) {
          return { ...track, defaultValue: clampedValue }
        }

        const exactKeyframe = track.keyframes.find(
          (keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04
        )
        if (exactKeyframe) {
          return {
            ...track,
            defaultValue: clampedValue,
            keyframes: track.keyframes.map((keyframe) =>
              keyframe.id === exactKeyframe.id
                ? { ...keyframe, value: clampedValue }
                : keyframe
            ),
          }
        }

        const previousKeyframe = [...track.keyframes]
          .sort((a, b) => a.time - b.time)
          .filter((keyframe) => keyframe.time <= playheadTime)
          .pop()

        return {
          ...track,
          defaultValue: clampedValue,
          keyframes: [
            ...track.keyframes,
            {
              id: createEditorId(track.id),
              time: playheadTime,
              value: clampedValue,
              easing: previousKeyframe?.easing ?? "ease-in-out",
            },
          ].sort((a, b) => a.time - b.time),
        }
      })
    })
  }

  const handleViewRotationSet = (
    target: Partial<{ x: number; y: number; z: number }>,
    options: { commit?: boolean; updateTimeline?: boolean } = {}
  ) => {
    setSelectedMotionTrackId("rotation")
    setActiveRecipeId(null)
    const playheadTime = clampNumber(
      quantizeTimeToFrame(currentTime),
      0,
      duration
    )
    const clampedTarget = {
      x:
        target.x === undefined
          ? undefined
          : clampNumber(target.x, ROTATION_MIN, ROTATION_MAX),
      y:
        target.y === undefined
          ? undefined
          : clampNumber(target.y, ROTATION_MIN, ROTATION_MAX),
      z:
        target.z === undefined
          ? undefined
          : clampNumber(target.z, ROTATION_MIN, ROTATION_MAX),
    }

    setRotationOffset((prev) => ({
      x: clampedTarget.x ?? prev.x,
      y: clampedTarget.y ?? prev.y,
      z: clampedTarget.z ?? prev.z,
    }))

    if (options.updateTimeline === false) {
      if (clampedTarget.y !== undefined) {
        setPreviewRotationY(clampedTarget.y)
      }
      return
    }

    const targetY = clampedTarget.y
    if (targetY !== undefined && options.commit === false) {
      setPreviewRotationY(targetY)
      return
    }

    setPreviewRotationY(null)
    if (targetY === undefined) return
    setTracks((prevTracks) =>
      prevTracks.map((track) => {
        if (track.id !== "rotation") return track
        const clampedValue = clampNumber(targetY, track.min, track.max)
        if (track.keyframes.length === 0) {
          return { ...track, defaultValue: clampedValue }
        }

        const exactKeyframe = track.keyframes.find(
          (keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04
        )
        if (exactKeyframe) {
          return {
            ...track,
            defaultValue: clampedValue,
            keyframes: track.keyframes.map((keyframe) =>
              keyframe.id === exactKeyframe.id
                ? { ...keyframe, value: clampedValue }
                : keyframe
            ),
          }
        }

        const previousKeyframe = [...track.keyframes]
          .sort((a, b) => a.time - b.time)
          .filter((keyframe) => keyframe.time <= playheadTime)
          .pop()

        return {
          ...track,
          defaultValue: clampedValue,
          keyframes: [
            ...track.keyframes,
            {
              id: createEditorId(track.id),
              time: playheadTime,
              value: clampedValue,
              easing: previousKeyframe?.easing ?? "ease-in-out",
            },
          ].sort((a, b) => a.time - b.time),
        }
      })
    )
  }

  const handleBrightnessChange = (newValue: number) => {
    setTrackValue("lighting", newValue, setKeyLightIntensity)
  }

  const playheadRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)
  const playbackTimeRef = useRef<number>(0)
  const currentTimeRef = useRef<number>(0)

  useEffect(() => {
    currentTimeRef.current = currentTime
    if (!isPlaying) playbackTimeRef.current = currentTime
  }, [currentTime, isPlaying])

  // Keyframe timeline tracks (the morph itself lives on the separate Shape track)
  const [tracks, setTracks] = useState<TimelineTrack[]>(
    createInitialTimelineTracks
  )

  const extrusionTrack = timelineTrackById(tracks, "extrusion") ?? tracks[0]
  const rotationTrack = timelineTrackById(tracks, "rotation") ?? tracks[1]
  const scaleTrack = timelineTrackById(tracks, "scale") ?? tracks[2]
  const lightingTrack = timelineTrackById(tracks, "lighting") ?? tracks[3]
  const undoStackRef = useRef<EditorSnapshot[]>([])
  const redoStackRef = useRef<EditorSnapshot[]>([])
  const lastUndoSnapshotKeyRef = useRef("")
  const isRestoringUndoRef = useRef(false)

  const createEditorSnapshot = (): EditorSnapshot => ({
    activeRecipeId,
    shapes,
    duration,
    materialPreset,
    roughness,
    metalness,
    reflectance,
    clearcoat,
    clearcoatRoughness,
    transmission,
    thickness,
    emissiveIntensity,
    materialKeyframes,
    extrusionDepth,
    bevelEnabled,
    bevelThickness,
    bevelSize,
    bevelSegments,
    geometryQuality,
    qualityKeyframes,
    layerSpacing,
    innerElementScale,
    innerScaleKeyframes,
    objectScale,
    objectScaleAxes,
    moveOffset,
    moveKeyframes,
    enableGradient,
    fillMode,
    fillColor,
    fillColorSecondary,
    fillGradientType,
    fillStops,
    fillKeyframes,
    rotationOffset,
    keyLightColor,
    keyLightIntensity,
    keyLightPosition,
    keyLightSoftness,
    keyLightPositionKeyframes,
    tracks,
  })
  const createEditorSnapshotRef = useRef(createEditorSnapshot)
  createEditorSnapshotRef.current = createEditorSnapshot

  const restoreEditorSnapshot = (snapshot: EditorSnapshot) => {
    isRestoringUndoRef.current = true
    rememberRestoredSnapshot(snapshot, lastUndoSnapshotKeyRef)
    setActiveRecipeId(snapshot.activeRecipeId)
    setShapes(snapshot.shapes)
    // Validate current selection against restored shapes (don't restore selection — it's UI state)
    setSelectedShapeId((currentId) =>
      currentId && snapshot.shapes.some((s) => s.id === currentId)
        ? currentId
        : (snapshot.shapes[0]?.id ?? null)
    )
    setOpenShapePicker(null)
    setDuration(snapshot.duration)
    setCurrentTime((time) => clampNumber(time, 0, snapshot.duration))
    setMaterialPreset(snapshot.materialPreset)
    setMaterialBaseSettings({
      roughness: snapshot.roughness,
      metalness: snapshot.metalness,
      reflectance: snapshot.reflectance,
      clearcoat: snapshot.clearcoat,
      clearcoatRoughness: snapshot.clearcoatRoughness,
      transmission: snapshot.transmission,
      thickness: snapshot.thickness,
      emissiveIntensity: snapshot.emissiveIntensity,
    })
    setMaterialKeyframes(snapshot.materialKeyframes)
    setExtrusionDepth(snapshot.extrusionDepth)
    setBevelEnabled(snapshot.bevelEnabled)
    setBevelThickness(snapshot.bevelThickness)
    setBevelSize(snapshot.bevelSize)
    setBevelSegments(snapshot.bevelSegments)
    setGeometryQuality(snapshot.geometryQuality)
    setQualityKeyframes(snapshot.qualityKeyframes)
    setLayerSpacing(snapshot.layerSpacing)
    setInnerElementScale(snapshot.innerElementScale)
    setInnerScaleKeyframes(snapshot.innerScaleKeyframes)
    setObjectScale(snapshot.objectScale)
    setObjectScaleAxes(snapshot.objectScaleAxes ?? { x: 1, y: 1, z: 1 })
    setMoveOffset(snapshot.moveOffset)
    setMoveKeyframes(snapshot.moveKeyframes)
    setEnableGradient(snapshot.enableGradient)
    setFillMode(snapshot.fillMode)
    setFillColor(snapshot.fillColor)
    setFillColorSecondary(snapshot.fillColorSecondary)
    setFillGradientType(snapshot.fillGradientType)
    setFillStops(snapshot.fillStops)
    setFillKeyframes(snapshot.fillKeyframes)
    setRotationOffset(snapshot.rotationOffset)
    setPreviewRotationY(null)
    setKeyLightColor(snapshot.keyLightColor)
    setKeyLightIntensity(snapshot.keyLightIntensity)
    setKeyLightPosition(snapshot.keyLightPosition)
    setKeyLightSoftness(snapshot.keyLightSoftness)
    setKeyLightPositionKeyframes(snapshot.keyLightPositionKeyframes)
    setTracks(snapshot.tracks)
    setIsPlaying(false)
  }

  const undoLastEditorChange = () => {
    const previous = stepEditorHistoryBack(
      undoStackRef,
      redoStackRef,
      MAX_UNDO_STEPS
    )
    if (previous) restoreEditorSnapshot(previous)
  }

  const redoLastEditorChange = () => {
    const next = stepEditorHistoryForward(
      undoStackRef,
      redoStackRef,
      MAX_UNDO_STEPS
    )
    if (!next) return
    restoreEditorSnapshot(next)
  }

  // Push undo snapshot only when state settles (not during active drags)
  const pendingDragSnapshotRef = useRef(false)
  useEffect(() => {
    if (shapes.length === 0) return

    if (isRestoringUndoRef.current) {
      isRestoringUndoRef.current = false
      return
    }

    // During scrub drags, defer snapshot until drag ends
    if (isInspectorInputDragActive()) {
      pendingDragSnapshotRef.current = true
      return
    }

    pushEditorSnapshot({
      snapshot: createEditorSnapshot(),
      undoStackRef,
      redoStackRef,
      lastSnapshotKeyRef: lastUndoSnapshotKeyRef,
      maxSize: MAX_UNDO_STEPS,
    })
    pendingDragSnapshotRef.current = false
  }, [
    activeRecipeId,
    shapes,
    duration,
    materialPreset,
    roughness,
    metalness,
    reflectance,
    clearcoat,
    clearcoatRoughness,
    transmission,
    thickness,
    emissiveIntensity,
    materialKeyframes,
    extrusionDepth,
    bevelEnabled,
    bevelThickness,
    bevelSize,
    bevelSegments,
    geometryQuality,
    qualityKeyframes,
    layerSpacing,
    innerElementScale,
    innerScaleKeyframes,
    objectScale,
    objectScaleAxes,
    moveOffset,
    moveKeyframes,
    enableGradient,
    fillMode,
    fillColor,
    fillColorSecondary,
    fillGradientType,
    fillStops,
    fillKeyframes,
    rotationOffset,
    keyLightColor,
    keyLightIntensity,
    keyLightPosition,
    keyLightSoftness,
    keyLightPositionKeyframes,
    tracks,
  ])

  // Flush deferred snapshot when a scrub drag ends
  useEffect(() => {
    const flush = () => {
      if (pendingDragSnapshotRef.current && !isInspectorInputDragActive()) {
        pendingDragSnapshotRef.current = false
        pushEditorSnapshot({
          snapshot: createEditorSnapshotRef.current(),
          undoStackRef,
          redoStackRef,
          lastSnapshotKeyRef: lastUndoSnapshotKeyRef,
          maxSize: MAX_UNDO_STEPS,
        })
      }
    }
    window.addEventListener("pointerup", flush)
    return () => window.removeEventListener("pointerup", flush)
  }, [])

  // --- Derived morph state: which two shapes surround the playhead, and the blend between them ---
  const sortedShapes = useMemo(
    () => [...shapes].sort((a, b) => a.time - b.time),
    [shapes]
  )
  const morph = useMemo(() => {
    const fallback: ShapeStop = {
      id: "empty",
      time: 0,
      iconId: "",
      iconName: "Shape",
      svgContent: "",
      color: "#ffffff",
      colorSecondary: "#ffffff",
      fillGradientType: "linear",
      fillStops: undefined,
      fillKeyframes: [],
      easing: "ease-in-out",
      transitionType: "wipe",
      wipeDirection: { x: 0, y: 0 },
    }
    if (sortedShapes.length === 0)
      return { from: fallback, to: fallback, progress: 0 }
    const first = sortedShapes[0]
    const last = sortedShapes[sortedShapes.length - 1]
    if (sortedShapes.length === 1)
      return { from: first, to: first, progress: 0 }

    // Keep the same two icon meshes mounted outside the transition window.
    // Returning first→first before the window and last→last after it forces
    // SvgCanvas to rebuild geometry twice per loop, which shows up as playback
    // stutter. Holding the surrounding pair and clamping progress avoids that.
    if (currentTime <= first.time)
      return { from: first, to: sortedShapes[1], progress: 0 }
    if (currentTime >= last.time)
      return {
        from: sortedShapes[sortedShapes.length - 2],
        to: last,
        progress: 1,
      }
    let i = 0
    while (
      i < sortedShapes.length - 1 &&
      !(
        currentTime >= sortedShapes[i].time &&
        currentTime <= sortedShapes[i + 1].time
      )
    )
      i++
    const from = sortedShapes[i]
    const to = sortedShapes[i + 1]
    const span = to.time - from.time
    const gapFrac = span > 0 ? (currentTime - from.time) / span : 1
    // The morph only happens inside [transitionStart, transitionEnd] of the gap;
    // outside that window the shape holds (0 = fully `from`, 1 = fully `to`).
    const startFrac = from.transitionStart ?? DEFAULT_TRANSITION_START
    const endFrac = from.transitionEnd ?? DEFAULT_TRANSITION_END
    const windowProgress =
      gapFrac <= startFrac
        ? 0
        : gapFrac >= endFrac
          ? 1
          : (gapFrac - startFrac) / Math.max(1e-6, endFrac - startFrac)
    // Fade/Wipe ease across the window; "None" is a hard cut at its midpoint.
    const progress =
      from.transitionType === "none"
        ? windowProgress < 0.5
          ? 0
          : 1
        : clampNumber(applyEasing(from.easing, windowProgress), 0, 1)
    return { from, to, progress }
  }, [currentTime, sortedShapes])

  const selectedShapeFillValue = interpolateFillKeyframes(
    currentTime,
    {
      color: fillColor,
      colorSecondary: fillColorSecondary,
      gradientType: fillGradientType,
      stops: fillStops,
    },
    fillKeyframes
  )
  const selectedShapeFill = selectedShapeFillValue.color
  const selectedShapeFillSecondary = selectedShapeFillValue.colorSecondary
  const selectedShapeGradientType =
    selectedShapeFillValue.gradientType ?? fillGradientType
  const selectedShapeFillStops =
    selectedShapeFillValue.stops ??
    makeFillStops(
      selectedShapeFill,
      selectedShapeFillSecondary,
      fillMode === "solid"
    )

  // Engine-facing values derived from the surrounding shapes (SvgCanvas keeps its 2-shape crossfade).
  const iconAContent = morph.from.svgContent
  const iconBContent = morph.to.svgContent
  const fillA = selectedShapeFillValue
  const fillB = selectedShapeFillValue
  const colorA = fillA.color
  const colorASecondary = fillA.colorSecondary
  const colorB = fillB.color
  const colorBSecondary = fillB.colorSecondary
  const activeGradientType = fillA.gradientType ?? fillGradientType
  const renderAsSolid = fillMode === "solid"
  const renderEnableGradient = renderAsSolid ? true : enableGradient
  const renderGradientType = renderAsSolid ? "linear" : activeGradientType
  const renderColorASecondary = renderAsSolid ? colorA : colorASecondary
  const renderColorAStops = renderAsSolid
    ? makeFillStops(colorA, colorA, true)
    : fillA.stops
  const activeTransitionProgress = morph.progress
  // The active transition's blend style comes from the shape we're morphing FROM.
  const transitionType = morph.from.transitionType
  const wipeDirection = morph.from.wipeDirection
  const shareOutgoingFillDuringWipe =
    transitionType === "wipe" && morph.from.id !== morph.to.id
  const renderColorB = shareOutgoingFillDuringWipe ? colorA : colorB
  const renderColorBSecondary = shareOutgoingFillDuringWipe
    ? renderColorASecondary
    : renderAsSolid
      ? colorB
      : colorBSecondary
  const renderColorBStops = shareOutgoingFillDuringWipe
    ? renderColorAStops
    : renderAsSolid
      ? makeFillStops(colorB, colorB, true)
      : fillB.stops

  const activeExtrusionDepth =
    extrusionTrack.keyframes.length > 0
      ? interpolateKeyframes(currentTime, extrusionTrack)
      : extrusionDepth

  const activeRotationY =
    previewRotationY ??
    (rotationTrack.keyframes.length > 0
      ? interpolateKeyframes(currentTime, rotationTrack)
      : rotationOffset.y)

  const activeObjectScale =
    scaleTrack.keyframes.length > 0
      ? interpolateKeyframes(currentTime, scaleTrack)
      : objectScale

  const activeMoveOffset = interpolateLightPositionKeyframes(
    currentTime,
    moveOffset,
    moveKeyframes
  )

  const activeKeyLightIntensity =
    lightingTrack.keyframes.length > 0
      ? interpolateKeyframes(currentTime, lightingTrack)
      : keyLightIntensity

  const activeGeometryQuality = interpolateScalarKeyframes(
    currentTime,
    geometryQuality,
    qualityKeyframes
  )
  const activeInnerScale = interpolateLightPositionKeyframes(
    currentTime,
    innerElementScale,
    innerScaleKeyframes
  )

  useEffect(() => {
    const geometryTrack = tracks.find((track) => track.id === "extrusion")
    if (!geometryTrack || geometryTrack.keyframes.length === 0) {
      setQualityKeyframes((prev) => (prev.length === 0 ? prev : []))
      return
    }

    setQualityKeyframes((prev) => {
      const previousByLinkedId = new Map(
        prev.map((keyframe) => [keyframe.id, keyframe])
      )
      const next = geometryTrack.keyframes.map((keyframe) => {
        const linkedId = `quality-${keyframe.id}`
        const existing =
          previousByLinkedId.get(linkedId) ??
          prev.find((item) => Math.abs(item.time - keyframe.time) < 0.04)

        return {
          id: linkedId,
          time: keyframe.time,
          value: existing?.value ?? geometryQuality,
          easing: keyframe.easing,
        }
      })

      const unchanged =
        prev.length === next.length &&
        prev.every((keyframe, index) => {
          const candidate = next[index]
          return (
            keyframe.id === candidate.id &&
            Math.abs(keyframe.time - candidate.time) < 0.001 &&
            Math.abs(keyframe.value - candidate.value) < 0.0001 &&
            keyframe.easing === candidate.easing
          )
        })

      return unchanged ? prev : next
    })
  }, [tracks, geometryQuality])

  const keyframeAtPlayhead = (track: TimelineTrack) => {
    const playheadTime = quantizeTimeToFrame(currentTime)
    return track.keyframes.find(
      (keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04
    )
  }

  const getAdjacentKeyframeTimes = (keyframes: TimeKeyframe[]) => {
    const sortedTimes = Array.from(
      new Set(
        keyframes
          .map((keyframe) =>
            Number(clampNumber(keyframe.time, 0, duration).toFixed(2))
          )
          .filter(Number.isFinite)
      )
    ).sort((a, b) => a - b)

    return {
      previous: [...sortedTimes]
        .reverse()
        .find((time) => time < currentTime - 0.04),
      next: sortedTimes.find((time) => time > currentTime + 0.04),
    }
  }

  const jumpToPropertyKeyframe = (time: number | undefined) => {
    if (time === undefined) return
    setIsPlaying(false)
    setCurrentTime(clampNumber(Number(time.toFixed(3)), 0, duration))
  }

  const keyframeNavButtonClass =
    "flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground/45 transition-colors duration-100 hover:bg-muted/50 hover:text-foreground focus-visible:outline-none"

  const getPropertyKeyframeNavigator = (keyframes: TimeKeyframe[]) => {
    if (keyframes.length === 0) return null
    const { previous, next } = getAdjacentKeyframeTimes(keyframes)

    return { previous, next }
  }

  // Always rendered (takes space), invisible when there is no adjacent keyframe to jump to.
  // Made smaller + lower opacity for Figma-like minimalism.
  const renderPreviousPropertyKeyframeButton = (
    time: number | undefined,
    label: string
  ) => (
    <button
      type="button"
      aria-label={`Previous ${label} keyframe`}
      title={time !== undefined ? `Previous ${label} keyframe` : undefined}
      disabled={time === undefined}
      onClick={(event) => {
        event.stopPropagation()
        jumpToPropertyKeyframe(time)
      }}
      className={`${keyframeNavButtonClass} ${time === undefined ? "invisible" : "opacity-60 hover:opacity-100"}`}
    >
      <ChevronLeft className="size-2.5" />
    </button>
  )

  const renderNextPropertyKeyframeButton = (
    time: number | undefined,
    label: string
  ) => (
    <button
      type="button"
      aria-label={`Next ${label} keyframe`}
      title={time !== undefined ? `Next ${label} keyframe` : undefined}
      disabled={time === undefined}
      onClick={(event) => {
        event.stopPropagation()
        jumpToPropertyKeyframe(time)
      }}
      className={`${keyframeNavButtonClass} ${time === undefined ? "invisible" : "opacity-60 hover:opacity-100"}`}
    >
      <ChevronRight className="size-2.5" />
    </button>
  )

  const renderPropertyKeyframeControlGroup = (
    keyframes: TimeKeyframe[],
    label: string,
    keyframeButton: React.ReactNode
  ) => {
    const navigator = getPropertyKeyframeNavigator(keyframes)

    return (
      <div className="-mr-1 flex w-[44px] shrink-0 items-center justify-between">
        {renderPreviousPropertyKeyframeButton(navigator?.previous, label)}
        {keyframeButton}
        {renderNextPropertyKeyframeButton(navigator?.next, label)}
      </div>
    )
  }

  const keyframeTimeMatchesPlayhead = (time: number) =>
    Math.abs(time - quantizeTimeToFrame(currentTime)) < 0.04

  const removePlayheadKeyframes = <T extends TimeKeyframe>(keyframes: T[]) =>
    keyframes.filter((keyframe) => !keyframeTimeMatchesPlayhead(keyframe.time))

  const previousEasingFor = <
    T extends TimeKeyframe & { easing?: FillKeyframe["easing"] },
  >(
    keyframes: T[],
    time: number
  ): FillKeyframe["easing"] =>
    [...keyframes]
      .sort((a, b) => a.time - b.time)
      .filter((keyframe) => keyframe.time <= time)
      .pop()?.easing ?? ("ease-in-out" as const)

  const resetMovePositionToOrigin = () => {
    const origin = { x: 0, y: 0, z: 0 }
    const playheadTime = clampNumber(
      quantizeTimeToFrame(currentTime),
      0,
      duration
    )

    setActiveRecipeId(null)
    setMoveOffset(origin)
    setMoveKeyframes((keyframes) => {
      if (keyframes.length === 0) return keyframes

      const existing = keyframes.find((keyframe) =>
        keyframeTimeMatchesPlayhead(keyframe.time)
      )
      if (existing) {
        return keyframes.map((keyframe) =>
          keyframe.id === existing.id
            ? { ...keyframe, value: origin }
            : keyframe
        )
      }

      return [
        ...keyframes,
        {
          id: createEditorId("move"),
          time: playheadTime,
          value: origin,
          easing: previousEasingFor(keyframes, playheadTime),
        },
      ].sort((a, b) => a.time - b.time)
    })
  }

  const resetView = () => {
    canvas3DRef.current?.resetRotation()
    resetMovePositionToOrigin()
  }

  const renderSectionKeyframeControl = ({
    keyframes,
    label,
    isKeyedHere,
    color,
    onToggle,
  }: {
    keyframes: TimeKeyframe[]
    label: string
    isKeyedHere: boolean
    color: string
    onToggle: () => void
  }) => {
    const keyframeButton = (
      <button
        type="button"
        aria-label={`${isKeyedHere ? "Remove" : "Add"} ${label} keyframe at current time`}
        title={`${isKeyedHere ? "Remove" : "Add"} ${label} keyframe`}
        onClick={(event) => {
          event.stopPropagation()
          onToggle()
        }}
        className={`flex size-4 shrink-0 items-center justify-center rounded transition-colors duration-100 focus-visible:outline-none ${
          isKeyedHere ? "" : "hover:bg-muted/40"
        }`}
      >
        <span
          className={`size-[7px] rotate-45 rounded-[1px] border transition-all ${isKeyedHere ? "border-transparent" : "border-muted-foreground/40"}`}
          style={{ backgroundColor: isKeyedHere ? color : "transparent" }}
        />
      </button>
    )

    return renderPropertyKeyframeControlGroup(keyframes, label, keyframeButton)
  }

  const toggleKeyframeAtPlayhead = (track: TimelineTrack, value: number) => {
    const playheadTime = clampNumber(
      quantizeTimeToFrame(currentTime),
      0,
      duration
    )
    setSelectedMotionTrackId(track.id as MotionTrackId)
    setActiveRecipeId(null)
    setTracks((prevTracks) =>
      prevTracks.map((item) => {
        if (item.id !== track.id) return item
        const existing = item.keyframes.find(
          (keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04
        )
        if (existing) {
          return {
            ...item,
            defaultValue: clampNumber(value, item.min, item.max),
            keyframes: item.keyframes.filter(
              (keyframe) => keyframe.id !== existing.id
            ),
          }
        }

        return {
          ...item,
          defaultValue: clampNumber(value, item.min, item.max),
          keyframes: [
            ...item.keyframes,
            {
              id: createEditorId(item.id),
              time: playheadTime,
              value: clampNumber(value, item.min, item.max),
              easing: "ease-in-out" as const,
            },
          ].sort((a, b) => a.time - b.time),
        }
      })
    )
  }

  const moveKeyframeAtPlayhead = () => {
    const playheadTime = quantizeTimeToFrame(currentTime)
    return moveKeyframes.find(
      (keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04
    )
  }

  const updateMoveAxis = (axis: keyof LightPosition, value: number) => {
    const clamped = clampNumber(value, -100, 100)
    const playheadTime = clampNumber(
      quantizeTimeToFrame(currentTime),
      0,
      duration
    )
    const nextMove = { ...activeMoveOffset, [axis]: clamped }
    setSelectedMotionTrackId("move")
    setActiveRecipeId(null)
    setMoveOffset(nextMove)
    setMoveKeyframes((prev) => {
      if (prev.length === 0) return prev
      const existing = prev.find(
        (keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04
      )
      if (existing) {
        return prev.map((keyframe) =>
          keyframe.id === existing.id
            ? { ...keyframe, value: nextMove }
            : keyframe
        )
      }
      const previousKeyframe = [...prev]
        .sort((a, b) => a.time - b.time)
        .filter((keyframe) => keyframe.time <= playheadTime)
        .pop()
      return [
        ...prev,
        {
          id: createEditorId("move"),
          time: playheadTime,
          value: nextMove,
          easing: previousKeyframe?.easing ?? "ease-in-out",
        },
      ].sort((a, b) => a.time - b.time)
    })
  }

  const updateQuality = (value: number) => {
    const clamped = clampNumber(value, 0.015, 0.12)
    const playheadTime = clampNumber(
      quantizeTimeToFrame(currentTime),
      0,
      duration
    )
    setActiveRecipeId(null)
    setGeometryQuality(clamped)
    setQualityKeyframes((prev) => {
      if (prev.length === 0) return prev
      const existing = prev.find(
        (kf) => Math.abs(kf.time - playheadTime) < 0.04
      )
      if (existing)
        return prev.map((kf) =>
          kf.id === existing.id ? { ...kf, value: clamped } : kf
        )
      return prev
    })
  }

  // --- Inner Scale keyframe helpers ---
  const innerScaleKeyframeAtPlayhead = () => {
    const playheadTime = quantizeTimeToFrame(currentTime)
    return innerScaleKeyframes.find(
      (kf) => Math.abs(kf.time - playheadTime) < 0.04
    )
  }

  const updateInnerScaleAxis = (axis: keyof LightPosition, value: number) => {
    const clamped = clampNumber(value, axis === "z" ? 0.2 : 0.35, 1.35)
    const playheadTime = clampNumber(
      quantizeTimeToFrame(currentTime),
      0,
      duration
    )
    const nextScale = { ...activeInnerScale, [axis]: clamped }
    setActiveRecipeId(null)
    setInnerElementScale(nextScale)
    setInnerScaleKeyframes((prev) => {
      if (prev.length === 0) return prev
      const existing = prev.find(
        (kf) => Math.abs(kf.time - playheadTime) < 0.04
      )
      if (existing)
        return prev.map((kf) =>
          kf.id === existing.id ? { ...kf, value: nextScale } : kf
        )
      const previousKf = [...prev]
        .sort((a, b) => a.time - b.time)
        .filter((kf) => kf.time <= playheadTime)
        .pop()
      return [
        ...prev,
        {
          id: createEditorId("inner-scale"),
          time: playheadTime,
          value: nextScale,
          easing: previousKf?.easing ?? ("ease-in-out" as const),
        },
      ].sort((a, b) => a.time - b.time)
    })
  }

  const updateInnerScaleAll = (value: number) => {
    const clamped = clampNumber(value, 0.35, 1.35)
    const playheadTime = clampNumber(
      quantizeTimeToFrame(currentTime),
      0,
      duration
    )
    const nextScale = { x: clamped, y: clamped, z: clamped }
    setActiveRecipeId(null)
    setInnerElementScale(nextScale)
    setInnerScaleKeyframes((prev) => {
      if (prev.length === 0) return prev
      const existing = prev.find(
        (kf) => Math.abs(kf.time - playheadTime) < 0.04
      )
      if (existing)
        return prev.map((kf) =>
          kf.id === existing.id ? { ...kf, value: nextScale } : kf
        )
      const previousKf = [...prev]
        .sort((a, b) => a.time - b.time)
        .filter((kf) => kf.time <= playheadTime)
        .pop()
      return [
        ...prev,
        {
          id: createEditorId("inner-scale"),
          time: playheadTime,
          value: nextScale,
          easing: previousKf?.easing ?? ("ease-in-out" as const),
        },
      ].sort((a, b) => a.time - b.time)
    })
  }

  const renderLightPositionKeyframeControl = () => {
    const isKeyedHere = Boolean(lightPositionKeyframeAtPlayhead())
    const keyframeButton = (
      <button
        type="button"
        aria-label={`${isKeyedHere ? "Remove" : "Add"} light position keyframe at current time`}
        title={`${isKeyedHere ? "Remove" : "Add"} light position keyframe`}
        onClick={(event) => {
          event.stopPropagation()
          toggleLightPositionKeyframeAtPlayhead()
        }}
        className={`flex size-4 shrink-0 items-center justify-center rounded transition-colors duration-100 focus-visible:outline-none ${
          isKeyedHere ? "" : "hover:bg-muted/40"
        }`}
      >
        <span
          className={`size-[7px] rotate-45 rounded-[1px] border transition-all ${isKeyedHere ? "border-transparent" : "border-muted-foreground/40"}`}
          style={{ backgroundColor: isKeyedHere ? "#ff5b9a" : "transparent" }}
        />
      </button>
    )

    return renderPropertyKeyframeControlGroup(
      keyLightPositionKeyframes,
      "light position",
      keyframeButton
    )
  }

  // Figma/Framer-style consistent label + control rows
  const LABEL_WIDTH = "w-[66px]"
  const propertyRowClass = (isActive?: boolean) =>
    `flex min-h-8 items-center gap-1 rounded-[8px] -mx-1.5 px-1.5 py-0.5 transition-colors duration-100 ${
      isActive ? "bg-muted/50" : "hover:bg-muted/25"
    }`

  const renderKeyframeControl = (track: TimelineTrack, value: number) => {
    const isKeyedHere = Boolean(keyframeAtPlayhead(track))
    const keyframeButton = (
      <button
        type="button"
        aria-label={`${isKeyedHere ? "Remove" : "Add"} ${track.name} keyframe at current time`}
        title={`${isKeyedHere ? "Remove" : "Add"} ${track.name} keyframe`}
        onClick={(event) => {
          event.stopPropagation()
          toggleKeyframeAtPlayhead(track, value)
        }}
        className={`flex size-4 shrink-0 items-center justify-center rounded transition-colors duration-100 focus-visible:outline-none ${
          isKeyedHere ? "" : "hover:bg-muted/40"
        }`}
      >
        <span
          className={`size-[7px] rotate-45 rounded-[1px] border transition-all ${isKeyedHere ? "border-transparent" : "border-muted-foreground/40"}`}
          style={{ backgroundColor: isKeyedHere ? track.color : "transparent" }}
        />
      </button>
    )

    return renderPropertyKeyframeControlGroup(
      track.keyframes,
      track.name.toLowerCase(),
      keyframeButton
    )
  }

  const colorKeyframeAtPlayhead = () => {
    const playheadTime = quantizeTimeToFrame(currentTime)
    return fillKeyframes.find(
      (keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04
    )
  }

  const isStyleKeyedAtPlayhead = () =>
    Boolean(colorKeyframeAtPlayhead() || materialKeyframeAtPlayhead())

  const toggleStyleKeyframeAtPlayhead = () => {
    const playheadTime = clampNumber(
      quantizeTimeToFrame(currentTime),
      0,
      duration
    )
    const isKeyedHere = isStyleKeyedAtPlayhead()
    markCustom()

    setFillKeyframes((keyframes) => {
      if (isKeyedHere) return removePlayheadKeyframes(keyframes)

      return [
        ...keyframes,
        {
          id: createEditorId("fill"),
          time: playheadTime,
          stops: selectedShapeFillStops,
          gradientType: selectedShapeGradientType,
          easing: previousEasingFor(keyframes, playheadTime),
        },
      ].sort((a, b) => a.time - b.time)
    })

    setMaterialKeyframes((keyframes) => {
      if (isKeyedHere) return removePlayheadKeyframes(keyframes)

      return [
        ...keyframes,
        {
          id: createEditorId("material"),
          time: playheadTime,
          value: activeMaterialSettings,
          easing: previousEasingFor(keyframes, playheadTime),
        },
      ].sort((a, b) => a.time - b.time)
    })
  }

  const styleKeyframes = [...fillKeyframes, ...materialKeyframes]
  const renderStyleKeyframeControl = () =>
    renderSectionKeyframeControl({
      keyframes: styleKeyframes,
      label: "style",
      isKeyedHere: isStyleKeyedAtPlayhead(),
      color: "#a78bfa",
      onToggle: toggleStyleKeyframeAtPlayhead,
    })

  const isTransformKeyedAtPlayhead = () =>
    Boolean(
      keyframeAtPlayhead(scaleTrack) ||
      keyframeAtPlayhead(rotationTrack) ||
      moveKeyframeAtPlayhead() ||
      innerScaleKeyframeAtPlayhead()
    )

  const toggleTransformKeyframeAtPlayhead = () => {
    const playheadTime = clampNumber(
      quantizeTimeToFrame(currentTime),
      0,
      duration
    )
    const isKeyedHere = isTransformKeyedAtPlayhead()
    setActiveRecipeId(null)

    setTracks((prevTracks) =>
      prevTracks.map((track) => {
        if (track.id !== "scale" && track.id !== "rotation") return track
        if (isKeyedHere) {
          return {
            ...track,
            keyframes: removePlayheadKeyframes(track.keyframes),
          }
        }

        const value = track.id === "scale" ? activeObjectScale : activeRotationY
        return {
          ...track,
          defaultValue: clampNumber(value, track.min, track.max),
          keyframes: [
            ...track.keyframes,
            {
              id: createEditorId(track.id),
              time: playheadTime,
              value: clampNumber(value, track.min, track.max),
              easing: previousEasingFor(track.keyframes, playheadTime),
            },
          ].sort((a, b) => a.time - b.time),
        }
      })
    )

    setMoveKeyframes((keyframes) => {
      if (isKeyedHere) return removePlayheadKeyframes(keyframes)
      return [
        ...keyframes,
        {
          id: createEditorId("move"),
          time: playheadTime,
          value: activeMoveOffset,
          easing: previousEasingFor(keyframes, playheadTime),
        },
      ].sort((a, b) => a.time - b.time)
    })

    setInnerScaleKeyframes((keyframes) => {
      if (isKeyedHere) return removePlayheadKeyframes(keyframes)
      return [
        ...keyframes,
        {
          id: createEditorId("inner-scale"),
          time: playheadTime,
          value: activeInnerScale,
          easing: previousEasingFor(keyframes, playheadTime),
        },
      ].sort((a, b) => a.time - b.time)
    })
  }

  const transformKeyframes = [
    ...scaleTrack.keyframes,
    ...rotationTrack.keyframes,
    ...moveKeyframes,
    ...innerScaleKeyframes,
  ]
  const renderTransformKeyframeControl = () =>
    renderSectionKeyframeControl({
      keyframes: transformKeyframes,
      label: "transform",
      isKeyedHere: isTransformKeyedAtPlayhead(),
      color: rotationTrack.color,
      onToggle: toggleTransformKeyframeAtPlayhead,
    })

  // Real-time playhead progress loop
  useEffect(() => {
    if (isPlaying) {
      playbackTimeRef.current = clampNumber(currentTimeRef.current, 0, duration)
      lastTimeRef.current = performance.now()
      const tick = () => {
        const now = performance.now()
        const delta = (now - lastTimeRef.current) / 1000
        lastTimeRef.current = now

        setCurrentTime((prev) => {
          let next = playbackTimeRef.current + delta
          if (next >= duration) {
            if (loop) {
              next = next % duration
            } else {
              next = duration
              setIsPlaying(false)
              if (isVideoExportPendingRef.current) {
                window.requestAnimationFrame(stopVideoExportRecording)
              }
            }
          }
          playbackTimeRef.current = next
          const quantized = quantizeTimeToFrame(next)
          return quantized === prev ? prev : quantized
        })

        playheadRef.current = requestAnimationFrame(tick)
      }

      playheadRef.current = requestAnimationFrame(tick)
    } else {
      if (playheadRef.current) {
        cancelAnimationFrame(playheadRef.current)
        playheadRef.current = null
      }
      playbackTimeRef.current = currentTimeRef.current
    }

    return () => {
      if (playheadRef.current) cancelAnimationFrame(playheadRef.current)
    }
  }, [isPlaying, duration, loop])

  const handlePlayToggle = () => {
    // Restart from the top if we're paused at the very end.
    if (!isPlaying && currentTime >= duration - 0.001) {
      setCurrentTime(0)
    }
    setIsPlaying(!isPlaying)
  }

  useEffect(() => {
    const handleEditorShortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return
      if (isEditableShortcutTarget(event.target)) return

      // Redo: Cmd+Shift+Z (must check before undo)
      const isRedoShortcut =
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === "z"

      if (isRedoShortcut) {
        event.preventDefault()
        redoLastEditorChange()
        return
      }

      // Undo: Cmd+Z
      const isUndoShortcut =
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === "z"

      if (isUndoShortcut) {
        event.preventDefault()
        undoLastEditorChange()
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return

      if (event.code === "Space") {
        event.preventDefault()
        handlePlayToggle()
      }
    }

    window.addEventListener("keydown", handleEditorShortcut)
    return () => window.removeEventListener("keydown", handleEditorShortcut)
  }, [handlePlayToggle, undoLastEditorChange, redoLastEditorChange])

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const shapeTransitionBreakpoints = sortedShapes
    .slice(0, -1)
    .flatMap((from, index) => {
      const to = sortedShapes[index + 1]
      const gap = Math.max(0, to.time - from.time)
      const start =
        from.time + (from.transitionStart ?? DEFAULT_TRANSITION_START) * gap
      const end =
        from.time + (from.transitionEnd ?? DEFAULT_TRANSITION_END) * gap
      return [start, end]
    })

  const timelineBreakpoints = Array.from(
    new Set(
      [
        0,
        duration,
        ...shapeTransitionBreakpoints,
        ...fillKeyframes.map((keyframe) => keyframe.time),
        ...tracks.flatMap((track) =>
          track.keyframes.map((keyframe) => keyframe.time)
        ),
        ...moveKeyframes.map((keyframe) => keyframe.time),
        ...keyLightPositionKeyframes.map((keyframe) => keyframe.time),
        ...materialKeyframes.map((keyframe) => keyframe.time),
        ...innerScaleKeyframes.map((keyframe) => keyframe.time),
      ].map((time) => Number(clampNumber(time, 0, duration).toFixed(3)))
    )
  ).sort((a, b) => a - b)

  const goToTime = (time: number) => {
    setIsPlaying(false)
    setCurrentTime(quantizeTimeToFrame(clampNumber(time, 0, duration)))
  }

  const previousBreakpoint = [...timelineBreakpoints]
    .reverse()
    .find((time) => time < currentTime - 0.04)
  const nextBreakpoint = timelineBreakpoints.find(
    (time) => time > currentTime + 0.04
  )
  const atTimelineStart = currentTime <= 0.04
  const atTimelineEnd = currentTime >= duration - 0.04
  const playbackProgress =
    duration > 0 ? clampNumber(currentTime / duration, 0, 1) : 0

  const goToPreviousBreakpoint = () => {
    if (previousBreakpoint !== undefined) goToTime(previousBreakpoint)
  }

  const goToNextBreakpoint = () => {
    if (nextBreakpoint !== undefined) goToTime(nextBreakpoint)
  }

  const goToEnd = () => goToTime(duration)
  const handleDurationChange = (value: number) => {
    const next = clampNumber(value, 0.5, 30)
    setDuration(next)
    setCurrentTime((time) => clampNumber(time, 0, next))
    setActiveRecipeId(null)
  }

  const handleTracksChange = (nextTracks: TimelineTrack[]) => {
    setTracks(nextTracks)
    setActiveRecipeId(null)
  }

  const styleTimelineKeyframes = Array.from(
    new Map(
      styleKeyframes.map((keyframe) => [
        Number(keyframe.time.toFixed(3)),
        clampNumber(keyframe.time, 0, duration),
      ])
    ).values()
  ).sort((a, b) => a - b)

  const timelinePropertyRows: TimelinePropertyRow[] = [
    ...(styleTimelineKeyframes.length
      ? [
          {
            id: "style",
            name: "Style",
            color: "#a78bfa",
            keyframes: styleTimelineKeyframes.map((time) => ({
              id: `style-${time.toFixed(3)}`,
              time,
              label: "Style",
            })),
          },
        ]
      : []),
    ...(keyLightPositionKeyframes.length
      ? [
          {
            id: "light-position",
            name: "Light Position",
            color: "#ffd166",
            keyframes: keyLightPositionKeyframes.map((keyframe) => ({
              id: keyframe.id,
              time: keyframe.time,
              label: `X ${keyframe.value.x.toFixed(1)} Y ${keyframe.value.y.toFixed(1)} Z ${keyframe.value.z.toFixed(1)}`,
            })),
          },
        ]
      : []),
    ...(moveKeyframes.length
      ? [
          {
            id: "move",
            name: "Move",
            color: MOVE_COLOR,
            keyframes: moveKeyframes.map((keyframe) => ({
              id: keyframe.id,
              time: keyframe.time,
              label: `X ${keyframe.value.x.toFixed(0)} Y ${keyframe.value.y.toFixed(0)} Z ${keyframe.value.z.toFixed(0)}`,
            })),
          },
        ]
      : []),
    ...(innerScaleKeyframes.length
      ? [
          {
            id: "inner-scale",
            name: "Inner Scale",
            color: "#fb923c",
            keyframes: innerScaleKeyframes.map((kf) => ({
              id: kf.id,
              time: kf.time,
              label: `X ${kf.value.x.toFixed(2)} Y ${kf.value.y.toFixed(2)} Z ${kf.value.z.toFixed(2)}`,
            })),
          },
        ]
      : []),
  ]

  const clearTimelineTrackRow = (trackId: string) => {
    setTracks((prev) =>
      prev.map((track) =>
        track.id === trackId ? { ...track, keyframes: [] } : track
      )
    )
    setActiveRecipeId(null)
  }

  const clearTimelinePropertyRow = (rowId: string) => {
    if (rowId === "style") {
      setFillKeyframes([])
      setMaterialKeyframes([])
      markCustom()
      return
    }
    if (rowId === "fill") {
      setFillKeyframes([])
      markCustom()
    }
    if (rowId === "light-position") {
      setKeyLightPositionKeyframes([])
      markCustom()
    }
    if (rowId === "move") {
      setMoveKeyframes([])
      markCustom()
    }
    if (rowId === "material") {
      setMaterialKeyframes([])
      markCustom()
    }
    if (rowId === "quality") {
      setQualityKeyframes([])
      markCustom()
    }
    if (rowId === "inner-scale") {
      setInnerScaleKeyframes([])
      markCustom()
    }
  }

  const removeTimelinePropertyKeyframe = (
    rowId: string,
    keyframeId: string
  ) => {
    if (rowId === "style") {
      const keyframeTime = Number(keyframeId.replace("style-", ""))
      setFillKeyframes((prev) =>
        prev.filter(
          (keyframe) => Math.abs(keyframe.time - keyframeTime) >= 0.04
        )
      )
      setMaterialKeyframes((prev) =>
        prev.filter(
          (keyframe) => Math.abs(keyframe.time - keyframeTime) >= 0.04
        )
      )
      markCustom()
      return
    }
    if (rowId === "fill") {
      setFillKeyframes((prev) =>
        prev.filter((keyframe) => keyframe.id !== keyframeId)
      )
      markCustom()
    }
    if (rowId === "light-position") {
      setKeyLightPositionKeyframes((prev) =>
        prev.filter((keyframe) => keyframe.id !== keyframeId)
      )
      markCustom()
    }
    if (rowId === "move") {
      setMoveKeyframes((prev) =>
        prev.filter((keyframe) => keyframe.id !== keyframeId)
      )
      markCustom()
    }
    if (rowId === "material") {
      setMaterialKeyframes((prev) =>
        prev.filter((keyframe) => keyframe.id !== keyframeId)
      )
      markCustom()
    }
    if (rowId === "quality") {
      setQualityKeyframes((prev) => prev.filter((kf) => kf.id !== keyframeId))
      markCustom()
    }
    if (rowId === "inner-scale") {
      setInnerScaleKeyframes((prev) =>
        prev.filter((kf) => kf.id !== keyframeId)
      )
      markCustom()
    }
  }

  const handleScrubStart = () => setIsPlaying(false)

  // --- 4. Exporter modal ---
  const [isExportOpen, setIsExportOpen] = useState(false)
  const {
    uploadFileRef,
    handleUploadInputChange,
    handleDropSvg,
    triggerShapeUpload,
  } = useSvgUpload({
    selectedShapeId,
    setShapes,
    markCustom,
  })

  // Customize the transition leaving a given shape (blend style / direction).
  const setShapeBlend = (
    shapeId: string,
    patch: Partial<Pick<ShapeStop, "transitionType" | "wipeDirection">>
  ) => {
    markCustom()
    setShapes((prev) =>
      prev.map((s) => (s.id === shapeId ? { ...s, ...patch } : s))
    )
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background font-sans text-foreground antialiased select-none">
      <AppTopBar
        zenMode={zenMode}
        themeMounted={themeMounted}
        isLightTheme={isLightTheme}
        themeToggleLabel={themeToggleLabel}
        onZenModeChange={setZenMode}
        onThemeChange={setTheme}
        onExportOpen={() => setIsExportOpen(true)}
      />

      <div className="flex min-h-0 flex-1 bg-muted/40 dark:bg-[#111214]">
        {/* MIDDLE SECTION: Interactive WebGL Viewport Canvas */}
        <div
          className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ease-out ${
            zenMode ? "gap-0 p-0" : "gap-2 p-4"
          }`}
        >
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              const rect = e.currentTarget.getBoundingClientRect()
              if (
                e.clientX < rect.left ||
                e.clientX > rect.right ||
                e.clientY < rect.top ||
                e.clientY > rect.bottom
              ) {
                setIsDragging(false)
              }
            }}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              handleDropSvg(e)
            }}
            className={`relative min-h-0 flex-1 transition-all duration-300 ease-out ${
              zenMode
                ? "rounded-none border-0"
                : "overflow-hidden rounded-lg border border-border bg-muted/40 dark:bg-[#0b0c0e]"
            }`}
          >
            <SvgCanvas
              ref={canvas3DRef}
              iconAContent={iconAContent}
              iconBContent={iconBContent}
              materialPreset={materialPreset}
              colorA={colorA}
              colorB={renderColorB}
              colorASecondary={renderColorASecondary}
              colorBSecondary={renderColorBSecondary}
              colorAStops={renderColorAStops}
              colorBStops={renderColorBStops}
              enableGradient={renderEnableGradient}
              gradientType={renderGradientType}
              roughness={activeMaterialSettings.roughness}
              metalness={activeMaterialSettings.metalness}
              reflectance={activeMaterialSettings.reflectance}
              clearcoat={activeMaterialSettings.clearcoat}
              clearcoatRoughness={activeMaterialSettings.clearcoatRoughness}
              transmission={activeMaterialSettings.transmission}
              thickness={activeMaterialSettings.thickness}
              emissiveIntensity={activeMaterialSettings.emissiveIntensity}
              wireframe={wireframe}
              extrusionDepth={activeExtrusionDepth}
              bevelEnabled={bevelEnabled}
              bevelThickness={bevelThickness}
              bevelSize={bevelSize}
              bevelSegments={bevelSegments}
              geometryQuality={activeGeometryQuality}
              layerSpacing={layerSpacing}
              innerElementScale={activeInnerScale}
              transitionType={transitionType}
              wipeDirection={wipeDirection}
              transitionProgress={activeTransitionProgress}
              rotationOffset={{
                x: rotationOffset.x,
                y: activeRotationY,
                z: rotationOffset.z,
              }}
              objectScale={activeObjectScale}
              objectScaleAxes={objectScaleAxes}
              moveOffset={activeMoveOffset}
              isPlaying={isPlaying}
              ambientColor={ambientColor}
              ambientIntensity={ambientIntensity}
              keyLightColor={keyLightColor}
              keyLightIntensity={activeKeyLightIntensity}
              keyLightPosition={activeKeyLightPosition}
              keyLightSoftness={keyLightSoftness}
              rimLightColor={rimLightColor}
              rimLightIntensity={rimLightIntensity}
              zoom={zoom}
              viewInertiaEnabled={viewInertiaEnabled}
              showCenterPoint={showCenterPoint}
              showTransformGizmo={showTransformGizmo}
              onZoomChange={setZoom}
              onViewRotationCommit={handleViewRotationCommit}
              onViewRotationSet={handleViewRotationSet}
              onObjectScaleChange={(value) => {
                handleScaleChange(value)
                setActiveRecipeId(null)
              }}
              onObjectScaleAxisChange={handleScaleAxisChange}
              onMoveOffsetChange={(axis, value) => {
                updateMoveAxis(axis, value)
                setActiveRecipeId(null)
              }}
              onRotationAxisChange={(axis, value) => {
                if (axis === "y") {
                  handleSpinChange(value)
                } else {
                  setRotationOffset((current) => ({
                    ...current,
                    [axis]: value,
                  }))
                  setActiveRecipeId(null)
                }
              }}
              onModelReadyChange={setIsPreviewModelReady}
            />

            {/* Drag & drop an SVG to replace the selected shape */}
            {isDragging && (
              <div className="animate-fade-in absolute inset-0 z-30 flex items-center justify-center bg-black/75 backdrop-blur-md">
                <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-white/25 p-8">
                  <Upload className="size-8 text-white/70" />
                  <div className="text-center">
                    <span className="block text-sm font-semibold text-white">
                      Drop SVG here
                    </span>
                    <span className="mt-1 block text-[10px] tracking-wider text-muted-foreground uppercase">
                      Replaces the selected shape
                    </span>
                  </div>
                </div>
              </div>
            )}

            <ViewOptionsPopover
              viewInertiaEnabled={viewInertiaEnabled}
              showCenterPoint={showCenterPoint}
              showTransformGizmo={showTransformGizmo}
              onResetView={resetView}
              onViewInertiaChange={setViewInertiaEnabled}
              onShowCenterPointChange={setShowCenterPoint}
              onShowTransformGizmoChange={setShowTransformGizmo}
            />

            <PlaybackControls
              zenMode={zenMode}
              isPlaying={isPlaying}
              playbackProgress={playbackProgress}
              atTimelineStart={atTimelineStart}
              atTimelineEnd={atTimelineEnd}
              hasPreviousBreakpoint={previousBreakpoint !== undefined}
              hasNextBreakpoint={nextBreakpoint !== undefined}
              onReset={handleReset}
              onPreviousBreakpoint={goToPreviousBreakpoint}
              onPlayToggle={handlePlayToggle}
              onNextBreakpoint={goToNextBreakpoint}
              onGoToEnd={goToEnd}
              onExitZenMode={() => setZenMode(false)}
            />
          </div>
        </div>

        <div
          className={`flex shrink-0 flex-col overflow-y-auto bg-background transition-all duration-300 ease-out dark:bg-[#111113] ${
            zenMode
              ? "pointer-events-none w-0 border-l-0 p-0 opacity-0"
              : "w-[312px] gap-3 border-l border-border/40 px-4 py-3"
          }`}
        >
          {/* Style */}
          <div className="flex flex-col gap-1.5">
            <div className="flex h-6 items-center justify-between">
              <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground/70">
                STYLE
              </div>
              <div className="flex items-center gap-1.5">
                <div className="text-[10px] text-muted-foreground/50 tabular-nums">
                  {MATERIAL_METADATA[materialPreset].name}
                </div>
                {renderStyleKeyframeControl()}
              </div>
            </div>

            <div ref={inspectorRefs.fill} className={propertyRowClass()}>
              <span
                className={`${LABEL_WIDTH} shrink-0 text-[11px] text-muted-foreground`}
              >
                Fill
              </span>
              <div className="min-w-0 flex-1">
                <ColorPicker
                  value={selectedShapeFill}
                  onChange={(val) => updateSelectedShapeColor(val)}
                  gradient={fillMode === "gradient"}
                  onGradientToggle={(on) => {
                    setFillMode(on ? "gradient" : "solid")
                    setEnableGradient(on)
                    markCustom()
                  }}
                  gradientType={selectedShapeGradientType}
                  onGradientTypeChange={updateSelectedShapeGradientType}
                  stops={selectedShapeFillStops}
                  onStopsChange={updateSelectedShapeFillStops}
                  secondaryValue={selectedShapeFillSecondary}
                  onSecondaryChange={(val) =>
                    updateSelectedShapeColor(val, true)
                  }
                  className="h-7 w-full rounded-[5px] border-0 bg-foreground/[0.06] px-2 py-0 text-foreground hover:bg-foreground/[0.09]"
                />
              </div>
            </div>

            <div className="pt-0.5">
              <div className="mb-1 flex h-5 items-center text-[10px] font-semibold tracking-[0.12em] text-muted-foreground/70">
                FINISH
              </div>
              <div className="flex items-center gap-2.5">
                {FINISH_PRESETS.map((preset) => {
                  const isActive = materialPreset === preset
                  return (
                    <button
                      key={preset}
                      type="button"
                      aria-label={MATERIAL_METADATA[preset].name}
                      title={MATERIAL_METADATA[preset].name}
                      onClick={() => {
                        applyMaterialPreset(preset)
                      }}
                      className="group/finish relative flex items-center justify-center focus-visible:outline-none"
                    >
                      <span
                        className={`size-6 rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.35),inset_0_-1px_2px_rgba(0,0,0,0.2)] transition-all duration-100 ${
                          isActive
                            ? "ring-2 ring-ring/60 ring-offset-1 ring-offset-background"
                            : "hover:ring-2 hover:ring-foreground/20 hover:ring-offset-1 hover:ring-offset-background"
                        }`}
                        style={{ background: MATERIAL_PREVIEW[preset] }}
                      />
                      <span className="pointer-events-none absolute -top-7 left-1/2 z-30 -translate-x-1/2 rounded border border-border bg-popover px-2 py-1 text-[10px] font-medium whitespace-nowrap text-popover-foreground opacity-0 shadow-md transition-opacity duration-100 group-hover/finish:opacity-100">
                        {MATERIAL_METADATA[preset].name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div ref={inspectorRefs.material} className="pt-1">
              <div className="mb-1 flex items-center">
                <button
                  type="button"
                  onClick={() => setIsAdvancedMaterialOpen((open) => !open)}
                  className="flex h-5 min-w-0 flex-1 items-center gap-1 rounded text-left text-[10px] font-medium text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none"
                  aria-expanded={isAdvancedMaterialOpen}
                >
                  <ChevronRight
                    className={`size-2.5 transition-transform duration-150 ${isAdvancedMaterialOpen ? "rotate-90" : ""}`}
                  />
                  ADVANCED
                  {materialKeyframes.length > 0 && (
                    <span className="ml-1 size-1.5 rounded-full bg-violet-400" />
                  )}
                </button>
              </div>
              {isAdvancedMaterialOpen &&
                [
                  {
                    key: "roughness" as const,
                    label: "Smoothness",
                    value: activeMaterialSettings.roughness,
                    min: 0,
                    max: 1,
                    sliderMax: 1,
                    step: 0.02,
                    precision: 2,
                  },
                  {
                    key: "metalness" as const,
                    label: "Metallic",
                    value: activeMaterialSettings.metalness,
                    min: 0,
                    max: 1,
                    sliderMax: 1,
                    step: 0.02,
                    precision: 2,
                  },
                  {
                    key: "reflectance" as const,
                    label: "Reflectance",
                    value: activeMaterialSettings.reflectance,
                    min: 0,
                    max: 1,
                    sliderMax: 1,
                    step: 0.02,
                    precision: 2,
                  },
                  {
                    key: "clearcoat" as const,
                    label: "Clearcoat",
                    value: activeMaterialSettings.clearcoat,
                    min: 0,
                    max: 1,
                    sliderMax: 1,
                    step: 0.05,
                    precision: 2,
                  },
                  {
                    key: "clearcoatRoughness" as const,
                    label: "Coat Soft",
                    value: activeMaterialSettings.clearcoatRoughness,
                    min: 0,
                    max: 1,
                    sliderMax: 1,
                    step: 0.05,
                    precision: 2,
                  },
                  {
                    key: "transmission" as const,
                    label: "Transparency",
                    value: activeMaterialSettings.transmission,
                    min: 0,
                    max: 1,
                    sliderMax: 1,
                    step: 0.05,
                    precision: 2,
                  },
                  {
                    key: "thickness" as const,
                    label: "Glass Depth",
                    value: activeMaterialSettings.thickness,
                    min: 0.1,
                    max: 4,
                    sliderMax: 2,
                    step: 0.1,
                    precision: 1,
                  },
                  {
                    key: "emissiveIntensity" as const,
                    label: "Emission",
                    value: activeMaterialSettings.emissiveIntensity,
                    min: 0,
                    max: 5,
                    sliderMax: 2,
                    step: 0.1,
                    precision: 1,
                  },
                ].map(
                  ({
                    key,
                    label,
                    value,
                    min,
                    max,
                    sliderMax,
                    step,
                    precision,
                  }) => (
                    <div key={key} className={propertyRowClass()}>
                      <span
                        className={`${LABEL_WIDTH} shrink-0 text-[11px] text-muted-foreground`}
                      >
                        {label}
                      </span>
                      <InspectorSlider
                        value={value}
                        min={min}
                        max={max}
                        sliderMax={sliderMax}
                        step={step}
                        precision={precision}
                        inputClassName="w-[58px]"
                        onChange={(next) =>
                          updateMaterialSetting(key, next, min, max)
                        }
                      />
                    </div>
                  )
                )}
            </div>
          </div>

          {/* Shape */}
          <div className="flex flex-col gap-1.5">
            <div className="flex h-6 items-center justify-between">
              <span className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground/70">
                SHAPE
              </span>
              {renderKeyframeControl(
                extrusionTrack,
                finiteNumber(
                  extrusionTrack.keyframes.length > 0
                    ? activeExtrusionDepth
                    : extrusionDepth,
                  EXTRUDE_DEFAULT
                )
              )}
            </div>

            {/* Extrude */}
            <div
              ref={inspectorRefs.extrusion}
              className={propertyRowClass(
                selectedMotionTrackId === "extrusion"
              )}
              onClick={() => setSelectedMotionTrackId("extrusion")}
            >
              <span
                className={`${LABEL_WIDTH} shrink-0 text-[11px] text-muted-foreground`}
              >
                Extrude
              </span>
              {(() => {
                const depthValue = finiteNumber(
                  extrusionTrack.keyframes.length > 0
                    ? activeExtrusionDepth
                    : extrusionDepth,
                  EXTRUDE_DEFAULT
                )
                return (
                  <>
                    <InspectorSlider
                      value={depthValue}
                      min={0.2}
                      max={EXTRUDE_MAX}
                      sliderMax={40}
                      step={0.25}
                      scrubStep={1}
                      precision={2}
                      onChange={(value) => {
                        handleDepthChange(value)
                        setActiveRecipeId(null)
                      }}
                    />
                    <span className="w-[44px] shrink-0" aria-hidden="true" />
                  </>
                )
              })()}
            </div>

            {/* Bevel */}
            <div
              className={propertyRowClass(
                selectedMotionTrackId === "extrusion"
              )}
              onClick={() => setSelectedMotionTrackId("extrusion")}
            >
              <span
                className={`${LABEL_WIDTH} shrink-0 text-[11px] text-muted-foreground`}
              >
                Bevel
              </span>
              <InspectorSlider
                value={bevelEnabled ? bevelSegments : 0}
                min={0}
                max={MAX_BEVEL_SEGMENTS}
                sliderMax={12}
                step={1}
                precision={0}
                onChange={(value) => {
                  const nextSegments = Math.max(0, Math.round(value))
                  setBevelEnabled(nextSegments > 0)
                  if (nextSegments > 0) {
                    setBevelSegments(nextSegments)
                  }
                  setActiveRecipeId(null)
                }}
              />
              <span className="w-[44px] shrink-0" aria-hidden="true" />
            </div>

            {/* Quality */}
            <div
              className={propertyRowClass(
                selectedMotionTrackId === "extrusion"
              )}
              onClick={() => setSelectedMotionTrackId("extrusion")}
            >
              <span
                className={`${LABEL_WIDTH} shrink-0 text-[11px] text-muted-foreground`}
              >
                Quality
              </span>
              <InspectorSlider
                value={activeGeometryQuality}
                min={0.015}
                max={0.12}
                sliderMin={0.015}
                sliderMax={0.08}
                step={0.005}
                precision={3}
                onChange={updateQuality}
              />
              <span className="w-[44px] shrink-0" aria-hidden="true" />
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border/40" />

          {/* Transform — Scale + Inner Scale grouped together (Figma-like) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex h-6 items-center justify-between">
              <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground/70">
                TRANSFORM
              </div>
              {renderTransformKeyframeControl()}
            </div>

            {/* Scale */}
            <div
              ref={inspectorRefs.scale}
              className={propertyRowClass(selectedMotionTrackId === "scale")}
              onClick={() => setSelectedMotionTrackId("scale")}
            >
              <span
                className={`${LABEL_WIDTH} flex shrink-0 items-center text-[11px] text-muted-foreground`}
              >
                <span>
                  Scale
                  {scaleTrack.keyframes.length > 0 && (
                    <span
                      className="ml-1 inline-block size-1 rounded-full align-middle"
                      style={{ backgroundColor: scaleTrack.color }}
                    />
                  )}
                </span>
                <AxisLockButton
                  locked={isScaleLocked}
                  label="Scale"
                  onToggle={() => setIsScaleLocked((locked) => !locked)}
                />
              </span>
              {(() => {
                const scaleValue = finiteNumber(
                  scaleTrack.keyframes.length > 0
                    ? activeObjectScale
                    : objectScale,
                  SCALE_DEFAULT
                )
                return (
                  <>
                    {isScaleLocked ? (
                      <InspectorSlider
                        value={scaleValue}
                        min={0.1}
                        max={SCALE_MAX}
                        sliderMax={2}
                        step={0.05}
                        precision={2}
                        onChange={(value) => {
                          handleScaleChange(value)
                          setActiveRecipeId(null)
                        }}
                      />
                    ) : (
                      <div className="flex flex-1 items-center justify-start gap-1">
                        {(["X", "Y", "Z"] as const).map((axis) => (
                          <NumberField
                            key={axis}
                            value={
                              objectScaleAxes[
                                axis.toLowerCase() as keyof LightPosition
                              ]
                            }
                            min={0.1}
                            max={SCALE_MAX}
                            step={0.05}
                            prefix={axis}
                            prefixColor={AXIS_COLORS[axis]}
                            precision={2}
                            className="w-[58px]"
                            inputClassName="text-right"
                            onChange={(value) =>
                              handleScaleAxisChange(
                                axis.toLowerCase() as keyof LightPosition,
                                value
                              )
                            }
                          />
                        ))}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>

            {/* Inner Scale — now lives right under Scale (user request) */}
            <div className={propertyRowClass()}>
              <span
                className={`${LABEL_WIDTH} flex shrink-0 items-center text-[11px] text-muted-foreground`}
              >
                <span>
                  Inner
                  {innerScaleKeyframes.length > 0 && (
                    <span
                      className="ml-1 inline-block size-1 rounded-full align-middle"
                      style={{ backgroundColor: "#fb923c" }}
                    />
                  )}
                </span>
                <AxisLockButton
                  locked={isInnerScaleLocked}
                  label="Inner scale"
                  onToggle={() => setIsInnerScaleLocked((locked) => !locked)}
                />
              </span>
              {isInnerScaleLocked ? (
                <InspectorSlider
                  value={
                    (activeInnerScale.x +
                      activeInnerScale.y +
                      activeInnerScale.z) /
                    3
                  }
                  min={0.35}
                  max={1.35}
                  sliderMax={1.25}
                  step={0.01}
                  scrubStep={0.03}
                  precision={2}
                  onChange={updateInnerScaleAll}
                />
              ) : (
                <div className="flex flex-1 items-center justify-start gap-1">
                  {(["x", "y", "z"] as const).map((axis) => (
                    <NumberField
                      key={axis}
                      value={activeInnerScale[axis]}
                      min={axis === "z" ? 0.2 : 0.35}
                      max={1.35}
                      step={0.01}
                      scrubStep={0.03}
                      precision={2}
                      prefix={axis.toUpperCase()}
                      prefixColor={AXIS_COLORS[axis.toUpperCase()]}
                      className="w-[58px]"
                      inputClassName="text-right"
                      onChange={(value) => updateInnerScaleAxis(axis, value)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Rotation */}
            <div
              ref={inspectorRefs.rotation}
              className={propertyRowClass(selectedMotionTrackId === "rotation")}
              onClick={() => setSelectedMotionTrackId("rotation")}
            >
              <span
                className={`${LABEL_WIDTH} shrink-0 text-[11px] text-muted-foreground`}
              >
                Rotation
                {rotationTrack.keyframes.length > 0 && (
                  <span
                    className="ml-1 inline-block size-1 rounded-full align-middle"
                    style={{ backgroundColor: rotationTrack.color }}
                  />
                )}
              </span>
              <div className="flex flex-1 items-center justify-start gap-1">
                {[
                  { label: "X", axis: "x" as const, value: rotationOffset.x },
                  {
                    label: "Y",
                    axis: "y" as const,
                    value: activeRotationY,
                    animated: true,
                  },
                  { label: "Z", axis: "z" as const, value: rotationOffset.z },
                ].map(({ label, axis, value, animated }) => (
                  <NumberField
                    key={axis}
                    value={value}
                    min={ROTATION_MIN}
                    max={ROTATION_MAX}
                    step={1}
                    scrubStep={3}
                    prefix={label}
                    prefixColor={AXIS_COLORS[label]}
                    suffix="°"
                    precision={0}
                    className="w-[58px]"
                    inputClassName="text-right"
                    onChange={(nextValue) => {
                      const clamped = clampNumber(
                        nextValue,
                        ROTATION_MIN,
                        ROTATION_MAX
                      )
                      if (animated) {
                        handleSpinChange(clamped)
                      } else {
                        setRotationOffset((prev) => ({
                          ...prev,
                          [axis]: clamped,
                        }))
                        setActiveRecipeId(null)
                      }
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Move */}
            <div
              ref={inspectorRefs.move}
              className={propertyRowClass(selectedMotionTrackId === "move")}
              onClick={() => setSelectedMotionTrackId("move")}
            >
              <span
                className={`${LABEL_WIDTH} shrink-0 text-[11px] text-muted-foreground`}
              >
                Position
                {moveKeyframes.length > 0 && (
                  <span
                    className="ml-1 inline-block size-1 rounded-full align-middle"
                    style={{ backgroundColor: MOVE_COLOR }}
                  />
                )}
              </span>
              <div className="flex flex-1 items-center justify-start gap-1">
                {[
                  { label: "X", axis: "x" as const },
                  { label: "Y", axis: "y" as const },
                  { label: "Z", axis: "z" as const },
                ].map(({ label, axis }) => (
                  <NumberField
                    key={axis}
                    value={activeMoveOffset[axis]}
                    min={-100}
                    max={100}
                    step={1}
                    prefix={label}
                    prefixColor={AXIS_COLORS[label]}
                    precision={0}
                    className="w-[58px]"
                    inputClassName="text-right"
                    onChange={(value) => {
                      updateMoveAxis(axis, value)
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border/40" />

          {/* Light */}
          <div className="flex flex-col gap-1.5">
            <div className="flex h-6 items-center text-[10px] font-semibold tracking-[0.12em] text-muted-foreground/70">
              LIGHT
            </div>

            <div
              ref={inspectorRefs.lighting}
              className={propertyRowClass(selectedMotionTrackId === "lighting")}
              onClick={() => setSelectedMotionTrackId("lighting")}
            >
              <span
                className={`${LABEL_WIDTH} shrink-0 text-[11px] text-muted-foreground`}
              >
                Light
                {lightingTrack.keyframes.length > 0 && (
                  <span
                    className="ml-1 inline-block size-1 rounded-full align-middle"
                    style={{ backgroundColor: lightingTrack.color }}
                  />
                )}
              </span>
              <div className="flex flex-1 items-center justify-end gap-1">
                <div onClick={(e) => e.stopPropagation()}>
                  <LightDirectionPicker
                    position={activeKeyLightPosition}
                    color={keyLightColor}
                    softness={keyLightSoftness}
                    onDirectionChange={updateLightPositionXY}
                    onColorChange={(color) => {
                      setKeyLightColor(color)
                      setActiveRecipeId(null)
                    }}
                    onSoftnessChange={(value) => {
                      setKeyLightSoftness(value)
                      setActiveRecipeId(null)
                    }}
                    isKeyed={Boolean(lightPositionKeyframeAtPlayhead())}
                    onToggleKeyframe={toggleLightPositionKeyframeAtPlayhead}
                    keyframeControls={renderLightPositionKeyframeControl()}
                  />
                </div>
                <NumberField
                  value={finiteNumber(
                    lightingTrack.keyframes.length > 0
                      ? activeKeyLightIntensity
                      : keyLightIntensity,
                    1
                  )}
                  min={0}
                  max={LIGHT_MAX}
                  step={0.1}
                  precision={1}
                  className="w-[58px]"
                  onChange={(value) => {
                    handleBrightnessChange(value)
                    setActiveRecipeId(null)
                  }}
                />
              </div>
              {renderKeyframeControl(
                lightingTrack,
                finiteNumber(
                  lightingTrack.keyframes.length > 0
                    ? activeKeyLightIntensity
                    : keyLightIntensity,
                  1
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. KEYFRAME TIMELINE Scrubber
          ========================================================================= */}
      <div
        className={`shrink-0 overflow-hidden transition-all duration-500 ease-in-out ${zenMode ? "h-0 border-t-0" : "h-[184px] border-t border-border bg-background dark:bg-[#0f1012]"}`}
      >
        <Timeline
          duration={duration}
          onDurationChange={handleDurationChange}
          currentTime={currentTime}
          onTimeChange={setCurrentTime}
          onScrubStart={handleScrubStart}
          isPlaying={isPlaying}
          isPreviewLoading={!isPreviewModelReady}
          loop={loop}
          onLoopChange={setLoop}
          tracks={tracks}
          onTracksChange={handleTracksChange}
          propertyRows={timelinePropertyRows}
          onClearTrackKeyframes={clearTimelineTrackRow}
          onClearPropertyRow={clearTimelinePropertyRow}
          onRemovePropertyKeyframe={removeTimelinePropertyKeyframe}
          activeTrackId={selectedMotionTrackId}
          onActiveTrackChange={selectTimelineTrack}
          onActivePropertyRowChange={selectTimelinePropertyRow}
          shapes={shapes}
          selectedShapeId={selectedShapeId}
          onSelectShape={setSelectedShapeId}
          onShapesChange={(next) => {
            markCustom()
            setShapes(next)
          }}
          onAddShape={addShapeAtPlayhead}
          onRemoveShape={removeShape}
          onShapeEasingChange={(id, easing) => {
            markCustom()
            setShapes((prev) =>
              prev.map((s) => (s.id === id ? { ...s, easing } : s))
            )
          }}
          shapeOptions={PRESET_ICONS}
          onShapeIconChange={setShapeIcon}
          onShapeWipePairChange={setShapeWipePair}
          onUploadShape={triggerShapeUpload}
          onShapeBlendChange={setShapeBlend}
          openShapePicker={openShapePicker}
          onOpenShapePicker={setOpenShapePicker}
          wipeDirections={directions}
        />
      </div>

      <input
        ref={uploadFileRef}
        type="file"
        accept=".svg"
        className="hidden"
        onChange={handleUploadInputChange}
      />

      {/* =========================================================================
          4. EXPORT STUDIO MODAL
          ========================================================================= */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onExportGltf={() => canvas3DRef.current?.exportGltf()}
        onExportVideo={exportTimelineVideo}
        materialPreset={materialPreset}
        colorA={colorA}
        colorB={colorB}
        roughness={roughness}
        metalness={metalness}
        reflectance={reflectance}
        clearcoat={clearcoat}
        clearcoatRoughness={clearcoatRoughness}
        transmission={transmission}
        thickness={thickness}
        emissiveIntensity={emissiveIntensity}
        extrusionDepth={activeExtrusionDepth}
        bevelEnabled={bevelEnabled}
        bevelThickness={bevelThickness}
        bevelSize={bevelSize}
        bevelSegments={bevelSegments}
        layerSpacing={layerSpacing}
        transitionType={transitionType}
        ambientIntensity={ambientIntensity}
        keyLightIntensity={activeKeyLightIntensity}
        rimLightIntensity={rimLightIntensity}
        svgPathA={iconAContent}
        svgPathB={iconBContent}
      />
    </div>
  )
}
