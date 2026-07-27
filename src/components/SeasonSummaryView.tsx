import { useGame } from '../state/store';
import { Flag } from '../utils/flags';
import { eventName } from '../utils/eventNames';
import { ARCHETYPE_LABELS, RACE_SPECIALTY_LABELS } from '../types';
import type { Rider, Team } from '../types';

export function SeasonSummaryView() {
  const universe = useGame((s) => s.universe);
  const setView = useGame((s) => s.setView);
  const selectRider = useGame((s) => s.selectRider);
  const selectTeam = useGame((s) => s.selectTeam);
  const runOffseason = useGame((s) => s.runOffseasonAndShowMarket);
  if (!universe) return null;

  // Sorted standings
  const riderStandings = Object.entries(universe.season.individualPoints)
    .sort((a, b) => b[1] - a[1]);
  const teamStandings = Object.entries(universe.season.teamPoints)
    .sort((a, b) => b[1] - a[1]);

  // Big 3 winners
  const tour = universe.season.completedEvents.find((e) => e.eventId === 'tour');
  const giro = universe.season.completedEvents.find((e) => e.eventId === 'giro');
  const vuelta = universe.season.completedEvents.find((e) => e.eventId === 'vuelta');

  // Stage win + race win counts across the season
  const stageWinsByRider: Record<string, number> = {};
  const raceWinsByRider: Record<string, number> = {};
  for (const ev of universe.season.completedEvents) {
    const winner = ev.finalGc[0]?.riderId;
    if (winner) raceWinsByRider[winner] = (raceWinsByRider[winner] ?? 0) + 1;
    for (const sw of ev.stageWinners) {
      stageWinsByRider[sw.riderId] = (stageWinsByRider[sw.riderId] ?? 0) + 1;
    }
  }
  const topStageWinners = Object.entries(stageWinsByRider)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const topRaceWinners = Object.entries(raceWinsByRider)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Jersey kings — count which rider won the most of each jersey type
  const pointsCount: Record<string, number> = {};
  const mountainCount: Record<string, number> = {};
  const youthCount: Record<string, number> = {};
  for (const ev of universe.season.completedEvents) {
    if (ev.jerseys.points) pointsCount[ev.jerseys.points] = (pointsCount[ev.jerseys.points] ?? 0) + 1;
    if (ev.jerseys.mountain) mountainCount[ev.jerseys.mountain] = (mountainCount[ev.jerseys.mountain] ?? 0) + 1;
    if (ev.jerseys.youth) youthCount[ev.jerseys.youth] = (youthCount[ev.jerseys.youth] ?? 0) + 1;
  }
  const bestSprinter = Object.entries(pointsCount).sort((a, b) => b[1] - a[1])[0];
  const bestClimber = Object.entries(mountainCount).sort((a, b) => b[1] - a[1])[0];
  const bestYouth = Object.entries(youthCount).sort((a, b) => b[1] - a[1])[0];

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
      {/* Headline */}
      <div className="border-2 border-ink p-6 mb-6 bg-paper">
        <div className="font-sans tracking-[0.3em] text-xs opacity-60">SEASON CONCLUDED</div>
        <div className="font-display font-black text-5xl leading-none mt-1">
          {universe.currentYear}
        </div>
        <div className="font-body italic opacity-70 mt-1">
          {universe.season.completedEvents.length} races run · the books are closed
        </div>
      </div>

      {/* Champions row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Individual Champion */}
        {riderStandings[0] && (() => {
          const r = universe.riders[riderStandings[0][0]];
          const t = r ? universe.teams[r.teamId] : null;
          if (!r) return null;
          return (
            <div className="card-paper p-5 border-2 border-rouge">
              <div className="font-sans tracking-widest text-[10px] opacity-60 uppercase">
                Individual Champion
              </div>
              <button
                onClick={() => onRider(r.id)}
                className="font-display font-black text-3xl hover:underline flex items-center gap-2 mt-1"
              >
                <Flag code={r.nationality} />
                {r.name}
              </button>
              <div className="font-body italic opacity-70 mt-1">
                {ARCHETYPE_LABELS[r.archetype]} · {RACE_SPECIALTY_LABELS[r.raceSpecialty]} · {t?.name}
              </div>
              <div className="font-mono text-xs opacity-60 mt-2">
                {riderStandings[0][1].toLocaleString()} points
              </div>
            </div>
          );
        })()}

        {/* Team Champion */}
        {teamStandings[0] && (() => {
          const t = universe.teams[teamStandings[0][0]];
          if (!t) return null;
          return (
            <div
              className="border-2 border-ink p-5 relative overflow-hidden"
              style={{ background: t.primaryColor, color: t.secondaryColor }}
            >
              <div className="font-sans tracking-widest text-[10px] opacity-80 uppercase">
                Team Champion
              </div>
              <button
                onClick={() => onTeam(t.id)}
                className="font-display font-black text-3xl hover:underline flex items-center gap-2 mt-1"
              >
                <span>{t.emoji}</span>
                {t.name}
              </button>
              <div className="font-body italic opacity-90 mt-1">{t.tagline}</div>
              <div className="font-mono text-xs opacity-80 mt-2">
                {teamStandings[0][1].toLocaleString()} points
              </div>
            </div>
          );
        })()}
      </div>

      {/* Big 3 winners */}
      <div className="mb-6">
        <div className="flex items-baseline gap-3 mb-3">
          <div className="font-display font-bold text-xl">The Grand Tours</div>
          <div className="flex-1 rule" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <GrandTourCard label="Tour de France" event={tour} onRider={onRider} onTeam={onTeam} />
          <GrandTourCard label="Giro d'Italia" event={giro} onRider={onRider} onTeam={onTeam} />
          <GrandTourCard label="Vuelta a España" event={vuelta} onRider={onRider} onTeam={onTeam} />
        </div>
      </div>

      {/* Win leaders + jersey kings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card-paper p-4">
          <div className="font-display font-bold text-lg mb-3">Most Race Wins</div>
          <ol className="space-y-2 tabular text-sm">
            {topRaceWinners.length === 0 && (
              <li className="opacity-50 italic">No races won yet</li>
            )}
            {topRaceWinners.map(([rid, count], i) => {
              const r = universe.riders[rid];
              if (!r) return null;
              return (
                <li key={rid} className="flex items-baseline gap-2">
                  <span className={`font-mono w-5 ${i === 0 ? 'text-rouge font-bold' : 'opacity-60'}`}>
                    {i + 1}
                  </span>
                  <Flag code={r.nationality} />
                  <button onClick={() => onRider(rid)} className="flex-1 text-left hover:underline truncate font-body">
                    {r.name}
                  </button>
                  <span className="font-mono text-rouge font-bold">×{count}</span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="card-paper p-4">
          <div className="font-display font-bold text-lg mb-3">Most Stage Wins</div>
          <ol className="space-y-2 tabular text-sm">
            {topStageWinners.length === 0 && (
              <li className="opacity-50 italic">No stages contested</li>
            )}
            {topStageWinners.map(([rid, count], i) => {
              const r = universe.riders[rid];
              if (!r) return null;
              return (
                <li key={rid} className="flex items-baseline gap-2">
                  <span className={`font-mono w-5 ${i === 0 ? 'text-rouge font-bold' : 'opacity-60'}`}>
                    {i + 1}
                  </span>
                  <Flag code={r.nationality} />
                  <button onClick={() => onRider(rid)} className="flex-1 text-left hover:underline truncate font-body">
                    {r.name}
                  </button>
                  <span className="font-mono text-rouge font-bold">×{count}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Jersey kings */}
      <div className="mb-6">
        <div className="flex items-baseline gap-3 mb-3">
          <div className="font-display font-bold text-xl">Jersey Kings of the Year</div>
          <div className="flex-1 rule" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <JerseyKing code="PTS" className="jersey-green" label="Best Sprinter" entry={bestSprinter} onRider={onRider} />
          <JerseyKing code="KOM" className="jersey-polka" label="Best Climber" entry={bestClimber} onRider={onRider} />
          <JerseyKing code="YTH" className="jersey-white" label="Best Youth" entry={bestYouth} onRider={onRider} />
        </div>
      </div>

      {/* Action */}
      <div className="flex justify-center pt-2 pb-6">
        <button
          className="btn-vintage"
          onClick={runOffseason}
        >
          Off-Season Market ▸
        </button>
      </div>
    </div>
  );
}

