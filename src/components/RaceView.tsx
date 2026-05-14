import { useEffect, useRef, useState } from 'react';
import { useGame } from '../state/store';
import { formatTime, formatGap } from '../utils/random';
import { Flag } from '../utils/flags';
import { terrainLabel } from '../utils/eventNames';
import type { CalendarEvent, StageResult, RaceClassification } from '../types';

const STAGE_TICK_MS = 1000;

export function RaceView() {
  const universe = useGame((s) => s.universe);
  const simulateOneStage = useGame((s) => s.simulateOneStage);
  const dismissRace = useGame((s) => s.dismissActiveRace);
  const setView = useGame((s) => s.setView);
  const selectRider = useGame((s) => s.selectRider);
  const selectTeam = useGame((s) => s.selectTeam);

  if (!universe || !universe.season.activeRace) {
    return (
      <div className="pt-12 text-center">
        <div className="font-display text-2xl mb-3">No active race</div>
        <button className="btn-vintage" onClick={() => setView('calendar')}>
          Back to calendar
        </button>
      </div>
    );
  }

  const event = universe.season.calendar[universe.season.currentEventIndex];
  const race = universe.season.activeRace;

  // If finished, render the results screen.
  if (race.finished) {
    return (
      <Results
        race={race}
        event={event}
        onDone={() => {
          dismissRace();
          setView('calendar');
        }}
        onSelectRider={(id) => {
          selectRider(id);
          setView('rider-detail');
        }}
        onSelectTeam={(id) => {
          selectTeam(id);
          setView('team-detail');
        }}
      />
    );
  }

  return (
    <LiveRace
      race={race}
      event={event}
      onSimulateStage={simulateOneStage}
      onSelectRider={(id) => {
        selectRider(id);
        setView('rider-detail');
      }}
      onSelectTeam={(id) => {
        selectTeam(id);
        setView('team-detail');
      }}
    />
  );
}

// ============================================================================
// LIVE RACE — auto-plays stages one at a time, pauses between steps
// ============================================================================

