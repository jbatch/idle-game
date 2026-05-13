import type {
  TechEdgeLayout,
  TechEffect,
  TechNode,
  TechNodeAnchor,
  TechNodeLayout,
  TechTreeLayoutData,
} from '../../data/types'

type TechTreeFile = { nodes: TechNode[] }
type VisibilityMode = NonNullable<TechNodeLayout['visibleWhen']>
type DragState =
  | { type: 'none' }
  | { type: 'pan', pointerX: number, pointerY: number, startX: number, startY: number }
  | { type: 'nodes', ids: string[], pointerStartX: number, pointerStartY: number, startLayouts: Record<string, { x: number, y: number }> }
  | { type: 'elbow', from: string, to: string }
  | { type: 'marquee', startX: number, startY: number, currentX: number, currentY: number }

const BRANCH_ORDER = ['cursor', 'deployment', 'supply', 'crates', 'tower', 'footsoldier', 'archer', 'shieldbearer', 'healer', 'frost_mage', 'sentinel', 'bard']
const BRANCH_LABELS: Record<string, string> = {
  cursor: 'Cursor',
  deployment: 'Deployment',
  supply: 'Supply',
  crates: 'Crates',
  tower: 'Tower',
  footsoldier: 'Footsoldier',
  archer: 'Archer',
  shieldbearer: 'Shieldbearer',
  healer: 'Healer',
  frost_mage: 'Frost Mage',
  sentinel: 'Sentinel',
  bard: 'Bard',
}

const NODE_W = 180
const NODE_H = 96
const GRID = 40
const RUNTIME_VIEW_W = 900
const RUNTIME_VIEW_H = 756
const RUNTIME_PAD = 28
const ANCHORS: TechNodeAnchor[] = ['left', 'right', 'top', 'bottom']
const VISIBILITY_MODES: VisibilityMode[] = ['always', 'available', 'purchased']

let techTree: TechTreeFile | null = null
let layoutData: TechTreeLayoutData | null = null
let selectedId: string | null = null
let selectedIds = new Set<string>()
let linkSourceId: string | null = null
let dragState: DragState = { type: 'none' }
let panX = 120
let panY = 80
let zoom = 1
let dirtyTech = false
let dirtyLayout = false
let mouseWorld = { x: 0, y: 0 }

const app = requireElement<HTMLDivElement>('#app')
app.innerHTML = `
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      height: 100vh;
      overflow: hidden;
      background: #090a0f;
      color: #dce3ff;
      font: 13px/1.45 Inter, ui-sans-serif, system-ui, sans-serif;
    }
    #app { height: 100vh; }
    .shell { display: grid; grid-template-rows: 48px 1fr; height: 100vh; }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 14px;
      border-bottom: 1px solid #27304a;
      background: #10121c;
    }
    .toolbar h1 { margin: 0 10px 0 0; font-size: 15px; letter-spacing: 0; white-space: nowrap; }
    .toolbar a, .toolbar button {
      height: 30px;
      border: 1px solid #34405f;
      border-radius: 6px;
      background: #171b2a;
      color: #eef2ff;
      padding: 0 10px;
      font: inherit;
      text-decoration: none;
      cursor: pointer;
    }
    .toolbar a:hover, .toolbar button:hover { border-color: #6686d8; }
    .toolbar button.primary { background: #24406e; border-color: #557fca; }
    .status {
      margin-left: auto;
      color: #94a1c8;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace { display: grid; grid-template-columns: 1fr 360px; min-height: 0; }
    .canvas-wrap { min-width: 0; min-height: 0; background: #0b0d14; }
    canvas { display: block; width: 100%; height: 100%; cursor: grab; }
    canvas.dragging { cursor: grabbing; }
    .panel {
      min-height: 0;
      overflow: auto;
      border-left: 1px solid #27304a;
      background: #10121c;
      padding: 16px;
    }
    .panel h2 { margin: 0 0 12px; font-size: 16px; letter-spacing: 0; }
    .panel h3 {
      margin: 18px 0 8px;
      font-size: 12px;
      color: #9ea9d0;
      text-transform: uppercase;
      letter-spacing: 0;
    }
    .muted { color: #8b94b7; }
    label { display: grid; gap: 5px; margin: 10px 0; color: #aab4d6; }
    input, select, textarea {
      width: 100%;
      border: 1px solid #303a59;
      border-radius: 6px;
      background: #0b0d14;
      color: #eef2ff;
      padding: 8px;
      font: inherit;
    }
    textarea { min-height: 78px; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
    .panel button {
      border: 1px solid #34405f;
      border-radius: 6px;
      background: #171b2a;
      color: #eef2ff;
      padding: 8px 10px;
      font: inherit;
      cursor: pointer;
    }
    .panel button:hover { border-color: #6686d8; }
    .dep, .edge {
      display: grid;
      gap: 8px;
      padding: 10px;
      margin: 8px 0;
      border: 1px solid #2a3450;
      border-radius: 6px;
      background: #151928;
    }
    .dep-row { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 8px; }
    .dep-row span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  </style>
  <div class="shell">
    <header class="toolbar">
      <h1>Tech Tree Editor</h1>
      <a href="/tools/">Tools</a>
      <button id="fit-view" type="button">Fit</button>
      <button id="save-tree" class="primary" type="button">Save config</button>
      <div id="status" class="status">Loading tech tree...</div>
    </header>
    <main class="workspace">
      <div class="canvas-wrap"><canvas id="tree-canvas"></canvas></div>
      <aside id="panel" class="panel"></aside>
    </main>
  </div>
`

