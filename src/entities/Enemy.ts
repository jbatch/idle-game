import Phaser from 'phaser'
import type { Tower } from './Tower'
import type { Unit } from './Unit'
import type { EnemyData, StatusEffect, Targetable } from '../data/types'

export class Enemy implements Targetable {
  scene: Phaser.Scene
  x: number
  y: number
  hp: number
  maxHp: number
  speed: number
  damage: number
  attackCooldown: number
  attackRange: number
  radius: number
  reward: number
  isBoss: boolean
  name: string
  data: EnemyData

  private color: number
  private attackTimer: number = 0
  private kbVx: number = 0
  private kbVy: number = 0
  private effects: StatusEffect[] = []
  private graphics: Phaser.GameObjects.Graphics
  private hpBar: Phaser.GameObjects.Graphics

  alive: boolean = true

  constructor(scene: Phaser.Scene, x: number, y: number, data: EnemyData) {
    this.scene = scene
    this.x = x
    this.y = y
    this.hp = data.hp
    this.maxHp = data.hp
    this.speed = data.speed
    this.damage = data.damage
    this.attackCooldown = data.attackCooldown
    this.attackRange = data.attackRange
    this.radius = data.radius
    this.reward = data.reward
    this.isBoss = data.isBoss
    this.name = data.name
    this.color = Number(data.color)
    this.data = data
    this.graphics = scene.add.graphics()
    this.hpBar = scene.add.graphics()
    this.draw()
  }

  update(delta: number, tower: Tower, units: Unit[] = [], allies: Enemy[] = []) {
    if (!this.alive || !tower.alive) return
    const dt = delta / 1000

    this.tickEffects(dt)

    // Knockback
    if (this.kbVx !== 0 || this.kbVy !== 0) {
      this.x += this.kbVx * dt
      this.y += this.kbVy * dt
      const decay = Math.max(0, 1 - dt * 8)
      this.kbVx *= decay
      this.kbVy *= decay
      if (Math.abs(this.kbVx) < 1 && Math.abs(this.kbVy) < 1) { this.kbVx = 0; this.kbVy = 0 }
    }

    const behaviour = this.data.behaviour ?? 'rush_tower'
    const effectiveSpeed = this.speed * this.speedMultiplier()

    if (behaviour === 'healer_support') {
      this.runHealerSupport(dt, tower, allies, effectiveSpeed)
    } else if (behaviour === 'ranged_unit_targeter') {
      this.runRangedUnitTargeter(dt, tower, units, effectiveSpeed)
    } else if (behaviour === 'rush_tower_aoe') {
      this.runRushTower(dt, tower, effectiveSpeed, units)
    } else {
      // rush_tower — check for taunt redirect first
      const taunt = this.nearestTaunt(units)
      if (taunt) {
        this.moveAndAttack(dt, taunt, effectiveSpeed)
      } else {
        this.runRushTower(dt, tower, effectiveSpeed, units)
      }
    }

    this.draw()
  }

  // ─── Behaviour implementations ───────────────────────────────────

  private runRushTower(dt: number, tower: Tower, speed: number, units: Unit[]) {
    // Attack any unit in melee range before going for the tower
    const blocker = units.find(u => {
      if (!u.alive) return false
      const dx = u.x - this.x, dy = u.y - this.y
      return dx * dx + dy * dy <= (this.attackRange + u.radius + this.radius) ** 2
    })
    if (blocker) { this.moveAndAttack(dt, blocker, speed); return }

    const dx = tower.x - this.x
    const dy = tower.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const stop = tower.radius + this.attackRange

    if (dist > stop) {
      this.x += (dx / dist) * speed * dt
      this.y += (dy / dist) * speed * dt
    } else {
      this.attackTimer -= dt
      if (this.attackTimer <= 0) {
        tower.takeDamage(this.damage)
        // AOE splash damages units around tower
        if (this.data.behaviour === 'rush_tower_aoe') {
          const splash = this.data.params?.splashRadius ?? 80
          const splashDmg = this.data.params?.splashDamage ?? 8
          for (const u of units) {
            if (!u.alive) continue
            const ux = u.x - tower.x, uy = u.y - tower.y
            if (ux * ux + uy * uy <= splash * splash) u.takeDamage(splashDmg)
          }
        }
        this.attackTimer = this.attackCooldown
      }
    }
  }

  private runRangedUnitTargeter(dt: number, tower: Tower, units: Unit[], speed: number) {
    const target = this.nearestUnit(units)
    if (target) {
      this.moveAndAttack(dt, target, speed)
    } else {
      this.runRushTower(dt, tower, speed, [])
    }
  }

