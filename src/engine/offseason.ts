import type { Universe, HallOfFameEntry, Team, Rarity } from '../types';
import { makeRng, randInt, randFloat, shuffle, pick, gaussian, clamp } from '../utils/random';
import { generateRider, generateDirector, computePhase, preferredSpecialtyForTeam, buildEliteRookieQueue } from '../data/generators';
import { rebuildCalendarStages } from '../data/calendar';

const RARITY_RANK: Record<Rarity, number> = {
  generational: 6, legend: 5, epic: 4, rare: 3, uncommon: 2, common: 1,
};

const DIRECTOR_POOL_SIZE = 16;

export function endSeason(universe: Universe): void {
  const completedYear = universe.currentYear;
  const rng = makeRng(universe.seed + completedYear * 7919);

  // 1) Hall of Fame.
  saveHallOfFame(universe);

  // 2) Save team season stats and titles.
  const sortedTeams = Object.values(universe.teams)
    .map((t) => ({ id: t.id, pts: universe.season.teamPoints[t.id] ?? 0 }))
    .sort((a, b) => b.pts - a.pts);

  for (const team of Object.values(universe.teams)) {
    const raceWinsBy: string[] = [];
    const stageDetailMap = new Map<string, { eventId: string; stageType: string; count: number }>();

    for (const ev of universe.season.completedEvents) {
      const winnerId = ev.finalGc[0]?.riderId;
      if (winnerId && universe.riders[winnerId]?.teamId === team.id) {
        raceWinsBy.push(ev.eventId);
      }
      for (const sw of ev.stageWinners) {
        if (universe.riders[sw.riderId]?.teamId === team.id) {
          const key = `${ev.eventId}|${sw.stageType}`;
          const existing = stageDetailMap.get(key);
          if (existing) existing.count += 1;
          else stageDetailMap.set(key, { eventId: ev.eventId, stageType: sw.stageType, count: 1 });
        }
      }
    }

    team.history.push({
      year: universe.currentYear,
      points: universe.season.teamPoints[team.id] ?? 0,
      raceWins: raceWinsBy.length,
      stageWins: Array.from(stageDetailMap.values()).reduce((a, b) => a + b.count, 0),
      ranking: 0,
      riderIds: [...team.riderIds],
      raceWinsBy,
      stageWinsByDetail: Array.from(stageDetailMap.values()),
    });
  }
  sortedTeams.forEach((t, i) => {
    const team = universe.teams[t.id];
    const last = team.history[team.history.length - 1];
    if (last) last.ranking = i + 1;
    team.totals.points += t.pts;
  });

  // Award the season title to the #1 team's director.
  const championDirectorId = universe.teams[sortedTeams[0].id]?.directorId;
  if (championDirectorId) {
    const dir = universe.directors[championDirectorId];
    if (dir) dir.titlesWon += 1;
  }

  // 3) Director firing/hiring cycle.
  runDirectorCycle(universe, sortedTeams, rng);

  // 4) Age riders, set retirement.
  const retiringRiders: string[] = [];
  for (const rider of Object.values(universe.riders)) {
    if (rider.retired) continue;
    rider.age += 1;
    const newPhase = computePhase(rider.age, rider.careerStartYear, rider.careerLength, universe.currentYear + 1);
    rider.phase = newPhase;
    if (newPhase === 'retired') {
      rider.retired = true;
      retiringRiders.push(rider.id);
    }
  }
  for (const id of retiringRiders) {
    const rider = universe.riders[id];
    const team = universe.teams[rider.teamId];
    if (team) team.riderIds = team.riderIds.filter((rid) => rid !== id);
    rider.teamId = '';
  }

  // 5) Transfers: 8-10 active riders switch teams.
  const transferCount = randInt(rng, 8, 10);
  const activeRiders = Object.values(universe.riders).filter((r) => !r.retired && r.teamId);
  const transferPool = shuffle(rng, activeRiders).slice(0, transferCount);
  for (const r of transferPool) {
    const oldTeamId = r.teamId;
    const oldTeam = universe.teams[oldTeamId];
    if (oldTeam) oldTeam.riderIds = oldTeam.riderIds.filter((id) => id !== r.id);
    const possibleTeams = Object.values(universe.teams).filter((t) => t.id !== oldTeamId);
    const newTeam = possibleTeams[Math.floor(rng() * possibleTeams.length)];
    r.teamId = newTeam.id;
    newTeam.riderIds.push(r.id);
  }

  // 6) Surplus rebalance: teams over 10 release worst riders to free pool.
  const freeAgents: string[] = [];
  for (const team of Object.values(universe.teams)) {
    if (team.riderIds.length > 10) {
      const sorted = team.riderIds
        .map((id) => universe.riders[id])
        .sort((a, b) => avgSkill(b) - avgSkill(a));
      const keep = sorted.slice(0, 10).map((r) => r.id);
      const release = sorted.slice(10).map((r) => r.id);
      team.riderIds = keep;
      for (const id of release) {
        universe.riders[id].teamId = '';
        freeAgents.push(id);
      }
    }
  }

  // 7) Distribute free agents — Telekom Berg ("Deep Pockets") gets first pick.
  // Sort free agents by avg skill desc so the best go first.
  const sortedFreeAgents = freeAgents
    .map((id) => universe.riders[id])
    .sort((a, b) => avgSkill(b) - avgSkill(a))
    .map((r) => r.id);

  const deepPocketsTeam = Object.values(universe.teams).find(
    (t) => t.bonus.kind === 'free-agent',
  );

  for (const id of sortedFreeAgents) {
    const teamsBelow = Object.values(universe.teams).filter((t) => t.riderIds.length < 10);
    if (teamsBelow.length === 0) {
      const random = pick(rng, Object.values(universe.teams));
      universe.riders[id].teamId = random.id;
      random.riderIds.push(id);
      continue;
    }
    let target: Team;
    if (deepPocketsTeam && deepPocketsTeam.riderIds.length < 10) {
      target = deepPocketsTeam;
    } else {
      target = teamsBelow[Math.floor(rng() * teamsBelow.length)];
    }
    universe.riders[id].teamId = target.id;
    target.riderIds.push(id);
  }

  // 8) Generate rookies for teams still under 10. Elite rarity is assigned
  // only here, at birth, to replace retired elite riders. Existing riders are
  // never promoted, demoted, or re-rolled.
  const newYear = completedYear + 1;
  const eliteRookieQueue = buildEliteRookieQueue(rng, Object.values(universe.riders));
  const rookieTeams = shuffle(rng, Object.values(universe.teams));
  for (const team of rookieTeams) {
    const rarityBoost = team.bonus.kind === 'youth' ? team.bonus.amount : 0;
    const homeBias = [team.nationality];
    while (team.riderIds.length < 10) {
      const forcedRarity = eliteRookieQueue.shift();
      const rookie = generateRider(rng, newYear, {
        forcedAge: 20,
        forcedRarity,
        allowEliteRoll: false,
        homeBiasNations: homeBias,
        rarityBoost,
      });
      rookie.teamId = team.id;
      universe.riders[rookie.id] = rookie;
      team.riderIds.push(rookie.id);
    }
  }

  // 9) Reset season state for new year.
  universe.currentYear = newYear;
  universe.season = {
    year: newYear,
    currentEventIndex: 0,
    calendar: rebuildCalendarStages(rng, universe.season.calendar),
    individualPoints: {},
    teamPoints: {},
    activeRace: null,
    completedEvents: [],
  };

  for (const rider of Object.values(universe.riders)) {
    if (rider.retired) continue;
    rider.phase = computePhase(rider.age, rider.careerStartYear, rider.careerLength, newYear);

    if (rider.careerStartYear < newYear) {
      const seasonStats = rider.history.find((h) => h.year === completedYear);
      const wins = seasonStats?.raceWins ?? 0;
      const points = seasonStats?.points ?? 0;
      const successSignal = clamp(wins * 0.0015 + Math.max(0, points - 250) / 100000, 0, 0.007);
      const quietSignal = points < 40 && wins === 0 ? -0.004 : 0;
      const retainedMomentum = ((rider.careerMomentum ?? 1) - 1) * 0.55;
      rider.careerMomentum = clamp(
        1 + retainedMomentum + successSignal + quietSignal + gaussian(rng) * 0.006,
        0.98,
        1.02,
      );
      rider.seasonForm = randFloat(rng, 0.95, 1.05);
    }
    rider.stamina = 100;
  }

  // Bump director years-active for everyone still employed.
  for (const dir of Object.values(universe.directors)) {
    if (dir.teamId) dir.yearsActive += 1;
  }
}

