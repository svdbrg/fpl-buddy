import { useState } from 'react';

function TransferRecommendations({ recommendation, isAnalyzing, onTransfersExecuted }) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [executeResult, setExecuteResult] = useState(null);

  const executeTransfers = async () => {
    if (!recommendation?.transfers?.length) return;

    setIsExecuting(true);
    setExecuteResult(null);

    try {
      const response = await fetch('/api/transfers/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transfers: recommendation.transfers.map(t => ({
            playerIn: t.playerIn,
            playerOut: t.playerOut
          })),
          chip: recommendation.chipAdvice?.useThisWeek || null
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setExecuteResult({ success: true, message: data.message });
        onTransfersExecuted?.();
      } else {
        setExecuteResult({
          success: false,
          message: data.error || 'Transfer failed',
          details: data.details
        });
      }
    } catch (error) {
      setExecuteResult({
        success: false,
        message: 'Network error: ' + error.message
      });
    } finally {
      setIsExecuting(false);
      setShowConfirm(false);
    }
  };

  if (isAnalyzing) {
    return (
      <div className="bg-white/5 rounded-xl p-8 text-center">
        <div className="animate-spin w-12 h-12 border-4 border-fpl-green border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-fpl-green font-semibold">AI is analyzing your team...</p>
        <p className="text-sm text-gray-400 mt-2">This may take a few seconds</p>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div className="bg-white/5 rounded-xl p-8 text-center">
        <p className="text-4xl mb-4">🤖</p>
        <p className="text-gray-300">No recommendations yet</p>
        <p className="text-sm text-gray-500 mt-2">Click "Run AI Analysis" to get transfer suggestions</p>
      </div>
    );
  }

  const confidenceColors = {
    high: 'bg-green-500 text-white',
    medium: 'bg-yellow-500 text-black',
    low: 'bg-red-500 text-white'
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white/5 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-bold">AI Recommendation</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${confidenceColors[recommendation.confidence]}`}>
            {recommendation.confidence?.toUpperCase()} CONFIDENCE
          </span>
        </div>
        <p className="text-gray-300">{recommendation.summary}</p>
      </div>

      {/* Key Insights */}
      {recommendation.keyInsights?.length > 0 && (
        <div className="bg-white/5 rounded-xl p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <span>💡</span> Key Insights
          </h3>
          <ul className="space-y-2">
            {recommendation.keyInsights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-fpl-cyan">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Transfers */}
      <div className="bg-white/5 rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <span>🔄</span> Recommended Transfers
        </h3>

        {recommendation.transfers?.length > 0 ? (
          <div className="space-y-4">
            {recommendation.transfers.map((transfer, i) => (
              <div key={i} className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  {/* Player Out */}
                  <div className="text-center flex-1">
                    <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-2">
                      <span className="text-2xl">👤</span>
                    </div>
                    <p className="font-semibold text-red-400">{transfer.playerOutName}</p>
                    <p className="text-xs text-gray-500">OUT</p>
                  </div>

                  {/* Arrow */}
                  <div className="px-4">
                    <div className="w-12 h-12 rounded-full bg-fpl-green/20 flex items-center justify-center">
                      <span className="text-fpl-green text-xl">→</span>
                    </div>
                  </div>

                  {/* Player In */}
                  <div className="text-center flex-1">
                    <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                      <span className="text-2xl">👤</span>
                    </div>
                    <p className="font-semibold text-fpl-green">{transfer.playerInName}</p>
                    <p className="text-xs text-gray-500">IN</p>
                  </div>
                </div>

                {/* Reason */}
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-sm text-gray-400">{transfer.reason}</p>
                </div>
              </div>
            ))}

            {/* Execute Result */}
            {executeResult && (
              <div className={`p-4 rounded-lg ${
                executeResult.success
                  ? 'bg-green-500/20 border border-green-500 text-green-300'
                  : 'bg-red-500/20 border border-red-500 text-red-300'
              }`}>
                <p className="font-semibold">{executeResult.success ? 'Success!' : 'Error - Manual Transfer Required'}</p>
                <p className="text-sm mt-1">{executeResult.message}</p>
                {executeResult.details && (
                  <p className="text-xs mt-2 opacity-75">
                    {typeof executeResult.details === 'string'
                      ? executeResult.details
                      : JSON.stringify(executeResult.details)}
                  </p>
                )}
                {!executeResult.success && (
                  <div className="mt-4 pt-4 border-t border-red-500/30">
                    <p className="text-sm font-semibold mb-2">Recommended transfers to make manually:</p>
                    <div className="space-y-2">
                      {recommendation.transfers.map((t, i) => (
                        <div key={i} className="bg-black/30 rounded p-2 text-xs">
                          <span className="text-red-400">{t.playerOutName}</span>
                          <span className="text-gray-400 mx-2">→</span>
                          <span className="text-green-400">{t.playerInName}</span>
                        </div>
                      ))}
                    </div>
                    <a
                      href="https://fantasy.premierleague.com/transfers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-3 px-4 py-2 bg-fpl-green text-fpl-purple font-semibold rounded-lg hover:bg-fpl-cyan transition-colors text-sm"
                    >
                      Open FPL Transfers Page
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Confirmation Dialog */}
            {showConfirm && (
              <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4">
                <p className="font-semibold text-yellow-400 mb-2">Confirm Transfers</p>
                <p className="text-sm text-gray-300 mb-4">
                  Are you sure you want to execute {recommendation.transfers.length} transfer(s)?
                  This action cannot be undone on the FPL website until the next gameweek.
                </p>
                <div className="flex gap-3">
                  <button
                    className="flex-1 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors"
                    onClick={() => setShowConfirm(false)}
                    disabled={isExecuting}
                  >
                    Cancel
                  </button>
                  <button
                    className={`flex-1 py-2 font-semibold rounded-lg transition-colors ${
                      isExecuting
                        ? 'bg-fpl-green/50 text-fpl-purple cursor-wait'
                        : 'bg-fpl-green text-fpl-purple hover:bg-fpl-cyan'
                    }`}
                    onClick={executeTransfers}
                    disabled={isExecuting}
                  >
                    {isExecuting ? 'Executing...' : 'Confirm'}
                  </button>
                </div>
              </div>
            )}

            {/* Execute Button */}
            {!showConfirm && !executeResult?.success && (
              <button
                className="w-full py-3 bg-fpl-green text-fpl-purple font-bold rounded-lg hover:bg-fpl-cyan transition-colors"
                onClick={() => setShowConfirm(true)}
              >
                Execute Transfers
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p className="text-4xl mb-2">✨</p>
            <p>No transfers recommended</p>
            <p className="text-sm">Your team is looking good!</p>
          </div>
        )}
      </div>

      {/* Captain Picks */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">👑</span>
            <h3 className="font-semibold">Captain</h3>
          </div>
          <p className="text-xl font-bold text-fpl-green">{recommendation.captain?.name}</p>
          <p className="text-sm text-gray-400 mt-2">{recommendation.captain?.reason}</p>
        </div>

        <div className="bg-white/5 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🥈</span>
            <h3 className="font-semibold">Vice Captain</h3>
          </div>
          <p className="text-xl font-bold text-gray-300">{recommendation.viceCaptain?.name}</p>
          <p className="text-sm text-gray-400 mt-2">{recommendation.viceCaptain?.reason}</p>
        </div>
      </div>

      {/* Chip Strategy */}
      {recommendation.chipAdvice && (
        <div className={`rounded-xl p-6 ${
          recommendation.chipAdvice.useThisWeek
            ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50'
            : 'bg-white/5'
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💎</span>
            <h3 className="font-semibold">Chip Strategy</h3>
            {recommendation.chipAdvice.useThisWeek && (
              <span className="ml-auto px-3 py-1 bg-yellow-500 text-black rounded-full text-sm font-bold animate-pulse">
                USE {recommendation.chipAdvice.useThisWeek.toUpperCase()}!
              </span>
            )}
          </div>

          {recommendation.chipAdvice.useThisWeek ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-yellow-500/20 rounded-lg">
                <span className="text-3xl">{getChipEmoji(recommendation.chipAdvice.useThisWeek)}</span>
                <div>
                  <p className="font-bold text-yellow-400">{getChipName(recommendation.chipAdvice.useThisWeek)}</p>
                  <p className="text-sm text-gray-300">{recommendation.chipAdvice.reasoning}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-300">{recommendation.chipAdvice.reasoning}</p>
              <div className="pt-3 border-t border-white/10">
                <p className="text-sm text-gray-400">
                  <span className="text-fpl-cyan font-medium">Future Strategy:</span> {recommendation.chipAdvice.futureStrategy}
                </p>
              </div>
            </div>
          )}

          {/* Available Chips Display */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs text-gray-500 mb-2">Available Chips:</p>
            <div className="flex gap-2 flex-wrap">
              {['wildcard', 'freehit', 'bboost', 'triplecaptain'].map(chip => (
                <span
                  key={chip}
                  className="px-2 py-1 bg-white/10 rounded text-xs text-gray-300 flex items-center gap-1"
                >
                  {getChipEmoji(chip)} {getChipName(chip)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getChipEmoji(chip) {
  const emojis = {
    wildcard: '🃏',
    freehit: '🎯',
    bboost: '📈',
    benchboost: '📈',
    triplecaptain: '👑'
  };
  return emojis[chip] || '💎';
}

function getChipName(chip) {
  const names = {
    wildcard: 'Wildcard',
    freehit: 'Free Hit',
    bboost: 'Bench Boost',
    benchboost: 'Bench Boost',
    triplecaptain: 'Triple Captain'
  };
  return names[chip] || chip;
}

export default TransferRecommendations;
