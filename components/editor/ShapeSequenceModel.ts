import { PRESET_ICONS, type PresetIcon } from "./IconLibrary"
import { DEFAULT_WIPE_PAIR } from "./DefaultShapeIcons"
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
