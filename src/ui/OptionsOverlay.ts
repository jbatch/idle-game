import Phaser from 'phaser'
import { GAME_H, GAME_W } from '../constants'
import { audioManager, type AudioSettings } from '../systems/AudioManager'
import { cssColor, uiPalette } from './palette'

type SliderRow = {
  label: Phaser.GameObjects.Text
  track: Phaser.GameObjects.Rectangle
  fill: Phaser.GameObjects.Rectangle
  knob: Phaser.GameObjects.Rectangle
  valueText: Phaser.GameObjects.Text
  channel: keyof AudioSettings
}

export function showOptionsOverlay(scene: Phaser.Scene, onClose?: () => void): Phaser.GameObjects.Container {
  const overlay = scene.add.container(0, 0).setDepth(120)
  const shade = scene.add.rectangle(0, 0, GAME_W, GAME_H, uiPalette.surface.shade, 0.74).setOrigin(0, 0)
  const panel = scene.add.rectangle(GAME_W / 2, GAME_H / 2, 460, 340, uiPalette.surface.panel, 0.98)
  panel.setStrokeStyle(1, uiPalette.border.strong)

  const title = scene.add.text(GAME_W / 2, GAME_H / 2 - 130, 'OPTIONS', {
    fontSize: '24px',
    color: cssColor(uiPalette.text.primary),
    fontFamily: 'monospace',
    fontStyle: 'bold',
  }).setOrigin(0.5)

  const rows: SliderRow[] = [
    buildSlider(scene, 'MASTER', 'master', GAME_H / 2 - 66),
    buildSlider(scene, 'MUSIC', 'music', GAME_H / 2 + 4),
    buildSlider(scene, 'SFX', 'sfx', GAME_H / 2 + 74),
  ]

  const close = scene.add.text(GAME_W / 2, GAME_H / 2 + 138, '[ CLOSE ]', {
    fontSize: '15px',
    color: cssColor(uiPalette.state.reward),
    fontFamily: 'monospace',
    fontStyle: 'bold',
  }).setOrigin(0.5).setInteractive({ useHandCursor: true })

  overlay.add([shade, panel, title, close])
  rows.forEach(row => overlay.add([row.label, row.track, row.fill, row.knob, row.valueText]))

  const updateRow = (row: SliderRow, value: number) => {
    const clamped = Phaser.Math.Clamp(value, 0, 1)
    audioManager.setVolume(row.channel, clamped)
    row.fill.width = 220 * clamped
    row.knob.x = row.track.x - 110 + 220 * clamped
    row.valueText.setText(`${Math.round(clamped * 100)}%`)
  }

  rows.forEach(row => {
    updateRow(row, audioManager.getSettings()[row.channel])
    const setFromPointer = (pointer: Phaser.Input.Pointer) => {
      const value = (pointer.x - (row.track.x - 110)) / 220
      updateRow(row, value)
    }
    row.track.on('pointerdown', setFromPointer)
    row.fill.on('pointerdown', setFromPointer)
    row.knob.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
      updateRow(row, (dragX - (row.track.x - 110)) / 220)
    })
  })

  close.on('pointerover', () => close.setColor('#ffe1a3'))
  close.on('pointerout', () => close.setColor(cssColor(uiPalette.state.reward)))
  close.on('pointerdown', () => {
    audioManager.playSfx(scene, 'ui_click')
    overlay.destroy(true)
    onClose?.()
  })

  return overlay
}

function buildSlider(scene: Phaser.Scene, label: string, channel: keyof AudioSettings, y: number): SliderRow {
  const x = GAME_W / 2
  const labelText = scene.add.text(x - 156, y - 20, label, {
    fontSize: '13px',
    color: cssColor(uiPalette.text.secondary),
    fontFamily: 'monospace',
    fontStyle: 'bold',
  }).setOrigin(0, 0.5)

  const track = scene.add.rectangle(x, y + 8, 220, 8, 0x172341, 1)
    .setInteractive({ useHandCursor: true })
  track.setStrokeStyle(1, uiPalette.border.soft)

  const fill = scene.add.rectangle(x - 110, y + 8, 1, 8, uiPalette.state.reward, 1)
    .setOrigin(0, 0.5)
    .setInteractive({ useHandCursor: true })

  const knob = scene.add.rectangle(x - 110, y + 8, 12, 24, 0xdbe4ff, 1)
    .setInteractive({ draggable: true, useHandCursor: true })
  knob.setStrokeStyle(1, 0x0b1020)
  scene.input.setDraggable(knob)

  const valueText = scene.add.text(x + 146, y + 8, '0%', {
    fontSize: '13px',
    color: cssColor(uiPalette.text.primary),
    fontFamily: 'monospace',
  }).setOrigin(0, 0.5)

  return { label: labelText, track, fill, knob, valueText, channel }
}
