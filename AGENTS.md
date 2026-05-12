# Agent Handoff — SiegeLoop

This file gives a new Claude session everything it needs to continue development without re-reading the full conversation history.

## Quick Start

```bash
pnpm dev   # http://localhost:5173 by default
pnpm exec tsc --noEmit   # type check before committing
pnpm build # production build verification
pnpm sim -- --campaigns 100 --max-runs 60
```

Dev server is Vite with HMR. If port 5173 is occupied, Vite will pick the next open port.

Local entrypoints:
- `/` — main game.
- `/tools/` — local tools hub.
- `/tools/scenario.html` — scenario sandbox. Use number keys to switch fixtures and `R` to reset.
- `pnpm sim` — headless balance simulator CLI. Pass simulator args after `--`.

The `.claude/` directory is local-only and ignored by git.

---

## Current Status

Layers 1–6 (content pass) are complete. The game is fully playable end-to-end across all 3 chapters with a working tech tree, quest system, cheats inspector panel, combat readability effects, local scenario sandbox, first-pass unopened shop packs, same-unit synergy payoffs, cursor proc tuning, and supply pack-bonus tech. This is the **v0.1.4 checkpoint**.

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

### Development Workflow Notes
- When adding or changing combat mechanics, enemy behavior, unit behavior, targeting, movement, effects, or balance-sensitive tuning, add or update at least one focused scenario fixture in `src/tools/scenario/scenarios.ts`.
- Use the scenario sandbox for quick visual verification before relying on a full game run.
- Use `pnpm sim -- --campaigns 100 --max-runs 60` or `pnpm sim -- --trace-campaign --seed example --max-runs 60` for numeric balance checks when changing combat, waves, packs, tech, or unit stats.
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

### TODO Triage
Priority key:
- **P0:** Unlocks future work or fixes current feel.
- **P1:** High gameplay impact, should happen soon.
- **P2:** Good feature, wait until the core loop stabilizes.
- **P3:** Late polish/tooling/meta.

#### Core Combat Feel
| Item | Impact | Complexity | Priority | Notes |
|---|---:|---:|---:|---|
| Cursor knockback proc chance | High | Low | P1 | First pass complete: Knockback is now a repeatable 20–80% proc instead of guaranteed control. Continue tuning before adding boss-specific resistance. |
| Unit survivability mechanic | High | Medium | P1 | Respawn timer, healing drops, or crates. Units dying early makes builds feel flat. |
| Enemy pathing variation | Medium | Medium | P1 | Start with wobble/arc approaches, not full pathfinding. |
| Aggro/threat system | High | Medium | P1/P2 | Give enemies a stronger concept of threat so ranged units cannot free-fire forever without drawing pressure. |
| Unit collision/separation | High | Medium | P1 | First pass exists. Continue tuning before multipacks/mega packs create large unit blobs. |
| Damage/heal numbers | Medium | Low | P1 | First pass exists. Continue styling/filtering as combat gets denser. |
| Lightweight flocking | High | High | P2 | Grow out of collision + idle behavior; keep forces gentle. |
| Particle/effects system | Medium | Medium | P2 | First attack/death effects exist. Add hit sparks, heal motes, frost shards, knockback dust, death bursts, boss shockwaves, tower flashes, pickup glints. |

#### Unit Identity
| Item | Impact | Complexity | Priority | Notes |
|---|---:|---:|---:|---|
| Distinct unit strategies | High | Medium | P1 | First pass exists. Continue deepening targeting, positioning, and idle behavior. |
| Same-unit synergy groups | High | Medium/High | P2 | First pass exists: Archer Volley, Footsoldier Phalanx, and Shield Wall. Continue tuning and adding payoffs selectively. |
| Unit idle behavior/squads | Medium | Medium | P2 | Same-type units loosely cluster near tower with small idle drift. |
| Support units opening crates | Medium | Medium | P2 | Support/passive units beeline to crates and open them for the player. |
| Necromancer unit | Medium/High | Medium/High | P2/P3 | Targets dead allied units/corpses and revives them as temporary zombie or skeleton units. Requires corpse/dead-unit tracking. |

#### Shop / Progression
| Item | Impact | Complexity | Priority | Notes |
|---|---:|---:|---:|---|
| Unit packs replacing direct buys | Very High | High | P1 | First pass exists: unopened packs replace direct buys. Continue balancing unlocks and quest thresholds. |
| Single/multipack/mega-pack structure | Very High | High | P1 | First pass exists: singles unlock squad packs via purchase-count quests; T2 singles unlock with Chapter 2. Mega packs later. |
| More cursor upgrades by chapter | High | Medium | P1 | Cursor is constant, so add many small chapter-gated upgrades: range, damage, CD, knockback, stun chance. |
| Cursor power modes | High | High | P2 | Weak knockback AOE, stun/control, heal/support pulse, strong single-target. Decide pre-run vs hot-swap vs tech branches. |
| Tower self-defense tree | Medium/High | Medium | P2 | Retaliation after hits, thorns, splash, shield pulse, low-HP panic blast. |
| Achievement system | Medium | Medium | P2 | Track notable events: big Archer group, big AOE hit, monster kill goals, speed clears, low-HP wins, crate runs. |
| Prestige/Ascension | Very High | High | P3 | Late-game reset layer with higher difficulty and higher-level permanent unlocks. |

