/**
 * LessonScene — "שיעור / Lesson": teaches a world's notes BEFORE its levels.
 *
 * Shown automatically the first time the player enters a world (tracked in
 * save.lessonsDone), and replayable via a 📖 button on the map.
 *
 * Two phases:
 *   1. FLASHCARDS — walk through each NEW note of the world. Each is shown big
 *      on a staff with its Hebrew name + color; tapping it (or the 🔊 button)
 *      plays the voice + real piano pitch. "הבא →" advances.
 *   2. PRACTICE GATE — a short, no-pressure check (no hearts, no timer): a note
 *      appears, the player taps the matching solfège. Get the required number
 *      right to pass. Passing marks the lesson done and launches the level.
 *
 * On finish it calls launchLevel(world, 1) so the player flows straight in.
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../core/layout';
import { game } from '../core/gameState';
import { getWorld, type WorldConfig } from '../core/curriculum';
import { markLessonDone } from '../core/progress';
import { SOLFEGE_ORDER, type Note, type Solfege } from '../core/notes';
import { NoteCard } from '../rendering/NoteCard';
import { SolfegeButtons } from '../rendering/SolfegeButtons';
import { pillButton } from '../ui/widgets';
import { launchLevel } from '../core/director';
import * as juice from '../core/juice';

interface LaunchData {
  world: number;
  /** where to go after the lesson (defaults to level 1). */
  level?: number;
}

const CARD_Y = 385;

export class LessonScene extends Phaser.Scene {
  private world!: WorldConfig;
  private gotoLevel = 1;

  // flashcard state
  private newNotes: Note[] = [];
  private cardIndex = 0;
  private card?: NoteCard;
  private flashUi: Phaser.GameObjects.GameObject[] = [];

  // practice state
  private buttons?: SolfegeButtons;
  private practiceNote?: Note;
  private practiceCard?: NoteCard;
  private needed = 0;
  private got = 0;
  private accepting = false;

  constructor() {
    super('Lesson');
  }

  create(data: LaunchData): void {
    this.world = getWorld(data.world);
    this.gotoLevel = data.level ?? 1;
    // The notes to teach: the world's NEW solfège, as note objects from its pool.
    this.newNotes = this.world.notePool.filter((n) =>
      this.world.newSolfege.includes(n.solfege)
    );
    // Fallback (worlds with no "new" solfège, e.g. higher octaves): teach the
    // whole pool so the lesson is never empty.
    if (this.newNotes.length === 0) this.newNotes = [...this.world.notePool];

    this.cameras.main.setBackgroundColor(this.world.style.bg);
    this.input.once('pointerdown', () => game.audio.unlock());

    this.add
      .text(GAME_WIDTH / 2, 70, `📖 ${this.world.title}`, {
        fontFamily: 'Rubik, sans-serif',
        fontSize: '46px',
        fontStyle: '900',
        color: '#ffd23f',
      })
      .setOrigin(0.5);

    this.add
      .text(60, 40, '⬅︎', { fontSize: '40px', color: '#ffffff' })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('Home'));

