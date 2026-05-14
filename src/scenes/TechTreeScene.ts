import Phaser from 'phaser'
import type { TechEdgeLayout, TechEffect, TechNode, TechNodeAnchor, TechNodeLayout, TechTreeLayoutData } from '../data/types'
import { techState } from '../systems/TechState'
import { GAME_W, GAME_H } from '../constants'
import { addFittedText } from '../ui/fittedText'
import { audioManager } from '../systems/AudioManager'
import { playRingPulse, playSparkBurst } from '../effects/CombatEffects'
import { fadeInScene, fadeToScene } from '../ui/sceneTransitions'

const HEADER_H  = 90   // title + PC bar + separator
const FOOTER_H  = 54   // back button area
const LABEL_W   = 130  // branch label column
const NODE_W    = 160
const NODE_H    = 82
const NODE_GAP  = 28   // horizontal gap between nodes
const ROW_H     = NODE_H + 26  // vertical space per branch row
const ROW_PAD_X = 20   // left edge of content area
const VIEW_PAD  = 28

// Branch display names
const BRANCH_LABELS: Record<string, string> = {
  cursor:       'CURSOR',
  deployment:   'DEPLOYMENT',
  supply:       'SUPPLY',
  crates:       'CRATES',
  tower:        'TOWER',
  footsoldier:  'FOOTSOLDIER',
  archer:       'ARCHER',
  shieldbearer: 'SHIELDBEARER',
  healer:       'HEALER',
  frost_mage:   'FROST MAGE',
  sentinel:     'SENTINEL',
  bard:         'BARD',
}

const BRANCH_ORDER = ['cursor', 'deployment', 'supply', 'crates', 'tower', 'footsoldier', 'archer', 'shieldbearer', 'healer', 'frost_mage', 'sentinel', 'bard']

export class TechTreeScene extends Phaser.Scene {
  private nodes: TechNode[] = []
  private layouts = new Map<string, TechNodeLayout>()
  private edgeLayouts = new Map<string, TechEdgeLayout>()
  private content!: Phaser.GameObjects.Container
  private pcText!: Phaser.GameObjects.Text
  private scrollX: number = 0
  private scrollY: number = 0
  private totalContentW: number = 0
  private totalContentH: number = 0
  private isPanning = false
  private panStartPointerX = 0
  private panStartPointerY = 0
  private panStartScrollX = 0
  private panStartScrollY = 0

  constructor() {
    super({ key: 'TechTreeScene' })
  }

  create() {
    fadeInScene(this)
    audioManager.playMusic(this, 'shop_theme')
    const data = this.cache.json.get('tech_tree') as { nodes: TechNode[] }
    const layoutData = this.cache.json.get('tech_tree_layout') as TechTreeLayoutData | undefined
    this.nodes = data.nodes
    this.layouts = new Map((layoutData?.nodes ?? []).map(layout => [layout.id, layout]))
    this.edgeLayouts = new Map((layoutData?.edges ?? []).map(edge => [this.edgeKey(edge.from, edge.to), edge]))
    this.scrollX = 0
    this.scrollY = 0
    this.isPanning = false

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

    const scrollHint = this.add.text(GAME_W / 2, GAME_H - FOOTER_H + 12, 'drag empty space or middle-drag to pan', {
      fontSize: '10px', color: '#2a3355', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(10)

    const backBtn = this.add.text(GAME_W / 2, GAME_H - 18, '[ BACK TO SHOP ]', {
      fontSize: '16px', color: '#4466ff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(11).setInteractive({ useHandCursor: true })
    backBtn.on('pointerover', () => backBtn.setColor('#88aaff'))
    backBtn.on('pointerout',  () => backBtn.setColor('#4466ff'))
    backBtn.on('pointerdown', () => fadeToScene(this, 'ShopScene', undefined, { sfx: 'ui_click' }))

    // ── Scrollable content container ──
    this.content = this.add.container(0, HEADER_H)
    this.buildContent()
    this.centerScrollInBounds()

    // ── Pan / scroll input ──
    this.input.on('wheel', (_p: unknown, _go: unknown, deltaX: number, deltaY: number) => {
      this.scrollX += deltaX * 0.6
      this.scrollY += deltaY * 0.6
      this.clampScroll()
      this.updateContentPosition()
    })

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
      if (!this.isInScrollableArea(pointer)) return

      const middleDrag = pointer.middleButtonDown()
      const emptyLeftDrag = pointer.leftButtonDown() && gameObjects.length === 0
      if (!middleDrag && !emptyLeftDrag) return

      this.isPanning = true
      this.panStartPointerX = pointer.x
      this.panStartPointerY = pointer.y
      this.panStartScrollX = this.scrollX
      this.panStartScrollY = this.scrollY
      this.input.setDefaultCursor('grabbing')
    })

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isPanning) return
      this.scrollX = this.panStartScrollX - (pointer.x - this.panStartPointerX)
      this.scrollY = this.panStartScrollY - (pointer.y - this.panStartPointerY)
      this.clampScroll()
      this.updateContentPosition()
    })