const canvas = requireElement<HTMLCanvasElement>('#tree-canvas')
const panel = requireElement<HTMLDivElement>('#panel')
const statusEl = requireElement<HTMLDivElement>('#status')
const saveBtn = requireElement<HTMLButtonElement>('#save-tree')
const fitBtn = requireElement<HTMLButtonElement>('#fit-view')
const ctx = requireCanvasContext(canvas)

void loadConfigs()

window.addEventListener('resize', () => {
  resizeCanvas()
  render()
})

canvas.addEventListener('contextmenu', event => event.preventDefault())
canvas.addEventListener('pointerdown', event => {
  if (!techTree || !layoutData) return
  canvas.setPointerCapture(event.pointerId)
  const world = eventToWorld(event)
  mouseWorld = world

  const elbow = hitElbow(world.x, world.y)
  const hit = hitNode(world.x, world.y)

  if (event.button === 1) {
    dragState = { type: 'pan', pointerX: event.clientX, pointerY: event.clientY, startX: panX, startY: panY }
    canvas.classList.add('dragging')
    render()
    return
  }

  if (!hit && !elbow && event.button === 0) {
    linkSourceId = null
    dragState = { type: 'marquee', startX: world.x, startY: world.y, currentX: world.x, currentY: world.y }
    selectedId = null
    selectedIds = new Set()
    canvas.classList.add('dragging')
    renderPanel()
    render()
    return
  }

  if (elbow && event.button === 0) {
    selectedId = elbow.to
    dragState = { type: 'elbow', from: elbow.from, to: elbow.to }
    renderPanel()
    render()
    return
  }

  if (!hit || event.button !== 0) return

  if (linkSourceId) {
    if (hit.id !== linkSourceId) addDependency(linkSourceId, hit.id)
    linkSourceId = null
    selectedId = hit.id
    selectedIds = new Set([hit.id])
    renderPanel()
    render()
    return
  }

  if (event.shiftKey) {
    if (selectedIds.has(hit.id)) selectedIds.delete(hit.id)
    else selectedIds.add(hit.id)
    if (selectedIds.size === 0) selectedIds.add(hit.id)
  } else if (!selectedIds.has(hit.id)) {
    selectedIds = new Set([hit.id])
  }

  selectedId = hit.id
  const dragIds = selectedIds.has(hit.id) ? [...selectedIds] : [hit.id]
  dragState = {
    type: 'nodes',
    ids: dragIds,
    pointerStartX: world.x,
    pointerStartY: world.y,
    startLayouts: Object.fromEntries(dragIds.map(id => {
      const layout = ensureLayout(id)
      return [id, { x: layout.x, y: layout.y }]
    })),
  }
  renderPanel()
  render()
})

canvas.addEventListener('pointermove', event => {
  if (!techTree || !layoutData) return
  const world = eventToWorld(event)
  mouseWorld = world

  if (dragState.type === 'pan') {
    panX = dragState.startX + event.clientX - dragState.pointerX
    panY = dragState.startY + event.clientY - dragState.pointerY
    render()
    return
  }

  if (dragState.type === 'nodes') {
    const dx = world.x - dragState.pointerStartX
    const dy = world.y - dragState.pointerStartY
    for (const id of dragState.ids) {
      const layout = ensureLayout(id)
      const start = dragState.startLayouts[id]
      if (!start) continue
      layout.x = snap(start.x + dx)
      layout.y = snap(start.y + dy)
    }
    markLayoutDirty()
    render()
    return
  }

  if (dragState.type === 'elbow') {
    const edge = ensureEdge(dragState.from, dragState.to)
    edge.elbow = { x: snap(world.x), y: snap(world.y) }
    markLayoutDirty()
    renderPanel()
    render()
    return
  }

  if (dragState.type === 'marquee') {
    dragState.currentX = world.x
    dragState.currentY = world.y
    render()
    return
  }

  if (linkSourceId) render()
})

canvas.addEventListener('pointerup', () => stopDragging())
canvas.addEventListener('pointercancel', () => stopDragging())

canvas.addEventListener('wheel', event => {
  if (!techTree) return
  event.preventDefault()
  const before = eventToWorld(event)
  const nextZoom = clamp(zoom * (event.deltaY < 0 ? 1.08 : 0.92), 0.35, 2.4)
  const rect = canvas.getBoundingClientRect()
  zoom = nextZoom
  panX = event.clientX - rect.left - before.x * zoom
  panY = event.clientY - rect.top - before.y * zoom
  render()
}, { passive: false })

saveBtn.addEventListener('click', () => void saveConfigs())
fitBtn.addEventListener('click', () => {
  fitView()
  render()
})

