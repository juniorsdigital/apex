# Apex

Your road to race day: a training plan, a countdown and a journal. Plain HTML, CSS and ES modules, with no build step.

- **Plan:** load your training plan as a CSV (one row per day, or per session on days with more than one). The app shows today's sessions, a month calendar coloured by type of day, and every day's details: targets, fueling, strength, Plan B and coach notes. When the plan changes, load the new file; it replaces the old one and journal entries are kept.
- **Today:** a countdown to the goal race, today's sessions (each one numbered, with the break between them), the next few days, this week, and today's journal.
- **Journal:** how the body is (sleep, energy, legs), how each workout felt, headspace for the next race, and notes, with a trend line.
- **Journey:** the whole season drawn as a route (planned hours per week, coloured by phase, flags for races), the phases in order and the key days ahead.

Guests can use Today with everything saved in the browser. Signing in (email magic link via Supabase) syncs the plan and journal across devices and opens the other pages.

## Plan CSV

Needs `Date` (YYYY-MM-DD) and `Workout`. The app also reads, when present: `Week`, `Week_Start`, `Phase`, `Week_Type`, `Day_Type`, `Venue`, `Hrs_Outdoor`, `Hrs_Indoor`, `Intensity`, `Fueling`, `Strength`, `Alt_If_Recovery_Lacking`, `Bad_Weather_Indoor_Plan`, `Coach_Comments` (sections like `WHAT: ... | FOCUS: ...`) and `Notes`.

### More than one session a day

A day can hold several sessions, listed in order, each logged on its own in the journal:

- **Rows that share a date** are that day's sessions, in file order. An optional `Session` column orders them (a number) or names them (`Ride`, `Gym`), and an optional `Time` column (`AM`, `6:00`) is shown next to each.
- **A lift in `Strength`** (text starting `LIFT`, `DELOAD LIFT`, `Strength`, `Gym` or `Weights`) becomes its own session after the ride, e.g. `LIFT A - Lower (about 50 min, AFTER the bike, >=4 h later): squat 3x8; ...`. The parenthesis gives its length and the break before it; `LIFT:` coach notes move to it. Anything else in `Strength` (e.g. `No lifting this week`) stays a note on the ride.
- **A workout written in parts** (`Part 1 ... Part 2 ...`, `Session 1 ... Session 2 ...` or `AM: ... PM: ...`) becomes one session per part. `..., then <break>, Part 2` is shown as the break between them, `Fueling` segments starting `Part 2:` go to that part, and Plan B, bad weather and coach notes are shown once for every part.

Hours are the day's total riding. On those days the journal saves a feel and a note per session in `journal.sessions`, plus the day's average feel in `workout_feel`. Projects set up before this need `supabase/schema.sql` run again (it adds the column); until then the app saves without it.

`Day_Type` sets the colour (rest, easy, endurance, threshold, intervals, test, rehearsal, race, strength); on a day with several sessions the hardest one sets it. The goal race is the `NATIONALS` day, or otherwise the last race.

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

4. In Supabase → Authentication → Emails → Magic Link, add the code to the template (for example `Or enter this code: {{ .Token }}`). The installed phone app keeps its own storage, so on iPhone the link signs in Safari rather than the app; the code signs in the app.

## Install on a phone

Apex is a Progressive Web App (`manifest.webmanifest`, `sw.js`, `icons/`). Open the site, then:

- **iPhone:** Safari → Share → Add to Home Screen.
- **Android:** Chrome → menu → Install app.

It opens full screen, and the app shell loads offline. The service worker fetches app files from the network first, so a deploy shows up on the next launch. Bump `VERSION` in `sw.js` when you add or rename files.

## Run locally

```bash
npx serve apex-athlete -l 8080
```
