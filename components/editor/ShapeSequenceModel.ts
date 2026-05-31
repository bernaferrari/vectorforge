import { PRESET_ICONS, type PresetIcon } from "./IconLibrary"
import { appendVectorForgeSlash } from "../3d/SvgText"
import {
  DEFAULT_TRANSITION_END,
  DEFAULT_TRANSITION_START,
  type ShapeStop,
} from "./TimelineModel"
import { clampNumber, createEditorId, quantizeTimeToFrame } from "./EditorModel"

export const createShapeStop = (
  icon: PresetIcon,
  time: number,
  id = createEditorId("shape")
): ShapeStop => ({
  id,
  time,
  iconId: icon.id,
  iconName: icon.name,
  svgContent: icon.svgContent,
  color: icon.defaultTint,
  colorSecondary: "#7c5cff",
  fillGradientType: "linear",
  fillStops: undefined,
  fillKeyframes: [],
  pathOverrides: [],
  easing: "ease-in-out",
  transitionType: "wipe",
  wipeDirection: { x: 0, y: 0 },
  transitionStart: DEFAULT_TRANSITION_START,
  transitionEnd: DEFAULT_TRANSITION_END,
})

const ACCOUNT_CIRCLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm246-164q-59 0-99.5-40.5T340-580q0-59 40.5-99.5T480-720q59 0 99.5 40.5T620-580q0 59-40.5 99.5T480-440Zm0 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q53 0 100-15.5t86-44.5q-39-29-86-44.5T480-280q-53 0-100 15.5T294-220q39 29 86 44.5T480-160Zm0-360q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm0-60Zm0 360Z"/></svg>`

const DEFAULT_WIPE_PAIR: [PresetIcon, PresetIcon] = [
  {
    id: "material-symbol-outlined-account_circle-default",
    name: "Account Circle",
    defaultTint: "#4285F4",
    category: "Material Symbols",
    tags: ["account_circle", "outlined"],
    svgContent: ACCOUNT_CIRCLE_SVG,
  },
  {
    id: "material-symbol-outlined-account_circle_off-default",
    name: "Account Circle Off",
    defaultTint: "#4285F4",
    category: "Material Symbols",
    tags: ["account_circle_off", "account_circle", "outlined", "slash"],
    svgContent: appendVectorForgeSlash(ACCOUNT_CIRCLE_SVG),
  },
]

export const replaceShapeIcon = (
  shapes: ShapeStop[],
  shapeId: string,
  icon: PresetIcon
) =>
  shapes.map((shape) =>
    shape.id === shapeId
      ? {
          ...shape,
          iconId: icon.id,
          iconName: icon.name,
          svgContent: icon.svgContent,
        }
      : shape
  )

export const applyShapeWipePair = ({
  shapes,
  shapeId,
  enabled,
  disabled,
  duration,
}: {
  shapes: ShapeStop[]
  shapeId: string
  enabled: PresetIcon
  disabled: PresetIcon
  duration: number
}) => {
  const sorted = [...shapes].sort((a, b) => a.time - b.time)
  const index = sorted.findIndex((shape) => shape.id === shapeId)
  if (index < 0) return shapes

  const current = sorted[index]
  const next = sorted[index + 1]
  const nextTime = next
    ? next.time
    : current.time < duration - 0.1
      ? clampNumber(
          quantizeTimeToFrame(
            Math.min(duration, current.time + Math.max(0.85, duration * 0.25))
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
}

export const addShapeStopAtTime = ({
  shapes,
  time,
  duration,
}: {
  shapes: ShapeStop[]
  time: number
  duration: number
}) => {
  const icon = PRESET_ICONS[shapes.length % PRESET_ICONS.length]
  const stop = createShapeStop(
    icon,
    clampNumber(quantizeTimeToFrame(time), 0, duration)
  )
  return {
    shapes: [...shapes, stop].sort((a, b) => a.time - b.time),
    addedShapeId: stop.id,
  }
}

export const removeShapeStopById = (
  shapes: ShapeStop[],
  shapeId: string,
  selectedShapeId: string | null
) => {
  const removedIndex = shapes.findIndex((shape) => shape.id === shapeId)
  if (shapes.length <= 1 || removedIndex < 0) {
    return { shapes, selectedShapeId, removed: false }
  }

  const nextShapes = shapes.filter((shape) => shape.id !== shapeId)
  return {
    shapes: nextShapes,
    selectedShapeId:
      selectedShapeId === shapeId
        ? (nextShapes[Math.min(removedIndex, nextShapes.length - 1)]?.id ??
          null)
        : selectedShapeId,
    removed: true,
  }
}

export const createDefaultShapeSequence = () => [
  {
    ...createShapeStop(DEFAULT_WIPE_PAIR[0], 1.0, "shape-default-enabled"),
    transitionType: "wipe" as const,
    wipeDirection: { x: 0.707, y: -0.707 },
    easing: "ease-in-out" as const,
  },
  createShapeStop(DEFAULT_WIPE_PAIR[1], 4.0, "shape-default-disabled"),
]
