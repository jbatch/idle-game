import Phaser from 'phaser'
import { Enemy } from '../../entities/Enemy'
import { Tower } from '../../entities/Tower'
import { Unit } from '../../entities/Unit'
import { ARENA_RADIUS, CX, CY, GAME_H, GAME_W } from '../../constants'
import type { BalanceData, EnemyData, UnitData, UnitSynergyData } from '../../data/types'
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
  private unitSynergies: UnitSynergyData[] = []
  private scenarioIndex = 0

  constructor() {
    super({ key: 'ScenarioScene' })
  }

  create() {
    this.arenaGfx = this.add.graphics()
    this.unitSynergies = (this.cache.json.get('unit_synergies') as { synergies: UnitSynergyData[] }).synergies
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
      unit.update(delta, this.enemies, this.units)
      if (!unit.alive) this.units.splice(i, 1)
    }

    if (this.cursor) {
      const ptr = this.input.activePointer
      this.cursor.update(delta, ptr.x, ptr.y, this.enemies)
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
    this.tower = new Tower(this, CX, CY, balance.towerHp)
    this.tower.godMode = true

    if (scenario.cursor) {
      this.cursor = new CursorAttack(this, scenario.cursor)
      this.cursor.bindEnemies(() => this.enemies)
    }

    for (const spawn of scenario.units) {
      this.spawnUnits(spawn)
    }

    for (const spawn of scenario.enemies) {
      this.spawnEnemies(spawn)
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
      `Units: ${this.units.length}   Enemies: ${this.enemies.length}`,
      ...(scenario.cursor ? ['Cursor test active: click inside the arena'] : []),
    ])
  }

  private currentScenario(): CombatScenario {
    return combatScenarios[this.scenarioIndex]
  }

  private destroyEntities() {
    for (const unit of this.units) unit.destroy()
    for (const enemy of this.enemies) enemy.destroy()
    this.cursor?.destroy()
    if (this.tower) this.tower.destroy()
    this.cursor = undefined
    this.units = []
    this.enemies = []
  }
}
