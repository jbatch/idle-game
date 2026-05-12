import Phaser from 'phaser'
import { Tower } from '../entities/Tower'
import { Enemy } from '../entities/Enemy'
import { Unit } from '../entities/Unit'
import { CursorAttack } from '../input/CursorAttack'
import { WaveManager } from '../systems/WaveManager'
import { DebugMenu } from '../ui/DebugMenu'
import { debugState } from '../debug/DebugState'
import type { ChapterData, EnemyData, UnitData, BalanceData, TechNode, ShopPackData, UnitSynergyData } from '../data/types'
import { techState, applyCursorMods, applyTowerMods, applyUnitMods, applyPackBonusMods, checkStatQuests } from '../systems/TechState'
import { applyUnitSynergies } from '../systems/UnitSynergies'
import type { CampaignPackRollLog } from '../systems/CampaignLog'
import { GAME_W, GAME_H, CX, CY, ARENA_RADIUS } from '../constants'

const DEBUG_COOLDOWN = 0.05

type PackRollResult = {
  unitId: string
  source: 'pack' | 'bonus'
  tier: 1 | 2
}

export class GameScene extends Phaser.Scene {
  private tower!: Tower
  private enemies: Enemy[] = []
  private units: Unit[] = []
  private boss: Enemy | null = null
  private cursor!: CursorAttack
  private waves!: WaveManager
  private arenaGfx!: Phaser.GameObjects.Graphics
  private bossBarGfx!: Phaser.GameObjects.Graphics
  private hudText!: Phaser.GameObjects.Text
  private bossLabel!: Phaser.GameObjects.Text

  private techNodes: TechNode[] = []
  private unitSynergies: UnitSynergyData[] = []
  private runPc: number = 0
  private elapsed: number = 0
  private gameOver: boolean = false
  private bossSpawned: boolean = false
  private pcMultiplier: number = 1
  private skippedWaveThisFrame: boolean = false
  private campaignRunId?: string
  private openedUnits: CampaignPackRollLog[] = []

  constructor() {
    super({ key: 'GameScene' })
  }

