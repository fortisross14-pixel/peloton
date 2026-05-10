import type {
  Rider,
  Team,
  Director,
  StageDefinition,
  StageType,
  StageFinisher,
  StageResult,
  RaceClassification,
  TeamClassification,
  CalendarEvent,
  RaceState,
  Universe,
} from '../types';
import type { Rng } from '../utils/random';
import { gaussian, clamp } from '../utils/random';
import { phaseMultiplier } from '../data/generators';

// ============================================================================
// TERRAIN WEIGHTS
// ============================================================================
// Each stage type weights skills differently. Weights sum to ~1.0.

const TERRAIN_WEIGHTS: Record<StageType, Partial<Record<keyof Rider['skills'], number>>> = {
  flat: { sprinting: 0.65, endurance: 0.2, breakaway: 0.05, descending: 0.05, climbing: 0.05 },
  hilly: { sprinting: 0.15, climbing: 0.25, breakaway: 0.2, endurance: 0.2, descending: 0.1, cobbles: 0.1 },
  mountain: { climbing: 0.55, endurance: 0.2, breakaway: 0.1, descending: 0.1, sprinting: 0.05 },
  'mountain-hard': { climbing: 0.7, endurance: 0.2, breakaway: 0.05, descending: 0.05 },
  itt: { timeTrial: 0.75, endurance: 0.15, climbing: 0.05, descending: 0.05 },
  ttt: { timeTrial: 0.6, endurance: 0.25, sprinting: 0.1, climbing: 0.05 }, // base; team blend below
  cobbles: { cobbles: 0.55, endurance: 0.2, sprinting: 0.1, breakaway: 0.1, climbing: 0.05 },
};

// Time spread (stdev in seconds across the field) by stage type and category.
// Bigger spreads = more separation. Mountain stages produce real gaps,
// flat stages produce a peloton finish where most riders share the same time.
const STAGE_SPREAD: Record<StageType, number> = {
  flat: 6,            // peloton mostly together; only sprint order differs in seconds
  hilly: 35,
  mountain: 90,
  'mountain-hard': 180,
  itt: 60,            // per ~30km — scaled below by distance
  ttt: 25,            // per team
  cobbles: 50,
};

// ============================================================================
// EFFECTIVE SKILLS
// ============================================================================

export function getEffectiveSkill(
  rider: Rider,
  director: Director | undefined,
  skill: keyof Rider['skills'],
  currentYear: number,
): number {
  const base = rider.skills[skill];
  const phaseMul = phaseMultiplier(rider, currentYear);
  const directorBoost = director?.boosts[skill] ?? 0;
  return base * phaseMul * (1 + directorBoost);
}

// Compute the team's identity bonus multiplier for a given stage and event.
// Returns 1.0 if no bonus applies, e.g. 1.04 for "+4%".
// Some bonuses (youth, free-agent) don't apply to in-race performance.
export function teamBonusMultiplier(
  team: Team | undefined,
  stageType: StageType,
  eventId: string,
  eventCategory: CalendarEvent['category'],
): number {
  if (!team) return 1;
  const b = team.bonus;
  switch (b.kind) {
    case 'gt-tour':    return eventId === 'tour' ? 1 + b.amount : 1;
    case 'gt-giro':    return eventId === 'giro' ? 1 + b.amount : 1;
    case 'gt-vuelta':  return eventId === 'vuelta' ? 1 + b.amount : 1;
    case 'tt-stages':  return (stageType === 'itt' || stageType === 'ttt') ? 1 + b.amount : 1;
    case 'cobbles':    return stageType === 'cobbles' ? 1 + b.amount : 1;
    case 'flat':       return stageType === 'flat' ? 1 + b.amount : 1;
    case 'mountain':   return (stageType === 'mountain' || stageType === 'mountain-hard') ? 1 + b.amount : 1;
    case 'classics':   return (eventCategory === 'classic' || eventCategory === 'monument') ? 1 + b.amount : 1;
    case 'precision': {
      // +1.5% all stages, additional +1.5% on TT (so TT gets +3% total)
      let mult = 1 + b.amount; // +1.5%
      if (stageType === 'itt' || stageType === 'ttt') mult += 0.015; // additional 1.5%
      return mult;
    }
    case 'allterrain': return 1 + b.amount; // applies to everything
    case 'youth':
    case 'free-agent': return 1; // not stage-related
  }
}

