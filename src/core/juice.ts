/**
 * juice.ts — reusable game-feel helpers (the "juice").
 *
 * One place for screen-shake, particle bursts, squash & stretch, and flying
 * number pop-ups so EVERY mode feels alike and satisfying. Juice doesn't change
 * rules — it changes how the game feels, and it's the line between "flashcard
 * app" and "game". Pair every visual here with a sound in AudioManager.
 */

import Phaser from 'phaser';

/** Quick camera shake for impacts. Intensity scales the punch. */
export function shake(scene: Phaser.Scene, intensity = 0.006, durationMs = 150): void {
  scene.cameras.main.shake(durationMs, intensity);
}

/** Brief white flash overlay (big wins / mistakes). */
export function flash(scene: Phaser.Scene, color = 0xffffff, durationMs = 120): void {
  const c = Phaser.Display.Color.IntegerToColor(color);
  scene.cameras.main.flash(durationMs, c.red, c.green, c.blue);
}

/**
 * Squash & stretch "pop" on any GameObject with a scale (sprites, containers,
 * text). Pops bigger, then settles back via a bouncy ease.
 */
export function pop(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Components.Transform & { scaleX: number; scaleY: number },
  strength = 1.35
): void {
  const baseX = target.scaleX;
  const baseY = target.scaleY;
  scene.tweens.add({
    targets: target,
    scaleX: baseX * strength,
    scaleY: baseY * (2 - strength * 0.6),
    duration: 90,
    yoyo: true,
    ease: 'Quad.easeOut',
    onComplete: () => {
      target.scaleX = baseX;
      target.scaleY = baseY;
    },
  });
}

/** Colored particle burst at a point — the classic "ding!" confetti. */
export function burst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  count = 16
): void {
  const tex = ensureDotTexture(scene, color);
  const emitter = scene.add.particles(x, y, tex, {
    speed: { min: 120, max: 320 },
    angle: { min: 0, max: 360 },
    scale: { start: 0.9, end: 0 },
    lifespan: { min: 350, max: 650 },
    gravityY: 500,
    quantity: count,
    emitting: false,
  });
  emitter.setDepth(1000);
  emitter.explode(count);
  scene.time.delayedCall(800, () => emitter.destroy());
}

/** Flying number/text pop-up (e.g. "+10", "COMBO x3!") that rises and fades. */
export function popText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color = '#ffd23f',
  size = 36
): void {
  const label = scene.add
    .text(x, y, text, {
      fontFamily: 'Rubik, sans-serif',
      fontSize: `${size}px`,
      fontStyle: '900',
      color,
      stroke: '#000000',
      strokeThickness: 5,
    })
    .setOrigin(0.5)
    .setDepth(1001);
  scene.tweens.add({
    targets: label,
    y: y - 70,
    alpha: 0,
    scale: 1.3,
    duration: 750,
    ease: 'Cubic.easeOut',
    onComplete: () => label.destroy(),
  });
}

/** Lazily create a 1-color round dot texture for particles, cached per color. */
function ensureDotTexture(scene: Phaser.Scene, color: number): string {
  const key = `dot-${color.toString(16)}`;
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(color, 1);
  g.fillCircle(8, 8, 8);
  g.generateTexture(key, 16, 16);
  g.destroy();
  return key;
}
