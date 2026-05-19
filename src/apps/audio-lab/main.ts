import { AUDIO_CATALOG, DEFAULT_AUDIO_CONFIG } from '../../audio/AudioCatalog'
import { ProceduralAudioEngine, type AudioConfig } from '../../audio/ProceduralAudio'
import type { MusicKey, SfxKey } from '../../systems/AudioManager'

const SFX_LABELS: Record<SfxKey, string> = {
  ui_click: 'UI Click',
  ui_hover: 'UI Hover',
  pack_buy: 'Pack Buy',
  pack_open: 'Pack Open',
  run_start: 'Run Start',
  tech_purchase: 'Tech Purchase',
  crate_open: 'Crate Open',
  combo_step: 'Combo Step',
  combo_max: 'Combo Max',
  combo_break: 'Combo Break',
  boss_warning: 'Boss Warning',
  victory: 'Victory',
  defeat: 'Defeat',
  cursor_hit: 'Cursor Hit',
  shield_absorb: 'Shield Absorb',
}

const MUSIC_LABELS: Record<MusicKey, string> = {
  menu_theme: 'Menu Theme',
  shop_theme: 'Shop Theme',
  battle_theme: 'Battle Theme',
  boss_theme: 'Boss Theme',
}

const engine = new ProceduralAudioEngine()
const app = requireElement<HTMLDivElement>('#app')
let config: AudioConfig = structuredClone(DEFAULT_AUDIO_CONFIG)
let dirty = false
let playingMusic: { key: MusicKey, id: string } | null = null

app.innerHTML = `
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: #090b0f;
      color: #e8edf8;
      font: 13px/1.45 Inter, ui-sans-serif, system-ui, sans-serif;
    }
    button {
      border: 1px solid #344154;
      border-radius: 6px;
      background: #171d26;
      color: #eef4ff;
      padding: 8px 10px;
      font: inherit;
      cursor: pointer;
    }
    button:hover { border-color: #6c92b8; }
    button.primary { background: #1f4c44; border-color: #65b6a2; }
    button.ghost { background: transparent; }
    .shell { min-height: 100vh; display: grid; grid-template-rows: auto 1fr; }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 3;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-bottom: 1px solid #273245;
      background: rgba(13, 17, 24, 0.96);
      backdrop-filter: blur(8px);
    }
    .toolbar h1 { margin: 0 8px 0 0; font-size: 16px; white-space: nowrap; }
    .toolbar a {
      border: 1px solid #344154;
      border-radius: 6px;
      color: #eef4ff;
      padding: 7px 10px;
      text-decoration: none;
      background: #171d26;
    }
    .toolbar a:hover { border-color: #6c92b8; }
    .status {
      margin-left: auto;
      min-width: 160px;
      color: #9ba8bf;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: right;
    }
    main {
      width: min(1240px, calc(100vw - 28px));
      margin: 0 auto;
      padding: 22px 0 48px;
    }
    .intro {
      display: grid;
      gap: 7px;
      margin-bottom: 18px;
      color: #a7b3c7;
    }
    .intro strong { color: #eef4ff; }
    .section {
      padding: 18px 0 10px;
      border-top: 1px solid #242e3d;
    }
    .section:first-of-type { border-top: 0; }
    .section h2 { margin: 0 0 12px; font-size: 18px; }
    .sound-group {
      display: grid;
      grid-template-columns: 190px 1fr;
      gap: 14px;
      align-items: stretch;
      padding: 14px 0;
      border-top: 1px solid #18202c;
    }
    .sound-group:first-of-type { border-top: 0; }
    .sound-title {
      display: grid;
      align-content: start;
      gap: 4px;
      padding-top: 4px;
    }
    .sound-title h3 { margin: 0; font-size: 14px; }
    .sound-title code { color: #8290a6; font-size: 11px; }
    .variant-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    .variant {
      min-height: 130px;
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: 9px;
      border: 1px solid #2a3546;
      border-radius: 8px;
      background: #10161f;
      padding: 11px;
    }
    .variant.selected {
      border-color: #70c6b0;
      background: #12231f;
      box-shadow: inset 0 3px 0 #70c6b0;
    }
    .variant.playing {
      border-color: #dbbf71;
      box-shadow: inset 0 3px 0 #dbbf71;
    }
    .variant-head {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: start;
    }
    .variant h4 { margin: 0; font-size: 13px; }
    .variant p { margin: 0; color: #97a4b8; }
    .variant-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 62px;
      border: 1px solid #314052;
      border-radius: 999px;
      padding: 3px 8px;
      color: #a7b3c7;
      font-size: 11px;
      white-space: nowrap;
    }
    .selected .pill { border-color: #70c6b0; color: #dffaf2; }
    @media (max-width: 860px) {
      .toolbar { flex-wrap: wrap; }
      .status { width: 100%; margin-left: 0; text-align: left; }
      .sound-group { grid-template-columns: 1fr; }
      .variant-grid { grid-template-columns: 1fr; }
    }
  </style>
  <div class="shell">
    <header class="toolbar">
      <h1>Audio Lab</h1>
      <a href="/tools/">Tools</a>
      <button id="stop-music" type="button">Stop music</button>
      <button id="save-config" class="primary" type="button">Save config</button>
      <div id="status" class="status">Loading audio config...</div>
    </header>
    <main>
      <div class="intro">
        <strong>Pick the production variant for each procedural sound.</strong>
        <span>Preview buttons play immediately in this page. Save writes the selected variant IDs to <code>public/data/audio_config.json</code>, which the game reads on boot.</span>
      </div>
      <section class="section">
        <h2>SFX</h2>
        <div id="sfx-list"></div>
      </section>
      <section class="section">
        <h2>Background Music</h2>
        <div id="music-list"></div>
      </section>
    </main>
  </div>
`