  create(data: { loadout?: string[], packs?: string[], campaignRunId?: string }) {
    this.gameOver = false
    this.enemies = []
    this.units = []
    this.boss = null
    this.runPc = 0
    this.elapsed = 0
    this.bossSpawned = false
    this.skippedWaveThisFrame = false
    this.campaignRunId = data.campaignRunId
    this.openedUnits = []

    const balance = this.cache.json.get('balance')  as BalanceData
    this.pcMultiplier = balance.pcMultiplier
    const chapter = this.cache.json.get(debugState.chapter) as ChapterData
    this.techNodes = (this.cache.json.get('tech_tree') as { nodes: TechNode[] }).nodes
    this.unitSynergies = (this.cache.json.get('unit_synergies') as { synergies: UnitSynergyData[] }).synergies
    const cursorStats = applyCursorMods(balance.cursor, this.techNodes)
    const enemyIds = ['grunt', 'runner', 'brute', 'archer_enemy', 'shaman', 'siege_golem', 'boss_chapter1', 'boss_chapter2', 'boss_chapter3']
    const enemyMap: Record<string, EnemyData> = Object.fromEntries(
      enemyIds.map(id => [id, this.cache.json.get(id)])
    )

    // Arena
    this.arenaGfx = this.add.graphics()
    this.drawArena()

    // Tower — apply tech HP bonus
    this.tower = new Tower(this, CX, CY, applyTowerMods(balance.towerHp, this.techNodes))

    // Open unopened shop packs at battle start, then spawn the rolled units.
    const packResults = data.loadout
      ? data.loadout.map(unitId => ({ unitId, source: 'pack' as const, tier: 1 as const }))
      : this.rollPacks(data.packs ?? [])
    this.openedUnits = packResults.map(result => ({ ...result }))
    this.spawnUnits(packResults.map(result => result.unitId))
    if (!data.loadout && data.packs?.length) this.showPackReveal(packResults)

    // Cursor
    this.cursor = new CursorAttack(this, cursorStats)
    this.cursor.bindEnemies(() => this.enemies)

    // Wave manager
    this.waves = new WaveManager(this, chapter, enemyMap)
    this.waves.onSpawn = e => this.enemies.push(e)
    this.waves.onBossSpawn = e => {
      this.boss = e
      this.bossSpawned = true
      this.enemies.push(e)
      this.showBossWarning(e.name)
    }

    // HUD
    this.hudText = this.add.text(10, 10, '', {
      fontSize: '13px', color: '#aaaacc', fontFamily: 'monospace',
    }).setDepth(20)

    this.bossBarGfx = this.add.graphics().setDepth(20)
    this.bossLabel  = this.add.text(GAME_W / 2, 28, '', {
      fontSize: '12px', color: '#ddaa22', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(21)

    // Apply tech + debug state to cursor
    this.cursor.configure({
      ...cursorStats,
      cooldown: debugState.fastCursor ? DEBUG_COOLDOWN : cursorStats.cooldown,
    })
    this.tower.godMode       = debugState.godMode

    new DebugMenu(this, [
      {
        label: 'Fast Cursor',
        active: debugState.fastCursor,
        onToggle: (on) => {
          debugState.fastCursor = on
          this.cursor.cooldown = on ? DEBUG_COOLDOWN : cursorStats.cooldown
        },
      },
      {
        label: 'God Mode',
        active: debugState.godMode,
        onToggle: (on) => {
          debugState.godMode = on
          this.tower.godMode = on
        },
      },
    ])
  }

  private spawnUnits(loadout: string[]) {
    const unitRadius = 80
    const count = loadout.length
    const angleOffset = Math.random() * Math.PI * 2

    loadout.forEach((id, i) => {
      const raw = this.cache.json.get(id) as UnitData
      if (!raw) { console.warn(`Unknown unit id: ${id}`); return }

      // Track summon stats + apply tech mods
      techState.incrementStat(`${id}_summoned`)
      checkStatQuests(this.techNodes)
      const data = applyUnitMods(raw, this.techNodes)

      const angle = angleOffset + (i / Math.max(count, 1)) * Math.PI * 2
      const x = CX + Math.cos(angle) * unitRadius
      const y = CY + Math.sin(angle) * unitRadius

      const unit = new Unit(this, x, y, data)
      unit.statCallback = (event, amount) => {
        const statKey = event === 'kill' ? `${id}_kills` : `${id}_healed`
        techState.incrementStat(statKey, amount)
        checkStatQuests(this.techNodes)
      }
      this.units.push(unit)
    })
  }

  private rollPacks(packIds: string[]): PackRollResult[] {
    const packs = (this.cache.json.get('shop_packs') as { packs: ShopPackData[] }).packs
    const packMap = new Map(packs.map(pack => [pack.id, pack]))
    const bonuses = applyPackBonusMods(this.techNodes)
    const results: PackRollResult[] = []

    for (const packId of packIds) {
      const pack = packMap.get(packId)
      if (!pack) {
        console.warn(`Unknown shop pack id: ${packId}`)
        continue
      }

      const tier = this.packTier(pack)
      for (let i = 0; i < pack.rolls; i++) {
        const roll = this.rollUnitId(pack)
        if (roll) results.push({ unitId: roll, source: 'pack', tier })
      }

      const bonusChance = tier === 1 ? bonuses.tier1Chance : bonuses.tier2Chance
      const bonusUnits = tier === 1 ? bonuses.tier1BonusUnits : bonuses.tier2BonusUnits
      if (bonusChance > 0 && bonusUnits > 0 && Math.random() < bonusChance) {
        for (let i = 0; i < bonusUnits; i++) {
          const roll = this.rollUnitId(pack)
          if (roll) results.push({ unitId: roll, source: 'bonus', tier })
        }
      }
    }

    return results
  }

  private rollUnitId(pack: ShopPackData): string | null {
    const totalWeight = pack.rollTable.reduce((sum, roll) => sum + roll.weight, 0)
    if (totalWeight <= 0) return null

    let pick = Math.random() * totalWeight
    for (const roll of pack.rollTable) {
      pick -= roll.weight
      if (pick <= 0) return roll.unitId
    }

    return pack.rollTable[pack.rollTable.length - 1]?.unitId ?? null
  }

  private packTier(pack: ShopPackData): 1 | 2 {
    return pack.rollTable.some(roll => roll.rarity === 'specialist') ? 2 : 1
  }

  private showPackReveal(results: PackRollResult[]) {
    if (results.length === 0) return

    const title = this.add.text(GAME_W / 2, GAME_H / 2 - 168, 'PACKS OPENED', {
      fontSize: '15px', color: '#ddaa22', fontFamily: 'monospace', fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(30)

    const rows = results.map((result, index) => {
      const data = this.cache.json.get(result.unitId) as UnitData | undefined
      const name = data?.name ?? result.unitId
      const isBonus = result.source === 'bonus'
      return this.add.text(GAME_W / 2, GAME_H / 2 - 144 + index * 18, isBonus ? `BONUS T${result.tier}: ${name}` : name, {
        fontSize: isBonus ? '14px' : '13px',
        color: isBonus ? '#7cff9f' : '#ccd4ff',
        fontFamily: 'monospace',
        fontStyle: isBonus ? 'bold' : '',
        align: 'center',
      }).setOrigin(0.5).setDepth(30)
    })

    const revealObjects = [title, ...rows]

    this.tweens.add({
      targets: revealObjects,
      alpha: 0,
      duration: 2600,
      ease: 'Power2',
      onComplete: () => revealObjects.forEach(obj => obj.destroy()),
    })
  }

  private drawArena() {
    this.arenaGfx.clear()
    this.arenaGfx.fillStyle(0x0d0d1a, 1)
    this.arenaGfx.fillCircle(CX, CY, ARENA_RADIUS)
    this.arenaGfx.lineStyle(2, 0x223366, 1)
    this.arenaGfx.strokeCircle(CX, CY, ARENA_RADIUS)
    for (let r = 80; r < ARENA_RADIUS; r += 80) {
      this.arenaGfx.lineStyle(1, 0x1a1a33, 1)
      this.arenaGfx.strokeCircle(CX, CY, r)
    }
  }

  private showBossWarning(bossName: string) {
    const warn = this.add.text(GAME_W / 2, GAME_H / 2 - 120, `⚠ ${bossName.toUpperCase()} APPROACHES ⚠`, {
      fontSize: '20px', color: '#ddaa22', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(30)
    this.tweens.add({
      targets: warn,
      alpha: 0,
      duration: 2500,
      ease: 'Power2',
      onComplete: () => warn.destroy(),
    })
  }

  update(_time: number, delta: number) {
    if (this.gameOver) return

    this.elapsed += delta / 1000
    this.waves.update(delta)

    const ptr = this.input.activePointer

    // Update enemies + collect PC on death
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]
      e.update(delta, this.tower, this.units, this.enemies)
      if (!e.alive) {
        this.runPc += Math.round(e.reward * this.pcMultiplier)
        this.enemies.splice(i, 1)
        if (e === this.boss) this.boss = null
      }
    }

    // Update units + prune dead
    applyUnitSynergies(this.units, this.unitSynergies)
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i]
      u.update(delta, this.enemies, this.units)
      if (!u.alive) this.units.splice(i, 1)
    }

    this.skippedWaveThisFrame = this.shouldSkipToNextWave()
      ? this.waves.skipToNextWave()
      : false

    this.cursor.update(delta, ptr.x, ptr.y, [])
    this.updateHUD()

    if (this.bossSpawned && this.boss === null) this.endRun(true)
    if (!this.tower.alive) this.endRun(false)
  }

  private shouldSkipToNextWave(): boolean {
    if (this.enemies.length > 0) return false
    if (this.waves.waveFired === 0) return false
    if (this.waves.eventsComplete) return false
    if (this.bossSpawned) return false
    return true
  }

  private updateHUD() {
    const timeToNext = this.waves.timeToNext
    const waveStr = this.waves.eventsComplete
      ? 'All waves cleared'
      : this.waves.nextIsBoss
        ? `BOSS IN ${timeToNext !== null ? timeToNext.toFixed(1) : '?'}s`
        : `Wave ${this.waves.waveFired + 1}/${this.waves.waveTotal}  next: ${timeToNext !== null ? timeToNext.toFixed(1) : '?'}s`

    this.hudText.setText([
      `PC: ${this.runPc}`,
      this.skippedWaveThisFrame ? `${waveStr}  (advanced)` : waveStr,
      this.units.length > 0 ? `Units: ${this.units.length}` : '',
    ])

    this.bossBarGfx.clear()
    if (this.boss) {
      const barW = 180
      const barH = 10
      const bx = GAME_W / 2 - barW / 2
      const by = 38
      const frac = this.boss.hp / this.boss.maxHp
      this.bossBarGfx.fillStyle(0x221100, 1)
      this.bossBarGfx.fillRect(bx, by, barW, barH)
      this.bossBarGfx.fillStyle(0xddaa22, 1)
      this.bossBarGfx.fillRect(bx + 1, by + 1, (barW - 2) * frac, barH - 2)
      this.bossBarGfx.lineStyle(1, 0x886600, 1)
      this.bossBarGfx.strokeRect(bx, by, barW, barH)
      this.bossLabel.setText(`${this.boss.name}  ${this.boss.hp} / ${this.boss.maxHp}`)
    } else {
      this.bossLabel.setText('')
    }
  }

  private endRun(won: boolean) {
    if (this.gameOver) return
    this.gameOver = true
    this.time.delayedCall(won ? 600 : 800, () => {
      this.scene.start('GameOverScene', {
        won,
        pc: this.runPc,
        elapsed: Math.floor(this.elapsed),
        wavesCleared: this.waves.waveFired,
        totalWaves: this.waves.waveTotal,
        chapter: debugState.chapter,
        towerHp: Math.round(this.tower.hp),
        unitsAlive: this.units.length,
        campaignRunId: this.campaignRunId,
        openedUnits: this.openedUnits,
      })
    })
  }
}
