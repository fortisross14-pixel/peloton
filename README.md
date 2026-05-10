# Peloton — The Season Almanac

A complete cycling season simulator. Twelve teams. One hundred and twenty riders.
Twenty races a year. Grand Tours, classics, and the long campaign for the world ranking.

Built with Vite + React + TypeScript + Tailwind + Zustand. Single-page, runs in the
browser, persists to `localStorage`.

## Quick start

```bash
npm install
npm run dev
```

Then open `http://localhost:5173`.

To produce a static build:

```bash
npm run build
npm run preview
```

The build is fully static — no backend, no API. `dist/` can be hosted anywhere.

## How to play

1. **New Universe** on the home screen. A seed is generated, 12 teams and 120 riders
   are created, and the calendar is laid out (March → October).
2. The **Calendar** screen shows the season. Click **Sign On** to start the next race.
3. In the **Race** screen, click **Simulate Next Step** repeatedly:
   - A classic resolves in one click.
   - A week-long stage race takes 2 clicks (about 4 stages each).
   - A Grand Tour takes 7 clicks (3 stages each).
   - Each step shows the top 3 of every stage in that step, plus the GC top 10
     and team top 3 after the step.
4. When the race finishes you see the final GC top 10 and the jersey winners
   (yellow / green / polka / youth / team). Click **Continue Season**.
5. Once all 20 races are done, click **Advance to {year+1}**. The off-season
   handles retirements, transfers, and rookie generation, then the next year begins.

Click any rider or team name anywhere to drill into their detail page (career
history, year-by-year results, jersey case, all-time totals).

The **Almanac** tab is the historical archive: all-time leaderboards (active +
retired) and Hall of Fame champions by year.

## Design notes

### Riders

- 120 riders, 10 per team, generated procedurally on **New Universe**.
- **Rarity** rolled at creation: Legend 3% / Epic 12% / Rare 25% / Uncommon 35% / Common 25%.
- **Skills** (climbing, sprinting, time trial, cobbles, endurance, descending, breakaway)
  are bounded by rarity:
  - Legend: 88–99 across the board
  - Epic: 1–2 standout skills 90–99, rest 78–89
  - Rare: 1–2 good skills 78–88, rest 68–78
  - Uncommon: 60–75 across
  - Common: 45–65 across
- **Leadership** is rolled independently (uniform 30–99). A Common can have 90 leadership
  and become a beloved captain — leadership decides team time-trial outcomes alongside
  the director rating.
- **Consistency** (40–95) is a variance reducer. High-consistency riders perform
  near their expected level; low-consistency riders swing wider day to day.
- **Career** is 9–12 years long. First 2 years = rookie at 80% potential (and
  eligible for the youth jersey). Middle years = 100%. Penultimate year = 90%,
  final year = 80%. Then retire.
- Year 1 generates riders at varied ages (20–32) so retirements happen
  immediately and the universe doesn't feel sterile.

### Teams

Twelve fixed teams, each with a unique identity, color, emoji, and **bonus**:

| Team | Country | Bonus |
|---|---|---|
| 🇮🇹 Squadra Celeste | ITA | +3% during the Giro d'Italia |
| ⛰️ Banesto-Iberia | ESP | +3% during the Vuelta a España |
| 🌾 Mistral-Provence | FRA | +3% during the Tour de France |
| ⚡ Albion Sky | GBR | +2% on individual & team time trials |
| 🧱 Vlaanderen Pavé | BEL | +5% on cobbled stages |
| 🟧 Oranje Crono | NED | +4% on flat stages (sprint train) |
| 🛡️ Nordkraft | DEN | Rookies more likely to roll Rare+ |
| 🦅 Telekom Berg | GER | First pick of free agents |
| ☕ Café de Colombia | COL | +4% on mountain stages |
| 🕰️ Helvetia Crono | SUI | +1.5% all stages, +3% on TT |
| 🐊 Crocodile Trek | USA | +1% on every stage type |
| 🎯 Adriatica Veloce | ITA | +4% on classics & monuments |

Bonuses **compound** with the director's per-skill boosts. So a Tour Specialist
team with a Legend GT director hammering climbing gets both bonuses on a Tour
mountain stage.

Riders are biased toward each team's home nation (~50% chance) — Café de
Colombia gets more Colombian climbers, Vlaanderen Pavé gets more Belgians.

### Directors

- Each team has one director. Rarity-rolled the same way as riders.
- Directors also have a **specialty** (gt / classics / sprints / mountains /
  cobbles / tt / youth / allround) — their skill boosts skew toward that area.
- 16 directors exist at any time: 12 employed + 4 free agents.
- **Offseason director cycle**:
  - The bottom 1–2 teams fire their director.
  - They hire the best matching free agent (specialty match prioritized,
    then rarity).
  - The pool tops up with new directors as needed and the worst free agents
    age out so the total stays at 16.
- Directors track years-active and titles-won; both shown on the team page.
- Boost magnitudes:
  - Legend: 5% on all skills, 6% on favored
  - Epic: 5% favored / 3% rest
  - Rare: 3% all except one at 1%
  - Uncommon: 3% favored / 1% rest
  - Common: 2% favored / 1% rest

### Calendar

