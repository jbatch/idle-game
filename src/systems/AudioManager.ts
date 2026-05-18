import Phaser from 'phaser'

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

export type MusicKey =
  | 'menu_theme'
  | 'shop_theme'
  | 'battle_theme'
  | 'boss_theme'

type AudioManifest = {
  sfx: Record<SfxKey, string>
  music: Record<MusicKey, string>
}

const AUDIO_MANIFEST: AudioManifest = {
  sfx: {
    ui_click: '',
    ui_hover: '',
    pack_buy: '',
    pack_open: '',
    run_start: '',
    tech_purchase: '',
    crate_open: '',
    combo_step: '',
    combo_max: '',
    combo_break: '',
    boss_warning: '',
    victory: '',
    defeat: '',
  },
  music: {
    menu_theme: '',
    shop_theme: '',
    battle_theme: '',
    boss_theme: '',
  },
}

class AudioManager {
  private currentMusicKey: MusicKey | null = null
  private currentMusic: Phaser.Sound.BaseSound | null = null
  private muted = false
  private settings = loadAudioSettings()

  preload(scene: Phaser.Scene): void {
    for (const [key, path] of Object.entries(AUDIO_MANIFEST.sfx)) {
      if (path) scene.load.audio(key, path)
    }
    for (const [key, path] of Object.entries(AUDIO_MANIFEST.music)) {
      if (path) scene.load.audio(key, path)
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.currentMusic) {
      const sound = this.currentMusic as Phaser.Sound.BaseSound & { setMute?: (value: boolean) => void, mute?: boolean }
      if (sound.setMute) sound.setMute(muted)
      else sound.mute = muted
    }
  }

  getSettings(): AudioSettings {
    return { ...this.settings }
  }

  setVolume(channel: keyof AudioSettings, value: number): void {
    this.settings[channel] = Phaser.Math.Clamp(value, 0, 1)
    saveAudioSettings(this.settings)
    this.applyMusicVolume()
  }

  playSfx(scene: Phaser.Scene, key: SfxKey, volume = 0.7): void {
    if (this.muted || !this.hasAudio(scene, key)) return
    scene.sound.play(key, { volume: volume * this.settings.master * this.settings.sfx })
  }

  playMusic(scene: Phaser.Scene, key: MusicKey, volume = 0.42): void {
    if (this.currentMusicKey === key && this.currentMusic?.isPlaying) return
    this.stopMusic()
    if (this.muted || !this.hasAudio(scene, key)) {
      this.currentMusicKey = null
      return
    }
    this.currentMusicKey = key
    this.currentMusic = scene.sound.add(key, { loop: true, volume: volume * this.settings.master * this.settings.music })
    this.currentMusic.play()
  }

  stopMusic(): void {
    if (!this.currentMusic) return
    this.currentMusic.stop()
    this.currentMusic.destroy()
    this.currentMusic = null
    this.currentMusicKey = null
  }

  private hasAudio(scene: Phaser.Scene, key: string): boolean {
    return Boolean(scene.cache.audio?.exists(key))
  }

  private applyMusicVolume(): void {
    if (!this.currentMusic) return
    const sound = this.currentMusic as Phaser.Sound.BaseSound & { setVolume?: (value: number) => void, volume?: number }
    const volume = 0.42 * this.settings.master * this.settings.music
    if (sound.setVolume) sound.setVolume(volume)
    else sound.volume = volume
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
