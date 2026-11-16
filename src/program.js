// Strength programs, organised as CYCLES. Each cycle is a 6-week program:
// 3 two-week phases x 4 training days. Cycle 1 is the original (completed)
// program; Cycle 2 is the follow-on; Cycle 3 swaps in new variations. Data is the single source of truth for
// the UI; logged entries are keyed `${group.id}.${exerciseIndex}.${round}`
// inside each session.

export const DAY_TITLES = [
  "Chest + Back",
  "Legs + Core",
  "Shoulders + Arms",
  "Glutes + Conditioning",
];

export const DAY_SHORT = ["Chest·Back", "Legs·Core", "Shldrs·Arms", "Glutes·Cond"];

export const phaseForWeek = (w) => (w <= 2 ? 1 : w <= 4 ? 2 : 3);

// def = default rep count prefilled in the input (null = free entry, e.g. max reps)
const E = (name, def, label, note) =>
  ({ name, def, label: label ?? `${def} reps`, ...(note ? { note } : {}) });

const G = (id, kind, rounds, exercises) => ({ id, kind, rounds, exercises });

// unit: how each stage's target reads, e.g. "reps" -> "12 reps", "/ arm" -> "10 / arm"
const DROP = (id, name, stages, unit = "reps") => ({
  id,
  kind: "dropset",
  rounds: 1,
  note: "One continuous set — reduce the weight between drops, no rest.",
  exercises: stages.map((r, i) => ({
    name,
    def: r,
    label: `${r} ${unit}`,
    stage: i + 1,
    ...(i > 0 ? { note: "drop the weight" } : {}),
  })),
});

const clone = (o) => JSON.parse(JSON.stringify(o));

/* ================================ CYCLE 1 ================================ */

export const PHASE_REST = {
  1: { label: "60–75 sec", secs: 75 },
  2: { label: "45–50 sec", secs: 50 },
  3: { label: "45–50 sec", secs: 50 },
};

const PHASE_1 = {
  days: [
    {
      title: DAY_TITLES[0],
      groups: [
        G("A", "circuit", 4, [
          E("Dumbbell bench press", 10, "8–10 reps"),
          E("Chest-supported row", 10, "8–10 reps"),
        ]),
        G("B", "circuit", 3, [
          E("Incline DB press", 10),
          E("Lat pulldown", 10, "10 reps", "wide, neutral grip"),
        ]),
        G("C", "circuit", 3, [
          E("Dumbbell flye", 12),
          E("Seated cable row", 12),
        ]),
        G("D", "circuit", 2, [
          E("Push-up", null, "max reps"),
          E("Face pull", 15),
        ]),
      ],
    },
    {
      title: DAY_TITLES[1],
      groups: [
        G("A", "circuit", 4, [
          E("Leg press", 10, "10 reps", "controlled range — stop before the pelvis tucks under"),
          E("Leg curl", 10),
        ]),
        G("B", "circuit", 3, [
          E("Hip thrust", 10),
          E("Leg extension", 12),
        ]),
        G("C", "circuit", 3, [
          E("DB reverse lunge or step-up", 8, "8 / leg"),
          E("Seated calf raise", 15),
        ]),
        G("D", "circuit", 2, [
          E("Bodyweight back extension", 12),
          E("Side plank", 30, "30 sec / side"),
          E("Bird dog", 8, "8 / side"),
        ]),
      ],
    },
    {
      title: DAY_TITLES[2],
      groups: [
        G("A", "circuit", 4, [
          E("Seated DB shoulder press", 8),
          E("Lateral raise", 12),
        ]),
        G("B", "circuit", 3, [
          E("Barbell curl", 10),
          E("Rope triceps pushdown", 10),
        ]),
        G("C", "circuit", 3, [
          E("Hammer curl", 12),
          E("Seated overhead triceps extension", 12),
        ]),
        G("D", "circuit", 2, [
          E("Machine rear-delt fly", 15),
          E("Shrug", 15),
        ]),
      ],
    },
    {
      title: DAY_TITLES[3],
      groups: [
        G("A", "circuit", 4, [
          E("Hip thrust", 8, "8 reps", "heavier glute day"),
          E("Single-arm cable row", 10, "10 / side", "standing, staggered stance"),
        ]),
        G("B", "circuit", 3, [
          E("Banded lateral walk", 10, "10 steps each way"),
          E("Straight-arm pulldown", 12),
          E("Renegade row", 8, "8 / side", "light DBs"),
          E("Farmer's carry", 40, "40 yd", "moderate load, tall neutral posture"),
        ]),
        G("C", "circuit", 2, [
          E("Dead bug", 10, "10 / side"),
          E("Pallof press", 10, "10 / side"),
        ]),
      ],
    },
  ],
};

