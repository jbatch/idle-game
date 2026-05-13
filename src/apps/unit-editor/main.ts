import type { UnitAttackEffect, UnitBehaviour, UnitData, UnitEffects, UnitManifestData } from '../../data/types'

type EditableUnit = UnitData & {
  sourceFile?: string
}

type UnitEditorResponse = {
  manifest: UnitManifestData
  units: EditableUnit[]
  files: string[]
}

type PreviewParticle =
  | { type: 'projectile', x: number, y: number, startX: number, startY: number, targetX: number, targetY: number, age: number, duration: number, color: number }
  | { type: 'slash', age: number, duration: number, color: number }
  | { type: 'pulse', age: number, duration: number, color: number }
  | { type: 'float', x: number, y: number, age: number, duration: number, text: string }

const UNIT_BEHAVIOURS: UnitBehaviour[] = ['melee_basic', 'melee_taunt', 'ranged_kite', 'heal_support', 'aoe_slow', 'stationary_guard', 'aura_haste']
const ATTACK_EFFECTS: Array<UnitAttackEffect | ''> = ['', 'melee_slash', 'quick_projectile']
const DEFAULT_UNIT: UnitData = {
  id: 'new_unit',
  name: 'New Unit',
  cost: 1,
  tier: 1,
  hp: 50,
  speed: 70,
  attackDamage: 8,
  attackRange: 40,
  attackCooldown: 1.2,
  behaviour: 'melee_basic',
  effects: { attack: 'melee_slash' },
  params: { separationRadius: 28 },
  tags: ['melee'],
  description: 'Describe this unit role.',
  radius: 9,
  color: '0x44aa66',
}

const app = requireElement<HTMLDivElement>('#app')
app.innerHTML = `
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      height: 100vh;
      overflow: hidden;
      background: #080a0e;
      color: #e4e8f8;
      font: 13px/1.45 Inter, ui-sans-serif, system-ui, sans-serif;
    }
    #app { height: 100vh; }
    .shell { display: grid; grid-template-rows: 48px 1fr; height: 100vh; }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 14px;
      border-bottom: 1px solid #26334b;
      background: #10151e;
    }
    .toolbar h1 { margin: 0 10px 0 0; font-size: 15px; white-space: nowrap; }
    .toolbar a, .toolbar button {
      height: 30px;
      border: 1px solid #34445f;
      border-radius: 6px;
      background: #171d2a;
      color: #eef2ff;
      padding: 0 10px;
      font: inherit;
      text-decoration: none;
      cursor: pointer;
    }
    .toolbar a:hover, .toolbar button:hover { border-color: #6f96d1; }
    .toolbar button.primary { background: #1f4b52; border-color: #58a6b2; }
    .status {
      margin-left: auto;
      color: #93a1bd;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace { display: grid; grid-template-columns: 260px minmax(380px, 1fr) 420px; min-height: 0; }
    .sidebar, .editor, .preview {
      min-height: 0;
      overflow: auto;
      background: #0f141d;
    }
    .sidebar { border-right: 1px solid #26334b; padding: 14px; }
    .editor { padding: 16px; }
    .preview { border-left: 1px solid #26334b; padding: 16px; }
    h2 { margin: 0 0 12px; font-size: 16px; }
    h3 {
      margin: 18px 0 8px;
      color: #9dafc9;
      font-size: 12px;
      text-transform: uppercase;
    }
    .muted { color: #8c98b2; }
    .unit-list { display: grid; gap: 8px; }
    .unit-row {
      width: 100%;
      display: grid;
      grid-template-columns: 16px 1fr;
      align-items: center;
      gap: 10px;
      border: 1px solid #27374f;
      border-radius: 6px;
      background: #151c29;
      color: #eef2ff;
      padding: 9px;
      text-align: left;
      cursor: pointer;
      font: inherit;
    }
    .unit-row:hover { border-color: #5d87c4; }
    .unit-row.selected { border-color: #f2c366; background: #1b2636; }
    .swatch { width: 14px; height: 14px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.45); }
    .unit-id { display: block; color: #8290ab; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    label { display: grid; gap: 5px; margin: 10px 0; color: #a9b6d0; }
    input, select, textarea {
      width: 100%;
      border: 1px solid #2c3b56;
      border-radius: 6px;
      background: #090d14;
      color: #eef2ff;
      padding: 8px;
      font: inherit;
    }
    textarea { min-height: 76px; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    input[type="color"] { height: 37px; padding: 3px; }
    input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
    input[type="color"]::-webkit-color-swatch { border: 0; border-radius: 4px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
    .editor button, .sidebar button, .preview button {
      border: 1px solid #34445f;
      border-radius: 6px;
      background: #171d2a;
      color: #eef2ff;
      padding: 8px 10px;
      font: inherit;
      cursor: pointer;
    }
    .editor button:hover, .sidebar button:hover, .preview button:hover { border-color: #6f96d1; }
    .danger { color: #ffaaa8 !important; border-color: #704044 !important; }
    .preview canvas {
      width: 100%;
      aspect-ratio: 1.12;
      display: block;
      border: 1px solid #26364f;
      border-radius: 6px;
      background: #070a10;
    }
    .stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 12px;
    }
    .stat {
      border: 1px solid #26364f;
      border-radius: 6px;
      padding: 8px;
      background: #121925;
    }
    .stat span { display: block; color: #7e8ba6; font-size: 11px; }
    .stat strong { color: #e7ecff; font-size: 13px; }
  </style>
  <div class="shell">
    <header class="toolbar">
      <h1>Unit Editor</h1>
      <a href="/tools/">Tools</a>
      <button id="new-unit" type="button">New unit</button>
      <button id="duplicate-unit" type="button">Duplicate</button>
      <button id="save-units" class="primary" type="button">Save units</button>
      <div id="status" class="status">Loading units...</div>
    </header>
    <main class="workspace">
      <aside class="sidebar">
        <h2>Units</h2>
        <div id="unit-list" class="unit-list"></div>
      </aside>
      <section id="editor" class="editor"></section>
      <aside class="preview">
        <h2>Preview</h2>
        <canvas id="preview-canvas"></canvas>
        <div class="actions">
          <button id="reset-preview" type="button">Reset preview</button>
        </div>
        <div id="preview-stats" class="stats"></div>
      </aside>
    </main>
  </div>
`

