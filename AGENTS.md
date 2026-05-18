# Agent Handoff — SiegeLoop

This file gives a new Claude session everything it needs to continue development without re-reading the full conversation history.

## Quick Start

```bash
pnpm dev   # http://localhost:5173 by default
pnpm exec tsc --noEmit   # type check before committing
pnpm validate:data # JSON content/schema consistency checks
pnpm build # production build verification
pnpm sim -- --campaigns 100 --max-runs 60
```

Dev server is Vite with HMR. If port 5173 is occupied, Vite will pick the next open port.

Local entrypoints:
- `/` — main game.
- `/tools/` — local tools hub.
- `/tools/scenario.html` — scenario sandbox. Use number keys to switch fixtures and `R` to reset.
- `/tools/tech-editor.html` — tech tree definition/layout editor.
- `/tools/unit-editor.html` — unit data editor with a live dummy preview.
- `pnpm sim` — headless balance simulator CLI. Pass simulator args after `--`.

The `.claude/` directory is local-only and ignored by git.

---

## Current Status

Layers 1–8 (recovery + progression pass) plus the first editor-tooling, v0.2.0 progression-polish pass, v0.2.1 tech-tree layout pass, v0.2.2 playtest-onboarding pass, v0.2.3 mobile-polish pass, v0.2.4 radial tech-tree layout pass, v0.2.5 unit-sprite pass, v0.2.6 data-cache fix, v0.2.7 Dan playtest quick-fix pass, and v0.2.8 enemy-sprite pass are complete. The game is fully playable end-to-end across all 3 chapters with a working tech tree, quest system, cheats inspector panel, combat readability effects, local scenario sandbox, capped unopened shop packs, same-unit synergy payoffs, cursor proc tuning, supply pack-bonus tech, breakable battlefield crates, cursor/tower/Influence progression expansion, first-time onboarding spotlights, scalable canvas/mobile shims, local GUI editors for tech tree and unit data, a programmatic radial tech-tree layout prototype, static SVG paper-doll sprites for every player unit and enemy/boss, versioned JSON data requests, first Dan playtest UX fixes, and SVG loadout previews. This is the **v0.2.8 checkpoint**.

### v0.1.2 Additions
- Multi-entry Vite app structure: main game plus local-only side apps.
- Scenario sandbox at `/tools/scenario.html` with reusable combat fixtures.
- Shared Phaser game factory and shared data loader.
- Configurable unit attack effects: `melee_slash` and `quick_projectile`.
- Damage/heal float numbers and fade-out death animations.
- First pass unit role behavior: ally separation, tower leashing, archer kiting, shieldbearer guarding, healer avoidance/targeting, frost mage cluster targeting, and bard cluster following.

### v0.1.3 Additions
- Direct unit buys have been replaced by unopened shop packs.
- Tier 1 Recruit Pack costs 1 DC and rolls Footsoldier 45%, Archer 45%, Shieldbearer 10%.
- Pack unlocks now use quest/stat requirements: T1 Squad requires 15 T1 Recruit purchases; T2 Specialist unlocks with Chapter 2; T2 Squad requires 15 T2 Specialist purchases.
- Packs are rolled at battle start so the shop does not reveal exact units before combat.
- First same-unit synergy system exists with stat, parameter, and cohesion behaviour effects. Archer Volley, Footsoldier Phalanx, and Shield Wall are configured.
- Low-power repeatable tech levels now exist for early catch-up: Cursor Focus, Footsoldier Boot Camp, and Archer Fletching.
- Shop and tech tree labels now use bounded fitting/wrapping to keep longer data-driven text inside cards and nodes.

### v0.1.4 Additions
- Cursor knockback is now repeatable proc chance tech instead of guaranteed control, scaling from 20% to 80%.
- Cursor ready text has been removed from combat; cursor hits now show a damage impact effect, with a stronger ripple when knockback procs.
- Repeatable tech nodes now show purchased level and current owned total, e.g. `LV 1/4` plus `(current: 20% knockback)`.
- First supply tech nodes exist for battle-start pack rewards: Field Scavenging and Specialist Salvage add Tier 1 / Tier 2 bonus-unit chances when packs are opened.
- Pack reveal rows now highlight bonus units separately from regular pack rolls.

