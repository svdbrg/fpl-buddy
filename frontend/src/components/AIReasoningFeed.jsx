import { useEffect, useRef } from 'react';

function AIReasoningFeed({ reasoning, isAnalyzing }) {
  const feedRef = useRef(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [reasoning]);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'start': return '🚀';
      case 'thinking': return '🤔';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'insight': return '💡';
      case 'transfer': return '🔄';
      case 'captain': return '👑';
      default: return '📝';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'start': return 'text-fpl-cyan';
      case 'thinking': return 'text-yellow-400';
      case 'success': return 'text-fpl-green';
      case 'warning': return 'text-orange-400';
      case 'error': return 'text-red-400';
      case 'insight': return 'text-fpl-cyan';
      case 'transfer': return 'text-fpl-green';
      case 'captain': return 'text-yellow-400';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className="bg-white/5 rounded-xl h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isAnalyzing ? 'bg-fpl-green animate-pulse' : 'bg-gray-500'}`}></div>
          <h2 className="font-semibold">AI Reasoning</h2>
        </div>
        {isAnalyzing && (
          <span className="text-xs text-fpl-green">Analyzing...</span>
        )}
      </div>

      {/* Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {reasoning.length === 0 && !isAnalyzing && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-4xl mb-2">🤖</p>
            <p>Click "Run AI Analysis" to see Claude's thinking process</p>
          </div>
        )}

        {isAnalyzing && reasoning.length === 0 && (
          <div className="flex items-center gap-3 text-fpl-green">
            <div className="animate-spin w-5 h-5 border-2 border-fpl-green border-t-transparent rounded-full"></div>
            <span>Claude is analyzing your team...</span>
          </div>
        )}

        {reasoning.map((item, index) => (
          <div
            key={item.id || index}
            className={`flex gap-2 ${index === reasoning.length - 1 ? 'animate-fade-in' : ''}`}
          >
            <span className="text-lg">{getTypeIcon(item.type)}</span>
            <div className="flex-1">
              <p className={`text-sm ${getTypeColor(item.type)}`}>
                {item.message}
              </p>
              <p className="text-[10px] text-gray-500 mt-1">
                {new Date(item.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {isAnalyzing && reasoning.length > 0 && (
          <div className="flex items-center gap-2 text-gray-400">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-fpl-green rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-fpl-green rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-fpl-green rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="p-4 border-t border-white/10 grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <p className="text-fpl-green font-bold">
            {reasoning.filter(r => r.type === 'transfer').length}
          </p>
          <p className="text-gray-500">Transfers</p>
        </div>
        <div>
          <p className="text-fpl-cyan font-bold">
            {reasoning.filter(r => r.type === 'insight').length}
          </p>
          <p className="text-gray-500">Insights</p>
        </div>
        <div>
          <p className="text-yellow-400 font-bold">
            {reasoning.filter(r => r.type === 'warning').length}
          </p>
          <p className="text-gray-500">Warnings</p>
        </div>
      </div>
    </div>
  );
}

export default AIReasoningFeed;