const unitListEl = requireElement<HTMLDivElement>('#unit-list')
const editorEl = requireElement<HTMLDivElement>('#editor')
const statusEl = requireElement<HTMLDivElement>('#status')
const saveBtn = requireElement<HTMLButtonElement>('#save-units')
const newBtn = requireElement<HTMLButtonElement>('#new-unit')
const duplicateBtn = requireElement<HTMLButtonElement>('#duplicate-unit')
const resetPreviewBtn = requireElement<HTMLButtonElement>('#reset-preview')
const previewStatsEl = requireElement<HTMLDivElement>('#preview-stats')
const previewCanvas = requireElement<HTMLCanvasElement>('#preview-canvas')
const previewCtx = requireCanvasContext(previewCanvas)

let units: EditableUnit[] = []
let originalFiles: string[] = []
let selectedId = ''
let dirty = false
let lastPreviewTime = performance.now()
let preview = createPreviewState()

void loadUnits()
requestAnimationFrame(previewFrame)

newBtn.addEventListener('click', () => {
  const unit = makeUniqueUnit(DEFAULT_UNIT)
  units.push(unit)
  selectedId = unit.id
  markDirty('Created a new unit draft')
  renderAll()
})

duplicateBtn.addEventListener('click', () => {
  const source = selectedUnit()
  if (!source) return
  const unit = makeUniqueUnit({ ...cloneUnit(source), id: `${source.id}_copy`, name: `${source.name} Copy` })
  units.push(unit)
  selectedId = unit.id
  markDirty(`Duplicated ${source.name}`)
  renderAll()
})

saveBtn.addEventListener('click', () => void saveUnits())
resetPreviewBtn.addEventListener('click', () => {
  preview = createPreviewState()
  setStatus('Preview reset')
})

