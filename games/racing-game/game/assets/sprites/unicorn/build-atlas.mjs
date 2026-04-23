/**
 * Assembles Unicorn animation frames into a single spritesheet + Phaser atlas JSON.
 *
 * Layout (each cell 68×68):
 *   Row 0 (y=0):    run         frames 0-7  (8 frames)
 *   Row 1 (y=68):   jump-rise   frames 0-7  (8 frames)
 *   Row 2 (y=136):  jump-fall   frames 0-7  (8 frames)
 *   Row 3 (y=204):  stagger     frames 0-3  (4 frames)
 *   Row 4 (y=272):  duck        frames 0-3  (4 frames — 2 unique dying frames ×2)
 *
 * Template → role mapping:
 *   running-8-frames  (running-fe10068d)           → run
 *   attack            (attacking-9076eb88)          → jump-rise (rearing/lunging upward)
 *   attack-back       (attacking_backward-79d3d7ae) → jump-fall (body arc returning)
 *   hit-right         (getting_hit_from_right-39a76b07) → stagger
 *   dying             (animation-3617020a)          → duck
 *     Uses frames 4,5,4,5 — these are the lowest body-position frames
 *     of the dying fall, body-top y≥28 which exceeds the 40% silhouette threshold.
 *     The rival unicorn never actually triggers duck in gameplay;
 *     this animation is parity-only for future character-select work.
 *
 * Output:
 *   unicorn.png  — the spritesheet
 *   unicorn.json — Phaser atlas (texture-packer JSON-array format)
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
  run:          'running-fe10068d',
  'jump-rise':  'attacking-9076eb88',
  'jump-fall':  'attacking_backward-79d3d7ae',
  stagger:      'getting_hit_from_right-39a76b07',
  duck:         'animation-3617020a',  // dying animation, frames 4,5,4,5
};

// For duck, we use a custom frame remapping (frames 4,5,4,5 from the dying anim)
const DUCK_SOURCE_FRAMES = [4, 5, 4, 5];

const FRAME_COUNTS = { run: 8, 'jump-rise': 8, 'jump-fall': 8, stagger: 4, duck: 4 };
const ANIM_ORDER = ['run', 'jump-rise', 'jump-fall', 'stagger', 'duck'];

// Sheet dimensions
const SHEET_W = 8 * FRAME_W;  // 544 px — widest row (8-frame animations)
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
    // For duck, remap to specific source frames from the dying animation
    const srcFrameIdx = (animName === 'duck') ? DUCK_SOURCE_FRAMES[i] : i;
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
writeFileSync(join(__dir, 'unicorn.png'), outPng);
console.log(`Wrote unicorn.png  (${SHEET_W}×${SHEET_H})`);

// Write Atlas JSON (Phaser texture-packer JSON-array format)
const atlas = {
  textures: [
    {
      image: 'unicorn.png',
      format: 'RGBA8888',
      size: { w: SHEET_W, h: SHEET_H },
      scale: 1,
      frames: atlasFrames,
    },
  ],
  meta: {
    app: 'rambles-pipeline',
    version: '1.0',
    image: 'unicorn.png',
    format: 'RGBA8888',
    size: { w: SHEET_W, h: SHEET_H },
    scale: '1',
  },
};

writeFileSync(join(__dir, 'unicorn.json'), JSON.stringify(atlas, null, 2));
console.log('Wrote unicorn.json');

console.log('Atlas frames:', atlasFrames.map(f => f.filename).join(', '));