async function loadConfigs() {
  const [techResponse, layoutResponse] = await Promise.all([
    fetch('/data/tech_tree.json'),
    fetch('/data/tech_tree_layout.json'),
  ])
  techTree = await techResponse.json() as TechTreeFile
  layoutData = await layoutResponse.json() as TechTreeLayoutData
  ensureAllLayouts()
  ensureEdgesForRequires()
  selectedId = techTree.nodes[0]?.id ?? null
  selectedIds = selectedId ? new Set([selectedId]) : new Set()
  resizeCanvas()
  fitView()
  renderPanel()
  render()
  setStatus('Definitions save to tech_tree.json; placement and traces save to tech_tree_layout.json.')
}

async function saveConfigs() {
  if (!techTree || !layoutData) return
  setStatus('Saving tech_tree.json and tech_tree_layout.json...')
  saveBtn.disabled = true
  try {
    normalizeForSave()
    const response = await fetch('/__tech-tree-editor/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ techTree, layout: layoutData }),
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null
      throw new Error(payload?.error ?? 'Save failed')
    }
    dirtyTech = false
    dirtyLayout = false
    setStatus('Saved both config files')
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Save failed')
  } finally {
    saveBtn.disabled = false
    renderPanel()
  }
}

function renderPanel() {
  const node = selectedId ? nodeById(selectedId) : null
  if (!node) {
    panel.innerHTML = `
      <h2>No node selected</h2>
      <p class="muted">Click a node to edit tech data, placement, dependencies, and trace routing.</p>
    `
    return
  }

  const layout = ensureLayout(node.id)
  const candidates = (techTree?.nodes ?? []).filter(other => other.id !== node.id && !node.requires.includes(other.id))
  const status = [
    dirtyTech ? 'tech_tree.json changed' : 'tech_tree.json clean',
    dirtyLayout ? 'tech_tree_layout.json changed' : 'tech_tree_layout.json clean',
  ].join(' | ')

  panel.innerHTML = `
    <h2>${escapeHtml(node.name)}</h2>
    <p class="muted">${escapeHtml(node.id)}</p>

    <h3>Tech Definition</h3>
    <label>ID <input data-tech="id" value="${escapeAttr(node.id)}" /></label>
    <label>Name <input data-tech="name" value="${escapeAttr(node.name)}" /></label>
    <label>Description <textarea data-tech="description">${escapeHtml(node.description)}</textarea></label>
    <div class="grid2">
      <label>Cost <input data-tech="cost" type="number" step="1" value="${node.cost}" /></label>
      <label>Branch <select data-tech="branch">${branchOptions(node.branch)}</select></label>
    </div>
    <label>Repeatable JSON <textarea data-json="repeatable">${escapeHtml(formatJson(node.repeatable ?? null))}</textarea></label>
    <label>Effect JSON <textarea data-json="effect">${escapeHtml(formatJson(node.effect))}</textarea></label>
    <label>Quest requirement <input data-tech="questRequirement" value="${escapeAttr(node.questRequirement ?? '')}" /></label>
    <label>Quest requirements JSON <textarea data-json="questRequirements">${escapeHtml(formatJson(node.questRequirements ?? []))}</textarea></label>

    <h3>Placement</h3>
    <div class="grid3">
      <label>X <input data-layout="x" type="number" step="10" value="${Math.round(layout.x)}" /></label>
      <label>Y <input data-layout="y" type="number" step="10" value="${Math.round(layout.y)}" /></label>
      <label>Visible <select data-layout="visibleWhen">${visibilityOptions(layout.visibleWhen ?? 'always')}</select></label>
    </div>

    <h3>Dependencies</h3>
    ${node.requires.map(requiredId => depRow(node.id, requiredId)).join('') || '<p class="muted">No dependencies yet.</p>'}
    <label>
      Add dependency
      <select id="add-dependency">
        <option value="">Choose a required node...</option>
        ${candidates.map(candidate => `<option value="${escapeAttr(candidate.id)}">${escapeHtml(candidate.name)}</option>`).join('')}
      </select>
    </label>
    <div class="actions">
      <button id="link-from-selected" type="button">${linkSourceId === node.id ? 'Cancel drawing' : 'Draw dependency from this'}</button>
    </div>

    <h3>Status</h3>
    <p class="muted">${escapeHtml(status)}</p>
  `

  panel.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-tech]').forEach(input => {
    input.addEventListener('input', () => {
      const field = input.dataset.tech
      if (field === 'id') renameNode(node.id, input.value.trim())
      if (field === 'name') node.name = input.value
      if (field === 'description') node.description = input.value
      if (field === 'cost') node.cost = Number(input.value) || 0
      if (field === 'branch') node.branch = input.value
      if (field === 'questRequirement') {
        if (input.value.trim()) node.questRequirement = input.value.trim()
        else delete node.questRequirement
      }
      markTechDirty()
      render()
    })
  })

  panel.querySelectorAll<HTMLTextAreaElement>('[data-json]').forEach(input => {
    input.addEventListener('change', () => {
      const field = input.dataset.json
      try {
        const value = JSON.parse(input.value) as unknown
        if (field === 'repeatable') {
          if (value === null) delete node.repeatable
          else node.repeatable = value as TechNode['repeatable']
        }
        if (field === 'effect') node.effect = value as TechEffect | TechEffect[]
        if (field === 'questRequirements') node.questRequirements = Array.isArray(value) ? value as string[] : []
        markTechDirty()
        setStatus('Updated JSON field')
      } catch {
        setStatus(`Invalid JSON in ${field}`)
      }
      renderPanel()
      render()
    })
  })

  panel.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-layout]').forEach(input => {
    input.addEventListener('input', () => {
      const field = input.dataset.layout
      if (field === 'x') layout.x = snap(Number(input.value) || 0)
      if (field === 'y') layout.y = snap(Number(input.value) || 0)
      if (field === 'visibleWhen') layout.visibleWhen = input.value as VisibilityMode
      markLayoutDirty()
      render()
    })
  })

  panel.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach(button => {
    button.addEventListener('click', () => {
      const requiredId = button.dataset.remove
      if (!requiredId) return
      removeDependency(requiredId, node.id)
      renderPanel()
      render()
    })
  })

  panel.querySelectorAll<HTMLSelectElement>('[data-edge]').forEach(input => {
    input.addEventListener('input', () => {
      const [field, from, to] = input.dataset.edge?.split('|') ?? []
      if (!field || !from || !to) return
      const edge = ensureEdge(from, to)
      if (field === 'fromAnchor') edge.fromAnchor = input.value as TechNodeAnchor
      if (field === 'toAnchor') edge.toAnchor = input.value as TechNodeAnchor
      markLayoutDirty()
      render()
    })
  })

  panel.querySelectorAll<HTMLInputElement>('[data-elbow]').forEach(input => {
    input.addEventListener('input', () => {
      const [field, from, to] = input.dataset.elbow?.split('|') ?? []
      if (!field || !from || !to) return
      const edge = ensureEdge(from, to)
      edge.elbow ??= defaultElbow(from, to)
      edge.elbow[field === 'x' ? 'x' : 'y'] = snap(Number(input.value) || 0)
      markLayoutDirty()
      render()
    })
  })

  panel.querySelectorAll<HTMLButtonElement>('[data-add-elbow]').forEach(button => {
    button.addEventListener('click', () => {
      const [from, to] = button.dataset.addElbow?.split('|') ?? []
      if (!from || !to) return
      ensureEdge(from, to).elbow = defaultElbow(from, to)
      markLayoutDirty()
      renderPanel()
      render()
    })
  })

  panel.querySelectorAll<HTMLButtonElement>('[data-clear-elbow]').forEach(button => {
    button.addEventListener('click', () => {
      const [from, to] = button.dataset.clearElbow?.split('|') ?? []
      if (!from || !to) return
      delete ensureEdge(from, to).elbow
      markLayoutDirty()
      renderPanel()
      render()
    })
  })

  panel.querySelector<HTMLSelectElement>('#add-dependency')?.addEventListener('change', event => {
    const target = event.currentTarget
    if (!(target instanceof HTMLSelectElement) || !target.value) return
    addDependency(target.value, node.id)
    renderPanel()
    render()
  })

  panel.querySelector<HTMLButtonElement>('#link-from-selected')?.addEventListener('click', () => {
    linkSourceId = linkSourceId === node.id ? null : node.id
    renderPanel()
    render()
  })
}

