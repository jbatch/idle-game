export interface Targetable {
  x: number
  y: number
  radius: number
  alive: boolean
  targetType?: 'enemy' | 'crate' | 'unit' | 'tower'
  takeDamage(amount: number): void
  applyKnockback?(fromX: number, fromY: number, force: number): void
}

export interface StatusEffect {
  type: 'slow' | 'freeze'
  duration: number    // seconds remaining
  magnitude: number   // 0–1 speed reduction
}

export interface UnitBuff {
  type: 'haste'
  duration: number
  magnitude: number   // cooldown reduction e.g. 0.5 = half cooldown
}

export type CrateRewardType =
  | 'tower_heal'
  | 'heal_all_units'
  | 'random_unit'
  | 'cursor_damage_buff'
  | 'cursor_cooldown_buff'
  | 'shield_all_units'
  | 'shield_tower'

export type UnitAttackEffect = 'melee_slash' | 'quick_projectile'
export type UnitBehaviour =
  | 'melee_basic'
  | 'melee_taunt'
  | 'ranged_kite'
  | 'heal_support'
  | 'aoe_slow'
  | 'stationary_guard'
  | 'aura_haste'

export interface UnitEffects {
  attack?: UnitAttackEffect
}

export interface UnitVisualData {
  bodyTexture: string
  weaponTexture?: string
  bodyScale?: number
  weaponScale?: number
  weaponOffset?: number
  weaponOrigin?: {
    x: number
    y: number
  }
}

export interface UnitManifestData {
  units: string[]
}

export interface EnemyData {
  id: string
  name: string
  tier: number
  hp: number
  speed: number
  damage: number
  attackCooldown: number
  attackRange: number
  reward: number
  radius: number
  color: string
  tags: string[]
  isBoss: boolean
  behaviour?: string
  params?: Record<string, number>
  visual?: UnitVisualData
}

export interface UnitData {
  id: string
  name: string
  cost: number
  tier: number
  hp: number
  speed: number
  attackDamage: number
  attackRange: number
  attackCooldown: number
  behaviour: UnitBehaviour
  effects?: UnitEffects
  visual?: UnitVisualData
  params?: Record<string, number | boolean>
  tags: string[]
  description: string
  radius: number
  color: string
}

export interface ShopPackRoll {
  unitId: string
  weight: number
  rarity: 'common' | 'rare' | 'specialist'
}

export interface ShopPackData {
  id: string
  name: string
  description: string
  cost: number
  rolls: number
  maxPurchases?: number
  unlockTechId?: string
  questRequirements?: string[]
  rollTable: ShopPackRoll[]
}

export interface CrateRewardData {
  id: string
  name: string
  description: string
  type: CrateRewardType
  weight: number
  value: number
  duration?: number
  count?: number
  requiresTechId?: string
  rollTable?: ShopPackRoll[]
}

export interface CrateKindData {
  id: string
  name: string
  hp: number
  radius: number
  color: string
  spawnWeight: number
  requiresTechId?: string
  rewardTable: { rewardId: string, weight: number }[]
}

export interface CrateDropData {
  baseDropChance: number
  maxActive: number
  crates: CrateKindData[]
  rewards: CrateRewardData[]
}

export type UnitSynergyEffect =
  | { type: 'cooldown_mult', value: number }
  | { type: 'attack_damage_bonus', value: number }
  | { type: 'param_bonus', param: string, value: number }
  | { type: 'cohesion', radius: number, strength: number }

export interface UnitSynergyData {
  id: string
  unitId: string
  name: string
  description: string
  threshold: number
  effects: UnitSynergyEffect[]
}

export interface SpawnEvent {
  time: number
  enemyId: string
  count: number
  formation: 'ring' | 'cluster' | 'line'
}

export interface BalanceData {
  dcBudget: number
  pcMultiplier: number
  towerHp: number
  currency?: {
    progression?: CurrencyDisplayData
    deployment?: CurrencyDisplayData
  }
  cursor: {
    damage: number
    radius: number
    cooldown: number
    comboDamageBonus?: number
    maxCombo?: number
    comboGrace?: number
  }
}

export interface CurrencyDisplayData {
  name: string
  icon: string
}

export interface TechEffect {
  type: 'cursor_knockback' | 'cursor_knockback_chance' | 'cursor_cooldown' | 'cursor_damage' | 'cursor_radius_bonus'
       | 'cursor_boss_damage_mult' | 'cursor_crate_damage_mult' | 'cursor_combo_damage_bonus' | 'cursor_max_combo_bonus'
       | 'tower_hp_bonus' | 'tower_starting_shield' | 'tower_thorns_damage' | 'tower_shield_capacity'
       | 'tower_shield_regen_rate' | 'tower_shield_regen_delay' | 'dc_budget_bonus'
       | 'pack_bonus_tier1_chance' | 'pack_bonus_tier2_chance'
       | 'crate_drop_chance_bonus'
       | 'unit_atk_bonus' | 'unit_hp_bonus' | 'unit_range_bonus'
       | 'unit_cooldown_mult' | 'unit_param_bonus'
  value: number
  unitId?: string   // for unit_* effects
  param?: string    // for unit_param_bonus
}

export type TechNodeAnchor = 'left' | 'right' | 'top' | 'bottom'

export interface TechEdgeLayout {
  from: string
  to: string
  fromAnchor?: TechNodeAnchor
  toAnchor?: TechNodeAnchor
  elbow?: {
    x: number
    y: number
  }
}

export interface TechNodeLayout {
  id: string
  x: number
  y: number
  visibleWhen?: 'always' | 'available' | 'purchased'
}

export interface TechTreeLayoutData {
  nodes: TechNodeLayout[]
  edges: TechEdgeLayout[]
}

export interface TechNode {
  id: string
  name: string
  description: string
  cost: number
  repeatable?: {
    maxLevel: number
    costIncrease: number
  }
  requires: string[]
  questRequirement?: string
  questRequirements?: string[]
  effect: TechEffect | TechEffect[]
  branch: string    // used by TechTreeScene for grouping
}

export interface ChapterData {
  id: string
  name: string
  baseMultiplier: number
  boss: string
  questRequirement?: string   // chapter unlock gate
  spawnSchedule: SpawnEvent[]
}
