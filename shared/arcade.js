// Rambles Arcade — top-level UI.
// Reads window.RG_GAMES (catalog index, baked at promote-time) and lazy-loads
// games/<slug>/meta.json on detail-route mount.

const PALETTES = {
  amber: {
    '--bg': '#120a02',
    '--panel': '#1a0f04',
    '--edge': '#4a2e09',
    '--fg': '#ffcf7a',
    '--muted': '#8a5a1e',
    '--accent': '#ffb347'
  },
  crimson: {
    '--bg': '#130406',
    '--panel': '#1d060a',
    '--edge': '#5a1220',
    '--fg': '#ffc8cf',
    '--muted': '#9a4050',
    '--accent': '#ff3e5b'
  },
  vanilla: {
    '--bg': '#0b0a06',
    '--panel': '#131108',
    '--edge': '#3f3a12',
    '--fg': '#fff3a8',
    '--muted': '#8a7e2a',
    '--accent': '#ffe447'
  }
};
const DENSITY = {
  cozy: '180px',
  large: '240px',
  xlarge: '320px'
};
const TWEAK_DEFAULTS = {
  palette: 'amber',
  scanlines: 'on',
  density: 'xlarge',
  flicker: 'on'
};
function applyTweaks(t) {
  const pal = PALETTES[t.palette] || PALETTES.amber;
  const r = document.documentElement;
  Object.entries(pal).forEach(([k, v]) => r.style.setProperty(k, v));
  r.style.setProperty('--rg-grid-min', DENSITY[t.density] || DENSITY.cozy);
  document.body.classList.toggle('no-flicker', t.flicker === 'off');
  document.body.classList.toggle('no-scanlines', t.scanlines === 'off');
}

// ───────────────────── Formatters ─────────────────────
function formatCost(n) {
  return '$' + n.toFixed(2);
}
function formatDuration(mins) {
  if (mins < 60) return Math.round(mins) + ' min';
  const h = Math.floor(mins / 60),
    m = Math.round(mins % 60);
  return `${h}h ${m}m`;
}
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
function formatTokens(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k';
  return '' + n;
}
function humanizeSlug(s) {
  return s.split('-').map(w => w[0] ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
}

// ───────────────────── Detail-meta cache ─────────────────────
const META_CACHE = new Map(); // slug -> Promise<meta>
function fetchMeta(slug) {
  if (!META_CACHE.has(slug)) {
    META_CACHE.set(slug, fetch(`games/${slug}/meta.json`).then(r => {
      if (!r.ok) throw new Error(`meta.json fetch failed: ${r.status}`);
      return r.json();
    }));
  }
  return META_CACHE.get(slug);
}

// ───────────────────── Cover ─────────────────────
function Cover({
  game,
  size = 96,
  border = true,
  style
}) {
  const cover = game.cover ? {
    url: `games/${game.id}/${game.cover}`,
    palette: ['#000', '#222', '#fff', '#ccc', '#aaa', '#fff']
  } : window.RG_cover(game.id);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height: size,
      background: cover.palette[0],
      border: border ? '1px solid var(--edge)' : 'none',
      position: 'relative',
      overflow: 'hidden',
      flexShrink: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: cover.url,
    alt: "",
    className: "pixel-img",
    style: {
      width: '100%',
      height: '100%',
      display: 'block'
    }
  }));
}

// Cover palette helper used by other components that need one for
// background gradients but only have a game from the index (no meta yet).
function coverPalette(game) {
  return game.cover ? ['#000', '#222', '#fff', '#ccc', '#aaa', '#fff'] : window.RG_cover(game.id).palette;
}

// ───────────────────── Waveform ─────────────────────
function Waveform({
  slug,
  playing,
  progress,
  height = 40,
  onSeek
}) {
  const bars = React.useMemo(() => window.RG_waveform(slug), [slug]);
  return /*#__PURE__*/React.createElement("div", {
    onClick: e => {
      if (!onSeek) return;
      const r = e.currentTarget.getBoundingClientRect();
      onSeek((e.clientX - r.left) / r.width);
    },
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      height,
      width: '100%',
      cursor: onSeek ? 'pointer' : 'default',
      padding: '0 2px'
    }
  }, bars.map((v, i) => {
    const played = i / bars.length < progress;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flex: 1,
        height: `${Math.max(8, v * 100)}%`,
        background: played ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 40%, transparent)',
        boxShadow: played ? '0 0 6px var(--accent)' : 'none',
        animation: playing && i === Math.floor(progress * bars.length) ? 'eq-bar 0.4s ease-in-out infinite' : 'none',
        transformOrigin: 'center'
      }
    });
  }));
}

