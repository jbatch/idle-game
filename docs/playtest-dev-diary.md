# Playtest Triage Dev Diary

Branch: `codex/playtest-triage-pass`

## Notes

- Started from the first external playtest TODO triage.
- User direction:
  - Leave manual tech-tree relayout on TODO for human-guided work.
  - Onboarding tips should darken the whole screen, highlight the focused area, show a modal tip, and allow players to opt out.
  - Investigation tasks should be checked in code and reported here/end-of-run; fix only obvious bugs.
  - Boss anti-kite should use boss-only ignore/retarget behavior rather than a ranged attack.
  - Palette abstraction is riskier and should be isolated as much as possible.

## Log

- Created feature branch.
- Verified same-unit synergy dropoff in code: `applyUnitSynergies()` clears effects each tick before re-applying currently qualified effects, so synergies should drop when living counts fall below threshold.
- Found T2 pack progress mismatch: buying `tier2_squad` increments `pack_tier2_squad_bought`, while several progression gates watch `pack_tier2_specialist:bought`. Fixed by also incrementing shared specialist-pack progress for T2 Squad purchases in runtime and simulator.
- Dropped T1 Squad Pack unlock requirement from 15 to 14 Tier 1 Recruit purchases.
- Swapped Game Over CTAs so spending PC in the tech tree is the primary action and returning to shop is secondary.
- Added a reusable persisted onboarding-tip system with spotlight focus, darkened background, modal copy, and a global "skip tips" opt-out. Debug reset clears onboarding state.
- Wired first-time tips into the tech tree, combat start/HUD, enemy introductions, crate introductions, and first synergy activation. Crate reward labels now linger longer for readability.
- Investigated "shield breaker" targeting jitter: no enemy by that name exists in data; the likely source was `ranged_unit_targeter` choosing nearest unit every frame. Added a short target-lock debounce for ranged targeters.
- Added boss-only anti-kite behavior: bosses with ranged-unit targeting ignore faster non-taunt units and return to tower pressure. Added a focused scenario fixture.
- Chapter 3 wall check: `pnpm sim -- --campaigns 100 --max-runs 60` completed 100/100 campaigns with Chapter 3 median clear run 13 and P90 run 15. A larger `--campaigns 300 --json` run also completed 300/300, with Chapter 3 median 13, P90 15, and average entry run 9.43. Current simulator does not reproduce a long wave-15 stall, so I did not change wave numbers blindly. This likely needs either human play confirmation after onboarding/anti-kite changes or a sim-policy improvement that captures manual target-priority/cursor mistakes better.
- Started palette abstraction with `src/ui/palette.ts` and migrated the new onboarding overlay plus pause, HUD, and game-over surfaces to named palette fields. I kept this conservative; Shop, Menu, Tech Tree, Cheat Panel, and Pack Reveal still have many hardcoded colors and should be migrated in follow-up passes instead of all at once.
- Improved tech-tree readability without changing the hand layout: branch-colored node strips/labels, locked nodes keep name/effect readable, and node hover tooltips show full descriptions plus unlock requirements instead of squeezing requirements into the card.
- Added custom menu/combat cursors, a light friendly/enemy outline distinction, and enemy identity brainstorm notes in `docs/enemy-identity-notes.md`.
- Added `pnpm sim -- --chapter-progress chapter3` report mode. The 300-campaign report matches the playtest read: Chapter 3 clear takes median 5 attempts and P90 7 attempts after entry; attempts 1-3 most commonly die at wave 15, then attempts 4+ most commonly reach wave 16/boss before finally clearing. Tech bought after the previous attempt before clearing most often includes Field Scavenging (38.8%), Sharpened Battlements (24.1%), Cursor Siegebreaker (22.3%), Footsoldier Veteran (19.6%), Cursor Reach Mastery (18.9%), and Cursor Heavy (17.9%).
