import PlayerCard from './PlayerCard';

function TeamPitch({ team, recommendation }) {
  if (!team || !team.picks) {
    return (
      <div className="bg-white/5 rounded-xl p-8 text-center">
        <p className="text-gray-400">Loading team...</p>
        <p className="text-sm text-gray-500 mt-2">Make sure you've configured FPL_TEAM_ID in .env</p>
      </div>
    );
  }

  // Separate starters (positions 1-11) and bench (12-15)
  const starters = team.picks.filter(p => p.position <= 11);
  const bench = team.picks.filter(p => p.position > 11);

  // Group starters by position
  const goalkeepers = starters.filter(p => p.player?.positionId === 1);
  const defenders = starters.filter(p => p.player?.positionId === 2);
  const midfielders = starters.filter(p => p.player?.positionId === 3);
  const forwards = starters.filter(p => p.player?.positionId === 4);

  const captainId = recommendation?.captain?.id || team.picks.find(p => p.is_captain)?.element;
  const viceCaptainId = recommendation?.viceCaptain?.id || team.picks.find(p => p.is_vice_captain)?.element;

  return (
    <div className="space-y-4">
      {/* Pitch */}
      <div className="pitch-bg p-6 relative overflow-hidden">
        {/* Pitch markings */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <div className="w-32 h-32 rounded-full border-2 border-white"></div>
        </div>

        <div className="relative z-10 space-y-6">
          {/* Forwards */}
          <div className="flex justify-center gap-4">
            {forwards.map(pick => (
              <PlayerCard
                key={pick.element}
                player={pick.player}
                isCaptain={pick.element === captainId}
                isViceCaptain={pick.element === viceCaptainId}
                points={pick.player?.totalPoints}
              />
            ))}
          </div>

          {/* Midfielders */}
          <div className="flex justify-center gap-4">
            {midfielders.map(pick => (
              <PlayerCard
                key={pick.element}
                player={pick.player}
                isCaptain={pick.element === captainId}
                isViceCaptain={pick.element === viceCaptainId}
                points={pick.player?.totalPoints}
              />
            ))}
          </div>

          {/* Defenders */}
          <div className="flex justify-center gap-4">
            {defenders.map(pick => (
              <PlayerCard
                key={pick.element}
                player={pick.player}
                isCaptain={pick.element === captainId}
                isViceCaptain={pick.element === viceCaptainId}
                points={pick.player?.totalPoints}
              />
            ))}
          </div>

          {/* Goalkeeper */}
          <div className="flex justify-center gap-4">
            {goalkeepers.map(pick => (
              <PlayerCard
                key={pick.element}
                player={pick.player}
                isCaptain={pick.element === captainId}
                isViceCaptain={pick.element === viceCaptainId}
                points={pick.player?.totalPoints}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bench */}
      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">BENCH</h3>
        <div className="flex justify-center gap-4">
          {bench.map(pick => (
            <PlayerCard
              key={pick.element}
              player={pick.player}
              isBench
              points={pick.player?.totalPoints}
            />
          ))}
        </div>
      </div>

      {/* Team Stats */}
      {team.teamInfo && (
        <div className="bg-white/5 rounded-xl p-4 grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-fpl-green">{team.teamInfo.summary_overall_points}</p>
            <p className="text-xs text-gray-400">Total Points</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-fpl-cyan">{team.teamInfo.summary_overall_rank?.toLocaleString()}</p>
            <p className="text-xs text-gray-400">Overall Rank</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{team.teamInfo.summary_event_points}</p>
            <p className="text-xs text-gray-400">GW Points</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{team.transfers?.limit || 1}</p>
            <p className="text-xs text-gray-400">Free Transfers</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamPitch;
