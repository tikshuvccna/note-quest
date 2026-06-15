/**
 * BuildNoteScene — "בנה את התו / Build the Note": the REVERSE challenge.
 *
 * Instead of reading a note and naming it, the game NAMES a note (shows the
 * Hebrew solfège + speaks it) and the player taps the correct POSITION on a
 * staff. This trains name→position, the other half of fluent reading.
 *
 * The staff shows tappable "slots" at every line and space across the pool's
 * range. Tapping the slot whose diatonic step matches the prompted note = right.
 * It does NOT use the shared solfège button pad (overrides buildButtons).
 */

import Phaser from 'phaser';
import { GAME_WIDTH } from '../../core/layout';
import { game } from '../../core/gameState';
import type { Note } from '../../core/notes';
import { SOLFEGE_COLORS } from '../../core/notes';
import { BaseGameScene } from './BaseGameScene';
import * as juice from '../../core/juice';

const STAFF_CX = GAME_WIDTH / 2;
const STAFF_CY = 430;
const LINE_GAP = 34;

interface Slot {
  step: number;
  x: number;
  y: number;
  zone: Phaser.GameObjects.Zone;
  dot: Phaser.GameObjects.Graphics;
}

export class BuildNoteScene extends BaseGameScene {
  private slots: Slot[] = [];
  private prompt!: Phaser.GameObjects.Text;
  private current?: Note;
  private accepting = false;

  constructor() {
    super('BuildNote');
  }

  /** This mode uses a tappable staff, not the solfège button pad. */
  protected override buildButtons(): void {
    /* intentionally empty */
  }

  protected startEncounter(): void {
    this.buildStaff();
    this.buildPrompt();
    this.nextPrompt();
  }

  // ---- Staff with tappable slots ----------------------------------------

  private staffWidth(): number {
    return Math.min(GAME_WIDTH - 260, 620);
  }

  private yForStep(step: number): number {
    // step 0 = bottom line; centre the 5-line staff on STAFF_CY.
    const bottomLineY = STAFF_CY + LINE_GAP * 2;
    return bottomLineY - (step * LINE_GAP) / 2;
  }

