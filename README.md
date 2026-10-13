# Habbit

A daily habit tracker. Add habits, tick them off each day, and watch streaks and history build up. Habits can be a simple tick or a daily goal ("8 glasses", "20 pages"), and a day can be skipped, counted as done, or given a note. You can turn any day into a picture to share.

Two small apps live in this repo:

| Folder | What it is | Stack |
| --- | --- | --- |
| [`web/`](web) | The website people use | Next.js 16 (App Router), React 19, TanStack Query, Tailwind CSS v4 |
| [`api/`](api) | The back end | Express, Prisma 7, PostgreSQL, JWT login |

## What it does

- **Today:** a score ring, a seven-day strip, and your habits. Tick a habit, edit any day up to a year back (strip or calendar picker), and share the day as a picture.
- **Habits that fit you:** an icon, one of six colours, days of the week, a daily goal with a unit (with quick presets), and a time of day (Morning, Afternoon, Evening, Anytime). Reorder them, and archive or delete (a delete can be undone).
- **When life happens:** skip a day without breaking the streak, count a short day as done on a goal habit, add a note to any day.
- **Progress:** week, month and year views, a consistency heatmap, a ranking by habit, and a page per habit with a calendar, streak history and notes.
- **You:** a nickname and avatar, a colour theme (six main-and-partner colour pairs), light, dark or system, archived habits you can restore, a data download (JSON or CSV), and account actions.
- **Share picture:** seven layouts (Stats, Checklist, Ring, Week, Heatmap, Streak, Poster), three themes, story and square sizes, an optional photo, an optional name and avatar, and a choice of headline for a perfect day. It is drawn in the browser; a photo never leaves the device.
- **First-time tour:** six short screens for new accounts, with Skip always available and a replay in You.
- **Accessibility:** keyboard and screen-reader friendly dialogs, measured colour contrast, 44px tap targets, reduced motion respected.

## What you need

- Node.js 22 or newer
- A PostgreSQL database (a local one is fine)

## Run it locally

### 1. The API

```bash
cd api
cp .env.example .env        # then edit the values (see below)
npm install
npx prisma migrate deploy --config prisma7.config.ts   # creates the tables
npx prisma generate --config prisma7.config.ts         # builds the database client
npm run dev                                            # http://localhost:5000
```

(On Windows PowerShell, use `copy .env.example .env`.)

`api/.env` needs:

| Variable | Meaning |
| --- | --- |
| `PORT` | Port the API listens on (default 5000) |
| `DATABASE_URL` | Postgres connection string, e.g. `postgresql://user:password@localhost:5432/habbit` |
| `JWT_SECRET` | A long random string that signs login tokens. Make one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `NODE_ENV` | Set to `production` on the host. The API then refuses to start with a weak secret or missing settings |
| `CORS_ORIGIN` | Production only: the website's address (commas for several). Locally `http://localhost:3000` is allowed already |
| `TRUST_PROXY` | How many proxies sit in front of the API: `0` locally, `1` on Railway. It decides whose address the rate limiter sees |

> The Prisma config file is named `prisma7.config.ts`, so every Prisma command needs `--config prisma7.config.ts`.

### 2. The website

```bash
cd web
cp .env.example .env
npm install
npm run dev                                            # http://localhost:3000
```

`web/.env` needs `NEXT_PUBLIC_API_URL`, the address of the API (default `http://localhost:5000`). It is read when the site is **built**, so set it before `npm run build`.

Open http://localhost:3000, create an account, and take the tour.

## Everyday commands

| In `api/` | |
| --- | --- |
| `npm run dev` | Start with auto-reload |
| `npm test` | Run the unit tests (fast, no database) |
| `npm run test:api` | Run the API tests against a real test database (see below) |
| `npm run typecheck` | Type-check the app and its tests |
| `npx prisma migrate deploy --config prisma7.config.ts` | Apply new database migrations |

