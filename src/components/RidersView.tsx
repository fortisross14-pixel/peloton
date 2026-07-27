import { useMemo, useState } from 'react';
import { useGame } from '../state/store';
import { ARCHETYPE_LABELS, RACE_SPECIALTY_LABELS, SKILL_KEYS, SKILL_LABELS, type Rarity } from '../types';
import { annualOverall, baseOverall, currentPerformanceOverall } from '../engine/riderRatings';

const rarityRank: Record<Rarity, number> = {
  generational: 6, legend: 5, epic: 4, rare: 3, uncommon: 2, common: 1,
};

export function RidersView() {
  const universe = useGame((s) => s.universe);
  const selectRider = useGame((s) => s.selectRider);
  const [query, setQuery] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const riders = useMemo(() => {
    if (!universe) return [];
    return Object.values(universe.riders)
      .filter((r) => !activeOnly || !r.retired)
      .filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => rarityRank[b.rarity] - rarityRank[a.rarity] || currentPerformanceOverall(b, universe.currentYear) - currentPerformanceOverall(a, universe.currentYear));
  }, [universe, activeOnly, query]);


  if (!universe) return null;

  return (
    <div className="pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="font-sans tracking-widest text-xs opacity-60">PELOTON DATABASE</div>
          <div className="font-display font-black text-4xl">Riders</div>
          <div className="font-body italic text-sm opacity-65 mt-1">Immutable talent, annual rating, race specialty and complete skill profile.</div>
        </div>
        <div className="flex gap-3 items-center">
          <input className="bg-transparent border border-ink/30 px-3 py-2 text-sm" placeholder="Search rider…" value={query} onChange={(e: { target: { value: string } }) => setQuery(e.target.value)} />
          <label className="text-xs font-sans uppercase tracking-wider flex gap-2 items-center">
            <input type="checkbox" checked={activeOnly} onChange={(e: { target: { checked: boolean } }) => setActiveOnly(e.target.checked)} /> Active only
          </label>
        </div>
      </div>

      <div className="card-paper overflow-x-auto">
        <table className="w-full min-w-[1450px] tabular text-xs">
          <thead>
            <tr className="border-b border-ink/30">
              <th className="text-left p-3">RIDER</th><th className="text-left p-3">TEAM</th><th className="text-left p-3">TERRAIN</th><th className="text-left p-3">RACE SPECIALTY</th><th className="text-left p-3">RARITY</th>
              <th className="text-right p-3">BASE</th><th className="text-right p-3">ANNUAL</th><th className="text-right p-3">CURRENT</th><th className="text-right p-3">SHAPE</th><th className="text-right p-3">MOMENTUM</th><th className="text-right p-3">STAMINA</th>
              {SKILL_KEYS.map((key) => <th key={key} className="text-right p-3 whitespace-nowrap">{SKILL_LABELS[key]}</th>)}
            </tr>
          </thead>
          <tbody>
            {riders.map((r) => {
              const team = universe.teams[r.teamId];
              const base = baseOverall(r);
              const annual = annualOverall(r, universe.currentYear);
              const current = currentPerformanceOverall(r, universe.currentYear);
              return <tr key={r.id} className="border-b border-ink/10 hover:bg-paper-dark/40">
                <td className="p-3"><button className="font-body font-semibold hover:underline" onClick={() => selectRider(r.id)}>{r.name}</button><div className="opacity-50">{r.nationality} · age {r.age}</div></td>
                <td className="p-3 font-mono">{team?.shortName ?? '—'}</td>
                <td className="p-3">{ARCHETYPE_LABELS[r.archetype]}</td>
                <td className="p-3 whitespace-nowrap">{RACE_SPECIALTY_LABELS[r.raceSpecialty]}</td>
                <td className={`p-3 uppercase font-bold rarity-${r.rarity}`}>{r.rarity}</td>
                <td className="p-3 text-right font-mono">{base.toFixed(1)}</td>
                <td className="p-3 text-right font-mono font-bold">{annual.toFixed(1)}</td>
                <td className="p-3 text-right font-mono">{current.toFixed(1)}</td>
                <td className="p-3 text-right font-mono">{formatDelta(r.seasonForm ?? 1)}</td>
                <td className="p-3 text-right font-mono">{formatDelta(r.careerMomentum ?? 1)}</td>
                <td className="p-3 text-right font-mono">{Math.round(r.stamina ?? 100)}</td>
                {SKILL_KEYS.map((key) => <td key={key} className="p-3 text-right font-mono">{r.skills[key]}</td>)}
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDelta(multiplier: number): string {
  const pct = (multiplier - 1) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}