async function loadUnits() {
  try {
    const response = await fetch('/__unit-editor/units')
    if (!response.ok) throw new Error('Unit editor endpoint is unavailable')
    const payload = await response.json() as UnitEditorResponse
    const byId = new Map(payload.units.map(unit => [unit.id, unit]))
    units = payload.manifest.units.map(id => byId.get(id)).filter(isUnit)
    for (const unit of payload.units) {
      if (!units.some(existing => existing.id === unit.id)) units.push(unit)
    }
    originalFiles = payload.files
    selectedId = units[0]?.id ?? ''
    dirty = false
    renderAll()
    setStatus('Editing public/data/units/*.json and public/data/unit_manifest.json')
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Unable to load units')
  }
}

async function saveUnits() {
  saveBtn.disabled = true
  try {
    normalizeUnitsForSave()
    const response = await fetch('/__unit-editor/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        units,
        manifest: { units: units.map(unit => unit.id) },
        originalFiles,
      }),
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null
      throw new Error(payload?.error ?? 'Save failed')
    }
    originalFiles = units.map(unit => `${unit.id}.json`)
    dirty = false
    renderAll()
    setStatus('Saved unit files and unit manifest')
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Save failed')
  } finally {
    saveBtn.disabled = false
  }
}

function renderAll() {
  renderUnitList()
  renderEditor()
  renderPreviewStats()
}

function renderUnitList() {
  unitListEl.innerHTML = units.map(unit => `
    <button class="unit-row ${unit.id === selectedId ? 'selected' : ''}" type="button" data-select="${escapeAttr(unit.id)}">
      <span class="swatch" style="background:${escapeAttr(colorToCss(unit.color))}"></span>
      <span>
        ${escapeHtml(unit.name)}
        <span class="unit-id">${escapeHtml(unit.id)}</span>
      </span>
    </button>
  `).join('')

  unitListEl.querySelectorAll<HTMLButtonElement>('[data-select]').forEach(button => {
    button.addEventListener('click', () => {
      selectedId = button.dataset.select ?? selectedId
      preview = createPreviewState()
      renderAll()
    })
  })
}

