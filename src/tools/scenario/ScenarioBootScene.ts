import Phaser from 'phaser'
import { loadGameData, loadUnitDataFromManifest } from '../../game/loadGameData'

export class ScenarioBootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ScenarioBootScene' })
  }

  preload() {
    loadGameData(this)
  }

  create() {
    loadUnitDataFromManifest(this, () => this.scene.start('ScenarioScene'))
  }
}
