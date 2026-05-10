import { useGame } from '../state/store';

export function Header() {
  const universe = useGame((s) => s.universe);
  const view = useGame((s) => s.view);
  const setView = useGame((s) => s.setView);
  const resetGame = useGame((s) => s.resetGame);
  if (!universe) return null;

  const navItems: { id: typeof view; label: string }[] = [
    { id: 'calendar', label: 'Calendar' },
    { id: 'race', label: 'Race' },
    { id: 'standings', label: 'Standings' },
    { id: 'teams', label: 'Teams' },
    { id: 'history', label: 'Almanac' },
  ];

  const inRace = !!universe.season.activeRace;

  return (
    <header className="border-b border-ink">
      <div className="max-w-[1280px] mx-auto px-6">
        {/* Masthead */}
        <div className="py-6 flex items-end justify-between border-b-2 border-ink">
          <div>
            <div className="font-sans tracking-[0.3em] text-xs opacity-60">VOLUME · {universe.currentYear - universe.startYear + 1}</div>
            <h1 className="font-display font-black text-5xl leading-none mt-1">
              PELOTON
              <span className="text-rouge">.</span>
            </h1>
            <div className="font-body italic text-sm opacity-70 mt-1">
              The Season Almanac · Anno {universe.currentYear}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-xs opacity-60">SAVE STATE</div>
            <div className="font-mono text-sm">SEED · {universe.seed.toString(16).toUpperCase().slice(0, 6)}</div>
            <button
              className="text-xs underline opacity-60 hover:opacity-100 mt-1"
              onClick={() => {
                if (confirm('Erase save and return to home?')) resetGame();
              }}
            >
              new game
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex gap-6 py-3 font-sans tracking-wider text-sm">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'race' && !inRace) {
                  setView('calendar');
                } else {
                  setView(item.id);
                }
              }}
              className={`transition-colors uppercase relative ${
                view === item.id || (item.id === 'race' && view === 'race')
                  ? 'text-rouge font-bold'
                  : 'opacity-70 hover:opacity-100'
              } ${item.id === 'race' && !inRace ? 'opacity-30 cursor-not-allowed' : ''}`}
              disabled={item.id === 'race' && !inRace}
            >
              {item.label}
              {item.id === 'race' && inRace && (
                <span className="absolute -top-1 -right-3 w-2 h-2 rounded-full bg-rouge animate-pulse" />
              )}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
