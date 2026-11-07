/**
 * JumpwiseDropZones — which drop zone a held clamp is aimed at (pure math).
 *
 * A clamp counts as "on" a zone when EITHER its tip is within `radiusCm` of the
 * zone in 3D, OR the line from the eye through the clamp tip passes within
 * `radiusCm` of the zone. The second test is what makes mouse dragging in the
 * Lens Studio preview work: the mouse keeps the clamp at a fixed distance along
 * the pointer ray, so it can look right on top of a terminal while sitting a bit
 * in front of or behind it. On glasses the hand puts the tip on the terminal and
 * the first test applies.
 *
 * Must not: touch SceneObjects or know about steps.
 */

import {ZoneId} from "./JumpwiseSteps"

export interface ZoneProbe {
  id: ZoneId
  position: vec3
}

/** Distance from point p to the ray (origin, unit dir), or Infinity if p is behind the origin. */
export function distanceToRay(origin: vec3, dir: vec3, p: vec3): number {
  const t = p.sub(origin).dot(dir)
  if (t <= 0) return Infinity
  return p.distance(origin.add(dir.uniformScale(t)))
}

export function findAimedZone(eye: vec3, clampTip: vec3, zones: ZoneProbe[], radiusCm: number): ZoneId | null {
  const toTip = clampTip.sub(eye)
  const len = toTip.length
  const dir = len > 0.001 ? toTip.uniformScale(1 / len) : vec3.forward()
  let best: ZoneId | null = null
  let bestScore = Infinity
  for (const z of zones) {
    const d3 = clampTip.distance(z.position)
    const dRay = distanceToRay(eye, dir, z.position)
    const score = Math.min(d3, dRay)
    if (score <= radiusCm && score < bestScore) {
      bestScore = score
      best = z.id
    }
  }
  return best
}
