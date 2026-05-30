"use client"

import React from "react"
import * as THREE from "three"

export type OrientationGizmoRefs = {
  lineXRef: React.RefObject<SVGLineElement | null>
  lineYRef: React.RefObject<SVGLineElement | null>
  lineZRef: React.RefObject<SVGLineElement | null>
  markerXRef: React.RefObject<SVGGElement | null>
  markerYRef: React.RefObject<SVGGElement | null>
  markerZRef: React.RefObject<SVGGElement | null>
}

export const updateOrientationGizmo = (
  refs: OrientationGizmoRefs,
  rotation: { x: number; y: number; z: number }
) => {
  const centerX = 40
  const centerY = 40
  const axisLength = 22
  const euler = new THREE.Euler(rotation.x, rotation.y, rotation.z, "XYZ")

  const project = (x: number, y: number, z: number) => {
    const vector = new THREE.Vector3(x, y, z).applyEuler(euler)
    return {
      x: centerX + vector.x * axisLength,
      y: centerY - vector.y * axisLength,
      z: vector.z,
    }
  }

  const ptX = project(1, 0, 0)
  const ptY = project(0, 1, 0)
  const ptZ = project(0, 0, 1)

  if (refs.lineXRef.current) {
    refs.lineXRef.current.setAttribute("x2", ptX.x.toFixed(1))
    refs.lineXRef.current.setAttribute("y2", ptX.y.toFixed(1))
  }
  if (refs.lineYRef.current) {
    refs.lineYRef.current.setAttribute("x2", ptY.x.toFixed(1))
    refs.lineYRef.current.setAttribute("y2", ptY.y.toFixed(1))
  }
  if (refs.lineZRef.current) {
    refs.lineZRef.current.setAttribute("x2", ptZ.x.toFixed(1))
    refs.lineZRef.current.setAttribute("y2", ptZ.y.toFixed(1))
  }

  refs.markerXRef.current?.setAttribute(
    "transform",
    `translate(${ptX.x.toFixed(1)} ${ptX.y.toFixed(1)})`
  )
  refs.markerYRef.current?.setAttribute(
    "transform",
    `translate(${ptY.x.toFixed(1)} ${ptY.y.toFixed(1)})`
  )
  refs.markerZRef.current?.setAttribute(
    "transform",
    `translate(${ptZ.x.toFixed(1)} ${ptZ.y.toFixed(1)})`
  )
}

