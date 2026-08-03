import { useEffect, useMemo, useRef, useState } from "react";
import {
  PROGRAM, PHASE_REST, phaseForWeek, DAY_TITLES, DAY_SHORT, kindLabel, totalSets,
} from "./program.js";

const DB_KEY = "wt6.v1";
const sk = (w, d) => `w${w}d${d}`;
const orderOf = (key) => {
  const m = /^w(\d+)d(\d+)$/.exec(key);
  return m ? (+m[1] - 1) * 4 + (+m[2] - 1) : -1;
};
const labelOf = (key) => {
  const o = orderOf(key);
  return `W${Math.floor(o / 4) + 1}·D${(o % 4) + 1}`;
};

function loadDb() {
  try { return JSON.parse(localStorage.getItem(DB_KEY)) || {}; } catch { return {}; }
}

/* ------------------------------ audio / haptics ------------------------------ */
let actx = null;
export function ensureAudio() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
  } catch { /* audio unsupported — timer still flashes */ }
}
function tone(t0, freq, dur) {
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = "square";
  o.frequency.value = freq;
  o.connect(g);
  g.connect(actx.destination);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}
function alarm() {
  try {
    if (actx) {
      const t = actx.currentTime;
      tone(t, 880, 0.18);
      tone(t + 0.26, 880, 0.18);
      tone(t + 0.52, 1318, 0.4);
    }
  } catch { /* noop */ }
  try { navigator.vibrate && navigator.vibrate([250, 120, 250, 120, 450]); } catch { /* noop */ }
}

/* ------------------------------ derived helpers ------------------------------ */
function currentWeek(startDate) {
  if (!startDate) return null;
  const start = new Date(startDate + "T00:00:00");
  if (isNaN(start)) return null;
  const days = Math.floor((Date.now() - start.getTime()) / 86400000);
  return Math.min(6, Math.max(1, Math.floor(days / 7) + 1));
}

function sessionStatus(db, w, d) {
  const s = (db.sessions || {})[sk(w, d)];
  if (!s) return { state: "empty", logged: 0, total: totalSets(PROGRAM[phaseForWeek(w)].days[d - 1]) };
  const logged = Object.keys(s.entries || {}).length;
  const total = totalSets(PROGRAM[phaseForWeek(w)].days[d - 1]);
  return { state: s.completedAt || logged >= total ? "done" : logged > 0 ? "partial" : "empty", logged, total };
}

// Most recent PREVIOUS session's sets, indexed by exercise name.
function buildLastIndex(db, excludeKey) {
  const idx = {};
  const keys = Object.keys(db.sessions || {})
    .filter((k) => k !== excludeKey && orderOf(k) >= 0)
    .sort((a, b) => orderOf(a) - orderOf(b));
  for (const k of keys) {
    const byName = {};
    for (const e of Object.values(db.sessions[k].entries || {})) {
      if (!e || !e.n) continue;
      (byName[e.n] = byName[e.n] || []).push(e);
    }
    for (const n in byName) {
      const sets = byName[n].sort((a, b) =>
        a.g === b.g ? (a.rd - b.rd || a.x - b.x) : a.g < b.g ? -1 : 1
      );
      const lastW = [...sets].reverse().find((s) => s.w != null);
      idx[n] = { key: k, label: labelOf(k), sets, lastW: lastW ? lastW.w : null };
    }
  }
  return idx;
}

const fmtSet = (s) => `${s.w == null ? "BW" : s.w}×${s.r}`;

/* ------------------------------ progress series ------------------------------ */
// One point per session for an exercise: top weight, estimated 1RM (Epley),
// total volume, best reps.
function seriesForExercise(sets) {
  const bySess = {};
  for (const s of sets) (bySess[s.sess] = bySess[s.sess] || []).push(s);
  return Object.keys(bySess)
    .sort((a, b) => orderOf(a) - orderOf(b))
    .map((k) => {
      const list = bySess[k];
      const weighted = list.filter((s) => s.w != null);
      const topW = weighted.length ? Math.max(...weighted.map((s) => s.w)) : null;
      const best = weighted.slice().sort((a, b) => b.w - a.w || b.r - a.r)[0];
      const e1rm = best ? Math.round(best.w * (1 + best.r / 30)) : null;
      const volRaw = weighted.reduce((n, s) => n + s.w * s.r, 0);
      return {
        key: k,
        label: labelOf(k),
        topW,
        e1rm,
        vol: volRaw > 0 ? Math.round(volRaw) : null,
        reps: Math.max(...list.map((s) => s.r || 0)),
      };
    });
}

