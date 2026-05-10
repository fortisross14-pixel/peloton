import { useGame } from '../state/store';
import { MONTH_NAMES } from '../data/calendar';
import type { CalendarEvent } from '../types';
import { isSeasonOver } from '../engine/season';
import { toRoman } from '../utils/random';

export function CalendarView() {
  const universe = useGame((s) => s.universe);
  const startActiveRace = useGame((s) => s.startActiveRace);
  const setView = useGame((s) => s.setView);
  const endSeasonAndAdvance = useGame((s) => s.endSeasonAndAdvance);
  if (!universe) return null;

  const { calendar, currentEventIndex, completedEvents } = universe.season;
  const seasonOver = isSeasonOver(universe);
  const currentEvent: CalendarEvent | undefined = calendar[currentEventIndex];

  // Group by month
  const byMonth: Record<number, CalendarEvent[]> = {};
  for (const ev of calendar) {
    if (!byMonth[ev.month]) byMonth[ev.month] = [];
    byMonth[ev.month].push(ev);
  }
  const months = Object.keys(byMonth).map(Number).sort((a, b) => a - b);

  return (
    <div className="pt-8">
      {/* Season header strip */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="font-sans tracking-widest text-xs opacity-60">SEASON</div>
          <div className="font-display font-black text-4xl">{universe.currentYear}</div>
        </div>
        <div className="text-right">
          <div className="font-sans tracking-widest text-xs opacity-60">RACES COMPLETED</div>
          <div className="font-mono text-2xl">{completedEvents.length} <span className="opacity-50">/ {calendar.length}</span></div>
        </div>
      </div>

      {/* Action bar */}
      {seasonOver ? (
        <div className="card-paper p-6 mb-6 border-2 border-rouge text-center">
          <div className="font-display text-2xl mb-2">Season Concluded</div>
          <div className="opacity-70 mb-4">All races have been run. Time for the off-season market.</div>
          <button className="btn-vintage" onClick={endSeasonAndAdvance}>
            Advance to {universe.currentYear + 1}
          </button>
        </div>
      ) : currentEvent ? (
        <div className="card-paper p-6 mb-6 border-2 border-rouge">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="font-sans tracking-[0.2em] text-xs text-rouge mb-1">UP NEXT</div>
              <div className="font-display font-black text-3xl">{currentEvent.name}</div>
              <div className="font-body italic opacity-70 mt-1">
                {MONTH_NAMES[currentEvent.month]} · {currentEvent.country} · {labelForCategory(currentEvent.category)}
              </div>
              <div className="font-mono text-sm mt-2 opacity-80">
                {currentEvent.stages.length} stage{currentEvent.stages.length > 1 ? 's' : ''} · {currentEvent.ridersPerTeam} riders/team · {currentEvent.stepsCount} step{currentEvent.stepsCount > 1 ? 's' : ''}
              </div>
            </div>
            <button className="btn-vintage" onClick={() => {
              startActiveRace();
              setView('race');
            }}>
              Sign On
            </button>
          </div>
        </div>
      ) : null}

      {/* Calendar grid by month */}
      <div className="space-y-8">
        {months.map((month) => (
          <div key={month}>
            <div className="flex items-center gap-3 mb-3">
              <div className="font-sans tracking-[0.3em] text-xs opacity-50">
                {MONTH_NAMES[month].toUpperCase()}
              </div>
              <div className="flex-1 rule" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {byMonth[month].map((event) => {
                const completed = completedEvents.find((c) => c.eventId === event.id);
                const isCurrent = currentEvent?.id === event.id;
                const winnerName = completed
                  ? universe.riders[completed.finalGc[0]?.riderId ?? '']?.name
                  : null;
                return (
                  <div
                    key={event.id}
                    className={`card-paper p-4 transition-all ${
                      isCurrent ? 'border-rouge border-2 -translate-y-0.5' : ''
                    } ${completed ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-display font-bold text-lg leading-tight">
                        {event.name}
                      </div>
                      <CategoryBadge category={event.category} />
                    </div>
                    <div className="font-mono text-xs opacity-60 mt-1">
                      {event.country} · {event.stages.length} stage{event.stages.length > 1 ? 's' : ''}
                    </div>
                    {completed && winnerName && (
                      <div className="mt-3 pt-2 border-t border-ink/20 font-body text-sm">
                        <span className="opacity-60">Won by</span>{' '}
                        <span className="font-bold">{winnerName}</span>
                      </div>
                    )}
                    {isCurrent && !completed && (
                      <div className="mt-2 font-sans tracking-widest text-xs text-rouge">
                        ↳ CURRENT EVENT
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function labelForCategory(c: CalendarEvent['category']): string {
  switch (c) {
    case 'grand-tour': return 'Grand Tour';
    case 'week-stage': return 'Stage Race';
    case 'monument': return 'Monument';
    case 'classic': return 'Classic';
  }
}

function CategoryBadge({ category }: { category: CalendarEvent['category'] }) {
  const styles: Record<CalendarEvent['category'], string> = {
    'grand-tour': 'bg-rouge text-paper',
    'monument': 'bg-ink text-paper',
    'week-stage': 'bg-maillot text-ink',
    'classic': 'bg-paper-dark text-ink border border-ink/30',
  };
  return (
    <span className={`text-[10px] font-sans tracking-widest px-2 py-0.5 ${styles[category]}`}>
      {labelForCategory(category)}
    </span>
  );
}
