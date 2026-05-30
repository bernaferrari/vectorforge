"use client"

import * as React from "react"
import { PopoverContent } from "@/components/ui/popover"
import {
  SolidColorEditor,
  type SolidColorEditorProps,
} from "./color-solid-editor"

interface ColorStopEditorPopoverProps extends SolidColorEditorProps {
  contentRef: React.RefObject<HTMLDivElement | null>
  align?: "start" | "center" | "end"
  side?: "top" | "right" | "bottom" | "left"
}

export function ColorStopEditorPopover({
  contentRef,
  align = "center",
  side = "top",
  ...editorProps
}: ColorStopEditorPopoverProps) {
  return (
    <PopoverContent
      ref={contentRef}
      animated={false}
      align={align}
      side={side}
      sideOffset={12}
      className="w-[210px] rounded-xl border border-border bg-popover p-3 pb-2 text-popover-foreground shadow-2xl backdrop-blur-xl"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <SolidColorEditor {...editorProps} framed={false} compact />
    </PopoverContent>
  )
}
