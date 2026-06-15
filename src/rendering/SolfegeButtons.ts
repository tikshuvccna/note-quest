/**
 * SolfegeButtons.ts — the answer pad of דו/רה/מי… buttons.
 *
 * Reliability note: each button is added DIRECTLY to the scene (not nested
 * inside a Container), because input hit-testing on deeply-nested interactive
 * containers is fragile in Phaser. A plain interactive Zone over each button
 * guarantees clicks register. The action fires on `pointerdown` for instant
 * response. Buttons sit at a high depth so gameplay objects never cover them.
 *
 * Layout is RTL (first solfège on the right), color-coded by solfège. A button
 * can be temporarily BLOCKED (boss fireball) — presses are ignored and it shows
 * a 🔥 covered state.
 */

import Phaser from 'phaser';
import { SOLFEGE_COLORS, type Solfege } from '../core/notes';

const DEPTH = 800;

export interface SolfegeButtonsOptions {
  choices: Solfege[];
  width: number;
  height: number;
  big?: boolean;
  monochrome?: boolean;
  onPick: (solfege: Solfege) => void;
}

interface BtnRec {
  sol: Solfege;
  x: number;
  y: number;
  w: number;
  h: number;
  bg: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  baseColor: number;
  blocked: boolean;
  redraw: (yOff: number, tint?: number) => void;
}

export class SolfegeButtons {
  private recs: BtnRec[] = [];
  private enabled = true;

  constructor(
    private scene: Phaser.Scene,
    centerX: number,
    centerY: number,
    opts: SolfegeButtonsOptions
  ) {
    const n = opts.choices.length;
    const gap = 14;
    const btnW = (opts.width - gap * (n - 1)) / n;
    const fontSize = (opts.big ? 0.5 : 0.42) * opts.height;
    const monochrome = opts.monochrome ?? false;

    opts.choices.forEach((sol, i) => {
      // RTL: index 0 on the right.
      const x = centerX + (opts.width / 2 - (btnW / 2 + i * (btnW + gap)));
      this.recs.push(
        this.makeButton(sol, x, centerY, btnW, opts.height, fontSize, monochrome, opts.onPick)
      );
    });
  }

  private makeButton(
    sol: Solfege,
    x: number,
    y: number,
    w: number,
    h: number,
    fontSize: number,
    monochrome: boolean,
    onPick: (s: Solfege) => void
  ): BtnRec {
    const scene = this.scene;
    const baseColor = monochrome ? 0x555a7a : SOLFEGE_COLORS[sol];

    const bg = scene.add.graphics().setDepth(DEPTH);
    const redraw = (yOff: number, tint = baseColor) => {
      bg.clear();
      bg.fillStyle(0x000000, 0.35);
      bg.fillRoundedRect(x - w / 2, y - h / 2 + 6, w, h, 18); // shadow
      bg.fillStyle(tint, 1);
      bg.fillRoundedRect(x - w / 2, y - h / 2 + yOff, w, h, 18);
      bg.lineStyle(4, 0xffffff, 0.85);
      bg.strokeRoundedRect(x - w / 2, y - h / 2 + yOff, w, h, 18);
    };
    redraw(0);

    const label = scene.add
      .text(x, y, sol, {
        fontFamily: 'Rubik, sans-serif',
        fontSize: `${fontSize}px`,
        fontStyle: '900',
        color: '#ffffff',
        stroke: '#00000066',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH + 1);

    // A plain interactive Zone covers the button — robust hit-testing.
    const zone = scene.add
      .zone(x, y, w, h)
      .setOrigin(0.5)
      .setDepth(DEPTH + 2)
      .setInteractive({ useHandCursor: true });

    const rec: BtnRec = { sol, x, y, w, h, bg, label, zone, baseColor, blocked: false, redraw };

    zone.on('pointerdown', () => {
      if (!this.enabled || rec.blocked) return;
      redraw(5);
      label.y = y + 5;
      scene.time.delayedCall(90, () => {
        redraw(0);
        label.y = y;
      });
      onPick(sol);
    });

    return rec;
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
  }

  setBlocked(sol: Solfege, blocked: boolean): void {
    const rec = this.recs.find((r) => r.sol === sol);
    if (!rec) return;
    rec.blocked = blocked;
    if (blocked) {
      rec.redraw(0, 0x2a2d55);
      rec.label.setText('🔥');
    } else {
      rec.redraw(0);
      rec.label.setText(rec.sol);
    }
  }

  isBlocked(sol: Solfege): boolean {
    return this.recs.find((r) => r.sol === sol)?.blocked ?? false;
  }

  allSolfege(): Solfege[] {
    return this.recs.map((r) => r.sol);
  }

  highlight(sol: Solfege, color = 0x4caf50): void {
    const rec = this.recs.find((r) => r.sol === sol);
    if (!rec) return;
    const ring = this.scene.add.graphics().setDepth(DEPTH + 3);
    ring.lineStyle(6, color, 1);
    ring.strokeRoundedRect(rec.x - rec.w / 2 - 4, rec.y - rec.h / 2 - 4, rec.w + 8, rec.h + 8, 20);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      duration: 600,
      onComplete: () => ring.destroy(),
    });
  }

  /** Remove all button objects (on scene shutdown/restart). */
  destroy(): void {
    for (const r of this.recs) {
      r.bg.destroy();
      r.label.destroy();
      r.zone.destroy();
    }
    this.recs = [];
  }
}
