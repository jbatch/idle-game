# Agent Handoff — SiegeLoop

This file gives a new Claude session everything it needs to continue development without re-reading the full conversation history.

## Quick Start

```bash
pnpm dev   # http://localhost:5173
pnpm exec tsc --noEmit   # type check before committing
```

Dev server is Vite with HMR. The preview tool server ID changes each session — use `preview_start` with the `siegeloop` configuration in `.claude/launch.json`.

---

## Current Status

Layers 1–6 (content pass) are complete. The game is fully playable end-to-end across all 3 chapters with a working tech tree, quest system, and cheats inspector panel. This is the **v0.1 checkpoint** — a complete end-to-end prototype.

### Known TODOs / possible next steps
- Tech tree layout is a placeholder (branch rows + scroll). A proper spatial DAG layout would improve readability.
- No in-combat quest progress notification — quests complete silently. A HUD toast or pop-up would improve clarity.
- DC budget increase tech node would be a natural next expansion.
- TechTreeScene has no "reset progress" shortcut — currently only available via CheatPanel in ShopScene.

---

## Architecture Overview

### Scene flow
```
BootScene → ShopScene ⇄ TechTreeScene
ShopScene → GameScene → GameOverScene → ShopScene
```

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
- `UnitData` — unit config, `behaviour` + optional `params`
- `ChapterData` — wave schedule + optional `questRequirement` for unlock gating
- `TechNode` + `TechEffect` — tech tree DAG nodes and effects
- `Targetable`, `StatusEffect`, `UnitBuff`

### Currency
- **DC (Deployment Currency):** fresh each run (default: 3), spent in shop
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
- `checkStatQuests(nodes)` — parses `"unitId:stat:threshold"` quest IDs and completes them if stat threshold is met

Quest ID formats:
- Stat gate: `"footsoldier:kills:50"` — auto-completed by `checkStatQuests()`
- Event gate: `"boss_chapter1_killed"` — manually completed in GameOverScene

### Tech tree (`public/data/tech_tree.json`)
**9 branches, 21 nodes total:**
- **cursor** — Knockback (15) → Rapid Strike (25) → Heavy Strike (40, quest: boss ch1)
- **tower** — Fortify (20) → Reinforce (35) → Bastion (55, quest: boss ch2)
- **footsoldier** — Battle-Hardened (20, 50 kills) → Iron Veteran (35, 100 kills)
- **archer** — Sharpshooter (20, 30 kills) → Swift Quiver (35, 75 kills)
- **shieldbearer** — Aegis (20, 5 summons) → Iron Bulwark (35, 15 summons)
- **healer** — Blessed Hands (20, 500 healed) → Renewal (35, 1500 healed)
- **frost_mage** — Glacial Reach (20, 25 kills) → Permafrost (35, 60 kills)
- **sentinel** — Watchtower (20, 5 summons) → Overwatch (35, 15 summons)
- **bard** — Inspiring Presence (20, 5 summons) → Crescendo (35, 15 summons)

### TechTreeScene
Branch-row layout with mousewheel scrolling. `buildContent()` groups nodes by `branch` field, renders each branch as a horizontal row. Rebuilds on purchase. Layout is placeholder — user wants spatial DAG later.

### Cursor attack (`src/input/CursorAttack.ts`)
- `cooldown` — from `techState.cursorCooldown` (3.0s base, 2.0s with Rapid Strike)
- `knockback` — 0 until cursor_knockback purchased, then 280 px/s
- `damageBonus` — 0 until cursor_heavy purchased, then +10
- Debug fast mode: 0.05s

### Enemy behaviours (`src/entities/Enemy.ts`)
- `rush_tower` (default) — checks taunt redirect, then attacks adjacent units before tower
- `ranged_unit_targeter` — targets nearest unit, falls back to tower
- `healer_support` — heals lowest HP ally in range, falls back to rush_tower
- `rush_tower_aoe` — splash damage to units near tower on attack

### Unit behaviours (`src/entities/Unit.ts`)
Each unit has an optional `statCallback?: (event: 'kill' | 'heal', amount: number) => void` set by GameScene. Used to track kills and healing for quest progression.
- `melee_basic` / `melee_taunt` — chase + attack nearest enemy
- `ranged_kite` — kite at `attackRange * 0.72`
- `heal_support` — follow + heal lowest HP ally
- `aoe_slow` — AOE blast only fires when enemies are within `aoeRadius`
- `stationary_guard` — attacks enemies within `attackRange` of Tower centre
- `aura_haste` — pulses haste buff to allies within `auraRadius`

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