// ───────────────────── Audio player (real <audio>) ─────────────────────
function AudioPlayer({
  slug,
  src,
  durationSec
}) {
  const audioRef = React.useRef(null);
  const [playing, setPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setProgress(a.currentTime / (a.duration || durationSec));
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('ended', onEnd);
    };
  }, [durationSec]);
  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };
  const seek = frac => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    a.currentTime = Math.max(0, Math.min(a.duration, frac * a.duration));
    setProgress(frac);
  };
  const cur = progress * durationSec;
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '14px 16px',
      border: '1px solid var(--edge)',
      background: 'var(--panel)'
    }
  }, /*#__PURE__*/React.createElement("audio", {
    ref: audioRef,
    src: src,
    preload: "metadata"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: toggle,
    style: {
      width: 40,
      height: 40,
      flexShrink: 0,
      background: 'var(--accent)',
      color: 'var(--bg)',
      border: 'none',
      cursor: 'pointer',
      fontSize: 14,
      fontFamily: 'inherit',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, playing ? '▐▐' : '▶'), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--muted)',
      marginBottom: 6,
      display: 'flex',
      justifyContent: 'space-between',
      textTransform: 'uppercase',
      letterSpacing: 1
    }
  }, /*#__PURE__*/React.createElement("span", null, "original ramble"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontVariantNumeric: 'tabular-nums'
    }
  }, fmt(cur), " / ", fmt(durationSec))), /*#__PURE__*/React.createElement(Waveform, {
    slug: slug,
    playing: playing,
    progress: progress,
    height: 34,
    onSeek: seek
  })));
}

// ───────────────────── Card ─────────────────────
function GameCard({
  game,
  onOpen,
  onPlay
}) {
  const [hover, setHover] = React.useState(false);
  const palette = coverPalette(game);
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onClick: () => onOpen(game),
    style: {
      position: 'relative',
      background: 'var(--panel)',
      border: '1px solid var(--edge)',
      cursor: 'pointer',
      transition: 'transform .12s, border-color .12s',
      transform: hover ? 'translateY(-2px)' : 'none',
      borderColor: hover ? 'var(--accent)' : 'var(--edge)',
      boxShadow: hover ? '0 0 0 1px var(--accent), 0 0 22px -6px var(--accent)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      aspectRatio: '1 / 1',
      background: palette[0],
      overflow: 'hidden',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(Cover, {
    game: game,
    size: "100%",
    border: false,
    style: {
      width: '100%',
      height: '100%'
    }
  }), hover && /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      onPlay(game);
    },
    className: "crt-glow rg-card-play",
    style: {
      position: 'absolute',
      inset: 0,
      background: 'color-mix(in srgb, var(--bg) 70%, transparent)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--accent)',
      border: 'none',
      cursor: 'pointer',
      fontSize: 13,
      letterSpacing: 2,
      fontFamily: 'inherit'
    }
  }, "\u25B6 PLAY")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 12px 12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      lineHeight: 1.2,
      color: 'var(--fg)',
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textTransform: 'uppercase'
    }
  }, game.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'var(--muted)',
      marginTop: 4,
      display: 'flex',
      justifyContent: 'space-between',
      letterSpacing: 1
    }
  }, /*#__PURE__*/React.createElement("span", null, (game.genre || '').toUpperCase()), /*#__PURE__*/React.createElement("span", {
    style: {
      fontVariantNumeric: 'tabular-nums'
    }
  }, formatDate(game.promotedAt)))));
}

