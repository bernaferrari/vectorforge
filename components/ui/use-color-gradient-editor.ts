"use client"

import * as React from "react"
import { bindWindowPointerDrag } from "@/lib/drag-events"
import { parseHexColorInput } from "./color-picker-utils"
import {
  createGradientStopAtPoint,
  createGradientStopAtPosition,
  findInsertedGradientStopIndex,
  gradientEditorPreviewCss,
  insertGradientStop,
} from "./color-gradient-editor-model"
import {
  shuffledMeshColors,
  shuffledMeshPositions,
  type GradientPreset,
} from "./color-gradient-presets"
import type { GradientType } from "./color-gradient-mode-toggle"
import {
  fallbackColorStops,
  normalizeColorStops,
  type EditableColorStop,
} from "./color-stop-model"
import { useColorStopEditorState } from "./use-color-stop-editor-state"

type UseColorGradientEditorArgs = {
  value: string
  primaryHex: string
  secondaryHex: string
  isOpen: boolean
  isGradient: boolean
  gradientType: GradientType
  stops?: EditableColorStop[]
  hasSecondary: boolean
  onChange: (hex: string) => void
  onGradientToggle?: (on: boolean) => void
  onGradientTypeChange?: (type: GradientType) => void
  onSecondaryChange?: (hex: string) => void
  onStopsChange?: (stops: EditableColorStop[]) => void
  onStopPositionChange?: (stop: number, position: number) => void
}

