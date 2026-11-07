/**
 * JumpwiseSteps — the jump-start step sequence (pure logic, no scene access).
 *
 * Owns: the ordered connect steps from devpost/design-brief.md, which clamp and
 * which drop zone each step uses, the card wording, the wrong-drop reasons, and
 * the sequence state (phase, step index, take/carry sub-state).
 *
 * Phase 2 (removal) is meant to be a reverse traversal of the SAME CONNECT_STEPS
 * table, so removal can be cut later without touching the connect flow.
 *
 * Must not: touch SceneObjects, play audio, or know about UI.
 */

export type ZoneId = "deadPlus" | "deadMinus" | "donorPlus" | "donorMinus" | "ground"
export type ClampId = "redA" | "redB" | "blackB" | "blackA"
export type ClampColor = "red" | "black"

export const ALL_ZONES: ZoneId[] = ["deadPlus", "deadMinus", "donorPlus", "donorMinus", "ground"]
export const ALL_CLAMPS: ClampId[] = ["redA", "redB", "blackB", "blackA"]

export interface StepDef {
  number: number
  clamp: ClampId
  color: ClampColor
  zone: ZoneId
  /** Card text while the clamp is still on the rack. */
  takeText: string
  /** Card text once the clamp is grabbed. */
  placeText: string
}

// Wording follows the brief. ASCII "-" is used for the minus sign so the
// default font is guaranteed to have the glyph.
export const CONNECT_STEPS: StepDef[] = [
  {
    number: 1, clamp: "redA", color: "red", zone: "deadPlus",
    takeText: "Take the red clamp",
    placeText: "Red clamp to + on the dead battery",
  },
  {
    number: 2, clamp: "redB", color: "red", zone: "donorPlus",
    takeText: "Take the other red clamp",
    placeText: "Red clamp to + on the donor battery",
  },
  {
    number: 3, clamp: "blackB", color: "black", zone: "donorMinus",
    takeText: "Take a black clamp",
    placeText: "Black clamp to - on the donor battery",
  },
  {
    number: 4, clamp: "blackA", color: "black", zone: "ground",
    takeText: "Take the last black clamp",
    placeText: "Black clamp to bare metal on the dead car, not the - terminal",
  },
]

export const START_DONOR_TEXT = "Start the donor car"
export const START_DONOR_BUTTON = "Start donor car"
export const DONOR_STARTED_TEXT = "Donor car started"
/** After the donor car runs: start the dead car before any clamp comes off (Edmunds jump-start order). */
export const START_DEAD_TEXT = "Let the donor car run a few minutes, then start the dead car"
export const START_DEAD_BUTTON = "Dead car started"
export const DEAD_STARTED_TEXT = "Dead car started"

// ── Phase 2 (removal): the same CONNECT_STEPS walked backwards, black first.
// Cut removal by deleting this block, the removal methods at the end of
// JumpSequence, JumpwiseRemoval.ts and the routing lines marked "removal" in Main.

export const REMOVE_BUTTON = "Remove clamps"
export const DONE_TEXT = "Done"

/** Card text per clamp while removing: take = clamp still on, carry = clamp lifted. */
export const REMOVE_TEXT: Record<ClampId, {takeText: string; carryText: string}> = {
  blackA: {takeText: "Take the black clamp off bare metal", carryText: "Let go: it goes back to the rack"},
  blackB: {takeText: "Take the black clamp off - on the donor battery", carryText: "Let go: it goes back to the rack"},
  redB: {takeText: "Take the red clamp off + on the donor battery", carryText: "Let go: it goes back to the rack"},
  redA: {takeText: "Take the red clamp off + on the dead battery", carryText: "Let go: it goes back to the rack"},
}

/** Removal order: CONNECT_STEPS reversed (4, 3, 2, 1). */
export function removalStepAt(i: number): StepDef | null {
  const n = CONNECT_STEPS.length
  return i >= 0 && i < n ? CONNECT_STEPS[n - 1 - i] : null
}

export const SPARK_REASON = "Not here: a spark near the battery can ignite its gases. Use bare metal."

export type Phase = "findBattery" | "connect" | "startDonor" | "donorStarted" | "deadStarted" | "remove" | "done"
export type SubState = "take" | "carry"

export interface DropVerdict {
  kind: "correct" | "wrong" | "none"
  zone: ZoneId | null
  reason: string
}

function isPlus(zone: ZoneId): boolean {
  return zone === "deadPlus" || zone === "donorPlus"
}
function isMinus(zone: ZoneId): boolean {
  return zone === "deadMinus" || zone === "donorMinus"
}

