"use client"

import React from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { applyEasing, EasingType } from "../TimelineModel"
import type { TimelineMenuItem } from "./TimelineMenuModel"

export const EASING_OPTIONS: Array<{ value: EasingType; label: string }> = [
  { value: "linear", label: "Linear" },
  { value: "ease-in-out", label: "Smooth" },
  { value: "spring", label: "Spring" },
  { value: "bounce", label: "Bounce" },
]

export const getEasingLabel = (easing: EasingType) =>
  EASING_OPTIONS.find((option) => option.value === easing)?.label ?? easing

export const easingCurvePath = (easing: EasingType): string => {
  const points: string[] = []
  for (let index = 0; index <= 14; index++) {
    const t = index / 14
    const value = applyEasing(easing, t)
    points.push(`${(t * 14 + 1).toFixed(1)},${(15 - value * 13).toFixed(1)}`)
  }
  return `M ${points.join(" L ")}`
}

export const easingMenuItems = (
  current: EasingType,
  onSelect: (easing: EasingType) => void
): TimelineMenuItem[] => [
  { type: "separator" },
  {
    type: "submenu",
    label: "Ease",
    shortcut: getEasingLabel(current),
    items: EASING_OPTIONS.map((option) => ({
      label: option.label,
      active: option.value === current,
      easing: option.value,
      onSelect: () => onSelect(option.value),
    })),
  },
]

export const EasingPicker: React.FC<{
  value: EasingType
  onChange: (easing: EasingType) => void
  color?: string
  scopeLabel?: string
}> = ({ value, onChange, color = "#a1a1aa", scopeLabel }) => (
  <Popover>
    <PopoverTrigger
      title={`${scopeLabel ?? "Easing"}: ${getEasingLabel(value)}`}
      className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none"
      onClick={(event) => event.stopPropagation()}
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path
          d={easingCurvePath(value)}
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </PopoverTrigger>
    <PopoverContent
      align="end"
      side="top"
      sideOffset={6}
      className="w-40 border-border bg-popover p-1 text-foreground"
    >
      {EASING_OPTIONS.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors ${active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="shrink-0"
            >
              <path
                d={easingCurvePath(option.value)}
                stroke={active ? "#fff" : "#71717a"}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {option.label}
          </button>
        )
      })}
    </PopoverContent>
  </Popover>
)
