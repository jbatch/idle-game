import type { AudioCatalog, AudioConfig, MusicLayer, MusicNote, MusicVariant, SfxEvent, SfxVariant } from './ProceduralAudio'

const tone = (
  wave: OscillatorType,
  start: number,
  duration: number,
  frequency: number,
  endFrequency: number,
  gain: number,
  attack = 0.004,
  release = 0.04,
): SfxEvent => ({ type: 'tone', wave, start, duration, frequency, endFrequency, gain, attack, release })

const fixedTone = (
  wave: OscillatorType,
  start: number,
  duration: number,
  frequency: number,
  gain: number,
  attack = 0.004,
  release = 0.04,
): SfxEvent => ({ type: 'tone', wave, start, duration, frequency, gain, attack, release })

const noise = (
  start: number,
  duration: number,
  gain: number,
  frequency: number,
  type: BiquadFilterType = 'bandpass',
  q = 0.8,
): SfxEvent => ({ type: 'noise', start, duration, gain, filter: { type, frequency, q } })

const sfx = (id: string, name: string, description: string, events: SfxEvent[], gain = 1): SfxVariant => ({
  id,
  name,
  description,
  events,
  gain,
})

const note = (beat: number, noteName: string, duration = 0.5, gain = 1): MusicNote => ({
  beat,
  note: noteName,
  duration,
  gain,
})

const layer = (
  wave: OscillatorType,
  gain: number,
  notes: MusicNote[],
  options: Omit<MusicLayer, 'wave' | 'gain' | 'notes'> = {},
): MusicLayer => ({ wave, gain, notes, ...options })

const music = (
  id: string,
  name: string,
  description: string,
  bpm: number,
  loopBeats: number,
  layers: MusicLayer[],
  gain = 1,
): MusicVariant => ({ id, name, description, bpm, loopBeats, layers, gain })

