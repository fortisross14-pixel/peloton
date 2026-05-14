import { useGame } from '../state/store';
import { Flag } from '../utils/flags';
import { formatGap } from '../utils/random';
import type { CompletedEventResult } from '../types';

export function SeasonView() {
  const universe = useGame((s) => s.universe);
  const selectRider = useGame((s) => s.selectRider);
  const selectTeam = useGame((s) => s.selectTeam);
  if (!universe) return null;

  const calendar = universe.season.calendar;
  const completedById = new Map<string, CompletedEventResult>();
  for (const ev of universe.season.completedEvents) completedById.set(ev.eventId, ev);

  return (
    <div className="pt-8">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="font-sans tracking-[0.3em] text-xs opacity-60">SEASON</div>
          <div className="font-display font-black text-4xl">
            {universe.currentYear} Ledger
          </div>
          <div className="font-body italic opacity-70 mt-1">
            {universe.season.completedEvents.length} of {calendar.length} races completed
          </div>
        </div>
      </div>

      <div className="card-paper overflow-x-auto">
        <table className="w-full tabular text-sm">
          <thead>
            <tr className="border-b border-ink/30">
              <th className="text-left p-2.5 font-sans text-[10px] tracking-widest opacity-60">RACE</th>
              <th className="text-left p-2.5 font-sans text-[10px] tracking-widest opacity-60">PODIUM</th>
              <th className="text-left p-2.5 font-sans text-[10px] tracking-widest opacity-60">TEAM</th>
              <th className="text-left p-2.5 font-sans text-[10px] tracking-widest opacity-60">
                <span className="jersey-green inline-block px-1.5">PTS</span>
              </th>
              <th className="text-left p-2.5 font-sans text-[10px] tracking-widest opacity-60">
                <span className="jersey-polka inline-block px-1.5">KOM</span>
              </th>
              <th className="text-left p-2.5 font-sans text-[10px] tracking-widest opacity-60">
                <span className="jersey-white inline-block px-1.5">YTH</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {calendar.map((event) => {
              const result = completedById.get(event.id);
              const monthLabel = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][event.month - 1];

              if (!result) {
                return (
                  <tr key={event.id} className="border-b border-ink/10 opacity-50">
                    <td className="p-2.5">
                      <div className="font-body font-bold">{event.name}</div>
                      <div className="font-mono text-[10px] opacity-60">
                        {monthLabel} · {event.shortName}
                      </div>
                    </td>
                    <td colSpan={5} className="p-2.5 italic opacity-50">— upcoming —</td>
                  </tr>
                );
              }

              const winner = result.finalGc[0];
              const second = result.finalGc[1];
              const third = result.finalGc[2];
              const winnerTeam = winner ? universe.teams[winner.teamId] : null;

              return (
                <tr key={event.id} className="border-b border-ink/10">
                  <td className="p-2.5 align-top">
                    <div className="font-body font-bold">{event.name}</div>
                    <div className="font-mono text-[10px] opacity-60">
                      {monthLabel} · {event.shortName}
                    </div>
                  </td>
                  <td className="p-2.5 align-top">
                    <PodiumCell
                      pos={1}
                      riderId={winner?.riderId}
                      onClickRider={selectRider}
                    />
                    {second && (
                      <PodiumCell
                        pos={2}
                        riderId={second.riderId}
                        gapLabel={formatGap(second.gapSeconds)}
                        onClickRider={selectRider}
                      />
                    )}
                    {third && (
                      <PodiumCell
                        pos={3}
                        riderId={third.riderId}
                        gapLabel={formatGap(third.gapSeconds)}
                        onClickRider={selectRider}
                      />
                    )}
                  </td>
                  <td className="p-2.5 align-top">
                    {winnerTeam && (
                      <button
                        onClick={() => selectTeam(winnerTeam.id)}
                        className="flex items-center gap-1.5 hover:underline"
                      >
                        <span>{winnerTeam.emoji}</span>
                        <span className="font-mono text-xs">{winnerTeam.shortName}</span>
                      </button>
                    )}
                  </td>
                  <JerseyCell riderId={result.jerseys.points} onClick={selectRider} />
                  <JerseyCell riderId={result.jerseys.mountain} onClick={selectRider} />
                  <JerseyCell riderId={result.jerseys.youth} onClick={selectRider} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PodiumCell({
  pos,
  riderId,
  gapLabel,
  onClickRider,
}: {
  pos: number;
  riderId: string | undefined;
  gapLabel?: string;
  onClickRider: (id: string) => void;
}) {
  const universe = useGame.getState().universe;
  if (!universe || !riderId) return null;
  const r = universe.riders[riderId];
  if (!r) return null;
  const color = pos === 1 ? 'text-rouge font-bold' : 'opacity-70';
  return (
    <div className="flex items-baseline gap-1.5 leading-tight">
      <span className={`font-mono text-xs ${color}`}>{pos}.</span>
      <span className="text-xs leading-none"><Flag code={r.nationality} /></span>
      <button
        onClick={() => onClickRider(riderId)}
        className="font-body text-xs hover:underline truncate"
      >
        {r.name}
      </button>
      {gapLabel && <span className="font-mono text-[10px] opacity-50 ml-auto">{gapLabel}</span>}
    </div>
  );
}

function JerseyCell({
  riderId,
  onClick,
}: {
  riderId: string | undefined | null;
  onClick: (id: string) => void;
}) {
  const universe = useGame.getState().universe;
  if (!universe || !riderId) return <td className="p-2.5 opacity-30">—</td>;
  const r = universe.riders[riderId];
  if (!r) return <td className="p-2.5 opacity-30">—</td>;
  return (
    <td className="p-2.5 align-top">
      <button
        onClick={() => onClick(riderId)}
        className="flex items-center gap-1 hover:underline text-xs font-body"
      >
        <span className="leading-none"><Flag code={r.nationality} /></span>
        <span className="truncate">{r.name}</span>
      </button>
    </td>
  );
}
