/**
 * audio.ts — all sound: spoken note names, real piano pitch, and SFX.
 *
 * Zero-asset strategy so the game sounds right TODAY, with clean seams to swap
 * in higher-quality recorded assets later:
 *   • Piano PITCH  → synthesized from the note's MIDI number via Web Audio
 *                    (a short, soft FM-ish "mallet" tone). Always correct pitch.
 *   • VOICE        → Web Speech API speaking the note names in a EUROPEAN
 *                    solfège language (Italian by default: do·re·mi·fa·sol·la·si).
 *                    The on-screen names are Hebrew (דו/רה/…) but the VOICE must
 *                    speak the Latin spelling in the chosen language, or the TTS
 *                    mispronounces it. Swappable for recorded clips later.
 *   • SFX          → tiny synthesized blips/chimes (correct, wrong, combo, win).
 *
 * Every channel is independently mutable via SoundSettings.
 */

import type { Solfege } from './notes';
import type { SoundSettings, VoiceLang } from './progress';

/** How each solfège is SPOKEN (Latin spelling) per language, for TTS. */
const SPOKEN: Record<VoiceLang, Record<Solfege, string>> = {
  it: { דו: 'do', רה: 're', מי: 'mi', פה: 'fa', סול: 'sol', לה: 'la', סי: 'si' },
  fr: { דו: 'do', רה: 'ré', מי: 'mi', פה: 'fa', סול: 'sol', לה: 'la', סי: 'si' },
  es: { דו: 'do', רה: 're', מי: 'mi', פה: 'fa', סול: 'sol', לה: 'la', סי: 'si' },
};

const LANG_TAG: Record<VoiceLang, string> = { it: 'it-IT', fr: 'fr-FR', es: 'es-ES' };

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private settings: SoundSettings;
  private voice: SpeechSynthesisVoice | null = null;

  constructor(settings: SoundSettings) {
    this.settings = settings;
    this.pickVoice();
  }

  /** Must be called from a user gesture (browser autoplay policy). */
  unlock(): void {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  updateSettings(s: SoundSettings): void {
    const langChanged = s.voiceLang !== this.settings.voiceLang;
    this.settings = s;
    if (langChanged) this.pickVoice();
  }

  // ---- Pitch (real note) -------------------------------------------------

  private midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /** Play the actual pitch of a note (soft mallet/piano-ish tone). */
  playPitch(midi: number, durationSec = 0.7): void {
    if (!this.settings.pitch || !this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const freq = this.midiToFreq(midi);

    // Two detuned oscillators + fast decay → a warm plucked tone.
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.6, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
    gain.connect(this.master);

    for (const [type, detune, level] of [
      ['triangle', 0, 0.7],
      ['sine', 0.5, 0.3],
    ] as const) {
      const osc = this.ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq * (1 + detune / 100);
      const g = this.ctx.createGain();
      g.gain.value = level;
      osc.connect(g);
      g.connect(gain);
      osc.start(now);
      osc.stop(now + durationSec + 0.05);
    }
  }

  // ---- Voice (European solfège note name) --------------------------------

  private pickVoice(): void {
    if (typeof speechSynthesis === 'undefined') return;
    const tag = LANG_TAG[this.settings.voiceLang].toLowerCase();
    const prefix = tag.slice(0, 2);
    const choose = () => {
      const voices = speechSynthesis.getVoices();
      this.voice =
        voices.find((v) => v.lang?.toLowerCase() === tag) ??
        voices.find((v) => v.lang?.toLowerCase().startsWith(prefix)) ??
        null;
    };
    choose();
    // Voices often load async.
    speechSynthesis.onvoiceschanged = choose;
  }

  /** Speak a solfège note name in the chosen European language (e.g. "do"). */
  sayNote(solfege: Solfege): void {
    if (!this.settings.voice || typeof speechSynthesis === 'undefined') return;
    speechSynthesis.cancel();
    const lang = this.settings.voiceLang;
    const u = new SpeechSynthesisUtterance(SPOKEN[lang][solfege]);
    u.lang = LANG_TAG[lang];
    if (this.voice) u.voice = this.voice;
    u.rate = 0.95;
    u.pitch = 1.1;
    speechSynthesis.speak(u);
  }

  // ---- SFX ---------------------------------------------------------------

  private blip(
    freqs: number[],
    type: OscillatorType,
    dur: number,
    peak = 0.4
  ): void {
    if (!this.settings.sfx || !this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    freqs.forEach((f, i) => {
      const t = now + i * 0.06;
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = type;
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(this.master!);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    });
  }

  sfxCorrect(): void {
    this.blip([660, 990], 'sine', 0.18, 0.35);
  }
  sfxWrong(): void {
    this.blip([180, 120], 'sawtooth', 0.22, 0.25);
  }
  sfxCombo(level: number): void {
    // Rising arpeggio that climbs with the combo level.
    const base = 520 + Math.min(level, 8) * 60;
    this.blip([base, base * 1.25, base * 1.5], 'triangle', 0.16, 0.3);
  }
  sfxWin(): void {
    this.blip([523, 659, 784, 1046], 'triangle', 0.3, 0.4);
  }
  sfxChest(): void {
    this.blip([392, 523, 659, 880, 1046], 'sine', 0.35, 0.4);
  }
}
