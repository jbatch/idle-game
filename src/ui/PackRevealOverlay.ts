import Phaser from 'phaser'
import type { UnitData, UnitSynergyData } from '../data/types'
import { GAME_H, GAME_W } from '../constants'
import { playRingPulse, playSparkBurst } from '../effects/CombatEffects'
import { audioManager } from '../systems/AudioManager'
import { showOnboardingTip } from './OnboardingOverlay'
import { isCoarseInput } from '../input/InputMode'

export type PackRollResult = {
  unitId: string
  source: 'pack' | 'bonus'
  tier: 1 | 2
}

type PackRevealTile = {
  result: PackRollResult
  container: Phaser.GameObjects.Container
  body: Phaser.GameObjects.Rectangle
  lid: Phaser.GameObjects.Rectangle
  band: Phaser.GameObjects.Rectangle
  glow: Phaser.GameObjects.Rectangle
  hitArea: Phaser.GameObjects.Rectangle
  resultObjects: Phaser.GameObjects.GameObject[]
  opened: boolean
}

export function showPackRevealOverlay(
  scene: Phaser.Scene,
  results: PackRollResult[],
  synergies: UnitSynergyData[],
  onComplete: () => void,
): void {
  if (results.length === 0) return

  audioManager.playSfx(scene, 'pack_open')
  const touchMode = isCoarseInput()

  const cols = Math.min(4, results.length)
  const rows = Math.ceil(results.length / cols)
  const tileW = 112
  const tileH = 98
  const gap = 12
  const gridW = cols * tileW + (cols - 1) * gap
  const gridH = rows * tileH + (rows - 1) * gap
  const infoW = 246
  const panelW = Math.min(840, Math.max(620, gridW + infoW + 104))
  const panelH = Math.min(780, Math.max(430, gridH + 210))
  const panelTop = GAME_H / 2 - panelH / 2
  const panelBottom = GAME_H / 2 + panelH / 2
  const contentTop = panelTop + 74
  const footerY = panelBottom - 46
  const gridAreaBottom = footerY - 34
  const gridStartX = GAME_W / 2 - panelW / 2 + 36
  const gridStartY = contentTop + Math.max(0, (gridAreaBottom - contentTop - gridH) / 2)
  const infoX = GAME_W / 2 + panelW / 2 - infoW - 34
  const infoY = contentTop
  const inspectorH = 186
  const synergyY = infoY + inspectorH + 12
  const synergyH = Math.max(92, footerY - 28 - synergyY)

  const root = scene.add.container(0, 0).setDepth(60)
  const shade = scene.add.rectangle(0, 0, GAME_W, GAME_H, 0x03050b, 0.68).setOrigin(0, 0)
  const panel = scene.add.rectangle(GAME_W / 2, GAME_H / 2, panelW, panelH, 0x0c1224, 0.96)
  panel.setStrokeStyle(1, 0x35508c)
  const title = scene.add.text(GAME_W / 2, panelTop + 32, 'OPEN YOUR PACKS', {
    fontSize: '18px', color: '#ddaa22', fontFamily: 'monospace', fontStyle: 'bold',
    align: 'center',
  }).setOrigin(0.5)
  const hint = scene.add.text(GAME_W / 2 - panelW / 2 + 36, panelBottom - 20, 'click packs to reveal the squad', {
    fontSize: '11px',
    color: '#61739f',
    fontFamily: 'monospace',
  }).setOrigin(0, 0.5)
  const openAllBtn = scene.add.rectangle(GAME_W / 2 - panelW / 2 + 116, footerY, 156, 30, 0x173263)
    .setInteractive({ useHandCursor: true })
  openAllBtn.setStrokeStyle(1, 0x6688cc)
  const openAllText = scene.add.text(openAllBtn.x, openAllBtn.y, 'OPEN ALL', {
    fontSize: '13px',
    color: '#dbe4ff',
    fontFamily: 'monospace',
    fontStyle: 'bold',
  }).setOrigin(0.5)
  const startBtn = scene.add.rectangle(GAME_W / 2 + panelW / 2 - 116, footerY, 174, 34, 0x1d5737, 0)
  startBtn.setStrokeStyle(1, 0x7cff9f, 0)
  const startText = scene.add.text(startBtn.x, startBtn.y, 'START BATTLE', {
    fontSize: '14px',
    color: '#7cff9f',
    fontFamily: 'monospace',
    fontStyle: 'bold',
  }).setOrigin(0.5).setAlpha(0)

  const infoPanel = scene.add.rectangle(infoX + infoW / 2, infoY + inspectorH / 2, infoW, inspectorH, 0x081020, 0.86)
  infoPanel.setStrokeStyle(1, 0x263a66)
  const infoTitle = scene.add.text(infoX + 14, infoY + 14, 'SQUAD INSPECTOR', {
    fontSize: '11px',
    color: '#61739f',
    fontFamily: 'monospace',
    fontStyle: 'bold',
  }).setOrigin(0, 0)
  const infoName = scene.add.text(infoX + 14, infoY + 38, 'Open a pack', {
    fontSize: '15px',
    color: '#dbe4ff',
    fontFamily: 'monospace',
    fontStyle: 'bold',
    wordWrap: { width: infoW - 28 },
  }).setOrigin(0, 0)
  const infoStats = scene.add.text(infoX + 14, infoY + 70, 'Click a revealed unit to inspect it.', {
    fontSize: '11px',
    color: '#8fa3d4',
    fontFamily: 'monospace',
    lineSpacing: 3,
    wordWrap: { width: infoW - 28 },
  }).setOrigin(0, 0)
  const infoDesc = scene.add.text(infoX + 14, infoY + 128, '', {
    fontSize: '11px',
    color: '#6f82b8',
    fontFamily: 'monospace',
    lineSpacing: 3,
    wordWrap: { width: infoW - 28 },
  }).setOrigin(0, 0)

  const synergyPanel = scene.add.rectangle(infoX + infoW / 2, synergyY + synergyH / 2, infoW, synergyH, 0x081020, 0.78)
  synergyPanel.setStrokeStyle(1, 0x263a66)
  const synergyTitle = scene.add.text(infoX + 14, synergyY + 10, 'SYNERGIES', {
    fontSize: '11px',
    color: '#61739f',
    fontFamily: 'monospace',
    fontStyle: 'bold',
  }).setOrigin(0, 0)
  const synergyText = scene.add.text(infoX + 14, synergyY + 34, 'Open matching units to activate bonuses.', {
    fontSize: '10px',
    color: '#6f82b8',
    fontFamily: 'monospace',
    lineSpacing: 1,
    wordWrap: { width: infoW - 28 },
  }).setOrigin(0, 0)

  root.add([
    shade, panel, title, hint, openAllBtn, openAllText, startBtn, startText,
    infoPanel, infoTitle, infoName, infoStats, infoDesc,
    synergyPanel, synergyTitle, synergyText,
  ])

  let openedCount = 0
  let battleStarting = false
  const openedCounts: Record<string, number> = {}
  const announcedSynergies = new Set<string>()
  const tiles = results.map((result, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    const x = gridStartX + col * (tileW + gap) + tileW / 2
    const y = gridStartY + row * (tileH + gap) + tileH / 2
    const tile = createPackRevealTile(scene, result, x, y, tileW, tileH)
    root.add(tile.container)
    tile.container.setScale(0.84).setAlpha(0)
    scene.tweens.add({
      targets: tile.container,
      alpha: 1,
      scale: 1,
      delay: 80 + index * 45,
      duration: 220,
      ease: 'Back.easeOut',
    })
    tile.hitArea.on('pointerdown', (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation()
      if (tile.opened) updateInfo(tile)
      else openTile(tile)
    })
    tile.hitArea.on('pointerover', () => {
      if (!touchMode && tile.opened) updateInfo(tile)
      tile.glow.setStrokeStyle(2, tile.opened ? 0xdbe4ff : 0xffdd77, tile.opened ? 0.8 : 0.95)
    })
    tile.hitArea.on('pointerout', () => {
      const isBonus = tile.result.source === 'bonus'
      const color = tile.opened ? (isBonus ? 0x7cff9f : 0x6688cc) : isBonus ? 0x7cff9f : 0x2a4270
      tile.glow.setStrokeStyle(tile.opened ? 2 : 1, color, isBonus ? 0.9 : 0.7)
    })
    return tile
  })

  const showStartButton = () => {
    title.setText('SQUAD READY')
    hint.setText('inspect your squad, then start when ready')
    openAllBtn.disableInteractive()
    openAllBtn.setAlpha(0.25)
    openAllText.setAlpha(0.35)
    startBtn.setInteractive({ useHandCursor: true })
    scene.tweens.add({
      targets: [startBtn, startText],
      alpha: 1,
      duration: 240,
      ease: 'Quad.easeOut',
    })
  }

  const startBattle = () => {
    if (battleStarting || openedCount < tiles.length) return
    battleStarting = true
    audioManager.playSfx(scene, 'run_start')
    scene.tweens.add({
      targets: root,
      alpha: 0,
      duration: 360,
      ease: 'Power2',
      onComplete: () => {
        root.destroy(true)
        onComplete()
      },
    })
  }

  const updateInfo = (tile: PackRevealTile) => {
    const unit = scene.cache.json.get(tile.result.unitId) as UnitData | undefined
    const isBonus = tile.result.source === 'bonus'
    infoName.setText(`${unit?.name ?? tile.result.unitId}${isBonus ? '  BONUS' : ''}`)
    infoName.setColor(isBonus ? '#7cff9f' : '#dbe4ff')
    if (!unit) {
      infoStats.setText('Unknown unit data.')
      infoDesc.setText('')
      return
    }
    infoStats.setText([
      `HP ${unit.hp}   DMG ${unit.attackDamage}`,
      `Range ${unit.attackRange}   Cooldown ${unit.attackCooldown}s`,
      `Role ${unit.behaviour.replace(/_/g, ' ')}`,
      unit.tags.length ? `Tags ${unit.tags.join(', ')}` : '',
    ].filter(Boolean).join('\n'))
    infoDesc.setText(unit.description)
  }

  const refreshSynergies = (newlyOpened: PackRollResult) => {
    openedCounts[newlyOpened.unitId] = (openedCounts[newlyOpened.unitId] ?? 0) + 1
    const active = synergies.filter(synergy => (openedCounts[synergy.unitId] ?? 0) >= synergy.threshold)
    if (active.length === 0) {
      synergyText.setText('Open matching units to activate bonuses.')
      return
    }

    synergyText.setText(active.slice(0, 2).map(synergy => {
      const count = openedCounts[synergy.unitId] ?? 0
      return `${synergy.name} (${count}/${synergy.threshold})\n${compactSynergyDescription(synergy.description)}`
    }).join('\n') + (active.length > 2 ? `\n+${active.length - 2} more active` : ''))

    for (const synergy of active) {
      if (announcedSynergies.has(synergy.id)) continue
      announcedSynergies.add(synergy.id)
      title.setText(`${synergy.name.toUpperCase()}!`)
      playSparkBurst(scene, synergyPanel.x, synergyPanel.y, 0x7cff9f, { count: 18, radius: 52, depth: 72 })
      playRingPulse(scene, synergyPanel.x, synergyPanel.y, 46, 0x7cff9f, 72)
      showOnboardingTip(scene, {
        id: 'first_synergy',
        title: 'Synergy active',
        body: 'Matching units can unlock squad bonuses. This panel shows which synergies are active before the fight starts.',
        focus: new Phaser.Geom.Rectangle(infoX, synergyY, infoW, synergyH),
      })
      scene.time.delayedCall(900, () => {
        if (openedCount >= tiles.length) title.setText('SQUAD READY')
        else title.setText('OPEN YOUR PACKS')
      })
    }
  }

  const openTile = (tile: PackRevealTile, delay = 0) => {
    if (tile.opened) return
    tile.opened = true
    scene.time.delayedCall(delay, () => {
      audioManager.playSfx(scene, 'pack_open', tile.result.source === 'bonus' ? 0.9 : 0.55)
      animatePackTileOpen(scene, tile)
      openedCount += 1
      refreshSynergies(tile.result)
      updateInfo(tile)
      if (openedCount >= tiles.length) showStartButton()
    })
  }

  openAllBtn.on('pointerover', () => {
    openAllBtn.setFillStyle(0x204580)
    openAllText.setColor('#ffffff')
  })
  openAllBtn.on('pointerout', () => {
    openAllBtn.setFillStyle(0x173263)
    openAllText.setColor('#dbe4ff')
  })
  openAllBtn.on('pointerdown', (
    _pointer: Phaser.Input.Pointer,
    _localX: number,
    _localY: number,
    event: Phaser.Types.Input.EventData,
  ) => {
    event.stopPropagation()
    audioManager.playSfx(scene, 'ui_click')
    tiles.forEach((tile, index) => openTile(tile, index * 85))
  })

  startBtn.on('pointerover', () => {
    if (openedCount < tiles.length) return
    startBtn.setFillStyle(0x27764a, 1)
    startText.setColor('#ffffff')
  })
  startBtn.on('pointerout', () => {
    startBtn.setFillStyle(0x1d5737, 1)
    startText.setColor('#7cff9f')
  })
  startBtn.on('pointerdown', (
    _pointer: Phaser.Input.Pointer,
    _localX: number,
    _localY: number,
    event: Phaser.Types.Input.EventData,
  ) => {
    event.stopPropagation()
    startBattle()
  })
}

