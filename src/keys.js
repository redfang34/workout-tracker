// Session keys. Cycle 1 keeps its original `w{week}d{day}` form so existing
// history is untouched; later cycles are `c{cycle}w{week}d{day}`.
export const sk = (c, w, d) => (c === 1 ? `w${w}d${d}` : `c${c}w${w}d${d}`);

export const parseKey = (key) => {
  const m = /^(?:c(\d+))?w(\d+)d(\d+)$/.exec(key);
  return m ? { c: m[1] ? +m[1] : 1, w: +m[2], d: +m[3] } : null;
};

// Chronological order across cycles: every cycle is 6 weeks x 4 days.
export const orderOf = (key) => {
  const p = parseKey(key);
  return p ? (p.c - 1) * 24 + (p.w - 1) * 4 + (p.d - 1) : -1;
};

export const labelOf = (key) => {
  const p = parseKey(key);
  return p ? `C${p.c}·W${p.w}·D${p.d}` : key;
};

// Start date of a cycle: cycle 1 lives at db.startDate (original schema),
// later cycles under db.cycleStart[cycle].
export const startOf = (db, c) => (c === 1 ? db.startDate : (db.cycleStart || {})[c]) || null;
