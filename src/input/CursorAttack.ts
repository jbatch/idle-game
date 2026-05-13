import Phaser from 'phaser'
import type { Enemy } from '../entities/Enemy'
import type { Targetable } from '../data/types'
import { playCursorImpactEffect } from '../effects/CombatEffects'

const FULL_CIRCLE = Math.PI * 2
const RECHARGE_START_ANGLE = -Math.PI / 2

export interface CursorAttackConfig {
  damage: number
  radius: number
  cooldown: number
  knockback: number
  knockbackChance: number
}

export class CursorAttack {
  private scene: Phaser.Scene
  private cooldownTimer: number = 0
  private pulseGraphics: Phaser.GameObjects.Graphics
  private pulseAlpha: number = 0
  private getTargets: () => Targetable[] = () => []
  private pointerHandler: (ptr: Phaser.Input.Pointer) => void

  radius: number
  damage: number
  cooldown: number
  knockback: number
  knockbackChance: number

  constructor(scene: Phaser.Scene, config: CursorAttackConfig) {
    this.scene = scene
    this.radius = config.radius
    this.damage = config.damage
    this.cooldown = config.cooldown
    this.knockback = config.knockback
    this.knockbackChance = Phaser.Math.Clamp(config.knockbackChance, 0, 1)
    this.pointerHandler = (ptr: Phaser.Input.Pointer) => {
      this.tryFire(ptr.x, ptr.y, this.getTargets())
    }
    this.pulseGraphics = scene.add.graphics().setDepth(10)

    scene.input.on('pointerdown', this.pointerHandler)
  }

  configure(config: CursorAttackConfig) {
    this.radius = config.radius
    this.damage = config.damage
    this.cooldown = config.cooldown
    this.knockback = config.knockback
    this.knockbackChance = Phaser.Math.Clamp(config.knockbackChance, 0, 1)
  }

  tryFire(x: number, y: number, targets: Targetable[]): boolean {
    if (this.cooldownTimer > 0) return false
    this.cooldownTimer = this.cooldown
    this.pulseAlpha = 1

    const dmg = this.damage
    const kb  = this.knockback
    const knockbackTriggered = kb > 0 && Math.random() < this.knockbackChance
    targets.forEach(target => {
      if (!target.alive) return
      const dx = target.x - x
      const dy = target.y - y
      if (dx * dx + dy * dy <= this.radius * this.radius) {
        target.takeDamage(dmg)
        playCursorImpactEffect(this.scene, target.x, target.y, knockbackTriggered)
        if (knockbackTriggered && target.applyKnockback) target.applyKnockback(x, y, kb)
      }
    })
    return true
  }

  update(delta: number, mouseX: number, mouseY: number, _enemies: Enemy[]) {
    const dt = delta / 1000
    if (this.cooldownTimer > 0) {
      this.cooldownTimer = Math.max(0, this.cooldownTimer - dt)
    }

    if (this.pulseAlpha > 0) {
      this.pulseAlpha = Math.max(0, this.pulseAlpha - dt * 3)
    }

    this.pulseGraphics.clear()

    const charge = this.cooldown <= 0
      ? 1
      : Phaser.Math.Clamp(1 - this.cooldownTimer / this.cooldown, 0, 1)
    this.drawRecharge(mouseX, mouseY, charge)

    if (this.pulseAlpha > 0) {
      this.pulseGraphics.lineStyle(2, 0xffffff, this.pulseAlpha * 0.6)
      this.pulseGraphics.strokeCircle(mouseX, mouseY, this.radius + 4)
    }

  }

  private drawRecharge(x: number, y: number, charge: number) {
    this.pulseGraphics.fillStyle(0xdde6ff, 0.035)
    this.pulseGraphics.fillCircle(x, y, this.radius)
    this.pulseGraphics.lineStyle(1, 0xdde6ff, 0.34)
    this.pulseGraphics.strokeCircle(x, y, this.radius)

    if (charge >= 1) {
      this.pulseGraphics.fillStyle(0xffdd44, 0.16)
      this.pulseGraphics.fillCircle(x, y, this.radius)
      this.pulseGraphics.lineStyle(2, 0xffdd44, 0.95)
      this.pulseGraphics.strokeCircle(x, y, this.radius)
      return
    }

    if (charge <= 0) return

    const endAngle = RECHARGE_START_ANGLE + FULL_CIRCLE * charge
    this.pulseGraphics.fillStyle(0xffdd44, 0.13)
    this.pulseGraphics.slice(x, y, this.radius, RECHARGE_START_ANGLE, endAngle)
    this.pulseGraphics.fillPath()

    this.pulseGraphics.lineStyle(3, 0xffdd44, 0.9)
    this.pulseGraphics.beginPath()
    this.pulseGraphics.arc(x, y, this.radius, RECHARGE_START_ANGLE, endAngle)
    this.pulseGraphics.strokePath()
  }

  bindEnemies(getEnemies: () => Enemy[]) {
    this.getTargets = getEnemies
  }

  bindTargets(getTargets: () => Targetable[]) {
    this.getTargets = getTargets
  }

  destroy() {
    this.scene.input.off('pointerdown', this.pointerHandler)
    this.pulseGraphics.destroy()
  }
}
