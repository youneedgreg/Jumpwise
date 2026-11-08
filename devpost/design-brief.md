---
status: approved
---

# Design brief: Jumpwise

## The one spatial moment
Standing between two cars parked nose to nose, bonnets up, working with heavy clamps. A glowing "1" on the dead battery's + terminal, nothing else lit. Clip it on; the "2" appears on the other car's battery behind, with a chime and an arrow.

## Why it belongs on glasses
- Uses: draws in the world (markers on the terminals at real size), leaves your body free (hands on the clamps, eyes on the terminals), and in the real version shares your view (it would see the battery and terminals).
- Why it's better than the phone or laptop version: hands hold heavy clamps, eyes stay on the terminals; a phone needs a hand and makes you look away.

## Who it's for
A driver who has never done it, or a stranger who stopped to help. Wrong order can spark next to the battery.

## Product or overlay
- Type: overlay
- What the real version would sense: the battery and terminals.
- Stand-in for the preview: two virtual engine bays at real size and a big "Found battery" button to pinch before the first marker appears.

## The job, in order
Connect:
1. Red clamp to + on the dead battery.
2. Red clamp to + on the donor battery. (default wording)
3. Black clamp to − on the donor battery. (default wording)
4. Black clamp to the bare-metal ground point on the dead car, not the dead battery's − terminal.

Then "Start donor car" (Next button), then "Remove clamps", which lights them in reverse, black first: 4, 3, 2, 1.

## Where things live
- Where the user is looking during the main task: at the current terminal or ground point, in the engine bay they are facing.
- Dead car's bay: in front, battery ~60 cm away, ~85 cm high, at real size.
- Donor bay: ~1.5 m behind, facing the other way (out of view on purpose), at real size.
- Step markers: numbered ring ~6 cm across, on the terminal or ground point.
- Step card: ~15 × 8 cm, beside the current marker, one short line ("Red clamp to + on the dead battery").
- Four clamps: on a rack at waist height (~90 cm, default) between the cars. Two red, two black (default).
- "Found battery" button: big, in front of the dead car's bay, at about battery height (default).
- Next button: big, beside the step card (default).
- Engine bays are plain generic models with no car brand logos or badges (default).

## Hands and input
- Take a clamp: grab it from the rack.
- Move it: drag.
- Place it: drop on a terminal or the ground point. Each drop zone is twice its visible size (default).
- "Found battery": pinch.
- Steps without a clamp ("Start the donor car"): one big Next button, pinch.
- One clamp at a time, one hand. No two-hand moves.
- Targets are big and highlight when aimed at.
- Voice: none.

## When things show
- "Found battery" button: shows at the start, disappears when pinched.
- Owner's manual line: "Some cars have remote jump points: check your owner's manual" shows on a card beside "Found battery" and leaves with it (default).
- After pinching "Found battery": a steady "1" ring sits on the dead battery's + terminal, with a card beside it saying "Take the red clamp". The red clamp glows softly on the rack, and nothing else is lit.
- After grabbing the red clamp: the "1" ring brightens and pulses as the only drop target, the clamp's glow goes away, and the card changes to "Red clamp to + on the dead battery".
- Later clamp steps: follow the same pattern, a steady ring and soft clamp glow, then a pulsing ring once the clamp is grabbed (default).
- Markers: only the next correct target glows; finished steps shrink to a small green tick.
- "Start donor car": shows only after all four clamps are on.
- After "Start donor car" is pinched: the card says "Let the donor car run a few minutes, then start the dead car", with a "Dead car started" button (added after checking the order against Edmunds' jump-start guide: the dead car is started before the cables come off).
- "Remove clamps": shows after "Dead car started" is pinched, then lights the clamps in reverse, black first. A removed clamp goes back to the rack (default).
- End: a short "Done" card after the last clamp is removed (default).
- Wrong drop: red flash, short spark sound, clamp returns to the rack, one line on why. For the dead battery's − terminal: "Not here: a spark near the battery can ignite its gases. Use bare metal." (default wording)
- A clamp dropped away from any terminal returns to the rack with no warning (default).
- Only the current clamp can be grabbed, on the way on and on the way off (default).
- If something needs attention out of view: steps 2 and 3 are on the car behind, so a chime and a small edge arrow until you turn; same when step 4 sends you back.

## Done criteria
Each one can be checked in Lens Studio's preview.
1. Pinching "Found battery" hides the button and shows a steady "1" on the dead battery's + terminal, the card "Take the red clamp" and a soft glow on the red clamp, with nothing else lit. Grabbing that clamp makes the "1" brighten and pulse as the only drop target, removes the clamp's glow and changes the card to "Red clamp to + on the dead battery".
2. Dropping a clamp on a wrong terminal shows the warning and returns the clamp to the rack.
3. After step 1, a chime plays and an arrow points to the donor car until it's in view.
4. The last black clamp only accepts the bare-metal ground point, not the dead battery's − terminal.
5. "Start donor car" appears only after four correct clamps, and removal must go black first, in reverse.

## Out of scope
- Real recognition of batteries or terminals.
- Cable physics.
- Hybrids and cars with remote jump points (one line: check the owner's manual).
- Voice.
- Two-hand moves.
- Safety guarantees: Jumpwise is a guide, not a safety device.

## Risks and open questions
- Rack position (kept despite a concern): at waist height between the cars it will probably be out of view while you look at a terminal, so you look away to find each clamp. The soft glow helps only once the rack is in view.
- Carrying a clamp to the car behind: the drag has to continue while the user turns about 180° with the mouse. Not yet tested in the preview; check this first in the basic flow.
- "Clamp in each hand" from the spatial moment can't be shown: the preview's mouse is one hand.
- Feel unproven: reaching into a real engine bay; grabbing real clamps with hand tracking.
- The jump-start order and removal order have not yet been checked against a source; check before recording.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
