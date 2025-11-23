import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import QuantumCanvas from './components/QuantumCanvas';
import Toolbar from './components/Toolbar';
import { GameState, PlacedTool, ToolType, LeaderboardEntry } from './types';
import { Play, RotateCcw, Info, Trophy, X, User, ArrowRight, CheckCircle } from 'lucide-react';
import { PHYSICS, SIMULATION_DURATION_MS, LEVELS } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    attempts: 0,
    lastAccuracy: null,
    isSimulating: true,
    phase: 'PLANNING',
    physicsMode: 'QUANTUM',
    level: 1
  });

  const [placedTools, setPlacedTools] = useState<PlacedTool[]>([]);
  const [draggedType, setDraggedType] = useState<ToolType | null>(null);
  
  // Modals
  const [showTutorial, setShowTutorial] = useState<boolean>(false); // Starts false, invoked by button
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [showStartModal, setShowStartModal] = useState<boolean>(true);
  
  // Data
  const [playerName, setPlayerName] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Load initial local data
  useEffect(() => {
    const savedScores = localStorage.getItem('quantum_leaderboard');
    if (savedScores) {
       setLeaderboard(JSON.parse(savedScores));
    }
    
    // Check if player has a stored name to autofill
    const savedName = localStorage.getItem('quantum_player_name');
    if (savedName) {
        setPlayerName(savedName);
    }
  }, []);

  const handleStartGame = () => {
      if (!playerName.trim()) return;
      localStorage.setItem('quantum_player_name', playerName);
      setShowStartModal(false);
      setShowTutorial(true); // Show tutorial after name entry for new players
  };

  // Fetch Leaderboard (Local Only)
  const fetchLeaderboard = useCallback(() => {
    const localStr = localStorage.getItem('quantum_leaderboard');
    const localData: LeaderboardEntry[] = localStr ? JSON.parse(localStr) : [];
    setLeaderboard(localData.sort((a, b) => b.score - a.score));
  }, []);

  useEffect(() => {
    if (showLeaderboard) {
        fetchLeaderboard();
    }
  }, [showLeaderboard, fetchLeaderboard]);

  const saveScore = useCallback((currentScore: number) => {
    if (!playerName) return;

    const today = new Date().toLocaleDateString();
    const localStr = localStorage.getItem('quantum_leaderboard');
    let localData: LeaderboardEntry[] = localStr ? JSON.parse(localStr) : [];
    
    // Check if user already has an entry for today
    const existingIndex = localData.findIndex(e => e.name === playerName);
    
    if (existingIndex >= 0) {
        // Only update if current score is higher (High Score logic)
        if (currentScore > localData[existingIndex].score) {
            localData[existingIndex].score = currentScore;
            localData[existingIndex].date = today;
        }
    } else {
        // New entry
        localData.push({
            name: playerName,
            score: currentScore,
            date: today
        });
    }
    
    // Sort and save
    const updatedLocal = localData.sort((a, b) => b.score - a.score);
    localStorage.setItem('quantum_leaderboard', JSON.stringify(updatedLocal));
    setLeaderboard(updatedLocal);
  }, [playerName]);

  const handleFire = () => {
    if (gameState.phase === 'PLANNING') {
        setGameState(prev => ({ ...prev, phase: 'FIRED' }));
    }
  };

  const handleResetLevel = () => {
    setGameState(prev => ({ 
        ...prev, 
        phase: 'PLANNING', 
        lastAccuracy: null,
        score: 0 // Reset score on retry to prevent farming/accumulating failed attempts
    }));
  };

  const handleClearTools = () => {
    setPlacedTools([]);
    handleResetLevel();
  };
  
  const handleLevelSelect = (levelId: number) => {
    setGameState(prev => ({
        ...prev,
        level: levelId,
        phase: 'PLANNING',
        lastAccuracy: null,
        score: 0 // Reset score when manually changing levels
    }));
    setPlacedTools([]);
  };

  const handleNextLevel = () => {
      if (gameState.level < 3) {
          setGameState(prev => ({ 
              ...prev, 
              level: prev.level + 1, 
              phase: 'PLANNING', 
              lastAccuracy: null 
              // Note: Score is PRESERVED on Next Level to allow streak high scores
          }));
          setPlacedTools([]); // Clear tools for new challenge
      } else {
          // Finished all levels - show leaderboard
          setShowLeaderboard(true);
      }
  };

  const togglePhysicsMode = () => {
    setGameState(prev => ({
      ...prev,
      phase: 'PLANNING',
      lastAccuracy: null,
      score: 0, // Reset score when switching modes
      physicsMode: prev.physicsMode === 'QUANTUM' ? 'CLASSICAL' : 'QUANTUM'
    }));
  };

  const handleFireComplete = useCallback((accuracy: number) => {
      setGameState(prev => {
        const newScore = prev.score + (accuracy * 10 * prev.level); // More points for higher levels
        
        // Save score immediately if it's a valid run (>0)
        if (newScore > 0) {
            saveScore(newScore);
        }

        return {
          ...prev,
          phase: 'RESULT',
          score: newScore,
          lastAccuracy: accuracy,
          attempts: prev.attempts + 1
        };
      });
  }, [saveScore]);

  const currentLevelConfig = LEVELS.find(l => l.id === gameState.level) || LEVELS[0];

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans selection:bg-blue-500 selection:text-white overflow-hidden">
      <Header 
        gameState={gameState} 
        resetGame={() => window.location.reload()} 
        toggleLeaderboard={() => setShowLeaderboard(true)}
        togglePhysicsMode={togglePhysicsMode}
        onLevelSelect={handleLevelSelect}
      />

      <div className="flex-1 flex relative overflow-hidden">
        {/* Sidebar Layout */}
        <div className="z-30 relative">
           <Toolbar 
              onDragStart={(type) => setDraggedType(type)} 
              disabled={gameState.phase !== 'PLANNING'}
           />
        </div>

        <main className="flex-1 flex flex-col items-center justify-center p-4 relative">
          
          {/* Level Info Banner - Selectors moved to Header */}
          <div className="flex flex-col items-center gap-2 mb-4 z-10 w-full max-w-4xl">
            <div className="px-6 py-2 bg-slate-900/60 rounded-full border border-slate-800/50 backdrop-blur-sm text-center">
                <span className="text-xs uppercase tracking-widest text-blue-300 font-bold block mb-1">Missão Atual</span>
                <span className="text-sm text-slate-200">{currentLevelConfig.title}: <span className="text-slate-400 font-normal">{currentLevelConfig.description}</span></span>
            </div>
          </div>
          
          {/* Background Effects */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(30,41,59,0.5),rgba(15,23,42,1))] -z-10"></div>
          
          {/* Game Area Container */}
          <div className="relative group">
            <QuantumCanvas 
              gameState={gameState}
              setGameState={setGameState}
              placedTools={placedTools}
              setPlacedTools={setPlacedTools}
              onFireComplete={handleFireComplete}
            />

            {/* Action Buttons */}
            <div className="absolute bottom-8 right-8 flex flex-col gap-4">
              {gameState.phase === 'PLANNING' ? (
                  <button 
                      onClick={handleFire}
                      className={`group relative flex items-center gap-3 px-8 py-4 bg-gradient-to-r rounded-full font-bold text-xl transform hover:scale-105 transition-all active:scale-95 ${
                        gameState.physicsMode === 'QUANTUM' 
                          ? 'from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:shadow-[0_0_30px_rgba(59,130,246,0.8)]' 
                          : 'from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-[0_0_20px_rgba(245,158,11,0.5)] hover:shadow-[0_0_30px_rgba(245,158,11,0.8)]'
                      }`}
                  >
                      <span className="relative z-10">
                         {gameState.physicsMode === 'QUANTUM' ? 'COLAPSAR ONDA' : 'DISPARAR'}
                      </span>
                      <Play className="w-6 h-6 fill-current" />
                      <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:animate-ping"></div>
                  </button>
              ) : gameState.phase === 'RESULT' ? (
                  <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="bg-slate-800 p-4 rounded-lg border border-slate-600 mb-2 text-center shadow-xl">
                          <p className="text-slate-400 text-sm uppercase font-bold mb-1">Resultado</p>
                          <p className="text-3xl font-bold text-white mb-1">{gameState.lastAccuracy}% <span className="text-base font-normal text-slate-300">acerto</span></p>
                      </div>
                      
                      {gameState.lastAccuracy && gameState.lastAccuracy >= 10 ? (
                         <button 
                             onClick={handleNextLevel}
                             className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-full font-semibold text-white shadow-lg transition-colors"
                         >
                             {gameState.level < 3 ? 'Próxima Fase' : 'Ver Ranking'}
                             <ArrowRight className="w-5 h-5" />
                         </button>
                      ) : (
                         <button 
                             onClick={handleResetLevel}
                             className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-full font-semibold text-white shadow-lg transition-colors"
                         >
                             <RotateCcw className="w-5 h-5" />
                             Tentar Novamente
                         </button>
                      )}
                  </div>
              ) : (
                 <div className="px-8 py-4 bg-slate-800 rounded-full text-slate-400 font-mono animate-pulse border border-slate-600 flex items-center gap-3">
                     <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                     {gameState.physicsMode === 'QUANTUM' ? 'OBSERVANDO SISTEMA...' : 'SIMULANDO TRAJETÓRIA...'}
                 </div>
              )}
            </div>
            
             {/* Clear Tools Button */}
             {gameState.phase === 'PLANNING' && placedTools.length > 0 && (
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <button 
                  onClick={handleClearTools}
                  className="px-4 py-2 bg-red-900/50 hover:bg-red-900/80 text-red-200 text-xs rounded border border-red-800 transition-colors"
                >
                  Limpar Tudo
                </button>
              </div>
             )}
          </div>
        </main>
      </div>

      {/* STARTUP NAME MODAL */}
      {showStartModal && (
        <div className="fixed inset-0 bg-slate-950 z-50 flex items-center justify-center p-4">
           <div className="max-w-md w-full bg-slate-900 p-8 rounded-2xl border border-slate-700 shadow-2xl text-center">
               <div className="w-20 h-20 bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/30">
                   <User className="w-10 h-10 text-blue-400" />
               </div>
               <h1 className="text-3xl font-bold text-white mb-2">Identificação</h1>
               <p className="text-slate-400 mb-8">Digite seu nome para acessar o laboratório.</p>
               
               <input 
                 type="text"
                 value={playerName}
                 onChange={(e) => setPlayerName(e.target.value)}
                 className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white text-center text-lg mb-6 focus:border-blue-500 focus:outline-none placeholder-slate-600"
                 placeholder="Seu Nome"
                 autoFocus
                 onKeyDown={(e) => e.key === 'Enter' && handleStartGame()}
               />
               
               <button 
                 onClick={handleStartGame}
                 disabled={!playerName.trim()}
                 className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20"
               >
                   Entrar no Laboratório
               </button>
           </div>
        </div>
      )}

      {/* LEADERBOARD MODAL */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-600 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button 
                onClick={() => setShowLeaderboard(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
                <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-3 mb-6">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <h2 className="text-xl font-bold text-white">Recordes Locais</h2>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              {leaderboard.map((entry, idx) => (
                <div key={idx} className={`flex justify-between items-center p-3 rounded ${entry.name === playerName ? 'bg-blue-900/30 border border-blue-500' : 'bg-slate-800 border border-slate-700'}`}>
                   <div className="flex items-center gap-3">
                     <span className={`font-mono font-bold w-6 ${idx === 0 ? 'text-yellow-400' : 'text-slate-500'}`}>#{idx + 1}</span>
                     <span className="text-slate-200 font-semibold truncate max-w-[120px]">{entry.name}</span>
                   </div>
                   <div className="text-right">
                     <div className="text-emerald-400 font-mono font-bold">{entry.score}</div>
                     <div className="text-[10px] text-slate-500">{entry.date}</div>
                   </div>
                </div>
              ))}
              {leaderboard.length === 0 && (
                  <div className="text-center text-slate-500 py-8">Ainda sem jogos registrados.</div>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-700 text-center">
                 <button 
                    onClick={() => {
                        localStorage.removeItem('quantum_leaderboard');
                        setLeaderboard([]);
                    }}
                    className="text-xs text-red-400 hover:text-red-300 underline"
                 >
                     Limpar Histórico
                 </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Modal */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-600 rounded-2xl max-w-2xl w-full p-8 shadow-2xl relative">
            <button 
                onClick={() => setShowTutorial(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
                ✕
            </button>
            
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-600 rounded-full">
                    <Info className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Bem-vindo, {playerName}!</h2>
            </div>

            <div className="space-y-4 text-slate-300 text-lg leading-relaxed">
                <p>Prepare-se para calibrar o Canhão Quântico em 3 Fases.</p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-base text-slate-400">
                    <li>O alvo mudará de posição a cada fase.</li>
                    <li>Use os atratores e repulsores para guiar a onda/partículas.</li>
                    <li>Você precisa de pelo menos 10% de precisão para avançar.</li>
                    <li>A simulação dura <strong>{SIMULATION_DURATION_MS/1000} segundos</strong> após o disparo.</li>
                </ul>
            </div>

            <div className="mt-8 flex justify-end">
                <button 
                    onClick={() => setShowTutorial(false)}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors"
                >
                    Começar Fase 1
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;