  private runHealerSupport(dt: number, tower: Tower, allies: Enemy[], speed: number) {
    const healRange = this.data.params?.healRange ?? this.attackRange
    const healAmount = this.data.params?.healAmount ?? 15

    const target = allies
      .filter(a => a.alive && a !== this && a.hp < a.maxHp)
      .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0]

    if (target) {
      const dx = target.x - this.x
      const dy = target.y - this.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > healRange) {
        this.x += (dx / dist) * speed * dt
        this.y += (dy / dist) * speed * dt
      } else {
        this.attackTimer -= dt
        if (this.attackTimer <= 0) {
          target.heal(healAmount)
          this.attackTimer = this.attackCooldown
        }
      }
    } else {
      this.runRushTower(dt, tower, speed, [])
    }
  }

  private moveAndAttack(dt: number, target: Targetable, speed: number) {
    const dx = target.x - this.x
    const dy = target.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const stop = target.radius + this.attackRange

    if (dist > stop) {
      this.x += (dx / dist) * speed * dt
      this.y += (dy / dist) * speed * dt
    } else {
      this.attackTimer -= dt
      if (this.attackTimer <= 0) {
        target.takeDamage(this.damage)
        this.attackTimer = this.attackCooldown
      }
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  private nearestTaunt(units: Unit[]): Unit | null {
    let best: Unit | null = null
    let bestDist = Infinity
    for (const u of units) {
      if (!u.alive || !u.data.params?.tauntRadius) continue
      const tauntRadius = Number(u.data.params.tauntRadius)
      const dx = u.x - this.x, dy = u.y - this.y
      const d2 = dx * dx + dy * dy
      if (d2 <= tauntRadius * tauntRadius && d2 < bestDist) { bestDist = d2; best = u }
    }
    return best
  }

  private nearestUnit(units: Unit[]): Unit | null {
    let best: Unit | null = null
    let bestDist = Infinity
    for (const u of units) {
      if (!u.alive) continue
      const dx = u.x - this.x, dy = u.y - this.y
      const d = dx * dx + dy * dy
      if (d < bestDist) { bestDist = d; best = u }
    }
    return best
  }

  private speedMultiplier(): number {
    const maxSlow = this.effects
      .filter(e => e.type === 'slow' || e.type === 'freeze')
      .reduce((acc, e) => Math.max(acc, e.magnitude), 0)
    return 1 - maxSlow
  }

  private tickEffects(dt: number) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].duration -= dt
      if (this.effects[i].duration <= 0) this.effects.splice(i, 1)
    }
  }

  applyEffect(effect: StatusEffect) {
    // Replace existing effect of same type if new one is stronger/longer
    const existing = this.effects.find(e => e.type === effect.type)
    if (existing) {
      existing.duration = Math.max(existing.duration, effect.duration)
      existing.magnitude = Math.max(existing.magnitude, effect.magnitude)
    } else {
      this.effects.push({ ...effect })
    }
  }

  heal(amount: number) {
    this.hp = Math.min(this.maxHp, this.hp + amount)
    this.draw()
  }

  applyKnockback(fromX: number, fromY: number, force: number) {
    const dx = this.x - fromX
    const dy = this.y - fromY
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist === 0) return
    this.kbVx += (dx / dist) * force
    this.kbVy += (dy / dist) * force
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

  private isSlowed(): boolean {
    return this.effects.some(e => e.type === 'slow' || e.type === 'freeze')
  }

  private draw() {
    this.graphics.clear()

    // Slow visual — blue outer ring
    if (this.isSlowed()) {
      this.graphics.lineStyle(2, 0x44aaff, 0.7)
      this.graphics.strokeCircle(this.x, this.y, this.radius + 5)
    }

    if (this.isBoss) {
      this.graphics.lineStyle(3, this.color, 0.4)
      this.graphics.strokeCircle(this.x, this.y, this.radius + 8)
    }

    this.graphics.fillStyle(this.color, 1)
    this.graphics.fillCircle(this.x, this.y, this.radius)
    this.graphics.lineStyle(this.isBoss ? 2 : 1, 0xffffff, this.isBoss ? 0.6 : 0.3)
    this.graphics.strokeCircle(this.x, this.y, this.radius)

    if (!this.isBoss) {
      const bw = this.radius * 2
      const bh = 3
      const bx = this.x - bw / 2
      const by = this.y - this.radius - 5
      this.hpBar.clear()
      this.hpBar.fillStyle(0x330000, 1)
      this.hpBar.fillRect(bx, by, bw, bh)
      this.hpBar.fillStyle(0xff4444, 1)
      this.hpBar.fillRect(bx, by, bw * (this.hp / this.maxHp), bh)
    } else {
      this.hpBar.clear()
    }
  }

  destroy() {
    this.graphics.destroy()
    this.hpBar.destroy()
  }
}
