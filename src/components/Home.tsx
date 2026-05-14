import { useGame } from '../state/store';

export function Home() {
  const newGame = useGame((s) => s.newGame);
  const loadGame = useGame((s) => s.loadGame);
  const universe = useGame((s) => s.universe);

  const hasSave = (() => {
    try { return !!localStorage.getItem('peloton.v4'); } catch { return false; }
  })();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center">
        <div className="font-sans tracking-[0.4em] text-xs opacity-60 mb-2">EST · MMXXVI</div>
        <h1 className="font-display font-black text-7xl leading-none mb-2">
          PELOTON<span className="text-rouge">.</span>
        </h1>
        <div className="font-body italic text-xl opacity-70 mb-1">The Season Almanac</div>
        <div className="rule mt-6 mb-8 max-w-xs mx-auto" />

        <p className="font-body text-lg leading-relaxed mb-2">
          A complete cycling season simulator.
        </p>
        <p className="font-body opacity-70 mb-8">
          Twelve teams. One hundred and twenty riders. Twenty races a year.
          Grand tours, classics, and the long campaign for the world ranking.
        </p>

        <div className="flex flex-col items-center gap-3">
          {!universe && hasSave && (
            <button className="btn-vintage" onClick={() => loadGame()}>
              Continue Saved Universe
            </button>
          )}
          <button className="btn-vintage outline" onClick={() => newGame()}>
            {hasSave ? 'New Universe' : 'Begin a New Universe'}
          </button>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-6 text-sm">
          <Stat label="Teams" value="12" />
          <Stat label="Riders" value="120" />
          <Stat label="Races / Yr" value="20" />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-paper px-4 py-3">
      <div className="font-display font-black text-3xl">{value}</div>
      <div className="font-sans tracking-widest text-xs opacity-60 uppercase mt-1">{label}</div>
    </div>
  );
}
