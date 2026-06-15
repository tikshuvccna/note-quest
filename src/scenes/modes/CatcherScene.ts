/**
 * CatcherScene — "אימון / Practice": the calm, easy encounter.
 *
 * Note CARDS (each a full 5-line mini-staff showing one note in position) drift
 * down toward a hit-line; tap the matching solfège before it crosses. This is
 * the gentle "comfort" experience and the default for Little mode. Now uses the
 * shared BaseGameScene machinery.
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../../core/layout';
import { game } from '../../core/gameState';
import type { Note, Solfege } from '../../core/notes';
import { BaseGameScene } from './BaseGameScene';
import { NoteCard } from '../../rendering/NoteCard';

interface Falling {
  card: NoteCard;
  vy: number;
  answered: boolean;
  lane: number;
}

const HIT_LINE_Y = GAME_HEIGHT - 210;
const SPAWN_Y = 110;
// Horizontal lanes keep notes from overlapping. Cards are ~150px wide, so a
// lane every ~190px gives clear separation.
const LANE_W = 190;

export class CatcherScene extends BaseGameScene {
  private falling: Falling[] = [];
  private spawnTimer?: Phaser.Time.TimerEvent;
  private laneXs: number[] = [];
  private nextLane = 0;
  /** Glow ring + "next" arrow marking the active (lowest) target. */
  private targetMarker?: Phaser.GameObjects.Container;

  constructor() {
    super('Catcher');
  }

  private buildLanes(): void {
    // Center a row of lanes across the playfield.
    const usable = GAME_WIDTH - 320; // margins for HUD/edges
    const count = Math.max(1, Math.floor(usable / LANE_W));
    const startX = GAME_WIDTH / 2 - ((count - 1) * LANE_W) / 2;
    this.laneXs = Array.from({ length: count }, (_, i) => startX + i * LANE_W);
    this.nextLane = 0;
  }

  protected startEncounter(): void {
    // Destroy any leftover cards (e.g. from a replayed scene instance) so none
    // linger or move into the new round.
    for (const f of this.falling) f.card.destroy();
    this.falling = [];
    this.targetMarker?.destroy();
    this.targetMarker = undefined;
    this.buildLanes();
    this.buildHitLine();
    this.buildTargetMarker();
    this.spawnOne();
    this.scheduleNext();
  }

  /** A pulsing glow + downward arrow that marks the note to answer NOW. */
  private buildTargetMarker(): void {
    const c = this.add.container(0, 0).setDepth(45).setVisible(false);
    const ring = this.add.graphics();
    ring.lineStyle(5, this.world.style.accent, 1);
    ring.strokeRoundedRect(-92, -118, 184, 236, 18);
    c.add(ring);
    const arrow = this.add
      .text(0, -150, '👇', { fontSize: '46px' })
      .setOrigin(0.5);
    c.add(arrow);
    this.tweens.add({
      targets: arrow,
      y: -132,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.targetMarker = c;
  }

  private buildHitLine(): void {
    const line = this.add.graphics().setDepth(10);
    line.lineStyle(6, this.world.style.accent, 0.9);
    line.lineBetween(120, HIT_LINE_Y, GAME_WIDTH - 120, HIT_LINE_Y);
    this.add.text(GAME_WIDTH - 100, HIT_LINE_Y, '🎯', { fontSize: '40px' }).setOrigin(0.5).setDepth(10);
  }

  private scheduleNext(): void {
    if (this.finished) return;
    const interval = (this.pacedSeconds(this.level.fallSeconds) * 1000) / this.level.maxConcurrent;
    this.spawnTimer = this.time.delayedCall(interval, () => {
      this.topUp();
      this.scheduleNext();
    });
  }

  /**
   * Ensure there's always at least one answerable note on screen (so clicking
   * is never "dead"), up to maxConcurrent, until we've queued enough.
   */
  private topUp(): void {
    if (this.finished) return;
    while (
      this.spawned < this.level.targetNotes + 4 &&
      this.activeCount() < this.level.maxConcurrent
    ) {
      this.spawnOne();
    }
  }

  private activeCount(): number {
    return this.falling.filter((f) => !f.answered).length;
  }

  private spawnOne(): void {
    if (this.finished || this.spawned >= this.level.targetNotes + 8) return;
    const id = game.srs.pick(this.notePool);
    const note = this.idToNote.get(id)!;
    this.spawned++;

    // Pick a lane not currently occupied near the top, so cards never overlap.
    const lane = this.pickFreeLane();
    const x = this.laneXs[lane];

    const card = this.makeCard(note, 16);
    card.setPosition(x, SPAWN_Y);
    card.setDepth(50);

    const fallPx = HIT_LINE_Y - SPAWN_Y;
    const fallSec = this.pacedSeconds(this.level.fallSeconds);
    this.falling.push({ card, vy: fallPx / fallSec, answered: false, lane });
  }

  /**
   * Choose a lane whose top area is clear, so a new card can't overlap an
   * existing one. Falls back to the lane with the most headroom.
   */
  private pickFreeLane(): number {
    const n = this.laneXs.length;
    // How far down the lowest card in each lane currently is (smaller y = busy top).
    const topMost: number[] = Array(n).fill(Infinity);
    for (const f of this.falling) {
      if (f.answered) continue;
      topMost[f.lane] = Math.min(topMost[f.lane], f.card.y);
    }
    // Prefer lanes whose nearest card is well below the spawn zone (or empty),
    // scanning round-robin so we spread out.
    for (let k = 0; k < n; k++) {
      const lane = (this.nextLane + k) % n;
      if (topMost[lane] > SPAWN_Y + 180) {
        this.nextLane = (lane + 1) % n;
        return lane;
      }
    }
    // All lanes busy near the top → pick the one with the most headroom.
    let best = 0;
    for (let i = 1; i < n; i++) if (topMost[i] > topMost[best]) best = i;
    this.nextLane = (best + 1) % n;
    return best;
  }

  update(_t: number, deltaMs: number): void {
    if (this.finished || !this.running) return; // no movement until countdown ends
    const dt = deltaMs / 1000;

    // Move notes; collect any that crossed the hit-line (don't mutate the list
    // while iterating).
    const missed: Falling[] = [];
    for (const f of this.falling) {
      if (f.answered) continue;
      f.card.y += f.vy * dt;
      if (f.card.y >= HIT_LINE_Y) {
        f.answered = true;
        missed.push(f);
      }
    }
    for (const f of missed) {
      this.registerMiss(f.card.note, f.card.headObject);
      this.fadeOut(f, +40); // removes f from this.falling
    }

    // Safety net: always keep an answerable note present so clicking is never
    // dead.
    if (!this.finished && this.activeCount() === 0) this.topUp();

    this.updateTargetMarker();
  }

  /** Move the glow marker onto the current active target (lowest note). */
  private updateTargetMarker(): void {
    if (!this.targetMarker) return;
    const target = this.lowestUnanswered();
    if (!target) {
      this.targetMarker.setVisible(false);
      return;
    }
    this.targetMarker.setVisible(true);
    this.targetMarker.setPosition(target.card.x, target.card.y);
  }

  private lowestUnanswered(): Falling | undefined {
    let best: Falling | undefined;
    for (const f of this.falling) {
      if (f.answered) continue;
      if (!best || f.card.y > best.card.y) best = f;
    }
    return best;
  }

  /**
   * The target is the LOWEST un-answered note (closest to the hit-line). We do
   * NOT mark it answered here — that happens only in the correct/miss hooks, so
   * a wrong guess leaves the note falling for another try (no frozen cards).
   */
  protected resolveTarget(_picked: Solfege): { note: Note; obj: Phaser.GameObjects.Container } | null {
    const best = this.lowestUnanswered();
    if (!best) return null;
    return { note: best.card.note, obj: best.card.headObject };
  }

  protected onCorrectHook(_note: Note, obj: Phaser.GameObjects.Container): void {
    // Mark answered + fade the matching card, then bring in the next one.
    const f = this.falling.find((x) => x.card.headObject === obj);
    if (f) {
      f.answered = true;
      this.fadeOut(f, -60);
    }
    this.topUp();
  }

  protected onWrongHook(_note: Note, _obj: Phaser.GameObjects.Container): void {
    // Wrong guess: the target note keeps falling so they can try again.
    // Nothing to do — it was never marked answered.
  }

  private fadeOut(f: Falling, dy: number): void {
    // Immediately drop it from the falling list so update() ignores it, and
    // fade quickly so it never looks "stuck". A safety timer guarantees the
    // card is destroyed even if the tween is interrupted.
    this.falling = this.falling.filter((x) => x !== f);
    this.tweens.add({
      targets: f.card,
      y: f.card.y + dy,
      alpha: 0,
      duration: 180,
      ease: 'Cubic.easeOut',
      onComplete: () => f.card.destroy(),
    });
    this.time.delayedCall(300, () => {
      if (f.card.active) f.card.destroy();
    });
  }

  protected finish(won: boolean): void {
    this.spawnTimer?.remove();
    super.finish(won);
  }
}
