import Phaser from 'phaser'

export type SfxKey =
  | 'ui_click'
  | 'ui_hover'
  | 'pack_buy'
  | 'pack_open'
  | 'run_start'
  | 'tech_purchase'
  | 'crate_open'
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

  playSfx(scene: Phaser.Scene, key: SfxKey, volume = 0.7): void {
    if (this.muted || !this.hasAudio(scene, key)) return
    scene.sound.play(key, { volume })
  }

  playMusic(scene: Phaser.Scene, key: MusicKey, volume = 0.42): void {
    if (this.currentMusicKey === key && this.currentMusic?.isPlaying) return
    this.stopMusic()
    if (this.muted || !this.hasAudio(scene, key)) {
      this.currentMusicKey = null
      return
    }
    this.currentMusicKey = key
    this.currentMusic = scene.sound.add(key, { loop: true, volume })
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
}

export const audioManager = new AudioManager()
