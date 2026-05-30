"use client"

import type { EasingType } from "../TimelineModel"

export type TimelineMenuItem =
  | {
      type?: "item"
      label: string
      shortcut?: string
      danger?: boolean
      disabled?: boolean
      active?: boolean
      easing?: EasingType
      onSelect: () => void
    }
  | {
      type: "submenu"
      label: string
      shortcut?: string
      items: Array<{
        label: string
        active?: boolean
        easing?: EasingType
        onSelect: () => void
      }>
    }
  | { type: "separator" }

export type TimelineMenuState = {
  x: number
  y: number
  title?: string
  items: TimelineMenuItem[]
} | null
