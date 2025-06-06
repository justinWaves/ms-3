import React from 'react';

interface DifficultyModalProps {
  onSelectDifficulty: (rows: number, cols: number, mines: number) => void;
}

const difficulties = [
  { 
    name: 'Super Easy', 
    rows: 8, 
    cols: 8, 
    mines: 5,
    description: 'Perfect for beginners'
  },
  { 
    name: 'Pretty Easy', 
    rows: 10, 
    cols: 10, 
    mines: 10,
    description: 'Classic beginner mode'
  },
  { 
    name: 'Not So Easy', 
    rows: 12, 
    cols: 12, 
    mines: 20,
    description: 'Getting challenging'
  },
  { 
    name: 'Pretty Hard', 
    rows: 16, 
    cols: 16, 
    mines: 40,
    description: 'For experienced players'
  },
  { 
    name: 'Mega Extreme', 
    rows: 16, 
    cols: 30, 
    mines: 99,
    description: 'Only for the brave'
  },
];

function DifficultyModal({ onSelectDifficulty }: DifficultyModalProps) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-950 border-slate-600 border rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <h1 className="text-4xl text-slate-200 font-bold text-center mb-2 animate-pulse">
        🚩 Lords of Minesweeper 💣
        </h1>
        <h2 className="text-xl text-slate-500 text-center mb-6">
          Pick your difficulty
        </h2>
        <div className="space-y-3">
          {difficulties.map((difficulty) => (
            <button
              key={difficulty.name}
              onClick={() => onSelectDifficulty(difficulty.rows, difficulty.cols, difficulty.mines)}
              className="w-full py-3 px-4 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
            >
              <div className="flex justify-between items-center">
                <div className="text-left">
                  <div className="font-medium">{difficulty.name}</div>
                  <div className="text-sm text-gray-300">{difficulty.description}</div>
                </div>
                <div className="text-sm text-gray-300">
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