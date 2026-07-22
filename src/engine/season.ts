import type {
  Universe,
  Rider,
  CalendarEvent,
  RaceState,
  StageResult,
  CompletedEventResult,
} from '../types';
import { makeRng, type Rng } from '../utils/random';
import { simulateStage, buildClassifications } from './simulate';
import { awardEventPoints } from './scoring';
import { phaseMultiplier } from '../data/generators';

// ============================================================================
// ROSTER SELECTION
// ============================================================================
// Strategy: pick the riders best suited to the event's terrain, while also
// making sure every rider participates in at least one Grand Tour during the
// season. We track per-rider GT count in a side map at season start.

function specialtyScore(rider: Rider, event: CalendarEvent, currentYear: number): number {
  const phaseMul = phaseMultiplier(rider, currentYear);
  if (phaseMul === 0) return -Infinity; // retired

  const form = rider.seasonForm ?? 1;
  const stamina = rider.stamina ?? 100;
  const readiness = stamina >= 85 ? 1 : Math.max(0.80, 1 - (85 - stamina) * 0.0045);
  const s = Object.fromEntries(Object.entries(rider.skills).map(([k, v]) => [k, v * form * readiness])) as Rider['skills'];
  switch (event.id) {
    case 'tour':
    case 'giro':
    case 'vuelta':
      // Mixed: GC riders want climbing + ITT + endurance, sprinters want sprinting
      return Math.max(
        s.climbing * 0.5 + s.timeTrial * 0.2 + s.endurance * 0.3,
        s.sprinting * 0.6 + s.endurance * 0.2 + s.cobbles * 0.1,
        s.breakaway * 0.5 + s.climbing * 0.3 + s.endurance * 0.2,
      );
    case 'flanders':
    case 'roubaix':
    case 'strade':
      return s.cobbles * 0.7 + s.endurance * 0.2 + s.sprinting * 0.1;
    case 'milan-sanremo':
      return s.sprinting * 0.5 + s.endurance * 0.3 + s.climbing * 0.2;
    case 'liege':
    case 'amstel':
    case 'fleche':
    case 'san-sebastian':
      return s.climbing * 0.4 + s.breakaway * 0.3 + s.endurance * 0.3;
    case 'lombardia':
      return s.climbing * 0.6 + s.endurance * 0.3 + s.descending * 0.1;
    case 'worlds':
      return s.climbing * 0.3 + s.endurance * 0.3 + s.breakaway * 0.2 + s.sprinting * 0.2;
    default:
      // week-stage races: similar to GT but smaller
      return s.climbing * 0.4 + s.timeTrial * 0.2 + s.endurance * 0.2 + s.sprinting * 0.2;
  }
}

// Track Grand Tour participation across the season so every rider does at least one.
function getGTParticipation(universe: Universe): Record<string, number> {
  const map: Record<string, number> = {};
  for (const event of universe.season.calendar) {
    if (event.category !== 'grand-tour') continue;
    const completed = universe.season.completedEvents.find((c) => c.eventId === event.id);
    if (!completed) continue;
    for (const rid of completed.participants) {
      map[rid] = (map[rid] ?? 0) + 1;
    }
  }
  return map;
}

// Look ahead: how many remaining GTs after this one (inclusive)?
function remainingGTs(universe: Universe, fromIndex: number): CalendarEvent[] {
  return universe.season.calendar
    .slice(fromIndex)
    .filter((e) => e.category === 'grand-tour');
}

function selectRoster(universe: Universe, event: CalendarEvent): string[] {
  const teamRosters: Record<string, string[]> = {};
  const slotsPerTeam = event.ridersPerTeam;
  const isGT = event.category === 'grand-tour';
  const gtMap = getGTParticipation(universe);
  const remainingGTsList = remainingGTs(universe, universe.season.currentEventIndex);

  for (const team of Object.values(universe.teams)) {
    // Filter active riders only
    const active = team.riderIds
      .map((id) => universe.riders[id])
      .filter((r) => r && !r.retired && (r.stamina ?? 100) >= 30 && phaseMultiplier(r, universe.currentYear) > 0);

    let candidates = active.map((r) => ({
      rider: r,
      score: specialtyScore(r, event, universe.currentYear),
      gtsDone: gtMap[r.id] ?? 0,
    }));

    if (isGT) {
      // Riders with 0 GTs done so far + few remaining GTs after this one
      // get a priority boost so they don't get skipped.
      const remaining = remainingGTsList.length; // includes current GT
      candidates = candidates.map((c) => {
        const needsGT = c.gtsDone === 0;
        // If a rider hasn't done a GT and there are few remaining, big boost
        const urgency = needsGT ? 6 / Math.max(1, remaining) : 0;
        return { ...c, score: c.score + urgency };
      });
    }

    // Sort by score, take top N
    candidates.sort((a, b) => b.score - a.score);
    teamRosters[team.id] = candidates.slice(0, slotsPerTeam).map((c) => c.rider.id);
  }

  return Object.values(teamRosters).flat();
}