function render() {
  if (!techTree || !layoutData) return
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  ctx.clearRect(0, 0, width, height)
  drawHiddenRegions(width, height)
  drawGrid(width, height)
  drawRuntimeBounds()
  drawDependencies()
  drawLinkPreview()
  for (const node of techTree.nodes) drawNode(node)
  drawMarquee()
}

function drawHiddenRegions(width: number, height: number) {
  const bounds = runtimeBounds()
  const topLeft = worldToScreen(bounds.minX, bounds.minY)
  const bottomRight = worldToScreen(bounds.maxX, bounds.maxY)
  ctx.save()
  ctx.fillStyle = 'rgba(80, 20, 34, 0.24)'
  ctx.fillRect(0, 0, width, Math.max(0, topLeft.y))
  ctx.fillRect(0, bottomRight.y, width, Math.max(0, height - bottomRight.y))
  ctx.fillRect(0, topLeft.y, Math.max(0, topLeft.x), Math.max(0, bottomRight.y - topLeft.y))
  ctx.fillRect(bottomRight.x, topLeft.y, Math.max(0, width - bottomRight.x), Math.max(0, bottomRight.y - topLeft.y))
  ctx.restore()
}

function drawRuntimeBounds() {
  const bounds = runtimeBounds()
  const topLeft = worldToScreen(bounds.minX, bounds.minY)
  const bottomRight = worldToScreen(bounds.maxX, bounds.maxY)
  ctx.save()
  ctx.strokeStyle = '#6d4d5f'
  ctx.lineWidth = 1.5
  ctx.setLineDash([8, 8])
  ctx.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y)
  ctx.setLineDash([])
  ctx.fillStyle = '#8a6c7c'
  ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText('runtime reachable content bounds', topLeft.x + 10, topLeft.y + 18)
  ctx.restore()
}

