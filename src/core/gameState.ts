/**
 * gameState.ts — a tiny app-wide singleton holding cross-scene state:
 * the loaded save, the AudioManager, and the SRS instance. Scenes read/write
 * this and persist via save(). Kept deliberately small.
 */

import { AudioManager } from './audio';
import { Srs } from './srs';
import {
  defaultSave,
  load,
  save,
  touchDailyStreak,
  type SaveData,
  type KeyValueStore,
} from './progress';

class GameState {
  data: SaveData = defaultSave();
  audio!: AudioManager;
  srs!: Srs;
  // Lazily resolved so importing this module doesn't require a browser
  // (e.g. in node-based unit tests). Falls back to an in-memory store.
  private _store?: KeyValueStore;
  private get store(): KeyValueStore {
    if (this._store) return this._store;
    this._store =
      typeof localStorage !== 'undefined' ? localStorage : createMemoryStore();
    return this._store;
  }

  init(): void {
    this.data = load(this.store);
    this.audio = new AudioManager(this.data.sound);
    this.srs = Srs.fromJSON(this.data.srs);
    // Daily streak bump on app open.
    const today = new Date().toISOString().slice(0, 10);
    touchDailyStreak(this.data, today);
    this.persist();
  }

  /** Flush SRS into the save blob and write to storage. */
  persist(): void {
    this.data.srs = this.srs.toJSON();
    save(this.store, this.data);
  }

  /** Push current sound settings into the live audio manager + save. */
  applySound(): void {
    this.audio.updateSettings(this.data.sound);
    this.persist();
  }

  get isLittle(): boolean {
    return this.data.ageMode === 'little';
  }

  /**
   * Global time scale for gameplay speed. Easy mode = 0.5 (everything 50%
   * slower). Multiply DURATIONS by this and DIVIDE speeds by it.
   */
  get easyFactor(): number {
    return this.data.easyMode ? 0.5 : 1;
  }
}

function createMemoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
}

export const game = new GameState();
