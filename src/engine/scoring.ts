import type { CalendarEvent, RaceClassification, StageResult, Universe } from '../types';

// Base points table for GC finish (top 30)
const GC_POINTS = [
  500, 400, 325, 275, 225, 175, 150, 125, 110, 100,
  90, 80, 70, 60, 50, 45, 40, 35, 30, 25,
  20, 18, 16, 14, 12, 10, 8, 6, 4, 2,
];

// Stage win points (top 5 per stage)
const STAGE_POINTS = [50, 30, 20, 12, 6];

// Jersey bonus points
const JERSEY_BONUS = {
  points: 100,
  mountain: 100,
  youth: 80,
  team: 75, // applied to team
};

export function awardEventPoints(
  event: CalendarEvent,
  finalGc: RaceClassification[],
  stageResults: StageResult[],
  jerseys: {
    gc: string;
    points: string;
    mountain: string;
    youth: string | null;
    teamWinnerId: string;
  } | undefined,
  universe: Universe,
): void {
  const prestige = event.prestige;

  // GC points
  finalGc.slice(0, GC_POINTS.length).forEach((row, i) => {
    const pts = Math.round(GC_POINTS[i] * prestige);
    universe.season.individualPoints[row.riderId] =
      (universe.season.individualPoints[row.riderId] ?? 0) + pts;
    // Update rider lifetime totals
    const rider = universe.riders[row.riderId];
    if (rider) rider.totals.points += pts;
  });

  // Stage win points (each stage's top 5)
  for (const sr of stageResults) {
    sr.finishers.slice(0, STAGE_POINTS.length).forEach((f, i) => {
      const pts = Math.round(STAGE_POINTS[i] * prestige);
      universe.season.individualPoints[f.riderId] =
        (universe.season.individualPoints[f.riderId] ?? 0) + pts;
      const rider = universe.riders[f.riderId];
      if (rider) rider.totals.points += pts;
    });
    // Track stage wins for the winner
    const winnerId = sr.finishers[0]?.riderId;
    if (winnerId) {
      const rider = universe.riders[winnerId];
      if (rider) rider.totals.stageWins += 1;
    }
  }

  // Jersey bonuses
  if (jerseys && event.awardsJerseys) {
    if (jerseys.points) {
      const pts = Math.round(JERSEY_BONUS.points * prestige);
      universe.season.individualPoints[jerseys.points] =
        (universe.season.individualPoints[jerseys.points] ?? 0) + pts;
      const r = universe.riders[jerseys.points];
      if (r) {
        r.totals.points += pts;
        r.totals.pointsJerseys += 1;
      }
    }
    if (jerseys.mountain) {
      const pts = Math.round(JERSEY_BONUS.mountain * prestige);
      universe.season.individualPoints[jerseys.mountain] =
        (universe.season.individualPoints[jerseys.mountain] ?? 0) + pts;
      const r = universe.riders[jerseys.mountain];
      if (r) {
        r.totals.points += pts;
        r.totals.mountainJerseys += 1;
      }
    }
    if (jerseys.youth) {
      const pts = Math.round(JERSEY_BONUS.youth * prestige);
      universe.season.individualPoints[jerseys.youth] =
        (universe.season.individualPoints[jerseys.youth] ?? 0) + pts;
      const r = universe.riders[jerseys.youth];
      if (r) {
        r.totals.points += pts;
        r.totals.youthJerseys += 1;
      }
    }
  }

  // Race winner totals (GC = race win)
  const winnerId = finalGc[0]?.riderId;
  if (winnerId) {
    const winner = universe.riders[winnerId];
    if (winner) {
      winner.totals.raceWins += 1;
      if (event.category === 'grand-tour') winner.totals.gtWins += 1;
      if (event.id === 'tour') winner.totals.tourWins += 1;
      if (event.id === 'giro') winner.totals.giroWins += 1;
      if (event.id === 'vuelta') winner.totals.vueltaWins += 1;
      if (event.category === 'monument') winner.totals.monumentWins += 1;
    }
    const winnerTeam = universe.teams[universe.riders[winnerId]?.teamId];
    if (winnerTeam) {
      winnerTeam.totals.raceWins += 1;
      if (event.category === 'grand-tour') winnerTeam.totals.gtWins += 1;
      if (event.id === 'tour') winnerTeam.totals.tourWins += 1;
      if (event.id === 'giro') winnerTeam.totals.giroWins += 1;
      if (event.id === 'vuelta') winnerTeam.totals.vueltaWins += 1;
      if (event.category === 'monument') winnerTeam.totals.monumentWins += 1;
    }
  }

  // Team stage win totals
  for (const sr of stageResults) {
    const w = sr.finishers[0];
    if (!w) continue;
    const team = universe.teams[w.teamId];
    if (team) team.totals.stageWins += 1;
  }

  // Recompute team season points: sum of top 10 riders per team per current standings
  recomputeTeamPoints(universe);
}

export function recomputeTeamPoints(universe: Universe) {
  const teamPoints: Record<string, number> = {};
  // Group riders by team, sort each by points desc, sum top 10.
  const ridersByTeam: Record<string, { id: string; points: number }[]> = {};
  for (const r of Object.values(universe.riders)) {
    if (!r.teamId) continue;
    if (!ridersByTeam[r.teamId]) ridersByTeam[r.teamId] = [];
    ridersByTeam[r.teamId].push({
      id: r.id,
      points: universe.season.individualPoints[r.id] ?? 0,
    });
  }
  for (const [teamId, list] of Object.entries(ridersByTeam)) {
    list.sort((a, b) => b.points - a.points);
    const top10 = list.slice(0, 10);
    teamPoints[teamId] = top10.reduce((s, e) => s + e.points, 0);
  }
  universe.season.teamPoints = teamPoints;
}