function GrandTourCard({
  label,
  event,
  onRider,
  onTeam,
}: {
  label: string;
  event: any;
  onRider: (id: string) => void;
  onTeam: (id: string) => void;
}) {
  const universe = useGame((s) => s.universe)!;
  if (!event) {
    return (
      <div className="card-paper p-4 opacity-50">
        <div className="font-display font-bold">{label}</div>
        <div className="italic text-sm mt-1">Not contested this year</div>
      </div>
    );
  }
  const winnerId = event.finalGc[0]?.riderId;
  const winner = winnerId ? universe.riders[winnerId] : null;
  const team = winner ? universe.teams[winner.teamId] : null;
  return (
    <div className="card-paper p-4">
      <div className="font-display font-bold">{label}</div>
      <div className="font-sans tracking-widest text-[10px] opacity-60 uppercase mt-0.5">
        Winner
      </div>
      {winner && (
        <button
          onClick={() => onRider(winner.id)}
          className="font-display font-bold text-lg hover:underline flex items-center gap-1.5 mt-1"
        >
          <Flag code={winner.nationality} />
          {winner.name}
        </button>
      )}
      {team && (
        <button
          onClick={() => onTeam(team.id)}
          className="font-body text-sm opacity-70 hover:underline flex items-center gap-1.5 mt-0.5"
        >
          <span>{team.emoji}</span>
          {team.name}
        </button>
      )}
    </div>
  );
}

function JerseyKing({
  code,
  className,
  label,
  entry,
  onRider,
}: {
  code: string;
  className: string;
  label: string;
  entry: [string, number] | undefined;
  onRider: (id: string) => void;
}) {
  const universe = useGame((s) => s.universe)!;
  if (!entry) {
    return (
      <div className="card-paper p-4 flex items-center gap-3 opacity-50">
        <div className={`${className} w-12 h-12 flex items-center justify-center shrink-0`}>
          <span className="font-sans tracking-widest text-[11px] font-bold">{code}</span>
        </div>
        <div>
          <div className="font-sans tracking-widest text-[10px] opacity-60 uppercase">{label}</div>
          <div className="italic">—</div>
        </div>
      </div>
    );
  }
  const r = universe.riders[entry[0]];
  if (!r) return null;
  return (
    <div className="card-paper p-4 flex items-center gap-3">
      <div className={`${className} w-12 h-12 flex items-center justify-center shrink-0`}>
        <span className="font-sans tracking-widest text-[11px] font-bold">{code}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-sans tracking-widest text-[10px] opacity-60 uppercase">{label}</div>
        <button onClick={() => onRider(r.id)} className="font-display font-bold text-lg hover:underline flex items-center gap-1.5">
          <Flag code={r.nationality} />
          <span className="truncate">{r.name}</span>
        </button>
        <div className="font-mono text-xs opacity-60">
          {entry[1]} jersey{entry[1] > 1 ? 's' : ''} this year
        </div>
      </div>
    </div>
  );
}
