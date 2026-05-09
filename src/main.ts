import './style.css'
import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { ShopScene } from './scenes/ShopScene'
import { GameScene } from './scenes/GameScene'
import { GameOverScene } from './scenes/GameOverScene'
import { TechTreeScene } from './scenes/TechTreeScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 900,
  height: 900,
  backgroundColor: '#0a0a0f',
  scene: [BootScene, ShopScene, GameScene, GameOverScene, TechTreeScene],
  parent: document.body,
}

new Phaser.Game(config)
