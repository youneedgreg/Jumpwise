/**
 * JumpwiseLightPlate — a light outline plate for cards and buttons (helper, not a component).
 *
 * Why: SPECS has an additive display, so black and dark grey are see-through.
 * UIKit's BackPlate and default Button styles are dark-grey gradients, which
 * read as "no plate" on glasses but as dark boxes in the preview. This draws
 * a light rounded outline with an almost-clear light fill instead, so the plate
 * looks the same on glasses and in the preview.
 */

import {RoundedRectangle, RoundedRectBlendMode} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"

/** Pale blue-white edge: bright enough to frame the text without hiding the world. */
export const PLATE_EDGE_COLOR = new vec4(0.85, 0.93, 1, 0.9)
export const PLATE_EDGE_CM = 0.2
export const PLATE_CORNER_CM = 1.2

/**
 * Adds a child with a light outline plate of w x h cm.
 * @param fillAlpha  opacity of the white fill (0 = outline only; keep it low, ~0.05–0.12)
 * @param z          local z offset (keep it below the content's own z so text draws on top)
 */
export function addLightPlate(parent: SceneObject, name: string, w: number, h: number,
    fillAlpha: number, z: number = 0): RoundedRectangle {
  const so = global.scene.createSceneObject(name)
  so.setParent(parent)
  so.getTransform().setLocalPosition(new vec3(0, 0, z))
  const rr = so.createComponent(RoundedRectangle.getTypeName()) as RoundedRectangle
  rr.size = new vec2(w, h)
  rr.blendMode = RoundedRectBlendMode.Normal // alpha blending; the default (Disabled) draws the fill opaque
  rr.cornerRadius = PLATE_CORNER_CM
  rr.gradient = false
  rr.backgroundColor = new vec4(1, 1, 1, fillAlpha)
  rr.border = true
  rr.borderType = "Color"
  rr.borderSize = PLATE_EDGE_CM
  rr.borderColor = PLATE_EDGE_COLOR
  return rr
}
