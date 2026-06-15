/**
 * SpeedRunScene — "ריצת מהירות / Speed Run": pure arcade streak mode.
 *
 * One note flashes at a time; answer as FAST as you can. Each correct answer
 * grows a STREAK 🔥 and the next note comes faster. A single mistake (wrong or
 * timeout) ENDS the run. The goal is your best streak / score — competitive and
 * punchy, very different from the calm falling mode.
 *
 * Reuses BaseGameScene scoring; "win" = reaching the level's target streak,
 * else the run just ends (still awards stars for how far you got).
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../../core/layout';
import { game } from '../../core/gameState';
import type { Note, Solfege } from '../../core/notes';
import { BaseGameScene } from './BaseGameScene';
import { NoteCard } from '../../rendering/NoteCard';
import * as juice from '../../core/juice';

const CARD_Y = 330;

export class SpeedRunScene extends BaseGameScene {
  private card?: NoteCard;
  private bar!: Phaser.GameObjects.Graphics;
  private streakText!: Phaser.GameObjects.Text;
  private accepting = false;
  private timeLeft = 0;
  private timeMax = 0;

  constructor() {
    super('SpeedRun');
  }

  protected startEncounter(): void {
    this.bar = this.add.graphics().setDepth(60);
    this.streakText = this.add
      .text(GAME_WIDTH / 2, 150, '', {
        fontFamily: 'Rubik, sans-serif',
        fontSize: '44px',
        fontStyle: '900',
        color: '#ff7043',
      })
      .setOrigin(0.5)
      .setDepth(60);
    this.add
      .text(GAME_WIDTH / 2, 210, 'ענה מהר! טעות אחת — וזהו 🔥', {
        fontFamily: 'Rubik, sans-serif',
        fontSize: '26px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(60)
      .setAlpha(0.8);
    this.nextCard();
  }

  /** Speed-run notes get less time as the streak grows (gets harder fast). */
  private timeForStreak(): number {
    const base = Math.min(this.level.fallSeconds, 2.4); // start brisk
    const ramp = Math.max(0.7, 1 - this.combo * 0.04); // shrink with streak
    return this.pacedSeconds(base * ramp);
  }

  private nextCard(): void {
    if (this.finished) return;
    this.card?.destroy();
    const id = game.srs.pick(this.notePool);
    const note = this.idToNote.get(id)!;
    const c = this.makeCard(note, 22);
    c.setPosition(GAME_WIDTH / 2, CARD_Y).setDepth(60).setScale(0.5);
    this.tweens.add({ targets: c, scale: 1, duration: 120, ease: 'Back.easeOut' });
    this.card = c;
    this.timeMax = this.timeForStreak();
    this.timeLeft = this.timeMax;
    this.accepting = true;
    this.streakText.setText(this.combo >= 1 ? `🔥 ${this.combo}` : '');
  }

  update(_t: number, deltaMs: number): void {
    if (this.finished || !this.running || !this.accepting || !this.card) return;
    this.timeLeft -= deltaMs / 1000;
    this.drawBar();
    if (this.timeLeft <= 0) {
      this.accepting = false;
      this.endRun(this.card.note, this.card.headObject);
    }
  }

  private drawBar(): void {
    const g = this.bar;
    g.clear();
    const frac = Phaser.Math.Clamp(this.timeLeft / this.timeMax, 0, 1);
    const w = 600;
    const x = GAME_WIDTH / 2 - w / 2;
    const y = CARD_Y + 200;
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(x, y, w, 20, 10);
    g.fillStyle(frac > 0.3 ? this.world.style.accent : 0xff5252, 1);
    if (frac > 0) g.fillRoundedRect(x, y, w * frac, 20, 10);
  }

  protected resolveTarget(_picked: Solfege): { note: Note; obj: Phaser.GameObjects.Container } | null {
    if (!this.accepting || !this.card) return null;
    this.accepting = false;
    return { note: this.card.note, obj: this.card.headObject };
  }

  protected onCorrectHook(_n: Note, _o: Phaser.GameObjects.Container): void {
    this.bar.clear();
    this.card?.destroy();
    this.card = undefined;
    // Reaching the target streak wins; otherwise keep going.
    if (this.cleared >= this.level.targetNotes) {
      this.finish(true);
      return;
    }
    this.time.delayedCall(140, () => this.nextCard());
  }

  protected onWrongHook(n: Note, o: Phaser.GameObjects.Container): void {
    // In Speed Run a wrong answer ENDS the run (don't let them retry).
    this.endRun(n, o);
  }

  /** End the run: a big "streak broken" beat, then results. */
  private endRun(_n: Note, _o: Phaser.GameObjects.Container): void {
    if (this.finished) return;
    this.accepting = false;
    juice.shake(this, 0.012, 250);
    juice.flash(this, 0xff5252, 150);
    juice.popText(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, `נשבר! 🔥 ${this.bestCombo}`, '#ff5252', 56);
    game.audio.sfxWrong();
    // Won if they'd already hit the target; else it's a (partial) finish.
    const won = this.cleared >= this.level.targetNotes;
    this.time.delayedCall(900, () => this.finish(won));
  }
}
