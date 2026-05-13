import Phaser from 'phaser'

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
  { key: 'footsoldier', path: '/data/units/footsoldier.json' },
  { key: 'archer', path: '/data/units/archer.json' },
  { key: 'shieldbearer', path: '/data/units/shieldbearer.json' },
  { key: 'healer', path: '/data/units/healer.json' },
  { key: 'frost_mage', path: '/data/units/frost_mage.json' },
  { key: 'sentinel', path: '/data/units/sentinel.json' },
  { key: 'bard', path: '/data/units/bard.json' },
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
