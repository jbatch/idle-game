import Phaser from 'phaser'
import { techState } from '../systems/TechState'
import { GAME_W, GAME_H } from '../constants'

interface RunResult {
  won: boolean
  pc: number
  elapsed: number
  wavesCleared: number
  totalWaves: number
  chapter: string
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' })
  }

  create(data: RunResult) {
    // Persist PC and quests
    techState.addPc(data.pc)
    if (data.won) {
      techState.completeQuest(`boss_${data.chapter}_killed`)
    }

    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.75)

    const titleText = data.won ? 'CHAPTER COMPLETE' : 'TOWER DESTROYED'
    const titleColor = data.won ? '#44cc88' : '#cc3333'

    this.add.text(GAME_W / 2, GAME_H / 2 - 110, titleText, {
      fontSize: '38px', color: titleColor, fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5)

    const mins = Math.floor(data.elapsed / 60)
    const secs = data.elapsed % 60
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`

    const stats = [
      `PC earned:    ${data.pc}  (total: ${techState.pc})`,
      `Survived:     ${timeStr}`,
      `Waves:        ${data.wavesCleared} / ${data.totalWaves}`,
    ]

    stats.forEach((line, i) => {
      this.add.text(GAME_W / 2, GAME_H / 2 - 30 + i * 28, line, {
        fontSize: '16px', color: '#aaaacc', fontFamily: 'monospace',
      }).setOrigin(0.5)
    })

    const unlockMessage = this.unlockMessage(data.chapter)
    if (data.won && unlockMessage) {
      this.add.text(GAME_W / 2, GAME_H / 2 + 60, unlockMessage, {
        fontSize: '14px', color: '#ddaa22', fontFamily: 'monospace',
      }).setOrigin(0.5)
    }

    const btn = this.add.text(GAME_W / 2, GAME_H / 2 + 110, '[ RETURN TO SHOP ]', {
      fontSize: '22px', color: '#4466ff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    btn.on('pointerover', () => btn.setColor('#88aaff'))
    btn.on('pointerout',  () => btn.setColor('#4466ff'))
    btn.on('pointerdown', () => this.scene.start('ShopScene'))
  }

  private unlockMessage(chapter: string): string {
    if (chapter === 'chapter1') return '★  Chapter 2 unlocked  ★'
    if (chapter === 'chapter2') return '★  Chapter 3 unlocked  ★'
    if (chapter === 'chapter3') return '★  All chapters complete  ★'
    return ''
  }
}
