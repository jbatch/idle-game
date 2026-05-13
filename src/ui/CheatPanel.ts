import Phaser from 'phaser'
import type { TechNode } from '../data/types'
import { techState, checkStatQuests } from '../systems/TechState'
import { campaignLog, type CampaignRunRecord } from '../systems/CampaignLog'
import { GAME_W, GAME_H } from '../constants'
import { unitIdsFromCache } from '../game/loadGameData'

const PX = 50
const PY = 60
const PW = GAME_W - 100
const PH = GAME_H - 110

const TAB_Y    = PY + 48
const TAB_H    = 32
const CONTENT_Y = TAB_Y + TAB_H + 8
const CONTENT_H = PH - (CONTENT_Y - PY) - 56   // leave room for footer

const TABS = ['QUESTS', 'TECH', 'STATS', 'RUNS'] as const
type Tab = typeof TABS[number]

export class CheatPanel {
  private scene: Phaser.Scene
  private nodes: TechNode[]
  private overlay!: Phaser.GameObjects.Rectangle
  private panel!: Phaser.GameObjects.Container
  private contentContainer!: Phaser.GameObjects.Container
  private tabBtns: Phaser.GameObjects.Text[] = []
  private activeTab: Tab = 'QUESTS'
  private isOpen = false
  private scrollY = 0
  private contentHeight = 0

  constructor(scene: Phaser.Scene, nodes: TechNode[]) {
    this.scene = scene
    this.nodes = nodes
    this.build()
  }

  private build() {
    // Dim overlay
    this.overlay = this.scene.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.72)
      .setOrigin(0, 0).setDepth(50).setVisible(false)
      .setInteractive()  // block clicks through to scene
    this.overlay.on('pointerdown', () => {})

    this.panel = this.scene.add.container(PX, PY).setDepth(51).setVisible(false)

    // Panel background + border
    const bg = this.scene.add.rectangle(0, 0, PW, PH, 0x080c18).setOrigin(0, 0)
    const border = this.scene.add.graphics()
    border.lineStyle(1, 0x2a3a6a, 1)
    border.strokeRect(0, 0, PW, PH)
    border.lineStyle(1, 0x3a4a8a, 1)
    border.strokeRect(1, 1, PW - 2, PH - 2)

