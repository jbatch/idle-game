import Phaser from 'phaser'
import type { TechEdgeLayout, TechEffect, TechNode, TechNodeAnchor, TechNodeLayout, TechTreeLayoutData } from '../data/types'
import { techState } from '../systems/TechState'
import { GAME_W, GAME_H } from '../constants'
import { addFittedText } from '../ui/fittedText'
import { audioManager } from '../systems/AudioManager'
import { playRingPulse, playSparkBurst } from '../effects/CombatEffects'
import { fadeInScene, fadeToScene } from '../ui/sceneTransitions'
import { showOnboardingTip } from '../ui/OnboardingOverlay'
import { cssColor, uiPalette } from '../ui/palette'
import { cursors } from '../ui/cursors'

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

const BRANCH_COLORS: Record<string, number> = {
  cursor: 0x5aa7ff,
  deployment: 0xddaa22,
  supply: 0x7cff9f,
  crates: 0xffb86b,
  tower: 0x8fa3d4,
  footsoldier: 0xcc6b4a,
  archer: 0x76c46b,
  shieldbearer: 0x7f91d8,
  healer: 0xf2d27a,
  frost_mage: 0x74d7ff,
  sentinel: 0xba8cff,
  bard: 0xff83c3,
}

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
  private tooltip: Phaser.GameObjects.Container | null = null

  constructor() {
    super({ key: 'TechTreeScene' })
  }

  create() {
    fadeInScene(this)
    audioManager.playMusic(this, 'shop_theme')
    this.input.setDefaultCursor(cursors.menu)
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
      this.input.setDefaultCursor(cursors.grabbing)
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

    this.time.delayedCall(260, () => {
      showOnboardingTip(this, {
        id: 'tech_tree_first_visit',
        title: 'Spend PC here',
        body: 'Buy permanent upgrades with PC. Drag empty space to explore branches. +DC upgrades are very valuable as soon as they appear: more DC means more packs every run.',
        focus: new Phaser.Geom.Rectangle(122, HEADER_H + 34, 650, 360),
      })
    })
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
        line.lineStyle(2, connected ? uiPalette.state.success : uiPalette.border.dim, 1)
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
      fontSize: '10px', color: cssColor(BRANCH_COLORS[branch] ?? uiPalette.text.muted), fontFamily: 'monospace', fontStyle: 'bold',
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
        line.lineStyle(2, connected ? uiPalette.state.success : uiPalette.border.dim, 1)
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
    const branchColor = BRANCH_COLORS[node.branch] ?? uiPalette.border.strong

    let borderColor: number
    let bgColor: number
    if (maxed)           { borderColor = uiPalette.state.success; bgColor = 0x0e2211 }
    else if (purchased && canAfford) { borderColor = branchColor; bgColor = 0x0d1a33 }
    else if (purchased)  { borderColor = 0x668855; bgColor = 0x10180e }
    else if (!available) { borderColor = 0x3a4350; bgColor = 0x10131a }
    else if (canAfford)  { borderColor = branchColor; bgColor = 0x0d1a33 }
    else                 { borderColor = 0x885522; bgColor = 0x1a0e08 }

    const bg = this.add.rectangle(nx, ny, NODE_W, NODE_H, bgColor).setOrigin(0, 0)
      .setInteractive({ useHandCursor: available && canAfford })
    const border = this.add.graphics()
    border.lineStyle(purchased ? 2 : 1, borderColor, 1)
    border.strokeRect(nx, ny, NODE_W, NODE_H)
    this.content.add(bg)
    this.content.add(border)
    const branchStrip = this.add.rectangle(nx + 4, ny + 4, 5, NODE_H - 8, branchColor, locked ? 0.35 : 0.9).setOrigin(0, 0)
    this.content.add(branchStrip)

    const textX = nx + 14
    const textW = NODE_W - 22
    const nameColor = purchased ? cssColor(uiPalette.state.success) : locked ? cssColor(0x8d97a6) : cssColor(uiPalette.text.primary)
    const nameText = addFittedText(this, textX, ny + 8, node.name, {
      fontSize: '13px', color: nameColor, fontFamily: 'monospace', fontStyle: 'bold',
    }, { width: textW, maxLines: 1, minFontSize: 10, align: 'center' })
    this.content.add(nameText)

    const descColor = locked ? cssColor(0x667080) : cssColor(0x667799)
    const descText = addFittedText(this, textX, ny + 29, node.description, {
      fontSize: '10px', color: descColor, fontFamily: 'monospace',
      lineSpacing: -2,
    }, { width: textW, maxLines: 2, minFontSize: 8, align: 'center' })
    this.content.add(descText)

    // Cost / status line
    let statusStr: string
    let statusColor: string
    if (maxed && node.repeatable) {
      statusStr = this.repeatableStatusLabel(node, level, 'MAX'); statusColor = cssColor(uiPalette.state.success)
    } else if (purchased && node.repeatable) {
      statusStr = this.repeatableStatusLabel(node, level, `${currentCost} PC`); statusColor = canAfford ? cssColor(uiPalette.state.reward) : cssColor(0x664422)
    } else if (purchased) {
      statusStr = 'OWNED'; statusColor = cssColor(uiPalette.state.success)
    } else if (unmetQuest) {
      statusStr = 'QUEST LOCKED [?]'; statusColor = cssColor(0xb98a55)
    } else if (locked) {
      statusStr = 'LOCKED [?]'; statusColor = cssColor(0x8d97a6)
    } else {
      statusStr = `${currentCost} PC`
      statusColor = canAfford ? cssColor(uiPalette.state.reward) : cssColor(0x664422)
    }
    const isRepeatableOwned = Boolean(node.repeatable && level > 0)
    const costText = addFittedText(this, textX, ny + NODE_H - (isRepeatableOwned ? 25 : 18), statusStr, {
      fontSize: isRepeatableOwned ? '10px' : '11px', color: statusColor, fontFamily: 'monospace',
      lineSpacing: -2,
    }, { width: textW, maxLines: isRepeatableOwned ? 2 : 1, minFontSize: isRepeatableOwned ? 8 : 9, align: 'center' })
    this.content.add(costText)

    bg.on('pointerover', (pointer: Phaser.Input.Pointer) => {
      if (available && canAfford) bg.setFillStyle(bgColor + 0x0a0a0a)
      this.showNodeTooltip(node, pointer.x, pointer.y, unmetQuest, locked)
    })
    bg.on('pointerout', () => {
      if (available && canAfford) bg.setFillStyle(bgColor)
      this.hideTooltip()
    })
    bg.on('pointermove', (pointer: Phaser.Input.Pointer) => this.moveTooltip(pointer.x, pointer.y))

    // Click to purchase
    if (available && canAfford) {
      bg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (!pointer.leftButtonDown()) return
        audioManager.playSfx(this, 'tech_purchase')
        const burstX = nx + NODE_W / 2 - this.scrollX
        const burstY = HEADER_H + ny + NODE_H / 2 - this.scrollY
        playSparkBurst(this, burstX, burstY, uiPalette.state.reward, { count: 12, radius: 36 })
        playRingPulse(this, burstX, burstY, 34, uiPalette.state.success)
        techState.purchase(node)
        this.refreshPcText()
        this.hideTooltip()
        this.time.delayedCall(90, () => this.buildContent())
      })
    }
  }

  private showNodeTooltip(node: TechNode, x: number, y: number, unmetQuest: string | null, locked: boolean) {
    this.hideTooltip()
    const lines = [
      node.description,
      locked || unmetQuest
        ? `Unlock: ${unmetQuest ? this.formatQuestLabel(unmetQuest).replace(/^req: /, '') : 'buy prerequisite tech first'}`
        : `Cost: ${techState.currentCost(node)} PC`,
      node.repeatable ? `Repeatable: ${techState.effectiveLevel(node)}/${node.repeatable.maxLevel}` : '',
    ].filter(Boolean)
    const width = 300
    const height = Math.max(94, 44 + lines.length * 32)
    const pos = this.tooltipPosition(x, y, width, height)
    const tip = this.add.container(pos.x, pos.y).setDepth(250)
    const bg = this.add.rectangle(0, 0, width, height, uiPalette.surface.panel, 0.98).setOrigin(0, 0)
    bg.setStrokeStyle(1, BRANCH_COLORS[node.branch] ?? uiPalette.border.strong)
    const title = this.add.text(14, 12, node.name, {
      fontSize: '13px',
      color: cssColor(BRANCH_COLORS[node.branch] ?? uiPalette.text.primary),
      fontFamily: 'monospace',
      fontStyle: 'bold',
      wordWrap: { width: width - 28 },
    }).setOrigin(0, 0)
    const body = this.add.text(14, 36, lines.join('\n'), {
      fontSize: '11px',
      color: cssColor(uiPalette.text.secondary),
      fontFamily: 'monospace',
      lineSpacing: 5,
      wordWrap: { width: width - 28 },
    }).setOrigin(0, 0)
    tip.add([bg, title, body])
    this.tooltip = tip
  }

  private moveTooltip(x: number, y: number) {
    if (!this.tooltip) return
    const bg = this.tooltip.list[0] as Phaser.GameObjects.Rectangle
    const pos = this.tooltipPosition(x, y, bg.width, bg.height)
    this.tooltip.setPosition(pos.x, pos.y)
  }

  private hideTooltip() {
    this.tooltip?.destroy(true)
    this.tooltip = null
  }

  private tooltipPosition(x: number, y: number, width: number, height: number): { x: number, y: number } {
    return {
      x: Phaser.Math.Clamp(x + 18, 12, GAME_W - width - 12),
      y: Phaser.Math.Clamp(y + 18, 12, GAME_H - height - 12),
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
    this.input.setDefaultCursor(cursors.menu)
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
