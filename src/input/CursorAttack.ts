import Phaser from 'phaser'
import type { Enemy } from '../entities/Enemy'

const FULL_CIRCLE = Math.PI * 2
const RECHARGE_START_ANGLE = -Math.PI / 2

export interface CursorAttackConfig {
  damage: number
  radius: number
  cooldown: number
  knockback: number
}

export class CursorAttack {
  private scene: Phaser.Scene
  private cooldownTimer: number = 0
  private pulseGraphics: Phaser.GameObjects.Graphics
  private cooldownText: Phaser.GameObjects.Text
  private pulseAlpha: number = 0

  radius: number
  damage: number
  cooldown: number
  knockback: number

  constructor(scene: Phaser.Scene, config: CursorAttackConfig) {
    this.scene = scene
    this.radius = config.radius
    this.damage = config.damage
    this.cooldown = config.cooldown
    this.knockback = config.knockback
    this.pulseGraphics = scene.add.graphics().setDepth(10)
    this.cooldownText = scene.add.text(10, 10, '', {
      fontSize: '13px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    }).setDepth(20)

    scene.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      this.tryFire(ptr.x, ptr.y, [])
    })
  }

  configure(config: CursorAttackConfig) {
    this.radius = config.radius
    this.damage = config.damage
    this.cooldown = config.cooldown
    this.knockback = config.knockback
  }

  tryFire(x: number, y: number, enemies: Enemy[]): boolean {
    if (this.cooldownTimer > 0) return false
    this.cooldownTimer = this.cooldown
    this.pulseAlpha = 1

    const dmg = this.damage
    const kb  = this.knockback
    enemies.forEach(e => {
      if (!e.alive) return
      const dx = e.x - x
      const dy = e.y - y
      if (dx * dx + dy * dy <= this.radius * this.radius) {
        e.takeDamage(dmg)
        if (kb > 0) e.applyKnockback(x, y, kb)
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

    const ready = charge >= 1
    this.cooldownText.setText(
      ready ? 'CURSOR: READY' : `CURSOR: ${this.cooldownTimer.toFixed(1)}s`
    )
    this.cooldownText.setColor(ready ? '#ffdd44' : '#dde6ff')
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
    this.scene.input.off('pointerdown')
    this.scene.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      this.tryFire(ptr.x, ptr.y, getEnemies())
    })
  }

  destroy() {
    this.pulseGraphics.destroy()
    this.cooldownText.destroy()
  }
}
