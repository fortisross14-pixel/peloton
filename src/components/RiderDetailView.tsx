import { useGame } from '../state/store';
import { SKILL_KEYS, SKILL_LABELS } from '../types';
import type { Rider } from '../types';

export function RiderDetailView() {
  const universe = useGame((s) => s.universe);
  const selectedRiderId = useGame((s) => s.selectedRiderId);
  const selectTeam = useGame((s) => s.selectTeam);
  const setView = useGame((s) => s.setView);
  if (!universe || !selectedRiderId) return null;

  const rider = universe.riders[selectedRiderId];
  if (!rider) return null;
  const team = universe.teams[rider.teamId];

  const yearsIn = universe.currentYear - rider.careerStartYear;
  const yearsLeft = rider.careerLength - yearsIn;
  const pts = universe.season.individualPoints[rider.id] ?? 0;

  return (
    <div className="pt-8">
      <button
        onClick={() => setView('teams')}
        className="text-sm font-body opacity-60 hover:opacity-100 mb-4"
      >
        ← Back
      </button>

      {/* Headline */}
      <div className="border-y-2 border-ink py-5 mb-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="font-sans tracking-widest text-xs opacity-60">
              {rider.nationality}
              {rider.retired && <span className="ml-2 text-rouge">· RETIRED</span>}
            </div>
            <div className="font-display font-black text-5xl leading-none">{rider.name}</div>
            <div className="font-body italic mt-1 opacity-80">
              {team && (
                <button onClick={() => selectTeam(team.id)} className="hover:underline">
                  {team.name}
                </button>
              )}
              {!team && rider.retired && <span>Retired from competition</span>}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-sm uppercase tracking-widest font-bold rarity-${rider.rarity}`}>
              {rider.rarity}
            </div>
            <div className="font-mono text-xs opacity-60 mt-1">
              Age {rider.age} · {rider.phase} · Year {Math.max(0, yearsIn) + 1}/{rider.careerLength}
            </div>
          </div>
        </div>
      </div>

      {/* Lifetime totals strip */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
        <Stat label="Race Wins" value={rider.totals.raceWins} />
        <Stat label="Stage Wins" value={rider.totals.stageWins} />
        <Stat label="Tours" value={rider.totals.tourWins} />
        <Stat label="Giros" value={rider.totals.giroWins} />
        <Stat label="Vueltas" value={rider.totals.vueltaWins} />
        <Stat label="Monuments" value={rider.totals.monumentWins} />
        <Stat label="Pts (lifetime)" value={rider.totals.points} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Skills */}
        <div className="card-paper p-5">
          <div className="font-display font-bold text-lg mb-4">Attributes</div>
          <div className="space-y-2">
            {SKILL_KEYS.map((k) => (
              <SkillBar key={k} label={SKILL_LABELS[k]} value={rider.skills[k]} />
            ))}
            <div className="rule my-3" />
            <SkillBar label="Leadership" value={rider.leadership} accent />
            <SkillBar label="Consistency" value={rider.consistency} accent />
          </div>
        </div>

        {/* Current season + career meta */}
        <div className="space-y-4">
          <div className="card-paper p-5">
            <div className="font-display font-bold text-lg mb-3">Current Season</div>
            <dl className="space-y-2 text-sm">
              <Row label="Season points" value={pts.toString()} />
              <Row label="Career phase" value={rider.phase} capitalize />
              <Row
                label="Years remaining"
                value={rider.retired ? '—' : Math.max(0, yearsLeft).toString()}
              />
              <Row
                label="Joined peloton"
                value={rider.careerStartYear.toString()}
              />
            </dl>
          </div>

          {/* Quick jersey tally */}
          <div className="card-paper p-5">
            <div className="font-display font-bold text-lg mb-3">Jerseys Won</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <JerseyTally jersey="polka" label="Mountain" count={rider.totals.mountainJerseys} />
              <JerseyTally jersey="green" label="Points" count={rider.totals.pointsJerseys} />
              <JerseyTally jersey="white" label="Youth" count={rider.totals.youthJerseys} />
            </div>
          </div>
        </div>
      </div>

      {/* Career timeline */}
      {rider.history.length > 0 && (
        <div>
          <div className="flex items-baseline gap-3 mb-3">
            <div className="font-display font-bold text-xl">Career Timeline</div>
            <div className="flex-1 rule" />
          </div>
          <div className="card-paper">
            <table className="w-full tabular text-sm">
              <thead>
                <tr className="border-b border-ink/30">
                  <th className="text-left p-2.5 font-sans text-xs tracking-widest opacity-60">YEAR</th>
                  <th className="text-left p-2.5 font-sans text-xs tracking-widest opacity-60">AGE</th>
                  <th className="text-left p-2.5 font-sans text-xs tracking-widest opacity-60">PHASE</th>
                  <th className="text-right p-2.5 font-sans text-xs tracking-widest opacity-60">PTS</th>
                  <th className="text-right p-2.5 font-sans text-xs tracking-widest opacity-60">RACE W</th>
                  <th className="text-right p-2.5 font-sans text-xs tracking-widest opacity-60">STAGE W</th>
                  <th className="text-left p-2.5 font-sans text-xs tracking-widest opacity-60">GRAND TOURS</th>
                  <th className="text-left p-2.5 font-sans text-xs tracking-widest opacity-60">JERSEYS</th>
                </tr>
              </thead>
              <tbody>
                {[...rider.history].reverse().map((h) => (
                  <tr key={h.year} className="border-b border-ink/10 align-top">
                    <td className="p-2.5 font-mono font-bold">{h.year}</td>
                    <td className="p-2.5 font-mono">{h.age}</td>
                    <td className="p-2.5 font-mono text-xs opacity-70 capitalize">{h.phase}</td>
                    <td className="p-2.5 text-right font-mono">{h.points}</td>
                    <td className="p-2.5 text-right font-mono">{h.raceWins}</td>
                    <td className="p-2.5 text-right font-mono">{h.stageWins}</td>
                    <td className="p-2.5 font-mono text-xs">
                      {Object.entries(h.grandTourFinishes).length === 0 ? (
                        <span className="opacity-40">—</span>
                      ) : (
                        Object.entries(h.grandTourFinishes).map(([eid, pos]) => (
                          <div key={eid} className="whitespace-nowrap">
                            {labelGT(eid)}: <span className={pos === 1 ? 'text-rouge font-bold' : ''}>#{pos}</span>
                          </div>
                        ))
                      )}
                    </td>
                    <td className="p-2.5 font-mono text-xs">
                      <JerseyDots jerseys={h.jerseys} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function labelGT(id: string): string {
  if (id === 'tour') return 'Tour';
  if (id === 'giro') return 'Giro';
  if (id === 'vuelta') return 'Vuelta';
  return id.toUpperCase();
}

function SkillBar({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-3">
      <div className="font-body w-32 text-sm opacity-80">{label}</div>
      <div className="flex-1 h-2 bg-paper-dark border border-ink/20 relative">
        <div
          className={`h-full ${accent ? 'bg-rouge' : 'bg-ink'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="font-mono text-sm w-8 text-right">{value}</div>
    </div>
  );
}

function Row({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-ink/10 pb-1">
      <dt className="opacity-60">{label}</dt>
      <dd className={`font-mono ${capitalize ? 'capitalize' : ''}`}>{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-paper p-3 text-center">
      <div className="font-display font-black text-xl">{value}</div>
      <div className="font-sans tracking-widest text-[9px] opacity-60 uppercase mt-1">
        {label}
      </div>
    </div>
  );
}

function JerseyTally({
  jersey,
  label,
  count,
}: {
  jersey: 'green' | 'polka' | 'white';
  label: string;
  count: number;
}) {
  const cls =
    jersey === 'green' ? 'jersey-green' : jersey === 'polka' ? 'jersey-polka' : 'jersey-white';
  return (
    <div>
      <div className={`${cls} font-display font-black text-2xl py-2`}>{count}</div>
      <div className="font-sans tracking-widest text-[9px] opacity-60 uppercase mt-1">{label}</div>
    </div>
  );
}

function JerseyDots({
  jerseys,
}: {
  jerseys: { gc: string[]; points: string[]; mountain: string[]; youth: string[] };
}) {
  const total =
    jerseys.gc.length + jerseys.points.length + jerseys.mountain.length + jerseys.youth.length;
  if (total === 0) return <span className="opacity-40">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {jerseys.gc.map((id, i) => (
        <Dot key={`gc-${i}`} cls="jersey-yellow" title={`GC: ${id}`} />
      ))}
      {jerseys.points.map((id, i) => (
        <Dot key={`p-${i}`} cls="jersey-green" title={`Points: ${id}`} />
      ))}
      {jerseys.mountain.map((id, i) => (
        <Dot key={`m-${i}`} cls="jersey-polka" title={`Mountain: ${id}`} />
      ))}
      {jerseys.youth.map((id, i) => (
        <Dot key={`y-${i}`} cls="jersey-white" title={`Youth: ${id}`} />
      ))}
    </div>
  );
}

function Dot({ cls, title }: { cls: string; title: string }) {
  return <span className={`${cls} inline-block w-3 h-3`} title={title} />;
}