function drawGrid(width: number, height: number) {
  const left = screenToWorld(0, 0).x
  const top = screenToWorld(0, 0).y
  const right = screenToWorld(width, height).x
  const bottom = screenToWorld(width, height).y

  ctx.lineWidth = 1
  ctx.strokeStyle = '#151a2a'
  ctx.beginPath()
  for (let x = Math.floor(left / GRID) * GRID; x < right; x += GRID) {
    const sx = worldToScreen(x, 0).x
    ctx.moveTo(sx, 0)
    ctx.lineTo(sx, height)
  }
  for (let y = Math.floor(top / GRID) * GRID; y < bottom; y += GRID) {
    const sy = worldToScreen(0, y).y
    ctx.moveTo(0, sy)
    ctx.lineTo(width, sy)
  }
  ctx.stroke()
}

function drawDependencies() {
  if (!techTree) return
  for (const node of techTree.nodes) {
    for (const requiredId of node.requires) {
      const required = nodeById(requiredId)
      if (!required) continue
      const edge = ensureEdge(requiredId, node.id)
      const selected = selectedId === node.id || selectedId === required.id
      drawEdge(edge, selected)
    }
  }
}

function drawEdge(edge: TechEdgeLayout, selected: boolean) {
  const points = edgePath(edge)
  if (points.length < 2) return

  ctx.strokeStyle = selected ? '#74d7a6' : '#2b3658'
  ctx.lineWidth = selected ? 2.5 : 1.5
  ctx.beginPath()
  points.forEach((point, index) => {
    const screen = worldToScreen(point.x, point.y)
    if (index === 0) ctx.moveTo(screen.x, screen.y)
    else ctx.lineTo(screen.x, screen.y)
  })
  ctx.stroke()

  const end = worldToScreen(points[points.length - 1].x, points[points.length - 1].y)
  ctx.fillStyle = ctx.strokeStyle
  ctx.beginPath()
  ctx.arc(end.x, end.y, 4, 0, Math.PI * 2)
  ctx.fill()

  if (selected && edge.elbow) {
    const elbow = worldToScreen(edge.elbow.x, edge.elbow.y)
    ctx.fillStyle = '#f3c66a'
    ctx.fillRect(elbow.x - 5, elbow.y - 5, 10, 10)
  }
}

function drawLinkPreview() {
  if (!linkSourceId) return
  const source = nodeById(linkSourceId)
  if (!source) return
  const sourceLayout = ensureLayout(source.id)
  const start = worldToScreen(sourceLayout.x + NODE_W, sourceLayout.y + NODE_H / 2)
  const end = worldToScreen(mouseWorld.x, mouseWorld.y)
  ctx.strokeStyle = '#f3c66a'
  ctx.lineWidth = 2
  ctx.setLineDash([8, 6])
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(end.x, end.y)
  ctx.stroke()
  ctx.setLineDash([])
}

function drawNode(node: TechNode) {
  const layout = ensureLayout(node.id)
  const pos = worldToScreen(layout.x, layout.y)
  const w = NODE_W * zoom
  const h = NODE_H * zoom
  const selected = selectedIds.has(node.id)
  const primary = node.id === selectedId
  const color = branchColor(node.branch)

  ctx.fillStyle = selected ? '#18243b' : '#111724'
  ctx.strokeStyle = primary ? '#f3c66a' : selected ? '#74d7a6' : color
  ctx.lineWidth = primary ? 3 : selected ? 2.5 : 1.5
  roundRect(pos.x, pos.y, w, h, 7)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = color
  ctx.fillRect(pos.x, pos.y, w, 5)
  ctx.fillStyle = '#eef2ff'
  drawText(node.name, pos.x + 10 * zoom, pos.y + 22 * zoom, (NODE_W - 20) * zoom, 13 * zoom, true)
  ctx.fillStyle = '#9aa7cc'
  drawText(node.description, pos.x + 10 * zoom, pos.y + 44 * zoom, (NODE_W - 20) * zoom, 10 * zoom, false, 2)
  ctx.fillStyle = '#657096'
  drawText(`${BRANCH_LABELS[node.branch] ?? node.branch} | ${layout.visibleWhen ?? 'always'}`, pos.x + 10 * zoom, pos.y + 84 * zoom, (NODE_W - 20) * zoom, 9 * zoom)
}

function drawMarquee() {
  if (dragState.type !== 'marquee') return
  const rect = normalizedRect(dragState.startX, dragState.startY, dragState.currentX, dragState.currentY)
  const topLeft = worldToScreen(rect.left, rect.top)
  const bottomRight = worldToScreen(rect.right, rect.bottom)
  ctx.save()
  ctx.fillStyle = 'rgba(116, 215, 166, 0.10)'
  ctx.strokeStyle = '#74d7a6'
  ctx.lineWidth = 1.5
  ctx.setLineDash([6, 5])
  ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y)
  ctx.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y)
  ctx.restore()
}