export function OrientationGizmo({
  refs,
  onNudgeViewRotation,
}: {
  refs: OrientationGizmoRefs
  onNudgeViewRotation: (axis: "x" | "y", direction: -1 | 1) => void
}) {
  return (
    <svg
      viewBox="0 0 80 80"
      className="group/gizmo pointer-events-auto absolute right-5 bottom-0.5 z-20 h-[84px] w-[84px] select-none"
    >
      <line
        ref={refs.lineXRef}
        x1="40"
        y1="40"
        x2="40"
        y2="40"
        className="stroke-rose-400/70 stroke-[1.5]"
        strokeLinecap="round"
      />
      <line
        ref={refs.lineYRef}
        x1="40"
        y1="40"
        x2="40"
        y2="40"
        className="stroke-emerald-400/70 stroke-[1.5]"
        strokeLinecap="round"
      />
      <line
        ref={refs.lineZRef}
        x1="40"
        y1="40"
        x2="40"
        y2="40"
        className="stroke-sky-400/70 stroke-[1.5]"
        strokeLinecap="round"
      />

      <AxisMarker
        ref={refs.markerXRef}
        label="X"
        colorClass="fill-rose-500/18 stroke-rose-400/85"
        textClass="fill-rose-200"
      />
      <AxisMarker
        ref={refs.markerYRef}
        label="Y"
        colorClass="fill-emerald-500/18 stroke-emerald-400/85"
        textClass="fill-emerald-200"
      />
      <AxisMarker
        ref={refs.markerZRef}
        label="Z"
        colorClass="fill-sky-500/18 stroke-sky-400/85"
        textClass="fill-sky-200"
      />

      <circle cx="40" cy="40" r="1.5" className="fill-white/50" />

      <g className="pointer-events-none opacity-0 transition-opacity duration-150 group-focus-within/gizmo:pointer-events-auto group-focus-within/gizmo:opacity-100 group-hover/gizmo:pointer-events-auto group-hover/gizmo:opacity-100">
        <GizmoNudgeButton
          title="Tilt up 45 degrees"
          colorClass="text-emerald-300/65 hover:text-emerald-200"
          hitbox={{ x: 28, y: 0, width: 24, height: 22 }}
          path="M40 5.7 C42.9 7.8 44.6 10.8 44.8 14.4 C43.4 13.2 41.8 12.5 40 12.5 C38.2 12.5 36.6 13.2 35.2 14.4 C35.4 10.8 37.1 7.8 40 5.7Z"
          onClick={() => onNudgeViewRotation("x", 1)}
        />
        <GizmoNudgeButton
          title="Tilt down 45 degrees"
          colorClass="text-emerald-300/65 hover:text-emerald-200"
          hitbox={{ x: 28, y: 58, width: 24, height: 22 }}
          path="M40 74.3 C37.1 72.2 35.4 69.2 35.2 65.6 C36.6 66.8 38.2 67.5 40 67.5 C41.8 67.5 43.4 66.8 44.8 65.6 C44.6 69.2 42.9 72.2 40 74.3Z"
          onClick={() => onNudgeViewRotation("x", -1)}
        />
        <GizmoNudgeButton
          title="Rotate left 45 degrees"
          colorClass="text-rose-300/65 hover:text-rose-200"
          hitbox={{ x: 0, y: 28, width: 22, height: 24 }}
          path="M5.7 40 C7.8 37.1 10.8 35.4 14.4 35.2 C13.2 36.6 12.5 38.2 12.5 40 C12.5 41.8 13.2 43.4 14.4 44.8 C10.8 44.6 7.8 42.9 5.7 40Z"
          onClick={() => onNudgeViewRotation("y", 1)}
        />
        <GizmoNudgeButton
          title="Rotate right 45 degrees"
          colorClass="text-rose-300/65 hover:text-rose-200"
          hitbox={{ x: 58, y: 28, width: 22, height: 24 }}
          path="M74.3 40 C72.2 42.9 69.2 44.6 65.6 44.8 C66.8 43.4 67.5 41.8 67.5 40 C67.5 38.2 66.8 36.6 65.6 35.2 C69.2 35.4 72.2 37.1 74.3 40Z"
          onClick={() => onNudgeViewRotation("y", -1)}
        />
      </g>
    </svg>
  )
}

const AxisMarker = React.forwardRef<
  SVGGElement,
  {
    label: string
    colorClass: string
    textClass: string
  }
>(({ label, colorClass, textClass }, ref) => (
  <g ref={ref} transform="translate(40 40)">
    <circle cx="0" cy="0" r="8" className="fill-black/35 blur-[1px]" />
    <circle cx="0" cy="0" r="7" className={`${colorClass} stroke-1`} />
    <text
      x="0"
      y="0.3"
      className={`${textClass} font-sans text-[7px] font-semibold select-none`}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {label}
    </text>
  </g>
))

AxisMarker.displayName = "AxisMarker"

function GizmoNudgeButton({
  title,
  colorClass,
  hitbox,
  path,
  onClick,
}: {
  title: string
  colorClass: string
  hitbox: { x: number; y: number; width: number; height: number }
  path: string
  onClick: () => void
}) {
  return (
    <g
      className={`cursor-pointer ${colorClass} transition-colors`}
      onClick={onClick}
    >
      <title>{title}</title>
      <rect
        x={hitbox.x}
        y={hitbox.y}
        width={hitbox.width}
        height={hitbox.height}
        rx="11"
        className="fill-transparent"
      />
      <path d={path} className="fill-current opacity-90" />
    </g>
  )
}