| In `web/` | |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run lint` | Lint |
| `npm test` | Run the tests |
| `npx tsc --noEmit` | Type-check |
| `npm run build` | Production build |

Tests use Node's built-in test runner. The web tests borrow the `tsx` that is installed in `api/`, so run `npm install` in `api/` first.

### The API tests

`npm run test:api` starts a real copy of the API and drives it over HTTP, against a real database: sign-up and sign-in, the profile, every habit feature and rule (goals, skips, notes, ordering, the start-day limit), the data export, security headers, CORS, the production start-up checks and the real rate limits. Each test file creates throwaway accounts (`@example.invalid`) and deletes them afterwards.

They need a database of their own, so they can never touch real data:

1. Create an empty database, for example `createdb -U postgres habbit_test`.
2. Put its address in `api/.env` as `TEST_DATABASE_URL` (the same connection as `DATABASE_URL`, with only the database name changed).
3. Build its tables once, and again after any new migration: `DATABASE_URL=<that address> npx prisma migrate deploy --config prisma7.config.ts`.

The suite refuses to run if `TEST_DATABASE_URL` is missing, or if it points at the same database as `DATABASE_URL`. In CI a throwaway Postgres is started for the run.

## How it works

A few rules explain most of the behaviour:

- **A day is done when a check-in exists.** Streaks, the heatmap, stats and insights all read that one fact, so they always agree.
- **Streaks count scheduled days only.** A rest day, a skipped day, or today not being done yet does not break a streak. A habit only counts from the day it was created.
- **Goals.** A habit has a `target` (1 is a plain tick) and an optional `unit`. A day is done when its amount reaches the target. Each day's progress row remembers the target it was reached under, so raising a goal later never un-does a finished day. **Count as done** finishes a day with some progress by making what was done that day's goal; the habit's own goal is untouched. Lowering a goal applies from today and finishes today if it already has enough; past days are never re-judged.
- **Dates are the user's own calendar days.** The website sends them and the API never guesses. A check-in can be edited up to 365 days back and no more than a day ahead of UTC.
- **Skips** are per habit per day, only on scheduled days that are not done. Ticking a skipped day replaces the skip.
- **Notes** live apart from check-ins, so un-ticking a day never loses one, and a missed day can have one. Up to 280 characters, plain text.
- **Profile and theme.** The nickname, avatar colour and icon, colour theme and "tour seen" flag are stored on the account, so they follow the user between devices. The theme is applied with a `data-accent` attribute that swaps CSS tokens.

### Data model

| Table | Holds |
| --- | --- |
| `User` | Email, password hash, nickname, avatar, colour theme, tour-seen time |
| `Habit` | Name, colour, icon key, schedule (a day bitmask), goal and unit, time of day, sort order, archived time |
| `HabitLog` | One row per finished day (the check-in) |
| `HabitProgress` | The amount logged on a day for goal habits, with the target it was judged by |
| `HabitSkip` | A skipped day |
| `HabitNote` | A note on a day |

Deleting a habit or an account removes everything beneath it.

## API at a glance

Every `/api/habits` route needs an `Authorization: Bearer <token>` header (the token comes from login or register). Request bodies and queries are validated with zod, and every query is scoped to the signed-in user.

**Accounts**

| Route | Does |
| --- | --- |
| `POST /api/auth/register` | Create an account, returns a token |
| `POST /api/auth/login` | Log in, returns a token (valid 7 days) |
| `GET /api/auth/me` | The signed-in user's profile |
| `PATCH /api/auth/me` | Change nickname, avatar icon and colour, colour theme, or mark the tour as seen |
| `PATCH /api/auth/password` | Change password |
| `DELETE /api/auth/me` | Delete the account and all its data |

**Habits**

| Route | Does |
| --- | --- |
| `GET /api/habits?date=&archived=` | List habits with that day's state: done, skipped, amount and goal, note |
| `POST /api/habits` | Create (name, colour, icon key, schedule, goal and unit, time of day). New habits go last |
| `PATCH /api/habits/:id` | Rename, restyle, reschedule, change the goal, archive or restore. Send `today` when lowering a goal |
| `DELETE /api/habits/:id` | Delete permanently |
| `PUT /api/habits/order` | Save a new order for habits (ids first to last), plus any time-of-day changes, in one transaction |
| `POST /api/habits/:id/toggle` | Mark done or undone for a date |
| `POST /api/habits/:id/progress` | Set the amount for a goal habit on a date; reaching the target finishes the day |
| `POST /api/habits/:id/count-as-done` | Finish a goal habit's day at the amount done |
| `POST /api/habits/:id/skip` | Skip or un-skip a scheduled day |
| `PUT /api/habits/:id/note` | Set a day's note (empty text removes it) |
| `GET /api/habits/:id/notes` | A habit's notes, newest first |
| `GET /api/habits/stats?days=&today=` | Completions per habit over the last `days` days |
| `GET /api/habits/history?from=&to=&archived=` | Finished and skipped dates per habit (up to 366 days) |
| `GET /api/habits/insights?days=&today=` | Strongest and weakest weekday, 30-day trend, strongest and weakest habit |
| `GET /api/habits/export?format=json\|csv` | Download everything. JSON is the full backup (profile, habits, check-ins, skips, amounts, notes); CSV is one row per finished day |

Colours: `volt` `aqua` `sky` `violet` `rose` `sand`. Icon keys: `run` `water` `read` `meditate` `strength` `food` `sleep` `journal` `music` `tidy` `teeth` `meds` `stretch` `focus` `create` `grow` `coffee` `morning`.

**Health:** `GET /api/health` and `GET /api/health/db`.

## Privacy and security notes

- **Notes and nicknames are plain text in the database**, not encrypted, and are included in the data export. The website always shows them as text, never as HTML.
- **A nickname** is trimmed, limited to 30 characters, and refuses line breaks and invisible control characters. Only the nickname is ever drawn on a share picture, never the email, and only when the user turns it on.
- **Share photos** are processed in the browser and never uploaded.
- **Passwords** are hashed with bcrypt. Login takes about the same time whether or not the email exists.
- **Login tokens** last 7 days and are kept in the browser's storage. There is no refresh and no server-side sign-out, so changing a password does not end other sessions.
- **Rate limiting** protects sign-in, sign-up, password change, account deletion and the API as a whole (in memory, which suits a single server). A refused request gets a `429` with a "try again in" message.
- **CORS** is limited to the website's address, and in production the API refuses to start with a weak `JWT_SECRET` or a missing `CORS_ORIGIN`.
- **Security headers** are set on the API and on the website, including a content security policy in production.
- **The data export** neutralises spreadsheet formulas in the CSV.

## How the project is organised

```
api/src
  routes/        HTTP endpoints
  schemas/       input validation (zod)
  lib/           pure logic (dates, progress rules, order rules, insights, export) and helpers
  middleware/    login check, error handling