function depRow(targetId: string, requiredId: string): string {
  const edge = ensureEdge(requiredId, targetId)
  return `
    <div class="dep">
      <div class="dep-row">
        <span>${escapeHtml(nodeLabel(requiredId))}</span>
        <button type="button" data-remove="${escapeAttr(requiredId)}">Remove</button>
      </div>
      <div class="grid2">
        <label>From <select data-edge="fromAnchor|${escapeAttr(requiredId)}|${escapeAttr(targetId)}">${anchorOptions(edge.fromAnchor ?? 'right')}</select></label>
        <label>To <select data-edge="toAnchor|${escapeAttr(requiredId)}|${escapeAttr(targetId)}">${anchorOptions(edge.toAnchor ?? 'left')}</select></label>
      </div>
      <div class="grid2">
        <label>Elbow X <input data-elbow="x|${escapeAttr(requiredId)}|${escapeAttr(targetId)}" type="number" step="10" value="${edge.elbow?.x ?? ''}" /></label>
        <label>Elbow Y <input data-elbow="y|${escapeAttr(requiredId)}|${escapeAttr(targetId)}" type="number" step="10" value="${edge.elbow?.y ?? ''}" /></label>
      </div>
      <div class="actions">
        <button type="button" data-add-elbow="${escapeAttr(requiredId)}|${escapeAttr(targetId)}">Add 90 turn</button>
        <button type="button" data-clear-elbow="${escapeAttr(requiredId)}|${escapeAttr(targetId)}">Clear turn</button>
      </div>
    </div>
  `
}

function addDependency(requiredId: string, targetId: string) {
  const target = nodeById(targetId)
  if (!target || target.requires.includes(requiredId)) return
  if (wouldCreateCycle(requiredId, targetId)) {
    setStatus('That dependency would create a cycle.')
    return
  }
  target.requires = [...target.requires, requiredId]
  ensureEdge(requiredId, targetId)
  markTechDirty()
  markLayoutDirty()
  setStatus(`${nodeLabel(requiredId)} now unlocks ${nodeLabel(targetId)}`)
}

function removeDependency(requiredId: string, targetId: string) {
  const target = nodeById(targetId)
  if (!target || !layoutData) return
  target.requires = target.requires.filter(id => id !== requiredId)
  layoutData.edges = layoutData.edges.filter(edge => edge.from !== requiredId || edge.to !== targetId)
  markTechDirty()
  markLayoutDirty()
}

function renameNode(oldId: string, newId: string) {
  if (!newId || oldId === newId || nodeById(newId)) return
  const node = nodeById(oldId)
  if (!node || !techTree || !layoutData) return
  node.id = newId
  for (const other of techTree.nodes) {
    other.requires = other.requires.map(id => id === oldId ? newId : id)
  }
  const layout = ensureLayout(oldId)
  layout.id = newId
  for (const edge of layoutData.edges) {
    if (edge.from === oldId) edge.from = newId
    if (edge.to === oldId) edge.to = newId
  }
  if (selectedIds.has(oldId)) {
    selectedIds.delete(oldId)
    selectedIds.add(newId)
  }
  selectedId = newId
  markTechDirty()
  markLayoutDirty()
  renderPanel()
}

function wouldCreateCycle(requiredId: string, targetId: string): boolean {
  if (requiredId === targetId) return true
  const seen = new Set<string>()
  const visit = (id: string): boolean => {
    if (id === targetId) return true
    if (seen.has(id)) return false
    seen.add(id)
    const node = nodeById(id)
    return Boolean(node?.requires.some(visit))
  }
  return visit(requiredId)
}

function ensureAllLayouts() {
  if (!techTree || !layoutData) return
  const branchCounts = new Map<string, number>()
  for (const node of techTree.nodes) {
    if (layoutData.nodes.some(layout => layout.id === node.id)) continue
    const branchIndex = Math.max(0, BRANCH_ORDER.indexOf(node.branch))
    const branchCount = branchCounts.get(node.branch) ?? 0
    branchCounts.set(node.branch, branchCount + 1)
    layoutData.nodes.push({
      id: node.id,
      x: 80 + branchCount * 230,
      y: 80 + branchIndex * 140,
      visibleWhen: 'always',
    })
  }
}

function ensureEdgesForRequires() {
  if (!techTree) return
  for (const node of techTree.nodes) {
    for (const requiredId of node.requires) ensureEdge(requiredId, node.id)
  }
}

function ensureLayout(id: string): TechNodeLayout {
  if (!layoutData) throw new Error('Layout data is not loaded')
  let layout = layoutData.nodes.find(item => item.id === id)
  if (!layout) {
    layout = { id, x: 80, y: 80, visibleWhen: 'always' }
    layoutData.nodes.push(layout)
  }
  layout.visibleWhen ??= 'always'
  return layout
}

function ensureEdge(from: string, to: string): TechEdgeLayout {
  if (!layoutData) throw new Error('Layout data is not loaded')
  let edge = layoutData.edges.find(item => item.from === from && item.to === to)
  if (!edge) {
    edge = { from, to, fromAnchor: 'right', toAnchor: 'left' }
    layoutData.edges.push(edge)
  }
  edge.fromAnchor ??= 'right'
  edge.toAnchor ??= 'left'
  return edge
}