export const AUDIO_CATALOG: AudioCatalog = {
  sfx: {
    ui_click: [
      sfx('click_tick', 'Tight tick', 'Short wooden UI tap.', [tone('square', 0, 0.045, 980, 620, 0.17), fixedTone('sine', 0.012, 0.035, 1460, 0.07)]),
      sfx('click_coin', 'Coin pip', 'Bright small currency-like pip.', [tone('triangle', 0, 0.055, 1320, 1760, 0.13), fixedTone('sine', 0.04, 0.06, 880, 0.08)]),
      sfx('click_clack', 'Soft clack', 'Lower tactile menu clack.', [noise(0, 0.035, 0.09, 1600, 'highpass'), tone('sine', 0.006, 0.06, 480, 360, 0.12)]),
    ],
    ui_hover: [
      sfx('hover_lift', 'Lift', 'Tiny rising rollover hint.', [tone('sine', 0, 0.06, 640, 920, 0.055)]),
      sfx('hover_glint', 'Glint', 'Glassier highlight shimmer.', [fixedTone('triangle', 0, 0.05, 1180, 0.045), tone('sine', 0.025, 0.055, 1500, 1900, 0.035)]),
      sfx('hover_warm', 'Warm blip', 'Mellow lower hover sound.', [tone('triangle', 0, 0.075, 430, 520, 0.07)]),
    ],
    pack_buy: [
      sfx('buy_chime', 'Buy chime', 'Two-note spend confirmation.', [fixedTone('triangle', 0, 0.08, 660, 0.12), fixedTone('triangle', 0.07, 0.12, 990, 0.11)]),
      sfx('buy_stamp', 'Stamp', 'Chunky ledger stamp.', [noise(0, 0.05, 0.11, 700, 'lowpass'), tone('square', 0.01, 0.08, 220, 180, 0.1)]),
      sfx('buy_token', 'Token drop', 'Small metallic token drop.', [tone('sine', 0, 0.08, 1200, 760, 0.12), tone('sine', 0.07, 0.11, 720, 520, 0.08)]),
    ],
    pack_open: [
      sfx('open_rip', 'Paper rip', 'Fast paper-tear reveal.', [noise(0, 0.12, 0.12, 2600, 'highpass'), tone('triangle', 0.08, 0.14, 560, 840, 0.09)]),
      sfx('open_fanfare', 'Mini fanfare', 'Upward lucky reveal.', [fixedTone('triangle', 0, 0.08, 523, 0.09), fixedTone('triangle', 0.07, 0.08, 659, 0.09), fixedTone('triangle', 0.14, 0.15, 880, 0.12)]),
      sfx('open_snap', 'Snap open', 'Box latch and sparkle.', [noise(0, 0.04, 0.16, 1800), tone('sine', 0.035, 0.13, 980, 1320, 0.08), fixedTone('sine', 0.09, 0.1, 1760, 0.055)]),
    ],
    run_start: [
      sfx('run_horn', 'Battle horn', 'Low start horn with lift.', [tone('sawtooth', 0, 0.24, 196, 247, 0.13, 0.02, 0.08), fixedTone('triangle', 0.15, 0.18, 392, 0.08)]),
      sfx('run_gate', 'Gate drop', 'Gate slam into ready ping.', [noise(0, 0.08, 0.13, 420, 'lowpass'), tone('square', 0.09, 0.13, 330, 494, 0.1)]),
      sfx('run_spark', 'Spark launch', 'Brisk arcade start-up.', [tone('square', 0, 0.08, 440, 660, 0.09), tone('square', 0.075, 0.08, 660, 990, 0.09), fixedTone('sine', 0.16, 0.18, 1320, 0.07)]),
    ],
    tech_purchase: [
      sfx('tech_unlock', 'Unlock', 'Clean research unlock chord.', [fixedTone('sine', 0, 0.16, 440, 0.1), fixedTone('sine', 0.02, 0.18, 660, 0.08), fixedTone('triangle', 0.04, 0.22, 880, 0.08)]),
      sfx('tech_solder', 'Solder', 'Electric solder flash.', [noise(0, 0.08, 0.08, 5000, 'highpass'), tone('sawtooth', 0.025, 0.14, 740, 1180, 0.09)]),
      sfx('tech_orbit', 'Orbit', 'Soft circular power-on.', [tone('sine', 0, 0.18, 330, 660, 0.1), fixedTone('triangle', 0.1, 0.24, 990, 0.065)]),
    ],
    crate_open: [
      sfx('crate_crack', 'Crack', 'Splintery box break.', [noise(0, 0.09, 0.2, 1300), noise(0.055, 0.08, 0.1, 2800, 'highpass'), tone('triangle', 0.02, 0.12, 180, 120, 0.1)]),
      sfx('crate_cache', 'Cache pop', 'Reward pop and sparkle.', [noise(0, 0.045, 0.13, 900), fixedTone('sine', 0.04, 0.1, 990, 0.08), fixedTone('sine', 0.11, 0.12, 1480, 0.06)]),
      sfx('crate_burst', 'Burst', 'More explosive break.', [noise(0, 0.14, 0.18, 650, 'lowpass'), tone('square', 0.02, 0.08, 220, 90, 0.09), fixedTone('triangle', 0.12, 0.12, 880, 0.06)]),
    ],
    combo_step: [
      sfx('combo_pluck', 'Pluck', 'Light timing pluck.', [fixedTone('triangle', 0, 0.06, 880, 0.08), fixedTone('sine', 0.035, 0.07, 1320, 0.055)]),
      sfx('combo_ping', 'Ping', 'Precise bright hit marker.', [tone('sine', 0, 0.07, 1200, 1600, 0.085)]),
      sfx('combo_click', 'Click-rise', 'Mechanical combo tick.', [noise(0, 0.025, 0.05, 2400, 'highpass'), tone('square', 0.01, 0.06, 720, 920, 0.06)]),
    ],
    combo_max: [
      sfx('max_shine', 'Shine', 'Satisfied max-combo shine.', [fixedTone('triangle', 0, 0.12, 880, 0.11), fixedTone('triangle', 0.08, 0.16, 1320, 0.1), fixedTone('sine', 0.17, 0.24, 1760, 0.08)]),
      sfx('max_charge', 'Charge', 'Power ramp with crackle.', [tone('sawtooth', 0, 0.2, 360, 960, 0.11), noise(0.08, 0.12, 0.055, 4600, 'highpass'), fixedTone('sine', 0.18, 0.18, 1440, 0.08)]),
      sfx('max_bell', 'Bell', 'Cleaner little victory bell.', [fixedTone('sine', 0, 0.22, 1046, 0.1), fixedTone('sine', 0.04, 0.22, 1568, 0.07)]),
    ],
    combo_break: [
      sfx('break_drop', 'Drop', 'Downward lost-chain cue.', [tone('triangle', 0, 0.15, 520, 180, 0.1)]),
      sfx('break_buzz', 'Buzz', 'Soft failure buzz.', [tone('sawtooth', 0, 0.14, 150, 120, 0.07), noise(0, 0.09, 0.04, 900)]),
      sfx('break_dust', 'Dust', 'Tiny exhausted puff.', [noise(0, 0.12, 0.11, 520, 'lowpass'), tone('sine', 0.03, 0.11, 280, 170, 0.055)]),
    ],
    boss_warning: [
      sfx('boss_alarm', 'Alarm', 'Two-pulse boss alarm.', [fixedTone('sawtooth', 0, 0.2, 196, 0.13), fixedTone('sawtooth', 0.24, 0.24, 185, 0.13), noise(0, 0.48, 0.04, 1800)]),
      sfx('boss_gong', 'Gong', 'Synthetic low gong.', [tone('sine', 0, 0.7, 130, 96, 0.18, 0.01, 0.45), fixedTone('triangle', 0.02, 0.55, 260, 0.07)]),
      sfx('boss_rise', 'Rise', 'Menacing rising warning.', [tone('sawtooth', 0, 0.52, 110, 330, 0.12, 0.03, 0.12), noise(0.12, 0.28, 0.045, 1200)]),
    ],
    victory: [
      sfx('victory_three', 'Three-star', 'Classic upward clear sting.', [fixedTone('triangle', 0, 0.14, 523, 0.1), fixedTone('triangle', 0.12, 0.14, 659, 0.1), fixedTone('triangle', 0.24, 0.28, 1046, 0.13)]),
      sfx('victory_banner', 'Banner', 'Broader triumphant chord.', [fixedTone('sine', 0, 0.36, 392, 0.1), fixedTone('sine', 0.03, 0.34, 494, 0.08), fixedTone('triangle', 0.06, 0.38, 784, 0.09)]),
      sfx('victory_sparkles', 'Sparkles', 'Light arcade win cascade.', [fixedTone('sine', 0, 0.09, 784, 0.08), fixedTone('sine', 0.08, 0.09, 988, 0.08), fixedTone('sine', 0.16, 0.12, 1318, 0.09), fixedTone('sine', 0.25, 0.18, 1760, 0.06)]),
    ],
    defeat: [
      sfx('defeat_fall', 'Fall', 'Low falling loss tone.', [tone('sawtooth', 0, 0.58, 260, 90, 0.13, 0.02, 0.2)]),
      sfx('defeat_drum', 'Drum', 'Muted thud and sigh.', [noise(0, 0.13, 0.13, 260, 'lowpass'), tone('sine', 0.06, 0.36, 180, 120, 0.1)]),
      sfx('defeat_dark', 'Dark', 'Short ominous minor fall.', [fixedTone('triangle', 0, 0.28, 311, 0.1), fixedTone('triangle', 0.1, 0.36, 233, 0.1), tone('sine', 0.18, 0.3, 155, 110, 0.08)]),
    ],
    cursor_hit: [
      sfx('cursor_snap', 'Snap', 'Fast click impact.', [noise(0, 0.025, 0.1, 2600, 'highpass'), tone('triangle', 0.005, 0.055, 760, 420, 0.08)]),
      sfx('cursor_zap', 'Zap', 'Electrical cursor hit.', [tone('sawtooth', 0, 0.06, 1300, 520, 0.085), noise(0, 0.04, 0.035, 4800, 'highpass')]),
      sfx('cursor_pop', 'Pop', 'Rounder little impact.', [tone('sine', 0, 0.075, 620, 260, 0.1)]),
    ],
    shield_absorb: [
      sfx('shield_ping', 'Ping', 'Clean shield deflection.', [fixedTone('sine', 0, 0.14, 1046, 0.08), tone('triangle', 0.02, 0.14, 1568, 1180, 0.055)]),
      sfx('shield_glass', 'Glass', 'Bright glassy absorb.', [fixedTone('sine', 0, 0.09, 1760, 0.065), fixedTone('sine', 0.04, 0.15, 1320, 0.055), noise(0, 0.04, 0.025, 6200, 'highpass')]),
      sfx('shield_thrum', 'Thrum', 'Lower magic barrier thrum.', [tone('sine', 0, 0.18, 330, 220, 0.095), fixedTone('triangle', 0.02, 0.16, 660, 0.045)]),
    ],
  },
  music: {
    menu_theme: [
      music('menu_clockwork', 'Clockwork Lantern', 'A small ticking title motif.', 92, 8, [
        layer('triangle', 0.055, [note(0, 'C4'), note(1, 'E4'), note(2, 'G4'), note(3, 'E4'), note(4, 'A4'), note(5, 'G4'), note(6, 'E4'), note(7, 'D4')]),
        layer('sine', 0.045, [note(0, 'C3', 1), note(2, 'G2', 1), note(4, 'A2', 1), note(6, 'F2', 1)], { attack: 0.04, release: 0.18 }),
      ], 0.72),
      music('menu_stars', 'Quiet Stars', 'Sparse, calmer title ambience.', 76, 8, [
        layer('sine', 0.06, [note(0, 'C4', 1.4), note(2, 'G4', 1.1), note(4, 'D4', 1.4), note(6, 'E4', 1.2)], { attack: 0.08, release: 0.5 }),
        layer('triangle', 0.035, [note(0, 'C3', 2), note(4, 'A2', 2)], { attack: 0.12, release: 0.7 }),
      ], 0.75),
      music('menu_camp', 'Camp Pulse', 'Warmer menu pulse with a gentle bass.', 98, 8, [
        layer('triangle', 0.05, [note(0, 'E4'), note(1, 'G4'), note(2, 'B4'), note(3, 'G4'), note(4, 'D4'), note(5, 'F4'), note(6, 'A4'), note(7, 'F4')]),
        layer('square', 0.032, [note(0, 'E2', 0.5), note(2, 'E2', 0.5), note(4, 'D2', 0.5), note(6, 'D2', 0.5)], { release: 0.1 }),
      ], 0.7),
    ],
    shop_theme: [
      music('shop_ledger', 'Tinker Ledger', 'Light workshop arpeggio for buying packs.', 104, 8, [
        layer('triangle', 0.045, [note(0, 'C4'), note(0.5, 'E4'), note(1, 'G4'), note(1.5, 'B4'), note(4, 'A3'), note(4.5, 'C4'), note(5, 'E4'), note(5.5, 'G4')]),
        layer('sine', 0.045, [note(0, 'C3', 1), note(2, 'G2', 1), note(4, 'A2', 1), note(6, 'G2', 1)], { attack: 0.03, release: 0.18 }),
      ], 0.7),
      music('shop_market', 'Pack Market', 'Brighter shop loop with bouncy movement.', 116, 8, [
        layer('square', 0.03, [note(0, 'G4', 0.25), note(1, 'A4', 0.25), note(2, 'B4', 0.25), note(3, 'D5', 0.25), note(4, 'B4', 0.25), note(5, 'A4', 0.25), note(6, 'G4', 0.25), note(7, 'E4', 0.25)]),
        layer('triangle', 0.038, [note(0, 'G2', 0.5), note(2, 'D3', 0.5), note(4, 'E3', 0.5), note(6, 'C3', 0.5)]),
      ], 0.68),
      music('shop_quiet', 'Quiet Sorting', 'Lower, less busy shop underscore.', 84, 8, [
        layer('sine', 0.052, [note(0, 'A3', 1.5), note(2, 'C4', 1), note(4, 'G3', 1.5), note(6, 'E3', 1)]),
        layer('triangle', 0.03, [note(0, 'A2', 2), note(4, 'G2', 2)], { attack: 0.12, release: 0.5 }),
      ], 0.8),
    ],
    battle_theme: [
      music('battle_march', 'March Grid', 'Steady arcade battle ostinato.', 132, 8, [
        layer('square', 0.035, [note(0, 'C3', 0.35), note(1, 'C3', 0.35), note(2, 'G2', 0.35), note(3, 'G2', 0.35), note(4, 'A2', 0.35), note(5, 'A2', 0.35), note(6, 'F2', 0.35), note(7, 'G2', 0.35)]),
        layer('triangle', 0.04, [note(0, 'C4', 0.5), note(1.5, 'E4', 0.5), note(3, 'G4', 0.5), note(4.5, 'A4', 0.5), note(6, 'G4', 0.5), note(7, 'E4', 0.5)]),
      ], 0.75),
      music('battle_sparkline', 'Sparkline Drive', 'Faster pulse for click-heavy fights.', 146, 8, [
        layer('sawtooth', 0.026, [note(0, 'E3', 0.25), note(1, 'E3', 0.25), note(2, 'G3', 0.25), note(3, 'E3', 0.25), note(4, 'D3', 0.25), note(5, 'D3', 0.25), note(6, 'F3', 0.25), note(7, 'D3', 0.25)]),
        layer('triangle', 0.035, [note(0, 'E4', 0.25), note(0.5, 'G4', 0.25), note(1, 'B4', 0.25), note(2, 'G4', 0.25), note(4, 'D4', 0.25), note(4.5, 'F4', 0.25), note(5, 'A4', 0.25), note(6, 'F4', 0.25)]),
      ], 0.68),
      music('battle_siege', 'Siege Pulse', 'Chunkier low-end battle loop.', 118, 8, [
        layer('square', 0.045, [note(0, 'C2', 0.5), note(1.5, 'C2', 0.5), note(3, 'G2', 0.5), note(4, 'A2', 0.5), note(5.5, 'A2', 0.5), note(7, 'G2', 0.5)]),
        layer('triangle', 0.035, [note(0.5, 'C4', 0.4), note(2, 'D4', 0.4), note(3.5, 'E4', 0.4), note(5, 'G4', 0.4), note(6.5, 'E4', 0.4)]),
      ], 0.78),
    ],
    boss_theme: [
      music('boss_engine', 'Warning Engine', 'Pulsing mechanical boss loop.', 126, 8, [
        layer('sawtooth', 0.04, [note(0, 'C2', 0.5), note(1, 'C2', 0.5), note(2, 'C2', 0.5), note(3, 'Db2', 0.5), note(4, 'C2', 0.5), note(5, 'C2', 0.5), note(6, 'Bb1', 0.5), note(7, 'B1', 0.5)]),
        layer('square', 0.025, [note(0, 'G3', 0.25), note(2, 'Ab3', 0.25), note(4, 'G3', 0.25), note(6, 'F3', 0.25)]),
      ], 0.82),
      music('boss_eclipse', 'Iron Eclipse', 'Slower ominous boss figure.', 96, 8, [
        layer('sawtooth', 0.045, [note(0, 'D2', 1), note(2, 'C#2', 1), note(4, 'D2', 1), note(6, 'F2', 1)], { attack: 0.02, release: 0.22 }),
        layer('triangle', 0.032, [note(1, 'A3', 0.5), note(3, 'G#3', 0.5), note(5, 'A3', 0.5), note(7, 'C4', 0.5)]),
      ], 0.82),
      music('boss_void', 'Void Alarm', 'High tension alarm pattern.', 138, 8, [
        layer('square', 0.036, [note(0, 'F2', 0.35), note(1, 'F2', 0.35), note(2, 'E2', 0.35), note(3, 'F2', 0.35), note(4, 'Db2', 0.35), note(5, 'Db2', 0.35), note(6, 'E2', 0.35), note(7, 'F2', 0.35)]),
        layer('sine', 0.04, [note(0, 'C5', 0.2), note(1.5, 'B4', 0.2), note(3, 'C5', 0.2), note(4.5, 'Ab4', 0.2), note(6, 'B4', 0.2)], { release: 0.18 }),
      ], 0.74),
    ],
  },
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  sfx: {
    ui_click: 'click_tick',
    ui_hover: 'hover_lift',
    pack_buy: 'buy_chime',
    pack_open: 'open_rip',
    run_start: 'run_horn',
    tech_purchase: 'tech_unlock',
    crate_open: 'crate_crack',
    combo_step: 'combo_pluck',
    combo_max: 'max_shine',
    combo_break: 'break_drop',
    boss_warning: 'boss_alarm',
    victory: 'victory_three',
    defeat: 'defeat_fall',
    cursor_hit: 'cursor_snap',
    shield_absorb: 'shield_ping',
  },
  music: {
    menu_theme: 'menu_clockwork',
    shop_theme: 'shop_ledger',
    battle_theme: 'battle_march',
    boss_theme: 'boss_engine',
  },
}

export function resolveSfxVariant(key: keyof typeof AUDIO_CATALOG.sfx, config: Partial<AudioConfig> | undefined): SfxVariant {
  const variants = AUDIO_CATALOG.sfx[key]
  const selectedId = config?.sfx?.[key] ?? DEFAULT_AUDIO_CONFIG.sfx[key]
  return variants.find(variant => variant.id === selectedId) ?? variants[0]
}

export function resolveMusicVariant(key: keyof typeof AUDIO_CATALOG.music, config: Partial<AudioConfig> | undefined): MusicVariant {
  const variants = AUDIO_CATALOG.music[key]
  const selectedId = config?.music?.[key] ?? DEFAULT_AUDIO_CONFIG.music[key]
  return variants.find(variant => variant.id === selectedId) ?? variants[0]
}