function renderEditor() {
  const unit = selectedUnit()
  if (!unit) {
    editorEl.innerHTML = '<h2>No unit selected</h2><p class="muted">Create a unit to start editing.</p>'
    return
  }

  editorEl.innerHTML = `
    <h2>${escapeHtml(unit.name)}</h2>
    <p class="muted">${escapeHtml(unit.id)}${dirty ? ' | unsaved changes' : ''}</p>

    <h3>Identity</h3>
    <div class="grid2">
      <label>ID <input data-field="id" value="${escapeAttr(unit.id)}" /></label>
      <label>Name <input data-field="name" value="${escapeAttr(unit.name)}" /></label>
    </div>
    <label>Description <textarea data-field="description">${escapeHtml(unit.description)}</textarea></label>
    <div class="grid3">
      <label>Tier <input data-number="tier" type="number" step="1" value="${unit.tier}" /></label>
      <label>Cost <input data-number="cost" type="number" step="1" value="${unit.cost}" /></label>
      <label>Color <input data-color="color" type="color" value="${escapeAttr(colorToCss(unit.color))}" /></label>
    </div>
    <label>Tags <input data-tags="tags" value="${escapeAttr(unit.tags.join(', '))}" /></label>

    <h3>Stats</h3>
    <div class="grid3">
      <label>HP <input data-number="hp" type="number" step="1" value="${unit.hp}" /></label>
      <label>Speed <input data-number="speed" type="number" step="1" value="${unit.speed}" /></label>
      <label>Radius <input data-number="radius" type="number" step="1" value="${unit.radius}" /></label>
    </div>
    <div class="grid3">
      <label>Damage <input data-number="attackDamage" type="number" step="1" value="${unit.attackDamage}" /></label>
      <label>Range <input data-number="attackRange" type="number" step="1" value="${unit.attackRange}" /></label>
      <label>Cooldown <input data-number="attackCooldown" type="number" step="0.1" value="${unit.attackCooldown}" /></label>
    </div>

    <h3>Behaviour</h3>
    <div class="grid2">
      <label>Behaviour <select data-field="behaviour">${UNIT_BEHAVIOURS.map(item => option(item, unit.behaviour)).join('')}</select></label>
      <label>Attack effect <select data-effect="attack">${ATTACK_EFFECTS.map(item => option(item, unit.effects?.attack ?? '', item || 'none')).join('')}</select></label>
    </div>
    <label>Params JSON <textarea data-json="params">${escapeHtml(formatJson(unit.params ?? {}))}</textarea></label>
    <label>Effects JSON <textarea data-json="effects">${escapeHtml(formatJson(unit.effects ?? {}))}</textarea></label>

    <h3>File</h3>
    <p class="muted">This unit saves as public/data/units/${escapeHtml(unit.id)}.json.</p>
    <div class="actions">
      <button id="move-up" type="button">Move up</button>
      <button id="move-down" type="button">Move down</button>
      <button id="delete-unit" class="danger" type="button">Delete unit</button>
    </div>
  `

  editorEl.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-field]').forEach(input => {
    input.addEventListener('input', () => {
      const field = input.dataset.field as keyof UnitData | undefined
      if (!field) return
      const previousId = unit.id
      if (field === 'id') {
        unit.id = slugUnitId(input.value)
        input.value = unit.id
        selectedId = unit.id
      } else if (field === 'name' || field === 'description') {
        unit[field] = input.value
      } else if (field === 'behaviour') {
        unit.behaviour = input.value as UnitBehaviour
      }
      markDirty(field === 'id' ? `Renamed ${previousId} to ${unit.id}` : 'Updated unit')
      refreshEditorHeading(unit)
      renderUnitList()
      renderPreviewStats()
    })
  })

  editorEl.querySelectorAll<HTMLInputElement>('[data-number]').forEach(input => {
    input.addEventListener('input', () => {
      const field = input.dataset.number as NumericUnitField | undefined
      if (!field) return
      unit[field] = Number(input.value) || 0
      markDirty('Updated unit stats')
      renderPreviewStats()
    })
  })

  editorEl.querySelector<HTMLInputElement>('[data-color]')?.addEventListener('input', event => {
    const input = event.currentTarget as HTMLInputElement
    unit.color = cssToDataColor(input.value)
    markDirty('Updated unit color')
    renderUnitList()
  })

  editorEl.querySelector<HTMLInputElement>('[data-tags]')?.addEventListener('input', event => {
    const input = event.currentTarget as HTMLInputElement
    unit.tags = input.value.split(',').map((tag: string) => tag.trim()).filter(Boolean)
    markDirty('Updated unit tags')
  })

  editorEl.querySelector<HTMLSelectElement>('[data-effect]')?.addEventListener('input', event => {
    const input = event.currentTarget as HTMLSelectElement
    const value = input.value as UnitAttackEffect | ''
    if (value) unit.effects = { ...(unit.effects ?? {}), attack: value }
    else {
      const next = { ...(unit.effects ?? {}) }
      delete next.attack
      unit.effects = Object.keys(next).length > 0 ? next : undefined
    }
    markDirty('Updated attack effect')
    renderEditor()
  })

  editorEl.querySelectorAll<HTMLTextAreaElement>('[data-json]').forEach(input => {
    input.addEventListener('change', () => {
      try {
        const value = JSON.parse(input.value) as unknown
        if (input.dataset.json === 'params') unit.params = isRecord(value) ? value as UnitData['params'] : {}
        if (input.dataset.json === 'effects') unit.effects = isRecord(value) ? value as UnitEffects : undefined
        markDirty('Updated JSON field')
        renderEditor()
      } catch {
        setStatus(`Invalid JSON in ${input.dataset.json}`)
      }
    })
  })

  editorEl.querySelector<HTMLButtonElement>('#move-up')?.addEventListener('click', () => moveSelected(-1))
  editorEl.querySelector<HTMLButtonElement>('#move-down')?.addEventListener('click', () => moveSelected(1))
  editorEl.querySelector<HTMLButtonElement>('#delete-unit')?.addEventListener('click', () => {
    if (!confirm(`Delete ${unit.name}? This removes the unit file on save.`)) return
    units = units.filter(item => item !== unit)
    selectedId = units[0]?.id ?? ''
    markDirty(`Deleted ${unit.name}`)
    renderAll()
  })
}

