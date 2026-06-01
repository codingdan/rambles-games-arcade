const {
  useState,
  useEffect,
  useRef
} = React;

// ---------- routing ----------
function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || "#/");
  useEffect(() => {
    const on = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
}
function parseRoute(hash) {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "game" && parts[1]) {
    return {
      name: parts[2] === "play" ? "play" : "detail",
      slug: parts[1]
    };
  }
  return {
    name: "home"
  };
}

// ---------- data ----------
const metaCache = new Map();
function fetchMeta(slug) {
  if (metaCache.has(slug)) return Promise.resolve(metaCache.get(slug));
  return fetch(`games/${slug}/meta.json`).then(r => r.json()).then(m => {
    metaCache.set(slug, m);
    return m;
  });
}
function gameById(slug) {
  return (window.RG_GAMES || []).find(g => g.id === slug);
}
function seededBars(seed, n) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = h * 31 + seed.charCodeAt(i) >>> 0;
  const bars = [];
  for (let i = 0; i < n; i++) {
    h = h * 1103515245 + 12345 >>> 0;
    bars.push(0.25 + h % 1000 / 1000 * 0.75);
  }
  return bars;
}
function fmtTime(s) {
  s = Math.floor(s || 0);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

// ---------- shared bits ----------
function Header({
  back
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "rg-header"
  }, /*#__PURE__*/React.createElement("a", {
    className: "rg-brand",
    href: "#/"
  }, /*#__PURE__*/React.createElement("span", {
    className: "acc"
  }, "~/"), "rambles arcade"), back ? /*#__PURE__*/React.createElement("a", {
    className: "rg-back-link",
    href: back
  }, "\u2039 back to games") : /*#__PURE__*/React.createElement("span", {
    className: "rg-tag"
  }, "games from rambles"));
}
function Cover({
  game
}) {
  return /*#__PURE__*/React.createElement("img", {
    src: `games/${game.id}/${game.cover || "cover.png"}`,
    alt: game.title
  });
}

