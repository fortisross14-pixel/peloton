import { useGame } from './state/store';
import { Home } from './components/Home';
import { Header } from './components/Header';
import { CalendarView } from './components/CalendarView';
import { RaceView } from './components/RaceView';
import { SeasonView } from './components/SeasonView';
import { SeasonSummaryView } from './components/SeasonSummaryView';
import { MarketReportView } from './components/MarketReportView';
import { StandingsView } from './components/StandingsView';
import { RidersView } from './components/RidersView';
import { TeamsView } from './components/TeamsView';
import { TeamDetailView } from './components/TeamDetailView';
import { RiderDetailView } from './components/RiderDetailView';
import { HistoryView } from './components/HistoryView';

export default function App() {
  const universe = useGame((s) => s.universe);
  const view = useGame((s) => s.view);
  if (!universe) {
    return <Home />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-6 pb-16">
        {view === 'home' && <Home />}
        {view === 'calendar' && <CalendarView />}
        {view === 'race' && <RaceView />}
        {view === 'season' && <SeasonView />}
        {view === 'season-summary' && <SeasonSummaryView />}
        {view === 'market-report' && <MarketReportView />}
        {view === 'standings' && <StandingsView />}
        {view === 'riders' && <RidersView />}
        {view === 'teams' && <TeamsView />}
        {view === 'team-detail' && <TeamDetailView />}
        {view === 'rider-detail' && <RiderDetailView />}
        {view === 'history' && <HistoryView />}
      </main>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ink/30 mt-8">
      <div className="max-w-[1280px] mx-auto px-6 py-4 flex justify-between items-center text-xs">
        <div className="font-mono opacity-60">PELOTON · ALMANAC EDITION · MMXXVI</div>
        <div className="font-mono opacity-60">A SEASON SIMULATION</div>
      </div>
    </footer>
  );
}
