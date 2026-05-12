import Phaser from 'phaser'
import type { Targetable, UnitAttackEffect } from '../data/types'

type Point = {
  x: number
  y: number
}

const DAMAGE_COLOR = '#ffdf7a'
const HEAL_COLOR = '#7cff9f'

export function floatDamageNumber(scene: Phaser.Scene, x: number, y: number, amount: number) {
  floatNumber(scene, x, y, `-${Math.round(amount)}`, DAMAGE_COLOR)
}

export function floatHealNumber(scene: Phaser.Scene, x: number, y: number, amount: number) {
  if (amount <= 0) return
  floatNumber(scene, x, y, `+${Math.round(amount)}`, HEAL_COLOR)
}

export function playUnitAttackEffect(
  scene: Phaser.Scene,
  effect: UnitAttackEffect | undefined,
  from: Point,
  target: Targetable,
  color: number,
) {
  switch (effect) {
    case 'melee_slash':
      playMeleeSlash(scene, from, target, color)
      break
    case 'quick_projectile':
      playQuickProjectile(scene, from, target, color)
      break
  }
}

export function playEnemyMeleeAttackEffect(
  scene: Phaser.Scene,
  from: Point,
  target: Targetable,
  color: number,
) {
  playMeleeSlash(scene, from, target, color)
}

export function playEnemyProjectileEffect(
  scene: Phaser.Scene,
  from: Point,
  target: Targetable,
  color: number,
) {
  playQuickProjectile(scene, from, target, color)
}

export function playEnemyHealEffect(
  scene: Phaser.Scene,
  from: Point,
  target: Targetable,
  color: number,
) {
  const beam = scene.add.graphics().setDepth(17)
  beam.lineStyle(2, color, 0.75)
  beam.lineBetween(from.x, from.y, target.x, target.y)
  beam.lineStyle(1, 0xffffff, 0.35)
  beam.lineBetween(from.x, from.y, target.x, target.y)

  const pulse = scene.add.graphics().setPosition(target.x, target.y).setDepth(18)
  pulse.lineStyle(2, color, 0.85)
  pulse.strokeCircle(0, 0, target.radius + 5)

  scene.tweens.add({
    targets: beam,
    alpha: 0,
    duration: 180,
    ease: 'Quad.easeOut',
    onComplete: () => beam.destroy(),
  })
  scene.tweens.add({
    targets: pulse,
    alpha: 0,
    scale: 1.35,
    duration: 220,
    ease: 'Quad.easeOut',
    onComplete: () => pulse.destroy(),
  })
}

export function playEnemySplashEffect(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  color: number,
) {
  const gfx = scene.add.graphics().setPosition(x, y).setDepth(17)
  gfx.lineStyle(3, color, 0.55)
  gfx.strokeCircle(0, 0, radius * 0.25)
  gfx.lineStyle(1, 0xffffff, 0.3)
  gfx.strokeCircle(0, 0, radius * 0.15)

  scene.tweens.add({
    targets: gfx,
    alpha: 0,
    scale: 4,
    duration: 260,
    ease: 'Quad.easeOut',
    onComplete: () => gfx.destroy(),
  })
}

export function playCursorImpactEffect(
  scene: Phaser.Scene,
  x: number,
  y: number,
  knockbackTriggered: boolean,
) {
  const color = knockbackTriggered ? 0xffdd44 : 0xfff0aa
  const gfx = scene.add.graphics().setPosition(x, y).setDepth(19)

  gfx.lineStyle(knockbackTriggered ? 3 : 2, color, 0.9)
  gfx.strokeCircle(0, 0, knockbackTriggered ? 14 : 9)
  gfx.lineStyle(1, 0xffffff, 0.5)
  gfx.strokeCircle(0, 0, knockbackTriggered ? 7 : 5)

  scene.tweens.add({
    targets: gfx,
    alpha: 0,
    scale: knockbackTriggered ? 1.9 : 1.45,
    duration: knockbackTriggered ? 240 : 170,
    ease: 'Quad.easeOut',
    onComplete: () => gfx.destroy(),
  })
}

function floatNumber(scene: Phaser.Scene, x: number, y: number, text: string, color: string) {
  const label = scene.add.text(x, y - 18, text, {
    fontSize: '14px',
    color,
    fontFamily: 'monospace',
    fontStyle: 'bold',
    stroke: '#08080f',
    strokeThickness: 3,
  }).setOrigin(0.5).setDepth(40)

  scene.tweens.add({
    targets: label,
    y: label.y - 24,
    alpha: 0,
    scale: 1.18,
    duration: 560,
    ease: 'Cubic.easeOut',
    onComplete: () => label.destroy(),
  })
}

function playMeleeSlash(scene: Phaser.Scene, from: Point, target: Targetable, color: number) {
  const dx = target.x - from.x
  const dy = target.y - from.y
  const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))
  const nx = dx / dist
  const ny = dy / dist
  const px = -ny
  const py = nx
  const slashLength = target.radius + 15
  const cx = target.x - nx * target.radius * 0.25
  const cy = target.y - ny * target.radius * 0.25

  const gfx = scene.add.graphics().setDepth(18)
  gfx.lineStyle(3, color, 0.95)
  gfx.lineBetween(
    cx - px * slashLength,
    cy - py * slashLength,
    cx + px * slashLength,
    cy + py * slashLength,
  )
  gfx.lineStyle(1, 0xffffff, 0.65)
  gfx.lineBetween(
    cx - px * slashLength * 0.65,
    cy - py * slashLength * 0.65,
    cx + px * slashLength * 0.65,
    cy + py * slashLength * 0.65,
  )

  scene.tweens.add({
    targets: gfx,
    alpha: 0,
    duration: 160,
    ease: 'Quad.easeOut',
    onComplete: () => gfx.destroy(),
  })
}

function playQuickProjectile(scene: Phaser.Scene, from: Point, target: Targetable, color: number) {
  const projectile = scene.add.circle(from.x, from.y, 3, color, 1).setDepth(18)
  projectile.setStrokeStyle(1, 0xffffff, 0.65)

  scene.tweens.add({
    targets: projectile,
    x: target.x,
    y: target.y,
    duration: 110,
    ease: 'Linear',
    onComplete: () => {
      projectile.destroy()
      playImpactSpark(scene, target.x, target.y, color)
    },
  })
}

function playImpactSpark(scene: Phaser.Scene, x: number, y: number, color: number) {
  const gfx = scene.add.graphics().setPosition(x, y).setDepth(18)
  gfx.lineStyle(2, color, 0.85)
  gfx.strokeCircle(0, 0, 7)
  gfx.lineStyle(1, 0xffffff, 0.45)
  gfx.strokeCircle(0, 0, 11)

  scene.tweens.add({
    targets: gfx,
    alpha: 0,
    scale: 1.45,
    duration: 170,
    ease: 'Quad.easeOut',
    onComplete: () => gfx.destroy(),
  })
}
