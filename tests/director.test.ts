import { describe, it, expect, beforeEach } from 'vitest';
import { pickEncounter } from '../src/core/director';
import { game } from '../src/core/gameState';
import { defaultSave } from '../src/core/progress';
import { getWorld } from '../src/core/curriculum';

// The director reads game.isLittle, so set up a minimal game.data.
beforeEach(() => {
  game.data = defaultSave();
});

describe('encounter director', () => {
  it('always routes the last level of a world to the Boss', () => {
    const w1 = getWorld(1);
    const bossLevel = w1.levels.length;
    expect(pickEncounter(1, bossLevel)).toBe('Boss');
  });

  it('honors a forced encounter (the Practice easy option)', () => {
    const w1 = getWorld(1);
    const bossLevel = w1.levels.length;
    // Even on a boss level, forcing Catcher wins.
    expect(pickEncounter(1, bossLevel, 'Catcher')).toBe('Catcher');
  });

  it('little mode stays gentle (no high-pressure SpeedRun, no Boss) on non-boss levels', () => {
    game.data.ageMode = 'little';
    const gentle = ['Catcher', 'Quiz', 'BuildNote'];
    for (let lvl = 1; lvl < getWorld(1).levels.length; lvl++) {
      const enc = pickEncounter(1, lvl);
      expect(gentle).toContain(enc);
    }
  });

  it('non-boss kids levels never return Boss', () => {
    for (let lvl = 1; lvl < getWorld(2).levels.length; lvl++) {
      for (let trial = 0; trial < 30; trial++) {
        const enc = pickEncounter(2, lvl);
        expect(enc).not.toBe('Boss');
      }
    }
  });

  it('kids rotation can produce all five varied modes across worlds/levels', () => {
    const seen = new Set<string>();
    for (let w = 1; w <= 8; w++)
      for (let lvl = 1; lvl <= 6; lvl++)
        for (let t = 0; t < 10; t++) seen.add(pickEncounter(w, lvl));
    for (const m of ['Catcher', 'Quiz', 'SpeedRun', 'BuildNote', 'MemoryEcho']) {
      expect(seen.has(m)).toBe(true);
    }
  });
});