// Score a rider for a stage, returning a "performance score" not a time.
function scoreRiderForStage(
  rider: Rider,
  director: Director | undefined,
  stageType: StageType,
  currentYear: number,
): number {
  const weights = TERRAIN_WEIGHTS[stageType];
  let score = 0;
  for (const [k, w] of Object.entries(weights) as [keyof Rider['skills'], number][]) {
    score += getEffectiveSkill(rider, director, k, currentYear) * w;
  }
  return score;
}

// ============================================================================
// STAGE SIMULATION
// ============================================================================

export interface SimulateStageInput {
  stage: StageDefinition;
  participants: Rider[];
  ridersByTeam: Record<string, Rider[]>; // teamId -> riders in race (for TTT)
  teams: Record<string, Team>;
  directors: Record<string, Director>;
  currentYear: number;
  rng: Rng;
  // For Grand Tour fatigue: how many stages already completed
  stagesElapsed: number;
  totalStagesInRace: number;
  raceCategory: CalendarEvent['category'];
  eventId: string;
}

export function simulateStage(input: SimulateStageInput): StageResult {
  const {
    stage, participants, ridersByTeam, teams, directors,
    currentYear, rng, stagesElapsed, totalStagesInRace, raceCategory, eventId,
  } = input;

  // Special handling: team time trial computes a single time per team,
  // then assigns it to all team riders. Captain leadership + director rating
  // matter here.
  if (stage.type === 'ttt') {
    return simulateTTT(input);
  }

  // Compute fatigue multiplier for Grand Tours: low-endurance riders fade.
  const fatigueProgress = stagesElapsed / totalStagesInRace;
  const isGT = raceCategory === 'grand-tour';

  const finishers: { rider: Rider; rawScore: number }[] = participants.map((rider) => {
    const team = teams[rider.teamId];
    const director = team?.directorId ? directors[team.directorId] : undefined;
    let rawScore = scoreRiderForStage(rider, director, stage.type, currentYear);

    // Apply team identity bonus (compound with director).
    const teamMult = teamBonusMultiplier(team, stage.type, eventId, raceCategory);
    rawScore *= teamMult;

    // Random variance — wider for low-consistency riders. Tuned higher so
    // the same star doesn't dominate every race.
    const variance = (100 - rider.consistency) * 0.25 + 4;
    rawScore += gaussian(rng) * variance;

    // Grand Tour fatigue: rider with low endurance fades in week 3.
    if (isGT) {
      const enduranceFactor = (rider.skills.endurance - 70) / 30; // -2.3 to 1.0
      const fatigueLoss = (1 - enduranceFactor) * fatigueProgress * 4;
      rawScore -= fatigueLoss;
    }

    return { rider, rawScore };
  });

  // Sort by score desc — best score wins.
  finishers.sort((a, b) => b.rawScore - a.rawScore);

  // Convert ranks to times.
  // Winner gets a base time depending on stage distance and type.
  const distance = stage.distanceKm;
  const avgKmh = baseSpeed(stage.type);
  const winnerSeconds = (distance / avgKmh) * 3600;

  // Time gaps: derive from rawScore difference, scaled by stage spread.
  const winnerScore = finishers[0].rawScore;
  const baseSpread = stage.type === 'itt'
    ? STAGE_SPREAD.itt * (distance / 30)
    : STAGE_SPREAD[stage.type];

  // Score difference -> time gap. Calibrate: a 1-point score gap on a
  // mountain stage = ~baseSpread/30 seconds.
  const SCORE_TO_SECONDS = baseSpread / 30;

  const stageFinishers: StageFinisher[] = finishers.map((f, i) => {
    const gap = (winnerScore - f.rawScore) * SCORE_TO_SECONDS;
    // Add tiny random jitter to avoid ties on flat stages.
    const jitter = stage.type === 'flat' ? Math.abs(gaussian(rng)) * 0.5 : Math.abs(gaussian(rng)) * 0.3;
    let gapSeconds = Math.max(0, gap + jitter);

    // On flat stages, lump the peloton: anyone within 6s of winner gets s.t.
    if (stage.type === 'flat' && gapSeconds < 6) {
      gapSeconds = i === 0 ? 0 : 0; // group sprint — but keep order distinct
    }

    return {
      riderId: f.rider.id,
      teamId: f.rider.teamId,
      position: i + 1,
      timeSeconds: winnerSeconds + gapSeconds,
      gapSeconds,
    };
  });

  // Re-sort to enforce position ordering matches gap ordering for non-flat.
  return {
    stageIndex: -1, // caller sets
    stageName: stage.name,
    stageType: stage.type,
    distanceKm: stage.distanceKm,
    finishers: stageFinishers,
  };
}

