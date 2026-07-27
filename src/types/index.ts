// ============================================================================
// CORE TYPES
// ============================================================================

export type Rarity = 'generational' | 'legend' | 'epic' | 'rare' | 'uncommon' | 'common';

/**
 * Terrain profile — the rider's physical/technical identity. This is kept
 * separate from race-duration specialty so a rouleur can be a classics,
 * one-week, or Grand Tour specialist.
 */
export type Archetype =
  | 'climber'         // mountain stages, KOM jersey
  | 'sprinter'        // flat stages, Points jersey
  | 'rouleur'         // ITT specialist and strong on cobbles
  | 'puncheur'        // punchy on short climbs and hilly finishes
  | 'allrounder';     // balanced across terrain

export type RaceSpecialty = 'classics' | 'week-stage' | 'grand-tour';

export const RARITY_ORDER: Rarity[] = ['generational', 'legend', 'epic', 'rare', 'uncommon', 'common'];

// Probability distribution for rarity rolls (mirrors CL game vibe)
export const RARITY_WEIGHTS: Record<Rarity, number> = {
  generational: 0, // controlled globally: never more than two active
  legend: 0.03,
  epic: 0.12,
  rare: 0.25,
  uncommon: 0.35,
  common: 0.25,
};

export const ARCHETYPE_WEIGHTS: Record<Archetype, number> = {
  climber: 0.22,
  sprinter: 0.19,
  rouleur: 0.18,
  puncheur: 0.18,
  allrounder: 0.23,
};

export const RACE_SPECIALTY_WEIGHTS: Record<RaceSpecialty, number> = {
  classics: 0.36,
  'week-stage': 0.29,
  'grand-tour': 0.35,
};

export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  climber: 'Climber',
  sprinter: 'Sprinter',
  rouleur: 'Rouleur',
  puncheur: 'Puncheur',
  allrounder: 'All-rounder',
};

export const ARCHETYPE_TAGLINES: Record<Archetype, string> = {
  climber: 'Lives in the mountains and contests KOM jerseys.',
  sprinter: 'Explosive in bunch finishes and flat stages.',
  rouleur: 'Powerful against the clock and over the cobbles.',
  puncheur: 'Punchy on short climbs and hilly finishes.',
  allrounder: 'Versatile across terrain without one narrow weakness.',
};

export const RACE_SPECIALTY_LABELS: Record<RaceSpecialty, string> = {
  classics: 'Classics Specialist',
  'week-stage': 'One-week Specialist',
  'grand-tour': 'Grand Tour Specialist',
};

export const RACE_SPECIALTY_TAGLINES: Record<RaceSpecialty, string> = {
  classics: 'Peaks for one-day races and monuments.',
  'week-stage': 'Excels over compact multi-day stage races.',
  'grand-tour': 'Built to sustain GC form across three weeks.',
};

// ============================================================================
// SKILLS
// ============================================================================

export type SkillKey =
  | 'climbing'
  | 'sprinting'
  | 'timeTrial'
  | 'cobbles'
  | 'endurance'
  | 'descending'
  | 'breakaway';

export const SKILL_KEYS: SkillKey[] = [
  'climbing',
  'sprinting',
  'timeTrial',
  'cobbles',
  'endurance',
  'descending',
  'breakaway',
];

export const SKILL_LABELS: Record<SkillKey, string> = {
  climbing: 'Climbing',
  sprinting: 'Sprinting',
  timeTrial: 'Time Trial',
  cobbles: 'Cobbles',
  endurance: 'Endurance',
  descending: 'Descending',
  breakaway: 'Breakaway',
};

export type Skills = Record<SkillKey, number>;

// ============================================================================
// RIDER
// ============================================================================

export type CareerPhase = 'rookie' | 'prime' | 'veteran' | 'retired';

export interface RiderSeasonStats {
  year: number;
  age: number;
  teamId: string;
  phase: CareerPhase;
  seasonForm?: number;
  careerMomentum?: number;
  annualOverall?: number;
  points: number;
  stageWins: number;
  raceWins: number;
  // Which races they won this year (event ids)
  raceWinsBy: string[];
  // Stage wins broken out: { eventId, stageType, count }
  stageWinsByDetail: { eventId: string; stageType: string; count: number }[];
  // Grand Tour finishes: keyed by event id
  grandTourFinishes: Record<string, number>; // event id -> GC position
  // Jerseys won (count, since rookie can win youth multiple GTs)
  jerseys: {
    gc: string[];        // event ids where finished 1st
    points: string[];    // sprinter jersey wins
    mountain: string[];  // KOM jersey wins
    youth: string[];     // youth jersey wins
  };
}

