import * as THREE from "three"
import { createDiagonalWipePlanes } from "./DiagonalWipe"
import {
  ICON_VIEWBOX_SIZE,
  MODEL_SCALE,
  WIPE_SEAM_OVERLAP_WORLD,
  applySvgModelScale,
} from "./SvgSceneUtils"
import { updateGroupMaterialState } from "./SvgMaterialState"
import type { SvgCanvasProps } from "./SvgTypes"

type ApplySvgTransitionOptions = {
  progress: number
  transitionType: SvgCanvasProps["transitionType"]
  wipeDirection: SvgCanvasProps["wipeDirection"]
  iconA: THREE.Group | null
  iconB: THREE.Group | null
  pivot: THREE.Group | null
  clipPlaneA: THREE.Plane | null
  clipPlaneB: THREE.Plane | null
}

const resetModelTransform = (group: THREE.Group) => {
  group.position.set(0, 0, 0)
  applySvgModelScale(group)
}

export const applySvgTransitionState = ({
  progress,
  transitionType,
  wipeDirection,
  iconA,
  iconB,
  pivot,
  clipPlaneA,
  clipPlaneB,
}: ApplySvgTransitionOptions) => {
  const transitionIsActive = progress > 0.001 && progress < 0.999
  const isWipeActive =
    transitionIsActive &&
    transitionType === "wipe" &&
    (wipeDirection.x !== 0 || wipeDirection.y !== 0)
  const isCrossfade = transitionIsActive && transitionType === "fade"

  if (isWipeActive && clipPlaneA && clipPlaneB) {
    const wipePlanes = createDiagonalWipePlanes({
      width: ICON_VIEWBOX_SIZE * MODEL_SCALE,
      height: ICON_VIEWBOX_SIZE * MODEL_SCALE,
      progress,
      direction: wipeDirection,
      seamOverlap: WIPE_SEAM_OVERLAP_WORLD,
    })

    if (pivot) {
      pivot.updateMatrixWorld(true)
      clipPlaneA.copy(wipePlanes.basePlane).applyMatrix4(pivot.matrixWorld)
      clipPlaneB.copy(wipePlanes.wipedPlane).applyMatrix4(pivot.matrixWorld)
    } else {
      clipPlaneA.copy(wipePlanes.basePlane)
      clipPlaneB.copy(wipePlanes.wipedPlane)
    }

    if (iconA) {
      iconA.visible = true
      resetModelTransform(iconA)
      updateGroupMaterialState(iconA, {
        opacity: 1,
        clippingPlanes: [clipPlaneA],
      })
    }
    if (iconB) {
      iconB.visible = true
      resetModelTransform(iconB)
      updateGroupMaterialState(iconB, {
        opacity: 1,
        clippingPlanes: [clipPlaneB],
      })
    }
    return { isCrossfade: false }
  }

  if (isCrossfade) {
    if (iconA) {
      iconA.visible = true
      resetModelTransform(iconA)
      updateGroupMaterialState(iconA, {
        opacity: 1 - progress,
        transparent: true,
      })
    }
    if (iconB) {
      iconB.visible = true
      resetModelTransform(iconB)
      updateGroupMaterialState(iconB, {
        opacity: progress,
        transparent: true,
      })
    }
    return { isCrossfade: true }
  }

  const showB = progress >= 0.5
  if (iconA) {
    iconA.visible = !showB
    resetModelTransform(iconA)
    updateGroupMaterialState(iconA, { opacity: 1 })
  }
  if (iconB) {
    iconB.visible = showB
    resetModelTransform(iconB)
    updateGroupMaterialState(iconB, { opacity: 1 })
  }
  return { isCrossfade: false }
}