// ───────────────────── Hero carousel ─────────────────────
function HeroCarousel({
  games,
  onOpen,
  onPlay
}) {
  const [i, setI] = React.useState(0);
  const game = games[i];
  React.useEffect(() => {
    if (games.length <= 1) return;
    const id = setInterval(() => setI(n => (n + 1) % games.length), 6500);
    return () => clearInterval(id);
  }, [games.length]);
  if (!game) return null;
  const palette = coverPalette(game);
  return /*#__PURE__*/React.createElement("div", {
    className: "rg-hero",
    style: {
      position: 'relative',
      border: '1px solid var(--edge)',
      background: 'var(--panel)',
      padding: 20,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: `radial-gradient(circle at 25% 50%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 55%)`,
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "rg-hero-cover-wrap",
    style: {
      position: 'relative',
      zIndex: 1
    }
  }, /*#__PURE__*/React.createElement(Cover, {
    game: game,
    size: "100%",
    border: false,
    style: {
      width: '100%',
      height: 'auto',
      aspectRatio: '1 / 1',
      boxShadow: '0 0 0 1px var(--accent), 0 0 36px -8px var(--accent)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      letterSpacing: 3,
      color: 'var(--accent)',
      textTransform: 'uppercase'
    },
    className: "crt-glow"
  }, "\u2605 FEATURED \u2605 #", String(i + 1).padStart(2, '0'), "/", String(games.length).padStart(2, '0')), /*#__PURE__*/React.createElement("div", {
    className: "crt-glow heading rg-hero-title",
    style: {
      fontWeight: 700,
      textTransform: 'uppercase',
      color: 'var(--fg)',
      margin: '10px 0 6px',
      lineHeight: 1.05
    }
  }, game.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--muted)',
      marginBottom: 14,
      letterSpacing: 1
    }
  }, (game.genre || '').toUpperCase(), " \xB7 ", formatDate(game.promotedAt)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: 'var(--fg)',
      marginBottom: 20,
      maxWidth: 560,
      lineHeight: 1.5
    }
  }, game.desc), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onPlay(game),
    style: {
      background: 'var(--accent)',
      color: 'var(--bg)',
      border: 'none',
      padding: '12px 20px',
      cursor: 'pointer',
      fontSize: 12,
      letterSpacing: 2,
      fontWeight: 700,
      fontFamily: 'inherit'
    }
  }, "\u25B6 INSERT COIN"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen(game),
    style: {
      background: 'transparent',
      color: 'var(--fg)',
      border: '1px solid var(--edge)',
      padding: '12px 20px',
      cursor: 'pointer',
      fontSize: 12,
      letterSpacing: 2,
      fontFamily: 'inherit'
    }
  }, "\u25A2 DETAILS")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginTop: 18
    }
  }, games.map((_, n) => /*#__PURE__*/React.createElement("button", {
    key: n,
    onClick: () => setI(n),
    style: {
      width: n === i ? 22 : 10,
      height: 4,
      background: n === i ? 'var(--accent)' : 'var(--edge)',
      border: 'none',
      cursor: 'pointer',
      padding: 0,
      transition: 'width .2s'
    }
  })))));
}

