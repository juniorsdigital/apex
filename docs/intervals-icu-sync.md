# Automatic ride import from intervals.icu

Status: proposal, not built yet.

## Goal

A finished ride shows up in Apex without being typed in, with real power data
(normalized power, TSS) instead of hand-entered averages. Planned rides that get
ridden are completed rather than duplicated.

## Why intervals.icu

- It already collects rides from Garmin, Wahoo, Hammerhead, Zwift and others,
  and computes NP, training load, intensity and power curves.
- Its API is free and personal-use friendly: one API key, Basic auth.
- It can also push workouts *out* to Garmin and Zwift, which lets Apex plans
  reach the head unit later (see "Later" below).

**Caveat:** intervals.icu does not hand out activities that came in through
**Strava** over its API (Strava's API terms forbid it). Connect your device
(Garmin Connect, Wahoo, etc.) to intervals.icu directly. If rides only arrive via
Strava, the API returns them as stubs with no data.

## Recommended design

```
Garmin / Wahoo ──► intervals.icu ──► Supabase Edge Function "intervals-sync" ──► rides table
                                         ▲                ▲
                         pg_cron, every 30 min      "Sync now" button in Apex
```

Run the sync **server-side in a Supabase Edge Function**, not in the browser:

| | Browser fetch | Edge Function |
|---|---|---|
| API key exposure | Key sits in page JS or localStorage | Key stays a server secret |
| Runs when Apex is closed | No | Yes (pg_cron) |
| CORS | Not guaranteed | Not an issue |

### 1. Schema additions

```sql
alter table public.rides
  add column if not exists source       text not null default 'manual',  -- 'manual' | 'intervals'
  add column if not exists external_id  text,                            -- intervals.icu activity id, e.g. 'i123456789'
  add column if not exists np_w         integer,
  add column if not exists tss          integer,
  add column if not exists max_hr       integer;

create unique index if not exists rides_user_external_idx
  on public.rides (user_id, external_id) where external_id is not null;

create table if not exists public.integrations (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  athlete_id   text not null,          -- 'i12345', from intervals.icu settings
  last_synced  timestamptz
);
```

The API key goes in an Edge Function secret (`supabase secrets set INTERVALS_API_KEY=...`)
for a single-user app. For multiple riders, store each key encrypted with Supabase Vault instead.

### 2. The sync function

1. `GET https://intervals.icu/api/v1/athlete/{athlete_id}/activities?oldest={last_synced - 2 days}&newest={today}`
   with header `Authorization: Basic base64("API_KEY:" + key)`.
2. Keep cycling types only (`Ride`, `VirtualRide`, `GravelRide`, `MountainBikeRide`).
3. Map each activity to a ride:

   | Apex field | intervals.icu field |
   |---|---|
   | `ride_date` | `start_date_local` (date part) |
   | `title` | `name` |
   | `duration_min` | `moving_time / 60` |
   | `distance_km` | `distance / 1000` |
   | `elevation_m` | `total_elevation_gain` |
   | `avg_power_w` | `icu_average_watts` |
   | `np_w` | `icu_weighted_avg_watts` |
   | `tss` | `icu_training_load` |
   | `avg_hr` / `max_hr` | `average_heartrate` / `max_heartrate` |
   | `rpe` | `icu_rpe` (if you rate rides in intervals.icu or on Garmin) |
   | `notes` | `description` |
   | `ride_type` | guessed from intensity factor (NP ÷ FTP): under 0.65 recovery, under 0.80 endurance (long if over 3 h), under 0.88 tempo, under 0.95 sweet spot, under 1.05 threshold, otherwise VO2 max. Editable afterwards. |

4. **Match planned rides first.** If a `planned` ride exists on the same date with no
   `external_id`, update it to `completed` with the imported numbers and keep its title.
   Otherwise upsert on `(user_id, external_id)`, so a re-run never duplicates.
5. Set `last_synced = now()`.

Also worth pulling from `GET /athlete/{id}/wellness`: resting HR, HRV and sleep. These can
fill the Today check-in automatically and make the coach prompt much sharper.

### 3. Triggers

- **Scheduled:** `pg_cron` + `pg_net` calls the function every 30 minutes.
- **On demand:** a "Sync now" button on the Rides page calls
  `supabase.functions.invoke('intervals-sync')`, then `reload()`.
- intervals.icu webhooks exist for registered OAuth apps. Polling is simpler for a personal log
  and 30 minutes is quick enough.

### 4. App changes

- Profile: an "intervals.icu" section with athlete ID, a connection test and the last sync time.
- Ride card: a small "from intervals.icu" marker, with NP and TSS shown when present.
- Metrics: prefer real `tss` over the estimated one. Load (RPE × min) stays as-is because
  it needs RPE. Fall back to `tss` for imported rides with no RPE.
- Coach prompt: include NP, TSS and the wellness numbers.

## Later

- **Push plans to the head unit:** `POST /athlete/{id}/events` with `category: "WORKOUT"`
  puts a planned Apex ride on the intervals.icu calendar, which syncs to Garmin and Zwift.
- **Coach in the app:** an Edge Function that sends the coach prompt to the Claude API and saves
  the reply against the highlighted days, so advice lives next to the rides it is about.
  The copy-and-paste flow on the calendar is the no-cost version of this today.
