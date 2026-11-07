/**
 * JumpwiseMarkerUI — the numbered ring on one terminal or ground point (passive view).
 *
 * Owns: a flat ring (~6 cm across) lying on the terminal, the step number above
 * it, and a small green tick for finished steps. Visual states only.
 * States: hidden | steady | pulse | done, plus an "aimed" highlight and a short
 * red "wrong" flash.
 * Inputs: ringMaterial (unlit material, cloned per marker), stepNumber, colors.
 * Must not: hold step state or decide anything — Main pushes states in.
 */

import {Billboard} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Billboard/Billboard"

const imageMaterial = requireAsset("../Materials/ImageMaterial.mat") as Material
const ICON_CHECK = requireAsset("../Icons/check.png") as Texture

export type MarkerState = "hidden" | "steady" | "pulse" | "done"

@component
export class JumpwiseMarkerUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">JumpwiseMarkerUI – numbered ring on a terminal</span>')
  @ui.separator

  @ui.group_start("References")
  @input
  @hint("Unlit material for the ring (cloned per marker so each can change color).")
  ringMaterial: Material
  @ui.group_end

  @ui.separator
  @ui.group_start("Settings")
  @input
  @widget(new SpinBoxWidget(0, 9, 1))
  @hint("Step number shown above the ring. 0 = no number (a zone that is never a step, like the dead battery's - terminal).")
  stepNumber: number = 1

  @input
  @widget(new SliderWidget(3, 12, 0.5))
  @hint("Ring outer diameter in cm. The drop zone is twice this size.")
  ringDiameterCm: number = 6

  @input('vec3', '{1.0,0.82,0.3}')
  @widget(new ColorWidget())
  @hint("Steady ring color (next target, clamp not yet grabbed).")
  steadyColor: vec3

  @input('vec3', '{1.0,1.0,0.7}')
  @widget(new ColorWidget())
  @hint("Bright pulsing color once the clamp is grabbed, and the aimed highlight.")
  pulseColor: vec3

  @input('vec3', '{0.45,0.95,0.55}')
  @widget(new ColorWidget())
  @hint("Finished step: small green tick.")
  doneColor: vec3

  @input('vec3', '{1.0,0.3,0.25}')
  @widget(new ColorWidget())
  @hint("Red flash on a wrong drop.")
  warnColor: vec3
  @ui.group_end

  private state: MarkerState = "hidden"
  private aimed = false
  private flashUntil = -1
  private ring!: SceneObject
  private ringMat!: Material
  private numberObj!: SceneObject
  private numberText!: Text
  private tickObj!: SceneObject
  private tickMat!: Material

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    this.buildRing()
    this.buildNumber()
    this.buildTick()
    this.applyVisuals()
    this.createEvent("UpdateEvent").bind(() => this.applyVisuals())
  }

  setState(s: MarkerState): void {
    this.state = s
    if (s !== "pulse") this.aimed = false
    this.applyVisuals()
  }

  getState(): MarkerState { return this.state }

  /** Highlight while a held clamp is aimed at this zone. */
  setAimed(on: boolean): void { this.aimed = on }
  isAimed(): boolean { return this.aimed }

  /** Short red flash (wrong drop), then back to the current state. */
  flashWrong(seconds: number = 0.8): void {
    this.flashUntil = getTime() + seconds
    this.applyVisuals()
  }

  isFlashing(): boolean { return getTime() < this.flashUntil }

  /** Glows = visibly lit as a target (steady or pulse). */
  isLit(): boolean { return this.state === "steady" || this.state === "pulse" }

  private applyVisuals(): void {
    if (!this.ring) return
    const flashing = this.isFlashing()
    const t = getTime()
    let ringOn = false
    let scale = 1
    let color = this.steadyColor
    let showNumber = false
    let showTick = false

    if (flashing) {
      ringOn = true
      color = this.warnColor
      scale = 1.15 + 0.15 * Math.abs(Math.sin(t * 18))
    } else if (this.state === "steady") {
      ringOn = true
      showNumber = this.stepNumber > 0
    } else if (this.state === "pulse") {
      ringOn = true
      showNumber = this.stepNumber > 0
      color = this.pulseColor
      scale = this.aimed ? 1.45 : 1.1 + 0.15 * Math.sin(t * Math.PI * 2 * 1.6)
    } else if (this.state === "done") {
      ringOn = true
      color = this.doneColor
      scale = 0.45
      showTick = true
    }

    if (this.ring.enabled !== ringOn) this.ring.enabled = ringOn
    this.ring.getTransform().setLocalScale(new vec3(scale, 1, scale))
    this.ringMat.mainPass.baseColor = new vec4(color.x, color.y, color.z, 1)
    if (this.numberObj.enabled !== showNumber) this.numberObj.enabled = showNumber
    if (showNumber) {
      const c = this.state === "pulse" ? this.pulseColor : this.steadyColor
      this.numberText.textFill.color = new vec4(c.x, c.y, c.z, 1)
    }
    if (this.tickObj.enabled !== showTick) this.tickObj.enabled = showTick
  }

  private buildRing(): void {
    this.ring = global.scene.createSceneObject("Ring")
    this.ring.setParent(this.sceneObject)
    this.ring.getTransform().setLocalPosition(new vec3(0, 0.3, 0))
    const rmv = this.ring.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    rmv.mesh = this.makeRingMesh(this.ringDiameterCm / 2, this.ringDiameterCm / 2 - 0.9, 48)
    this.ringMat = this.ringMaterial.clone()
    this.ringMat.mainPass.twoSided = true
    rmv.clearMaterials()
    rmv.addMaterial(this.ringMat)
  }

  private buildNumber(): void {
    this.numberObj = global.scene.createSceneObject("Number")
    this.numberObj.setParent(this.sceneObject)
    this.numberObj.getTransform().setLocalPosition(new vec3(0, 4.5, 0))
    this.numberText = this.numberObj.createComponent("Component.Text") as Text
    this.numberText.text = this.stepNumber > 0 ? String(this.stepNumber) : ""
    this.numberText.depthTest = true
    this.numberText.size = 150
    ;(this.numberText as Text & {weight?: number}).weight = 700
    this.numberText.horizontalAlignment = HorizontalAlignment.Center
    this.numberText.verticalAlignment = VerticalAlignment.Center
    this.numberText.horizontalOverflow = HorizontalOverflow.Overflow
    this.numberText.verticalOverflow = VerticalOverflow.Overflow
    this.numberText.layoutRect = Rect.create(-3, 3, -3, 3)
    this.addFacing(this.numberObj)
  }

  private buildTick(): void {
    this.tickObj = global.scene.createSceneObject("Tick")
    this.tickObj.setParent(this.sceneObject)
    this.tickObj.getTransform().setLocalPosition(new vec3(0, 2.2, 0))
    this.tickObj.getTransform().setLocalScale(new vec3(2.6, 2.6, 1))
    const img = this.tickObj.createComponent("Component.Image") as Image
    this.tickMat = imageMaterial.clone()
    this.tickMat.mainPass.baseTex = ICON_CHECK
    this.tickMat.mainPass.baseColor = new vec4(this.doneColor.x, this.doneColor.y, this.doneColor.z, 1)
    this.tickMat.mainPass.depthTest = true
    this.tickMat.mainPass.depthWrite = false
    img.clearMaterials()
    img.addMaterial(this.tickMat)
    this.addFacing(this.tickObj)
  }

  private addFacing(so: SceneObject): void {
    const bb = so.createComponent(Billboard.getTypeName()) as Billboard
    bb.xAxisEnabled = true
    bb.yAxisEnabled = true
  }

  /** Flat annulus in the XZ plane, facing +Y. */
  private makeRingMesh(outer: number, inner: number, segments: number): RenderMesh {
    const mb = new MeshBuilder([
      {name: "position", components: 3},
      {name: "normal", components: 3},
      {name: "texture0", components: 2},
    ])
    mb.topology = MeshTopology.Triangles
    mb.indexType = MeshIndexType.UInt16
    const verts: number[] = []
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2
      const c = Math.cos(a)
      const s = Math.sin(a)
      verts.push(c * outer, 0, s * outer, 0, 1, 0, i / segments, 1)
      verts.push(c * inner, 0, s * inner, 0, 1, 0, i / segments, 0)
    }
    mb.appendVerticesInterleaved(verts)
    const idx: number[] = []
    for (let i = 0; i < segments; i++) {
      const o0 = i * 2
      const i0 = i * 2 + 1
      const o1 = (i + 1) * 2
      const i1 = (i + 1) * 2 + 1
      // counter-clockwise seen from +Y
      idx.push(o0, i0, o1, o1, i0, i1)
    }
    mb.appendIndices(idx)
    mb.updateMesh()
    return mb.getMesh()
  }
}
