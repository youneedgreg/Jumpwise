/**
 * JumpwiseClampController — one jumper-cable clamp on the rack.
 *
 * Owns: this clamp's collider, SIK Interactable + InteractableManipulation
 * (grab and drag, one hand, no rotate/scale), its soft glow, its home spot on
 * the rack, and the snap/return motions.
 * Inputs: glowObject (soft glow shell child), tipAnchor (empty child at the jaw
 * end), clampId, collider size, return speed, debug collider flag.
 * Emits: onGrabbed, onMoved (tip world position), onReleased (tip world position).
 * Must not: decide whether a drop is right or wrong (Main does, using JumpwiseSteps).
 */

import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {InteractableManipulation} from "SpectaclesInteractionKit.lspkg/Components/Interaction/InteractableManipulation/InteractableManipulation"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import animate from "SpectaclesInteractionKit.lspkg/Utils/animate"

@component
export class JumpwiseClampController extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">JumpwiseClampController – one grabbable jumper clamp</span>')
  @ui.separator

  @ui.group_start("References")
  @input
  @hint("Soft glow shell shown while this is the clamp to take.")
  glowObject: SceneObject

  @input
  @hint("Empty child at the jaw end. Its world position is the clamp tip used for drops.")
  tipAnchor: SceneObject
  @ui.group_end

  @ui.separator
  @ui.group_start("Settings")
  @input
  @widget(new ComboBoxWidget([
    new ComboBoxItem("Red A (step 1)", "redA"),
    new ComboBoxItem("Red B (step 2)", "redB"),
    new ComboBoxItem("Black B (step 3)", "blackB"),
    new ComboBoxItem("Black A (step 4)", "blackA"),
  ]))
  @hint("Which clamp this is in the step table.")
  clampId: string = "redA"

  @input
  @hint("Grab collider size in cm (bigger than the clamp so it is easy to grab).")
  colliderSizeCm: vec3 = new vec3(8, 18, 8)

  @input
  @widget(new SliderWidget(0.1, 1.5, 0.05))
  @hint("Seconds for the clamp to slide back to the rack.")
  returnSeconds: number = 0.35
  @ui.group_end

  @ui.separator
  @ui.group_start("Debug")
  @input
  @hint("Draw the grab collider as a wireframe.")
  debugCollider: boolean = false
  @ui.group_end

  private interactable!: Interactable
  private manipulation!: InteractableManipulation
  private homePosition: vec3 = vec3.zero()
  private homeRotation: quat = quat.quatIdentity()
  private held = false
  private grabbable = true
  private glowOn = false
  private hovered = false
  private moving: (() => void) | null = null

  private _onGrabbed = new Event<JumpwiseClampController>()
  private _onMoved = new Event<vec3>()
  private _onReleased = new Event<vec3>()
  get onGrabbed(): PublicApi<JumpwiseClampController> { return this._onGrabbed.publicApi() }
  get onMoved(): PublicApi<vec3> { return this._onMoved.publicApi() }
  get onReleased(): PublicApi<vec3> { return this._onReleased.publicApi() }

  onAwake(): void {
    const t = this.getTransform()
    this.homePosition = t.getWorldPosition()
    this.homeRotation = t.getWorldRotation()

    const collider = this.sceneObject.createComponent("Physics.ColliderComponent") as ColliderComponent
    const shape = Shape.createBoxShape()
    shape.size = this.colliderSizeCm
    collider.shape = shape
    collider.fitVisual = false
    collider.debugDrawEnabled = this.debugCollider

    this.interactable = this.sceneObject.createComponent(Interactable.getTypeName()) as Interactable
    this.interactable.targetingMode = 3 // direct + indirect
    this.interactable.allowMultipleInteractors = false // one clamp, one hand

    this.manipulation = this.sceneObject.createComponent(InteractableManipulation.getTypeName()) as InteractableManipulation
    this.manipulation.setCanRotate(false)
    this.manipulation.setCanScale(false)
    this.manipulation.enableStretchZ = false

    this.createEvent("OnStartEvent").bind(() => this.onStart())
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
  }

  private onStart(): void {
    this.manipulation.onManipulationStart.add(() => {
      if (this.moving) { this.moving(); this.moving = null }
      this.held = true
      this._onGrabbed.invoke(this)
    })
    this.manipulation.onManipulationUpdate.add(() => {
      this._onMoved.invoke(this.getTipPosition())
    })
    this.manipulation.onManipulationEnd.add(() => {
      // Report each release once: disabling the grab inside a release handler
      // makes SIK end the manipulation again, re-entering here.
      if (!this.held) return
      this.held = false
      this._onReleased.invoke(this.getTipPosition())
    })
    this.interactable.onHoverEnter.add(() => { this.hovered = true })
    this.interactable.onHoverExit.add(() => { this.hovered = false })
    this.applyGrabbable()
  }

  private onUpdate(): void {
    if (!this.glowObject) return
    const show = this.glowOn && !this.held
    if (this.glowObject.enabled !== show) this.glowObject.enabled = show
    if (show) {
      // soft, slow breathing; a little bigger while hovered
      const base = this.hovered && this.grabbable ? 1.15 : 1.0
      const s = base * (1 + 0.04 * Math.sin(getTime() * 2.5))
      this.glowObject.getTransform().setLocalScale(new vec3(s, s, s))
    }
  }

  getClampId(): string { return this.clampId }
  isHeld(): boolean { return this.held }
  isGrabbable(): boolean { return this.grabbable }
  isGlowing(): boolean { return this.glowOn }
  getHomePosition(): vec3 { return this.homePosition }

  getTipPosition(): vec3 {
    return this.tipAnchor ? this.tipAnchor.getTransform().getWorldPosition() : this.getTransform().getWorldPosition()
  }

  /** Only the current clamp can be grabbed (brief default). */
  setGrabbable(on: boolean): void {
    this.grabbable = on
    this.applyGrabbable()
  }

  setGlow(on: boolean): void {
    this.glowOn = on
  }

  /** Put the clamp so its tip sits on `tipWorld` (a terminal or ground point). */
  attachAt(tipWorld: vec3): void {
    if (this.moving) { this.moving(); this.moving = null }
    const t = this.getTransform()
    t.setWorldRotation(this.homeRotation)
    const offset = this.getTipPosition().sub(t.getWorldPosition())
    t.setWorldPosition(tipWorld.sub(offset))
  }

  /** Slide back to its spot on the rack. */
  returnToRack(): void {
    if (this.moving) { this.moving(); this.moving = null }
    const t = this.getTransform()
    const from = t.getWorldPosition()
    const to = this.homePosition
    t.setWorldRotation(this.homeRotation)
    this.moving = animate({
      duration: this.returnSeconds,
      easing: "ease-out-quad",
      update: (k: number) => t.setWorldPosition(vec3.lerp(from, to, k)),
      ended: () => { t.setWorldPosition(to); this.moving = null },
    })
  }

  /** Jump straight to the rack (used on reset). */
  snapToRack(): void {
    if (this.moving) { this.moving(); this.moving = null }
    const t = this.getTransform()
    t.setWorldRotation(this.homeRotation)
    t.setWorldPosition(this.homePosition)
  }

  private applyGrabbable(): void {
    if (this.interactable) this.interactable.enabled = this.grabbable
    if (this.manipulation) this.manipulation.enabled = this.grabbable
  }
}
