import { describe, it, expect } from 'vitest';
import { Srs } from '../src/core/srs';

describe('SRS spaced repetition', () => {
  it('a wrong note is picked more often than a mastered one (3+ note pool)', () => {
    const srs = new Srs();
    // Need ≥3 notes so the anti-repeat rule (no two-in-a-row) doesn't force a
    // strict alternation that masks the weakness bias.
    const pool = ['A', 'B', 'C'];
    for (let i = 0; i < 5; i++) srs.markCorrect('A'); // mastered
    for (let i = 0; i < 5; i++) srs.markCorrect('C'); // mastered
    for (let i = 0; i < 5; i++) srs.markWrong('B'); // weak

    const counts: Record<string, number> = { A: 0, B: 0, C: 0 };
    for (let i = 0; i < 600; i++) counts[srs.pick(pool, Math.random)]++;
    expect(counts.B).toBeGreaterThan(counts.A);
    expect(counts.B).toBeGreaterThan(counts.C);
  });

  it('never picks the same note twice in a row (anti "do do do")', () => {
    const srs = new Srs();
    const pool = ['A', 'B', 'C'];
    let prev = '';
    for (let i = 0; i < 500; i++) {
      const p = srs.pick(pool, Math.random);
      expect(p).not.toBe(prev);
      prev = p;
    }
  });

  it('mastery increases with correct answers', () => {
    const srs = new Srs();
    expect(srs.masteryOf(['X'])).toBe(0);
    for (let i = 0; i < 5; i++) srs.markCorrect('X');
    expect(srs.masteryOf(['X'])).toBe(1);
  });

  it('serializes and restores strength', () => {
    const srs = new Srs();
    srs.markCorrect('Q');
    srs.markCorrect('Q');
    const json = srs.toJSON();
    const restored = Srs.fromJSON(json);
    expect(restored.masteryOf(['Q'])).toBeCloseTo(srs.masteryOf(['Q']));
  });

  it('never returns a note outside the pool', () => {
    const srs = new Srs();
    const pool = ['only'];
    for (let i = 0; i < 20; i++) expect(srs.pick(pool)).toBe('only');
  });
});
