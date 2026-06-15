/**
 * verify.mjs — drives the game in a real browser to confirm rendering + clicks.
 */
import { chromium } from 'playwright';

const URL = 'http://localhost:5173/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto(URL, { waitUntil: 'networkidle' });
await sleep(1500); // let web fonts load
await page.mouse.click(640, 360);
await sleep(800);

// Click level-1 node (first world row, rightmost node).
await page.mouse.click(1063, 270);
await sleep(500);
await page.screenshot({ path: 'shot-popup.png' });

// The popup has Play (surprise) and Practice (easy). Click Practice.
await page.mouse.click(640, 360 + 78);
await sleep(3400); // through countdown
await page.screenshot({ path: 'shot-gameplay.png' });

// Inspect actual text objects + zones in the gameplay scene.
const probe = await page.evaluate(() => {
  const game = window.__NQ_GAME__;
  const active = game.scene.getScenes(true).find((s) => ['Catcher','Quiz','Boss'].includes(s.scene.key));
  if (!active) return { activeKey: null };
  const texts = [];
  let zones = 0, containers = 0, graphics = 0;
  for (const obj of active.children.list) {
    const t = obj.constructor.name;
    if (t === 'Zone') zones++;
    else if (t === 'Container') containers++;
    else if (t === 'Graphics') graphics++;
    else if (t === 'Text') texts.push(obj.text);
  }
  return { activeKey: active.scene.key, zones, containers, graphics, texts };
});
console.log('PROBE:', JSON.stringify(probe));

// Now actually click where the single button is (center-bottom) and see if score changes.
const before = await page.evaluate(() => {
  const game = window.__NQ_GAME__;
  const active = game.scene.getScenes(true).find((s) => ['Catcher','Quiz','Boss'].includes(s.scene.key));
  return active ? active.score : null;
});
await page.mouse.click(640, 636);
await sleep(400);
const after = await page.evaluate(() => {
  const game = window.__NQ_GAME__;
  const active = game.scene.getScenes(true).find((s) => ['Catcher','Quiz','Boss'].includes(s.scene.key));
  return active ? active.score : null;
});
console.log('SCORE before click:', before, '-> after click:', after, after > before ? '✓ CLICK WORKS' : '✗ no change');
console.log('ERRORS:', errors.length ? errors.slice(0,6) : 'none');

await browser.close();
