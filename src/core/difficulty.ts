/**
 * difficulty.ts — adaptive difficulty to keep the player in the FLOW channel
 * (Csikszentmihalyi) / Zone of Proximal Development (Vygotsky).
 *
 * The idea: track recent performance. When the player is nailing it, nudge the
 * pace UP (so it stays exciting and they keep learning). When they stumble,
 * ease OFF (so they don't tip into frustration and quit). The level config sets
 * the baseline; this multiplies it within a safe band.
 *
 * Output is a `speedMultiplier` applied to fall time:
 *   effectiveFallSeconds = level.fallSeconds / speedMultiplier
 * (>1 = faster/harder, <1 = slower/easier).
 */

const WINDOW = 6; // how many recent answers we consider
const MIN_MULT = 0.7; // never slower than 70% of base
const MAX_MULT = 1.6; // never faster than 160% of base
const STEP_UP = 0.06; // gentle climb on a correct streak
const STEP_DOWN = 0.18; // bigger relief on a miss (forgiving by design)

export class AdaptiveDifficulty {
  private recent: boolean[] = [];
  private mult = 1.0;

  constructor(private readonly littleMode = false) {
    // Little mode (ages 5–8) starts easier and rises more slowly.
    if (littleMode) this.mult = 0.8;
  }

  /** Feed one outcome; updates the internal multiplier. */
  record(correct: boolean): void {
    this.recent.push(correct);
    if (this.recent.length > WINDOW) this.recent.shift();

    if (correct) {
      const up = this.littleMode ? STEP_UP * 0.5 : STEP_UP;
      this.mult = Math.min(MAX_MULT, this.mult + up);
    } else {
      this.mult = Math.max(MIN_MULT, this.mult - STEP_DOWN);
    }
  }

  /** Current speed multiplier (clamped). */
  get speedMultiplier(): number {
    const ceiling = this.littleMode ? 1.15 : MAX_MULT;
    return Math.min(ceiling, this.mult);
  }

  /** Recent accuracy 0..1 (used to decide intensity of celebration, etc.). */
  get recentAccuracy(): number {
    if (this.recent.length === 0) return 1;
    return this.recent.filter(Boolean).length / this.recent.length;
  }

  /** Effective fall time for a note given a base from the level config. */
  effectiveFallSeconds(baseFallSeconds: number): number {
    return baseFallSeconds / this.speedMultiplier;
  }
}
