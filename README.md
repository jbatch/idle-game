# SiegeLoop

Browser-based incremental roguelike with tower-defense mechanics. Defend a central Tower against waves of enemies using a cursor AOE attack and a squad of autonomous units purchased before each run. Between runs, spend Progression Currency on a persistent tech tree.

## Stack

- **Phaser** — game engine
- **Vite** — dev server with hot reload
- **TypeScript**
- **pnpm** — package manager
- **JSON data files** — all game content (units, enemies, chapters, tech) is external data

## Running

```bash
pnpm install
pnpm dev        # http://localhost:5173 by default
pnpm exec tsc --noEmit   # type check
pnpm build      # production build verification
```

Vite may pick the next open port if `5173` is already in use.

Local app entrypoints:

| URL | Purpose |
|---|---|
| `/` | Main SiegeLoop game |
| `/tools/` | Local-only tools hub |
| `/tools/scenario.html` | Scenario sandbox for combat and behavior verification |

## Game Flow

```
Boot → Shop ⇄ Tech Tree
Shop → Combat → Game Over → Shop
```

- **Shop:** Spend Deployment Currency (DC, budget: 2 by default) to pick units for this run. Switch chapters from the chapter selector. Open [TECH TREE] or [CHEATS].
- **Combat:** Defend the Tower through timed waves; cursor AOE attack + deployed units fight autonomously.
- **Win (boss kill):** Chapter Complete — earn PC, unlock next chapter.
- **Lose:** Tower HP reaches 0 — return to shop.
- Only **Progression Currency (PC)** carries over between runs.

## Chapters

| Chapter | Name | Difficulty | Status |
|---|---|---|---|
| Chapter 1 | The First Siege | 1.0× | Always unlocked |
| Chapter 2 | The Iron March | 1.6× | Unlocked by killing Ch1 boss |
| Chapter 3 | Eternal Darkness | 2.5× | Unlocked by killing Ch2 boss |

## Units

| Unit | Cost | Behaviour |
|---|---|---|
| Footsoldier | 1 DC | Intercepts enemies threatening the Tower and melees them |
| Archer | 1 DC | Ranged kite — prefers engaged targets and retreats from nearby threats |
| Shieldbearer | 2 DC | Guard/tank — stays leashed near Tower and redirects enemies within taunt radius |
| Healer | 2 DC | Avoids enemies and prioritizes urgent wounded allies, especially frontliners |
| Frost Mage | 2 DC | Cluster-targeted AOE blast — damage + 45% slow for 2.5s |
| Sentinel | 2 DC | Stationary; high damage to enemies near Tower |
| Bard | 2 DC | Moves toward allied clusters; doubles nearby allies' attack speed |

Units use lightweight steering for role behavior, tower leashing, and ally separation. Several unit attacks also have configurable visual effects in unit JSON via `effects.attack`.

## Enemies

| Enemy | Behaviour |
|---|---|
| Grunt | Rush tower |
| Runner | Rush tower (fast) |
| Brute | Rush tower (slow, high damage) |
| Archer Enemy | Targets player units preferentially |
| Shaman | Heals lowest-HP enemy ally |
| Siege Golem | Rush tower + AOE splash on units near tower |
| Stone Warden | Ch1 boss — rush tower |
| Iron Colossus | Ch2 boss — AOE splash on tower attacks |
| Void Sovereign | Ch3 boss — ranged, hunts player units |

## Tech Tree

10 branches, 24 nodes. Spend PC to unlock permanent upgrades that persist across runs.

| Branch | Upgrades |
|---|---|
| Cursor | Knockback → Rapid Strike → Heavy Strike |
| Deployment | Deployment Drills → Field Reserves → War Chest |
| Tower | Fortify → Reinforce → Bastion |
| Per unit (×7) | 2 nodes each, gated by stat quests |

### Quest System

Tech nodes can be gated by quests:
- **Stat quests** (`"unitId:stat:threshold"`) — auto-complete when the stat threshold is reached (e.g. 50 footsoldier kills)
- **Event quests** (`"boss_chapter1_killed"`) — complete on chapter boss kill

## Debug

Press **\`** (backtick) in combat to open the in-game debug panel:
- **Fast Cursor** — near-instant cooldown
- **God Mode** — Tower takes no damage

Open **[CHEATS]** in the shop for the inspector panel:
- **QUESTS tab** — view all quest IDs with completion status and progress
- **TECH tab** — view all 24 tech nodes and owned status
- **STATS tab** — view per-unit kill/heal/summon counters
- **+100 PC** — inject currency
- **RESET ALL PROGRESS** — wipe localStorage and restart

## Local Tools

Local-only side apps live under `tools/` and reuse game data from `public/data/`.

### Scenario Sandbox

Open `/tools/scenario.html` while `pnpm dev` is running.

- Press `1-5` to switch scenario fixtures.
- Press `R` to reset the current scenario.
- Use this before and after behavior, targeting, combat readability, and balance changes.
- Add focused fixtures in `src/tools/scenario/scenarios.ts` when introducing a new unit behavior, enemy behavior, effect, or combat mechanic.

## File Structure

```
src/
  constants.ts          — GAME_W, GAME_H, CX, CY, ARENA_RADIUS
  main.ts               — compatibility import for the main game app
  apps/
    game/main.ts        — main game app entrypoint
    scenario/main.ts    — scenario sandbox app entrypoint
  data/
    types.ts            — TypeScript interfaces for all data schemas
  debug/
    DebugState.ts       — fastCursor, godMode, chapter selection
  effects/
    CombatEffects.ts    — damage/heal numbers and small attack effect presets
  entities/
    Tower.ts            — Tower entity (HP, god mode)
    Enemy.ts            — Enemy entity (behaviours, slow, knockback)
    Unit.ts             — Unit entity (behaviours, steering, haste buff, heal, stat tracking)
  game/
    createPhaserGame.ts — shared Phaser game factory
    loadGameData.ts     — shared JSON data manifest/loader
  input/
    CursorAttack.ts     — Mouse AOE attack (cooldown, knockback, damage)
  scenes/
    BootScene.ts        — Loads all JSON assets
    ShopScene.ts        — Pre-run shop (DC budget, unit cards, chapter selector)
    GameScene.ts        — Main combat (waves, units, enemies, HUD)
    GameOverScene.ts    — End-of-run summary, PC persistence, quest completion
    TechTreeScene.ts    — Branch-row tech tree with purchase flow
  systems/
    TechState.ts        — localStorage singleton (PC, purchased nodes, quests, stats)
    WaveManager.ts      — Time-based spawn schedule from ChapterData
  ui/
    CheatPanel.ts       — Modal inspector panel (quests/tech/stats + cheats)
    DebugMenu.ts        — In-combat debug slide-in panel
  tools/
    scenario/           — Scenario sandbox boot scene, scene, and fixtures

public/data/
  balance.json          — dcBudget, towerHp, pcMultiplier
  tech_tree.json        — 24 nodes across 10 branches
  chapters/             — chapter1.json, chapter2.json, chapter3.json
  enemies/              — 6 regular enemy types + 3 boss types
  units/                — footsoldier, archer, shieldbearer, healer, frost_mage, sentinel, bard

tools/
  index.html            — local tools hub
  scenario.html         — scenario sandbox HTML entrypoint
```