// ───────────────────── Detail (lazy-loaded meta.json) ─────────────────────
function GameDetail({
  game,
  onBack,
  onPlay
}) {
  const [meta, setMeta] = React.useState(null);
  const [error, setError] = React.useState(null);
  React.useEffect(() => {
    setMeta(null);
    setError(null);
    fetchMeta(game.id).then(setMeta, e => setError(String(e)));
  }, [game.id]);
  if (error) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '24px 28px',
        color: 'var(--accent)'
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      style: {
        background: 'transparent',
        color: 'var(--muted)',
        border: 'none',
        cursor: 'pointer',
        fontSize: 11,
        letterSpacing: 2,
        padding: 0,
        fontFamily: 'inherit'
      }
    }, "\u25C2 BACK TO ARCADE"), /*#__PURE__*/React.createElement("p", {
      style: {
        marginTop: 20
      },
      className: "crt-glow"
    }, "FAILED TO LOAD CARTRIDGE: ", error));
  }
  if (!meta) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '24px 28px',
        color: 'var(--accent)'
      },
      className: "crt-glow"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      style: {
        background: 'transparent',
        color: 'var(--muted)',
        border: 'none',
        cursor: 'pointer',
        fontSize: 11,
        letterSpacing: 2,
        padding: 0,
        fontFamily: 'inherit'
      }
    }, "\u25C2 BACK TO ARCADE"), /*#__PURE__*/React.createElement("p", {
      style: {
        marginTop: 20
      }
    }, "LOADING CARTRIDGE", /*#__PURE__*/React.createElement("span", {
      className: "crt-cursor"
    }, "_")));
  }
  const m = meta.metrics || {};
  return /*#__PURE__*/React.createElement("div", {
    className: "rg-detail-wrap",
    style: {
      padding: '24px 28px',
      display: 'flex',
      flexDirection: 'column',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      alignSelf: 'flex-start',
      background: 'transparent',
      color: 'var(--muted)',
      border: 'none',
      cursor: 'pointer',
      fontSize: 11,
      letterSpacing: 2,
      padding: 0,
      fontFamily: 'inherit'
    }
  }, "\u25C2 BACK TO ARCADE"), /*#__PURE__*/React.createElement("div", {
    className: "rg-detail-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rg-detail-cover-wrap",
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(Cover, {
    game: game,
    size: "100%",
    border: true,
    style: {
      width: '100%',
      height: 'auto',
      aspectRatio: '1 / 1',
      boxShadow: '0 0 0 1px var(--accent), 0 0 44px -8px var(--accent)'
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => onPlay(game),
    style: {
      marginTop: 14,
      width: '100%',
      background: 'var(--accent)',
      color: 'var(--bg)',
      border: 'none',
      padding: '14px',
      cursor: 'pointer',
      fontSize: 14,
      letterSpacing: 3,
      fontWeight: 700,
      fontFamily: 'inherit'
    }
  }, "\u25B6 INSERT COIN"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      fontSize: 10,
      color: 'var(--muted)',
      marginTop: 8,
      letterSpacing: 2
    }
  }, "PRESS FIRE TO START")), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      letterSpacing: 3,
      color: 'var(--accent)',
      textTransform: 'uppercase'
    },
    className: "crt-glow"
  }, "ID: ", meta.id.toUpperCase()), /*#__PURE__*/React.createElement("div", {
    className: "crt-glow heading rg-detail-title",
    style: {
      fontWeight: 700,
      textTransform: 'uppercase',
      color: 'var(--fg)',
      margin: '6px 0',
      lineHeight: 1.05
    }
  }, meta.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--muted)',
      letterSpacing: 1,
      marginBottom: 16
    }
  }, (meta.genre || '').toUpperCase(), " \xB7 ", formatDate(meta.promotedAt)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      color: 'var(--fg)',
      lineHeight: 1.55,
      marginBottom: 18
    }
  }, meta.desc), meta.audio && /*#__PURE__*/React.createElement(AudioPlayer, {
    slug: meta.id,
    src: `games/${meta.id}/${meta.audio.src}`,
    durationSec: meta.audio.durationSec
  }))), /*#__PURE__*/React.createElement("div", {
    className: "rg-detail-stats",
    style: {
      border: '1px solid var(--edge)',
      background: 'var(--panel)'
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "TIME TO MAKE",
    value: m.activeSec != null ? formatDuration(m.activeSec / 60) : '--'
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "COST",
    value: m.costUsd != null ? formatCost(m.costUsd) : '--'
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "GEN CYCLES",
    value: (meta.changelog || []).length || '--'
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "TOKENS",
    value: m.inputTokens != null && m.outputTokens != null ? formatTokens(m.inputTokens + m.outputTokens) : '--'
  })), /*#__PURE__*/React.createElement("div", {
    className: "rg-detail-panels"
  }, /*#__PURE__*/React.createElement(Panel, {
    title: "TRANSCRIPT // ORIGINAL RAMBLE"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      lineHeight: 1.65,
      color: 'var(--fg)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--muted)'
    }
  }, "> "), meta.transcript || '(no transcript)', /*#__PURE__*/React.createElement("span", {
    className: "crt-cursor",
    style: {
      color: 'var(--accent)',
      marginLeft: 2
    }
  }, "_"))), /*#__PURE__*/React.createElement(Panel, {
    title: "CHANGELOG // GEN CYCLES"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, (meta.changelog || []).map((c, i) => {
    const failed = c.phasesFailed > 0 || c.status === 'failed';
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'grid',
        gridTemplateColumns: '36px 1fr 60px',
        gap: 10,
        fontSize: 12,
        alignItems: 'baseline'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--accent)',
        fontWeight: 700
      }
    }, "c", String(c.cycle).padStart(2, '0')), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--fg)'
      }
    }, humanizeSlug(c.slice)), /*#__PURE__*/React.createElement("span", {
      style: {
        color: failed ? '#ff5a5a' : 'var(--muted)',
        textAlign: 'right',
        fontVariantNumeric: 'tabular-nums'
      }
    }, failed ? '✗' : `+${Math.round((c.durationSec || 0) / 60)}m`));
  }), (!meta.changelog || meta.changelog.length === 0) && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--muted)'
    }
  }, "(no cycles recorded)")))));
}
function Stat({
  label,
  value
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 18px',
      borderRight: '1px solid var(--edge)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'var(--muted)',
      letterSpacing: 2,
      marginBottom: 6
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 700,
      color: 'var(--accent)'
    },
    className: "crt-glow"
  }, value));
}
function Panel({
  title,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--edge)',
      background: 'var(--panel)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 14px',
      borderBottom: '1px solid var(--edge)',
      fontSize: 10,
      letterSpacing: 2,
      color: 'var(--accent)',
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "crt-glow"
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--muted)'
    }
  }, "\u25AE\u25AE\u25AE")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 16px'
    }
  }, children));
}

