/**
 * SettingsScene — overlay for age mode, visual options, and sound. Launched on
 * top of Home; dims the background and restarts Home on close so changes apply.
 *
 * Options:
 *   • Age: 9–12 (kids) / 5–8 (little)
 *   • Notes in color / black-and-white  (the user wanted this toggleable)
 *   • Show solfège letter on the note (training wheels)
 *   • Voice language: Italian / French / Spanish (do·re·mi…)
 *   • Toggles: voice, real piano pitch, SFX, music
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../core/layout';
import { game } from '../core/gameState';
import { pillButton } from '../ui/widgets';
import type { AgeMode, VoiceLang } from '../core/progress';

const VOICE_LABEL: Record<VoiceLang, string> = {
  it: '🇮🇹 איטלקית',
  fr: '🇫🇷 צרפתית',
  es: '🇪🇸 ספרדית',
};

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setOrigin(0);

    const px = GAME_WIDTH / 2;
    const d = game.data;

    // Layout constants — computed so nothing overlaps and it all fits in 720px.
    const panelW = 900;
    const headerH = 78;
    const rowH = 56;
    const rows = 9; // age, easy, color, labels, voice, voice-on, pitch, sfx, music
    const closeH = 60;
    const padTop = 24;
    const padBottom = 28;
    const panelH = headerH + rows * rowH + closeH + padTop + padBottom;
    const top = (GAME_HEIGHT - panelH) / 2;

    const g = this.add.graphics();
    g.fillStyle(COLORS.panel, 1);
    g.fillRoundedRect(px - panelW / 2, top, panelW, panelH, 28);
    g.lineStyle(3, COLORS.accent, 0.4);
    g.strokeRoundedRect(px - panelW / 2, top, panelW, panelH, 28);

    this.add
      .text(px, top + headerH / 2 + 6, '⚙️ הגדרות', {
        fontFamily: 'Rubik, sans-serif',
        fontSize: '40px',
        fontStyle: '900',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Right-aligned label column; control column to the left of center.
    const labelX = px + panelW / 2 - 50;
    const ctrlCenter = px - 110; // center for single-control rows
    let y = top + headerH + padTop + rowH / 2;
    const next = () => {
      y += rowH;
    };

    // Age mode (two buttons, side by side, left of the label).
    this.label(labelX, y, 'גיל:');
    this.choice(px + 60, y, d.ageMode === 'kids', '9–12', () => this.setAge('kids'), 170);
    this.choice(px - 130, y, d.ageMode === 'little', 'קטנטנים', () => this.setAge('little'), 190);
    next();

    // Easy mode (50% slower).
    this.label(labelX, y, '🐢 מצב קל (איטי ב-50%):');
    this.toggle(ctrlCenter, y, d.easyMode, () => {
      d.easyMode = !d.easyMode;
      this.saveRestart();
    });
    next();

    this.label(labelX, y, 'תווים בצבע:');
    this.toggle(ctrlCenter, y, d.visual.colorNotes, () => {
      d.visual.colorNotes = !d.visual.colorNotes;
      this.saveRestart();
    });
    next();

    this.label(labelX, y, 'הצג שם על התו:');
    this.toggle(ctrlCenter, y, d.visual.showLabels, () => {
      d.visual.showLabels = !d.visual.showLabels;
      this.saveRestart();
    });
    next();

    // Voice language (three buttons in a row, left of label).
    this.label(labelX, y, 'שפת הקול:');
    const langs: VoiceLang[] = ['it', 'fr', 'es'];
    langs.forEach((lang, i) => {
      this.choice(px + 80 - i * 165, y, d.sound.voiceLang === lang, VOICE_LABEL[lang], () => {
        d.sound.voiceLang = lang;
        game.applySound();
        game.audio.sayNote('דו');
        this.saveRestart();
      }, 155);
    });
    next();

    this.label(labelX, y, '🔊 קול שאומר תווים:');
    this.toggle(ctrlCenter, y, d.sound.voice, () => this.flipSound('voice'));
    next();

    this.label(labelX, y, '🎹 צליל פסנתר אמיתי:');
    this.toggle(ctrlCenter, y, d.sound.pitch, () => this.flipSound('pitch'));
    next();

    this.label(labelX, y, '✨ אפקטים:');
    this.toggle(ctrlCenter, y, d.sound.sfx, () => this.flipSound('sfx'));
    next();

    this.label(labelX, y, '🎵 מוזיקה:');
    this.toggle(ctrlCenter, y, d.sound.music, () => this.flipSound('music'));
    next();

    // Close button below the last row, fully clear of it.
    pillButton(this, px, top + panelH - padBottom - closeH / 2, 'סגור', () => this.close(), {
      width: 240,
      height: closeH,
      color: COLORS.accent,
    });
  }

  private label(x: number, y: number, text: string): void {
    this.add
      .text(x, y, text, {
        fontFamily: 'Rubik, sans-serif',
        fontSize: '28px',
        fontStyle: '700',
        color: '#ffffff',
      })
      .setOrigin(1, 0.5);
  }

  private choice(
    x: number,
    y: number,
    active: boolean,
    label: string,
    onClick: () => void,
    width = 200
  ): void {
    pillButton(this, x, y, label, onClick, {
      width,
      height: 54,
      color: active ? COLORS.good : COLORS.bgDeep,
      fontColor: '#ffffff',
    });
  }

  private toggle(x: number, y: number, val: boolean, onClick: () => void): void {
    this.choice(x, y, val, val ? 'פעיל ✓' : 'כבוי', onClick, 150);
  }

  private setAge(mode: AgeMode): void {
    game.data.ageMode = mode;
    this.saveRestart();
  }

  private flipSound(key: 'voice' | 'pitch' | 'sfx' | 'music'): void {
    game.data.sound[key] = !game.data.sound[key];
    game.applySound();
    this.saveRestart();
  }

  private saveRestart(): void {
    game.persist();
    this.scene.restart();
  }

  private close(): void {
    this.scene.stop();
    this.scene.get('Home').scene.restart();
  }
}
