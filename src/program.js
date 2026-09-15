// 6-week strength program — 3 two-week phases x 4 training days.
// Data is the single source of truth for the UI; entries are keyed by
// `${group.id}.${exerciseIndex}.${round}` inside each session.

export const DAY_TITLES = [
  "Chest + Back",
  "Legs + Core",
  "Shoulders + Arms",
  "Glutes + Conditioning",
];

export const DAY_SHORT = ["Chest·Back", "Legs·Core", "Shldrs·Arms", "Glutes·Cond"];

export const PHASE_REST = {
  1: { label: "60–75 sec", secs: 75 },
  2: { label: "45–50 sec", secs: 50 },
  3: { label: "45–50 sec", secs: 50 },
};

export const phaseForWeek = (w) => (w <= 2 ? 1 : w <= 4 ? 2 : 3);

// def = default rep count prefilled in the input (null = free entry, e.g. max reps)
const E = (name, def, label, note) =>
  ({ name, def, label: label ?? `${def} reps`, ...(note ? { note } : {}) });

const G = (id, kind, rounds, exercises) => ({ id, kind, rounds, exercises });

const DROP = (id, name, stages) => ({
  id,
  kind: "dropset",
  rounds: 1,
  note: "One continuous set — reduce the weight between drops, no rest.",
  exercises: stages.map((r, i) => ({
    name,
    def: r,
    label: `${r} reps`,
    stage: i + 1,
    ...(i > 0 ? { note: "drop the weight" } : {}),
  })),
});

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

const clone = (o) => JSON.parse(JSON.stringify(o));

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
  E("Seated DB press", 8),
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

// The one lookup the UI should use — resolves phase AND any week-level override.
export const dayDefFor = (week, day) =>
  (week === 1 ? WEEK_1 : PROGRAM[phaseForWeek(week)]).days[day - 1];

// Exercise-name corrections applied to ALREADY-LOGGED sessions (2026-09-15).
// Logged sets store the exercise name (`n`), so a rename in the program above
// would otherwise split history in two. Each rule: match the old name in the
// given day/group (and week range), rewrite to the new name. Idempotent.
export const RENAMES = [
  { day: 1, group: "A", from: "Bench press",     to: "Dumbbell bench press",   minWeek: 2 },
  { day: 1, group: "C", from: "Cable chest fly", to: "Dumbbell flye" },
  { day: 1, group: "B", from: "Pec deck",        to: "Cable fly",              minWeek: 3 },
  { day: 3, group: "D", from: "Rear-delt fly",   to: "Machine rear-delt fly" },
];

export function migrateDb(db) {
  if (!db || typeof db !== "object" || !db.sessions) return db;
  let changed = 0;
  const sessions = {};
  for (const key of Object.keys(db.sessions)) {
    const m = /^w(\d+)d(\d+)$/.exec(key);
    const s = db.sessions[key];
    if (!m || !s || !s.entries) { sessions[key] = s; continue; }
    const week = +m[1], day = +m[2];
    const entries = {};
    for (const ek of Object.keys(s.entries)) {
      const e = s.entries[ek];
      const rule = e && RENAMES.find((r) =>
        r.day === day && r.group === e.g && r.from === e.n && week >= (r.minWeek || 1));
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
