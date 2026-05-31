"use client"

import type { Dispatch, SetStateAction } from "react"
import { useCallback } from "react"
import { useGroupedSettings } from "./useGroupedSettings"

type ViewportOptions = {
  zoom: number
  viewInertiaEnabled: boolean
  showCenterPoint: boolean
  showTransformGizmo: boolean
  zenMode: boolean
  isDragging: boolean
}

const DEFAULT_VIEWPORT_OPTIONS: ViewportOptions = {
  zoom: 1,
  viewInertiaEnabled: true,
  showCenterPoint: false,
  showTransformGizmo: false,
  zenMode: false,
  isDragging: false,
}

export function useViewportOptions() {
  const [options, , setOption] = useGroupedSettings(DEFAULT_VIEWPORT_OPTIONS)

  const setZoom: Dispatch<SetStateAction<number>> = useCallback(
    (value) => setOption("zoom", value),
    [setOption]
  )
  const setViewInertiaEnabled: Dispatch<SetStateAction<boolean>> = useCallback(
    (value) => setOption("viewInertiaEnabled", value),
    [setOption]
  )
  const setShowCenterPoint: Dispatch<SetStateAction<boolean>> = useCallback(
    (value) => setOption("showCenterPoint", value),
    [setOption]
  )
  const setShowTransformGizmo: Dispatch<SetStateAction<boolean>> = useCallback(
    (value) => setOption("showTransformGizmo", value),
    [setOption]
  )
  const setZenMode: Dispatch<SetStateAction<boolean>> = useCallback(
    (value) => setOption("zenMode", value),
    [setOption]
  )
  const setIsDragging: Dispatch<SetStateAction<boolean>> = useCallback(
    (value) => setOption("isDragging", value),
    [setOption]
  )

  return {
    zoom: options.zoom,
    setZoom,
    viewInertiaEnabled: options.viewInertiaEnabled,
    setViewInertiaEnabled,
    showCenterPoint: options.showCenterPoint,
    setShowCenterPoint,
    showTransformGizmo: options.showTransformGizmo,
    setShowTransformGizmo,
    zenMode: options.zenMode,
    setZenMode,
    isDragging: options.isDragging,
    setIsDragging,
  }
}
