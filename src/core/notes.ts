/**
 * notes.ts — the single source of truth for the music-theory model.
 *
 * Every note knows its Hebrew solfège name, its clef, where it sits on the
 * staff, its MIDI number (for playing the real pitch), and its color.
 * Rendering, answer-checking, the piano pitch, and the spoken voice clip all
 * derive from this one model.
 *
 * STAFF POSITION ("step") — the core idea:
 *   We measure vertical position in *diatonic steps* from the bottom line of
 *   the staff. One step = one half of a line-spacing (a line OR a space).
 *     step 0  = bottom line
 *     step 1  = first space above it
 *     step 2  = second line ... etc.
 *   Negative steps go below the bottom line (ledger lines / below-staff).
 *   This makes the renderer trivial: y = staffBottomY - step * (lineGap / 2).
 */

/** The seven fixed-do solfège names, in Hebrew. */
export type Solfege = 'דו' | 'רה' | 'מי' | 'פה' | 'סול' | 'לה' | 'סי';

export const SOLFEGE_ORDER: Solfege[] = ['דו', 'רה', 'מי', 'פה', 'סול', 'לה', 'סי'];

export type Clef = 'treble' | 'bass';

/** Boomwhacker-style solfège colors — consistent name→color across the game. */
export const SOLFEGE_COLORS: Record<Solfege, number> = {
  דו: 0xe53935, // red
  רה: 0xfb8c00, // orange
  מי: 0xfdd835, // yellow
  פה: 0x43a047, // green
  סול: 0x1e88e5, // blue
  לה: 0x8e24aa, // purple
  סי: 0xec407a, // pink
};

export interface Note {
  /** Stable id, e.g. "treble-C4". */
  id: string;
  solfege: Solfege;
  clef: Clef;
  /** Diatonic step from the bottom staff line (see header). */
  step: number;
  /** MIDI note number — drives the real piano pitch. */
  midi: number;
  /** Octave number (scientific pitch notation, e.g. C4 = middle C). */
  octave: number;
  color: number;
  /** True if the note needs ledger line(s) above/below the staff. */
  needsLedger: boolean;
}

/** Map a chromatic letter to its solfège name (natural notes only for now). */
const LETTER_TO_SOLFEGE: Record<string, Solfege> = {
  C: 'דו',
  D: 'רה',
  E: 'מי',
  F: 'פה',
  G: 'סול',
  A: 'לה',
  B: 'סי',
};

/** Semitone offset of each natural letter within an octave (C = 0). */
const LETTER_SEMITONE: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

/** Diatonic index of each letter (C = 0 ... B = 6). */
const LETTER_DIATONIC: Record<string, number> = {
  C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6,
};

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;

/** MIDI number for a letter+octave (scientific pitch: C4 = 60). */
function midiFor(letter: string, octave: number): number {
  return (octave + 1) * 12 + LETTER_SEMITONE[letter];
}

/**
 * Continuous diatonic index across octaves (C4 = 4*7 + 0 = 28).
 * Difference between two notes' diatonic indices = number of staff steps apart.
 */
function diatonicIndex(letter: string, octave: number): number {
  return octave * 7 + LETTER_DIATONIC[letter];
}

/**
 * Reference note that sits on the BOTTOM LINE of each clef (step 0):
 *   Treble: E4 (bottom line of treble staff).
 *   Bass:   G2 (bottom line of bass staff).
 */
const STAFF_BOTTOM: Record<Clef, { letter: string; octave: number }> = {
  treble: { letter: 'E', octave: 4 },
  bass: { letter: 'G', octave: 2 },
};

function buildNote(letter: string, octave: number, clef: Clef): Note {
  const bottom = STAFF_BOTTOM[clef];
  const step = diatonicIndex(letter, octave) - diatonicIndex(bottom.letter, bottom.octave);
  // Staff spans step 0..8 (5 lines). Outside that range = ledger territory.
  const needsLedger = step < 0 || step > 8;
  return {
    id: `${clef}-${letter}${octave}`,
    solfege: LETTER_TO_SOLFEGE[letter],
    clef,
    step,
    midi: midiFor(letter, octave),
    octave,
    color: SOLFEGE_COLORS[LETTER_TO_SOLFEGE[letter]],
    needsLedger,
  };
}

/**
 * Build a contiguous run of notes for a clef, from (startLetter,startOctave)
 * upward for `count` natural notes.
 */
export function buildNoteRange(
  clef: Clef,
  startLetter: string,
  startOctave: number,
  count: number
): Note[] {
  const out: Note[] = [];
  let li = LETTERS.indexOf(startLetter as (typeof LETTERS)[number]);
  let oct = startOctave;
  for (let i = 0; i < count; i++) {
    const letter = LETTERS[li];
    out.push(buildNote(letter, oct, clef));
    li++;
    if (li >= LETTERS.length) {
      li = 0;
      oct++;
    }
  }
  return out;
}

/**
 * The catalogue of every note the game knows, keyed by id.
 * Treble range: C4 (middle C, one ledger below) up to G5 (top of staff area).
 * Bass range:  C3 up to C4 — reserved for later worlds.
 */
function buildCatalogue(): Map<string, Note> {
  const all: Note[] = [
    ...buildNoteRange('treble', 'C', 4, 22), // C4 .. A6 (≈3 octaves of treble)
    ...buildNoteRange('bass', 'C', 2, 15), // C2 .. C4
  ];
  const map = new Map<string, Note>();
  for (const n of all) map.set(n.id, n);
  return map;
}

export const NOTE_CATALOGUE: Map<string, Note> = buildCatalogue();

export function getNote(id: string): Note {
  const n = NOTE_CATALOGUE.get(id);
  if (!n) throw new Error(`Unknown note id: ${id}`);
  return n;
}

/** All notes for a given clef that the catalogue knows about. */
export function notesForClef(clef: Clef): Note[] {
  return [...NOTE_CATALOGUE.values()].filter((n) => n.clef === clef);
}

/** Convenience: find a treble note by its solfège + octave (first match). */
export function trebleNote(solfege: Solfege, octave: number): Note {
  const found = [...NOTE_CATALOGUE.values()].find(
    (n) => n.clef === 'treble' && n.solfege === solfege && n.octave === octave
  );
  if (!found) throw new Error(`No treble ${solfege}${octave}`);
  return found;
}
