export interface Targetable {
  x: number
  y: number
  radius: number
  alive: boolean
  takeDamage(amount: number): void
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

export type UnitAttackEffect = 'melee_slash' | 'quick_projectile'

export interface UnitEffects {
  attack?: UnitAttackEffect
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
  behaviour: string
  effects?: UnitEffects
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
  unlockTechId?: string
  questRequirements?: string[]
  rollTable: ShopPackRoll[]
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
  cursor: {
    damage: number
    radius: number
    cooldown: number
  }
}

export interface TechEffect {
  type: 'cursor_knockback' | 'cursor_cooldown' | 'cursor_damage' | 'tower_hp_bonus' | 'dc_budget_bonus'
       | 'unit_atk_bonus' | 'unit_hp_bonus' | 'unit_range_bonus'
       | 'unit_cooldown_mult' | 'unit_param_bonus'
  value: number
  unitId?: string   // for unit_* effects
  param?: string    // for unit_param_bonus
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
