"use client"

import React from "react"
import {
  LightPosition,
  MaterialKeyframe,
  MaterialSettings,
  MotionTrackId,
  ROTATION_COLOR,
  Vector3Keyframe,
  clampNumber,
  createEditorId,
} from "./EditorModel"
import {
  findKeyframeAtTime,
  removeKeyframesAtTime,
  toggleScalarTrackKeyframeAtTime,
  toggleStyleKeyframesAtTime,
  upsertVectorKeyframeAtTime,
} from "./EditorKeyframeModel"
import { InspectorKeyframeControl } from "./InspectorKeyframeControl"
import type { FillKeyframe, FillStop, TimelineTrack } from "./TimelineModel"

export function useInspectorKeyframeControls({
  currentTime,
  duration,
  setTracks,
  setSelectedMotionTrackId,
  setActiveRecipeId,
  fillKeyframes,
  setFillKeyframes,
  materialKeyframes,
  setMaterialKeyframes,
  selectedShapeFillStops,
  selectedShapeGradientType,
  activeMaterialSettings,
  scaleTrack,
  activeObjectScale,
  activeRotationOffset,
  rotationAxisKeyframes,
  setRotationAxisKeyframes,
  activeMoveOffset,
  moveKeyframes,
  setMoveKeyframes,
  keyLightPositionKeyframes,
  lightPositionKeyframeAtPlayhead,
  toggleLightPositionKeyframeAtPlayhead,
  markCustom,
  stopPlayback,
  setCurrentTime,
}: {
  currentTime: number
  duration: number
  setTracks: React.Dispatch<React.SetStateAction<TimelineTrack[]>>
  setSelectedMotionTrackId: React.Dispatch<React.SetStateAction<MotionTrackId>>
  setActiveRecipeId: React.Dispatch<React.SetStateAction<string | null>>
  fillKeyframes: FillKeyframe[]
  setFillKeyframes: React.Dispatch<React.SetStateAction<FillKeyframe[]>>
  materialKeyframes: MaterialKeyframe[]
  setMaterialKeyframes: React.Dispatch<React.SetStateAction<MaterialKeyframe[]>>
  selectedShapeFillStops: FillStop[]
  selectedShapeGradientType: FillKeyframe["gradientType"]
  activeMaterialSettings: MaterialSettings
  scaleTrack: TimelineTrack
  activeObjectScale: number
  activeRotationOffset: LightPosition
  rotationAxisKeyframes: Vector3Keyframe[]
  setRotationAxisKeyframes: React.Dispatch<
    React.SetStateAction<Vector3Keyframe[]>
  >
  activeMoveOffset: LightPosition
  moveKeyframes: Vector3Keyframe[]
  setMoveKeyframes: React.Dispatch<React.SetStateAction<Vector3Keyframe[]>>
  keyLightPositionKeyframes: Vector3Keyframe[]
  lightPositionKeyframeAtPlayhead: () => Vector3Keyframe | undefined
  toggleLightPositionKeyframeAtPlayhead: () => void
  markCustom: () => void
  stopPlayback: () => void
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>
}) {
  const keyframeAtPlayhead = (track: TimelineTrack) =>
    findKeyframeAtTime(track.keyframes, currentTime)

  const jumpToPropertyKeyframe = (time: number) => {
    stopPlayback()
    setCurrentTime(clampNumber(Number(time.toFixed(3)), 0, duration))
  }

  const toggleKeyframeAtPlayhead = (track: TimelineTrack, value: number) => {
    setSelectedMotionTrackId(track.id as MotionTrackId)
    setActiveRecipeId(null)
    setTracks((prevTracks) =>
      toggleScalarTrackKeyframeAtTime({
        tracks: prevTracks,
        trackId: track.id,
        value,
        time: currentTime,
        duration,
      })
    )
  }

  const moveKeyframeAtPlayhead = () =>
    findKeyframeAtTime(moveKeyframes, currentTime)

  const renderLightPositionKeyframeControl = () => (
    <InspectorKeyframeControl
      keyframes={keyLightPositionKeyframes}
      label="light position"
      currentTime={currentTime}
      duration={duration}
      isKeyedHere={Boolean(lightPositionKeyframeAtPlayhead())}
      color="#ff5b9a"
      onToggle={toggleLightPositionKeyframeAtPlayhead}
      onJump={jumpToPropertyKeyframe}
    />
  )

  const renderKeyframeControl = (track: TimelineTrack, value: number) => (
    <InspectorKeyframeControl
      keyframes={track.keyframes}
      label={track.name.toLowerCase()}
      currentTime={currentTime}
      duration={duration}
      isKeyedHere={Boolean(keyframeAtPlayhead(track))}
      color={track.color}
      onToggle={() => toggleKeyframeAtPlayhead(track, value)}
      onJump={jumpToPropertyKeyframe}
    />
  )

  const isStyleKeyedAtPlayhead = () =>
    Boolean(
      findKeyframeAtTime(fillKeyframes, currentTime) ||
      findKeyframeAtTime(materialKeyframes, currentTime)
    )

  const toggleStyleKeyframeAtPlayhead = () => {
    markCustom()
    const next = toggleStyleKeyframesAtTime({
      fillKeyframes,
      materialKeyframes,
      fillStops: selectedShapeFillStops,
      fillGradientType: selectedShapeGradientType,
      materialSettings: activeMaterialSettings,
      time: currentTime,
      duration,
    })
    setFillKeyframes(next.fillKeyframes)
    setMaterialKeyframes(next.materialKeyframes)
  }

  const styleKeyframes = [...fillKeyframes, ...materialKeyframes]
  const renderStyleKeyframeControl = () => (
    <InspectorKeyframeControl
      keyframes={styleKeyframes}
      label="style"
      currentTime={currentTime}
      duration={duration}
      isKeyedHere={isStyleKeyedAtPlayhead()}
      color="#a78bfa"
      onToggle={toggleStyleKeyframeAtPlayhead}
      onJump={jumpToPropertyKeyframe}
    />
  )

  const isTransformKeyedAtPlayhead = () =>
    Boolean(
      keyframeAtPlayhead(scaleTrack) ||
      findKeyframeAtTime(rotationAxisKeyframes, currentTime) ||
      moveKeyframeAtPlayhead()
    )

  const toggleTransformKeyframeAtPlayhead = () => {
    setActiveRecipeId(null)
    const removeAtPlayhead = isTransformKeyedAtPlayhead()
    setTracks((prevTracks) =>
      prevTracks.map((track) =>
        track.id === "scale"
          ? {
              ...track,
              keyframes: removeAtPlayhead
                ? removeKeyframesAtTime(track.keyframes, currentTime)
                : [
                    ...track.keyframes,
                    {
                      id: createEditorId(track.id),
                      time: currentTime,
                      value: activeObjectScale,
                      easing: "ease-in-out" as const,
                    },
                  ].sort((a, b) => a.time - b.time),
            }
          : track
      )
    )
    setRotationAxisKeyframes((keyframes) => {
      if (removeAtPlayhead) return removeKeyframesAtTime(keyframes, currentTime)
      return upsertVectorKeyframeAtTime({
        keyframes,
        idPrefix: "rotation",
        value: activeRotationOffset,
        time: currentTime,
        duration,
        createIfMissing: true,
      })
    })
    setMoveKeyframes((keyframes) => {
      if (removeAtPlayhead) return removeKeyframesAtTime(keyframes, currentTime)
      return upsertVectorKeyframeAtTime({
        keyframes,
        idPrefix: "move",
        value: activeMoveOffset,
        time: currentTime,
        duration,
        createIfMissing: true,
      })
    })
  }

  const transformKeyframes = [
    ...scaleTrack.keyframes,
    ...rotationAxisKeyframes,
    ...moveKeyframes,
  ]
  const renderTransformKeyframeControl = () => (
    <InspectorKeyframeControl
      keyframes={transformKeyframes}
      label="transform"
      currentTime={currentTime}
      duration={duration}
      isKeyedHere={isTransformKeyedAtPlayhead()}
      color={ROTATION_COLOR}
      onToggle={toggleTransformKeyframeAtPlayhead}
      onJump={jumpToPropertyKeyframe}
    />
  )

  return {
    renderKeyframeControl,
    renderLightPositionKeyframeControl,
    renderStyleKeyframeControl,
    renderTransformKeyframeControl,
    keyframeAtPlayhead,
  }
}
