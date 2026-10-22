# Apex

A personal cycling training log. Plain HTML, CSS and ES modules, with no build step.

- **Today** (no sign-in needed): log or plan rides, rate how you feel, and see this week at a glance. Guest data is saved in the browser.
- **Signed in** (email magic link via Supabase): rides sync to your account, and you also get the **Calendar**, **Rides** log (with filters and CSV export), **Progress** charts (weekly volume, load, ACWR, ride mix, goal countdown) and **Profile** (FTP, weight, max HR, goal event).
- **Ask the coach** (Calendar): highlight days, pick what you want looked at, and copy a ready-made prompt for Claude, ChatGPT or any AI coach. It includes your profile, the rides, check-ins and the four weeks before. Nothing is sent from the app.
- Rides logged as a guest can be imported into your account after you sign in.

## Layout

```
apex-athlete/          the app (deployed to Vercel as `apexathlete`)
  index.html
  app.js               state, routing, auth wiring
  config.js            Supabase URL + publishable key
  styles.css
  lib/                 supabase client, data store (guest/cloud), metrics, coach prompt, utils
  components/          one file per view, plus the ride form modal
supabase/schema.sql    tables + row level security
docs/                  design notes (intervals.icu auto-import plan)
```

## Setup

1. Create (or restore) a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Put the project URL and publishable key in `apex-athlete/config.js`.
3. In Supabase → Authentication → URL Configuration, add your site URL (e.g. `https://apexathlete.vercel.app`) and `http://localhost:8080` as redirect URLs.

## Run locally

```bash
npx serve apex-athlete -l 8080
```

## Metrics

- **Load**: session RPE × minutes (Foster sRPE), counted for completed rides only.
- **ACWR**: last 7 days' load ÷ (last 28 days' load ÷ 4). 0.8–1.3 is the usual sweet spot.
- **Est. TSS**: hours × (avg power ÷ FTP)² × 100. This uses average power rather than normalized power, so it reads low on variable rides.