// ───────────────────── Play takeover (boot then navigate) ─────────────────────
function PlayTakeover({
  game,
  onExit
}) {
  const [boot, setBoot] = React.useState(0);
  const bootLines = ['RAMBLES OS v4.2.1', 'loading phaser ...', `loading cartridge: ${game.id}`, `title: ${game.title}`, 'spinning up sprites ...', 'READY PLAYER ONE'];
  React.useEffect(() => {
    if (boot < bootLines.length) {
      const t = setTimeout(() => setBoot(b => b + 1), 130 + Math.random() * 80);
      return () => clearTimeout(t);
    }
    // After last line, navigate to the actual game.
    const t = setTimeout(() => {
      window.location.href = `games/${game.id}/game/index.html`;
    }, 250);
    return () => clearTimeout(t);
  }, [boot]);
  React.useEffect(() => {
    const k = e => {
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onExit]);
  const palette = coverPalette(game);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--bg)',
      color: 'var(--fg)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'inherit',
      zIndex: 40
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '10px 16px',
      borderBottom: '1px solid var(--edge)',
      fontSize: 10,
      letterSpacing: 2,
      color: 'var(--muted)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "[ESC] CANCEL"), /*#__PURE__*/React.createElement("span", {
    className: "crt-glow",
    style: {
      color: 'var(--accent)'
    }
  }, "NOW LOADING \xB7 ", game.title.toUpperCase()), /*#__PURE__*/React.createElement("span", null, " ")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '90%',
      maxWidth: 720,
      aspectRatio: '16/10',
      background: `linear-gradient(180deg, ${palette[0]}, ${palette[1]})`,
      border: '2px solid var(--accent)',
      boxShadow: '0 0 0 1px var(--bg), 0 0 0 3px var(--accent), 0 0 60px -10px var(--accent)',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20,
      fontSize: 12,
      lineHeight: 1.8
    }
  }, bootLines.slice(0, boot).map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      color: i === boot - 1 ? 'var(--accent)' : 'var(--muted)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)'
    }
  }, ">"), " ", l, " ", i === boot - 1 && /*#__PURE__*/React.createElement("span", {
    className: "crt-cursor"
  }, "_")))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      background: 'repeating-linear-gradient(to bottom, transparent 0 2px, rgba(0,0,0,0.25) 3px, transparent 4px)',
      mixBlendMode: 'multiply'
    }
  }))));
}