export function useColorGradientEditor({
  value,
  primaryHex,
  secondaryHex,
  isOpen,
  isGradient,
  gradientType,
  stops,
  hasSecondary,
  onChange,
  onGradientToggle,
  onGradientTypeChange,
  onSecondaryChange,
  onStopsChange,
  onStopPositionChange,
}: UseColorGradientEditorArgs) {
  const gradientRailRef = React.useRef<HTMLDivElement>(null)

  const normalizedStops = React.useMemo(
    () =>
      normalizeColorStops(
        fallbackColorStops({
          stops,
          primaryHex,
          secondaryHex,
          hasSecondary,
        })
      ),
    [hasSecondary, primaryHex, secondaryHex, stops]
  )

  const {
    activeStop,
    closeStopEditor,
    markStopEditorOpenIntent,
    openStopEditor,
    openStopEditorAnchor,
    openingStopEditorRef,
    setActiveStop,
    setOpenStopEditor,
    setOpenStopEditorAnchor,
    setOpenStopEditorState,
  } = useColorStopEditorState({
    isOpen,
    isGradient,
    stopCount: normalizedStops.length,
  })

  const updateStops = React.useCallback(
    (nextStops: EditableColorStop[]) => {
      onStopsChange?.(normalizeColorStops(nextStops))
    },
    [onStopsChange]
  )

  const closeStopEditorAfterGradientMutation = React.useCallback(() => {
    setOpenStopEditor(null)
    setOpenStopEditorAnchor(null)
  }, [])

  const applyGradientPreset = React.useCallback(
    (preset: GradientPreset) => {
      onGradientToggle?.(true)
      onGradientTypeChange?.(preset.type)
      updateStops(preset.stops)
      setActiveStop(0)
      closeStopEditorAfterGradientMutation()
    },
    [
      closeStopEditorAfterGradientMutation,
      onGradientToggle,
      onGradientTypeChange,
      updateStops,
    ]
  )

  const shuffleMeshStops = React.useCallback(() => {
    onGradientToggle?.(true)
    onGradientTypeChange?.("mesh")
    updateStops(shuffledMeshColors(normalizedStops))
    closeStopEditorAfterGradientMutation()
  }, [
    closeStopEditorAfterGradientMutation,
    normalizedStops,
    onGradientToggle,
    onGradientTypeChange,
    updateStops,
  ])

  const shuffleMeshPoints = React.useCallback(() => {
    onGradientToggle?.(true)
    onGradientTypeChange?.("mesh")
    updateStops(shuffledMeshPositions(normalizedStops))
    closeStopEditorAfterGradientMutation()
  }, [
    closeStopEditorAfterGradientMutation,
    normalizedStops,
    onGradientToggle,
    onGradientTypeChange,
    updateStops,
  ])

  const updateActiveStopColor = React.useCallback(
    (nextColor: string) => {
      if (onStopsChange) {
        updateStops(
          normalizedStops.map((stop, index) =>
            index === activeStop ? { ...stop, color: nextColor } : stop
          )
        )
        return
      }
      if (isGradient && activeStop === 1 && onSecondaryChange)
        onSecondaryChange(nextColor)
      else onChange(nextColor)
    },
    [
      activeStop,
      isGradient,
      normalizedStops,
      onChange,
      onSecondaryChange,
      onStopsChange,
      updateStops,
    ]
  )

  const gradientCss = React.useMemo(() => {
    return gradientEditorPreviewCss({
      gradientType,
      stops: normalizedStops,
      fallback: primaryHex,
    })
  }, [gradientType, normalizedStops, primaryHex])

  const updateStopPosition = React.useCallback(
    (stopId: string, nextPosition: number) => {
      const position = Number(Math.max(0, Math.min(1, nextPosition)).toFixed(3))
      const previousIndex = normalizedStops.findIndex(
        (stop) => stop.id === stopId
      )
      if (previousIndex < 0) return
      if (onStopsChange) {
        const nextStops = normalizedStops
          .map((item) => (item.id === stopId ? { ...item, position } : item))
          .sort((a, b) => a.position - b.position)
        updateStops(nextStops)
        const nextIndex = nextStops.findIndex((stop) => stop.id === stopId)
        setActiveStop(Math.max(0, nextIndex))
        setOpenStopEditor((open) =>
          open === previousIndex ? Math.max(0, nextIndex) : open
        )
      }
      onStopPositionChange?.(previousIndex, position)
    },
    [normalizedStops, onStopPositionChange, onStopsChange, updateStops]
  )

  const updateStopColor = React.useCallback(
    (stopId: string, nextColor: string) => {
      const stopIndex = normalizedStops.findIndex((stop) => stop.id === stopId)
      if (stopIndex < 0) return
      setActiveStop(stopIndex)
      if (onStopsChange) {
        updateStops(
          normalizedStops.map((stop) =>
            stop.id === stopId ? { ...stop, color: nextColor } : stop
          )
        )
        return
      }
      if (isGradient && stopIndex === 1 && onSecondaryChange)
        onSecondaryChange(nextColor)
      else onChange(nextColor)
    },
    [
      isGradient,
      normalizedStops,
      onChange,
      onSecondaryChange,
      onStopsChange,
      updateStops,
    ]
  )

  const handleStopDrag = React.useCallback(
    (stopId: string, clientX: number) => {
      if (!gradientRailRef.current) return
      const rect = gradientRailRef.current.getBoundingClientRect()
      const position = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width)
      )
      updateStopPosition(stopId, position)
    },
    [updateStopPosition]
  )

  const handleStopPointerDown = React.useCallback(
    (stop: number, e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const stopId = normalizedStops[stop]?.id
      if (!stopId) return
      markStopEditorOpenIntent()
      const startX = e.clientX
      let moved = false
      setActiveStop(stop)
      bindWindowPointerDrag({
        onMove: (event) => {
          if (!moved && Math.abs(event.clientX - startX) < 3) return
          moved = true
          handleStopDrag(stopId, event.clientX)
        },
        onEnd: () => {
          if (!moved) {
            window.setTimeout(() => {
              setActiveStop(stop)
              setOpenStopEditor(stop)
              setOpenStopEditorAnchor("rail")
              openingStopEditorRef.current = false
            }, 0)
          } else {
            openingStopEditorRef.current = false
          }
        },
      })
    },
    [handleStopDrag, markStopEditorOpenIntent, normalizedStops]
  )

  const commitStopPositionInput = React.useCallback(
    (stopId: string, rawValue: string) => {
      const parsed = Number.parseFloat(rawValue.replace("%", ""))
      if (!Number.isFinite(parsed)) return
      updateStopPosition(stopId, parsed / 100)
    },
    [updateStopPosition]
  )

  const commitStopColorInput = React.useCallback(
    (stopId: string, rawValue: string, input?: HTMLInputElement) => {
      const nextColor = parseHexColorInput(rawValue)
      if (!nextColor) {
        const currentColor = normalizedStops.find(
          (stop) => stop.id === stopId
        )?.color
        if (input && currentColor)
          input.value = currentColor.replace(/^#/, "").toUpperCase()
        return
      }
      updateStopColor(stopId, nextColor)
      if (input) input.value = nextColor.replace(/^#/, "")
    },
    [normalizedStops, updateStopColor]
  )

  const addStopAtRailPosition = React.useCallback(
    (clientX: number, clientY?: number) => {
      if (!gradientRailRef.current || !onStopsChange) return
      const rect = gradientRailRef.current.getBoundingClientRect()
      const position = Number(
        Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)).toFixed(3)
      )
      const point = {
        x: position,
        y:
          clientY === undefined
            ? 0.5
            : Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
      }
      const nextStop = createGradientStopAtPoint({
        gradientType,
        stops: normalizedStops,
        point,
        fallback: primaryHex,
      })
      const nextStops = insertGradientStop(normalizedStops, nextStop)
      const nextIndex = findInsertedGradientStopIndex(nextStops, nextStop)
      updateStops(nextStops)
      setActiveStop(Math.max(0, nextIndex))
      setOpenStopEditor(Math.max(0, nextIndex))
      setOpenStopEditorAnchor("rail")
    },
    [gradientType, normalizedStops, onStopsChange, primaryHex, updateStops]
  )

  const addStopAtMiddle = React.useCallback(() => {
    const position = 0.5
    const nextStop = createGradientStopAtPosition({
      stops: normalizedStops,
      position,
      fallback: primaryHex,
    })
    const nextStops = insertGradientStop(normalizedStops, nextStop)
    updateStops(nextStops)
    const nextIndex = findInsertedGradientStopIndex(nextStops, nextStop)
    setActiveStop(Math.max(0, nextIndex))
    setOpenStopEditor(Math.max(0, nextIndex))
    setOpenStopEditorAnchor("rail")
  }, [normalizedStops, primaryHex, updateStops])

  return {
    activeStop,
    activeValue: normalizedStops[activeStop]?.color ?? value,
    addStopAtMiddle,
    addStopAtRailPosition,
    applyGradientPreset,
    canRemoveStop: normalizedStops.length > 1,
    closeStopEditor,
    commitStopColorInput,
    commitStopPositionInput,
    gradientCss,
    gradientRailRef,
    handleStopPointerDown,
    markStopEditorOpenIntent,
    normalizedStops,
    openStopEditor,
    openStopEditorAnchor,
    openingStopEditorRef,
    setActiveStop,
    setOpenStopEditor,
    setOpenStopEditorAnchor,
    setOpenStopEditorState,
    shuffleMeshPoints,
    shuffleMeshStops,
    updateActiveStopColor,
  }
}
