/**
 * widgets.ts — small reusable UI builders (pill button, resource chip, panel).
 * Keeps scenes terse and the look consistent.
 */

import Phaser from 'phaser';
import { COLORS } from '../core/layout';

export function pillButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts: { width?: number; height?: number; color?: number; fontColor?: string } = {}
): Phaser.GameObjects.Container {
  const w = opts.width ?? 240;
  const h = opts.height ?? 72;
  const color = opts.color ?? COLORS.accent;
  const c = scene.add.container(x, y);

  const g = scene.add.graphics();
  const draw = (yOff: number) => {
    g.clear();
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, h / 2);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-w / 2, -h / 2 + yOff, w, h, h / 2);
  };
  draw(0);
  c.add(g);

  const t = scene.add
    .text(0, 0, label, {
      fontFamily: 'Rubik, sans-serif',
      fontSize: `${h * 0.4}px`,
      fontStyle: '900',
      color: opts.fontColor ?? '#14152b',
    })
    .setOrigin(0.5);
  c.add(t);

  // Input on a dedicated Zone added DIRECTLY to the scene (not nested in the
  // container) at the button's absolute position, firing on pointerdown for
  // instant response. Interactive nested containers + pointerup were flaky in
  // Phaser — that caused the "takes ages to respond" lag on Results buttons.
  const zone = scene.add
    .zone(x, y, w, h)
    .setOrigin(0.5)
    .setDepth(2000)
    .setInteractive({ useHandCursor: true });
  // Short debounce (not a permanent lock): swallows accidental double-taps and
  // duplicate events during scene transitions, but the button stays clickable
  // for repeated use (admin panel, settings toggles, etc.).
  let lastClick = 0;
  zone.on('pointerdown', () => {
    const now = scene.time.now;
    if (now - lastClick < 250) return;
    lastClick = now;
    draw(5);
    t.y = 5;
    scene.time.delayedCall(90, () => {
      draw(0);
      t.y = 0;
    });
    onClick();
  });
  // Clean the scene-level zone up if the button container is destroyed.
  c.once('destroy', () => zone.destroy());
  return c;
}

/** A resource chip like "🏆 1240" or "🔥 3". */
export function resourceChip(
  scene: Phaser.Scene,
  x: number,
  y: number,
  icon: string,
  value: string | number
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const w = 150;
  const h = 52;
  const g = scene.add.graphics();
  g.fillStyle(COLORS.bgDeep, 0.8);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  c.add(g);
  const t = scene.add
    .text(0, 0, `${icon} ${value}`, {
      fontFamily: 'Rubik, sans-serif',
      fontSize: '26px',
      fontStyle: '700',
      color: '#ffffff',
    })
    .setOrigin(0.5);
  c.add(t);
  c.setData('label', t);
  return c;
}
