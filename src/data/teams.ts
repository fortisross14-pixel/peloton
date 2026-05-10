import type { TeamBonus } from '../types';

// ============================================================================
// TEAM TEMPLATES — fixed identity, baked into the engine.
// Each universe roll produces these same 12 teams (with fresh riders).
// ============================================================================

export interface TeamTemplate {
  shortName: string;
  name: string;
  nationality: string;
  primaryColor: string;
  secondaryColor: string;
  emoji: string;
  tagline: string;
  bonus: TeamBonus;
  // Riders generated for this team are biased toward this country.
  // ~50% chance, otherwise random nation.
  homeBiasNations: string[];
}

export const TEAM_TEMPLATES: TeamTemplate[] = [
  {
    shortName: 'CEL',
    name: 'Squadra Celeste',
    nationality: 'ITA',
    primaryColor: '#5cb8d6',
    secondaryColor: '#fafafa',
    emoji: '🇮🇹',
    tagline: 'Italian classics, Giro contenders.',
    bonus: {
      kind: 'gt-giro',
      amount: 0.03,
      label: 'Giro Specialist',
      description: '+3% rider performance during the Giro d\'Italia.',
    },
    homeBiasNations: ['ITA'],
  },
  {
    shortName: 'BAN',
    name: 'Banesto-Iberia',
    nationality: 'ESP',
    primaryColor: '#1a3a6b',
    secondaryColor: '#e8c547',
    emoji: '⛰️',
    tagline: 'Spanish climbers, Vuelta regulars.',
    bonus: {
      kind: 'gt-vuelta',
      amount: 0.03,
      label: 'Vuelta Specialist',
      description: '+3% rider performance during the Vuelta a España.',
    },
    homeBiasNations: ['ESP', 'COL'],
  },
  {
    shortName: 'MIS',
    name: 'Mistral-Provence',
    nationality: 'FRA',
    primaryColor: '#1f5e3a',
    secondaryColor: '#e8c547',
    emoji: '🌾',
    tagline: 'French breakaway artists, Tour first.',
    bonus: {
      kind: 'gt-tour',
      amount: 0.03,
      label: 'Tour Specialist',
      description: '+3% rider performance during the Tour de France.',
    },
    homeBiasNations: ['FRA'],
  },
  {
    shortName: 'ALB',
    name: 'Albion Sky',
    nationality: 'GBR',
    primaryColor: '#0a0a0a',
    secondaryColor: '#67b8e8',
    emoji: '⚡',
    tagline: 'Marginal gains. Data-driven dominance.',
    bonus: {
      kind: 'tt-stages',
      amount: 0.02,
      label: 'Marginal Gains',
      description: '+2% on individual and team time trials.',
    },
    homeBiasNations: ['GBR', 'AUS'],
  },
  {
    shortName: 'VLP',
    name: 'Vlaanderen Pavé',
    nationality: 'BEL',
    primaryColor: '#1a3d8f',
    secondaryColor: '#fafafa',
    emoji: '🧱',
    tagline: 'Cobbles. Mud. Monuments.',
    bonus: {
      kind: 'cobbles',
      amount: 0.05,
      label: 'Cobbled Hardmen',
      description: '+5% on cobbled stages and Flanders/Roubaix.',
    },
    homeBiasNations: ['BEL', 'NED'],
  },
  {
    shortName: 'ORC',
    name: 'Oranje Crono',
    nationality: 'NED',
    primaryColor: '#e8782a',
    secondaryColor: '#1a1814',
    emoji: '🟧',
    tagline: 'Lead-out kings. Built for the line.',
    bonus: {
      kind: 'flat',
      amount: 0.04,
      label: 'Sprint Train',
      description: '+4% on flat stages.',
    },
    homeBiasNations: ['NED', 'BEL'],
  },
  {
    shortName: 'NDK',
    name: 'Nordkraft',
    nationality: 'DEN',
    primaryColor: '#a8261f',
    secondaryColor: '#f4ead5',
    emoji: '🛡️',
    tagline: 'Northern depth. Talent factory.',
    bonus: {
      kind: 'youth',
      amount: 0.5,
      label: 'Dynasty Builders',
      description: 'Rookies are 50% more likely to roll Rare or higher.',
    },
    homeBiasNations: ['DEN', 'NOR'],
  },
  {
    shortName: 'TLB',
    name: 'Telekom Berg',
    nationality: 'GER',
    primaryColor: '#a8155f',
    secondaryColor: '#2a2a2a',
    emoji: '🦅',
    tagline: 'Deep pockets. Sprinters and climbers.',
    bonus: {
      kind: 'free-agent',
      amount: 0,
      label: 'Deep Pockets',
      description: 'First pick of free agents in offseason transfers.',
    },
    homeBiasNations: ['GER', 'AUT'],
  },
  {
    shortName: 'CDC',
    name: 'Café de Colombia',
    nationality: 'COL',
    primaryColor: '#5a3a1a',
    secondaryColor: '#e8c547',
    emoji: '☕',
    tagline: 'Pure climbers from the Andes.',
    bonus: {
      kind: 'mountain',
      amount: 0.04,
      label: 'Mountain Goats',
      description: '+4% on mountain and high-mountain stages.',
    },
    homeBiasNations: ['COL', 'ESP'],
  },
  {
    shortName: 'HEL',
    name: 'Helvetia Crono',
    nationality: 'SUI',
    primaryColor: '#cc1f1f',
    secondaryColor: '#fafafa',
    emoji: '🕰️',
    tagline: 'Watchmaker precision against the clock.',
    bonus: {
      kind: 'precision',
      amount: 0.015, // base, +3% on TT additionally (handled in engine)
      label: 'Watchmaker Precision',
      description: '+1.5% on all stages, +3% on time trials.',
    },
    homeBiasNations: ['SUI', 'AUT'],
  },
  {
    shortName: 'CRO',
    name: 'Crocodile Trek',
    nationality: 'USA',
    primaryColor: '#1f4d2a',
    secondaryColor: '#f4ead5',
    emoji: '🐊',
    tagline: 'Mixed roster, all terrain ready.',
    bonus: {
      kind: 'allterrain',
      amount: 0.01,
      label: 'All-Terrain',
      description: '+1% on every stage type. Jack of all trades.',
    },
    homeBiasNations: ['USA', 'CAN', 'IRL'],
  },
  {
    shortName: 'ADV',
    name: 'Adriatica Veloce',
    nationality: 'ITA',
    primaryColor: '#a8261f',
    secondaryColor: '#1a4d8f',
    emoji: '🎯',
    tagline: 'Mosaic jersey. Classics hunters.',
    bonus: {
      kind: 'classics',
      amount: 0.04,
      label: 'Classics Hunters',
      description: '+4% on one-day classics and monuments.',
    },
    homeBiasNations: ['ITA', 'POR'],
  },
];
