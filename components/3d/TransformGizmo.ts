"use client"

import * as THREE from "three"

export const TRANSFORM_GIZMO_SIZE = 0.74

export const TRANSFORM_GIZMO_COLORS = {
  x: 0xfb7185,
  y: 0x34d399,
  z: 0x38bdf8,
} satisfies Record<"x" | "y" | "z", number>

export const TRANSFORM_GIZMO_ARC_COLORS = {
  x: 0xff5f87,
  y: 0x1dd8c2,
  z: 0x0ea5ff,
} satisfies Record<"x" | "y" | "z", number>

export type TransformAxis = keyof typeof TRANSFORM_GIZMO_COLORS

export type TransformGizmoHandle = {
  kind: "move" | "rotate" | "scale"
  axis?: TransformAxis
}

const createTransformGizmoMaterial = (color: number, opacity = 0.9) => {
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  })
  material.userData.transformBaseColor = color
  material.userData.transformBaseOpacity = opacity
  return material
}

const createTransformGizmoHitMaterial = () => {
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.001,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  })
  material.userData.transformGizmoHit = true
  return material
}

const orientObjectToAxis = (object: THREE.Object3D, axis: TransformAxis) => {
  if (axis === "x") object.rotation.z = -Math.PI / 2
  if (axis === "z") object.rotation.x = Math.PI / 2
}

export const transformHandleKey = (
  handle: TransformGizmoHandle | null | undefined
) => (handle ? `${handle.kind}:${handle.axis ?? "center"}` : null)

export const applyTransformGizmoHighlight = (
  gizmo: THREE.Group,
  hoveredKey: string | null,
  activeKey: string | null
) => {
  gizmo.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh || !mesh.material || !mesh.userData.transformGizmo) return

    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]
    materials.forEach((material) => {
      if (material.userData.transformGizmoHit) return

      const handleKey = transformHandleKey(
        mesh.userData.transformGizmo as TransformGizmoHandle
      )
      const isActive = activeKey !== null && handleKey === activeKey
      const isHovered = hoveredKey !== null && handleKey === hoveredKey
      const baseColor =
        typeof material.userData.transformBaseColor === "number"
          ? material.userData.transformBaseColor
          : 0xffffff
      const baseOpacity =
        typeof material.userData.transformBaseOpacity === "number"
          ? material.userData.transformBaseOpacity
          : 0.9
      const basicMaterial = material as THREE.MeshBasicMaterial
      const nextColor = new THREE.Color(baseColor)

      if (isHovered) nextColor.lerp(new THREE.Color(0xffffff), 0.46)
      basicMaterial.color.copy(isActive ? new THREE.Color(0xffffff) : nextColor)
      basicMaterial.opacity = isActive
        ? 1
        : isHovered
          ? Math.min(1, baseOpacity + 0.2)
          : baseOpacity
      basicMaterial.transparent = basicMaterial.opacity < 1
      mesh.scale.setScalar(1)
    })
  })
}

export const createRotationDragOverlay = () => {
  const group = new THREE.Group()
  group.name = "rotation-drag-overlay"
  group.visible = false
  group.renderOrder = 2020

  const radius = TRANSFORM_GIZMO_SIZE * 1.12
  const ringPoints: THREE.Vector3[] = []
  for (let index = 0; index < 96; index += 1) {
    const angle = (index / 96) * Math.PI * 2
    ringPoints.push(
      new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0)
    )
  }

  const ring = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(ringPoints),
    new THREE.LineBasicMaterial({
      color: 0x9ca3af,
      transparent: true,
      opacity: 0.58,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    })
  )
  ring.renderOrder = 2020
  group.add(ring)

  const sector = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial({
      color: 0xfb923c,
      transparent: true,
      opacity: 0.18,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    })
  )
  sector.name = "rotation-drag-sector"
  sector.renderOrder = 2021
  group.add(sector)

  const dial = new THREE.Group()
  dial.name = "rotation-drag-dial"
  dial.renderOrder = 2022

  const spoke = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, radius, 16),
    new THREE.MeshBasicMaterial({
      color: 0x0ea5ff,
      transparent: true,
      opacity: 1,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    })
  )
  spoke.rotation.z = -Math.PI / 2
  spoke.position.x = radius / 2
  spoke.renderOrder = 2023
  dial.add(spoke)

  const handle = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 22, 14),
    new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: false,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    })
  )
  handle.position.x = radius
  handle.renderOrder = 2024
  dial.add(handle)

  group.add(dial)
  group.userData.dial = dial
  group.userData.sector = sector
  group.userData.radius = radius
  return group
}

