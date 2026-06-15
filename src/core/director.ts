/**
 * director.ts — decides which ENCOUNTER a level plays, so the experience is
 * "surprising and changes each time" instead of one fixed mode.
 *
 * Rules:
 *   • Boss level (last in a world) → always the Boss Duel.
 *   • Little mode (5–8) → mostly calm Practice, occasional Quiz, no surprise
 *     stress. Boss still appears but gentler (handled in BossScene).
 *   • Otherwise → varied: Practice / Quiz, with a seeded-but-shuffled feel so
 *     replaying a level can surprise you.
 *
 * Returns the Phaser scene key to start.
 */

import Phaser from 'phaser';
import { isBossLevel } from './curriculum';
import { game } from './gameState';

export type EncounterKey =
  | 'Catcher'
  | 'Quiz'
  | 'Boss'
  | 'SpeedRun'
  | 'BuildNote'
  | 'MemoryEcho';

/** The varied (non-boss) encounters the director rotates through for kids. */
const VARIED: EncounterKey[] = ['Catcher', 'Quiz', 'SpeedRun', 'BuildNote', 'MemoryEcho'];

/**
 * Start the appropriate encounter for a level from any scene. Optionally force
 * a specific mode (used by the "Practice" easy option / mode select).
 */
export function launchLevel(
  scene: Phaser.Scene,
  world: number,
  level: number,
  forced?: EncounterKey
): void {
  game.audio.unlock();
  const key = pickEncounter(world, level, forced);
  scene.scene.start(key, { world, level });
}

/** If the player forces a specific mode (from a mode-select), honor it. */
export function pickEncounter(
  world: number,
  level: number,
  forced?: EncounterKey
): EncounterKey {
  if (forced) return forced;
  if (isBossLevel(world, level)) return 'Boss';

  if (game.isLittle) {
    // Gentle for little kids: mostly calm Practice, with the relaxed reverse
    // (BuildNote) and the occasional Quiz — no high-pressure SpeedRun.
    const gentle: EncounterKey[] = ['Catcher', 'Catcher', 'BuildNote', 'Quiz'];
    return gentle[(level - 1) % gentle.length];
  }

  // Varied for kids: rotate through all five non-boss modes, anchored by the
  // (world,level) so the journey feels designed, with a dash of randomness so
  // replays can surprise.
  const anchored = VARIED[(world * 7 + level) % VARIED.length];
  if (Math.random() < 0.35) {
    return VARIED[Math.floor(Math.random() * VARIED.length)];
  }
  return anchored;
}
