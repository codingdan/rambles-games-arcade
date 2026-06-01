const { useState, useEffect, useRef } = React;

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
    return { name: parts[2] === "play" ? "play" : "detail", slug: parts[1] };
  }
  return { name: "home" };
}

// ---------- data ----------
const metaCache = new Map();
function fetchMeta(slug) {
  if (metaCache.has(slug)) return Promise.resolve(metaCache.get(slug));
  return fetch(`games/${slug}/meta.json`)
    .then((r) => r.json())
    .then((m) => { metaCache.set(slug, m); return m; });
}
function gameById(slug) {
  return (window.RG_GAMES || []).find((g) => g.id === slug);
}
function seededBars(seed, n) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const bars = [];
  for (let i = 0; i < n; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    bars.push(0.25 + ((h % 1000) / 1000) * 0.75);
  }
  return bars;
}
function fmtTime(s) {
  s = Math.floor(s || 0);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

// ---------- shared bits ----------
function Header({ back }) {
  return (
    <header className="rg-header">
      <a className="rg-brand" href="#/"><span className="acc">~/</span>rambles arcade</a>
      {back
        ? <a className="rg-back-link" href={back}>‹ back to games</a>
        : <span className="rg-tag">games from rambles</span>}
    </header>
  );
}
function Cover({ game }) {
  return <img src={`games/${game.id}/${game.cover || "cover.png"}`} alt={game.title} />;
}

// ---------- home ----------
function GameCard({ game }) {
  return (
    <a className="rg-card" href={`#/game/${game.id}`}>
      <div className="rg-card-cover"><Cover game={game} /></div>
      <div className="rg-card-body">
        <div className="rg-card-title">{game.title}</div>
        <div className="rg-card-genre">{game.desc || game.genre}</div>
        <div className="rg-card-play">▶ PLAY</div>
      </div>
    </a>
  );
}
function Home() {
  const games = window.RG_GAMES || [];
  return (
    <div className="rg-home">
      <Header />
      <div className="rg-grid">
        {games.map((g) => <GameCard key={g.id} game={g} />)}
      </div>
    </div>
  );
}

// ---------- audio ----------
function AudioPlayer({ slug, duration, src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const bars = seededBars(slug, 40);
  const progress = duration ? cur / duration : 0;

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play(); else a.pause();
  };
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCur(a.currentTime);
    const onPlay = () => setPlaying(true);
    const onStop = () => setPlaying(false);
    const onEnded = () => { setPlaying(false); setCur(0); };
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

  return (
    <div className="rg-panel">
      <div className="rg-label">The original pitch</div>
      <div className="rg-wave" onClick={toggle}>
        {bars.map((b, i) => (
          <i key={i} style={{ height: b * 100 + "%", opacity: i / bars.length <= progress ? 0.95 : 0.4 }} />
        ))}
      </div>
      <div className="rg-audio-row">
        <button className="rg-pp" onClick={toggle}>{playing ? "❚❚" : "▶"}</button>
        <span>{fmtTime(cur)} / {fmtTime(duration)}</span>
        <span className="rg-audio-note">· the kid's voice memo</span>
      </div>
      <audio ref={audioRef} src={`games/${slug}/${src || "audio.mp3"}`} preload="metadata" />
    </div>
  );
}

// ---------- detail ----------
function GameDetail({ slug }) {
  const [meta, setMeta] = useState(null);
  useEffect(() => {
    let live = true;
    fetchMeta(slug).then((m) => { if (live) setMeta(m); });
    return () => { live = false; };
  }, [slug]);

  const game = gameById(slug);
  if (!game) return <NotFound />;

  return (
    <div className="rg-detail">
      <Header back="#/" />
      <div className="rg-detail-body">
        <h1 className="rg-detail-title">{game.title}</h1>
        <p className="rg-detail-genre">{game.genre}</p>
        <div className="rg-detail-cols">
          <a className="rg-preview" href={`#/game/${slug}/play`}>
            <Cover game={game} />
            <span className="rg-preview-play"><span className="rg-pill">▶ PLAY</span></span>
          </a>
          <div className="rg-detail-side">
            {!meta
              ? <div className="rg-panel"><div className="rg-label">Loading…</div></div>
              : meta.audio
                ? <AudioPlayer slug={slug} duration={meta.audio.durationSec} src={meta.audio.src} />
                : <div className="rg-panel rg-noaudio">
                    <div className="rg-label">The original idea</div>
                    <p>This one was typed, not spoken — read it in the transcript below.</p>
                  </div>}
          </div>
        </div>
        {meta && meta.transcript
          ? <div className="rg-transcript">
              <div className="rg-label">Transcript</div>
              <p className="rg-transcript-text">{meta.transcript}</p>
            </div>
          : null}
      </div>
    </div>
  );
}

// ---------- play ----------
function PlayView({ slug }) {
  const game = gameById(slug);
  const exit = () => { window.location.hash = `#/game/${slug}`; };
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") exit(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slug]);
  // The game runs in a same-origin iframe that grabs keyboard focus, so the
  // parent window won't see Esc once the kid is playing. Also listen inside the
  // frame. (Same-origin only; wrapped in try/catch as a safety net.)
  const onFrameLoad = (e) => {
    try {
      e.target.contentWindow.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape") exit();
      });
    } catch (_) { /* ignore */ }
  };
  if (!game) return <NotFound />;
  return (
    <div className="rg-play">
      <a className="rg-play-back" href={`#/game/${slug}`} title="Back to arcade (Esc)">‹</a>
      <iframe className="rg-play-frame" src={`games/${slug}/game/`} title={game.title} allow="autoplay; fullscreen" onLoad={onFrameLoad} />
    </div>
  );
}

// ---------- fallback + app ----------
function NotFound() {
  return (
    <div className="rg-home">
      <Header back="#/" />
      <p style={{ padding: "40px 26px", color: "var(--muted)" }}>Game not found.</p>
    </div>
  );
}
function App() {
  const hash = useHashRoute();
  const route = parseRoute(hash);
  useEffect(() => { window.scrollTo(0, 0); }, [hash]);
  if (route.name === "detail") return <GameDetail slug={route.slug} />;
  if (route.name === "play") return <PlayView slug={route.slug} />;
  return <Home />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
