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
pnpm validate:data       # JSON content/schema consistency checks
pnpm build      # production build verification
pnpm sim -- --campaigns 100 --max-runs 60
```

Vite may pick the next open port if `5173` is already in use.

Local app entrypoints:

| URL | Purpose |
|---|---|
| `/` | Main SiegeLoop game |
| `/tools/` | Local-only tools hub |
| `/tools/scenario.html` | Scenario sandbox for combat and behavior verification |
| `/tools/tech-editor.html` | Tech tree data/layout editor |
| `/tools/unit-editor.html` | Unit data editor with live dummy preview |

## Game Flow

```
Boot → Shop ⇄ Tech Tree
Shop → Combat → Game Over → Shop
```

- **Shop:** Spend Deployment Currency (DC, budget: 2 by default) on unopened unit packs for this run. Switch chapters from the chapter selector. Open [TECH TREE] or [CHEATS].
- **Combat:** Defend the Tower through timed waves; cursor AOE attack + deployed units fight autonomously.
- **Win (boss kill):** Chapter Complete — earn PC, unlock next chapter.
- **Lose:** Tower HP reaches 0 — return to shop.
- Only **Progression Currency (PC)** carries over between runs.

## Shop Packs

The shop sells unopened packs. Rolled units are hidden in the shop and revealed when combat starts.

| Pack | Cost | Rolls | Unlock | Pool |
|---|---:|---:|---|---|
| Tier 1 Recruit Pack | 1 DC | 1 | Always | Footsoldier 45%, Archer 45%, Shieldbearer 10% |
| Tier 1 Squad Pack | 3 DC | 4 | Buy 15 Tier 1 Recruit Packs | Footsoldier 45%, Archer 45%, Shieldbearer 10% |
| Tier 2 Specialist Pack | 2 DC | 1 | Chapter 2 | Healer, Frost Mage, Sentinel, Bard |
| Tier 2 Squad Pack | 6 DC | 4 | Chapter 2 + buy 15 Tier 2 Specialist Packs | Healer, Frost Mage, Sentinel, Bard |

Squad packs give four rolls for the price of three singles. Pack purchases are tracked when a run starts, so buying singles is also how later discounted squad packs unlock. Supply tech can add bonus battle-start rolls, and those bonus units are highlighted in the pack reveal.

## Chapters

| Chapter | Name | Difficulty | Status |
|---|---|---|---|
| Chapter 1 | The First Siege | 1.0× | Always unlocked |
| Chapter 2 | The Iron March | 1.6× | Unlocked by killing Ch1 boss |
| Chapter 3 | Eternal Darkness | 2.5× | Unlocked by killing Ch2 boss |

## Units

| Unit | Tier | Behaviour |
|---|---|---|
| Footsoldier | 1 | Intercepts enemies threatening the Tower and melees them |
| Archer | 1 | Ranged kite — prefers engaged targets and retreats from nearby threats |
| Shieldbearer | 1 | Guard/tank — stays leashed near Tower and redirects enemies within taunt radius |
| Healer | 2 | Avoids enemies and prioritizes urgent wounded allies, especially frontliners |
| Frost Mage | 2 | Cluster-targeted AOE blast — damage + 45% slow for 2.5s |
| Sentinel | 2 | Stationary; high damage to enemies near Tower |
| Bard | 2 | Moves toward allied clusters; doubles nearby allies' attack speed |

Units use lightweight steering for role behavior, tower leashing, and ally separation. Several unit attacks also have configurable visual effects in unit JSON via `effects.attack`.

## Unit Synergies

Same-unit synergies reward duplicate pack rolls while the matching units are alive.

| Synergy | Requirement | Effect |
|---|---|---|
| Archer Volley | 3+ living Archers | Archers gain 20% faster attacks and hold a tighter firing line |
| Footsoldier Phalanx | 3+ living Footsoldiers | Footsoldiers cluster together and gain +3 attack damage |
| Shield Wall | 2+ living Shieldbearers | Shieldbearers cluster together and gain wider guard/taunt radii |

Synergy effects can alter stats, runtime behaviour parameters, or movement patterns. Cooldown synergies stack multiplicatively with Bard haste.

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

12 branches, 38 nodes. Spend PC to unlock permanent upgrades that persist across runs.
Some low-power upgrades are repeatable and increase in price each time.

| Branch | Upgrades |
|---|---|
| Cursor | Cursor Focus ×4 → Knockback ×4 → Rapid Strike → Heavy Strike → Siegebreaker, plus Cursor Reach → Wide Arc → Battlefield Sweep |
| Deployment | Deployment Drills → Field Reserves → War Chest |
| Supply | Field Scavenging ×3 → Specialist Salvage ×3 |
| Crates | Cache Scavenging → Cache Prospecting → Shielded Caches |
| Tower | Fortify → Reinforce → Bastion, plus Retaliating Stone → Sharpened Battlements and Guard Pulse |
| Per unit (×7) | Unit upgrades, many gated by stat quests |

Repeatable early upgrades:

| Upgrade | Max | Cost | Effect |
|---|---:|---|---|
| Cursor Focus | 4 | 10, 18, 26, 34 PC | Cursor damage +2 per level |
| Knockback | 4 | 25, 40, 55, 70 PC | Cursor knockback chance +20% per level |
| Field Scavenging | 3 | 90, 165, 240 PC | Tier 1 pack chance for a bonus unit +12% per level |
| Specialist Salvage | 3 | 180, 330, 480 PC | Tier 2 pack chance for a bonus unit +9% per level |
| Boot Camp | 3 | 12, 20, 28 PC | Footsoldier HP +15 per level |
| Fletching | 3 | 12, 20, 28 PC | Archer ATK +2 per level |

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
- **TECH tab** — view all tech nodes and owned status
- **STATS tab** — view per-unit kill/heal/summon counters
- **+100 PC** — inject currency
- **RESET ALL PROGRESS** — wipe localStorage and restart

## Local Tools

Local-only side apps live under `tools/` and reuse game data from `public/data/`.

Roadmap and backlog tracking live in `TODO.md`.

### Scenario Sandbox

Open `/tools/scenario.html` while `pnpm dev` is running.

- Press number keys to switch scenario fixtures.
- Press `R` to reset the current scenario.
- Use this before and after behavior, targeting, combat readability, and balance changes.
- Add focused fixtures in `src/tools/scenario/scenarios.ts` when introducing a new unit behavior, enemy behavior, effect, or combat mechanic.

### Tech Tree Editor

Open `/tools/tech-editor.html` while `pnpm dev` is running.

- Edit tech node definitions in `public/data/tech_tree.json`.
- Drag nodes, route dependency edges, and save runtime layout metadata in `public/data/tech_tree_layout.json`.
- Use this for visual DAG layout work instead of hand-editing positions.

### Unit Editor

Open `/tools/unit-editor.html` while `pnpm dev` is running.

- Create, duplicate, delete, reorder, and tune unit data from a GUI.
- Edit core stats, behaviour, attack effect, tags, color, `params`, and `effects`.
- Preview the selected unit against a dummy tower to check radius, color, range, attack cadence, and simple attack/heal/aura effects.
- Saves unit files in `public/data/units/` and updates `public/data/unit_manifest.json`.

### Balance Simulator

Run headless combat simulations from the CLI:

```bash
pnpm sim -- --campaigns 100 --max-runs 60
pnpm sim -- --trace-campaign --seed example --max-runs 60
pnpm sim -- --campaigns 200 --max-runs 100 --json
```

The simulator starts from a fresh in-memory save, buys packs, runs fixed-step combat without Phaser rendering, awards PC, records summon/kill/heal/pack-buy stats, completes quest gates, unlocks chapters, and greedily buys tech between runs. Use the default aggregate report for pacing across many simulated players and `--trace-campaign` for one readable run-by-run timeline.

The CLI wrapper is `tools/balance-sim.mjs`; implementation modules live under `tools/sim/`.

This is a calibration tool, not exact game parity yet. Treat campaign clear rates and trace timelines as stable signals to tune against playtest feel over time.

## File Structure

```
src/
  constants.ts          — GAME_W, GAME_H, CX, CY, ARENA_RADIUS
  main.ts               — compatibility import for the main game app
  apps/
    game/main.ts        — main game app entrypoint
    scenario/main.ts    — scenario sandbox app entrypoint
    tech-editor/main.ts — tech tree editor app entrypoint
    unit-editor/main.ts — unit editor app entrypoint
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
    loadGameData.ts     — shared JSON data loader plus unit manifest loading
  input/
    CursorAttack.ts     — Mouse AOE attack (cooldown, knockback, damage)
  scenes/
    BootScene.ts        — Loads all JSON assets
    ShopScene.ts        — Pre-run shop (DC budget, unopened pack cards, chapter selector)
    GameScene.ts        — Main combat (waves, units, enemies, HUD)
    GameOverScene.ts    — End-of-run summary, PC persistence, quest completion
    TechTreeScene.ts    — Branch-row tech tree with purchase flow
  systems/
    TechState.ts        — localStorage singleton (PC, purchased nodes, quests, stats)
    UnitSynergies.ts    — same-unit synergy activation and buff application
    WaveManager.ts      — Time-based spawn schedule from ChapterData
  ui/
    CheatPanel.ts       — Modal inspector panel (quests/tech/stats + cheats)
    DebugMenu.ts        — In-combat debug slide-in panel
  tools/
    scenario/           — Scenario sandbox boot scene, scene, and fixtures

public/data/
  balance.json          — dcBudget, towerHp, pcMultiplier
  shop_packs.json       — unopened pack definitions and weighted roll tables
  unit_synergies.json   — same-unit synergy thresholds and buffs
  unit_manifest.json    — ordered list of unit IDs to load
  tech_tree.json        — 38 nodes across 12 branches
  tech_tree_layout.json — explicit tech tree node positions and edge routes
  chapters/             — chapter1.json, chapter2.json, chapter3.json
  enemies/              — 6 regular enemy types + 3 boss types
  units/                — footsoldier, archer, shieldbearer, healer, frost_mage, sentinel, bard

tools/
  index.html            — local tools hub
  balance-sim.mjs       — headless combat simulator CLI
  scenario.html         — scenario sandbox HTML entrypoint
  tech-editor.html      — tech tree editor HTML entrypoint
  unit-editor.html      — unit editor HTML entrypoint
  validate-data.mjs     — JSON content/schema consistency checks
```
