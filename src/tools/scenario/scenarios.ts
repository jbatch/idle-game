export type ScenarioSpawn = {
  id: string
  count: number
  radius: number
  angle: number
  spread?: number
}

export type CombatScenario = {
  id: string
  name: string
  description: string
  units: ScenarioSpawn[]
  enemies: ScenarioSpawn[]
  crates?: Array<ScenarioSpawn & { rewardId?: string }>
  cursor?: {
    damage: number
    radius: number
    cooldown: number
    knockback: number
    knockbackChance: number
  }
}

export const combatScenarios: CombatScenario[] = [
  {
    id: 'archer_focus_fire',
    name: 'Archer Focus Fire',
    description: 'Five archers versus a single durable target, with Archer Volley active.',
    units: [{ id: 'archer', count: 5, radius: 105, angle: -90, spread: 95 }],
    enemies: [{ id: 'brute', count: 1, radius: 285, angle: -90 }],
  },
  {
    id: 'archer_volley_synergy',
    name: 'Archer Volley Synergy',
    description: 'Three archers should glow and fire faster while all three are alive.',
    units: [{ id: 'archer', count: 3, radius: 105, angle: -90, spread: 70 }],
    enemies: [{ id: 'brute', count: 2, radius: 290, angle: -90, spread: 55 }],
  },
  {
    id: 'shield_wall',
    name: 'Shield Wall',
    description: 'Two shieldbearers should hold a wider taunt line while footsoldiers fight.',
    units: [
      { id: 'shieldbearer', count: 2, radius: 95, angle: -90, spread: 30 },
      { id: 'footsoldier', count: 2, radius: 125, angle: -105, spread: 30 },
    ],
    enemies: [{ id: 'grunt', count: 6, radius: 330, angle: -90, spread: 70 }],
  },
  {
    id: 'footsoldier_phalanx',
    name: 'Footsoldier Phalanx',
    description: 'Three footsoldiers should cluster and hit harder while all three are alive.',
    units: [{ id: 'footsoldier', count: 3, radius: 122, angle: -100, spread: 42 }],
    enemies: [{ id: 'grunt', count: 7, radius: 330, angle: -90, spread: 74 }],
  },
  {
    id: 'support_loop',
    name: 'Support Loop',
    description: 'Healer and bard supporting a small front line.',
    units: [
      { id: 'footsoldier', count: 2, radius: 120, angle: -100, spread: 35 },
      { id: 'healer', count: 1, radius: 80, angle: 110 },
      { id: 'bard', count: 1, radius: 70, angle: 70 },
    ],
    enemies: [{ id: 'runner', count: 5, radius: 330, angle: -90, spread: 85 }],
  },
  {
    id: 'frost_cluster',
    name: 'Frost Cluster',
    description: 'Frost mage should prefer the densest enemy clump.',
    units: [
      { id: 'footsoldier', count: 1, radius: 120, angle: -95 },
      { id: 'frost_mage', count: 1, radius: 85, angle: 100 },
    ],
    enemies: [
      { id: 'grunt', count: 7, radius: 330, angle: -90, spread: 46 },
      { id: 'runner', count: 2, radius: 320, angle: 40, spread: 28 },
    ],
  },
  {
    id: 'mixed_roles',
    name: 'Mixed Roles',
    description: 'A compact mixed squad showing separation, support movement, and ranged kiting.',
    units: [
      { id: 'shieldbearer', count: 1, radius: 100, angle: -90 },
      { id: 'footsoldier', count: 2, radius: 130, angle: -112, spread: 44 },
      { id: 'archer', count: 3, radius: 82, angle: 80, spread: 70 },
      { id: 'healer', count: 1, radius: 62, angle: 145 },
      { id: 'bard', count: 1, radius: 56, angle: 35 },
    ],
    enemies: [
      { id: 'grunt', count: 5, radius: 335, angle: -100, spread: 70 },
      { id: 'runner', count: 4, radius: 335, angle: 20, spread: 55 },
    ],
  },
  {
    id: 'enemy_ranged_tells',
    name: 'Enemy Ranged Tells',
    description: 'Enemy archers should visibly fire projectiles at player units.',
    units: [
      { id: 'footsoldier', count: 1, radius: 115, angle: -100 },
      { id: 'archer', count: 2, radius: 80, angle: 80, spread: 42 },
    ],
    enemies: [{ id: 'archer_enemy', count: 3, radius: 275, angle: -90, spread: 80 }],
  },
  {
    id: 'cursor_knockback_proc',
    name: 'Cursor Knockback Proc',
    description: 'Click the boss repeatedly; knockback should land sometimes, not every hit.',
    cursor: { damage: 1, radius: 48, cooldown: 0.25, knockback: 280, knockbackChance: 0.35 },
    units: [],
    enemies: [{ id: 'boss_chapter1', count: 1, radius: 185, angle: -90 }],
  },
  {
    id: 'crates_click_to_open',
    name: 'Crates: Click To Open',
    description: 'Break crates with cursor hits; the tougher cache should take several early clicks.',
    cursor: { damage: 8, radius: 34, cooldown: 0.35, knockback: 0, knockbackChance: 0 },
    units: [
      { id: 'footsoldier', count: 2, radius: 115, angle: -105, spread: 34 },
      { id: 'archer', count: 1, radius: 85, angle: 70 },
    ],
    enemies: [{ id: 'grunt', count: 2, radius: 315, angle: -90, spread: 45 }],
    crates: [
      { id: 'field_cache', rewardId: 'unit_mending', count: 1, radius: 150, angle: 45 },
      { id: 'reinforced_cache', rewardId: 'free_tier1_roll', count: 1, radius: 190, angle: 120 },
      { id: 'aegis_cache', rewardId: 'squad_aegis', count: 1, radius: 230, angle: 200 },
    ],
  },
]
