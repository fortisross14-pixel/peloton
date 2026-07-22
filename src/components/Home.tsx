import { useMemo, useState } from 'react';
import { useGame, type SaveSlot } from '../state/store';

export function Home() {
  const newGame = useGame((s) => s.newGame);
  const loadGame = useGame((s) => s.loadGame);
  const deleteGame = useGame((s) => s.deleteGame);
  const getSaveSlots = useGame((s) => s.getSaveSlots);
  const [revision, setRevision] = useState(0);

  const slots = useMemo(() => getSaveSlots(), [getSaveSlots, revision]);

  const removeSlot = (slot: SaveSlot) => {
    if (!confirm(`Delete Universe ${slot}? This cannot be undone.`)) return;
    deleteGame(slot);
    setRevision((value) => value + 1);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-5xl w-full text-center">
        <div className="font-sans tracking-[0.4em] text-xs opacity-60 mb-2">EST · MMXXVI</div>
        <h1 className="font-display font-black text-7xl leading-none mb-2">
          PELOTON<span className="text-rouge">.</span>
        </h1>
        <div className="font-body italic text-xl opacity-70 mb-1">The Season Almanac</div>
        <div className="rule mt-6 mb-8 max-w-xs mx-auto" />

        <p className="font-body text-lg leading-relaxed mb-2">A complete cycling season simulator.</p>
        <p className="font-body opacity-70 mb-9">
          Choose one of three independent universes. Each slot saves automatically after every race and season update.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
          {slots.map((slot) => (
            <div key={slot.slot} className="card-paper p-5 min-h-[245px] flex flex-col">
              <div className="flex items-start justify-between gap-3 border-b border-ink/20 pb-3">
                <div>
                  <div className="font-sans tracking-[0.25em] text-[10px] opacity-55">SAVE SLOT</div>
                  <div className="font-display font-black text-3xl">Universe {slot.slot}</div>
                </div>
                <div className={`font-mono text-[10px] px-2 py-1 border ${slot.occupied ? 'border-ink/30' : 'border-ink/15 opacity-45'}`}>
                  {slot.occupied ? 'ACTIVE SAVE' : 'EMPTY'}
                </div>
              </div>

              {slot.occupied ? (
                <>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-5 text-sm flex-1">
                    <SlotStat label="Season" value={String(slot.currentYear)} />
                    <SlotStat label="Volume" value={String((slot.currentYear ?? 2026) - (slot.startYear ?? 2026) + 1)} />
                    <SlotStat label="Riders" value={String(slot.activeRiders ?? '—')} />
                    <SlotStat label="Seed" value={(slot.seed ?? 0).toString(16).toUpperCase().slice(0, 6)} />
                  </div>
                  <button className="btn-vintage w-full" onClick={() => loadGame(slot.slot)}>Continue</button>
                  <button className="mt-3 text-xs underline opacity-55 hover:opacity-100 text-center" onClick={() => removeSlot(slot.slot)}>
                    delete universe
                  </button>
                </>
              ) : (
                <>
                  <div className="font-body italic opacity-55 py-7 flex-1">
                    Start a fresh cycling history with a newly generated peloton.
                  </div>
                  <button className="btn-vintage outline w-full" onClick={() => newGame(slot.slot)}>Begin Universe</button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-3 gap-6 text-sm max-w-2xl mx-auto">
          <Stat label="Teams" value="12" />
          <Stat label="Riders" value="120" />
          <Stat label="Races / Yr" value="20" />
        </div>
      </div>
    </div>
  );
}

function SlotStat({ label, value }: { label: string; value: string }) {
  return <div><div className="font-mono font-bold">{value}</div><div className="font-sans tracking-wider text-[10px] opacity-50 uppercase">{label}</div></div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-paper px-4 py-3">
      <div className="font-display font-black text-3xl">{value}</div>
      <div className="font-sans tracking-widest text-xs opacity-60 uppercase mt-1">{label}</div>
    </div>
  );
}
