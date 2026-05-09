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
