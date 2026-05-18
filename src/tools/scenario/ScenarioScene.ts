import Phaser from 'phaser'
import { Crate } from '../../entities/Crate'
import { Enemy } from '../../entities/Enemy'
import { Tower } from '../../entities/Tower'
import { Unit } from '../../entities/Unit'
import { ARENA_RADIUS, CX, CY, GAME_H, GAME_W } from '../../constants'
import type { BalanceData, CrateDropData, CrateKindData, CrateRewardData, EnemyData, ShopPackRoll, UnitData, UnitSynergyData } from '../../data/types'
import { CursorAttack } from '../../input/CursorAttack'
import { applyUnitSynergies } from '../../systems/UnitSynergies'
import { combatScenarios, type CombatScenario, type ScenarioSpawn } from './scenarios'

export class ScenarioScene extends Phaser.Scene {
  private arenaGfx!: Phaser.GameObjects.Graphics
  private hudText!: Phaser.GameObjects.Text
  private tower!: Tower
  private cursor?: CursorAttack
  private units: Unit[] = []
  private enemies: Enemy[] = []
  private crates: Crate[] = []
  private unitSynergies: UnitSynergyData[] = []
  private crateData!: CrateDropData
  private scenarioIndex = 0

  constructor() {
    super({ key: 'ScenarioScene' })
  }

