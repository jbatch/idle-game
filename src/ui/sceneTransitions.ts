import Phaser from 'phaser'
import { audioManager, type SfxKey } from '../systems/AudioManager'

export function fadeInScene(scene: Phaser.Scene, duration = 260): void {
  scene.cameras.main.fadeIn(duration, 8, 8, 16)
}

export function fadeToScene(
  scene: Phaser.Scene,
  target: string,
  data?: object,
  options: { duration?: number, sfx?: SfxKey } = {},
): void {
  const duration = options.duration ?? 260
  if (options.sfx) audioManager.playSfx(scene, options.sfx)
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    scene.scene.start(target, data)
  })
  scene.cameras.main.fadeOut(duration, 8, 8, 16)
}
