"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"

export function useThemeControls() {
  const { resolvedTheme, setTheme } = useTheme()
  const [themeMounted, setThemeMounted] = useState(false)
  const isLightTheme = themeMounted && resolvedTheme === "light"
  const themeToggleLabel = themeMounted
    ? isLightTheme
      ? "Switch to dark theme"
      : "Switch to light theme"
    : "Toggle theme"

  useEffect(() => {
    setThemeMounted(true)
  }, [])

  return {
    themeMounted,
    isLightTheme,
    themeToggleLabel,
    setTheme,
  }
}