### v0.1.5 Additions
- Breakable battlefield crates now spawn from enemy deaths and have HP, so early crates can require multiple cursor clicks.
- Crate content is data-driven in `public/data/crates.json`, with reward hooks for tower repair, all-unit healing, temporary cursor damage/cooldown buffs, free random unit rolls, tower shields, and squad shields.
- New crate tech branch exists: Cache Scavenging increases drop chance, Cache Prospecting unlocks reinforced crates/cursor quickening/free rolls, and Shielded Caches unlocks aegis crates plus shield rewards.
- Tower and units now support shield absorb pools with blue visual rings/bars.
- Scenario sandbox includes a focused crate fixture, the in-combat debug menu can spawn test crates, and the headless simulator now spawns/auto-clicks crates and applies crate rewards.

### v0.1.6 Additions
- First progression-expansion slice is complete: cursor reach, boss/crate cursor damage, tower thorns, and battle-start tower shield tech now exist.
- New cursor tech nodes: Cursor Reach, Wide Arc, Battlefield Sweep, and Siegebreaker.
- New tower self-defense nodes: Retaliating Stone, Guard Pulse, and Sharpened Battlements.
- Cursor damage is now target-aware for boss and crate multipliers through the shared `Targetable` contract.
- Tower thorns trigger from enemy tower hits and show a short return-strike effect; tower starting shields use the existing blue shield visuals.
- Scenario sandbox includes focused fixtures for Siegebreaker, Retaliating Stone, and Guard Pulse.
- Headless simulator mirrors the new cursor/tower effects and campaign purchase scoring now values tower shield/thorns.

### v0.1.7 Additions
- Local Unit Editor exists at `/tools/unit-editor.html` for creating, duplicating, deleting, reordering, and tuning unit JSON.
- Unit Editor includes structured stat fields, behaviour/effect selectors, params/effects JSON editors, color editing, and a live dummy preview.
- Units now load through `public/data/unit_manifest.json`, so game, scenario sandbox, shop labels, and cheat stats all share the same unit list.
- Data validation now covers unit files, unit manifest consistency, filename/id matching, stat ranges, behaviours, attack effects, params, tags, and colors.
- Tech tree editor/config refactor exists at `/tools/tech-editor.html`, saving `public/data/tech_tree.json` and `public/data/tech_tree_layout.json`.
- Runtime TechTreeScene now reads explicit layout/edge metadata from `tech_tree_layout.json` while preserving the branch-row fallback.

### v0.2.0 Additions
- Start menu now distinguishes fresh saves from existing progress with Start Run / Continue Run behavior.
- First-shop briefing dismissal persists across refreshes and debug reset clears it with other progress.
- Shop cheat inspector opens with backtick in debug mode; achievement gates can be individually or bulk unlocked for testing.
- Shop pack cards now hide exact roll percentages, use rarity labels, and cap purchases at 4 singles or 2 squad packs per type.
- Shop draft pack selections persist when visiting the tech tree and returning.
- Cleared chapters are marked and skipped automatically; wins advance the active chapter to the next uncleared chapter to avoid old-level farming.
- Ending a run from pause now banks earned PC and shows a Run Abandoned result instead of silently returning to shop.
- Tier 2 first upgrades unlock after summoning each specialist once; two extra +2 DC specialist deployment nodes support the Chapter 2/3 power ramp.
- Game over crate rewards summarize counts by reward type, and the campaign simulator mirrors pack caps and no-farming progression.

### v0.2.1 Additions
- Tech tree layout has been reorganized for clearer branch readability.
- Opening the tech tree now starts centered within the scrollable graph bounds instead of at the top-left.

