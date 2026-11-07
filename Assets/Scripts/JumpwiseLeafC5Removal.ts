/**
 * LEAF scenario — done criterion 5, removal half (test code).
 *
 * 5: "...and removal must go black first, in reverse."
 * Checks, after a full connect and "Start donor car":
 * - "Remove clamps" shows only after "Start donor car" was pinched, and nothing
 *   can be grabbed before it is pinched;
 * - the clamps light one at a time in reverse, black first: 4 (ground), 3 (donor -),
 *   2 (donor +), 1 (dead +); only that clamp glows, is grabbable and has a lit ring;
 * - a wrong-order grab is refused: every other clamp still on a terminal (and one
 *   already back on the rack) is tried with a pinch-and-pull, and none moves or
 *   changes the step;
 * - each removed clamp goes back to the rack;
 * - the chime plays and the edge arrow shows when the next clamp is on the other car;
 * - a short "Done" card after the last clamp, with nothing lit or grabbable.
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {ClampId, DONE_TEXT, REMOVE_TEXT, ZoneId} from "./JumpwiseSteps"
import {JumpwiseMain} from "./JumpwiseMain"
import {JumpwiseLeafInteractor} from "./JumpwiseLeafInteractor"
import {CLAMP_OBJECT, clampInteractable, connectAndStartDonor, frames, getMain, glowingClamps, grabbableClamps,
  holdHead, litZones, lookAt, note, pressButton, zonePos} from "./JumpwiseLeafHelpers"

const REMOVAL_ORDER: [ClampId, ZoneId][] = [
  ["blackA", "ground"],
  ["blackB", "donorMinus"],
  ["redB", "donorPlus"],
  ["redA", "deadPlus"],
]

function atHome(main: JumpwiseMain, clamp: ClampId): boolean {
  const c = main.getClamp(clamp)
  return c.getTransform().getWorldPosition().distance(c.getHomePosition()) < 0.5
}

/** Pinch-and-pull a clamp that must NOT be grabbable now; assert nothing changed. */
async function expectGrabRefused(ix: JumpwiseLeafInteractor, main: JumpwiseMain, clamp: ClampId,
  stepIndex: number): Promise<void> {
  const target = findInteractableByName(CLAMP_OBJECT[clamp], undefined, false)
  if (!target) throw new Error(`${CLAMP_OBJECT[clamp]} has no Interactable`)
  const c = main.getClamp(clamp)
  const before = c.getTransform().getWorldPosition()
  const logBefore = main.getLog().length
  const pullTo = c.getHomePosition().add(new vec3(0, 30, 0))
  const r = await ix.tryGrab(target, () => c.getTipPosition(), pullTo)
  await frames(3)
  const moved = c.getTransform().getWorldPosition().distance(before)
  expect(moved).toBeLessThan(0.5)
  expect(c.isHeld()).toBe(false)
  expect(main.getRemoveIndex()).toBe(stepIndex)
  expect(main.getSubState()).toBe("take")
  // Nothing new happened in the guide during the attempt (no "lifted ..." / "removed ...").
  expect(main.getLog().slice(logBefore).join(" | ")).toBe("")
  note(`C5 removal: wrong-order grab of ${clamp} refused (hover ${r.hovered}, trigger ${r.triggered}, moved ${moved.toFixed(2)} cm)`)
}

