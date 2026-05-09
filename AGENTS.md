# Agent Handoff — SiegeLoop

This file gives a new Claude session everything it needs to continue development without re-reading the full conversation history.

## Quick Start

```bash
pnpm dev   # http://localhost:5173 by default
pnpm exec tsc --noEmit   # type check before committing
pnpm build # production build verification
```

Dev server is Vite with HMR. If port 5173 is occupied, Vite will pick the next open port.

Local entrypoints:
- `/` — main game.
- `/tools/` — local tools hub.
- `/tools/scenario.html` — scenario sandbox. Use number keys to switch fixtures and `R` to reset.

The `.claude/` directory is local-only and ignored by git.

---

## Current Status

Layers 1–6 (content pass) are complete. The game is fully playable end-to-end across all 3 chapters with a working tech tree, quest system, cheats inspector panel, combat readability effects, and local scenario sandbox. This is the **v0.1.2 checkpoint**.

### v0.1.2 Additions
- Multi-entry Vite app structure: main game plus local-only side apps.
- Scenario sandbox at `/tools/scenario.html` with reusable combat fixtures.
- Shared Phaser game factory and shared data loader.
- Configurable unit attack effects: `melee_slash` and `quick_projectile`.
- Damage/heal float numbers and fade-out death animations.
- First pass unit role behavior: ally separation, tower leashing, archer kiting, shieldbearer guarding, healer avoidance/targeting, frost mage cluster targeting, and bard cluster following.

### Development Workflow Notes
- When adding or changing combat mechanics, enemy behavior, unit behavior, targeting, movement, effects, or balance-sensitive tuning, add or update at least one focused scenario fixture in `src/tools/scenario/scenarios.ts`.
- Use the scenario sandbox for quick visual verification before relying on a full game run.
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
| Boss knockback resistance | High | Low | P0 | Prevent cursor knockback from trivializing bosses. Small data/engine change. |
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
| Same-unit synergy groups | High | Medium/High | P2 | Example: Archers spike at 5+ grouped Archers. Makes duplicate pack rolls exciting. |
| Unit idle behavior/squads | Medium | Medium | P2 | Same-type units loosely cluster near tower with small idle drift. |
| Support units opening crates | Medium | Medium | P2 | Support/passive units beeline to crates and open them for the player. |
| Necromancer unit | Medium/High | Medium/High | P2/P3 | Targets dead allied units/corpses and revives them as temporary zombie or skeleton units. Requires corpse/dead-unit tracking. |

#### Shop / Progression
| Item | Impact | Complexity | Priority | Notes |
|---|---:|---:|---:|---|
| Unit packs replacing direct buys | Very High | High | P1 | Biggest design pivot. Changes shop, quests, availability, and balance. |
| Single/multipack/mega-pack structure | Very High | High | P1 | Each tier unlocks single pack, then 3-pack discount; lower tiers later get mega packs. |
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

3. **Shop Packs v1**
   Replace direct buying with tier packs: single pack and 3-pack for tier 1 first. Revisit unit quest thresholds and make early runs understandable.

4. **Unit Synergy + Pack Payoffs**
   Add same-unit group synergies, starting with Archers at 5+. Use this to make pack randomness feel exciting instead of punishing.

5. **Drops / Crates / Recovery**
   Add click-to-open crates or health drops. Then add support-unit crate behavior so players can invest in automation/passive utility.

6. **Progression Expansion**
   Expand cursor upgrades by chapter, add boss knockback resistance, and start tower self-defense tech. This is where the long-term tree starts feeling like a real idle game.

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
- `Targetable`, `StatusEffect`, `UnitBuff`

### Currency
- **DC (Deployment Currency):** fresh each run (default: 2), spent in shop
- **PC (Progression Currency):** earned by killing enemies, persisted via `techState.addPc()`

### Persistence (`src/systems/TechState.ts`)
Module-level singleton with localStorage backing. Keys:
- `siegeloop_pc` — total accumulated PC
- `siegeloop_tech` — JSON array of purchased node IDs
- `siegeloop_quests` — JSON array of completed quest IDs
- `siegeloop_stats` — JSON object of stat counters e.g. `{ footsoldier_kills: 47, healer_healed: 820 }`

Exported functions:
- `techState` — main singleton (pc, purchase, has, questDone, incrementStat, getStat, etc.)
- `applyUnitMods(data, nodes)` — returns a modified UnitData with purchased bonuses applied
- `applyDeploymentBudgetMods(baseBudget, nodes)` — returns the shop DC budget with purchased deployment bonuses applied
- `checkStatQuests(nodes)` — parses `"unitId:stat:threshold"` quest IDs and completes them if stat threshold is met

Quest ID formats:
- Stat gate: `"footsoldier:kills:50"` — auto-completed by `checkStatQuests()`
- Event gate: `"boss_chapter1_killed"` — manually completed in GameOverScene

### Tech tree (`public/data/tech_tree.json`)
**10 branches, 24 nodes total:**
- **cursor** — Knockback (25) → Rapid Strike (40) → Heavy Strike (65, quest: boss ch1)
- **deployment** — Deployment Drills (35) → Field Reserves (70, quest: boss ch1) → War Chest (110, quest: boss ch2)
- **tower** — Fortify (30) → Reinforce (55) → Bastion (85, quest: boss ch2)
- **footsoldier** — Battle-Hardened (30, 50 kills) → Iron Veteran (55, 100 kills)
- **archer** — Sharpshooter (30, 30 kills) → Swift Quiver (55, 75 kills)
- **shieldbearer** — Aegis (30, 5 summons) → Iron Bulwark (55, 15 summons)
- **healer** — Blessed Hands (30, 500 healed) → Renewal (55, 1500 healed)
- **frost_mage** — Glacial Reach (30, 25 kills) → Permafrost (55, 60 kills)
- **sentinel** — Watchtower (30, 5 summons) → Overwatch (55, 15 summons)
- **bard** — Inspiring Presence (30, 5 summons) → Crescendo (55, 15 summons)

### TechTreeScene
Branch-row layout with mousewheel scrolling. `buildContent()` groups nodes by `branch` field, renders each branch as a horizontal row. Rebuilds on purchase. Layout is placeholder — user wants spatial DAG later.

### Cursor attack (`src/input/CursorAttack.ts`)
- Base cursor stats are in `public/data/balance.json` under `cursor`
- Cursor tech effects are read from `public/data/tech_tree.json` by `applyCursorMods()`
- Current tuning: 1.2s cooldown, 30px radius, 8 damage base; Rapid Strike makes cooldown 0.8s and adds +2 damage; Heavy Strike adds +5 more damage
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
- Damage/heal numbers are emitted from `takeDamage()`/`heal()` on units, enemies, and tower.
- Units and enemies mark `alive = false` immediately on death, then fade graphics out before destroying them.

### Scenario sandbox
- Open `/tools/scenario.html` while the Vite dev server is running.
- Fixtures live in `src/tools/scenario/scenarios.ts`.
- Press number keys to select a fixture and `R` to reset.
- Use this tool before and after behavior/mechanic changes. If a change cannot be quickly seen in an existing fixture, add a new focused fixture.

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
