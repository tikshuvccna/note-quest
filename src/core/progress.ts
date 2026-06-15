/**
 * progress.ts — all persistent player state, saved to localStorage.
 *
 * Tracks the four parallel progression tracks (world-map stars, trophies,
 * creature collection, daily streak) plus settings and the SRS blob. Pure
 * data + a thin save/load wrapper so it's easy to unit-test (inject a custom
 * storage in tests).
 */

import type { NoteStat } from './srs';

const STORAGE_KEY = 'note-quest:save:v1';

export type AgeMode = 'kids' | 'little'; // 9–12 default, 5–8 "little"

/** Spoken note-name language (all use do/re/mi solfège). */
export type VoiceLang = 'it' | 'fr' | 'es';

export interface SoundSettings {
  voice: boolean; // spoken note name
  voiceLang: VoiceLang; // which European language speaks it
  pitch: boolean; // real piano pitch sounds
  sfx: boolean;
  music: boolean;
}

/** Visual / gameplay preferences (separate from sound). */
export interface VisualSettings {
  /** color-code note heads by solfège (default) vs. black notes. */
  colorNotes: boolean;
  /** show the solfège letter inside the note head (extra training wheel). */
  showLabels: boolean;
}

export interface SaveData {
  /** stars earned per level, keyed "world-level" → 0..3. */
  levelStars: Record<string, number>;
  /** total trophies (drives trophy road + chest unlocks). */
  trophies: number;
  /** soft currency. */
  coins: number;
  /** owned creature (Noteling) ids. */
  creatures: string[];
  /** consecutive-day login streak. */
  streak: number;
  /** ISO date (yyyy-mm-dd) of the last day the player opened the game. */
  lastPlayedDate: string | null;
  ageMode: AgeMode;
  /** Easy mode: everything runs 50% slower (speed only — difficulty unchanged). */
  easyMode: boolean;
  /** World ids whose intro lesson the player has completed (the practice gate). */
  lessonsDone: number[];
  sound: SoundSettings;
  visual: VisualSettings;
  /** SRS strength table. */
  srs: Record<string, NoteStat>;
}

export function defaultSave(): SaveData {
  return {
    levelStars: {},
    trophies: 0,
    coins: 0,
    creatures: [],
    streak: 0,
    lastPlayedDate: null,
    ageMode: 'kids',
    easyMode: false,
    lessonsDone: [],
    sound: { voice: true, voiceLang: 'it', pitch: true, sfx: true, music: true },
    visual: { colorNotes: true, showLabels: false },
    srs: {},
  };
}

export function levelKey(world: number, level: number): string {
  return `${world}-${level}`;
}

/** A minimal storage interface so tests can pass an in-memory stub. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function load(store: KeyValueStore): SaveData {
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const def = defaultSave();
    // Merge over defaults so older saves gain new fields safely.
    return {
      ...def,
      ...parsed,
      sound: { ...def.sound, ...parsed.sound },
      visual: { ...def.visual, ...parsed.visual },
    };
  } catch {
    return defaultSave();
  }
}

export function save(store: KeyValueStore, data: SaveData): void {
  store.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Has the player completed the intro lesson (practice gate) for a world? */
export function isLessonDone(data: SaveData, world: number): boolean {
  return data.lessonsDone.includes(world);
}

/** Mark a world's intro lesson as completed. */
export function markLessonDone(data: SaveData, world: number): void {
  if (!data.lessonsDone.includes(world)) data.lessonsDone.push(world);
}

/** Record best (highest) star count for a level. Returns true if improved. */
export function recordStars(
  data: SaveData,
  world: number,
  level: number,
  stars: number
): boolean {
  const key = levelKey(world, level);
  const prev = data.levelStars[key] ?? 0;
  if (stars > prev) {
    data.levelStars[key] = stars;
    return true;
  }
  return false;
}

/** Total stars across all levels (for the world-map header). */
export function totalStars(data: SaveData): number {
  return Object.values(data.levelStars).reduce((a, b) => a + b, 0);
}

/**
 * A level is unlocked if it's the first level overall, or the previous level
 * in the same world has at least 1 star, or it's the first level of a world
 * whose previous world is fully started.
 */
export function isLevelUnlocked(
  data: SaveData,
  world: number,
  level: number
): boolean {
  if (world === 1 && level === 1) return true;
  if (level > 1) return (data.levelStars[levelKey(world, level - 1)] ?? 0) > 0;
  // First level of a later world: need ≥1 star somewhere in the previous world.
  const prevWorld = world - 1;
  return Object.keys(data.levelStars).some(
    (k) => k.startsWith(`${prevWorld}-`) && data.levelStars[k] > 0
  );
}

/**
 * Update the daily streak based on today's date. Call once on app open.
 * Returns the (possibly bumped) streak.
 */
export function touchDailyStreak(data: SaveData, today: string): number {
  if (data.lastPlayedDate === today) return data.streak; // already counted today
  if (data.lastPlayedDate && isYesterday(data.lastPlayedDate, today)) {
    data.streak += 1;
  } else {
    data.streak = 1; // reset (or first ever)
  }
  data.lastPlayedDate = today;
  return data.streak;
}

function isYesterday(prev: string, today: string): boolean {
  const p = new Date(prev + 'T00:00:00');
  const t = new Date(today + 'T00:00:00');
  const diffDays = Math.round((t.getTime() - p.getTime()) / 86_400_000);
  return diffDays === 1;
}

/** Convert level performance to a 1–3 star rating. */
export function starsFor(accuracy: number, completed: boolean): number {
  if (!completed) return 0;
  if (accuracy >= 0.95) return 3;
  if (accuracy >= 0.8) return 2;
  return 1;
}