    this.input.on('pointerup', () => this.stopPanning())
    this.input.on('pointerupoutside', () => this.stopPanning())

    if (this.totalContentW <= GAME_W && this.totalContentH <= GAME_H - HEADER_H - FOOTER_H) scrollHint.setVisible(false)
    void footerBg  // referenced to avoid lint warning
  }

  private refreshPcText() {
    this.pcText.setText(`PC: ${techState.pc}`)
  }

  private buildContent() {
    // Destroy previous content
    this.content.removeAll(true)
    this.totalContentW = 0
    this.totalContentH = 0

    if (this.layouts.size > 0) {
      this.buildSpatialContent()
      this.clampScroll()
      this.updateContentPosition()
      return
    }

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
    this.clampScroll()
    this.updateContentPosition()
  }

  private buildSpatialContent() {
    this.ensureRuntimeLayouts()
    const visibleNodes = this.nodes.filter(node => this.shouldShowNode(node))
    const visibleById = new Map(visibleNodes.map(node => [node.id, node]))

    for (const node of visibleNodes) {
      const layout = this.layouts.get(node.id)
      if (!layout) continue
      this.totalContentW = Math.max(this.totalContentW, layout.x + NODE_W + VIEW_PAD)
      this.totalContentH = Math.max(this.totalContentH, layout.y + NODE_H + VIEW_PAD)
    }

    for (const edge of this.edgeLayouts.values()) {
      if (!edge.elbow) continue
      this.totalContentW = Math.max(this.totalContentW, edge.elbow.x + VIEW_PAD)
      this.totalContentH = Math.max(this.totalContentH, edge.elbow.y + VIEW_PAD)
    }

    for (const node of visibleNodes) {
      const layout = this.layouts.get(node.id)
      if (!layout) continue

      for (const requiredId of node.requires) {
        const requiredNode = visibleById.get(requiredId)
        const requiredLayout = requiredNode ? this.layouts.get(requiredNode.id) : undefined
        if (!requiredNode || !requiredLayout) continue

        const line = this.add.graphics()
        const connected = techState.has(requiredNode.id) && techState.has(node.id)
        line.lineStyle(2, connected ? 0x44cc88 : 0x1a2244, 1)
        this.drawEdgeLine(line, requiredLayout, layout, this.edgeLayouts.get(this.edgeKey(requiredId, node.id)))
        this.content.add(line)
      }
    }

    for (const node of visibleNodes) {
      const layout = this.layouts.get(node.id)
      if (!layout) continue
      this.buildNode(node, layout.x, layout.y)
    }
  }

  private shouldShowNode(node: TechNode): boolean {
    const mode = this.layouts.get(node.id)?.visibleWhen ?? 'always'
    if (mode === 'available') return techState.effectiveLevel(node) > 0 || techState.isAvailable(node)
    if (mode === 'purchased') return techState.effectiveLevel(node) > 0
    return true
  }

  private ensureRuntimeLayouts() {
    for (const [nodeIndex, node] of this.nodes.entries()) {
      if (this.layouts.has(node.id)) continue
      const branchIndex = Math.max(0, BRANCH_ORDER.indexOf(node.branch))
      const branchCount = this.nodes
        .slice(0, nodeIndex)
        .filter(previous => previous.branch === node.branch)
        .length
      this.layouts.set(node.id, {
        id: node.id,
        x: ROW_PAD_X + LABEL_W + branchCount * (NODE_W + NODE_GAP),
        y: 8 + branchIndex * (ROW_H + 8),
        visibleWhen: 'always',
      })
    }
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
      this.totalContentW = Math.max(this.totalContentW, nx + NODE_W + VIEW_PAD)

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
      .setInteractive({ useHandCursor: available && canAfford })
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
      bg.on('pointerover', () => bg.setFillStyle(bgColor + 0x0a0a0a))
      bg.on('pointerout',  () => bg.setFillStyle(bgColor))
      bg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (!pointer.leftButtonDown()) return
        audioManager.playSfx(this, 'tech_purchase')
        const burstX = nx + NODE_W / 2 - this.scrollX
        const burstY = HEADER_H + ny + NODE_H / 2 - this.scrollY
        playSparkBurst(this, burstX, burstY, 0xddaa22, { count: 12, radius: 36 })
        playRingPulse(this, burstX, burstY, 34, 0x44cc88)
        techState.purchase(node)
        this.refreshPcText()
        this.time.delayedCall(90, () => this.buildContent())
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
    if (totals.has('crate_drop_chance_bonus')) return `${this.formatPercent(totals.get('crate_drop_chance_bonus') ?? 0)} crate drops`

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

  private isInScrollableArea(pointer: Phaser.Input.Pointer): boolean {
    return pointer.y >= HEADER_H && pointer.y <= GAME_H - FOOTER_H
  }

  private stopPanning() {
    if (!this.isPanning) return
    this.isPanning = false
    this.input.setDefaultCursor('default')
  }

  private clampScroll() {
    const viewportH = GAME_H - HEADER_H - FOOTER_H
    const maxX = Math.max(0, this.totalContentW - GAME_W)
    const maxY = Math.max(0, this.totalContentH - viewportH)
    this.scrollX = Phaser.Math.Clamp(this.scrollX, 0, maxX)
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, maxY)
  }

  private centerScrollInBounds() {
    const viewportH = GAME_H - HEADER_H - FOOTER_H
    this.scrollX = Math.max(0, (this.totalContentW - GAME_W) / 2)
    this.scrollY = Math.max(0, (this.totalContentH - viewportH) / 2)
    this.clampScroll()
    this.updateContentPosition()
  }

  private updateContentPosition() {
    this.content.setPosition(-this.scrollX, HEADER_H - this.scrollY)
  }

  private drawEdgeLine(
    graphics: Phaser.GameObjects.Graphics,
    fromLayout: TechNodeLayout,
    toLayout: TechNodeLayout,
    edge?: TechEdgeLayout,
  ) {
    const points = this.edgePath(fromLayout, toLayout, edge)
    if (points.length < 2) return

    graphics.beginPath()
    graphics.moveTo(points[0].x, points[0].y)
    for (const point of points.slice(1)) {
      graphics.lineTo(point.x, point.y)
    }
    graphics.strokePath()
  }

  private edgePath(
    fromLayout: TechNodeLayout,
    toLayout: TechNodeLayout,
    edge?: TechEdgeLayout,
  ): Array<{ x: number, y: number }> {
    const fromAnchor = edge?.fromAnchor ?? 'right'
    const toAnchor = edge?.toAnchor ?? 'left'
    const start = this.anchorPoint(fromLayout, fromAnchor)
    const end = this.anchorPoint(toLayout, toAnchor)
    const elbow = edge?.elbow

    if (!elbow) return [start, end]

    const fromHorizontal = fromAnchor === 'left' || fromAnchor === 'right'
    const toHorizontal = toAnchor === 'left' || toAnchor === 'right'
    const first = fromHorizontal ? { x: elbow.x, y: start.y } : { x: start.x, y: elbow.y }
    const last = toHorizontal ? { x: elbow.x, y: end.y } : { x: end.x, y: elbow.y }

    return this.removeDuplicatePoints([start, first, elbow, last, end])
  }

  private anchorPoint(layout: TechNodeLayout, anchor: TechNodeAnchor): { x: number, y: number } {
    if (anchor === 'left') return { x: layout.x, y: layout.y + NODE_H / 2 }
    if (anchor === 'right') return { x: layout.x + NODE_W, y: layout.y + NODE_H / 2 }
    if (anchor === 'top') return { x: layout.x + NODE_W / 2, y: layout.y }
    return { x: layout.x + NODE_W / 2, y: layout.y + NODE_H }
  }

  private removeDuplicatePoints(points: Array<{ x: number, y: number }>): Array<{ x: number, y: number }> {
    return points.filter((point, index) => {
      const previous = points[index - 1]
      return !previous || previous.x !== point.x || previous.y !== point.y
    })
  }

  private edgeKey(from: string, to: string): string {
    return `${from}->${to}`
  }
}
