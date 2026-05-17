# SiegeLoop TODO

Priority key:
- **P0:** Unlocks future work or fixes current feel.
- **P1:** High gameplay impact, should happen soon.
- **P2:** Good feature, wait until the core loop stabilizes.
- **P3:** Late polish/tooling/meta.

## Backlog

### First External Playtest Triage

Captured from the first real-player playtest. Keep these as the current qualitative backlog until each item is investigated, implemented, or deliberately cut.

#### Onboarding / Teaching

| Item | Impact | Complexity | Priority | Notes |
|---|---:|---:|---:|---|
| First-run tutorial battle | Very High | High | P0 | First run should teach cursor attacks, click targeting, cooldown-circle meaning, and where to read key UI information. It can end in a scripted death to the first boss. |
| First tech-tree onboarding | High | Medium | P0 | The first time the tech tree is shown, explain what the player is looking at, how unlocks work, and what they should do next. |
| First enemy-introduction pause | High | Medium/High | P1 | When a new enemy appears for the first time, pause, highlight it, and explain its role. Design this so future enemy types can also be introduced from pre-combat or combat. |
| First synergy discovery callout | Medium/High | Medium | P1 | The first time rolled units activate a synergy, pause/highlight the synergy description area so players learn where to look. |
| Tutorial crate introduction | High | Medium | P1 | Tutorial should introduce field crates, explain reward types, and point players to where active effects appear. Check short-lived rewards like Field Mending so they remain readable. |

#### Tech Tree UX

| Item | Impact | Complexity | Priority | Notes |
|---|---:|---:|---:|---|
| Tech tree color grouping | High | Medium | P1 | Add a visual grouping/color system for related branches such as cursor, tower, deployment, supply, crates, and units. |
| Manual tech-tree relayout pass | High | Medium | P1 | Layout is still messy and does not guide the player to look around. Do a deliberate hand layout pass after deciding color/group language. |
| Locked tech presentation | High | Medium | P1 | Locked tech should be greyed out while still showing name and effect. Move requirements into a lock hover/focus overlay instead of tiny squeezed text. |
| Tech description truncation | Medium | Low/Medium | P1 | Several descriptions, e.g. Cache Prospecting, truncate with ellipses. Make full text visible or show truncated text on hover/focus. |

#### Combat / Balance Investigations

| Item | Impact | Complexity | Priority | Notes |
|---|---:|---:|---:|---|
| Chapter 3 wave 15 difficulty wall | Very High | High | P0 | Validate with simulations before tuning. Goal: introduce a smaller wall earlier in Chapter 3, then keep wave 15 hard but reduce how long players are stuck there. Needs a planned balance pass, not random number churn. |
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
| Support units opening crates | Medium | Medium | P2 | Support/passive units should beeline to crates and open them for the player. Sim currently auto-clicks crates when no healer enemy target exists. |
| Necromancer unit | Medium/High | Medium/High | P2/P3 | Targets dead allied units/corpses and revives them as temporary zombie or skeleton units. Requires corpse/dead-unit tracking. |

### Shop / Progression

| Item | Impact | Complexity | Priority | Notes |
|---|---:|---:|---:|---|
| Pack balance and unlock thresholds | Very High | High | P1 | v0.2.0 pass feels good through a first Chapter 3 clear around run 15. Continue watching Chapter 3 specialist variance and late support-unit upgrade pacing. |
| Multipack/mega-pack expansion | Very High | High | P1 | Singles unlock squad packs via purchase-count quests; T2 singles unlock with Chapter 2. Per-run pack caps now prevent all-in spam; mega packs later. |
| More cursor upgrades by chapter | High | Medium | P1 | Cursor Reach/Wide Arc/Battlefield Sweep expand radius by chapter and Siegebreaker boosts boss/crate damage. Continue with stun/control or support modes later. |
| Cursor power modes | High | High | P2 | Weak knockback AOE, stun/control, heal/support pulse, strong single-target. Decide pre-run vs hot-swap vs tech branches. |
| Tower self-defense expansion | Medium/High | Medium | P2 | Retaliating Stone/Sharpened Battlements add thorns and Guard Pulse adds a battle-start shield. Later: splash, shield pulses, low-HP panic blast. |
| Achievement system | Medium | Medium | P2 | Track notable events: big Archer group, big AOE hit, monster kill goals, speed clears, low-HP wins, crate runs. |
| Prestige/Ascension | Very High | High | P3 | Late-game reset layer with higher difficulty and higher-level permanent unlocks. |

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
| Options menu | Medium | Medium | P3 | Audio volume, fullscreen/scaling, readability toggles, reset/export save. |
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
