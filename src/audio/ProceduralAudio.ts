import type { MusicKey, SfxKey } from '../systems/AudioManager'

export type AudioConfig = {
  sfx: Record<SfxKey, string>
  music: Record<MusicKey, string>
}

export type SfxEvent =
  | {
      type: 'tone'
      wave: OscillatorType
      start: number
      duration: number
      frequency: number
      endFrequency?: number
      gain: number
      attack?: number
      release?: number
      detune?: number
    }
  | {
      type: 'noise'
      start: number
      duration: number
      gain: number
      attack?: number
      release?: number
      filter?: {
        type: BiquadFilterType
        frequency: number
        q?: number
      }
    }

export type SfxVariant = {
  id: string
  name: string
  description: string
  gain?: number
  events: SfxEvent[]
}

export type MusicNote = {
  beat: number
  note: string
  duration: number
  gain?: number
}

export type MusicLayer = {
  wave: OscillatorType
  gain: number
  attack?: number
  release?: number
  filter?: {
    type: BiquadFilterType
    frequency: number
    q?: number
  }
  notes: MusicNote[]
}

export type MusicVariant = {
  id: string
  name: string
  description: string
  bpm: number
  loopBeats: number
  gain?: number
  layers: MusicLayer[]
}

export type AudioCatalog = {
  sfx: Record<SfxKey, SfxVariant[]>
  music: Record<MusicKey, MusicVariant[]>
}

export type AudioSettingsLike = {
  master: number
  music: number
  sfx: number
}

const NOTE_OFFSETS: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
}