// ============================================================================
// RACE LIFECYCLE
// ============================================================================

function recoverBetweenEvents(universe: Universe): void {
  const index = universe.season.currentEventIndex;
  const current = universe.season.calendar[index];
  if (!current) return;
  const previous = index > 0 ? universe.season.calendar[index - 1] : null;
  const currentWeek = current.month * 4 + current.weekInMonth;
  const previousWeek = previous ? previous.month * 4 + previous.weekInMonth : currentWeek - 3;
  const gapWeeks = Math.max(1, currentWeek - previousWeek);
  const recovery = 8 + gapWeeks * 9;
  for (const rider of Object.values(universe.riders)) {
    if (!rider.retired) {
      const gtStarts = universe.season.completedEvents
        .filter((e) => universe.season.calendar.find((c) => c.id === e.eventId)?.category === 'grand-tour' && e.participants.includes(rider.id))
        .length;
      const seasonCeiling = Math.max(68, 100 - gtStarts * 15);
      rider.stamina = Math.min(seasonCeiling, (rider.stamina ?? 100) + recovery);
    }
  }
}

export function startRace(universe: Universe): void {
  if (universe.season.activeRace) return; // already in race
  const event = universe.season.calendar[universe.season.currentEventIndex];
  if (!event) return; // no events left

  recoverBetweenEvents(universe);
  const participants = selectRoster(universe, event);

  universe.season.activeRace = {
    eventId: event.id,
    year: universe.currentYear,
    participants,
    stageResults: [],
    gc: [],
    teamGc: [],
    currentStep: 0,
    totalSteps: totalStepsFor(event),
    stageWinsByRider: {},
    finished: false,
  };
}

/** How many stages are in step N for a given event? */
function stagesInStep(event: { id: string; stages: { type: string }[] }, stepIndex: number): number {
  const total = event.stages.length;
  // Grand Tours (21 stages): 5 + 4 + 4 + 4 + 4 = 21
  if (total === 21) {
    return [5, 4, 4, 4, 4][stepIndex] ?? 0;
  }
  // 8-stage week race: 4 + 4 = 8
  if (total === 8) {
    return [4, 4][stepIndex] ?? 0;
  }
  // 7-stage week race: 4 + 3 = 7
  if (total === 7) {
    return [4, 3][stepIndex] ?? 0;
  }
  // Classics or anything single-stage: just one chunk equal to total
  return total;
}

/** Total number of steps for the event */
function totalStepsFor(event: { id: string; stages: { type: string }[] }): number {
  const total = event.stages.length;
  if (total === 21) return 5;
  if (total === 8) return 2;
  if (total === 7) return 2;
  return 1;
}

/** How many stages have been simulated through the END of step N (inclusive)? */
function cumulativeStagesAfterStep(event: { id: string; stages: { type: string }[] }, stepIndex: number): number {
  let sum = 0;
  for (let i = 0; i <= stepIndex; i++) sum += stagesInStep(event, i);
  return sum;
}

