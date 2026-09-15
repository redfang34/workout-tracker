// Program integrity checks. Run: node tools/check-program.mjs
// 1. Within each cycle, an exercise name never changes between phases for a slot
//    (the Cycle 1 "Seated DB shoulder press" vs "Seated DB press" bug).
// 2. No near-duplicate names inside a cycle (same letters, different spelling).
// 3. Reports which Cycle 2 names EXACTLY match a Cycle 1 name (these carry a
//    "last time" reference) and which are new.
// 4. Rest, totals, key helpers, and the Cycle 1 rename migration.
import { CYCLES, CYCLE_IDS, dayDefFor, restFor, totalSets, migrateDb, phaseForWeek }
  from "../src/program.js";
import { sk, parseKey, orderOf, labelOf, startOf } from "../src/keys.js";

let fails = 0;
// Slots John has explicitly accepted as renamed between phases (none today; the Cycle 1
// shoulder-press split was merged 2026-09-15 via RENAMES). Listed so the check stays honest.
const KNOWN = new Set([]);
const ok = (cond, msg) => { if (!cond) { fails++; console.log("  FAIL:", msg); } };

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const namesIn = (cycle) => {
  const set = new Set();
  for (let w = 1; w <= 6; w++) for (let d = 1; d <= 4; d++)
    for (const g of dayDefFor(cycle, w, d).groups) for (const e of g.exercises) set.add(e.name);
  return set;
};

for (const c of CYCLE_IDS) {
  console.log(`\n== Cycle ${c} ==`);
  const cdef = CYCLES[c];
  // 1. slot name consistency across phases (drop sets: single name must come from the prior phase's slot)
  for (let d = 1; d <= 4; d++) {
    for (const gid of ["A", "B", "C", "D"]) {
      let prev = null;
      for (const p of [1, 2, 3]) {
        const g = cdef.phases[p].days[d - 1].groups.find((x) => x.id === gid);
        if (!g) continue;
        const names = new Set(g.exercises.map((e) => e.name));
        if (prev) {
          if (g.kind === "dropset") {
            ok(names.size === 1 && prev.has([...names][0]),
              `C${c} D${d}-${gid} P${p} drop set name "${[...names][0]}" not in P${p - 1} slot`);
          } else {
            for (const n of prev) {
              if (KNOWN.has(`C${c} D${d}-${gid} ${n}`)) { console.log(`  known (unfixed): C${c} D${d}-${gid} "${n}" renamed in P${p}`); continue; }
              ok(names.has(n), `C${c} D${d}-${gid}: "${n}" present in P${p - 1} but not P${p}`);
            }
          }
        }
        prev = names;
      }
    }
  }
  // week-level overrides must only differ by the documented exception (cycle 1 week 1 D1-A)
  for (let w = 1; w <= 6; w++) for (let d = 1; d <= 4; d++) {
    const a = dayDefFor(c, w, d), b = cdef.phases[phaseForWeek(w)].days[d - 1];
    if (JSON.stringify(a) !== JSON.stringify(b)) console.log(`  week override: C${c} W${w} D${d}`);
  }
  // 2. near-duplicates
  const byNorm = {};
  for (const n of namesIn(c)) (byNorm[norm(n)] = byNorm[norm(n)] || []).push(n);
  for (const k in byNorm) ok(byNorm[k].length === 1, `near-duplicate names: ${byNorm[k].join(" / ")}`);
  // rest + totals
  for (let w = 1; w <= 6; w++) {
    const r = restFor(c, w);
    if (c === 2) ok(r.secs === 45 && r.label === "45 sec", `C2 W${w} rest is ${r.secs}`);
    console.log(`  W${w}: rest ${r.secs}s, sets/day ${[1, 2, 3, 4].map((d) => totalSets(dayDefFor(c, w, d))).join("/")}`);
  }
}