### v0.2.2 Additions
- First external playtest notes are captured in `TODO.md`, with a running dev diary in `docs/playtest-dev-diary.md`.
- First-time onboarding spotlights exist for the first shop flow, combat basics, HUD, enemy introductions, crate introductions, synergy discovery, and the first tech tree visit. Players can skip tips globally.
- Fresh players are guided to buy two Tier 1 Recruit Packs before starting their first run, and the shop Tech Tree button stays disabled until after the first recorded run.
- First tech-tree tip now highlights the value of +DC upgrades, and tech nodes have branch-colored strips plus hover tooltips for full descriptions and lock requirements.
- T1 Squad Pack unlock now requires 14 Tier 1 Recruit buys, and T2 Squad purchases also advance shared T2 Specialist buy progress.
- Game Over now makes the Tech Tree the primary CTA.
- Bosses with unit-targeting behavior ignore faster non-taunt units and return to tower pressure, reducing final boss kiting cheese.
- Ranged targeters keep a short target lock to reduce rapid target-swapping jitter.
- The simulator now supports `--chapter-progress chapter3` to report per-attempt wave progression and pre-clear tech patterns.
- A conservative UI palette foundation, custom cursors, friendly/enemy outline distinction, and enemy identity notes have been added.

### v0.2.3 Additions
- Phaser now scales the fixed 900×900 game canvas to fit smaller client windows, preserving the existing square logical world.
- First mobile touch shims exist: coarse-pointer detection, tap-fading cursor attack radius, top-right mobile cooldown HUD, pack/tech tap inspection, and tap-to-dismiss tech detail overlays.
- Tech tree supports mouse-wheel zoom and pinch-to-zoom, with panning adjusted for zoom level.
- Tech nodes now show larger scan-friendly labels with short generated effect text, while detailed descriptions live in the tooltip/detail overlay.
- Player-facing currency names changed from PC/DC to data-driven `Gems` and `Influence` labels/icons in `balance.json`.

### v0.2.4 Additions
- Runtime TechTreeScene now has a programmatic radial layout mode for the tech graph, with entry nodes radiating from a central hub and dependency depth pushing later nodes outward.
- Tech dependency lines can render center-to-center in radial mode, replacing manually anchored side/elbow routing for the runtime prototype.
- The radial layout keeps branch categories clustered by angle, alternates entry-node radii for a less uniform inner ring, and applies a small collision-relax pass to keep compact nodes from overlapping.
- The existing `tech_tree_layout.json` and tech tree editor remain intact as the authored-layout fallback path.

### v0.2.5 Additions
- Player units now render with tiny SVG paper-doll sprites instead of placeholder filled circles.
- Each unit has a separate weapon/focus SVG that aims toward the current target and shows cooldown charge/release through simple transform/tint animation.
- T1 units use sword, bow, and shield sprites; T2 units use staff, frost orb, crossbow, and lute sprites.
- Units without visual metadata still fall back to the previous circle renderer, keeping the visual system safe for incremental content.
- Unit visual metadata is validated by `pnpm validate:data`, and the main menu version label now reads `v0.2.5 unit sprites - For Dan <3`.

### v0.2.6 Additions
- Game data JSON loads now include a deploy cache version query, preventing prod from mixing new hashed JS with stale `/data/units/*.json`.
- Main menu version label now reads `v0.2.6 unit sprites - For Dan <3`.

### v0.2.7 Additions
- Onboarding tips now block background input and prevent stacked tutorial dialogs.
- Locked tech quest gates now show current stat progress in node status and tooltip copy.
- Knockback tech labels now say knockback chance instead of implying strength.
- Crate rewards avoid no-op Tower Patch, Field Mending, and squad shield rolls when they would do nothing; the simulator mirrors this reward filter.
- Main menu version label now reads `v0.2.7 playtest quick fixes - For Dan <3`.

### v0.2.8 Additions
- Enemy and boss data now include visual metadata and render through the shared SVG body/weapon renderer.
- New SVG body sprites exist for all regular enemies and all 3 chapter bosses.
- Pack reveal/loadout tiles now show the opened unit's SVG body/weapon preview instead of a colored circle when visual metadata exists.
- Data validation now checks enemy visual metadata against the known texture set.
- Game data cache version now reads `0.2.8` so changed enemy/unit JSON does not mix with stale deployed data.
- Main menu version label now reads `v0.2.8 enemy sprites - For Dan <3`.

