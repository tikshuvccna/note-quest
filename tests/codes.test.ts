import { describe, it, expect } from 'vitest';
import {
  redeemCode,
  worldForCode,
  isAdminCode,
  WORLD_CODES,
  ADMIN_CODE,
} from '../src/core/codes';
import { defaultSave, isLevelUnlocked, isLessonDone } from '../src/core/progress';
import { getWorld } from '../src/core/curriculum';

describe('resume codes', () => {
  it('maps each world code to its world (case/space-insensitive)', () => {
    expect(worldForCode(WORLD_CODES[3])).toBe(3);
    expect(worldForCode(WORLD_CODES[3].toLowerCase())).toBe(3);
    expect(worldForCode('  ' + WORLD_CODES[3] + ' ')).toBe(3);
    expect(worldForCode('not-a-code')).toBeNull();
  });

  it('redeeming a world code opens ALL stages of prior worlds, world N fresh', () => {
    const d = defaultSave();
    expect(isLevelUnlocked(d, 4, 1)).toBe(false);
    const res = redeemCode(d, WORLD_CODES[4]);
    expect(res).toEqual({ kind: 'world', world: 4 });

    // Every stage of worlds 1..3 is now playable (not just level 1).
    for (let w = 1; w < 4; w++) {
      const count = getWorld(w).levels.length;
      for (let lvl = 1; lvl <= count; lvl++) {
        expect(isLevelUnlocked(d, w, lvl)).toBe(true);
      }
      expect(isLessonDone(d, w)).toBe(true);
    }

    // World 4 is reachable but FRESH — level 1 open, deeper levels still locked.
    expect(isLevelUnlocked(d, 4, 1)).toBe(true);
    expect(isLevelUnlocked(d, 4, 2)).toBe(false);
    expect(isLessonDone(d, 4)).toBe(false);
  });

  it('does not erase higher progress when redeeming a lower code', () => {
    const d = defaultSave();
    d.levelStars['1-1'] = 3; // already mastered
    redeemCode(d, WORLD_CODES[2]);
    expect(d.levelStars['1-1']).toBe(3); // unchanged
  });

  it('an invalid code changes nothing', () => {
    const d = defaultSave();
    const before = JSON.stringify(d);
    expect(redeemCode(d, 'wrongcode')).toEqual({ kind: 'invalid' });
    expect(JSON.stringify(d)).toBe(before);
  });

  it('recognizes the admin code and reports it (no unlock side effects)', () => {
    const d = defaultSave();
    expect(isAdminCode(ADMIN_CODE)).toBe(true);
    expect(isAdminCode('maestro')).toBe(true);
    const before = JSON.stringify(d);
    expect(redeemCode(d, ADMIN_CODE)).toEqual({ kind: 'admin' });
    expect(JSON.stringify(d)).toBe(before); // admin code itself unlocks nothing
  });

  it('all 8 world codes are unique', () => {
    const codes = Object.values(WORLD_CODES).map((c) => c.toUpperCase());
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).not.toContain(ADMIN_CODE);
  });
});
