import Phaser from 'phaser'
import type { Enemy } from './Enemy'
import type { Crate } from './Crate'
import type { UnitData, UnitBuff, UnitSynergyEffect, StatusEffect, Targetable } from '../data/types'
import { CX, CY, ARENA_RADIUS } from '../constants'
import { floatDamageNumber, floatHealNumber, playUnitAttackEffect } from '../effects/CombatEffects'
import { UnitVisual } from './UnitVisual'
import { audioManager } from '../systems/AudioManager'

export class Unit implements Targetable {
  scene: Phaser.Scene
  x: number
  y: number
  hp: number
  maxHp: number
  shield: number = 0
  data: UnitData
  alive: boolean = true

  statCallback?: (event: 'kill' | 'heal', amount: number) => void

  private color: number
  private attackTimer: number = 0
  private buffs: UnitBuff[] = []
  private synergyEffects: UnitSynergyEffect[] = []
  private fxGraphics: Phaser.GameObjects.Graphics
  private graphics: Phaser.GameObjects.Graphics
  private hpBar: Phaser.GameObjects.Graphics
  private visual?: UnitVisual
  private aimX: number
  private aimY: number
  private destroyed: boolean = false

  constructor(scene: Phaser.Scene, x: number, y: number, data: UnitData) {
    this.scene = scene
    this.x = x
    this.y = y
    this.hp = data.hp
    this.maxHp = data.hp
    this.data = data
    this.color = Number(data.color)
    this.aimX = CX
    this.aimY = CY
    this.graphics = scene.add.graphics().setDepth(3)
    this.hpBar = scene.add.graphics().setDepth(7)
    this.fxGraphics = scene.add.graphics().setDepth(8)
    if (data.visual) this.visual = new UnitVisual(scene, x, y, data.visual)
    this.draw()
  }

  get radius(): number { return this.data.radius }

  update(delta: number, enemies: Enemy[], allies: Unit[] = [], crates: Crate[] = []) {
    if (!this.alive) return
    const dt = delta / 1000
    this.tickBuffs(dt)
    this.attackTimer = Math.max(0, this.attackTimer - dt)

    this.fxGraphics.clear()

    switch (this.data.behaviour) {
      case 'melee_basic':   this.runMeleeBasic(dt, enemies);      break
      case 'melee_taunt':   this.runMeleeTaunt(dt, enemies);      break
      case 'ranged_kite':   this.runRangedKite(dt, enemies, allies); break
      case 'heal_support':  this.runHealSupport(dt, enemies, allies, crates); break
      case 'aoe_slow':      this.runAoeSlow(dt, enemies);         break
      case 'stationary_guard': this.runStationaryGuard(dt, enemies); break
      case 'aura_haste':    this.runAuraHaste(dt, allies, crates);        break
    }

    this.applySynergyCohesion(dt, allies)
    this.applySeparation(dt, allies)
    this.clampToArena()
    this.draw(dt)
  }

  // ─── Behaviours ──────────────────────────────────────────────────

  private runMeleeBasic(dt: number, enemies: Enemy[]) {
    const target = this.bestInterceptTarget(enemies)
    if (!target) {
      this.returnToTowerBand(dt, 125)
      return
    }
    this.moveAndAttack(dt, target)
    this.enforceMaxTowerDistance(dt, 285)
  }

  private runMeleeTaunt(dt: number, enemies: Enemy[]) {
    const guardRadius = this.getParam('guardRadius', this.getParam('tauntRadius', 165))
    const leashRadius = this.getParam('leashRadius', guardRadius + 40)
    const target = this.closestEnemyToTower(enemies, guardRadius + 90)

    if (!target) {
      this.returnToTowerBand(dt, guardRadius * 0.75)
      return
    }

    this.moveAndAttack(dt, target)
    this.enforceMaxTowerDistance(dt, leashRadius)
  }

