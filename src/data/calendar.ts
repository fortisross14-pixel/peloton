import type { CalendarEvent, StageDefinition, StageType } from '../types';

// Helper to build a stage list from a string like "F,F,M,M,I,F,T"
// Used to keep stage profiles legible.
const STAGE_NAMES: Record<StageType, string[]> = {
  flat: ['Plaines de Beauce', 'Riviera Sprint', 'Coastal Run', 'Lowland Stage', 'Avenue Finale', 'Pavé Plat', 'Boulevard Stage'],
  hilly: ['Côte du Loir', 'Hillsides', 'Vallée Ondulée', 'Rolling Hills', 'Ardennes Approach', 'Strade Bianche', 'Apennine Foothills'],
  mountain: ['Col du Midi', 'Mountain Stage', 'Ascent Royale', 'Passo Alpino', 'Pyrenean Pass', 'Alpine Crossing', 'Sierra Climb'],
  'mountain-hard': ['Queen Stage', 'Cima Coppi', 'Hors Catégorie', 'Galibier Climax', 'Stelvio Stage', 'Angliru Finish', 'Mortirolo'],
  itt: ['Crono Individuale', 'Time Trial', 'Contre-la-Montre', 'Race Against Time', 'Solo Effort'],
  ttt: ['Crono a Squadre', 'Team Time Trial', 'Team Crono'],
  cobbles: ['Cobbled Stage', 'Pavé Inferno', 'Strade del Nord'],
};

function makeStages(rng: () => number, profile: StageType[]): StageDefinition[] {
  return profile.map((type, i) => {
    const namePool = STAGE_NAMES[type];
    const distance =
      type === 'itt'
        ? Math.round(20 + rng() * 35)
        : type === 'ttt'
          ? Math.round(20 + rng() * 25)
          : type === 'mountain-hard'
            ? Math.round(150 + rng() * 50)
            : type === 'mountain'
              ? Math.round(160 + rng() * 50)
              : Math.round(170 + rng() * 60);
    return {
      type,
      distanceKm: distance,
      name: `Stage ${i + 1} — ${namePool[i % namePool.length]}`,
    };
  });
}

// --- TOUR DE FRANCE ---
// 21 stages, 7 steps of 3 stages each.
// Tour profile: lots of mountains in middle, opens with prologue/sprint, closes with sprint to Paris.
export const TOUR_PROFILE: StageType[] = [
  'flat', 'flat', 'cobbles',           // step 1: Grand Départ
  'hilly', 'flat', 'hilly',            // step 2
  'mountain', 'mountain', 'flat',      // step 3: first mountains
  'flat', 'mountain-hard', 'mountain', // step 4
  'mountain-hard', 'itt', 'flat',      // step 5: ITT
  'mountain', 'mountain-hard', 'flat', // step 6: Alps
  'hilly', 'itt', 'flat',              // step 7: closing ITT + Champs
];

// --- GIRO D'ITALIA ---
export const GIRO_PROFILE: StageType[] = [
  'itt', 'flat', 'hilly',              // step 1
  'flat', 'flat', 'mountain',          // step 2
  'mountain-hard', 'mountain', 'flat', // step 3
  'hilly', 'flat', 'itt',              // step 4
  'mountain', 'mountain-hard', 'flat', // step 5: Dolomites
  'mountain', 'mountain-hard', 'mountain-hard', // step 6: queen stages
  'flat', 'itt', 'flat',               // step 7
];

// --- VUELTA A ESPAÑA ---
export const VUELTA_PROFILE: StageType[] = [
  'ttt', 'flat', 'hilly',              // step 1: TTT opener
  'mountain', 'flat', 'hilly',         // step 2
  'mountain-hard', 'mountain', 'flat', // step 3
  'flat', 'itt', 'mountain',           // step 4
  'mountain-hard', 'flat', 'hilly',    // step 5
  'mountain', 'mountain-hard', 'flat', // step 6: Asturias
  'hilly', 'flat', 'flat',             // step 7
];

