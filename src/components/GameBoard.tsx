import React, { useEffect, useState } from "react";
import { useGameContext } from "../providers/GameProvider";
import Cell from "./Cell";
import DifficultyModal from "./DifficultyModal";

function GameBoard() {
  const {
    initializeBoard,
    gameState,
    numberOfCols,
    numberOfRows,
    numberOfMines,
    isGameWon,
    isGameOver,
    setGameState,
    setIsGameOver,
    setIsGameWon,
  } = useGameContext();

  const [timer, setTimer] = useState(0);
  const [moveCount, setMoveCount] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showDifficultyModal, setShowDifficultyModal] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && !isGameOver && !isGameWon) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, isGameOver, isGameWon]);

  const handleDifficultySelect = (rows: number, cols: number, mines: number) => {
    const newGame = initializeBoard(rows, cols, mines);
    setGameState(newGame as any);
    setShowDifficultyModal(false);
    setTimer(0);
    setMoveCount(0);
    setIsTimerRunning(false);
    setIsGameOver(false);
    setIsGameWon(false);
  };

  const handleReset = () => {
    setShowDifficultyModal(true);
  };

  const handleFirstMove = () => {
    if (!isTimerRunning) {
      setIsTimerRunning(true);
    }
    setMoveCount((prev) => prev + 1);
  };

  const getFaceEmoji = () => {
    if (isGameWon) return "😎";
    if (isGameOver) return "😭";
    return "😀";
  };

  const formatNumber = (num: number) => {
    return num.toString().padStart(3, "0");
  };

  return (
    <div className={`min-h-screen w-full p-4 sm:p-8 transition-colors duration-1000 ${isGameWon ? 'rainbow-bg' : 'bg-slate-950'}`}>
      {showDifficultyModal && (
        <DifficultyModal onSelectDifficulty={handleDifficultySelect} />
      )}
      <div className="flex flex-col items-center gap-6 w-full max-w-4xl mx-auto">
        {/* Navigation Bar */}
        <div className="w-full bg-slate-800 rounded-lg p-4 shadow-lg flex items-center justify-between">
          {/* Timer */}
          <div className="bg-black text-red-500 font-mono text-2xl px-4 py-2 rounded">
            {formatNumber(timer)}
          </div>

          {/* Center Section with Emoji and Text */}
          <div className="flex items-center gap-4">
            {(isGameWon || isGameOver) && (
              <span className="text-2xl font-bold text-white">
                {isGameWon ? "YOU ARE" : "TRY"}
              </span>
            )}
            
            <button
              onClick={handleReset}
              className={`text-4xl hover:scale-110 transition-all duration-300 relative group ${isGameWon ? 'animate-spin-slow' : ''}`}
              title="Reset Game"
            >
              {getFaceEmoji()}
            </button>

            {(isGameWon || isGameOver) && (
              <span className="text-2xl font-bold text-white">
                {isGameWon ? "AMAZING" : "AGAIN"}
              </span>
            )}
          </div>

          {/* Move Counter */}
          <div className="bg-black text-red-500 font-mono text-2xl px-4 py-2 rounded">
            {formatNumber(moveCount)}
          </div>
        </div>

        {/* Game Board */}
        <div className="">
          <div className="inline-block">
            {gameState.map((row, rowIndex) => (
              <div key={rowIndex} className="flex">
                {row.map((cell, cellIndex) => (
                  <Cell 
                    key={cellIndex} 
                    {...cell} 
                    onFirstClick={handleFirstMove}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameBoard;
