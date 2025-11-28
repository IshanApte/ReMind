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
  // Convert accessed chunk IDs to usage counts
  const chunkUsage = new Map<number, number>();
  accessedChunkIds.forEach((count, id) => {
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (!isNaN(numId)) {
      chunkUsage.set(numId, count);
    }
  });

  // Find max usage for normalization
  const maxUsage = Math.max(...Array.from(chunkUsage.values()), 1);

  // Calculate heatmap segments - divide the book into ~100 segments for smooth rendering
  const numSegments = 200;
  const segmentLength = totalLines / numSegments;
  const segmentUsage = new Array(numSegments).fill(0);

  // Map chunks to segments and aggregate usage
  chunksMetadata.forEach((chunk) => {
    const usageCount = chunkUsage.get(chunk.id) || 0;
    if (usageCount > 0) {
      const startSegment = Math.floor(chunk.start_line / segmentLength);
      const endSegment = Math.floor(chunk.end_line / segmentLength);
      
      for (let seg = startSegment; seg <= endSegment && seg < numSegments; seg++) {
        segmentUsage[seg] = Math.max(segmentUsage[seg], usageCount);
      }
    }
  });

  // Normalize to 0-1 range
  const normalizedUsage = segmentUsage.map(count => count / maxUsage);

  // Color intensity function (cool to hot: slate -> blue -> yellow -> red)
  const getColor = (intensity: number): string => {
    if (intensity === 0) return '#475569'; // slate-600
    
    // Smooth gradient from blue to yellow to red
    if (intensity < 0.33) {
      // Blue gradient (slate -> blue)
      const t = intensity / 0.33;
      const r = Math.round(71 + (59 - 71) * t);
      const g = Math.round(85 + (130 - 85) * t);
      const b = Math.round(105 + (246 - 105) * t);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (intensity < 0.66) {
      // Blue to yellow
      const t = (intensity - 0.33) / 0.33;
      const r = Math.round(59 + (234 - 59) * t);
      const g = Math.round(130 + (179 - 130) * t);
      const b = Math.round(246 + (8 - 246) * t);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Yellow to red
      const t = (intensity - 0.66) / 0.34;
      const r = Math.round(234 + (239 - 234) * t);
      const g = Math.round(179 + (68 - 179) * t);
      const b = Math.round(8 + (68 - 8) * t);
      return `rgb(${r}, ${g}, ${b})`;
    }
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
            {[...Array(10)].map((_, i) => {
              const intensity = i / 9;
              return (
                <div
                  key={i}
                  className="w-3 h-full rounded-sm"
                  style={{ backgroundColor: getColor(intensity) }}
                />
              );
            })}
          </div>
          <span className="text-slate-400">More</span>
        </div>
      </div>
      
      {/* Heatmap Bar */}
      <div className="w-full h-8 bg-slate-800 rounded-md overflow-hidden flex">
        {normalizedUsage.map((intensity, idx) => (
          <div
            key={idx}
            className="flex-1 border-r border-slate-900 last:border-r-0 transition-colors hover:opacity-80"
            style={{ backgroundColor: getColor(intensity) }}
            title={`Lines ${Math.round(idx * segmentLength)}-${Math.round((idx + 1) * segmentLength)}: ${segmentUsage[idx]} access${segmentUsage[idx] !== 1 ? 'es' : ''}`}
          />
        ))}
      </div>
      
      {/* Start/End Labels */}
      <div className="flex justify-between text-xs text-slate-400 mt-1">
        <span>Start</span>
        <span>End</span>
      </div>
    </div>
  );
}