  create() {
    this.arenaGfx = this.add.graphics()
    this.unitSynergies = (this.cache.json.get('unit_synergies') as { synergies: UnitSynergyData[] }).synergies
    this.crateData = this.cache.json.get('crates') as CrateDropData
    this.hudText = this.add.text(12, 12, '', {
      fontSize: '13px',
      color: '#d8d8f0',
      fontFamily: 'monospace',
    }).setDepth(20)
    this.add.text(12, GAME_H - 58, `1-${combatScenarios.length}: scenario  R: reset`, {
      fontSize: '13px',
      color: '#8890aa',
      fontFamily: 'monospace',
    }).setDepth(20)

    this.input.keyboard?.on('keydown-R', () => this.resetScenario())
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const index = Number(event.key) - 1
      if (Number.isInteger(index)) this.selectScenario(index)
    })

    this.drawArena()
    this.resetScenario()
  }

  update(_time: number, delta: number) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]
      enemy.update(delta, this.tower, this.units, this.enemies)
      if (!enemy.alive) this.enemies.splice(i, 1)
    }

    applyUnitSynergies(this.units, this.unitSynergies)
    for (let i = this.units.length - 1; i >= 0; i--) {
      const unit = this.units[i]
      unit.update(delta, this.enemies, this.units, this.crates)
      if (!unit.alive) this.units.splice(i, 1)
    }

    this.tower.update(delta)

    for (let i = this.crates.length - 1; i >= 0; i--) {
      if (!this.crates[i].alive) this.crates.splice(i, 1)
    }

    if (this.cursor) {
      const ptr = this.input.activePointer
      this.cursor.update(delta, ptr.x, ptr.y, [])
    }

    this.updateHud()
  }

  private selectScenario(index: number) {
    if (!combatScenarios[index]) return
    this.scenarioIndex = index
    this.resetScenario()
  }

  private resetScenario() {
    this.destroyEntities()

    const balance = this.cache.json.get('balance') as BalanceData
    const scenario = combatScenarios[this.scenarioIndex]
    this.tower = new Tower(this, CX, CY, scenario.tower?.hp ?? balance.towerHp)
    this.tower.godMode = scenario.tower?.godMode ?? true
    this.tower.thornsDamage = scenario.tower?.thornsDamage ?? 0
    this.tower.configureShield(
      scenario.tower?.shieldCapacity ?? scenario.tower?.startingShield ?? 0,
      scenario.tower?.shieldRegenRate ?? 0,
      scenario.tower?.shieldRegenDelay ?? 4.5,
    )
    if (scenario.tower?.startingShield) this.tower.applyShield(scenario.tower.startingShield)

    if (scenario.cursor) {
      this.cursor = new CursorAttack(this, scenario.cursor)
      this.cursor.bindTargets(() => [...this.enemies, ...this.crates])
    }

    for (const spawn of scenario.units) {
      this.spawnUnits(spawn)
    }

    for (const spawn of scenario.enemies) {
      this.spawnEnemies(spawn)
    }

    for (const spawn of scenario.crates ?? []) {
      this.spawnCrates(spawn)
    }

    this.updateHud()
  }

  private spawnUnits(spawn: ScenarioSpawn) {
    const data = this.cache.json.get(spawn.id) as UnitData
    for (const position of this.spawnPositions(spawn)) {
      const unit = new Unit(this, position.x, position.y, data)
      this.units.push(unit)
    }
  }

  private spawnEnemies(spawn: ScenarioSpawn) {
    const data = this.cache.json.get(spawn.id) as EnemyData
    for (const position of this.spawnPositions(spawn)) {
      this.enemies.push(new Enemy(this, position.x, position.y, data))
    }
  }

  private spawnCrates(spawn: ScenarioSpawn & { rewardId?: string }) {
    const crateKind = this.crateData.crates.find(crate => crate.id === spawn.id)
    if (!crateKind) return

    for (const position of this.spawnPositions(spawn)) {
      const reward = this.scenarioReward(crateKind, spawn.rewardId)
      if (!reward) continue
      this.crates.push(new Crate(this, position.x, position.y, crateKind, reward, crate => this.openCrate(crate)))
    }
  }

  private spawnPositions(spawn: ScenarioSpawn): { x: number, y: number }[] {
    const spread = spawn.spread ?? 0
    const start = spawn.angle - spread / 2
    const step = spawn.count > 1 ? spread / (spawn.count - 1) : 0

    return Array.from({ length: spawn.count }, (_, index) => {
      const angle = Phaser.Math.DegToRad(start + step * index)
      return {
        x: CX + Math.cos(angle) * spawn.radius,
        y: CY + Math.sin(angle) * spawn.radius,
      }
    })
  }

  private drawArena() {
    this.arenaGfx.clear()
    this.arenaGfx.fillStyle(0x0d0d1a, 1)
    this.arenaGfx.fillCircle(CX, CY, ARENA_RADIUS)
    this.arenaGfx.lineStyle(2, 0x223366, 1)
    this.arenaGfx.strokeCircle(CX, CY, ARENA_RADIUS)
    this.arenaGfx.lineStyle(1, 0x1a1a33, 1)
    for (let r = 80; r < ARENA_RADIUS; r += 80) {
      this.arenaGfx.strokeCircle(CX, CY, r)
    }

    this.arenaGfx.fillStyle(0x11111f, 0.88)
    this.arenaGfx.fillRect(0, 0, GAME_W, 74)
    this.arenaGfx.fillRect(0, GAME_H - 78, GAME_W, 78)
  }

  private updateHud() {
    const scenario = this.currentScenario()
    this.hudText.setText([
      `Scenario ${this.scenarioIndex + 1}/${combatScenarios.length}: ${scenario.name}`,
      scenario.description,
      `Units: ${this.units.length}   Enemies: ${this.enemies.length}   Crates: ${this.crates.length}`,
      ...(scenario.cursor ? ['Cursor test active: click inside the arena'] : []),
    ])
  }

  private scenarioReward(crateKind: CrateKindData, rewardId?: string): CrateRewardData | null {
    const rewards = new Map(this.crateData.rewards.map(reward => [reward.id, reward]))
    if (rewardId) return rewards.get(rewardId) ?? null
    const entry = crateKind.rewardTable[0]
    return entry ? rewards.get(entry.rewardId) ?? null : null
  }

  private openCrate(crate: Crate) {
    switch (crate.reward.type) {
      case 'tower_heal':
        this.tower.heal(crate.reward.value)
        break
      case 'heal_all_units':
        this.units.forEach(unit => unit.heal(crate.reward.value))
        break
      case 'random_unit':
        this.openRandomUnitReward(crate.reward, crate.x, crate.y)
        break
      case 'shield_all_units':
        this.units.forEach(unit => unit.applyShield(crate.reward.value))
        break
      case 'shield_tower':
        this.tower.applyShield(crate.reward.value)
        break
      case 'cursor_damage_buff':
      case 'cursor_cooldown_buff':
        break
    }
  }

  private openRandomUnitReward(reward: CrateRewardData, x: number, y: number) {
    if (!reward.rollTable?.length) return
    const count = reward.count ?? Math.max(1, reward.value)
    for (let i = 0; i < count; i++) {
      const unitId = this.rollWeightedUnit(reward.rollTable)
      if (!unitId) continue
      const data = this.cache.json.get(unitId) as UnitData
      const angle = Phaser.Math.DegToRad(i * 37 + 20)
      this.units.push(new Unit(this, x + Math.cos(angle) * 32, y + Math.sin(angle) * 32, data))
    }
  }

  private rollWeightedUnit(rollTable: ShopPackRoll[]): string | null {
    const total = rollTable.reduce((sum, roll) => sum + roll.weight, 0)
    let pick = Math.random() * total
    for (const roll of rollTable) {
      pick -= roll.weight
      if (pick <= 0) return roll.unitId
    }
    return rollTable[rollTable.length - 1]?.unitId ?? null
  }

  private currentScenario(): CombatScenario {
    return combatScenarios[this.scenarioIndex]
  }

  private destroyEntities() {
    for (const unit of this.units) unit.destroy()
    for (const enemy of this.enemies) enemy.destroy()
    for (const crate of this.crates) crate.destroy()
    this.cursor?.destroy()
    if (this.tower) this.tower.destroy()
    this.cursor = undefined
    this.units = []
    this.enemies = []
    this.crates = []
  }
}
