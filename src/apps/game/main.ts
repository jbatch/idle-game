import '../../style.css'
import { createPhaserGame } from '../../game/createPhaserGame'
import { BootScene } from '../../scenes/BootScene'
import { ShopScene } from '../../scenes/ShopScene'
import { GameScene } from '../../scenes/GameScene'
import { GameOverScene } from '../../scenes/GameOverScene'
import { TechTreeScene } from '../../scenes/TechTreeScene'

createPhaserGame([BootScene, ShopScene, GameScene, GameOverScene, TechTreeScene])
