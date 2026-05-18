import Phaser from 'phaser'
import { GAME_W } from '../constants'
import type { Enemy } from '../entities/Enemy'
import type { Tower } from '../entities/Tower'
import type { WaveManager } from '../systems/WaveManager'
import { cssColor, uiPalette } from './palette'
import { currencyLabels, type CurrencyLabels } from './currency'

export type CombatHudState = {
  chapterName: string
  runPc: number
  tower: Tower
  waves: WaveManager
  skippedWaveThisFrame: boolean
  unitCount: number
  crateCount: number
  cursorBuffLabel: string
  cursorCombo: {
    combo: number
    maxCombo: number
    multiplier: number
  }
  boss: Enemy | null
}

export class CombatHud {
  private hudText: Phaser.GameObjects.Text
  private bossBarGfx: Phaser.GameObjects.Graphics
  private bossLabel: Phaser.GameObjects.Text
  private currency: CurrencyLabels

  constructor(scene: Phaser.Scene) {
    this.currency = currencyLabels(scene)
    this.hudText = scene.add.text(10, 10, '', {
      fontSize: '13px', color: cssColor(uiPalette.text.secondary), fontFamily: 'monospace',
    }).setDepth(20)

    this.bossBarGfx = scene.add.graphics().setDepth(20)
    this.bossLabel = scene.add.text(GAME_W / 2, 28, '', {
      fontSize: '12px', color: cssColor(uiPalette.state.reward), fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(21)
  }

  update(state: CombatHudState): void {
    const timeToNext = state.waves.timeToNext
    const waveStr = state.waves.eventsComplete
      ? 'All waves cleared'
      : state.waves.nextIsBoss
        ? `BOSS IN ${timeToNext !== null ? timeToNext.toFixed(1) : '?'}s`
        : `Wave ${state.waves.waveFired + 1}/${state.waves.waveTotal}  next: ${timeToNext !== null ? timeToNext.toFixed(1) : '?'}s`

    this.hudText.setText([
      `${state.chapterName}`,
      `${this.currency.progression.icon} ${this.currency.progression.name}: ${state.runPc}`,
      `Tower: ${Math.round(state.tower.hp)} / ${state.tower.maxHp}${this.shieldLabel(state.tower)}`,
      state.skippedWaveThisFrame ? `${waveStr}  (advanced)` : waveStr,
      state.unitCount > 0 ? `Units: ${state.unitCount}` : '',
      state.crateCount > 0 ? `Crates: ${state.crateCount}` : '',
      state.cursorCombo.combo > 0
        ? `Combo: ${state.cursorCombo.combo}/${state.cursorCombo.maxCombo}  x${state.cursorCombo.multiplier.toFixed(2)} dmg${state.cursorCombo.combo >= state.cursorCombo.maxCombo ? '  MAX' : ''}`
        : '',
      'P: pause',
      state.cursorBuffLabel,
    ])

    this.bossBarGfx.clear()
    if (!state.boss) {
      this.bossLabel.setText('')
      return
    }

    const barW = 180
    const barH = 10
    const bx = GAME_W / 2 - barW / 2
    const by = 38
    const frac = state.boss.hp / state.boss.maxHp
    this.bossBarGfx.fillStyle(0x221100, 1)
    this.bossBarGfx.fillRect(bx, by, barW, barH)
    this.bossBarGfx.fillStyle(uiPalette.state.reward, 1)
    this.bossBarGfx.fillRect(bx + 1, by + 1, (barW - 2) * frac, barH - 2)
    this.bossBarGfx.lineStyle(1, 0x886600, 1)
    this.bossBarGfx.strokeRect(bx, by, barW, barH)
    this.bossLabel.setText(`${state.boss.name}  ${state.boss.hp} / ${state.boss.maxHp}`)
  }

  private shieldLabel(tower: Tower): string {
    if (tower.shieldCapacity <= 0 && tower.shield <= 0) return ''
    const capacity = tower.shieldCapacity > 0 ? `/${Math.round(tower.shieldCapacity)}` : ''
    return `  Shield: ${Math.round(tower.shield)}${capacity}`
  }
}
