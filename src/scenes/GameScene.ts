import Phaser from 'phaser'
import { Tower } from '../entities/Tower'
import { Enemy } from '../entities/Enemy'
import { Unit } from '../entities/Unit'
import { Crate } from '../entities/Crate'
import { CursorAttack, type CursorAttackConfig } from '../input/CursorAttack'
import { WaveManager } from '../systems/WaveManager'
import { DebugMenu } from '../ui/DebugMenu'
import { debugState } from '../debug/DebugState'
import type { ChapterData, EnemyData, UnitData, BalanceData, TechNode, ShopPackData, UnitSynergyData, CrateDropData, CrateKindData, CrateRewardData, ShopPackRoll } from '../data/types'
import { techState, applyCursorMods, applyTowerBattleMods, applyUnitMods, applyPackBonusMods, applyCrateMods, checkStatQuests } from '../systems/TechState'
import { applyUnitSynergies } from '../systems/UnitSynergies'
import type { CampaignPackRollLog } from '../systems/CampaignLog'
import { GAME_W, GAME_H, CX, CY, ARENA_RADIUS } from '../constants'
import { audioManager } from '../systems/AudioManager'
import { playRingPulse, playSparkBurst } from '../effects/CombatEffects'
import { fadeInScene, fadeToScene } from '../ui/sceneTransitions'
import { showPackRevealOverlay, type PackRollResult } from '../ui/PackRevealOverlay'
import { CombatHud } from '../ui/CombatHud'
import { createPauseOverlay } from '../ui/PauseOverlay'
import { showOnboardingTip } from '../ui/OnboardingOverlay'
import { cursors } from '../ui/cursors'
import { currencyLabels } from '../ui/currency'

const DEBUG_COOLDOWN = 0.05

type CursorTimedBuff = {
  type: 'damage' | 'cooldown'
  value: number
  remaining: number
}

export class GameScene extends Phaser.Scene {
  private tower!: Tower
  private enemies: Enemy[] = []
  private units: Unit[] = []
  private crates: Crate[] = []
  private boss: Enemy | null = null
  private cursor!: CursorAttack
  private waves!: WaveManager
  private arenaGfx!: Phaser.GameObjects.Graphics
  private hud!: CombatHud
  private pauseOverlay: Phaser.GameObjects.Container | null = null

  private techNodes: TechNode[] = []
  private unitSynergies: UnitSynergyData[] = []
  private crateData!: CrateDropData
  private baseCursorStats!: CursorAttackConfig
  private cursorBuffs: CursorTimedBuff[] = []
  private runPc: number = 0
  private elapsed: number = 0
  private gameOver: boolean = false
  private bossSpawned: boolean = false
  private pcMultiplier: number = 1
  private skippedWaveThisFrame: boolean = false
  private campaignRunId?: string
  private openedUnits: CampaignPackRollLog[] = []
  private chapterName = ''
  private packRevealBlocking = false
  private paused = false
  private onboardingPaused = false
  private cratesOpened = 0
  private crateRewards: string[] = []

  constructor() {
    super({ key: 'GameScene' })
  }

