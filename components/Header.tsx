import React from 'react';
import { GameState } from '../types';
import { Activity, Target, Zap, Trophy, Atom, CircleDot } from 'lucide-react';
import { LEVELS } from '../constants';

interface HeaderProps {
  gameState: GameState;
  resetGame: () => void;
  toggleLeaderboard: () => void;
  togglePhysicsMode: () => void;
  onLevelSelect: (levelId: number) => void;
}

const Header: React.FC<HeaderProps> = ({ gameState, resetGame, toggleLeaderboard, togglePhysicsMode, onLevelSelect }) => {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-700 shadow-lg z-10 relative h-20">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg shadow-inner transition-colors duration-500 ${gameState.physicsMode === 'QUANTUM' ? 'bg-blue-600 shadow-blue-400/50' : 'bg-amber-600 shadow-amber-400/50'}`}>
            <Zap className="text-white w-6 h-6" />
          </div>
          <div className="hidden lg:block">
            <h1 className="text-xl font-bold text-blue-100 tracking-wide">CANHÃO QUÂNTICO</h1>
          </div>
        </div>

        {/* Physics Mode Toggle */}
        <div className="flex items-center bg-slate-800 p-1 rounded-full border border-slate-600">
          <button
            onClick={() => gameState.physicsMode !== 'QUANTUM' && togglePhysicsMode()}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              gameState.physicsMode === 'QUANTUM' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Atom className="w-3 h-3" />
            QUÂNTICO
          </button>
          <button
            onClick={() => gameState.physicsMode !== 'CLASSICAL' && togglePhysicsMode()}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              gameState.physicsMode === 'CLASSICAL' 
                ? 'bg-amber-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CircleDot className="w-3 h-3" />
            CLÁSSICO
          </button>
        </div>

        {/* Phase Selector */}
        <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-600 ml-2">
            {LEVELS.map(level => (
                <button
                    key={level.id}
                    onClick={() => onLevelSelect(level.id)}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                        gameState.level === level.id
                        ? 'bg-slate-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    FASE {level.id}
                </button>
            ))}
        </div>
      </div>

      <div className="flex gap-8">
        <div className="flex flex-col items-center">
          <span className="text-xs text-slate-400 uppercase font-bold">Pontuação</span>
          <span className="text-2xl font-mono text-emerald-400 font-bold glow-text">
            {gameState.score.toString().padStart(5, '0')}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-xs text-slate-400 uppercase font-bold">Precisão</span>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-400" />
            <span className={`text-2xl font-mono font-bold ${gameState.lastAccuracy && gameState.lastAccuracy > 80 ? 'text-purple-400' : 'text-slate-300'}`}>
              {gameState.lastAccuracy !== null ? `${gameState.lastAccuracy}%` : '--'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={toggleLeaderboard}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded border border-slate-600 text-sm font-semibold transition-colors"
          title="Ver Ranking"
        >
          <Trophy className="w-4 h-4" />
        </button>
        <button 
          onClick={resetGame}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-600 text-sm font-semibold transition-colors"
        >
          Reiniciar
        </button>
      </div>
    </header>
  );
};

export default Header;