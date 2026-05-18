import {
  buildTechRuntime,
  countBy,
  makeRng,
  purchasedEffects,
  runGameSimulation,
} from './game-sim.mjs'

export const CHAPTER_IDS = ['chapter1', 'chapter2', 'chapter3']

export function runCampaign(data, options) {
  const state = createCampaignState()
  for (let runIndex = 1; runIndex <= options.maxRuns; runIndex++) {
    const chapterId = chooseCampaignChapter(data, state)
    if (!chapterId) break

    if (!state.chapterEntryRuns[chapterId]) state.chapterEntryRuns[chapterId] = runIndex
    const techBefore = { ...state.techLevels }
    const pcBefore = state.pc
    const budget = campaignDcBudget(data, state)
    const packIds = buyCampaignPacks(data, state, chapterId, budget)
    const rng = makeRng(`${options.seed}:run:${runIndex}`)
    const result = runGameSimulation(data, {
      ...options,
      chapterId,
      packIds,
      techLevels: state.techLevels,
    }, rng)

    state.runs = runIndex
    state.pc += result.pc
    applyRunStats(state, result)
    if (result.won) {
      state.clearRuns[chapterId] ??= runIndex
      state.failedStreak[chapterId] = 0
      const chapterNumber = chapterId.replace('chapter', '')
      state.quests.add(`boss_chapter${chapterNumber}_killed`)
    } else {
      state.failedStreak[chapterId] = (state.failedStreak[chapterId] ?? 0) + 1
    }
    completeSatisfiedQuests(data, state)

    const purchases = spendCampaignPc(data, state, result)
    state.history.push({
      run: runIndex,
      chapter: chapterId,
      won: result.won,
      outcome: result.outcome,
      pcEarned: result.pc,
      pcBefore,
      pcAfter: state.pc,
      budget,
      packs: countBy(packIds),
      loadout: countBy(result.loadout),
      towerHp: Math.round(result.towerHp),
      unitsAlive: result.unitsAlive,
      wavesCleared: result.wavesCleared,
      totalWaves: result.totalWaves,
      elapsed: Math.round(result.elapsed * 10) / 10,
      techBefore,
      purchases,
      techAfter: { ...state.techLevels },
    })

    if (CHAPTER_IDS.every(id => state.clearRuns[id])) break
  }

  return {
    runs: state.runs,
    cleared: { ...state.clearRuns },
    entries: { ...state.chapterEntryRuns },
    pc: state.pc,
    tech: { ...state.techLevels },
    quests: [...state.quests].sort(),
    stats: { ...state.stats },
    completed: CHAPTER_IDS.every(id => state.clearRuns[id]),
    history: state.history,
  }
}

function createCampaignState() {
  return {
    pc: 0,
    techLevels: {},
    quests: new Set(),
    stats: {},
    runs: 0,
    clearRuns: {},
    chapterEntryRuns: {},
    failedStreak: {},
    history: [],
  }
}

function chooseCampaignChapter(data, state) {
  const unlocked = CHAPTER_IDS.filter(id => {
    const chapter = data.chapters[id]
    return chapter && requirementsMet(chapter, state)
  })
  return unlocked.find(id => !state.clearRuns[id]) ?? null
}

function campaignDcBudget(data, state) {
  const tech = buildTechRuntime(data.techNodes, state.techLevels)
  let budget = data.balance.dcBudget
  for (const effect of purchasedEffects(tech)) {
    if (effect.type === 'dc_budget_bonus') budget += effect.value
  }
  return budget
}

function buyCampaignPacks(data, state, chapterId, budget) {
  const available = data.shopPacks.filter(pack => requirementsMet(pack, state))
  const chosen = []
  let remaining = budget
  const isChapter2Plus = CHAPTER_IDS.indexOf(chapterId) >= 1

  const t2Specialist = available.find(pack => pack.id === 'tier2_specialist')
  if (isChapter2Plus && t2Specialist && remaining >= t2Specialist.cost) {
    chosen.push(t2Specialist.id)
    remaining -= t2Specialist.cost
  }

  while (remaining > 0) {
    const pack = available
      .filter(item => item.cost <= remaining && !packLimitReached(item, chosen))
      .sort((a, b) => campaignPackScore(b, chapterId) - campaignPackScore(a, chapterId))[0]
    if (!pack) break
    chosen.push(pack.id)
    remaining -= pack.cost
  }
  return chosen
}

function packLimitReached(pack, chosen) {
  if (!pack.maxPurchases) return false
  return chosen.filter(id => id === pack.id).length >= pack.maxPurchases
}

function campaignPackScore(pack, chapterId) {
  const hasSpecialists = pack.rollTable.some(roll => roll.rarity === 'specialist')
  const tierWeight = hasSpecialists ? (CHAPTER_IDS.indexOf(chapterId) >= 1 ? 1.7 : 1.2) : 1
  const efficiency = pack.rolls / pack.cost
  const squadBonus = pack.rolls > 1 ? 0.35 : 0
  return efficiency * tierWeight + squadBonus
}

function applyRunStats(state, result) {
  for (const [packId, count] of Object.entries(result.packsBought)) {
    addStat(state, `pack_${packId}`, 'bought', count)
    if (packId === 'tier2_squad') addStat(state, 'pack_tier2_specialist', 'bought', count)
  }
  for (const [unitId, count] of Object.entries(result.stats.summoned)) {
    addStat(state, unitId, 'summoned', count)
  }
  for (const [unitId, count] of Object.entries(result.stats.kills)) {
    addStat(state, unitId, 'kills', count)
  }
  for (const [unitId, amount] of Object.entries(result.stats.healed)) {
    addStat(state, unitId, 'healed', amount)
  }
}