    // Title
    const title = this.scene.add.text(PW / 2, 18, 'CHEATS & INSPECTOR', {
      fontSize: '16px', color: '#8899cc', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5)

    // Close button
    const closeBtn = this.scene.add.text(PW - 14, 14, '✕', {
      fontSize: '14px', color: '#446688', fontFamily: 'monospace',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true })
    closeBtn.on('pointerover', () => closeBtn.setColor('#88aacc'))
    closeBtn.on('pointerout',  () => closeBtn.setColor('#446688'))
    closeBtn.on('pointerdown', () => this.close())

    // Tab bar
    const tabSep = this.scene.add.graphics()
    tabSep.lineStyle(1, 0x1a2244, 1)
    tabSep.lineBetween(0, TAB_Y - PY + TAB_H, PW, TAB_Y - PY + TAB_H)

    this.tabBtns = TABS.map((tab, i) => {
      const x = 16 + i * 96
      const y = TAB_Y - PY
      const btn = this.scene.add.text(x + 52, y + TAB_H / 2, tab, {
        fontSize: '12px', color: '#445577', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      btn.on('pointerdown', () => this.switchTab(tab))
      return btn
    })

    // Scrollable content area
    this.contentContainer = this.scene.add.container(0, CONTENT_Y - PY)

    // Footer separator + buttons
    const footerY = PH - 50
    const footerSep = this.scene.add.graphics()
    footerSep.lineStyle(1, 0x1a2244, 1)
    footerSep.lineBetween(16, footerY, PW - 16, footerY)

    const addPcBtn = this.scene.add.text(PW / 2 - 100, footerY + 20, '[ +100 PC ]', {
      fontSize: '13px', color: '#446622', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    addPcBtn.on('pointerover', () => addPcBtn.setColor('#88cc44'))
    addPcBtn.on('pointerout',  () => addPcBtn.setColor('#446622'))
    addPcBtn.on('pointerdown', () => {
      techState.addPc(100)
      this.rebuildContent()
    })

    const resetBtn = this.scene.add.text(PW / 2 + 80, footerY + 20, '[ RESET ALL PROGRESS ]', {
      fontSize: '13px', color: '#662222', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    resetBtn.on('pointerover', () => resetBtn.setColor('#cc4444'))
    resetBtn.on('pointerout',  () => resetBtn.setColor('#662222'))
    resetBtn.on('pointerdown', () => {
      techState.reset()
      this.close()
      this.scene.scene.restart()
    })

    this.panel.add([bg, border, title, closeBtn, tabSep, ...this.tabBtns, this.contentContainer, footerSep, addPcBtn, resetBtn])

    // Scroll on wheel (only when open)
    this.scene.input.on('wheel', (_p: unknown, _go: unknown, _dx: unknown, deltaY: number) => {
      if (!this.isOpen) return
      const maxScroll = Math.max(0, this.contentHeight - CONTENT_H)
      this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY * 0.5, 0, maxScroll)
      this.contentContainer.y = (CONTENT_Y - PY) - this.scrollY
    })
  }

  private switchTab(tab: Tab) {
    this.activeTab = tab
    this.scrollY = 0
    this.contentContainer.y = CONTENT_Y - PY
    this.rebuildContent()
    this.refreshTabStyles()
  }

  private refreshTabStyles() {
    TABS.forEach((tab, i) => {
      this.tabBtns[i].setColor(tab === this.activeTab ? '#aabbdd' : '#445577')
    })
  }

  private rebuildContent() {
    this.contentContainer.removeAll(true)
    const items = this.activeTab === 'QUESTS' ? this.buildQuestsContent()
                : this.activeTab === 'TECH'   ? this.buildTechContent()
                : this.activeTab === 'STATS'  ? this.buildStatsContent()
                :                               this.buildRunsContent()
    items.forEach(obj => this.contentContainer.add(obj))
  }

  // ─── QUESTS ──────────────────────────────────────────────────────

  private buildQuestsContent(): Phaser.GameObjects.GameObject[] {
    const out: Phaser.GameObjects.GameObject[] = []
    let y = 8

    const nodeQuests = this.nodes.flatMap(n => this.nodeQuestRequirements(n))
    // Also show chapter boss quests not in node list
    const extraQuests = [
      'boss_chapter2_killed',
      'boss_chapter3_killed',
      'pack_tier1_recruit:bought:15',
      'pack_tier2_specialist:bought:15',
    ].filter(
      q => !nodeQuests.includes(q)
    )

    const allQuests: { id: string; label: string }[] = [
      ...nodeQuests.map(q => ({ id: q, label: this.formatQuestLabel(q) })),
      ...extraQuests.map(q => ({ id: q, label: q })),
    ]

    for (const { id, label } of allQuests) {
      const done = techState.questDone(id)
      const progress = this.questProgress(id)

      const tick = this.scene.add.text(16, y, done ? '✓' : '○', {
        fontSize: '13px', color: done ? '#44cc88' : '#334455', fontFamily: 'monospace',
      })
      const labelText = this.scene.add.text(38, y, label, {
        fontSize: '12px', color: done ? '#44cc88' : '#667799', fontFamily: 'monospace',
      })
      out.push(tick, labelText)

      if (progress) {
        const prog = this.scene.add.text(PW - 130, y, progress, {
          fontSize: '11px', color: done ? '#336644' : '#445566', fontFamily: 'monospace',
        }).setOrigin(0, 0)
        out.push(prog)
      }

      y += 22
    }

    this.contentHeight = y + 8
    return out
  }

  private questProgress(id: string): string | null {
    const parts = id.split(':')
    if (parts.length !== 3) return null
    const [unitId, stat, threshStr] = parts
    const statKey = `${unitId}_${stat}`
    const current = techState.getStat(statKey)
    const threshold = parseInt(threshStr, 10)
    return `${current} / ${threshold}`
  }

  private formatQuestLabel(req: string): string {
    const parts = req.split(':')
    if (parts.length !== 3) return req
    const [unitId, stat, threshold] = parts
    if (unitId.startsWith('pack_') && stat === 'bought') {
      return `${unitId.replace(/^pack_/, '').replace(/_/g, ' ')}: bought ${threshold}`
    }
    const name = unitId.replace('_', ' ')
    if (stat === 'kills')    return `${name}: ${threshold} kills`
    if (stat === 'healed')   return `${name}: ${threshold} HP healed`
    if (stat === 'summoned') return `${name}: summoned ×${threshold}`
    return req
  }

  private nodeQuestRequirements(node: TechNode): string[] {
    return [
      ...(node.questRequirement ? [node.questRequirement] : []),
      ...(node.questRequirements ?? []),
    ]
  }

  // ─── TECH ────────────────────────────────────────────────────────

  private buildTechContent(): Phaser.GameObjects.GameObject[] {
    const out: Phaser.GameObjects.GameObject[] = []
    let y = 8
    let lastBranch = ''

    for (const node of this.nodes) {
      if (node.branch !== lastBranch) {
        if (lastBranch) y += 6
        const header = this.scene.add.text(16, y, node.branch.toUpperCase().replace('_', ' '), {
          fontSize: '10px', color: '#334466', fontFamily: 'monospace', fontStyle: 'bold',
        })
        out.push(header)
        y += 16
        lastBranch = node.branch
      }

      const level = techState.effectiveLevel(node)
      const owned = level > 0
      const maxed = techState.isMaxed(node)
      const tick = this.scene.add.text(24, y, owned ? '✓' : '─', {
        fontSize: '12px', color: owned ? '#44cc88' : '#2a3a4a', fontFamily: 'monospace',
      })
      const label = node.repeatable && owned ? `${node.name} ${level}/${node.repeatable.maxLevel}` : node.name
      const name = this.scene.add.text(42, y, label, {
        fontSize: '12px', color: owned ? '#44cc88' : '#445566', fontFamily: 'monospace',
      })
      const costLabel = maxed ? 'MAX' : `${techState.currentCost(node)} PC`
      const cost = this.scene.add.text(PW - 80, y, costLabel, {
        fontSize: '11px', color: owned ? '#336644' : '#2a3a4a', fontFamily: 'monospace',
      })
      out.push(tick, name, cost)
      y += 20
    }

    this.contentHeight = y + 8
    return out
  }

  // ─── STATS ───────────────────────────────────────────────────────

  private buildStatsContent(): Phaser.GameObjects.GameObject[] {
    const out: Phaser.GameObjects.GameObject[] = []
    let y = 8

    const rows: [string, string][] = [
      ['PC (total)',       String(techState.pc)],
      ['Nodes purchased',  String(techState.purchased.size)],
      ['Tech levels',      String(this.nodes.reduce((sum, node) => sum + techState.effectiveLevel(node), 0))],
      ['Quests completed', String(techState.completedQuests.size)],
      ['─────────────', ''],
    ]

    const unitIds = unitIdsFromCache(this.scene)
    for (const id of unitIds) {
      const name = id.replace('_', ' ')
      const kills    = techState.getStat(`${id}_kills`)
      const healed   = techState.getStat(`${id}_healed`)
      const summoned = techState.getStat(`${id}_summoned`)
      if (kills)    rows.push([`${name} kills`,    String(kills)])
      if (healed)   rows.push([`${name} healed`,   String(healed)])
      if (summoned) rows.push([`${name} summoned`, String(summoned)])
    }

    for (const [label, value] of rows) {
      if (label.startsWith('─')) {
        const sep = this.scene.add.graphics()
        sep.lineStyle(1, 0x1a2244, 1)
        sep.lineBetween(16, y + 8, PW - 32, y + 8)
        out.push(sep)
        y += 18
        continue
      }
      const lbl = this.scene.add.text(16, y, label, {
        fontSize: '12px', color: '#556688', fontFamily: 'monospace',
      })
      const val = this.scene.add.text(PW - 80, y, value, {
        fontSize: '12px', color: '#aabbcc', fontFamily: 'monospace',
      })
      out.push(lbl, val)
      y += 20
    }

    this.contentHeight = y + 8
    return out
  }

  // ─── RUNS ────────────────────────────────────────────────────────

  private buildRunsContent(): Phaser.GameObjects.GameObject[] {
    const out: Phaser.GameObjects.GameObject[] = []
    let y = 8

    const records = campaignLog.records
    const summary = this.scene.add.text(16, y, `${records.length} recorded run${records.length === 1 ? '' : 's'}`, {
      fontSize: '12px', color: '#8899aa', fontFamily: 'monospace',
    })
    out.push(summary)

    const copyText = this.scene.add.text(PW - 300, y, '[ COPY TEXT ]', {
      fontSize: '11px', color: '#446688', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true })
    copyText.on('pointerover', () => copyText.setColor('#88aacc'))
    copyText.on('pointerout',  () => copyText.setColor('#446688'))
    copyText.on('pointerdown', () => this.copyRunLog(campaignLog.exportText()))
    out.push(copyText)

    const copyJson = this.scene.add.text(PW - 190, y, '[ COPY JSON ]', {
      fontSize: '11px', color: '#446688', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true })
    copyJson.on('pointerover', () => copyJson.setColor('#88aacc'))
    copyJson.on('pointerout',  () => copyJson.setColor('#446688'))
    copyJson.on('pointerdown', () => this.copyRunLog(campaignLog.exportJson()))
    out.push(copyJson)

    const clear = this.scene.add.text(PW - 86, y, '[ CLEAR ]', {
      fontSize: '11px', color: '#662222', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true })
    clear.on('pointerover', () => clear.setColor('#cc4444'))
    clear.on('pointerout',  () => clear.setColor('#662222'))
    clear.on('pointerdown', () => {
      campaignLog.clear()
      this.rebuildContent()
    })
    out.push(clear)

    y += 28

    const recent = [...records].slice(-24).reverse()
    if (recent.length === 0) {
      const empty = this.scene.add.text(16, y, 'Start and finish a run to record campaign data.', {
        fontSize: '12px', color: '#334455', fontFamily: 'monospace',
      })
      out.push(empty)
      y += 22
    }

    for (const record of recent) {
      const result = record.won === undefined ? 'incomplete' : record.won ? 'win' : 'loss'
      const title = this.scene.add.text(16, y, `Run ${record.runNumber}  ${record.chapter}  ${result}`, {
        fontSize: '12px', color: record.won ? '#44cc88' : '#aabbcc', fontFamily: 'monospace', fontStyle: 'bold',
      })
      out.push(title)
      y += 18

      const line1 = this.scene.add.text(28, y, `PC +${record.pcEarned ?? 0}  bank ${record.pcAfter ?? record.pcBefore}  tower ${Math.round(record.towerHp ?? 0)}  waves ${record.wavesCleared ?? 0}/${record.totalWaves ?? 0}`, {
        fontSize: '11px', color: '#667799', fontFamily: 'monospace',
      })
      out.push(line1)
      y += 16

      const line2 = this.scene.add.text(28, y, `bought ${this.formatCounts(record.selectedPacks)}  opened ${this.formatOpened(record)}`, {
        fontSize: '11px', color: '#667799', fontFamily: 'monospace',
      })
      out.push(line2)
      y += 16

      const line3 = this.scene.add.text(28, y, `tech ${Object.keys(record.techLevels).length} nodes  available ${record.availableTech.length}  packs ${record.unlockedPacks.join(', ') || '(none)'}`, {
        fontSize: '11px', color: '#445566', fontFamily: 'monospace',
      })
      out.push(line3)
      y += 16

      const line4 = this.scene.add.text(28, y, `tech bought ${this.formatTechDelta(record.techPurchasedSincePreviousRun)}`, {
        fontSize: '11px', color: '#445566', fontFamily: 'monospace',
      })
      out.push(line4)
      y += 24
    }

    this.contentHeight = y + 8
    return out
  }

  private copyRunLog(text: string) {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(text).catch(() => console.log(text))
      return
    }
    console.log(text)
  }

  private formatOpened(record: CampaignRunRecord): string {
    const base = this.formatCounts(record.openedUnits.map(unit => unit.unitId))
    const bonus = this.formatCounts(record.openedUnits.filter(unit => unit.source === 'bonus').map(unit => unit.unitId))
    return bonus === '(none)' ? base : `${base} bonus ${bonus}`
  }

  private formatCounts(items: string[]): string {
    const counts = items.reduce<Record<string, number>>((acc, id) => {
      acc[id] = (acc[id] ?? 0) + 1
      return acc
    }, {})
    const entries = Object.entries(counts).filter(([, count]) => count > 0)
    if (entries.length === 0) return '(none)'
    return entries.sort(([a], [b]) => a.localeCompare(b)).map(([id, count]) => `${id}x${count}`).join(' ')
  }

  private formatTechDelta(levels: Record<string, number>): string {
    const entries = Object.entries(levels).filter(([, level]) => level > 0)
    if (entries.length === 0) return '(none)'
    return entries.sort(([a], [b]) => a.localeCompare(b)).map(([id, level]) => `${id}+${level}`).join(', ')
  }

  // ─── Public API ──────────────────────────────────────────────────

  open(tab?: Tab) {
    if (this.isOpen) return
    if (tab) this.activeTab = tab
    this.isOpen = true
    this.scrollY = 0
    this.contentContainer.y = CONTENT_Y - PY
    this.rebuildContent()
    this.refreshTabStyles()
    this.overlay.setVisible(true)
    this.panel.setVisible(true)
  }

  close() {
    this.isOpen = false
    this.overlay.setVisible(false)
    this.panel.setVisible(false)
  }

  // Call after completing quests externally so progress refreshes on next open
  invalidate() {
    checkStatQuests(this.nodes)
  }
}
