import { useState, useEffect } from 'react';

function LeaguesPanel() {
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    try {
      const response = await fetch('/api/leagues');
      if (response.ok) {
        const data = await response.json();
        setLeagues(data);
      }
    } catch (error) {
      console.error('Failed to fetch leagues:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/5 rounded-xl p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-white/10 rounded w-1/3"></div>
          <div className="h-8 bg-white/10 rounded"></div>
          <div className="h-8 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  if (leagues.length === 0) {
    return (
      <div className="bg-white/5 rounded-xl p-4 text-center text-gray-400">
        No private leagues found
      </div>
    );
  }

  const getMovementIcon = (movement) => {
    if (movement > 0) return <span className="text-green-400">▲ {movement}</span>;
    if (movement < 0) return <span className="text-red-400">▼ {Math.abs(movement)}</span>;
    return <span className="text-gray-500">-</span>;
  };

  const getMedalEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="space-y-4">
      {leagues.map(league => (
        <div
          key={league.id}
          className="bg-gradient-to-r from-fpl-purple to-purple-900 rounded-xl border border-fpl-green/30 overflow-hidden"
        >
          {/* League Header */}
          <div className="bg-black/30 px-4 py-3 flex items-center justify-between">
            <h3 className="font-bold text-fpl-green flex items-center gap-2">
              <span>🏆</span> {league.name}
            </h3>
            <span className="text-xs text-gray-400">{league.totalTeams} teams</span>
          </div>

          {/* Standings Table */}
          <div className="p-2">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-white/10">
                  <th className="text-left py-2 px-2">Pos</th>
                  <th className="text-left py-2">Manager</th>
                  <th className="text-right py-2 px-1">GW</th>
                  <th className="text-right py-2 px-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {league.standings.map((entry) => (
                  <tr
                    key={entry.rank}
                    className={`border-b border-white/5 last:border-0 ${
                      entry.isMe ? 'bg-fpl-green/10' : ''
                    }`}
                  >
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1">
                        <span className="text-lg">{getMedalEmoji(entry.rank)}</span>
                        <span className="text-xs">{getMovementIcon(entry.movement)}</span>
                      </div>
                    </td>
                    <td className="py-2">
                      <div>
                        <p className={`font-medium ${entry.isMe ? 'text-fpl-green' : 'text-white'}`}>
                          {entry.playerName}
                          {entry.isMe && <span className="ml-1 text-xs">(You)</span>}
                        </p>
                        <p className="text-xs text-gray-500">{entry.teamName}</p>
                      </div>
                    </td>
                    <td className="py-2 px-1 text-right">
                      <span className={`text-sm font-medium ${
                        entry.gwPoints >= 50 ? 'text-fpl-green' :
                        entry.gwPoints >= 40 ? 'text-fpl-cyan' :
                        'text-gray-300'
                      }`}>
                        {entry.gwPoints}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <span className="text-lg font-bold text-white">{entry.totalPoints}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Points Behind Leader */}
          {league.standings.length > 0 && league.myRank > 1 && (
            <div className="bg-black/30 px-4 py-2 text-center">
              <span className="text-sm text-gray-400">
                {league.standings[0].totalPoints - league.standings.find(s => s.isMe)?.totalPoints} pts behind leader
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default LeaguesPanel;
