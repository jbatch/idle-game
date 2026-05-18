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
import { isCoarseInput } from '../input/InputMode'
import { currencyLabels, type CurrencyLabels } from '../ui/currency'

const HEADER_H  = 90   // title + Gems bar + separator
const FOOTER_H  = 54   // back button area
const LABEL_W   = 130  // branch label column
const NODE_W    = 160
const NODE_H    = 82
const NODE_GAP  = 28   // horizontal gap between nodes
const ROW_H     = NODE_H + 26  // vertical space per branch row
const ROW_PAD_X = 20   // left edge of content area
const VIEW_PAD  = 28
const MIN_ZOOM  = 0.45
const MAX_ZOOM  = 1.45
const WHEEL_ZOOM_SPEED = 0.0015
const USE_PROGRAMMATIC_RADIAL_LAYOUT = true
const RADIAL_START_ZOOM = 0.72
const RADIAL_INNER_RADIUS = 430
const RADIAL_DEPTH_GAP = 280
const RADIAL_BRANCH_SPREAD_DEG = 24
const RADIAL_INNER_ALT_OFFSET = -90
const RADIAL_PAD = 90
const RADIAL_RELAX_ITERATIONS = 100
const RADIAL_RELAX_GAP_X = 28
const RADIAL_RELAX_GAP_Y = 22

