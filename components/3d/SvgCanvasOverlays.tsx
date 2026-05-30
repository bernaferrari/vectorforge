"use client"

import type React from "react"
import { OrientationGizmo, type OrientationGizmoRefs } from "./OrientationGizmo"

type SvgCanvasOverlaysProps = {
  modelReady: boolean
  orientationGizmoRefs: OrientationGizmoRefs
  rotationDragTooltipRef: React.RefObject<HTMLDivElement | null>
  onNudgeViewRotation: (axis: "x" | "y", direction: -1 | 1) => void
}

export function SvgCanvasOverlays({
  modelReady,
  orientationGizmoRefs,
  rotationDragTooltipRef,
  onNudgeViewRotation,
}: SvgCanvasOverlaysProps) {
  return (
    <>
      {!modelReady && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-background/5 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-2 text-[11px] font-medium text-white/75 shadow-2xl">
            <span className="size-2 animate-pulse rounded-full bg-white/70" />
            Preparing 3D icon
          </div>
        </div>
      )}
      <div
        ref={rotationDragTooltipRef}
        className="pointer-events-none fixed top-0 left-0 z-50 rounded-md border border-white/10 bg-black/75 px-2 py-1 text-[11px] font-medium text-white tabular-nums opacity-0 shadow-xl transition-opacity duration-75"
      />

      <OrientationGizmo
        refs={orientationGizmoRefs}
        onNudgeViewRotation={onNudgeViewRotation}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[oklch(0.11_0.012_280)]/80 via-transparent to-[oklch(0.18_0.012_280)]/20 mix-blend-overlay" />
    </>
  )
}
