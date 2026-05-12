import Phaser from 'phaser'
import type { TechEffect, TechNode } from '../data/types'
import { techState } from '../systems/TechState'
import { GAME_W, GAME_H } from '../constants'
import { addFittedText } from '../ui/fittedText'

const HEADER_H  = 90   // title + PC bar + separator
const FOOTER_H  = 54   // back button area
const LABEL_W   = 130  // branch label column
const NODE_W    = 160
const NODE_H    = 82
const NODE_GAP  = 28   // horizontal gap between nodes
const ROW_H     = NODE_H + 26  // vertical space per branch row
const ROW_PAD_X = 20   // left edge of content area

// Branch display names
const BRANCH_LABELS: Record<string, string> = {
  cursor:       'CURSOR',
  deployment:   'DEPLOYMENT',
  supply:       'SUPPLY',
  tower:        'TOWER',
  footsoldier:  'FOOTSOLDIER',
  archer:       'ARCHER',
  shieldbearer: 'SHIELDBEARER',
  healer:       'HEALER',
  frost_mage:   'FROST MAGE',
  sentinel:     'SENTINEL',
  bard:         'BARD',
}

const BRANCH_ORDER = ['cursor', 'deployment', 'supply', 'tower', 'footsoldier', 'archer', 'shieldbearer', 'healer', 'frost_mage', 'sentinel', 'bard']

export class TechTreeScene extends Phaser.Scene {
  private nodes: TechNode[] = []
  private content!: Phaser.GameObjects.Container
  private pcText!: Phaser.GameObjects.Text
  private scrollY: number = 0
  private totalContentH: number = 0

  constructor() {
    super({ key: 'TechTreeScene' })
  }

  create() {
    const data = this.cache.json.get('tech_tree') as { nodes: TechNode[] }
    this.nodes = data.nodes
    this.scrollY = 0

    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x080810).setOrigin(0, 0)

