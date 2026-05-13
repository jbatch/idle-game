import type { BalanceData, TechEffect, TechNode, UnitData } from '../data/types'
import { campaignLog } from './CampaignLog'

const PC_KEY     = 'siegeloop_pc'
const TECH_KEY   = 'siegeloop_tech'
const TECH_LEVELS_KEY = 'siegeloop_tech_levels'
const QUESTS_KEY = 'siegeloop_quests'
const STATS_KEY  = 'siegeloop_stats'

function loadSet(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) ?? '[]')) }
  catch { return new Set() }
}

function loadStats(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(STATS_KEY) ?? '{}') }
  catch { return {} }
}

function loadLevels(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(TECH_LEVELS_KEY) ?? '{}') }
  catch { return {} }
}

function maxLevel(node: TechNode): number {
  return node.repeatable?.maxLevel ?? 1
}

function statQuestParts(questId: string): [string, string, number] | null {
  const parts = questId.split(':')
  if (parts.length !== 3) return null
  const [subject, stat, threshStr] = parts
  const threshold = parseInt(threshStr, 10)
  if (!Number.isFinite(threshold)) return null
  return [subject, stat, threshold]
}

export const techState = {
  // ─── PC ────────────────────────────────────────────────────────
  get pc(): number {
    return parseInt(localStorage.getItem(PC_KEY) ?? '0', 10)
  },
  addPc(amount: number) {
    localStorage.setItem(PC_KEY, String(this.pc + amount))
  },

  // ─── Purchased nodes ───────────────────────────────────────────
  get purchased(): Set<string> {
    return loadSet(TECH_KEY)
  },
  get levels(): Record<string, number> {
    return loadLevels()
  },
  level(nodeId: string): number {
    const explicitLevel = this.levels[nodeId]
    if (explicitLevel !== undefined) return explicitLevel
    return this.purchased.has(nodeId) ? 1 : 0
  },
  effectiveLevel(node: TechNode): number {
    return Math.min(this.level(node.id), maxLevel(node))
  },
  currentCost(node: TechNode): number {
    return node.cost + this.effectiveLevel(node) * (node.repeatable?.costIncrease ?? 0)
  },
  isMaxed(node: TechNode): boolean {
    return this.effectiveLevel(node) >= maxLevel(node)
  },
  purchase(node: TechNode) {
    const cost = this.currentCost(node)
    if (cost > this.pc || this.isMaxed(node)) return
    const currentLevel = this.effectiveLevel(node)

    const p = this.purchased
    p.add(node.id)
    localStorage.setItem(TECH_KEY, JSON.stringify([...p]))

    const levels = this.levels
    levels[node.id] = currentLevel + 1
    localStorage.setItem(TECH_LEVELS_KEY, JSON.stringify(levels))
    localStorage.setItem(PC_KEY, String(this.pc - cost))
  },
  has(nodeId: string): boolean {
    return this.level(nodeId) > 0
  },
  normalizeLevels(nodes: TechNode[]) {
    const levels = this.levels
    let changed = false
    for (const node of nodes) {
      const rawLevel = levels[node.id]
      if (rawLevel === undefined) continue
      const clamped = Math.min(rawLevel, maxLevel(node))
      if (rawLevel === clamped) continue
      levels[node.id] = clamped
      changed = true
    }
    if (changed) localStorage.setItem(TECH_LEVELS_KEY, JSON.stringify(levels))
  },

  // ─── Quests ────────────────────────────────────────────────────
  get completedQuests(): Set<string> {
    return loadSet(QUESTS_KEY)
  },
  completeQuest(questId: string) {
    const q = this.completedQuests
    q.add(questId)
    localStorage.setItem(QUESTS_KEY, JSON.stringify([...q]))
  },
  questDone(questId: string): boolean {
    return this.completedQuests.has(questId)
  },
  questProgress(questId: string): { current: number, threshold: number } | null {
    const parts = statQuestParts(questId)
    if (!parts) return null
    const [subject, stat, threshold] = parts
    return { current: this.getStat(`${subject}_${stat}`), threshold }
  },
  isQuestRequirementMet(questId: string): boolean {
    if (this.questDone(questId)) return true
    const progress = this.questProgress(questId)
    if (!progress) return false
    if (progress.current < progress.threshold) return false
    this.completeQuest(questId)
    return true
  },

  // ─── Stat tracking ─────────────────────────────────────────────
  incrementStat(key: string, amount: number = 1) {
    const stats = loadStats()
    stats[key] = (stats[key] ?? 0) + amount
    localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  },
  getStat(key: string): number {
    return loadStats()[key] ?? 0
  },

  // ─── Node availability ─────────────────────────────────────────
  isAvailable(node: TechNode): boolean {
    if (this.isMaxed(node)) return false
    if (node.requires.some(r => !this.has(r))) return false
    if (nodeQuestRequirements(node).some(q => !this.isQuestRequirementMet(q))) return false
    return true
  },

  // ─── Debug reset ───────────────────────────────────────────────
  reset() {
    localStorage.removeItem(PC_KEY)
    localStorage.removeItem(TECH_KEY)
    localStorage.removeItem(TECH_LEVELS_KEY)
    localStorage.removeItem(QUESTS_KEY)
    localStorage.removeItem(STATS_KEY)
    campaignLog.clear()
  },
}

function nodeEffects(node: TechNode): TechEffect[] {
  return Array.isArray(node.effect) ? node.effect : [node.effect]
}

function nodeQuestRequirements(node: TechNode): string[] {
  return [
    ...(node.questRequirement ? [node.questRequirement] : []),
    ...(node.questRequirements ?? []),
  ]
}

