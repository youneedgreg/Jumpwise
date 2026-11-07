/**
 * JumpwiseEdgeArrowUI — small arrow near the edge of view (passive view).
 *
 * Owns: one arrow icon kept in front of the camera, pushed toward the view edge
 * and rotated to point at an out-of-view target.
 * Inputs: arrow distance, edge offset, size, color.
 * API: pointToward(dir | null) — dir is a 2D direction in the camera's frame
 * (x right, y up); null hides the arrow.
 * Must not: decide when to show — JumpwiseGuidance does.
 */

import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"

const imageMaterial = requireAsset("../Materials/ImageMaterial.mat") as Material
const ICON_ARROW = requireAsset("../Icons/arrow_forward.png") as Texture

@component
export class JumpwiseEdgeArrowUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">JumpwiseEdgeArrowUI – edge-of-view arrow</span>')
  @ui.separator

  @ui.group_start("Settings")
  @input
  @widget(new SliderWidget(30, 150, 5))
  @hint("How far in front of your eyes the arrow floats, in cm.")
  depthCm: number = 60

  @input
  @widget(new SliderWidget(2, 20, 0.5))
  @hint("How far from the center of view the arrow sits, in cm (at that depth).")
  edgeOffsetCm: number = 9

  @input
  @widget(new SliderWidget(1, 10, 0.5))
  @hint("Arrow size in cm.")
  arrowSizeCm: number = 4

  @input('vec3', '{1.0,0.82,0.3}')
  @widget(new ColorWidget())
  @hint("Arrow color (light, so it shows on the additive display).")
  arrowColor: vec3
  @ui.group_end

  private dir: vec2 | null = null
  private arrowObj!: SceneObject
  private camera = WorldCameraFinderProvider.getInstance()

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    this.arrowObj = global.scene.createSceneObject("Arrow")
    this.arrowObj.setParent(this.sceneObject)
    this.arrowObj.getTransform().setLocalScale(new vec3(this.arrowSizeCm, this.arrowSizeCm, 1))
    const img = this.arrowObj.createComponent("Component.Image") as Image
    const mat = imageMaterial.clone()
    mat.mainPass.baseTex = ICON_ARROW
    mat.mainPass.baseColor = new vec4(this.arrowColor.x, this.arrowColor.y, this.arrowColor.z, 1)
    mat.mainPass.depthTest = false // always readable on top of the scene
    mat.mainPass.depthWrite = false
    img.clearMaterials()
    img.addMaterial(mat)
    this.arrowObj.enabled = false
    this.createEvent("LateUpdateEvent").bind(() => this.place())
  }

  pointToward(dir: vec2 | null): void {
    this.dir = dir
    this.place()
  }

  isShown(): boolean { return this.arrowObj ? this.arrowObj.enabled : false }

  private place(): void {
    if (!this.arrowObj) return
    const show = this.dir !== null
    if (this.arrowObj.enabled !== show) this.arrowObj.enabled = show
    if (!show) return
    const camT = this.camera.getTransform()
    const eye = camT.getWorldPosition()
    const look = camT.forward.uniformScale(-1)
    const d = this.dir!
    const pos = eye
      .add(look.uniformScale(this.depthCm))
      .add(camT.right.uniformScale(d.x * this.edgeOffsetCm))
      .add(camT.up.uniformScale(d.y * this.edgeOffsetCm))
    const t = this.getTransform()
    t.setWorldPosition(pos)
    const roll = quat.angleAxis(Math.atan2(d.y, d.x), vec3.forward())
    t.setWorldRotation(camT.getWorldRotation().multiply(roll))
  }
}