export const createTransformGizmo = () => {
  const group = new THREE.Group()
  group.name = "transform-gizmo"
  group.visible = false
  group.renderOrder = 2000

  const hitObjects: THREE.Object3D[] = []
  const hitMaterial = createTransformGizmoHitMaterial()
  const axisLength = TRANSFORM_GIZMO_SIZE
  const rodRadius = 0.014
  const coneRadius = 0.066
  const coneHeight = 0.2
  const coneStemLength = 0.18
  const coneCenterOffset = axisLength + coneStemLength + coneHeight / 2
  const arcEndpointDistance = axisLength * 0.985
  const axisEnd: Record<TransformAxis, THREE.Vector3> = {
    x: new THREE.Vector3(axisLength, 0, 0),
    y: new THREE.Vector3(0, axisLength, 0),
    z: new THREE.Vector3(0, 0, axisLength),
  }
  const scaleBallPosition: Record<TransformAxis, THREE.Vector3> = {
    x: new THREE.Vector3(arcEndpointDistance, 0, 0),
    y: new THREE.Vector3(0, arcEndpointDistance, 0),
    z: new THREE.Vector3(0, 0, arcEndpointDistance),
  }
  const scaleBallMaterial = createTransformGizmoMaterial(0x22d3ee, 1)

  ;(Object.keys(TRANSFORM_GIZMO_COLORS) as TransformAxis[]).forEach((axis) => {
    const material = createTransformGizmoMaterial(
      TRANSFORM_GIZMO_COLORS[axis],
      1
    )
    const rodMaterial = createTransformGizmoMaterial(0xfacc15, 1)

    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(rodRadius, rodRadius, axisLength, 16),
      rodMaterial
    )
    orientObjectToAxis(rod, axis)
    rod.position.set(
      axis === "x" ? axisLength / 2 : 0,
      axis === "y" ? axisLength / 2 : 0,
      axis === "z" ? axisLength / 2 : 0
    )
    rod.renderOrder = 2002
    rod.userData.transformGizmo = {
      kind: "move",
      axis,
    } satisfies TransformGizmoHandle
    hitObjects.push(rod)
    group.add(rod)

    const coneStem = new THREE.Mesh(
      new THREE.CylinderGeometry(rodRadius, rodRadius, coneStemLength, 16),
      rodMaterial
    )
    orientObjectToAxis(coneStem, axis)
    coneStem.position.set(
      axis === "x" ? axisLength + coneStemLength / 2 : 0,
      axis === "y" ? axisLength + coneStemLength / 2 : 0,
      axis === "z" ? axisLength + coneStemLength / 2 : 0
    )
    coneStem.renderOrder = 2007
    coneStem.userData.transformGizmo = {
      kind: "move",
      axis,
    } satisfies TransformGizmoHandle
    hitObjects.push(coneStem)
    group.add(coneStem)

    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(coneRadius, coneHeight, 28),
      material
    )
    orientObjectToAxis(cone, axis)
    cone.position.set(
      axis === "x" ? coneCenterOffset : 0,
      axis === "y" ? coneCenterOffset : 0,
      axis === "z" ? coneCenterOffset : 0
    )
    cone.renderOrder = 2008
    cone.userData.transformGizmo = {
      kind: "move",
      axis,
    } satisfies TransformGizmoHandle
    hitObjects.push(cone)
    group.add(cone)

    const joint = new THREE.Mesh(
      new THREE.SphereGeometry(0.072, 22, 14),
      scaleBallMaterial.clone()
    )
    joint.position.copy(scaleBallPosition[axis])
    joint.renderOrder = 2010
    joint.userData.transformGizmo = {
      kind: "scale",
      axis,
    } satisfies TransformGizmoHandle
    joint.userData.transformGizmoPart = "joint"
    hitObjects.push(joint)
    group.add(joint)

    const jointHit = new THREE.Mesh(
      new THREE.SphereGeometry(0.105, 16, 10),
      hitMaterial.clone()
    )
    jointHit.position.copy(joint.position)
    jointHit.userData.transformGizmo = {
      kind: "scale",
      axis,
    } satisfies TransformGizmoHandle
    hitObjects.push(jointHit)
    group.add(jointHit)

    const arrowHitLength = coneStemLength + coneHeight
    const moveHit = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, arrowHitLength, 12),
      hitMaterial.clone()
    )
    orientObjectToAxis(moveHit, axis)
    moveHit.position.set(
      axis === "x" ? axisLength + arrowHitLength / 2 : 0,
      axis === "y" ? axisLength + arrowHitLength / 2 : 0,
      axis === "z" ? axisLength + arrowHitLength / 2 : 0
    )
    moveHit.userData.transformGizmo = {
      kind: "move",
      axis,
    } satisfies TransformGizmoHandle
    hitObjects.push(moveHit)
    group.add(moveHit)
  })

  const arcPairs: Array<{
    axis: TransformAxis
    from: TransformAxis
    to: TransformAxis
  }> = [
    { axis: "x", from: "y", to: "z" },
    { axis: "y", from: "z", to: "x" },
    { axis: "z", from: "x", to: "y" },
  ]

  arcPairs.forEach(({ axis, from, to }) => {
    const fromPoint = axisEnd[from].clone().multiplyScalar(0.985)
    const toPoint = axisEnd[to].clone().multiplyScalar(0.985)
    const controlPoint = fromPoint
      .clone()
      .add(toPoint)
      .normalize()
      .multiplyScalar(axisLength * 1.08)
    const curve = new THREE.QuadraticBezierCurve3(
      fromPoint,
      controlPoint,
      toPoint
    )
    const material = createTransformGizmoMaterial(
      TRANSFORM_GIZMO_ARC_COLORS[axis],
      1
    )
    const arc = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 42, 0.014, 10, false),
      material
    )
    arc.renderOrder = 2000
    arc.userData.transformGizmo = {
      kind: "rotate",
      axis,
    } satisfies TransformGizmoHandle
    hitObjects.push(arc)
    group.add(arc)

    const arcHit = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 28, 0.065, 8, false),
      hitMaterial.clone()
    )
    arcHit.userData.transformGizmo = {
      kind: "rotate",
      axis,
    } satisfies TransformGizmoHandle
    hitObjects.push(arcHit)
    group.add(arcHit)
  })

  group.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.frustumCulled = false
  })

  return { group, hitObjects }
}
