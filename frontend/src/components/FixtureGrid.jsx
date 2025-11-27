import { useState, useEffect } from 'react';

function FixtureGrid() {
  const [fixtures, setFixtures] = useState([]);
  const [teams, setTeams] = useState([]);
  const [gameweeks, setGameweeks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [fixturesRes, bootstrapRes] = await Promise.all([
        fetch('/api/fixtures'),
        fetch('/api/bootstrap')
      ]);

      if (fixturesRes.ok && bootstrapRes.ok) {
        const fixturesData = await fixturesRes.json();
        const bootstrapData = await bootstrapRes.json();

        setFixtures(fixturesData);
        setTeams(bootstrapData.teams);

        // Get current and next 5 gameweeks
        const currentGw = bootstrapData.events.find(e => e.is_current)?.id || 1;
        const relevantGws = bootstrapData.events
          .filter(e => e.id >= currentGw && e.id <= currentGw + 5)
          .map(e => e.id);
        setGameweeks(relevantGws);
      }
    } catch (error) {
      console.error('Failed to fetch fixtures:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/5 rounded-xl p-8 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-fpl-green border-t-transparent rounded-full mx-auto"></div>
      </div>
    );
  }

  // Build fixture difficulty map per team
  const getTeamFixtures = (teamId) => {
    return gameweeks.map(gw => {
      const fixture = fixtures.find(f =>
        f.event === gw && (f.team_h === teamId || f.team_a === teamId)
      );

      if (!fixture) return null;

      const isHome = fixture.team_h === teamId;
      const opponent = isHome ? fixture.team_a : fixture.team_h;
      const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;
      const opponentTeam = teams.find(t => t.id === opponent);

      return {
        gw,
        opponent: opponentTeam?.short_name || '?',
        isHome,
        difficulty
      };
    });
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 1: return 'bg-green-600';
      case 2: return 'bg-green-500';
      case 3: return 'bg-yellow-500';
      case 4: return 'bg-orange-500';
      case 5: return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getDifficultyLabel = (difficulty) => {
    switch (difficulty) {
      case 1: return 'Very Easy';
      case 2: return 'Easy';
      case 3: return 'Medium';
      case 4: return 'Hard';
      case 5: return 'Very Hard';
      default: return 'Unknown';
    }
  };

  // Sort teams by average difficulty (easiest first)
  const sortedTeams = [...teams].sort((a, b) => {
    const aFixtures = getTeamFixtures(a.id).filter(f => f);
    const bFixtures = getTeamFixtures(b.id).filter(f => f);
    const aAvg = aFixtures.reduce((sum, f) => sum + f.difficulty, 0) / aFixtures.length;
    const bAvg = bFixtures.reduce((sum, f) => sum + f.difficulty, 0) / bFixtures.length;
    return aAvg - bAvg;
  });

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="font-semibold mb-3">Fixture Difficulty Rating (FDR)</h3>
        <div className="flex gap-4 flex-wrap">
          {[1, 2, 3, 4, 5].map(diff => (
            <div key={diff} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded ${getDifficultyColor(diff)}`}></div>
              <span className="text-sm text-gray-400">{getDifficultyLabel(diff)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fixture Grid */}
      <div className="bg-white/5 rounded-xl p-4 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-2 text-gray-400 text-sm font-medium sticky left-0 bg-fpl-purple">Team</th>
              {gameweeks.map(gw => (
                <th key={gw} className="p-2 text-gray-400 text-sm font-medium text-center">
                  GW{gw}
                </th>
              ))}
              <th className="p-2 text-gray-400 text-sm font-medium text-center">Avg</th>
            </tr>
          </thead>
          <tbody>
            {sortedTeams.map(team => {
              const teamFixtures = getTeamFixtures(team.id);
              const avgDifficulty = teamFixtures
                .filter(f => f)
                .reduce((sum, f) => sum + f.difficulty, 0) / teamFixtures.filter(f => f).length;

              return (
                <tr key={team.id} className="border-t border-white/5">
                  <td className="p-2 font-medium sticky left-0 bg-fpl-purple">
                    <div className="flex items-center gap-2">
                      <span>{team.short_name}</span>
                    </div>
                  </td>
                  {teamFixtures.map((fixture, i) => (
                    <td key={i} className="p-1 text-center">
                      {fixture ? (
                        <div
                          className={`${getDifficultyColor(fixture.difficulty)} rounded p-2 text-xs font-medium`}
                          title={`${fixture.isHome ? 'Home' : 'Away'} vs ${fixture.opponent}`}
                        >
                          <span className="text-white">
                            {fixture.opponent}
                          </span>
                          <span className="text-white/60 ml-1">
                            ({fixture.isHome ? 'H' : 'A'})
                          </span>
                        </div>
                      ) : (
                        <div className="bg-gray-700 rounded p-2 text-xs text-gray-500">-</div>
                      )}
                    </td>
                  ))}
                  <td className="p-2 text-center">
                    <span className={`font-bold ${
                      avgDifficulty <= 2.5 ? 'text-green-400' :
                      avgDifficulty <= 3.5 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {avgDifficulty.toFixed(1)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Best/Worst Fixtures Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <h3 className="font-semibold text-green-400 mb-3">🎯 Easiest Fixtures</h3>
          <div className="space-y-2">
            {sortedTeams.slice(0, 5).map(team => {
              const fixtures = getTeamFixtures(team.id).filter(f => f);
              const avg = fixtures.reduce((sum, f) => sum + f.difficulty, 0) / fixtures.length;
              return (
                <div key={team.id} className="flex justify-between text-sm">
                  <span>{team.short_name}</span>
                  <span className="text-green-400">{avg.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <h3 className="font-semibold text-red-400 mb-3">⚠️ Hardest Fixtures</h3>
          <div className="space-y-2">
            {sortedTeams.slice(-5).reverse().map(team => {
              const fixtures = getTeamFixtures(team.id).filter(f => f);
              const avg = fixtures.reduce((sum, f) => sum + f.difficulty, 0) / fixtures.length;
              return (
                <div key={team.id} className="flex justify-between text-sm">
                  <span>{team.short_name}</span>
                  <span className="text-red-400">{avg.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FixtureGrid;
