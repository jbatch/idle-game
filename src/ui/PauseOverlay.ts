import Phaser from 'phaser'
import { GAME_H, GAME_W } from '../constants'
import { cssColor, uiPalette } from './palette'

export function createPauseOverlay(scene: Phaser.Scene, onAbandon: () => void): Phaser.GameObjects.Container {
  const overlay = scene.add.container(0, 0).setDepth(80)
  const shade = scene.add.rectangle(0, 0, GAME_W, GAME_H, uiPalette.surface.shade, 0.68).setOrigin(0, 0)
  const panel = scene.add.rectangle(GAME_W / 2, GAME_H / 2, 360, 164, uiPalette.surface.panel, 0.98)
  panel.setStrokeStyle(1, uiPalette.border.strong)
  const title = scene.add.text(GAME_W / 2, GAME_H / 2 - 42, 'PAUSED', {
    fontSize: '26px',
    color: cssColor(uiPalette.text.primary),
    fontFamily: 'monospace',
    fontStyle: 'bold',
  }).setOrigin(0.5)
  const hint = scene.add.text(GAME_W / 2, GAME_H / 2 + 6, 'Press P to resume', {
    fontSize: '13px',
    color: cssColor(uiPalette.text.secondary),
    fontFamily: 'monospace',
  }).setOrigin(0.5)
  const shop = scene.add.text(GAME_W / 2, GAME_H / 2 + 48, '[ END RUN ]', {
    fontSize: '13px',
    color: cssColor(0x885555),
    fontFamily: 'monospace',
  }).setOrigin(0.5).setInteractive({ useHandCursor: true })
  shop.on('pointerover', () => shop.setColor(cssColor(0xcc7777)))
  shop.on('pointerout', () => shop.setColor(cssColor(0x885555)))
  shop.on('pointerdown', onAbandon)
  overlay.add([shade, panel, title, hint, shop])
  return overlay
}