type NumericUnitField = 'cost' | 'tier' | 'hp' | 'speed' | 'attackDamage' | 'attackRange' | 'attackCooldown' | 'radius'

function moveSelected(direction: -1 | 1) {
  const index = units.findIndex(unit => unit.id === selectedId)
  const nextIndex = index + direction
  if (index < 0 || nextIndex < 0 || nextIndex >= units.length) return
  const [unit] = units.splice(index, 1)
  units.splice(nextIndex, 0, unit)
  markDirty('Updated manifest order')
  renderAll()
}

function normalizeUnitsForSave() {
  const used = new Set<string>()
  for (const unit of units) {
    unit.id = uniqueId(slugUnitId(unit.id), used)
    unit.name = unit.name.trim() || unit.id
    unit.description = unit.description.trim()
    unit.color = cssToDataColor(colorToCss(unit.color))
    unit.tags = [...new Set(unit.tags.map(tag => tag.trim()).filter(Boolean))]
    if (unit.effects && Object.keys(unit.effects).length === 0) delete unit.effects
    if (unit.params && Object.keys(unit.params).length === 0) unit.params = {}
  }
  if (!units.some(unit => unit.id === selectedId)) selectedId = units[0]?.id ?? ''
}

function renderPreviewStats() {
  const unit = selectedUnit()
  if (!unit) {
    previewStatsEl.innerHTML = ''
    return
  }
  previewStatsEl.innerHTML = `
    ${stat('HP', unit.hp)}
    ${stat('Damage', unit.attackDamage)}
    ${stat('Range', unit.attackRange)}
    ${stat('Cooldown', `${unit.attackCooldown}s`)}
    ${stat('Speed', unit.speed)}
    ${stat('Radius', unit.radius)}
  `
}

function refreshEditorHeading(unit: UnitData) {
  const heading = editorEl.querySelector<HTMLHeadingElement>('h2')
  const subheading = editorEl.querySelector<HTMLParagraphElement>('p.muted')
  if (heading) heading.textContent = unit.name
  if (subheading) subheading.textContent = `${unit.id}${dirty ? ' | unsaved changes' : ''}`
}

function previewFrame(time: number) {
  const dt = Math.min(0.05, (time - lastPreviewTime) / 1000)
  lastPreviewTime = time
  resizePreviewCanvas()
  updatePreview(dt)
  drawPreview()
  requestAnimationFrame(previewFrame)
}

function updatePreview(dt: number) {
  const unit = selectedUnit()
  if (!unit) return

  const target = { x: 300, y: 176, radius: 38 }
  const dx = target.x - preview.unitX
  const dy = target.y - preview.unitY
  const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))
  const stop = target.radius + Math.max(8, unit.attackRange)

  if (unit.behaviour !== 'stationary_guard' && unit.speed > 0 && dist > stop) {
    const step = Math.min(dist - stop, unit.speed * dt)
    preview.unitX += (dx / dist) * step
    preview.unitY += (dy / dist) * step
  }

  preview.attackTimer -= dt
  if (preview.attackTimer <= 0) {
    preview.attackTimer = Math.max(0.15, unit.attackCooldown)
    addAttackPreview(unit, target.x, target.y)
  }

  for (let i = preview.particles.length - 1; i >= 0; i -= 1) {
    const particle = preview.particles[i]
    particle.age += dt
    if (particle.type === 'projectile') {
      const t = Math.min(1, particle.age / particle.duration)
      particle.x = lerp(particle.startX, particle.targetX, t)
      particle.y = lerp(particle.startY, particle.targetY, t)
      if (t === 1) preview.particles.push({ type: 'pulse', age: 0, duration: 0.25, color: particle.color })
    }
    if (particle.age >= particle.duration) preview.particles.splice(i, 1)
  }
}

