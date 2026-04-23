// Procedural cover SVG factory — deterministic from a seed string.
// Extracted from the original Claude Design data/games.js.
// Attaches window.RG_cover(seed) -> { url, palette }.
(function () {
  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seeded(seed) {
    const s = xmur3(seed);
    return mulberry32(s());
  }
  function int(rng, min, max) { return Math.floor(rng() * (max - min + 1)) + min; }

  const PALETTES = [
    ['#0a0f1c','#1a2747','#ff3ec9','#37f3ff','#ffd447','#ffffff'],
    ['#140b1c','#2a0e3a','#8b2fc9','#f38ba8','#f9e2af','#cdd6f4'],
    ['#050a05','#0f2b0f','#39ff14','#b6ff00','#ffee00','#e6ffe6'],
    ['#1b0f02','#3b1d03','#ff8a00','#ffc86b','#ffe9b0','#fff7e6'],
    ['#06070a','#121826','#4f9dff','#7af5ff','#ffffff','#c4cdda'],
    ['#0d0208','#2a0a1f','#ff1f5a','#ff8a3c','#ffd447','#ffe9cf'],
    ['#0e0a14','#1c1030','#b48cff','#66e7ff','#fff27a','#ffffff'],
    ['#0a1410','#0f2a1f','#14f195','#9bf6c7','#f5fffb','#b6ff00'],
  ];

  function coverSvg(seed) {
    const rng = seeded(seed + ':cover');
    const pal = PALETTES[int(rng, 0, PALETTES.length - 1)];
    const bg = pal[0];
    const mid = pal[1];
    const ink = [pal[2], pal[3], pal[4], pal[5]];
    const size = 16;
    const motif = int(rng, 0, 3);
    const cells = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < Math.ceil(size / 2); x++) {
        let fill = bg;
        const cx = x, cy = y;
        if (motif === 0 && cy > 10 && (cx + cy) % 3 === 0) fill = mid;
        if (motif === 1 && cy < 5 && rng() < 0.35) fill = mid;
        if (motif === 2 && (cx + cy) % 4 === 0) fill = mid;
        if (motif === 3 && cy === Math.floor(size * 0.6)) fill = mid;
        const inCore = cy >= 4 && cy <= 12 && cx >= 2 && cx <= 7;
        if (inCore && rng() < 0.55) fill = ink[int(rng, 0, ink.length - 1)];
        if ((cy === 6 || cy === 7) && (cx === 4 || cx === 6)) fill = pal[5];
        cells.push({ x: cx, y: cy, fill });
        cells.push({ x: size - 1 - cx, y: cy, fill });
      }
    }
    const rects = cells.map(c => `<rect x="${c.x}" y="${c.y}" width="1" height="1" fill="${c.fill}"/>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">` +
      `<rect width="${size}" height="${size}" fill="${bg}"/>${rects}</svg>`;
    return {
      url: 'data:image/svg+xml;utf8,' + encodeURIComponent(svg),
      palette: pal,
    };
  }

  function waveform(seed, len = 120) {
    const rng = seeded(seed + ':wave');
    const out = [];
    let e = 0.1;
    for (let i = 0; i < len; i++) {
      e += (rng() - 0.5) * 0.25;
      e = Math.max(0.05, Math.min(1, e));
      const env = Math.sin((i / len) * Math.PI) * 0.6 + 0.4;
      out.push(Math.max(0.04, Math.min(1, e * env + rng() * 0.15)));
    }
    return out;
  }

  window.RG_cover = coverSvg;
  window.RG_waveform = waveform;
})();