const statusEl = requireElement<HTMLDivElement>('#status')
const sfxList = requireElement<HTMLDivElement>('#sfx-list')
const musicList = requireElement<HTMLDivElement>('#music-list')
const saveBtn = requireElement<HTMLButtonElement>('#save-config')
const stopMusicBtn = requireElement<HTMLButtonElement>('#stop-music')

engine.setSettings({ master: 0.9, music: 0.78, sfx: 0.9 })
saveBtn.addEventListener('click', () => void saveConfig())
stopMusicBtn.addEventListener('click', () => {
  engine.stopMusic()
  playingMusic = null
  render()
})

void loadConfig()

async function loadConfig() {
  try {
    const response = await fetch(`/data/audio_config.json?t=${Date.now()}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const loaded = await response.json() as Partial<AudioConfig>
    config = normalizeConfig(loaded)
    setStatus('Loaded audio config.')
  } catch (error) {
    config = structuredClone(DEFAULT_AUDIO_CONFIG)
    setStatus(`Using defaults: ${error instanceof Error ? error.message : 'unable to load config'}`)
  }
  render()
}

function render() {
  sfxList.innerHTML = Object.entries(AUDIO_CATALOG.sfx)
    .map(([key, variants]) => renderGroup(key as SfxKey, SFX_LABELS[key as SfxKey], config.sfx[key as SfxKey], variants, 'sfx'))
    .join('')

  musicList.innerHTML = Object.entries(AUDIO_CATALOG.music)
    .map(([key, variants]) => renderGroup(key as MusicKey, MUSIC_LABELS[key as MusicKey], config.music[key as MusicKey], variants, 'music'))
    .join('')

  bindVariantButtons()
}

function renderGroup(
  key: SfxKey | MusicKey,
  label: string,
  selectedId: string,
  variants: Array<{ id: string, name: string, description: string }>,
  type: 'sfx' | 'music',
): string {
  return `
    <div class="sound-group">
      <div class="sound-title">
        <h3>${escapeHtml(label)}</h3>
        <code>${escapeHtml(key)}</code>
      </div>
      <div class="variant-grid">
        ${variants.map(variant => {
          const selected = selectedId === variant.id
          const playing = type === 'music' && playingMusic?.key === key && playingMusic.id === variant.id
          return `
            <article class="variant${selected ? ' selected' : ''}${playing ? ' playing' : ''}">
              <div class="variant-head">
                <h4>${escapeHtml(variant.name)}</h4>
                <span class="pill">${selected ? 'Selected' : 'Option'}</span>
              </div>
              <p>${escapeHtml(variant.description)}</p>
              <div class="variant-actions">
                <button type="button" data-action="play" data-type="${type}" data-key="${key}" data-id="${variant.id}">${type === 'music' ? 'Play loop' : 'Play'}</button>
                <button type="button" data-action="select" data-type="${type}" data-key="${key}" data-id="${variant.id}" class="${selected ? 'primary' : 'ghost'}">Select</button>
              </div>
            </article>
          `
        }).join('')}
      </div>
    </div>
  `
}

function bindVariantButtons() {
  app.querySelectorAll<HTMLButtonElement>('button[data-action]').forEach(button => {
    button.addEventListener('click', () => {
      const action = button.dataset.action
      const type = button.dataset.type as 'sfx' | 'music'
      const key = button.dataset.key ?? ''
      const id = button.dataset.id ?? ''
      if (action === 'play') preview(type, key, id)
      if (action === 'select') selectVariant(type, key, id)
    })
  })
}

function preview(type: 'sfx' | 'music', key: string, id: string) {
  if (type === 'sfx') {
    const variants = AUDIO_CATALOG.sfx[key as SfxKey]
    const variant = variants.find(item => item.id === id)
    if (!variant) return
    engine.playSfx(variant, 1)
    return
  }

  const variants = AUDIO_CATALOG.music[key as MusicKey]
  const variant = variants.find(item => item.id === id)
  if (!variant) return
  playingMusic = { key: key as MusicKey, id }
  engine.playMusic(key as MusicKey, variant, 0.82)
  render()
}

function selectVariant(type: 'sfx' | 'music', key: string, id: string) {
  if (type === 'sfx') config.sfx[key as SfxKey] = id
  else config.music[key as MusicKey] = id
  dirty = true
  setStatus('Unsaved changes.')
  render()
}

async function saveConfig() {
  saveBtn.disabled = true
  setStatus('Saving audio config...')
  try {
    const response = await fetch('/__audio-lab/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    const payload = await response.json() as { ok?: boolean, error?: string }
    if (!response.ok || !payload.ok) throw new Error(payload.error ?? `HTTP ${response.status}`)
    dirty = false
    setStatus('Saved audio config.')
  } catch (error) {
    setStatus(`Save failed: ${error instanceof Error ? error.message : 'unknown error'}`)
  } finally {
    saveBtn.disabled = false
  }
}

function normalizeConfig(value: Partial<AudioConfig>): AudioConfig {
  const next = structuredClone(DEFAULT_AUDIO_CONFIG)
  for (const key of Object.keys(AUDIO_CATALOG.sfx) as SfxKey[]) {
    const selected = value.sfx?.[key]
    if (selected && AUDIO_CATALOG.sfx[key].some(variant => variant.id === selected)) next.sfx[key] = selected
  }
  for (const key of Object.keys(AUDIO_CATALOG.music) as MusicKey[]) {
    const selected = value.music?.[key]
    if (selected && AUDIO_CATALOG.music[key].some(variant => variant.id === selected)) next.music[key] = selected
  }
  return next
}

function setStatus(message: string) {
  statusEl.textContent = dirty ? `${message} *` : message
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing element: ${selector}`)
  return element
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