  private buildStaff(): void {
    const w = this.staffWidth();
    const left = STAFF_CX - w / 2;
    const right = STAFF_CX + w / 2;

    const g = this.add.graphics().setDepth(20);
    g.lineStyle(3, this.world.style.line, 0.95);
    for (let i = 0; i < 5; i++) {
      const y = this.yForStep(i * 2);
      g.lineBetween(left + LINE_GAP * 2.5, y, right, y);
    }
    // Treble clef glyph.
    this.add
      .text(left + LINE_GAP * 1.4, this.yForStep(4), '\u{1D11E}', {
        fontFamily: 'serif',
        fontSize: `${LINE_GAP * 5}px`,
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(20);

    // Build a tappable slot for every step in the pool. Adjacent staff notes
    // are only half a line-gap apart vertically, which is too cramped to tap —
    // so we give each step its OWN COLUMN (left→right, ascending pitch), while
    // keeping the slot at its correct VERTICAL position so the staff position is
    // still what's being taught.
    const steps = [...new Set(this.world.notePool.map((n) => n.step))].sort((a, b) => a - b);
    const colLeft = left + LINE_GAP * 3.5;
    const colRight = right - LINE_GAP * 0.5;
    const colSpan = colRight - colLeft;
    steps.forEach((step, i) => {
      const x = steps.length > 1 ? colLeft + (colSpan * i) / (steps.length - 1) : (colLeft + colRight) / 2;
      const y = this.yForStep(step);
      // ledger hint for out-of-staff steps, at this column
      if (step < 0 || step > 8) {
        const l = this.add.graphics().setDepth(20);
        l.lineStyle(3, this.world.style.line, 0.9);
        l.lineBetween(x - LINE_GAP, y, x + LINE_GAP, y);
      }
      const dot = this.add.graphics().setDepth(22);
      this.drawSlot(dot, x, y, 0x000000, 0.2);
      // A generous full-height tap zone for this column so it's easy to hit.
      const zone = this.add
        .zone(x, STAFF_CY, LINE_GAP * 2.2, LINE_GAP * 9)
        .setOrigin(0.5)
        .setDepth(25)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.onSlot(step));
      this.slots.push({ step, x, y, zone, dot });
    });
  }

  private drawSlot(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number, alpha: number): void {
    g.clear();
    g.fillStyle(color, alpha);
    g.fillEllipse(x, y, LINE_GAP * 1.5, LINE_GAP * 1.15);
    g.lineStyle(2, 0xffffff, 0.25);
    g.strokeEllipse(x, y, LINE_GAP * 1.5, LINE_GAP * 1.15);
  }

  private buildPrompt(): void {
    this.add
      .text(GAME_WIDTH / 2, 150, 'איפה התו הזה?', {
        fontFamily: 'Rubik, sans-serif',
        fontSize: '34px',
        fontStyle: '700',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setAlpha(0.9);
    this.prompt = this.add
      .text(GAME_WIDTH / 2, 220, '', {
        fontFamily: 'Rubik, sans-serif',
        fontSize: '74px',
        fontStyle: '900',
        color: '#ffd23f',
      })
      .setOrigin(0.5)
      .setDepth(30);
  }

  private nextPrompt(): void {
    if (this.finished) return;
    const id = game.srs.pick(this.notePool);
    this.current = this.idToNote.get(id)!;
    const color = game.data.visual.colorNotes ? SOLFEGE_COLORS[this.current.solfege] : 0xffffff;
    this.prompt.setText(this.current.solfege).setColor(
      '#' + color.toString(16).padStart(6, '0')
    );
    juice.pop(this, this.prompt, 1.3);
    game.audio.sayNote(this.current.solfege);
    this.accepting = true;
  }

  // ---- Answer ------------------------------------------------------------

  private onSlot(step: number): void {
    if (!this.running || this.finished || !this.accepting || !this.current) return;
    this.accepting = false;
    this.attempts++;

    const slot = this.slots.find((s) => s.step === step)!;
    // Show a note head where they tapped.
    const placed = this.add.graphics().setDepth(24);
    const c = game.data.visual.colorNotes ? this.current.color : 0x1a1a1a;
    this.drawSlot(placed, slot.x, slot.y, c, 1);
    this.time.delayedCall(450, () => placed.destroy());

    if (step === this.current.step) {
      this.registerCorrect(this.current, this.makeAt(slot.x, slot.y));
    } else {
      this.registerWrong(this.current, this.makeAt(slot.x, slot.y));
      // Flash the CORRECT slot green.
      const right = this.slots.find((s) => s.step === this.current!.step);
      if (right) {
        const ring = this.add.graphics().setDepth(26);
        ring.lineStyle(5, 0x4caf50, 1);
        ring.strokeEllipse(right.x, right.y, LINE_GAP * 1.9, LINE_GAP * 1.5);
        this.tweens.add({ targets: ring, alpha: 0, duration: 700, onComplete: () => ring.destroy() });
      }
    }
  }

  /** A tiny invisible object at a point, for juice targeting in base hooks. */
  private makeAt(x: number, y: number): Phaser.GameObjects.Container {
    return this.add.container(x, y).setDepth(24);
  }

  protected resolveTarget(): { note: Note; obj: Phaser.GameObjects.Container } | null {
    return null; // not used — answers come from staff slots
  }

  protected onCorrectHook(): void {
    if (this.cleared >= this.level.targetNotes) {
      this.finish(true);
      return;
    }
    this.time.delayedCall(450, () => this.nextPrompt());
  }

  protected onWrongHook(): void {
    // Move on to a new prompt after showing the correct spot.
    this.time.delayedCall(750, () => {
      if (!this.finished) this.nextPrompt();
    });
  }
}
