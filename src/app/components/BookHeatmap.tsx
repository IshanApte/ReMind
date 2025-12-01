'use client';

interface ChunkMetadata {
  id: number;
  start_line: number;
  end_line: number;
}

interface BookHeatmapProps {
  chunksMetadata: ChunkMetadata[];
  accessedChunkIds: Map<number | string, number>;
  totalLines: number;
}

export default function BookHeatmap({ chunksMetadata, accessedChunkIds, totalLines }: BookHeatmapProps) {
  // Helper to determine color based on access count (Thermal Logic)
  const getChunkColor = (accessCount: number | undefined) => {
    if (!accessCount || accessCount === 0) return 'bg-gray-800'; // Cold/Dormant

    // Map frequency to heat
    if (accessCount >= 4) return 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)] z-10'; // 🔥 Burning Hot
    if (accessCount === 3) return 'bg-yellow-400'; // ⚠️ Hot
    if (accessCount === 2) return 'bg-blue-400'; // ❄️ Warm
    return 'bg-indigo-900'; // 🧊 Cooling (1 access)
  };

  const totalAccessed = Array.from(accessedChunkIds.values()).reduce((sum, count) => sum + count, 0);
  const uniqueChunks = accessedChunkIds.size;

  return (
    <div className="w-full bg-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-white">Book Usage Heatmap</h3>
          <span className="text-xs text-slate-300">
            {totalAccessed > 0 ? `${totalAccessed} access${totalAccessed !== 1 ? 'es' : ''} across ${uniqueChunks} chunk${uniqueChunks !== 1 ? 's' : ''}` : 'No chunks accessed yet'}
          </span>
        </div>
        
        {/* Minimal Legend */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400">Less</span>
          <div className="flex gap-0.5 h-3">
             <div className="w-3 h-full rounded-sm bg-gray-800" title="0 accesses"></div>
             <div className="w-3 h-full rounded-sm bg-indigo-900" title="1 access"></div>
             <div className="w-3 h-full rounded-sm bg-blue-400" title="2 accesses"></div>
             <div className="w-3 h-full rounded-sm bg-yellow-400" title="3 accesses"></div>
             <div className="w-3 h-full rounded-sm bg-orange-500" title="4+ accesses"></div>
          </div>
          <span className="text-slate-400">More</span>
        </div>
      </div>
      
      {/* Heatmap Bar */}
      <div className="w-full h-8 bg-slate-900 rounded-md overflow-hidden flex relative border border-gray-800">
        {chunksMetadata.map((chunk) => {
          // Calculate width percentage based on actual text length
          // Prevent division by zero
          const safeTotalLines = totalLines > 0 ? totalLines : 1;
          const widthPercent = ((chunk.end_line - chunk.start_line) / safeTotalLines) * 100;
          
          // Handle string/number id mismatch
          const count = accessedChunkIds.get(chunk.id) || accessedChunkIds.get(String(chunk.id));
          
          return (
            <div
              key={chunk.id}
              className={`h-full transition-all duration-500 border-r border-slate-900/50 last:border-r-0 ${getChunkColor(count)}`}
              style={{ width: `${widthPercent}%` }}
              title={`Chunk #${chunk.id} (Accessed: ${count || 0} times)`}
            />
          );
        })}
      </div>
      
      {/* Start/End Labels */}
      <div className="flex justify-between text-xs text-slate-400 mt-1">
        <span>Start</span>
        <span>End</span>
      </div>
    </div>
  );
}