### Development Workflow Notes
- When adding or changing combat mechanics, enemy behavior, unit behavior, targeting, movement, effects, or balance-sensitive tuning, add or update at least one focused scenario fixture in `src/tools/scenario/scenarios.ts`.
- Use the scenario sandbox for quick visual verification before relying on a full game run.
- Use `pnpm sim -- --campaigns 100 --max-runs 60` or `pnpm sim -- --trace-campaign --seed example --max-runs 60` for numeric balance checks when changing combat, waves, packs, tech, or unit stats.
- Use `/tools/unit-editor.html` for unit data changes and `/tools/tech-editor.html` for tech definition/layout changes.
- Run `pnpm validate:data` after changing files in `public/data/`.
- Keep scenario fixtures small and diagnostic: one behavior question per fixture is better than a large chaotic showcase.
- Run `pnpm exec tsc --noEmit` before committing code changes. Run `pnpm build` when touching app entrypoints, Vite config, shared boot/loading code, or anything used by both the game and tools.

### Git Commit Message Style
- Prefer descriptive messages over vague checkpoint messages.
- Use a short imperative subject when the change is focused, e.g. `Add scenario sandbox`, `Tune unit role movement`, `Ignore local Claude config`.
- For checkpoint commits, include the version and scope in the subject, then add a body with concise bullets for what changed and how it was verified.
- Good checkpoint shape:

```text
Checkpoint v0.1.2: tools and combat readability

- Split the app into main game and local tool entrypoints.
- Added scenario sandbox fixtures for combat verification.
- Added damage numbers, attack effects, death fades, and unit role steering.

Verification:
- pnpm exec tsc --noEmit
- pnpm build
```

### TODO / Roadmap
The active backlog and completed milestone notes now live in `TODO.md`. Keep `AGENTS.md` focused on handoff/current architecture context; update `TODO.md` when adding, completing, or reprioritizing future work.

---

## Architecture Overview

### Scene flow
```
BootScene → ShopScene ⇄ TechTreeScene
ShopScene → GameScene → GameOverScene → ShopScene
```

### App entrypoints
```
index.html → src/apps/game/main.ts
tools/index.html → local tools hub
tools/scenario.html → src/apps/scenario/main.ts
tools/tech-editor.html → src/apps/tech-editor/main.ts
tools/unit-editor.html → src/apps/unit-editor/main.ts
```

Shared app helpers:
- `src/game/createPhaserGame.ts` — common Phaser game config.
- `src/game/loadGameData.ts` — shared JSON manifest/loader used by game and tools.

### Key design decisions (settled — don't re-litigate)
- **No unit cap** — let it get chaotic, monitor performance
- **No unit persistence between runs** — fresh shop each run, only PC carries over
- **Units persist within a run** across all waves until they die
- **3 chapters** for the prototype (all now exist)
- **Circle arena**, 900×900 canvas, arena radius 380px, centre at (450, 450)
- **pnpm** as package manager (not npm)

### Data-driven design
All game content lives in `public/data/`. The engine reads these at startup via BootScene.

Key interfaces in `src/data/types.ts`:
- `EnemyData` — enemy config, optional `behaviour` + `params`
- `UnitData` + `UnitBehaviour` — unit config, behaviour, optional `params`, optional `effects`
- `UnitManifestData` — ordered list of unit IDs loaded from `public/data/unit_manifest.json`
- `ChapterData` — wave schedule + optional `questRequirement` for unlock gating
- `TechNode` + `TechEffect` — tech tree DAG nodes and effects
- `TechTreeLayoutData` — explicit node positions and edge routing for the runtime tech tree
- `ShopPackData` + `ShopPackRoll` — unopened shop pack definitions and weighted unit roll tables
- `UnitSynergyData` — same-unit synergy threshold and buff definitions
- `Targetable`, `StatusEffect`, `UnitBuff`

### Currency
- **DC (Deployment Currency):** fresh each run (default: 2), spent on unopened shop packs
- **PC (Progression Currency):** earned by killing enemies, persisted via `techState.addPc()`