    // ── Fixed header ──
    this.add.text(GAME_W / 2, 28, 'TECH TREE', {
      fontSize: '24px', color: '#8899cc', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10)

    this.pcText = this.add.text(GAME_W / 2, 58, '', {
      fontSize: '14px', color: '#ddaa22', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(10)
    this.refreshPcText()

    const sep = this.add.graphics().setDepth(10)
    sep.lineStyle(1, 0x1a2244, 1)
    sep.lineBetween(20, HEADER_H - 4, GAME_W - 20, HEADER_H - 4)

    // ── Fixed footer ──
    const footerBg = this.add.rectangle(0, GAME_H - FOOTER_H, GAME_W, FOOTER_H, 0x080810)
      .setOrigin(0, 0).setDepth(10)
    const footerLine = this.add.graphics().setDepth(10)
    footerLine.lineStyle(1, 0x1a2244, 1)
    footerLine.lineBetween(20, GAME_H - FOOTER_H, GAME_W - 20, GAME_H - FOOTER_H)

    const scrollHint = this.add.text(GAME_W / 2, GAME_H - FOOTER_H + 12, 'scroll to see more', {
      fontSize: '10px', color: '#2a3355', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(10)

    const backBtn = this.add.text(GAME_W / 2, GAME_H - 18, '[ BACK TO SHOP ]', {
      fontSize: '16px', color: '#4466ff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(11).setInteractive({ useHandCursor: true })
    backBtn.on('pointerover', () => backBtn.setColor('#88aaff'))
    backBtn.on('pointerout',  () => backBtn.setColor('#4466ff'))
    backBtn.on('pointerdown', () => this.scene.start('ShopScene'))

    // ── Scrollable content container ──
    this.content = this.add.container(0, HEADER_H)
    this.buildContent()

    // ── Scroll input ──
    this.input.on('wheel', (_p: unknown, _go: unknown, _dx: unknown, deltaY: number) => {
      const maxScroll = Math.max(0, this.totalContentH - (GAME_H - HEADER_H - FOOTER_H))
      this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY * 0.6, 0, maxScroll)
      this.content.y = HEADER_H - this.scrollY
    })

    // Hide scroll hint if content fits
    if (this.totalContentH <= GAME_H - HEADER_H - FOOTER_H) scrollHint.setVisible(false)
    void footerBg  // referenced to avoid lint warning
  }

  private refreshPcText() {
    this.pcText.setText(`PC: ${techState.pc}`)
  }

  private buildContent() {
    // Destroy previous content
    this.content.removeAll(true)

    // Group nodes by branch, preserving BRANCH_ORDER
    const byBranch = new Map<string, TechNode[]>()
    for (const b of BRANCH_ORDER) byBranch.set(b, [])
    for (const node of this.nodes) {
      const list = byBranch.get(node.branch)
      if (list) list.push(node)
    }

    let rowY = 8

    for (const branch of BRANCH_ORDER) {
      const branchNodes = byBranch.get(branch)
      if (!branchNodes || branchNodes.length === 0) continue

      this.buildRow(branch, branchNodes, rowY)
      rowY += ROW_H + 8
    }

    this.totalContentH = rowY + 8
  }

  private buildRow(branch: string, nodes: TechNode[], rowY: number) {
    // Branch label
    const label = this.add.text(ROW_PAD_X, rowY + NODE_H / 2, BRANCH_LABELS[branch] ?? branch, {
      fontSize: '10px', color: '#334466', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0, 0.5)
    this.content.add(label)

    // Nodes
    const nodesX = ROW_PAD_X + LABEL_W
    nodes.forEach((node, idx) => {
      const nx = nodesX + idx * (NODE_W + NODE_GAP)
      const ny = rowY

      // Connector line to previous node
      if (idx > 0) {
        const prevX = nodesX + (idx - 1) * (NODE_W + NODE_GAP) + NODE_W
        const line = this.add.graphics()
        const connected = techState.has(nodes[idx - 1].id) && techState.has(node.id)
        line.lineStyle(2, connected ? 0x44cc88 : 0x1a2244, 1)
        line.lineBetween(prevX, rowY + NODE_H / 2, nx, rowY + NODE_H / 2)
        this.content.add(line)
      }

      this.buildNode(node, nx, ny)
    })
  }

  private buildNode(node: TechNode, nx: number, ny: number) {
    const level = techState.effectiveLevel(node)
    const purchased = level > 0
    const maxed = techState.isMaxed(node)
    const available = techState.isAvailable(node)
    const currentCost = techState.currentCost(node)
    const canAfford  = techState.pc >= currentCost
    const locked     = !purchased && !available
    const unmetQuest = this.unmetQuestRequirement(node)

    let borderColor: number
    let bgColor: number
    if (maxed)           { borderColor = 0x44cc88; bgColor = 0x0e2211 }
    else if (purchased && canAfford) { borderColor = 0x66aaee; bgColor = 0x0d1a33 }
    else if (purchased)  { borderColor = 0x668855; bgColor = 0x10180e }
    else if (!available) { borderColor = 0x1a2a3a; bgColor = 0x080c14 }
    else if (canAfford)  { borderColor = 0x4466bb; bgColor = 0x0d1a33 }
    else                 { borderColor = 0x885522; bgColor = 0x1a0e08 }

    const bg = this.add.rectangle(nx, ny, NODE_W, NODE_H, bgColor).setOrigin(0, 0)
    const border = this.add.graphics()
    border.lineStyle(purchased ? 2 : 1, borderColor, 1)
    border.strokeRect(nx, ny, NODE_W, NODE_H)
    this.content.add(bg)
    this.content.add(border)

    const textX = nx + 8
    const textW = NODE_W - 16
    const nameColor = purchased ? '#44cc88' : locked ? '#2a3a4a' : '#ccd4ff'
    const nameText = addFittedText(this, textX, ny + 8, node.name, {
      fontSize: '13px', color: nameColor, fontFamily: 'monospace', fontStyle: 'bold',
    }, { width: textW, maxLines: 1, minFontSize: 10, align: 'center' })
    this.content.add(nameText)

    const descColor = locked ? '#1e2e3e' : '#556688'
    const descText = addFittedText(this, textX, ny + 29, node.description, {
      fontSize: '10px', color: descColor, fontFamily: 'monospace',
      lineSpacing: -2,
    }, { width: textW, maxLines: 2, minFontSize: 8, align: 'center' })
    this.content.add(descText)

    // Quest requirement line
    if (unmetQuest) {
      const qLabel = this.formatQuestLabel(unmetQuest)
      const qText = addFittedText(this, textX, ny + 55, qLabel, {
        fontSize: '9px', color: '#4a3322', fontFamily: 'monospace',
      }, { width: textW, maxLines: 1, minFontSize: 7, align: 'center' })
      this.content.add(qText)
    }

    // Cost / status line
    let statusStr: string
    let statusColor: string
    if (maxed && node.repeatable) {
      statusStr = this.repeatableStatusLabel(node, level, 'MAX'); statusColor = '#44cc88'
    } else if (purchased && node.repeatable) {
      statusStr = this.repeatableStatusLabel(node, level, `${currentCost} PC`); statusColor = canAfford ? '#ddaa22' : '#664422'
    } else if (purchased) {
      statusStr = '✓ OWNED'; statusColor = '#44cc88'
    } else if (unmetQuest) {
      statusStr = 'QUEST LOCKED'; statusColor = '#4a3322'
    } else if (locked) {
      statusStr = 'LOCKED'; statusColor = '#2a3a4a'
    } else {
      statusStr = `${currentCost} PC`
      statusColor = canAfford ? '#ddaa22' : '#664422'
    }
    const isRepeatableOwned = Boolean(node.repeatable && level > 0)
    const costText = addFittedText(this, textX, ny + NODE_H - (isRepeatableOwned ? 25 : 18), statusStr, {
      fontSize: isRepeatableOwned ? '10px' : '11px', color: statusColor, fontFamily: 'monospace',
      lineSpacing: -2,
    }, { width: textW, maxLines: isRepeatableOwned ? 2 : 1, minFontSize: isRepeatableOwned ? 8 : 9, align: 'center' })
    this.content.add(costText)

    // Click to purchase
    if (available && canAfford) {
      bg.setInteractive({ useHandCursor: true })
      bg.on('pointerover', () => bg.setFillStyle(bgColor + 0x0a0a0a))
      bg.on('pointerout',  () => bg.setFillStyle(bgColor))
      bg.on('pointerdown', () => {
        techState.purchase(node)
        this.refreshPcText()
        this.buildContent()
      })
    }
  }

  private formatQuestLabel(req: string): string {
    if (req === 'boss_chapter1_killed') return 'req: Chapter 2'
    if (req === 'boss_chapter2_killed') return 'req: Chapter 3'

    const parts = req.split(':')
    if (parts.length !== 3) return req
    const [unitId, stat, threshold] = parts
    const name = this.humanizeId(unitId)
    if (unitId.startsWith('pack_') && stat === 'bought') return `req: buy ${threshold} ${this.humanizeId(unitId.replace(/^pack_/, ''))} packs`
    if (stat === 'kills')    return `req: ${threshold} ${name} kills`
    if (stat === 'healed')   return `req: ${threshold} HP healed`
    if (stat === 'summoned') return `req: summon ${name} ×${threshold}`
    return req
  }

  private repeatableStatusLabel(node: TechNode, level: number, suffix: string): string {
    const current = this.repeatableCurrentLabel(node, level)
    const base = `LV ${level}/${node.repeatable?.maxLevel ?? level}  ${suffix}`
    return current ? `${base}\n(current: ${current})` : base
  }

  private repeatableCurrentLabel(node: TechNode, level: number): string | null {
    const effects = Array.isArray(node.effect) ? node.effect : [node.effect]
    const totals = new Map<TechEffect['type'], number>()

    for (const effect of effects) {
      totals.set(effect.type, (totals.get(effect.type) ?? 0) + effect.value * level)
    }

    if (totals.has('cursor_knockback_chance')) return `${this.formatPercent(totals.get('cursor_knockback_chance') ?? 0)} knockback`
    if (totals.has('cursor_damage')) return `+${totals.get('cursor_damage')} cursor damage`
    if (totals.has('unit_atk_bonus')) return `+${totals.get('unit_atk_bonus')} attack`
    if (totals.has('unit_hp_bonus')) return `+${totals.get('unit_hp_bonus')} HP`
    if (totals.has('unit_range_bonus')) return `+${totals.get('unit_range_bonus')} range`
    if (totals.has('dc_budget_bonus')) return `+${totals.get('dc_budget_bonus')} DC`
    if (totals.has('tower_hp_bonus')) return `+${totals.get('tower_hp_bonus')} tower HP`
    if (totals.has('pack_bonus_tier1_chance')) return `${this.formatPercent(totals.get('pack_bonus_tier1_chance') ?? 0)} T1 pack bonus`
    if (totals.has('pack_bonus_tier2_chance')) return `${this.formatPercent(totals.get('pack_bonus_tier2_chance') ?? 0)} T2 pack bonus`

    return null
  }

  private formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`
  }

  private unmetQuestRequirement(node: TechNode): string | null {
    const questRequirements = [
      ...(node.questRequirement ? [node.questRequirement] : []),
      ...(node.questRequirements ?? []),
    ]
    return questRequirements.find(q => !techState.isQuestRequirementMet(q)) ?? null
  }

  private humanizeId(id: string): string {
    return id.replace(/_/g, ' ')
  }
}
