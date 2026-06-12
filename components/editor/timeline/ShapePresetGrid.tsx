"use client"

import { useEffect, useMemo, useState } from "react"
import type { ShapeStop } from "../TimelineModel"
import { cn } from "@/lib/utils"
import type { ShapeOption } from "./TimelineTypes"

export function ShapePresetGrid({
  stop,
  visibleShapeOptions,
  className,
  onShapeIconChange,
  onOpenShapePicker,
}: {
  stop: ShapeStop
  visibleShapeOptions: ShapeOption[]
  className?: string
  onShapeIconChange: (id: string, option: ShapeOption) => void
  onOpenShapePicker: (id: string | null) => void
}) {
  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          visibleShapeOptions
            .map((option) => option.category)
            .filter((category): category is string => Boolean(category))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [visibleShapeOptions]
  )
  const [activeCategory, setActiveCategory] = useState<string>("All")
  useEffect(() => {
    if (activeCategory !== "All" && !categories.includes(activeCategory)) {
      setActiveCategory("All")
    }
  }, [activeCategory, categories])
  const filteredOptions =
    activeCategory === "All"
      ? visibleShapeOptions
      : visibleShapeOptions.filter((option) => option.category === activeCategory)

  if (visibleShapeOptions.length === 0) return null

  return (
    <div className="min-h-0">
      {categories.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {["All", ...categories].map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`h-7 rounded-md border px-2 text-[11px] transition-colors ${
                activeCategory === category
                  ? "border-ring/50 bg-accent text-foreground"
                  : "border-border bg-muted/35 text-muted-foreground hover:text-foreground"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}
      <div
        className={cn(
          "grid max-h-72 grid-cols-[repeat(auto-fill,minmax(44px,44px))] justify-between gap-2 overflow-y-auto pr-1",
          className
        )}
      >
        {filteredOptions.map((option) => {
          const active = stop.iconId === option.id
          return (
            <button
              key={`pick-${stop.id}-${option.id}`}
              type="button"
              title={option.name}
              onClick={() => {
                onShapeIconChange(stop.id, option)
                onOpenShapePicker(null)
              }}
              className={`grid aspect-square place-items-center rounded-lg border focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none ${
                active
                  ? "bg-accent"
                  : "border-border bg-muted/40 text-muted-foreground hover:border-border hover:bg-muted/60"
              }`}
              style={active ? { borderColor: option.defaultTint } : undefined}
            >
              <div
                className="size-[18px] [&_svg]:h-full [&_svg]:w-full [&_svg]:fill-current [&_svg]:stroke-current"
                style={{ color: option.defaultTint }}
                dangerouslySetInnerHTML={{ __html: option.svgContent }}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