### Persistence (`src/systems/TechState.ts`)
Module-level singleton with localStorage backing. Keys:
- `siegeloop_pc` — total accumulated PC
- `siegeloop_tech` — JSON array of purchased node IDs
- `siegeloop_tech_levels` — JSON object of repeatable tech levels, e.g. `{ cursor_focus: 3 }`
- `siegeloop_quests` — JSON array of completed quest IDs
- `siegeloop_stats` — JSON object of stat counters e.g. `{ footsoldier_kills: 47, healer_healed: 820 }`

Exported functions:
- `techState` — main singleton (pc, purchase, has, questDone, incrementStat, getStat, etc.)
- `techState.level(nodeId)` / `techState.currentCost(node)` / `techState.isMaxed(node)` — repeatable tech helpers
- `applyUnitMods(data, nodes)` — returns a modified UnitData with purchased bonuses applied
- `applyDeploymentBudgetMods(baseBudget, nodes)` — returns the shop DC budget with purchased deployment bonuses applied
- `applyPackBonusMods(nodes)` — returns purchased battle-start pack bonus-unit chances/counts
- `applyTowerBattleMods(baseHp, nodes)` — returns tower max HP, battle-start shield, and thorns damage for combat setup
- `checkStatQuests(nodes)` — parses `"unitId:stat:threshold"` quest IDs and completes them if stat threshold is met

Quest ID formats:
- Stat gate: `"footsoldier:kills:50"` — auto-completed by `checkStatQuests()`
- Event gate: `"boss_chapter1_killed"` — manually completed in GameOverScene

Repeatable tech uses `repeatable: { maxLevel, costIncrease }` on a `TechNode`. Effects apply once per purchased level. Legacy one-time purchases without an explicit level still read as level 1 via `techState.level()`.

### Tech tree (`public/data/tech_tree.json`)
**12 branches, 38 nodes total:**
- **cursor** — Cursor Focus ×4 (10/18/26/34) → Knockback ×4 (25/40/55/70, +20% proc chance per level) → Rapid Strike (40) → Heavy Strike (65, quest: boss ch1) → Siegebreaker (95, +40% boss/crate cursor damage); Cursor Reach (18) → Wide Arc (55, quest: boss ch1) → Battlefield Sweep (100, quest: boss ch2)
- **deployment** — Deployment Drills (35) → Field Reserves (70, quest: boss ch1) → War Chest (110, quest: boss ch2)
- **supply** — Field Scavenging ×3 (90/165/240, +12% T1 pack bonus-unit chance per level, requires Chapter 2 + 15 T1 Recruit buys) → Specialist Salvage ×3 (180/330/480, +9% T2 pack bonus-unit chance per level, requires Chapter 3 + 15 T2 Specialist buys)
- **crates** — Cache Scavenging → Cache Prospecting → Shielded Caches
- **tower** — Fortify (30) → Reinforce (55) → Bastion (85, quest: boss ch2); Retaliating Stone (45, +3 thorns) → Sharpened Battlements (90, +4 thorns, quest: boss ch1); Guard Pulse (70, +90 battle-start shield, quest: boss ch1)
- **footsoldier** — Boot Camp ×3 (12/20/28) → Battle-Hardened (30, 50 kills) → Iron Veteran (55, 100 kills)
- **archer** — Fletching ×3 (12/20/28) → Sharpshooter (30, 30 kills) → Swift Quiver (55, 75 kills)
- **shieldbearer** — Aegis (30, 5 summons) → Iron Bulwark (55, 15 summons)
- **healer** — Blessed Hands (30, 500 healed) → Renewal (55, 1500 healed)
- **frost_mage** — Glacial Reach (30, 25 kills) → Permafrost (55, 60 kills)
- **sentinel** — Watchtower (30, 5 summons) → Overwatch (55, 15 summons)
- **bard** — Inspiring Presence (30, 5 summons) → Crescendo (55, 15 summons)

### Shop packs
`public/data/shop_packs.json` defines unopened pack costs, roll counts, unlock tech requirements, and weighted roll tables. `ShopScene` only tracks unopened pack purchases. `GameScene` rolls those packs at battle start and then spawns the resulting flat unit loadout.

