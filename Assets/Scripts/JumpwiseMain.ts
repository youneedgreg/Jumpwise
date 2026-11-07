/**
 * JumpwiseMain — orchestrates the jump-start guide (connect flow, phase 1).
 *
 * Owns: the JumpSequence state, and the wiring between the clamps, the markers,
 * the step card, the "Found battery" panel, guidance (chime + edge arrow) and
 * audio. It reads like a table: event in -> sequence decision -> views updated.
 * Inputs: typed handles to every authored UI/controller component (wired by the
 * scene bootstrap), the drop-zone scale, the warning duration.
 * Must not: create UI text or UIKit components (views own that), or hold any
 * step state outside JumpSequence.
 */

import {CONNECT_STEPS, DONOR_STARTED_TEXT, JumpSequence, START_DONOR_BUTTON, START_DONOR_TEXT, StepDef, ZoneId,
  ClampId} from "./JumpwiseSteps"
import {findAimedZone, ZoneProbe} from "./JumpwiseDropZones"
import {JumpwiseClampController} from "./JumpwiseClampController"
import {JumpwiseMarkerUI} from "./JumpwiseMarkerUI"
import {JumpwiseStepCardUI} from "./JumpwiseStepCardUI"
import {JumpwiseFoundBatteryUI} from "./JumpwiseFoundBatteryUI"
import {JumpwiseGuidance} from "./JumpwiseGuidance"
import {JumpwiseAudioController} from "./JumpwiseAudioController"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"