// 3. cross-cycle carry-over
const c1 = namesIn(1), c2 = namesIn(2);
const carry = [...c2].filter((n) => c1.has(n)).sort();
const fresh = [...c2].filter((n) => !c1.has(n)).sort();
console.log(`\n== Cycle 2 names that carry a Cycle 1 reference (${carry.length}) ==\n  ${carry.join("\n  ")}`);
console.log(`\n== Cycle 2 names starting fresh (${fresh.length}) ==\n  ${fresh.join("\n  ")}`);
// spot checks the spec called out
ok(!c1.has("Lat pulldown (narrow, supinated)"), "narrow pulldown must NOT match wide");
ok(!c1.has("Push-up (wide grip)"), "wide push-up must NOT match push-up");
ok(!c1.has("Standing hip abduction (cable)"), "cable hip abduction must NOT inherit the banded Cycle 1 sets");
ok(!c1.has("Seated leg curl") && !c1.has("Cable lateral raise") && !c1.has("EZ-bar curl"), "variations must be fresh");
ok(c1.has("Hip thrust") && c1.has("Dumbbell flye") && c1.has("Leg press"), "exact matches must carry");

// 4. keys
console.log("\n== keys ==");
ok(sk(1, 3, 2) === "w3d2" && sk(2, 3, 2) === "c2w3d2", "sk");
ok(JSON.stringify(parseKey("w6d4")) === '{"c":1,"w":6,"d":4}', "parse cycle 1");
ok(JSON.stringify(parseKey("c2w1d1")) === '{"c":2,"w":1,"d":1}', "parse cycle 2");
ok(parseKey("junk") === null && orderOf("junk") === -1, "junk key");
ok(orderOf("w6d4") === 23 && orderOf("c2w1d1") === 24 && orderOf("c2w6d4") === 47, "order across cycles");
ok(labelOf("w1d1") === "C1·W1·D1" && labelOf("c2w3d4") === "C2·W3·D4", "labels");
ok(startOf({ startDate: "2026-08-03" }, 1) === "2026-08-03", "startOf c1");
ok(startOf({ startDate: "2026-08-03" }, 2) === null, "startOf c2 unset");
ok(startOf({ startDate: "2026-08-03", cycleStart: { 2: "2026-09-21" } }, 2) === "2026-09-21", "startOf c2");

// cycle 1 migration must ignore cycle 2 keys
const db = migrateDb({ sessions: {
  w2d1: { entries: { "A.0.1": { n: "Bench press", g: "A", x: 0, rd: 1, w: 100, r: 10 } } },
  c2w2d1: { entries: { "B.0.1": { n: "Bench press", g: "A", x: 0, rd: 1, w: 100, r: 10 } } },
} });
ok(db.sessions.w2d1.entries["A.0.1"].n === "Dumbbell bench press", "c1 rename still applies");
ok(db.sessions.c2w2d1.entries["B.0.1"].n === "Bench press", "c2 keys untouched by c1 migration");
const db2 = migrateDb({ sessions: {
  w4d3: { entries: { "A.0.1": { n: "Seated DB press", g: "A", x: 0, rd: 1, w: 45, r: 8 } } },
  w1d3: { entries: { "A.0.1": { n: "Seated DB shoulder press", g: "A", x: 0, rd: 1, w: 40, r: 8 } } },
  c2w1d4: { entries: { "B.1.1": { n: "Standing hip abduction", g: "B", x: 1, rd: 1, w: 30, r: 12 } } },
  w3d2: { entries: { "A.2.1": { n: "Standing hip abduction", g: "A", x: 2, rd: 1, w: null, r: 12 } } },
} });
ok(db2.sessions.w4d3.entries["A.0.1"].n === "Seated DB shoulder press", "shoulder press merged toward the P1 name");
ok(db2.sessions.w1d3.entries["A.0.1"].n === "Seated DB shoulder press", "P1 shoulder press untouched");
ok(db2.sessions.c2w1d4.entries["B.1.1"].n === "Standing hip abduction (cable)", "cycle 2 hip abduction renamed");
ok(db2.sessions.w3d2.entries["A.2.1"].n === "Standing hip abduction", "cycle 1 banded hip abduction keeps its name");
ok(migrateDb(db2) === db2, "second pass is a no-op");

console.log(fails ? `\n${fails} FAILURE(S)` : "\nALL CHECKS PASSED");
process.exit(fails ? 1 : 0);
