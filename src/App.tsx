import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Trophy, Hash, RotateCcw, Brain, Sparkles, MessageCircle } from 'lucide-react';

interface GameState {
  score: number;
  riddleCount: number;
  attempts: number;
  currentRiddle: string | null;
}

interface GameResponse {
  message: string;
  riddle: string | null;
  isCorrect: boolean | null;
  attemptsUsed: number;
  scoreDelta: number;
  hint: string | null;
  revealedAnswer: string | null;
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    riddleCount: 1,
    attempts: 0,
    currentRiddle: null,
  });
  const [userInput, setUserInput] = useState('');
  const [history, setHistory] = useState<{ role: 'ai' | 'user'; text: string; hint?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Start game automatically
    handleSend('');
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSend = async (input: string) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: input,
          currentState: gameState,
        }),
      });

      if (!response.ok) throw new Error('Failed to talk to Riddle Master');

      const data: GameResponse = await response.json();

      // Update history
      const newHistory = [...history];
      if (input) {
        newHistory.push({ role: 'user', text: input });
      }
      newHistory.push({ 
        role: 'ai', 
        text: data.message + (data.riddle ? `\n\n**RIDDLE:** ${data.riddle}` : ''),
        hint: data.hint || undefined
      });
      setHistory(newHistory);

      // Update game state
      setGameState(prev => ({
        score: prev.score + data.scoreDelta,
        riddleCount: data.riddle ? prev.riddleCount + 1 : prev.riddleCount,
        attempts: data.attemptsUsed,
        currentRiddle: data.riddle || prev.currentRiddle,
      }));

      setUserInput('');
    } catch (error) {
      console.error(error);
      setHistory(prev => [...prev, { role: 'ai', text: "Oops! My brain got in a knot. Try again? 🧩" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetGame = () => {
    setGameState({ score: 0, riddleCount: 1, attempts: 0, currentRiddle: null });
    setHistory([]);
    handleSend('');
  };

  return (
    <div className="min-h-screen bg-[#FFFBEB] flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <header className="w-full max-w-2xl mb-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-400 p-3 border-2 border-black rounded-full rotate-12">
            <Brain className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-display uppercase tracking-tight">Riddle Master</h1>
        </div>
        
        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-green-400 px-4 py-2 border-2 border-black font-bold">
            <Trophy className="w-5 h-5" />
            <span id="score-display">{gameState.score}</span>
          </div>
          <div className="flex items-center gap-2 bg-blue-400 px-4 py-2 border-2 border-black font-bold text-white">
            <Hash className="w-5 h-5" />
            <span id="riddle-count">{gameState.riddleCount}</span>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="w-full max-w-2xl flex-1 flex flex-col bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        {/* Chat window */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-stone-50 select-none">
          <AnimatePresence initial={false}>
            {history.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`
                  max-w-[85%] p-4 border-2 border-black 
                  ${msg.role === 'user' 
                    ? 'bg-blue-100 rounded-l-2xl rounded-tr-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' 
                    : 'bg-white rounded-r-2xl rounded-tl-2xl shadow-[4px_4px_0px_0px_rgba(30,30,30,0.1)]'}
                `}>
                  <div className="whitespace-pre-wrap leading-relaxed text-lg">
                    {msg.text.split('**RIDDLE:**').map((part, index) => (
                      index === 0 ? part : (
                        <div key={index} className="mt-4 p-4 bg-yellow-100 border-2 border-dashed border-black rounded-lg font-medium italic">
                          <span className="font-display block mb-2 not-italic text-2xl uppercase">Riddle {gameState.riddleCount}:</span>
                          {part}
                        </div>
                      )
                    ))}
                  </div>
                  {msg.hint && (
                    <div className="mt-3 flex items-start gap-2 text-sm text-stone-600 bg-stone-100 p-2 rounded border border-black/10 italic">
                      <Sparkles className="w-4 h-4 shrink-0 mt-1 text-yellow-600" />
                      <span>{msg.hint}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-white p-4 border-2 border-black rounded-2xl animate-pulse">
                Thinking... 🤔
              </div>
            </motion.div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        <div className="p-6 border-t-4 border-black bg-white">
          <form 
            onSubmit={(e) => { e.preventDefault(); if(userInput.trim()) handleSend(userInput); }}
            className="flex gap-4"
          >
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="What's your answer?"
              disabled={isLoading}
              className="flex-1 px-4 py-3 border-2 border-black focus:outline-none focus:ring-4 focus:ring-yellow-400 text-lg font-medium"
            />
            <button
              type="submit"
              disabled={isLoading || !userInput.trim()}
              className="bg-yellow-400 px-6 py-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
            >
              <Send className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={resetGame}
              className="bg-rose-400 p-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
              title="Reset Game"
            >
              <RotateCcw className="w-6 h-6" />
            </button>
          </form>
          <p className="mt-3 text-xs text-stone-500 uppercase font-bold tracking-widest text-center">
            Attempts: {gameState.attempts}/3
          </p>
        </div>
      </main>

      {/* Footer / Info */}
      <div className="mt-8 text-center space-y-2 opacity-60">
        <p className="font-mono text-sm">Powered by Gemini 3 Flash</p>
        <div className="flex items-center justify-center gap-2">
          <MessageCircle className="w-4 h-4" />
          <span className="text-xs uppercase font-black">AI Riddle Game</span>
        </div>
      </div>
    </div>
  );
}