Current packs:
- **Tier 1 Recruit Pack** — 1 DC, 1 roll: Footsoldier 45%, Archer 45%, Shieldbearer 10%.
- **Tier 1 Squad Pack** — 3 DC, 4 rolls, requires `pack_tier1_recruit:bought:15`: same T1 roll table.
- **Tier 2 Specialist Pack** — 2 DC, 1 roll, requires `boss_chapter1_killed`: Healer, Frost Mage, Sentinel, Bard at equal weights.
- **Tier 2 Squad Pack** — 6 DC, 4 rolls, requires `boss_chapter1_killed` and `pack_tier2_specialist:bought:12`: same T2 roll table.

Pack purchase stats are recorded when the player starts a run with unopened packs selected, using keys like `pack_tier1_recruit_bought`. Supply tech can add bonus rolls at battle start; bonus units are highlighted in the pack reveal before combat begins.

### Unit synergies
`public/data/unit_synergies.json` defines same-unit thresholds and effects. `src/systems/UnitSynergies.ts` counts living units by ID and applies matching effects each combat tick. `GameScene` and the scenario sandbox both run this pass.

Supported synergy effect types:
- `cooldown_mult` — multiplies attack cooldown, stacking multiplicatively with Bard haste.
- `attack_damage_bonus` — adds to unit attack damage while active.
- `param_bonus` — adds to runtime behaviour params such as `tauntRadius` or `guardRadius`.
- `cohesion` — pulls same-type units toward their living group centre so they hold a tighter formation.

Current synergies:
- **Archer Volley** — 3+ living Archers gain 20% faster attacks and cohesion.
- **Footsoldier Phalanx** — 3+ living Footsoldiers gain +3 attack damage and cohesion.
- **Shield Wall** — 2+ living Shieldbearers gain wider guard/taunt radii and cohesion.

Bard haste and cooldown synergies stack multiplicatively in `Unit.effectiveCooldown()`.

### Battlefield crates
`public/data/crates.json` defines the crate layer:
- `baseDropChance` and `maxActive` control baseline frequency.
- `crates[]` defines crate HP, radius, spawn weight, optional `requiresTechId`, and crate-specific reward tables.
- `rewards[]` defines data-driven reward hooks. Current supported types are `tower_heal`, `heal_all_units`, `random_unit`, `cursor_damage_buff`, `cursor_cooldown_buff`, `shield_all_units`, and `shield_tower`.

Crates spawn from enemy deaths in `GameScene` and are damaged by cursor clicks through the shared `Targetable` contract. Crate reward unlocks are gated by tech IDs in the crate data. Tower and units have a simple shield absorb pool, shown as a blue ring/bar.

The simulator mirrors the same crate data. Its cursor bot targets crates when no healer/support enemy is available, applies crate rewards, and reports `cratesOpened` plus `crateRewards` in run results.

### TechTreeScene and editor
Runtime TechTreeScene reads `public/data/tech_tree_layout.json` for explicit node positions and routed dependency edges. It still groups/labels nodes by `branch` and has fallback branch-row placement when layout metadata is missing. The local editor at `/tools/tech-editor.html` edits both `tech_tree.json` and `tech_tree_layout.json`.

### Unit Editor
Open `/tools/unit-editor.html` while the Vite dev server is running. It loads `public/data/unit_manifest.json` plus every JSON file in `public/data/units/`, then saves unit files and the manifest through the Vite dev-server middleware. Use it for unit creation, duplication, deletion, reorder, stat tuning, behaviour/effect selection, params/effects JSON editing, color tuning, and a small dummy-tower preview.

### Cursor attack (`src/input/CursorAttack.ts`)
- Base cursor stats are in `public/data/balance.json` under `cursor`
- Cursor tech effects are read from `public/data/tech_tree.json` by `applyCursorMods()`
- Current tuning: 1.2s cooldown, 30px radius, 8 damage base; Knockback is a 280-force proc with repeatable 20% chance levels; Rapid Strike makes cooldown 0.8s and adds +2 damage; Heavy Strike adds +5 more damage; Cursor Reach/Wide Arc/Battlefield Sweep increase radius by +22 total; Siegebreaker adds +40% cursor damage to bosses and crates
- Debug fast mode: 0.05s

