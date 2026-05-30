"use client"

import { Link2, Unlink2 } from "lucide-react"

export function AxisLockButton({
  locked,
  label,
  onToggle,
}: {
  locked: boolean
  label: string
  onToggle: () => void
}) {
  const Icon = locked ? Link2 : Unlink2
  return (
    <button
      type="button"
      aria-label={`${locked ? "Unlock" : "Lock"} ${label} axes`}
      title={locked ? `${label}: linked axes` : `${label}: separate axes`}
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
      className={`ml-1 flex size-5 shrink-0 items-center justify-center rounded-[6px] transition-colors focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none ${
        locked
          ? "bg-muted text-foreground hover:bg-muted/80"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className="size-3" />
    </button>
  )
}