    this.cardIndex = 0;
    this.showFlashcard();
  }

  // ---- Phase 1: flashcards ----------------------------------------------

  private clearFlashUi(): void {
    this.card?.destroy();
    this.card = undefined;
    for (const o of this.flashUi) o.destroy();
    this.flashUi = [];
  }

  private showFlashcard(): void {
    this.clearFlashUi();
    const note = this.newNotes[this.cardIndex];

    const heading = this.add
      .text(GAME_WIDTH / 2, 160, 'זה התו:', {
        fontFamily: 'Rubik, sans-serif',
        fontSize: '34px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setAlpha(0.9);
    this.flashUi.push(heading);

    const name = this.add
      .text(GAME_WIDTH / 2, 215, note.solfege, {
        fontFamily: 'Rubik, sans-serif',
        fontSize: '72px',
        fontStyle: '900',
        color: '#' + (game.data.visual.colorNotes ? note.color : 0xffffff).toString(16).padStart(6, '0'),
      })
      .setOrigin(0.5);
    this.flashUi.push(name);

    const card = new NoteCard(this, GAME_WIDTH / 2, CARD_Y, note, {
      lineGap: 26,
      width: 26 * 9,
      panel: true,
      panelColor: 0x000000,
      lineColor: this.world.style.line,
      monochrome: !game.data.visual.colorNotes,
      showLabel: game.data.visual.showLabels,
    });
    card.setScale(0.5);
    this.tweens.add({ targets: card, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.card = card;

    const play = () => {
      game.audio.sayNote(note.solfege);
      game.audio.playPitch(note.midi);
      if (this.card) juice.pop(this, this.card, 1.15);
    };
    play(); // auto-play on show

    // Tap the card to hear it again.
    const hit = this.add
      .zone(GAME_WIDTH / 2, CARD_Y, 26 * 9, 26 * 12)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', play);
    this.flashUi.push(hit);

    const hear = pillButton(this, GAME_WIDTH / 2, CARD_Y + 230, '🔊 שמע שוב', play, {
      width: 260,
      height: 64,
      color: COLORS.panel,
      fontColor: '#ffffff',
    });
    this.flashUi.push(hear);

    // Progress dots.
    const n = this.newNotes.length;
    const dotsX = GAME_WIDTH / 2 - ((n - 1) * 34) / 2;
    for (let i = 0; i < n; i++) {
      const c = this.add.circle(dotsX + i * 34, 110, 9, i === this.cardIndex ? COLORS.accent : 0x666a99);
      this.flashUi.push(c);
    }

    // Next / start-practice button.
    const last = this.cardIndex === this.newNotes.length - 1;
    const nextBtn = pillButton(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 80,
      last ? 'בוא נתרגל! →' : 'הבא →',
      () => {
        if (last) this.startPractice();
        else {
          this.cardIndex++;
          this.showFlashcard();
        }
      },
      { width: 300, height: 76, color: COLORS.good, fontColor: '#ffffff' }
    );
    this.flashUi.push(nextBtn);
  }

  // ---- Phase 2: practice gate (no hearts, no timer) ---------------------

  private startPractice(): void {
    this.clearFlashUi();
    this.needed = Math.min(this.newNotes.length + 2, 5); // a few correct to pass
    this.got = 0;

    this.add
      .text(GAME_WIDTH / 2, 150, 'תרגול קטן — בלי לחץ! 🌟', {
        fontFamily: 'Rubik, sans-serif',
        fontSize: '34px',
        fontStyle: '700',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.progressText = this.add
      .text(GAME_WIDTH / 2, 200, '', {
        fontFamily: 'Rubik, sans-serif',
        fontSize: '30px',
        color: '#ffd23f',
      })
      .setOrigin(0.5);

    // Buttons: only the world's solfège choices.
    const choices: Solfege[] = SOLFEGE_ORDER.filter((s) =>
      this.world.notePool.some((n) => n.solfege === s)
    );
    const w = Math.min(GAME_WIDTH - 160, 170 * choices.length);
    this.buttons = new SolfegeButtons(this, GAME_WIDTH / 2, GAME_HEIGHT - 84, {
      choices,
      width: w,
      height: 108,
      monochrome: !game.data.visual.colorNotes,
      onPick: (sol) => this.onPracticeAnswer(sol),
    });

    this.updateProgress();
    this.nextPractice();
  }

  private progressText!: Phaser.GameObjects.Text;

  private updateProgress(): void {
    this.progressText.setText(`${this.got} / ${this.needed} ✓`);
  }

  private nextPractice(): void {
    this.practiceCard?.destroy();
    // Bias practice toward the NEW notes of the world.
    const pool = this.newNotes.length ? this.newNotes : this.world.notePool;
    this.practiceNote = pool[Phaser.Math.Between(0, pool.length - 1)];
    const card = new NoteCard(this, GAME_WIDTH / 2, CARD_Y, this.practiceNote, {
      lineGap: 24,
      width: 24 * 9,
      panel: true,
      panelColor: 0x000000,
      lineColor: this.world.style.line,
      monochrome: !game.data.visual.colorNotes,
      showLabel: false, // practice = no training-wheel label
    });
    card.setScale(0.5);
    this.tweens.add({ targets: card, scale: 1, duration: 160, ease: 'Back.easeOut' });
    this.practiceCard = card;
    this.accepting = true;
  }

  private onPracticeAnswer(sol: Solfege): void {
    if (!this.accepting || !this.practiceNote) return;
    this.accepting = false;
    const obj = this.practiceCard?.headObject ?? this.add.container(GAME_WIDTH / 2, CARD_Y);

    if (sol === this.practiceNote.solfege) {
      this.got++;
      juice.pop(this, obj as Phaser.GameObjects.Container, 1.3);
      juice.burst(this, (obj as Phaser.GameObjects.Container).x, (obj as Phaser.GameObjects.Container).y,
        game.data.visual.colorNotes ? this.practiceNote.color : 0xffffff, 16);
      game.audio.sfxCorrect();
      game.audio.sayNote(this.practiceNote.solfege);
      game.audio.playPitch(this.practiceNote.midi);
      this.updateProgress();
      if (this.got >= this.needed) {
        this.pass();
        return;
      }
      this.time.delayedCall(450, () => this.nextPractice());
    } else {
      // No penalty — just show the right answer and let them try again.
      juice.shake(this, 0.005, 120);
      game.audio.sfxWrong();
      this.buttons?.highlight(this.practiceNote.solfege, COLORS.good);
      this.time.delayedCall(300, () => {
        this.accepting = true;
      });
    }
  }

  private pass(): void {
    this.accepting = false;
    this.buttons?.setEnabled(false);
    markLessonDone(game.data, this.world.id);
    game.persist();

    juice.flash(this, 0xffffff, 150);
    game.audio.sfxWin();
    const banner = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'מוכן! 🎉', {
        fontFamily: 'Rubik, sans-serif',
        fontSize: '80px',
        fontStyle: '900',
        color: '#4caf50',
      })
      .setOrigin(0.5)
      .setDepth(2000)
      .setScale(0);
    this.tweens.add({ targets: banner, scale: 1, duration: 300, ease: 'Back.easeOut' });
    juice.burst(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, this.world.style.accent, 30);

    this.time.delayedCall(1100, () => launchLevel(this, this.world.id, this.gotoLevel));
  }
}