### Enemy behaviours (`src/entities/Enemy.ts`)
- `rush_tower` (default) — checks taunt redirect, then attacks adjacent units before tower
- `ranged_unit_targeter` — targets nearest unit, falls back to tower
- `healer_support` — heals lowest HP ally in range, falls back to rush_tower
- `rush_tower_aoe` — splash damage to units near tower on attack

### Unit behaviours (`src/entities/Unit.ts`)
Each unit has an optional `statCallback?: (event: 'kill' | 'heal', amount: number) => void` set by GameScene. Used to track kills and healing for quest progression.
- All moving units apply gentle ally separation before clamping to the arena.
- `melee_basic` — intercepts enemies using a score biased toward threats closer to the Tower, then returns to a tower band when idle.
- `melee_taunt` — guard/tank behavior with configurable `guardRadius`, `leashRadius`, and passive taunt redirect.
- `ranged_kite` — prefers enemies engaged by melee allies, retreats from nearby threats, and respects a tower leash.
- `heal_support` — avoids nearby enemies, prioritizes urgent wounded allies/frontliners, and drifts toward allied clusters when idle.
- `aoe_slow` — targets the densest enemy cluster and applies AOE damage/slow around the chosen target.
- `stationary_guard` — attacks enemies within `attackRange` of Tower centre
- `aura_haste` — moves toward allied clusters and pulses haste buff to allies within `auraRadius`

### Combat effects (`src/effects/CombatEffects.ts`)
- Unit configs can set `effects.attack` to a named preset.
- Current attack presets: `melee_slash`, `quick_projectile`.
- Cursor attacks use `playCursorImpactEffect()`, with a stronger ripple when knockback procs.
- Damage/heal numbers are emitted from `takeDamage()`/`heal()` on units, enemies, and tower.
- Units and enemies mark `alive = false` immediately on death, then fade graphics out before destroying them.

### Scenario sandbox
- Open `/tools/scenario.html` while the Vite dev server is running.
- Fixtures live in `src/tools/scenario/scenarios.ts`.
- Press number keys to select a fixture and `R` to reset.
- Use this tool before and after behavior/mechanic changes. If a change cannot be quickly seen in an existing fixture, add a new focused fixture.

### Balance simulator
- CLI: `pnpm sim -- --campaigns 100 --max-runs 60`.
- Trace one campaign: `pnpm sim -- --trace-campaign --seed example --max-runs 60`.
- JSON output: `pnpm sim -- --campaigns 200 --max-runs 100 --json`.
- CLI wrapper lives in `tools/balance-sim.mjs`; implementation modules live under `tools/sim/`. `game-sim.mjs` runs fixed-step combat without Phaser rendering, `campaign-sim.mjs` simulates fresh-save campaign state and progression decisions, `campaign-report.mjs` runs/aggregates campaign trials, and `data.mjs` loads JSON data from `public/data`.
- Output includes chapter clear rates, median and p90 clear runs, average chapter entry run, common tech at chapter clear, and incomplete-campaign last-attempt distribution.

### Chapter unlock system
`ChapterData.questRequirement` gates access. `ShopScene` shows all 3 chapters; locked ones show as "???" and are not interactive. Chapter 2 requires `boss_chapter1_killed`, Chapter 3 requires `boss_chapter2_killed`. Both are completed in `GameOverScene` via `techState.completeQuest('boss_chapterN_killed')`.

### Chapter content
- **chapter1** — "The First Siege", 1.0× mult, 76s, all 6 regular enemy types + Stone Warden boss
- **chapter2** — "The Iron March", 1.6× mult, 73s, heavier composition + Iron Colossus boss (AOE)
- **chapter3** — "Eternal Darkness", 2.5× mult, 60s, maximum density + Void Sovereign boss (unit-hunter)

### Debug system
- `src/debug/DebugState.ts` — `fastCursor`, `godMode`, `chapter` (default: `'chapter1'`)
- Backtick to open the debug menu in-game
- `techState.reset()` clears all localStorage (no UI button yet)