const METRICS = [
  { id: "topW", name: "Top weight", unit: "lb", get: (p) => p.topW },
  { id: "e1rm", name: "Est. 1RM", unit: "lb", get: (p) => p.e1rm },
  { id: "vol", name: "Volume", unit: "lb", get: (p) => p.vol },
  { id: "reps", name: "Best reps", unit: "reps", get: (p) => p.reps },
];
const metricsFor = (series) =>
  series.some((p) => p.topW != null)
    ? METRICS.filter((m) => m.id !== "reps")
    : METRICS.filter((m) => m.id === "reps");

function niceStep(raw) {
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 2.5, 5, 10]) if (raw <= m * mag) return m * mag;
  return 10 * mag;
}

function ProgressChart({ series, metric }) {
  const [hi, setHi] = useState(null);
  const pts = series
    .map((p) => ({ ...p, v: metric.get(p) }))
    .filter((p) => p.v != null);
  if (pts.length < 2) {
    return <div className="sub chart-empty">Log this exercise in two or more sessions and the trend line shows up here.</div>;
  }
  const W = 360, H = 190, L = 46, R = 16, T = 18, B = 26;
  let vmin = Math.min(...pts.map((p) => p.v));
  let vmax = Math.max(...pts.map((p) => p.v));
  if (vmin === vmax) { vmin -= 1; vmax += 1; }
  const pad = (vmax - vmin) * 0.15;
  const y0 = Math.max(0, vmin - pad), y1 = vmax + pad;
  const step = niceStep((y1 - y0) / 3);
  const ticks = [];
  for (let t = Math.ceil(y0 / step) * step; t <= y1; t += step) ticks.push(t);
  const x = (i) => L + (i * (W - L - R)) / (pts.length - 1);
  const y = (v) => T + (H - T - B) * (1 - (v - y0) / (y1 - y0));
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const area = `${line}L${x(pts.length - 1).toFixed(1)},${H - B}L${L},${H - B}Z`;
  const xEvery = pts.length <= 6 ? 1 : Math.ceil(pts.length / 5);
  const fmt = (v) => v.toLocaleString();

  const onMove = (ev) => {
    const rect = ev.currentTarget.getBoundingClientRect();
    const px = ((ev.clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < pts.length; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    setHi(best);
  };

  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="chart"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHi(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="grid" />
            <text x={L - 6} y={y(t) + 3} textAnchor="end" className="tick">{fmt(t)}</text>
          </g>
        ))}
        <path d={area} className="area" />
        <path d={line} className="line" />
        {pts.map((p, i) => (
          <g key={p.key}>
            {(i % xEvery === 0 || i === pts.length - 1) && (
              <text x={x(i)} y={H - B + 14} textAnchor="middle" className="tick">{p.label}</text>
            )}
            <circle
              cx={x(i)} cy={y(p.v)} r={i === pts.length - 1 ? 5 : 4}
              className={"pt" + (i === pts.length - 1 ? " pt-end" : "") + (hi === i ? " pt-hi" : "")}
            />
          </g>
        ))}
        {hi == null && (
          <text
            x={Math.min(x(pts.length - 1), W - R - 4)} y={y(pts[pts.length - 1].v) - 10}
            textAnchor="end" className="endlabel"
          >
            {fmt(pts[pts.length - 1].v)}
          </text>
        )}
      </svg>
      {hi != null && (
        <div
          className="tooltip"
          style={{ left: `${(x(hi) / W) * 100}%`, top: `${(y(pts[hi].v) / H) * 100}%` }}
        >
          <span className="tt-label">{pts[hi].label}</span> {fmt(pts[hi].v)} {metric.unit}
        </div>
      )}
    </div>
  );
}

