import Phaser from 'phaser'
import type { Enemy } from '../entities/Enemy'
import type { Targetable } from '../data/types'
import { playCursorImpactEffect } from '../effects/CombatEffects'
import { GAME_W } from '../constants'
import { isCoarseInput } from './InputMode'

const FULL_CIRCLE = Math.PI * 2
const RECHARGE_START_ANGLE = -Math.PI / 2
const TOUCH_PREVIEW_DURATION = 0.42

export interface CursorAttackConfig {
  damage: number
  radius: number
  cooldown: number
  knockback: number
  knockbackChance: number
  bossDamageMultiplier?: number
  crateDamageMultiplier?: number
}

export class CursorAttack {
  private scene: Phaser.Scene
  private cooldownTimer: number = 0
  private pulseGraphics: Phaser.GameObjects.Graphics
  private cooldownHud?: Phaser.GameObjects.Container
  private cooldownHudGfx?: Phaser.GameObjects.Graphics
  private cooldownHudText?: Phaser.GameObjects.Text
  private pulseAlpha: number = 0
  private getTargets: () => Targetable[] = () => []
  private pointerHandler: (ptr: Phaser.Input.Pointer) => void
  private touchMode = isCoarseInput()
  private tapPreviewX = 0
  private tapPreviewY = 0
  private tapPreviewTimer = 0

  radius: number
  damage: number
  cooldown: number
  knockback: number
  knockbackChance: number
  bossDamageMultiplier: number
  crateDamageMultiplier: number

  constructor(scene: Phaser.Scene, config: CursorAttackConfig) {
    this.scene = scene
    this.radius = config.radius
    this.damage = config.damage
    this.cooldown = config.cooldown
    this.knockback = config.knockback
    this.knockbackChance = Phaser.Math.Clamp(config.knockbackChance, 0, 1)
    this.bossDamageMultiplier = config.bossDamageMultiplier ?? 1
    this.crateDamageMultiplier = config.crateDamageMultiplier ?? 1
    this.pointerHandler = (ptr: Phaser.Input.Pointer) => {
      this.tryFire(ptr.x, ptr.y, this.getTargets())
    }
    this.pulseGraphics = scene.add.graphics().setDepth(10)
    if (this.touchMode) this.buildTouchCooldownHud()

    scene.input.on('pointerdown', this.pointerHandler)
  }

  configure(config: CursorAttackConfig) {
    this.radius = config.radius
    this.damage = config.damage
    this.cooldown = config.cooldown
    this.knockback = config.knockback
    this.knockbackChance = Phaser.Math.Clamp(config.knockbackChance, 0, 1)
    this.bossDamageMultiplier = config.bossDamageMultiplier ?? 1
    this.crateDamageMultiplier = config.crateDamageMultiplier ?? 1
  }

  tryFire(x: number, y: number, targets: Targetable[]): boolean {
    if (this.cooldownTimer > 0) return false
    this.cooldownTimer = this.cooldown
    this.pulseAlpha = 1
    if (this.touchMode) {
      this.tapPreviewX = x
      this.tapPreviewY = y
      this.tapPreviewTimer = TOUCH_PREVIEW_DURATION
    }

    const kb  = this.knockback
    const knockbackTriggered = kb > 0 && Math.random() < this.knockbackChance
    targets.forEach(target => {
      if (!target.alive) return
      const dx = target.x - x
      const dy = target.y - y
      if (dx * dx + dy * dy <= this.radius * this.radius) {
        target.takeDamage(this.damageFor(target))
        playCursorImpactEffect(this.scene, target.x, target.y, knockbackTriggered)
        if (knockbackTriggered && target.applyKnockback) target.applyKnockback(x, y, kb)
      }
    })
    return true
  }

  private damageFor(target: Targetable): number {
    if (target.targetType === 'crate') return Math.round(this.damage * this.crateDamageMultiplier)
    if (target.targetType === 'enemy' && 'isBoss' in target && target.isBoss) {
      return Math.round(this.damage * this.bossDamageMultiplier)
    }
    return this.damage
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
    if (this.touchMode) {
      this.tapPreviewTimer = Math.max(0, this.tapPreviewTimer - dt)
      this.drawTapPreview()
      this.drawTouchCooldownHud()
      return
    }

    const charge = this.cooldown <= 0
      ? 1
      : Phaser.Math.Clamp(1 - this.cooldownTimer / this.cooldown, 0, 1)
    this.drawRecharge(mouseX, mouseY, charge)

    if (this.pulseAlpha > 0) {
      this.pulseGraphics.lineStyle(2, 0xffffff, this.pulseAlpha * 0.6)
      this.pulseGraphics.strokeCircle(mouseX, mouseY, this.radius + 4)
    }

  }

  private drawTapPreview() {
    if (this.tapPreviewTimer <= 0) return

    const alpha = Phaser.Math.Clamp(this.tapPreviewTimer / TOUCH_PREVIEW_DURATION, 0, 1)
    this.pulseGraphics.fillStyle(0xffdd44, 0.12 * alpha)
    this.pulseGraphics.fillCircle(this.tapPreviewX, this.tapPreviewY, this.radius)
    this.pulseGraphics.lineStyle(2, 0xffdd44, 0.92 * alpha)
    this.pulseGraphics.strokeCircle(this.tapPreviewX, this.tapPreviewY, this.radius)
    this.pulseGraphics.lineStyle(1, 0xdde6ff, 0.42 * alpha)
    this.pulseGraphics.strokeCircle(this.tapPreviewX, this.tapPreviewY, this.radius + 4)
  }

  private buildTouchCooldownHud() {
    const x = GAME_W - 110
    const y = 14
    this.cooldownHud = this.scene.add.container(x, y).setDepth(22)
    this.cooldownHudGfx = this.scene.add.graphics()
    this.cooldownHudText = this.scene.add.text(48, 23, '', {
      fontSize: '11px',
      color: '#dbe4ff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.cooldownHud.add([this.cooldownHudGfx, this.cooldownHudText])
  }

  private drawTouchCooldownHud() {
    if (!this.cooldownHudGfx || !this.cooldownHudText) return

    const charge = this.cooldown <= 0
      ? 1
      : Phaser.Math.Clamp(1 - this.cooldownTimer / this.cooldown, 0, 1)
    const ready = charge >= 1

    this.cooldownHudGfx.clear()
    this.cooldownHudGfx.fillStyle(0x081020, 0.88)
    this.cooldownHudGfx.fillRoundedRect(0, 0, 96, 46, 6)
    this.cooldownHudGfx.lineStyle(1, ready ? 0xddaa22 : 0x263a66, 0.95)
    this.cooldownHudGfx.strokeRoundedRect(0, 0, 96, 46, 6)
    this.cooldownHudGfx.fillStyle(0x111a2d, 1)
    this.cooldownHudGfx.fillRect(10, 32, 76, 5)
    this.cooldownHudGfx.fillStyle(ready ? 0xddaa22 : 0x6688cc, 1)
    this.cooldownHudGfx.fillRect(10, 32, 76 * charge, 5)
    this.cooldownHudText.setText(ready ? 'READY' : `${this.cooldownTimer.toFixed(1)}s`)
    this.cooldownHudText.setColor(ready ? '#ffe1a3' : '#9eb2e8')
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
    this.cooldownHud?.destroy(true)
  }
}
