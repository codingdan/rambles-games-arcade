/**
 * Assembles Goblin animation frames into a single spritesheet + Phaser atlas JSON.
 *
 * Layout (each cell 68×68):
 *   Row 0 (y=0):    run         frames 0-7  (8 frames)
 *   Row 1 (y=68):   jump-rise   frames 0-3  (4 frames)
 *   Row 2 (y=136):  jump-fall   frames 0-3  (4 frames)
 *   Row 3 (y=204):  duck        frames 0-3  (4 frames)
 *   Row 4 (y=272):  stagger     frames 0-3  (4 frames)
 *
 * Template → role mapping:
 *   running-3f9badcf          → run         (8 frames 0-7)
 *   animating-4e8cb2b3        → jump-rise   (jumping-1: 9 frames, use 0-3 = ascent phase)
 *   animating-d70b3baf        → jump-fall   (jumping-2: 8 frames, use 4-7 = descent phase)
 *   animating-e16b641f        → duck        (running-slide: 6 frames, use 1,2,3,2 = slide-entry→deepest→held→deepest)
 *                                           Frames 2-3 reach body-top Y≥31, satisfying ≥40% body-top-drop criterion
 *   taking_a_punch-80c5875e   → stagger     (6 frames, use 0-3 = impact + stumble)
 *
 * Output:
 *   goblin.png  — the spritesheet
 *   goblin.json — Phaser atlas (texture-packer JSON-array format)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const BASE = join(__dir, 'extracted');

const FRAME_W = 68;
const FRAME_H = 68;

// Map animation role → directory name under extracted/animations/
const ANIM_DIRS = {
  run:          'running-3f9badcf',
  'jump-rise':  'animating-4e8cb2b3',   // jumping-1
  'jump-fall':  'animating-d70b3baf',   // jumping-2
  duck:         'animating-e16b641f',   // running-slide — achieves ≥40% body-top drop
  stagger:      'taking_a_punch-80c5875e',
};

// Source frame indices for each animation (which frames from the dir to use)
const ANIM_SOURCE_FRAMES = {
  run:          [0, 1, 2, 3, 4, 5, 6, 7],  // 8 frames
  'jump-rise':  [0, 1, 2, 3],               // first 4 = ascent phase
  'jump-fall':  [4, 5, 6, 7],               // last 4 = descent phase
  duck:         [1, 2, 3, 2],               // slide-entry → deepest-slide → held → deepest; frames 2+3 body-top≥31 (≥40% drop)
  stagger:      [0, 1, 2, 3],               // impact + stumble
};

const FRAME_COUNTS = { run: 8, 'jump-rise': 4, 'jump-fall': 4, duck: 4, stagger: 4 };
const ANIM_ORDER = ['run', 'jump-rise', 'jump-fall', 'duck', 'stagger'];

// Sheet dimensions
const SHEET_W = 8 * FRAME_W;  // 544 px — widest row (8-frame run animation)
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
  const sourceFrames = ANIM_SOURCE_FRAMES[animName];
  const destY = rowIdx * FRAME_H;

  for (let i = 0; i < count; i++) {
    const srcFrameIdx = sourceFrames[i];
    const frameFile = `frame_${String(srcFrameIdx).padStart(3, '0')}.png`;
    const framePath = join(BASE, 'animations', dir, 'east', frameFile);
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
writeFileSync(join(__dir, 'goblin.png'), outPng);
console.log(`Wrote goblin.png  (${SHEET_W}×${SHEET_H})`);

// Write Atlas JSON (Phaser texture-packer JSON-array format)
const atlas = {
  textures: [
    {
      image: 'goblin.png',
      format: 'RGBA8888',
      size: { w: SHEET_W, h: SHEET_H },
      scale: 1,
      frames: atlasFrames,
    },
  ],
  meta: {
    app: 'rambles-pipeline',
    version: '1.0',
    image: 'goblin.png',
    format: 'RGBA8888',
    size: { w: SHEET_W, h: SHEET_H },
    scale: '1',
  },
};

writeFileSync(join(__dir, 'goblin.json'), JSON.stringify(atlas, null, 2));
console.log('Wrote goblin.json');

console.log('Atlas frames:', atlasFrames.map(f => f.filename).join(', '));