function addStat(state, subject, stat, amount) {
  const key = statKey(subject, stat)
  state.stats[key] = (state.stats[key] ?? 0) + amount
}

function statKey(subject, stat) {
  return `${subject}_${stat}`
}

function completeSatisfiedQuests(data, state) {
  const questIds = new Set()
  for (const node of data.techNodes) {
    for (const quest of nodeQuestRequirements(node)) questIds.add(quest)
  }
  for (const pack of data.shopPacks) {
    for (const quest of nodeQuestRequirements(pack)) questIds.add(quest)
  }
  for (const quest of questIds) {
    if (questRequirementMet(quest, state)) state.quests.add(quest)
  }
}

function spendCampaignPc(data, state, lastResult) {
  const purchases = []
  while (true) {
    const candidates = data.techNodes
      .filter(node => canBuyTechNode(node, state))
      .map(node => ({
        node,
        cost: currentTechCost(node, state),
        score: techPriorityScore(node, state, lastResult),
      }))
      .filter(item => item.cost <= state.pc)
      .sort((a, b) => {
        const scoreDelta = (b.score / Math.sqrt(b.cost)) - (a.score / Math.sqrt(a.cost))
        return scoreDelta || a.cost - b.cost
      })

    const chosen = candidates[0]
    if (!chosen) break
    state.pc -= chosen.cost
    state.techLevels[chosen.node.id] = (state.techLevels[chosen.node.id] ?? 0) + 1
    purchases.push({
      id: chosen.node.id,
      level: state.techLevels[chosen.node.id],
      cost: chosen.cost,
    })
  }
  return purchases
}

function canBuyTechNode(node, state) {
  if (techNodeLevel(node, state) >= techNodeMaxLevel(node)) return false
  if (!requirementsMet(node, state)) return false
  return (node.requires ?? []).every(required => (state.techLevels[required] ?? 0) > 0)
}

function requirementsMet(item, state) {
  return nodeQuestRequirements(item).every(quest => questRequirementMet(quest, state))
}

function nodeQuestRequirements(item) {
  return [
    ...(item.questRequirement ? [item.questRequirement] : []),
    ...(item.questRequirements ?? []),
  ]
}

function questRequirementMet(quest, state) {
  if (state.quests.has(quest)) return true
  const statQuest = parseStatQuest(quest)
  if (!statQuest) return false
  return (state.stats[statKey(statQuest.subject, statQuest.stat)] ?? 0) >= statQuest.threshold
}

function parseStatQuest(quest) {
  const parts = String(quest).split(':')
  if (parts.length !== 3) return null
  const threshold = Number(parts[2])
  if (!Number.isFinite(threshold)) return null
  return { subject: parts[0], stat: parts[1], threshold }
}

function currentTechCost(node, state) {
  const level = techNodeLevel(node, state)
  return node.cost + level * (node.repeatable?.costIncrease ?? 0)
}

function techNodeLevel(node, state) {
  return state.techLevels[node.id] ?? 0
}

function techNodeMaxLevel(node) {
  return node.repeatable?.maxLevel ?? 1
}

function techPriorityScore(node, state, lastResult) {
  const effects = Array.isArray(node.effect) ? node.effect : [node.effect]
  let score = 1
  for (const effect of effects) {
    if (effect.type === 'dc_budget_bonus') score += 20
    if (effect.type?.startsWith('pack_bonus')) score += 15
    if (effect.type === 'crate_drop_chance_bonus') score += lastResult.unitsAlive <= 1 ? 14 : 8
    if (effect.type?.startsWith('cursor')) score += 8
    if (effect.type === 'tower_hp_bonus') score += lastResult.outcome === 'tower_destroyed' ? 12 : 5
    if (effect.type === 'tower_starting_shield') score += lastResult.outcome === 'tower_destroyed' ? 11 : 5
    if (effect.type === 'tower_shield_capacity') score += lastResult.outcome === 'tower_destroyed' ? 10 : 4
    if (effect.type === 'tower_shield_regen_rate') score += lastResult.outcome === 'tower_destroyed' ? 8 : 3
    if (effect.type === 'tower_shield_regen_delay') score += lastResult.outcome === 'tower_destroyed' ? 7 : 2
    if (effect.type === 'tower_thorns_damage') score += lastResult.outcome === 'tower_destroyed' ? 9 : 4
    if (effect.type?.startsWith('unit')) {
      const summoned = state.stats[statKey(effect.unitId, 'summoned')] ?? 0
      const recent = lastResult.loadout.filter(unitId => unitId === effect.unitId).length
      score += 5 + Math.min(10, summoned * 0.35) + recent * 2
    }
  }
  if (node.repeatable && techNodeLevel(node, state) === 0) score += 3
  if (node.branch === 'deployment') score += 7
  if (node.branch === 'supply') score += 4
  if (node.branch === 'crates') score += 4
  if (node.branch === 'cursor') score += 3
  if (node.branch === 'tower') score += 2
  if (['footsoldier', 'archer'].includes(node.branch)) score += 2
  return score
}