// ============================================================================
// DIRECTOR FIRING / HIRING CYCLE
// ============================================================================

function runDirectorCycle(
  universe: Universe,
  sortedTeams: { id: string; pts: number }[],
  rng: () => number,
): void {
  // The bottom 1-2 teams fire their director. Probability of 2 firings = 50%.
  const fireCount = rng() < 0.5 ? 2 : 1;
  const teamsToFire = sortedTeams.slice(-fireCount);

  for (const t of teamsToFire) {
    const team = universe.teams[t.id];
    if (!team || !team.directorId) continue;
    const dir = universe.directors[team.directorId];
    if (dir) dir.teamId = null;
    team.directorId = null;
  }

  // Top up the director pool to at least DIRECTOR_POOL_SIZE so there's always
  // someone to hire.
  ensureDirectorPool(universe, rng);

  for (const t of teamsToFire) {
    const team = universe.teams[t.id];
    if (!team) continue;
    const preferred = preferredSpecialtyForTeam(team);
    const freeAgents = Object.values(universe.directors).filter((d) => d.teamId === null);
    if (freeAgents.length === 0) continue;
    // Sort: matching specialty first, then by rarity rank.
    freeAgents.sort((a, b) => {
      const aMatch = a.specialty === preferred ? 1 : 0;
      const bMatch = b.specialty === preferred ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      return RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity];
    });
    // Pick from top 2 to avoid all teams converging on the single best free agent.
    const top = freeAgents.slice(0, Math.min(2, freeAgents.length));
    const hire = top[Math.floor(rng() * top.length)];
    if (hire) {
      hire.teamId = team.id;
      hire.yearsActive = 0;
      team.directorId = hire.id;
    }
  }

  // Trim the pool: keep total at DIRECTOR_POOL_SIZE (12 employed + 4 free).
  const allDirectors = Object.values(universe.directors);
  const employed = allDirectors.filter((d) => d.teamId !== null);
  const free = allDirectors.filter((d) => d.teamId === null);
  const desiredFree = DIRECTOR_POOL_SIZE - employed.length;
  if (free.length > desiredFree) {
    free.sort((a, b) => RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity]);
    const toRemove = free.slice(0, free.length - desiredFree);
    for (const d of toRemove) {
      delete universe.directors[d.id];
    }
  }
}

function ensureDirectorPool(universe: Universe, rng: () => number): void {
  const total = Object.keys(universe.directors).length;
  for (let i = total; i < DIRECTOR_POOL_SIZE; i++) {
    const dir = generateDirector(rng);
    universe.directors[dir.id] = dir;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function avgSkill(rider: { skills: Record<string, number> }): number {
  const vals = Object.values(rider.skills);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function saveHallOfFame(universe: Universe): void {
  const ind = Object.entries(universe.season.individualPoints).sort((a, b) => b[1] - a[1])[0];
  const team = Object.entries(universe.season.teamPoints).sort((a, b) => b[1] - a[1])[0];
  const eventWinners: Record<string, string> = {};
  for (const e of universe.season.completedEvents) {
    eventWinners[e.eventId] = e.finalGc[0]?.riderId ?? '';
  }
  const entry: HallOfFameEntry = {
    year: universe.currentYear,
    individualChampionId: ind?.[0] ?? '',
    teamChampionId: team?.[0] ?? '',
    individualPoints: ind?.[1] ?? 0,
    teamPoints: team?.[1] ?? 0,
    eventWinners,
  };
  universe.hallOfFame.push(entry);
}
