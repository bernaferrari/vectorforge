"use client"

import { useCallback } from "react"
import type { MotionPropertyControlsOptions } from "./MotionPropertyControlsModel"
import { useMoveMotionControls } from "./useMoveMotionControls"
import { useQualityMotionControls } from "./useQualityMotionControls"
import { useRotationMotionControls } from "./useRotationMotionControls"
import { useScalarMotionTrackControls } from "./useScalarMotionTrackControls"

export function useMotionPropertyControls({
  currentTime,
  duration,
  autoKeyEnabled,
  tracks,
  setTracks,
  setSelectedMotionTrackId,
  setActiveRecipeId,
  setExtrusionDepth,
  setRotationOffset,
  activeRotationOffset,
  setRotationAxisKeyframes,
  setPreviewRotationOffset,
  setObjectScale,
  setObjectScaleAxes,
  setIsScaleLocked,
  activeMoveOffset,
  setMoveOffset,
  setMoveKeyframes,
  setKeyLightIntensity,
  setGeometryQuality,
  setQualityKeyframes,
  canvas3DRef,
}: MotionPropertyControlsOptions) {
  const markCustom = useCallback(
    () => setActiveRecipeId(null),
    [setActiveRecipeId]
  )

  const {
    handleDepthChange,
    handleScaleChange,
    handleScaleAxisChange,
    handleBrightnessChange,
  } = useScalarMotionTrackControls({
    currentTime,
    duration,
    tracks,
    setTracks,
    setSelectedMotionTrackId,
    setExtrusionDepth,
    setObjectScale,
    setObjectScaleAxes,
    setIsScaleLocked,
    setKeyLightIntensity,
    autoKeyEnabled,
    markCustom,
  })

  const {
    handleRotationAxisChange,
    handleViewRotationCommit,
    handleViewRotationSet,
  } = useRotationMotionControls({
    currentTime,
    duration,
    setSelectedMotionTrackId,
    setRotationOffset,
    activeRotationOffset,
    setRotationAxisKeyframes,
    setPreviewRotationOffset,
    autoKeyEnabled,
    markCustom,
  })

  const { updateMoveAxis, resetMovePositionToOrigin } = useMoveMotionControls({
    currentTime,
    duration,
    setSelectedMotionTrackId,
    activeMoveOffset,
    setMoveOffset,
    setMoveKeyframes,
    autoKeyEnabled,
    markCustom,
  })

  const { updateQuality } = useQualityMotionControls({
    currentTime,
    duration,
    autoKeyEnabled,
    setGeometryQuality,
    setQualityKeyframes,
    markCustom,
  })

  const resetView = useCallback(() => {
    canvas3DRef.current?.resetRotation()
    resetMovePositionToOrigin()
  }, [canvas3DRef, resetMovePositionToOrigin])

  return {
    handleDepthChange,
    handleRotationAxisChange,
    handleScaleChange,
    handleScaleAxisChange,
    handleViewRotationCommit,
    handleViewRotationSet,
    handleBrightnessChange,
    updateMoveAxis,
    updateQuality,
    resetView,
  }
}
