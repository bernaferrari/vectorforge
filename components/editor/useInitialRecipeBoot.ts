"use client"

import { useEffect } from "react"
import { MOTION_RECIPES } from "./MotionRecipes"
import type { MotionRecipe } from "./MotionRecipes"

const DEFAULT_RECIPE_ID = "google-metal"

export function useInitialRecipeBoot({
  applyRecipe,
}: {
  applyRecipe: (recipe: MotionRecipe) => void
}) {
  useEffect(() => {
    const recipe = MOTION_RECIPES.find((item) => item.id === DEFAULT_RECIPE_ID)
    if (recipe) applyRecipe(recipe)
  }, [applyRecipe])
}