  private runRangedKite(dt: number, enemies: Enemy[], allies: Unit[]) {
    const target = this.bestRangedTarget(enemies, allies)
    if (!target) {
      this.returnToTowerBand(dt, 135)
      return
    }
    const dx = target.x - this.x
    const dy = target.y - this.y
    this.setAimTarget(target)
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))
    const preferred = this.getParam('preferredRange', this.data.attackRange * 0.78)
    const dangerRadius = this.getParam('dangerRadius', 70)
    const threat = this.nearestThreat(enemies, dangerRadius)

    if (threat) {
      this.moveAwayFromPoint(dt, threat.x, threat.y, 1.15)
    } else if (dist < preferred) {
      this.x -= (dx / dist) * this.data.speed * dt
      this.y -= (dy / dist) * this.data.speed * dt
    } else if (dist > this.data.attackRange) {
      this.x += (dx / dist) * this.data.speed * dt
      this.y += (dy / dist) * this.data.speed * dt
    }

    if (dist <= this.data.attackRange && this.attackTimer === 0) {
      const wasAlive = target.alive
      this.playAttackEffect(target)
      target.takeDamage(this.effectiveAttackDamage())
      if (wasAlive && !target.alive) this.statCallback?.('kill', 1)
      this.attackTimer = this.effectiveCooldown()
    }

    this.enforceMaxTowerDistance(dt, this.getParam('leashRadius', 285))
  }

  private runHealSupport(dt: number, enemies: Enemy[], allies: Unit[], crates: Crate[]) {
    const healRange = this.getParam('healRange', this.data.attackRange)
    const healAmount = this.getParam('healAmount', 20)
    const avoidRadius = this.getParam('avoidRadius', 90)

    const threat = this.nearestThreat(enemies, avoidRadius)
    if (threat) this.moveAwayFromPoint(dt, threat.x, threat.y, 1.1)

    const target = this.bestHealTarget(allies)

    if (!target) {
      if (!threat && this.openNearestCrate(dt, crates)) return
      this.moveToAlliedCluster(dt, allies, 80)
      return
    }

    const dx = target.x - this.x
    const dy = target.y - this.y
    this.setAimTarget(target)
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))

    if (dist > healRange) {
      this.x += (dx / dist) * this.data.speed * dt
      this.y += (dy / dist) * this.data.speed * dt
    } else if (this.attackTimer === 0) {
      const actualHeal = Math.min((target as Unit).maxHp - target.hp, healAmount)
      this.visual?.playAttack()
      target.heal(healAmount)
      this.attackTimer = this.effectiveCooldown()
      if (actualHeal > 0) this.statCallback?.('heal', actualHeal)
      // Heal flash at target
      this.fxGraphics.lineStyle(2, 0xaaffaa, 0.8)
      this.fxGraphics.strokeCircle(target.x, target.y, target.radius + 6)
    }
  }

  private runAoeSlow(dt: number, enemies: Enemy[]) {
    const aoeR  = this.getParam('aoeRadius', 75)
    const target = this.bestClusterTarget(enemies, aoeR)
    if (!target) return
    const dx = target.x - this.x
    const dy = target.y - this.y
    this.setAimTarget(target)
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))

    if (dist > this.data.attackRange) {
      this.x += (dx / dist) * this.data.speed * dt
      this.y += (dy / dist) * this.data.speed * dt
      return
    }

    if (this.attackTimer === 0) {
      const slow  = this.getParam('slowMagnitude', 0.45)
      const dur   = this.getParam('slowDuration', 2.5)
      const dmg   = this.effectiveAttackDamage()

      const inBlast = enemies.filter(e => {
        if (!e.alive) return false
        const dx = e.x - target.x, dy = e.y - target.y
        return dx * dx + dy * dy <= aoeR * aoeR
      })
      if (inBlast.length === 0) return

      const effect: StatusEffect = { type: 'slow', duration: dur, magnitude: slow }
      this.visual?.playAttack()
      for (const e of enemies) {
        if (!e.alive) continue
        const ex = e.x - target.x, ey = e.y - target.y
        if (ex * ex + ey * ey <= aoeR * aoeR) {
          const wasAlive = e.alive
          e.takeDamage(dmg)
          e.applyEffect(effect)
          if (wasAlive && !e.alive) this.statCallback?.('kill', 1)
        }
      }

      // AOE visual — blue pulse ring
      this.fxGraphics.lineStyle(2, 0x44ccff, 0.9)
      this.fxGraphics.strokeCircle(target.x, target.y, aoeR)
      this.fxGraphics.fillStyle(0x44ccff, 0.08)
      this.fxGraphics.fillCircle(target.x, target.y, aoeR)

      this.attackTimer = this.effectiveCooldown()
    }

    this.enforceMaxTowerDistance(dt, this.getParam('leashRadius', 300))
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
      this.setAimTarget(best)
      const wasAlive = best.alive
      this.playAttackEffect(best)
      best.takeDamage(this.effectiveAttackDamage())
      if (wasAlive && !best.alive) this.statCallback?.('kill', 1)
      this.attackTimer = this.effectiveCooldown()
      // Attack flash line to target
      this.fxGraphics.lineStyle(2, 0xffcc66, 0.7)
      this.fxGraphics.lineBetween(this.x, this.y, best.x, best.y)
    }

    // Show guard radius faintly
    this.fxGraphics.lineStyle(1, 0xffcc66, 0.08)
    this.fxGraphics.strokeCircle(CX, CY, guardRange)
  }

  private runAuraHaste(dt: number, allies: Unit[], crates: Crate[]) {
    const auraR  = this.getParam('auraRadius', 150)
    const haste  = this.getParam('hasteMultiplier', 0.5)
    const buffDur = this.data.attackCooldown + 0.1  // refresh slightly longer than interval

    if (!this.openNearestCrate(dt, crates)) this.moveToAlliedCluster(dt, allies, auraR * 0.45)

    if (this.attackTimer === 0) {
      this.visual?.playAttack()
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

  private openNearestCrate(dt: number, crates: Crate[]): boolean {
    if (!this.data.tags.includes('support')) return false
    const target = this.nearestCrate(crates)
    if (!target) return false

    const dx = target.x - this.x
    const dy = target.y - this.y
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))
    this.setAimTarget(target)
    const openRange = this.getParam('crateOpenRange', Math.max(28, this.data.attackRange * 0.55))
    const damage = this.getParam('crateOpenDamage', Math.max(6, this.data.attackDamage))

    if (dist > target.radius + openRange) {
      this.x += (dx / dist) * this.data.speed * 0.9 * dt
      this.y += (dy / dist) * this.data.speed * 0.9 * dt
      return true
    }

    if (this.attackTimer === 0) {
      this.visual?.playAttack()
      target.takeDamage(damage)
      this.fxGraphics.lineStyle(2, 0xffdd77, 0.65)
      this.fxGraphics.lineBetween(this.x, this.y, target.x, target.y)
      this.attackTimer = Math.max(0.45, this.effectiveCooldown() * 0.7)
    }
    return true
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  private moveAndAttack(dt: number, target: Targetable) {
    const dx = target.x - this.x
    const dy = target.y - this.y
    this.setAimTarget(target)
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))
    const stop = target.radius + this.data.attackRange

    if (dist > stop) {
      this.x += (dx / dist) * this.data.speed * dt
      this.y += (dy / dist) * this.data.speed * dt
    } else if (this.attackTimer === 0) {
      const wasAlive = target.alive
      this.playAttackEffect(target)
      target.takeDamage(this.effectiveAttackDamage())
      if (wasAlive && !target.alive) this.statCallback?.('kill', 1)
      this.attackTimer = this.effectiveCooldown()
    }
  }

  private bestInterceptTarget(enemies: Enemy[]): Enemy | null {
    let best: Enemy | null = null
    let bestScore = Infinity
    for (const e of enemies) {
      if (!e.alive) continue
      const unitDist = this.distance(this.x, this.y, e.x, e.y)
      const towerDist = this.distance(CX, CY, e.x, e.y)
      const score = unitDist + towerDist * 0.55
      if (score < bestScore) {
        bestScore = score
        best = e
      }
    }
    return best
  }

  private bestRangedTarget(enemies: Enemy[], allies: Unit[]): Enemy | null {
    let best: Enemy | null = null
    let bestScore = Infinity
    for (const e of enemies) {
      if (!e.alive) continue
      const unitDist = this.distance(this.x, this.y, e.x, e.y)
      const towerDist = this.distance(CX, CY, e.x, e.y)
      const engagedBonus = allies.some(a => {
        if (!a.alive || a === this || !a.data.tags.includes('melee')) return false
        const dx = a.x - e.x, dy = a.y - e.y
        return dx * dx + dy * dy <= 70 * 70
      }) ? 75 : 0
      const score = unitDist + towerDist * 0.25 - engagedBonus
      if (score < bestScore) {
        bestScore = score
        best = e
      }
    }
    return best
  }

  private bestHealTarget(allies: Unit[]): Unit | null {
    let best: Unit | null = null
    let bestScore = Infinity
    for (const ally of allies) {
      if (!ally.alive || ally === this || ally.hp >= ally.maxHp) continue
      const hpFrac = ally.hp / ally.maxHp
      const dist = this.distance(this.x, this.y, ally.x, ally.y)
      const frontlinerBonus = ally.data.tags.includes('melee') || ally.data.tags.includes('tank') ? 40 : 0
      const score = hpFrac * 260 + dist * 0.25 - frontlinerBonus
      if (score < bestScore) {
        bestScore = score
        best = ally
      }
    }
    return best
  }

  private bestClusterTarget(enemies: Enemy[], radius: number): Enemy | null {
    let best: Enemy | null = null
    let bestScore = -Infinity
    for (const e of enemies) {
      if (!e.alive) continue
      let cluster = 0
      for (const other of enemies) {
        if (!other.alive) continue
        const dx = other.x - e.x, dy = other.y - e.y
        if (dx * dx + dy * dy <= radius * radius) cluster += other.isBoss ? 2 : 1
      }
      const dist = this.distance(this.x, this.y, e.x, e.y)
      const score = cluster * 100 - dist * 0.15
      if (score > bestScore) {
        bestScore = score
        best = e
      }
    }
    return best
  }

  private closestEnemyToTower(enemies: Enemy[], maxTowerRadius = Infinity): Enemy | null {
    let best: Enemy | null = null
    let bestDist = Infinity
    for (const e of enemies) {
      if (!e.alive) continue
      const dx = e.x - CX, dy = e.y - CY
      const d = dx * dx + dy * dy
      if (d <= maxTowerRadius * maxTowerRadius && d < bestDist) {
        bestDist = d
        best = e
      }
    }
    return best
  }

  private nearestThreat(enemies: Enemy[], radius: number): Enemy | null {
    let best: Enemy | null = null
    let bestDist = radius * radius
    for (const e of enemies) {
      if (!e.alive) continue
      const dx = e.x - this.x, dy = e.y - this.y
      const d = dx * dx + dy * dy
      if (d < bestDist) {
        bestDist = d
        best = e
      }
    }
    return best
  }

  private nearestCrate(crates: Crate[]): Crate | null {
    let best: Crate | null = null
    let bestDist = Infinity
    for (const crate of crates) {
      if (!crate.alive) continue
      const d = this.distance(this.x, this.y, crate.x, crate.y)
      if (d < bestDist) {
        bestDist = d
        best = crate
      }
    }
    return best
  }

  private moveToAlliedCluster(dt: number, allies: Unit[], desiredDistance: number) {
    if (this.data.speed <= 0) return

    const cluster = allies
      .filter(a => a.alive && a !== this)
      .reduce((acc, ally) => {
        acc.x += ally.x
        acc.y += ally.y
        acc.count += 1
        return acc
      }, { x: 0, y: 0, count: 0 })

    if (cluster.count === 0) {
      this.returnToTowerBand(dt, 85)
      return
    }

    const x = cluster.x / cluster.count
    const y = cluster.y / cluster.count
    if (this.distance(this.x, this.y, x, y) > desiredDistance) {
      this.moveTowardPoint(dt, x, y, 0.75)
    }
  }

  private returnToTowerBand(dt: number, preferredRadius: number) {
    const towerDist = this.distance(CX, CY, this.x, this.y)
    if (towerDist > preferredRadius + 18) {
      this.moveTowardPoint(dt, CX, CY, 0.65)
    } else if (towerDist < preferredRadius - 18 && towerDist > 1) {
      this.moveAwayFromPoint(dt, CX, CY, 0.45)
    }
  }

  private enforceMaxTowerDistance(dt: number, maxRadius: number) {
    if (this.distance(CX, CY, this.x, this.y) <= maxRadius) return
    this.moveTowardPoint(dt, CX, CY, 0.85)
  }

  private applySeparation(dt: number, allies: Unit[]) {
    if (this.data.speed <= 0) return

    const separationRadius = this.getParam('separationRadius', this.data.radius * 2 + 12)
    let pushX = 0
    let pushY = 0

    for (const ally of allies) {
      if (!ally.alive || ally === this) continue
      let dx = this.x - ally.x
      let dy = this.y - ally.y
      let dist = Math.sqrt(dx * dx + dy * dy)
      const minDist = separationRadius + ally.radius * 0.35
      if (dist >= minDist) continue

      if (dist < 1) {
        dx = this.x - CX || 1
        dy = this.y - CY || 0
        dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))
      }

      const pressure = (minDist - dist) / minDist
      pushX += (dx / dist) * pressure
      pushY += (dy / dist) * pressure
    }

    const pushDist = Math.sqrt(pushX * pushX + pushY * pushY)
    if (pushDist === 0) return

    const speed = this.data.speed * 0.75
    this.x += (pushX / pushDist) * speed * dt
    this.y += (pushY / pushDist) * speed * dt
  }

  private applySynergyCohesion(dt: number, allies: Unit[]) {
    if (this.data.speed <= 0) return

    const cohesionEffects = this.synergyEffects.filter(effect => effect.type === 'cohesion')
    if (cohesionEffects.length === 0) return

    const sameType = allies.filter(ally => ally.alive && ally.data.id === this.data.id)
    if (sameType.length <= 1) return

    const center = sameType.reduce((acc, ally) => {
      acc.x += ally.x
      acc.y += ally.y
      return acc
    }, { x: 0, y: 0 })
    center.x /= sameType.length
    center.y /= sameType.length

    for (const effect of cohesionEffects) {
      if (this.distance(this.x, this.y, center.x, center.y) <= effect.radius) continue
      this.moveTowardPoint(dt, center.x, center.y, effect.strength)
    }
  }

  private moveTowardPoint(dt: number, x: number, y: number, speedMultiplier = 1) {
    if (this.data.speed <= 0) return
    const dx = x - this.x
    const dy = y - this.y
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))
    this.x += (dx / dist) * this.data.speed * speedMultiplier * dt
    this.y += (dy / dist) * this.data.speed * speedMultiplier * dt
  }

  private moveAwayFromPoint(dt: number, x: number, y: number, speedMultiplier = 1) {
    if (this.data.speed <= 0) return
    const dx = this.x - x
    const dy = this.y - y
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))
    this.x += (dx / dist) * this.data.speed * speedMultiplier * dt
    this.y += (dy / dist) * this.data.speed * speedMultiplier * dt
  }

  private distance(ax: number, ay: number, bx: number, by: number): number {
    const dx = ax - bx
    const dy = ay - by
    return Math.sqrt(dx * dx + dy * dy)
  }

  private effectiveCooldown(): number {
    const buffMultiplier = this.buffs.reduce((multiplier, buff) => {
      const reduction = Phaser.Math.Clamp(buff.magnitude, 0, 0.85)
      return multiplier * (1 - reduction)
    }, 1)
    const synergyMultiplier = this.synergyEffects
      .filter(effect => effect.type === 'cooldown_mult')
      .reduce((multiplier, effect) => multiplier * effect.value, 1)
    return this.data.attackCooldown * buffMultiplier * synergyMultiplier
  }

  private effectiveAttackDamage(): number {
    return this.data.attackDamage + this.synergyEffects
      .filter(effect => effect.type === 'attack_damage_bonus')
      .reduce((bonus, effect) => bonus + effect.value, 0)
  }

  getParam(name: string, fallback: number): number {
    const base = Number(this.data.params?.[name] ?? fallback)
    let bonus = 0
    for (const effect of this.synergyEffects) {
      if (effect.type === 'param_bonus' && effect.param === name) bonus += effect.value
    }
    return base + bonus
  }

  private tickBuffs(dt: number) {
    for (let i = this.buffs.length - 1; i >= 0; i--) {
      this.buffs[i].duration -= dt
      if (this.buffs[i].duration <= 0) this.buffs.splice(i, 1)
    }
  }

  private playAttackEffect(target: Targetable) {
    this.visual?.playAttack()
    playUnitAttackEffect(this.scene, this.data.effects?.attack, this, target, this.color)
  }

  private setAimTarget(target: { x: number, y: number }) {
    this.aimX = target.x
    this.aimY = target.y
  }

  setSynergyEffects(effects: UnitSynergyEffect[]) {
    this.synergyEffects = [...effects]
  }

  addSynergyEffects(effects: UnitSynergyEffect[]) {
    this.synergyEffects.push(...effects)
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
    const actualHeal = Math.min(this.maxHp - this.hp, amount)
    this.hp = Math.min(this.maxHp, this.hp + amount)
    if (actualHeal > 0) floatHealNumber(this.scene, this.x, this.y, actualHeal)
    this.draw()
  }

  applyShield(amount: number) {
    if (!this.alive) return
    this.shield += amount
    floatHealNumber(this.scene, this.x, this.y - 12, amount)
    this.draw()
  }

  takeDamage(amount: number) {
    if (!this.alive) return
    const absorbed = Math.min(this.shield, amount)
    this.shield -= absorbed
    if (absorbed > 0) audioManager.playSfx(this.scene, 'shield_absorb', 0.22)
    this.hp -= amount - absorbed
    floatDamageNumber(this.scene, this.x, this.y, amount)
    if (this.hp <= 0) {
      this.die()
    } else {
      this.draw()
    }
  }

  private die() {
    this.alive = false
    this.hp = 0
    this.hpBar.clear()
    this.fxGraphics.clear()

    this.scene.tweens.add({
      targets: [this.graphics, this.hpBar, this.fxGraphics, ...(this.visual?.fadeTargets() ?? [])],
      alpha: 0,
      duration: 340,
      ease: 'Quad.easeOut',
      onComplete: () => this.destroy(),
    })
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

  private hasSynergyBuff(): boolean {
    return this.synergyEffects.length > 0
  }

  private draw(dt = 0) {
    this.graphics.clear()

    // Same-unit synergy glow
    if (this.hasSynergyBuff()) {
      this.graphics.lineStyle(2, 0x66ccff, 0.55)
      this.graphics.strokeCircle(this.x, this.y, this.data.radius + 8)
      this.graphics.lineStyle(1, 0xffffff, 0.28)
      this.graphics.strokeCircle(this.x, this.y, this.data.radius + 11)
    }

    // Haste glow
    if (this.isHasted()) {
      this.graphics.lineStyle(2, 0xff88cc, 0.5)
      this.graphics.strokeCircle(this.x, this.y, this.data.radius + 5)
    }

    if (this.shield > 0) {
      this.graphics.lineStyle(2, 0x66ddff, 0.7)
      this.graphics.strokeCircle(this.x, this.y, this.data.radius + 7)
    }

    if (this.visual) {
      this.graphics.lineStyle(2, 0x88ccff, 0.48)
      this.graphics.strokeCircle(this.x, this.y, this.data.radius + 4)
      this.visual.update({
        x: this.x,
        y: this.y,
        radius: this.data.radius,
        aimX: this.aimX,
        aimY: this.aimY,
        cooldownProgress: this.data.attackCooldown > 0 ? 1 - (this.attackTimer / this.effectiveCooldown()) : 1,
        hasSynergy: this.hasSynergyBuff(),
        isHasted: this.isHasted(),
        dt,
      })
    } else {
      this.graphics.lineStyle(2, 0x88ccff, 0.65)
      this.graphics.strokeCircle(this.x, this.y, this.data.radius + 3)
      this.graphics.fillStyle(this.color, 1)
      this.graphics.fillCircle(this.x, this.y, this.data.radius)
      this.graphics.lineStyle(1, 0xffffff, 0.4)
      this.graphics.strokeCircle(this.x, this.y, this.data.radius)
    }

    const bw = this.data.radius * 2.4
    const bh = 3
    const bx = this.x - bw / 2
    const by = this.y - this.data.radius - 5
    this.hpBar.clear()
    this.hpBar.fillStyle(0x002200, 1)
    this.hpBar.fillRect(bx, by, bw, bh)
    this.hpBar.fillStyle(0x44ff88, 1)
    this.hpBar.fillRect(bx, by, bw * (this.hp / this.maxHp), bh)
    if (this.shield > 0) {
      this.hpBar.fillStyle(0x66ddff, 0.9)
      this.hpBar.fillRect(bx, by - 3, Math.min(bw, this.shield / this.maxHp * bw), 2)
    }
  }

  destroy() {
    if (this.destroyed) return
    this.destroyed = true
    this.graphics.destroy()
    this.hpBar.destroy()
    this.fxGraphics.destroy()
    this.visual?.destroy()
  }
}
