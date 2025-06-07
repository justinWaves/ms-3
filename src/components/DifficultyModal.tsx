import React from 'react';

interface DifficultyModalProps {
  onSelectDifficulty: (rows: number, cols: number, mines: number) => void;
}

const difficulties = [
  { 
    name: 'Beginner Wave', 
    rows: 8, 
    cols: 8, 
    mines: 5,
    description: 'white water'
  },
  { 
    name: 'Pretty chill wave', 
    rows: 10, 
    cols: 10, 
    mines: 10,
    description: 'Classic beginner mode'
  },
  { 
    name: 'Medium wave', 
    rows: 12, 
    cols: 12, 
    mines: 20,
    description: 'Getting challenging'
  },
  { 
    name: 'Massive Swell', 
    rows: 16, 
    cols: 16, 
    mines: 40,
    description: 'For experienced players'
  },
  { 
    name: 'Mega Extreme Wave', 
    rows: 16, 
    cols: 30, 
    mines: 99,
    description: 'Only for the brave'
  },
];

function DifficultyModal({ onSelectDifficulty }: DifficultyModalProps) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-950 border-slate-600 border rounded-lg shadow-xl p-8 max-w-lg w-full mx-4 relative overflow-hidden">
        {/* Decorative wave patterns */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
          {/* Side wave decorations */}
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-transparent via-cyan-500 to-transparent"></div>
          <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-transparent via-cyan-500 to-transparent"></div>
        </div>

        <h1 className="text-3xl text-cyan-500 text-center mb-2 animate-pulse font-mono tracking-wider relative">
          🏄‍♂️🌊 MINESURFER 🌊🏄‍♂️
        </h1>
        <h2 className="text-xl text-slate-500 text-center mb-6">
          Pick Your Wave
        </h2>
        <div className="space-y-3">
          {difficulties.map((difficulty, index) => (
            <button
              key={difficulty.name}
              onClick={() => onSelectDifficulty(difficulty.rows, difficulty.cols, difficulty.mines)}
              className="w-full py-3 px-4 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-cyan-500/20 group relative overflow-hidden"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Button wave decoration */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-wave"></div>
              </div>
              <div className="flex justify-between items-center relative z-10">
                <div className="text-left">
                  <div className="font-medium group-hover:text-cyan-400 transition-colors">{difficulty.name}</div>
                  <div className="text-sm text-gray-300">{difficulty.description}</div>
                </div>
                <div className="text-sm text-gray-300 group-hover:text-cyan-300 transition-colors">
                  {difficulty.rows}x{difficulty.cols} - {difficulty.mines} mines
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DifficultyModal; 