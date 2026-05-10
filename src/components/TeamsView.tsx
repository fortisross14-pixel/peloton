import { useGame } from '../state/store';
import type { Team } from '../types';

export function TeamsView() {
  const universe = useGame((s) => s.universe);
  const selectTeam = useGame((s) => s.selectTeam);
  if (!universe) return null;

  const teamsSorted = Object.values(universe.teams).sort(
    (a, b) => (universe.season.teamPoints[b.id] ?? 0) - (universe.season.teamPoints[a.id] ?? 0),
  );

  return (
    <div className="pt-8">
      <div className="mb-6">
        <div className="font-sans tracking-widest text-xs opacity-60">TEAMS</div>
        <div className="font-display font-black text-4xl">The Peloton</div>
        <div className="font-body italic opacity-70 mt-1">
          Twelve squads. Each with its own identity, colors, and bonus.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teamsSorted.map((team) => (
          <TeamCard key={team.id} team={team} onClick={() => selectTeam(team.id)} />
        ))}
      </div>
    </div>
  );
}

function TeamCard({ team, onClick }: { team: Team; onClick: () => void }) {
  const universe = useGame((s) => s.universe)!;
  const director = team.directorId ? universe.directors[team.directorId] : null;
  const seasonPoints = universe.season.teamPoints[team.id] ?? 0;
  const activeRoster = team.riderIds
    .map((id) => universe.riders[id])
    .filter((r) => r && !r.retired);

  return (
    <button
      onClick={onClick}
      className="card-paper text-left hover:-translate-y-0.5 transition-transform overflow-hidden flex flex-col"
    >
      {/* Color band header */}
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{ background: team.primaryColor, color: team.secondaryColor }}
      >
        <div className="text-2xl leading-none">{team.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-black text-lg leading-tight truncate">
            {team.name}
          </div>
          <div className="font-mono text-[10px] tracking-widest opacity-80">
            {team.shortName} · {team.nationality}
          </div>
        </div>
      </div>

      {/* Bonus tag */}
      <div className="px-4 py-2 border-b border-ink/10 bg-paper-dark/40">
        <div className="font-sans tracking-widest text-[9px] opacity-60 uppercase">Bonus</div>
        <div className="font-body font-bold text-sm">{team.bonus.label}</div>
      </div>

      {/* Body */}
      <div className="p-4 flex-1">
        <div className="font-body italic text-xs opacity-70 mb-3 leading-snug">
          {team.tagline}
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <Stat label="Riders" value={activeRoster.length} />
          <Stat label="Pts" value={seasonPoints} />
          <Stat label="Wins" value={team.totals.raceWins} />
        </div>

        {director && (
          <div className="mt-3 pt-2 border-t border-ink/20 font-mono text-xs flex items-center justify-between">
            <span className="opacity-60">DS</span>
            <span className="truncate text-right">
              {director.name}
              <span className={`ml-1 text-[10px] uppercase rarity-${director.rarity}`}>
                {director.rarity}
              </span>
            </span>
          </div>
        )}
        {!director && (
          <div className="mt-3 pt-2 border-t border-ink/20 font-mono text-xs italic opacity-60">
            DS — vacant
          </div>
        )}
      </div>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-ink/20 px-2 py-1.5 text-center">
      <div className="font-mono font-bold">{value}</div>
      <div className="font-sans tracking-widest text-[9px] opacity-60 uppercase">{label}</div>
    </div>
  );
}
