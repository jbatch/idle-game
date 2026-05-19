import Phaser from 'phaser'
import type { UnitManifestData } from '../data/types'

type DataAsset = {
  key: string
  path: string
}

type SvgAsset = DataAsset & {
  size: number
}

const DATA_CACHE_VERSION = '0.2.11'

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

export const unitVisualAssets: SvgAsset[] = [
  { key: 'unit_footsoldier_body', path: '/assets/sprites/units/footsoldier-body.svg', size: 64 },
  { key: 'unit_archer_body', path: '/assets/sprites/units/archer-body.svg', size: 64 },
  { key: 'unit_shieldbearer_body', path: '/assets/sprites/units/shieldbearer-body.svg', size: 64 },
  { key: 'unit_healer_body', path: '/assets/sprites/units/healer-body.svg', size: 64 },
  { key: 'unit_frost_mage_body', path: '/assets/sprites/units/frost-mage-body.svg', size: 64 },
  { key: 'unit_sentinel_body', path: '/assets/sprites/units/sentinel-body.svg', size: 64 },
  { key: 'unit_bard_body', path: '/assets/sprites/units/bard-body.svg', size: 64 },
  { key: 'unit_weapon_sword', path: '/assets/sprites/weapons/sword.svg', size: 64 },
  { key: 'unit_weapon_bow', path: '/assets/sprites/weapons/bow.svg', size: 64 },
  { key: 'unit_weapon_shield', path: '/assets/sprites/weapons/shield.svg', size: 64 },
  { key: 'unit_weapon_staff', path: '/assets/sprites/weapons/staff.svg', size: 64 },
  { key: 'unit_weapon_frost_orb', path: '/assets/sprites/weapons/frost-orb.svg', size: 64 },
  { key: 'unit_weapon_crossbow', path: '/assets/sprites/weapons/crossbow.svg', size: 64 },
  { key: 'unit_weapon_lute', path: '/assets/sprites/weapons/lute.svg', size: 64 },
]

export const enemyVisualAssets: SvgAsset[] = [
  { key: 'enemy_grunt_body', path: '/assets/sprites/enemies/grunt-body.svg', size: 64 },
  { key: 'enemy_runner_body', path: '/assets/sprites/enemies/runner-body.svg', size: 64 },
  { key: 'enemy_brute_body', path: '/assets/sprites/enemies/brute-body.svg', size: 64 },
  { key: 'enemy_archer_body', path: '/assets/sprites/enemies/archer-body.svg', size: 64 },
  { key: 'enemy_shaman_body', path: '/assets/sprites/enemies/shaman-body.svg', size: 64 },
  { key: 'enemy_siege_golem_body', path: '/assets/sprites/enemies/siege-golem-body.svg', size: 64 },
  { key: 'enemy_stone_warden_body', path: '/assets/sprites/enemies/stone-warden-body.svg', size: 64 },
  { key: 'enemy_iron_colossus_body', path: '/assets/sprites/enemies/iron-colossus-body.svg', size: 64 },
  { key: 'enemy_void_sovereign_body', path: '/assets/sprites/enemies/void-sovereign-body.svg', size: 64 },
]

export function loadGameData(scene: Phaser.Scene): void {
  for (const asset of gameDataAssets) {
    scene.load.json(asset.key, versionedDataPath(asset.path))
  }
  for (const asset of [...unitVisualAssets, ...enemyVisualAssets]) {
    if (!scene.textures.exists(asset.key)) {
      scene.load.svg(asset.key, versionedDataPath(asset.path), { width: asset.size, height: asset.size })
    }
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
    scene.load.json(id, versionedDataPath(`/data/units/${id}.json`))
  }
  scene.load.start()
}

function versionedDataPath(path: string): string {
  return `${path}?v=${DATA_CACHE_VERSION}`
}
