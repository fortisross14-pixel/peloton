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
  Archetype,
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
  const form = rider.seasonForm ?? 1;
  const momentum = rider.careerMomentum ?? 1;
  const stamina = rider.stamina ?? 100;
  // Below 85 stamina performance begins fading; at 30 it is roughly a 14% hit.
  const staminaMul = stamina >= 85 ? 1 : 1 - ((85 - stamina) / 55) * 0.14;
  return base * phaseMul * form * momentum * staminaMul * (1 + directorBoost);
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

/**
 * Archetype-based stage score adjustment, applied to the rawScore BEFORE
 * variance. Positive values = bonus (rider in their element). Negative = soft
 * penalty (rider saving energy / out of comfort zone).
 *
 * This is what makes sprinters lose GC time on mountains even though their
 * climbing skill is decent — they aren't trying.
 */
function archetypeStageAdjustment(arch: Archetype, stageType: StageType): number {
  switch (arch) {
    case 'sprinter':
      if (stageType === 'mountain-hard') return -8;
      if (stageType === 'mountain') return -5;
      if (stageType === 'hilly') return -1;
      if (stageType === 'flat') return +5;
      if (stageType === 'itt') return -3;
      return 0;
    case 'climber':
      if (stageType === 'mountain-hard') return +6;
      if (stageType === 'mountain') return +4;
      if (stageType === 'flat') return -2;
      if (stageType === 'cobbles') return -2;
      return 0;
    case 'rouleur':
      if (stageType === 'itt') return +4;
      if (stageType === 'cobbles') return +6;
      if (stageType === 'mountain-hard') return -3;
      return 0;
    case 'puncheur':
      if (stageType === 'hilly') return +6;
      if (stageType === 'mountain-hard') return -2;
      if (stageType === 'flat') return -1;
      return 0;
    case 'allrounder':
      return 0;
  }
}

/**
 * Race-duration specialty is independent from terrain profile. The bonus is
 * large in one-day races, but deliberately concentrated on GC-relevant stages
 * in stage races so a classics specialist can still win an isolated stage.
 */
export function raceSpecialtyStageAdjustment(
  rider: Rider,
  category: CalendarEvent['category'],
  stageType: StageType,
): number {
  const isOneDay = category === 'classic' || category === 'monument';
  let adjustment = 0;

  if (isOneDay && rider.raceSpecialty === 'classics') adjustment += 8.0;
  if (category === 'week-stage' && rider.raceSpecialty === 'week-stage') {
    adjustment += ['mountain', 'mountain-hard', 'itt', 'ttt'].includes(stageType) ? 4.2 : 0.9;
  }
  if (category === 'grand-tour' && rider.raceSpecialty === 'grand-tour') {
    adjustment += ['mountain', 'mountain-hard', 'itt', 'ttt'].includes(stageType) ? 5.3 : 1.2;
  }

  // In one-day races, terrain profile is the stronger of the two dimensions.
  // A non-rouleur can win Roubaix, but a rouleur should usually be favored.
  if (isOneDay) {
    const terrainMatch =
      (stageType === 'cobbles' && rider.archetype === 'rouleur') ||
      (stageType === 'hilly' && rider.archetype === 'puncheur') ||
      ((stageType === 'mountain' || stageType === 'mountain-hard') && rider.archetype === 'climber') ||
      (stageType === 'flat' && rider.archetype === 'sprinter');
    if (terrainMatch) adjustment += stageType === 'cobbles' ? 9.0 : 6.0;
  }

  // The Indurain/Pogačar profile: a balanced rider becomes a true GC force
  // only when that balanced terrain profile is paired with the matching
  // stage-race specialty.
  if (rider.archetype === 'allrounder' && category === 'week-stage' && rider.raceSpecialty === 'week-stage') {
    adjustment += ['mountain', 'mountain-hard', 'itt', 'ttt'].includes(stageType) ? 1.7 : 0.4;
  }
  if (rider.archetype === 'allrounder' && category === 'grand-tour' && rider.raceSpecialty === 'grand-tour') {
    adjustment += ['mountain', 'mountain-hard', 'itt', 'ttt'].includes(stageType) ? 2.4 : 0.55;
  }

  return adjustment;
}


