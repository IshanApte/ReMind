'use client';

import { useState, useEffect, useMemo } from 'react';
import BookHeatmap from './components/BookHeatmap';

interface ChunkMetadata {
  id: number;
  start_line: number;
  end_line: number;
}

interface Source {
  id: number | string;
  text: string;
  heading?: string;
  chapter?: string;
  section?: string;
  similarity: number;
  finalScore: number;
  recencyScore: number;
  start_line?: number;
  end_line?: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  turn?: number;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number | null>(null);
  const [chunksMetadata, setChunksMetadata] = useState<ChunkMetadata[]>([]);
  const [totalLines, setTotalLines] = useState<number>(0);
  
  // Load chunk metadata on mount
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const response = await fetch('/api/chunks/metadata');
        if (response.ok) {
          const data = await response.json();
          setChunksMetadata(data.chunks || []);
          setTotalLines(data.totalLines || 0);
        }
      } catch (error) {
        console.error('Failed to load chunks metadata:', error);
      }
    };
    loadMetadata();
  }, []);
  
  // Check if button should be enabled
  const isButtonDisabled = loading || !input.trim();
  
  // Get sources for the selected message
  const selectedSources = selectedMessageIndex !== null 
    ? messages[selectedMessageIndex]?.sources 
    : null;
  
  // Get all accessed chunk IDs with their access counts from all messages
  const accessedChunkIds = useMemo(() => {
    const chunkMap = new Map<number | string, number>();
    messages.forEach(msg => {
      if (msg.sources) {
        msg.sources.forEach(source => {
          const currentCount = chunkMap.get(source.id) || 0;
          chunkMap.set(source.id, currentCount + 1);
        });
      }
    });
    return chunkMap;
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || loading) {
      console.log('Submit prevented:', { trimmedInput, loading });
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = trimmedInput;
    setInput('');
    setLoading(true);
    
    console.log('Submitting query:', currentInput);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: currentInput })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        turn: data.turn
      };

      setMessages(prev => {
        const newMessages = [...prev, assistantMessage];
        // Auto-select the new message if it has sources
        if (data.sources && data.sources.length > 0) {
          setSelectedMessageIndex(newMessages.length - 1);
        }
        return newMessages;
      });
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your question. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            ReMind
          </h1>
          <p className="text-slate-300">
            AI with human-like memory dynamics
          </p>
        </header>

        {/* Book Heatmap */}
        {chunksMetadata.length > 0 && totalLines > 0 && (
          <div className="mb-6">
            <BookHeatmap
              chunksMetadata={chunksMetadata}
              accessedChunkIds={accessedChunkIds}
              totalLines={totalLines}
            />
          </div>
        )}

        {/* Two Column Layout */}
        <div className="flex gap-4 h-[600px]">
          {/* Left Side - Chat */}
          <div className="flex-1 bg-slate-700 rounded-lg shadow-lg flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-slate-400 mt-12">
                  <p className="text-lg mb-2">👋 Welcome to ReMind</p>
                  <p>Ask me anything about the biology textbook!</p>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 cursor-pointer transition-all ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : `bg-slate-600 text-white hover:bg-slate-500 ${
                            msg.sources && msg.sources.length > 0 
                              ? selectedMessageIndex === idx 
                                ? 'ring-2 ring-blue-400' 
                                : ''
                              : ''
                          }`
                    }`}
                    onClick={() => {
                      if (msg.sources && msg.sources.length > 0) {
                        setSelectedMessageIndex(selectedMessageIndex === idx ? null : idx);
                      }
                    }}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="text-xs mt-2 opacity-70 text-white">
                        📚 {msg.sources.length} source{msg.sources.length !== 1 ? 's' : ''} • Click to view
                      </div>
                    )}

                    {msg.turn && (
                      <div className="text-xs mt-2 opacity-70 text-white">
                        Turn #{msg.turn}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-600 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <div className="animate-pulse">🤔</div>
                      <span className="text-white">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form 
              onSubmit={handleSubmit} 
              className="border-t border-slate-600 p-4"
              style={{ position: 'relative', zIndex: 1 }}
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && input.trim() && !loading) {
                      e.preventDefault();
                      handleSubmit(e as any);
                    }
                  }}
                  placeholder="Ask a question about biology..."
                  className="flex-1 px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={isButtonDisabled}
                  aria-disabled={isButtonDisabled}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    isButtonDisabled
                      ? 'bg-slate-600 text-slate-400 cursor-not-allowed pointer-events-none'
                      : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 cursor-pointer shadow-sm hover:shadow'
                  }`}
                >
                  {loading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Side - Chunks/Sources */}
          <div className="flex-1 bg-slate-700 rounded-lg shadow-lg flex flex-col">
            <div className="border-b border-slate-600 p-4">
              <h2 className="text-xl font-bold text-white">
                📚 Source Chunks
              </h2>
              {selectedSources && (
                <p className="text-sm text-slate-300 mt-1">
                  {selectedSources.length} chunk{selectedSources.length !== 1 ? 's' : ''} retrieved
                </p>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {!selectedSources ? (
                <div className="text-center text-slate-400 mt-12">
                  <p className="text-lg mb-2">No sources selected</p>
                  <p className="text-sm">Click on a message with sources to view chunks</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedSources.map((source, srcIdx) => (
                    <div
                      key={srcIdx}
                      className="bg-slate-600 rounded-lg p-4 text-white"
                    >
                      <div className="font-semibold text-lg mb-2">
                        {source.heading || `Chunk #${source.id}`}
                      </div>
                      {source.chapter && (
                        <div className="text-sm text-slate-300 mb-2">
                          {source.chapter}
                          {source.section && ` • ${source.section}`}
                        </div>
                      )}
                      <div className="text-sm text-slate-200 mb-3 leading-relaxed">
                        {source.text}
                      </div>
                      <div className="flex gap-4 text-xs text-slate-300 pt-3 border-t border-slate-500">
                        <span>
                          <span className="font-semibold">Similarity:</span> {(source.similarity * 100).toFixed(1)}%
                        </span>
                        <span>
                          <span className="font-semibold">Final Score:</span> {source.finalScore.toFixed(3)}
                        </span>
                        {source.recencyScore !== undefined && (
                          <span>
                            <span className="font-semibold">Recency:</span> {source.recencyScore.toFixed(3)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

