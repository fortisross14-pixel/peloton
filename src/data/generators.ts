import type {
  Rarity,
  Skills,
  SkillKey,
  Rider,
  Director,
  Team,
  Universe,
  CareerPhase,
  Archetype,
  RaceSpecialty,
} from '../types';
import { RARITY_WEIGHTS, SKILL_KEYS, ARCHETYPE_WEIGHTS, RACE_SPECIALTY_WEIGHTS } from '../types';
import {
  makeRng,
  randInt,
  randFloat,
  pick,
  weightedPick,
  shuffle,
  type Rng,
} from '../utils/random';
import {
  NATIONALITIES,
  FIRST_NAMES_BY_NATION,
  LAST_NAMES_BY_NATION,
  TEAM_NAME_POOLS,
  DIRECTOR_LASTNAMES,
} from './names';
import { buildBaseCalendar } from './calendar';
import { TEAM_TEMPLATES, type TeamTemplate } from './teams';

// ============================================================================
// RIDER GENERATION
// ============================================================================

/** Favored skills for each archetype. These get the "specialty" range. */
const ARCHETYPE_FAVORED: Record<Archetype, SkillKey[]> = {
  climber:    ['climbing', 'descending'],
  sprinter:   ['sprinting', 'endurance'],
  rouleur:    ['timeTrial', 'cobbles'],
  puncheur:   ['breakaway', 'climbing'],
  allrounder: [], // no peak — all skills sit at the avg range
};

/**
 * Skill roll ranges by rarity:
 *   { favored: [min,max], other: [min,max] }
 * Allrounders use a blended range for all skills.
 */
const SKILL_RANGES: Record<Rarity, { favored: [number, number]; other: [number, number]; allround: [number, number] }> = {
  generational: { favored: [98, 100], other: [91, 98], allround: [95, 100] },
  legend:   { favored: [95, 100], other: [78, 88], allround: [82, 92] },
  epic:     { favored: [90, 95],  other: [74, 84], allround: [78, 86] },
  rare:     { favored: [85, 90],  other: [70, 80], allround: [74, 82] },
  uncommon: { favored: [80, 85],  other: [60, 70], allround: [66, 74] },
  common:   { favored: [70, 80],  other: [45, 60], allround: [55, 65] },
};

const NON_ELITE_RARITY_WEIGHTS: Record<Rarity, number> = {
  generational: 0,
  legend: 0,
  epic: 0.18,
  rare: 0.30,
  uncommon: 0.32,
  common: 0.20,
};

function averageSkills(skills: Skills): number {
  return SKILL_KEYS.reduce((sum, key) => sum + skills[key], 0) / SKILL_KEYS.length;
}

function initialGenerationalTarget(rng: Rng): number {
  const roll = rng();
  return roll < 0.50 ? 0 : roll < 0.90 ? 1 : 2;
}

function initialLegendTarget(rng: Rng): number {
  return rng() < 0.5 ? 3 : 4;
}

function rollSkills(rng: Rng, rarity: Rarity, archetype: Archetype): Skills {
  const skills: Partial<Skills> = {};
  const allKeys = [...SKILL_KEYS];
  const ranges = SKILL_RANGES[rarity];

  if (archetype === 'allrounder') {
    // Allrounders have no peak — every skill rolls in the "allround" range.
    for (const k of allKeys) {
      skills[k] = randInt(rng, ranges.allround[0], ranges.allround[1]);
    }
    return skills as Skills;
  }

  const favored = new Set(ARCHETYPE_FAVORED[archetype]);
  for (const k of allKeys) {
    if (favored.has(k)) {
      skills[k] = randInt(rng, ranges.favored[0], ranges.favored[1]);
    } else {
      skills[k] = randInt(rng, ranges.other[0], ranges.other[1]);
    }
  }
  return skills as Skills;
}

let nextId = 1;
function makeId(prefix: string): string {
  return `${prefix}_${(nextId++).toString(36)}_${Math.floor(Math.random() * 36 ** 4).toString(36)}`;
}

