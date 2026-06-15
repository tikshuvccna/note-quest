/**
 * HomeScene — the world-map journey + the four meta tracks at a glance.
 *
 * Resource bar (🏆 trophies, 🪙 coins, ⭐ stars, 🔥 streak), then a vertically
 * SCROLLABLE map of worlds (each themed by its style), each world a path of
 * level nodes. Tapping an unlocked level opens a small popup: "▶️ שחק" launches
 * the surprise encounter (the director picks), "🌱 אימון" forces the calm
 * Practice mode (the easy option the player asked to keep).
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../core/layout';
import { game } from '../core/gameState';
import { WORLDS } from '../core/curriculum';
import { isLevelUnlocked, totalStars, levelKey, isLessonDone } from '../core/progress';
import { pillButton, resourceChip } from '../ui/widgets';
import { launchLevel } from '../core/director';

const MAP_TOP = 180; // where the scrollable map area starts
const ROW_H = 150;

export class HomeScene extends Phaser.Scene {
  private mapLayer!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScroll = 0;

  constructor() {
    super('Home');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg);

    this.mapLayer = this.add.container(0, MAP_TOP);
    this.buildWorlds();
    this.setupScroll();

    // Header (drawn on top of the map).
    this.add.rectangle(0, 0, GAME_WIDTH, MAP_TOP, COLORS.bg, 1).setOrigin(0).setDepth(100);
    this.add
      .text(GAME_WIDTH / 2, 56, '🎵 מסע התווים', {
        fontFamily: 'Rubik, sans-serif',
        fontSize: '54px',
        fontStyle: '900',
        color: '#ffd23f',
      })
      .setOrigin(0.5)
      .setDepth(101);
    this.buildResourceBar();
    pillButton(this, 150, 56, '⚙️ הגדרות', () => this.scene.launch('Settings'), {
      width: 200,
      height: 60,
      color: COLORS.panel,
      fontColor: '#ffffff',
    }).setDepth(101);
  }

  private buildResourceBar(): void {
    const y = 130;
    const d = game.data;
    [
      resourceChip(this, GAME_WIDTH - 110, y, '🏆', d.trophies),
      resourceChip(this, GAME_WIDTH - 270, y, '🪙', d.coins),
      resourceChip(this, GAME_WIDTH - 430, y, '⭐', totalStars(d)),
      resourceChip(this, GAME_WIDTH - 590, y, '🔥', d.streak),
    ].forEach((c) => c.setDepth(101));
  }

  private buildWorlds(): void {
    let y = 50;
    for (const world of WORLDS) {
      // World banner strip in its own theme color.
      const strip = this.add.graphics();
      strip.fillStyle(world.style.bg, 1);
      strip.fillRoundedRect(40, y - 40, GAME_WIDTH - 80, ROW_H - 20, 18);
      strip.lineStyle(3, world.style.accent, 0.5);
      strip.strokeRoundedRect(40, y - 40, GAME_WIDTH - 80, ROW_H - 20, 18);
      this.mapLayer.add(strip);

      const title = this.add
        .text(GAME_WIDTH - 70, y - 10, `${world.style.theme}  ·  ${world.title}`, {
          fontFamily: 'Rubik, sans-serif',
          fontSize: '28px',
          fontStyle: '700',
          color: '#ffffff',
        })
        .setOrigin(1, 0.5);
      this.mapLayer.add(title);

      // 📖 Lesson (re)play button, to the left of the title.
      const lessonBtn = this.add
        .text(title.x - title.width - 24, y - 10, '📖', { fontSize: '30px' })
        .setOrigin(1, 0.5)
        .setInteractive({ useHandCursor: true });
      const wId = world.id;
      lessonBtn.on('pointerdown', () => this.scene.start('Lesson', { world: wId, level: 1 }));
      this.mapLayer.add(lessonBtn);

      // Level nodes — fit by spacing to width.
      const n = world.levels.length;
      const usableW = GAME_WIDTH - 220;
      const stepX = usableW / n;
      const startX = GAME_WIDTH - 110;
      world.levels.forEach((lvl, i) => {
        const x = startX - i * stepX - stepX / 2;
        this.buildLevelNode(world, lvl.index, x, y + 40, i === n - 1);
      });

      y += ROW_H;
    }
    this.maxScroll = Math.max(0, y - (GAME_HEIGHT - MAP_TOP) + 40);
  }

  private buildLevelNode(
    world: (typeof WORLDS)[number],
    levelIndex: number,
    x: number,
    y: number,
    isBoss: boolean
  ): void {
    const unlocked = isLevelUnlocked(game.data, world.id, levelIndex);
    const stars = game.data.levelStars[levelKey(world.id, levelIndex)] ?? 0;
    const r = isBoss ? 38 : 30;

    const g = this.add.graphics();
    g.fillStyle(unlocked ? (isBoss ? 0xd84315 : world.style.accent) : 0x3a3d66, 1);
    g.fillCircle(x, y, r);
    g.lineStyle(4, 0xffffff, unlocked ? 0.9 : 0.3);
    g.strokeCircle(x, y, r);
    this.mapLayer.add(g);

    const label = isBoss ? '👑' : `${levelIndex}`;
    const txt = this.add
      .text(x, y, label, {
        fontFamily: 'Rubik, sans-serif',
        fontSize: isBoss ? '34px' : '26px',
        fontStyle: '900',
        color: unlocked ? '#14152b' : '#6a6d99',
      })
      .setOrigin(0.5);
    this.mapLayer.add(txt);

    if (unlocked) {
      const starStr = '★★★'.slice(0, stars) + '☆☆☆'.slice(0, 3 - stars);
      const st = this.add
        .text(x, y + r + 10, starStr, { fontFamily: 'sans-serif', fontSize: '16px', color: '#ffd23f' })
        .setOrigin(0.5);
      this.mapLayer.add(st);

      const hit = this.add.circle(x, y, r + 6).setInteractive({ useHandCursor: true }).setAlpha(0.001);
      hit.on('pointerup', () => this.openLevelPopup(world.id, levelIndex, isBoss));
      this.mapLayer.add(hit);
    } else {
      const lock = this.add.text(x, y, '🔒', { fontSize: '22px' }).setOrigin(0.5);
      this.mapLayer.add(lock);
    }
  }

  // ---- Scrolling --------------------------------------------------------

  private setupScroll(): void {
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.applyScroll(this.scrollY - dy * 0.6);
    });
    let dragging = false;
    let lastY = 0;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y > MAP_TOP) {
        dragging = true;
        lastY = p.y;
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (dragging && p.isDown) {
        this.applyScroll(this.scrollY + (p.y - lastY));
        lastY = p.y;
      }
    });
    this.input.on('pointerup', () => (dragging = false));
  }

  private applyScroll(v: number): void {
    this.scrollY = Phaser.Math.Clamp(v, -this.maxScroll, 0);
    this.mapLayer.y = MAP_TOP + this.scrollY;
  }

  // ---- Level popup: Play (surprise) vs Practice (easy) ------------------

  private openLevelPopup(world: number, level: number, isBoss: boolean): void {
    const overlay = this.add.container(0, 0).setDepth(900);
    overlay.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65).setOrigin(0).setInteractive());

    const pw = 560;
    const ph = 340;
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.panel, 1);
    panel.fillRoundedRect(GAME_WIDTH / 2 - pw / 2, GAME_HEIGHT / 2 - ph / 2, pw, ph, 24);
    overlay.add(panel);

    overlay.add(
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 110, isBoss ? '👑 קרב בּוס!' : `שלב ${level}`, {
          fontFamily: 'Rubik, sans-serif',
          fontSize: '46px',
          fontStyle: '900',
          color: '#ffffff',
        })
        .setOrigin(0.5)
    );

    const close = () => overlay.destroy();
    // First time entering a world → teach it first. The lesson returns to the
    // level (gotoLevel) after its practice gate is passed.
    const needsLesson = !isLessonDone(game.data, world);

    overlay.add(
      pillButton(
        this,
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - 20,
        needsLesson ? '📖 שיעור ומשחק' : '▶️ שחק (הפתעה)',
        () => {
          close();
          if (needsLesson) this.scene.start('Lesson', { world, level });
          else launchLevel(this, world, level);
        },
        { width: 380, height: 78, color: COLORS.good, fontColor: '#ffffff' }
      )
    );

    if (!isBoss) {
      overlay.add(
        pillButton(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 78, '🌱 אימון (קל)', () => {
          close();
          if (needsLesson) this.scene.start('Lesson', { world, level });
          else launchLevel(this, world, level, 'Catcher');
        }, { width: 380, height: 70, color: COLORS.accent })
      );
    }

    overlay.add(
      pillButton(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + (isBoss ? 80 : 158), 'סגור', close, {
        width: 200,
        height: 56,
        color: COLORS.bgDeep,
        fontColor: '#ffffff',
      })
    );
  }
}
