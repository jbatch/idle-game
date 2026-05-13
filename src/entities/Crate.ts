import Phaser from 'phaser'
import type { CrateKindData, CrateRewardData, Targetable } from '../data/types'
import { floatDamageNumber } from '../effects/CombatEffects'

export class Crate implements Targetable {
  scene: Phaser.Scene
  x: number
  y: number
  hp: number
  maxHp: number
  radius: number
  alive: boolean = true
  data: CrateKindData
  reward: CrateRewardData
  targetType: 'crate' = 'crate'

  private color: number
  private graphics: Phaser.GameObjects.Graphics
  private hpBar: Phaser.GameObjects.Graphics
  private label: Phaser.GameObjects.Text
  private destroyed = false
  private onOpened: (crate: Crate) => void

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    data: CrateKindData,
    reward: CrateRewardData,
    onOpened: (crate: Crate) => void,
  ) {
    this.scene = scene
    this.x = x
    this.y = y
    this.data = data
    this.reward = reward
    this.hp = data.hp
    this.maxHp = data.hp
    this.radius = data.radius
    this.color = Number(data.color)
    this.onOpened = onOpened
    this.graphics = scene.add.graphics().setDepth(4)
    this.hpBar = scene.add.graphics().setDepth(5)
    this.label = scene.add.text(x, y - data.radius - 18, data.name, {
      fontSize: '10px',
      color: '#ffe1a3',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(6)
    this.draw()
  }

  takeDamage(amount: number) {
    if (!this.alive) return
    floatDamageNumber(this.scene, this.x, this.y, amount)
    this.hp -= amount
    if (this.hp <= 0) this.open()
    else this.draw()
  }

  private open() {
    if (!this.alive) return
    this.alive = false
    this.hp = 0
    this.hpBar.clear()
    this.onOpened(this)

    this.scene.tweens.add({
      targets: [this.graphics, this.hpBar, this.label],
      alpha: 0,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => this.destroy(),
    })
  }

  private draw() {
    this.graphics.clear()
    this.graphics.lineStyle(2, 0xffdd77, 0.38)
    this.graphics.strokeCircle(this.x, this.y, this.radius + 6)
    this.graphics.fillStyle(this.color, 1)
    this.graphics.fillRoundedRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2, 4)
    this.graphics.lineStyle(2, 0x3b2510, 0.75)
    this.graphics.strokeRoundedRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2, 4)
    this.graphics.lineStyle(1, 0xfff2c2, 0.35)
    this.graphics.lineBetween(this.x - this.radius + 4, this.y, this.x + this.radius - 4, this.y)
    this.graphics.lineBetween(this.x, this.y - this.radius + 4, this.x, this.y + this.radius - 4)

    this.label.setPosition(this.x, this.y - this.radius - 18)
    const barW = this.radius * 2.3
    const barH = 4
    const bx = this.x - barW / 2
    const by = this.y + this.radius + 6
    this.hpBar.clear()
    this.hpBar.fillStyle(0x24150a, 1)
    this.hpBar.fillRect(bx, by, barW, barH)
    this.hpBar.fillStyle(0xffdd77, 1)
    this.hpBar.fillRect(bx + 1, by + 1, (barW - 2) * (this.hp / this.maxHp), barH - 2)
  }

  destroy() {
    if (this.destroyed) return
    this.destroyed = true
    this.graphics.destroy()
    this.hpBar.destroy()
    this.label.destroy()
  }
}
