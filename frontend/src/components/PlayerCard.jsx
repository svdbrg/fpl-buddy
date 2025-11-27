function PlayerCard({ player, isCaptain, isViceCaptain, isBench, points }) {
  if (!player) {
    return (
      <div className="w-20 text-center">
        <div className="w-12 h-12 mx-auto bg-gray-600 rounded-full animate-pulse"></div>
        <div className="mt-1 h-4 bg-gray-600 rounded animate-pulse"></div>
      </div>
    );
  }

  const getFormColor = (form) => {
    if (form >= 6) return 'bg-green-500';
    if (form >= 4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const positionColors = {
    GKP: 'bg-yellow-500',
    DEF: 'bg-green-500',
    MID: 'bg-blue-500',
    FWD: 'bg-red-500'
  };

  return (
    <div className={`w-20 text-center relative ${isBench ? 'opacity-70' : ''}`}>
      {/* Captain/Vice Badge */}
      {(isCaptain || isViceCaptain) && (
        <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold z-10 ${
          isCaptain ? 'bg-fpl-green text-fpl-purple' : 'bg-white text-fpl-purple'
        }`}>
          {isCaptain ? 'C' : 'V'}
        </div>
      )}

      {/* Player Image */}
      <div className="relative mx-auto w-14 h-14">
        <img
          src={player.photo}
          alt={player.name}
          className="w-full h-full object-cover rounded-full border-2 border-white/30"
          onError={(e) => {
            e.target.src = `https://ui-avatars.com/api/?name=${player.name}&background=37003c&color=00ff87&bold=true`;
          }}
        />
        {/* Form indicator */}
        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${getFormColor(player.form)} border-2 border-fpl-purple`}></div>
      </div>

      {/* Player Info */}
      <div className="mt-1 bg-fpl-purple rounded px-1 py-0.5">
        <p className="text-xs font-semibold truncate text-white">{player.name}</p>
        <div className="flex items-center justify-center gap-1 text-[10px]">
          <span className={`px-1 rounded ${positionColors[player.position]} text-white`}>
            {player.position}
          </span>
          <span className="text-gray-300">{player.team}</span>
        </div>
      </div>

      {/* Points */}
      <div className="mt-1 bg-fpl-green text-fpl-purple text-xs font-bold rounded py-0.5">
        {points} pts
      </div>

      {/* News indicator */}
      {player.news && (
        <div className="absolute -top-1 -left-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-[8px] text-white">!</span>
        </div>
      )}
    </div>
  );
}

export default PlayerCard;
