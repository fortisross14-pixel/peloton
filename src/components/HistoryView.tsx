import { useState } from 'react';
import { useGame } from '../state/store';
import type { Rider, Team } from '../types';

type Tab = 'riders' | 'teams' | 'years';
type RiderMetric =
  | 'stageWins' | 'raceWins' | 'gtWins' | 'tourWins' | 'giroWins'
  | 'vueltaWins' | 'monumentWins' | 'points' | 'youthJerseys'
  | 'mountainJerseys' | 'pointsJerseys';
type TeamMetric =
  | 'raceWins' | 'stageWins' | 'gtWins' | 'tourWins' | 'giroWins' | 'vueltaWins' | 'monumentWins' | 'points';

const RIDER_METRICS: { key: RiderMetric; label: string }[] = [
  { key: 'points', label: 'Career Points' },
  { key: 'stageWins', label: 'Stage Wins' },
  { key: 'raceWins', label: 'Race Wins' },
  { key: 'gtWins', label: 'Grand Tours' },
  { key: 'tourWins', label: 'Tour de France' },
  { key: 'giroWins', label: "Giro d'Italia" },
  { key: 'vueltaWins', label: 'Vuelta a España' },
  { key: 'monumentWins', label: 'Monuments' },
  { key: 'mountainJerseys', label: 'Mountain Jerseys' },
  { key: 'pointsJerseys', label: 'Points Jerseys' },
  { key: 'youthJerseys', label: 'Youth Jerseys' },
];

const TEAM_METRICS: { key: TeamMetric; label: string }[] = [
  { key: 'points', label: 'Career Points' },
  { key: 'raceWins', label: 'Race Wins' },
  { key: 'stageWins', label: 'Stage Wins' },
  { key: 'gtWins', label: 'Grand Tours' },
  { key: 'tourWins', label: 'Tour de France' },
  { key: 'giroWins', label: "Giro d'Italia" },
  { key: 'vueltaWins', label: 'Vuelta a España' },
  { key: 'monumentWins', label: 'Monuments' },
];

