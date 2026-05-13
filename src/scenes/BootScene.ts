import Phaser from 'phaser'
import { loadGameData, loadUnitDataFromManifest } from '../game/loadGameData'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload() {
    loadGameData(this)
  }

  create() {
    loadUnitDataFromManifest(this, () => this.scene.start('ShopScene'))
  }
}
