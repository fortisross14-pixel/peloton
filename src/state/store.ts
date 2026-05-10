import { create } from 'zustand';
import type { Universe } from '../types';
import { generateUniverse } from '../data/generators';
import { startRace, simulateNextStep, dismissRace, isSeasonOver } from '../engine/season';
import { endSeason } from '../engine/offseason';

const STORAGE_KEY = 'peloton.v2';
const LEGACY_KEYS = ['peloton.v1'];

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
  dismissActiveRace: () => void;
  endSeasonAndAdvance: () => void;

  setView: (view: View) => void;
  selectTeam: (id: string | null) => void;
  selectRider: (id: string | null) => void;
}

export type View =
  | 'home'
  | 'calendar'
  | 'race'
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
      // Schema sanity check: a v2 save has team.bonus and team.emoji.
      const sampleTeam = Object.values(universe.teams)[0];
      if (!sampleTeam || !('bonus' in sampleTeam) || !('emoji' in sampleTeam)) {
        console.warn('Save schema mismatch — discarding old save.');
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

  dismissActiveRace: () => {
    const u = get().universe;
    if (!u) return;
    dismissRace(u);
    persist(u);
    set({ universe: { ...u }, view: 'calendar' });
  },

  endSeasonAndAdvance: () => {
    const u = get().universe;
    if (!u) return;
    if (!isSeasonOver(u)) return;
    endSeason(u);
    persist(u);
    set({ universe: { ...u }, view: 'calendar' });
  },

  setView: (view) => set({ view }),
  selectTeam: (id) => set({ selectedTeamId: id, view: id ? 'team-detail' : 'teams' }),
  selectRider: (id) => set({ selectedRiderId: id, view: id ? 'rider-detail' : 'teams' }),
}));
