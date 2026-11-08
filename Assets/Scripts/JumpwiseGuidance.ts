/**
 * JumpwiseGuidance — "something needs attention out of view".
 *
 * Owns: the current focus point (the next target), the in-view test against the
 * camera, the chime-on-focus-change rule, and driving the edge arrow.
 * Inputs: arrow (JumpwiseEdgeArrowUI), audio (JumpwiseAudioController),
 * inViewHalfAngleDeg.
 * Must not: know about steps or clamps — Main tells it where to point.
 */

import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {JumpwiseAudioController} from "./JumpwiseAudioController"
import {JumpwiseEdgeArrowUI} from "./JumpwiseEdgeArrowUI"

@component
export class JumpwiseGuidance extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">JumpwiseGuidance – chime and edge arrow for out-of-view targets</span>')
  @ui.separator

  @ui.group_start("References")
  @input
  @hint("Edge arrow view that points toward the target.")
  arrow: JumpwiseEdgeArrowUI

  @input
  @hint("Audio cues (the chime).")
  audio: JumpwiseAudioController
  @ui.group_end

  @ui.separator
  @ui.group_start("Settings")
  @input
  @widget(new SliderWidget(5, 40, 1))
  @hint("A target counts as in view when it is within this angle of where you look (Specs display is about 46 degrees diagonal).")
  inViewHalfAngleDeg: number = 20
  @ui.group_end

  private focus: vec3 | null = null
  private camera = WorldCameraFinderProvider.getInstance()
  private arrowShown = false
  private lastInView = true

  onAwake(): void {
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
  }

  /**
   * Point at a new target. When `chimeIfOutOfView` is true and the target is
   * out of view right now, the chime plays once.
   */
  setFocus(target: vec3 | null, chimeIfOutOfView: boolean): void {
    this.focus = target
    if (target === null) {
      this.applyArrow(null)
      return
    }
    const inView = this.isInView(target)
    this.lastInView = inView
    if (!inView && chimeIfOutOfView && this.audio) this.audio.playChime()
    this.onUpdate()
  }

  isInView(p: vec3): boolean {
    const camT = this.camera.getTransform()
    const eye = camT.getWorldPosition()
    const look = camT.forward.uniformScale(-1) // cameras look down their local -Z
    const to = p.sub(eye)
    const len = to.length
    if (len < 0.001) return true
    const cosA = to.uniformScale(1 / len).dot(look)
    return cosA >= Math.cos(this.inViewHalfAngleDeg * MathUtils.DegToRad)
  }

  isArrowShown(): boolean { return this.arrowShown }
  isFocusInView(): boolean { return this.lastInView }
  getFocus(): vec3 | null { return this.focus }

  private onUpdate(): void {
    if (this.focus === null) { this.applyArrow(null); return }
    const inView = this.isInView(this.focus)
    this.lastInView = inView
    if (inView) { this.applyArrow(null); return }
    // direction in the camera's own frame
    const local = this.camera.getTransform().getInvertedWorldTransform().multiplyPoint(this.focus)
    let dir = new vec2(local.x, local.y)
    if (local.z > 0) {
      // behind you: point left or right, whichever way is the shorter turn
      dir = new vec2(local.x >= 0 ? 1 : -1, 0)
    }
    if (dir.length < 0.0001) dir = new vec2(1, 0)
    this.applyArrow(dir.normalize())
  }

  private applyArrow(dir: vec2 | null): void {
    this.arrowShown = dir !== null
    if (this.arrow) this.arrow.pointToward(dir)
  }
}
