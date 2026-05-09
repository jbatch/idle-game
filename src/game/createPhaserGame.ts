import Phaser from 'phaser'
import { GAME_H, GAME_W } from '../constants'

export type GameParent = string | HTMLElement

export function createPhaserGame(
  scenes: Phaser.Types.Scenes.SceneType[],
  parent: GameParent = document.body,
): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_W,
    height: GAME_H,
    backgroundColor: '#0a0a0f',
    scene: scenes,
    parent,
  }

  return new Phaser.Game(config)
}