/** One line on why a drop is wrong. Pure function of the step and the zone. */
export function wrongReason(step: StepDef, zone: ZoneId, occupied: boolean): string {
  if (zone === "deadMinus" && step.color === "black") return SPARK_REASON
  if (step.color === "red" && isMinus(zone)) return "Not here: red goes on +, never on -."
  if (step.color === "black" && isPlus(zone)) return "Not here: black never goes on +."
  if (occupied) return "Not here: that one already has a clamp."
  if (step.color === "red" && zone === "ground") return "Not here: red goes on a + terminal, not bare metal."
  if (step.color === "black" && zone === "ground") return "Not yet: this black clamp goes to - on the donor battery."
  return "Not here: " + step.placeText + "."
}

export class JumpSequence {
  phase: Phase = "findBattery"
  index: number = 0
  sub: SubState = "take"
  /** Zones that currently hold a clamp. */
  private occupied: Set<ZoneId> = new Set<ZoneId>()

  /** Removal progress: 0..4, how many clamps are off (phase 2). */
  removeIndex: number = 0

  reset(): void {
    this.phase = "findBattery"
    this.index = 0
    this.removeIndex = 0
    this.sub = "take"
    this.occupied.clear()
  }

  /** "Found battery" pinched. Returns false if it was not the right moment. */
  foundBattery(): boolean {
    if (this.phase !== "findBattery") return false
    this.phase = "connect"
    this.index = 0
    this.sub = "take"
    return true
  }

  currentStep(): StepDef | null {
    if (this.phase !== "connect") return null
    return CONNECT_STEPS[this.index] ?? null
  }

  /** Only the current clamp can be grabbed, on the way on and on the way off (brief default). */
  canGrab(clamp: ClampId): boolean {
    const step = this.phase === "remove" ? this.removalStep() : this.currentStep()
    return step !== null && step.clamp === clamp && this.sub === "take"
  }

  grab(clamp: ClampId): boolean {
    if (!this.canGrab(clamp)) return false
    this.sub = "carry"
    return true
  }

  /** Decide what a release means. Does not mutate state. */
  judgeDrop(clamp: ClampId, zone: ZoneId | null): DropVerdict {
    const step = this.currentStep()
    if (step === null || step.clamp !== clamp || zone === null) {
      return {kind: "none", zone: null, reason: ""}
    }
    if (zone === step.zone && !this.occupied.has(zone)) {
      return {kind: "correct", zone, reason: ""}
    }
    return {kind: "wrong", zone, reason: wrongReason(step, zone, this.occupied.has(zone))}
  }

  /** Clamp went back to the rack (wrong drop or dropped in empty space). */
  returnToRack(): void {
    if (this.phase === "connect") this.sub = "take"
  }

  /** Commit a correct drop and advance. Returns the step that was completed. */
  commitCorrect(): StepDef | null {
    const step = this.currentStep()
    if (step === null) return null
    this.occupied.add(step.zone)
    this.index++
    this.sub = "take"
    if (this.index >= CONNECT_STEPS.length) {
      this.phase = "startDonor"
    }
    return step
  }

  isOccupied(zone: ZoneId): boolean {
    return this.occupied.has(zone)
  }

  /** "Start donor car" pinched. Only valid after all four clamps are on. */
  startDonor(): boolean {
    if (this.phase !== "startDonor") return false
    this.phase = "donorStarted"
    return true
  }

  /** "Dead car started" pinched. Only valid after the donor car was started. */
  startDead(): boolean {
    if (this.phase !== "donorStarted") return false
    this.phase = "deadStarted"
    return true
  }

  // ── Phase 2 (removal): reverse traversal of CONNECT_STEPS, same state.

  /** "Remove clamps" pinched. Only valid after the dead car was started. */
  startRemoval(): boolean {
    if (this.phase !== "deadStarted") return false
    this.phase = "remove"
    this.removeIndex = 0
    this.sub = "take"
    return true
  }

  /** The step whose clamp comes off next (4, then 3, 2, 1), or null. */
  removalStep(): StepDef | null {
    if (this.phase !== "remove") return null
    return removalStepAt(this.removeIndex)
  }

  /** The lifted clamp was put straight back on its own terminal: not removed. */
  cancelRemoval(): void {
    if (this.phase === "remove") this.sub = "take"
  }

  /** The lifted clamp went back to the rack. Returns the step that was undone. */
  commitRemoval(): StepDef | null {
    const step = this.removalStep()
    if (step === null || this.sub !== "carry") return null
    this.occupied.delete(step.zone)
    this.removeIndex++
    this.sub = "take"
    if (this.removeIndex >= CONNECT_STEPS.length) this.phase = "done"
    return step
  }
}
