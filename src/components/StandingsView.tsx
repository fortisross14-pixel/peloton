import { useGame } from '../state/store';

export function StandingsView() {
  const universe = useGame((s) => s.universe);
  const selectRider = useGame((s) => s.selectRider);
  const selectTeam = useGame((s) => s.selectTeam);
  if (!universe) return null;

  const { individualPoints, teamPoints } = universe.season;

  const indSorted = Object.entries(individualPoints)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50);

  const teamSorted = Object.entries(teamPoints).sort((a, b) => b[1] - a[1]);

  return (
    <div className="pt-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="font-sans tracking-widest text-xs opacity-60">SEASON STANDINGS</div>
          <div className="font-display font-black text-4xl">Anno {universe.currentYear}</div>
        </div>
        <div className="font-body italic text-sm opacity-70">
          {universe.season.completedEvents.length} of {universe.season.calendar.length} races complete
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Individual rankings */}
        <div className="lg:col-span-2">
          <div className="flex items-baseline gap-3 mb-3">
            <div className="font-display font-bold text-xl">Individual Ranking</div>
            <div className="flex-1 rule" />
          </div>
          {indSorted.length === 0 ? (
            <div className="card-paper p-5 text-center opacity-60">
              No points awarded yet. Begin the season.
            </div>
          ) : (
            <div className="card-paper">
              <table className="w-full tabular text-sm">
                <thead>
                  <tr className="border-b border-ink/30">
                    <th className="text-left p-3 font-sans text-xs tracking-widest opacity-60">#</th>
                    <th className="text-left p-3 font-sans text-xs tracking-widest opacity-60">RIDER</th>
                    <th className="text-left p-3 font-sans text-xs tracking-widest opacity-60">TEAM</th>
                    <th className="text-right p-3 font-sans text-xs tracking-widest opacity-60">PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {indSorted.map(([rid, pts], i) => {
                    const r = universe.riders[rid];
                    const t = r ? universe.teams[r.teamId] : null;
                    if (!r) return null;
                    return (
                      <tr key={rid} className="border-b border-ink/10 hover:bg-paper-dark/40">
                        <td className={`p-3 font-mono ${i < 3 ? 'text-rouge font-bold' : 'opacity-50'}`}>
                          {i + 1}
                        </td>
                        <td className="p-3">
                          <button
                            className="font-body hover:underline"
                            onClick={() => selectRider(rid)}
                          >
                            {r.name}
                          </button>
                          <span className={`ml-2 text-[10px] uppercase rarity-${r.rarity}`}>
                            {r.rarity}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-xs opacity-70">
                          {t && (
                            <button onClick={() => selectTeam(t.id)} className="hover:underline">
                              {t.shortName}
                            </button>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-bold">{pts}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Team rankings */}
        <div>
          <div className="flex items-baseline gap-3 mb-3">
            <div className="font-display font-bold text-xl">Team Ranking</div>
            <div className="flex-1 rule" />
          </div>
          <div className="card-paper">
            <table className="w-full tabular text-sm">
              <thead>
                <tr className="border-b border-ink/30">
                  <th className="text-left p-3 font-sans text-xs tracking-widest opacity-60">#</th>
                  <th className="text-left p-3 font-sans text-xs tracking-widest opacity-60">TEAM</th>
                  <th className="text-right p-3 font-sans text-xs tracking-widest opacity-60">PTS</th>
                </tr>
              </thead>
              <tbody>
                {teamSorted.map(([tid, pts], i) => {
                  const t = universe.teams[tid];
                  if (!t) return null;
                  return (
                    <tr key={tid} className="border-b border-ink/10 hover:bg-paper-dark/40">
                      <td className={`p-3 font-mono ${i < 3 ? 'text-rouge font-bold' : 'opacity-50'}`}>
                        {i + 1}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{t.emoji}</span>
                          <span
                            className="w-3 h-3 inline-block"
                            style={{ background: t.primaryColor }}
                          />
                          <button
                            className="font-body hover:underline truncate"
                            onClick={() => selectTeam(tid)}
                          >
                            {t.name}
                          </button>
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono font-bold">{pts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="text-xs opacity-60 mt-2 italic font-body">
            Team points = sum of top 10 riders' season points.
          </div>
        </div>
      </div>
    </div>
  );
}