// Phase 2: rest drops to 45–50s; three slots become triplets.
const PHASE_2 = clone(PHASE_1);
PHASE_2.days[0].groups[1] = G("B", "circuit", 3, [
  E("Incline DB press", 10),
  E("Lat pulldown", 10, "10 reps", "wide, neutral grip"),
  E("Cable fly", 12),
]);
PHASE_2.days[1].groups[0] = G("A", "circuit", 4, [
  E("Leg press", 10, "10 reps", "controlled range — stop before the pelvis tucks under"),
  E("Leg curl", 10),
  E("Standing hip abduction", 12, "12 reps", "cable or machine"),
]);
PHASE_2.days[2].groups[0] = G("A", "circuit", 4, [
  E("Seated DB shoulder press", 8),
  E("Lateral raise", 12),
  E("Front raise", 12),
]);

// Phase 3: same as Phase 2 except three slots become drop sets.
const PHASE_3 = clone(PHASE_2);
PHASE_3.days[0].groups[2] = DROP("C", "Dumbbell flye", [12, 10, 10]);
PHASE_3.days[1].groups[1] = DROP("B", "Leg extension", [12, 10, 10]);
PHASE_3.days[2].groups[2] = DROP("C", "Seated overhead triceps extension", [12, 10, 10]);

export const PROGRAM = { 1: PHASE_1, 2: PHASE_2, 3: PHASE_3 };

// Week 1 only: Day 1 slot A was done on a barbell. Weeks 2-6 use the
// dumbbell bench press defined in PHASE_1 above.
const WEEK_1 = clone(PHASE_1);
WEEK_1.days[0].groups[0].exercises[0] = E("Bench press", 10, "8–10 reps");

/* ================================ CYCLE 2 ================================ */
// Flat 45 sec rest for all six weeks. Exercise names are identical across
// all three phases for any given slot (verified by tools/check-program.mjs).

const C2_REST = { label: "45 sec", secs: 45 };
export const C2_PHASE_REST = { 1: C2_REST, 2: C2_REST, 3: C2_REST };

const C2_PHASE_1 = {
  days: [
    {
      title: DAY_TITLES[0],
      groups: [
        G("A", "circuit", 4, [
          E("Incline DB press", 10, "8–10 reps"),
          E("One-arm DB row", 10, "8–10 reps", "bench-supported"),
        ]),
        G("B", "circuit", 3, [
          E("Dumbbell bench press", 10),
          E("Lat pulldown (narrow, supinated)", 10),
        ]),
        G("C", "circuit", 3, [
          E("Dumbbell flye", 12),
          E("Straight-arm pulldown", 12),
        ]),
        G("D", "circuit", 2, [
          E("Push-up (wide grip)", null, "max reps"),
          E("Face pull", 15),
        ]),
      ],
    },
    {
      title: DAY_TITLES[1],
      groups: [
        G("A", "circuit", 4, [
          E("Leg press", 10),
          E("Seated leg curl", 10),
        ]),
        G("B", "circuit", 3, [
          E("Single-leg glute bridge", 10, "10 / leg"),
          E("Leg extension", 12),
        ]),
        G("C", "circuit", 3, [
          E("Box step-up", 8, "8 / leg", "weighted"),
          E("Standing calf raise", 15),
        ]),
        G("D", "circuit", 2, [
          E("Side plank", 30, "30 sec / side"),
          E("Dead bug", 10, "10 / side"),
          E("Pallof press", 10, "10 / side"),
        ]),
      ],
    },
    {
      title: DAY_TITLES[2],
      groups: [
        G("A", "circuit", 4, [
          E("Seated Arnold press", 8),
          E("Cable lateral raise", 12),
        ]),
        G("B", "circuit", 3, [
          E("EZ-bar curl", 10),
          E("Overhead cable triceps extension", 10, "10 reps", "rope"),
        ]),
        G("C", "circuit", 3, [
          E("Cable hammer curl", 12),
          E("Single-arm overhead DB triceps extension", 12),
        ]),
        G("D", "circuit", 2, [
          E("Machine rear-delt fly", 15),
          E("Shrug", 15),
        ]),
      ],
    },
    {
      title: DAY_TITLES[3],
      groups: [
        G("A", "circuit", 4, [
          E("Hip thrust", 8, "8 reps", "heavier glute day"),
          E("Chest-supported row", 10),
        ]),
        G("B", "circuit", 3, [
          E("Reverse lunge", 8, "8 / leg", "light DBs"),
          E("Standing hip abduction (cable)", 12),
          E("Renegade row", 8, "8 / side", "light DBs"),
          E("Farmer's carry", 40, "40 yd", "moderate load, tall neutral posture"),
        ]),
        G("C", "circuit", 2, [
          E("Bird dog", 8, "8 / side"),
          E("Suitcase carry", 40, "40 yd / side", "single-arm"),
        ]),
      ],
    },
  ],
};

