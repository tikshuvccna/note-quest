/**
 * BootScene — initializes global state and WAITS FOR THE WEB FONT before
 * starting the game.
 *
 * Why the wait: Phaser draws text to a canvas using whatever font is available
 * *at draw time*. If Rubik (our Hebrew font) hasn't loaded yet, Hebrew text
 * renders with a fallback that mangles the glyphs (e.g. "דו" came out looking
 * like "IT"). So we explicitly load the Rubik weights we use, await
 * document.fonts.ready, and only then start Home — guaranteeing correct Hebrew.
 */

import Phaser from 'phaser';
import { game } from '../core/gameState';

const FONT = 'Rubik';
const WEIGHTS = ['400', '700', '900'];

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    game.init();

    // First user gesture anywhere unlocks audio (autoplay policy).
    this.input.once('pointerdown', () => game.audio.unlock());

    void this.ready();
  }

  private async ready(): Promise<void> {
    await this.loadFonts();

    const splash = document.getElementById('splash');
    if (splash) splash.classList.add('hidden');

    this.scene.start('Home');
  }

  private async loadFonts(): Promise<void> {
    if (typeof document === 'undefined' || !document.fonts) return;
    try {
      // Ask the browser to load each weight with a Hebrew sample so the glyphs
      // are actually fetched, then wait for all font loading to settle.
      await Promise.all(
        WEIGHTS.map((w) => document.fonts.load(`${w} 40px ${FONT}`, 'דו רה מי'))
      );
      await document.fonts.ready;
    } catch {
      // If font loading fails (offline, etc.), proceed anyway with fallback.
    }
  }
}
