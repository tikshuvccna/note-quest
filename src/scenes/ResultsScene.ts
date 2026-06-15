/**
 * ResultsScene — closes the loop: stars, rewards, and "play again" / "next".
 *
 * Every round ends with a reward (Supercell principle), and the next action is
 * one tap away. Awards stars (best-of), trophies, coins, advances the streak,
 * and persists. Big juicy star reveal + reward chips.
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../core/layout';
import { game } from '../core/gameState';
import { getWorld } from '../core/curriculum';
import { recordStars, starsFor } from '../core/progress';
import { pillButton } from '../ui/widgets';
import { launchLevel } from '../core/director';
import * as juice from '../core/juice';

interface ResultData {
  world: number;
  level: number;
  won: boolean;
  accuracy: number;
  score: number;
  bestCombo: number;
  cleared: number;
  target: number;
}

export class ResultsScene extends Phaser.Scene {
  constructor() {
    super('Results');
  }

  create(data: ResultData): void {
    this.cameras.main.setBackgroundColor(COLORS.bg);

    const stars = starsFor(data.accuracy, data.won);
    const improved = recordStars(game.data, data.world, data.level, stars);

    // Rewards: trophies scale with stars + score; coins from score.
    const trophyGain = data.won ? 10 + stars * 10 : 3;
    const coinGain = Math.round(data.score / 5);
    game.data.trophies += trophyGain;
    game.data.coins += coinGain;
    game.persist();

    const title = data.won ? 'כל הכבוד! 🎉' : 'כמעט! נסה שוב 💪';
    this.add
      .text(GAME_WIDTH / 2, 110, title, {
        fontFamily: 'Rubik, sans-serif',
        fontSize: '64px',
        fontStyle: '900',
        color: data.won ? '#4caf50' : '#ff7043',
      })
      .setOrigin(0.5);

    this.revealStars(stars);
    this.showRewards(trophyGain, coinGain, data, improved);
    this.buildButtons(data);

    if (data.won) {
      game.audio.sfxWin();
      this.time.delayedCall(300, () => juice.burst(this, GAME_WIDTH / 2, 220, COLORS.accent, 30));
    }
  }

  private revealStars(stars: number): void {
    const y = 250;
    const spacing = 130;
    for (let i = 0; i < 3; i++) {
      const x = GAME_WIDTH / 2 + (i - 1) * spacing;
      const filled = i < stars;
      const star = this.add
        .text(x, y, filled ? '★' : '☆', {
          fontFamily: 'sans-serif',
          fontSize: '110px',
          color: filled ? '#ffd23f' : '#3a3d66',
        })
        .setOrigin(0.5)
        .setScale(0);
      this.tweens.add({
        targets: star,
        scale: 1,
        duration: 350,
        delay: 250 + i * 250,
        ease: 'Back.easeOut',
        onStart: () => {
          this.time.delayedCall(250 + i * 250, () => {
            if (filled) {
              juice.pop(this, star, 1.3);
              juice.burst(this, x, y, COLORS.accent, 12);
              game.audio.sfxCombo(i + 2);
            }
          });
        },
      });
    }
  }

  private showRewards(
    trophyGain: number,
    coinGain: number,
    data: ResultData,
    improved: boolean
  ): void {
    const y = 420;
    const line = `🏆 +${trophyGain}    🪙 +${coinGain}    🎯 ${data.cleared}/${data.target}`;
    this.add
      .text(GAME_WIDTH / 2, y, line, {
        fontFamily: 'Rubik, sans-serif',
        fontSize: '40px',
        fontStyle: '700',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    if (data.bestCombo >= 3) {
      this.add
        .text(GAME_WIDTH / 2, y + 56, `🔥 קומבו שיא: ${data.bestCombo}`, {
          fontFamily: 'Rubik, sans-serif',
          fontSize: '32px',
          color: '#ff7043',
        })
        .setOrigin(0.5);
    }
    if (improved) {
      this.add
        .text(GAME_WIDTH / 2, y + 100, '⭐ שיא חדש!', {
          fontFamily: 'Rubik, sans-serif',
          fontSize: '30px',
          color: '#ffd23f',
        })
        .setOrigin(0.5);
    }
  }

  private buildButtons(data: ResultData): void {
    const y = GAME_HEIGHT - 90;
    pillButton(this, GAME_WIDTH / 2 - 280, y, '🔁 שוב', () =>
      launchLevel(this, data.world, data.level)
    );

    // Next level if there is one and we won; else back home.
    const world = getWorld(data.world);
    const hasNext = data.level < world.levels.length;
    if (data.won && hasNext) {
      pillButton(
        this,
        GAME_WIDTH / 2 + 280,
        y,
        'הבא ➡️',
        () => launchLevel(this, data.world, data.level + 1),
        { color: COLORS.good, fontColor: '#ffffff' }
      );
    }
    pillButton(this, GAME_WIDTH / 2, y, '🗺️ מפה', () => this.scene.start('Home'), {
      color: COLORS.panel,
      fontColor: '#ffffff',
    });
  }
}
