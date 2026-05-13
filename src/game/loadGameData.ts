import Phaser from 'phaser'
import type { UnitManifestData } from '../data/types'

type DataAsset = {
  key: string
  path: string
}

export const gameDataAssets: DataAsset[] = [
  { key: 'grunt', path: '/data/enemies/grunt.json' },
  { key: 'runner', path: '/data/enemies/runner.json' },
  { key: 'brute', path: '/data/enemies/brute.json' },
  { key: 'archer_enemy', path: '/data/enemies/archer_enemy.json' },
  { key: 'shaman', path: '/data/enemies/shaman.json' },
  { key: 'siege_golem', path: '/data/enemies/siege_golem.json' },
  { key: 'boss_chapter1', path: '/data/enemies/boss_chapter1.json' },
  { key: 'boss_chapter2', path: '/data/enemies/boss_chapter2.json' },
  { key: 'boss_chapter3', path: '/data/enemies/boss_chapter3.json' },
  { key: 'unit_manifest', path: '/data/unit_manifest.json' },
  { key: 'balance', path: '/data/balance.json' },
  { key: 'shop_packs', path: '/data/shop_packs.json' },
  { key: 'crates', path: '/data/crates.json' },
  { key: 'unit_synergies', path: '/data/unit_synergies.json' },
  { key: 'chapter1', path: '/data/chapters/chapter1.json' },
  { key: 'chapter2', path: '/data/chapters/chapter2.json' },
  { key: 'chapter3', path: '/data/chapters/chapter3.json' },
  { key: 'tech_tree', path: '/data/tech_tree.json' },
  { key: 'tech_tree_layout', path: '/data/tech_tree_layout.json' },
]

export function loadGameData(scene: Phaser.Scene): void {
  for (const asset of gameDataAssets) {
    scene.load.json(asset.key, asset.path)
  }
}

export function unitIdsFromCache(scene: Phaser.Scene): string[] {
  const manifest = scene.cache.json.get('unit_manifest') as UnitManifestData | undefined
  return manifest?.units ?? []
}

export function loadUnitDataFromManifest(scene: Phaser.Scene, onComplete: () => void): void {
  const unitIds = unitIdsFromCache(scene).filter(id => !scene.cache.json.exists(id))
  if (unitIds.length === 0) {
    onComplete()
    return
  }

  scene.load.once('complete', onComplete)
  for (const id of unitIds) {
    scene.load.json(id, `/data/units/${id}.json`)
  }
  scene.load.start()
}
