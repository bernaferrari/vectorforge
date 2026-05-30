"use client"

import { useState } from "react"

export function useViewportOptions() {
  const [zoom, setZoom] = useState(1.0)
  const [viewInertiaEnabled, setViewInertiaEnabled] = useState(true)
  const [showCenterPoint, setShowCenterPoint] = useState(false)
  const [showTransformGizmo, setShowTransformGizmo] = useState(false)
  const [zenMode, setZenMode] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  return {
    zoom,
    setZoom,
    viewInertiaEnabled,
    setViewInertiaEnabled,
    showCenterPoint,
    setShowCenterPoint,
    showTransformGizmo,
    setShowTransformGizmo,
    zenMode,
    setZenMode,
    isDragging,
    setIsDragging,
  }
}
