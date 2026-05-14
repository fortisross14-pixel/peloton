// Static map of event id -> short display name. The user's calendar uses these
// canonical ids; this saves us from looking up the calendar everywhere.

const EVENT_NAMES: Record<string, string> = {
  'milan-sanremo': 'Milano—Sanremo',
  'flanders': 'Flanders',
  'gent-wevelgem': 'Gent—Wevelgem',
  'roubaix': 'Roubaix',
  'liege': 'Liège',
  'lombardia': 'Lombardia',
  'strade': 'Strade',
  'amstel': 'Amstel',
  'fleche': 'Flèche',
  'san-sebastian': 'San Sebastián',
  'milano-torino': 'Milano—Torino',
  'worlds': 'Worlds',
  'paris-nice': 'Paris—Nice',
  'tirreno': 'Tirreno',
  'catalunya': 'Catalunya',
  'dauphine': 'Dauphiné',
  'suisse': 'Suisse',
  'giro': 'Giro',
  'tour': 'Tour',
  'vuelta': 'Vuelta',
};

export function eventName(id: string): string {
  return EVENT_NAMES[id] ?? id;
}

const TERRAIN_LABELS: Record<string, string> = {
  flat: 'Flat',
  hilly: 'Hilly',
  mountain: 'Mountain',
  'mountain-hard': 'High Mountain',
  itt: 'Time Trial',
  ttt: 'Team TT',
  cobbles: 'Cobbles',
};

export function terrainLabel(t: string): string {
  return TERRAIN_LABELS[t] ?? t;
}
