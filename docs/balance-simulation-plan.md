# Balance Simulation Plan

This note captures the next step after the first headless battle simulator: a stateful campaign simulator that can estimate progression pacing from a fresh save.

## Why Keep Two Simulators

The existing headless battle simulator answers a focused question:

> Given this chapter, pack setup, loadout, and tech state, how often does the bot win?

That is still useful for local tuning. It can test a fixed chapter, profile, or pack sweep quickly.

A campaign simulator should live alongside it and answer a larger pacing question:

> Starting from a fresh save, how many runs does a reasonable player-bot need to clear each chapter, and what does it own along the way?

The battle simulator should become the combat engine used by the campaign simulator. The campaign simulator adds persistent save state, spending decisions, unlock decisions, and repeated runs.

## Campaign State

The stateful simulator should track the same progression concepts as the real game:

- Total PC.
- Purchased tech levels.
- Completed quests.
- Stat counters such as kills, healed amount, summons, and pack purchases.
- Highest unlocked chapter.
- Current target chapter.
- Run count.
- Per-run history for debugging and reporting.

The first pass does not need to mimic localStorage. It can use a plain in-memory object with helper functions that match the game concepts closely enough.

## Run Loop

Each simulated run should:

1. Choose a chapter to attempt.
2. Calculate the current DC budget from tech.
3. Buy packs using the current pack-buying policy.
4. Roll packs at battle start.
5. Run headless combat with the existing battle simulator.
6. Award PC from the run.
7. Update kill, heal, summon, pack-buy, and boss-clear stats.
8. Complete any newly satisfied quests.
9. Unlock the next chapter if the boss was killed.
10. Spend PC using the current tech-buying policy.
11. Repeat until all chapters are cleared or a max run limit is hit.

This creates natural start, mid, and late chapter snapshots from the actual simulated progression instead of hand-authored profiles.

## Player-Bot Policies

Start with one conservative policy, then make policy comparison easy.

Initial chapter selection:

- Attempt the highest unlocked unbeaten chapter.
- If the bot loses that chapter several times in a row, optionally farm the previous cleared chapter once.
- Stop farming once enough PC has been spent or the failed chapter is worth retrying.

Initial pack purchasing:

- Buy the best available pack mix within the current DC budget.
- Prefer squad packs when unlocked because they give better rolls per DC.
- Include T2 packs once specialist packs are unlocked.
- Avoid revealing exact units before combat; the campaign policy should choose packs, not final loadouts.

Initial tech purchasing:

- Buy affordable available tech greedily by a priority score.
- Weight deployment/economy tech highly because it increases pack volume.
- Weight cheap repeatable early upgrades highly.
- Weight tech for units that are commonly rolled or recently useful.
- Weight tower HP higher after tower-death losses.
- Weight cursor tech higher if many enemies survive deep into waves.
- Weight specialist tech only after T2 packs are available.

Later policies worth comparing:

- `greedy`: best weighted score per PC.
- `economy-first`: deployment and supply before combat stats.
- `cursor-first`: cursor damage/control before unit stats.
- `unit-first`: rolled-unit and synergy payoffs before cursor/tower.
- `defense-first`: tower and tank upgrades before damage.
- `random-affordable`: baseline noise check.

## Reports

The high-value report should aggregate many simulated campaigns:

```text
Campaign sim, 500 players

Chapter 1 clear:
  median run: 4
  p90 run: 7
  common tech at clear: cursor_focus:2, deployment_drills:1

Chapter 2 clear:
  median run: 13
  p90 run: 21
  common blockers: tower deaths, insufficient T2 pack access

Chapter 3 clear:
  median run: 31
  p90 run: failed by run 50
```

Also include a trace mode for one campaign:

```text
Run 1: Ch1 loss, +41 PC, bought cursor_focus:1, archer_fletching:1
Run 2: Ch1 loss, +87 PC, bought deployment_drills
Run 3: Ch1 win, +195 PC, unlocked Ch2
```

Useful aggregate metrics:

- Median and p90 runs to clear each chapter.
- Failure rate by max run limit.
- Average PC earned per run by chapter.
- Tech owned at chapter entry, midpoint, and clear.
- Pack mix used at chapter entry, midpoint, and clear.
- Common death cause: tower died, units died early, boss timeout, insufficient damage.
- Common blockers: no affordable tech, missing quest gate, too few T2 rolls, tower pressure.

## Relationship To Profile Gates

The current profile gate report is still useful as a fast smoke test:

```bash
pnpm sim -- --chapter-gates --trials 100
```

But campaign simulation should eventually become the source of truth for realistic start/mid/late states.

Instead of manually deciding that a mid-chapter player owns 50% of available upgrades, the campaign sim can answer:

> Across 500 simulated players, what tech did they usually own halfway between first entering Chapter 2 and clearing Chapter 2?

The profile gates can then be regenerated from real campaign percentiles:

- Start profile: median state on first chapter entry.
- Mid profile: median state halfway between chapter entry and chapter clear.
- Late profile: median or p75 state at chapter clear.

## Suggested Implementation Steps

1. Refactor `tools/balance-sim.mjs` so the combat runner can be called as a function with explicit inputs and structured outputs.
2. Add a campaign state object with PC, tech levels, quests, stats, and chapter unlocks.
3. Teach combat results to return progression events: PC earned, boss killed, units summoned, unit kills, healing done, packs bought.
4. Implement basic tech availability checks using the same requirements as the game.
5. Implement the first `greedy` tech-buying policy.
6. Implement the first pack-buying policy.
7. Add `--campaign --campaigns 100 --max-runs 50` CLI mode.
8. Add `--trace-campaign --seed example` for one readable campaign timeline.
9. Compare campaign-derived chapter entry/clear states with the current hand-authored profile gates.
10. Use the report to tune chapter difficulty, tech costs, PC rewards, DC growth, and pack unlock thresholds.

## First Design Caveats

- The player-bot does not need to be perfect. It needs to be consistent and explainable.
- If the bot is too smart, the game may look easier than it feels. If it is too dumb, the game may look unfair. Comparing multiple policies will help.
- The current squad power number should remain a calibration yardstick, not an objective truth.
- Exact parity with Phaser is less important than stable, repeatable signals. When sim and playtest disagree, inspect the difference and either improve the sim or intentionally bias it.