export interface Rider {
  id: string;
  name: string;
  nationality: string;
  rarity: Rarity;            // immutable for the full career
  archetype: Archetype;      // immutable terrain profile
  raceSpecialty: RaceSpecialty; // immutable race-duration specialty
  skills: Skills;            // immutable base skills, 1-100
  baseOverall: number;       // immutable average of base skills
  seasonForm: number;        // annual shape multiplier, 0.95-1.05
  careerMomentum: number;    // slower-moving performance multiplier, 0.98-1.02
  stamina: number;           // 0-100; depleted by racing, recovers between events
  leadership: number;      // 1-99, independent from rarity
  consistency: number;     // 1-99, variance reducer
  // Career
  careerStartYear: number; // year they entered as rookie
  careerLength: number;    // 9-12 years total
  age: number;             // current age (changes each season)
  teamId: string;          // current team
  phase: CareerPhase;      // computed each season
  retired: boolean;
  // History
  history: RiderSeasonStats[];
  // Lifetime totals (for fast leaderboards)
  totals: {
    points: number;
    stageWins: number;
    raceWins: number;
    gtWins: number;
    tourWins: number;
    giroWins: number;
    vueltaWins: number;
    monumentWins: number;
    youthJerseys: number;
    mountainJerseys: number;
    pointsJerseys: number;
  };
}

// ============================================================================
// DIRECTOR
// ============================================================================

// Directors have a specialty that helps teams match identity when hiring.
export type DirectorSpecialty =
  | 'gt'        // Grand Tour mastermind
  | 'classics'  // One-day specialist
  | 'sprints'   // Sprint trains
  | 'mountains' // Climbing tactics
  | 'cobbles'   // Cobbled hardman handler
  | 'tt'        // Time trial expert
  | 'youth'     // Develops young riders
  | 'allround'; // Generalist

export interface Director {
  id: string;
  name: string;
  nationality: string;
  rarity: Rarity;
  specialty: DirectorSpecialty;
  // Per-skill boost percentage (0.01 - 0.05)
  boosts: Record<SkillKey, number>;
  // null = unemployed (free agent)
  teamId: string | null;
  // Career stats for hiring decisions
  yearsActive: number;
  titlesWon: number; // # of seasons their team finished #1
}

// ============================================================================
// TEAM IDENTITY (fixed, baked into engine)
// ============================================================================

export type TeamBonusKind =
  | 'gt-tour'     // +X% during Tour de France
  | 'gt-giro'     // +X% during Giro
  | 'gt-vuelta'   // +X% during Vuelta
  | 'tt-stages'   // +X% on ITT and TTT
  | 'cobbles'     // +X% on cobbled stages
  | 'flat'        // +X% on flat stages
  | 'mountain'    // +X% on mountain stages
  | 'classics'    // +X% on one-day classics & monuments
  | 'youth'       // Better rookie tier rolls
  | 'free-agent'  // First pick of free agents in offseason
  | 'precision'   // +1.5% all stages, +3% on TT
  | 'allterrain'; // +1% on every stage type

export interface TeamBonus {
  kind: TeamBonusKind;
  amount: number; // percentage as decimal (0.03 = 3%)
  label: string;
  description: string;
}

// ============================================================================
// TEAM
// ============================================================================

export interface TeamSeasonStats {
  year: number;
  points: number;
  raceWins: number;
  stageWins: number;
  ranking: number;
  riderIds: string[];
  // Which races team won (rider on this team finished 1st GC)
  raceWinsBy: string[];
  // Stage wins broken out: { eventId, stageType, count }
  stageWinsByDetail: { eventId: string; stageType: string; count: number }[];
}

export interface Team {
  id: string;
  name: string;
  shortName: string;     // 3-letter code
  nationality: string;   // home country
  primaryColor: string;  // hex
  secondaryColor: string;
  emoji: string;         // visual identifier (flag or symbol)
  tagline: string;       // short identity line
  bonus: TeamBonus;      // team's strategic identity bonus
  directorId: string | null;
  riderIds: string[];    // current roster
  history: TeamSeasonStats[];
  totals: {
    points: number;
    raceWins: number;
    stageWins: number;
    gtWins: number;
    tourWins: number;
    giroWins: number;
    vueltaWins: number;
    monumentWins: number;
  };
}

