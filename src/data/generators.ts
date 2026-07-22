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
} from '../types';
import { RARITY_WEIGHTS, SKILL_KEYS, ARCHETYPE_WEIGHTS } from '../types';
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
  gc:         ['climbing', 'timeTrial'],
  rouleur:    ['timeTrial', 'cobbles'],
  puncheur:   ['breakaway', 'climbing'],
  classics:   ['cobbles', 'breakaway', 'endurance'],
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
    nationality?: string;
    /** If provided, ~50% chance the rider is from one of these nations, else random. */
    homeBiasNations?: string[];
    /** If provided, bumps rarity roll one tier up by this probability (0-1). */
    rarityBoost?: number;
  } = {},
): Rider {
  let rarity = options.forcedRarity;
  if (!rarity) {
    rarity = weightedPick(rng, RARITY_WEIGHTS);
    // Apply rarity boost (Nordkraft-style youth pipeline)
    if (options.rarityBoost && rng() < options.rarityBoost) {
      const upgrade: Record<Rarity, Rarity> = {
        common: 'uncommon',
        uncommon: 'rare',
        rare: 'epic',
        epic: 'legend',
        legend: 'generational',
        generational: 'generational',
      };
      rarity = upgrade[rarity];
    }
  }

  const archetype = options.forcedArchetype ?? weightedPick(rng, ARCHETYPE_WEIGHTS);

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
    skills,
    seasonForm: randFloat(rng, 0.95, 1.05),
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


export function rebalanceElitePopulation(rng: Rng, riders: Rider[], preserveExisting = false): void {
  const active = riders.filter((r) => !r.retired);
  const avg = (r: Rider) => SKILL_KEYS.reduce((sum, k) => sum + r.skills[k], 0) / SKILL_KEYS.length;
  const setTier = (r: Rider, rarity: Rarity) => {
    r.rarity = rarity;
    r.skills = rollSkills(rng, rarity, r.archetype);
  };

  let gens = active.filter((r) => r.rarity === 'generational').sort((a, b) => avg(b) - avg(a));
  // Generational status is permanent. Only trim impossible legacy states above two.
  for (const r of gens.slice(2)) setTier(r, 'legend');
  gens = active.filter((r) => r.rarity === 'generational');
  const desiredGenerational = preserveExisting
    ? Math.min(2, gens.length + (gens.length === 0 ? (rng() < 0.50 ? 0 : rng() < 0.80 ? 1 : 2) : gens.length === 1 && rng() < 0.10 ? 1 : 0))
    : (() => { const roll = rng(); return roll < 0.50 ? 0 : roll < 0.90 ? 1 : 2; })();
  const genCandidates = active.filter((r) => r.rarity === 'legend' || r.rarity === 'epic').sort((a, b) => avg(b) - avg(a));
  while (gens.length < desiredGenerational && genCandidates.length) {
    const r = genCandidates.shift()!;
    setTier(r, 'generational');
    gens.push(r);
  }

  const legendTarget = rng() < 0.5 ? 3 : 4;
  let legends = active.filter((r) => r.rarity === 'legend').sort((a, b) => avg(b) - avg(a));
  // Keep established legends unless the active pool somehow exceeds four.
  for (const r of legends.slice(4)) setTier(r, 'epic');
  legends = active.filter((r) => r.rarity === 'legend');
  const legendCandidates = active.filter((r) => r.rarity === 'epic').sort((a, b) => avg(b) - avg(a));
  while (legends.length < legendTarget && legendCandidates.length) {
    const r = legendCandidates.shift()!;
    setTier(r, 'legend');
    legends.push(r);
  }
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

  // Generate 120 riders. Year 1: ages varied 20-30, careers staggered.
  // Each rider rolled with the destination team's homeBiasNations.
  // First, decide team assignments roughly evenly by shuffling slot order.
  const riders: Record<string, Rider> = {};
  const allRiders: Rider[] = [];
  // For each team, generate 10 riders biased toward its home nations.
  for (const team of teamList) {
    const template = TEAM_TEMPLATES.find((t) => t.shortName === team.shortName)!;
    for (let i = 0; i < 10; i++) {
      const age = randInt(rng, 20, 30);
      const rider = generateRider(rng, startYear, {
        forcedAge: age,
        homeBiasNations: template.homeBiasNations,
      });
      rider.teamId = team.id;
      team.riderIds.push(rider.id);
      riders[rider.id] = rider;
      allRiders.push(rider);
    }
  }

  rebalanceElitePopulation(rng, allRiders);

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
