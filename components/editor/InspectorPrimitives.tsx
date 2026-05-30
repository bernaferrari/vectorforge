"use client"

import { ChevronRight } from "lucide-react"
import type { ReactNode, RefObject } from "react"
import { cn } from "@/lib/utils"

// Single source of truth for inspector layout rhythm. Every property row shares
// one label column width and one control height so columns line up across every
// section (Style / Shape / Transform / Light).
export const INSPECTOR_LABEL_WIDTH = "w-[72px]"

// A section is a FLAT block, not a card — Figma/Framer style. Sections are
// separated by hairline dividers (see InspectorSidebar's `divide-y`) so the panel
// reads as one cohesive surface instead of a stack of floating boxes. When
// `active` (the current timeline target) a quiet 2px accent bar runs down the
// left edge — we never fill the whole group.
export function InspectorSection({
  title,
  action,
  active,
  className,
  children,
}: {
  title: string
  action?: ReactNode
  active?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <section
      data-active={active ? "" : undefined}
      className={cn(
        "relative flex flex-col gap-0.5 py-2.5 first:pt-1 last:pb-1",
        className
      )}
    >
      {active ? (
        <span className="pointer-events-none absolute top-2.5 bottom-2.5 -left-1.5 w-0.5 rounded-full bg-foreground/35" />
      ) : null}
      <div className="flex h-6 items-center justify-between px-1.5">
        <span
          className={cn(
            "text-[10px] font-semibold tracking-[0.14em] transition-colors",
            active ? "text-foreground/80" : "text-muted-foreground/55"
          )}
        >
          {title}
        </span>
        {action}
      </div>
      {children}
    </section>
  )
}

export function InspectorRow({
  label,
  dot,
  labelAction,
  trailing,
  active,
  onClick,
  rowRef,
  className,
  children,
}: {
  label: ReactNode
  /** color of the keyframe indicator dot, or null/undefined to hide it */
  dot?: string | null
  /** extra control rendered inside the label column (e.g. axis-lock toggle) */
  labelAction?: ReactNode
  /** node rendered after the control (e.g. a per-row keyframe diamond) */
  trailing?: ReactNode
  active?: boolean
  onClick?: () => void
  rowRef?: RefObject<HTMLDivElement | null>
  className?: string
  children: ReactNode
}) {
  return (
    <div
      ref={rowRef}
      onClick={onClick}
      data-active={active ? "" : undefined}
      className={cn(
        "flex min-h-8 items-center gap-2 rounded-lg px-1.5 py-0.5 transition-colors",
        onClick && "cursor-pointer hover:bg-foreground/[0.03]",
        active && "bg-foreground/[0.05]",
        className
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center gap-1 text-[11px] transition-colors duration-100",
          INSPECTOR_LABEL_WIDTH,
          active ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <span className="truncate">{label}</span>
        {dot ? (
          <span
            className="size-1 shrink-0 rounded-full"
            style={{ backgroundColor: dot }}
          />
        ) : null}
        {labelAction}
      </div>
      {children}
      {trailing}
    </div>
  )
}

export function InspectorDisclosure({
  title,
  open,
  badge,
  onOpenChange,
  children,
}: {
  title: string
  open: boolean
  badge?: ReactNode
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="flex h-6 items-center gap-1 rounded-lg px-1.5 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground/65 transition-colors hover:text-foreground focus-visible:outline-none"
      >
        <ChevronRight
          className={cn(
            "size-3 transition-transform duration-150",
            open && "rotate-90"
          )}
        />
        {title}
        {badge}
      </button>
      {open ? <div className="flex flex-col gap-0.5">{children}</div> : null}
    </div>
  )
}
