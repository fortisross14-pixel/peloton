import { create } from 'zustand';
import type { Universe } from '../types';
import { generateUniverse } from '../data/generators';
import {
  startRace,
  simulateNextStep,
  simulateOneStage,
  stagesInCurrentStep,
  dismissRace,
  isSeasonOver,
} from '../engine/season';
import { endSeason } from '../engine/offseason';

const STORAGE_KEY = 'peloton.v5';
const LEGACY_KEYS = ['peloton.v1', 'peloton.v2', 'peloton.v3', 'peloton.v4'];

interface GameStore {
  universe: Universe | null;
  view: View;
  selectedTeamId: string | null;
  selectedRiderId: string | null;

  newGame: (seed?: number) => void;
  loadGame: () => boolean;
  saveGame: () => void;
  resetGame: () => void;

  startActiveRace: () => void;
  simulateStep: () => void;
  simulateOneStage: () => void;
  stagesRemainingInStep: () => number;
  dismissActiveRace: () => void;
  endSeasonAndAdvance: () => void;
  runOffseasonAndShowMarket: () => void;

  setView: (view: View) => void;
  selectTeam: (id: string | null) => void;
  selectRider: (id: string | null) => void;
}

export type View =
  | 'home'
  | 'calendar'
  | 'race'
  | 'season'
  | 'season-summary'
  | 'market-report'
  | 'standings'
  | 'teams'
  | 'team-detail'
  | 'rider-detail'
  | 'history';

function persist(universe: Universe) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(universe));
  } catch (e) {
    console.warn('persist failed', e);
  }
}

export const useGame = create<GameStore>((set, get) => ({
  universe: null,
  view: 'home',
  selectedTeamId: null,
  selectedRiderId: null,

  newGame: (seed?: number) => {
    const s = seed ?? Math.floor(Math.random() * 0x7fffffff);
    const universe = generateUniverse(s, 2026);
    persist(universe);
    set({ universe, view: 'calendar' });
  },

  loadGame: () => {
    try {
      // Clean up old-version saves so they don't linger.
      for (const old of LEGACY_KEYS) localStorage.removeItem(old);

      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const universe = JSON.parse(raw) as Universe;
      // Schema sanity check: a v3 save has raceWinsBy on team/rider history.
      const sampleTeam = Object.values(universe.teams)[0];
      if (!sampleTeam || !('bonus' in sampleTeam) || !('emoji' in sampleTeam)) {
        console.warn('Save schema mismatch (pre-v2) — discarding old save.');
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }
      // Check v3: any team or rider history row should have raceWinsBy.
      const teamHist = sampleTeam.history?.[0];
      const sampleRider = Object.values(universe.riders).find((r) => r.history.length > 0);
      const riderHist = sampleRider?.history[0];
      if ((teamHist && !('raceWinsBy' in teamHist)) || (riderHist && !('raceWinsBy' in riderHist))) {
        console.warn('Save schema mismatch (pre-v3) — discarding old save.');
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }
      // v5: every rider should have an archetype field.
      const anyRider = Object.values(universe.riders)[0];
      if (anyRider && !('archetype' in anyRider)) {
        console.warn('Save schema mismatch (pre-v5) — discarding old save.');
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }
      set({ universe, view: 'calendar' });
      return true;
    } catch (e) {
      console.warn('load failed', e);
      return false;
    }
  },

  saveGame: () => {
    const u = get().universe;
    if (u) persist(u);
  },

  resetGame: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ universe: null, view: 'home', selectedRiderId: null, selectedTeamId: null });
  },

  startActiveRace: () => {
    const u = get().universe;
    if (!u) return;
    startRace(u);
    persist(u);
    set({ universe: { ...u }, view: 'race' });
  },

  simulateStep: () => {
    const u = get().universe;
    if (!u) return;
    simulateNextStep(u);
    persist(u);
    set({ universe: { ...u } });
  },

  simulateOneStage: () => {
    const u = get().universe;
    if (!u) return;
    simulateOneStage(u);
    persist(u);
    set({ universe: { ...u } });
  },

  stagesRemainingInStep: () => {
    const u = get().universe;
    if (!u || !u.season.activeRace) return 0;
    return stagesInCurrentStep(u);
  },

  dismissActiveRace: () => {
    const u = get().universe;
    if (!u) return;
    dismissRace(u);
    persist(u);
    set({ universe: { ...u }, view: 'calendar' });
  },

  endSeasonAndAdvance: () => {
    // Used by the Calendar's "Season Concluded" button — opens the summary
    // screen first; no mutations until the user advances through the market.
    const u = get().universe;
    if (!u) return;
    if (!isSeasonOver(u)) return;
    set({ view: 'season-summary' });
  },

  runOffseasonAndShowMarket: () => {
    const u = get().universe;
    if (!u) return;
    if (!isSeasonOver(u)) return;
    endSeason(u);
    persist(u);
    set({ universe: { ...u }, view: 'market-report' });
  },

  setView: (view) => set({ view }),
  selectTeam: (id) => set({ selectedTeamId: id, view: id ? 'team-detail' : 'teams' }),
  selectRider: (id) => set({ selectedRiderId: id, view: id ? 'rider-detail' : 'teams' }),
}));
