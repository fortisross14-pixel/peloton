// ============================================================================
// CORE TYPES
// ============================================================================

export type Rarity = 'generational' | 'legend' | 'epic' | 'rare' | 'uncommon' | 'common';

/**
 * Rider archetype — drives skill profile at generation, awards bonuses
 * during racing, and determines who wins which classification.
 */
export type Archetype =
  | 'climber'         // mountain stages, KOM jersey
  | 'sprinter'        // flat stages, Points jersey
  | 'gc'              // Grand Tour overall contender
  | 'rouleur'         // ITT specialist, cobbled classics
  | 'puncheur'        // hilly classics (Liège, Amstel, Flèche)
  | 'classics'        // monuments (Flanders, Roubaix)
  | 'allrounder';     // versatile, no peak skill

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
  climber: 0.18,
  sprinter: 0.18,
  gc: 0.12,
  rouleur: 0.10,
  puncheur: 0.12,
  classics: 0.10,
  allrounder: 0.20,
};

export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  climber: 'Climber',
  sprinter: 'Sprinter',
  gc: 'GC Contender',
  rouleur: 'Rouleur',
  puncheur: 'Puncheur',
  classics: 'Classics Hunter',
  allrounder: 'All-rounder',
};

export const ARCHETYPE_TAGLINES: Record<Archetype, string> = {
  climber: 'Lives in the mountains, contests KOM jerseys.',
  sprinter: 'Bunch-sprint specialist, contests Points jerseys.',
  gc: 'Built for Grand Tour overall classifications.',
  rouleur: 'Time trial specialist, also strong on the cobbles.',
  puncheur: 'Punchy on short steep climbs, hilly classics.',
  classics: 'Cobbled monuments and tough one-day races.',
  allrounder: 'Versatile rider, no single peak skill.',
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
  rarity: Rarity;
  archetype: Archetype;
  skills: Skills;          // base skills, 1-100
  seasonForm: number;      // annual multiplier, normally 0.95-1.05
  stamina: number;         // 0-100; depleted by stage races, recovers between events
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
