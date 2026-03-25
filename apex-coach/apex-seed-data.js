// ─── Local Dev Seed Data ─────────────────────────────────────────────────────
// All dates are relative to TODAY so charts always show current data.

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function daysFromNow(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

// ── Athletes ──────────────────────────────────────────────────────────────────
export const SEED_ATHLETES = [
  {
    id: 'athlete-001',
    full_name: 'Marcus Webb',
    email: 'marcus@apex.dev',
    avatar_initials: 'MW',
    sport: 'Triathlon',
    goal: 'Ironman 70.3 – Sept 2026',
    status: 'active',
    coach_id: 'coach-dev-001'
  },
  {
    id: 'athlete-002',
    full_name: 'Sofia Reyes',
    email: 'sofia@apex.dev',
    avatar_initials: 'SR',
    sport: 'Road Cycling',
    goal: 'Gran Fondo – Aug 2026',
    status: 'active',
    coach_id: 'coach-dev-001'
  }
]

// ── Workout Templates (Workout Bank) ─────────────────────────────────────────
export const SEED_TEMPLATES = [
  {
    id: 'tmpl-001',
    coach_id: 'coach-dev-001',
    name: 'Zone 2 Base Ride',
    sport: 'Bike',
    cycle_type: 'Endurance',
    description: 'Steady aerobic base ride at conversational pace. Keep HR in zone 2 throughout.',
    duration_minutes: 90,
    intensity_target: 'Zone 2 HR (60–70% HRmax)',
    rpe: 4,
    structure: [
      { label: 'Warm-up', duration_min: 10, target: 'Easy spin, Z1' },
      { label: 'Main Set', duration_min: 70, target: 'Zone 2 HR, steady cadence 85–95 rpm' },
      { label: 'Cool-down', duration_min: 10, target: 'Easy spin, flush legs' }
    ],
    tags: ['base', 'aerobic', 'bike']
  },
  {
    id: 'tmpl-002',
    coach_id: 'coach-dev-001',
    name: '5×5 FTP Intervals',
    sport: 'Bike',
    cycle_type: 'Power',
    description: 'Classic FTP block set. Build lactate threshold and sustainable power output.',
    duration_minutes: 75,
    intensity_target: '95–105% FTP',
    rpe: 8,
    structure: [
      { label: 'Warm-up', duration_min: 15, target: 'Build from Z1 → Z3' },
      { label: 'Interval ×5', duration_min: 5, target: '95–105% FTP, 5 min ON / 3 min OFF' },
      { label: 'Recovery spin', duration_min: 3, target: 'Z1, fully recover' },
      { label: 'Cool-down', duration_min: 10, target: 'Easy spin' }
    ],
    tags: ['threshold', 'power', 'ftp', 'bike']
  },
  {
    id: 'tmpl-003',
    coach_id: 'coach-dev-001',
    name: 'Long Run – Aerobic',
    sport: 'Run',
    cycle_type: 'Endurance',
    description: 'Easy long run to build aerobic base. Conversational pace, stay aerobic.',
    duration_minutes: 75,
    intensity_target: 'Zone 2 HR (60–70% HRmax)',
    rpe: 4,
    structure: [
      { label: 'Easy Run', duration_min: 75, target: 'Conversational pace, Z2 HR' }
    ],
    tags: ['run', 'base', 'long run']
  },
  {
    id: 'tmpl-004',
    coach_id: 'coach-dev-001',
    name: 'Strength – Race Prep',
    sport: 'Strength',
    cycle_type: 'Strength',
    description: 'Functional strength block targeting glutes, core, and hip stability for endurance.',
    duration_minutes: 50,
    intensity_target: '70–80% 1RM, controlled eccentric',
    rpe: 6,
    structure: [
      { label: 'Activation', duration_min: 10, target: 'Banded clams, hip bridges, single-leg balance' },
      { label: 'Main Lifts', duration_min: 30, target: 'Single-leg squat 3×8, Romanian DL 3×10, Step-up 3×10' },
      { label: 'Core', duration_min: 10, target: 'Plank 3×45s, Dead bug 3×10, Copenhagen plank 3×20s' }
    ],
    tags: ['strength', 'functional', 'injury prevention']
  },
  {
    id: 'tmpl-005',
    coach_id: 'coach-dev-001',
    name: 'Race Simulation Brick',
    sport: 'Triathlon',
    cycle_type: 'Racing',
    description: 'Bike-to-run brick at race intensity. Simulate T2 and first miles off the bike.',
    duration_minutes: 80,
    intensity_target: 'Race pace (Z3–Z4)',
    rpe: 8,
    structure: [
      { label: 'Bike', duration_min: 60, target: 'Race pace, Z3–Z4, aero position' },
      { label: 'Transition', duration_min: 2, target: 'Quick T2 simulation' },
      { label: 'Run', duration_min: 18, target: 'Race pace off bike, manage HR drift' }
    ],
    tags: ['triathlon', 'brick', 'race sim', 'racing']
  },
  {
    id: 'tmpl-006',
    coach_id: 'coach-dev-001',
    name: 'Open Water Swim – Technique',
    sport: 'Swim',
    cycle_type: 'Endurance',
    description: 'Technique-focused swim set. Drills, sighting practice, and steady aerobic volume.',
    duration_minutes: 45,
    intensity_target: 'Zone 2, focus on form',
    rpe: 4,
    structure: [
      { label: 'Drills', duration_min: 15, target: 'Catch-up drill, fingertip drag, 6-kick' },
      { label: 'Main Set', duration_min: 25, target: '5×200m at Z2 with 30s rest, sight every 10 strokes' },
      { label: 'Cool-down', duration_min: 5, target: 'Easy backstroke, breathwork' }
    ],
    tags: ['swim', 'technique', 'aerobic']
  }
]

// ── Completed Sessions (last 28 days for ACWR) ───────────────────────────────
export const SEED_SESSIONS = [
  // Week -4
  { id: 's-01', athlete_id: 'athlete-001', title: 'Zone 2 Base Ride', sport: 'Bike', workout_date: daysAgo(27), duration_minutes: 90, rpe: 4, status: 'completed', type: 'support', cycle_type: 'Endurance', avg_hr: 138, distance_km: 42 },
  { id: 's-02', athlete_id: 'athlete-001', title: 'Long Run – Aerobic', sport: 'Run', workout_date: daysAgo(25), duration_minutes: 65, rpe: 4, status: 'completed', type: 'support', cycle_type: 'Endurance', avg_hr: 142, distance_km: 10.5 },
  { id: 's-03', athlete_id: 'athlete-001', title: 'Strength – Functional', sport: 'Strength', workout_date: daysAgo(24), duration_minutes: 45, rpe: 5, status: 'completed', type: 'support', cycle_type: 'Strength', avg_hr: 120, distance_km: null },
  { id: 's-04', athlete_id: 'athlete-001', title: 'Open Water Swim', sport: 'Swim', workout_date: daysAgo(22), duration_minutes: 45, rpe: 4, status: 'completed', type: 'key', cycle_type: 'Endurance', avg_hr: 130, distance_km: 1.8 },

  // Week -3
  { id: 's-05', athlete_id: 'athlete-001', title: 'Zone 2 Base Ride', sport: 'Bike', workout_date: daysAgo(20), duration_minutes: 95, rpe: 4, status: 'completed', type: 'support', cycle_type: 'Endurance', avg_hr: 136, distance_km: 44 },
  { id: 's-06', athlete_id: 'athlete-001', title: '5×5 FTP Intervals', sport: 'Bike', workout_date: daysAgo(18), duration_minutes: 75, rpe: 8, status: 'completed', type: 'key', cycle_type: 'Power', avg_hr: 165, distance_km: 35 },
  { id: 's-07', athlete_id: 'athlete-001', title: 'Recovery Run', sport: 'Run', workout_date: daysAgo(17), duration_minutes: 35, rpe: 3, status: 'completed', type: 'support', cycle_type: 'Endurance', avg_hr: 128, distance_km: 5.5 },
  { id: 's-08', athlete_id: 'athlete-001', title: 'Strength Block', sport: 'Strength', workout_date: daysAgo(16), duration_minutes: 50, rpe: 6, status: 'completed', type: 'support', cycle_type: 'Strength', avg_hr: 122, distance_km: null },
  { id: 's-09', athlete_id: 'athlete-001', title: 'Long Run – Progression', sport: 'Run', workout_date: daysAgo(14), duration_minutes: 75, rpe: 5, status: 'completed', type: 'key', cycle_type: 'Endurance', avg_hr: 148, distance_km: 12 },

  // Week -2
  { id: 's-10', athlete_id: 'athlete-001', title: 'Zone 2 Base Ride', sport: 'Bike', workout_date: daysAgo(13), duration_minutes: 100, rpe: 4, status: 'completed', type: 'support', cycle_type: 'Endurance', avg_hr: 137, distance_km: 48 },
  { id: 's-11', athlete_id: 'athlete-001', title: 'Open Water Swim', sport: 'Swim', workout_date: daysAgo(11), duration_minutes: 45, rpe: 4, status: 'completed', type: 'support', cycle_type: 'Endurance', avg_hr: 132, distance_km: 1.9 },
  { id: 's-12', athlete_id: 'athlete-001', title: '5×5 FTP Intervals', sport: 'Bike', workout_date: daysAgo(10), duration_minutes: 75, rpe: 8, status: 'completed', type: 'key', cycle_type: 'Power', avg_hr: 168, distance_km: 36 },
  { id: 's-13', athlete_id: 'athlete-001', title: 'Strength – Race Prep', sport: 'Strength', workout_date: daysAgo(9), duration_minutes: 50, rpe: 6, status: 'completed', type: 'support', cycle_type: 'Strength', avg_hr: 124, distance_km: null },
  { id: 's-14', athlete_id: 'athlete-001', title: 'Long Run – Aerobic', sport: 'Run', workout_date: daysAgo(7), duration_minutes: 80, rpe: 5, status: 'completed', type: 'key', cycle_type: 'Endurance', avg_hr: 145, distance_km: 13 },

  // This week (Mon–today)
  { id: 's-15', athlete_id: 'athlete-001', title: 'Zone 2 Base Ride', sport: 'Bike', workout_date: daysAgo(6), duration_minutes: 90, rpe: 4, status: 'completed', type: 'support', cycle_type: 'Endurance', avg_hr: 139, distance_km: 43 },
  { id: 's-16', athlete_id: 'athlete-001', title: 'Open Water Swim – Technique', sport: 'Swim', workout_date: daysAgo(4), duration_minutes: 45, rpe: 4, status: 'completed', type: 'support', cycle_type: 'Endurance', avg_hr: 131, distance_km: 1.8 },
  { id: 's-17', athlete_id: 'athlete-001', title: '5×5 FTP Intervals', sport: 'Bike', workout_date: daysAgo(2), duration_minutes: 75, rpe: 8, status: 'completed', type: 'key', cycle_type: 'Power', avg_hr: 167, distance_km: 35 },
  { id: 's-18', athlete_id: 'athlete-001', title: 'Strength – Race Prep', sport: 'Strength', workout_date: daysAgo(1), duration_minutes: 50, rpe: 6, status: 'completed', type: 'support', cycle_type: 'Strength', avg_hr: 123, distance_km: null },

  // Upcoming (assigned, not completed)
  { id: 's-19', athlete_id: 'athlete-001', title: 'Race Simulation Brick', sport: 'Triathlon', workout_date: daysFromNow(1), duration_minutes: 80, rpe: 8, status: 'assigned', type: 'key', cycle_type: 'Racing', avg_hr: null, distance_km: null },
  { id: 's-20', athlete_id: 'athlete-001', title: 'Recovery Run', sport: 'Run', workout_date: daysFromNow(2), duration_minutes: 30, rpe: 3, status: 'assigned', type: 'support', cycle_type: 'Endurance', avg_hr: null, distance_km: null },
  { id: 's-21', athlete_id: 'athlete-001', title: 'Zone 2 Base Ride', sport: 'Bike', workout_date: daysFromNow(4), duration_minutes: 90, rpe: 4, status: 'assigned', type: 'support', cycle_type: 'Endurance', avg_hr: null, distance_km: null },
  { id: 's-22', athlete_id: 'athlete-001', title: 'Long Run – Progression', sport: 'Run', workout_date: daysFromNow(5), duration_minutes: 75, rpe: 5, status: 'assigned', type: 'key', cycle_type: 'Endurance', avg_hr: null, distance_km: null }
]

// ── Training Programs ─────────────────────────────────────────────────────────
export const SEED_PROGRAMS = [
  {
    id: 'prog-001',
    coach_id: 'coach-dev-001',
    athlete_id: 'athlete-001',
    name: 'Ironman 70.3 – 12-Week Build',
    start_date: daysAgo(28),
    end_date: daysFromNow(56),
    notes: 'Progressive build from aerobic base through race-specific intensity. Peak at week 10, 2-week taper.',
    weeks: [
      { week: 1, cycle_type: 'Endurance', focus: 'Aerobic base, high volume, low intensity. Build aerobic engine.' },
      { week: 2, cycle_type: 'Endurance', focus: 'Continue base. Introduce longer swim sets.' },
      { week: 3, cycle_type: 'Endurance', focus: 'Volume peak for base block. Easy recovery day mid-week.' },
      { week: 4, cycle_type: 'Strength', focus: 'Reduce run/bike volume. Strength work 3× to build structural integrity.' },
      { week: 5, cycle_type: 'Power', focus: 'Introduce FTP intervals on bike. Short tempo runs.' },
      { week: 6, cycle_type: 'Power', focus: 'Power block progression. Add hill reps on run.' },
      { week: 7, cycle_type: 'Power', focus: 'Power peak week. Highest intensity block.' },
      { week: 8, cycle_type: 'Endurance', focus: 'Recover from power block. Return to Z2 volume.' },
      { week: 9, cycle_type: 'Racing', focus: 'Race specificity. Brick sessions, open water swim, race pace runs.' },
      { week: 10, cycle_type: 'Racing', focus: 'Peak training week. Full race sim brick.' },
      { week: 11, cycle_type: 'Endurance', focus: 'Taper begins. Reduce volume 40%, maintain intensity.' },
      { week: 12, cycle_type: 'Racing', focus: 'Race week. Activation only, stay fresh.' }
    ]
  }
]
