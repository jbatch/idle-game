import '../../style.css'
import { createPhaserGame } from '../../game/createPhaserGame'
import { BootScene } from '../../scenes/BootScene'
import { MenuScene } from '../../scenes/MenuScene'
import { ShopScene } from '../../scenes/ShopScene'
import { GameScene } from '../../scenes/GameScene'
import { GameOverScene } from '../../scenes/GameOverScene'
import { TechTreeScene } from '../../scenes/TechTreeScene'

createPhaserGame([BootScene, MenuScene, ShopScene, GameScene, GameOverScene, TechTreeScene])