function purchasedEffects(nodes: TechNode[]): TechEffect[] {
  return nodes.flatMap(node => {
    const level = techState.effectiveLevel(node)
    if (level <= 0) return []
    return Array.from({ length: level }, () => nodeEffects(node)).flat()
  })
}

// ─── Cursor / tower mod application ───────────────────────────────
export function applyCursorMods(base: BalanceData['cursor'], nodes: TechNode[]) {
  let damage = base.damage
  let cooldown = base.cooldown
  let radius = base.radius
  let knockback = 0
  let knockbackChance = 0
  let bossDamageMultiplier = 1
  let crateDamageMultiplier = 1

  for (const effect of purchasedEffects(nodes)) {
    if (effect.type === 'cursor_damage') damage += effect.value
    if (effect.type === 'cursor_cooldown') cooldown = Math.min(cooldown, effect.value)
    if (effect.type === 'cursor_radius_bonus') radius += effect.value
    if (effect.type === 'cursor_knockback') knockback = Math.max(knockback, effect.value)
    if (effect.type === 'cursor_knockback_chance') knockbackChance += effect.value
    if (effect.type === 'cursor_boss_damage_mult') bossDamageMultiplier *= effect.value
    if (effect.type === 'cursor_crate_damage_mult') crateDamageMultiplier *= effect.value
  }

  return {
    damage,
    cooldown,
    radius,
    knockback,
    knockbackChance: Math.min(knockbackChance, 1),
    bossDamageMultiplier,
    crateDamageMultiplier,
  }
}

export function applyTowerMods(baseHp: number, nodes: TechNode[]): number {
  let hp = baseHp
  for (const effect of purchasedEffects(nodes)) {
    if (effect.type === 'tower_hp_bonus') hp += effect.value
  }
  return hp
}

export function applyTowerBattleMods(baseHp: number, nodes: TechNode[]) {
  let maxHp = baseHp
  let startingShield = 0
  let thornsDamage = 0

  for (const effect of purchasedEffects(nodes)) {
    if (effect.type === 'tower_hp_bonus') maxHp += effect.value
    if (effect.type === 'tower_starting_shield') startingShield += effect.value
    if (effect.type === 'tower_thorns_damage') thornsDamage += effect.value
  }

  return { maxHp, startingShield, thornsDamage }
}

export function applyDeploymentBudgetMods(baseBudget: number, nodes: TechNode[]): number {
  let budget = baseBudget
  for (const effect of purchasedEffects(nodes)) {
    if (effect.type === 'dc_budget_bonus') budget += effect.value
  }
  return budget
}

export function applyPackBonusMods(nodes: TechNode[]) {
  let tier1Chance = 0
  let tier2Chance = 0

  for (const effect of purchasedEffects(nodes)) {
    if (effect.type === 'pack_bonus_tier1_chance') tier1Chance += effect.value
    if (effect.type === 'pack_bonus_tier2_chance') tier2Chance += effect.value
  }

  return {
    tier1Chance: Math.min(tier1Chance, 1),
    tier2Chance: Math.min(tier2Chance, 1),
    tier1BonusUnits: tier1Chance > 0 ? 1 : 0,
    tier2BonusUnits: tier2Chance > 0 ? 1 : 0,
  }
}

export function applyCrateMods(baseDropChance: number, nodes: TechNode[]) {
  let dropChance = baseDropChance

  for (const effect of purchasedEffects(nodes)) {
    if (effect.type === 'crate_drop_chance_bonus') dropChance += effect.value
  }

  return {
    dropChance: Math.min(dropChance, 1),
  }
}

// ─── Unit mod application ──────────────────────────────────────────
export function applyUnitMods(data: UnitData, nodes: TechNode[]): UnitData {
  let atkBonus = 0, hpBonus = 0, rangeBonus = 0, cooldownMult = 1.0
  const paramBonuses: Record<string, number> = {}

  for (const node of nodes) {
    const level = techState.effectiveLevel(node)
    if (level <= 0) continue
    const effects = nodeEffects(node)
    for (let i = 0; i < level; i++) for (const e of effects) {
      if (e.unitId !== data.id) continue
      if (e.type === 'unit_atk_bonus')     atkBonus   += e.value
      if (e.type === 'unit_hp_bonus')      hpBonus    += e.value
      if (e.type === 'unit_range_bonus')   rangeBonus += e.value
      if (e.type === 'unit_cooldown_mult') cooldownMult *= e.value
      if (e.type === 'unit_param_bonus' && e.param) {
        paramBonuses[e.param] = (paramBonuses[e.param] ?? 0) + e.value
      }
    }
  }

  const hasChanges = atkBonus || hpBonus || rangeBonus || cooldownMult !== 1.0 || Object.keys(paramBonuses).length
  if (!hasChanges) return data

  const newParams = Object.keys(paramBonuses).length
    ? { ...data.params, ...Object.fromEntries(
        Object.entries(paramBonuses).map(([k, v]) => [k, Number(data.params?.[k] ?? 0) + v])
      ) }
    : data.params

  return {
    ...data,
    attackDamage:    data.attackDamage + atkBonus,
    hp:              data.hp + hpBonus,
    attackRange:     data.attackRange + rangeBonus,
    attackCooldown:  data.attackCooldown * cooldownMult,
    params:          newParams,
  }
}

// ─── Stat-based quest completion ──────────────────────────────────
// Quest format: "unitId:stat:threshold"  (e.g. "footsoldier:kills:50")
export function checkStatQuests(nodes: TechNode[]) {
  for (const node of nodes) {
    for (const q of nodeQuestRequirements(node)) {
      if (techState.questDone(q)) continue
      techState.isQuestRequirementMet(q)
    }
  }
}
