import Phaser from 'phaser'
import { loadGameData } from '../game/loadGameData'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload() {
    loadGameData(this)
  }

  create() {
    this.scene.start('ShopScene')
  }
}