function defaultElbow(from: string, to: string): { x: number, y: number } {
  const fromLayout = ensureLayout(from)
  const toLayout = ensureLayout(to)
  return {
    x: snap((fromLayout.x + NODE_W + toLayout.x) / 2),
    y: snap((fromLayout.y + NODE_H / 2 + toLayout.y + NODE_H / 2) / 2),
  }
}

function edgePath(edge: TechEdgeLayout): Array<{ x: number, y: number }> {
  const fromLayout = ensureLayout(edge.from)
  const toLayout = ensureLayout(edge.to)
  const fromAnchor = edge.fromAnchor ?? 'right'
  const toAnchor = edge.toAnchor ?? 'left'
  const start = anchorPoint(fromLayout, fromAnchor)
  const end = anchorPoint(toLayout, toAnchor)
  if (!edge.elbow) return [start, end]
  const fromHorizontal = fromAnchor === 'left' || fromAnchor === 'right'
  const toHorizontal = toAnchor === 'left' || toAnchor === 'right'
  const first = fromHorizontal ? { x: edge.elbow.x, y: start.y } : { x: start.x, y: edge.elbow.y }
  const last = toHorizontal ? { x: edge.elbow.x, y: end.y } : { x: end.x, y: edge.elbow.y }
  return removeDuplicatePoints([start, first, edge.elbow, last, end])
}

function anchorPoint(layout: TechNodeLayout, anchor: TechNodeAnchor): { x: number, y: number } {
  if (anchor === 'left') return { x: layout.x, y: layout.y + NODE_H / 2 }
  if (anchor === 'right') return { x: layout.x + NODE_W, y: layout.y + NODE_H / 2 }
  if (anchor === 'top') return { x: layout.x + NODE_W / 2, y: layout.y }
  return { x: layout.x + NODE_W / 2, y: layout.y + NODE_H }
}

function removeDuplicatePoints(points: Array<{ x: number, y: number }>): Array<{ x: number, y: number }> {
  return points.filter((point, index) => {
    const previous = points[index - 1]
    return !previous || previous.x !== point.x || previous.y !== point.y
  })
}

function normalizeForSave() {
  if (!techTree || !layoutData) return
  for (const node of techTree.nodes) {
    node.requires = [...new Set(node.requires)].filter(id => id !== node.id)
    const layout = ensureLayout(node.id)
    layout.x = Math.round(layout.x)
    layout.y = Math.round(layout.y)
    layout.visibleWhen ??= 'always'
  }
  layoutData.nodes = techTree.nodes.map(node => ensureLayout(node.id))
  layoutData.edges = layoutData.edges
    .filter(edge => nodeById(edge.from) && nodeById(edge.to) && nodeById(edge.to)?.requires.includes(edge.from))
    .map(edge => ({
      ...edge,
      elbow: edge.elbow ? { x: Math.round(edge.elbow.x), y: Math.round(edge.elbow.y) } : undefined,
    }))
}

function runtimeBounds(): { minX: number, minY: number, maxX: number, maxY: number } {
  if (!layoutData) return { minX: 0, minY: 0, maxX: RUNTIME_VIEW_W, maxY: RUNTIME_VIEW_H }
  let maxX = RUNTIME_VIEW_W
  let maxY = RUNTIME_VIEW_H
  for (const layout of layoutData.nodes) {
    maxX = Math.max(maxX, layout.x + NODE_W + RUNTIME_PAD)
    maxY = Math.max(maxY, layout.y + NODE_H + RUNTIME_PAD)
  }
  for (const edge of layoutData.edges) {
    if (edge.elbow) {
      maxX = Math.max(maxX, edge.elbow.x + RUNTIME_PAD)
      maxY = Math.max(maxY, edge.elbow.y + RUNTIME_PAD)
    }
  }
  return { minX: 0, minY: 0, maxX, maxY }
}

function fitView() {
  if (!layoutData || layoutData.nodes.length === 0) return
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const layout of layoutData.nodes) {
    minX = Math.min(minX, layout.x)
    minY = Math.min(minY, layout.y)
    maxX = Math.max(maxX, layout.x + NODE_W)
    maxY = Math.max(maxY, layout.y + NODE_H)
  }
  const pad = 80
  zoom = clamp(Math.min(
    (canvas.clientWidth - pad) / Math.max(1, maxX - minX),
    (canvas.clientHeight - pad) / Math.max(1, maxY - minY),
    1.15,
  ), 0.35, 1.15)
  panX = (canvas.clientWidth - (maxX - minX) * zoom) / 2 - minX * zoom
  panY = (canvas.clientHeight - (maxY - minY) * zoom) / 2 - minY * zoom
}

function hitNode(x: number, y: number): TechNode | null {
  if (!techTree) return null
  for (let i = techTree.nodes.length - 1; i >= 0; i -= 1) {
    const node = techTree.nodes[i]
    const layout = ensureLayout(node.id)
    if (x >= layout.x && x <= layout.x + NODE_W && y >= layout.y && y <= layout.y + NODE_H) return node
  }
  return null
}