  create(data: { loadout?: string[], packs?: string[], campaignRunId?: string }) {
    fadeInScene(this)
    audioManager.playMusic(this, 'battle_theme')
    this.input.setDefaultCursor(cursors.combat)
    this.gameOver = false
    this.enemies = []
    this.units = []
    this.crates = []
    this.boss = null
    this.cursorBuffs = []
    this.runPc = 0
    this.elapsed = 0
    this.bossSpawned = false
    this.skippedWaveThisFrame = false
    this.campaignRunId = data.campaignRunId
    this.openedUnits = []
    this.packRevealBlocking = false
    this.paused = false
    this.onboardingPaused = false
    this.cratesOpened = 0
    this.crateRewards = []
    this.pauseOverlay?.destroy()
    this.pauseOverlay = null

    const balance = this.cache.json.get('balance')  as BalanceData
    this.pcMultiplier = balance.pcMultiplier
    const chapter = this.cache.json.get(debugState.chapter) as ChapterData
    this.chapterName = chapter.name
    this.techNodes = (this.cache.json.get('tech_tree') as { nodes: TechNode[] }).nodes
    this.unitSynergies = (this.cache.json.get('unit_synergies') as { synergies: UnitSynergyData[] }).synergies
    this.crateData = this.cache.json.get('crates') as CrateDropData
    const cursorStats = applyCursorMods(balance.cursor, this.techNodes)
    this.baseCursorStats = {
      ...cursorStats,
      cooldown: debugState.fastCursor ? DEBUG_COOLDOWN : cursorStats.cooldown,
    }
    const enemyIds = ['grunt', 'runner', 'brute', 'archer_enemy', 'shaman', 'siege_golem', 'boss_chapter1', 'boss_chapter2', 'boss_chapter3']
    const enemyMap: Record<string, EnemyData> = Object.fromEntries(
      enemyIds.map(id => [id, this.cache.json.get(id)])
    )

    // Arena
    this.arenaGfx = this.add.graphics()
    this.drawArena()

    // Tower — apply tech HP, shield, and self-defense bonuses.
    const towerMods = applyTowerBattleMods(balance.towerHp, this.techNodes)
    this.tower = new Tower(this, CX, CY, towerMods.maxHp)
    this.tower.thornsDamage = towerMods.thornsDamage
    if (towerMods.startingShield > 0) this.tower.applyShield(towerMods.startingShield)

    // Open unopened shop packs at battle start, then spawn the rolled units.
    const packResults = data.loadout
      ? data.loadout.map(unitId => ({ unitId, source: 'pack' as const, tier: 1 as const }))
      : this.rollPacks(data.packs ?? [])
    this.openedUnits = packResults.map(result => ({ ...result }))
    const shouldRevealPacks = !data.loadout && Boolean(data.packs?.length) && packResults.length > 0
    if (shouldRevealPacks) {
      this.packRevealBlocking = true
      showPackRevealOverlay(this, packResults, this.unitSynergies, () => {
        this.spawnUnits(packResults.map(result => result.unitId))
        this.packRevealBlocking = false
        this.showCombatBasicsTip()
      })
    } else {
      this.spawnUnits(packResults.map(result => result.unitId))
      this.time.delayedCall(220, () => this.showCombatBasicsTip())
    }

    // Cursor
    this.cursor = new CursorAttack(this, this.baseCursorStats)
    this.cursor.bindTargets(() => [...this.enemies, ...this.crates])

    // Wave manager
    this.waves = new WaveManager(this, chapter, enemyMap)
    this.waves.onSpawn = e => {
      this.enemies.push(e)
      this.showEnemyTip(e)
    }
    this.waves.onBossSpawn = e => {
      this.boss = e
      this.bossSpawned = true
      this.enemies.push(e)
      this.showBossWarning(e.name)
      this.showEnemyTip(e)
    }

    this.hud = new CombatHud(this)

    // Apply tech + debug state to cursor
    this.cursor.configure({
      ...this.baseCursorStats,
    })
    this.tower.godMode       = debugState.godMode

    this.input.keyboard?.on('keydown-P', () => this.togglePause())
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.paused) this.togglePause()
    })

    new DebugMenu(this, [
      {
        label: 'Fast Cursor',
        active: debugState.fastCursor,
        onToggle: (on) => {
          debugState.fastCursor = on
          this.baseCursorStats.cooldown = on ? DEBUG_COOLDOWN : cursorStats.cooldown
          this.refreshCursorConfig()
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
      {
        label: 'Spawn Crate',
        onPress: () => this.spawnCheatCrate(),
      },
    ])
  }

  private spawnUnits(loadout: string[]) {
    const unitRadius = 80
    const count = loadout.length
    const angleOffset = Math.random() * Math.PI * 2

    loadout.forEach((id, i) => {
      const angle = angleOffset + (i / Math.max(count, 1)) * Math.PI * 2
      const x = CX + Math.cos(angle) * unitRadius
      const y = CY + Math.sin(angle) * unitRadius
      this.spawnUnitAt(id, x, y)
    })
  }

  private spawnUnitAt(id: string, x: number, y: number) {
    const raw = this.cache.json.get(id) as UnitData
    if (!raw) { console.warn(`Unknown unit id: ${id}`); return }

    techState.incrementStat(`${id}_summoned`)
    checkStatQuests(this.techNodes)
    const data = applyUnitMods(raw, this.techNodes)

    const unit = new Unit(this, x, y, data)
    unit.statCallback = (event, amount) => {
      const statKey = event === 'kill' ? `${id}_kills` : `${id}_healed`
      techState.incrementStat(statKey, amount)
      checkStatQuests(this.techNodes)
    }
    this.units.push(unit)
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
    audioManager.playMusic(this, 'boss_theme')
    audioManager.playSfx(this, 'boss_warning')
    playRingPulse(this, CX, CY, ARENA_RADIUS * 0.72, 0xddaa22, 28)
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
    if (this.paused) return

    if (this.packRevealBlocking) {
      this.cursor?.update(delta, this.input.activePointer.x, this.input.activePointer.y, [])
      this.updateHUD()
      return
    }

    this.elapsed += delta / 1000
    this.waves.update(delta)

    const ptr = this.input.activePointer

    // Update enemies + collect PC on death
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]
      e.update(delta, this.tower, this.units, this.enemies)
      if (!e.alive) {
        this.runPc += Math.round(e.reward * this.pcMultiplier)
        if (e.isBoss) {
          playSparkBurst(this, e.x, e.y, 0xddaa22, { count: 22, radius: 70, duration: 740 })
          audioManager.playMusic(this, 'battle_theme')
        }
        this.maybeSpawnCrate(e.x, e.y, e.isBoss)
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

    for (let i = this.crates.length - 1; i >= 0; i--) {
      if (!this.crates[i].alive) this.crates.splice(i, 1)
    }

    this.skippedWaveThisFrame = this.shouldSkipToNextWave()
      ? this.waves.skipToNextWave()
      : false

    this.tickCursorBuffs(delta / 1000)
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
    this.hud.update({
      chapterName: this.chapterName,
      runPc: this.runPc,
      tower: this.tower,
      waves: this.waves,
      skippedWaveThisFrame: this.skippedWaveThisFrame,
      unitCount: this.units.length,
      crateCount: this.crates.length,
      cursorBuffLabel: this.cursorBuffLabel(),
      boss: this.boss,
    })
  }

  private endRun(won: boolean, abandoned = false) {
    if (this.gameOver) return
    this.gameOver = true
    this.time.delayedCall(abandoned ? 120 : won ? 600 : 800, () => {
      audioManager.playSfx(this, won ? 'victory' : abandoned ? 'ui_click' : 'defeat')
      fadeToScene(this, 'GameOverScene', {
        won,
        abandoned,
        pc: this.runPc,
        elapsed: Math.floor(this.elapsed),
        wavesCleared: this.waves.waveFired,
        totalWaves: this.waves.waveTotal,
        chapter: debugState.chapter,
        towerHp: Math.round(this.tower.hp),
        unitsAlive: this.units.length,
        campaignRunId: this.campaignRunId,
        openedUnits: this.openedUnits,
        cratesOpened: this.cratesOpened,
        crateRewards: this.crateRewards,
      }, { duration: 360 })
    })
  }

  private maybeSpawnCrate(x: number, y: number, isBoss: boolean) {
    if (!this.crateData || this.crates.length >= this.crateData.maxActive) return
    const { dropChance } = applyCrateMods(this.crateData.baseDropChance, this.techNodes)
    const chance = isBoss ? Math.min(1, dropChance * 2.5) : dropChance
    if (Math.random() >= chance) return

    this.spawnCrateAt(x, y)
  }

  private spawnCheatCrate() {
    const angle = Math.random() * Math.PI * 2
    const radius = 130 + Math.random() * 90
    this.spawnCrateAt(CX + Math.cos(angle) * radius, CY + Math.sin(angle) * radius)
  }

  private spawnCrateAt(x: number, y: number) {
    const crateKind = this.rollCrateKind()
    if (!crateKind) return
    const reward = this.rollCrateReward(crateKind)
    if (!reward) return

    const pos = this.clampCratePosition(x, y, crateKind.radius)
    this.crates.push(new Crate(this, pos.x, pos.y, crateKind, reward, crate => this.openCrate(crate)))
    playRingPulse(this, pos.x, pos.y, crateKind.radius + 8, 0xffdd77, 13)
    this.showCrateTip(pos.x, pos.y, crateKind.radius)
  }

  private rollCrateKind(): CrateKindData | null {
    const available = this.crateData.crates.filter(crate => !crate.requiresTechId || techState.has(crate.requiresTechId))
    return this.weightedPick(available, crate => crate.spawnWeight)
  }

  private rollCrateReward(crateKind: CrateKindData): CrateRewardData | null {
    return this.rollEligibleCrateReward(crateKind, null)
  }

  private rollEligibleCrateReward(crateKind: CrateKindData, currentRewardId: string | null): CrateRewardData | null {
    const rewards = new Map(this.crateData.rewards.map(reward => [reward.id, reward]))
    const available = crateKind.rewardTable
      .map(entry => ({ entry, reward: rewards.get(entry.rewardId) }))
      .filter((item): item is { entry: { rewardId: string, weight: number }, reward: CrateRewardData } =>
        item.reward !== undefined
          && item.reward.id !== currentRewardId
          && (!item.reward.requiresTechId || techState.has(item.reward.requiresTechId))
          && this.isCrateRewardUseful(item.reward)
      )
    const picked = this.weightedPick(available, item => item.entry.weight * item.reward.weight)
    return picked?.reward ?? null
  }

  private isCrateRewardUseful(reward: CrateRewardData): boolean {
    if (reward.type === 'tower_heal') return this.tower.hp < this.tower.maxHp
    if (reward.type === 'heal_all_units') return this.units.some(unit => unit.alive && unit.hp < unit.maxHp)
    if (reward.type === 'shield_all_units') return this.units.some(unit => unit.alive)
    return true
  }

  private openCrate(crate: Crate) {
    const reward = this.isCrateRewardUseful(crate.reward)
      ? crate.reward
      : this.rollEligibleCrateReward(crate.data, crate.reward.id) ?? crate.reward
    crate.reward = reward
    this.cratesOpened += 1
    this.crateRewards.push(reward.name)
    audioManager.playSfx(this, 'crate_open')
    switch (reward.type) {
      case 'tower_heal':
        this.tower.heal(reward.value)
        break
      case 'heal_all_units':
        this.units.forEach(unit => unit.heal(reward.value))
        break
      case 'random_unit':
        this.openRandomUnitReward(reward, crate.x, crate.y)
        break
      case 'cursor_damage_buff':
        this.cursorBuffs.push({ type: 'damage', value: reward.value, remaining: reward.duration ?? 8 })
        this.refreshCursorConfig()
        break
      case 'cursor_cooldown_buff':
        this.cursorBuffs.push({ type: 'cooldown', value: reward.value, remaining: reward.duration ?? 8 })
        this.refreshCursorConfig()
        break
      case 'shield_all_units':
        this.units.forEach(unit => unit.applyShield(reward.value))
        break
      case 'shield_tower':
        this.tower.applyShield(reward.value)
        break
    }
    this.showCrateReward(reward, crate.x, crate.y)
    playSparkBurst(this, crate.x, crate.y, 0xffdd77, { count: 14, radius: 42, duration: 580 })
  }

  private openRandomUnitReward(reward: CrateRewardData, x: number, y: number) {
    if (!reward.rollTable?.length) return
    const count = reward.count ?? Math.max(1, reward.value)
    for (let i = 0; i < count; i++) {
      const unitId = this.rollWeightedUnit(reward.rollTable)
      if (!unitId) continue
      const angle = Math.random() * Math.PI * 2
      const radius = 24 + i * 10
      this.spawnUnitAt(unitId, x + Math.cos(angle) * radius, y + Math.sin(angle) * radius)
    }
  }

  private rollWeightedUnit(rollTable: ShopPackRoll[]): string | null {
    return this.weightedPick(rollTable, roll => roll.weight)?.unitId ?? null
  }

  private tickCursorBuffs(dt: number) {
    let changed = false
    for (let i = this.cursorBuffs.length - 1; i >= 0; i--) {
      this.cursorBuffs[i].remaining -= dt
      if (this.cursorBuffs[i].remaining <= 0) {
        this.cursorBuffs.splice(i, 1)
        changed = true
      }
    }
    if (changed) this.refreshCursorConfig()
  }

  private cursorBuffLabel(): string {
    if (this.cursorBuffs.length === 0) return ''
    const labels = this.cursorBuffs.map(buff => {
      const remaining = `${Math.max(0, buff.remaining).toFixed(1)}s`
      if (buff.type === 'damage') return `+${buff.value} dmg ${remaining}`
      return `${Math.round(buff.value * 100)}% cd ${remaining}`
    })
    return `Cursor buffs: ${labels.join('  ')}`
  }

  private refreshCursorConfig() {
    const damageBonus = this.cursorBuffs
      .filter(buff => buff.type === 'damage')
      .reduce((sum, buff) => sum + buff.value, 0)
    const cooldownMult = this.cursorBuffs
      .filter(buff => buff.type === 'cooldown')
      .reduce((mult, buff) => mult * buff.value, 1)
    this.cursor.configure({
      ...this.baseCursorStats,
      damage: this.baseCursorStats.damage + damageBonus,
      cooldown: this.baseCursorStats.cooldown * cooldownMult,
    })
  }

  private clampCratePosition(x: number, y: number, radius: number): { x: number, y: number } {
    const maxDist = ARENA_RADIUS - radius - 8
    const dx = x - CX
    const dy = y - CY
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist <= maxDist) return { x, y }
    return {
      x: CX + (dx / Math.max(1, dist)) * maxDist,
      y: CY + (dy / Math.max(1, dist)) * maxDist,
    }
  }

  private showCrateReward(reward: CrateRewardData, x: number, y: number) {
    const text = this.add.text(x, y - 34, reward.name, {
      fontSize: '12px',
      color: '#ffe1a3',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(30)
    this.tweens.add({
      targets: text,
      y: y - 58,
      alpha: 0,
      duration: 1800,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy(),
    })
  }

  private showCombatBasicsTip() {
    const currency = currencyLabels(this)
    this.showPausedTip({
      id: 'combat_basics',
      title: 'Hold the tower',
      body: `Click enemies to strike them with the cursor. The circle around the pointer is your cooldown. Watch the left HUD for ${currency.progression.name}, tower health, waves, units, crates, and temporary cursor buffs.`,
      focus: new Phaser.Geom.Rectangle(92, 104, 716, 676),
      onClose: () => this.showHudTip(),
    })
  }

  private showHudTip() {
    const currency = currencyLabels(this)
    this.showPausedTip({
      id: 'combat_hud',
      title: 'Read the run',
      body: `This status strip shows ${currency.progression.name} earned this run, tower health, wave timing, living units, active crates, and timed cursor effects.`,
      focus: new Phaser.Geom.Rectangle(8, 8, 250, 152),
    })
  }

  private showEnemyTip(enemy: Enemy) {
    if (this.onboardingPaused) return
    this.showPausedTip({
      id: `enemy_${enemy.data.id}`,
      title: enemy.name,
      body: this.enemyTipText(enemy),
      focus: new Phaser.Geom.Rectangle(enemy.x - enemy.radius - 14, enemy.y - enemy.radius - 14, enemy.radius * 2 + 28, enemy.radius * 2 + 28),
    })
  }

  private showCrateTip(x: number, y: number, radius: number) {
    if (this.onboardingPaused) return
    this.showPausedTip({
      id: 'first_crate',
      title: 'Field crate',
      body: 'Click crates to break them open. Rewards can heal, shield, add units, or give timed cursor buffs. Buff timers appear in the left HUD.',
      focus: new Phaser.Geom.Rectangle(x - radius - 16, y - radius - 16, radius * 2 + 32, radius * 2 + 32),
    })
  }

  private showPausedTip(config: Parameters<typeof showOnboardingTip>[1]) {
    if (this.gameOver || this.packRevealBlocking || this.pauseOverlay) return
    const wasPaused = this.paused
    this.paused = true
    this.onboardingPaused = true
    const shown = showOnboardingTip(this, {
      ...config,
      onClose: () => {
        this.onboardingPaused = false
        this.paused = wasPaused
        config.onClose?.()
      },
    })
    if (!shown) {
      this.onboardingPaused = false
      this.paused = wasPaused
    }
  }

  private enemyTipText(enemy: Enemy): string {
    if (enemy.isBoss) return 'Bosses are major chapter threats. Keep clicking them, but protect the tower and use any units or crates you have left.'
    const tags = new Set(enemy.data.tags)
    if (enemy.data.behaviour === 'healer_support') return 'Support enemies heal their allies. They are high-value cursor targets when they appear.'
    if (enemy.data.behaviour === 'ranged_unit_targeter') return 'Ranged enemies pressure your squad from a distance. Click them down before they pick off key units.'
    if (enemy.data.behaviour === 'rush_tower_aoe') return 'Siege enemies splash damage around the tower. Stop them before they reach the center.'
    if (tags.has('fast')) return 'Fast enemies race toward the tower. Use cursor hits to thin them out before they slip through.'
    if (tags.has('tank')) return 'Tank enemies soak damage and slow your cleanup. Focus them before they pin your units.'
    return 'Basic melee enemies walk toward the tower. Click them while your squad holds the line.'
  }

  private togglePause() {
    if (this.onboardingPaused) return
    if (this.gameOver || this.packRevealBlocking) return
    this.paused = !this.paused
    audioManager.playSfx(this, 'ui_click')

    if (!this.paused) {
      this.pauseOverlay?.destroy()
      this.pauseOverlay = null
      return
    }

    this.pauseOverlay = createPauseOverlay(this, () => this.endRun(false, true))
  }

  private weightedPick<T>(items: T[], weightFor: (item: T) => number): T | null {
    const total = items.reduce((sum, item) => sum + weightFor(item), 0)
    if (total <= 0) return null
    let pick = Math.random() * total
    for (const item of items) {
      pick -= weightFor(item)
      if (pick <= 0) return item
    }
    return items[items.length - 1] ?? null
  }
}
