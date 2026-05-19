# SiegeLoop TODO

Priority key:
- **P0:** Unlocks future work or fixes current feel.
- **P1:** High gameplay impact, should happen soon.
- **P2:** Good feature, wait until the core loop stabilizes.
- **P3:** Late polish/tooling/meta.

## Backlog

### First External Playtest Triage

Captured from the first real-player playtest. Keep these as the current qualitative backlog until each item is investigated, implemented, or deliberately cut.

#### Combat / Balance Investigations

| Item | Impact | Complexity | Priority | Notes |
|---|---:|---:|---:|---|
| Final boss kiting cheese | Very High | High | P0 | A single archer/healer can grab aggro and outrun the boss while cursor damage finishes it. Explore boss secondary attacks, longer-cooldown ranged attacks, phase behavior, or logic that retargets tower when remaining units are faster unless taunt is active. |
| T2 specialist pack buy tracking bug | High | Medium | P0 | Player bought multiple T2 squad packs across rounds but stats appeared stuck at 12. Check for hardcoded tracking caps or quest/stat update logic that stops incrementing. |
| Same-unit synergy dropoff check | High | Low/Medium | P0 | Verify whether synergies are removed once living unit counts fall below the threshold. If 3 archers become 2, the buff should drop unless intentionally sticky. |
| Shield breaker targeting jitter | Medium/High | Medium | P1 | Investigate funny behavior where shield breaker jiggled in place while swapping targets. Likely needs target debounce/stickiness. |
| T1 squad unlock threshold | Medium | Low | P1 | Drop T1 Squad unlock from 15 to 14 T1 Recruit purchases so players land on the unlock more naturally instead of often being one short. |
| Cursor knockback direction | Medium/High | Medium | P2 | Reconsider knockback because it can get in the way. Compare stun, weapon modes, drag-line attacks, projectile balls, and high-damage single-target options. Longer-term inspiration: Hades-style alternate weapons. |

#### Readability / Visual Identity

| Item | Impact | Complexity | Priority | Notes |
|---|---:|---:|---:|---|
| Purposeful color palette pass | High | Medium/High | P1 | Menus and text feel bland in places. Create a real palette with clear semantic roles for backgrounds, actions, warnings, rewards, locks, branches, and combat states. |
| Friendly/enemy distinction | High | Medium | P1 | Units and enemies need stronger visual separation. Consider shape language, silhouettes, outlines, or team-specific rendering conventions. |
| Future enemy identity system | High | High | P2 | Brainstorm more enemy types and design them around identifiable silhouettes, colors, motion, and tutorial hooks. Current chapters reuse too many of the same enemies. |
| Custom pointer cursor | Medium | Low/Medium | P2 | Replace the default pointer with nicer menu and combat cursors. Combat cursor should reinforce click/cooldown feel without harming precision. |

#### Flow / Menu Polish

| Item | Impact | Complexity | Priority | Notes |
|---|---:|---:|---:|---|
| Game-over CTA order | Medium | Low | P1 | Swap Back to Shop and Back to Tech Tree. Tech Tree should be the primary CTA because players usually need to spend PC after a run. |

### Dan Playtest Triage

Captured after Dan's full playtest. These are categorized by player value and implementation size so the next pass can separate quick wins from larger design milestones.

#### Readability / Visual Identity

| Item | Impact | Complexity | Priority | Notes |
|---|---:|---:|---:|---|
| Footsoldier vs Archer silhouette pass | Medium/High | Low/Medium | P1 | At distance the Footsoldier and Archer sprites are not distinct enough. Consider stronger weapon silhouettes, clearer body posture, different shield/outline accents, or a more noticeable class-colored shadow/glow. |

#### Synergies / Long-Term Progression

| Item | Impact | Complexity | Priority | Notes |
|---|---:|---:|---:|---|
| Unit synergies v2 milestone | High | High | P2 | Dedicate a milestone to deeper same-unit and mixed-unit synergies. Ideas: more synergy definitions, richer behaviour effects, formations, squad splitting where 6 Footsoldiers form two cohesive groups that spread apart from each other, and clearer UI/readability for active synergies. |
| Prestige system design | Medium/High | High | P3 | Keep as a later meta-progression candidate. Reset the game for a new loop, then spend an extra currency on permanent buffs that survive restarts. Probably only makes sense after adding more than 3 chapters or a longer campaign arc. |

### Core Combat Feel