function hitElbow(x: number, y: number): TechEdgeLayout | null {
  if (!layoutData) return null
  for (const edge of layoutData.edges) {
    if (!edge.elbow) continue
    if (Math.abs(x - edge.elbow.x) <= 10 && Math.abs(y - edge.elbow.y) <= 10) return edge
  }
  return null
}

function nodeById(id: string): TechNode | null {
  return techTree?.nodes.find(node => node.id === id) ?? null
}

function eventToWorld(event: MouseEvent): { x: number, y: number } {
  const rect = canvas.getBoundingClientRect()
  return screenToWorld(event.clientX - rect.left, event.clientY - rect.top)
}

function screenToWorld(x: number, y: number): { x: number, y: number } {
  return { x: (x - panX) / zoom, y: (y - panY) / zoom }
}

function worldToScreen(x: number, y: number): { x: number, y: number } {
  return { x: x * zoom + panX, y: y * zoom + panY }
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = Math.max(1, Math.floor(rect.width * dpr))
  canvas.height = Math.max(1, Math.floor(rect.height * dpr))
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function stopDragging() {
  if (dragState.type === 'marquee') {
    applyMarqueeSelection(dragState)
  } else if (dragState.type === 'nodes') {
    renderPanel()
  }

  dragState = { type: 'none' }
  canvas.classList.remove('dragging')
  render()
}

function applyMarqueeSelection(selection: Extract<DragState, { type: 'marquee' }>) {
  if (!techTree) return
  const rect = normalizedRect(selection.startX, selection.startY, selection.currentX, selection.currentY)
  const ids = techTree.nodes
    .filter(node => rectsIntersect(rect, nodeRect(node.id)))
    .map(node => node.id)

  selectedIds = new Set(ids)
  selectedId = ids[0] ?? null
  renderPanel()
  setStatus(ids.length > 0 ? `Selected ${ids.length} node${ids.length === 1 ? '' : 's'}` : 'Selection cleared')
}

function normalizedRect(x1: number, y1: number, x2: number, y2: number): { left: number, top: number, right: number, bottom: number } {
  return {
    left: Math.min(x1, x2),
    top: Math.min(y1, y2),
    right: Math.max(x1, x2),
    bottom: Math.max(y1, y2),
  }
}

function nodeRect(id: string): { left: number, top: number, right: number, bottom: number } {
  const layout = ensureLayout(id)
  return {
    left: layout.x,
    top: layout.y,
    right: layout.x + NODE_W,
    bottom: layout.y + NODE_H,
  }
}

function rectsIntersect(
  a: { left: number, top: number, right: number, bottom: number },
  b: { left: number, top: number, right: number, bottom: number },
): boolean {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top
}

function branchOptions(current: string): string {
  const branches = [...new Set([...BRANCH_ORDER, ...(techTree?.nodes.map(node => node.branch) ?? [])])]
  return branches.map(branch => `<option value="${escapeAttr(branch)}" ${branch === current ? 'selected' : ''}>${escapeHtml(BRANCH_LABELS[branch] ?? branch)}</option>`).join('')
}

function visibilityOptions(current: VisibilityMode): string {
  return VISIBILITY_MODES.map(mode => `<option value="${mode}" ${mode === current ? 'selected' : ''}>${mode}</option>`).join('')
}

function anchorOptions(current: TechNodeAnchor): string {
  return ANCHORS.map(anchor => `<option value="${anchor}" ${anchor === current ? 'selected' : ''}>${anchor}</option>`).join('')
}

function nodeLabel(id: string): string {
  const node = nodeById(id)
  return node ? node.name : id
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function drawText(text: string, x: number, y: number, width: number, size: number, bold = false, maxLines = 1) {
  ctx.font = `${bold ? '700 ' : ''}${Math.max(8, size)}px ui-monospace, SFMono-Regular, Menlo, monospace`
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= width || !line) line = next
    else {
      lines.push(line)
      line = word
      if (lines.length >= maxLines) break
    }
  }
  if (line && lines.length < maxLines) lines.push(line)
  lines.forEach((lineText, index) => ctx.fillText(lineText, x, y + index * size * 1.25))
}

function roundRect(x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function branchColor(branch: string): string {
  const colors = ['#6fb7ff', '#8bd77b', '#f3c66a', '#72d6a3', '#d88f6b', '#c9a4ff', '#ff9cc8', '#73d4c6', '#d9e878', '#8fa1ff', '#ffb07a', '#a6e6ff']
  const index = Math.max(0, BRANCH_ORDER.indexOf(branch))
  return colors[index % colors.length]
}

function markTechDirty() {
  dirtyTech = true
  setStatus('Unsaved tech definition changes')
}

function markLayoutDirty() {
  dirtyLayout = true
  setStatus('Unsaved layout changes')
}

function setStatus(text: string) {
  statusEl.textContent = text
}

function snap(value: number): number {
  return Math.round(value / 10) * 10
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char] ?? char))
}

function escapeAttr(value: string): string {
  return escapeHtml(value)
}

function requireElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing ${selector}`)
  return element
}

function requireCanvasContext(element: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = element.getContext('2d')
  if (!context) throw new Error('Unable to create canvas context')
  return context
}
