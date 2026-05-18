import Phaser from 'phaser'
import type { UnitVisualData } from '../data/types'

type UnitVisualUpdate = {
  x: number
  y: number
  radius: number
  aimX: number
  aimY: number
  cooldownProgress: number
  hasSynergy: boolean
  isHasted: boolean
  dt: number
}

type UnitVisualOptions = {
  depth?: number
  shadowColor?: number
  shadowAlpha?: number
}

export class UnitVisual {
  private container: Phaser.GameObjects.Container
  private shadow: Phaser.GameObjects.Ellipse
  private body: Phaser.GameObjects.Image
  private weapon?: Phaser.GameObjects.Image
  private attackPulse: number = 0

  constructor(scene: Phaser.Scene, x: number, y: number, private config: UnitVisualData, options: UnitVisualOptions = {}) {
    this.shadow = scene.add.ellipse(0, 8, 28, 10, options.shadowColor ?? 0x05070c, options.shadowAlpha ?? 0.35)
    this.body = scene.add.image(0, 0, config.bodyTexture)
    this.body.setOrigin(0.5, 0.55)

    const children: Phaser.GameObjects.GameObject[] = [this.shadow, this.body]
    if (config.weaponTexture) {
      this.weapon = scene.add.image(0, 0, config.weaponTexture)
      this.weapon.setOrigin(config.weaponOrigin?.x ?? 0.22, config.weaponOrigin?.y ?? 0.5)
      children.push(this.weapon)
    }

    this.container = scene.add.container(x, y, children).setDepth(options.depth ?? 4)
  }

  update(state: UnitVisualUpdate) {
    const aimAngle = Math.atan2(state.aimY - state.y, state.aimX - state.x)
    const facingLeft = Math.cos(aimAngle) < 0
    const bob = Math.sin(this.container.scene.time.now / 180 + state.x * 0.03) * 1.2
    const bodyScale = this.config.bodyScale ?? 0.44
    const pulseScale = this.attackPulse > 0 ? Math.sin(this.attackPulse * Math.PI) * 0.08 : 0

    this.attackPulse = Math.max(0, this.attackPulse - state.dt / 0.18)
    this.container.setPosition(state.x, state.y + bob)
    this.shadow.setScale(Math.max(0.75, bodyScale / 0.44))
    this.body.setScale(bodyScale * (1 + pulseScale), bodyScale * (1 - pulseScale * 0.35))
    this.body.setFlipX(facingLeft)

    if (state.hasSynergy) {
      this.body.setTint(0xdff8ff)
    } else if (state.isHasted) {
      this.body.setTint(0xffd6f0)
    } else {
      this.body.clearTint()
    }

    if (!this.weapon) return

    const charge = Phaser.Math.Clamp(state.cooldownProgress, 0, 1)
    const release = this.attackPulse > 0 ? Math.sin(this.attackPulse * Math.PI) : 0
    const offset = (this.config.weaponOffset ?? state.radius + 9) + charge * 3 + release * 7
    const pullBack = (1 - charge) * 2
    const weaponScale = (this.config.weaponScale ?? 0.36) * (0.9 + charge * 0.18 + release * 0.18)

    this.weapon.setPosition(
      Math.cos(aimAngle) * (offset - pullBack),
      Math.sin(aimAngle) * (offset - pullBack) - 1,
    )
    this.weapon.setRotation(aimAngle + release * 0.28)
    this.weapon.setScale(weaponScale)
    this.weapon.setAlpha(0.62 + charge * 0.3 + release * 0.08)
    this.weapon.setTint(charge >= 0.98 || release > 0 ? 0xffffff : 0xb8c3d6)
  }

  playAttack() {
    this.attackPulse = 1
  }

  fadeTargets(): Phaser.GameObjects.GameObject[] {
    return [this.container]
  }

  destroy() {
    this.container.destroy(true)
  }
}
