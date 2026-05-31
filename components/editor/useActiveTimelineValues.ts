import { useMemo } from "react"
import { LightPosition, ScalarKeyframe, Vector3Keyframe } from "./EditorModel"
import {
  interpolateLightPositionKeyframes,
  interpolateScalarKeyframes,
} from "./KeyframeInterpolationModel"
import { TimelineTrack, interpolateKeyframes } from "./TimelineModel"

type ActiveTimelineValuesInput = {
  currentTime: number
  extrusionTrack: TimelineTrack
  scaleTrack: TimelineTrack
  lightingTrack: TimelineTrack
  extrusionDepth: number
  rotationOffset: LightPosition
  rotationAxisKeyframes: Vector3Keyframe[]
  previewRotationY: number | null
  objectScale: number
  moveOffset: LightPosition
  moveKeyframes: Vector3Keyframe[]
  keyLightIntensity: number
  geometryQuality: number
  qualityKeyframes: ScalarKeyframe[]
  innerElementScale: LightPosition
  innerScaleKeyframes: Vector3Keyframe[]
}

export const useActiveTimelineValues = ({
  currentTime,
  extrusionTrack,
  scaleTrack,
  lightingTrack,
  extrusionDepth,
  rotationOffset,
  rotationAxisKeyframes,
  previewRotationY,
  objectScale,
  moveOffset,
  moveKeyframes,
  keyLightIntensity,
  geometryQuality,
  qualityKeyframes,
  innerElementScale,
  innerScaleKeyframes,
}: ActiveTimelineValuesInput) =>
  useMemo(() => {
    const activeRotationOffset = interpolateLightPositionKeyframes(
      currentTime,
      rotationOffset,
      rotationAxisKeyframes
    )
    if (previewRotationY !== null) {
      activeRotationOffset.y = previewRotationY
    }

    return {
      activeExtrusionDepth:
        extrusionTrack.keyframes.length > 0
          ? interpolateKeyframes(currentTime, extrusionTrack)
          : extrusionDepth,
      activeRotationOffset,
      activeObjectScale:
        scaleTrack.keyframes.length > 0
          ? interpolateKeyframes(currentTime, scaleTrack)
          : objectScale,
      activeMoveOffset: interpolateLightPositionKeyframes(
        currentTime,
        moveOffset,
        moveKeyframes
      ),
      activeKeyLightIntensity:
        lightingTrack.keyframes.length > 0
          ? interpolateKeyframes(currentTime, lightingTrack)
          : keyLightIntensity,
      activeGeometryQuality: interpolateScalarKeyframes(
        currentTime,
        geometryQuality,
        qualityKeyframes
      ),
      activeInnerScale: interpolateLightPositionKeyframes(
        currentTime,
        innerElementScale,
        innerScaleKeyframes
      ),
    }
  }, [
    currentTime,
    extrusionTrack,
    scaleTrack,
    lightingTrack,
    extrusionDepth,
    rotationOffset,
    rotationAxisKeyframes,
    previewRotationY,
    objectScale,
    moveOffset,
    moveKeyframes,
    keyLightIntensity,
    geometryQuality,
    qualityKeyframes,
    innerElementScale,
    innerScaleKeyframes,
  ])