function LiveRace({
  race,
  event,
  onSimulateStage,
  onSelectRider,
  onSelectTeam,
}: {
  race: any;
  event: CalendarEvent;
  onSimulateStage: () => void;
  onSelectRider: (id: string) => void;
  onSelectTeam: (id: string) => void;
}) {
  // Track which step has been "started" by the user.
  // On mount, step 0 starts automatically. Subsequent steps require a click.
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const startedSteps = useRef<Set<number>>(new Set());
  const intervalRef = useRef<number | null>(null);
  const universe = useGame.getState().universe!;

  const stepsInRace = race.totalSteps;
  const startStageOfCurrentStep = stageStartIndexForStep(event, race.currentStep);
  const stagesInThisStep = stagesInStepFor(event, race.currentStep);
  const stagesDoneInStep = race.stageResults.length - startStageOfCurrentStep;
  const stagesLeftInStep = Math.max(0, stagesInThisStep - stagesDoneInStep);

  // Auto-start the FIRST step only — once. Subsequent steps wait for click.
  useEffect(() => {
    if (
      race.currentStep === 0 &&
      stagesDoneInStep === 0 &&
      stagesInThisStep > 0 &&
      !startedSteps.current.has(0)
    ) {
      startedSteps.current.add(0);
      setIsAutoPlaying(true);
    }
  }, [race.currentStep, stagesDoneInStep, stagesInThisStep]);

  // Run the per-stage tick while auto-playing
  useEffect(() => {
    if (!isAutoPlaying) return;
    if (stagesLeftInStep === 0) {
      setIsAutoPlaying(false);
      return;
    }
    intervalRef.current = window.setTimeout(() => {
      onSimulateStage();
    }, STAGE_TICK_MS);
    return () => {
      if (intervalRef.current) window.clearTimeout(intervalRef.current);
    };
  }, [isAutoPlaying, stagesLeftInStep, onSimulateStage]);

  const startNextStep = () => {
    startedSteps.current.add(race.currentStep);
    setIsAutoPlaying(true);
  };

  const latestStage: StageResult | undefined = race.stageResults[race.stageResults.length - 1];

  // Jersey leaders mid-race
  const pointsLeader = pickLeader(race.gc, 'pointsClassification');
  const mountainLeader = pickLeader(race.gc, 'mountainClassification');
  const youthLeader = race.gc.filter((r: RaceClassification) => r.isYoung)[0];
  const teamLeader = race.teamGc?.[0];

  return (
    <div className="pt-6">
      {/* Header */}
      <div className="mb-5 flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="font-sans tracking-[0.3em] text-xs opacity-60">
            {event.shortName} · STEP {race.currentStep + 1} OF {stepsInRace}
          </div>
          <div className="font-display font-black text-4xl leading-none">{event.name}</div>
          <div className="font-body italic opacity-70 mt-1">
            Stage {race.stageResults.length} of {event.stages.length}
            {isAutoPlaying && stagesLeftInStep > 0 && (
              <span className="ml-3 text-rouge font-bold">
                ● live · {stagesLeftInStep} more this step
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!isAutoPlaying && stagesLeftInStep > 0 && (
            <button className="btn-vintage" onClick={() => setIsAutoPlaying(true)}>
              Resume Step
            </button>
          )}
          {!isAutoPlaying && stagesLeftInStep === 0 && race.currentStep < stepsInRace && (
            <button className="btn-vintage" onClick={startNextStep}>
              Next Step ▸
            </button>
          )}
        </div>
      </div>

      {/* Three-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: General Classification (top 10) */}
        <div className="card-paper p-4">
          <div className="flex items-baseline justify-between mb-3">
            <div className="font-display font-bold text-lg">General Classification</div>
            <div className="font-sans tracking-widest text-[10px] opacity-50">
              AFTER {race.stageResults.length}
            </div>
          </div>
          <ol className="space-y-1 tabular text-sm">
            {race.gc.slice(0, 10).map((row: RaceClassification, i: number) => {
              const r = universe.riders[row.riderId];
              const t = universe.teams[row.teamId];
              if (!r) return null;
              return (
                <li key={row.riderId} className="flex items-baseline gap-2">
                  <span
                    className={`font-mono w-5 ${
                      i === 0 ? 'text-rouge font-bold' : 'opacity-60'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <Flag code={r.nationality} />
                  <button
                    className="flex-1 text-left hover:underline truncate font-body"
                    onClick={() => onSelectRider(row.riderId)}
                  >
                    {r.name}
                  </button>
                  <span className="font-mono text-[10px] opacity-50 uppercase">
                    {t?.shortName}
                  </span>
                  <span className="font-mono text-xs opacity-70 w-16 text-right">
                    {i === 0 ? formatTime(row.totalTimeSeconds) : formatGap(row.gapSeconds)}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* MIDDLE: Jersey leaders */}
        <div className="card-paper p-4">
          <div className="font-display font-bold text-lg mb-3">Jersey Leaders</div>
          <div className="space-y-3">
            <JerseyLeaderCard
              jerseyClass="jersey-green"
              code="PTS"
              label="Points · Sprinter"
              riderId={pointsLeader?.riderId}
              detail={pointsLeader ? `${pointsLeader.pointsClassification} pts` : ''}
              onSelectRider={onSelectRider}
            />
            <JerseyLeaderCard
              jerseyClass="jersey-polka"
              code="KOM"
              label="Mountain · KOM"
              riderId={mountainLeader?.riderId}
              detail={mountainLeader ? `${mountainLeader.mountainClassification} pts` : ''}
              onSelectRider={onSelectRider}
            />
            <JerseyLeaderCard
              jerseyClass="jersey-white"
              code="YTH"
              label="Best Young Rider"
              riderId={youthLeader?.riderId}
              detail={youthLeader ? formatGap(youthLeader.gapSeconds) : ''}
              onSelectRider={onSelectRider}
            />
            {teamLeader && (
              <div className="border-t border-ink/10 pt-3">
                <div className="font-sans tracking-widest text-[10px] opacity-60 uppercase mb-1.5">
                  Team Classification
                </div>
                <button
                  onClick={() => onSelectTeam(teamLeader.teamId)}
                  className="flex items-center gap-2 hover:underline"
                >
                  <span className="text-xl">{universe.teams[teamLeader.teamId]?.emoji}</span>
                  <span className="font-body font-bold">
                    {universe.teams[teamLeader.teamId]?.name}
                  </span>
                </button>
                <div className="font-mono text-xs opacity-60 mt-0.5">
                  {formatTime(teamLeader.totalTimeSeconds)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Latest stage result */}
        <div className="card-paper p-4">
          {latestStage ? (
            <>
              <div className="flex items-baseline justify-between mb-1">
                <div className="font-display font-bold text-lg">
                  Stage {latestStage.stageIndex + 1}
                </div>
                <div className="font-sans tracking-widest text-[10px] opacity-50 uppercase">
                  {terrainLabel(latestStage.stageType)}
                </div>
              </div>
              <div className="font-body italic text-xs opacity-60 mb-3 truncate">
                {latestStage.stageName.replace(/^Stage \d+ — /, '')} · {latestStage.distanceKm} km
              </div>
              <ol className="space-y-1 tabular text-sm">
                {latestStage.finishers.slice(0, 10).map((f, i) => {
                  const r = universe.riders[f.riderId];
                  const t = universe.teams[f.teamId];
                  if (!r) return null;
                  return (
                    <li key={f.riderId} className="flex items-baseline gap-2">
                      <span
                        className={`font-mono w-5 ${
                          i === 0 ? 'text-rouge font-bold' : 'opacity-60'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <Flag code={r.nationality} />
                      <button
                        className="flex-1 text-left hover:underline truncate font-body"
                        onClick={() => onSelectRider(f.riderId)}
                      >
                        {r.name}
                      </button>
                      <span className="font-mono text-[10px] opacity-50 uppercase">
                        {t?.shortName}
                      </span>
                      <span className="font-mono text-xs opacity-70 w-16 text-right">
                        {i === 0 ? formatTime(f.timeSeconds) : formatGap(f.gapSeconds)}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </>
          ) : (
            <div className="font-body italic opacity-60 py-8 text-center">
              Awaiting first stage…
            </div>
          )}
        </div>
      </div>

      {/* Stage progress bar — visual hint of the journey */}
      <div className="mt-6 card-paper p-3">
        <div className="font-sans tracking-widest text-[10px] opacity-60 uppercase mb-2">
          Race Progress
        </div>
        <div className="flex gap-0.5">
          {event.stages.map((s, i) => {
            const done = i < race.stageResults.length;
            const inCurrentStep =
              i >= startStageOfCurrentStep && i < startStageOfCurrentStep + stagesInThisStep;
            return (
              <div
                key={i}
                className={`flex-1 h-3 ${
                  done
                    ? 'bg-rouge'
                    : inCurrentStep
                    ? 'bg-rouge/30 border border-rouge'
                    : 'bg-paper-dark border border-ink/20'
                }`}
                title={`Stage ${i + 1} — ${s.type}${done ? ' ✓' : ''}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function pickLeader(
  gc: RaceClassification[],
  field: 'pointsClassification' | 'mountainClassification',
): RaceClassification | undefined {
  return [...gc].sort((a, b) => b[field] - a[field])[0];
}

function JerseyLeaderCard({
  jerseyClass,
  code,
  label,
  riderId,
  detail,
  onSelectRider,
}: {
  jerseyClass: string;
  code: string;
  label: string;
  riderId: string | undefined;
  detail: string;
  onSelectRider: (id: string) => void;
}) {
  const universe = useGame.getState().universe!;
  const r = riderId ? universe.riders[riderId] : null;
  const t = r ? universe.teams[r.teamId] : null;
  return (
    <div className="flex items-center gap-3">
      <div className={`${jerseyClass} w-12 h-12 flex items-center justify-center shrink-0`}>
        <span className="font-sans tracking-widest text-[11px] font-bold">{code}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-sans tracking-widest text-[10px] opacity-60 uppercase">{label}</div>
        {r ? (
          <button
            onClick={() => onSelectRider(r.id)}
            className="flex items-center gap-1.5 font-body font-bold hover:underline truncate w-full text-left"
          >
            <Flag code={r.nationality} />
            <span className="truncate">{r.name}</span>
          </button>
        ) : (
          <div className="font-body italic opacity-50 text-sm">—</div>
        )}
        <div className="font-mono text-xs opacity-60">
          {t?.shortName} {detail && `· ${detail}`}
        </div>
      </div>
    </div>
  );
}

// Match engine helpers (kept local to avoid importing engine into views).
function stagesInStepFor(event: CalendarEvent, stepIndex: number): number {
  const total = event.stages.length;
  if (total === 21) return [5, 4, 4, 4, 4][stepIndex] ?? 0;
  if (total === 8) return [4, 4][stepIndex] ?? 0;
  if (total === 7) return [4, 3][stepIndex] ?? 0;
  return total;
}

function stageStartIndexForStep(event: CalendarEvent, stepIndex: number): number {
  let sum = 0;
  for (let i = 0; i < stepIndex; i++) sum += stagesInStepFor(event, i);
  return sum;
}

// ============================================================================
// RESULTS SCREEN
// ============================================================================

function Results({
  race,
  event,
  onDone,
  onSelectRider,
  onSelectTeam,
}: {
  race: any;
  event: CalendarEvent;
  onDone: () => void;
  onSelectRider: (id: string) => void;
  onSelectTeam: (id: string) => void;
}) {
  const universe = useGame.getState().universe!;
  const jerseys = race.jerseys!;

  // Stage win tally by rider
  const stageWinEntries = Object.entries(race.stageWinsByRider as Record<string, number>)
    .filter(([, count]) => (count as number) > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number));

  // Top 3 GC trajectory for the chart
  const top3 = race.gc.slice(0, 3).map((r: RaceClassification) => r.riderId);
  const hasMultipleStages = race.stageResults.length > 1;

  return (
    <div className="pt-6">
      {/* Headline */}
      <div className="border-2 border-ink p-6 mb-6 bg-paper">
        <div className="font-sans tracking-[0.3em] text-xs opacity-60">
          {event.shortName} · RESULTS
        </div>
        <div className="font-display font-black text-5xl leading-none mt-1">{event.name}</div>
        <div className="mt-3 flex items-center gap-3">
          <span className="font-sans tracking-widest text-xs opacity-60">WINNER</span>
          {(() => {
            const winnerR = universe.riders[jerseys.gc];
            const winnerT = winnerR ? universe.teams[winnerR.teamId] : null;
            if (!winnerR) return null;
            return (
              <button
                onClick={() => onSelectRider(winnerR.id)}
                className="font-display font-bold text-2xl hover:underline flex items-center gap-2"
              >
                <Flag code={winnerR.nationality} />
                {winnerR.name}
                <span className="font-mono text-sm opacity-60">
                  {winnerT?.shortName}
                </span>
              </button>
            );
          })()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* GC Top 10 */}
        <div className="card-paper p-4 lg:col-span-1">
          <div className="font-display font-bold text-lg mb-3">General Classification</div>
          <ol className="space-y-1 tabular text-sm">
            {race.gc.slice(0, 10).map((row: RaceClassification, i: number) => {
              const r = universe.riders[row.riderId];
              const t = universe.teams[row.teamId];
              if (!r) return null;
              return (
                <li key={row.riderId} className="flex items-baseline gap-2">
                  <span
                    className={`font-mono w-5 ${
                      i === 0 ? 'text-rouge font-bold' : 'opacity-60'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <Flag code={r.nationality} />
                  <button
                    className="flex-1 text-left hover:underline truncate font-body"
                    onClick={() => onSelectRider(row.riderId)}
                  >
                    {r.name}
                  </button>
                  <span className="font-mono text-[10px] opacity-50 uppercase">
                    {t?.shortName}
                  </span>
                  <span className="font-mono text-xs opacity-70 w-16 text-right">
                    {i === 0 ? formatTime(row.totalTimeSeconds) : formatGap(row.gapSeconds)}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Jersey Winners + Team Winner */}
        <div className="card-paper p-4">
          <div className="font-display font-bold text-lg mb-3">Classifications</div>
          <div className="space-y-3">
            <FinalJersey
              jerseyClass="jersey-yellow"
              code="GC"
              label="GC Winner"
              riderId={jerseys.gc}
              onSelectRider={onSelectRider}
            />
            <FinalJersey
              jerseyClass="jersey-green"
              code="PTS"
              label="Points · Sprinter"
              riderId={jerseys.points}
              onSelectRider={onSelectRider}
            />
            <FinalJersey
              jerseyClass="jersey-polka"
              code="KOM"
              label="Mountain · KOM"
              riderId={jerseys.mountain}
              onSelectRider={onSelectRider}
            />
            {jerseys.youth && (
              <FinalJersey
                jerseyClass="jersey-white"
                code="YTH"
                label="Best Young Rider"
                riderId={jerseys.youth}
                onSelectRider={onSelectRider}
              />
            )}
            {jerseys.teamWinnerId && (
              <div className="border-t border-ink/10 pt-3">
                <div className="font-sans tracking-widest text-[10px] opacity-60 uppercase mb-1">
                  Best Team
                </div>
                <button
                  onClick={() => onSelectTeam(jerseys.teamWinnerId)}
                  className="flex items-center gap-2 hover:underline"
                >
                  <span className="text-xl">{universe.teams[jerseys.teamWinnerId]?.emoji}</span>
                  <span className="font-body font-bold">
                    {universe.teams[jerseys.teamWinnerId]?.name}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stage Wins */}
        <div className="card-paper p-4">
          <div className="font-display font-bold text-lg mb-3">Stage Wins</div>
          {stageWinEntries.length === 0 ? (
            <div className="font-body italic opacity-50">—</div>
          ) : (
            <ol className="space-y-1.5 tabular text-sm">
              {stageWinEntries.map(([rid, count]) => {
                const r = universe.riders[rid];
                if (!r) return null;
                return (
                  <li key={rid} className="flex items-baseline gap-2">
                    <Flag code={r.nationality} />
                    <button
                      className="flex-1 text-left hover:underline truncate font-body"
                      onClick={() => onSelectRider(rid)}
                    >
                      {r.name}
                    </button>
                    <span className="font-mono text-rouge font-bold">×{count}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      {/* Top-3 GC trajectory chart (only if multi-stage) */}
      {hasMultipleStages && (
        <div className="mt-6">
          <div className="flex items-baseline gap-3 mb-3">
            <div className="font-display font-bold text-xl">Top 3 · GC Trajectory</div>
            <div className="flex-1 rule" />
          </div>
          <div className="card-paper p-4">
            <GcTrajectoryChart
              stageResults={race.stageResults}
              top3RiderIds={top3}
            />
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <button className="btn-vintage" onClick={onDone}>
          Continue Season ▸
        </button>
      </div>
    </div>
  );
}

function FinalJersey({
  jerseyClass,
  code,
  label,
  riderId,
  onSelectRider,
}: {
  jerseyClass: string;
  code: string;
  label: string;
  riderId: string | null | undefined;
  onSelectRider: (id: string) => void;
}) {
  const universe = useGame.getState().universe!;
  if (!riderId) return null;
  const r = universe.riders[riderId];
  const t = r ? universe.teams[r.teamId] : null;
  if (!r) return null;
  return (
    <div className="flex items-center gap-3">
      <div className={`${jerseyClass} w-12 h-12 flex items-center justify-center shrink-0`}>
        <span className="font-sans tracking-widest text-[11px] font-bold">{code}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-sans tracking-widest text-[10px] opacity-60 uppercase">{label}</div>
        <button
          onClick={() => onSelectRider(r.id)}
          className="flex items-center gap-1.5 font-body font-bold hover:underline truncate w-full text-left"
        >
          <Flag code={r.nationality} />
          <span className="truncate">{r.name}</span>
        </button>
        <div className="font-mono text-xs opacity-60">{t?.shortName}</div>
      </div>
    </div>
  );
}

// ============================================================================
// GC TRAJECTORY CHART — top 3 finishers' position after each stage (capped at 25)
// ============================================================================

const CHART_W = 760;
const CHART_H = 280;
const CHART_PADDING = { top: 20, right: 80, bottom: 30, left: 40 };
const MAX_POSITION_DISPLAY = 25;

const LINE_COLORS = ['#c89f1a', '#7a7a7a', '#9c6b3f']; // gold, silver, bronze

function GcTrajectoryChart({
  stageResults,
  top3RiderIds,
}: {
  stageResults: StageResult[];
  top3RiderIds: string[];
}) {
  const universe = useGame.getState().universe!;
  const stageCount = stageResults.length;
  if (stageCount === 0 || top3RiderIds.length === 0) return null;

  // For each rider in top3, build their position-after-stage-N trajectory.
  // Computing this requires re-deriving GC standings step by step from
  // cumulative times in stage results.

  // Cumulative time per rider per stage
  const cumulativeTimeAfter: Record<string, number>[] = [];
  const seen: Record<string, number> = {}; // rider -> running cum time
  for (let s = 0; s < stageCount; s++) {
    const sr = stageResults[s];
    for (const f of sr.finishers) {
      seen[f.riderId] = (seen[f.riderId] ?? 0) + f.timeSeconds;
    }
    cumulativeTimeAfter.push({ ...seen });
  }

  // For each stage, compute the position of each top-3 rider in GC
  // (by sorting everyone by cumulative time and finding their rank).
  const trajectories: { riderId: string; positions: (number | null)[] }[] = top3RiderIds.map(
    (rid) => ({ riderId: rid, positions: [] }),
  );

  for (let s = 0; s < stageCount; s++) {
    const cum = cumulativeTimeAfter[s];
    const sorted = Object.entries(cum).sort((a, b) => a[1] - b[1]);
    const posByRider = new Map<string, number>();
    sorted.forEach(([rid], i) => posByRider.set(rid, i + 1));
    for (const traj of trajectories) {
      traj.positions.push(posByRider.get(traj.riderId) ?? null);
    }
  }

  // Plot params
  const innerW = CHART_W - CHART_PADDING.left - CHART_PADDING.right;
  const innerH = CHART_H - CHART_PADDING.top - CHART_PADDING.bottom;
  const xFor = (s: number) =>
    CHART_PADDING.left +
    (stageCount === 1 ? innerW / 2 : (s / (stageCount - 1)) * innerW);
  const yFor = (pos: number | null) => {
    if (pos === null) return CHART_PADDING.top + innerH; // bottom
    const clamped = Math.min(pos, MAX_POSITION_DISPLAY);
    return CHART_PADDING.top + ((clamped - 1) / (MAX_POSITION_DISPLAY - 1)) * innerH;
  };

  // Y gridlines at positions 1, 5, 10, 15, 20, 25
  const yTicks = [1, 5, 10, 15, 20, 25];

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Y grid + labels */}
        {yTicks.map((p) => (
          <g key={p}>
            <line
              x1={CHART_PADDING.left}
              x2={CHART_W - CHART_PADDING.right}
              y1={yFor(p)}
              y2={yFor(p)}
              className="gc-chart-grid"
            />
            <text
              x={CHART_PADDING.left - 6}
              y={yFor(p) + 3}
              textAnchor="end"
              className="gc-chart-label"
            >
              {p}
            </text>
          </g>
        ))}

        {/* X axis labels (stage numbers) */}
        {Array.from({ length: stageCount }, (_, i) => (
          <text
            key={i}
            x={xFor(i)}
            y={CHART_H - CHART_PADDING.bottom + 16}
            textAnchor="middle"
            className="gc-chart-label"
          >
            {i + 1}
          </text>
        ))}

        {/* Y axis title */}
        <text
          x={10}
          y={CHART_PADDING.top - 6}
          className="gc-chart-label"
          style={{ fontWeight: 700 }}
        >
          GC POS
        </text>

        {/* X axis title */}
        <text
          x={CHART_W / 2}
          y={CHART_H - 4}
          textAnchor="middle"
          className="gc-chart-label"
          style={{ fontWeight: 700 }}
        >
          STAGE
        </text>

        {/* Trajectory lines */}
        {trajectories.map((traj, ti) => {
          // Build the SVG path
          const points = traj.positions
            .map((p, i) => `${xFor(i)},${yFor(p)}`)
            .join(' L ');
          const path = `M ${points}`;
          const color = LINE_COLORS[ti] ?? '#1a1814';
          return (
            <g key={traj.riderId}>
              <path d={path} className="gc-chart-line" stroke={color} />
              {/* Dots at each stage */}
              {traj.positions.map((p, i) => (
                <circle
                  key={i}
                  cx={xFor(i)}
                  cy={yFor(p)}
                  r={3}
                  fill={color}
                />
              ))}
              {/* End-of-line label */}
              <text
                x={xFor(stageCount - 1) + 6}
                y={yFor(traj.positions[stageCount - 1]) + 4}
                className="gc-chart-label"
                style={{ fill: color, fontWeight: 700 }}
              >
                {universe.riders[traj.riderId]?.name.split(' ').pop() ?? '?'}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3 font-body text-sm">
        {trajectories.map((traj, ti) => {
          const r = universe.riders[traj.riderId];
          if (!r) return null;
          return (
            <div key={traj.riderId} className="flex items-center gap-2">
              <span
                className="inline-block w-6 h-0.5"
                style={{ background: LINE_COLORS[ti] }}
              />
              <Flag code={r.nationality} />
              <span className="font-bold">{r.name}</span>
              <span className="opacity-50 font-mono text-xs">#{ti + 1}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
