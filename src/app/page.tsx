/**
 * Main Page Component
 * -------------------
 * This is the entry point for the Beyond RAG web application. It handles message state, 
 * user input, loading and onboarding modal, and fetches chunk metadata for the BookHeatmap visualization.
 * The layout and state hooks support sending user queries, rendering assistant responses, and visualizing
 * relevant book chunks to help users zero in on topics of interest.
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import BookHeatmap from './components/BookHeatmap';
import Onboarding from './components/Onboarding';

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
  confidence?: number;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number | null>(null);
  const [chunksMetadata, setChunksMetadata] = useState<ChunkMetadata[]>([]);
  const [totalLines, setTotalLines] = useState<number>(0);
  const [showOnboarding, setShowOnboarding] = useState(true);
  
  const developerPortfolios = {
    ishan: 'https://ishan.info/',
    prathamesh: 'https://www.prathamesh-more.com/'
  };
  
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
  
  const isButtonDisabled = loading || !input.trim();
  
  const selectedSources = selectedMessageIndex !== null 
    ? messages[selectedMessageIndex]?.sources 
    : null;
  
  const currentChunkScores = useMemo(() => {
    const chunkMap = new Map<number | string, number>();
    let targetMessage: Message | null = null;
    if (selectedMessageIndex !== null && messages[selectedMessageIndex]?.sources) {
      targetMessage = messages[selectedMessageIndex];
    } else {
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        if (message && message.role === 'assistant' && message.sources && message.sources.length > 0) {
          targetMessage = message;
          break;
        }
      }
    }
    if (targetMessage?.sources) {
      targetMessage.sources.forEach(source => {
        chunkMap.set(source.id, source.finalScore);
      });
    }
    return chunkMap;
  }, [messages, selectedMessageIndex]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || loading) {
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
        turn: data.turn,
        confidence: data.confidence
      };

      setMessages(prev => {
        const newMessages = [...prev, assistantMessage];
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
    <>
      {showOnboarding && (
        <Onboarding onComplete={() => setShowOnboarding(false)} />
      )}
      
      <div className="min-h-screen bg-slate-800">
        <div className="container mx-auto px-4 pt-4 pb-8">
          <header className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-white mb-2">
              Beyond RAG
            </h1>
            <p className="text-slate-300">
              Dynamic Memory That Adapts to Topic Flow
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm">
              <p className="text-xs text-slate-400 font-medium">
                Developers
              </p>
              <a
                href={developerPortfolios.prathamesh}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white transition-colors duration-200 font-medium hover:underline underline-offset-4"
              >
                Prathamesh
              </a>
              <span className="text-slate-500">&</span>
              <a
                href={developerPortfolios.ishan}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white transition-colors duration-200 font-medium hover:underline underline-offset-4"
              >
                Ishan
              </a>
            </div>
          </header>

        {chunksMetadata.length > 0 && totalLines > 0 && (
          <div className="mb-6">
            <BookHeatmap
              chunksMetadata={chunksMetadata}
              chunkScores={currentChunkScores}
              totalLines={totalLines}
            />
          </div>
        )}

        <div className="flex gap-4 h-[600px]">
          <div className="flex-1 bg-slate-700 rounded-lg shadow-lg flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-slate-400 mt-12">
                  <p className="text-lg mb-4 whitespace-pre-wrap">"Give me a high-level overview of the circulatory system."{'\n\n'}"What's the difference between mitosis and meiosis?"{'\n\n'}"How does gas exchange work in the lungs?"</p>
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
                    className={`relative max-w-[80%] rounded-lg p-4 cursor-pointer transition-all ${
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
                    {msg.role === 'assistant' && msg.confidence !== undefined && (
                      <div className="group relative mb-3">
                        <div className={`
                          cursor-help inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium
                          ${msg.confidence >= 80 ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/30' : 
                            msg.confidence >= 50 ? 'bg-amber-500/20 text-amber-100 border border-amber-500/30' : 
                            'bg-rose-500/20 text-rose-100 border border-rose-500/30'}
                        `}>
                          {msg.confidence >= 80 ? (
                            <span className="text-[10px]">Verified</span>
                          ) : msg.confidence >= 50 ? (
                            <span className="text-[10px]">⚠️ Uncertain</span>
                          ) : (
                            <span className="text-[10px]">Low Confidence</span>
                          )}
                          
                          <span className="opacity-75 border-l border-white/10 pl-1.5 ml-0.5">
                            {msg.confidence}%
                          </span>
                        </div>
                        <div className="invisible group-hover:visible absolute bottom-full left-0 mb-2 w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl border border-slate-700 z-[100] pointer-events-none">
                          <div className="font-semibold mb-1">Confidence Score (0-100)</div>
                          <div className="text-slate-300 leading-relaxed">
                            Indicates how well the answer stays aligned with the source material, indicating the risk of hallucination. Calculated from groundedness (50%), keyword overlap (30%), and context quality (20%).
                          </div>
                          <div className="absolute top-full left-4 -mt-1 w-2 h-2 bg-slate-900 border-r border-b border-slate-700 rotate-45"></div>
                        </div>
                      </div>
                    )}

                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="text-xs mt-2 opacity-70 text-white">
                        {msg.sources.length} source{msg.sources.length !== 1 ? 's' : ''} • Click to view
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
                      {/* Animated Thinking Dots */}
                      <div className="flex items-end gap-1 h-6" aria-label="Thinking...">
                        <span className="dot-animate block w-2 h-2 bg-white rounded-full animate-bounce-dot-1" />
                        <span className="dot-animate block w-2 h-2 bg-white rounded-full animate-bounce-dot-2" />
                        <span className="dot-animate block w-2 h-2 bg-white rounded-full animate-bounce-dot-3" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <style jsx global>{`
                .animate-bounce-dot-1 {
                  animation: bounce-dot 1.2s infinite;
                  animation-delay: 0s;
                }
                .animate-bounce-dot-2 {
                  animation: bounce-dot 1.2s infinite;
                  animation-delay: 0.2s;
                }
                .animate-bounce-dot-3 {
                  animation: bounce-dot 1.2s infinite;
                  animation-delay: 0.4s;
                }
                @keyframes bounce-dot {
                  0%, 80%, 100% { transform: translateY(0); }
                  30% { transform: translateY(-8px);}
                  50% { transform: translateY(0);}
                }
              `}</style>
            </div>

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

          <div className="flex-1 bg-slate-700 rounded-lg shadow-lg flex flex-col">
            <div className="border-b border-slate-600 p-4">
              <h2 className="text-xl font-bold text-white">
                Source Chunks
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
                          <span className="group relative">
                            <span className="cursor-help">
                              <span className="font-semibold">Decay Score:</span> {source.recencyScore.toFixed(3)}
                            </span>
                            <div className="invisible group-hover:visible absolute bottom-full left-0 mb-2 w-56 p-2.5 bg-slate-900 text-white text-xs rounded-lg shadow-xl border border-slate-700 z-[100] pointer-events-none">
                              <div className="font-semibold mb-1">Decay Score (0.0-1.0)</div>
                              <div className="text-slate-300 leading-relaxed">
                                How fresh a memory is. Recently accessed memories score higher (closer to 1.0), while older ones fade but never disappear, like human memory.
                              </div>
                              <div className="absolute top-full left-4 -mt-1 w-2 h-2 bg-slate-900 border-r border-b border-slate-700 rotate-45"></div>
                            </div>
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
    </>
  );
}