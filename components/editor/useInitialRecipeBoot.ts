"use client"

import { MOTION_RECIPES } from "./MotionRecipes"
import type { MotionRecipe } from "./MotionRecipes"
import type { ShapeStop } from "./TimelineModel"
import { useInitialShapeSequence } from "./useInitialShapeSequence"

const DEFAULT_RECIPE_ID = "google-metal"

export function useInitialRecipeBoot({
  applyRecipe,
  setSelectedShapeId,
  setShapes,
}: {
  applyRecipe: (recipe: MotionRecipe, initialShapes?: ShapeStop[]) => void
  setSelectedShapeId: (shapeId: string | null) => void
  setShapes: (shapes: ShapeStop[]) => void
}) {
  useInitialShapeSequence({
    onInitialShapes: (initialShapes) => {
      const recipe = MOTION_RECIPES.find(
        (item) => item.id === DEFAULT_RECIPE_ID
      )
      setShapes(initialShapes)
      setSelectedShapeId(initialShapes[0]?.id ?? null)
      if (recipe) applyRecipe(recipe, initialShapes)
    },
  })
}