// ───────────────────── Home ─────────────────────
function Home({
  games,
  onOpen,
  onPlay
}) {
  const [q, setQ] = React.useState('');
  const [genre, setGenre] = React.useState('ALL');
  const [sort, setSort] = React.useState('new');
  const genres = ['ALL', ...Array.from(new Set(games.map(g => g.genre).filter(Boolean))).sort()];
  const featured = games.slice(0, Math.min(5, games.length));
  let filtered = games.filter(g => (genre === 'ALL' || g.genre === genre) && (q.trim() === '' || (g.title || '').toLowerCase().includes(q.toLowerCase()) || (g.desc || '').toLowerCase().includes(q.toLowerCase())));
  if (sort === 'new') filtered = filtered.slice().sort((a, b) => new Date(b.promotedAt) - new Date(a.promotedAt));else if (sort === 'fast') filtered = filtered.slice().sort((a, b) => (a.builtIn || 0) - (b.builtIn || 0));
  return /*#__PURE__*/React.createElement("div", {
    className: "rg-home-wrap",
    style: {
      padding: '20px 28px 28px',
      display: 'flex',
      flexDirection: 'column',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement(Marquee, null), featured.length > 0 && /*#__PURE__*/React.createElement(HeroCarousel, {
    games: featured,
    onOpen: onOpen,
    onPlay: onPlay
  }), /*#__PURE__*/React.createElement("div", {
    className: "rg-toolbar",
    style: {
      border: '1px solid var(--edge)',
      background: 'var(--panel)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      letterSpacing: 2,
      color: 'var(--accent)'
    },
    className: "crt-glow"
  }, "SEARCH:"), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "TYPE TO FILTER...",
    style: {
      background: 'transparent',
      color: 'var(--fg)',
      border: '1px solid var(--edge)',
      padding: '6px 10px',
      fontSize: 12,
      letterSpacing: 1,
      fontFamily: 'inherit',
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement(Select, {
    value: genre,
    options: genres,
    onChange: setGenre
  }), /*#__PURE__*/React.createElement(Select, {
    value: sort,
    options: [['new', 'NEWEST'], ['fast', 'FASTEST GEN']],
    onChange: setSort
  })), /*#__PURE__*/React.createElement("div", {
    className: "rg-card-grid"
  }, filtered.map(g => /*#__PURE__*/React.createElement(GameCard, {
    key: g.id,
    game: g,
    onOpen: onOpen,
    onPlay: onPlay
  })), filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--muted)',
      letterSpacing: 2,
      padding: 20
    }
  }, "NO CARTRIDGES MATCH.")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      fontSize: 10,
      color: 'var(--muted)',
      letterSpacing: 3,
      paddingTop: 10
    }
  }, "\xB7 ", filtered.length, " CARTRIDGES LOADED \xB7 ", games.length, " TOTAL IN CABINET \xB7"));
}
function Select({
  value,
  options,
  onChange
}) {
  const opts = options.map(o => Array.isArray(o) ? o : [o, o]);
  return /*#__PURE__*/React.createElement("select", {
    value: value,
    onChange: e => onChange(e.target.value),
    style: {
      background: 'var(--panel)',
      color: 'var(--fg)',
      border: '1px solid var(--edge)',
      padding: '6px 10px',
      fontSize: 11,
      letterSpacing: 1,
      fontFamily: 'inherit',
      cursor: 'pointer'
    }
  }, opts.map(([v, l]) => /*#__PURE__*/React.createElement("option", {
    key: v,
    value: v,
    style: {
      background: '#111'
    }
  }, l)));
}
function Marquee() {
  const msgs = ['NEW DROPS WHENEVER', 'AUDIO IN → GAMES OUT', 'NO INSTALL · NO SIGNUP', 'RAMBLE YOUR DREAMS', 'BUILT BY AGENTS'];
  const line = msgs.concat(msgs).join('   ★   ');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--edge)',
      color: 'var(--accent)',
      padding: '8px 0',
      overflow: 'hidden',
      background: 'var(--panel)',
      fontSize: 11,
      letterSpacing: 3
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "crt-marquee-track crt-glow",
    style: {
      gap: 40
    }
  }, /*#__PURE__*/React.createElement("span", null, line, "   \u2605   ", line)));
}