type CurrencyLine = {
  icon: Phaser.GameObjects.Text
  label: Phaser.GameObjects.Text
  anchorX: number
  y: number
  iconOffsetY: number
  align: 'left' | 'center'
  gap: number
}

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
const RADIAL_BRANCH_ORDER = ['cursor', 'crates', 'tower', 'footsoldier', 'shieldbearer', 'archer', 'bard', 'healer', 'frost_mage', 'sentinel', 'supply', 'deployment']

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
  private pcLine!: CurrencyLine
  private currency!: CurrencyLabels
  private scrollX: number = 0
  private scrollY: number = 0
  private zoom: number = 1
  private totalContentW: number = 0
  private totalContentH: number = 0
  private isPanning = false
  private isPinching = false
  private pinchStartDistance = 0
  private pinchStartZoom = 1
  private pinchWorldX = 0
  private pinchWorldY = 0
  private pinchScreenX = 0
  private pinchScreenY = 0
  private touchMode = false
  private panStartPointerX = 0
  private panStartPointerY = 0
  private panStartScrollX = 0
  private panStartScrollY = 0
  private tooltip: Phaser.GameObjects.Container | null = null
  private radialHub: { x: number, y: number } | null = null

  constructor() {
    super({ key: 'TechTreeScene' })
  }

  create() {
    fadeInScene(this)
    audioManager.playMusic(this, 'shop_theme')
    this.input.setDefaultCursor(cursors.menu)
    this.touchMode = isCoarseInput()
    this.currency = currencyLabels(this)
    const data = this.cache.json.get('tech_tree') as { nodes: TechNode[] }
    const layoutData = this.cache.json.get('tech_tree_layout') as TechTreeLayoutData | undefined
    this.nodes = data.nodes
    const manualLayouts = new Map((layoutData?.nodes ?? []).map(layout => [layout.id, layout]))
    this.layouts = USE_PROGRAMMATIC_RADIAL_LAYOUT ? this.generateRadialLayouts(manualLayouts) : manualLayouts
    this.edgeLayouts = USE_PROGRAMMATIC_RADIAL_LAYOUT
      ? new Map()
      : new Map((layoutData?.edges ?? []).map(edge => [this.edgeKey(edge.from, edge.to), edge]))
    this.scrollX = 0
    this.scrollY = 0
    this.zoom = USE_PROGRAMMATIC_RADIAL_LAYOUT ? RADIAL_START_ZOOM : 1
    this.isPanning = false
    this.isPinching = false

    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x080810).setOrigin(0, 0)

    // ── Fixed header ──
    this.add.text(GAME_W / 2, 28, 'TECH TREE', {
      fontSize: '24px', color: '#8899cc', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10)

    this.pcLine = this.addCurrencyLine(GAME_W / 2, 58, this.currency.progression.icon, '', {
      align: 'center',
      labelSize: 14,
      iconSize: 18,
      color: '#ddaa22',
      gap: 7,
      iconOffsetY: -2,
      depth: 10,
    })
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
    if (!this.input.pointer2) this.input.addPointer(1)

    // ── Pan / scroll input ──
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, _go: unknown, _deltaX: number, deltaY: number) => {
      if (!this.isInScrollableArea(pointer)) return
      const nextZoom = this.zoom * Math.exp(-deltaY * WHEEL_ZOOM_SPEED)
      this.zoomAtScreenPoint(pointer.x, pointer.y, nextZoom)
    })

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
      const touchPointers = this.activeTouchPointers()
      if (this.touchMode && touchPointers.length >= 2) {
        this.startPinch(touchPointers)
        return
      }

      if (this.touchMode && pointer.leftButtonDown() && gameObjects.length === 0) this.hideTooltip()
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
      const touchPointers = this.activeTouchPointers()
      if (this.touchMode && (this.isPinching || touchPointers.length >= 2)) {
        if (!this.isPinching) this.startPinch(touchPointers)
        this.updatePinch(touchPointers)
        return
      }

      if (!this.isPanning) return
      this.scrollX = this.panStartScrollX - (pointer.x - this.panStartPointerX) / this.zoom
      this.scrollY = this.panStartScrollY - (pointer.y - this.panStartPointerY) / this.zoom
      this.clampScroll()
      this.updateContentPosition()
    })

    this.input.on('pointerup', () => this.stopPointerGestures())
    this.input.on('pointerupoutside', () => this.stopPointerGestures())

    if (this.totalContentW <= GAME_W && this.totalContentH <= GAME_H - HEADER_H - FOOTER_H) scrollHint.setVisible(false)
    void footerBg  // referenced to avoid lint warning

    this.time.delayedCall(260, () => {
      showOnboardingTip(this, {
        id: 'tech_tree_first_visit',
        title: `Spend ${this.currency.progression.name} here`,
        body: `${this.currency.progression.icon} ${this.currency.progression.name} buy permanent upgrades. ${this.currency.deployment.icon} ${this.currency.deployment.name} upgrades are especially valuable: more ${this.currency.deployment.name} means more packs every run.`,
        focus: new Phaser.Geom.Rectangle(122, HEADER_H + 34, 650, 360),
      })
    })
  }

  private refreshPcText() {
    this.setCurrencyLineLabel(this.pcLine, `${this.currency.progression.name}: ${techState.pc}`)
  }

  private addCurrencyLine(
    anchorX: number,
    y: number,
    iconText: string,
    labelText: string,
    options: {
      align: 'left' | 'center'
      labelSize: number
      iconSize: number
      color: string
      gap?: number
      iconOffsetY?: number
      depth?: number
    },
  ): CurrencyLine {
    const icon = this.add.text(anchorX, y, iconText, {
      fontSize: `${options.iconSize}px`,
      color: options.color,
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(options.depth ?? 0)
    const label = this.add.text(anchorX, y, labelText, {
      fontSize: `${options.labelSize}px`,
      color: options.color,
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5).setDepth(options.depth ?? 0)
    const line = { icon, label, anchorX, y, iconOffsetY: options.iconOffsetY ?? 0, align: options.align, gap: options.gap ?? 7 }
    this.layoutCurrencyLine(line)
    return line
  }

  private setCurrencyLineLabel(line: CurrencyLine, label: string) {
    line.label.setText(label)
    this.layoutCurrencyLine(line)
  }

  private layoutCurrencyLine(line: CurrencyLine) {
    const totalW = line.icon.width + line.gap + line.label.width
    const startX = line.align === 'center' ? line.anchorX - totalW / 2 : line.anchorX
    line.icon.setPosition(startX, line.y + line.iconOffsetY)
    line.label.setPosition(startX + line.icon.width + line.gap, line.y)
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

    if (this.radialHub) {
      this.totalContentW = Math.max(this.totalContentW, this.radialHub.x + VIEW_PAD)
      this.totalContentH = Math.max(this.totalContentH, this.radialHub.y + VIEW_PAD)
    }

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

    if (this.radialHub) {
      const hub = this.add.graphics()
      hub.lineStyle(1, uiPalette.border.dim, 0.5)
      for (const node of visibleNodes) {
        if (node.requires.length > 0) continue
        const layout = this.layouts.get(node.id)
        if (!layout) continue
        const center = this.nodeCenter(layout)
        hub.lineBetween(this.radialHub.x, this.radialHub.y, center.x, center.y)
      }
      hub.fillStyle(uiPalette.surface.panel, 1)
      hub.fillCircle(this.radialHub.x, this.radialHub.y, 18)
      hub.lineStyle(2, uiPalette.border.strong, 0.85)
      hub.strokeCircle(this.radialHub.x, this.radialHub.y, 18)
      hub.fillStyle(uiPalette.state.reward, 0.8)
      hub.fillCircle(this.radialHub.x, this.radialHub.y, 4)
      this.content.add(hub)
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

  private generateRadialLayouts(manualLayouts: Map<string, TechNodeLayout>): Map<string, TechNodeLayout> {
    this.radialHub = null

    const byId = new Map(this.nodes.map(node => [node.id, node]))
    const depthMemo = new Map<string, number>()
    const visiting = new Set<string>()

    const depthFor = (node: TechNode): number => {
      const cached = depthMemo.get(node.id)
      if (cached !== undefined) return cached
      if (visiting.has(node.id)) return 0
      visiting.add(node.id)
      const parentDepths = node.requires
        .map(requiredId => byId.get(requiredId))
        .filter((requiredNode): requiredNode is TechNode => Boolean(requiredNode))
        .map(requiredNode => depthFor(requiredNode) + 1)
      visiting.delete(node.id)
      const depth = parentDepths.length > 0 ? Math.max(...parentDepths) : 0
      depthMemo.set(node.id, depth)
      return depth
    }

    const groups = new Map<string, TechNode[]>()
    for (const node of this.nodes) {
      const depth = depthFor(node)
      const key = `${node.branch}:${depth}`
      groups.set(key, [...(groups.get(key) ?? []), node])
    }

    const branchAngles = new Map<string, number>()
    const branchOrder = [...RADIAL_BRANCH_ORDER]
    for (const node of this.nodes) {
      if (!branchOrder.includes(node.branch)) branchOrder.push(node.branch)
    }
    branchOrder.forEach((branch, index) => {
      branchAngles.set(branch, Phaser.Math.DegToRad(-90 + (index * 360) / branchOrder.length))
    })

    const rawPositions = new Map<string, { x: number, y: number }>()
    for (const node of this.nodes) {
      const depth = depthFor(node)
      const siblings = groups.get(`${node.branch}:${depth}`) ?? [node]
      const siblingIndex = Math.max(0, siblings.findIndex(sibling => sibling.id === node.id))
      const siblingOffset = siblingIndex - (siblings.length - 1) / 2
      const baseAngle = branchAngles.get(node.branch) ?? 0
      const angle = baseAngle + Phaser.Math.DegToRad(siblingOffset * RADIAL_BRANCH_SPREAD_DEG)
      const multiDependencyBonus = Math.max(0, node.requires.length - 1) * 70
      const branchIndex = Math.max(0, branchOrder.indexOf(node.branch))
      const alternatingInnerOffset = depth === 0 && branchIndex % 2 === 1 ? RADIAL_INNER_ALT_OFFSET : 0
      const radius = RADIAL_INNER_RADIUS + alternatingInnerOffset + depth * RADIAL_DEPTH_GAP + multiDependencyBonus

      rawPositions.set(node.id, {
        x: Math.cos(angle) * radius - NODE_W / 2,
        y: Math.sin(angle) * radius - NODE_H / 2,
      })
    }

    this.relaxRadialOverlaps(rawPositions)

    let minX = -RADIAL_PAD
    let minY = -RADIAL_PAD
    for (const pos of rawPositions.values()) {
      minX = Math.min(minX, pos.x)
      minY = Math.min(minY, pos.y)
    }

    const offsetX = RADIAL_PAD - minX
    const offsetY = RADIAL_PAD - minY
    this.radialHub = { x: offsetX, y: offsetY }

    const layouts = new Map<string, TechNodeLayout>()
    for (const node of this.nodes) {
      const pos = rawPositions.get(node.id)
      if (!pos) continue
      layouts.set(node.id, {
        id: node.id,
        x: Math.round(pos.x + offsetX),
        y: Math.round(pos.y + offsetY),
        visibleWhen: manualLayouts.get(node.id)?.visibleWhen ?? 'always',
      })
    }

    return layouts
  }

  private relaxRadialOverlaps(positions: Map<string, { x: number, y: number }>) {
    const entries = [...positions.values()]
    for (let iteration = 0; iteration < RADIAL_RELAX_ITERATIONS; iteration += 1) {
      for (let i = 0; i < entries.length; i += 1) {
        for (let j = i + 1; j < entries.length; j += 1) {
          const a = entries[i]
          const b = entries[j]
          const dx = (a.x + NODE_W / 2) - (b.x + NODE_W / 2)
          const dy = (a.y + NODE_H / 2) - (b.y + NODE_H / 2)
          const overlapX = NODE_W + RADIAL_RELAX_GAP_X - Math.abs(dx)
          const overlapY = NODE_H + RADIAL_RELAX_GAP_Y - Math.abs(dy)

          if (overlapX <= 0 || overlapY <= 0) continue

          if (overlapX < overlapY) {
            const push = overlapX / 2 + 0.5
            const direction = dx >= 0 ? 1 : -1
            a.x += direction * push
            b.x -= direction * push
          } else {
            const push = overlapY / 2 + 0.5
            const direction = dy >= 0 ? 1 : -1
            a.y += direction * push
            b.y -= direction * push
          }
        }
      }
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
    const nameText = addFittedText(this, textX, ny + 9, node.name, {
      fontSize: '14px', color: nameColor, fontFamily: 'monospace', fontStyle: 'bold',
    }, { width: textW, maxLines: 1, minFontSize: 11, align: 'center' })
    this.content.add(nameText)

    const descColor = locked ? cssColor(0x667080) : cssColor(0x667799)
    const descText = addFittedText(this, textX, ny + 32, this.shortEffectLabel(node), {
      fontSize: '12px', color: descColor, fontFamily: 'monospace',
      lineSpacing: -2,
    }, { width: textW, maxLines: 2, minFontSize: 9, align: 'center' })
    this.content.add(descText)

    // Cost / status line
    let statusStr: string
    let statusColor: string
    if (maxed && node.repeatable) {
      statusStr = `LV ${level}/${node.repeatable.maxLevel}  MAX`; statusColor = cssColor(uiPalette.state.success)
    } else if (purchased && node.repeatable) {
      statusStr = `LV ${level}/${node.repeatable.maxLevel}  ${currentCost} ${this.currency.progression.icon}`; statusColor = canAfford ? cssColor(uiPalette.state.reward) : cssColor(0x664422)
    } else if (purchased) {
      statusStr = 'OWNED'; statusColor = cssColor(uiPalette.state.success)
    } else if (unmetQuest) {
      statusStr = this.questProgressLabel(unmetQuest) ?? 'QUEST LOCKED [?]'; statusColor = cssColor(0xb98a55)
    } else if (locked) {
      statusStr = 'LOCKED [?]'; statusColor = cssColor(0x8d97a6)
    } else {
      statusStr = `${currentCost} ${this.currency.progression.icon}`
      statusColor = canAfford ? cssColor(uiPalette.state.reward) : cssColor(0x664422)
    }
    const costText = addFittedText(this, textX, ny + NODE_H - 19, statusStr, {
      fontSize: '12px', color: statusColor, fontFamily: 'monospace', fontStyle: 'bold',
      lineSpacing: -2,
    }, { width: textW, maxLines: 1, minFontSize: 9, align: 'center' })
    this.content.add(costText)

    bg.on('pointerover', (pointer: Phaser.Input.Pointer) => {
      if (available && canAfford) bg.setFillStyle(bgColor + 0x0a0a0a)
      if (!this.touchMode) this.showNodeTooltip(node, pointer.x, pointer.y, unmetQuest, locked)
    })
    bg.on('pointerout', () => {
      if (available && canAfford) bg.setFillStyle(bgColor)
      if (!this.touchMode) this.hideTooltip()
    })
    bg.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.touchMode) this.moveTooltip(pointer.x, pointer.y)
    })

    // Click to purchase
    if (this.touchMode) {
      bg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (!pointer.leftButtonDown()) return
        const alreadyInspecting = this.tooltip?.getData('nodeId') === node.id
        if (available && canAfford && alreadyInspecting) {
          this.purchaseNode(node, nx, ny)
          return
        }
        if (alreadyInspecting) {
          this.hideTooltip()
          return
        }
        this.showNodeTooltip(node, pointer.x, pointer.y, unmetQuest, locked)
        this.tooltip?.setData('nodeId', node.id)
      })
    } else if (available && canAfford) {
      bg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (!pointer.leftButtonDown()) return
        this.purchaseNode(node, nx, ny)
      })
    }
  }

  private purchaseNode(node: TechNode, nx: number, ny: number) {
    audioManager.playSfx(this, 'tech_purchase')
    const burstX = (nx + NODE_W / 2 - this.scrollX) * this.zoom
    const burstY = HEADER_H + (ny + NODE_H / 2 - this.scrollY) * this.zoom
    playSparkBurst(this, burstX, burstY, uiPalette.state.reward, { count: 12, radius: 36 })
    playRingPulse(this, burstX, burstY, 34, uiPalette.state.success)
    techState.purchase(node)
    this.refreshPcText()
    this.hideTooltip()
    this.time.delayedCall(90, () => this.buildContent())
  }

  private showNodeTooltip(node: TechNode, x: number, y: number, unmetQuest: string | null, locked: boolean) {
    this.hideTooltip()
    const available = techState.isAvailable(node)
    const canAfford = techState.pc >= techState.currentCost(node)
    const effectLabel = this.shortEffectLabel(node)
    const lines = [
      node.description,
      `Effect: ${effectLabel}`,
      locked || unmetQuest
        ? `Unlock: ${unmetQuest ? this.formatQuestLabel(unmetQuest, true).replace(/^req: /, '') : 'buy prerequisite tech first'}`
        : `Cost: ${techState.currentCost(node)} ${this.currency.progression.icon} ${this.currency.progression.name}`,
      node.repeatable ? `Repeatable: ${techState.effectiveLevel(node)}/${node.repeatable.maxLevel}` : '',
      node.repeatable && techState.effectiveLevel(node) > 0 ? `Current: ${this.repeatableCurrentLabel(node, techState.effectiveLevel(node)) ?? effectLabel}` : '',
      this.touchMode && available && canAfford ? 'Tap again to buy.' : '',
    ].filter(Boolean)
    const width = 300
    const height = Math.max(94, 44 + lines.length * 32)
    const pos = this.tooltipPosition(x, y, width, height)
    const tip = this.add.container(pos.x, pos.y).setDepth(250)
    const bg = this.add.rectangle(0, 0, width, height, uiPalette.surface.panel, 0.98).setOrigin(0, 0)
    bg.setStrokeStyle(1, BRANCH_COLORS[node.branch] ?? uiPalette.border.strong)
    if (this.touchMode) {
      bg.setInteractive({ useHandCursor: true })
      bg.on('pointerdown', (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation()
        this.hideTooltip()
      })
    }
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

  private formatQuestLabel(req: string, includeProgress = false): string {
    if (req === 'boss_chapter1_killed') return 'req: Chapter 2'
    if (req === 'boss_chapter2_killed') return 'req: Chapter 3'

    const parts = req.split(':')
    if (parts.length !== 3) return req
    const [unitId, stat, threshold] = parts
    const name = this.humanizeId(unitId)
    const progress = includeProgress ? this.questProgressSuffix(req) : ''
    if (unitId.startsWith('pack_') && stat === 'bought') return `req: buy ${threshold} ${this.humanizeId(unitId.replace(/^pack_/, ''))} packs${progress}`
    if (stat === 'kills')    return `req: ${threshold} ${name} kills${progress}`
    if (stat === 'healed')   return `req: ${threshold} HP healed${progress}`
    if (stat === 'summoned') return `req: summon ${name} x${threshold}${progress}`
    return req
  }

  private questProgressLabel(req: string): string | null {
    const progress = techState.questProgress(req)
    if (!progress) return null
    return `${Math.min(progress.current, progress.threshold)}/${progress.threshold} [?]`
  }

  private questProgressSuffix(req: string): string {
    const progress = techState.questProgress(req)
    if (!progress) return ''
    return ` (current: ${Math.min(progress.current, progress.threshold)}/${progress.threshold})`
  }

  private shortEffectLabel(node: TechNode): string {
    const effects = Array.isArray(node.effect) ? node.effect : [node.effect]
    if (effects.length === 0) return node.description

    if (effects.some(effect => effect.type === 'cursor_boss_damage_mult') && effects.some(effect => effect.type === 'cursor_crate_damage_mult')) {
      const boss = effects.find(effect => effect.type === 'cursor_boss_damage_mult')?.value ?? 1
      return `+${this.formatPercent((boss - 1))} boss/crate dmg`
    }

    const labels = effects.map(effect => this.effectLabel(effect)).filter(Boolean)
    return labels.join(', ') || node.description
  }

  private effectLabel(effect: TechEffect): string {
    const value = effect.value
    const unit = effect.unitId ? `${this.humanizeId(effect.unitId)} ` : ''

    switch (effect.type) {
      case 'cursor_knockback':
        return ''
      case 'cursor_knockback_chance':
        return `+${this.formatPercent(value)} knockback chance`
      case 'cursor_cooldown':
        return `${value.toFixed(1)}s cursor CD`
      case 'cursor_damage':
        return `+${value} cursor dmg`
      case 'cursor_radius_bonus':
        return `+${value} cursor radius`
      case 'cursor_boss_damage_mult':
        return `+${this.formatPercent(value - 1)} boss dmg`
      case 'cursor_crate_damage_mult':
        return `+${this.formatPercent(value - 1)} crate dmg`
      case 'cursor_combo_damage_bonus':
        return `+${this.formatPercent(value)} combo dmg`
      case 'cursor_max_combo_bonus':
        return `+${value} max combo`
      case 'tower_hp_bonus':
        return `+${value} tower HP`
      case 'tower_starting_shield':
        return `+${value} tower shield`
      case 'tower_thorns_damage':
        return `+${value} thorns`
      case 'tower_shield_capacity':
        return `+${value} shield cap`
      case 'tower_shield_regen_rate':
        return `+${value}/s shield regen`
      case 'tower_shield_regen_delay':
        return `${value.toFixed(1)}s shield delay`
      case 'dc_budget_bonus':
        return `+${value} ${this.currency.deployment.name}`
      case 'pack_bonus_tier1_chance':
        return `+${this.formatPercent(value)} T1 bonus`
      case 'pack_bonus_tier2_chance':
        return `+${this.formatPercent(value)} T2 bonus`
      case 'crate_drop_chance_bonus':
        return `+${this.formatPercent(value)} crate drops`
      case 'unit_atk_bonus':
        return `${unit}+${value} atk`
      case 'unit_hp_bonus':
        return `${unit}+${value} HP`
      case 'unit_range_bonus':
        return `${unit}+${value} range`
      case 'unit_cooldown_mult':
        return `${unit}${this.formatPercent(1 - value)} faster`
      case 'unit_param_bonus':
        return `${unit}+${value} ${this.humanizeId(effect.param ?? 'bonus')}`
    }
  }

  private repeatableCurrentLabel(node: TechNode, level: number): string | null {
    const effects = Array.isArray(node.effect) ? node.effect : [node.effect]
    const totals = new Map<TechEffect['type'], number>()

    for (const effect of effects) {
      totals.set(effect.type, (totals.get(effect.type) ?? 0) + effect.value * level)
    }

    if (totals.has('cursor_knockback_chance')) return `${this.formatPercent(totals.get('cursor_knockback_chance') ?? 0)} knockback chance`
    if (totals.has('cursor_damage')) return `+${totals.get('cursor_damage')} cursor damage`
    if (totals.has('unit_atk_bonus')) return `+${totals.get('unit_atk_bonus')} attack`
    if (totals.has('unit_hp_bonus')) return `+${totals.get('unit_hp_bonus')} HP`
    if (totals.has('unit_range_bonus')) return `+${totals.get('unit_range_bonus')} range`
    if (totals.has('dc_budget_bonus')) return `+${totals.get('dc_budget_bonus')} ${this.currency.deployment.name}`
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

  private stopPointerGestures() {
    this.stopPanning()
    if (this.activeTouchPointers().length < 2) this.isPinching = false
  }

  private activeTouchPointers(): Phaser.Input.Pointer[] {
    return [this.input.pointer1, this.input.pointer2]
      .filter((pointer): pointer is Phaser.Input.Pointer => Boolean(pointer?.isDown))
  }

  private startPinch(pointers: Phaser.Input.Pointer[]) {
    if (pointers.length < 2) return
    this.stopPanning()
    const gesture = this.pinchGesture(pointers)
    if (!gesture) return

    this.isPinching = true
    this.pinchStartDistance = gesture.distance
    this.pinchStartZoom = this.zoom
    this.pinchScreenX = gesture.centerX
    this.pinchScreenY = gesture.centerY
    this.pinchWorldX = this.scrollX + gesture.centerX / this.zoom
    this.pinchWorldY = this.scrollY + (gesture.centerY - HEADER_H) / this.zoom
  }

  private updatePinch(pointers: Phaser.Input.Pointer[]) {
    if (!this.isPinching || pointers.length < 2) return
    const gesture = this.pinchGesture(pointers)
    if (!gesture || this.pinchStartDistance <= 0) return

    const nextZoom = this.pinchStartZoom * (gesture.distance / this.pinchStartDistance)
    this.zoom = Phaser.Math.Clamp(nextZoom, MIN_ZOOM, MAX_ZOOM)
    this.scrollX = this.pinchWorldX - this.pinchScreenX / this.zoom
    this.scrollY = this.pinchWorldY - (this.pinchScreenY - HEADER_H) / this.zoom
    this.clampScroll()
    this.updateContentPosition()
  }

  private pinchGesture(pointers: Phaser.Input.Pointer[]): { distance: number, centerX: number, centerY: number } | null {
    const [a, b] = pointers
    if (!a || !b) return null
    const dx = b.x - a.x
    const dy = b.y - a.y
    return {
      distance: Math.max(1, Math.hypot(dx, dy)),
      centerX: (a.x + b.x) / 2,
      centerY: (a.y + b.y) / 2,
    }
  }

  private zoomAtScreenPoint(screenX: number, screenY: number, nextZoom: number) {
    const oldZoom = this.zoom
    this.zoom = Phaser.Math.Clamp(nextZoom, MIN_ZOOM, MAX_ZOOM)
    if (this.zoom === oldZoom) return

    const localY = screenY - HEADER_H
    const worldX = this.scrollX + screenX / oldZoom
    const worldY = this.scrollY + localY / oldZoom
    this.scrollX = worldX - screenX / this.zoom
    this.scrollY = worldY - localY / this.zoom
    this.clampScroll()
    this.updateContentPosition()
  }

  private clampScroll() {
    const viewportH = GAME_H - HEADER_H - FOOTER_H
    const viewportWorldW = GAME_W / this.zoom
    const viewportWorldH = viewportH / this.zoom
    const maxX = Math.max(0, this.totalContentW - viewportWorldW)
    const maxY = Math.max(0, this.totalContentH - viewportWorldH)
    this.scrollX = Phaser.Math.Clamp(this.scrollX, 0, maxX)
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, maxY)
  }

  private centerScrollInBounds() {
    const viewportH = GAME_H - HEADER_H - FOOTER_H
    if (this.radialHub) {
      this.scrollX = this.radialHub.x - (GAME_W / this.zoom) / 2
      this.scrollY = this.radialHub.y - (viewportH / this.zoom) / 2
    } else {
      this.scrollX = Math.max(0, (this.totalContentW - GAME_W / this.zoom) / 2)
      this.scrollY = Math.max(0, (this.totalContentH - viewportH / this.zoom) / 2)
    }
    this.clampScroll()
    this.updateContentPosition()
  }

  private updateContentPosition() {
    this.content.setScale(this.zoom)
    this.content.setPosition(-this.scrollX * this.zoom, HEADER_H - this.scrollY * this.zoom)
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
    if (USE_PROGRAMMATIC_RADIAL_LAYOUT) return [this.nodeCenter(fromLayout), this.nodeCenter(toLayout)]

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

  private nodeCenter(layout: TechNodeLayout): { x: number, y: number } {
    return { x: layout.x + NODE_W / 2, y: layout.y + NODE_H / 2 }
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
