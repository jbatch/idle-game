import Phaser from 'phaser'
import { GAME_H, GAME_W } from '../constants'

export type GameParent = string | HTMLElement

export function createPhaserGame(
  scenes: Phaser.Types.Scenes.SceneType[],
  parent: GameParent = document.body,
): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    scale: {
      parent,
      width: GAME_W,
      height: GAME_H,
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    backgroundColor: '#0a0a0f',
    scene: scenes,
  }

  return new Phaser.Game(config)
}
