import Phaser from 'phaser'
import { techState } from '../systems/TechState'
import { campaignLog, type CampaignPackRollLog } from '../systems/CampaignLog'
import { GAME_W, GAME_H } from '../constants'
import { debugState } from '../debug/DebugState'
import { audioManager } from '../systems/AudioManager'
import { playRingPulse, playSparkBurst } from '../effects/CombatEffects'
import { fadeInScene, fadeToScene } from '../ui/sceneTransitions'
import { cssColor, uiPalette } from '../ui/palette'

interface RunResult {
  won: boolean
  abandoned?: boolean
  pc: number
  elapsed: number
  wavesCleared: number
  totalWaves: number
  chapter: string
  towerHp: number
  unitsAlive: number
  campaignRunId?: string
  openedUnits: CampaignPackRollLog[]
  cratesOpened?: number
  crateRewards?: string[]
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' })
  }

  create(data: RunResult) {
    fadeInScene(this)
    audioManager.playMusic(this, 'shop_theme')
    // Persist PC and quests
    techState.addPc(data.pc)
    if (data.won) {
      techState.completeQuest(`boss_${data.chapter}_killed`)
      debugState.chapter = this.nextChapterId(data.chapter)
    }
    campaignLog.completeRun(data.campaignRunId, {
      won: data.won,
      abandoned: Boolean(data.abandoned),
      pcEarned: data.pc,
      pcAfter: techState.pc,
      elapsed: data.elapsed,
      wavesCleared: data.wavesCleared,
      totalWaves: data.totalWaves,
      towerHp: data.towerHp,
      unitsAlive: data.unitsAlive,
      openedUnits: data.openedUnits ?? [],
    })

    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, uiPalette.surface.shade, 0.75)

    const titleText = data.won ? 'CHAPTER COMPLETE' : data.abandoned ? 'RUN ABANDONED' : 'TOWER DESTROYED'
    const titleColor = cssColor(data.won ? uiPalette.state.success : data.abandoned ? uiPalette.state.warning : uiPalette.state.danger)

    this.add.text(GAME_W / 2, GAME_H / 2 - 110, titleText, {
      fontSize: '38px', color: titleColor, fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5)
    playRingPulse(this, GAME_W / 2, GAME_H / 2 - 108, data.won ? 86 : 70, data.won ? uiPalette.state.success : data.abandoned ? uiPalette.state.warning : uiPalette.state.danger, 10)
    if (data.won) playSparkBurst(this, GAME_W / 2, GAME_H / 2 - 108, uiPalette.state.success, { count: 20, radius: 90 })

    const mins = Math.floor(data.elapsed / 60)
    const secs = data.elapsed % 60
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`

    const stats = [
      `PC earned:    ${data.pc}  (total: ${techState.pc})`,
      `Survived:     ${timeStr}`,
      `Waves:        ${data.wavesCleared} / ${data.totalWaves}`,
      `Units alive:  ${data.unitsAlive}`,
      `Crates:       ${data.cratesOpened ?? 0}`,
    ]

    stats.forEach((line, i) => {
      this.add.text(GAME_W / 2, GAME_H / 2 - 42 + i * 24, line, {
        fontSize: '16px', color: cssColor(uiPalette.text.secondary), fontFamily: 'monospace',
      }).setOrigin(0.5)
    })

    const unlockMessage = this.unlockMessage(data.chapter)
    if (data.won && unlockMessage) {
      this.add.text(GAME_W / 2, GAME_H / 2 + 92, unlockMessage, {
        fontSize: '14px', color: cssColor(uiPalette.state.reward), fontFamily: 'monospace',
      }).setOrigin(0.5)
    }

    const rewards = this.rewardSummary(data.crateRewards ?? [])
    const next = this.nextStep(data)
    this.add.text(GAME_W / 2, GAME_H / 2 + 122, rewards ? `Crate rewards: ${rewards}` : next, {
      fontSize: '12px', color: cssColor(rewards ? uiPalette.state.rewardHover : uiPalette.text.muted), fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5)

    const techBtn = this.add.text(GAME_W / 2, GAME_H / 2 + 168, '[ SPEND PC IN TECH TREE ]', {
      fontSize: '22px', color: cssColor(uiPalette.state.reward), fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    techBtn.on('pointerover', () => techBtn.setColor(cssColor(uiPalette.state.rewardHover)))
    techBtn.on('pointerout',  () => techBtn.setColor(cssColor(uiPalette.state.reward)))
    techBtn.on('pointerdown', () => fadeToScene(this, 'TechTreeScene', undefined, { sfx: 'ui_click' }))

    const btn = this.add.text(GAME_W / 2, GAME_H / 2 + 204, '[ RETURN TO SHOP ]', {
      fontSize: '14px', color: cssColor(uiPalette.action.link), fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    btn.on('pointerover', () => btn.setColor(cssColor(uiPalette.action.linkHover)))
    btn.on('pointerout',  () => btn.setColor(cssColor(uiPalette.action.link)))
    btn.on('pointerdown', () => fadeToScene(this, 'ShopScene', undefined, { sfx: 'ui_click' }))
  }

  private unlockMessage(chapter: string): string {
    if (chapter === 'chapter1') return '★  Chapter 2 unlocked  ★'
    if (chapter === 'chapter2') return '★  Chapter 3 unlocked  ★'
    if (chapter === 'chapter3') return '★  All chapters complete  ★'
    return ''
  }

  private nextChapterId(chapter: string): string {
    if (chapter === 'chapter1') return 'chapter2'
    if (chapter === 'chapter2') return 'chapter3'
    return chapter
  }

  private rewardSummary(rewards: string[]): string {
    if (rewards.length === 0) return ''
    const counts = rewards.reduce<Record<string, number>>((acc, reward) => {
      acc[reward] = (acc[reward] ?? 0) + 1
      return acc
    }, {})
    return Object.entries(counts)
      .map(([reward, count]) => `${reward} x${count}`)
      .join(', ')
  }

  private nextStep(data: RunResult): string {
    if (data.abandoned) return data.pc > 0 ? 'Run ended early. Bank the PC, then regroup in the shop.' : 'Run ended early. Adjust packs and try again.'
    if (data.pc > 0) return 'Next: spend PC, buy packs, try a stronger run.'
    return data.won ? 'Next: try the newly unlocked chapter.' : 'Next: adjust packs and hold a little longer.'
  }
}
