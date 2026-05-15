import Phaser from 'phaser'
import { GAME_H, GAME_W } from '../constants'
import { onboardingState } from '../systems/OnboardingState'
import { audioManager } from '../systems/AudioManager'

type TipConfig = {
  id: string
  title: string
  body: string
  focus: Phaser.Geom.Rectangle
  onClose?: () => void
}

const PANEL_W = 330
const PANEL_H = 172

export function showOnboardingTip(scene: Phaser.Scene, config: TipConfig): boolean {
  if (!onboardingState.shouldShow(config.id)) return false

  const root = scene.add.container(0, 0).setDepth(900)
  const focus = clampFocus(config.focus)
  const shadeColor = 0x03050b
  const shadeAlpha = 0.78

  const shades = [
    scene.add.rectangle(0, 0, GAME_W, focus.y, shadeColor, shadeAlpha).setOrigin(0, 0),
    scene.add.rectangle(0, focus.y + focus.height, GAME_W, GAME_H - focus.y - focus.height, shadeColor, shadeAlpha).setOrigin(0, 0),
    scene.add.rectangle(0, focus.y, focus.x, focus.height, shadeColor, shadeAlpha).setOrigin(0, 0),
    scene.add.rectangle(focus.x + focus.width, focus.y, GAME_W - focus.x - focus.width, focus.height, shadeColor, shadeAlpha).setOrigin(0, 0),
  ]
  shades.forEach(shade => shade.setInteractive())

  const border = scene.add.rectangle(focus.centerX, focus.centerY, focus.width, focus.height, 0xffffff, 0)
  border.setStrokeStyle(3, 0xddaa22, 0.95)
  const glow = scene.add.rectangle(focus.centerX, focus.centerY, focus.width + 10, focus.height + 10, 0xffffff, 0)
  glow.setStrokeStyle(1, 0xffe1a3, 0.5)

  const panelPos = panelPosition(focus)
  const panel = scene.add.rectangle(panelPos.x, panelPos.y, PANEL_W, PANEL_H, 0x0c1224, 0.98)
  panel.setStrokeStyle(1, 0x6688cc)
  const title = scene.add.text(panel.x - PANEL_W / 2 + 18, panel.y - PANEL_H / 2 + 16, config.title.toUpperCase(), {
    fontSize: '14px',
    color: '#ddaa22',
    fontFamily: 'monospace',
    fontStyle: 'bold',
    wordWrap: { width: PANEL_W - 36 },
  }).setOrigin(0, 0)
  const body = scene.add.text(panel.x - PANEL_W / 2 + 18, panel.y - PANEL_H / 2 + 46, config.body, {
    fontSize: '12px',
    color: '#dbe4ff',
    fontFamily: 'monospace',
    lineSpacing: 4,
    wordWrap: { width: PANEL_W - 36 },
  }).setOrigin(0, 0)

  const gotIt = scene.add.rectangle(panel.x + PANEL_W / 2 - 70, panel.y + PANEL_H / 2 - 28, 104, 30, 0x1d5737)
    .setInteractive({ useHandCursor: true })
  gotIt.setStrokeStyle(1, 0x7cff9f)
  const gotItText = scene.add.text(gotIt.x, gotIt.y, 'GOT IT', {
    fontSize: '12px',
    color: '#dbe4ff',
    fontFamily: 'monospace',
    fontStyle: 'bold',
  }).setOrigin(0.5)

  const skip = scene.add.text(panel.x - PANEL_W / 2 + 18, panel.y + PANEL_H / 2 - 36, 'SKIP TIPS', {
    fontSize: '11px',
    color: '#61739f',
    fontFamily: 'monospace',
  }).setInteractive({ useHandCursor: true }).setOrigin(0, 0)

  const close = (skipAll: boolean) => {
    audioManager.playSfx(scene, 'ui_click')
    if (skipAll) onboardingState.skipAll()
    onboardingState.complete(config.id)
    root.destroy(true)
    config.onClose?.()
  }

  gotIt.on('pointerover', () => gotIt.setFillStyle(0x27764a))
  gotIt.on('pointerout', () => gotIt.setFillStyle(0x1d5737))
  gotIt.on('pointerdown', () => close(false))
  skip.on('pointerover', () => skip.setColor('#9eb2e8'))
  skip.on('pointerout', () => skip.setColor('#61739f'))
  skip.on('pointerdown', () => close(true))

  root.add([...shades, glow, border, panel, title, body, gotIt, gotItText, skip])
  scene.tweens.add({ targets: [border, glow], alpha: 0.42, yoyo: true, repeat: -1, duration: 760 })
  return true
}

function clampFocus(rect: Phaser.Geom.Rectangle): Phaser.Geom.Rectangle {
  const x = Phaser.Math.Clamp(rect.x, 8, GAME_W - 24)
  const y = Phaser.Math.Clamp(rect.y, 8, GAME_H - 24)
  const width = Phaser.Math.Clamp(rect.width, 24, GAME_W - x - 8)
  const height = Phaser.Math.Clamp(rect.height, 24, GAME_H - y - 8)
  return new Phaser.Geom.Rectangle(x, y, width, height)
}

function panelPosition(focus: Phaser.Geom.Rectangle): { x: number, y: number } {
  const preferRight = focus.centerX < GAME_W / 2
  const x = preferRight
    ? Math.min(GAME_W - PANEL_W / 2 - 18, focus.right + PANEL_W / 2 + 28)
    : Math.max(PANEL_W / 2 + 18, focus.left - PANEL_W / 2 - 28)
  const y = Phaser.Math.Clamp(focus.centerY, PANEL_H / 2 + 18, GAME_H - PANEL_H / 2 - 18)
  return { x, y }
}
