import Phaser from 'phaser'
import { loadGameData } from '../../game/loadGameData'

export class ScenarioBootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ScenarioBootScene' })
  }

  preload() {
    loadGameData(this)
  }

  create() {
    this.scene.start('ScenarioScene')
  }
}