// --- WEEK-LONG STAGE RACES (8 stages, 2 steps of 4) ---
const WEEK_PARIS_NICE: StageType[] = ['flat', 'flat', 'itt', 'hilly', 'mountain', 'mountain', 'hilly', 'flat'];
const WEEK_TIRRENO: StageType[] = ['ttt', 'flat', 'hilly', 'mountain', 'mountain-hard', 'flat', 'hilly', 'itt'];
const WEEK_CATALUNYA: StageType[] = ['flat', 'hilly', 'mountain', 'mountain-hard', 'mountain', 'flat', 'hilly', 'flat'];
const WEEK_DAUPHINE: StageType[] = ['flat', 'itt', 'hilly', 'mountain', 'mountain-hard', 'mountain', 'mountain-hard', 'flat'];
const WEEK_SUISSE: StageType[] = ['itt', 'flat', 'hilly', 'mountain', 'mountain-hard', 'flat', 'mountain', 'itt'];

// --- CLASSICS / MONUMENTS (1 stage) ---
type ClassicSpec = {
  id: string;
  name: string;
  shortName: string;
  country: string;
  month: number;
  weekInMonth: number;
  type: StageType;
  distanceKm: number;
  category: 'classic' | 'monument';
  prestige: number;
};

const CLASSICS: ClassicSpec[] = [
  { id: 'milan-sanremo', name: 'Milano—Sanremo', shortName: 'MSR', country: 'ITA', month: 3, weekInMonth: 3, type: 'flat', distanceKm: 298, category: 'monument', prestige: 0.85 },
  { id: 'flanders', name: 'Tour of Flanders', shortName: 'RVV', country: 'BEL', month: 4, weekInMonth: 1, type: 'cobbles', distanceKm: 270, category: 'monument', prestige: 0.9 },
  { id: 'gent-wevelgem', name: 'Gent—Wevelgem', shortName: 'GVW', country: 'BEL', month: 3, weekInMonth: 4, type: 'cobbles', distanceKm: 248, category: 'classic', prestige: 0.6 },
  { id: 'roubaix', name: 'Paris—Roubaix', shortName: 'PRX', country: 'FRA', month: 4, weekInMonth: 2, type: 'cobbles', distanceKm: 257, category: 'monument', prestige: 0.9 },
  { id: 'liege', name: 'Liège—Bastogne—Liège', shortName: 'LBL', country: 'BEL', month: 4, weekInMonth: 4, type: 'hilly', distanceKm: 254, category: 'monument', prestige: 0.85 },
  { id: 'lombardia', name: 'Il Lombardia', shortName: 'LMB', country: 'ITA', month: 10, weekInMonth: 2, type: 'mountain', distanceKm: 245, category: 'monument', prestige: 0.85 },
  // smaller classics
  { id: 'strade', name: 'Strade Bianche', shortName: 'STR', country: 'ITA', month: 3, weekInMonth: 1, type: 'cobbles', distanceKm: 184, category: 'classic', prestige: 0.6 },
  { id: 'amstel', name: 'Amstel Gold Race', shortName: 'AMS', country: 'NED', month: 4, weekInMonth: 3, type: 'hilly', distanceKm: 254, category: 'classic', prestige: 0.6 },
  { id: 'fleche', name: 'Flèche Wallonne', shortName: 'FLW', country: 'BEL', month: 4, weekInMonth: 4, type: 'hilly', distanceKm: 202, category: 'classic', prestige: 0.6 },
  { id: 'san-sebastian', name: 'Clásica San Sebastián', shortName: 'CSS', country: 'ESP', month: 8, weekInMonth: 1, type: 'hilly', distanceKm: 234, category: 'classic', prestige: 0.6 },
  { id: 'milano-torino', name: 'Milano—Torino', shortName: 'MTO', country: 'ITA', month: 10, weekInMonth: 1, type: 'hilly', distanceKm: 198, category: 'classic', prestige: 0.55 },
  { id: 'worlds', name: 'World Championships', shortName: 'WC', country: 'VAR', month: 9, weekInMonth: 4, type: 'hilly', distanceKm: 268, category: 'classic', prestige: 0.95 },
];