export class ProceduralAudioEngine {
  private context: AudioContext | null = null
  private masterGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private musicGain: GainNode | null = null
  private musicTimer: number | null = null
  private musicSources: AudioScheduledSourceNode[] = []
  private currentMusicId: string | null = null
  private nextMusicStart = 0
  private muted = false
  private settings: AudioSettingsLike = { master: 0.8, music: 0.7, sfx: 0.8 }

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', () => void this.resume(), { passive: true })
      window.addEventListener('keydown', () => void this.resume())
    }
  }

  setSettings(settings: AudioSettingsLike): void {
    this.settings = settings
    this.applyGains()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    this.applyGains()
  }

  async resume(): Promise<void> {
    const context = this.context
    if (context?.state === 'suspended') await context.resume()
  }

  playSfx(variant: SfxVariant, volume = 1): void {
    if (this.muted) return
    const context = this.ensureContext()
    void this.resume()
    const startAt = context.currentTime + 0.006
    const output = this.sfxGain ?? context.destination
    for (const event of variant.events) {
      if (event.type === 'tone') {
        this.scheduleTone(context, output, {
          ...event,
          gain: event.gain * (variant.gain ?? 1) * volume,
          start: startAt + event.start,
        }, undefined, false)
      } else {
        this.scheduleNoise(context, output, {
          ...event,
          gain: event.gain * (variant.gain ?? 1) * volume,
          start: startAt + event.start,
        }, false)
      }
    }
  }

  playMusic(key: MusicKey, variant: MusicVariant, volume = 1): void {
    const musicId = `${key}:${variant.id}`
    if (this.currentMusicId === musicId) return
    this.stopMusic()
    if (this.muted) return
    const context = this.ensureContext()
    void this.resume()
    this.currentMusicId = musicId
    this.nextMusicStart = context.currentTime + 0.05
    this.scheduleMusicLoop(variant, volume)
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearTimeout(this.musicTimer)
      this.musicTimer = null
    }
    for (const source of this.musicSources) {
      try {
        source.stop()
      } catch {
        // Already stopped sources are fine; this is just a fast fade-out path.
      }
    }
    this.musicSources = []
    this.currentMusicId = null
  }

  private ensureContext(): AudioContext {
    if (this.context) return this.context
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) throw new Error('Web Audio is not available in this browser')
    this.context = new AudioContextCtor()
    this.masterGain = this.context.createGain()
    this.sfxGain = this.context.createGain()
    this.musicGain = this.context.createGain()
    this.sfxGain.connect(this.masterGain)
    this.musicGain.connect(this.masterGain)
    this.masterGain.connect(this.context.destination)
    this.applyGains()
    return this.context
  }

  private applyGains(): void {
    if (!this.masterGain || !this.sfxGain || !this.musicGain) return
    const master = this.muted ? 0 : this.settings.master
    this.masterGain.gain.value = master
    this.sfxGain.gain.value = this.settings.sfx
    this.musicGain.gain.value = this.settings.music
  }

  private scheduleMusicLoop(variant: MusicVariant, volume: number): void {
    const context = this.ensureContext()
    const startAt = Math.max(this.nextMusicStart, context.currentTime + 0.03)
    const secondsPerBeat = 60 / variant.bpm
    const loopSeconds = variant.loopBeats * secondsPerBeat
    const output = this.musicGain ?? context.destination

    for (const layer of variant.layers) {
      for (const note of layer.notes) {
        const frequency = noteToFrequency(note.note)
        if (!frequency) continue
        const duration = note.duration * secondsPerBeat
        const eventStart = startAt + note.beat * secondsPerBeat
        const layerGain = layer.gain * (note.gain ?? 1) * (variant.gain ?? 1) * volume
        this.scheduleTone(context, output, {
          type: 'tone',
          wave: layer.wave,
          start: eventStart,
          duration,
          frequency,
          gain: layerGain,
          attack: layer.attack ?? 0.01,
          release: layer.release ?? 0.06,
        }, layer.filter, true)
      }
    }

    this.nextMusicStart = startAt + loopSeconds
    const delay = Math.max(30, (this.nextMusicStart - context.currentTime - 0.12) * 1000)
    this.musicTimer = window.setTimeout(() => this.scheduleMusicLoop(variant, volume), delay)
  }

  private scheduleTone(
    context: AudioContext,
    destination: AudioNode,
    event: Extract<SfxEvent, { type: 'tone' }>,
    filterConfig?: MusicLayer['filter'],
    trackAsMusic = false,
  ): void {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = event.wave
    oscillator.frequency.setValueAtTime(event.frequency, event.start)
    if (event.endFrequency !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, event.endFrequency), event.start + event.duration)
    }
    if (event.detune !== undefined) oscillator.detune.setValueAtTime(event.detune, event.start)
    applyEnvelope(gain.gain, event.start, event.duration, event.gain, event.attack ?? 0.004, event.release ?? 0.035)

    const filter = filterConfig ? context.createBiquadFilter() : null
    if (filter && filterConfig) {
      filter.type = filterConfig.type
      filter.frequency.setValueAtTime(filterConfig.frequency, event.start)
      filter.Q.value = filterConfig.q ?? 0.6
      oscillator.connect(filter)
      filter.connect(gain)
    } else {
      oscillator.connect(gain)
    }
    gain.connect(destination)
    oscillator.start(event.start)
    oscillator.stop(event.start + event.duration + 0.08)
    if (trackAsMusic) this.trackMusicSource(oscillator)
  }

  private scheduleNoise(context: AudioContext, destination: AudioNode, event: Extract<SfxEvent, { type: 'noise' }>, trackAsMusic = false): void {
    const source = context.createBufferSource()
    const gain = context.createGain()
    source.buffer = createNoiseBuffer(context, Math.max(0.02, event.duration))
    applyEnvelope(gain.gain, event.start, event.duration, event.gain, event.attack ?? 0.002, event.release ?? 0.04)

    if (event.filter) {
      const filter = context.createBiquadFilter()
      filter.type = event.filter.type
      filter.frequency.setValueAtTime(event.filter.frequency, event.start)
      filter.Q.value = event.filter.q ?? 0.6
      source.connect(filter)
      filter.connect(gain)
    } else {
      source.connect(gain)
    }
    gain.connect(destination)
    source.start(event.start)
    source.stop(event.start + event.duration + 0.08)
    if (trackAsMusic) this.trackMusicSource(source)
  }

  private trackMusicSource(source: AudioScheduledSourceNode): void {
    this.musicSources.push(source)
    source.addEventListener('ended', () => {
      this.musicSources = this.musicSources.filter(item => item !== source)
    }, { once: true })
  }
}

function applyEnvelope(param: AudioParam, start: number, duration: number, gain: number, attack: number, release: number): void {
  const attackEnd = start + Math.min(attack, duration * 0.45)
  const releaseStart = start + Math.max(attack, duration - release)
  const end = start + duration
  param.cancelScheduledValues(start)
  param.setValueAtTime(0.0001, start)
  param.linearRampToValueAtTime(Math.max(0.0001, gain), attackEnd)
  param.setValueAtTime(Math.max(0.0001, gain), releaseStart)
  param.linearRampToValueAtTime(0.0001, end)
}

function createNoiseBuffer(context: AudioContext, duration: number): AudioBuffer {
  const length = Math.max(1, Math.floor(context.sampleRate * duration))
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1
  }
  return buffer
}

function noteToFrequency(note: string): number | null {
  const match = /^([A-G](?:#|b)?)(-?\d)$/.exec(note)
  if (!match) return null
  const [, pitch, octaveText] = match
  const offset = NOTE_OFFSETS[pitch]
  const octave = Number(octaveText)
  if (offset === undefined || !Number.isFinite(octave)) return null
  const midi = (octave + 1) * 12 + offset
  return 440 * 2 ** ((midi - 69) / 12)
}
