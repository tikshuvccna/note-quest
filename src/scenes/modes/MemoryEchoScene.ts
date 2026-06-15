/**
 * MemoryEchoScene — "אתגר הזיכרון / Memory Echo": read + remember.
 *
 * A short SEQUENCE of note cards flashes one by one (each shown on its staff and
 * spoken), then disappears. The player replays it IN ORDER by tapping the
 * solfège buttons. Match the whole sequence → it counts; one wrong tap fails
 * that round. Sequences grow longer as you go. Trains reading + working memory.
 *
 * Uses the shared solfège button pad. Each fully-correct sequence counts as
 * (length) cleared notes toward the level target.
 */

import Phaser from 'phaser';
import { GAME_WIDTH } from '../../core/layout';
import { game } from '../../core/gameState';
import type { Note, Solfege } from '../../core/notes';
import { BaseGameScene } from './BaseGameScene';
import { NoteCard } from '../../rendering/NoteCard';
import * as juice from '../../core/juice';

const CARD_Y = 360;

export class MemoryEchoScene extends BaseGameScene {
  private sequence: Note[] = [];
  private replayIndex = 0;
  private phase: 'show' | 'replay' | 'idle' = 'idle';
  private seqLen = 3;
  private statusText!: Phaser.GameObjects.Text;
  private pips: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super('MemoryEcho');
  }

  protected startEncounter(): void {
    this.statusText = this.add
      .text(GAME_WIDTH / 2, 160, '', {
        fontFamily: 'Rubik, sans-serif',
        fontSize: '40px',
        fontStyle: '900',
        color: '#ffd23f',
      })
      .setOrigin(0.5)
      .setDepth(60);
    this.seqLen = game.isLittle ? 2 : 3;
    this.startRound();
  }

  // ---- Show phase --------------------------------------------------------

  private startRound(): void {
    if (this.finished) return;
    this.phase = 'show';
    this.replayIndex = 0;
    this.buttons?.setEnabled(false);

    // Build a sequence (avoid immediate repeats for clarity).
    this.sequence = [];
    let last = '';
    for (let i = 0; i < this.seqLen; i++) {
      let id = game.srs.pick(this.notePool);
      if (this.notePool.length > 1) {
        let guard = 0;
        while (id === last && guard++ < 5) id = game.srs.pick(this.notePool);
      }
      last = id;
      this.sequence.push(this.idToNote.get(id)!);
    }
    this.drawPips();
    this.statusText.setText('שננו את הסדר… 👀');
    this.showStep(0);
  }

  private showStep(i: number): void {
    if (this.finished) return;
    if (i >= this.sequence.length) {
      this.time.delayedCall(350, () => this.beginReplay());
      return;
    }
    const note = this.sequence[i];
    const card = new NoteCard(this, GAME_WIDTH / 2, CARD_Y, note, {
      lineGap: 22,
      width: 22 * 9,
      panel: true,
      panelColor: 0x000000,
      lineColor: this.world.style.line,
      monochrome: !game.data.visual.colorNotes,
      showLabel: game.data.visual.showLabels,
    });
    card.setDepth(60).setScale(0.4);
    this.tweens.add({ targets: card, scale: 1, duration: 180, ease: 'Back.easeOut' });
    game.audio.sayNote(note.solfege);
    game.audio.playPitch(note.midi);
    this.highlightPip(i);

    const showMs = this.pacedSeconds(0.85) * 1000;
    this.time.delayedCall(showMs, () => {
      this.tweens.add({
        targets: card,
        scale: 0.4,
        alpha: 0,
        duration: 140,
        onComplete: () => card.destroy(),
      });
      this.time.delayedCall(180, () => this.showStep(i + 1));
    });
  }

  // ---- Replay phase ------------------------------------------------------

  private beginReplay(): void {
    if (this.finished) return;
    this.phase = 'replay';
    this.replayIndex = 0;
    this.resetPips();
    this.statusText.setText('עכשיו נגנו את הסדר! 🎶');
    this.buttons?.setEnabled(true);
  }

  /** Memory Echo handles input itself (sequence), not via resolveTarget. */
  protected resolveTarget(picked: Solfege): { note: Note; obj: Phaser.GameObjects.Container } | null {
    if (this.phase !== 'replay' || this.finished) return null;
    const expected = this.sequence[this.replayIndex];
    const obj = this.add.container(GAME_WIDTH / 2, CARD_Y + 120);
    if (picked === expected.solfege) {
      this.replayIndex++;
      this.fillPip(this.replayIndex - 1);
      // Return the expected note so base logic counts a correct read.
      return { note: expected, obj };
    }
    // Wrong: return a deliberately-mismatched note so base marks it wrong.
    return { note: expected, obj };
  }

  protected onCorrectHook(): void {
    if (this.replayIndex >= this.sequence.length) {
      // Whole sequence done!
      this.phase = 'idle';
      juice.popText(this, GAME_WIDTH / 2, CARD_Y, 'מושלם! ✨', '#4caf50', 50);
      // Count the sequence toward the target; grow next sequence.
      if (this.cleared >= this.level.targetNotes) {
        this.finish(true);
        return;
      }
      this.seqLen = Math.min(6, this.seqLen + 1);
      this.buttons?.setEnabled(false);
      this.time.delayedCall(800, () => this.startRound());
    }
  }

  protected onWrongHook(): void {
    // A wrong tap fails the round — show it again from the start.
    this.phase = 'idle';
    juice.popText(this, GAME_WIDTH / 2, CARD_Y, 'אופס! שוב 🔁', '#ff5252', 46);
    this.buttons?.setEnabled(false);
    this.time.delayedCall(900, () => {
      if (!this.finished) this.startRound();
    });
  }

  // ---- Sequence progress pips -------------------------------------------

  private drawPips(): void {
    for (const p of this.pips) p.destroy();
    this.pips = [];
    const n = this.sequence.length;
    const gap = 46;
    const startX = GAME_WIDTH / 2 - ((n - 1) * gap) / 2;
    for (let i = 0; i < n; i++) {
      const g = this.add.graphics().setDepth(60);
      g.fillStyle(0xffffff, 0.25);
      g.fillCircle(startX + i * gap, 250, 14);
      this.pips.push(g);
    }
  }

  private highlightPip(i: number): void {
    const g = this.pips[i];
    if (!g) return;
    const x = GAME_WIDTH / 2 - ((this.pips.length - 1) * 46) / 2 + i * 46;
    g.clear();
    g.fillStyle(this.world.style.accent, 1);
    g.fillCircle(x, 250, 16);
  }

  private resetPips(): void {
    const x0 = GAME_WIDTH / 2 - ((this.pips.length - 1) * 46) / 2;
    this.pips.forEach((g, i) => {
      g.clear();
      g.fillStyle(0xffffff, 0.25);
      g.fillCircle(x0 + i * 46, 250, 14);
    });
  }

  private fillPip(i: number): void {
    const g = this.pips[i];
    if (!g) return;
    const x = GAME_WIDTH / 2 - ((this.pips.length - 1) * 46) / 2 + i * 46;
    g.clear();
    g.fillStyle(0x4caf50, 1);
    g.fillCircle(x, 250, 16);
  }
}
