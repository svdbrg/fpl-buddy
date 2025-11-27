import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

function PerformanceChart() {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/my-team/history');
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
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

  if (!history || !history.current) {
    return (
      <div className="bg-white/5 rounded-xl p-8 text-center">
        <p className="text-gray-400">No performance history available</p>
      </div>
    );
  }

  const chartData = history.current.map(gw => ({
    gw: `GW${gw.event}`,
    points: gw.points,
    rank: gw.overall_rank,
    transfers: gw.event_transfers,
    hits: gw.event_transfers_cost
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-fpl-purple border border-fpl-green/30 rounded-lg p-3 text-sm">
          <p className="font-semibold text-fpl-green">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value?.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Calculate stats
  const totalPoints = history.current.reduce((sum, gw) => sum + gw.points, 0);
  const avgPoints = (totalPoints / history.current.length).toFixed(1);
  const bestGw = history.current.reduce((best, gw) => gw.points > best.points ? gw : best, history.current[0]);
  const currentRank = history.current[history.current.length - 1]?.overall_rank;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-fpl-green">{totalPoints}</p>
          <p className="text-xs text-gray-400">Total Points</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-fpl-cyan">{avgPoints}</p>
          <p className="text-xs text-gray-400">Avg/GW</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-yellow-400">{bestGw.points}</p>
          <p className="text-xs text-gray-400">Best GW ({bestGw.event})</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-white">{currentRank?.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Current Rank</p>
        </div>
      </div>

      {/* Points Chart */}
      <div className="bg-white/5 rounded-xl p-6">
        <h3 className="font-semibold mb-4">Points per Gameweek</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="gw" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="points" fill="#00ff87" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rank Chart */}
      <div className="bg-white/5 rounded-xl p-6">
        <h3 className="font-semibold mb-4">Overall Rank Progression</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="gw" stroke="#888" fontSize={12} />
              <YAxis
                stroke="#888"
                fontSize={12}
                reversed
                tickFormatter={(value) => value >= 1000000 ? `${(value/1000000).toFixed(1)}M` : value >= 1000 ? `${(value/1000).toFixed(0)}K` : value}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="rank"
                stroke="#04f5ff"
                strokeWidth={2}
                dot={{ fill: '#04f5ff', strokeWidth: 0, r: 4 }}
                name="Rank"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transfers & Hits */}
      <div className="bg-white/5 rounded-xl p-6">
        <h3 className="font-semibold mb-4">Transfer Activity</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="gw" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="transfers" fill="#04f5ff" radius={[4, 4, 0, 0]} name="Transfers" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-fpl-cyan"></div>
            <span className="text-gray-400">Transfers Made</span>
          </div>
          <div>
            <span className="text-gray-400">Total Hits: </span>
            <span className="text-red-400 font-semibold">
              -{history.current.reduce((sum, gw) => sum + gw.event_transfers_cost, 0)} pts
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PerformanceChart;