api/prisma       schema and migrations
web/src
  app/           pages and global styles. Pages behind the login live in the (app) group
                 and share the bottom navigation: / (Today), /progress, /habits/[id], /settings ("You").
                 /login and /register sit outside it
  components/    UI pieces (cards, sheets, the tour, the editor, the share sheet)
  lib/           data hooks (TanStack Query) and pure logic: dates, streaks, stats, goals,
                 notes, themes, greeting, the share picture
```

Conventions worth knowing:

- Data fetching and changes go through TanStack Query hooks in `web/src/lib/habits.ts`.
- The look is a "tracker" direction: Archivo type, volt green and ultraviolet. Design tokens are in `web/src/app/globals.css`; colour themes swap the main and partner tokens.
- Every icon is from Lucide (`lucide-react`): interface icons in `web/src/components/icons.tsx`, the 18 habit icons in `web/src/components/habitIcons.tsx`. A habit stores an icon *key*.
- Habits saved before the redesign may still have an emoji icon or the old colour names (`yellow`, `coral`, `mint`, `pink`). `web/src/lib/legacy.ts` translates them when they are read, so they display correctly without touching the data.
- Rules live in plain functions with tests, not inside components or routes: streaks, goals and "count as done", reordering, the share layouts' spacing, the tour's length. The goal rule exists twice on purpose (`api/src/lib/progress.ts` and `web/src/lib/counts.ts`) so the screen can predict the result before the server answers; change them together.
- `web/AGENTS.md` warns that this Next.js version has breaking changes: read the guides in `web/node_modules/next/dist/docs/` before changing framework-level code.
- Database changes are additive migrations in `api/prisma/migrations`, applied with `prisma migrate deploy`.

## Deploying

Planned set-up: the website on Vercel, the API on Railway, and a Postgres database. In short:

1. **API (Railway):** build with `npm run build` (it makes the database client first) and start with `npm start`. Set `NODE_ENV=production`, `DATABASE_URL`, a fresh `JWT_SECRET`, `CORS_ORIGIN` (your Vercel address) and `TRUST_PROXY=1`. Run `npx prisma migrate deploy --config prisma7.config.ts` as a release step.
2. **Website (Vercel):** set `NEXT_PUBLIC_API_URL` to the API's public address **before** building, since it is frozen into the build.
3. **Serve everything over HTTPS** (both hosts do).
4. Rate limiting is in memory, so run **one copy** of the API. For several copies, add a Redis store (see `api/src/lib/rateLimit.ts`).

Still open: renewing login tokens and signing out other sessions on a password change (see the notes above).

The CI workflow in `.github/workflows/ci.yml` runs the type checks, lint, the unit tests, the API tests (against a throwaway Postgres it starts) and a production build on every push.
