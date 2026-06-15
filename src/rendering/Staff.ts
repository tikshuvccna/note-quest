/**
 * Staff.ts — draws a musical staff (5 lines + clef) and places note heads on it
 * using the diatonic `step` from notes.ts. Built as a Phaser Container so it can
 * be positioned, scaled, and reused by every mode.
 *
 * The clef glyph is drawn as a Unicode music symbol (𝄞 treble / 𝄢 bass) in a
 * font — cheap, scalable, no image assets. Note heads are graphics ellipses so
 * we can tint them by solfège color.
 */

import Phaser from 'phaser';
import type { Note, Clef } from '../core/notes';

export interface StaffOptions {
  width: number;
  /** vertical gap between staff lines, in px. */
  lineGap?: number;
  lineColor?: number;
}

const CLEF_GLYPH: Record<Clef, string> = {
  treble: '\u{1D11E}', // 𝄞
  bass: '\u{1D122}', // 𝄢
};

export class Staff extends Phaser.GameObjects.Container {
  readonly lineGap: number;
  readonly staffWidth: number;
  /** Y of the bottom staff line in container-local space (step 0 sits here). */
  readonly bottomLineY: number;

  private lineColor: number;

  constructor(scene: Phaser.Scene, x: number, y: number, clef: Clef, opts: StaffOptions) {
    super(scene, x, y);
    this.lineGap = opts.lineGap ?? 26;
    this.staffWidth = opts.width;
    this.lineColor = opts.lineColor ?? 0xcfd2ff;
    // Center the 5-line staff vertically around the container origin.
    this.bottomLineY = (this.lineGap * 4) / 2; // bottom line below center
    this.drawLines();
    this.drawClef(clef);
    scene.add.existing(this);
  }

  private drawLines(): void {
    const g = this.scene.add.graphics();
    g.lineStyle(3, this.lineColor, 0.9);
    for (let i = 0; i < 5; i++) {
      const y = this.bottomLineY - i * this.lineGap;
      g.lineBetween(0, y, this.staffWidth, y);
    }
    this.add(g);
  }

  private drawClef(clef: Clef): void {
    const topLineY = this.bottomLineY - this.lineGap * 4;
    const glyph = this.scene.add
      .text(this.lineGap * 0.6, (this.bottomLineY + topLineY) / 2, CLEF_GLYPH[clef], {
        fontFamily: 'serif',
        fontSize: `${this.lineGap * 4.2}px`,
        color: '#ffffff',
      })
      .setOrigin(0.2, 0.5);
    this.add(glyph);
  }

  /** Local Y for a given diatonic step (0 = bottom line). */
  yForStep(step: number): number {
    return this.bottomLineY - (step * this.lineGap) / 2;
  }

  /** Local X where note heads should sit (after the clef). */
  get noteX(): number {
    return this.lineGap * 3.2;
  }

  /**
   * Build a note-head graphic for a note (NOT added to the staff — the caller,
   * e.g. the falling-note logic, owns its position/animation). Includes ledger
   * lines if the note sits outside the staff, and an inner solfège label dot.
   */
  makeNoteHead(note: Note, showLabel = false): Phaser.GameObjects.Container {
    const c = this.scene.add.container(0, 0);
    const rx = this.lineGap * 0.62;
    const ry = this.lineGap * 0.5;

    // Ledger lines for notes outside the 5-line staff (steps <0 or >8).
    const ledger = this.scene.add.graphics();
    ledger.lineStyle(3, this.lineColor, 0.9);
    if (note.step < 0) {
      for (let s = -2; s >= note.step; s -= 2) {
        const ly = this.yForStep(s) - this.yForStep(note.step);
        ledger.lineBetween(-rx * 1.5, ly, rx * 1.5, ly);
      }
    } else if (note.step > 8) {
      for (let s = 10; s <= note.step; s += 2) {
        const ly = this.yForStep(s) - this.yForStep(note.step);
        ledger.lineBetween(-rx * 1.5, ly, rx * 1.5, ly);
      }
    }
    c.add(ledger);

    // The note head — a filled ellipse tinted by solfège color.
    const head = this.scene.add.graphics();
    head.fillStyle(note.color, 1);
    head.fillEllipse(0, 0, rx * 2, ry * 2);
    head.lineStyle(3, 0x14152b, 1);
    head.strokeEllipse(0, 0, rx * 2, ry * 2);
    c.add(head);

    if (showLabel) {
      const t = this.scene.add
        .text(0, 0, note.solfege, {
          fontFamily: 'Rubik, sans-serif',
          fontSize: `${this.lineGap * 0.8}px`,
          fontStyle: '700',
          color: '#14152b',
        })
        .setOrigin(0.5);
      c.add(t);
    }

    c.setData('note', note);
    return c;
  }
}