export function HistoryView() {
  const universe = useGame((s) => s.universe);
  const [tab, setTab] = useState<Tab>('riders');
  const [riderMetric, setRiderMetric] = useState<RiderMetric>('points');
  const [teamMetric, setTeamMetric] = useState<TeamMetric>('points');
  const selectRider = useGame((s) => s.selectRider);
  const selectTeam = useGame((s) => s.selectTeam);
  if (!universe) return null;

  return (
    <div className="pt-8">
      <div className="mb-6">
        <div className="font-sans tracking-widest text-xs opacity-60">ARCHIVES</div>
        <div className="font-display font-black text-4xl">The Almanac</div>
        <div className="font-body italic opacity-70 mt-1">
          All-time leaderboards · Hall of Fame · Active and retired
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-ink/30">
        {([
          ['riders', 'Riders'],
          ['teams', 'Teams'],
          ['years', 'Champions by Year'],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`font-sans tracking-widest text-xs uppercase px-4 py-2 -mb-px ${
              tab === id
                ? 'border-b-2 border-rouge text-rouge font-bold'
                : 'opacity-60 hover:opacity-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'riders' && (
        <RiderLeaderboard
          metric={riderMetric}
          setMetric={setRiderMetric}
          riders={Object.values(universe.riders)}
          onSelect={selectRider}
          getTeam={(id) => universe.teams[id]}
        />
      )}

      {tab === 'teams' && (
        <TeamLeaderboard
          metric={teamMetric}
          setMetric={setTeamMetric}
          teams={Object.values(universe.teams)}
          onSelect={selectTeam}
        />
      )}

      {tab === 'years' && <YearsTable />}
    </div>
  );
}

function RiderLeaderboard({
  metric,
  setMetric,
  riders,
  onSelect,
  getTeam,
}: {
  metric: RiderMetric;
  setMetric: (m: RiderMetric) => void;
  riders: Rider[];
  onSelect: (id: string) => void;
  getTeam: (id: string) => Team | undefined;
}) {
  const sorted = [...riders]
    .filter((r) => r.totals[metric] > 0)
    .sort((a, b) => b.totals[metric] - a.totals[metric])
    .slice(0, 30);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {RIDER_METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={`text-xs font-sans tracking-wider uppercase px-3 py-1.5 border ${
              metric === m.key
                ? 'border-rouge bg-rouge text-paper'
                : 'border-ink/30 hover:border-ink'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="card-paper p-6 text-center opacity-60">
          No data yet — race some seasons to populate the archives.
        </div>
      ) : (
        <div className="card-paper">
          <table className="w-full tabular text-sm">
            <thead>
              <tr className="border-b border-ink/30">
                <th className="text-left p-2.5 font-sans text-xs tracking-widest opacity-60">#</th>
                <th className="text-left p-2.5 font-sans text-xs tracking-widest opacity-60">RIDER</th>
                <th className="text-left p-2.5 font-sans text-xs tracking-widest opacity-60">NAT</th>
                <th className="text-left p-2.5 font-sans text-xs tracking-widest opacity-60">STATUS</th>
                <th className="text-right p-2.5 font-sans text-xs tracking-widest opacity-60">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.id} className="border-b border-ink/10 hover:bg-paper-dark/40">
                  <td className={`p-2.5 font-mono ${i < 3 ? 'text-rouge font-bold' : 'opacity-50'}`}>
                    {i + 1}
                  </td>
                  <td className="p-2.5">
                    <button onClick={() => onSelect(r.id)} className="font-body hover:underline">
                      {r.name}
                    </button>
                    <span className={`ml-2 text-[10px] uppercase rarity-${r.rarity}`}>
                      {r.rarity}
                    </span>
                  </td>
                  <td className="p-2.5 font-mono text-xs opacity-70">{r.nationality}</td>
                  <td className="p-2.5 font-mono text-xs">
                    {r.retired ? (
                      <span className="opacity-50">retired</span>
                    ) : (
                      <span className="text-rouge">active</span>
                    )}
                  </td>
                  <td className="p-2.5 text-right font-mono font-bold">{r.totals[metric]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TeamLeaderboard({
  metric,
  setMetric,
  teams,
  onSelect,
}: {
  metric: TeamMetric;
  setMetric: (m: TeamMetric) => void;
  teams: Team[];
  onSelect: (id: string) => void;
}) {
  const sorted = [...teams].sort((a, b) => b.totals[metric] - a.totals[metric]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {TEAM_METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={`text-xs font-sans tracking-wider uppercase px-3 py-1.5 border ${
              metric === m.key
                ? 'border-rouge bg-rouge text-paper'
                : 'border-ink/30 hover:border-ink'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="card-paper">
        <table className="w-full tabular text-sm">
          <thead>
            <tr className="border-b border-ink/30">
              <th className="text-left p-2.5 font-sans text-xs tracking-widest opacity-60">#</th>
              <th className="text-left p-2.5 font-sans text-xs tracking-widest opacity-60">TEAM</th>
              <th className="text-right p-2.5 font-sans text-xs tracking-widest opacity-60">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t, i) => (
              <tr key={t.id} className="border-b border-ink/10 hover:bg-paper-dark/40">
                <td className={`p-2.5 font-mono ${i < 3 ? 'text-rouge font-bold' : 'opacity-50'}`}>
                  {i + 1}
                </td>
                <td className="p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{t.emoji}</span>
                    <span className="w-3 h-3 inline-block" style={{ background: t.primaryColor }} />
                    <button onClick={() => onSelect(t.id)} className="font-body hover:underline">
                      {t.name}
                    </button>
                  </div>
                </td>
                <td className="p-2.5 text-right font-mono font-bold">{t.totals[metric]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function YearsTable() {
  const universe = useGame((s) => s.universe);
  const selectRider = useGame((s) => s.selectRider);
  const selectTeam = useGame((s) => s.selectTeam);
  if (!universe) return null;

  if (universe.hallOfFame.length === 0) {
    return (
      <div className="card-paper p-6 text-center opacity-60">
        No completed seasons in the archive yet. Finish year 1 to begin populating the Hall of Fame.
      </div>
    );
  }

  return (
    <div className="card-paper">
      <table className="w-full tabular text-sm">
        <thead>
          <tr className="border-b border-ink/30">
            <th className="text-left p-2.5 font-sans text-xs tracking-widest opacity-60">YEAR</th>
            <th className="text-left p-2.5 font-sans text-xs tracking-widest opacity-60">INDIVIDUAL CHAMPION</th>
            <th className="text-right p-2.5 font-sans text-xs tracking-widest opacity-60">PTS</th>
            <th className="text-left p-2.5 font-sans text-xs tracking-widest opacity-60">TEAM CHAMPION</th>
            <th className="text-right p-2.5 font-sans text-xs tracking-widest opacity-60">PTS</th>
            <th className="text-left p-2.5 font-sans text-xs tracking-widest opacity-60">TOUR</th>
            <th className="text-left p-2.5 font-sans text-xs tracking-widest opacity-60">GIRO</th>
            <th className="text-left p-2.5 font-sans text-xs tracking-widest opacity-60">VUELTA</th>
          </tr>
        </thead>
        <tbody>
          {[...universe.hallOfFame].reverse().map((entry) => {
            const ind = universe.riders[entry.individualChampionId];
            const team = universe.teams[entry.teamChampionId];
            const tourW = universe.riders[entry.eventWinners.tour ?? ''];
            const giroW = universe.riders[entry.eventWinners.giro ?? ''];
            const vueltaW = universe.riders[entry.eventWinners.vuelta ?? ''];
            return (
              <tr key={entry.year} className="border-b border-ink/10">
                <td className="p-2.5 font-mono font-bold">{entry.year}</td>
                <td className="p-2.5">
                  {ind ? (
                    <button onClick={() => selectRider(ind.id)} className="font-body hover:underline">
                      {ind.name}
                    </button>
                  ) : '—'}
                </td>
                <td className="p-2.5 text-right font-mono">{entry.individualPoints}</td>
                <td className="p-2.5">
                  {team ? (
                    <button onClick={() => selectTeam(team.id)} className="font-body hover:underline">
                      {team.name}
                    </button>
                  ) : '—'}
                </td>
                <td className="p-2.5 text-right font-mono">{entry.teamPoints}</td>
                <td className="p-2.5 font-body text-xs">{tourW?.name ?? '—'}</td>
                <td className="p-2.5 font-body text-xs">{giroW?.name ?? '—'}</td>
                <td className="p-2.5 font-body text-xs">{vueltaW?.name ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