// Phase 2: three slots become triplets. Day 4 unchanged.
const C2_PHASE_2 = clone(C2_PHASE_1);
C2_PHASE_2.days[0].groups[1] = G("B", "circuit", 3, [
  E("Dumbbell bench press", 10),
  E("Lat pulldown (narrow, supinated)", 10),
  E("Svend press", 15),
]);
C2_PHASE_2.days[1].groups[0] = G("A", "circuit", 4, [
  E("Leg press", 10),
  E("Seated leg curl", 10),
  E("Glute kickback", 12, "12 reps", "cable or machine"),
]);
C2_PHASE_2.days[2].groups[0] = G("A", "circuit", 4, [
  E("Seated Arnold press", 8),
  E("Cable lateral raise", 12),
  E("Front raise", 12),
]);

// Phase 3: same as Phase 2 except three slots become drop sets. Day 4 unchanged.
const C2_PHASE_3 = clone(C2_PHASE_2);
C2_PHASE_3.days[0].groups[2] = DROP("C", "Dumbbell flye", [12, 10, 10]);
C2_PHASE_3.days[1].groups[1] = DROP("B", "Leg extension", [12, 10, 10]);
C2_PHASE_3.days[2].groups[2] = DROP("C", "Single-arm overhead DB triceps extension", [10, 8, 8], "/ arm");

/* ================================ CYCLE 3 ================================ */
// New exercise variations in the same 4-day / 3-phase frame. Four names carry a
// "last time" reference from earlier cycles: Incline DB press, Leg press, Hip
// thrust and Seated leg curl.
// Rest: 60 sec while the new movements are learned (weeks 1-2), then 45 sec.
// SPINE RULE (John, 2026-11-16: three herniated lower-lumbar discs): no hip
// hinges under load, no loaded spinal flexion or rotation, no standing overhead
// pressing, core work is neutral-spine bracing only.

export const C3_PHASE_REST = {
  1: { label: "60 sec", secs: 60 },
  2: { label: "45 sec", secs: 45 },
  3: { label: "45 sec", secs: 45 },
};

