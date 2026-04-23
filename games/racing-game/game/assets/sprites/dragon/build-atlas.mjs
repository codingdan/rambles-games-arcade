/**
 * Assembles Dragon animation frames into a single spritesheet + Phaser atlas JSON.
 *
 * Layout (each cell 68×68):
 *   Row 0 (y=0):    run         frames 0-7  (8 frames)
 *   Row 1 (y=68):   jump-rise   frames 0-3  (4 frames)
 *   Row 2 (y=136):  jump-fall   frames 0-3  (4 frames)
 *   Row 3 (y=204):  stagger     frames 0-3  (4 frames)
 *   Row 4 (y=272):  duck        frames 0-3  (4 frames)
 *
 * Output:
 *   dragon.png   — the spritesheet
 *   dragon.json  — Phaser atlas (texture-packer JSON-array format)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const BASE = join(__dir, 'extracted');

const FRAME_W = 68;
const FRAME_H = 68;

// Map animation name → directory name under extracted/animations/
const ANIM_DIRS = {
  run:        'running-6deb373d',
  'jump-rise':'dragon_rearing_up_mid-leap_all_four_legs_tucked_be-71cbcf99',
  'jump-fall':'dragon_descending_from_apex_front_legs_reaching_fo-1d5f478a',
  stagger:    'dragon_stumbling_and_bracing_after_a_trip_head_pit-8584fa05',
  duck:       'dragon_crouching_in_aerodynamic_duck-slide_body_pr-5175a516',
};

const FRAME_COUNTS = { run: 8, 'jump-rise': 4, 'jump-fall': 4, stagger: 4, duck: 4 };
const ANIM_ORDER = ['run', 'jump-rise', 'jump-fall', 'stagger', 'duck'];

// Sheet dimensions
const SHEET_W = 8 * FRAME_W;  // 544 px — widest row (run has 8 frames)
const SHEET_H = ANIM_ORDER.length * FRAME_H; // 340 px (5 rows × 68)

function readPNG(filePath) {
  const buf = readFileSync(filePath);
  return PNG.sync.read(buf);
}

function blitFrame(sheet, src, destX, destY) {
  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      const srcIdx  = (y * FRAME_W + x) * 4;
      const dstIdx  = ((destY + y) * SHEET_W + (destX + x)) * 4;
      sheet.data[dstIdx]     = src.data[srcIdx];
      sheet.data[dstIdx + 1] = src.data[srcIdx + 1];
      sheet.data[dstIdx + 2] = src.data[srcIdx + 2];
      sheet.data[dstIdx + 3] = src.data[srcIdx + 3];
    }
  }
}

// Build the sheet
const sheet = new PNG({ width: SHEET_W, height: SHEET_H });
sheet.data.fill(0); // transparent

const atlasFrames = [];

ANIM_ORDER.forEach((animName, rowIdx) => {
  const dir = ANIM_DIRS[animName];
  const count = FRAME_COUNTS[animName];
  const destY = rowIdx * FRAME_H;

  for (let i = 0; i < count; i++) {
    const framePath = join(BASE, 'animations', dir, 'east', `frame_00${i}.png`);
    const src = readPNG(framePath);
    const destX = i * FRAME_W;
    blitFrame(sheet, src, destX, destY);

    atlasFrames.push({
      filename: `${animName}_${i}`,
      rotated: false,
      trimmed: false,
      sourceSize: { w: FRAME_W, h: FRAME_H },
      spriteSourceSize: { x: 0, y: 0, w: FRAME_W, h: FRAME_H },
      frame: { x: destX, y: destY, w: FRAME_W, h: FRAME_H },
    });
  }
});

// Write PNG
const outPng = PNG.sync.write(sheet);
writeFileSync(join(__dir, 'dragon.png'), outPng);
console.log(`Wrote dragon.png  (${SHEET_W}×${SHEET_H})`);

// Write Atlas JSON (Phaser texture-packer JSON-array format)
const atlas = {
  textures: [
    {
      image: 'dragon.png',
      format: 'RGBA8888',
      size: { w: SHEET_W, h: SHEET_H },
      scale: 1,
      frames: atlasFrames,
    },
  ],
  meta: {
    app: 'rambles-pipeline',
    version: '1.0',
    image: 'dragon.png',
    format: 'RGBA8888',
    size: { w: SHEET_W, h: SHEET_H },
    scale: '1',
  },
};

writeFileSync(join(__dir, 'dragon.json'), JSON.stringify(atlas, null, 2));
console.log('Wrote dragon.json');

// Animation definitions (for Phaser anims.create calls — baked into metadata)
const animDefs = {
  run:        { frameRate: 10, repeat: -1,  frames: FRAME_COUNTS.run },
  'jump-rise':{ frameRate:  8, repeat:  0,  frames: FRAME_COUNTS['jump-rise'] },
  'jump-fall':{ frameRate:  8, repeat:  0,  frames: FRAME_COUNTS['jump-fall'] },
  stagger:    { frameRate:  8, repeat:  0,  frames: FRAME_COUNTS.stagger },
  duck:       { frameRate:  8, repeat:  0,  frames: FRAME_COUNTS.duck },
};

console.log('Atlas frames:', atlasFrames.map(f => f.filename).join(', '));
console.log('Animation defs:', JSON.stringify(animDefs, null, 2));
