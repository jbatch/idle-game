import Phaser from 'phaser'
import type { UnitData, BalanceData, TechNode } from '../data/types'
import { GAME_W, GAME_H } from '../constants'
import { debugState } from '../debug/DebugState'
import { techState } from '../systems/TechState'
import { CheatPanel } from '../ui/CheatPanel'

const CHAPTER_DEFS = [
  { id: 'chapter1', questReq: null },
  { id: 'chapter2', questReq: 'boss_chapter1_killed' },
  { id: 'chapter3', questReq: 'boss_chapter2_killed' },
]

const CARD_X = 20
const CARD_W = 530
const CARD_H = 118
const CARD_GAP = 12
const CARDS_Y = 140

const PANEL_X = 568
const PANEL_W = 314
const PANEL_Y = 100
const PANEL_H = GAME_H - PANEL_Y - 20

// IDs of units available in the shop (ordered)
const AVAILABLE_UNITS = ['footsoldier', 'archer', 'shieldbearer', 'healer', 'frost_mage', 'sentinel', 'bard']

export class ShopScene extends Phaser.Scene {
  private balance!: BalanceData
  private unitMap!: Record<string, UnitData>
  private cart: Record<string, number> = {}
  private dcSpent: number = 0
  private dcBudget: number = 3

  private dcText!: Phaser.GameObjects.Text
  private loadoutGroup: Phaser.GameObjects.GameObject[] = []
  private cheatPanel!: CheatPanel

  constructor() {
    super({ key: 'ShopScene' })
  }

