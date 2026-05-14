import Phaser from 'phaser'
import { loadGameData, loadUnitDataFromManifest } from '../game/loadGameData'
import { audioManager } from '../systems/AudioManager'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload() {
    loadGameData(this)
    audioManager.preload(this)
  }

  create() {
    loadUnitDataFromManifest(this, () => this.scene.start('MenuScene'))
  }
}
