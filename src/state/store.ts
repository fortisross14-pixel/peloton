import { create } from 'zustand';
import { SKILL_KEYS, type Universe, type Archetype, type RaceSpecialty } from '../types';
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

const SLOT_PREFIX = 'peloton.v7.slot.';
const PREVIOUS_STORAGE_KEY = 'peloton.v6';
const LEGACY_KEYS = ['peloton.v1', 'peloton.v2', 'peloton.v3', 'peloton.v4', 'peloton.v5'];

export type SaveSlot = 1 | 2 | 3;

export interface SaveSlotSummary {
  slot: SaveSlot;
  occupied: boolean;
  currentYear?: number;
  startYear?: number;
  seed?: number;
  activeRiders?: number;
  savedAt?: number;
}

interface StoredGame {
  version: 8;
  savedAt: number;
  universe: Universe;
}

interface GameStore {
  universe: Universe | null;
  activeSlot: SaveSlot | null;
  view: View;
  selectedTeamId: string | null;
  selectedRiderId: string | null;

  newGame: (slot: SaveSlot, seed?: number) => void;
  loadGame: (slot: SaveSlot) => boolean;
  saveGame: () => void;
  deleteGame: (slot: SaveSlot) => void;
  returnToHome: () => void;
  getSaveSlots: () => SaveSlotSummary[];

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
  | 'riders'
  | 'teams'
  | 'team-detail'
  | 'rider-detail'
  | 'history';

function slotKey(slot: SaveSlot) {
  return `${SLOT_PREFIX}${slot}`;
}

function migratePreviousSave() {
  try {
    if (localStorage.getItem(slotKey(1))) return;
    const raw = localStorage.getItem(PREVIOUS_STORAGE_KEY);
    if (!raw) return;
    const universe = JSON.parse(raw) as Universe;
    const stored: StoredGame = { version: 8, savedAt: Date.now(), universe };
    localStorage.setItem(slotKey(1), JSON.stringify(stored));
    localStorage.removeItem(PREVIOUS_STORAGE_KEY);
  } catch (e) {
    console.warn('save migration failed', e);
  }
}

function persist(slot: SaveSlot, universe: Universe) {
  try {
    const stored: StoredGame = { version: 8, savedAt: Date.now(), universe };
    localStorage.setItem(slotKey(slot), JSON.stringify(stored));
  } catch (e) {
    console.warn('persist failed', e);
  }
}

function parseStoredGame(raw: string): StoredGame {
  const parsed = JSON.parse(raw) as StoredGame | Universe;
  if ('universe' in parsed && 'savedAt' in parsed) return parsed;
  return { version: 8, savedAt: Date.now(), universe: parsed };
}

function stableUnit(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

function normalizeUniverse(universe: Universe): void {
  const validArchetypes = new Set<Archetype>(['climber', 'sprinter', 'rouleur', 'puncheur', 'allrounder']);
  const validRaceSpecialties = new Set<RaceSpecialty>(['classics', 'week-stage', 'grand-tour']);

  for (const rider of Object.values(universe.riders)) {
    const legacyArchetype = rider.archetype as string;
    if (!validArchetypes.has(legacyArchetype as Archetype)) {
      if (legacyArchetype === 'gc') rider.archetype = 'allrounder';
      else if (legacyArchetype === 'classics') {
        rider.archetype = rider.skills.cobbles >= rider.skills.climbing ? 'rouleur' : 'puncheur';
      } else rider.archetype = 'allrounder';
    }

    if (!validRaceSpecialties.has(rider.raceSpecialty as RaceSpecialty)) {
      if (legacyArchetype === 'gc') rider.raceSpecialty = 'grand-tour';
      else if (legacyArchetype === 'classics') rider.raceSpecialty = 'classics';
      else {
        const roll = stableUnit(`${rider.id}:race-specialty`);
        rider.raceSpecialty = roll < 0.36 ? 'classics' : roll < 0.65 ? 'week-stage' : 'grand-tour';
      }
    }

    if (!Number.isFinite(rider.baseOverall)) {
      rider.baseOverall = SKILL_KEYS.reduce((sum, key) => sum + rider.skills[key], 0) / SKILL_KEYS.length;
    }
    if (!Number.isFinite(rider.seasonForm)) rider.seasonForm = 1;
    if (!Number.isFinite(rider.careerMomentum)) rider.careerMomentum = 1;
    if (!Number.isFinite(rider.stamina)) rider.stamina = 100;
  }
}

function isCompatibleUniverse(universe: Universe): boolean {
  const sampleTeam = Object.values(universe.teams)[0];
  if (!sampleTeam || !('bonus' in sampleTeam) || !('emoji' in sampleTeam)) return false;

  const teamHist = sampleTeam.history?.[0];
  const sampleRider = Object.values(universe.riders).find((r) => r.history.length > 0);
  const riderHist = sampleRider?.history[0];
  if ((teamHist && !('raceWinsBy' in teamHist)) || (riderHist && !('raceWinsBy' in riderHist))) return false;

  const anyRider = Object.values(universe.riders)[0];
  return !anyRider || 'archetype' in anyRider;
}

export const useGame = create<GameStore>((set, get) => ({
  universe: null,
  activeSlot: null,
  view: 'home',
  selectedTeamId: null,
  selectedRiderId: null,

  newGame: (slot, seed) => {
    const s = seed ?? Math.floor(Math.random() * 0x7fffffff);
    const universe = generateUniverse(s, 2026);
    persist(slot, universe);
    set({ universe, activeSlot: slot, view: 'calendar', selectedRiderId: null, selectedTeamId: null });
  },

  loadGame: (slot) => {
    try {
      migratePreviousSave();
      for (const old of LEGACY_KEYS) localStorage.removeItem(old);
      const raw = localStorage.getItem(slotKey(slot));
      if (!raw) return false;
      const { universe } = parseStoredGame(raw);
      normalizeUniverse(universe);
      if (!isCompatibleUniverse(universe)) {
        console.warn(`Save slot ${slot} has an incompatible schema — discarding it.`);
        localStorage.removeItem(slotKey(slot));
        return false;
      }
      persist(slot, universe);
      set({ universe, activeSlot: slot, view: 'calendar', selectedRiderId: null, selectedTeamId: null });
      return true;
    } catch (e) {
      console.warn('load failed', e);
      return false;
    }
  },

  saveGame: () => {
    const { universe, activeSlot } = get();
    if (universe && activeSlot) persist(activeSlot, universe);
  },

  deleteGame: (slot) => {
    localStorage.removeItem(slotKey(slot));
    const { activeSlot } = get();
    if (activeSlot === slot) {
      set({ universe: null, activeSlot: null, view: 'home', selectedRiderId: null, selectedTeamId: null });
    }
  },

  returnToHome: () => {
    const { universe, activeSlot } = get();
    if (universe && activeSlot) persist(activeSlot, universe);
    set({ universe: null, activeSlot: null, view: 'home', selectedRiderId: null, selectedTeamId: null });
  },

  getSaveSlots: () => {
    migratePreviousSave();
    return ([1, 2, 3] as SaveSlot[]).map((slot) => {
      try {
        const raw = localStorage.getItem(slotKey(slot));
        if (!raw) return { slot, occupied: false };
        const { universe, savedAt } = parseStoredGame(raw);
        return {
          slot,
          occupied: true,
          currentYear: universe.currentYear,
          startYear: universe.startYear,
          seed: universe.seed,
          activeRiders: Object.values(universe.riders).filter((r) => !r.retired).length,
          savedAt,
        };
      } catch {
        return { slot, occupied: false };
      }
    });
  },

  startActiveRace: () => {
    const { universe: u, activeSlot } = get();
    if (!u) return;
    startRace(u);
    if (activeSlot) persist(activeSlot, u);
    set({ universe: { ...u }, view: 'race' });
  },

  simulateStep: () => {
    const { universe: u, activeSlot } = get();
    if (!u) return;
    simulateNextStep(u);
    if (activeSlot) persist(activeSlot, u);
    set({ universe: { ...u } });
  },

  simulateOneStage: () => {
    const { universe: u, activeSlot } = get();
    if (!u) return;
    simulateOneStage(u);
    if (activeSlot) persist(activeSlot, u);
    set({ universe: { ...u } });
  },

  stagesRemainingInStep: () => {
    const u = get().universe;
    if (!u || !u.season.activeRace) return 0;
    return stagesInCurrentStep(u);
  },

  dismissActiveRace: () => {
    const { universe: u, activeSlot } = get();
    if (!u) return;
    dismissRace(u);
    if (activeSlot) persist(activeSlot, u);
    set({ universe: { ...u }, view: 'calendar' });
  },

  endSeasonAndAdvance: () => {
    const u = get().universe;
    if (!u || !isSeasonOver(u)) return;
    set({ view: 'season-summary' });
  },

  runOffseasonAndShowMarket: () => {
    const { universe: u, activeSlot } = get();
    if (!u || !isSeasonOver(u)) return;
    endSeason(u);
    if (activeSlot) persist(activeSlot, u);
    set({ universe: { ...u }, view: 'market-report' });
  },

  setView: (view) => set({ view }),
  selectTeam: (id) => set({ selectedTeamId: id, view: id ? 'team-detail' : 'teams' }),
  selectRider: (id) => set({ selectedRiderId: id, view: id ? 'rider-detail' : 'riders' }),
}));
