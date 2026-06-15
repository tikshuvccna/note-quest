import { describe, it, expect } from 'vitest';
import { AdaptiveDifficulty } from '../src/core/difficulty';

describe('adaptive difficulty (flow / ZPD)', () => {
  it('speeds up on a correct streak', () => {
    const d = new AdaptiveDifficulty(false);
    const before = d.speedMultiplier;
    for (let i = 0; i < 5; i++) d.record(true);
    expect(d.speedMultiplier).toBeGreaterThan(before);
  });

  it('eases off after a miss (forgiving)', () => {
    const d = new AdaptiveDifficulty(false);
    for (let i = 0; i < 5; i++) d.record(true);
    const fast = d.speedMultiplier;
    d.record(false);
    expect(d.speedMultiplier).toBeLessThan(fast);
  });

  it('clamps within a safe band', () => {
    const d = new AdaptiveDifficulty(false);
    for (let i = 0; i < 100; i++) d.record(true);
    expect(d.speedMultiplier).toBeLessThanOrEqual(1.6);
    for (let i = 0; i < 100; i++) d.record(false);
    expect(d.speedMultiplier).toBeGreaterThanOrEqual(0.7);
  });

  it('little mode is gentler (lower ceiling, slower start)', () => {
    const little = new AdaptiveDifficulty(true);
    const kids = new AdaptiveDifficulty(false);
    expect(little.speedMultiplier).toBeLessThan(kids.speedMultiplier);
    for (let i = 0; i < 100; i++) little.record(true);
    expect(little.speedMultiplier).toBeLessThanOrEqual(1.15);
  });

  it('effective fall time shrinks as multiplier grows', () => {
    const d = new AdaptiveDifficulty(false);
    const base = 4;
    const slow = d.effectiveFallSeconds(base);
    for (let i = 0; i < 5; i++) d.record(true);
    expect(d.effectiveFallSeconds(base)).toBeLessThan(slow);
  });
});
