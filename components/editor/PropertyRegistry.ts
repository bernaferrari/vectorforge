import {
  DEFAULT_ROTATION_END,
  DEFAULT_ROTATION_START,
  EXTRUDE_DEFAULT,
  EXTRUDE_MAX,
  LIGHT_MAX,
  MOVE_COLOR,
  ROTATION_MAX,
  ROTATION_MIN,
  SCALE_DEFAULT,
  SCALE_MAX,
  MotionTrackId,
} from "./EditorModel"
import { TimelineTrack } from "./TimelineModel"

export type TimelineTrackDefinition = {
  id: MotionTrackId
  name: string
  color: string
  min: number
  max: number
  defaultValue: number
  keyframes?: TimelineTrack["keyframes"]
}

export const TIMELINE_TRACK_DEFINITIONS: TimelineTrackDefinition[] = [
  {
    id: "extrusion",
    name: "Geometry",
    color: "#4ee2a3",
    min: 0.2,
    max: EXTRUDE_MAX,
    defaultValue: EXTRUDE_DEFAULT,
  },
  {
    id: "rotation",
    name: "Rotation",
    color: "#ffd23f",
    min: ROTATION_MIN,
    max: ROTATION_MAX,
    defaultValue: DEFAULT_ROTATION_START,
    keyframes: [
      {
        id: "kf-rot1",
        time: 0,
        value: DEFAULT_ROTATION_START,
        easing: "ease-in-out",
      },
      {
        id: "kf-rot2",
        time: 5.0,
        value: DEFAULT_ROTATION_END,
        easing: "ease-in-out",
      },
    ],
  },
  {
    id: "scale",
    name: "Scale",
    color: "#a78bfa",
    min: 0.1,
    max: SCALE_MAX,
    defaultValue: SCALE_DEFAULT,
  },
  {
    id: "move",
    name: "Move",
    color: MOVE_COLOR,
    min: -100,
    max: 100,
    defaultValue: 0,
  },
  {
    id: "lighting",
    name: "Brightness",
    color: "#ff5b9a",
    min: 0,
    max: LIGHT_MAX,
    defaultValue: 1.2,
  },
]

export const createInitialTimelineTracks = (): TimelineTrack[] =>
  TIMELINE_TRACK_DEFINITIONS.filter(
    (definition) => definition.id !== "move"
  ).map((definition) => ({
    ...definition,
    keyframes: definition.keyframes
      ? definition.keyframes.map((keyframe) => ({ ...keyframe }))
      : [],
  }))

export const timelineTrackById = (
  tracks: TimelineTrack[],
  id: MotionTrackId
) => {
  const existing = tracks.find((track) => track.id === id)
  if (existing) return existing
  const definition = TIMELINE_TRACK_DEFINITIONS.find((track) => track.id === id)
  return definition
    ? {
        ...definition,
        keyframes: definition.keyframes
          ? definition.keyframes.map((keyframe) => ({ ...keyframe }))
          : [],
      }
    : undefined
}
