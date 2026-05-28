"use client"

import React from "react"
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { applyEasing, EasingType } from "../TimelineModel"

export const EASING_OPTIONS: Array<{ value: EasingType; label: string }> = [
  { value: "linear", label: "Linear" },
  { value: "ease-in-out", label: "Smooth" },
  { value: "spring", label: "Spring" },
  { value: "bounce", label: "Bounce" },
]

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

export const easingCurvePath = (easing: EasingType): string => {
  const pts: string[] = []
  for (let i = 0; i <= 14; i++) {
    const t = i / 14
    const v = applyEasing(easing, t)
    pts.push(`${(t * 14 + 1).toFixed(1)},${(15 - v * 13).toFixed(1)}`)
  }
  return `M ${pts.join(" L ")}`
}

export const easingMenuItems = (
  current: EasingType,
  onSelect: (easing: EasingType) => void
): TimelineMenuItem[] => [
  { type: "separator" },
  {
    type: "submenu",
    label: "Ease",
    shortcut: EASING_OPTIONS.find((option) => option.value === current)?.label,
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
  onChange: (e: EasingType) => void
  color?: string
}> = ({ value, onChange, color = "#a1a1aa" }) => (
  <Popover>
    <PopoverTrigger
      title={`Easing: ${EASING_OPTIONS.find((o) => o.value === value)?.label ?? value}`}
      className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none"
      onClick={(e) => e.stopPropagation()}
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
      {EASING_OPTIONS.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
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
                d={easingCurvePath(o.value)}
                stroke={active ? "#fff" : "#71717a"}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {o.label}
          </button>
        )
      })}
    </PopoverContent>
  </Popover>
)

export const TimelineContextMenu = ({
  menu,
  onClose,
}: {
  menu: TimelineMenuState
  onClose: () => void
}) => {
  if (!menu) return null

  return (
    <ContextMenuContent
      className="min-w-44 rounded-xl border-border bg-popover/98 p-1.5 text-foreground backdrop-blur-xl"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {menu.title && (
        <div className="px-2 pt-0.5 pb-1 text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          {menu.title}
        </div>
      )}
      {menu.items.map((item, index) => {
        if (item.type === "separator") {
          return (
            <ContextMenuSeparator
              key={`separator-${index}`}
              className="my-1 bg-muted/75"
            />
          )
        }

        if (item.type === "submenu") {
          return (
            <ContextMenuSub key={`${item.label}-${index}`}>
              <ContextMenuSubTrigger className="h-7 gap-5 rounded-lg px-2 text-[11px]">
                <span className="truncate">{item.label}</span>
                {item.shortcut && (
                  <ContextMenuShortcut className="text-[10px] tracking-normal">
                    {item.shortcut}
                  </ContextMenuShortcut>
                )}
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="min-w-36 rounded-xl border-border bg-popover/98 p-1.5 text-foreground backdrop-blur-xl">
                {item.items.map((child, childIndex) => (
                  <ContextMenuItem
                    key={`${child.label}-${childIndex}`}
                    onClick={() => {
                      child.onSelect()
                      onClose()
                    }}
                    className="h-7 justify-between gap-4 rounded-lg px-2 text-[11px]"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {child.easing && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          className="shrink-0"
                        >
                          <path
                            d={easingCurvePath(child.easing)}
                            stroke="currentColor"
                            className={
                              child.active
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                      <span className="truncate">{child.label}</span>
                    </span>
                    {child.active && (
                      <span className="size-1.5 rounded-full bg-foreground" />
                    )}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          )
        }

        return (
          <ContextMenuItem
            key={`${item.label}-${index}`}
            disabled={item.disabled}
            variant={item.danger ? "destructive" : "default"}
            onClick={() => {
              if (item.disabled) return
              item.onSelect()
              onClose()
            }}
            className="h-7 justify-between gap-5 rounded-lg px-2 text-[11px]"
          >
            <span className="flex min-w-0 items-center gap-2">
              {item.easing && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="shrink-0"
                >
                  <path
                    d={easingCurvePath(item.easing)}
                    stroke="currentColor"
                    className={
                      item.active ? "text-foreground" : "text-muted-foreground"
                    }
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              <span className="truncate">{item.label}</span>
            </span>
            {item.shortcut && (
              <ContextMenuShortcut className="font-mono text-[10px] tracking-normal">
                {item.shortcut}
              </ContextMenuShortcut>
            )}
            {item.active && !item.shortcut && (
              <span className="size-1.5 rounded-full bg-foreground" />
            )}
          </ContextMenuItem>
        )
      })}
    </ContextMenuContent>
  )
}