function createPackRevealTile(
  scene: Phaser.Scene,
  result: PackRollResult,
  x: number,
  y: number,
  tileW: number,
  tileH: number,
): PackRevealTile {
  const isBonus = result.source === 'bonus'
  const unit = scene.cache.json.get(result.unitId) as UnitData | undefined
  const unitColor = unit ? Number(unit.color) : 0xccd4ff
  const accent = isBonus ? 0x7cff9f : result.tier === 2 ? 0x9b6dff : 0xddaa22
  const container = scene.add.container(x, y).setSize(tileW, tileH)

  const glow = scene.add.rectangle(0, 0, tileW, tileH, isBonus ? 0x16462a : 0x10182e, isBonus ? 0.72 : 0.52)
    .setInteractive({ useHandCursor: true })
  glow.setStrokeStyle(1, isBonus ? 0x7cff9f : 0x2a4270, isBonus ? 0.9 : 0.7)
  const halo = scene.add.circle(0, 0, Math.max(tileW, tileH) * 0.48, accent, isBonus ? 0.15 : 0.07)
  const body = scene.add.rectangle(0, 10, tileW - 30, tileH - 44, result.tier === 2 ? 0x332553 : 0x26365f)
  body.setStrokeStyle(2, accent, 0.75)
  const lid = scene.add.rectangle(0, -28, tileW - 20, 28, result.tier === 2 ? 0x4a3475 : 0x33518a)
  lid.setOrigin(0.5, 1)
  lid.setStrokeStyle(2, accent, 0.9)
  const band = scene.add.rectangle(0, 2, 14, tileH - 38, accent, 0.8)
  const seal = scene.add.circle(0, -12, 10, accent, 1)
  seal.setStrokeStyle(1, 0xffffff, 0.55)
  const tierText = scene.add.text(-tileW / 2 + 10, -tileH / 2 + 8, isBonus ? `BONUS T${result.tier}` : `T${result.tier} PACK`, {
    fontSize: '9px',
    color: isBonus ? '#7cff9f' : '#9eb2e8',
    fontFamily: 'monospace',
    fontStyle: isBonus ? 'bold' : '',
  }).setOrigin(0, 0)

  const unitPreview = unit?.visual
    ? createUnitPreviewObjects(scene, unit)
    : [scene.add.circle(0, -8, 18, unitColor, 1).setAlpha(0)]
  for (const object of unitPreview) (object as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(0)
  const unitDisc = unitPreview[0]
  if (unitDisc instanceof Phaser.GameObjects.Arc) unitDisc.setStrokeStyle(2, 0xffffff, 0.55)
  const unitName = scene.add.text(0, 25, unit?.name ?? result.unitId, {
    fontSize: '11px',
    color: isBonus ? '#7cff9f' : '#dbe4ff',
    fontFamily: 'monospace',
    fontStyle: isBonus ? 'bold' : '',
    align: 'center',
    wordWrap: { width: tileW - 16 },
  }).setOrigin(0.5).setAlpha(0)

  const resultObjects: Phaser.GameObjects.GameObject[] = [...unitPreview, unitName]
  container.add([halo, glow, body, lid, band, seal, tierText, ...unitPreview, unitName])

  if (isBonus) {
    scene.tweens.add({
      targets: halo,
      alpha: { from: 0.1, to: 0.24 },
      scale: { from: 0.96, to: 1.08 },
      yoyo: true,
      repeat: -1,
      duration: 780,
      ease: 'Sine.easeInOut',
    })
  }

  return { result, container, body, lid, band, glow, hitArea: glow, resultObjects, opened: false }
}

function createUnitPreviewObjects(scene: Phaser.Scene, unit: UnitData): Phaser.GameObjects.GameObject[] {
  if (!unit.visual) return []
  const objects: Phaser.GameObjects.GameObject[] = []
  const shadow = scene.add.ellipse(0, 6, 30, 10, 0x03050b, 0.42)
  const body = scene.add.image(0, -8, unit.visual.bodyTexture)
  body.setOrigin(0.5, 0.56)
  body.setScale((unit.visual.bodyScale ?? 0.44) * 1.12)
  objects.push(shadow, body)

  if (unit.visual.weaponTexture) {
    const weapon = scene.add.image(15, -9, unit.visual.weaponTexture)
    weapon.setOrigin(unit.visual.weaponOrigin?.x ?? 0.22, unit.visual.weaponOrigin?.y ?? 0.5)
    weapon.setRotation(-0.12)
    weapon.setScale((unit.visual.weaponScale ?? 0.36) * 1.08)
    weapon.setTint(0xe6edf8)
    objects.push(weapon)
  }

  return objects
}

function compactSynergyDescription(description: string): string {
  return description
    .replace(/^Three or more living /, '3+ ')
    .replace(/^Two or more living /, '2+ ')
    .replace('coordinate fire, attack faster, and hold a tighter firing line', 'attack faster and group up')
    .replace('pack together and hit harder', 'group up and hit harder')
    .replace('hold a wider defensive line', 'widen their defensive line')
}

function animatePackTileOpen(scene: Phaser.Scene, tile: PackRevealTile): void {
  const color = tile.result.source === 'bonus' ? 0x7cff9f : 0xddaa22
  playSparkBurst(scene, tile.container.x, tile.container.y - 6, color, { count: tile.result.source === 'bonus' ? 18 : 11, radius: 34, depth: 70 })
  playRingPulse(scene, tile.container.x, tile.container.y, 28, color, 70)
  tile.glow.setStrokeStyle(2, color, 1)

  scene.tweens.add({
    targets: tile.container,
    angle: { from: -3, to: 3 },
    duration: 58,
    yoyo: true,
    repeat: 3,
    ease: 'Sine.easeInOut',
    onComplete: () => tile.container.setAngle(0),
  })
  scene.tweens.add({
    targets: tile.lid,
    y: tile.lid.y - 28,
    angle: -22,
    alpha: 0,
    duration: 300,
    ease: 'Back.easeOut',
  })
  scene.tweens.add({
    targets: [tile.body, tile.band],
    alpha: 0,
    y: '+=10',
    delay: 120,
    duration: 260,
    ease: 'Quad.easeOut',
  })
  scene.tweens.add({
    targets: tile.resultObjects,
    alpha: 1,
    scale: { from: 0.75, to: 1 },
    delay: 220,
    duration: 260,
    ease: 'Back.easeOut',
  })
}