function Sparkline({ series }) {
  const metric = metricsFor(series)[0];
  const pts = series.map((p) => metric.get(p)).filter((v) => v != null);
  if (pts.length < 2) return null;
  const W = 64, H = 20, P = 3;
  let vmin = Math.min(...pts), vmax = Math.max(...pts);
  if (vmin === vmax) { vmin -= 1; vmax += 1; }
  const x = (i) => P + (i * (W - 2 * P)) / (pts.length - 1);
  const y = (v) => P + (H - 2 * P) * (1 - (v - vmin) / (vmax - vmin));
  const d = pts.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="spark" aria-hidden="true">
      <polyline points={d} className="spark-line" />
      <circle cx={x(pts.length - 1)} cy={y(pts[pts.length - 1])} r="2.4" className="spark-dot" />
    </svg>
  );
}

/* ================================== APP ================================== */
export default function App() {
  const [db, setDb] = useState(loadDb);
  const [route, setRoute] = useState(() => {
    const m = /^#w([1-6])d([1-4])$/.exec(location.hash || "");
    if (m) return { name: "workout", week: +m[1], day: +m[2] };
    const h = /^#history(?:=(.*))?$/.exec(location.hash || "");
    if (h) return { name: "history", sel: h[1] ? decodeURIComponent(h[1]) : null };
    return { name: "home" };
  });

  useEffect(() => {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* full/blocked */ }
  }, [db]);

  useEffect(() => {
    const h = route.name === "workout" ? `#w${route.week}d${route.day}` : "";
    try { history.replaceState(null, "", location.pathname + location.search + h); } catch { /* noop */ }
  }, [route]);

  const logSet = (week, day, gid, exIdx, round, entry) =>
    setDb((d) => {
      const key = sk(week, day);
      const s = (d.sessions || {})[key] || { entries: {} };
      return {
        ...d,
        sessions: {
          ...(d.sessions || {}),
          [key]: { ...s, entries: { ...s.entries, [`${gid}.${exIdx}.${round}`]: entry } },
        },
      };
    });

  const markComplete = (week, day) =>
    setDb((d) => {
      const key = sk(week, day);
      const s = (d.sessions || {})[key];
      if (!s || s.completedAt) return d;
      return { ...d, sessions: { ...d.sessions, [key]: { ...s, completedAt: Date.now() } } };
    });

  const setStartDate = (v) => setDb((d) => ({ ...d, startDate: v || undefined }));

  if (route.name === "workout") {
    return (
      <Workout
        db={db}
        week={route.week}
        day={route.day}
        onLog={logSet}
        onComplete={markComplete}
        onBack={() => setRoute({ name: "home" })}
      />
    );
  }
  if (route.name === "history") {
    return <History db={db} initialSel={route.sel || null} onBack={() => setRoute({ name: "home" })} />;
  }
  return (
    <Home
      db={db}
      setStartDate={setStartDate}
      openDay={(week, day) => setRoute({ name: "workout", week, day })}
      openHistory={() => setRoute({ name: "history" })}
      importDb={(next) => setDb(next)}
    />
  );
}

