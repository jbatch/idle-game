import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload() {
    // Enemies
    this.load.json('grunt',         '/data/enemies/grunt.json')
    this.load.json('runner',        '/data/enemies/runner.json')
    this.load.json('brute',         '/data/enemies/brute.json')
    this.load.json('archer_enemy',  '/data/enemies/archer_enemy.json')
    this.load.json('shaman',        '/data/enemies/shaman.json')
    this.load.json('siege_golem',   '/data/enemies/siege_golem.json')
    this.load.json('boss_chapter1', '/data/enemies/boss_chapter1.json')
    // Units
    this.load.json('footsoldier',   '/data/units/footsoldier.json')
    this.load.json('archer',        '/data/units/archer.json')
    this.load.json('shieldbearer',  '/data/units/shieldbearer.json')
    this.load.json('healer',        '/data/units/healer.json')
    this.load.json('frost_mage',    '/data/units/frost_mage.json')
    this.load.json('sentinel',      '/data/units/sentinel.json')
    this.load.json('bard',          '/data/units/bard.json')
    // Bosses
    this.load.json('boss_chapter2', '/data/enemies/boss_chapter2.json')
    this.load.json('boss_chapter3', '/data/enemies/boss_chapter3.json')
    // Config
    this.load.json('balance',       '/data/balance.json')
    this.load.json('chapter1',      '/data/chapters/chapter1.json')
    this.load.json('chapter2',      '/data/chapters/chapter2.json')
    this.load.json('chapter3',      '/data/chapters/chapter3.json')
    this.load.json('tech_tree',     '/data/tech_tree.json')
  }

  create() {
    this.scene.start('ShopScene')
  }
}
