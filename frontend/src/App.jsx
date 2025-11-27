import { useState, useEffect } from 'react';
import TeamPitch from './components/TeamPitch';
import AIReasoningFeed from './components/AIReasoningFeed';
import TransferRecommendations from './components/TransferRecommendations';
import PerformanceChart from './components/PerformanceChart';
import FixtureGrid from './components/FixtureGrid';
import LeaguesPanel from './components/LeaguesPanel';

function App() {
  const [team, setTeam] = useState(null);
  const [gameweek, setGameweek] = useState(null);
  const [reasoning, setReasoning] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('team');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [teamRes, gwRes] = await Promise.all([
        fetch('/api/my-team'),
        fetch('/api/gameweek')
      ]);

      if (teamRes.ok) {
        const teamData = await teamRes.json();
        setTeam(teamData);
      }

      if (gwRes.ok) {
        const gwData = await gwRes.json();
        setGameweek(gwData);
      }

      // Fetch any existing reasoning
      const reasoningRes = await fetch('/api/reasoning');
      if (reasoningRes.ok) {
        const reasoningData = await reasoningRes.json();
        setReasoning(reasoningData.reverse());
      }
    } catch (err) {
      setError('Failed to load data. Make sure backend is running.');
    }
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setReasoning([]);
    setRecommendation(null);
    setError(null);

    try {
      const response = await fetch('/api/analyze', { method: 'POST' });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      setRecommendation(data);

      // Refresh reasoning log
      const reasoningRes = await fetch('/api/reasoning');
      if (reasoningRes.ok) {
        const reasoningData = await reasoningRes.json();
        setReasoning(reasoningData.reverse());
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen text-white">
      {/* Header */}
      <header className="bg-fpl-purple/80 backdrop-blur-sm border-b border-fpl-green/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-fpl-green to-fpl-cyan flex items-center justify-center">
                <span className="text-fpl-purple font-bold">AI</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">FPL Analyzer</h1>
                <p className="text-xs text-gray-400">
                  {gameweek?.current ? `Gameweek ${gameweek.current.id}` : 'Loading...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {team && (
                <div className="text-right text-sm">
                  <p className="text-fpl-green font-semibold">£{team.bank?.toFixed(1)}m ITB</p>
                  <p className="text-gray-400">Team Value: £{team.value?.toFixed(1)}m</p>
                </div>
              )}

              <button
                onClick={runAnalysis}
                disabled={isAnalyzing}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  isAnalyzing
                    ? 'bg-fpl-green/20 text-fpl-green thinking-glow cursor-wait'
                    : 'bg-fpl-green text-fpl-purple hover:bg-fpl-cyan'
                }`}
              >
                {isAnalyzing ? 'Analyzing...' : 'Run AI Analysis'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-fpl-purple/60 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {[
              { id: 'team', label: 'My Team' },
              { id: 'transfers', label: 'Transfers' },
              { id: 'fixtures', label: 'Fixtures' },
              { id: 'performance', label: 'Performance' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium transition-all ${
                  activeTab === tab.id
                    ? 'text-fpl-green border-b-2 border-fpl-green'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 mx-4 mt-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main View */}
          <div className="lg:col-span-2">
            {activeTab === 'team' && (
              <TeamPitch team={team} recommendation={recommendation} />
            )}

            {activeTab === 'transfers' && (
              <TransferRecommendations
                recommendation={recommendation}
                isAnalyzing={isAnalyzing}
                onTransfersExecuted={fetchInitialData}
              />
            )}

            {activeTab === 'fixtures' && (
              <FixtureGrid />
            )}

            {activeTab === 'performance' && (
              <PerformanceChart />
            )}
          </div>

          {/* Right Column - Leagues + AI Reasoning Feed */}
          <div className="lg:col-span-1 space-y-6">
            <LeaguesPanel />
            <AIReasoningFeed
              reasoning={reasoning}
              isAnalyzing={isAnalyzing}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
