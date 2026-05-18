import Phaser from 'phaser'
import { GAME_H, GAME_W } from '../constants'
import { cssColor, uiPalette } from './palette'
import { audioManager } from '../systems/AudioManager'
import { showOptionsOverlay } from './OptionsOverlay'

export function createPauseOverlay(scene: Phaser.Scene, onAbandon: () => void): Phaser.GameObjects.Container {
  const overlay = scene.add.container(0, 0).setDepth(80)
  const shade = scene.add.rectangle(0, 0, GAME_W, GAME_H, uiPalette.surface.shade, 0.68).setOrigin(0, 0)
  const panel = scene.add.rectangle(GAME_W / 2, GAME_H / 2, 360, 204, uiPalette.surface.panel, 0.98)
  panel.setStrokeStyle(1, uiPalette.border.strong)
  const title = scene.add.text(GAME_W / 2, GAME_H / 2 - 62, 'PAUSED', {
    fontSize: '26px',
    color: cssColor(uiPalette.text.primary),
    fontFamily: 'monospace',
    fontStyle: 'bold',
  }).setOrigin(0.5)
  const hint = scene.add.text(GAME_W / 2, GAME_H / 2 - 14, 'Press P to resume', {
    fontSize: '13px',
    color: cssColor(uiPalette.text.secondary),
    fontFamily: 'monospace',
  }).setOrigin(0.5)
  const options = scene.add.text(GAME_W / 2, GAME_H / 2 + 32, '[ OPTIONS ]', {
    fontSize: '13px',
    color: cssColor(uiPalette.state.reward),
    fontFamily: 'monospace',
    fontStyle: 'bold',
  }).setOrigin(0.5).setInteractive({ useHandCursor: true })
  options.on('pointerover', () => options.setColor('#ffe1a3'))
  options.on('pointerout', () => options.setColor(cssColor(uiPalette.state.reward)))
  options.on('pointerdown', () => {
    audioManager.playSfx(scene, 'ui_click')
    showOptionsOverlay(scene)
  })

  const shop = scene.add.text(GAME_W / 2, GAME_H / 2 + 74, '[ END RUN ]', {
    fontSize: '13px',
    color: cssColor(0x885555),
    fontFamily: 'monospace',
  }).setOrigin(0.5).setInteractive({ useHandCursor: true })
  shop.on('pointerover', () => shop.setColor(cssColor(0xcc7777)))
  shop.on('pointerout', () => shop.setColor(cssColor(0x885555)))
  shop.on('pointerdown', onAbandon)
  overlay.add([shade, panel, title, hint, options, shop])
  return overlay
}
