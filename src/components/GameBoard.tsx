import React, { useEffect } from "react";
import { useGameContext } from "../providers/GameProvider";
import Cell from "./Cell";

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
  } = useGameContext();

  useEffect(() => {
    const newGame = initializeBoard(numberOfRows, numberOfCols, numberOfMines);
    setGameState(newGame as any);
  }, []);

  return (
    <>
    <div className="h-20">
{isGameWon && <h1 className="text-green-600 text-center text-5xl"> YOU WIN 🎊</h1>}
{isGameOver && <h1 className="text-red-600 text-center text-5xl"> YOU LOSE 😭</h1>}
    </div>
    <div className="mx-auto flex">
  {  gameState.map((row, rowIndex)=>
   ( <div key={rowIndex}>
    {row.map((cell, cellIndex)=> (
        <Cell key={cellIndex} {...cell} />
    ))}
    </div>)
    ) }
    </div>
    </>
  );
}

export default GameBoard;