// ───────────────────── Nav ─────────────────────
function Nav({
  games
}) {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "rg-nav",
    style: {
      borderBottom: '1px solid var(--edge)',
      background: 'var(--panel)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "crt-glow heading",
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: 'var(--accent)',
      letterSpacing: 2,
      textTransform: 'uppercase'
    }
  }, "RAMBLES*ARCADE"), /*#__PURE__*/React.createElement("div", {
    className: "rg-nav-sub",
    style: {
      color: 'var(--muted)'
    }
  }, "// AUDIO \u2192 PHASER \xB7 BUILT BY AGENTS"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "rg-nav-meta",
    style: {
      color: 'var(--muted)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "GAMES: ", games.length), /*#__PURE__*/React.createElement("span", {
    className: "rg-nav-clock",
    style: {
      fontVariantNumeric: 'tabular-nums'
    }
  }, new Date().toTimeString().slice(0, 8))));
}

// ───────────────────── Top-level shell ─────────────────────
function Shell() {
  const [tweaks, setTweaks] = React.useState(TWEAK_DEFAULTS);
  const [tweaksOn, setTweaksOn] = React.useState(false);
  React.useEffect(() => {
    applyTweaks(tweaks);
  }, [tweaks]);
  React.useEffect(() => {
    const onMsg = e => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOn(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOn(false);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const setK = (k, v) => setTweaks(t => ({
    ...t,
    [k]: v
  }));
  const games = (window.RG_GAMES || []).slice();
  const [route, setRoute] = React.useState({
    kind: 'home'
  });
  const openDetail = g => setRoute({
    kind: 'detail',
    game: g
  });
  const openPlay = g => setRoute({
    kind: 'play',
    game: g
  });
  const back = () => setRoute({
    kind: 'home'
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "crt-root crt-scanlines crt-vignette crt-mask crt-flicker",
    style: {
      width: '100vw',
      height: '100vh',
      background: 'var(--bg)',
      color: 'var(--fg)',
      fontFamily: '"VT323", monospace',
      fontSize: '17px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "crt-rollbar"
  }), route.kind !== 'play' && /*#__PURE__*/React.createElement(Nav, {
    games: games
  }), /*#__PURE__*/React.createElement("div", {
    className: "rg-scroll",
    style: {
      height: route.kind === 'play' ? '100%' : 'calc(100% - 53px)',
      overflow: route.kind === 'play' ? 'hidden' : 'auto',
      position: 'relative'
    }
  }, route.kind === 'home' && /*#__PURE__*/React.createElement(Home, {
    games: games,
    onOpen: openDetail,
    onPlay: openPlay
  }), route.kind === 'detail' && /*#__PURE__*/React.createElement(GameDetail, {
    game: route.game,
    onBack: back,
    onPlay: openPlay
  }), route.kind === 'play' && /*#__PURE__*/React.createElement(PlayTakeover, {
    game: route.game,
    onExit: () => setRoute({
      kind: 'detail',
      game: route.game
    })
  })), tweaksOn && /*#__PURE__*/React.createElement("div", {
    className: "tweaks"
  }, /*#__PURE__*/React.createElement("h3", null, "Tweaks"), [['palette', ['amber', 'crimson', 'vanilla']], ['density', ['cozy', 'large', 'xlarge']]].map(([k, opts]) => /*#__PURE__*/React.createElement("div", {
    className: "row",
    key: k
  }, /*#__PURE__*/React.createElement("label", null, k), /*#__PURE__*/React.createElement("div", {
    className: "seg"
  }, opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o,
    className: tweaks[k] === o ? 'active' : '',
    onClick: () => setK(k, o)
  }, o))))), [['scanlines', ['on', 'off']], ['flicker', ['on', 'off']]].map(([k, opts]) => /*#__PURE__*/React.createElement("div", {
    className: "row",
    key: k
  }, /*#__PURE__*/React.createElement("label", null, k), /*#__PURE__*/React.createElement("div", {
    className: "seg two"
  }, opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o,
    className: tweaks[k] === o ? 'active' : '',
    onClick: () => setK(k, o)
  }, o)))))));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(Shell, null));
