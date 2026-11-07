/**
 * JumpwiseRemoval — phase 2: "Remove clamps", black first, in reverse (plain TS, not a component).
 *
 * Owns: the removal half of the guide. It walks the SAME CONNECT_STEPS backwards
 * through the SAME JumpSequence (4, 3, 2, 1) and drives the same views as the
 * connect flow: a steady numbered ring + soft clamp glow on the clamp to take
 * off, the step card beside it, the chime + edge arrow when that clamp is out of
 * view. Only the current clamp can be grabbed. Letting go of it anywhere except
 * back on its own terminal sends it back to the rack; letting go on its own
 * terminal re-attaches it (not removed). After the last clamp: a short "Done" card.
 * Inputs: the shared sequence and the views, handed over by JumpwiseMain.
 * Must not: touch the connect flow. To cut removal: delete this file, the removal
 * block in JumpwiseSteps.ts and the lines marked "removal" in JumpwiseMain.ts.
 */

import {ClampId, CONNECT_STEPS, DONE_TEXT, JumpSequence, REMOVE_BUTTON, REMOVE_TEXT, StepDef, ZoneId} from "./JumpwiseSteps"
import {JumpwiseClampController} from "./JumpwiseClampController"
import {JumpwiseMarkerUI} from "./JumpwiseMarkerUI"
import {JumpwiseStepCardUI} from "./JumpwiseStepCardUI"
import {JumpwiseGuidance} from "./JumpwiseGuidance"
import {JumpwiseAudioController} from "./JumpwiseAudioController"

export interface RemovalViews {
  clamps: Map<ClampId, JumpwiseClampController>
  markers: Map<ZoneId, JumpwiseMarkerUI>
  stepCard: JumpwiseStepCardUI
  guidance: JumpwiseGuidance
  audio: JumpwiseAudioController
  zonePosition: (zone: ZoneId) => vec3
  aimedZone: (tip: vec3) => ZoneId | null
  note: (msg: string) => void
}

export class JumpwiseRemoval {
  constructor(private seq: JumpSequence, private v: RemovalViews) {}

  /** True while removal owns the clamp events. */
  isActive(): boolean {
    return this.seq.phase === "remove"
  }

  /** After "Start donor car": offer the "Remove clamps" button on the card. */
  offer(): void {
    this.v.stepCard.showNext(REMOVE_BUTTON)
  }

  /** "Remove clamps" pinched. Returns false if it was not the right moment. */
  start(): boolean {
    if (!this.seq.startRemoval()) return false
    this.v.note("remove clamps")
    this.v.stepCard.hideNext()
    this.enterStep(true)
    return true
  }

  onGrabbed(id: ClampId): void {
    const clamp = this.v.clamps.get(id)!
    if (!this.seq.grab(id)) {
      // Not the current clamp (it is not grabbable, so this should not happen): leave it on.
      const zone = this.zoneOf(id)
      if (zone !== null) clamp.attachAt(this.v.zonePosition(zone))
      return
    }
    const step = this.seq.removalStep()!
    this.v.note("lifted " + id + " off " + step.zone)
    clamp.setGlow(false)
    // The clamp is off its terminal, so that ring is no longer a target.
    this.v.markers.get(step.zone)!.setState("hidden")
    this.v.stepCard.setMessage(REMOVE_TEXT[id].carryText)
  }

  onReleased(id: ClampId, tip: vec3): void {
    const step = this.seq.removalStep()
    if (step === null || step.clamp !== id || this.seq.sub !== "carry") return
    const clamp = this.v.clamps.get(id)!

    if (this.v.aimedZone(tip) === step.zone) {
      // Put straight back on its own terminal: still on, still the clamp to take off.
      this.seq.cancelRemoval()
      clamp.attachAt(this.v.zonePosition(step.zone))
      this.v.note("put " + id + " back on " + step.zone)
      this.enterStep(false)
      return
    }

    // Commit first so nothing triggered below can judge this release again.
    this.seq.commitRemoval()
    this.v.note("removed " + id + " from " + step.zone)
    clamp.setGrabbable(false)
    clamp.returnToRack()
    this.v.audio.playClick()
    this.v.markers.get(step.zone)!.setState("hidden")
    if (this.seq.phase === "done") this.enterDone(step)
    else this.enterStep(true)
  }

  // ── View states

  /** Light only the clamp to take off: steady numbered ring, card, soft glow. */
  private enterStep(chimeIfOutOfView: boolean): void {
    const step = this.seq.removalStep()
    if (step === null) return
    this.v.markers.forEach((m, zone) => {
      if (zone === step.zone) return
      // Clamps still on keep their small green tick; everything else is dark.
      m.setState(this.seq.isOccupied(zone) ? "done" : "hidden")
    })
    this.v.markers.get(step.zone)!.setState("steady")
    this.v.clamps.forEach((c, id) => {
      const current = id === step.clamp
      c.setGrabbable(current)
      c.setGlow(current)
    })
    const pos = this.v.zonePosition(step.zone)
    this.v.stepCard.setMessage(REMOVE_TEXT[step.clamp].takeText)
    this.v.stepCard.setAnchor(pos)
    this.v.guidance.setFocus(pos, chimeIfOutOfView)
    this.v.note("remove step " + step.number + " (" + step.zone + ")")
  }

  private enterDone(last: StepDef): void {
    this.v.clamps.forEach((c) => { c.setGrabbable(false); c.setGlow(false) })
    this.v.markers.forEach((m) => m.setState("hidden"))
    this.v.stepCard.hideNext()
    this.v.stepCard.setMessage(DONE_TEXT)
    this.v.stepCard.setAnchor(this.v.zonePosition(last.zone))
    this.v.guidance.setFocus(null, false)
    this.v.note("all clamps back on the rack: done")
  }

  /** The terminal this clamp sits on, if it is still on. */
  private zoneOf(id: ClampId): ZoneId | null {
    const step = CONNECT_STEPS.find((st) => st.clamp === id)
    return step && this.seq.isOccupied(step.zone) ? step.zone : null
  }
}
