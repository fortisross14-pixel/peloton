import { useGame } from '../state/store';
import { SKILL_KEYS, SKILL_LABELS, ARCHETYPE_LABELS, RACE_SPECIALTY_LABELS } from '../types';
import { eventName, terrainLabel } from '../utils/eventNames';
import type { Rider } from '../types';

export function TeamDetailView() {
  const universe = useGame((s) => s.universe);
  const selectedTeamId = useGame((s) => s.selectedTeamId);
  const selectRider = useGame((s) => s.selectRider);
  const setView = useGame((s) => s.setView);
  if (!universe || !selectedTeamId) return null;

  const team = universe.teams[selectedTeamId];
  if (!team) return null;

  const director = team.directorId ? universe.directors[team.directorId] : null;
  const roster = team.riderIds
    .map((id) => universe.riders[id])
    .filter(Boolean) as Rider[];

  const seasonPoints = universe.season.teamPoints[team.id] ?? 0;

  // Captain = highest leadership; Star = highest avg skill
  const star = [...roster].sort((a, b) => avgSkill(b) - avgSkill(a))[0];
  const captain = [...roster].sort((a, b) => b.leadership - a.leadership)[0];

  return (
    <div className="pt-8">
      <button
        onClick={() => setView('teams')}
        className="text-sm font-body opacity-60 hover:opacity-100 mb-4"
      >
        ← Back to Teams
      </button>

      {/* Team headline with color band */}
      <div
        className="border-2 border-ink mb-6 relative overflow-hidden"
        style={{ background: team.primaryColor, color: team.secondaryColor }}
      >
        <div className="px-6 py-5 flex items-start gap-5">
          <div className="text-5xl leading-none shrink-0">{team.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="font-sans tracking-[0.3em] text-xs opacity-80">
              {team.shortName} · {team.nationality}
            </div>
            <div className="font-display font-black text-4xl leading-tight">{team.name}</div>
            <div className="font-body italic opacity-90 mt-1">{team.tagline}</div>
          </div>
        </div>
        {/* Bonus banner */}
        <div className="px-6 py-3 bg-ink/20 border-t border-ink/30 flex items-baseline justify-between flex-wrap gap-3">
          <div>
            <div className="font-sans tracking-widest text-[10px] opacity-80 uppercase">Team Identity</div>
            <div className="font-display font-bold text-lg">{team.bonus.label}</div>
          </div>
          <div className="font-body text-sm opacity-90 text-right max-w-md">
            {team.bonus.description}
          </div>
        </div>
      </div>

      {/* Director card */}
      {director ? (
        <div className="card-paper p-4 mb-6 flex items-center gap-4 flex-wrap">
          <div className="font-sans tracking-[0.3em] text-xs opacity-60 shrink-0">DIRECTEUR SPORTIF</div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-xl">{director.name}</div>
            <div className="font-mono text-xs opacity-70 mt-0.5">
              <span className={`rarity-${director.rarity} uppercase`}>{director.rarity}</span>
              {' · '}
              <span className="capitalize">{director.specialty}</span> specialist
              {director.titlesWon > 0 && <> · {director.titlesWon} title{director.titlesWon > 1 ? 's' : ''}</>}
              {director.yearsActive > 0 && <> · {director.yearsActive} yr{director.yearsActive > 1 ? 's' : ''} with team</>}
            </div>
          </div>
        </div>
      ) : (
        <div className="card-paper p-4 mb-6 italic opacity-70">
          Director position vacant.
        </div>
      )}

      {/* Season + Lifetime stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label={`${universe.currentYear} Points`} value={seasonPoints} highlight />
        <Stat label="Race Wins" value={team.totals.raceWins} />
        <Stat label="GT Wins" value={team.totals.gtWins} />
        <Stat label="Stage Wins" value={team.totals.stageWins} />
        <Stat label="Tour de France" value={team.totals.tourWins} small />
        <Stat label="Giro d'Italia" value={team.totals.giroWins} small />
        <Stat label="Vuelta a España" value={team.totals.vueltaWins} small />
        <Stat label="Monuments" value={team.totals.monumentWins} small />
      </div>

      {/* Star + Captain */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {star && (
          <div className="card-paper p-4">
            <div className="font-sans tracking-widest text-xs text-rouge mb-2">★ STAR</div>
            <button
              onClick={() => selectRider(star.id)}
              className="font-display font-bold text-xl hover:underline"
            >
              {star.name}
            </button>
            <div className={`text-xs uppercase tracking-widest rarity-${star.rarity} mt-1`}>
              {star.rarity} · avg {Math.round(avgSkill(star))}
            </div>
          </div>
        )}
        {captain && (
          <div className="card-paper p-4">
            <div className="font-sans tracking-widest text-xs text-rouge mb-2">▲ CAPTAIN</div>
            <button
              onClick={() => selectRider(captain.id)}
              className="font-display font-bold text-xl hover:underline"
            >
              {captain.name}
            </button>
            <div className="font-mono text-xs opacity-70 mt-1">
              Leadership · {captain.leadership}
            </div>
          </div>
        )}
      </div>

      {/* Roster */}
      <div className="mb-8">
        <div className="flex items-baseline gap-3 mb-3">
          <div className="font-display font-bold text-xl">Roster</div>
          <div className="flex-1 rule" />
          <div className="font-mono text-xs opacity-60">{roster.length} riders</div>
        </div>
        <div className="card-paper">
          <table className="w-full tabular text-sm">
            <thead>
              <tr className="border-b border-ink/30">
                <th className="text-left p-2.5 font-sans text-xs tracking-widest opacity-60">RIDER</th>
                <th className="text-left p-2.5 font-sans text-xs tracking-widest opacity-60">NAT</th>
                <th className="text-left p-2.5 font-sans text-xs tracking-widest opacity-60">RARITY</th>
                <th className="text-left p-2.5 font-sans text-xs tracking-widest opacity-60">TERRAIN</th>
                <th className="text-left p-2.5 font-sans text-xs tracking-widest opacity-60">SPECIALTY</th>
                <th className="text-right p-2.5 font-sans text-xs tracking-widest opacity-60">AGE</th>
                <th className="text-right p-2.5 font-sans text-xs tracking-widest opacity-60">PHASE</th>
                <th className="text-right p-2.5 font-sans text-xs tracking-widest opacity-60">LDR</th>
                <th className="text-right p-2.5 font-sans text-xs tracking-widest opacity-60">PTS</th>
              </tr>
            </thead>
            <tbody>
              {roster
                .sort((a, b) => avgSkill(b) - avgSkill(a))
                .map((r) => {
                  const pts = universe.season.individualPoints[r.id] ?? 0;
                  return (
                    <tr key={r.id} className="border-b border-ink/10 hover:bg-paper-dark/40">
                      <td className="p-2.5">
                        <button
                          onClick={() => selectRider(r.id)}
                          className="font-body hover:underline"
                        >
                          {r.name}
                        </button>
                      </td>
                      <td className="p-2.5 font-mono text-xs opacity-70">{r.nationality}</td>
                      <td className={`p-2.5 text-[10px] uppercase tracking-widest rarity-${r.rarity}`}>
                        {r.rarity}
                      </td>
                      <td className="p-2.5 font-body text-xs">
                        {ARCHETYPE_LABELS[r.archetype]}
                      </td>
                      <td className="p-2.5 font-body text-xs whitespace-nowrap">
                        {RACE_SPECIALTY_LABELS[r.raceSpecialty]}
                      </td>
                      <td className="p-2.5 text-right font-mono">{r.age}</td>
                      <td className="p-2.5 text-right font-mono text-xs opacity-70 capitalize">
                        {r.phase}
                      </td>
                      <td className="p-2.5 text-right font-mono">{r.leadership}</td>
                      <td className="p-2.5 text-right font-mono font-bold">{pts}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Season-by-season history */}
      {team.history.length > 0 && (
        <div>
          <div className="flex items-baseline gap-3 mb-3">
            <div className="font-display font-bold text-xl">Team History</div>
            <div className="flex-1 rule" />
          </div>
          <div className="card-paper">
            <table className="w-full tabular text-sm">
              <thead>
                <tr className="border-b border-ink/30">
                  <th className="text-left p-2.5 font-sans text-xs tracking-widest opacity-60">YEAR</th>
                  <th className="text-right p-2.5 font-sans text-xs tracking-widest opacity-60">RANK</th>
                  <th className="text-right p-2.5 font-sans text-xs tracking-widest opacity-60">POINTS</th>
                  <th className="text-left p-2.5 font-sans text-xs tracking-widest opacity-60">RACE WINS</th>
                  <th className="text-left p-2.5 font-sans text-xs tracking-widest opacity-60">STAGE WINS</th>
                </tr>
              </thead>
              <tbody>
                {[...team.history].reverse().map((h) => (
                  <tr key={h.year} className="border-b border-ink/10 align-top">
                    <td className="p-2.5 font-mono font-bold">{h.year}</td>
                    <td className={`p-2.5 text-right font-mono ${h.ranking <= 3 ? 'text-rouge font-bold' : ''}`}>
                      #{h.ranking}
                    </td>
                    <td className="p-2.5 text-right font-mono">{h.points}</td>
                    <td className="p-2.5 font-mono text-xs">
                      {h.raceWins === 0 ? (
                        <span className="opacity-40">—</span>
                      ) : (
                        <div>
                          <div className="font-bold text-rouge">{h.raceWins}</div>
                          {(h.raceWinsBy ?? []).map((eid) => (
                            <div key={eid} className="opacity-80 whitespace-nowrap">
                              {eventName(eid)}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-2.5 font-mono text-xs">
                      {h.stageWins === 0 ? (
                        <span className="opacity-40">—</span>
                      ) : (
                        <div>
                          <div className="font-bold">{h.stageWins}</div>
                          {(h.stageWinsByDetail ?? []).map((d, i) => (
                            <div key={i} className="opacity-80 whitespace-nowrap">
                              {eventName(d.eventId)}: {d.count} ({terrainLabel(d.stageType)})
                            </div>
                          ))}
                        </div>
                      )}
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

function Stat({
  label,
  value,
  highlight,
  small,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  small?: boolean;
}) {
  return (
    <div
      className={`card-paper p-3 ${highlight ? 'border-rouge border-2' : ''}`}
    >
      <div className={`font-display font-black ${small ? 'text-xl' : 'text-2xl'}`}>
        {value}
      </div>
      <div className="font-sans tracking-widest text-[10px] opacity-60 uppercase mt-1">
        {label}
      </div>
    </div>
  );
}

function avgSkill(rider: Rider): number {
  const vals = SKILL_KEYS.map((k) => rider.skills[k]);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
