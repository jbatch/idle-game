import Phaser from 'phaser'
import { GAME_H, GAME_W } from '../constants'
import { fadeToScene } from './sceneTransitions'

export function createPauseOverlay(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const overlay = scene.add.container(0, 0).setDepth(80)
  const shade = scene.add.rectangle(0, 0, GAME_W, GAME_H, 0x02040a, 0.68).setOrigin(0, 0)
  const panel = scene.add.rectangle(GAME_W / 2, GAME_H / 2, 360, 164, 0x0c1224, 0.98)
  panel.setStrokeStyle(1, 0x35508c)
  const title = scene.add.text(GAME_W / 2, GAME_H / 2 - 42, 'PAUSED', {
    fontSize: '26px',
    color: '#dbe4ff',
    fontFamily: 'monospace',
    fontStyle: 'bold',
  }).setOrigin(0.5)
  const hint = scene.add.text(GAME_W / 2, GAME_H / 2 + 6, 'Press P to resume', {
    fontSize: '13px',
    color: '#8fa3d4',
    fontFamily: 'monospace',
  }).setOrigin(0.5)
  const shop = scene.add.text(GAME_W / 2, GAME_H / 2 + 48, '[ ABANDON TO SHOP ]', {
    fontSize: '13px',
    color: '#885555',
    fontFamily: 'monospace',
  }).setOrigin(0.5).setInteractive({ useHandCursor: true })
  shop.on('pointerover', () => shop.setColor('#cc7777'))
  shop.on('pointerout', () => shop.setColor('#885555'))
  shop.on('pointerdown', () => fadeToScene(scene, 'ShopScene', undefined, { sfx: 'ui_click' }))
  overlay.add([shade, panel, title, hint, shop])
  return overlay
}
