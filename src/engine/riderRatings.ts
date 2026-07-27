import type { Rider } from '../types';
import { SKILL_KEYS } from '../types';
import { phaseMultiplier } from '../data/generators';

export function baseOverall(rider: Rider): number {
  if (Number.isFinite(rider.baseOverall)) return rider.baseOverall;
  return SKILL_KEYS.reduce((sum, key) => sum + rider.skills[key], 0) / SKILL_KEYS.length;
}

export function staminaMultiplier(rider: Rider): number {
  const stamina = rider.stamina ?? 100;
  return stamina >= 85 ? 1 : 1 - ((85 - stamina) / 55) * 0.14;
}

/** Base talent adjusted only for career phase and this season's ±5% shape. */
export function annualOverall(rider: Rider, currentYear: number): number {
  return baseOverall(rider) * phaseMultiplier(rider, currentYear) * (rider.seasonForm ?? 1);
}

/** What the rider can deliver right now, including momentum and fatigue. */
export function currentPerformanceOverall(rider: Rider, currentYear: number): number {
  return annualOverall(rider, currentYear) * (rider.careerMomentum ?? 1) * staminaMultiplier(rider);
}
