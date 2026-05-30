import type { WipeDirectionOption } from "./TimelineTypes"

export const TIMELINE_WIPE_DIRECTIONS: WipeDirectionOption[] = [
  { label: "↖", x: -0.707, y: 0.707, tooltip: "Top Left to Bottom Right" },
  { label: "↑", x: 0, y: 1, tooltip: "Bottom to Top" },
  { label: "↗", x: 0.707, y: 0.707, tooltip: "Top Right to Bottom Left" },
  { label: "←", x: -1, y: 0, tooltip: "Right to Left" },
  { label: "•", x: 0, y: 0, tooltip: "Cinematic Cross-Fade" },
  { label: "→", x: 1, y: 0, tooltip: "Left to Right" },
  { label: "↙", x: -0.707, y: -0.707, tooltip: "Bottom Left to Top Right" },
  { label: "↓", x: 0, y: -1, tooltip: "Top to Bottom" },
  { label: "↘", x: 0.707, y: -0.707, tooltip: "Bottom Right to Top Left" },
]