| Item | Impact | Complexity | Priority | Notes |
|---|---:|---:|---:|---|
| Cursor knockback tuning | High | Low | P1 | First pass complete: Knockback is now a repeatable 20-80% proc instead of guaranteed control. Continue tuning before adding boss-specific resistance. |
| Unit survivability tuning | High | Medium | P1 | First pass complete: breakable crates can heal, shield, buff cursor, or add units. Continue tuning drop rates/reward weights and consider respawn/healing drops later. |
| Enemy pathing variation | Medium | Medium | P1 | Start with wobble/arc approaches, not full pathfinding. |
| Aggro/threat system | High | Medium | P1/P2 | Give enemies a stronger concept of threat so ranged units cannot free-fire forever without drawing pressure. |
| Unit collision/separation tuning | High | Medium | P1 | First pass exists. Continue tuning before multipacks/mega packs create large unit blobs. |
| Damage/heal number styling | Medium | Low | P1 | First pass exists. Continue styling/filtering as combat gets denser. |
| Lightweight flocking | High | High | P2 | Grow out of collision + idle behavior; keep forces gentle. |
| Particle/effects system | Medium | Medium | P2 | First attack/death effects exist. Add hit sparks, heal motes, frost shards, knockback dust, death bursts, boss shockwaves, tower flashes, pickup glints. |

### Unit Identity

| Item | Impact | Complexity | Priority | Notes |
|---|---:|---:|---:|---|
| Deepen distinct unit strategies | High | Medium | P1 | First pass exists. Continue deepening targeting, positioning, and idle behavior. |
| Same-unit synergy expansion | High | Medium/High | P2 | First pass exists: Archer Volley, Footsoldier Phalanx, and Shield Wall. Continue tuning and adding payoffs selectively. |
| Unit idle behavior/squads | Medium | Medium | P2 | Same-type units loosely cluster near tower with small idle drift. |
| Necromancer unit | Medium/High | Medium/High | P2/P3 | Targets dead allied units/corpses and revives them as temporary zombie or skeleton units. Requires corpse/dead-unit tracking. |

### Shop / Progression

| Item | Impact | Complexity | Priority | Notes |
|---|---:|---:|---:|---|
| Pack balance and unlock thresholds | Very High | High | P1 | Current Chapter 3 balance pass is complete. Continue watching pack variance and late support-unit upgrade pacing as new content lands. |
| Multipack/mega-pack expansion | Very High | High | P1 | Singles unlock squad packs via purchase-count quests; T2 singles unlock with Chapter 2. Per-run pack caps now prevent all-in spam; mega packs later. |
| More cursor upgrades by chapter | High | Medium | P1 | Cursor Reach/Wide Arc/Battlefield Sweep expand radius by chapter and Siegebreaker boosts boss/crate damage. Continue with stun/control or support modes later. |
| Cursor power modes | High | High | P2 | Weak knockback AOE, stun/control, heal/support pulse, strong single-target. Decide pre-run vs hot-swap vs tech branches. |
| Tower self-defense expansion | Medium/High | Medium | P2 | Retaliating Stone/Sharpened Battlements add thorns and Guard Pulse adds a battle-start shield. Later: splash, shield pulses, low-HP panic blast, and possibly regenerating shield capacity. |
| Achievement system | Medium | Medium | P2 | Track notable events: big Archer group, big AOE hit, monster kill goals, speed clears, low-HP wins, crate runs. |
| Prestige/Ascension | Medium/High | High | P3 | Late-game reset layer with higher difficulty, extra currency, and permanent unlocks. Likely only worth designing after expanding beyond the current 3-chapter prototype. |

### Tooling

| Item | Impact | Complexity | Priority | Notes |
|---|---:|---:|---:|---|
| Scenario fixture coverage | Very High | Medium | P0 | Scenario sandbox exists at `/tools/scenario.html`. Add fixtures whenever changing combat behavior or mechanics. |
| Unit editor polish | High | Medium | P2 | First pass exists at `/tools/unit-editor.html`. Continue improving animation fidelity, validation feedback, and richer preview interactions as unit visuals deepen. |
| Tech editor polish | Medium/High | Medium | P2/P3 | First pass exists at `/tools/tech-editor.html`. Continue improving graph editing affordances, bulk operations, and validation feedback. |
| Deployment packaging | Medium | Medium | P3 | Plan production builds that exclude local tools, plus a Docker/container path for running the packaged game. |

### UX / Meta Polish

| Item | Impact | Complexity | Priority | Notes |
|---|---:|---:|---:|---|
| Quest progress/toast notifications | Medium | Low | P1 | Cheap clarity win for quests and unlocks. |
| TechTree reset shortcut | Low | Low | P3 | Currently only available in ShopScene CheatPanel. |
| SFX | Medium | Medium | P3 | Clicks, hits, heals, purchases, unlocks, boss spawns, unit deaths, crate opens, win/loss. |
| Music | Medium | Medium | P3 | Shop, tech, combat, boss tracks or layers. |
| Options menu expansion | Medium | Medium | P3 | First audio sliders exist. Later: fullscreen/scaling, readability toggles, reset/export save. |
| Main menu scene | Low/Medium | Low | P3 | Add once the prototype becomes more game-like. |

## Completed Milestones

1. [DONE] **Verification + Combat Readability**
   First pass complete: scenario sandbox, attack effects, damage/heal numbers, and death fades. Continue adding fixtures and reusable combat hooks as new systems need them.

