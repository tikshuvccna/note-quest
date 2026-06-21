/**
 * AdminScene — the admin panel, opened by entering the admin code (MAESTRO).
 *
 * Lets the admin choose what to open / change:
 *   • Unlock a SPECIFIC world (and everything before it), or unlock EVERYTHING.
 *   • Reset all progress.
 *   • Grant coins / stars (trophies) for testing or rewards.
 *   • Mark all world lessons done (skip the teaching gates).
 *   • Flip age mode, easy mode, and mute/unmute all sound.
 *
 * It's an overlay launched on top of Home; closing it restarts Home so changes
 * show immediately.
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../core/layout';
import { game } from '../core/gameState';
import { WORLDS } from '../core/curriculum';
import {
  defaultSave,
  unlockUpToWorld,
  unlockEverything,
  markLessonDone,
} from '../core/progress';
import { pillButton } from '../ui/widgets';
import { Srs } from '../core/srs';

export class AdminScene extends Phaser.Scene {
  private status!: Phaser.GameObjects.Text;

  constructor() {
    super('Admin');
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setOrigin(0);

    const pw = 1040;
    const ph = 640;
    const px = GAME_WIDTH / 2;
    const top = (GAME_HEIGHT - ph) / 2;
    const g = this.add.graphics();
    g.fillStyle(0x241b3a, 1);
    g.fillRoundedRect(px - pw / 2, top, pw, ph, 26);
    g.lineStyle(3, 0xff7043, 0.6);
    g.strokeRoundedRect(px - pw / 2, top, pw, ph, 26);

    this.add
      .text(px, top + 42, '🛠️ פאנל מנהל', {
        fontFamily: 'Rubik, sans-serif',
        fontSize: '40px',
        fontStyle: '900',
        color: '#ff7043',
      })
      .setOrigin(0.5);

    this.status = this.add
      .text(px, top + 86, 'בחר מה לפתוח', {
        fontFamily: 'Rubik, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setAlpha(0.85);

    // ----- Section: unlock worlds -----
    this.sectionLabel(px + pw / 2 - 40, top + 140, 'פתח עולם:');
    const startX = px + pw / 2 - 200;
    WORLDS.forEach((w, i) => {
      const col = i % 4;
      const rowi = Math.floor(i / 4);
      const bx = startX - col * 210;
      const by = top + 185 + rowi * 64;
      pillButton(this, bx, by, `${w.id} · ${w.style.theme}`, () => {
        // Open ALL stages through this world (worlds 1..w fully playable).
        unlockUpToWorld(game.data, w.id + 1, WORLDS.map((x) => x.levels.length));
        markLessonDone(game.data, w.id);
        this.done(`נפתח עד עולם ${w.id}`);
      }, { width: 195, height: 52, color: COLORS.panel, fontColor: '#ffffff' });
    });

    // ----- Section: big actions -----
    const ay = top + 330;
    pillButton(this, px + 360, ay, '🔓 פתח הכל', () => {
      unlockEverything(game.data, WORLDS.map((w) => w.levels.length));
      this.done('הכל פתוח! ⭐');
    }, { width: 300, height: 62, color: COLORS.good, fontColor: '#ffffff' });

    pillButton(this, px, ay, '🗑️ אפס התקדמות', () => {
      this.resetProgress();
      this.done('ההתקדמות אופסה');
    }, { width: 300, height: 62, color: COLORS.bad, fontColor: '#ffffff' });

    pillButton(this, px - 360, ay, '📖 דלג על שיעורים', () => {
      WORLDS.forEach((w) => markLessonDone(game.data, w.id));
      this.done('כל השיעורים סומנו כבוצעו');
    }, { width: 300, height: 62, color: COLORS.panel, fontColor: '#ffffff' });

    // ----- Section: give coins / stars -----
    const cy = top + 410;
    this.sectionLabel(px + pw / 2 - 40, cy, 'מטבעות וגביעים:');
    pillButton(this, px + 300, cy, '🪙 +500', () => { game.data.coins += 500; this.done('+500 מטבעות'); },
      { width: 180, height: 54, color: COLORS.accent });
    pillButton(this, px + 90, cy, '🏆 +500', () => { game.data.trophies += 500; this.done('+500 גביעים'); },
      { width: 180, height: 54, color: COLORS.accent });
    pillButton(this, px - 130, cy, '⭐ 3 לכולם', () => {
      unlockEverything(game.data, WORLDS.map((w) => w.levels.length));
      this.done('3 כוכבים לכל השלבים');
    }, { width: 200, height: 54, color: COLORS.accent });

    // ----- Section: modes -----
    const my = top + 488;
    this.sectionLabel(px + pw / 2 - 40, my, 'מצבים:');
    pillButton(this, px + 320, my, age(), () => {
      game.data.ageMode = game.data.ageMode === 'kids' ? 'little' : 'kids';
      this.done('גיל: ' + (game.data.ageMode === 'kids' ? '9–12' : 'קטנטנים'));
    }, { width: 220, height: 54, color: COLORS.panel, fontColor: '#fff' });
    pillButton(this, px + 90, my, easy(), () => {
      game.data.easyMode = !game.data.easyMode;
      game.applySound();
      this.done('מצב קל: ' + (game.data.easyMode ? 'פעיל' : 'כבוי'));
    }, { width: 220, height: 54, color: COLORS.panel, fontColor: '#fff' });
    pillButton(this, px - 150, my, sound(), () => {
      const s = game.data.sound;
      const muted = !(s.voice || s.pitch || s.sfx || s.music);
      s.voice = s.pitch = s.sfx = s.music = muted; // toggle all
      game.applySound();
      this.done('סאונד: ' + (muted ? 'פעיל' : 'מושתק'));
    }, { width: 240, height: 54, color: COLORS.panel, fontColor: '#fff' });

    // ----- Close -----
    pillButton(this, px, top + ph - 44, 'סגור', () => this.close(), {
      width: 220,
      height: 56,
      color: COLORS.bgDeep,
      fontColor: '#ffffff',
    });

    function age() {
      return '👶 גיל: ' + (game.data.ageMode === 'kids' ? '9–12' : 'קטנטנים');
    }
    function easy() {
      return '🐢 קל: ' + (game.data.easyMode ? '✓' : '✗');
    }
    function sound() {
      const s = game.data.sound;
      const on = s.voice || s.pitch || s.sfx || s.music;
      return '🔊 סאונד: ' + (on ? '✓' : '✗');
    }
  }

  private sectionLabel(x: number, y: number, text: string): void {
    this.add
      .text(x, y, text, {
        fontFamily: 'Rubik, sans-serif',
        fontSize: '24px',
        fontStyle: '700',
        color: '#ffd23f',
      })
      .setOrigin(1, 0.5);
  }

  private resetProgress(): void {
    // Full reset to a fresh save, and a fresh (empty) SRS.
    Object.assign(game.data, defaultSave());
    game.srs = Srs.fromJSON({});
  }

  private done(msg: string): void {
    game.persist();
    this.status.setText('✓ ' + msg);
    this.status.setColor('#4caf50');
    this.tweens.add({ targets: this.status, scale: 1.1, duration: 120, yoyo: true });
  }

  private close(): void {
    this.scene.stop();
    this.scene.get('Home').scene.restart();
  }
}