export function simulateNextStep(universe: Universe): void {
  const race = universe.season.activeRace;
  if (!race || race.finished) return;
  const event = universe.season.calendar[universe.season.currentEventIndex];
  if (!event) return;

  const startStage = race.stageResults.length;
  const endStage = Math.min(
    cumulativeStagesAfterStep(event, race.currentStep),
    event.stages.length,
  );

  const rng = makeRng(
    universe.seed +
      universe.currentYear * 1000 +
      hash(event.id) +
      race.currentStep * 17,
  );

  const participantRiders = race.participants
    .map((id) => universe.riders[id])
    .filter(Boolean);
  const ridersByTeam: Record<string, Rider[]> = {};
  for (const r of participantRiders) {
    if (!ridersByTeam[r.teamId]) ridersByTeam[r.teamId] = [];
    ridersByTeam[r.teamId].push(r);
  }

  for (let i = startStage; i < endStage; i++) {
    const stage = event.stages[i];
    const result = simulateStage({
      stage,
      participants: participantRiders,
      ridersByTeam,
      teams: universe.teams,
      directors: universe.directors,
      currentYear: universe.currentYear,
      rng,
      stagesElapsed: i,
      totalStagesInRace: event.stages.length,
      raceCategory: event.category,
      eventId: event.id,
    });
    result.stageIndex = i;
    race.stageResults.push(result);
    // Stage win tracker
    const winner = result.finishers[0]?.riderId;
    if (winner) {
      race.stageWinsByRider[winner] = (race.stageWinsByRider[winner] ?? 0) + 1;
    }
  }

  // Rebuild classifications
  const classifications = buildClassifications(
    participantRiders,
    race.stageResults,
    universe.currentYear,
  );
  race.gc = classifications.gc;
  race.teamGc = classifications.teamGc;
  race.currentStep++;

  // Race finished?
  if (race.currentStep >= race.totalSteps) {
    finishRace(universe);
  }
}

/**
 * Simulate a single stage. Used by the UI's auto-play tick (one stage per
 * second). Increments `currentStep` only when this stage is the last of its
 * step. Triggers finishRace when the final stage of the race completes.
 */
export function simulateOneStage(universe: Universe): void {
  const race = universe.season.activeRace;
  if (!race || race.finished) return;
  const event = universe.season.calendar[universe.season.currentEventIndex];
  if (!event) return;

  const stageIndex = race.stageResults.length;
  if (stageIndex >= event.stages.length) return;

  const rng = makeRng(
    universe.seed +
      universe.currentYear * 1000 +
      hash(event.id) +
      race.currentStep * 17 +
      stageIndex,
  );

  const participantRiders = race.participants
    .map((id) => universe.riders[id])
    .filter(Boolean);
  const ridersByTeam: Record<string, Rider[]> = {};
  for (const r of participantRiders) {
    if (!ridersByTeam[r.teamId]) ridersByTeam[r.teamId] = [];
    ridersByTeam[r.teamId].push(r);
  }

  const stage = event.stages[stageIndex];
  const result = simulateStage({
    stage,
    participants: participantRiders,
    ridersByTeam,
    teams: universe.teams,
    directors: universe.directors,
    currentYear: universe.currentYear,
    rng,
    stagesElapsed: stageIndex,
    totalStagesInRace: event.stages.length,
    raceCategory: event.category,
    eventId: event.id,
  });
  result.stageIndex = stageIndex;
  race.stageResults.push(result);

  const winner = result.finishers[0]?.riderId;
  if (winner) {
    race.stageWinsByRider[winner] = (race.stageWinsByRider[winner] ?? 0) + 1;
  }

  // Rebuild classifications (also for jersey leaders mid-race)
  const classifications = buildClassifications(
    participantRiders,
    race.stageResults,
    universe.currentYear,
  );
  race.gc = classifications.gc;
  race.teamGc = classifications.teamGc;

  // Did this stage complete the current step? If so, advance step counter.
  const completedAfterThisStep = cumulativeStagesAfterStep(event, race.currentStep);
  if (race.stageResults.length >= completedAfterThisStep) {
    race.currentStep++;
  }

  // Final stage of the race?
  if (race.stageResults.length >= event.stages.length) {
    finishRace(universe);
  }
}

/** Total stages in current step (for the auto-play tick counter) */
export function stagesInCurrentStep(universe: Universe): number {
  const race = universe.season.activeRace;
  if (!race) return 0;
  const event = universe.season.calendar[universe.season.currentEventIndex];
  if (!event) return 0;
  return stagesInStep(event, race.currentStep);
}

