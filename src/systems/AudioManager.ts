import Phaser from 'phaser'
import { DEFAULT_AUDIO_CONFIG, resolveMusicVariant, resolveSfxVariant } from '../audio/AudioCatalog'
import { ProceduralAudioEngine, type AudioConfig } from '../audio/ProceduralAudio'

export type SfxKey =
  | 'ui_click'
  | 'ui_hover'
  | 'pack_buy'
  | 'pack_open'
  | 'run_start'
  | 'tech_purchase'
  | 'crate_open'
  | 'combo_step'
  | 'combo_max'
  | 'combo_break'
  | 'boss_warning'
  | 'victory'
  | 'defeat'
  | 'cursor_hit'
  | 'shield_absorb'

export type MusicKey =
  | 'menu_theme'
  | 'shop_theme'
  | 'battle_theme'
  | 'boss_theme'

class AudioManager {
  private currentMusicKey: MusicKey | null = null
  private currentMusicVariantId: string | null = null
  private muted = false
  private settings = loadAudioSettings()
  private engine = new ProceduralAudioEngine()

  preload(scene: Phaser.Scene): void {
    scene.load.json('audio_config', `/data/audio_config.json?v=0.2.11`)
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    this.engine.setMuted(muted)
    if (muted) this.stopMusic()
  }

  getSettings(): AudioSettings {
    return { ...this.settings }
  }

  setVolume(channel: keyof AudioSettings, value: number): void {
    this.settings[channel] = Phaser.Math.Clamp(value, 0, 1)
    saveAudioSettings(this.settings)
    this.engine.setSettings(this.settings)
  }

  playSfx(scene: Phaser.Scene, key: SfxKey, volume = 0.7): void {
    if (this.muted) return
    this.engine.setSettings(this.settings)
    this.engine.playSfx(resolveSfxVariant(key, this.audioConfig(scene)), volume)
  }

  playMusic(scene: Phaser.Scene, key: MusicKey, volume = 0.42): void {
    if (this.muted) return
    const variant = resolveMusicVariant(key, this.audioConfig(scene))
    if (this.currentMusicKey === key && this.currentMusicVariantId === variant.id) return
    this.currentMusicKey = key
    this.currentMusicVariantId = variant.id
    this.engine.setSettings(this.settings)
    this.engine.playMusic(key, variant, volume)
  }

  stopMusic(): void {
    this.engine.stopMusic()
    this.currentMusicKey = null
    this.currentMusicVariantId = null
  }

  private audioConfig(scene: Phaser.Scene): AudioConfig {
    return (scene.cache.json.get('audio_config') as AudioConfig | undefined) ?? DEFAULT_AUDIO_CONFIG
  }
}

export type AudioSettings = {
  master: number
  music: number
  sfx: number
}

const AUDIO_SETTINGS_KEY = 'siegeloop_audio_settings'
const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  master: 0.8,
  music: 0.7,
  sfx: 0.8,
}

function loadAudioSettings(): AudioSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(AUDIO_SETTINGS_KEY) ?? '{}') as Partial<AudioSettings>
    return {
      master: clampSetting(parsed.master, DEFAULT_AUDIO_SETTINGS.master),
      music: clampSetting(parsed.music, DEFAULT_AUDIO_SETTINGS.music),
      sfx: clampSetting(parsed.sfx, DEFAULT_AUDIO_SETTINGS.sfx),
    }
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS }
  }
}

function saveAudioSettings(settings: AudioSettings): void {
  localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settings))
}

function clampSetting(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Phaser.Math.Clamp(value, 0, 1)
    : fallback
}

export const audioManager = new AudioManager()