/* ================================== HOME ================================== */
function Home({ db, setStartDate, openDay, openHistory, importDb }) {
  const cw = currentWeek(db.startDate);
  const [editingDate, setEditingDate] = useState(!db.startDate);
  const fileRef = useRef(null);

  // Suggested next: first non-complete day of the current week.
  let suggest = null;
  if (cw) {
    for (let d = 1; d <= 4; d++) {
      if (sessionStatus(db, cw, d).state !== "done") { suggest = { w: cw, d }; break; }
    }
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `workout-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  const onImportFile = (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const next = JSON.parse(rd.result);
        if (typeof next !== "object" || (!next.sessions && !next.startDate)) throw new Error("bad file");
        if (confirm("Replace all current data with this backup?")) importDb(next);
      } catch {
        alert("That file doesn't look like a workout backup.");
      }
      ev.target.value = "";
    };
    rd.readAsText(f);
  };

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-kicker">3 phases · 4 days · circuits</div>
        <h1 className="disp hero-title">6-WEEK<br />STRENGTH</h1>
        {cw ? (
          <div className="hero-status">
            <span className="pill pill-accent">Week {cw} of 6</span>
            <span className="pill">Phase {phaseForWeek(cw)}</span>
            <span className="pill">Rest {PHASE_REST[phaseForWeek(cw)].label}</span>
            <button className="linkbtn" onClick={() => setEditingDate((v) => !v)}>start date</button>
          </div>
        ) : null}
      </header>

      {editingDate && (
        <div className="card setup">
          <div className="card-title">Program start date</div>
          <p className="sub">Set once — the app figures out which week you're on. You can still tap any day below.</p>
          <div className="setup-row">
            <input
              type="date"
              className="date-input"
              defaultValue={db.startDate || ""}
              onChange={(e) => e.target.value && (setStartDate(e.target.value), setEditingDate(false))}
            />
          </div>
        </div>
      )}

      {[1, 2, 3].map((p) => (
        <section className="phase" key={p}>
          <div className="phase-head">
            <span className="disp phase-num">P{p}</span>
            <div>
              <div className="phase-title">Phase {p} · Weeks {p * 2 - 1}–{p * 2}</div>
              <div className="sub">
                Rest {PHASE_REST[p].label}
                {p === 2 && " · three slots become tri-sets"}
                {p === 3 && " · drop-set finishers"}
              </div>
            </div>
          </div>
          {[p * 2 - 1, p * 2].map((w) => (
            <div className="weekrow" key={w}>
              <span className={"disp weeklabel" + (cw === w ? " now" : "")}>W{w}</span>
              {[1, 2, 3, 4].map((d) => {
                const st = sessionStatus(db, w, d);
                const isSuggest = suggest && suggest.w === w && suggest.d === d;
                return (
                  <button
                    key={d}
                    className={"daybtn " + st.state + (isSuggest ? " suggest" : "")}
                    onClick={() => openDay(w, d)}
                  >
                    <span className="daybtn-num disp">{d}</span>
                    <span className="daybtn-name">{DAY_SHORT[d - 1]}</span>
                    <span className="daybtn-st">
                      {st.state === "done" ? "✓" : st.state === "partial" ? `${st.logged}/${st.total}` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </section>
      ))}

      <footer className="homefoot">
        <button className="btn ghost" onClick={openHistory}>History</button>
        <button className="btn ghost" onClick={exportData}>Export</button>
        <button className="btn ghost" onClick={() => fileRef.current && fileRef.current.click()}>Import</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImportFile} />
      </footer>
      <div className="foot-note sub">Data lives on this device — export a backup now and then.</div>
    </div>
  );
}

/* ================================= WORKOUT ================================= */
function Workout({ db, week, day, onLog, onComplete, onBack }) {
  const phase = phaseForWeek(week);
  const dayDef = PROGRAM[phase].days[day - 1];
  const rest = PHASE_REST[phase];
  const key = sk(week, day);
  const entries = ((db.sessions || {})[key] || {}).entries || {};
  const [timer, setTimer] = useState(null);
  const lastIdx = useMemo(() => buildLastIndex(db, key), [db, key]);

  const total = totalSets(dayDef);
  const logged = Object.keys(entries).length;
  const complete = logged >= total;

  useEffect(() => { if (complete) onComplete(week, day); }, [complete]);

  // Keep the screen on mid-workout where supported.
  useEffect(() => {
    let lock = null;
    const req = async () => {
      try { lock = await (navigator.wakeLock && navigator.wakeLock.request("screen")); } catch { /* denied */ }
    };
    req();
    const vis = () => { if (document.visibilityState === "visible") req(); };
    document.addEventListener("visibilitychange", vis);
    return () => {
      document.removeEventListener("visibilitychange", vis);
      try { lock && lock.release(); } catch { /* noop */ }
    };
  }, []);

  const handleLog = (g, exIdx, round, val) => {
    ensureAudio();
    const ex = g.exercises[exIdx];
    const wasLogged = !!entries[`${g.id}.${exIdx}.${round}`];
    const entry = { n: ex.name, g: g.id, x: exIdx, rd: round, w: val.w, r: val.r, t: Date.now() };
    onLog(week, day, g.id, exIdx, round, entry);
    const after = { ...entries, [`${g.id}.${exIdx}.${round}`]: entry };
    const roundDone = g.exercises.every((_, i) => after[`${g.id}.${i}.${round}`]);
    const gi = dayDef.groups.indexOf(g);
    const lastOfDay = gi === dayDef.groups.length - 1 && round === g.rounds;
    if (roundDone && !lastOfDay && !wasLogged) setTimer({ secs: rest.secs, key: Date.now() });
  };

  return (
    <div className="app">
      <header className="topbar">
        <button className="backbtn" onClick={onBack} aria-label="Back">‹</button>
        <div>
          <div className="topbar-title disp">W{week} · Day {day} — {dayDef.title}</div>
          <div className="sub">Phase {phase} · Rest {rest.label} between rounds · {logged}/{total} sets</div>
        </div>
      </header>

      {complete && (
        <div className="complete-banner">
          <span className="disp">WORKOUT COMPLETE</span> — every set logged. Go eat.
        </div>
      )}

      {dayDef.groups.map((g) => (
        <GroupCard
          key={g.id + phase + week + day}
          g={g}
          entries={entries}
          lastIdx={lastIdx}
          onLog={(exIdx, round, val) => handleLog(g, exIdx, round, val)}
        />
      ))}

      {timer && (
        <RestTimer key={timer.key} secs={timer.secs} onClose={() => setTimer(null)} />
      )}
    </div>
  );
}

function firstOpenRound(g, entries) {
  for (let r = 1; r <= g.rounds; r++) {
    if (g.exercises.some((_, i) => !entries[`${g.id}.${i}.${r}`])) return r;
  }
  return g.rounds + 1;
}

function GroupCard({ g, entries, lastIdx, onLog }) {
  const openRound = firstOpenRound(g, entries);
  const groupDone = openRound > g.rounds;
  const [edit, setEdit] = useState(null); // {exIdx, round} re-opens a logged set

  return (
    <section className={"card group" + (groupDone ? " gdone" : "")}>
      <span className="disp gwatermark" aria-hidden="true">{g.id}</span>
      <div className="group-head">
        <div>
          <span className="disp gletter">{g.id}</span>
          <span className="gkind">{kindLabel(g)}</span>
        </div>
        <div className="rounds-dots">
          {Array.from({ length: g.rounds }, (_, i) => i + 1).map((r) => (
            <span
              key={r}
              className={"dot" + (r < openRound ? " dot-done" : r === openRound ? " dot-now" : "")}
            />
          ))}
          <span className="sub rounds-label">
            {g.kind === "dropset" ? "1 set · 3 drops" : `${g.rounds} rounds`}
          </span>
        </div>
      </div>
      {g.note && <div className="gnote">{g.note}</div>}

      {g.exercises.map((ex, i) => {
        const editRound = edit && edit.exIdx === i ? edit.round : null;
        const activeRound =
          editRound ??
          (!groupDone && openRound <= g.rounds && !entries[`${g.id}.${i}.${openRound}`]
            ? openRound
            : null);
        const last = lastIdx[ex.name];
        const lastSets = last
          ? (last.sets.some((s) => s.g === g.id) ? last.sets.filter((s) => s.g === g.id) : last.sets)
          : [];

        // weight default: this-slot previous value > previous round this session >
        // same round last session > last known weight for this exercise
        let defW = null;
        if (activeRound != null) {
          const cur = entries[`${g.id}.${i}.${activeRound}`];
          const prevRound = entries[`${g.id}.${i}.${activeRound - 1}`];
          const lastSame = lastSets.find((s) => s.rd === activeRound && s.x === i) || lastSets.find((s) => s.x === i);
          defW = cur ? cur.w
            : prevRound ? prevRound.w
            : lastSame ? lastSame.w
            : last ? last.lastW
            : null;
        }
        const curEntry = activeRound != null ? entries[`${g.id}.${i}.${activeRound}`] : null;

        return (
          <div className="exercise" key={i}>
            <div className="ex-head">
              <div>
                <div className="ex-name">
                  {g.kind === "dropset" ? <span className="stage-tag disp">DROP {ex.stage}</span> : null}
                  {ex.name}
                </div>
                <div className="ex-meta sub">
                  <span className="target">{ex.label}</span>
                  {ex.note ? <span className="note"> · {ex.note}</span> : null}
                </div>
                {last && (
                  <div className="ex-last sub">
                    Last ({last.label}): {lastSets.map(fmtSet).join(" · ")}
                  </div>
                )}
              </div>
            </div>

            <div className="chips">
              {Array.from({ length: g.rounds }, (_, ri) => ri + 1).map((r) => {
                const e = entries[`${g.id}.${i}.${r}`];
                const isActive = r === activeRound;
                if (e && !isActive) {
                  return (
                    <button key={r} className="chip chip-done" onClick={() => setEdit({ exIdx: i, round: r })}>
                      <span className="chip-r">R{r}</span> {fmtSet(e)}
                    </button>
                  );
                }
                return (
                  <span key={r} className={"chip" + (isActive ? " chip-now" : " chip-empty")}>
                    <span className="chip-r">R{r}</span> {isActive ? "now" : "—"}
                  </span>
                );
              })}
            </div>

            {activeRound != null && (
              <SetInput
                key={`${g.id}.${i}.${activeRound}.${curEntry ? curEntry.t : "new"}`}
                defW={defW}
                defR={curEntry ? curEntry.r : ex.def}
                editing={!!curEntry}
                onSave={(val) => { onLog(i, activeRound, val); setEdit(null); }}
                onCancel={editRound ? () => setEdit(null) : null}
              />
            )}
          </div>
        );
      })}
    </section>
  );
}

function SetInput({ defW, defR, editing, onSave, onCancel }) {
  const [w, setW] = useState(defW == null ? "" : String(defW));
  const [r, setR] = useState(defR == null ? "" : String(defR));
  const repsOk = r !== "" && !isNaN(parseFloat(r));
  const bump = (delta) => setR((v) => {
    const n = Math.max(0, (parseInt(v, 10) || 0) + delta);
    return String(n);
  });
  return (
    <div className="setrow">
      <label className="field">
        <span className="field-label">WEIGHT</span>
        <input
          type="number" inputMode="decimal" step="0.5" min="0"
          placeholder="BW" value={w}
          onChange={(e) => setW(e.target.value)}
        />
        <span className="unit">lb</span>
      </label>
      <label className="field field-reps">
        <span className="field-label">REPS</span>
        <button className="stepper" onClick={(e) => { e.preventDefault(); bump(-1); }}>−</button>
        <input
          type="number" inputMode="numeric" min="0"
          value={r}
          onChange={(e) => setR(e.target.value)}
        />
        <button className="stepper" onClick={(e) => { e.preventDefault(); bump(1); }}>+</button>
      </label>
      <button
        className="btn btn-log disp"
        disabled={!repsOk}
        onClick={() => onSave({ w: w === "" ? null : parseFloat(w), r: Math.max(0, Math.round(parseFloat(r))) })}
      >
        {editing ? "SAVE" : "LOG"}
      </button>
      {onCancel && <button className="btn ghost btn-cancel" onClick={onCancel}>✕</button>}
    </div>
  );
}

/* ================================= TIMER ================================= */
function RestTimer({ secs, onClose }) {
  const [total, setTotal] = useState(secs);
  const [endAt, setEndAt] = useState(() => Date.now() + secs * 1000);
  const [, tick] = useState(0);
  const fired = useRef(false);

  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 200);
    return () => clearInterval(id);
  }, []);

  const remainMs = Math.max(0, endAt - Date.now());
  const done = remainMs <= 0;

  useEffect(() => {
    if (done && !fired.current) {
      fired.current = true;
      alarm();
      const t = setTimeout(onClose, 2600);
      return () => clearTimeout(t);
    }
  }, [done]);

  const s = Math.ceil(remainMs / 1000);
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  const R = 100;
  const C = 2 * Math.PI * R;

  return (
    <div className={"timer" + (done ? " timer-done" : "")}>
      <div className="timer-inner">
        <svg viewBox="0 0 240 240" className="ring" aria-hidden="true">
          <circle cx="120" cy="120" r={R} className="ring-bg" />
          <circle
            cx="120" cy="120" r={R} className="ring-fg"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - remainMs / (total * 1000))}
          />
        </svg>
        <div className="timer-num disp">{done ? "GO" : `${mm}:${ss}`}</div>
        <div className="timer-sub">{done ? "NEXT ROUND" : "REST"}</div>
      </div>
      <div className="timer-btns">
        {!done && (
          <button
            className="btn ghost"
            onClick={() => { setEndAt((e) => e + 15000); setTotal((t) => t + 15); }}
          >
            +15s
          </button>
        )}
        <button className="btn disp" onClick={onClose}>{done ? "GO" : "SKIP"}</button>
      </div>
    </div>
  );
}

/* ================================ HISTORY ================================ */
function History({ db, initialSel, onBack }) {
  const [sel, setSel] = useState(initialSel);

  const byName = useMemo(() => {
    const m = {};
    const keys = Object.keys(db.sessions || {})
      .filter((k) => orderOf(k) >= 0)
      .sort((a, b) => orderOf(a) - orderOf(b));
    for (const k of keys) {
      for (const e of Object.values(db.sessions[k].entries || {})) {
        if (!e || !e.n) continue;
        (m[e.n] = m[e.n] || []).push({ ...e, sess: k });
      }
    }
    return m;
  }, [db]);

  const names = Object.keys(byName).sort();

  if (sel && byName[sel]) {
    return <ExerciseDetail key={sel} name={sel} sets={byName[sel]} onBack={() => setSel(null)} />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <button className="backbtn" onClick={onBack} aria-label="Back">‹</button>
        <div>
          <div className="topbar-title disp">HISTORY</div>
          <div className="sub">Tap an exercise to see every session</div>
        </div>
      </header>
      {names.length === 0 && (
        <div className="card"><p className="sub">Nothing logged yet — go lift something.</p></div>
      )}
      {names.map((n) => {
        const sets = byName[n];
        const lastSet = sets[sets.length - 1];
        return (
          <button className="card exlistrow" key={n} onClick={() => setSel(n)}>
            <div className="exlist-main">
              <div className="ex-name">{n}</div>
              <div className="sub">{sets.length} sets · last {fmtSet(lastSet)} ({labelOf(lastSet.sess)})</div>
            </div>
            <Sparkline series={seriesForExercise(sets)} />
            <span className="chev">›</span>
          </button>
        );
      })}
    </div>
  );
}

function ExerciseDetail({ name, sets, onBack }) {
  const series = useMemo(() => seriesForExercise(sets), [sets]);
  const metrics = metricsFor(series);
  const [metric, setMetric] = useState(metrics[0]);
  const best = sets.reduce((b, s) => (s.w != null && (b == null || s.w > b) ? s.w : b), null);
  const bySess = {};
  for (const s of sets) (bySess[s.sess] = bySess[s.sess] || []).push(s);
  const sessKeys = Object.keys(bySess).sort((a, b) => orderOf(b) - orderOf(a));
  return (
    <div className="app">
      <header className="topbar">
        <button className="backbtn" onClick={onBack} aria-label="Back">‹</button>
        <div>
          <div className="topbar-title disp">{name}</div>
          <div className="sub">{best != null ? `Heaviest so far: ${best} lb` : "Bodyweight so far"}</div>
        </div>
      </header>

      <div className="card chart-card">
        <div className="metric-chips">
          {metrics.map((m) => (
            <button
              key={m.id}
              className={"mchip" + (m.id === metric.id ? " on" : "")}
              onClick={() => setMetric(m)}
            >
              {m.name}
            </button>
          ))}
        </div>
        <ProgressChart series={series} metric={metric} />
      </div>

      {sessKeys.map((k) => {
        const list = bySess[k].sort((a, b) => (a.g < b.g ? -1 : a.g > b.g ? 1 : a.rd - b.rd || a.x - b.x));
        const when = new Date(Math.max(...list.map((s) => s.t || 0)));
        return (
          <div className="card histrow" key={k}>
            <div className="hist-head">
              <span className="disp hist-key">{labelOf(k)}</span>
              <span className="sub">{isNaN(when) ? "" : when.toLocaleDateString()}</span>
            </div>
            <div className="hist-sets">{list.map(fmtSet).join(" · ")}</div>
          </div>
        );
      })}
    </div>
  );
}
