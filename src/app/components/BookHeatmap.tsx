'use client';

interface ChunkMetadata {
  id: number;
  start_line: number;
  end_line: number;
}

interface BookHeatmapProps {
  chunksMetadata: ChunkMetadata[];
  chunkScores: Map<number | string, number>;
  totalLines: number;
}

export default function BookHeatmap({ chunksMetadata, chunkScores, totalLines }: BookHeatmapProps) {
  // Helper to determine color based on finalScore (Score-based Thermal Logic)
  const getChunkColor = (finalScore: number | undefined) => {
    if (finalScore === undefined || finalScore === null) return 'bg-gray-800'; // No score

    // Map finalScore to heat using fixed ranges
    if (finalScore >= 0.7) return 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)] z-10'; // 🔥 Very High (0.7-1.0)
    if (finalScore >= 0.5) return 'bg-blue-400'; // ⚠️ High (0.5-0.7)
    if (finalScore >= 0.3) return 'bg-indigo-900'; // ❄️ Medium (0.3-0.5)
    return 'bg-gray-800'; // 🧊 Low (0.0-0.3)
  };

  const chunksWithScores = Array.from(chunkScores.values()).filter(score => score !== undefined && score !== null);
  const uniqueChunks = chunkScores.size;
  const avgScore = chunksWithScores.length > 0 
    ? chunksWithScores.reduce((sum, score) => sum + score, 0) / chunksWithScores.length 
    : 0;

  return (
    <div className="w-full bg-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-white">Chunk Relevance Heatmap</h3>
          <span className="text-xs text-slate-300">
            {uniqueChunks > 0 ? `${uniqueChunks} chunk${uniqueChunks !== 1 ? 's' : ''} • Avg score: ${avgScore.toFixed(3)}` : 'No chunks for current question'}
          </span>
        </div>
        
        {/* Minimal Legend */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400">Low Score</span>
          <div className="flex gap-0.5 h-3">
             <div className="w-3 h-full rounded-sm bg-gray-800" title="0.0-0.3"></div>
             <div className="w-3 h-full rounded-sm bg-indigo-900" title="0.3-0.5"></div>
             <div className="w-3 h-full rounded-sm bg-blue-400" title="0.5-0.7"></div>
             <div className="w-3 h-full rounded-sm bg-orange-500" title="0.7-1.0"></div>
          </div>
          <span className="text-slate-400">High Score</span>
        </div>
      </div>
      
      {/* Heatmap Bar */}
      <div className="w-full h-8 bg-slate-900 rounded-md overflow-hidden flex relative border border-gray-800">
        {chunksMetadata.map((chunk, index) => {
          // OPTION 1: Uniform width for perfect visual consistency
          const widthPercent = chunksMetadata.length > 0 ? (100 / chunksMetadata.length) : 1;
          
          // OPTION 2: Proportional with reasonable limits (uncomment to use)
          // const rawWidthPercent = ((chunk.end_line - chunk.start_line) / (totalLines || 1)) * 100;
          // const widthPercent = Math.max(0.3, Math.min(3, rawWidthPercent)); // 0.3% to 3% width limits
          
          // Handle string/number id mismatch
          const score = chunkScores.get(chunk.id) ?? chunkScores.get(String(chunk.id));
          
          return (
            <div
              key={chunk.id}
              className={`h-full transition-all duration-500 border-r border-slate-900/50 last:border-r-0 ${getChunkColor(score)}`}
              style={{ width: `${widthPercent}%` }}
              title={`Chunk #${chunk.id} (Lines ${chunk.start_line}-${chunk.end_line}, ${chunk.end_line - chunk.start_line} lines) ${score !== undefined ? `• Final Score: ${score.toFixed(3)}` : '• No score'}`}
            />
          );
        })}
      </div>
      
      {/* Chunk Position Labels */}
      <div className="flex justify-between text-xs text-slate-400 mt-1">
        <span>First Chunk</span>
        <span>Last Chunk (Hover for details)</span>
      </div>
    </div>
  );
}