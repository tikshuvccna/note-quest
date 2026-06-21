/**
 * codes.ts — resume codes (one per world) and a hidden admin code.
 *
 * A kid who stops can type their world's code to jump back in — works even on a
 * new device or after the browser is cleared. Redeeming a world code unlocks
 * that world and every world before it (via progress.unlockUpToWorld).
 *
 * Codes are short, memorable, and themed to each world. Matching is
 * case-insensitive and ignores surrounding spaces, so "Star3" == "STAR3".
 *
 * The ADMIN code opens the admin panel (AdminScene) instead of unlocking a
 * world — handled by the caller, which checks `isAdminCode`.
 */

import { unlockUpToWorld, type SaveData } from './progress';
import { WORLDS } from './curriculum';

/** Level counts per world, for unlocking all prior stages. */
const LEVEL_COUNTS = WORLDS.map((w) => w.levels.length);

/** Per-world resume codes (world id → code). Themed for memorability. */
export const WORLD_CODES: Record<number, string> = {
  1: 'DOSTART',  // world 1 — דו, the beginning
  2: 'SEAMIRE', // world 2 — 🌊 the sea (do·re·mi)
  3: 'TREEFA',  // world 3 — 🌳 the forest (+פה·סול)
  4: 'MAGICLA', // world 4 — 🔮 magic (full octave +לה·סי)
  5: 'DUNEHOP', // world 5 — 🏜️ desert (into 2nd octave)
  6: 'SPACE6',  // world 6 — 🌌 space (high octave)
  7: 'LAVA7',   // world 7 — 🌋 volcano (big leaps)
  8: 'ICEPEAK', // world 8 — ❄️ ice (high ledger lines)
};

/** The hidden admin code — opens the admin panel. */
export const ADMIN_CODE = 'MAESTRO';

/** Normalize a typed code for comparison. */
function norm(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

export function isAdminCode(code: string): boolean {
  return norm(code) === ADMIN_CODE;
}

/** Which world (if any) a code unlocks. Returns the world id, or null. */
export function worldForCode(code: string): number | null {
  const n = norm(code);
  for (const [world, c] of Object.entries(WORLD_CODES)) {
    if (norm(c) === n) return Number(world);
  }
  return null;
}

export type RedeemResult =
  | { kind: 'admin' }
  | { kind: 'world'; world: number }
  | { kind: 'invalid' };

/**
 * Redeem a typed code against the save. For a world code it unlocks up to that
 * world and returns which one (so the UI can jump there). Admin codes are
 * reported back so the caller can open the admin panel. Invalid → no change.
 */
export function redeemCode(data: SaveData, code: string): RedeemResult {
  if (isAdminCode(code)) return { kind: 'admin' };
  const world = worldForCode(code);
  if (world == null) return { kind: 'invalid' };
  unlockUpToWorld(data, world, LEVEL_COUNTS);
  return { kind: 'world', world };
}

/** The code for a world (for showing on the world banner / results). */
export function codeForWorld(world: number): string | undefined {
  return WORLD_CODES[world];
}
