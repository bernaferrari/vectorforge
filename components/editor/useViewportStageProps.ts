"use client"

import { useMemo } from "react"
import type {
  PlaybackControlsProps,
  ViewOptionsPopoverProps,
} from "./ViewportControls"
import {
  useSvgCanvasProps,
  type UseSvgCanvasPropsArgs,
} from "./useSvgCanvasProps"

type UseViewportStagePropsArgs = UseSvgCanvasPropsArgs & {
  playbackProgress: number
  atTimelineStart: boolean
  atTimelineEnd: boolean
  hasPreviousBreakpoint: boolean
  hasNextBreakpoint: boolean
  zenMode: boolean
  onResetView: () => void
  onViewInertiaChange: (enabled: boolean) => void
  onShowCenterPointChange: (visible: boolean) => void
  onShowTransformGizmoChange: (visible: boolean) => void
  animatedSeekEnabled: boolean
  onAnimatedSeekChange: (enabled: boolean) => void
  onResetPlayback: () => void
  onPreviousBreakpoint: () => void
  onPlayToggle: () => void
  onNextBreakpoint: () => void
  onGoToEnd: () => void
  onExitZenMode: () => void
}

export function useViewportStageProps({
  playbackProgress,
  atTimelineStart,
  atTimelineEnd,
  hasPreviousBreakpoint,
  hasNextBreakpoint,
  zenMode,
  onResetView,
  onViewInertiaChange,
  onShowCenterPointChange,
  onShowTransformGizmoChange,
  animatedSeekEnabled,
  onAnimatedSeekChange,
  onResetPlayback,
  onPreviousBreakpoint,
  onPlayToggle,
  onNextBreakpoint,
  onGoToEnd,
  onExitZenMode,
  ...canvasArgs
}: UseViewportStagePropsArgs) {
  const canvasProps = useSvgCanvasProps(canvasArgs)

  const viewOptionsProps = useMemo<ViewOptionsPopoverProps>(
    () => ({
      viewInertiaEnabled: canvasArgs.viewInertiaEnabled,
      showCenterPoint: canvasArgs.showCenterPoint,
      showTransformGizmo: canvasArgs.showTransformGizmo,
      onResetView,
      onViewInertiaChange,
      onShowCenterPointChange,
      onShowTransformGizmoChange,
      animatedSeekEnabled,
      onAnimatedSeekChange,
    }),
    [
      canvasArgs.viewInertiaEnabled,
      canvasArgs.showCenterPoint,
      canvasArgs.showTransformGizmo,
      onResetView,
      onViewInertiaChange,
      onShowCenterPointChange,
      onShowTransformGizmoChange,
      animatedSeekEnabled,
      onAnimatedSeekChange,
    ]
  )

  const playbackProps = useMemo<PlaybackControlsProps>(
    () => ({
      zenMode,
      isPlaying: canvasArgs.isPlaying,
      playbackProgress,
      atTimelineStart,
      atTimelineEnd,
      hasPreviousBreakpoint,
      hasNextBreakpoint,
      onReset: onResetPlayback,
      onPreviousBreakpoint,
      onPlayToggle,
      onNextBreakpoint,
      onGoToEnd,
      onExitZenMode,
    }),
    [
      zenMode,
      canvasArgs.isPlaying,
      playbackProgress,
      atTimelineStart,
      atTimelineEnd,
      hasPreviousBreakpoint,
      hasNextBreakpoint,
      onResetPlayback,
      onPreviousBreakpoint,
      onPlayToggle,
      onNextBreakpoint,
      onGoToEnd,
      onExitZenMode,
    ]
  )

  return { canvasProps, viewOptionsProps, playbackProps }
}
