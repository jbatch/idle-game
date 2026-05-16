import Phaser from 'phaser'
import type { UnitData, BalanceData, TechNode, ShopPackData, ShopPackRoll } from '../data/types'
import { GAME_W, GAME_H } from '../constants'
import { debugState } from '../debug/DebugState'
import { unitIdsFromCache } from '../game/loadGameData'
import { techState, applyDeploymentBudgetMods } from '../systems/TechState'
import { campaignLog } from '../systems/CampaignLog'
import { CheatPanel } from '../ui/CheatPanel'
import { addFittedText } from '../ui/fittedText'
import { audioManager } from '../systems/AudioManager'
import { playRingPulse, playSparkBurst, playTextToast } from '../effects/CombatEffects'
import { fadeInScene, fadeToScene } from '../ui/sceneTransitions'
import { cursors } from '../ui/cursors'
import { showOnboardingTip } from '../ui/OnboardingOverlay'

const CHAPTER_DEFS = [
  { id: 'chapter1', questReq: null, clearQuest: 'boss_chapter1_killed' },
  { id: 'chapter2', questReq: 'boss_chapter1_killed', clearQuest: 'boss_chapter2_killed' },
  { id: 'chapter3', questReq: 'boss_chapter2_killed', clearQuest: 'boss_chapter3_killed' },
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
const SHOP_BRIEFING_DISMISSED_KEY = 'siegeloop_shop_briefing_dismissed'
let draftPackPurchases: string[] = []

export function clearDraftShopPacks() {
  draftPackPurchases = []
}

function hasDismissedShopBriefing(): boolean {
  return localStorage.getItem(SHOP_BRIEFING_DISMISSED_KEY) === 'true'
}

function dismissShopBriefing() {
  localStorage.setItem(SHOP_BRIEFING_DISMISSED_KEY, 'true')
}

export class ShopScene extends Phaser.Scene {
  private balance!: BalanceData
  private unitMap!: Record<string, UnitData>
  private packs: ShopPackData[] = []
  private packPurchases: string[] = []
  private dcSpent: number = 0
  private dcBudget: number = 2

  private dcText!: Phaser.GameObjects.Text
  private loadoutGroup: Phaser.GameObjects.GameObject[] = []
  private cheatPanel: CheatPanel | null = null

  constructor() {
    super({ key: 'ShopScene' })
  }

  create() {
    fadeInScene(this)
    audioManager.playMusic(this, 'shop_theme')
    this.input.setDefaultCursor(cursors.menu)
    this.balance  = this.cache.json.get('balance')  as BalanceData
    this.unitMap  = {}
    for (const id of unitIdsFromCache(this)) {
      this.unitMap[id] = this.cache.json.get(id) as UnitData
    }
    this.packs = (this.cache.json.get('shop_packs') as { packs: ShopPackData[] }).packs

    this.packPurchases = draftPackPurchases.filter(id => this.packs.some(pack => pack.id === id))
    this.dcSpent = this.packPurchases.reduce((sum, id) => sum + (this.packs.find(pack => pack.id === id)?.cost ?? 0), 0)

    const nodes = (this.cache.json.get('tech_tree') as { nodes: TechNode[] }).nodes
    techState.normalizeLevels(nodes)
    this.dcBudget = applyDeploymentBudgetMods(this.balance.dcBudget, nodes)
    this.pruneInvalidDraftPacks()
    this.ensureCurrentChapter()

    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x080810).setOrigin(0, 0)
    this.buildHeader()
    this.buildCards()
    this.buildLoadoutPanel()
    if (this.debugToolsEnabled()) {
      this.cheatPanel = new CheatPanel(this, nodes)
      this.bindDebugCheatHotkey()
    }
    if (!hasDismissedShopBriefing()) {
      this.time.delayedCall(180, () => this.showBriefing(() => {
        this.time.delayedCall(120, () => this.maybeShowFirstRunPackTip())
      }))
    } else {
      this.time.delayedCall(220, () => this.maybeShowFirstRunPackTip())
    }
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

    const menuBtn = this.add.text(20, 52, '[ MENU ]', {
      fontSize: '11px', color: '#334455', fontFamily: 'monospace',
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true })
    menuBtn.on('pointerover', () => menuBtn.setColor('#6688aa'))
    menuBtn.on('pointerout',  () => menuBtn.setColor('#334455'))
    menuBtn.on('pointerdown', () => fadeToScene(this, 'MenuScene', undefined, { sfx: 'ui_click' }))

    const helpBtn = this.add.text(20, 74, '[ HOW TO PLAY ]', {
      fontSize: '11px', color: '#334455', fontFamily: 'monospace',
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true })
    helpBtn.on('pointerover', () => helpBtn.setColor('#6688aa'))
    helpBtn.on('pointerout',  () => helpBtn.setColor('#334455'))
    helpBtn.on('pointerdown', () => {
      audioManager.playSfx(this, 'ui_click')
      this.showBriefing()
    })

    const hasCompletedRun = campaignLog.records.length > 0
    const techBtn = this.add.text(GAME_W - 20, 28, '[ TECH TREE ]', {
      fontSize: '13px', color: hasCompletedRun ? '#4455aa' : '#334455', fontFamily: 'monospace',
    }).setOrigin(1, 0.5)
    if (hasCompletedRun) {
      techBtn.setInteractive({ useHandCursor: true })
      techBtn.on('pointerover', () => techBtn.setColor('#7788cc'))
      techBtn.on('pointerout',  () => techBtn.setColor('#4455aa'))
      techBtn.on('pointerdown', () => fadeToScene(this, 'TechTreeScene', undefined, { sfx: 'ui_click' }))
    }

    if (this.debugToolsEnabled()) {
      const runsBtn = this.add.text(GAME_W - 20, 74, '[ RUN LOG ]', {
        fontSize: '11px', color: '#334455', fontFamily: 'monospace',
      }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true })
      runsBtn.on('pointerover', () => runsBtn.setColor('#6688aa'))
      runsBtn.on('pointerout',  () => runsBtn.setColor('#334455'))
      runsBtn.on('pointerdown', () => this.cheatPanel?.open('RUNS'))
    }

    // Chapter selector — one button per chapter
    const chapterY = 60
    const slotW = 180
    const startX = GAME_W / 2 - slotW

    CHAPTER_DEFS.forEach((def, i) => {
      const chData = this.cache.json.get(def.id) as { name: string }
      const isUnlocked = !def.questReq || techState.questDone(def.questReq)
      const isCleared = techState.questDone(def.clearQuest)
      const isActive   = debugState.chapter === def.id
      const x = startX + i * slotW

      const label = isUnlocked ? `${chData.name}${isCleared ? ' ✓' : ''}` : '???'
      const color = isActive ? '#8899cc' : isUnlocked && !isCleared ? '#445577' : '#2a3344'
      const btn = this.add.text(x, chapterY, label, {
        fontSize: '12px', color, fontFamily: 'monospace',
      }).setOrigin(0.5)

      if (isUnlocked && !isCleared) {
        btn.setInteractive({ useHandCursor: true })
        btn.on('pointerover', () => btn.setColor(isActive ? '#aabbdd' : '#667799'))
        btn.on('pointerout',  () => btn.setColor(color))
        btn.on('pointerdown', () => {
          if (isActive) return
          debugState.chapter = def.id
          fadeToScene(this, 'ShopScene', undefined, { sfx: 'ui_click', duration: 180 })
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

  // ─── Pack cards ──────────────────────────────────────────────────

  private buildCards() {
    this.add.text(CARD_X, CARDS_Y - 22, 'AVAILABLE PACKS', {
      fontSize: '11px', color: '#445577', fontFamily: 'monospace',
    })

    this.packs.forEach((pack, i) => {
      const y = CARDS_Y + i * (CARD_H + CARD_GAP)
      this.buildCard(pack, CARD_X, y)
    })
  }

  private buildCard(pack: ShopPackData, x: number, y: number) {
    const isUnlocked = this.isPackUnlocked(pack)
    const color = isUnlocked ? 0x3366aa : 0x334455
    const btnW = 80
    const btnH = 26
    const btnX = x + CARD_W - btnW - 10
    const btnY = y + CARD_H - btnH - 10
    const textX = x + 52
    const copyW = btnX - textX - 14

    // Background
    const bg = this.add.rectangle(x, y, CARD_W, CARD_H, isUnlocked ? 0x0d1122 : 0x090d18).setOrigin(0, 0)
    const border = this.add.graphics()
    border.lineStyle(1, isUnlocked ? 0x223366 : 0x1a2230, 1)
    border.strokeRect(x, y, CARD_W, CARD_H)

    // Left colour strip
    const strip = this.add.graphics()
    strip.fillStyle(color, 0.8)
    strip.fillRect(x, y, 4, CARD_H)

    // Pack icon
    const icon = this.add.graphics()
    icon.fillStyle(color, 1)
    icon.fillRoundedRect(x + 16, y + CARD_H / 2 - 14, 28, 28, 5)
    icon.lineStyle(1, 0xffffff, 0.3)
    icon.strokeRoundedRect(x + 16, y + CARD_H / 2 - 14, 28, 28, 5)

    // Name + cost
    addFittedText(this, textX, y + 12, pack.name, {
      fontSize: '16px', color: '#ccd4ff', fontFamily: 'monospace', fontStyle: 'bold',
    }, { width: copyW, maxLines: 1, minFontSize: 13 })
    this.add.text(x + CARD_W - 12, y + 12, `${pack.cost} DC`, {
      fontSize: '14px', color: '#ddaa22', fontFamily: 'monospace',
    }).setOrigin(1, 0)

    // Hidden unit count + pool summary
    const rollText = `${pack.rolls} hidden unit${pack.rolls === 1 ? '' : 's'}`
    this.add.text(textX, y + 38, rollText, {
      fontSize: '11px', color: '#667799', fontFamily: 'monospace',
    })

    const summary = this.rollTableSummary(pack.rollTable)
    addFittedText(this, textX, y + 55, summary, {
      fontSize: '12px', color: '#8899aa', fontFamily: 'monospace',
      lineSpacing: -2,
    }, { width: copyW, maxLines: 2, minFontSize: 10 })

    const description = isUnlocked ? pack.description : this.packLockText(pack)
    addFittedText(this, textX, y + 90, description, {
      fontSize: '11px', color: isUnlocked ? '#667799' : '#664444', fontFamily: 'monospace',
      lineSpacing: -2,
    }, { width: copyW, maxLines: 2, minFontSize: 9 })

    // BUY button
    const addBtn = this.add.rectangle(btnX, btnY, btnW, btnH, 0x112244)
      .setOrigin(0, 0).setInteractive({ useHandCursor: isUnlocked })
    const addText = this.add.text(btnX + btnW / 2, btnY + btnH / 2, isUnlocked ? 'BUY' : 'LOCKED', {
      fontSize: '12px', color: '#6688cc', fontFamily: 'monospace',
    }).setOrigin(0.5)

    addBtn.on('pointerover', () => {
      if (this.canBuyPack(pack)) addBtn.setFillStyle(0x1a3366)
    })
    addBtn.on('pointerout', () => addBtn.setFillStyle(0x112244))
    addBtn.on('pointerdown', () => {
      if (!this.canBuyPack(pack)) return
      audioManager.playSfx(this, 'pack_buy')
      playSparkBurst(this, btnX + btnW / 2, btnY + btnH / 2, 0xddaa22, { count: 9, radius: 26 })
      this.tweens.add({
        targets: bg,
        scaleX: 1.012,
        scaleY: 1.035,
        duration: 90,
        yoyo: true,
        ease: 'Quad.easeOut',
      })
      this.packPurchases.push(pack.id)
      this.saveDraftPackPurchases()
      this.dcSpent += pack.cost
      this.refreshDCText()
      this.refreshLoadout()
    })

    // Store bg ref for hover effect on whole card
    bg.setInteractive({ useHandCursor: isUnlocked })
    bg.on('pointerover', () => {
      if (this.canBuyPack(pack)) bg.setFillStyle(0x111830)
    })
    bg.on('pointerout', () => bg.setFillStyle(isUnlocked ? 0x0d1122 : 0x090d18))
    bg.on('pointerdown', () => addBtn.emit('pointerdown'))

    // Keep buy button text in sync with affordability.
    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (!this.isPackUnlocked(pack)) {
          addText.setText('LOCKED')
          addText.setColor('#334455')
          return
        }
        const canBuy = this.canBuyPack(pack)
        addText.setText(canBuy ? 'BUY' : this.isPackAtLimit(pack) ? 'MAX' : 'FULL')
        addText.setColor(canBuy ? '#6688cc' : '#334455')
      },
    })
  }

  private isPackUnlocked(pack: ShopPackData): boolean {
    if (pack.unlockTechId && !techState.has(pack.unlockTechId)) return false
    return (pack.questRequirements ?? []).every(req => techState.isQuestRequirementMet(req))
  }

  private canBuyPack(pack: ShopPackData): boolean {
    return this.isPackUnlocked(pack) && !this.isPackAtLimit(pack) && this.dcSpent + pack.cost <= this.dcBudget
  }

  private isPackAtLimit(pack: ShopPackData): boolean {
    if (!pack.maxPurchases) return false
    return (this.packPurchaseCounts()[pack.id] ?? 0) >= pack.maxPurchases
  }

  private packLockText(pack: ShopPackData): string {
    if (pack.unlockTechId && !techState.has(pack.unlockTechId)) return 'Unlock with Deployment Drills.'
    const unmet = (pack.questRequirements ?? []).find(req => !techState.isQuestRequirementMet(req))
    if (unmet) return this.formatPackRequirement(unmet)
    return 'Locked.'
  }

  private formatPackRequirement(req: string): string {
    if (req === 'boss_chapter1_killed') return 'Unlock by reaching Chapter 2.'

    const progress = techState.questProgress(req)
    if (!progress) return `Unlock: ${req}`

    const [subject, stat] = req.split(':')
    if (subject.startsWith('pack_') && stat === 'bought') {
      const packId = subject.replace(/^pack_/, '')
      const packName = this.packs.find(pack => pack.id === packId)?.name ?? packId
      return `Buy ${progress.threshold} ${packName}s. ${progress.current}/${progress.threshold}`
    }

    return `${progress.current}/${progress.threshold}`
  }

  private rollTableSummary(rollTable: ShopPackRoll[]): string {
    const groups = new Map<string, string[]>()
    for (const roll of rollTable) {
      const label = this.rarityLabel(roll.rarity)
      const unit = this.unitMap[roll.unitId]
      const name = unit?.name ?? roll.unitId
      const names = groups.get(label) ?? []
      if (!names.includes(name)) names.push(name)
      groups.set(label, names)
    }
    return [...groups.entries()].map(([label, names]) => `${label}: ${names.join(', ')}`).join('   ')
  }

  private rarityLabel(rarity: ShopPackRoll['rarity']): string {
    if (rarity === 'common') return 'Common'
    return 'Rare'
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

    // Start button (always present, wired to current pack purchases)
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
    const packCounts = this.packPurchaseCounts()
    const packEntries = Object.entries(packCounts).filter(([, count]) => count > 0)

    if (packEntries.length === 0) {
      const t = this.add.text(PANEL_X + PANEL_W / 2, startY + 30, 'Choose at least one pack', {
        fontSize: '12px', color: '#556688', fontFamily: 'monospace',
      }).setOrigin(0.5)
      this.loadoutGroup.push(t)
    } else {
      packEntries.forEach(([id, count], i) => {
        const pack = this.packs.find(p => p.id === id)
        if (!pack) return
        const y = startY + i * 40
        const color = pack.rollTable.some(r => r.rarity === 'specialist') ? 0x8844aa : 0x3366aa

        const dot = this.add.graphics()
        dot.fillStyle(color, 1)
        dot.fillRoundedRect(PANEL_X + 19, y + 7, 14, 14, 3)
        this.loadoutGroup.push(dot)

        const label = this.add.text(PANEL_X + 42, y + 6, pack.name, {
          fontSize: '13px', color: '#aabbcc', fontFamily: 'monospace',
        })
        this.loadoutGroup.push(label)

        const totalRolls = count * pack.rolls
        const countText = this.add.text(PANEL_X + 42, y + 22, `x ${count}  ${totalRolls} hidden roll${totalRolls === 1 ? '' : 's'}  (${count * pack.cost} DC)`, {
          fontSize: '11px', color: '#556688', fontFamily: 'monospace',
        })
        this.loadoutGroup.push(countText)

        // Remove one unopened pack purchase.
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
          const purchaseIndex = this.packPurchases.lastIndexOf(id)
          if (purchaseIndex < 0) return
          this.packPurchases.splice(purchaseIndex, 1)
          this.saveDraftPackPurchases()
          this.dcSpent -= pack.cost
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
    const hiddenRolls = this.packPurchases.reduce((sum, id) => {
      const pack = this.packs.find(p => p.id === id)
      return sum + (pack?.rolls ?? 0)
    }, 0)
    const totalLabel = this.add.text(
      PANEL_X + 16, PANEL_Y + PANEL_H - 80,
      `Total: ${this.dcSpent} / ${this.dcBudget} DC    Hidden rolls: ${hiddenRolls}`,
      { fontSize: '12px', color: '#667799', fontFamily: 'monospace' }
    )
    this.loadoutGroup.push(totalLabel)
    this.maybeShowFirstRunStartTip()
  }

  private maybeShowFirstRunPackTip() {
    if (!this.isBeforeFirstRun()) return
    showOnboardingTip(this, {
      id: 'shop_first_two_packs',
      title: 'Buy two packs',
      body: 'This is your starter pack. Buy it twice for the first run so you begin with two hidden units defending the tower.',
      focus: new Phaser.Geom.Rectangle(CARD_X - 8, CARDS_Y - 8, CARD_W + 16, CARD_H + 16),
    })
  }

  private maybeShowFirstRunStartTip() {
    if (!this.isBeforeFirstRun()) return
    if ((this.packPurchaseCounts().tier1_recruit ?? 0) < 2) return
    showOnboardingTip(this, {
      id: 'shop_first_start_battle',
      title: 'Start battle',
      body: 'Good. Two packs spend all your starting DC. Start the run to reveal your squad and learn combat.',
      focus: this.startButtonFocus(),
    })
  }

  private isBeforeFirstRun(): boolean {
    return campaignLog.records.length === 0 && !campaignLog.pending
  }

  private startButtonFocus(): Phaser.Geom.Rectangle {
    const btnY = PANEL_Y + PANEL_H - 54
    return new Phaser.Geom.Rectangle(PANEL_X + 8, btnY - 8, PANEL_W - 16, 56)
  }

  private packPurchaseCounts(): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const packId of this.packPurchases) counts[packId] = (counts[packId] ?? 0) + 1
    return counts
  }

  private startRun() {
    if (this.packPurchases.length === 0) {
      audioManager.playSfx(this, 'ui_hover')
      playTextToast(this, 'Buy a pack before starting the run', PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H - 72, '#ddaa22')
      return
    }

    const techNodes = (this.cache.json.get('tech_tree') as { nodes: TechNode[] }).nodes
    const run = campaignLog.beginRun({
      chapter: debugState.chapter,
      pcBefore: techState.pc,
      dcBudget: this.dcBudget,
      dcSpent: this.dcSpent,
      selectedPacks: [...this.packPurchases],
      unlockedPacks: this.packs.filter(pack => this.isPackUnlocked(pack)).map(pack => pack.id),
      unlockedChapters: CHAPTER_DEFS
        .filter(def => !def.questReq || techState.questDone(def.questReq))
        .map(def => def.id),
      availableTech: techNodes.filter(node => techState.isAvailable(node)).map(node => node.id),
      techLevels: Object.fromEntries(
        techNodes
          .map(node => [node.id, techState.effectiveLevel(node)] as const)
          .filter(([, level]) => level > 0)
      ),
      completedQuests: [...techState.completedQuests],
    })
    for (const packId of this.packPurchases) {
      techState.incrementStat(`pack_${packId}_bought`)
      if (packId === 'tier2_squad') techState.incrementStat('pack_tier2_specialist_bought')
    }
    draftPackPurchases = []
    playRingPulse(this, PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H - 34, 44, 0xddaa22)
    fadeToScene(this, 'GameScene', { packs: [...this.packPurchases], campaignRunId: run.id }, { duration: 420, sfx: 'run_start' })
  }

  private debugToolsEnabled(): boolean {
    return new URLSearchParams(window.location.search).has('debug')
  }

  private bindDebugCheatHotkey() {
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.key !== '`') return
      this.cheatPanel?.toggle()
    })
  }

  private ensureCurrentChapter() {
    const current = CHAPTER_DEFS.find(def => def.id === debugState.chapter)
    const currentUnlocked = current && (!current.questReq || techState.questDone(current.questReq))
    if (current && currentUnlocked && !techState.questDone(current.clearQuest)) return
    debugState.chapter = this.nextPlayableChapterId()
  }

  private nextPlayableChapterId(): string {
    const next = CHAPTER_DEFS.find(def => {
      const unlocked = !def.questReq || techState.questDone(def.questReq)
      return unlocked && !techState.questDone(def.clearQuest)
    })
    return next?.id ?? CHAPTER_DEFS[CHAPTER_DEFS.length - 1].id
  }

  private pruneInvalidDraftPacks() {
    const kept: string[] = []
    let spent = 0
    for (const packId of this.packPurchases) {
      const pack = this.packs.find(item => item.id === packId)
      if (!pack) continue
      if (!this.isPackUnlocked(pack)) continue
      const count = kept.filter(id => id === packId).length
      if (pack.maxPurchases && count >= pack.maxPurchases) continue
      if (spent + pack.cost > this.dcBudget) continue
      kept.push(packId)
      spent += pack.cost
    }
    this.packPurchases = kept
    this.dcSpent = spent
    this.saveDraftPackPurchases()
  }

  private saveDraftPackPurchases() {
    draftPackPurchases = [...this.packPurchases]
  }

  private showBriefing(onClose?: () => void) {
    const shade = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x03050b, 0.76).setOrigin(0, 0).setDepth(60)
    const panel = this.add.rectangle(GAME_W / 2, GAME_H / 2, 610, 344, 0x0b1224, 0.98).setDepth(61)
    panel.setStrokeStyle(1, 0x334d88)

    const title = this.add.text(GAME_W / 2, GAME_H / 2 - 134, 'BEFORE THE SIEGE', {
      fontSize: '22px',
      color: '#dbe4ff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(62)

    const body = this.add.text(GAME_W / 2, GAME_H / 2 - 82, [
      'Spend DC on unopened packs. You will not know the exact squad until battle starts.',
      '',
      'In combat, click enemies and crates while your units defend the tower.',
      '',
      'After each run, spend earned PC in the tech tree to unlock stronger options.',
    ].join('\n'), {
      fontSize: '14px',
      color: '#aebce8',
      fontFamily: 'monospace',
      align: 'center',
      lineSpacing: 5,
      wordWrap: { width: 520 },
    }).setOrigin(0.5, 0).setDepth(62)

    const close = this.add.text(GAME_W / 2, GAME_H / 2 + 126, '[ START SHOPPING ]', {
      fontSize: '16px',
      color: '#ddaa22',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(62).setInteractive({ useHandCursor: true })

    const items = [shade, panel, title, body, close]
    close.on('pointerover', () => close.setColor('#ffe1a3'))
    close.on('pointerout', () => close.setColor('#ddaa22'))
    close.on('pointerdown', () => {
      audioManager.playSfx(this, 'ui_click')
      dismissShopBriefing()
      items.forEach(item => item.destroy())
      onClose?.()
    })
  }
}