function simulateTTT(input: SimulateStageInput): StageResult {
  const { stage, ridersByTeam, teams, directors, currentYear, rng, eventId, raceCategory } = input;
  const teamScores: { teamId: string; score: number; riders: Rider[] }[] = [];

  for (const [teamId, riders] of Object.entries(ridersByTeam)) {
    const team = teams[teamId];
    const director = team?.directorId ? directors[team.directorId] : undefined;
    if (!team || !riders.length) continue;

    // Captain = highest leadership rider in race
    const captain = [...riders].sort((a, b) => b.leadership - a.leadership)[0];
    const captainBoost = captain.leadership / 100;

    // Average effective TT skill of the squad
    let avgTT = 0;
    for (const r of riders) {
      avgTT += getEffectiveSkill(r, director, 'timeTrial', currentYear);
    }
    avgTT /= riders.length;
    let avgEnd = 0;
    for (const r of riders) {
      avgEnd += getEffectiveSkill(r, director, 'endurance', currentYear);
    }
    avgEnd /= riders.length;

    const directorTTBoost = director?.boosts.timeTrial ?? 0;
    let score = avgTT * 0.6 + avgEnd * 0.2 + captainBoost * 25 + directorTTBoost * 50;

    // Team identity bonus on TTT.
    score *= teamBonusMultiplier(team, 'ttt', eventId, raceCategory);

    score += gaussian(rng) * 3;
    teamScores.push({ teamId, score, riders });
  }

  teamScores.sort((a, b) => b.score - a.score);
  const winnerScore = teamScores[0]?.score ?? 0;
  const winnerSeconds = (stage.distanceKm / baseSpeed('ttt')) * 3600;

  // Each team gets a single time. All its riders share that time.
  const finishers: StageFinisher[] = [];
  let position = 0;
  for (const ts of teamScores) {
    const gap = (winnerScore - ts.score) * 4; // 4 seconds per score point for TTT
    const teamGap = Math.max(0, gap + Math.abs(gaussian(rng)) * 1.5);
    for (const r of ts.riders) {
      position++;
      finishers.push({
        riderId: r.id,
        teamId: ts.teamId,
        position,
        timeSeconds: winnerSeconds + teamGap,
        gapSeconds: teamGap,
      });
    }
  }

  // Re-sort by time then by position to keep deterministic.
  finishers.sort((a, b) => a.timeSeconds - b.timeSeconds || a.position - b.position);
  finishers.forEach((f, i) => (f.position = i + 1));

  return {
    stageIndex: -1,
    stageName: stage.name,
    stageType: stage.type,
    distanceKm: stage.distanceKm,
    finishers,
  };
}

function baseSpeed(type: StageType): number {
  switch (type) {
    case 'flat': return 44;
    case 'hilly': return 41;
    case 'mountain': return 36;
    case 'mountain-hard': return 32;
    case 'itt': return 50;
    case 'ttt': return 53;
    case 'cobbles': return 42;
  }
}

// ============================================================================
// CLASSIFICATIONS
// ============================================================================

