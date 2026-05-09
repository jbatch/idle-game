import Phaser from 'phaser'
import type { TechNode } from '../data/types'
import { techState } from '../systems/TechState'
import { GAME_W, GAME_H } from '../constants'

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
  tower:        'TOWER',
  footsoldier:  'FOOTSOLDIER',
  archer:       'ARCHER',
  shieldbearer: 'SHIELDBEARER',
  healer:       'HEALER',
  frost_mage:   'FROST MAGE',
  sentinel:     'SENTINEL',
  bard:         'BARD',
}

const BRANCH_ORDER = ['cursor', 'deployment', 'tower', 'footsoldier', 'archer', 'shieldbearer', 'healer', 'frost_mage', 'sentinel', 'bard']

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
    const purchased = techState.has(node.id)
    const available = techState.isAvailable(node)
    const canAfford  = techState.pc >= node.cost
    const locked     = !purchased && !available

    let borderColor: number
    let bgColor: number
    if (purchased)       { borderColor = 0x44cc88; bgColor = 0x0e2211 }
    else if (!available) { borderColor = 0x1a2a3a; bgColor = 0x080c14 }
    else if (canAfford)  { borderColor = 0x4466bb; bgColor = 0x0d1a33 }
    else                 { borderColor = 0x885522; bgColor = 0x1a0e08 }

    const bg = this.add.rectangle(nx, ny, NODE_W, NODE_H, bgColor).setOrigin(0, 0)
    const border = this.add.graphics()
    border.lineStyle(purchased ? 2 : 1, borderColor, 1)
    border.strokeRect(nx, ny, NODE_W, NODE_H)
    this.content.add(bg)
    this.content.add(border)

    const cx = nx + NODE_W / 2
    const nameColor = purchased ? '#44cc88' : locked ? '#2a3a4a' : '#ccd4ff'
    const nameText = this.add.text(cx, ny + 14, node.name, {
      fontSize: '13px', color: nameColor, fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5)
    this.content.add(nameText)

    const descColor = locked ? '#1e2e3e' : '#556688'
    const descText = this.add.text(cx, ny + 33, node.description, {
      fontSize: '10px', color: descColor, fontFamily: 'monospace',
    }).setOrigin(0.5)
    this.content.add(descText)

    // Quest requirement line
    if (node.questRequirement && !techState.questDone(node.questRequirement)) {
      const qLabel = this.formatQuestLabel(node.questRequirement)
      const qText = this.add.text(cx, ny + 50, qLabel, {
        fontSize: '9px', color: '#4a3322', fontFamily: 'monospace',
      }).setOrigin(0.5)
      this.content.add(qText)
    }

    // Cost / status line
    let statusStr: string
    let statusColor: string
    if (purchased) {
      statusStr = '✓ OWNED'; statusColor = '#44cc88'
    } else if (node.questRequirement && !techState.questDone(node.questRequirement)) {
      statusStr = 'QUEST LOCKED'; statusColor = '#4a3322'
    } else if (locked) {
      statusStr = 'LOCKED'; statusColor = '#2a3a4a'
    } else {
      statusStr = `${node.cost} PC`
      statusColor = canAfford ? '#ddaa22' : '#664422'
    }
    const costText = this.add.text(cx, ny + NODE_H - 12, statusStr, {
      fontSize: '11px', color: statusColor, fontFamily: 'monospace',
    }).setOrigin(0.5)
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
    const parts = req.split(':')
    if (parts.length !== 3) return req
    const [unitId, stat, threshold] = parts
    const name = unitId.replace('_', ' ')
    if (stat === 'kills')    return `req: ${threshold} ${name} kills`
    if (stat === 'healed')   return `req: ${threshold} HP healed`
    if (stat === 'summoned') return `req: summon ${name} ×${threshold}`
    return req
  }
}
