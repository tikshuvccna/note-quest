import { describe, it, expect } from 'vitest';
import {
  defaultSave,
  load,
  save,
  recordStars,
  totalStars,
  isLevelUnlocked,
  touchDailyStreak,
  starsFor,
  isLessonDone,
  markLessonDone,
  type KeyValueStore,
} from '../src/core/progress';

/** In-memory store for tests. */
function memStore(): KeyValueStore & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

describe('progress save/load', () => {
  it('round-trips through storage', () => {
    const store = memStore();
    const d = defaultSave();
    d.trophies = 123;
    d.coins = 45;
    save(store, d);
    const loaded = load(store);
    expect(loaded.trophies).toBe(123);
    expect(loaded.coins).toBe(45);
  });

  it('returns defaults for empty/corrupt storage', () => {
    const store = memStore();
    expect(load(store).trophies).toBe(0);
    store.data['note-quest:save:v1'] = '{not json';
    expect(load(store).trophies).toBe(0);
  });

  it('records only improved star counts', () => {
    const d = defaultSave();
    expect(recordStars(d, 1, 1, 2)).toBe(true);
    expect(recordStars(d, 1, 1, 1)).toBe(false); // not an improvement
    expect(recordStars(d, 1, 1, 3)).toBe(true);
    expect(totalStars(d)).toBe(3);
  });
});

describe('level unlocking', () => {
  it('world 1 level 1 is always unlocked; level 2 needs a star', () => {
    const d = defaultSave();
    expect(isLevelUnlocked(d, 1, 1)).toBe(true);
    expect(isLevelUnlocked(d, 1, 2)).toBe(false);
    recordStars(d, 1, 1, 1);
    expect(isLevelUnlocked(d, 1, 2)).toBe(true);
  });

  it('next world unlocks after any star in the previous world', () => {
    const d = defaultSave();
    expect(isLevelUnlocked(d, 2, 1)).toBe(false);
    recordStars(d, 1, 3, 2);
    expect(isLevelUnlocked(d, 2, 1)).toBe(true);
  });
});

describe('daily streak', () => {
  it('increments on consecutive days, resets on a gap', () => {
    const d = defaultSave();
    expect(touchDailyStreak(d, '2026-06-08')).toBe(1);
    expect(touchDailyStreak(d, '2026-06-08')).toBe(1); // same day, no change
    expect(touchDailyStreak(d, '2026-06-09')).toBe(2); // next day
    expect(touchDailyStreak(d, '2026-06-12')).toBe(1); // gap → reset
  });
});

describe('star rating', () => {
  it('maps accuracy to stars only when completed', () => {
    expect(starsFor(1.0, false)).toBe(0);
    expect(starsFor(0.5, true)).toBe(1);
    expect(starsFor(0.85, true)).toBe(2);
    expect(starsFor(0.97, true)).toBe(3);
  });
});

describe('world lessons (teaching gate)', () => {
  it('a world starts un-taught and is marked done once', () => {
    const d = defaultSave();
    expect(isLessonDone(d, 2)).toBe(false);
    markLessonDone(d, 2);
    expect(isLessonDone(d, 2)).toBe(true);
    markLessonDone(d, 2); // idempotent
    expect(d.lessonsDone.filter((w) => w === 2).length).toBe(1);
    expect(isLessonDone(d, 3)).toBe(false);
  });

  it('lessonsDone survives a save/load round-trip', () => {
    const store = memStore();
    const d = defaultSave();
    markLessonDone(d, 1);
    save(store, d);
    expect(isLessonDone(load(store), 1)).toBe(true);
  });
});
