/**
 * QuizScene — "כרטיס מהיר / Quick Card": a punchy, different-feeling encounter.
 *
 * One big NOTE CARD pops into the center with a shrinking TIMER RING. Read it
 * before the ring empties. Correct → it bursts and the next card snaps in
 * faster; miss/timeout → lose a heart and move on. No falling — it's a sharp,
 * arcade quiz rhythm, so levels don't all feel the same. Part of the "surprise,
 * changes each time" variety the player asked for.
 */

import Phaser from 'phaser';
import { GAME_WIDTH } from '../../core/layout';
import { game } from '../../core/gameState';
import type { Note, Solfege } from '../../core/notes';
import { BaseGameScene } from './BaseGameScene';
import { NoteCard } from '../../rendering/NoteCard';

const CARD_Y = 340;

export class QuizScene extends BaseGameScene {
  private card?: NoteCard;
  private ring!: Phaser.GameObjects.Graphics;
  private accepting = false;
  private timeLeft = 0;
  private timeMax = 0;

  constructor() {
    super('Quiz');
  }

  protected startEncounter(): void {
    this.ring = this.add.graphics().setDepth(60);
    this.nextCard();
  }

  private nextCard(): void {
    if (this.finished) return;
    this.card?.destroy();
    const id = game.srs.pick(this.notePool);
    const note = this.idToNote.get(id)!;
    const c = this.makeCard(note, 22);
    c.setPosition(GAME_WIDTH / 2, CARD_Y).setDepth(60).setScale(0.5);
    this.tweens.add({ targets: c, scale: 1, duration: 180, ease: 'Back.easeOut' });
    this.card = c;

    this.timeMax = this.pacedSeconds(this.level.fallSeconds);
    this.timeLeft = this.timeMax;
    this.accepting = true;
  }

  update(_t: number, deltaMs: number): void {
    if (this.finished || !this.accepting || !this.card) return;
    this.timeLeft -= deltaMs / 1000;
    this.drawRing();
    if (this.timeLeft <= 0) {
      this.accepting = false;
      this.registerMiss(this.card.note, this.card.headObject);
      this.time.delayedCall(300, () => this.nextCard());
    }
  }

  private drawRing(): void {
    const g = this.ring;
    g.clear();
    const frac = Phaser.Math.Clamp(this.timeLeft / this.timeMax, 0, 1);
    const cx = GAME_WIDTH / 2;
    const cy = CARD_Y;
    const r = 170;
    g.lineStyle(12, 0x000000, 0.35);
    g.strokeCircle(cx, cy, r);
    g.lineStyle(12, frac > 0.3 ? this.world.style.accent : 0xff5252, 1);
    g.beginPath();
    g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac, false);
    g.strokePath();
  }

  protected resolveTarget(_picked: Solfege): { note: Note; obj: Phaser.GameObjects.Container } | null {
    if (!this.accepting || !this.card) return null;
    this.accepting = false;
    return { note: this.card.note, obj: this.card.headObject };
  }

  protected onCorrectHook(_n: Note, _o: Phaser.GameObjects.Container): void {
    this.ring.clear();
    this.card?.destroy();
    this.card = undefined;
    if (this.cleared < this.level.targetNotes) this.time.delayedCall(220, () => this.nextCard());
  }

  protected onWrongHook(_n: Note, _o: Phaser.GameObjects.Container): void {
    // Allow another try on the same card with remaining time.
    this.accepting = true;
  }
}