// ============================================================================
// EVENTS / CALENDAR
// ============================================================================

export type EventCategory = 'grand-tour' | 'week-stage' | 'classic' | 'monument';

export type StageType =
  | 'flat'           // bunch sprint
  | 'hilly'          // puncheur or breakaway
  | 'mountain'       // climbers
  | 'mountain-hard'  // pure climbers, big gaps
  | 'itt'            // individual time trial
  | 'ttt'            // team time trial
  | 'cobbles';       // cobbled stages or classics

export interface StageDefinition {
  type: StageType;
  distanceKm: number;
  name: string;
}

export interface CalendarEvent {
  id: string;
  name: string;
  shortName: string;
  category: EventCategory;
  country: string;
  month: number;        // 1-12
  weekInMonth: number;  // ordering within month
  ridersPerTeam: number;
  stages: StageDefinition[];
  // How many UI "steps" to break stage simulation into
  // grand-tour = 7 steps of 3 stages, week-stage = 2 steps, classic = 1
  stepsCount: number;
  // Points table key
  prestige: number; // 1.0 = baseline; Tour = 1.5, Giro/Vuelta = 1.3, Monument = 0.8, etc.
  // Whether this event awards jerseys
  awardsJerseys: boolean;
}

// ============================================================================
// RACE STATE
// ============================================================================

export interface StageResult {
  stageIndex: number;
  stageName: string;
  stageType: StageType;
  distanceKm: number;
  // ordered finishing positions
  finishers: StageFinisher[];
}

export interface StageFinisher {
  riderId: string;
  teamId: string;
  position: number;
  timeSeconds: number;     // total elapsed time on this stage
  gapSeconds: number;      // gap from winner
}

export interface RaceClassification {
  riderId: string;
  teamId: string;
  position: number;
  totalTimeSeconds: number;
  gapSeconds: number;
  // Classification points (for jerseys)
  pointsClassification: number;
  mountainClassification: number;
  isYoung: boolean;
}

export interface TeamClassification {
  teamId: string;
  position: number;
  totalTimeSeconds: number;
  gapSeconds: number;
}

export interface RaceState {
  eventId: string;
  year: number;
  participants: string[]; // rider ids
  // Already-completed stage results
  stageResults: StageResult[];
  // Cumulative classifications
  gc: RaceClassification[];           // general classification
  teamGc: TeamClassification[];       // team classification
  // Stage tracker
  currentStep: number;       // 0-indexed step we're about to simulate
  totalSteps: number;
  // After-event jersey winners (set when race finishes)
  jerseys?: {
    gc: string;
    points: string;
    mountain: string;
    youth: string | null;
    teamWinnerId: string;
  };
  // Tracks stage wins per rider in this race
  stageWinsByRider: Record<string, number>;
  finished: boolean;
}

// ============================================================================
// SEASON
// ============================================================================

export interface SeasonState {
  year: number;
  currentEventIndex: number;        // index into calendar
  calendar: CalendarEvent[];
  // Standings
  individualPoints: Record<string, number>; // riderId -> season points
  teamPoints: Record<string, number>;       // teamId -> season points (sum of top 10 riders)
  // Active race (if any)
  activeRace: RaceState | null;
  // Completed events with their final results
  completedEvents: CompletedEventResult[];
}

export interface CompletedEventResult {
  eventId: string;
  year: number;
  finalGc: RaceClassification[];   // top finishers
  participants: string[];          // all rider IDs who started
  jerseys: {
    gc: string;
    points: string;
    mountain: string;
    youth: string | null;
    teamWinnerId: string;
  };
  stageWinners: Array<{ stageIndex: number; riderId: string; stageType: string }>;
}

// ============================================================================
// UNIVERSE (the whole persisted game state)
// ============================================================================

export interface Universe {
  seed: number;
  currentYear: number;
  startYear: number;
  riders: Record<string, Rider>;     // includes retired riders
  teams: Record<string, Team>;
  directors: Record<string, Director>;
  season: SeasonState;
  // History across all seasons
  hallOfFame: HallOfFameEntry[];
}

export interface HallOfFameEntry {
  year: number;
  individualChampionId: string;
  teamChampionId: string;
  individualPoints: number;
  teamPoints: number;
  // Per-event winners
  eventWinners: Record<string, string>; // eventId -> riderId
}
