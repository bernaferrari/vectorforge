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
import { easingCurvePath } from "./TimelineEasingControls"
import type { TimelineMenuState } from "./TimelineMenuModel"

export const TimelineContextMenu = ({
  menu,
  onClose,
}: {
  menu: TimelineMenuState
  onClose: () => void
}) => {
  const anchor = React.useMemo(
    () =>
      menu
        ? {
            getBoundingClientRect: () => new DOMRect(menu.x, menu.y, 0, 0),
          }
        : undefined,
    [menu]
  )

  if (!menu) return null

  return (
    <ContextMenuContent
      anchor={anchor}
      positionMethod="fixed"
      collisionPadding={8}
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
                    onSelect={() => {
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
            onSelect={() => {
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
