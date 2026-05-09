import type { BalanceData, TechEffect, TechNode, UnitData } from '../data/types'

const PC_KEY     = 'siegeloop_pc'
const TECH_KEY   = 'siegeloop_tech'
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
  purchase(node: TechNode) {
    const p = this.purchased
    p.add(node.id)
    localStorage.setItem(TECH_KEY, JSON.stringify([...p]))
    localStorage.setItem(PC_KEY, String(this.pc - node.cost))
  },
  has(nodeId: string): boolean {
    return this.purchased.has(nodeId)
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
    if (this.has(node.id)) return false
    if (node.requires.some(r => !this.has(r))) return false
    if (node.questRequirement && !this.questDone(node.questRequirement)) return false
    return true
  },

  // ─── Debug reset ───────────────────────────────────────────────
  reset() {
    localStorage.removeItem(PC_KEY)
    localStorage.removeItem(TECH_KEY)
    localStorage.removeItem(QUESTS_KEY)
    localStorage.removeItem(STATS_KEY)
  },
}

function nodeEffects(node: TechNode): TechEffect[] {
  return Array.isArray(node.effect) ? node.effect : [node.effect]
}

function purchasedEffects(nodes: TechNode[]): TechEffect[] {
  const purchased = techState.purchased
  return nodes
    .filter(node => purchased.has(node.id))
    .flatMap(nodeEffects)
}

// ─── Cursor / tower mod application ───────────────────────────────
export function applyCursorMods(base: BalanceData['cursor'], nodes: TechNode[]) {
  let damage = base.damage
  let cooldown = base.cooldown
  let radius = base.radius
  let knockback = 0

  for (const effect of purchasedEffects(nodes)) {
    if (effect.type === 'cursor_damage') damage += effect.value
    if (effect.type === 'cursor_cooldown') cooldown = Math.min(cooldown, effect.value)
    if (effect.type === 'cursor_knockback') knockback += effect.value
  }

  return { damage, cooldown, radius, knockback }
}

export function applyTowerMods(baseHp: number, nodes: TechNode[]): number {
  let hp = baseHp
  for (const effect of purchasedEffects(nodes)) {
    if (effect.type === 'tower_hp_bonus') hp += effect.value
  }
  return hp
}

export function applyDeploymentBudgetMods(baseBudget: number, nodes: TechNode[]): number {
  let budget = baseBudget
  for (const effect of purchasedEffects(nodes)) {
    if (effect.type === 'dc_budget_bonus') budget += effect.value
  }
  return budget
}

// ─── Unit mod application ──────────────────────────────────────────
export function applyUnitMods(data: UnitData, nodes: TechNode[]): UnitData {
  const purchased = techState.purchased
  let atkBonus = 0, hpBonus = 0, rangeBonus = 0, cooldownMult = 1.0
  const paramBonuses: Record<string, number> = {}

  for (const node of nodes) {
    if (!purchased.has(node.id)) continue
    for (const e of nodeEffects(node)) {
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
    const q = node.questRequirement
    if (!q || techState.questDone(q)) continue
    const parts = q.split(':')
    if (parts.length !== 3) continue   // not a stat quest (e.g. plain event quest)
    const [unitId, stat, threshStr] = parts
    const statKey = `${unitId}_${stat}`
    if (techState.getStat(statKey) >= parseInt(threshStr, 10)) {
      techState.completeQuest(q)
    }
  }
}
