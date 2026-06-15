import { describe, it, expect } from 'vitest';
import {
  buildNoteRange,
  trebleNote,
  notesForClef,
  SOLFEGE_COLORS,
} from '../src/core/notes';

describe('notes model', () => {
  it('middle C (דו4) is C4 = MIDI 60, treble, one step below bottom line', () => {
    const c4 = trebleNote('דו', 4);
    expect(c4.midi).toBe(60);
    expect(c4.solfege).toBe('דו');
    // Treble bottom line (step 0) is E4. C4 is a third below → step -2.
    expect(c4.step).toBe(-2);
    expect(c4.needsLedger).toBe(true); // middle C sits on a ledger line
  });

  it('maps letters to the correct Hebrew solfège names', () => {
    const range = buildNoteRange('treble', 'C', 4, 7); // C D E F G A B
    expect(range.map((n) => n.solfege)).toEqual([
      'דו', 'רה', 'מי', 'פה', 'סול', 'לה', 'סי',
    ]);
  });

  it('E4 sits exactly on the bottom treble line (step 0, no ledger)', () => {
    const e4 = trebleNote('מי', 4);
    expect(e4.step).toBe(0);
    expect(e4.needsLedger).toBe(false);
  });

  it('each consecutive natural note is one diatonic step apart', () => {
    const range = buildNoteRange('treble', 'C', 4, 8);
    for (let i = 1; i < range.length; i++) {
      expect(range[i].step - range[i - 1].step).toBe(1);
    }
  });

  it('every note gets a color matching its solfège', () => {
    for (const n of notesForClef('treble')) {
      expect(n.color).toBe(SOLFEGE_COLORS[n.solfege]);
    }
  });

  it('MIDI rises by 12 per octave for the same letter', () => {
    const c4 = trebleNote('דו', 4);
    const c5 = trebleNote('דו', 5);
    expect(c5.midi - c4.midi).toBe(12);
  });
});
