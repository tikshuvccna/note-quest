/**
 * srs.ts — lightweight spaced-repetition that weights which note spawns next.
 *
 * Invisible to the kid. The idea: notes the player gets WRONG (or hasn't seen
 * in a while) should resurface more often; notes they reliably nail should
 * appear less. This keeps practice efficient and is *why* they actually retain
 * the notes — without ever feeling like a quiz.
 *
 * We keep a per-note "strength" (a Leitner-ish box, 0..MAX). Correct → strength
 * up (seen less). Wrong → strength reset toward 0 (seen more). Spawn weight is
 * the inverse of strength, plus a recency bonus so nothing is starved forever.
 */

const MAX_STRENGTH = 5;

export interface NoteStat {
  /** 0 = weak/new (show often), MAX_STRENGTH = mastered (show rarely). */
  strength: number;
  /** Monotonic counter of the last round-tick this note was shown. */
  lastSeenTick: number;
}

export class Srs {
  private stats = new Map<string, NoteStat>();
  private tick = 0;
  private lastPicked: string | null = null;

  /** Ensure a stat row exists for a note id. */
  private ensure(id: string): NoteStat {
    let s = this.stats.get(id);
    if (!s) {
      s = { strength: 0, lastSeenTick: -999 };
      this.stats.set(id, s);
    }
    return s;
  }

  /** Record a correct answer: the note gets stronger (shown less often). */
  markCorrect(id: string): void {
    const s = this.ensure(id);
    s.strength = Math.min(MAX_STRENGTH, s.strength + 1);
  }

  /** Record a wrong answer: the note gets much weaker (shown more often). */
  markWrong(id: string): void {
    const s = this.ensure(id);
    s.strength = Math.max(0, s.strength - 2);
  }

  /**
   * Pick the next note id from a pool, weighted by need.
   * Weight = (MAX_STRENGTH + 1 - strength) [weakness] + recency bonus.
   * `rng` lets tests inject determinism; defaults to Math.random.
   */
  pick(pool: string[], rng: () => number = Math.random): string {
    if (pool.length === 0) throw new Error('srs.pick: empty pool');
    this.tick++;

    // Anti-repeat: never show the same note twice in a row when the pool has
    // alternatives. This is what prevents a "do do do do" streak even if one
    // note's SRS weight is high.
    const candidates =
      pool.length > 1 ? pool.filter((id) => id !== this.lastPicked) : pool;

    const weights = candidates.map((id) => {
      const s = this.ensure(id);
      // Mild weakness bias (weak notes appear a bit more), capped so one note
      // can't dominate.
      const weakness = 1 + (MAX_STRENGTH - s.strength) * 0.4; // 1..3
      // COVERAGE: the longer a note has gone unseen, the more its weight grows
      // — UNBOUNDED. This guarantees every note in the pool keeps reappearing
      // (so a "mastered" note like מי is never starved out) and breaks any
      // predictable do-re-do-re pattern.
      const sinceSeen = this.tick - s.lastSeenTick;
      const coverage = Math.max(0, sinceSeen - 1) * 1.2;
      return weakness + coverage;
    });

    const total = weights.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    let chosen = candidates[candidates.length - 1];
    for (let i = 0; i < candidates.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        chosen = candidates[i];
        break;
      }
    }
    this.ensure(chosen).lastSeenTick = this.tick;
    this.lastPicked = chosen;
    return chosen;
  }

  /** Average mastery across a pool, 0..1 — used by results/quests. */
  masteryOf(pool: string[]): number {
    if (pool.length === 0) return 0;
    const sum = pool.reduce((acc, id) => acc + this.ensure(id).strength, 0);
    return sum / (pool.length * MAX_STRENGTH);
  }

  /** Serialize for saving. */
  toJSON(): Record<string, NoteStat> {
    return Object.fromEntries(this.stats);
  }

  /** Restore from a saved blob. */
  static fromJSON(data: Record<string, NoteStat> | undefined): Srs {
    const srs = new Srs();
    if (data) {
      for (const [id, stat] of Object.entries(data)) {
        srs.stats.set(id, { ...stat });
      }
    }
    return srs;
  }
}
