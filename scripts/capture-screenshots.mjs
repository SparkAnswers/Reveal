// Captures crisp (2x) screenshots of the demo dashboards and a GIF of a scheduled reveal.
// Usage: node scripts/capture-screenshots.mjs [grafanaUrl] [chromePath]
// Requires a running Grafana with the demo dashboards provisioned (admin/admin for the editor shot).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const base = process.argv[2] ?? 'http://localhost:3000';
const executablePath = process.argv[3] ?? process.env.CHROME_PATH;
const out = path.resolve('imgs');
const frames = path.resolve('.cache/frames');
fs.mkdirSync(out, { recursive: true });
fs.rmSync(frames, { recursive: true, force: true });
fs.mkdirSync(frames, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const untilNextEvenMinute = () => {
  const now = Date.now();
  const twoMin = 120_000;
  return Math.ceil(now / twoMin) * twoMin - now;
};

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

// Log in so the editor view is available.
await page.goto(`${base}/login`);
await page.fill('input[name="user"]', 'admin');
await page.fill('input[name="password"]', 'admin');
await page.press('input[name="password"]', 'Enter');
// Grafana may show the "update your password" prompt on the same URL; skip it if so.
const skip = page.getByTestId('data-testid Skip change password button');
await Promise.race([
  skip.waitFor({ timeout: 15_000 }),
  page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 15_000 }),
]).catch(() => {});
if (await skip.isVisible().catch(() => false)) {
  await skip.click();
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 15_000 }).catch(() => {});
}

const panel = (title) => page.locator(`section[data-testid="data-testid Panel header ${title}"]`);
const shot = async (file) => {
  await page.screenshot({ path: path.join(out, file), fullPage: false });
  console.log('wrote', file);
};
const open = async (uid, extra = '') => {
  await page.goto(`${base}/d/${uid}?orgId=1${extra}`);
  await page.waitForSelector('section[data-testid^="data-testid Panel header"]');
  await page
    .waitForFunction(() => !document.querySelector('[aria-label="Panel loading bar"]'), null, { timeout: 15_000 })
    .catch(() => {});
  await sleep(1500);
};

// 1. Editor: the pixelate panel on the Reveal demo dashboard.
await open('reveal-demo', '&editPanel=2');
await page.waitForSelector('text=Reveal date');
await sleep(1000);
await shot('panel-editor.png');
await page
  .getByTestId('data-testid Discard changes button')
  .click()
  .catch(() => {});

// 2. Wait for the start of an even minute, then film the Bike reveal blurring in.
await open('reveal-motorcycle');
const wait = untilNextEvenMinute();
console.log(`waiting ${Math.round(wait / 1000)}s for the next cycle`);
await sleep(wait - 500);
const clip = await panel('Bike reveal').boundingBox();
const map = await panel('Last ride').boundingBox();
const region = {
  x: Math.floor(clip.x),
  y: Math.floor(clip.y),
  width: Math.ceil(map.x + map.width - clip.x),
  height: Math.ceil(clip.height),
};
const t0 = Date.now();
let i = 0;
while (Date.now() - t0 < 19_000) {
  await page.screenshot({ path: path.join(frames, `f${String(i).padStart(3, '0')}.png`), clip: region, scale: 'css' });
  i++;
  await sleep(400);
}
console.log('captured', i, 'frames');
await sleep(2000);
await shot('motorcycle-dashboard.png');

// 3. Micron page (pixelate finishes 20 s into the cycle).
await open('reveal-memory');
await shot('memory-dashboard.png');

// 4. Reveal demo (even-minute panel is showing until +60 s).
await open('reveal-demo');
await shot('reveal-dashboard.png');

// 5. Ghost demo: wait until a ghost is showing, film it waving, then take the still.
await open('reveal-ghost');
const ghostFrames = path.resolve('.cache/ghost-frames');
fs.rmSync(ghostFrames, { recursive: true, force: true });
fs.mkdirSync(ghostFrames, { recursive: true });
await page.waitForFunction(
  () =>
    [...document.querySelectorAll('section[data-testid^="data-testid Panel header"] img')].some((i) =>
      i.src.startsWith('data:image/gif')
    ),
  null,
  { timeout: 130_000 }
);
let g = 0;
const g0 = Date.now();
while (Date.now() - g0 < 6_000) {
  await page.screenshot({ path: path.join(ghostFrames, `f${String(g).padStart(3, '0')}.png`), scale: 'css' });
  g++;
  await sleep(300);
}
console.log('captured', g, 'ghost frames');
await shot('ghost-dashboard.png');

// 6. Memory demo: film the pixelate reveal on the next cycle (it runs 0-20 s into an even minute).
await open('reveal-memory');
const memFrames = path.resolve('.cache/memory-frames');
fs.rmSync(memFrames, { recursive: true, force: true });
fs.mkdirSync(memFrames, { recursive: true });
const wait2 = untilNextEvenMinute();
console.log(`waiting ${Math.round(wait2 / 1000)}s for the memory cycle`);
await sleep(wait2 - 500);
const mem = await panel('Memory reveal').boundingBox();
const bw = await panel('Bandwidth per channel').boundingBox();
const memRegion = {
  x: Math.floor(mem.x),
  y: Math.floor(mem.y),
  width: Math.ceil(bw.x + bw.width - mem.x),
  height: Math.ceil(mem.height),
};
const m0 = Date.now();
let m = 0;
while (Date.now() - m0 < 23_000) {
  await page.screenshot({
    path: path.join(memFrames, `f${String(m).padStart(3, '0')}.png`),
    clip: memRegion,
    scale: 'css',
  });
  m++;
  await sleep(400);
}
console.log('captured', m, 'memory frames');

await browser.close();
