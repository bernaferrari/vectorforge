import * as THREE from "three"
import { TRANSFORM_GIZMO_SIZE } from "./TransformGizmo"

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
  const handleRadius = 0.07
  const spokeStartInset = handleRadius * 0.35
  const spokeHandleOverlap = handleRadius * 0.7
  const spokeLength = radius + spokeHandleOverlap + spokeStartInset

  const spoke = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, spokeLength, 16),
    new THREE.MeshBasicMaterial({
      color: 0x0ea5ff,
      transparent: false,
      opacity: 1,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    })
  )
  spoke.rotation.z = -Math.PI / 2
  spoke.position.x = (radius + spokeHandleOverlap - spokeStartInset) / 2
  spoke.renderOrder = 2023
  dial.add(spoke)

  const handle = new THREE.Mesh(
    new THREE.SphereGeometry(handleRadius, 22, 14),
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