@component
export class JumpwiseMain extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">JumpwiseMain – jump-start guide orchestrator</span>')
  @ui.separator

  @ui.group_start("References: UI")
  @input @hint("The big 'Found battery' button + owner's manual card.")
  foundBatteryUI: JumpwiseFoundBatteryUI
  @input @hint("The step card and Next button.")
  stepCard: JumpwiseStepCardUI
  @input @hint("Chime + edge arrow for targets out of view.")
  guidance: JumpwiseGuidance
  @input @hint("Chime, spark and clamp-click cues.")
  audio: JumpwiseAudioController
  @ui.group_end

  @ui.separator
  @ui.group_start("References: Clamps")
  @input @hint("Red clamp used in step 1 (dead battery +).")
  clampRedA: JumpwiseClampController
  @input @hint("Red clamp used in step 2 (donor battery +).")
  clampRedB: JumpwiseClampController
  @input @hint("Black clamp used in step 3 (donor battery -).")
  clampBlackB: JumpwiseClampController
  @input @hint("Black clamp used in step 4 (bare-metal ground point).")
  clampBlackA: JumpwiseClampController
  @ui.group_end

  @ui.separator
  @ui.group_start("References: Markers (drop zones)")
  @input @hint("Marker on the dead battery's + terminal (step 1).")
  markerDeadPlus: JumpwiseMarkerUI
  @input @hint("Marker on the dead battery's - terminal (never a step; flashes on a wrong drop).")
  markerDeadMinus: JumpwiseMarkerUI
  @input @hint("Marker on the donor battery's + terminal (step 2).")
  markerDonorPlus: JumpwiseMarkerUI
  @input @hint("Marker on the donor battery's - terminal (step 3).")
  markerDonorMinus: JumpwiseMarkerUI
  @input @hint("Marker on the bare-metal ground point on the dead car (step 4).")
  markerGround: JumpwiseMarkerUI
  @ui.group_end

  @ui.separator
  @ui.group_start("Settings")
  @input
  @widget(new SliderWidget(1, 4, 0.1))
  @hint("Drop zone size as a multiple of the visible ring (brief: twice its visible size).")
  dropZoneScale: number = 2

  @input
  @widget(new SliderWidget(1, 10, 0.5))
  @hint("Seconds the wrong-drop warning stays on the card.")
  warningSeconds: number = 4
  @ui.group_end

  private seq = new JumpSequence()
  private camera = WorldCameraFinderProvider.getInstance()
  private clamps: Map<ClampId, JumpwiseClampController> = new Map()
  private markers: Map<ZoneId, JumpwiseMarkerUI> = new Map()
  private ready = false
  private log: string[] = []

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => this.onStart())
  }

  private onStart(): void {
    if (!this.validateRefs()) return
    this.clamps.set("redA", this.clampRedA)
    this.clamps.set("redB", this.clampRedB)
    this.clamps.set("blackB", this.clampBlackB)
    this.clamps.set("blackA", this.clampBlackA)
    this.markers.set("deadPlus", this.markerDeadPlus)
    this.markers.set("deadMinus", this.markerDeadMinus)
    this.markers.set("donorPlus", this.markerDonorPlus)
    this.markers.set("donorMinus", this.markerDonorMinus)
    this.markers.set("ground", this.markerGround)

    this.foundBatteryUI.onFoundBattery.add(() => this.onFoundBattery())
    this.stepCard.onNext.add(() => this.onNext())
    this.clamps.forEach((clamp, id) => {
      clamp.onGrabbed.add(() => this.onClampGrabbed(id))
      clamp.onMoved.add((tip) => this.onClampMoved(id, tip))
      clamp.onReleased.add((tip) => this.onClampReleased(id, tip))
    })

    this.ready = true
    this.showFindBattery()
  }

  // ── Event handlers (event -> sequence decision -> views)

  private onFoundBattery(): void {
    if (!this.seq.foundBattery()) return
    this.note("found battery")
    this.foundBatteryUI.hide()
    this.enterStep(false)
  }

  private onClampGrabbed(id: ClampId): void {
    if (!this.seq.grab(id)) {
      // not the current clamp: should not happen (it is not grabbable) — put it back
      this.clamps.get(id)!.returnToRack()
      return
    }
    const step = this.seq.currentStep()!
    this.note("grabbed " + id)
    this.clamps.get(id)!.setGlow(false)
    this.markers.get(step.zone)!.setState("pulse")
    this.stepCard.setMessage(step.placeText)
  }

  private onClampMoved(id: ClampId, tip: vec3): void {
    const step = this.seq.currentStep()
    if (step === null || step.clamp !== id || this.seq.sub !== "carry") return
    const aimed = this.aimedZone(tip)
    this.markers.get(step.zone)!.setAimed(aimed === step.zone)
  }

  private onClampReleased(id: ClampId, tip: vec3): void {
    const step = this.seq.currentStep()
    // Only a clamp that is being carried can be dropped (guards against a repeated release).
    if (step === null || step.clamp !== id || this.seq.sub !== "carry") return
    const zone = this.aimedZone(tip)
    const verdict = this.seq.judgeDrop(id, zone)
    const clamp = this.clamps.get(id)!
    this.markers.get(step.zone)!.setAimed(false)

    if (verdict.kind === "correct") {
      // Commit the sequence first so nothing triggered below can judge this drop again.
      this.seq.commitCorrect()
      this.note("correct " + id + " -> " + verdict.zone)
      clamp.attachAt(this.zonePosition(verdict.zone!))
      clamp.setGrabbable(false)
      this.audio.playClick()
      this.markers.get(step.zone)!.setState("done")
      if (this.seq.phase === "startDonor") this.enterStartDonor()
      else this.enterStep(true)
      return
    }

    this.seq.returnToRack()
    clamp.returnToRack()
    clamp.setGlow(true)
    this.markers.get(step.zone)!.setState("steady")
    this.stepCard.setMessage(step.takeText)
    if (verdict.kind === "wrong") {
      this.note("wrong " + id + " -> " + verdict.zone + ": " + verdict.reason)
      this.audio.playSpark()
      this.markers.get(verdict.zone!)!.flashWrong()
      this.stepCard.showWarning(verdict.reason, this.warningSeconds)
    } else {
      this.note("dropped " + id + " away from any terminal")
    }
  }

  private onNext(): void {
    if (this.seq.phase === "startDonor" && this.seq.startDonor()) {
      this.note("donor started")
      this.stepCard.hideNext()
      this.stepCard.setMessage(DONOR_STARTED_TEXT)
    }
  }

  // ── View states

  private showFindBattery(): void {
    this.foundBatteryUI.show()
    this.markers.forEach((m) => m.setState("hidden"))
    this.clamps.forEach((c) => { c.setGrabbable(false); c.setGlow(false); c.snapToRack() })
    this.stepCard.hideNext()
    this.stepCard.setAnchor(null)
    this.guidance.setFocus(null, false)
  }

  /** Light only the current step: steady ring, card, soft glow on its clamp. */
  private enterStep(chimeIfOutOfView: boolean): void {
    const step = this.seq.currentStep()
    if (step === null) return
    this.markers.forEach((m, zone) => {
      if (zone !== step.zone && m.getState() !== "done") m.setState("hidden")
    })
    const marker = this.markers.get(step.zone)!
    marker.setState("steady")
    this.clamps.forEach((c, id) => {
      const current = id === step.clamp
      c.setGrabbable(current)
      c.setGlow(current)
    })
    const pos = this.zonePosition(step.zone)
    this.stepCard.setMessage(step.takeText)
    this.stepCard.setAnchor(pos)
    this.guidance.setFocus(pos, chimeIfOutOfView)
    this.note("step " + step.number + " (" + step.zone + ")")
  }

  private enterStartDonor(): void {
    this.clamps.forEach((c) => { c.setGrabbable(false); c.setGlow(false) })
    this.stepCard.setMessage(START_DONOR_TEXT)
    this.stepCard.showNext(START_DONOR_BUTTON)
    const last = CONNECT_STEPS[CONNECT_STEPS.length - 1]
    this.stepCard.setAnchor(this.zonePosition(last.zone))
    this.guidance.setFocus(null, false)
    this.note("all four clamps on: start donor car")
  }

  // ── Helpers

  private zonePosition(zone: ZoneId): vec3 {
    return this.markers.get(zone)!.getTransform().getWorldPosition()
  }

  private aimedZone(tip: vec3): ZoneId | null {
    const probes: ZoneProbe[] = []
    this.markers.forEach((m, id) => probes.push({id, position: m.getTransform().getWorldPosition()}))
    const radius = (this.markerDeadPlus.ringDiameterCm / 2) * this.dropZoneScale
    return findAimedZone(this.camera.getTransform().getWorldPosition(), tip, probes, radius)
  }

  private note(msg: string): void {
    this.log.push(msg)
    print("[Jumpwise] " + msg)
  }

  private validateRefs(): boolean {
    const refs: [string, unknown][] = [
      ["foundBatteryUI", this.foundBatteryUI], ["stepCard", this.stepCard], ["guidance", this.guidance],
      ["audio", this.audio], ["clampRedA", this.clampRedA], ["clampRedB", this.clampRedB],
      ["clampBlackB", this.clampBlackB], ["clampBlackA", this.clampBlackA],
      ["markerDeadPlus", this.markerDeadPlus], ["markerDeadMinus", this.markerDeadMinus],
      ["markerDonorPlus", this.markerDonorPlus], ["markerDonorMinus", this.markerDonorMinus],
      ["markerGround", this.markerGround],
    ]
    const missing = refs.filter(([, v]) => isNull(v as any)).map(([n]) => n)
    if (missing.length > 0) {
      print("[Jumpwise] ERROR: scene inputs not wired: " + missing.join(", "))
      return false
    }
    return true
  }

  // ── Read-only state for LEAF tests

  isReady(): boolean { return this.ready }
  getPhase(): string { return this.seq.phase }
  getStepIndex(): number { return this.seq.index }
  getSubState(): string { return this.seq.sub }
  getCurrentStep(): StepDef | null { return this.seq.currentStep() }
  getLog(): string[] { return this.log.slice() }
  getMarker(zone: ZoneId): JumpwiseMarkerUI { return this.markers.get(zone)! }
  getClamp(id: ClampId): JumpwiseClampController { return this.clamps.get(id)! }
  getZoneIds(): ZoneId[] { return Array.from(this.markers.keys()) }
  getClampIds(): ClampId[] { return Array.from(this.clamps.keys()) }
}