const C3_PHASE_1 = {
  days: [
    {
      title: DAY_TITLES[0],
      groups: [
        G("A", "circuit", 4, [
          E("Neutral-grip DB bench press", 10, "8–10 reps", "palms facing each other, elbows about 45° from the ribs"),
          E("Seated cable row (wide grip)", 10, "8–10 reps", "long bar to the lower chest — sit tall, no rocking"),
        ]),
        G("B", "circuit", 3, [
          E("Incline DB press", 10),
          E("Single-arm lat pulldown", 10, "10 / arm", "D-handle on the pulldown or a high cable"),
        ]),
        G("C", "circuit", 3, [
          E("Incline DB flye", 12),
          E("DB pullover", 12, "12 reps", "lie along the bench, slight elbow bend — low back stays flat"),
        ]),
        G("D", "circuit", 2, [
          E("Push-up (feet elevated)", null, "max reps", "feet on a bench, glutes tight — stop when the hips sag"),
          E("Band pull-apart", 15),
        ]),
      ],
    },
    {
      title: DAY_TITLES[1],
      groups: [
        // Heavy leg work stays on the back-supported leg press; the squat is the
        // lighter, higher-rep slot and drops out when Phase 3 fatigue is highest.
        G("A", "circuit", 4, [
          E("Leg press", 10, "10 reps", "controlled range — stop before the pelvis tucks under"),
          E("B-stance hip thrust", 10, "10 / side", "DB on the hips, ribs down — finish with the glutes, not the low back"),
        ]),
        G("B", "circuit", 3, [
          E("Goblet squat (heels elevated)", 12, "12 reps", "heels on a plate, torso tall — stop before the pelvis tucks under"),
          E("Seated leg curl", 12),
        ]),
        G("C", "circuit", 3, [
          E("Bulgarian split squat", 8, "8 / leg", "rear foot on a bench, DBs at your sides, torso tall"),
          E("Single-leg calf raise", 12, "12 / leg", "off a step, DB in one hand"),
        ]),
        G("D", "circuit", 2, [
          E("Copenhagen plank", 20, "20 sec / side", "top knee on a bench (short lever)"),
          E("Bear plank shoulder tap", 10, "10 / side", "knees hover an inch off the floor, hips stay square"),
          E("Half-kneeling Pallof press", 10, "10 / side", "press straight out and hold a beat — no twisting"),
        ]),
      ],
    },
    {
      title: DAY_TITLES[2],
      groups: [
        G("A", "circuit", 4, [
          E("Seated neutral-grip DB press", 8, "8 reps", "back against the pad, palms facing in"),
          E("Lean-away lateral raise", 12, "12 / arm", "hold an upright, lean out, raise the outside arm"),
        ]),
        G("B", "circuit", 3, [
          E("Incline DB curl", 10, "10 reps", "bench about 60°, arms hang straight down"),
          E("EZ-bar skull crusher", 10, "10 reps", "lower to the forehead or just behind it"),
        ]),
        G("C", "circuit", 3, [
          E("Reverse-grip cable curl", 12, "12 reps", "straight or EZ attachment, palms down"),
          E("Bench dip", 12, "12 reps", "shoulders down, stop when the elbows reach 90°"),
        ]),
        G("D", "circuit", 2, [
          E("Chest-supported DB reverse fly", 15, "15 reps", "chest on an incline bench"),
          E("Chest-supported DB shrug", 15, "15 reps", "same bench — squeeze the shoulder blades back and up"),
        ]),
      ],
    },
    {
      title: DAY_TITLES[3],
      groups: [
        G("A", "circuit", 4, [
          E("Hip thrust", 8, "8 reps", "heavier glute day"),
          E("Inverted row", 10, "10 reps", "bar in a rack or Smith at waist height; bend the knees to make it easier"),
        ]),
        G("B", "circuit", 3, [
          E("DB lateral lunge", 8, "8 / leg", "light DB at the chest, sit the hip back, chest tall"),
          E("Frog pump", 20, "20 reps", "soles together, knees out"),
          E("Plank DB drag", 8, "8 / side", "high plank, drag the DB under to the other side, hips stay square"),
          E("Goblet carry", 40, "40 yd", "moderate DB at the chest, ribs down, tall posture"),
        ]),
        G("C", "circuit", 2, [
          E("McGill curl-up", 6, "6 / side", "one knee bent, hands under the low back, lift head and shoulders an inch, hold 8 sec"),
          E("Forearm plank", 30, "30 sec", "glutes tight, ribs down — end the set when the hips sag"),
        ]),
      ],
    },
  ],
};

// Phase 2: three slots become triplets. Day 4 unchanged.
const C3_PHASE_2 = clone(C3_PHASE_1);
C3_PHASE_2.days[0].groups[1].exercises.push(E("Low-to-high cable fly", 12));
C3_PHASE_2.days[1].groups[0].exercises.push(
  E("Side-lying hip abduction", 15, "15 / side", "top leg slightly behind you, toes pointed down"));
C3_PHASE_2.days[2].groups[0].exercises.push(
  E("DB upright row", 12, "12 reps", "elbows lead, stop at shoulder height"));

// Phase 3: same as Phase 2 except three slots become drop sets. Day 4 unchanged.
// Drop sets stay on supported isolation movements only (John has three herniated
// lower-lumbar discs): never drop-set a squat, press or anything loading the spine.
// Day 2 is a hamstring drop set this cycle (was leg extension); Day 3 a curl.
const C3_PHASE_3 = clone(C3_PHASE_2);
C3_PHASE_3.days[0].groups[2] = DROP("C", "Incline DB flye", [12, 10, 10]);
C3_PHASE_3.days[1].groups[1] = DROP("B", "Seated leg curl", [12, 10, 10]);
C3_PHASE_3.days[2].groups[2] = DROP("C", "Reverse-grip cable curl", [12, 10, 10]);

/* ================================ CYCLES ================================ */

