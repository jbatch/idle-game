# SiegeLoop TODO

Priority key:
- **P0:** Unlocks future work or fixes current feel.
- **P1:** High gameplay impact, should happen soon.
- **P2:** Good feature, wait until the core loop stabilizes.
- **P3:** Late polish/tooling/meta.

## Backlog

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
| Pack balance and unlock thresholds | Very High | High | P1 | First pass exists: unopened packs replace direct buys. Continue balancing unlocks and quest thresholds. |
| Multipack/mega-pack expansion | Very High | High | P1 | Singles unlock squad packs via purchase-count quests; T2 singles unlock with Chapter 2. Mega packs later. |
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
