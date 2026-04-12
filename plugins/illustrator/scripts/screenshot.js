#!/usr/bin/env node
/**
 * Screenshot an HTML illustration. See package.json for setup.
 * Usage: node screenshot.js <file.html|folder> [--format png|webp|jpeg] [--quality 90]
 *        [--scale 2] [--selector .container] [--padding 64] [--transparent] [--theme light|dark|both]
 * Passing a folder resolves to <folder>/index.html. Output is written next to the input as
 * <theme>.<ext> (e.g. light.webp, dark.webp).
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// Resolve runtime deps from CLAUDE_PLUGIN_DATA — the plugin's SessionStart
// hook installs node_modules there (writable, persistent across updates),
// not next to this script. The agent can invoke this file as plain
// `node screenshot.js ...` without needing to set NODE_PATH.
const pluginData = process.env.CLAUDE_PLUGIN_DATA
  || path.join(os.homedir(), '.claude/plugins/data/illustrator');
const nmPaths = [path.join(pluginData, 'node_modules')];
const { chromium } = require(require.resolve('playwright', { paths: nmPaths }));

const DEFAULTS = { selector: '.container', padding: 64, scale: 2, format: 'png', quality: 90, transparent: false, theme: 'light' };

function parseArgs(argv) {
  const args = { ...DEFAULTS };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--selector':    args.selector = next(); break;
      case '--padding':     args.padding = parseInt(next(), 10); break;
      case '--scale':       args.scale = parseFloat(next()); break;
      case '--format':      args.format = next().toLowerCase(); break;
      case '--quality':     args.quality = parseInt(next(), 10); break;
      case '--theme':       args.theme = next().toLowerCase(); break;
      case '--transparent': args.transparent = true; break;
      default:
        if (a.startsWith('--')) throw new Error(`Unknown flag: ${a}`);
        positional.push(a);
    }
  }
  if (positional.length !== 1) throw new Error('Usage: node screenshot.js <file.html> [flags]');
  if (args.format === 'jpg') args.format = 'jpeg';
  if (!['png', 'webp', 'jpeg'].includes(args.format)) throw new Error(`Unsupported format: ${args.format}`);
  if (!['light', 'dark', 'both'].includes(args.theme)) throw new Error(`Unsupported theme: ${args.theme}`);
  let input = path.resolve(positional[0]);
  if (fs.existsSync(input) && fs.statSync(input).isDirectory()) input = path.join(input, 'index.html');
  args.input = input;
  args.ext = args.format === 'jpeg' ? 'jpg' : args.format;
  return args;
}

async function capture(browser, args, theme) {
  const page = await browser.newPage({
    deviceScaleFactor: args.scale,
    colorScheme: theme,
    viewport: { width: 1600, height: 1200 },
  });

  // Set screenshot mode flag before page loads so scripts can detect it
  await page.addInitScript(() => { window.__SCREENSHOT_MODE__ = true; });

  await page.goto('file://' + args.input, { waitUntil: 'networkidle' });

  // Wait for liquidGL to initialize (lenses need time to render)
  await page.waitForTimeout(500);

  if (args.transparent) await page.addStyleTag({ content: 'html,body{background:transparent!important}' });

  // Get container bounds
  const box = await page.locator(args.selector).first().boundingBox();
  if (!box) throw new Error(`Selector "${args.selector}" not found`);

  let minX = box.x, minY = box.y, maxX = box.x + box.width, maxY = box.y + box.height;

  // Expand bounds to include any visible lenses
  const sceneBox = await page.locator('.lens-scene').first().boundingBox().catch(() => null);
  if (sceneBox) {
    const lensBoxes = await page.locator('.glass-lens').evaluateAll(lenses =>
      lenses
        .filter(l => l.style.visibility !== 'hidden' && l.offsetTop > -1000)
        .map(l => ({ x: l.offsetLeft, y: l.offsetTop, w: l.offsetWidth, h: l.offsetHeight }))
    );
    for (const lb of lensBoxes) {
      const lx = sceneBox.x + lb.x, ly = sceneBox.y + lb.y;
      minX = Math.min(minX, lx);
      minY = Math.min(minY, ly);
      maxX = Math.max(maxX, lx + lb.w);
      maxY = Math.max(maxY, ly + lb.h);
    }
  }

  const p = args.padding;
  const clip = { x: Math.max(0, minX - p), y: Math.max(0, minY - p), width: (maxX - minX) + p * 2, height: (maxY - minY) + p * 2 };
  const output = path.join(path.dirname(args.input), `${theme}.${args.ext}`);
  const opts = { clip, omitBackground: args.transparent };

  if (args.format === 'webp') {
    const buf = await page.screenshot({ type: 'png', ...opts });
    await require(require.resolve('sharp', { paths: nmPaths }))(buf).webp({ quality: args.quality }).toFile(output);
  } else {
    await page.screenshot({
      path: output,
      type: args.format,
      ...(args.format === 'jpeg' ? { quality: args.quality } : {}),
      ...opts,
    });
  }

  await page.close();
  const size = (fs.statSync(output).size / 1024).toFixed(1);
  console.log(`Saved ${path.relative(process.cwd(), output)} (${size} KB)`);
}

(async () => {
  let args;
  try { args = parseArgs(process.argv.slice(2)); }
  catch (e) { console.error(e.message); process.exit(1); }

  if (!fs.existsSync(args.input)) { console.error(`File not found: ${args.input}`); process.exit(1); }

  const themes = args.theme === 'both' ? ['light', 'dark'] : [args.theme];
  const browser = await chromium.launch();
  try { for (const theme of themes) await capture(browser, args, theme); }
  finally { await browser.close(); }
})();
