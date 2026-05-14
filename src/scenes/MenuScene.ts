import Phaser from 'phaser'
import { GAME_H, GAME_W, CX, CY, ARENA_RADIUS } from '../constants'
import { audioManager } from '../systems/AudioManager'
import { techState } from '../systems/TechState'
import { debugState } from '../debug/DebugState'
import { clearDraftShopPacks } from './ShopScene'
import { playRingPulse, playSparkBurst } from '../effects/CombatEffects'
import { fadeInScene, fadeToScene } from '../ui/sceneTransitions'

const VERSION_LABEL = 'v0.2.1 tech tree layout'

export class MenuScene extends Phaser.Scene {
  private orbiters: Phaser.GameObjects.Arc[] = []

  constructor() {
    super({ key: 'MenuScene' })
  }

  create() {
    fadeInScene(this, 320)
    audioManager.playMusic(this, 'menu_theme')

    this.orbiters = []
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x070912).setOrigin(0, 0)
    this.buildBackground()
    this.buildTitle()
    this.buildButtons()
    this.time.delayedCall(280, () => playRingPulse(this, CX, CY + 20, 84, 0x4466bb, 4))
  }

  update(time: number) {
    this.orbiters.forEach((orbiter, index) => {
      const angle = time * (0.00018 + index * 0.000035) + index * 1.7
      const radius = 145 + index * 38
      orbiter.setPosition(CX + Math.cos(angle) * radius, CY + 30 + Math.sin(angle) * radius * 0.58)
    })
  }

  private buildBackground() {
    const g = this.add.graphics()
    g.fillStyle(0x0c1020, 1)
    g.fillCircle(CX, CY + 30, ARENA_RADIUS)
    g.lineStyle(2, 0x223366, 0.82)
    g.strokeCircle(CX, CY + 30, ARENA_RADIUS)

    for (let r = 90; r < ARENA_RADIUS; r += 70) {
      g.lineStyle(1, 0x182446, 0.55)
      g.strokeCircle(CX, CY + 30, r)
    }

    for (let i = 0; i < 5; i++) {
      const orbiter = this.add.circle(CX, CY, 3 + i, i % 2 === 0 ? 0xddaa22 : 0x6688cc, 0.45).setDepth(3)
      this.orbiters.push(orbiter)
    }
  }

  private buildTitle() {
    this.add.text(GAME_W / 2, 126, 'SIEGELOOP', {
      fontSize: '56px',
      color: '#dbe4ff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#12182d',
      strokeThickness: 6,
    }).setOrigin(0.5)

    this.add.text(GAME_W / 2, 180, 'build the squad, hold the tower, spend the spoils', {
      fontSize: '14px',
      color: '#7f91c7',
      fontFamily: 'monospace',
    }).setOrigin(0.5)

    this.add.text(GAME_W / 2, GAME_H - 24, `${VERSION_LABEL}   PC bank: ${techState.pc}`, {
      fontSize: '11px',
      color: '#3d4c76',
      fontFamily: 'monospace',
    }).setOrigin(0.5)
  }

  private buildButtons() {
    const hasSave = techState.hasProgress()
    const y = hasSave ? 292 : 310

    if (hasSave) {
      this.addButton(GAME_W / 2, y, 'CONTINUE RUN', () => {
        this.enterShop(y)
      }, true)

      this.addButton(GAME_W / 2, y + 58, 'START RUN', () => {
        techState.reset()
        clearDraftShopPacks()
        debugState.chapter = 'chapter1'
        this.enterShop(y + 58)
      })
    } else {
      this.addButton(GAME_W / 2, y, 'START RUN', () => {
        this.enterShop(y)
      }, true)
    }

    this.addButton(GAME_W / 2, y + (hasSave ? 116 : 58), 'HOW TO PLAY', () => {
      audioManager.playSfx(this, 'ui_click')
      this.showHowToPlay()
    })
  }

  private enterShop(y: number) {
    playSparkBurst(this, GAME_W / 2, y, 0xddaa22, { count: 14, radius: 46 })
    fadeToScene(this, 'ShopScene', undefined, { sfx: 'ui_click' })
  }

  private addButton(x: number, y: number, label: string, onClick: () => void, primary = false) {
    const width = primary ? 230 : 190
    const bg = this.add.rectangle(x, y, width, 38, primary ? 0x173263 : 0x10182e)
      .setInteractive({ useHandCursor: true })
    bg.setStrokeStyle(1, primary ? 0x6688cc : 0x263a66)

    const text = this.add.text(x, y, label, {
      fontSize: primary ? '17px' : '14px',
      color: primary ? '#dbe4ff' : '#9eb2e8',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    bg.on('pointerover', () => {
      audioManager.playSfx(this, 'ui_hover', 0.35)
      bg.setFillStyle(primary ? 0x204580 : 0x172341)
      text.setColor('#ffffff')
    })
    bg.on('pointerout', () => {
      bg.setFillStyle(primary ? 0x173263 : 0x10182e)
      text.setColor(primary ? '#dbe4ff' : '#9eb2e8')
    })
    bg.on('pointerdown', onClick)
  }

  private showHowToPlay() {
    const shade = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x02040a, 0.72).setOrigin(0, 0).setDepth(40)
    const panel = this.add.rectangle(GAME_W / 2, GAME_H / 2, 570, 330, 0x0c1224, 0.98).setDepth(41)
    panel.setStrokeStyle(1, 0x35508c)

    const title = this.add.text(GAME_W / 2, GAME_H / 2 - 126, 'THE LOOP', {
      fontSize: '22px',
      color: '#dbe4ff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(42)

    const lines = [
      '1. Spend DC on unopened packs before each run.',
      '2. Packs open at battle start and roll your squad.',
      '3. Click enemies and crates while your units defend the tower.',
      '4. Earn PC, buy tech, unlock stronger packs and chapters.',
    ]

    const body = this.add.text(GAME_W / 2, GAME_H / 2 - 56, lines.join('\n\n'), {
      fontSize: '15px',
      color: '#aebce8',
      fontFamily: 'monospace',
      align: 'left',
      lineSpacing: 4,
    }).setOrigin(0.5, 0).setDepth(42)

    const hint = this.add.text(GAME_W / 2, GAME_H / 2 + 106, 'Demo note: graphics are placeholder, the loop is the slice.', {
      fontSize: '12px',
      color: '#5f719e',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(42)

    const close = this.add.text(GAME_W / 2, GAME_H / 2 + 142, '[ GOT IT ]', {
      fontSize: '16px',
      color: '#ddaa22',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(42).setInteractive({ useHandCursor: true })

    const items = [shade, panel, title, body, hint, close]
    close.on('pointerover', () => close.setColor('#ffe1a3'))
    close.on('pointerout', () => close.setColor('#ddaa22'))
    close.on('pointerdown', () => {
      audioManager.playSfx(this, 'ui_click')
      items.forEach(item => item.destroy())
    })
  }
}
