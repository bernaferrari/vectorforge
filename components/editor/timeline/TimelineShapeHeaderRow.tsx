"use client"

import { Loader2, Plus } from "lucide-react"

type TimelineShapeHeaderRowProps = {
  selectedShapeId: string | null
  isPreviewLoading: boolean
  onAddShape: () => void
}

export function TimelineShapeHeaderRow({
  selectedShapeId,
  isPreviewLoading,
  onAddShape,
}: TimelineShapeHeaderRowProps) {
  return (
    <div
      className={`group flex h-9 items-center gap-2 border-b border-border px-3 transition-colors ${
        selectedShapeId ? "bg-muted/25" : "hover:bg-muted/40"
      }`}
    >
      <span className="flex-1 truncate text-[11px] font-semibold text-foreground">
        Shape
      </span>
      {isPreviewLoading && (
        <Loader2
          aria-label="Preparing 3D icon"
          className="size-3.5 shrink-0 animate-spin text-muted-foreground"
        />
      )}
      <button
        type="button"
        aria-label="Add shape"
        title="Add shape at playhead"
        onClick={onAddShape}
        className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  )
}
