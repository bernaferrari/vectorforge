import type { Dispatch, RefObject, SetStateAction } from "react"
import type { SvgCanvasRef } from "../3d/SvgCanvas"
import type {
  LightPosition,
  MotionTrackId,
  ScalarKeyframe,
  Vector3Keyframe,
} from "./EditorModel"
import type { TimelineTrack } from "./TimelineModel"

export type MotionPropertyControlsOptions = {
  currentTime: number
  duration: number
  tracks: TimelineTrack[]
  setTracks: Dispatch<SetStateAction<TimelineTrack[]>>
  setSelectedMotionTrackId: Dispatch<SetStateAction<MotionTrackId>>
  setActiveRecipeId: Dispatch<SetStateAction<string | null>>
  setExtrusionDepth: Dispatch<SetStateAction<number>>
  setRotationOffset: Dispatch<SetStateAction<LightPosition>>
  activeRotationOffset: LightPosition
  setRotationAxisKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  setPreviewRotationY: Dispatch<SetStateAction<number | null>>
  setObjectScale: Dispatch<SetStateAction<number>>
  setObjectScaleAxes: Dispatch<SetStateAction<LightPosition>>
  setIsScaleLocked: Dispatch<SetStateAction<boolean>>
  activeMoveOffset: LightPosition
  setMoveOffset: Dispatch<SetStateAction<LightPosition>>
  setMoveKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  setKeyLightIntensity: Dispatch<SetStateAction<number>>
  setGeometryQuality: Dispatch<SetStateAction<number>>
  setQualityKeyframes: Dispatch<SetStateAction<ScalarKeyframe[]>>
  canvas3DRef: RefObject<SvgCanvasRef | null>
}

export type MarkCustom = () => void
