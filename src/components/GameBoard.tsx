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
    <div className="min-h-screen w-full bg-white p-4 sm:p-8">
      {showDifficultyModal && (
        <DifficultyModal onSelectDifficulty={handleDifficultySelect} />
      )}
      <div className="flex flex-col items-center gap-6 w-full max-w-4xl mx-auto">
        {/* Navigation Bar */}
        <div className="w-full bg-gray-800 rounded-lg p-4 shadow-lg flex items-center justify-between">
          {/* Timer */}
          <div className="bg-black text-red-500 font-mono text-2xl px-4 py-2 rounded">
            {formatNumber(timer)}
          </div>

          {/* Face Button */}
          <button
            onClick={handleReset}
            className="text-4xl hover:scale-110 transition-all duration-300 relative group"
            title="Reset Game"
          >
            {getFaceEmoji()}
          </button>

          {/* Move Counter */}
          <div className="bg-black text-red-500 font-mono text-2xl px-4 py-2 rounded">
            {formatNumber(moveCount)}
          </div>
        </div>

        {/* Game Board */}
        <div className="bg-white p-4 rounded-lg shadow-lg">
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
