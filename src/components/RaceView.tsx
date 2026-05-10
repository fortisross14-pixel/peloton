import { useGame } from '../state/store';
import { formatTime, formatGap } from '../utils/random';
import type { CalendarEvent, StageResult } from '../types';

export function RaceView() {
  const universe = useGame((s) => s.universe);
  const simulateStep = useGame((s) => s.simulateStep);
  const dismissActiveRace = useGame((s) => s.dismissActiveRace);
  const selectRider = useGame((s) => s.selectRider);
  if (!universe) return null;

  const race = universe.season.activeRace;
  if (!race) {
    return (
      <div className="pt-12 text-center">
        <div className="font-display text-2xl mb-3">No race in progress.</div>
        <div className="opacity-60">Open the calendar to start the next event.</div>
      </div>
    );
  }

  const event = universe.season.calendar.find((e) => e.id === race.eventId)!;

  // Stages already simulated, grouped by step.
  const stagesPerStep = Math.ceil(event.stages.length / event.stepsCount);
  const stepGroups: StageResult[][] = [];
  for (let s = 0; s < race.currentStep; s++) {
    const start = s * stagesPerStep;
    const end = Math.min(start + stagesPerStep, event.stages.length);
    stepGroups.push(race.stageResults.slice(start, end));
  }

  return (
    <div className="pt-8">
      {/* Race headline */}
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="font-sans tracking-[0.3em] text-xs text-rouge">{event.country} · {event.category.replace('-', ' ').toUpperCase()}</div>
          <div className="font-display font-black text-5xl leading-none mt-1">{event.name}</div>
          <div className="font-body italic opacity-70 mt-1">
            {event.stages.length} stages · {race.participants.length} starters
          </div>
        </div>
        <div className="text-right font-mono">
          <div className="text-xs opacity-60 tracking-widest">PROGRESS</div>
          <div className="text-3xl">
            {race.currentStep} <span className="opacity-50">/ {race.totalSteps}</span>
          </div>
        </div>
      </div>

      {/* Step blocks */}
      <div className="space-y-8">
        {stepGroups.map((stages, stepIdx) => (
          <StepBlock
            key={stepIdx}
            stepNumber={stepIdx + 1}
            stages={stages}
            event={event}
            isLatest={stepIdx === stepGroups.length - 1}
            gcSnapshot={
              stepIdx === stepGroups.length - 1 ? race.gc.slice(0, 10) : null
            }
            teamSnapshot={
              stepIdx === stepGroups.length - 1 ? race.teamGc.slice(0, 3) : null
            }
            onSelectRider={selectRider}
          />
        ))}
      </div>

      {/* End of race wrap-up */}
      {race.finished && (
        <FinalResults race={race} event={event} onSelectRider={selectRider} />
      )}

      {/* Action bar */}
      <div className="mt-10 flex justify-between items-center">
        <button
          className="btn-vintage outline"
          onClick={() => useGame.getState().setView('calendar')}
        >
          ← Back to Calendar
        </button>
        {!race.finished ? (
          <button className="btn-vintage" onClick={simulateStep}>
            Simulate Next Step →
          </button>
        ) : (
          <button className="btn-vintage" onClick={dismissActiveRace}>
            Continue Season →
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================

function StepBlock({
  stepNumber,
  stages,
  event,
  isLatest,
  gcSnapshot,
  teamSnapshot,
  onSelectRider,
}: {
  stepNumber: number;
  stages: StageResult[];
  event: CalendarEvent;
  isLatest: boolean;
  gcSnapshot: import('../types').RaceClassification[] | null;
  teamSnapshot: import('../types').TeamClassification[] | null;
  onSelectRider: (id: string) => void;
}) {
  const universe = useGame.getState().universe;
  if (!universe) return null;
  return (
    <section className={`${isLatest ? 'animate-fade-in' : ''}`}>
      <div className="flex items-center gap-4 mb-3">
        <div className="font-sans tracking-[0.3em] text-xs opacity-50">STEP {stepNumber}</div>
        <div className="flex-1 rule" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Stage podiums */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {stages.map((stage) => (
            <div key={stage.stageIndex} className="card-paper p-4">
              <div className="flex items-baseline justify-between mb-2">
                <div className="font-display font-bold">Stage {stage.stageIndex + 1}</div>
                <div className="font-sans tracking-widest text-[10px] opacity-50 uppercase">
                  {stage.stageType.replace('-', ' ')}
                </div>
              </div>
              <div className="font-body italic text-xs opacity-60 mb-3 truncate">
                {stage.stageName.replace(/^Stage \d+ — /, '')} · {stage.distanceKm} km
              </div>
              <ol className="space-y-1.5 tabular text-sm">
                {stage.finishers.slice(0, 3).map((f, i) => {
                  const r = universe.riders[f.riderId];
                  if (!r) return null;
                  return (
                    <li key={f.riderId} className="flex items-baseline gap-2">
                      <span className="font-mono text-rouge font-bold w-4">{i + 1}</span>
                      <button
                        className="flex-1 text-left hover:underline truncate font-body"
                        onClick={() => onSelectRider(f.riderId)}
                      >
                        {r.name}
                      </button>
                      <span className="font-mono text-xs opacity-70">
                        {i === 0 ? formatTime(f.timeSeconds) : formatGap(f.gapSeconds)}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>

        {/* Snapshot of GC + team after this step */}
        {isLatest && gcSnapshot && (
          <div className="space-y-4">
            <div className="card-paper p-4">
              <div className="flex items-baseline justify-between mb-3">
                <div className="font-display font-bold text-lg">General Classification</div>
                <div className="font-sans tracking-widest text-[10px] opacity-50 uppercase">After Step {stepNumber}</div>
              </div>
              <ol className="space-y-1.5 tabular text-sm">
                {gcSnapshot.map((row) => {
                  const r = universe.riders[row.riderId];
                  const t = universe.teams[row.teamId];
                  if (!r) return null;
                  return (
                    <li key={row.riderId} className="flex items-baseline gap-2">
                      <span className={`font-mono w-4 ${row.position === 1 ? 'text-rouge font-bold' : 'opacity-60'}`}>
                        {row.position}
                      </span>
                      <button
                        className="flex-1 text-left hover:underline truncate font-body"
                        onClick={() => onSelectRider(row.riderId)}
                      >
                        {r.name}
                      </button>
                      <span className="font-mono text-[10px] opacity-50 uppercase">{t?.shortName}</span>
                      <span className="font-mono text-xs opacity-70 w-20 text-right">
                        {row.position === 1 ? formatTime(row.totalTimeSeconds) : formatGap(row.gapSeconds)}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            {teamSnapshot && (
              <div className="card-paper p-4">
                <div className="flex items-baseline justify-between mb-3">
                  <div className="font-display font-bold text-lg">Teams</div>
                  <div className="font-sans tracking-widest text-[10px] opacity-50 uppercase">Top 3</div>
                </div>
                <ol className="space-y-1.5 tabular text-sm">
                  {teamSnapshot.map((row) => {
                    const t = universe.teams[row.teamId];
                    if (!t) return null;
                    return (
                      <li key={row.teamId} className="flex items-baseline gap-2">
                        <span className={`font-mono w-4 ${row.position === 1 ? 'text-rouge font-bold' : 'opacity-60'}`}>
                          {row.position}
                        </span>
                        <span className="flex-1 truncate font-body">{t.name}</span>
                        <span className="font-mono text-xs opacity-70">
                          {row.position === 1 ? formatTime(row.totalTimeSeconds) : formatGap(row.gapSeconds)}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================================

function FinalResults({
  race,
  event,
  onSelectRider,
}: {
  race: import('../types').RaceState;
  event: CalendarEvent;
  onSelectRider: (id: string) => void;
}) {
  const universe = useGame.getState().universe;
  if (!universe || !race.jerseys) return null;
  const jerseys = race.jerseys;
  const rider = (id: string) => universe.riders[id];
  const team = (id: string) => universe.teams[id];

  return (
    <section className="mt-10 animate-stamp">
      <div className="border-y-2 border-ink py-6 my-2">
        <div className="text-center">
          <div className="font-sans tracking-[0.4em] text-xs text-rouge mb-1">RACE CONCLUDED</div>
          <div className="font-display font-black text-3xl">Final Classification</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Top 10 GC */}
        <div className="card-paper p-5">
          <div className="font-display font-bold text-lg mb-3">General Classification · Top 10</div>
          <ol className="space-y-1.5 tabular">
            {race.gc.slice(0, 10).map((row) => {
              const r = rider(row.riderId);
              const t = team(row.teamId);
              if (!r) return null;
              return (
                <li key={row.riderId} className="flex items-baseline gap-2">
                  <span className={`font-mono w-5 ${row.position <= 3 ? 'text-rouge font-bold' : 'opacity-60'}`}>
                    {row.position}
                  </span>
                  <button
                    className="flex-1 text-left hover:underline font-body truncate"
                    onClick={() => onSelectRider(row.riderId)}
                  >
                    {r.name}
                  </button>
                  <span className="font-mono text-[10px] opacity-50 uppercase">{t?.shortName}</span>
                  <span className="font-mono text-xs w-24 text-right">
                    {row.position === 1 ? formatTime(row.totalTimeSeconds) : formatGap(row.gapSeconds)}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Jerseys */}
        <div className="space-y-3">
          {event.awardsJerseys ? (
            <>
              <JerseyRow
                jersey="yellow"
                title="General Classification"
                riderName={rider(jerseys.gc)?.name}
                teamName={team(rider(jerseys.gc)?.teamId ?? '')?.name}
                onClick={() => onSelectRider(jerseys.gc)}
              />
              <JerseyRow
                jersey="green"
                title="Points · Sprinter"
                riderName={rider(jerseys.points)?.name}
                teamName={team(rider(jerseys.points)?.teamId ?? '')?.name}
                onClick={() => onSelectRider(jerseys.points)}
              />
              <JerseyRow
                jersey="polka"
                title="Mountain · King of the Mountains"
                riderName={rider(jerseys.mountain)?.name}
                teamName={team(rider(jerseys.mountain)?.teamId ?? '')?.name}
                onClick={() => onSelectRider(jerseys.mountain)}
              />
              {jerseys.youth && (
                <JerseyRow
                  jersey="white"
                  title="Youth · Best Young Rider"
                  riderName={rider(jerseys.youth)?.name}
                  teamName={team(rider(jerseys.youth)?.teamId ?? '')?.name}
                  onClick={() => onSelectRider(jerseys.youth!)}
                />
              )}
              <div className="card-paper p-3 flex items-center gap-3">
                <div className="font-sans tracking-widest text-[10px] uppercase bg-ink text-paper px-2 py-1">
                  Team
                </div>
                <div className="flex-1">
                  <div className="font-body font-bold">{team(jerseys.teamWinnerId)?.name}</div>
                  <div className="font-mono text-xs opacity-60">Team Classification Winner</div>
                </div>
              </div>
            </>
          ) : (
            <div className="card-paper p-5">
              <div className="font-display font-bold text-lg mb-2">Race Winner</div>
              <button
                onClick={() => onSelectRider(jerseys.gc)}
                className="font-display text-2xl hover:underline"
              >
                {rider(jerseys.gc)?.name}
              </button>
              <div className="font-body italic opacity-70 mt-1">
                {team(rider(jerseys.gc)?.teamId ?? '')?.name}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stage win count */}
      <div className="mt-6 card-paper p-5">
        <div className="font-display font-bold text-lg mb-3">Stage Wins · This Race</div>
        <div className="flex flex-wrap gap-3">
          {Object.entries(race.stageWinsByRider)
            .sort((a, b) => b[1] - a[1])
            .map(([rid, count]) => {
              const r = rider(rid);
              if (!r) return null;
              return (
                <button
                  key={rid}
                  className="font-body hover:underline"
                  onClick={() => onSelectRider(rid)}
                >
                  <span className="font-bold">{r.name}</span>
                  <span className="font-mono text-rouge ml-1">×{count}</span>
                </button>
              );
            })}
        </div>
      </div>
    </section>
  );
}

function JerseyRow({
  jersey,
  title,
  riderName,
  teamName,
  onClick,
}: {
  jersey: 'yellow' | 'green' | 'polka' | 'white';
  title: string;
  riderName?: string;
  teamName?: string;
  onClick: () => void;
}) {
  const cls =
    jersey === 'yellow' ? 'jersey-yellow' :
    jersey === 'green' ? 'jersey-green' :
    jersey === 'polka' ? 'jersey-polka' : 'jersey-white';
  return (
    <div className="card-paper p-3 flex items-center gap-3">
      <div className={`${cls} font-sans tracking-widest text-[10px] uppercase px-2 py-1`}>
        {jersey === 'yellow' ? 'GC' : jersey === 'green' ? 'PTS' : jersey === 'polka' ? 'KOM' : 'Youth'}
      </div>
      <div className="flex-1 min-w-0">
        <button onClick={onClick} className="font-body font-bold hover:underline truncate block">{riderName ?? '—'}</button>
        <div className="font-mono text-xs opacity-60 truncate">{title} · {teamName ?? ''}</div>
      </div>
    </div>
  );
}
