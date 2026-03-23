/**
 * Asset pipeline — renders SVG source files to PNG sprites
 * Usage: node scripts/render-assets.js
 *        node scripts/render-assets.js daytime   (single asset by name)
 */

import sharp from 'sharp';
import { readFileSync, readdirSync } from 'fs';
import { join, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SVG_DIR = join(__dirname, 'svg');
const OUT_DIR = join(__dirname, '..', 'public', 'assets', 'sprites');

/**
 * Each entry maps an SVG filename (no ext) to its output config.
 * width/height: output PNG dimensions in pixels
 * out: output filename (default: same name as SVG)
 */
const ASSETS = [
  { name: 'daytime',        width: 200,  height: 56,  out: 'daytime.png' },
  { name: 'panel_radio',    width: 960,  height: 540, out: 'panel_radio.png' },
  { name: 'panel_map',      width: 960,  height: 540, out: 'panel_map.png' },
  { name: 'panel_scanner',  width: 960,  height: 540, out: 'panel_scanner.png' },
  { name: 'panel_journal',  width: 960,  height: 540, out: 'panel_journal.png' },
  { name: 'panel_manual',   width: 960,  height: 540, out: 'panel_manual.png' },
  { name: 'desk_surface',   width: 960,  height: 540, out: 'desk_surface.png' },
  { name: 'desk_radio',     width: 320,  height: 120, out: 'desk_radio.png' },
  { name: 'desk_map',       width: 200,  height: 160, out: 'desk_map.png' },
  { name: 'desk_radar',     width: 200,  height: 160, out: 'desk_radar.png' },
  { name: 'desk_journal',   width: 140,  height: 100, out: 'desk_journal.png' },
  { name: 'desk_manual',    width: 140,  height: 100, out: 'desk_manual.png' },
];

async function renderOne(asset) {
  const svgPath = join(SVG_DIR, `${asset.name}.svg`);
  const outPath = join(OUT_DIR, asset.out);

  let svgData;
  try {
    svgData = readFileSync(svgPath);
  } catch {
    console.warn(`  SKIP  ${asset.name}.svg — file not found`);
    return;
  }

  await sharp(svgData)
    .resize(asset.width, asset.height, { fit: 'fill' })
    .png()
    .toFile(outPath);

  console.log(`  OK    ${asset.name}.svg → ${asset.out} (${asset.width}×${asset.height})`);
}

async function main() {
  const filter = process.argv[2];

  const targets = filter
    ? ASSETS.filter((a) => a.name === filter)
    : ASSETS;

  if (targets.length === 0) {
    console.error(`No asset named "${filter}". Available: ${ASSETS.map((a) => a.name).join(', ')}`);
    process.exit(1);
  }

  console.log(`Rendering ${targets.length} asset(s)...\n`);
  for (const asset of targets) {
    await renderOne(asset);
  }
  console.log('\nDone.');
}

main().catch((err) => { console.error(err); process.exit(1); });
