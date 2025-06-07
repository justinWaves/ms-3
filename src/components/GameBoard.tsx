import React, { useEffect, useState } from "react";
import { useGameContext } from "../providers/GameProvider";
import Cell from "./Cell";
import DifficultyModal from "./DifficultyModal";
import Confetti from 'react-confetti';
import Bubbles from './Bubbles';

function GameBoard() {
  const {
    gameState,
    isGameOver,
    isGameWon,
    winMessage,
    loseMessage,
    handleLeftClick,
    handleRightClick,
    resetGame,
    getFaceEmoji,
    shouldShake,
    initializeBoard,
    numberOfRows,
    numberOfCols,
    numberOfMines
  } = useGameContext();

  const [timer, setTimer] = useState(0);
  const [moveCount, setMoveCount] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showDifficultyModal, setShowDifficultyModal] = useState(true);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    initializeBoard(rows, cols, mines);
    setShowDifficultyModal(false);
    setTimer(0);
    setMoveCount(0);
    setIsTimerRunning(false);
  };

  const handleReset = () => {
    resetGame();
    setShowDifficultyModal(true);
  };

  const handleFirstMove = () => {
    if (!isTimerRunning) {
      setIsTimerRunning(true);
    }
    setMoveCount((prev) => prev + 1);
  };

  const formatNumber = (num: number) => {
    return num.toString().padStart(3, '0');
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-sky-900 via-slate-900 to-slate-950">
      {/* Ocean waves effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.1),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(56,189,248,0.05),transparent)] pointer-events-none" />
      
      {/* Floating bubbles */}
      <Bubbles />
      
      {isGameWon && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.2}
        />
      )}

      {showDifficultyModal && (
        <DifficultyModal onSelectDifficulty={handleDifficultySelect} />
      )}

      {/* Fixed Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 ">
        <div className="w-full max-w-4xl mx-auto p-2 sm:p-4">
          <div className="bg-slate-900 rounded-lg p-2 sm:p-4 shadow-lg flex items-center justify-between">
            {/* Timer */}
            <div className="bg-black text-red-500 text-xl sm:text-2xl px-2 sm:px-4 py-1 sm:py-2 rounded">
              {formatNumber(timer)}
            </div>

            {/* Center Section with Emoji and Text */}
            <div className="flex items-center justify-center gap-4">
              {(isGameWon || isGameOver) && (
                <span className={`text-lg sm:text-2xl ${
                  isGameWon ? 'celebrate-text' : 'game-over-text'
                }`}>
                  {isGameWon ? winMessage.left : loseMessage.left}
                </span>
              )}
              
              <button
                onClick={handleReset}
                className={`text-3xl sm:text-4xl hover:scale-110 transition-all duration-300 relative group ${
                  isGameWon ? 'animate-spin-slow' : ''
                }`}
                title="Reset Game"
              >
                {getFaceEmoji()}
              </button>

              {(isGameWon || isGameOver) && (
                <span className={`text-lg sm:text-2xl ${
                  isGameWon ? 'celebrate-text' : 'game-over-text'
                }`}>
                  {isGameWon ? winMessage.right : loseMessage.right}
                </span>
              )}
            </div>

            {/* Move Counter */}
            <div className="bg-black text-red-500 text-xl sm:text-2xl px-2 sm:px-4 py-1 sm:py-2 rounded">
              {formatNumber(moveCount)}
            </div>
          </div>
        </div>
      </div>

      {/* Game Board Container */}
      <div className="h-full w-full overflow-auto pt-20 sm:pt-24">
        <div className="min-h-full w-full p-2 sm:p-8">
          <div className="w-full text-center">
            <div className="inline-block px-4">
              <div className={`${isGameWon ? 'celebrate-scale' : ''} ${shouldShake ? 'game-over-shake' : ''}`}>
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
      </div>
    </div>
  );
}

export default GameBoard;
