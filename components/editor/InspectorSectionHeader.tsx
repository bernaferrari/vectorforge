"use client"

import type { ReactNode } from "react"

export function InspectorSectionHeader({
  title,
  action,
}: {
  title: string
  action?: ReactNode
}) {
  return (
    <div className="flex h-6 items-center justify-between">
      <span className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground/70">
        {title}
      </span>
      {action}
    </div>
  )
}
