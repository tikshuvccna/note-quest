/**
 * NoteCard.ts — a self-contained mini-staff showing ONE note in context.
 *
 * Every note the player sees is drawn WITH the full 5-line staff (and a clef,
 * and any ledger lines), with the note head at its correct line/space. So דו
 * (middle C) appears below the staff on its ledger line; מי sits on the bottom
 * line; סול on the 2nd line; etc.
 *
 * IMPORTANT (Phaser correctness): child objects are created with `scene.make.*`
 * (which builds them WITHOUT adding to the scene display list) and then added
 * to this container. The container itself is added to the scene via
 * `scene.add.existing(this)` at the end — otherwise nothing renders.
 *
 * Geometry uses the diatonic `step` from notes.ts:
 *   step 0 = bottom staff line, +1 per line-or-space upward.
 *   localY(step) = bottomLineY - step * (lineGap / 2).
 */

import Phaser from 'phaser';
import type { Note, Clef } from '../core/notes';

const CLEF_GLYPH: Record<Clef, string> = {
  treble: '\u{1D11E}', // 𝄞
  bass: '\u{1D122}', // 𝄢
};

export interface NoteCardOptions {
  width?: number;
  lineGap?: number;
  lineColor?: number;
  panel?: boolean;
  panelColor?: number;
  monochrome?: boolean;
  showLabel?: boolean;
}

export class NoteCard extends Phaser.GameObjects.Container {
  readonly note: Note;
  private head!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number, note: Note, opts: NoteCardOptions = {}) {
    super(scene, x, y);
    this.note = note;

    const lineGap = opts.lineGap ?? 16;
    const width = opts.width ?? 150;
    const lineColor = opts.lineColor ?? 0xeef0ff;

    const bottomLineY = lineGap * 2;
    const yForStep = (step: number) => bottomLineY - (step * lineGap) / 2;

    // Background panel so the white lines read on any backdrop.
    if (opts.panel) {
      const panel = scene.make.graphics({}, false);
      const ph = lineGap * 12;
      panel.fillStyle(opts.panelColor ?? 0x20234a, 0.92);
      panel.fillRoundedRect(-width / 2, -ph / 2, width, ph, 14);
      panel.lineStyle(3, 0xffffff, 0.12);
      panel.strokeRoundedRect(-width / 2, -ph / 2, width, ph, 14);
      this.add(panel);
    }

    // The 5 staff lines.
    const lines = scene.make.graphics({}, false);
    lines.lineStyle(2.5, lineColor, 0.95);
    const lineLeft = -width / 2 + lineGap * 3.2;
    const lineRight = width / 2 - lineGap * 0.6;
    for (let i = 0; i < 5; i++) {
      const ly = yForStep(i * 2);
      lines.lineBetween(lineLeft, ly, lineRight, ly);
    }
    this.add(lines);

    // Clef glyph.
    const clef = scene.make
      .text({
        x: -width / 2 + lineGap * 1.6,
        y: yForStep(4),
        text: CLEF_GLYPH[note.clef],
        style: { fontFamily: 'serif', fontSize: `${lineGap * 5}px`, color: '#ffffff' },
      }, false)
      .setOrigin(0.5, 0.5);
    this.add(clef);

    // Ledger lines for notes outside the staff.
    const noteX = lineLeft + (lineRight - lineLeft) * 0.55;
    const ledger = scene.make.graphics({}, false);
    ledger.lineStyle(2.5, lineColor, 0.95);
    const rx = lineGap * 0.72;
    if (note.step < 0) {
      for (let s = -2; s >= note.step; s -= 2) {
        const ly = yForStep(s);
        ledger.lineBetween(noteX - rx * 1.6, ly, noteX + rx * 1.6, ly);
      }
    } else if (note.step > 8) {
      for (let s = 10; s <= note.step; s += 2) {
        const ly = yForStep(s);
        ledger.lineBetween(noteX - rx * 1.6, ly, noteX + rx * 1.6, ly);
      }
    }
    this.add(ledger);

    // The note head at its correct vertical position.
    this.head = this.buildHead(scene, note, lineGap, opts);
    this.head.setPosition(noteX, yForStep(note.step));
    this.add(this.head);

    // Finally, register the whole card with the scene so it renders.
    scene.add.existing(this);
  }

  private buildHead(
    scene: Phaser.Scene,
    note: Note,
    lineGap: number,
    opts: NoteCardOptions
  ): Phaser.GameObjects.Container {
    const c = scene.make.container({ x: 0, y: 0 }, false);
    const rx = lineGap * 0.72;
    const ry = lineGap * 0.58;
    const fill = opts.monochrome ? 0x1a1a1a : note.color;

    const head = scene.make.graphics({}, false);
    head.fillStyle(fill, 1);
    head.fillEllipse(0, 0, rx * 2, ry * 2);
    head.lineStyle(2.5, opts.monochrome ? 0xffffff : 0x14152b, 1);
    head.strokeEllipse(0, 0, rx * 2, ry * 2);
    head.lineBetween(rx, 0, rx, -lineGap * 2.4); // stem
    c.add(head);

    if (opts.showLabel) {
      const t = scene.make
        .text({
          x: 0,
          y: 0,
          text: note.solfege,
          style: {
            fontFamily: 'Rubik, sans-serif',
            fontSize: `${lineGap * 0.9}px`,
            fontStyle: '700',
            color: opts.monochrome ? '#ffffff' : '#14152b',
          },
        }, false)
        .setOrigin(0.5);
      c.add(t);
    }
    return c;
  }

  get headObject(): Phaser.GameObjects.Container {
    return this.head;
  }
}
