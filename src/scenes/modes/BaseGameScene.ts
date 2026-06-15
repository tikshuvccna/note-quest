/**
 * BaseGameScene — shared machinery for every gameplay encounter.
 *
 * Holds the common stuff so each mode (Practice, Boss Duel, …) only implements
 * its own flavor: the world/level config, note pool, SRS-driven spawning,
 * adaptive difficulty, scoring + combo, HUD, hearts, and the hand-off to
 * Results. Subclasses build their own scene objects and call the protected
 * helpers (registerCorrect / registerWrong / finish).
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../core/layout';
import { game } from '../../core/gameState';
import {
  getWorld,
  getLevel,
  isBossLevel,
  type LevelConfig,
  type WorldConfig,
} from '../../core/curriculum';
import { SOLFEGE_ORDER, type Note, type Solfege } from '../../core/notes';
import { AdaptiveDifficulty } from '../../core/difficulty';
import { SolfegeButtons } from '../../rendering/SolfegeButtons';
import { NoteCard } from '../../rendering/NoteCard';
import * as juice from '../../core/juice';

export interface LaunchData {
  world: number;
  level: number;
}

export abstract class BaseGameScene extends Phaser.Scene {
  protected world!: WorldConfig;
  protected level!: LevelConfig;
  protected isBoss = false;
  protected diff!: AdaptiveDifficulty;
  /** The solfège answer pad. Optional — modes like Build-the-Note don't use it. */
  protected buttons?: SolfegeButtons;

  protected notePool: string[] = [];
  protected idToNote = new Map<string, Note>();

  protected cleared = 0;
  protected spawned = 0;
  protected attempts = 0;
  protected correct = 0;
  protected combo = 0;
  protected bestCombo = 0;
  protected score = 0;
  protected hearts = 3;
  protected finished = false;
  /** True only after the countdown finishes — gates spawning + movement. */
  protected running = false;

  private hud!: {
    score: Phaser.GameObjects.Text;
    combo: Phaser.GameObjects.Text;
    hearts: Phaser.GameObjects.Text;
    progress: Phaser.GameObjects.Graphics;
  };

  /** Subclasses implement their encounter. */
  protected abstract startEncounter(): void;

  init(data: LaunchData): void {
    this.world = getWorld(data.world);
    this.level = getLevel(data.world, data.level);
    this.isBoss = isBossLevel(data.world, data.level);
    this.diff = new AdaptiveDifficulty(game.isLittle);
    this.notePool = this.world.notePool.map((n) => n.id);
    this.idToNote = new Map();
    for (const n of this.world.notePool) this.idToNote.set(n.id, n);

    this.cleared = 0;
    this.spawned = 0;
    this.attempts = 0;
    this.correct = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.score = 0;
    this.hearts = game.isLittle ? 99 : 3;
    this.finished = false;
    this.running = false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(this.world.style.bg);
    this.buildButtons();
    this.buildHud();
    this.buildBackButton();
    this.showCountdown(() => {
      this.running = true;
      this.startEncounter();
    });
  }

  // ---- Shared builders --------------------------------------------------

  protected buildButtons(): void {
    const choices: Solfege[] = SOLFEGE_ORDER.filter((s) =>
      this.world.notePool.some((n) => n.solfege === s)
    );
    const w = Math.min(GAME_WIDTH - 160, 170 * choices.length);
    this.buttons = new SolfegeButtons(this, GAME_WIDTH / 2, GAME_HEIGHT - 84, {
      choices,
      width: w,
      height: game.isLittle ? 128 : 108,
      big: game.isLittle,
      monochrome: !game.data.visual.colorNotes,
      onPick: (sol) => this.onAnswer(sol),
    });
  }

  /**
   * Effective seconds a note has before it must be answered — combines adaptive
   * difficulty AND the global easy-mode factor (easy = 50% slower = ÷0.5 = 2×
   * longer). All modes should route their pacing through this.
   */
  protected pacedSeconds(baseSeconds: number): number {
    return this.diff.effectiveFallSeconds(baseSeconds) / game.easyFactor;
  }

  /** Create a NoteCard honoring the current world style + visual settings. */
  protected makeCard(note: Note, lineGap = 16): NoteCard {
    return new NoteCard(this, 0, 0, note, {
      lineGap,
      width: lineGap * 9,
      panel: true,
      panelColor: 0x000000,
      lineColor: this.world.style.line,
      monochrome: !game.data.visual.colorNotes,
      showLabel: game.data.visual.showLabels,
    });
  }

  protected buildHud(): void {
    const score = this.add
      .text(GAME_WIDTH - 60, 40, '0', {
        fontFamily: 'Rubik, sans-serif',
        fontSize: '44px',
        fontStyle: '900',
        color: '#ffd23f',
      })
      .setOrigin(1, 0)
      .setDepth(500);
    const combo = this.add
      .text(GAME_WIDTH / 2, 40, '', {
        fontFamily: 'Rubik, sans-serif',
        fontSize: '38px',
        fontStyle: '900',
        color: '#ff7043',
      })
      .setOrigin(0.5, 0)
      .setDepth(500);
    const hearts = this.add
      .text(GAME_WIDTH - 60, 96, game.isLittle ? '∞' : '❤️❤️❤️', { fontSize: '30px' })
      .setOrigin(1, 0)
      .setDepth(500);
    const progress = this.add.graphics().setDepth(500);
    this.hud = { score, combo, hearts, progress };
    this.drawProgress();
  }

  protected buildBackButton(): void {
    this.add
      .text(60, 40, '⬅︎', { fontSize: '40px', color: '#ffffff' })
      .setDepth(500)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('Home'));
  }

  protected drawProgress(): void {
    const g = this.hud.progress;
    g.clear();
    const x = 120;
    const y = 110;
    const w = 360;
    const h = 16;
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(x, y, w, h, h / 2);
    const frac = Phaser.Math.Clamp(this.cleared / this.level.targetNotes, 0, 1);
    g.fillStyle(COLORS.good, 1);
    if (frac > 0) g.fillRoundedRect(x, y, w * frac, h, h / 2);
  }

  // ---- Countdown --------------------------------------------------------

  protected showCountdown(done: () => void): void {
    const seq = ['3', '2', '1', 'קדימה!'];
    let i = 0;
    const t = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
        fontFamily: 'Rubik, sans-serif',
        fontSize: '120px',
        fontStyle: '900',
        color: '#ffd23f',
      })
      .setOrigin(0.5)
      .setDepth(2000);
    const tick = () => {
      if (i >= seq.length) {
        t.destroy();
        done();
        return;
      }
      t.setText(seq[i]);
      t.setScale(0.4);
      this.tweens.add({ targets: t, scale: 1, duration: 250, ease: 'Back.easeOut' });
      game.audio.sfxCombo(i);
      i++;
      this.time.delayedCall(650, tick);
    };
    tick();
  }

  // ---- Answer handling (subclass calls onAnswer via buttons) ------------

  /** Subclass provides the note currently being targeted by a button press. */
  protected abstract resolveTarget(picked: Solfege): {
    note: Note;
    obj: Phaser.GameObjects.Container;
  } | null;

  private onAnswer(sol: Solfege): void {
    // Ignore answers before gameplay actually starts (during the 3-2-1
    // countdown) or after it ends. This also blocks the "auto-press" bug where
    // the tap that LAUNCHED the level (on a play/replay button at the bottom of
    // the previous screen) carried over onto a solfège button created at the
    // same spot in the new scene — costing a phantom life.
    if (!this.running || this.finished) return;
    const target = this.resolveTarget(sol);
    if (!target) return; // nothing to answer right now
    this.attempts++;
    if (target.note.solfege === sol) this.registerCorrect(target.note, target.obj);
    else this.registerWrong(target.note, target.obj);
  }

  // ---- Outcomes (with juice) — subclasses can override visuals ----------

  protected registerCorrect(note: Note, obj: Phaser.GameObjects.Container): void {
    this.correct++;
    this.cleared++;
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.diff.record(true);
    game.srs.markCorrect(note.id);

    const points = 10 + (this.combo - 1) * 2;
    this.score += points;

    juice.pop(this, obj, 1.3);
    juice.burst(this, obj.x, obj.y, game.data.visual.colorNotes ? note.color : 0xffffff, 18);
    juice.popText(this, obj.x, obj.y - 30, `+${points}`, '#ffd23f', 34);
    if (this.combo >= 3) {
      juice.popText(this, GAME_WIDTH / 2, 150, `קומבו x${this.combo}! 🔥`, '#ff7043', 40);
      game.audio.sfxCombo(this.combo);
    } else {
      game.audio.sfxCorrect();
    }
    game.audio.sayNote(note.solfege);
    game.audio.playPitch(note.midi);

    this.updateHud();
    this.drawProgress();
    this.onCorrectHook(note, obj);
    if (this.cleared >= this.level.targetNotes) this.finish(true);
  }

  protected registerWrong(note: Note, obj: Phaser.GameObjects.Container): void {
    this.combo = 0;
    this.diff.record(false);
    game.srs.markWrong(note.id);
    juice.shake(this, 0.008, 180);
    juice.flash(this, 0xff5252, 90);
    juice.popText(this, obj.x, obj.y - 30, '✗', '#ff5252', 44);
    this.buttons?.highlight(note.solfege, COLORS.good);
    game.audio.sfxWrong();
    this.loseHeart();
    this.updateHud();
    this.onWrongHook(note, obj);
  }

  /** Note crossed without being answered. (obj kept for caller symmetry.) */
  protected registerMiss(note: Note, _obj?: Phaser.GameObjects.Container): void {
    this.combo = 0;
    this.diff.record(false);
    game.srs.markWrong(note.id);
    juice.shake(this, 0.006, 150);
    game.audio.sfxWrong();
    this.buttons?.highlight(note.solfege, COLORS.bad);
    this.loseHeart();
    this.updateHud();
  }

  /** Hooks subclasses can override (default no-op). */
  protected onCorrectHook(_note: Note, _obj: Phaser.GameObjects.Container): void {}
  protected onWrongHook(_note: Note, _obj: Phaser.GameObjects.Container): void {}

  protected loseHeart(): void {
    if (game.isLittle) return;
    this.hearts--;
    if (this.hearts <= 0) this.finish(false);
  }

  protected updateHud(): void {
    this.hud.score.setText(`${this.score}`);
    juice.pop(this, this.hud.score, 1.2);
    this.hud.combo.setText(this.combo >= 2 ? `x${this.combo}` : '');
    if (!game.isLittle) this.hud.hearts.setText('❤️'.repeat(Math.max(0, this.hearts)) || '💀');
  }

  // ---- End --------------------------------------------------------------

  protected finish(won: boolean): void {
    if (this.finished) return;
    this.finished = true;
    this.buttons?.setEnabled(false);
    const accuracy = this.attempts > 0 ? this.correct / this.attempts : 0;
    this.time.delayedCall(600, () => {
      this.scene.start('Results', {
        world: this.world.id,
        level: this.level.index,
        won,
        accuracy,
        score: this.score,
        bestCombo: this.bestCombo,
        cleared: this.cleared,
        target: this.level.targetNotes,
      });
    });
  }
}
