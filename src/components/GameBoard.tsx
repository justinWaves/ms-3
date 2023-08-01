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
    setGameState,
  } = useGameContext();

  useEffect(() => {
    const newGame = initializeBoard(numberOfRows, numberOfCols, numberOfMines);
    setGameState(newGame as any);
  }, []);

  return (
    <div className="mx-auto flex">
  {  gameState.map((row, rowIndex)=>
   ( <div key={rowIndex}>
    {row.map((cell, cellIndex)=> (
        <Cell key={cellIndex} {...cell} />
    ))}
    </div>)
    ) }
    </div>
  );
}

export default GameBoard;