  create() {
    this.balance  = this.cache.json.get('balance')  as BalanceData
    this.unitMap  = {}
    for (const id of AVAILABLE_UNITS) {
      this.unitMap[id] = this.cache.json.get(id) as UnitData
    }

    this.dcBudget = this.balance.dcBudget
    this.cart     = {}
    this.dcSpent  = 0

    const nodes = (this.cache.json.get('tech_tree') as { nodes: TechNode[] }).nodes

    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x080810).setOrigin(0, 0)
    this.buildHeader()
    this.buildCards()
    this.buildLoadoutPanel()
    this.cheatPanel = new CheatPanel(this, nodes)
  }

  // ─── Header ──────────────────────────────────────────────────────

  private buildHeader() {
    this.add.text(GAME_W / 2, 28, 'PRE-RUN SHOP', {
      fontSize: '26px', color: '#8899cc', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5)

    // PC balance + tech tree button
    this.add.text(20, 28, `PC: ${techState.pc}`, {
      fontSize: '14px', color: '#ddaa22', fontFamily: 'monospace',
    }).setOrigin(0, 0.5)

    const techBtn = this.add.text(GAME_W - 20, 28, '[ TECH TREE ]', {
      fontSize: '13px', color: '#4455aa', fontFamily: 'monospace',
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true })
    techBtn.on('pointerover', () => techBtn.setColor('#7788cc'))
    techBtn.on('pointerout',  () => techBtn.setColor('#4455aa'))
    techBtn.on('pointerdown', () => this.scene.start('TechTreeScene'))

    const cheatsBtn = this.add.text(GAME_W - 20, 52, '[ CHEATS ]', {
      fontSize: '11px', color: '#334433', fontFamily: 'monospace',
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true })
    cheatsBtn.on('pointerover', () => cheatsBtn.setColor('#557755'))
    cheatsBtn.on('pointerout',  () => cheatsBtn.setColor('#334433'))
    cheatsBtn.on('pointerdown', () => this.cheatPanel.open())

    // Chapter selector — one button per chapter
    const chapterY = 60
    const slotW = 180
    const startX = GAME_W / 2 - slotW

    CHAPTER_DEFS.forEach((def, i) => {
      const chData = this.cache.json.get(def.id) as { name: string }
      const isUnlocked = !def.questReq || techState.questDone(def.questReq)
      const isActive   = debugState.chapter === def.id
      const x = startX + i * slotW

      const label = isUnlocked ? chData.name : '???'
      const color = isActive ? '#8899cc' : isUnlocked ? '#445577' : '#2a3344'
      const btn = this.add.text(x, chapterY, label, {
        fontSize: '12px', color, fontFamily: 'monospace',
      }).setOrigin(0.5)

      if (isUnlocked) {
        btn.setInteractive({ useHandCursor: true })
        btn.on('pointerover', () => btn.setColor(isActive ? '#aabbdd' : '#667799'))
        btn.on('pointerout',  () => btn.setColor(color))
        btn.on('pointerdown', () => {
          if (isActive) return
          debugState.chapter = def.id
          this.scene.restart()
        })
      }
    })

    // DC budget display — updated live
    this.dcText = this.add.text(PANEL_X + PANEL_W / 2, 90, '', {
      fontSize: '15px', color: '#ddaa22', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5)
    this.refreshDCText()

    // Separator line
    const g = this.add.graphics()
    g.lineStyle(1, 0x223366, 1)
    g.lineBetween(20, 108, GAME_W - 20, 108)
  }

  private refreshDCText() {
    const remaining = this.dcBudget - this.dcSpent
    this.dcText.setText(`DC: ${remaining} / ${this.dcBudget}`)
    this.dcText.setColor(remaining > 0 ? '#ddaa22' : '#664422')
  }

  // ─── Unit cards ──────────────────────────────────────────────────

  private buildCards() {
    this.add.text(CARD_X, CARDS_Y - 22, 'AVAILABLE UNITS', {
      fontSize: '11px', color: '#445577', fontFamily: 'monospace',
    })

    AVAILABLE_UNITS.forEach((id, i) => {
      const data = this.unitMap[id]
      const y = CARDS_Y + i * (CARD_H + CARD_GAP)
      this.buildCard(data, CARD_X, y)
    })
  }

  private buildCard(data: UnitData, x: number, y: number) {
    const color = Number(data.color)

    // Background
    const bg = this.add.rectangle(x, y, CARD_W, CARD_H, 0x0d1122).setOrigin(0, 0)
    const border = this.add.graphics()
    border.lineStyle(1, 0x223366, 1)
    border.strokeRect(x, y, CARD_W, CARD_H)

    // Left colour strip
    const strip = this.add.graphics()
    strip.fillStyle(color, 0.8)
    strip.fillRect(x, y, 4, CARD_H)

    // Unit icon
    const icon = this.add.graphics()
    icon.fillStyle(color, 1)
    icon.fillCircle(x + 28, y + CARD_H / 2, 14)
    icon.lineStyle(1, 0xffffff, 0.3)
    icon.strokeCircle(x + 28, y + CARD_H / 2, 14)

    // Name + cost
    this.add.text(x + 52, y + 12, data.name, {
      fontSize: '16px', color: '#ccd4ff', fontFamily: 'monospace', fontStyle: 'bold',
    })
    this.add.text(x + CARD_W - 12, y + 12, `${data.cost} DC`, {
      fontSize: '14px', color: '#ddaa22', fontFamily: 'monospace',
    }).setOrigin(1, 0)

    // Stats
    const stats = `HP: ${data.hp}   ATK: ${data.attackDamage}   RNG: ${data.attackRange}   CD: ${data.attackCooldown}s`
    this.add.text(x + 52, y + 40, stats, {
      fontSize: '11px', color: '#667799', fontFamily: 'monospace',
    })

    // Description
    this.add.text(x + 52, y + 62, data.description, {
      fontSize: '12px', color: '#8899aa', fontFamily: 'monospace',
    })

    // ADD button
    const btnW = 80
    const btnH = 26
    const btnX = x + CARD_W - btnW - 10
    const btnY = y + CARD_H - btnH - 10

    const addBtn = this.add.rectangle(btnX, btnY, btnW, btnH, 0x112244)
      .setOrigin(0, 0).setInteractive({ useHandCursor: true })
    const addText = this.add.text(btnX + btnW / 2, btnY + btnH / 2, '+ ADD', {
      fontSize: '12px', color: '#6688cc', fontFamily: 'monospace',
    }).setOrigin(0.5)

    addBtn.on('pointerover', () => {
      if (this.dcSpent < this.dcBudget) addBtn.setFillStyle(0x1a3366)
    })
    addBtn.on('pointerout', () => addBtn.setFillStyle(0x112244))
    addBtn.on('pointerdown', () => {
      if (this.dcSpent + data.cost > this.dcBudget) return
      this.cart[data.id] = (this.cart[data.id] ?? 0) + 1
      this.dcSpent += data.cost
      this.refreshDCText()
      this.refreshLoadout()
    })

    // Store bg ref for hover effect on whole card
    bg.setInteractive({ useHandCursor: true })
    bg.on('pointerover', () => {
      if (this.dcSpent < this.dcBudget) bg.setFillStyle(0x111830)
    })
    bg.on('pointerout', () => bg.setFillStyle(0x0d1122))
    bg.on('pointerdown', () => addBtn.emit('pointerdown'))

    // Keep add button text in sync with affordability
    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        const canAfford = this.dcSpent + data.cost <= this.dcBudget
        addText.setColor(canAfford ? '#6688cc' : '#334455')
      },
    })
  }

  // ─── Loadout panel ───────────────────────────────────────────────

  private buildLoadoutPanel() {
    this.add.rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 0x0a0f1a).setOrigin(0, 0)
    const border = this.add.graphics()
    border.lineStyle(1, 0x1a2244, 1)
    border.strokeRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H)

    this.add.text(PANEL_X + 16, PANEL_Y + 14, 'LOADOUT', {
      fontSize: '13px', color: '#445577', fontFamily: 'monospace', fontStyle: 'bold',
    })

    // Start button (always present, wired to current cart)
    const btnY = PANEL_Y + PANEL_H - 54
    const startBtn = this.add.rectangle(PANEL_X + 16, btnY, PANEL_W - 32, 40, 0x112244)
      .setOrigin(0, 0).setInteractive({ useHandCursor: true })
    this.add.text(PANEL_X + PANEL_W / 2, btnY + 20, 'START RUN  →', {
      fontSize: '15px', color: '#4466bb', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1)

    startBtn.on('pointerover', () => startBtn.setFillStyle(0x1a3a77))
    startBtn.on('pointerout', () => startBtn.setFillStyle(0x112244))
    startBtn.on('pointerdown', () => this.startRun())

    this.refreshLoadout()
  }

  private refreshLoadout() {
    // Destroy old dynamic rows
    for (const obj of this.loadoutGroup) obj.destroy()
    this.loadoutGroup = []

    const startY = PANEL_Y + 44
    const cartEntries = Object.entries(this.cart).filter(([, count]) => count > 0)

    if (cartEntries.length === 0) {
      const t = this.add.text(PANEL_X + PANEL_W / 2, startY + 30, 'No units selected', {
        fontSize: '12px', color: '#334455', fontFamily: 'monospace',
      }).setOrigin(0.5)
      this.loadoutGroup.push(t)
    } else {
      cartEntries.forEach(([id, count], i) => {
        const data = this.unitMap[id]
        const y = startY + i * 40
        const color = Number(data.color)

        const dot = this.add.graphics()
        dot.fillStyle(color, 1)
        dot.fillCircle(PANEL_X + 26, y + 14, 7)
        this.loadoutGroup.push(dot)

        const label = this.add.text(PANEL_X + 42, y + 6, `${data.name}`, {
          fontSize: '13px', color: '#aabbcc', fontFamily: 'monospace',
        })
        this.loadoutGroup.push(label)

        const countText = this.add.text(PANEL_X + 42, y + 22, `× ${count}  (${count * data.cost} DC)`, {
          fontSize: '11px', color: '#556688', fontFamily: 'monospace',
        })
        this.loadoutGroup.push(countText)

        // Remove [-] button
        const remBtn = this.add.rectangle(PANEL_X + PANEL_W - 42, y + 10, 28, 22, 0x220e0e)
          .setOrigin(0, 0).setInteractive({ useHandCursor: true })
        this.loadoutGroup.push(remBtn)

        const remText = this.add.text(PANEL_X + PANEL_W - 28, y + 21, '−', {
          fontSize: '14px', color: '#773333', fontFamily: 'monospace',
        }).setOrigin(0.5)
        this.loadoutGroup.push(remText)

        remBtn.on('pointerover', () => remBtn.setFillStyle(0x331212))
        remBtn.on('pointerout', () => remBtn.setFillStyle(0x220e0e))
        remBtn.on('pointerdown', () => {
          this.cart[id]--
          this.dcSpent -= data.cost
          if (this.cart[id] <= 0) delete this.cart[id]
          this.refreshDCText()
          this.refreshLoadout()
        })
      })
    }

    // Separator above start button
    const sep = this.add.graphics()
    sep.lineStyle(1, 0x1a2244, 1)
    sep.lineBetween(PANEL_X + 10, PANEL_Y + PANEL_H - 66, PANEL_X + PANEL_W - 10, PANEL_Y + PANEL_H - 66)
    this.loadoutGroup.push(sep)

    // Total cost
    const totalLabel = this.add.text(
      PANEL_X + 16, PANEL_Y + PANEL_H - 80,
      `Total: ${this.dcSpent} / ${this.dcBudget} DC`,
      { fontSize: '12px', color: '#667799', fontFamily: 'monospace' }
    )
    this.loadoutGroup.push(totalLabel)
  }

  private startRun() {
    const loadout: string[] = []
    for (const [id, count] of Object.entries(this.cart)) {
      for (let i = 0; i < count; i++) loadout.push(id)
    }
    this.scene.start('GameScene', { loadout })
  }
}
