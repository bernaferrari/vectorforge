"use client"

import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"

type ExportCopyButtonProps = {
  copied: boolean
  onCopy: () => void
}

export function ExportCopyButton({ copied, onCopy }: ExportCopyButtonProps) {
  return (
    <Button
      size="sm"
      variant="ghost"
      className="border border-border bg-background/90 text-foreground shadow-sm hover:bg-muted"
      onClick={onCopy}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied!" : "Copy Code"}
    </Button>
  )
}