// ---------- home ----------
function GameCard({
  game
}) {
  return /*#__PURE__*/React.createElement("a", {
    className: "rg-card",
    href: `#/game/${game.id}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "rg-card-cover"
  }, /*#__PURE__*/React.createElement(Cover, {
    game: game
  })), /*#__PURE__*/React.createElement("div", {
    className: "rg-card-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rg-card-title"
  }, game.title), /*#__PURE__*/React.createElement("div", {
    className: "rg-card-genre"
  }, game.desc || game.genre), /*#__PURE__*/React.createElement("div", {
    className: "rg-card-play"
  }, "\u25B6 PLAY")));
}
function Home() {
  const games = window.RG_GAMES || [];
  return /*#__PURE__*/React.createElement("div", {
    className: "rg-home"
  }, /*#__PURE__*/React.createElement(Header, null), /*#__PURE__*/React.createElement("div", {
    className: "rg-grid"
  }, games.map(g => /*#__PURE__*/React.createElement(GameCard, {
    key: g.id,
    game: g
  }))));
}

// ---------- audio ----------
function AudioPlayer({
  slug,
  duration,
  src
}) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const bars = seededBars(slug, 40);
  const progress = duration ? cur / duration : 0;
  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play();else a.pause();
  };
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCur(a.currentTime);
    const onPlay = () => setPlaying(true);
    const onStop = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setCur(0);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onStop);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onStop);
      a.removeEventListener("ended", onEnded);
    };
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "rg-panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rg-label"
  }, "The original pitch"), /*#__PURE__*/React.createElement("div", {
    className: "rg-wave",
    onClick: toggle
  }, bars.map((b, i) => /*#__PURE__*/React.createElement("i", {
    key: i,
    style: {
      height: b * 100 + "%",
      opacity: i / bars.length <= progress ? 0.95 : 0.4
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "rg-audio-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rg-pp",
    onClick: toggle
  }, playing ? "❚❚" : "▶"), /*#__PURE__*/React.createElement("span", null, fmtTime(cur), " / ", fmtTime(duration)), /*#__PURE__*/React.createElement("span", {
    className: "rg-audio-note"
  }, "\xB7 the kid's voice memo")), /*#__PURE__*/React.createElement("audio", {
    ref: audioRef,
    src: `games/${slug}/${src || "audio.mp3"}`,
    preload: "metadata"
  }));
}

// ---------- detail ----------
function GameDetail({
  slug
}) {
  const [meta, setMeta] = useState(null);
  useEffect(() => {
    let live = true;
    fetchMeta(slug).then(m => {
      if (live) setMeta(m);
    });
    return () => {
      live = false;
    };
  }, [slug]);
  const game = gameById(slug);
  if (!game) return /*#__PURE__*/React.createElement(NotFound, null);
  return /*#__PURE__*/React.createElement("div", {
    className: "rg-detail"
  }, /*#__PURE__*/React.createElement(Header, {
    back: "#/"
  }), /*#__PURE__*/React.createElement("div", {
    className: "rg-detail-body"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "rg-detail-title"
  }, game.title), /*#__PURE__*/React.createElement("p", {
    className: "rg-detail-genre"
  }, game.genre), /*#__PURE__*/React.createElement("div", {
    className: "rg-detail-cols"
  }, /*#__PURE__*/React.createElement("a", {
    className: "rg-preview",
    href: `#/game/${slug}/play`
  }, /*#__PURE__*/React.createElement(Cover, {
    game: game
  }), /*#__PURE__*/React.createElement("span", {
    className: "rg-preview-play"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rg-pill"
  }, "\u25B6 PLAY"))), /*#__PURE__*/React.createElement("div", {
    className: "rg-detail-side"
  }, !meta ? /*#__PURE__*/React.createElement("div", {
    className: "rg-panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rg-label"
  }, "Loading\u2026")) : meta.audio ? /*#__PURE__*/React.createElement(AudioPlayer, {
    slug: slug,
    duration: meta.audio.durationSec,
    src: meta.audio.src
  }) : /*#__PURE__*/React.createElement("div", {
    className: "rg-panel rg-noaudio"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rg-label"
  }, "The original idea"), /*#__PURE__*/React.createElement("p", null, "This one was typed, not spoken \u2014 read it in the transcript below.")))), meta && meta.transcript ? /*#__PURE__*/React.createElement("div", {
    className: "rg-transcript"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rg-label"
  }, "Transcript"), /*#__PURE__*/React.createElement("p", {
    className: "rg-transcript-text"
  }, meta.transcript)) : null));
}

// ---------- play ----------
function PlayView({
  slug
}) {
  const game = gameById(slug);
  useEffect(() => {
    const onKey = e => {
      if (e.key === "Escape") window.location.hash = `#/game/${slug}`;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slug]);
  if (!game) return /*#__PURE__*/React.createElement(NotFound, null);
  return /*#__PURE__*/React.createElement("div", {
    className: "rg-play"
  }, /*#__PURE__*/React.createElement("a", {
    className: "rg-play-back",
    href: `#/game/${slug}`,
    title: "Back to arcade (Esc)"
  }, "\u2039"), /*#__PURE__*/React.createElement("iframe", {
    className: "rg-play-frame",
    src: `games/${slug}/game/index.html`,
    title: game.title,
    allow: "autoplay; fullscreen"
  }));
}

// ---------- fallback + app ----------
function NotFound() {
  return /*#__PURE__*/React.createElement("div", {
    className: "rg-home"
  }, /*#__PURE__*/React.createElement(Header, {
    back: "#/"
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      padding: "40px 26px",
      color: "var(--muted)"
    }
  }, "Game not found."));
}
function App() {
  const hash = useHashRoute();
  const route = parseRoute(hash);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [hash]);
  if (route.name === "detail") return /*#__PURE__*/React.createElement(GameDetail, {
    slug: route.slug
  });
  if (route.name === "play") return /*#__PURE__*/React.createElement(PlayView, {
    slug: route.slug
  });
  return /*#__PURE__*/React.createElement(Home, null);
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
