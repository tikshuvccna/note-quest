/**
 * BossScene — "קרב בּוס / Boss Duel": the star, high-tension encounter.
 *
 * A fire-spitting boss faces the player. A single big NOTE CARD (full staff)
 * appears; read it correctly to strike the boss (its HP drops, it recoils).
 * Clear `targetNotes` correct reads → the boss is defeated → you win.
 *
 * THE TWIST (timing matters): the boss periodically ATTACKS, spitting fireballs
 * that land on answer-buttons and BLOCK them for a couple of seconds. A blocked
 * button can't be pressed — so if the note you need is on fire, you must wait
 * for it to clear (or read a different note). Pressing wildly during an attack
 * risks misses. Good timing = read in the safe windows.
 *
 * Little mode: the boss attacks less often and never fully blocks all buttons.
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../../core/layout';
import { game } from '../../core/gameState';
import type { Note, Solfege } from '../../core/notes';
import { BaseGameScene } from './BaseGameScene';
import { NoteCard } from '../../rendering/NoteCard';
import * as juice from '../../core/juice';

const BOSS_X = GAME_WIDTH / 2;
const BOSS_Y = 180;
const NOTE_Y = 400;

export class BossScene extends BaseGameScene {
  private bossHpMax = 0;
  private bossHp = 0;
  private boss!: Phaser.GameObjects.Container;
  private bossSprite!: Phaser.GameObjects.Text;
  private hpBar!: Phaser.GameObjects.Graphics;
  private currentCard?: NoteCard;
  private attackTimer?: Phaser.Time.TimerEvent;
  private accepting = false;

  constructor() {
    super('Boss');
  }

  protected startEncounter(): void {
    this.bossHpMax = this.level.targetNotes;
    this.bossHp = this.bossHpMax;
    this.buildBoss();
    this.nextNote();
    this.scheduleAttack();
  }

  // ---- Boss visuals -----------------------------------------------------

  private buildBoss(): void {
    this.boss = this.add.container(BOSS_X, BOSS_Y).setDepth(40);
    // A chunky cartoon monster from emoji + a colored body.
    const body = this.add.graphics();
    body.fillStyle(0x000000, 0.3);
    body.fillEllipse(0, 70, 220, 40);
    this.boss.add(body);
    this.bossSprite = this.add
      .text(0, 0, this.bossEmoji(), { fontSize: '150px' })
      .setOrigin(0.5);
    this.boss.add(this.bossSprite);
    // Idle bob.
    this.tweens.add({
      targets: this.bossSprite,
      y: -14,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.hpBar = this.add.graphics().setDepth(40);
    this.drawHp();
    this.add
      .text(BOSS_X, BOSS_Y + 110, 'הבּוס', {
        fontFamily: 'Rubik, sans-serif',
        fontSize: '28px',
        fontStyle: '900',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(40);
  }

  /** Different boss per world theme. */
  private bossEmoji(): string {
    const e = ['👹', '🐉', '🦖', '👾', '🦂', '👻', '🌋', '🧊'];
    return e[(this.world.id - 1) % e.length] ?? '👹';
  }

  private drawHp(): void {
    const g = this.hpBar;
    g.clear();
    const w = 320;
    const h = 22;
    const x = BOSS_X - w / 2;
    const y = BOSS_Y + 80;
    g.fillStyle(0x000000, 0.5);
    g.fillRoundedRect(x, y, w, h, h / 2);
    const frac = Phaser.Math.Clamp(this.bossHp / this.bossHpMax, 0, 1);
    g.fillStyle(frac > 0.3 ? 0xe53935 : 0xff7043, 1);
    if (frac > 0) g.fillRoundedRect(x, y, w * frac, h, h / 2);
  }

  // ---- Note presentation ------------------------------------------------

  private nextNote(): void {
    if (this.finished) return;
    this.currentCard?.destroy();
    const id = game.srs.pick(this.notePool);
    const note = this.idToNote.get(id)!;
    const card = this.makeCard(note, 20);
    card.setPosition(GAME_WIDTH / 2, NOTE_Y).setDepth(60).setScale(0.6);
    this.tweens.add({ targets: card, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.currentCard = card;
    this.accepting = true;
  }

  protected resolveTarget(_picked: Solfege): { note: Note; obj: Phaser.GameObjects.Container } | null {
    if (!this.accepting || !this.currentCard) return null;
    this.accepting = false; // consume this note
    return { note: this.currentCard.note, obj: this.currentCard.headObject };
  }

  protected onCorrectHook(_note: Note, _obj: Phaser.GameObjects.Container): void {
    // Strike the boss.
    this.bossHp = Math.max(0, this.bossHp - 1);
    this.drawHp();
    this.dealHitFx();
    if (this.bossHp <= 0) {
      this.defeatBoss();
      return;
    }
    this.time.delayedCall(260, () => this.nextNote());
  }

  protected onWrongHook(_note: Note, _obj: Phaser.GameObjects.Container): void {
    // Re-allow answering the same note after a brief beat.
    this.time.delayedCall(220, () => {
      this.accepting = true;
    });
  }

  private dealHitFx(): void {
    juice.shake(this, 0.01, 180);
    this.tweens.add({
      targets: this.bossSprite,
      x: Phaser.Math.Between(-20, 20),
      duration: 60,
      yoyo: true,
      repeat: 3,
      onComplete: () => (this.bossSprite.x = 0),
    });
    this.bossSprite.setTint?.(0xff6666);
    this.time.delayedCall(150, () => this.bossSprite.clearTint?.());
    juice.popText(this, BOSS_X, BOSS_Y, '💥', '#ffd23f', 60);
  }

  // ---- Boss attacks: fireballs that block buttons -----------------------

  private scheduleAttack(): void {
    if (this.finished) return;
    const baseGap = game.isLittle ? 5200 : 3400;
    // Easy mode → bigger gaps between attacks (÷easyFactor = 2× longer).
    const gap = baseGap / Math.max(0.8, this.diff.speedMultiplier) / game.easyFactor;
    this.attackTimer = this.time.delayedCall(gap, () => {
      this.doAttack();
      this.scheduleAttack();
    });
  }

  private doAttack(): void {
    if (this.finished || !this.buttons) return;
    // Pick 1–2 buttons to set on fire (never all of them).
    const all = this.buttons.allSolfege();
    const maxBlock = game.isLittle ? 1 : Math.min(2, all.length - 1);
    const count = Phaser.Math.Between(1, maxBlock);
    const targets = Phaser.Utils.Array.Shuffle([...all]).slice(0, count);

    // Telegraph: boss roars.
    juice.popText(this, BOSS_X, BOSS_Y - 90, '🔥 התקפה!', '#ff5252', 36);
    this.tweens.add({ targets: this.bossSprite, scale: 1.18, duration: 160, yoyo: true });

    for (const sol of targets) this.spitFireball(sol);
  }

  private spitFireball(sol: Solfege): void {
    // Fireball flies from the boss to the button row, then blocks it.
    const fb = this.add.text(BOSS_X, BOSS_Y, '🔥', { fontSize: '54px' }).setOrigin(0.5).setDepth(200);
    const targetY = GAME_HEIGHT - 84;
    // Approx x of the button is unknown here; fly to button row center-ish and
    // block by solfège (the button knows its own position/state).
    this.tweens.add({
      targets: fb,
      y: targetY,
      x: BOSS_X + Phaser.Math.Between(-300, 300),
      angle: 360,
      duration: 520,
      ease: 'Quad.easeIn',
      onComplete: () => {
        fb.destroy();
        this.blockButton(sol);
      },
    });
  }

  private blockButton(sol: Solfege): void {
    if (this.finished || !this.buttons) return;
    this.buttons.setBlocked(sol, true);
    juice.shake(this, 0.006, 120);
    const blockMs = game.isLittle ? 1400 : 2000;
    this.time.delayedCall(blockMs, () => this.buttons?.setBlocked(sol, false));
  }

  // ---- Defeat -----------------------------------------------------------

  private defeatBoss(): void {
    this.accepting = false;
    this.attackTimer?.remove();
    // Clear any fire.
    if (this.buttons) for (const sol of this.buttons.allSolfege()) this.buttons.setBlocked(sol, false);
    juice.flash(this, 0xffffff, 200);
    juice.shake(this, 0.02, 600);
    game.audio.sfxWin();
    juice.burst(this, BOSS_X, BOSS_Y, 0xffd23f, 40);
    this.tweens.add({
      targets: this.boss,
      scale: 0,
      angle: 220,
      alpha: 0,
      duration: 700,
      ease: 'Back.easeIn',
    });
    this.currentCard?.destroy();
    this.cleared = this.level.targetNotes; // mark complete
    this.time.delayedCall(900, () => this.finish(true));
  }

  protected finish(won: boolean): void {
    this.attackTimer?.remove();
    super.finish(won);
  }
}
