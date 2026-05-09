import Phaser from 'phaser'
import type { Enemy } from '../entities/Enemy'

const BASE_RADIUS = 40
const BASE_DAMAGE = 15

export class CursorAttack {
  private scene: Phaser.Scene
  private cooldownTimer: number = 0
  private pulseGraphics: Phaser.GameObjects.Graphics
  private cooldownText: Phaser.GameObjects.Text
  private pulseAlpha: number = 0

  readonly radius: number = BASE_RADIUS

  cooldown: number = 3.0
  knockback: number = 0       // 0 until cursor_knockback tech unlocked
  damageBonus: number = 0     // added by cursor_heavy tech

  constructor(scene: Phaser.Scene) {
    this.scene = scene
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

  get damage(): number { return BASE_DAMAGE + this.damageBonus }

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
      if (dx * dx + dy * dy <= BASE_RADIUS * BASE_RADIUS) {
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

    this.pulseGraphics.lineStyle(1, 0xffffff, 0.15)
    this.pulseGraphics.strokeCircle(mouseX, mouseY, BASE_RADIUS)

    if (this.pulseAlpha > 0) {
      this.pulseGraphics.lineStyle(2, 0xffdd44, this.pulseAlpha)
      this.pulseGraphics.strokeCircle(mouseX, mouseY, BASE_RADIUS)
      this.pulseGraphics.fillStyle(0xffdd44, this.pulseAlpha * 0.15)
      this.pulseGraphics.fillCircle(mouseX, mouseY, BASE_RADIUS)
    }

    const ready = this.cooldownTimer <= 0
    this.cooldownText.setText(
      ready ? 'CURSOR: READY' : `CURSOR: ${this.cooldownTimer.toFixed(1)}s`
    )
    this.cooldownText.setColor(ready ? '#44ff88' : '#aa8844')
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