export function generateRider(
  rng: Rng,
  currentYear: number,
  options: {
    forcedRarity?: Rarity;
    forcedAge?: number;
    forcedArchetype?: Archetype;
    forcedRaceSpecialty?: RaceSpecialty;
    nationality?: string;
    /** If provided, ~50% chance the rider is from one of these nations, else random. */
    homeBiasNations?: string[];
    /** If provided, bumps rarity roll one tier up by this probability (0-1). */
    rarityBoost?: number;
    /** Normal roster generation excludes Legend/Generational unless explicitly forced. */
    allowEliteRoll?: boolean;
  } = {},
): Rider {
  let rarity = options.forcedRarity;
  if (!rarity) {
    const weights = options.allowEliteRoll ? RARITY_WEIGHTS : NON_ELITE_RARITY_WEIGHTS;
    rarity = weightedPick(rng, weights);
    // Youth development can improve a normal prospect, but it cannot create
    // a new Legend/Generational outside the controlled elite rookie queue.
    if (options.rarityBoost && rng() < options.rarityBoost) {
      const upgrade: Record<Rarity, Rarity> = {
        common: 'uncommon',
        uncommon: 'rare',
        rare: 'epic',
        epic: options.allowEliteRoll ? 'legend' : 'epic',
        legend: options.allowEliteRoll ? 'generational' : 'legend',
        generational: 'generational',
      };
      rarity = upgrade[rarity];
    }
  }

  const archetype = options.forcedArchetype ?? weightedPick(rng, ARCHETYPE_WEIGHTS);
  const raceSpecialty = options.forcedRaceSpecialty ?? weightedPick(rng, RACE_SPECIALTY_WEIGHTS);

  // Resolve nationality with home bias
  let nationality: string;
  if (options.nationality) {
    nationality = options.nationality;
  } else if (options.homeBiasNations && options.homeBiasNations.length > 0 && rng() < 0.5) {
    nationality = pick(rng, options.homeBiasNations);
  } else {
    nationality = pick(rng, NATIONALITIES);
  }

  const firstName = pick(rng, FIRST_NAMES_BY_NATION[nationality]);
  const lastName = pick(rng, LAST_NAMES_BY_NATION[nationality]);
  const skills = rollSkills(rng, rarity, archetype);
  // Leadership and consistency rolled independently — common can have 90 leadership.
  const leadership = randInt(rng, 30, 99);
  const consistency = randInt(rng, 40, 95);

  // Age: if forced, use forcedAge; otherwise rookie (20)
  const age = options.forcedAge ?? randInt(rng, 20, 21);
  const yearsAlreadyIn = age - 20;
  const minLength = Math.max(9, yearsAlreadyIn + 1);
  const careerLength = Math.min(12, randInt(rng, minLength, 12));
  const careerStartYear = currentYear - yearsAlreadyIn;

  return {
    id: makeId('r'),
    name: `${firstName} ${lastName}`,
    nationality,
    rarity,
    archetype,
    raceSpecialty,
    skills,
    baseOverall: averageSkills(skills),
    seasonForm: randFloat(rng, 0.95, 1.05),
    careerMomentum: randFloat(rng, 0.985, 1.015),
    stamina: 100,
    leadership,
    consistency,
    careerStartYear,
    careerLength,
    age,
    teamId: '',
    phase: computePhase(age, careerStartYear, careerLength, currentYear),
    retired: false,
    history: [],
    totals: {
      points: 0, stageWins: 0, raceWins: 0, gtWins: 0,
      tourWins: 0, giroWins: 0, vueltaWins: 0, monumentWins: 0,
      youthJerseys: 0, mountainJerseys: 0, pointsJerseys: 0,
    },
  };
}

export function computePhase(
  age: number,
  careerStartYear: number,
  careerLength: number,
  currentYear: number,
): CareerPhase {
  const yearsIn = currentYear - careerStartYear;
  if (yearsIn < 0) return 'rookie';
  if (yearsIn >= careerLength) return 'retired';
  if (yearsIn < 2) return 'rookie';
  if (yearsIn >= careerLength - 2) return 'veteran';
  return 'prime';
}

// Performance multiplier based on phase + how deep into veteran years.
export function phaseMultiplier(rider: Rider, currentYear: number): number {
  const yearsIn = currentYear - rider.careerStartYear;
  const remaining = rider.careerLength - yearsIn;
  if (yearsIn < 0) return 0.8;
  if (yearsIn === 0) return 0.8;          // first-year rookie
  if (yearsIn === 1) return 0.9;           // sophomore development
  if (remaining > 2) return 1.0;           // prime
  if (remaining === 2) return 0.9;         // first veteran year
  if (remaining === 1) return 0.8;         // last year
  return 0; // retired
}

// ============================================================================
// DIRECTOR GENERATION
// ============================================================================

const ALL_SPECIALTIES: Director['specialty'][] = [
  'gt', 'classics', 'sprints', 'mountains', 'cobbles', 'tt', 'youth', 'allround',
];

// Specialty determines which skills the "standout" boosts go to.
// A `gt` director's standout skills are climbing+endurance+timeTrial.
// A `cobbles` director is cobbles+endurance+sprinting.
const SPECIALTY_FAVORED: Record<Director['specialty'], SkillKey[]> = {
  gt:        ['climbing', 'endurance', 'timeTrial'],
  classics:  ['breakaway', 'endurance', 'climbing'],
  sprints:   ['sprinting', 'endurance'],
  mountains: ['climbing', 'descending'],
  cobbles:   ['cobbles', 'endurance', 'sprinting'],
  tt:        ['timeTrial', 'endurance'],
  youth:     ['endurance', 'climbing'],
  allround:  ['climbing', 'sprinting', 'timeTrial'],
};

