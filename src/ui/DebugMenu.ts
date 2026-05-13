import Phaser from 'phaser'
import { GAME_W } from '../constants'

const PANEL_W = 210
const PANEL_PAD = 12
const BTN_H = 34
const BTN_GAP = 6
const OPEN_X = GAME_W - PANEL_W - 8
const CLOSED_X = GAME_W + 4

export interface DebugToggle {
  label: string
  active?: boolean
  onToggle?: (active: boolean) => void
  onPress?: () => void
}

export class DebugMenu {
  private container: Phaser.GameObjects.Container
  private isOpen: boolean = false

  constructor(scene: Phaser.Scene, toggles: DebugToggle[]) {
    const panelH = PANEL_PAD * 2 + 26 + toggles.length * (BTN_H + BTN_GAP) - BTN_GAP

    this.container = scene.add.container(CLOSED_X, 8).setDepth(100)

    // Panel background
    const bg = scene.add.rectangle(0, 0, PANEL_W, panelH, 0x080810, 0.96).setOrigin(0, 0)
    const border = scene.add.graphics()
    border.lineStyle(1, 0x334466, 1)
    border.strokeRect(0, 0, PANEL_W, panelH)
    border.lineStyle(1, 0x4455aa, 1)
    border.strokeRect(1, 1, PANEL_W - 2, panelH - 2)

    const title = scene.add.text(PANEL_PAD, PANEL_PAD, 'DEBUG MENU', {
      fontSize: '11px', color: '#6677bb', fontFamily: 'monospace', fontStyle: 'bold',
    })

    this.container.add([bg, border, title])

    toggles.forEach((t, i) => {
      const y = PANEL_PAD + 22 + i * (BTN_H + BTN_GAP)
      this.buildButton(scene, t, y)
    })

    // Key listener — backtick to toggle
    scene.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      if (e.key === '`') this.toggle(scene)
    })
  }

  private buildButton(scene: Phaser.Scene, toggle: DebugToggle, y: number) {
    const activeBg  = 0x0e2211
    const inactiveBg = 0x0e0e1e
    const actionBg = 0x181321
    const activeHover  = 0x163318
    const inactiveHover = 0x16162e
    const actionHover = 0x241a31
    const isAction = Boolean(toggle.onPress)

    const btn = scene.add.rectangle(
      PANEL_PAD, y,
      PANEL_W - PANEL_PAD * 2, BTN_H,
      isAction ? actionBg : toggle.active ? activeBg : inactiveBg
    ).setOrigin(0, 0).setInteractive({ useHandCursor: true })

    const lbl = scene.add.text(PANEL_PAD + 8, y + BTN_H / 2, toggle.label, {
      fontSize: '12px', color: '#aaaacc', fontFamily: 'monospace',
    }).setOrigin(0, 0.5)

    const ind = scene.add.text(PANEL_W - PANEL_PAD - 8, y + BTN_H / 2,
      isAction ? 'RUN' : toggle.active ? 'ON' : 'OFF', {
        fontSize: '11px',
        color: isAction ? '#ddaa22' : toggle.active ? '#44ff88' : '#554444',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }
    ).setOrigin(1, 0.5)

    btn.on('pointerover', () => btn.setFillStyle(isAction ? actionHover : toggle.active ? activeHover : inactiveHover))
    btn.on('pointerout', () =>
      btn.setFillStyle(isAction ? actionBg : toggle.active ? activeBg : inactiveBg)
    )
    btn.on('pointerdown', () => {
      if (isAction) {
        toggle.onPress?.()
        return
      }
      toggle.active = !toggle.active
      btn.setFillStyle(toggle.active ? activeBg : inactiveBg)
      ind.setText(toggle.active ? 'ON' : 'OFF')
      ind.setColor(toggle.active ? '#44ff88' : '#554444')
      toggle.onToggle?.(toggle.active)
    })

    this.container.add([btn, lbl, ind])
  }

  toggle(scene: Phaser.Scene) {
    this.isOpen = !this.isOpen
    scene.tweens.add({
      targets: this.container,
      x: this.isOpen ? OPEN_X : CLOSED_X,
      duration: 180,
      ease: 'Power2',
    })
  }

  destroy() {
    this.container.destroy()
  }
}
