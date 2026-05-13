import Phaser from 'phaser'
import { floatDamageNumber, floatHealNumber } from '../effects/CombatEffects'

const RADIUS = 28

export class Tower {
  private graphics: Phaser.GameObjects.Graphics
  private hpBarBg: Phaser.GameObjects.Graphics
  private hpBarFill: Phaser.GameObjects.Graphics
  private label: Phaser.GameObjects.Text

  x: number
  y: number
  hp: number
  maxHp: number
  shield: number = 0
  radius: number = RADIUS
  alive: boolean = true
  godMode: boolean = false

  constructor(scene: Phaser.Scene, x: number, y: number, maxHp: number) {
    this.hp = maxHp
    this.maxHp = maxHp
    this.x = x
    this.y = y
    this.graphics = scene.add.graphics()
    this.hpBarBg = scene.add.graphics()
    this.hpBarFill = scene.add.graphics()
    this.label = scene.add.text(x, y - RADIUS - 32, 'TOWER', {
      fontSize: '11px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    }).setOrigin(0.5)

    this.draw()
  }

  takeDamage(amount: number) {
    if (!this.alive || this.godMode) return
    const absorbed = Math.min(this.shield, amount)
    this.shield -= absorbed
    const remaining = amount - absorbed
    if (remaining > 0) this.hp = Math.max(0, this.hp - remaining)
    floatDamageNumber(this.graphics.scene, this.x, this.y, amount)
    if (this.hp <= 0) this.alive = false
    this.draw()
  }

  heal(amount: number) {
    if (!this.alive) return
    const actualHeal = Math.min(this.maxHp - this.hp, amount)
    this.hp = Math.min(this.maxHp, this.hp + amount)
    if (actualHeal > 0) floatHealNumber(this.graphics.scene, this.x, this.y, actualHeal)
    this.draw()
  }

  applyShield(amount: number) {
    if (!this.alive) return
    this.shield += amount
    floatHealNumber(this.graphics.scene, this.x, this.y - 14, amount)
    this.draw()
  }

  private draw() {
    this.graphics.clear()
    // Outer glow ring
    this.graphics.lineStyle(2, 0x4444aa, 0.4)
    this.graphics.strokeCircle(this.x, this.y, RADIUS + 6)
    if (this.shield > 0) {
      this.graphics.lineStyle(3, 0x66ddff, 0.75)
      this.graphics.strokeCircle(this.x, this.y, RADIUS + 11)
    }
    // Tower body
    this.graphics.fillStyle(0x2233aa, 1)
    this.graphics.fillCircle(this.x, this.y, RADIUS)
    this.graphics.lineStyle(2, 0x6688ff, 1)
    this.graphics.strokeCircle(this.x, this.y, RADIUS)

    // HP bar (80px wide, 8px tall, centred above tower)
    const barW = 80
    const barH = 8
    const bx = this.x - barW / 2
    const by = this.y - RADIUS - 18

    this.hpBarBg.clear()
    this.hpBarBg.fillStyle(0x111122, 1)
    this.hpBarBg.fillRect(bx, by, barW, barH)
    this.hpBarBg.lineStyle(1, 0x334466, 1)
    this.hpBarBg.strokeRect(bx, by, barW, barH)

    const frac = this.hp / this.maxHp
    const fillColor = frac > 0.5 ? 0x44cc88 : frac > 0.25 ? 0xddaa22 : 0xcc3333
    this.hpBarFill.clear()
    this.hpBarFill.fillStyle(fillColor, 1)
    this.hpBarFill.fillRect(bx + 1, by + 1, (barW - 2) * frac, barH - 2)
    if (this.shield > 0) {
      this.hpBarFill.fillStyle(0x66ddff, 0.9)
      this.hpBarFill.fillRect(bx + 1, by - 4, Math.min(barW - 2, this.shield / this.maxHp * (barW - 2)), 2)
    }
  }

  destroy() {
    this.graphics.destroy()
    this.hpBarBg.destroy()
    this.hpBarFill.destroy()
    this.label.destroy()
  }
}