2. [DONE] **Unit Movement + Role Identity**
   First pass complete: lightweight unit separation, leashing, and role-aware targeting/positioning. Continue tuning and add deeper aggro/threat behavior.

3. [DONE] **Shop Packs v1**
   First pass complete: direct buying replaced with unopened packs. Base shop offers T1 single rolls; T1 Squad unlocks after 15 T1 singles; T2 Specialist unlocks with Chapter 2; T2 Squad unlocks after 15 T2 singles. Continue revisiting unit quest thresholds and early-run clarity.

4. [PARTIAL] **Unit Synergy + Pack Payoffs**
   First pass exists: data-driven synergies can apply cooldown, damage, parameter, and cohesion effects. Archer Volley, Footsoldier Phalanx, and Shield Wall are configured. Continue tuning and adding same-unit payoffs selectively so pack randomness feels exciting instead of punishing.

5. [DONE] **Drops / Crates / Recovery**
   First pass complete: breakable crates have HP, spawn from enemy deaths, and apply data-driven recovery/buff/reinforcement/shield rewards. Continue tuning drop rates and reward weights, then add support-unit crate behavior so players can invest in automation/passive utility.

6. [DONE] **Progression Expansion**
   First pass complete: chapter-gated cursor reach, Siegebreaker boss/crate damage, tower thorns, and battle-start tower shield tech. Continue tuning after playthroughs, then consider stun/control cursor upgrades and tower panic-blast style passives.

7. [DONE] **Editor Tooling**
   First pass complete: tech tree editor with explicit layout config, plus unit editor with create/edit/delete/reorder flows and a live dummy preview. Continue adding editor affordances as more data files become awkward to hand-edit.

8. [DONE] **Demo Polish Foundation**
   First pass complete: main menu, first-shop onboarding, scene fades, gated visible debug affordances, pack-buy and pack-opening flourishes, pause overlay, clearer combat HUD, crate/boss/run-end effects, richer run summary, and a no-op audio manager ready for future SFX/music assets. Continue with hand balance, real audio assets, and any graphics pass needed for a public demo.

9. [DONE] **v0.2.0 Progression Checkpoint**
   First pass complete: no old-chapter farming, shop draft persistence, pack caps, backtick shop cheats, first-play dialog persistence, abandon-run cashout, faster first specialist upgrade gates, and two specialist-focused +2 DC nodes. Playtest clear landed Chapter 3 around run 15, which is the current target feel.

10. [DONE] **v0.2.5 Unit Sprite Checkpoint**
   First pass complete: all player units now have tiny SVG body sprites plus separate weapon/focus sprites using the shared paper-doll renderer. Continue with enemy/boss sprites or support-unit-specific animation only after the next playtest read.

11. [DONE] **v0.2.6 Data Cache Fix**
   Hotfix complete: data JSON requests now carry a deploy cache key so prod does not reuse stale unit JSON after sprite metadata changes.

12. [DONE] **v0.2.7 Dan Playtest Quick Fixes**
   First sweep complete: onboarding tips now block background input and prevent stacked dialogs, locked tech quest gates show current progress, knockback labels say chance, and crate rewards avoid Tower Patch / Field Mending when those restores would do nothing. Simulator crate reward selection mirrors the no-op reward filter.

13. [DONE] **v0.2.8 Enemy Sprite Checkpoint**
   First pass complete: all regular enemies and bosses now have static SVG body sprites using the shared body/weapon renderer, enemy visual metadata is validated, and pack reveal/loadout tiles use SVG unit previews instead of circles when unit visual metadata exists.

14. [DONE] **v0.2.9 Loadout Polish**
   First pass complete: Archer sprite tint is now blue-on-blue, active synergy summaries no longer overflow the loadout box, full synergy text is available through a hover/tap overlay, and the Start Battle button has stable green visibility plus explicit margin below the synergies panel.

15. [DONE] **Onboarding, Chapter 3 Balance, and Tech Tree UX Pass**
   Completed follow-up pass covering first-player onboarding, Chapter 3 balance, and the major tech tree readability/layout work. These items have been removed from the active backlog so remaining priorities are easier to scan.

16. [DONE] **v0.2.10 Combo, Shields, Support Crates, and Options**
   First pass complete: tower shields can regenerate after a damage delay, healers and bards can open crates, the main/pause options overlay persists Master/Music/SFX volumes, and cursor timing combos add visible damage scaling with no-op SFX hooks. Simulator and scenario sandbox coverage mirror the new mechanics.

17. [DONE] **v0.2.11 Procedural Audio and Audio Lab**
   First pass complete: procedural Web Audio SFX/music variants now back the game audio hooks, the Audio Lab previews three options per hook and saves selected preferences to `audio_config.json`, and cursor hits plus shield absorbs now have live SFX cues.