function finishRace(universe: Universe): void {
  const race = universe.season.activeRace;
  if (!race) return;
  const event = universe.season.calendar[universe.season.currentEventIndex];
  if (!event) return;

  race.finished = true;

  // Determine jerseys
  const sortedByPoints = [...race.gc].sort(
    (a, b) => b.pointsClassification - a.pointsClassification,
  );
  const sortedByMountain = [...race.gc].sort(
    (a, b) => b.mountainClassification - a.mountainClassification,
  );
  const sortedByYouth = race.gc.filter((r) => r.isYoung);

  // Only award classification jerseys if someone actually scored.
  // 1-day flat classics have no mountain stages, so no KOM jersey.
  const mountainAwarded = (sortedByMountain[0]?.mountainClassification ?? 0) > 0;
  const pointsAwarded = (sortedByPoints[0]?.pointsClassification ?? 0) > 0;

  const jerseys = {
    gc: race.gc[0]?.riderId ?? '',
    points: pointsAwarded ? sortedByPoints[0].riderId : '',
    mountain: mountainAwarded ? sortedByMountain[0].riderId : '',
    youth: sortedByYouth[0]?.riderId ?? null,
    teamWinnerId: race.teamGc[0]?.teamId ?? '',
  };
  race.jerseys = jerseys;

  // Award season points
  awardEventPoints(event, race.gc, race.stageResults, jerseys, universe);

  // Save completed event
  const stageWinners = race.stageResults.map((sr) => ({
    stageIndex: sr.stageIndex,
    riderId: sr.finishers[0]?.riderId ?? '',
    stageType: sr.stageType,
  }));
  const completed: CompletedEventResult = {
    eventId: event.id,
    year: universe.currentYear,
    finalGc: race.gc.slice(0, 30),
    participants: [...race.participants],
    jerseys,
    stageWinners,
  };
  universe.season.completedEvents.push(completed);

  // Stage races create meaningful calendar choices. Strong endurance reduces
  // depletion, but racing all three Grand Tours is still possible with rest.
  for (const riderId of race.participants) {
    const rider = universe.riders[riderId];
    if (!rider) continue;
    const endurance = rider.skills.endurance;
    const baseCost = event.category === 'grand-tour' ? 54 : event.category === 'week-stage' ? 24 : 9;
    const enduranceRelief = (endurance - 70) * (event.category === 'grand-tour' ? 0.35 : 0.18);
    rider.stamina = Math.max(0, (rider.stamina ?? 100) - Math.max(5, baseCost - enduranceRelief));
  }

  // Update each rider's season history (lightweight — only the GC finisher rows
  // have data here; we log positions for top 30 + jerseys + stage wins).
  const eventId = event.id;
  for (const row of race.gc) {
    const rider = universe.riders[row.riderId];
    if (!rider) continue;
    let yearStats = rider.history.find((h) => h.year === universe.currentYear);
    if (!yearStats) {
      yearStats = {
        year: universe.currentYear,
        age: rider.age,
        teamId: rider.teamId,
        phase: rider.phase,
        points: 0,
        stageWins: 0,
        raceWins: 0,
        raceWinsBy: [],
        stageWinsByDetail: [],
        grandTourFinishes: {},
        jerseys: { gc: [], points: [], mountain: [], youth: [] },
      };
      rider.history.push(yearStats);
    }
    if (event.category === 'grand-tour') {
      yearStats.grandTourFinishes[event.id] = row.position;
    }

    // Stage wins this race for this rider, broken out by terrain.
    const stageWinsThisRace = race.stageWinsByRider[rider.id] ?? 0;
    yearStats.stageWins += stageWinsThisRace;
    if (stageWinsThisRace > 0) {
      // Group the rider's stage wins by stageType
      const byType: Record<string, number> = {};
      for (const sr of race.stageResults) {
        if (sr.finishers[0]?.riderId === rider.id) {
          byType[sr.stageType] = (byType[sr.stageType] ?? 0) + 1;
        }
      }
      for (const [stageType, count] of Object.entries(byType)) {
        const existing = yearStats.stageWinsByDetail.find(
          (d) => d.eventId === eventId && d.stageType === stageType,
        );
        if (existing) existing.count += count;
        else yearStats.stageWinsByDetail.push({ eventId, stageType, count });
      }
    }

    if (jerseys.gc === rider.id) {
      yearStats.raceWins += 1;
      yearStats.raceWinsBy.push(eventId);
      yearStats.jerseys.gc.push(eventId);
    }
    if (jerseys.points === rider.id) yearStats.jerseys.points.push(eventId);
    if (jerseys.mountain === rider.id) yearStats.jerseys.mountain.push(eventId);
    if (jerseys.youth === rider.id) yearStats.jerseys.youth.push(eventId);
    yearStats.points = universe.season.individualPoints[rider.id] ?? 0;
  }
}

// Advance: dismiss the active race so the user can pick the next event.
export function dismissRace(universe: Universe): void {
  if (!universe.season.activeRace?.finished) return;
  universe.season.activeRace = null;
  universe.season.currentEventIndex++;
}

// ============================================================================
// END OF SEASON
// ============================================================================

export function isSeasonOver(universe: Universe): boolean {
  return universe.season.currentEventIndex >= universe.season.calendar.length;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}
