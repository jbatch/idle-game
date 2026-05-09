import Phaser from 'phaser'
import type { ChapterData, EnemyData, SpawnEvent } from '../data/types'
import { Enemy } from '../entities/Enemy'
import { CX, CY, SPAWN_RADIUS } from '../constants'

export class WaveManager {
  private scene: Phaser.Scene
  private schedule: SpawnEvent[]
  private enemyMap: Record<string, EnemyData>
  private baseMultiplier: number
  private elapsed: number = 0
  private nextEventIndex: number = 0

  onSpawn: (enemy: Enemy) => void = () => {}
  onBossSpawn: (enemy: Enemy) => void = () => {}

  constructor(scene: Phaser.Scene, chapter: ChapterData, enemyMap: Record<string, EnemyData>) {
    this.scene = scene
    this.schedule = [...chapter.spawnSchedule].sort((a, b) => a.time - b.time)
    this.enemyMap = enemyMap
    this.baseMultiplier = chapter.baseMultiplier
  }

  update(delta: number) {
    this.elapsed += delta / 1000
    while (
      this.nextEventIndex < this.schedule.length &&
      this.elapsed >= this.schedule[this.nextEventIndex].time
    ) {
      this.fire(this.schedule[this.nextEventIndex])
      this.nextEventIndex++
    }
  }

  private fire(event: SpawnEvent) {
    const data = this.enemyMap[event.enemyId]
    if (!data) {
      console.warn(`Unknown enemyId: ${event.enemyId}`)
      return
    }
    const scaled = this.scale(data)
    for (const pos of this.positions(event)) {
      const enemy = new Enemy(this.scene, pos.x, pos.y, scaled)
      if (data.isBoss) this.onBossSpawn(enemy)
      else this.onSpawn(enemy)
    }
  }

  private scale(data: EnemyData): EnemyData {
    if (this.baseMultiplier === 1) return data
    return {
      ...data,
      hp: Math.round(data.hp * this.baseMultiplier),
      damage: Math.round(data.damage * this.baseMultiplier),
      speed: data.speed * this.baseMultiplier,
    }
  }

  private positions(event: SpawnEvent): { x: number; y: number }[] {
    const out: { x: number; y: number }[] = []
    if (event.formation === 'ring') {
      const offset = Math.random() * Math.PI * 2
      for (let i = 0; i < event.count; i++) {
        const a = offset + (i / event.count) * Math.PI * 2
        out.push({ x: CX + Math.cos(a) * SPAWN_RADIUS, y: CY + Math.sin(a) * SPAWN_RADIUS })
      }
    } else if (event.formation === 'cluster') {
      const base = Math.random() * Math.PI * 2
      for (let i = 0; i < event.count; i++) {
        const a = base + (Math.random() - 0.5) * 0.5
        const r = SPAWN_RADIUS - Math.random() * 15
        out.push({ x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r })
      }
    } else {
      for (let i = 0; i < event.count; i++) {
        const a = Math.random() * Math.PI * 2
        out.push({ x: CX + Math.cos(a) * SPAWN_RADIUS, y: CY + Math.sin(a) * SPAWN_RADIUS })
      }
    }
    return out
  }

  get timeToNext(): number | null {
    if (this.nextEventIndex >= this.schedule.length) return null
    return Math.max(0, this.schedule[this.nextEventIndex].time - this.elapsed)
  }

  get nextIsBoss(): boolean {
    if (this.nextEventIndex >= this.schedule.length) return false
    const next = this.schedule[this.nextEventIndex]
    return this.enemyMap[next.enemyId]?.isBoss ?? false
  }

  get eventsComplete(): boolean {
    return this.nextEventIndex >= this.schedule.length
  }

  get waveFired(): number {
    return this.nextEventIndex
  }

  get waveTotal(): number {
    return this.schedule.length
  }
}
