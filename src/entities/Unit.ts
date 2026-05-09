import Phaser from 'phaser'
import type { Enemy } from './Enemy'
import type { UnitData, UnitBuff, StatusEffect, Targetable } from '../data/types'
import { CX, CY, ARENA_RADIUS } from '../constants'

export class Unit implements Targetable {
  scene: Phaser.Scene
  x: number
  y: number
  hp: number
  maxHp: number
  data: UnitData
  alive: boolean = true

  statCallback?: (event: 'kill' | 'heal', amount: number) => void

  private color: number
  private attackTimer: number = 0
  private buffs: UnitBuff[] = []
  private fxGraphics: Phaser.GameObjects.Graphics
  private graphics: Phaser.GameObjects.Graphics
  private hpBar: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene, x: number, y: number, data: UnitData) {
    this.scene = scene
    this.x = x
    this.y = y
    this.hp = data.hp
    this.maxHp = data.hp
    this.data = data
    this.color = Number(data.color)
    this.graphics = scene.add.graphics()
    this.hpBar = scene.add.graphics()
    this.fxGraphics = scene.add.graphics().setDepth(5)
    this.draw()
  }

  get radius(): number { return this.data.radius }

  update(delta: number, enemies: Enemy[], allies: Unit[] = []) {
    if (!this.alive) return
    const dt = delta / 1000
    this.tickBuffs(dt)
    this.attackTimer = Math.max(0, this.attackTimer - dt)

    this.fxGraphics.clear()

    switch (this.data.behaviour) {
      case 'melee_basic':   this.runMeleeBasic(dt, enemies);      break
      case 'melee_taunt':   this.runMeleeBasic(dt, enemies);      break  // same movement, taunt is passive
      case 'ranged_kite':   this.runRangedKite(dt, enemies);      break
      case 'heal_support':  this.runHealSupport(dt, allies);      break
      case 'aoe_slow':      this.runAoeSlow(dt, enemies);         break
      case 'stationary_guard': this.runStationaryGuard(dt, enemies); break
      case 'aura_haste':    this.runAuraHaste(dt, allies);        break
    }

    this.clampToArena()
    this.draw()
  }

  // ─── Behaviours ──────────────────────────────────────────────────

  private runMeleeBasic(dt: number, enemies: Enemy[]) {
    const target = this.nearest(enemies)
    if (!target) return
    this.moveAndAttack(dt, target)
  }

  private runRangedKite(dt: number, enemies: Enemy[]) {
    const target = this.nearest(enemies)
    if (!target) return
    const dx = target.x - this.x
    const dy = target.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const preferred = this.data.attackRange * 0.72

    if (dist < preferred) {
      this.x -= (dx / dist) * this.data.speed * dt
      this.y -= (dy / dist) * this.data.speed * dt
    } else if (dist > this.data.attackRange) {
      this.x += (dx / dist) * this.data.speed * dt
      this.y += (dy / dist) * this.data.speed * dt
    }

    if (dist <= this.data.attackRange && this.attackTimer === 0) {
      target.takeDamage(this.data.attackDamage)
      this.attackTimer = this.effectiveCooldown()
    }
  }

  private runHealSupport(dt: number, allies: Unit[]) {
    const healRange = Number(this.data.params?.healRange ?? this.data.attackRange)
    const healAmount = Number(this.data.params?.healAmount ?? 20)

    const target = allies
      .filter(a => a.alive && a !== this && a.hp < a.maxHp)
      .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0]

    if (!target) return

    const dx = target.x - this.x
    const dy = target.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > healRange) {
      this.x += (dx / dist) * this.data.speed * dt
      this.y += (dy / dist) * this.data.speed * dt
    } else if (this.attackTimer === 0) {
      const actualHeal = Math.min((target as Unit).maxHp - target.hp, healAmount)
      target.heal(healAmount)
      this.attackTimer = this.effectiveCooldown()
      if (actualHeal > 0) this.statCallback?.('heal', actualHeal)
      // Heal flash at target
      this.fxGraphics.lineStyle(2, 0xaaffaa, 0.8)
      this.fxGraphics.strokeCircle(target.x, target.y, target.radius + 6)
    }
  }

  private runAoeSlow(dt: number, enemies: Enemy[]) {
    const target = this.nearest(enemies)
    if (!target) return
    const dx = target.x - this.x
    const dy = target.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > this.data.attackRange) {
      this.x += (dx / dist) * this.data.speed * dt
      this.y += (dy / dist) * this.data.speed * dt
      return
    }

    if (this.attackTimer === 0) {
      const aoeR  = Number(this.data.params?.aoeRadius ?? 75)
      const slow  = Number(this.data.params?.slowMagnitude ?? 0.45)
      const dur   = Number(this.data.params?.slowDuration ?? 2.5)
      const dmg   = this.data.attackDamage

      const inBlast = enemies.filter(e => {
        if (!e.alive) return false
        const dx = e.x - this.x, dy = e.y - this.y
        return dx * dx + dy * dy <= aoeR * aoeR
      })
      if (inBlast.length === 0) return

      const effect: StatusEffect = { type: 'slow', duration: dur, magnitude: slow }
      for (const e of enemies) {
        if (!e.alive) continue
        const ex = e.x - this.x, ey = e.y - this.y
        if (ex * ex + ey * ey <= aoeR * aoeR) {
          const wasAlive = e.alive
          e.takeDamage(dmg)
          e.applyEffect(effect)
          if (wasAlive && !e.alive) this.statCallback?.('kill', 1)
        }
      }

      // AOE visual — blue pulse ring
      this.fxGraphics.lineStyle(2, 0x44ccff, 0.9)
      this.fxGraphics.strokeCircle(this.x, this.y, aoeR)
      this.fxGraphics.fillStyle(0x44ccff, 0.08)
      this.fxGraphics.fillCircle(this.x, this.y, aoeR)

      this.attackTimer = this.effectiveCooldown()
    }
  }

  private runStationaryGuard(_dt: number, enemies: Enemy[]) {
    // Target enemies within attackRange of TOWER (origin), not self
    const guardRange = this.data.attackRange
    let best: Enemy | null = null
    let bestDist = Infinity
    for (const e of enemies) {
      if (!e.alive) continue
      const dx = e.x - CX, dy = e.y - CY
      const d = dx * dx + dy * dy
      if (d <= guardRange * guardRange && d < bestDist) { bestDist = d; best = e }
    }

    if (best && this.attackTimer === 0) {
      best.takeDamage(this.data.attackDamage)
      this.attackTimer = this.effectiveCooldown()
      // Attack flash line to target
      this.fxGraphics.lineStyle(2, 0xffcc66, 0.7)
      this.fxGraphics.lineBetween(this.x, this.y, best.x, best.y)
    }

    // Show guard radius faintly
    this.fxGraphics.lineStyle(1, 0xffcc66, 0.08)
    this.fxGraphics.strokeCircle(CX, CY, guardRange)
  }

  private runAuraHaste(_dt: number, allies: Unit[]) {
    const auraR  = Number(this.data.params?.auraRadius ?? 150)
    const haste  = Number(this.data.params?.hasteMultiplier ?? 0.5)
    const buffDur = this.data.attackCooldown + 0.1  // refresh slightly longer than interval

    if (this.attackTimer === 0) {
      for (const a of allies) {
        if (!a.alive || a === this) continue
        const dx = a.x - this.x, dy = a.y - this.y
        if (dx * dx + dy * dy <= auraR * auraR) {
          a.applyBuff({ type: 'haste', duration: buffDur, magnitude: haste })
        }
      }
      this.attackTimer = this.effectiveCooldown()
    }

    // Aura ring visual
    this.fxGraphics.lineStyle(1, 0xff88cc, 0.15)
    this.fxGraphics.strokeCircle(this.x, this.y, auraR)
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  private moveAndAttack(dt: number, target: Targetable) {
    const dx = target.x - this.x
    const dy = target.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const stop = target.radius + this.data.attackRange

    if (dist > stop) {
      this.x += (dx / dist) * this.data.speed * dt
      this.y += (dy / dist) * this.data.speed * dt
    } else if (this.attackTimer === 0) {
      const wasAlive = target.alive
      target.takeDamage(this.data.attackDamage)
      if (wasAlive && !target.alive) this.statCallback?.('kill', 1)
      this.attackTimer = this.effectiveCooldown()
    }
  }

  private nearest(enemies: Enemy[]): Enemy | null {
    let best: Enemy | null = null
    let bestDist = Infinity
    for (const e of enemies) {
      if (!e.alive) continue
      const dx = e.x - this.x, dy = e.y - this.y
      const d = dx * dx + dy * dy
      if (d < bestDist) { bestDist = d; best = e }
    }
    return best
  }

  private effectiveCooldown(): number {
    const maxHaste = this.buffs
      .filter(b => b.type === 'haste')
      .reduce((acc, b) => Math.max(acc, b.magnitude), 0)
    return this.data.attackCooldown * (1 - maxHaste)
  }

  private tickBuffs(dt: number) {
    for (let i = this.buffs.length - 1; i >= 0; i--) {
      this.buffs[i].duration -= dt
      if (this.buffs[i].duration <= 0) this.buffs.splice(i, 1)
    }
  }

  applyBuff(buff: UnitBuff) {
    const existing = this.buffs.find(b => b.type === buff.type)
    if (existing) {
      existing.duration = Math.max(existing.duration, buff.duration)
      existing.magnitude = Math.max(existing.magnitude, buff.magnitude)
    } else {
      this.buffs.push({ ...buff })
    }
  }

  heal(amount: number) {
    this.hp = Math.min(this.maxHp, this.hp + amount)
  }

  takeDamage(amount: number) {
    if (!this.alive) return
    this.hp -= amount
    if (this.hp <= 0) {
      this.alive = false
      this.destroy()
    } else {
      this.draw()
    }
  }

  private clampToArena() {
    const edge = ARENA_RADIUS - this.data.radius - 4
    const fx = this.x - CX, fy = this.y - CY
    const d = Math.sqrt(fx * fx + fy * fy)
    if (d > edge) {
      this.x = CX + (fx / d) * edge
      this.y = CY + (fy / d) * edge
    }
  }

  private isHasted(): boolean {
    return this.buffs.some(b => b.type === 'haste')
  }

  private draw() {
    this.graphics.clear()

    // Haste glow
    if (this.isHasted()) {
      this.graphics.lineStyle(2, 0xff88cc, 0.5)
      this.graphics.strokeCircle(this.x, this.y, this.data.radius + 5)
    }

    this.graphics.fillStyle(this.color, 1)
    this.graphics.fillCircle(this.x, this.y, this.data.radius)
    this.graphics.lineStyle(1, 0xffffff, 0.4)
    this.graphics.strokeCircle(this.x, this.y, this.data.radius)

    const bw = this.data.radius * 2.4
    const bh = 3
    const bx = this.x - bw / 2
    const by = this.y - this.data.radius - 5
    this.hpBar.clear()
    this.hpBar.fillStyle(0x002200, 1)
    this.hpBar.fillRect(bx, by, bw, bh)
    this.hpBar.fillStyle(0x44ff88, 1)
    this.hpBar.fillRect(bx, by, bw * (this.hp / this.maxHp), bh)
  }

  destroy() {
    this.graphics.destroy()
    this.hpBar.destroy()
    this.fxGraphics.destroy()
  }
}
