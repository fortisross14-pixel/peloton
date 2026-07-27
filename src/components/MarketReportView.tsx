import type { ReactNode } from 'react';
import { useGame } from '../state/store';
import { Flag } from '../utils/flags';
import { ARCHETYPE_LABELS, RACE_SPECIALTY_LABELS } from '../types';
import type { Rider, Team } from '../types';

export function MarketReportView() {
  const universe = useGame((s) => s.universe);
  const setView = useGame((s) => s.setView);
  const selectRider = useGame((s) => s.selectRider);
  const selectTeam = useGame((s) => s.selectTeam);
  if (!universe) return null;

  // The just-completed season is currentYear - 1 (since endSeason already
  // incremented). Each team's last history row holds the end-of-season roster
  // from that year. Diff against current rosters to derive market moves.
  const prevYear = universe.currentYear - 1;

  const retirees: Rider[] = [];
  const rookies: Rider[] = [];
  const transfers: { rider: Rider; fromTeam: Team | undefined; toTeam: Team | undefined }[] = [];

  // Build a "previous team" map from each team's last history snapshot.
  const previousTeamForRider = new Map<string, string>(); // riderId -> teamId
  for (const team of Object.values(universe.teams)) {
    const lastHist = team.history.find((h) => h.year === prevYear);
    if (!lastHist) continue;
    for (const rid of lastHist.riderIds) {
      previousTeamForRider.set(rid, team.id);
    }
  }

  for (const rider of Object.values(universe.riders)) {
    // Retiree: retired AND was on a team last year
    if (rider.retired && previousTeamForRider.has(rider.id)) {
      // Only show ones who retired this offseason (not historical retirees)
      // Heuristic: their newest history row's year is prevYear.
      const last = rider.history[rider.history.length - 1];
      if (last && last.year === prevYear) {
        retirees.push(rider);
      }
    } else if (!rider.retired && rider.history.length === 0 && rider.age === 20) {
      // Rookie: fresh-generated this offseason
      rookies.push(rider);
    } else if (!rider.retired && previousTeamForRider.has(rider.id)) {
      const oldTeamId = previousTeamForRider.get(rider.id)!;
      if (oldTeamId !== rider.teamId) {
        transfers.push({
          rider,
          fromTeam: universe.teams[oldTeamId],
          toTeam: universe.teams[rider.teamId],
        });
      }
    }
  }

  // Sort: retirees by previous archetype/skill avg desc (biggest losses first)
  retirees.sort((a, b) => avgSkill(b) - avgSkill(a));
  // Rookies by rarity rank desc
  const rarityRank: Record<string, number> = { legend: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
  rookies.sort((a, b) => rarityRank[b.rarity] - rarityRank[a.rarity]);
  // Transfers: notable moves first (high-skill riders)
  transfers.sort((a, b) => avgSkill(b.rider) - avgSkill(a.rider));

  const onRider = (id: string) => {
    selectRider(id);
    setView('rider-detail');
  };
  const onTeam = (id: string) => {
    selectTeam(id);
    setView('team-detail');
  };

  return (
    <div className="pt-6">
      <div className="border-2 border-ink p-6 mb-6 bg-paper">
        <div className="font-sans tracking-[0.3em] text-xs opacity-60">
          OFF-SEASON · WINTER {prevYear}–{universe.currentYear}
        </div>
        <div className="font-display font-black text-5xl leading-none mt-1">
          Market Report
        </div>
        <div className="font-body italic opacity-70 mt-1">
          Retirements, transfers, and the next generation
        </div>
      </div>

      {/* Retirements */}
      <Section title="Retirements" count={retirees.length}>
        {retirees.length === 0 ? (
          <p className="italic opacity-60">No riders retired this off-season.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {retirees.map((r) => {
              const prevTeam = previousTeamForRider.get(r.id);
              const team = prevTeam ? universe.teams[prevTeam] : null;
              return (
                <button
                  key={r.id}
                  onClick={() => onRider(r.id)}
                  className="card-paper p-3 text-left hover:bg-paper-dark/30 flex items-center gap-2"
                >
                  <Flag code={r.nationality} />
                  <div className="flex-1 min-w-0">
                    <div className="font-body font-bold truncate">{r.name}</div>
                    <div className="font-mono text-[10px] opacity-60 uppercase">
                      <span className={`rarity-${r.rarity}`}>{r.rarity}</span> · {ARCHETYPE_LABELS[r.archetype]} · {RACE_SPECIALTY_LABELS[r.raceSpecialty]} · age {r.age - 1}
                    </div>
                    {team && (
                      <div className="font-mono text-[10px] opacity-50">
                        {team.emoji} {team.shortName}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Section>

      {/* Transfers */}
      <Section title="Transfers" count={transfers.length}>
        {transfers.length === 0 ? (
          <p className="italic opacity-60">A quiet market — no riders changed teams.</p>
        ) : (
          <div className="card-paper">
            <table className="w-full tabular text-sm">
              <thead>
                <tr className="border-b border-ink/30">
                  <th className="text-left p-2.5 font-sans text-[10px] tracking-widest opacity-60">RIDER</th>
                  <th className="text-left p-2.5 font-sans text-[10px] tracking-widest opacity-60">ROLE</th>
                  <th className="text-left p-2.5 font-sans text-[10px] tracking-widest opacity-60">FROM</th>
                  <th className="text-left p-2.5 font-sans text-[10px] tracking-widest opacity-60">TO</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map(({ rider, fromTeam, toTeam }) => (
                  <tr key={rider.id} className="border-b border-ink/10">
                    <td className="p-2.5">
                      <button onClick={() => onRider(rider.id)} className="font-body hover:underline flex items-center gap-1.5">
                        <Flag code={rider.nationality} />
                        {rider.name}
                        <span className={`text-[10px] uppercase ml-1 rarity-${rider.rarity}`}>{rider.rarity}</span>
                      </button>
                    </td>
                    <td className="p-2.5 font-body text-xs">{ARCHETYPE_LABELS[rider.archetype]} · {RACE_SPECIALTY_LABELS[rider.raceSpecialty]}</td>
                    <td className="p-2.5">
                      {fromTeam && (
                        <button onClick={() => onTeam(fromTeam.id)} className="font-body text-xs hover:underline flex items-center gap-1">
                          <span>{fromTeam.emoji}</span>
                          <span className="opacity-70">{fromTeam.shortName}</span>
                        </button>
                      )}
                    </td>
                    <td className="p-2.5">
                      {toTeam && (
                        <button onClick={() => onTeam(toTeam.id)} className="font-body text-sm font-bold hover:underline flex items-center gap-1">
                          <span>{toTeam.emoji}</span>
                          <span>{toTeam.shortName}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Rookies */}
      <Section title="New Generation" count={rookies.length}>
        {rookies.length === 0 ? (
          <p className="italic opacity-60">No rookies signed.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {rookies.map((r) => {
              const team = universe.teams[r.teamId];
              return (
                <button
                  key={r.id}
                  onClick={() => onRider(r.id)}
                  className="card-paper p-3 text-left hover:bg-paper-dark/30 flex items-center gap-2"
                >
                  <Flag code={r.nationality} />
                  <div className="flex-1 min-w-0">
                    <div className="font-body font-bold truncate">{r.name}</div>
                    <div className="font-mono text-[10px] opacity-60 uppercase">
                      <span className={`rarity-${r.rarity}`}>{r.rarity}</span> · {ARCHETYPE_LABELS[r.archetype]} · {RACE_SPECIALTY_LABELS[r.raceSpecialty]}
                    </div>
                    {team && (
                      <div className="font-mono text-[10px] opacity-50">
                        Signed to {team.emoji} {team.shortName}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Section>

      {/* Action */}
      <div className="flex justify-center pt-2 pb-6">
        <button className="btn-vintage" onClick={() => setView('calendar')}>
          Begin {universe.currentYear} Season ▸
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline gap-3 mb-3">
        <div className="font-display font-bold text-xl">{title}</div>
        <div className="font-mono text-sm opacity-50">{count}</div>
        <div className="flex-1 rule" />
      </div>
      {children}
    </div>
  );
}

function avgSkill(r: Rider): number {
  const vals = Object.values(r.skills);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
