# Apex

Your road to race day: a training plan, a countdown and a journal. Plain HTML, CSS and ES modules, with no build step.

- **Plan:** load your training plan as a CSV (one row per day). The app shows today's session, a month calendar coloured by type of day, and every day's details: targets, fueling, strength, Plan B and coach notes. When the plan changes, load the new file; it replaces the old one and journal entries are kept.
- **Today:** a countdown to the goal race, today's session, the next few days, this week, and today's journal.
- **Journal:** how the body is (sleep, energy, legs), how the workout felt, headspace for the next race, and notes, with a trend line.
- **Journey:** the whole season drawn as a route (planned hours per week, coloured by phase, flags for races), the phases in order and the key days ahead.

Guests can use Today with everything saved in the browser. Signing in (email magic link via Supabase) syncs the plan and journal across devices and opens the other pages.

## Plan CSV

Needs `Date` (YYYY-MM-DD) and `Workout`. The app also reads, when present: `Week`, `Week_Start`, `Phase`, `Week_Type`, `Day_Type`, `Venue`, `Hrs_Outdoor`, `Hrs_Indoor`, `Intensity`, `Fueling`, `Strength`, `Alt_If_Recovery_Lacking`, `Bad_Weather_Indoor_Plan`, `Coach_Comments` (sections like `WHAT: ... | FOCUS: ...`) and `Notes`.

`Day_Type` sets the colour (rest, easy, endurance, threshold, intervals, test, rehearsal, race). The goal race is the `NATIONALS` day, or otherwise the last race.

## Layout

```
apex-athlete/          the app (deployed to Vercel as `apexathlete`)
  index.html
  app.js               state, routing, auth wiring
  config.js            Supabase URL + publishable key
  styles.css
  lib/                 supabase client, data store (guest/cloud), plan parser, utils
  components/          one file per view, plus shared session, journal form and season route
supabase/schema.sql    tables + row level security
docs/                  design notes
```

## Setup

1. Create (or restore) a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Put the project URL and publishable key in `apex-athlete/config.js`.
3. In Supabase → Authentication → URL Configuration, add your site URL (e.g. `https://apexathlete.vercel.app`) and `http://localhost:8080` as redirect URLs.

## Run locally

```bash
npx serve apex-athlete -l 8080
```