function addAttackPreview(unit: UnitData, targetX: number, targetY: number) {
  const color = Number(unit.color)
  const effect = unit.effects?.attack ?? fallbackEffect(unit)
  if (unit.behaviour === 'heal_support') {
    preview.particles.push({ type: 'pulse', age: 0, duration: 0.45, color: 0x7cff9f })
    preview.particles.push({ type: 'float', x: targetX, y: targetY - 28, age: 0, duration: 0.7, text: '+heal' })
    return
  }
  if (unit.behaviour === 'aura_haste') {
    preview.particles.push({ type: 'pulse', age: 0, duration: 0.55, color })
    preview.particles.push({ type: 'float', x: preview.unitX, y: preview.unitY - 24, age: 0, duration: 0.7, text: 'haste' })
    return
  }
  if (effect === 'quick_projectile') {
    preview.particles.push({
      type: 'projectile',
      x: preview.unitX,
      y: preview.unitY,
      startX: preview.unitX,
      startY: preview.unitY,
      targetX,
      targetY,
      age: 0,
      duration: 0.16,
      color,
    })
  } else {
    preview.particles.push({ type: 'slash', age: 0, duration: 0.18, color })
  }
  if (unit.attackDamage > 0) preview.particles.push({ type: 'float', x: targetX, y: targetY - 28, age: 0, duration: 0.7, text: `-${Math.round(unit.attackDamage)}` })
}

function drawPreview() {
  const unit = selectedUnit()
  const width = previewCanvas.clientWidth
  const height = previewCanvas.clientHeight
  previewCtx.clearRect(0, 0, width, height)
  previewCtx.fillStyle = '#070a10'
  previewCtx.fillRect(0, 0, width, height)

  previewCtx.strokeStyle = '#1d2a3f'
  previewCtx.lineWidth = 1
  for (let x = 20; x < width; x += 28) line(x, 0, x, height)
  for (let y = 20; y < height; y += 28) line(0, y, width, y)

  drawDummyTower(300, 176)
  if (!unit) return

  const color = Number(unit.color)
  previewCtx.strokeStyle = toHex(color, 0.16)
  previewCtx.lineWidth = 1
  previewCtx.beginPath()
  previewCtx.arc(preview.unitX, preview.unitY, Math.max(8, unit.attackRange), 0, Math.PI * 2)
  previewCtx.stroke()

  for (const particle of preview.particles) drawParticle(particle, unit)

  previewCtx.fillStyle = toHex(color, 1)
  previewCtx.beginPath()
  previewCtx.arc(preview.unitX, preview.unitY, unit.radius, 0, Math.PI * 2)
  previewCtx.fill()
  previewCtx.strokeStyle = 'rgba(255,255,255,0.45)'
  previewCtx.stroke()
}

function drawDummyTower(x: number, y: number) {
  previewCtx.fillStyle = '#293242'
  previewCtx.beginPath()
  previewCtx.arc(x, y, 38, 0, Math.PI * 2)
  previewCtx.fill()
  previewCtx.strokeStyle = '#6f7d91'
  previewCtx.lineWidth = 2
  previewCtx.stroke()
  previewCtx.fillStyle = '#151a24'
  previewCtx.fillRect(x - 18, y - 24, 36, 48)
  previewCtx.strokeRect(x - 18, y - 24, 36, 48)
}