@component
export class JumpwiseLeafC5Removal extends Scenario {
  async run(): Promise<void> {
    const main = await getMain()
    const ix = new JumpwiseLeafInteractor()
    holdHead()
    await frames(3)

    await connectAndStartDonor(ix, main)

    // "Remove clamps" shows after "Start donor car" was pinched; nothing is grabbable yet.
    expect(main.stepCard.isNextShown()).toBe(true)
    expect(main.stepCard.getNextLabel()).toBe("Remove clamps")
    expect(grabbableClamps().length).toBe(0)
    expect(glowingClamps(main).length).toBe(0)
    await expectGrabRefused(ix, main, "redA", 0) // first on, but nothing comes off before "Remove clamps"
    expect(main.getPhase()).toBe("deadStarted")
    note("C5 removal: \"Remove clamps\" shown after \"Dead car started\"; no clamp grabbable yet")

    lookAt(main.stepCard.getTransform().getWorldPosition())
    await frames(3)
    await pressButton(ix, "NextButton")
    await frames(5)
    expect(main.getPhase()).toBe("remove")
    expect(main.stepCard.isNextShown()).toBe(false)

    const removed: ClampId[] = []
    for (let i = 0; i < REMOVAL_ORDER.length; i++) {
      const [clamp, zone] = REMOVAL_ORDER[i]
      const step = main.getRemovalStep()!
      expect(main.getRemoveIndex()).toBe(i)
      expect(step.clamp).toBe(clamp)
      expect(step.zone).toBe(zone)
      expect(step.number).toBe(4 - i)
      // Only this clamp is lit, glowing and grabbable; only its ring is lit (steady).
      expect(grabbableClamps().join(",")).toBe(clamp)
      expect(glowingClamps(main).join(",")).toBe(clamp)
      expect(litZones(main).join(",")).toBe(zone)
      expect(main.getMarker(zone).getState()).toBe("steady")
      expect(main.stepCard.getMessage()).toBe(REMOVE_TEXT[clamp].takeText)
      note(`C5 removal step ${step.number}: ${clamp} on ${zone} is the only clamp lit`)

      // Wrong-order grabs are refused: every other clamp still on, and one already back on the rack.
      for (const [other] of REMOVAL_ORDER.slice(i + 1)) await expectGrabRefused(ix, main, other, i)
      if (removed.length > 0) await expectGrabRefused(ix, main, removed[removed.length - 1], i)

      // Take the current clamp off and carry it toward its spot on the rack.
      lookAt(zonePos(main, zone))
      await frames(3)
      const c = main.getClamp(clamp)
      const tipOffset = c.getTipPosition().sub(c.getTransform().getWorldPosition())
      const target = clampInteractable(clamp)
      const chimes = main.audio.getCounts().chime
      await ix.grab(target)
      await frames(2)
      expect(main.getSubState()).toBe("carry")
      expect(c.isGlowing()).toBe(false)
      expect(main.stepCard.getMessage()).toBe(REMOVE_TEXT[clamp].carryText)
      await ix.carryTipTo(() => c.getTipPosition(), c.getHomePosition().add(tipOffset))
      await ix.release(target)
      await sleep(700)

      expect(main.getRemoveIndex()).toBe(i + 1)
      expect(atHome(main, clamp)).toBe(true)
      expect(c.isGrabbable()).toBe(false)
      expect(main.getMarker(zone).getState()).toBe("hidden")
      removed.push(clamp)
      note(`C5 removal: ${clamp} off ${zone} and back on the rack`)

      // Steps 3 and 1 are on the other car: chime once and show the arrow (still facing the last car).
      if (i === 0 || i === 2) {
        expect(main.audio.getCounts().chime).toBe(chimes + 1)
        expect(main.guidance.isArrowShown()).toBe(true)
        note(`C5 removal: chime + arrow toward ${REMOVAL_ORDER[i + 1][1]}`)
      }
    }

    // A short "Done" card; nothing lit, glowing or grabbable; all clamps on the rack.
    await frames(5)
    expect(main.getPhase()).toBe("done")
    expect(main.stepCard.getMessage()).toBe(DONE_TEXT)
    expect(main.stepCard.isShown()).toBe(true)
    expect(main.stepCard.isNextShown()).toBe(false)
    expect(grabbableClamps().length).toBe(0)
    expect(glowingClamps(main).length).toBe(0)
    expect(litZones(main).length).toBe(0)
    expect(main.guidance.isArrowShown()).toBe(false)
    for (const [clamp] of REMOVAL_ORDER) expect(atHome(main, clamp)).toBe(true)
    note("C5 removal: order was " + removed.join(", ") + "; \"Done\" card shown")
  }
}