#### Tooling
| Item | Impact | Complexity | Priority | Notes |
|---|---:|---:|---:|---|
| Combat scenario sandbox | Very High | Medium | P0 | First pass exists at `/tools/scenario.html`. Add fixtures whenever changing combat behavior or mechanics. |
| Unit viewer/tuner | High | High | P2 | Edit stats/behavior dropdowns and preview against an invincible training dummy. |
| Config-driven tech tree layout | Medium | Medium | P2 | Render from explicit positions/edges instead of branch rows. |
| Tech tree layout editor | Medium/High | High | P2/P3 | Drag nodes, connect lines, save layout metadata as config. |
| Deployment packaging | Medium | Medium | P3 | Plan production builds that exclude local tools, plus a Docker/container path for running the packaged game. |

#### UX / Meta Polish
| Item | Impact | Complexity | Priority | Notes |
|---|---:|---:|---:|---|
| Quest progress/toast notifications | Medium | Low | P1 | Cheap clarity win for quests and unlocks. |
| TechTree reset shortcut | Low | Low | P3 | Currently only available in ShopScene CheatPanel. |
| SFX | Medium | Medium | P3 | Clicks, hits, heals, purchases, unlocks, boss spawns, unit deaths, crate opens, win/loss. |
| Music | Medium | Medium | P3 | Shop, tech, combat, boss tracks or layers. |
| Options menu | Medium | Medium | P3 | Audio volume, fullscreen/scaling, readability toggles, reset/export save. |
| Main menu scene | Low/Medium | Low | P3 | Add once the prototype becomes more game-like. |

### Suggested Milestones
1. [DONE] **Verification + Combat Readability**
   First pass complete: scenario sandbox, attack effects, damage/heal numbers, and death fades. Continue adding fixtures and reusable combat hooks as new systems need them.

2. [DONE] **Unit Movement + Role Identity**
   First pass complete: lightweight unit separation, leashing, and role-aware targeting/positioning. Continue tuning and add deeper aggro/threat behavior.

3. [DONE] **Shop Packs v1**
   First pass complete: direct buying replaced with unopened packs. Base shop offers T1 single rolls; T1 Squad unlocks after 15 T1 singles; T2 Specialist unlocks with Chapter 2; T2 Squad unlocks after 15 T2 singles. Continue revisiting unit quest thresholds and early-run clarity.

4. **Unit Synergy + Pack Payoffs**
   First pass exists: data-driven synergies can apply cooldown, damage, parameter, and cohesion effects. Archer Volley, Footsoldier Phalanx, and Shield Wall are configured. Continue tuning and adding same-unit payoffs selectively so pack randomness feels exciting instead of punishing.

5. **Drops / Crates / Recovery**
   Add click-to-open crates or health drops. Then add support-unit crate behavior so players can invest in automation/passive utility.

6. **Progression Expansion**
   Continue cursor upgrades by chapter, revisit boss knockback resistance if proc tuning is not enough, and start tower self-defense tech. This is where the long-term tree starts feeling like a real idle game.

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
- `UnitData` — unit config, `behaviour`, optional `params`, optional `effects`
- `ChapterData` — wave schedule + optional `questRequirement` for unlock gating
- `TechNode` + `TechEffect` — tech tree DAG nodes and effects
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
- `checkStatQuests(nodes)` — parses `"unitId:stat:threshold"` quest IDs and completes them if stat threshold is met

Quest ID formats:
- Stat gate: `"footsoldier:kills:50"` — auto-completed by `checkStatQuests()`
- Event gate: `"boss_chapter1_killed"` — manually completed in GameOverScene

Repeatable tech uses `repeatable: { maxLevel, costIncrease }` on a `TechNode`. Effects apply once per purchased level. Legacy one-time purchases without an explicit level still read as level 1 via `techState.level()`.

### Tech tree (`public/data/tech_tree.json`)
**11 branches, 28 nodes total:**
- **cursor** — Cursor Focus ×4 (10/18/26/34) → Knockback ×4 (25/40/55/70, +20% proc chance per level) → Rapid Strike (40) → Heavy Strike (65, quest: boss ch1)
- **deployment** — Deployment Drills (35) → Field Reserves (70, quest: boss ch1) → War Chest (110, quest: boss ch2)
- **supply** — Field Scavenging ×3 (90/165/240, +12% T1 pack bonus-unit chance per level, requires Chapter 2 + 15 T1 Recruit buys) → Specialist Salvage ×3 (180/330/480, +9% T2 pack bonus-unit chance per level, requires Chapter 3 + 15 T2 Specialist buys)
- **tower** — Fortify (30) → Reinforce (55) → Bastion (85, quest: boss ch2)
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
- **Tier 2 Squad Pack** — 6 DC, 4 rolls, requires `boss_chapter1_killed` and `pack_tier2_specialist:bought:15`: same T2 roll table.

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

### TechTreeScene
Branch-row layout with mousewheel scrolling. `buildContent()` groups nodes by `branch` field, renders each branch as a horizontal row. Rebuilds on purchase. Layout is placeholder — user wants spatial DAG later.

### Cursor attack (`src/input/CursorAttack.ts`)
- Base cursor stats are in `public/data/balance.json` under `cursor`
- Cursor tech effects are read from `public/data/tech_tree.json` by `applyCursorMods()`
- Current tuning: 1.2s cooldown, 30px radius, 8 damage base; Knockback is a 280-force proc with repeatable 20% chance levels; Rapid Strike makes cooldown 0.8s and adds +2 damage; Heavy Strike adds +5 more damage
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
