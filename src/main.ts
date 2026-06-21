/**
 * main.ts — Phaser game config + scene registry. Entry point.
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './core/layout';
import { BootScene } from './scenes/BootScene';
import { HomeScene } from './scenes/HomeScene';
import { SettingsScene } from './scenes/SettingsScene';
import { LessonScene } from './scenes/LessonScene';
import { AdminScene } from './scenes/AdminScene';
import { CatcherScene } from './scenes/modes/CatcherScene';
import { QuizScene } from './scenes/modes/QuizScene';
import { BossScene } from './scenes/modes/BossScene';
import { SpeedRunScene } from './scenes/modes/SpeedRunScene';
import { BuildNoteScene } from './scenes/modes/BuildNoteScene';
import { MemoryEchoScene } from './scenes/modes/MemoryEchoScene';
import { ResultsScene } from './scenes/ResultsScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.bg,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    roundPixels: true,
  },
  scene: [
    BootScene,
    HomeScene,
    SettingsScene,
    LessonScene,
    AdminScene,
    CatcherScene,
    QuizScene,
    BossScene,
    SpeedRunScene,
    BuildNoteScene,
    MemoryEchoScene,
    ResultsScene,
  ],
};

const gameInstance = new Phaser.Game(config);
// Expose for debugging / automated verification.
(window as unknown as { __NQ_GAME__: Phaser.Game }).__NQ_GAME__ = gameInstance;
import('./core/gameState').then((m) => {
  (window as unknown as { __NQ_STATE__: unknown }).__NQ_STATE__ = m.game;
});