// Rebuild GC and team GC from all stage results so far.
export function buildClassifications(
  participants: Rider[],
  stageResults: StageResult[],
  currentYear: number,
): { gc: RaceClassification[]; teamGc: TeamClassification[] } {
  // Cumulative time per rider
  const totalTime: Record<string, number> = {};
  const pointsClass: Record<string, number> = {};
  const mountainClass: Record<string, number> = {};

  for (const r of participants) {
    totalTime[r.id] = 0;
    pointsClass[r.id] = 0;
    mountainClass[r.id] = 0;
  }

  // Points per stage finishing position (for sprinter jersey)
  const stagePoints = [50, 40, 32, 26, 22, 18, 14, 10, 8, 6, 4, 2, 1];
  // Mountain points (only mountain stages, top 5 only)
  const mountainPoints = [25, 20, 15, 10, 5];

  for (const sr of stageResults) {
    for (const f of sr.finishers) {
      totalTime[f.riderId] = (totalTime[f.riderId] ?? 0) + f.timeSeconds;
    }
    // Points classification
    sr.finishers.slice(0, stagePoints.length).forEach((f, i) => {
      const mult = sr.stageType === 'flat' ? 1.5 : 1;
      pointsClass[f.riderId] = (pointsClass[f.riderId] ?? 0) + stagePoints[i] * mult;
    });
    // Mountain classification (only mountain stages)
    if (sr.stageType === 'mountain' || sr.stageType === 'mountain-hard') {
      sr.finishers.slice(0, mountainPoints.length).forEach((f, i) => {
        mountainClass[f.riderId] = (mountainClass[f.riderId] ?? 0) + mountainPoints[i];
      });
    }
  }

  // GC sorted by time
  const gcEntries = participants
    .filter((r) => totalTime[r.id] !== undefined)
    .map((r) => ({
      riderId: r.id,
      teamId: r.teamId,
      totalTimeSeconds: totalTime[r.id],
      pointsClassification: pointsClass[r.id],
      mountainClassification: mountainClass[r.id],
      isYoung: phaseLabel(r, currentYear) === 'rookie',
    }))
    .sort((a, b) => a.totalTimeSeconds - b.totalTimeSeconds);

  const winnerTime = gcEntries[0]?.totalTimeSeconds ?? 0;
  const gc: RaceClassification[] = gcEntries.map((e, i) => ({
    riderId: e.riderId,
    teamId: e.teamId,
    position: i + 1,
    totalTimeSeconds: e.totalTimeSeconds,
    gapSeconds: e.totalTimeSeconds - winnerTime,
    pointsClassification: e.pointsClassification,
    mountainClassification: e.mountainClassification,
    isYoung: e.isYoung,
  }));

  // Team GC: sum of top 3 riders per team
  const teamTotals: Record<string, number[]> = {};
  for (const e of gc) {
    if (!teamTotals[e.teamId]) teamTotals[e.teamId] = [];
    teamTotals[e.teamId].push(e.totalTimeSeconds);
  }
  const teamRows: { teamId: string; totalTimeSeconds: number }[] = [];
  for (const [teamId, times] of Object.entries(teamTotals)) {
    times.sort((a, b) => a - b);
    const top3 = times.slice(0, 3);
    if (top3.length < 3) continue;
    teamRows.push({ teamId, totalTimeSeconds: top3.reduce((a, b) => a + b, 0) });
  }
  teamRows.sort((a, b) => a.totalTimeSeconds - b.totalTimeSeconds);
  const teamWinnerTime = teamRows[0]?.totalTimeSeconds ?? 0;
  const teamGc: TeamClassification[] = teamRows.map((t, i) => ({
    teamId: t.teamId,
    position: i + 1,
    totalTimeSeconds: t.totalTimeSeconds,
    gapSeconds: t.totalTimeSeconds - teamWinnerTime,
  }));

  return { gc, teamGc };
}

function phaseLabel(rider: Rider, currentYear: number): 'rookie' | 'prime' | 'veteran' {
  const yearsIn = currentYear - rider.careerStartYear;
  const remaining = rider.careerLength - yearsIn;
  if (yearsIn < 2) return 'rookie';
  if (remaining <= 2) return 'veteran';
  return 'prime';
}
