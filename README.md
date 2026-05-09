# SiegeLoop

Browser-based incremental roguelike with tower-defense mechanics. Defend a central Tower against waves of enemies using a cursor AOE attack and a squad of autonomous units purchased before each run. Between runs, spend Progression Currency on a persistent tech tree.

## Stack

- **Phaser 3** — game engine
- **Vite** — dev server with hot reload
- **TypeScript**
- **pnpm** — package manager
- **JSON data files** — all game content (units, enemies, chapters, tech) is external data

## Running

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm exec tsc --noEmit   # type check
```

## Game Flow

```
Boot → Shop ⇄ Tech Tree
Shop → Combat → Game Over → Shop
```

- **Shop:** Spend Deployment Currency (DC, budget: 3 by default) to pick units for this run. Switch chapters from the chapter selector. Open [TECH TREE] or [CHEATS].
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
| Footsoldier | 1 DC | Chases + melees nearest enemy |
| Archer | 1 DC | Ranged kite — keeps preferred distance |
| Shieldbearer | 2 DC | Aggressive melee; enemies within taunt radius redirect to it |
| Healer | 2 DC | Follows lowest-HP ally, heals them |
| Frost Mage | 2 DC | AOE blast — damage + 45% slow for 2.5s |
| Sentinel | 2 DC | Stationary; high damage to enemies near Tower |
| Bard | 2 DC | Stationary aura; doubles nearby allies' attack speed |

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

9 branches, 21 nodes. Spend PC to unlock permanent upgrades that persist across runs.

| Branch | Upgrades |
|---|---|
| Cursor | Knockback → Rapid Strike → Heavy Strike |
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
- **TECH tab** — view all 21 tech nodes and owned status
- **STATS tab** — view per-unit kill/heal/summon counters
- **+100 PC** — inject currency
- **RESET ALL PROGRESS** — wipe localStorage and restart

## File Structure

```
src/
  constants.ts          — GAME_W, GAME_H, CX, CY, ARENA_RADIUS
  main.ts               — Phaser config, scene list
  data/
    types.ts            — TypeScript interfaces for all data schemas
  debug/
    DebugState.ts       — fastCursor, godMode, chapter selection
  entities/
    Tower.ts            — Tower entity (HP, god mode)
    Enemy.ts            — Enemy entity (behaviours, slow, knockback)
    Unit.ts             — Unit entity (all 7 behaviours, haste buff, heal, stat tracking)
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

public/data/
  balance.json          — dcBudget, towerHp, pcMultiplier
  tech_tree.json        — 21 nodes across 9 branches
  chapters/             — chapter1.json, chapter2.json, chapter3.json
  enemies/              — 6 regular enemy types + 3 boss types
  units/                — footsoldier, archer, shieldbearer, healer, frost_mage, sentinel, bard
```
