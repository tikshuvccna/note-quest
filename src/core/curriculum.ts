/**
 * curriculum.ts — the learning progression: worlds → levels.
 *
 * Each world introduces a new set of notes and has its own VISUAL STYLE (colors,
 * theme) so the journey feels like travelling through different lands — not the
 * same screen recolored. Worlds grow from a single note (דו) up through the full
 * octave and then into HIGHER OCTAVES (the user asked for more than one octave).
 *
 * Note ids reference the treble catalogue in notes.ts.
 */

import { trebleNote, type Note, type Solfege } from './notes';

export interface WorldStyle {
  /** background color of gameplay in this world. */
  bg: number;
  /** accent/title color. */
  accent: number;
  /** staff line color. */
  line: number;
  /** short theme name shown on the world card. */
  theme: string;
}

export interface LevelConfig {
  index: number;
  targetNotes: number;
  fallSeconds: number;
  maxConcurrent: number;
}

export interface WorldConfig {
  id: number;
  title: string;
  notePool: Note[];
  newSolfege: Solfege[];
  style: WorldStyle;
  levels: LevelConfig[];
}

function makeLevels(count: number): LevelConfig[] {
  const levels: LevelConfig[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1);
    levels.push({
      index: i + 1,
      targetNotes: Math.round(8 + t * 12),
      fallSeconds: +(4.5 - t * 2.0).toFixed(2),
      maxConcurrent: 1 + Math.floor(t * 2),
    });
  }
  return levels;
}

// ---- Note pools (cumulative, then climbing octaves) ----------------------

// Octave 4 (around middle C).
const C4 = trebleNote('דו', 4);
const D4 = trebleNote('רה', 4);
const E4 = trebleNote('מי', 4);
const F4 = trebleNote('פה', 4);
const G4 = trebleNote('סול', 4);
const A4 = trebleNote('לה', 4);
const B4 = trebleNote('סי', 4);
// Octave 5 (higher up the staff / above it).
const C5 = trebleNote('דו', 5);
const D5 = trebleNote('רה', 5);
const E5 = trebleNote('מי', 5);
const F5 = trebleNote('פה', 5);
const G5 = trebleNote('סול', 5);
const A5 = trebleNote('לה', 5);
const B5 = trebleNote('סי', 5);
// Octave 6 (high ledger territory).
const C6 = trebleNote('דו', 6);
const D6 = trebleNote('רה', 6);
const E6 = trebleNote('מי', 6);

const POOL_W1 = [C4];
const POOL_W2 = [C4, D4, E4];
const POOL_W3 = [C4, D4, E4, F4, G4];
const POOL_W4 = [C4, D4, E4, F4, G4, A4, B4]; // full first octave
const POOL_W5 = [G4, A4, B4, C5, D5, E5]; // bridge into 2nd octave
const POOL_W6 = [C5, D5, E5, F5, G5, A5, B5]; // full 2nd octave
const POOL_W7 = [C4, E4, G4, C5, E5, G5, C6]; // mixed octaves, wide leaps
const POOL_W8 = [G5, A5, B5, C6, D6, E6]; // high ledger lines

// ---- World styles --------------------------------------------------------

const STYLES: WorldStyle[] = [
  { bg: 0x14152b, accent: 0xffd23f, line: 0xeef0ff, theme: '🌱 התחלה' },
  { bg: 0x10243a, accent: 0x4fc3f7, line: 0xe1f5fe, theme: '🌊 הים' },
  { bg: 0x0f2e1d, accent: 0x66bb6a, line: 0xe8f5e9, theme: '🌳 היער' },
  { bg: 0x2e1133, accent: 0xba68c8, line: 0xf3e5f5, theme: '🔮 הקסם' },
  { bg: 0x33240f, accent: 0xffb74d, line: 0xfff3e0, theme: '🏜️ המדבר' },
  { bg: 0x0c1530, accent: 0x7986cb, line: 0xe8eaf6, theme: '🌌 החלל' },
  { bg: 0x2b0f17, accent: 0xff7043, line: 0xfbe9e7, theme: '🌋 הר הגעש' },
  { bg: 0x07232b, accent: 0x4dd0e1, line: 0xe0f7fa, theme: '❄️ הקרח' },
];

export const WORLDS: WorldConfig[] = [
  { id: 1, title: 'עולם דּו', notePool: POOL_W1, newSolfege: ['דו'], style: STYLES[0], levels: makeLevels(5) },
  { id: 2, title: 'דו · רה · מי', notePool: POOL_W2, newSolfege: ['רה', 'מי'], style: STYLES[1], levels: makeLevels(6) },
  { id: 3, title: 'פה · סול', notePool: POOL_W3, newSolfege: ['פה', 'סול'], style: STYLES[2], levels: makeLevels(6) },
  { id: 4, title: 'לה · סי — אוקטבה שלמה', notePool: POOL_W4, newSolfege: ['לה', 'סי'], style: STYLES[3], levels: makeLevels(7) },
  { id: 5, title: 'אל האוקטבה השנייה', notePool: POOL_W5, newSolfege: ['דו'], style: STYLES[4], levels: makeLevels(7) },
  { id: 6, title: 'אוקטבה גבוהה', notePool: POOL_W6, newSolfege: [], style: STYLES[5], levels: makeLevels(7) },
  { id: 7, title: 'קפיצות גדולות', notePool: POOL_W7, newSolfege: [], style: STYLES[6], levels: makeLevels(8) },
  { id: 8, title: 'גבהים — קווי עזר', notePool: POOL_W8, newSolfege: [], style: STYLES[7], levels: makeLevels(8) },
];

export function getWorld(id: number): WorldConfig {
  const w = WORLDS.find((w) => w.id === id);
  if (!w) throw new Error(`Unknown world: ${id}`);
  return w;
}

export function getLevel(worldId: number, levelIndex: number): LevelConfig {
  const lvl = getWorld(worldId).levels.find((l) => l.index === levelIndex);
  if (!lvl) throw new Error(`Unknown level ${worldId}-${levelIndex}`);
  return lvl;
}

export function isBossLevel(worldId: number, levelIndex: number): boolean {
  return levelIndex === getWorld(worldId).levels.length;
}

export function totalLevels(): number {
  return WORLDS.reduce((sum, w) => sum + w.levels.length, 0);
}