20 events per year (sorted by month):
- **3 Grand Tours**: Giro (May), Tour (July), Vuelta (August).
- **5 stage races**: Paris–Nice, Tirreno–Adriatico, Volta a Catalunya,
  Critérium du Dauphiné, Tour de Suisse.
- **5 monuments**: Milano–Sanremo, Tour of Flanders, Paris–Roubaix,
  Liège–Bastogne–Liège, Il Lombardia.
- **6 classics**: Strade Bianche, Gent–Wevelgem, Amstel Gold, Flèche Wallonne,
  San Sebastián, Milano–Torino.
- **Worlds**: late September.

### Roster selection

Auto-selected per race:
- **Grand Tour**: 8 riders. Engine ensures every rider does at least one Grand Tour
  per season — riders who haven't done a GT yet get priority as the calendar runs out.
- **Week-long stage race**: 7 riders.
- **Classic / Monument**: 5 riders.

Selection score blends specialty match (climbing for Lombardia, cobbles for
Roubaix, sprinting + endurance for Sanremo, etc.) with the GT-quota boost.

### Race simulation

Each stage type weights skills differently — mountain stages reward climbing +
endurance, ITT rewards time trial, cobbles rewards cobbles, etc. A rider's
"score" for a stage is `base_skill × phase_multiplier × (1 + director_boost) +
random_variance`. Variance is gaussian, scaled by `(100 - consistency)`.

Time gaps come from score differences scaled by stage type:
- Flat stages produce a peloton (most riders share the winner's time, "s.t.")
- Mountain-hard stages can produce 2–3 minute gaps
- ITT gaps scale with distance

In Grand Tours, riders with low endurance lose time progressively — the third
week is brutal for non-climbers. This is what makes a Tour podium look different
from a Strade Bianche podium.

**Team time trials** are computed per team:
captain leadership + director TT boost + average team TT/endurance. All eight
riders of a team share the team's time. A weak team with a great GC rider will
lose minutes to a strong team here.

### Scoring

- GC points table: 500/400/325/.../2 for top 30, multiplied by event prestige
  (Tour 1.5, Giro & Vuelta 1.3, Worlds 0.95, Monuments 0.85, week races 0.7–0.8,
  classics 0.6).
- Stage win points: 50/30/20/12/6 for top 5 per stage.
- Jersey bonuses (event-end): points 100, mountain 100, youth 80, team 75 — all
  scaled by prestige.
- **Team season points = sum of top 10 riders' season points**, so depth matters
  but a single megastar can't carry the team alone.

### Off-season

When the calendar is exhausted:
1. Hall of Fame entry saved for the year (champion + team champion + GT winners).
2. Team season records saved with rankings.
3. Riders age +1; anyone past their career length retires.
4. **Transfers**: 8–10 random active riders switch teams.
5. Any team over 10 releases its lowest-rated surplus to a free pool.
6. Free agents distributed to teams below 10.
7. Teams still under 10 generate fresh rookies (rarity-rolled, age 20).
8. Calendar stage distances re-rolled. Year advances.

## Editing the content layer

All names are procedural. To swap in your own:
- **Rider names** — `src/data/names.ts`. Edit `FIRST_NAMES_BY_NATION` and
  `LAST_NAMES_BY_NATION`. The `NATIONALITIES` array decides which nations exist.
- **Team names** — `src/data/names.ts`, `TEAM_NAME_POOLS.sponsors`. The first
  12 (after shuffling per universe) get used.
- **Director surnames** — `src/data/names.ts`, `DIRECTOR_LASTNAMES`.
- **Calendar** — `src/data/calendar.ts`. Add/remove events, edit stage profiles
  for the Grand Tours and week races, change prestige multipliers.

After editing names, click **new game** in the header (top right) — the saved
universe is regenerated with the new content.

## Project layout

```
src/
├── App.tsx                  # Top-level routing
├── main.tsx                 # Bootstrap
├── index.css                # Tailwind + paper aesthetic
├── components/              # All views
│   ├── Home.tsx
│   ├── Header.tsx
│   ├── CalendarView.tsx
│   ├── RaceView.tsx
│   ├── StandingsView.tsx
│   ├── TeamsView.tsx
│   ├── TeamDetailView.tsx
│   ├── RiderDetailView.tsx
│   └── HistoryView.tsx
├── data/
│   ├── calendar.ts          # 20-event calendar + stage profiles
│   ├── generators.ts        # Rider/director/team/universe creation
│   └── names.ts             # Content layer — edit freely
├── engine/
│   ├── simulate.ts          # Stage simulation + classifications
│   ├── scoring.ts           # Points awards
│   ├── season.ts            # Race lifecycle (start/step/finish)
│   └── offseason.ts         # Retirements, transfers, rookies
├── state/
│   └── store.ts             # Zustand store + localStorage persistence
├── types/
│   └── index.ts             # All shared types
└── utils/
    └── random.ts            # Mulberry32 PRNG, time formatting, etc.
```

## Known quirks

- The simulation is deterministic per seed: same seed + same inputs → same
  results. Each race uses a sub-seed derived from `(universe.seed, year, event,
  step)` so results are reproducible.
- Riders generated mid-career (year-1 riders aged 20–32) get extended career
  lengths so they always have at least 2 years remaining when the universe boots.
- Saving is automatic on every meaningful action (start race, step, finish race,
  end season). The save key is `peloton.v1`. To wipe and restart, click
  **new game** in the header.

Have a good season.
