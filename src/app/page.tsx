'use client';

import { useState } from 'react';

interface Source {
  id: number | string;
  text: string;
  heading?: string;
  chapter?: string;
  section?: string;
  similarity: number;
  finalScore: number;
  recencyScore: number;
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
  
  // Check if button should be enabled
  const isButtonDisabled = loading || !input.trim();

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

      setMessages(prev => [...prev, assistantMessage]);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            ReMind
          </h1>
          <p className="text-slate-600">
            AI with human-like memory dynamics
          </p>
        </header>

        {/* Chat Container */}
        <div className="bg-white rounded-lg shadow-lg h-[600px] flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-slate-500 mt-12">
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
                  className={`max-w-[80%] rounded-lg p-4 ${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  
                  {/* Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-300">
                      <p className="text-xs font-semibold mb-2">
                        📚 Sources ({msg.sources.length}):
                      </p>
                      {msg.sources.map((source, srcIdx) => (
                        <div
                          key={srcIdx}
                          className="text-xs mb-2 p-2 bg-white/50 rounded"
                        >
                          <div className="font-medium">
                            {source.heading || `Chunk #${source.id}`}
                          </div>
                          {source.chapter && (
                            <div className="text-slate-500">
                              {source.chapter}
                              {source.section && ` • ${source.section}`}
                            </div>
                          )}
                          <div className="text-slate-600 mt-1">
                            {source.text}
                          </div>
                          <div className="flex gap-3 mt-2 text-slate-500">
                            <span>Similarity: {(source.similarity * 100).toFixed(1)}%</span>
                            <span>Score: {source.finalScore.toFixed(3)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.turn && (
                    <div className="text-xs mt-2 opacity-70">
                      Turn #{msg.turn}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <div className="animate-pulse">🤔</div>
                    <span className="text-slate-600">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form 
            onSubmit={handleSubmit} 
            className="border-t border-slate-200 p-4"
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
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={isButtonDisabled}
                aria-disabled={isButtonDisabled}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  isButtonDisabled
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none'
                    : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 cursor-pointer shadow-sm hover:shadow'
                }`}
              >
                {loading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