function eventFormMultiplier(riderId: string, eventId: string, year: number): number {
  let h = 2166136261;
  const text = `${riderId}:${eventId}:${year}`;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const unit = (h >>> 0) / 0xffffffff;
  return 0.94 + unit * 0.12;
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
    rawScore *= eventFormMultiplier(rider.id, eventId, currentYear);

    // Apply team identity bonus (compound with director).
    const teamMult = teamBonusMultiplier(team, stage.type, eventId, raceCategory);
    rawScore *= teamMult;

    // Archetype-based score adjustments. These are the difference between a
    // raw-skills sim and one that actually behaves like real cycling: a
    // sprinter can have decent climbing skill (78) but they save legs on
    // mountain stages and lose time; a climber doesn't contest bunch sprints.
    rawScore += archetypeStageAdjustment(rider.archetype, stage.type);
    rawScore += raceSpecialtyStageAdjustment(rider, raceCategory, stage.type);

    // Random variance — wider for low-consistency riders.
    const variance = (100 - rider.consistency) * 0.28 + 5;
    rawScore += gaussian(rng) * variance;

    // Grand Tour fatigue: rider with low endurance fades in week 3.
    if (isGT) {
      const enduranceFactor = (rider.skills.endurance - 70) / 30;
      const specialtyRelief = rider.raceSpecialty === 'grand-tour' ? 0.66 : 1;
      const fatigueLoss = (1 - enduranceFactor) * fatigueProgress * 5.5 * specialtyRelief;
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

    // On flat stages, lump the peloton: anyone within 6s of winner gets the
    // same time. We still need each rider to have a unique time so GC sorting
    // preserves the stage finish order — give them a sub-second tiebreaker
    // based on position (0.001s per place). The UI shows gaps < 1s as "s.t."
    if (stage.type === 'flat' && gapSeconds < 6) {
      gapSeconds = i * 0.001;
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

    // Team identity bonus and the squad's race-duration suitability on TTT.
    score *= teamBonusMultiplier(team, 'ttt', eventId, raceCategory);
    score += riders.reduce(
      (sum, rider) => sum + raceSpecialtyStageAdjustment(rider, raceCategory, 'ttt'),
      0,
    ) / riders.length;

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

  // Points per stage finishing position. Only top 5 score.
  // Sprinters get +30% on flat & hilly stages where they actually contest.
  // Climbers get +30% on mountain stages for the KOM-feeding placements.
  const stagePointsTable = [50, 30, 20, 12, 6];

  // Base "winner of this terrain" multiplier — flat is the sprinter day,
  // hilly the puncheur day, mountain the climber's playground, ITT a TT day.
  const STAGE_TYPE_POINTS_MULT: Record<string, number> = {
    flat: 1.0,
    hilly: 0.7,
    mountain: 0.55,
    'mountain-hard': 0.5,
    itt: 0.6,
    ttt: 0.3,
    cobbles: 0.85,
  };

  // Mountain points (only mountain stages, top 3 only). Mountain-hard doubles.
  const mountainPointsTable = [25, 15, 8];

  // Helper: archetype-specific multipliers for the classifications
  function pointsMultFor(arch: Archetype, stageType: string): number {
    if (arch === 'sprinter' && (stageType === 'flat' || stageType === 'hilly')) return 1.3;
    if (arch === 'puncheur' && stageType === 'hilly') return 1.15;
    return 1.0;
  }
  function mountainMultFor(arch: Archetype): number {
    if (arch === 'climber') return 1.3;
    if (arch === 'puncheur') return 1.1;
    // sprinter/rouleur/classics get base — they barely score here anyway
    return 1.0;
  }
  // Quick lookup: rider id -> archetype
  const archByRider: Record<string, Archetype> = {};
  for (const r of participants) archByRider[r.id] = r.archetype;

  for (const sr of stageResults) {
    for (const f of sr.finishers) {
      totalTime[f.riderId] = (totalTime[f.riderId] ?? 0) + f.timeSeconds;
    }
    // Points classification (only top 5 finishers, weighted by stage type)
    const baseMult = STAGE_TYPE_POINTS_MULT[sr.stageType] ?? 1.0;
    sr.finishers.slice(0, stagePointsTable.length).forEach((f, i) => {
      const archMult = pointsMultFor(archByRider[f.riderId] ?? 'allrounder', sr.stageType);
      const award = stagePointsTable[i] * baseMult * archMult;
      pointsClass[f.riderId] = (pointsClass[f.riderId] ?? 0) + award;
    });
    // Mountain classification: only mountain stages, top 3 only.
    // Mountain-hard stages (queen stages) award double mountain points.
    if (sr.stageType === 'mountain' || sr.stageType === 'mountain-hard') {
      const doubleIt = sr.stageType === 'mountain-hard' ? 2 : 1;
      sr.finishers.slice(0, mountainPointsTable.length).forEach((f, i) => {
        const archMult = mountainMultFor(archByRider[f.riderId] ?? 'allrounder');
        const award = mountainPointsTable[i] * doubleIt * archMult;
        mountainClass[f.riderId] = (mountainClass[f.riderId] ?? 0) + award;
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