function rollDirectorBoosts(
  rng: Rng,
  rarity: Rarity,
  specialty: Director['specialty'],
): Record<SkillKey, number> {
  const boosts: Partial<Record<SkillKey, number>> = {};
  const keys = [...SKILL_KEYS];
  const favored = SPECIALTY_FAVORED[specialty];

  if (rarity === 'legend') {
    // All skills 5%, favored skills get a small extra (capped at 6%)
    for (const k of keys) boosts[k] = favored.includes(k) ? 0.06 : 0.05;
  } else if (rarity === 'epic') {
    // Favored skills at 5%, rest 3%
    for (const k of keys) boosts[k] = favored.includes(k) ? 0.05 : 0.03;
  } else if (rarity === 'rare') {
    // Favored at 3%, one non-favored at 1%, rest 3%
    const dip = pick(rng, keys.filter((k) => !favored.includes(k)));
    for (const k of keys) boosts[k] = k === dip ? 0.01 : 0.03;
  } else if (rarity === 'uncommon') {
    // Favored at 3%, rest 1%
    for (const k of keys) boosts[k] = favored.includes(k) ? 0.03 : 0.01;
  } else {
    // common: favored at 2%, rest 1%
    for (const k of keys) boosts[k] = favored.includes(k) ? 0.02 : 0.01;
  }
  return boosts as Record<SkillKey, number>;
}

export function generateDirector(
  rng: Rng,
  options: { forcedSpecialty?: Director['specialty']; forcedRarity?: Rarity } = {},
): Director {
  const rarity = options.forcedRarity ?? weightedPick(rng, RARITY_WEIGHTS);
  const specialty = options.forcedSpecialty ?? pick(rng, ALL_SPECIALTIES);
  const nationality = pick(rng, NATIONALITIES);
  const firstName = pick(rng, FIRST_NAMES_BY_NATION[nationality]);
  const lastName = pick(rng, DIRECTOR_LASTNAMES);
  return {
    id: makeId('d'),
    name: `${firstName} ${lastName}`,
    nationality,
    rarity,
    specialty,
    boosts: rollDirectorBoosts(rng, rarity, specialty),
    teamId: null,
    yearsActive: 0,
    titlesWon: 0,
  };
}

// ============================================================================
// TEAM GENERATION (from fixed templates)
// ============================================================================

export function generateTeam(template: TeamTemplate): Team {
  return {
    id: `t_${template.shortName.toLowerCase()}`,
    name: template.name,
    shortName: template.shortName,
    nationality: template.nationality,
    primaryColor: template.primaryColor,
    secondaryColor: template.secondaryColor,
    emoji: template.emoji,
    tagline: template.tagline,
    bonus: template.bonus,
    directorId: null,
    riderIds: [],
    history: [],
    totals: {
      points: 0, raceWins: 0, stageWins: 0, gtWins: 0,
      tourWins: 0, giroWins: 0, vueltaWins: 0, monumentWins: 0,
    },
  };
}

// Map a team's bonus to the most natural director specialty for hiring matching.
export function preferredSpecialtyForTeam(team: Team): Director['specialty'] {
  switch (team.bonus.kind) {
    case 'gt-tour':
    case 'gt-giro':
    case 'gt-vuelta':   return 'gt';
    case 'tt-stages':
    case 'precision':   return 'tt';
    case 'cobbles':     return 'cobbles';
    case 'flat':        return 'sprints';
    case 'mountain':    return 'mountains';
    case 'classics':    return 'classics';
    case 'youth':       return 'youth';
    case 'free-agent':
    case 'allterrain':  return 'allround';
  }
}


export function buildEliteRookieQueue(rng: Rng, riders: Rider[]): Rarity[] {
  const active = riders.filter((r) => !r.retired);
  const activeGenerational = active.filter((r) => r.rarity === 'generational').length;
  const activeLegends = active.filter((r) => r.rarity === 'legend').length;

  // Rarity is immutable. Elite numbers are maintained only by introducing
  // elite rookies when careers end — never by promoting or demoting riders.
  let desiredGenerational = activeGenerational;
  if (activeGenerational === 0) {
    // A generational rookie is genuinely rare. Because the rarity remains for
    // a 9-12 year career, a low annual arrival rate keeps roughly half of
    // long-run seasons without one active.
    const roll = rng();
    desiredGenerational = roll < 0.93 ? 0 : roll < 0.995 ? 1 : 2;
  } else if (activeGenerational === 1 && rng() < 0.02) {
    desiredGenerational = 2;
  }
  desiredGenerational = Math.min(2, desiredGenerational);

  let desiredLegends = activeLegends;
  if (activeLegends < 3) desiredLegends = initialLegendTarget(rng);
  else if (activeLegends === 3 && rng() < 0.35) desiredLegends = 4;
  desiredLegends = Math.min(4, Math.max(3, desiredLegends));

  const queue: Rarity[] = [];
  for (let i = activeGenerational; i < desiredGenerational; i++) queue.push('generational');
  for (let i = activeLegends; i < desiredLegends; i++) queue.push('legend');
  return shuffle(rng, queue);
}