export function buildBaseCalendar(rng: () => number): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  // --- WEEK STAGE RACES (March – June) ---
  events.push({
    id: 'paris-nice',
    name: 'Paris—Nice',
    shortName: 'P—N',
    category: 'week-stage',
    country: 'FRA',
    month: 3,
    weekInMonth: 2,
    ridersPerTeam: 7,
    stages: makeStages(rng, WEEK_PARIS_NICE),
    stepsCount: 2,
    prestige: 0.75,
    awardsJerseys: true,
  });
  events.push({
    id: 'tirreno',
    name: 'Tirreno—Adriatico',
    shortName: 'TRN',
    category: 'week-stage',
    country: 'ITA',
    month: 3,
    weekInMonth: 2,
    ridersPerTeam: 7,
    stages: makeStages(rng, WEEK_TIRRENO),
    stepsCount: 2,
    prestige: 0.75,
    awardsJerseys: true,
  });
  events.push({
    id: 'catalunya',
    name: 'Volta a Catalunya',
    shortName: 'CAT',
    category: 'week-stage',
    country: 'ESP',
    month: 3,
    weekInMonth: 4,
    ridersPerTeam: 7,
    stages: makeStages(rng, WEEK_CATALUNYA),
    stepsCount: 2,
    prestige: 0.7,
    awardsJerseys: true,
  });
  events.push({
    id: 'dauphine',
    name: 'Critérium du Dauphiné',
    shortName: 'DPH',
    category: 'week-stage',
    country: 'FRA',
    month: 6,
    weekInMonth: 1,
    ridersPerTeam: 7,
    stages: makeStages(rng, WEEK_DAUPHINE),
    stepsCount: 2,
    prestige: 0.8,
    awardsJerseys: true,
  });
  events.push({
    id: 'suisse',
    name: 'Tour de Suisse',
    shortName: 'TDS',
    category: 'week-stage',
    country: 'SUI',
    month: 6,
    weekInMonth: 2,
    ridersPerTeam: 7,
    stages: makeStages(rng, WEEK_SUISSE),
    stepsCount: 2,
    prestige: 0.8,
    awardsJerseys: true,
  });

  // --- GRAND TOURS ---
  events.push({
    id: 'giro',
    name: 'Giro d\'Italia',
    shortName: 'GIRO',
    category: 'grand-tour',
    country: 'ITA',
    month: 5,
    weekInMonth: 1,
    ridersPerTeam: 8,
    stages: makeStages(rng, GIRO_PROFILE),
    stepsCount: 7,
    prestige: 1.3,
    awardsJerseys: true,
  });
  events.push({
    id: 'tour',
    name: 'Tour de France',
    shortName: 'TOUR',
    category: 'grand-tour',
    country: 'FRA',
    month: 7,
    weekInMonth: 1,
    ridersPerTeam: 8,
    stages: makeStages(rng, TOUR_PROFILE),
    stepsCount: 7,
    prestige: 1.5,
    awardsJerseys: true,
  });
  events.push({
    id: 'vuelta',
    name: 'Vuelta a España',
    shortName: 'VLT',
    category: 'grand-tour',
    country: 'ESP',
    month: 8,
    weekInMonth: 3,
    ridersPerTeam: 8,
    stages: makeStages(rng, VUELTA_PROFILE),
    stepsCount: 7,
    prestige: 1.3,
    awardsJerseys: true,
  });

  // --- CLASSICS ---
  for (const c of CLASSICS) {
    events.push({
      id: c.id,
      name: c.name,
      shortName: c.shortName,
      category: c.category,
      country: c.country,
      month: c.month,
      weekInMonth: c.weekInMonth,
      ridersPerTeam: 5,
      stages: [{ type: c.type, distanceKm: c.distanceKm, name: c.name }],
      stepsCount: 1,
      prestige: c.prestige,
      awardsJerseys: false,
    });
  }

  // Sort by month then weekInMonth
  events.sort((a, b) => {
    if (a.month !== b.month) return a.month - b.month;
    return a.weekInMonth - b.weekInMonth;
  });

  return events;
}

export function rebuildCalendarStages(rng: () => number, calendar: CalendarEvent[]): CalendarEvent[] {
  // Re-roll stage distances each season but keep profile shapes.
  return calendar.map((e) => {
    if (e.id === 'tour') return { ...e, stages: makeStages(rng, TOUR_PROFILE) };
    if (e.id === 'giro') return { ...e, stages: makeStages(rng, GIRO_PROFILE) };
    if (e.id === 'vuelta') return { ...e, stages: makeStages(rng, VUELTA_PROFILE) };
    if (e.id === 'paris-nice') return { ...e, stages: makeStages(rng, WEEK_PARIS_NICE) };
    if (e.id === 'tirreno') return { ...e, stages: makeStages(rng, WEEK_TIRRENO) };
    if (e.id === 'catalunya') return { ...e, stages: makeStages(rng, WEEK_CATALUNYA) };
    if (e.id === 'dauphine') return { ...e, stages: makeStages(rng, WEEK_DAUPHINE) };
    if (e.id === 'suisse') return { ...e, stages: makeStages(rng, WEEK_SUISSE) };
    return e;
  });
}

export const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