export const CYCLES = {
  1: {
    id: 1,
    kicker: "Cycle 1 · 3 phases · 4 days · circuits",
    rest: PHASE_REST,
    phases: PROGRAM,
    weekOverrides: { 1: WEEK_1 },
    phaseNotes: { 2: "three slots become tri-sets", 3: "drop-set finishers" },
  },
  2: {
    id: 2,
    kicker: "Cycle 2 · 3 phases · 4 days · circuits",
    rest: C2_PHASE_REST,
    phases: { 1: C2_PHASE_1, 2: C2_PHASE_2, 3: C2_PHASE_3 },
    weekOverrides: {},
    phaseNotes: { 2: "three slots become tri-sets", 3: "drop-set finishers" },
  },
  3: {
    id: 3,
    kicker: "Cycle 3 · 3 phases · 4 days · circuits",
    rest: C3_PHASE_REST,
    phases: { 1: C3_PHASE_1, 2: C3_PHASE_2, 3: C3_PHASE_3 },
    weekOverrides: {},
    phaseNotes: { 2: "three slots become tri-sets", 3: "drop-set finishers" },
  },
};
export const CYCLE_IDS = Object.keys(CYCLES).map(Number).sort((a, b) => a - b);

// The one lookup the UI should use — resolves cycle, phase AND any week-level override.
export const dayDefFor = (cycle, week, day) => {
  const c = CYCLES[cycle];
  const src = c.weekOverrides[week] || c.phases[phaseForWeek(week)];
  return src.days[day - 1];
};
export const restFor = (cycle, week) => CYCLES[cycle].rest[phaseForWeek(week)];

/* ============================ LOGGED-NAME MIGRATION ============================ */
// Exercise-name corrections applied to ALREADY-LOGGED sessions. Logged sets store
// the exercise name (`n`), so a rename in the program above would otherwise split
// history in two. Each rule: match the old name in the given cycle/day/group (and
// week range), rewrite to the new name. Idempotent; runs on load and on import.
export const RENAMES = [
  // 2026-09-15 morning: Cycle 1 equipment corrections
  { cycle: 1, day: 1, group: "A", from: "Bench press",     to: "Dumbbell bench press",   minWeek: 2 },
  { cycle: 1, day: 1, group: "C", from: "Cable chest fly", to: "Dumbbell flye" },
  { cycle: 1, day: 1, group: "B", from: "Pec deck",        to: "Cable fly",              minWeek: 3 },
  { cycle: 1, day: 3, group: "D", from: "Rear-delt fly",   to: "Machine rear-delt fly" },
  // 2026-09-15 close: merge the Cycle 1 shoulder-press split (P1 "Seated DB shoulder press" vs P2/P3 "Seated DB press")
  { cycle: 1, day: 3, group: "A", from: "Seated DB press", to: "Seated DB shoulder press", minWeek: 3 },
  // Cycle 1 hip abduction was done with BANDS (John, 2026-09-15); Cycle 2 is cable, so it must not inherit
  { cycle: 2, day: 4, group: "B", from: "Standing hip abduction", to: "Standing hip abduction (cable)" },
];

export function migrateDb(db) {
  if (!db || typeof db !== "object" || !db.sessions) return db;
  let changed = 0;
  const sessions = {};
  for (const key of Object.keys(db.sessions)) {
    const m = /^(?:c(\d+))?w(\d+)d(\d+)$/.exec(key);
    const s = db.sessions[key];
    if (!m || !s || !s.entries) { sessions[key] = s; continue; }
    const cycle = m[1] ? +m[1] : 1, week = +m[2], day = +m[3];
    const entries = {};
    for (const ek of Object.keys(s.entries)) {
      const e = s.entries[ek];
      const rule = e && RENAMES.find((r) =>
        (r.cycle || 1) === cycle && r.day === day && r.group === e.g && r.from === e.n && week >= (r.minWeek || 1));
      if (rule) { entries[ek] = { ...e, n: rule.to }; changed++; }
      else entries[ek] = e;
    }
    sessions[key] = { ...s, entries };
  }
  return changed ? { ...db, sessions } : db;
}

export const kindLabel = (g) =>
  g.kind === "dropset"
    ? "Drop set"
    : ({ 2: "Superset", 3: "Tri-set", 4: "Giant set" }[g.exercises.length] || "Circuit");

export const totalSets = (dayDef) =>
  dayDef.groups.reduce((n, g) => n + g.rounds * g.exercises.length, 0);