function drawParticle(particle: PreviewParticle, unit: UnitData) {
  const t = Math.min(1, particle.age / particle.duration)
  const alpha = Math.max(0, 1 - t)
  if (particle.type === 'projectile') {
    previewCtx.fillStyle = toHex(particle.color, alpha)
    previewCtx.beginPath()
    previewCtx.arc(particle.x, particle.y, 4, 0, Math.PI * 2)
    previewCtx.fill()
    return
  }
  if (particle.type === 'slash') {
    const targetX = 300
    const targetY = 176
    previewCtx.strokeStyle = toHex(particle.color, alpha)
    previewCtx.lineWidth = 4
    line(targetX - 24, targetY + 20 - t * 20, targetX + 26, targetY - 18 + t * 18)
    previewCtx.strokeStyle = `rgba(255,255,255,${0.5 * alpha})`
    previewCtx.lineWidth = 1
    line(targetX - 16, targetY + 12 - t * 12, targetX + 18, targetY - 12 + t * 12)
    return
  }
  if (particle.type === 'pulse') {
    const radius = unit.behaviour === 'aura_haste' ? getParam(unit, 'auraRadius', 150) : 28
    const x = unit.behaviour === 'aura_haste' ? preview.unitX : 300
    const y = unit.behaviour === 'aura_haste' ? preview.unitY : 176
    previewCtx.strokeStyle = toHex(particle.color, 0.45 * alpha)
    previewCtx.lineWidth = 2
    previewCtx.beginPath()
    previewCtx.arc(x, y, radius * (0.35 + t * 0.65), 0, Math.PI * 2)
    previewCtx.stroke()
    return
  }
  previewCtx.fillStyle = particle.text.startsWith('+') ? `rgba(124,255,159,${alpha})` : `rgba(255,223,122,${alpha})`
  previewCtx.font = 'bold 13px ui-monospace, SFMono-Regular, Menlo, monospace'
  previewCtx.textAlign = 'center'
  previewCtx.fillText(particle.text, particle.x, particle.y - t * 26)
}

function fallbackEffect(unit: UnitData): UnitAttackEffect {
  if (unit.behaviour === 'ranged_kite' || unit.behaviour === 'stationary_guard' || unit.behaviour === 'aoe_slow') return 'quick_projectile'
  return 'melee_slash'
}

function createPreviewState() {
  return {
    unitX: 92,
    unitY: 176,
    attackTimer: 0.35,
    particles: [] as PreviewParticle[],
  }
}

function selectedUnit(): EditableUnit | null {
  return units.find(unit => unit.id === selectedId) ?? null
}

function makeUniqueUnit(source: UnitData): EditableUnit {
  const used = new Set(units.map(unit => unit.id))
  const unit = cloneUnit(source)
  unit.id = uniqueId(slugUnitId(unit.id), used)
  return unit
}

function cloneUnit(unit: UnitData): EditableUnit {
  return JSON.parse(JSON.stringify(unit)) as EditableUnit
}

function uniqueId(baseId: string, used: Set<string>): string {
  let candidate = baseId || 'unit'
  let index = 2
  while (used.has(candidate)) {
    candidate = `${baseId}_${index}`
    index += 1
  }
  used.add(candidate)
  return candidate
}

function slugUnitId(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'unit'
}

function markDirty(message: string) {
  dirty = true
  setStatus(message)
}

function setStatus(message: string) {
  statusEl.textContent = message
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function option(value: string, selected: string, label = value): string {
  return `<option value="${escapeAttr(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(label)}</option>`
}

function stat(label: string, value: string | number): string {
  return `<div class="stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`
}

function getParam(unit: UnitData, name: string, fallback: number): number {
  return Number(unit.params?.[name] ?? fallback)
}

function line(x1: number, y1: number, x2: number, y2: number) {
  previewCtx.beginPath()
  previewCtx.moveTo(x1, y1)
  previewCtx.lineTo(x2, y2)
  previewCtx.stroke()
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function colorToCss(value: string): string {
  const normalized = value.replace(/^0x/i, '#')
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized : '#ffffff'
}

function cssToDataColor(value: string): string {
  return `0x${value.replace(/^#/, '').toLowerCase()}`
}

function toHex(color: number, alpha: number): string {
  const r = (color >> 16) & 255
  const g = (color >> 8) & 255
  const b = color & 255
  return `rgba(${r},${g},${b},${alpha})`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isUnit(value: EditableUnit | undefined): value is EditableUnit {
  return Boolean(value)
}

function resizePreviewCanvas() {
  const dpr = window.devicePixelRatio || 1
  const rect = previewCanvas.getBoundingClientRect()
  const width = Math.max(1, Math.floor(rect.width * dpr))
  const height = Math.max(1, Math.floor(rect.height * dpr))
  if (previewCanvas.width !== width || previewCanvas.height !== height) {
    previewCanvas.width = width
    previewCanvas.height = height
  }
  previewCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function requireElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing element: ${selector}`)
  return element
}

function requireCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D context is unavailable')
  return context
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function escapeAttr(value: string): string {
  return escapeHtml(value)
}
