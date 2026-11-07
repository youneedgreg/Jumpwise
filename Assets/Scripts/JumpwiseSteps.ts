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

export const SPARK_REASON = "Not here: a spark near the battery can ignite its gases. Use bare metal."

export type Phase = "findBattery" | "connect" | "startDonor" | "donorStarted"
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

  reset(): void {
    this.phase = "findBattery"
    this.index = 0
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

  /** Only the current clamp can be grabbed (brief default). */
  canGrab(clamp: ClampId): boolean {
    const step = this.currentStep()
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
}
