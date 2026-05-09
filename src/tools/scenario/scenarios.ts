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
}

export const combatScenarios: CombatScenario[] = [
  {
    id: 'archer_focus_fire',
    name: 'Archer Focus Fire',
    description: 'Five archers versus a single durable target.',
    units: [{ id: 'archer', count: 5, radius: 105, angle: -90, spread: 95 }],
    enemies: [{ id: 'brute', count: 1, radius: 285, angle: -90 }],
  },
  {
    id: 'shield_wall',
    name: 'Shield Wall',
    description: 'Footsoldiers and a shieldbearer holding back a grunt pack.',
    units: [
      { id: 'shieldbearer', count: 1, radius: 95, angle: -90 },
      { id: 'footsoldier', count: 2, radius: 125, angle: -105, spread: 30 },
    ],
    enemies: [{ id: 'grunt', count: 6, radius: 330, angle: -90, spread: 70 }],
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
]