// ============================================================================
// UNIVERSE GENERATION
// ============================================================================

const DIRECTOR_POOL_SIZE = 16; // 12 employed + 4 free agents

export function generateUniverse(seed: number, startYear: number = 2026): Universe {
  const rng = makeRng(seed);
  nextId = 1;

  // Build calendar
  const calendar = buildBaseCalendar(rng);

  // Build the 12 fixed teams from templates.
  const teams: Record<string, Team> = {};
  const teamList: Team[] = [];
  for (const template of TEAM_TEMPLATES) {
    const team = generateTeam(template);
    teams[team.id] = team;
    teamList.push(team);
  }

  // Build 16 directors. Each gets a specialty rolled.
  // We bias the first 12 toward the teams' preferred specialties so each team
  // can start with a reasonably-aligned director.
  const directors: Record<string, Director> = {};
  const directorList: Director[] = [];
  for (let i = 0; i < DIRECTOR_POOL_SIZE; i++) {
    let forcedSpecialty: Director['specialty'] | undefined;
    if (i < 12) {
      // Match team i's preferred specialty 50% of the time, else random.
      if (rng() < 0.5) {
        forcedSpecialty = preferredSpecialtyForTeam(teamList[i]);
      }
    }
    const director = generateDirector(rng, { forcedSpecialty });
    directors[director.id] = director;
    directorList.push(director);
  }

  // Assign first 12 directors to the 12 teams.
  // Teams pick the highest-rarity director matching their preferred specialty
  // first; if none match, take the highest-rarity available.
  const availableDirectors = [...directorList];
  for (const team of teamList) {
    const preferred = preferredSpecialtyForTeam(team);
    // Sort: matching specialty first, then by rarity rank.
    const RARITY_RANK: Record<Rarity, number> = {
      generational: 6, legend: 5, epic: 4, rare: 3, uncommon: 2, common: 1,
    };
    availableDirectors.sort((a, b) => {
      const aMatch = a.specialty === preferred ? 1 : 0;
      const bMatch = b.specialty === preferred ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      return RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity];
    });
    const hire = availableDirectors.shift();
    if (hire) {
      hire.teamId = team.id;
      hire.yearsActive = 0;
      team.directorId = hire.id;
    }
  }
  // Remaining directors stay as free agents (teamId = null).

  // Generate 120 riders. Elite rarity is assigned at birth and is never
  // changed later. All remaining riders are capped at Epic during generation.
  const riders: Record<string, Rider> = {};
  const initialGenerational = initialGenerationalTarget(rng);
  const initialLegends = initialLegendTarget(rng);
  const eliteAssignments: Array<Rarity | undefined> = shuffle(rng, [
    ...Array.from({ length: initialGenerational }, () => 'generational' as const),
    ...Array.from({ length: initialLegends }, () => 'legend' as const),
    ...Array.from({ length: 120 - initialGenerational - initialLegends }, () => undefined),
  ]);

  let riderSlot = 0;
  for (const team of teamList) {
    const template = TEAM_TEMPLATES.find((t) => t.shortName === team.shortName)!;
    for (let i = 0; i < 10; i++) {
      const forcedRarity = eliteAssignments[riderSlot++];
      const age = forcedRarity
        ? randInt(rng, forcedRarity === 'generational' ? 21 : 22, forcedRarity === 'generational' ? 27 : 28)
        : randInt(rng, 20, 30);
      const rider = generateRider(rng, startYear, {
        forcedAge: age,
        forcedRarity,
        allowEliteRoll: false,
        homeBiasNations: template.homeBiasNations,
      });
      rider.teamId = team.id;
      team.riderIds.push(rider.id);
      riders[rider.id] = rider;
    }
  }

  return {
    seed,
    currentYear: startYear,
    startYear,
    riders,
    teams,
    directors,
    season: {
      year: startYear,
      currentEventIndex: 0,
      calendar,
      individualPoints: {},
      teamPoints: {},
      activeRace: null,
      completedEvents: [],
    },
    hallOfFame: [],
  };
}
