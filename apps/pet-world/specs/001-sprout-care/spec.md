# Feature Specification: Sprout Care

**Feature directory**: `apps/pet-world/specs/001-sprout-care`
**Created**: 2026-11-13
**Source**: GitHub issue #1, "First issue"
**Workspace integration**: [root specification](../../../../specs/004-pet-world-application/spec.md)

## User Outcome

As a visitor, I want to care for a responsive 3D creature so that it feels alive and reacts to my actions.
A visitor watches Sprout in a small 3D habitat, feeds it, and plays with it.

## User Scenarios

1. **Watch Sprout (P1).** On load, Sprout stands in a lit habitat with a ground plane.
   Sprout breathes, blinks, and moves its ears while idle.
2. **Feed Sprout (P1).** Activating Feed raises Fullness by 20, announces the result, and starts a one-second eating reaction.
3. **Play with Sprout (P1).** Activating Play raises Happiness by 15, lowers Fullness by 10, announces the result, and starts a one-second hop.
4. **Reduced motion (P2).** With a reduced-motion preference, Sprout stays still. Actions, indicators, reaction status, and announcements still work.
5. **Graphics failure (P2).** Without WebGL, or after context loss, the visitor sees why the habitat is missing, can retry, and can still feed and play.

## Functional Requirements

- **FR-001** Render Sprout in a responsive 3D habitat with lighting and a ground plane.
- **FR-002** Build Sprout procedurally with a round mint-green body, cream belly, two leaf ears, two eyes, and two small feet.
- **FR-003** While idle, animate gentle breathing, periodic blinking, and ear movement.
- **FR-004** Show labelled Fullness and Happiness indicators. Both start at 60 out of 100.
- **FR-005** Feed increases Fullness by 20 and triggers a one-second eating reaction.
- **FR-006** Play increases Happiness by 15, reduces Fullness by 10, and triggers a one-second hop.
- **FR-007** Clamp both values between 0 and 100 after every action.
- **FR-008** A new action replaces the current reaction. Reactions never overlap or queue.
- **FR-009** Both actions are native buttons, operable with Tab, Enter, and Space. One polite live region announces each result.
- **FR-010** A reduced-motion preference disables idle and reaction movement. Actions, indicator updates, reaction status text, and announcements remain.
- **FR-011** When graphics cannot initialise or the context is lost, show an alert explaining that the habitat could not load, with a Try again action.
- **FR-012** Cleanup stops animation, cancels reaction timers, disconnects observers, removes listeners, and releases geometries, materials, and the renderer. Repeated cleanup is safe.
- **FR-013** Keep pet state, character construction, animation, scene lifecycle, and controls in separate modules.

## Success Criteria

- **SC-001** Unit tests cover state transitions, both boundaries, animation transitions, reaction replacement, reduced motion, and cleanup.
- **SC-002** Chromium tests with software WebGL cover rendering, keyboard actions and announcements, mobile and desktop layout, reduced motion, graphics failure, and context recovery.
- **SC-003** `npm run check` passes across the complete workspace.
- **SC-004** Desktop and mobile screenshots accompany the verification report.

## Assumptions

- State lives in memory only. Refreshing the page starts a new session at 60 and 60.
- Values do not decay over time. Only Feed and Play change them.
- Announcements describe each changed value, and say "stays at" when a value is already at its boundary.
- Reaction status text ("Sprout is eating", "Sprout is hopping", "Sprout is relaxing") is visible feedback, not a second live region.
- Under reduced motion the reaction still lasts one second in the status text, but Sprout does not move. Reduced motion is read once on mount.
- Graphics failure leaves care actions usable, because pet state does not depend on rendering.
- Page departure releases the application. A restored page from the back-forward cache mounts a fresh session.
- No external models, textures, fonts, or services are loaded.

## Exclusions

Accounts, backend services, persistence, multiplayer, inventories, currencies, AI conversations, and deployment.
Shared libraries remain deferred until reuse justifies them.
Software WebGL verification does not establish compatibility with every physical GPU or browser.
