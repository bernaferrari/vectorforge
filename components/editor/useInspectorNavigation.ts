"use client"

import {
  Dispatch,
  RefObject,
  SetStateAction,
  useCallback,
  useMemo,
  useRef,
} from "react"
import type { MotionTrackId } from "./EditorModel"

type InspectorRefs = {
  fill: RefObject<HTMLDivElement | null>
  material: RefObject<HTMLDivElement | null>
  extrusion: RefObject<HTMLDivElement | null>
  rotation: RefObject<HTMLDivElement | null>
  scale: RefObject<HTMLDivElement | null>
  move: RefObject<HTMLDivElement | null>
  lighting: RefObject<HTMLDivElement | null>
}

type InspectorNavigationOptions = {
  setAdvancedMaterialOpen: (open: boolean) => void
  setSelectedMotionTrackId: Dispatch<SetStateAction<MotionTrackId>>
  setSelectedShapeId: Dispatch<SetStateAction<string | null>>
}

type InspectorTargetId = MotionTrackId | "fill" | "material" | "light-position"

export function useInspectorNavigation({
  setAdvancedMaterialOpen,
  setSelectedMotionTrackId,
  setSelectedShapeId,
}: InspectorNavigationOptions) {
  const fillRef = useRef<HTMLDivElement>(null)
  const materialRef = useRef<HTMLDivElement>(null)
  const extrusionRef = useRef<HTMLDivElement>(null)
  const rotationRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef<HTMLDivElement>(null)
  const moveRef = useRef<HTMLDivElement>(null)
  const lightingRef = useRef<HTMLDivElement>(null)

  const inspectorRefs: InspectorRefs = useMemo(
    () => ({
      fill: fillRef,
      material: materialRef,
      extrusion: extrusionRef,
      rotation: rotationRef,
      scale: scaleRef,
      move: moveRef,
      lighting: lightingRef,
    }),
    []
  )

  const scrollInspectorPropertyIntoView = useCallback(
    (id: InspectorTargetId) => {
      if (id === "material") setAdvancedMaterialOpen(true)
      const target =
        id === "light-position"
          ? inspectorRefs.lighting.current
          : inspectorRefs[id]?.current
      if (!target) return
      window.requestAnimationFrame(() => {
        target.scrollIntoView({ block: "center", behavior: "smooth" })
      })
    },
    [inspectorRefs, setAdvancedMaterialOpen]
  )

  const selectTimelineTrack = useCallback(
    (trackId: string) => {
      const nextTrackId = trackId as MotionTrackId
      setSelectedMotionTrackId(nextTrackId)
      setSelectedShapeId(null)
      scrollInspectorPropertyIntoView(nextTrackId)
    },
    [
      scrollInspectorPropertyIntoView,
      setSelectedMotionTrackId,
      setSelectedShapeId,
    ]
  )

  const selectTimelinePropertyRow = useCallback(
    (rowId: string) => {
      if (rowId === "move") setSelectedMotionTrackId("move")
      if (rowId === "style") {
        scrollInspectorPropertyIntoView("fill")
        return
      }
      scrollInspectorPropertyIntoView(
        rowId as "fill" | "material" | "light-position" | "move"
      )
    },
    [scrollInspectorPropertyIntoView, setSelectedMotionTrackId]
  )

  return {
    inspectorRefs,
    selectTimelineTrack,
    selectTimelinePropertyRow,
    scrollInspectorPropertyIntoView,
  }
}
