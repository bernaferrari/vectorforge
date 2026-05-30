"use client"

import React from "react"
import type { MaterialWipeIconPair } from "../MaterialWipePairs"

export const WipePairPreview: React.FC<{
  pair: MaterialWipeIconPair
  className: string
  style: React.CSSProperties
  mode: "slash" | "real"
}> = ({ pair, className, style, mode }) => {
  const disabledUsesSlash = mode === "slash" && pair.disabled.endsWith("_off")
  const disabledSymbol = disabledUsesSlash
    ? pair.disabled.slice(0, -4)
    : pair.disabled

  return (
    <span className="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted/45 ring-1 ring-border transition-[background-color,box-shadow] duration-200 ease-out group-hover/pair:bg-muted/65 group-hover/pair:ring-ring/45">
      <span className="absolute inset-0 bg-ring/10 opacity-0 transition-opacity duration-200 ease-out group-hover/pair:opacity-100" />
      <span className="wipe-pair-preview-layer wipe-pair-preview-base absolute inset-0 grid place-items-center">
        <span
          className={`${className} absolute top-1/2 left-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center text-center text-[24px] leading-[24px] text-foreground`}
          style={style}
        >
          {pair.enabled}
        </span>
      </span>
      <span className="wipe-pair-preview-layer wipe-pair-preview-wiped absolute inset-0 grid place-items-center">
        <span
          className={`${className} absolute top-1/2 left-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center text-center text-[24px] leading-[24px] text-foreground`}
          style={style}
        >
          {disabledSymbol}
        </span>
        {disabledUsesSlash && (
          <span
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 h-[25px] w-0.5 -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] rounded-full bg-foreground shadow-[0_0_0_1px_hsl(var(--background))]"
          />
        )}
      </span>
    </span>
  )
}
