import React, {
  Dispatch,
  SetStateAction,
  createContext,
  useContext,
  useState,
} from "react";
import { ICell, IGameProvider } from "../types";

interface IGameContext {
  gameState: ICell[][];
  numberOfRows: number;
  numberOfCols: number;
  numberOfMines: number;
  isGameOver: boolean;
  setGameState: Dispatch<SetStateAction<ICell[][]>>;
  setNumberOfRows: Dispatch<SetStateAction<number>>;
  setNumberOfCols: Dispatch<SetStateAction<number>>;
  setNumberOfMines: Dispatch<SetStateAction<number>>;
  setIsGameOver: Dispatch<SetStateAction<boolean>>;
  initializeBoard: (rows: number, cols: number, numberOfMines: number) => void;
  handleLeftClick: (rows: number, cols: number) => void;
  handleRightClick: (rows: number, cols: number) => void;
}

const defaultContext: IGameContext = {
  gameState: [],
  numberOfRows: 10,
  numberOfCols: 10,
  numberOfMines: 10,
  isGameOver: false,
  setGameState: () => {},
  setNumberOfRows: () => {},
  setNumberOfCols: () => {},
  setNumberOfMines: () => {},
  initializeBoard: () => {},
  setIsGameOver: () => {},
  handleLeftClick: () => {},
  handleRightClick: () => {},
};

const GameContext = createContext(defaultContext);

function GameProvider({ children }: IGameProvider) {
  //define state variables
  const [gameState, setGameState] = useState<ICell[][]>([]);
  const [numberOfRows, setNumberOfRows] = useState(10);
  const [numberOfCols, setNumberOfCols] = useState(10);
  const [numberOfMines, setNumberOfMines] = useState(10);
  const [isGameOver, setIsGameOver] = useState(false);

  const createCell = (row: number, col: number) => {
    return {
      row,
      col,
      value: 0,
      isFlagged: false,
      isMine: false,
      isRevealed: false,
    };
  };

  //initializeBoard() => returns 2d matrix
  const initializeBoard = (
    rows: number,
    cols: number,
    numberOfMines: number
  ) => {
    const matrix = [];

    for (let row = 0; row < rows; row++) {
      const newRow = [];
      for (let col = 0; col < cols; col++) {
        newRow.push(createCell(row, col));
      }
      matrix.push(newRow);
    }

    placeMines(numberOfMines, matrix);
    incrementValues(matrix);
    return matrix;
  };

  const placeMines = (numberOfMines: number, matrix: ICell[][]) => {
    let minesToPlace = numberOfMines;

    while (minesToPlace > 0) {
      let row = Math.floor(Math.random() * matrix.length);
      let col = Math.floor(Math.random() * matrix[0].length);

      if (!matrix[row][col].isMine) {
        matrix[row][col].isMine = true;
      }
      minesToPlace--;
    }
  };

  const returnNeighborsCells = (
    row: number,
    col: number,
    matrix: ICell[][]
  ) => {
    const neighbors = [];
    const height = matrix.length;
    const width = matrix[row].length;

    if (row - 1 >= 0) neighbors.push([row - 1, col]); //UP
    if (row + 1 < height) neighbors.push([row + 1, col]); //Down
    if (col - 1 >= 0) neighbors.push([row, col - 1]); //Left
    if (col + 1 < width) neighbors.push([row, col + 1]); //Right
    if (row - 1 >= 0 && col - 1 >= 0) neighbors.push([row - 1, col - 1]); //up left
    if (row - 1 >= 0 && col + 1 < width) neighbors.push([row - 1, col + 1]); //up right
    if (row + 1 < height && col - 1 >= 0) neighbors.push([row + 1, col - 1]); //down left
    if (row + 1 < height && col + 1 < width) neighbors.push([row + 1, col + 1]); //down right

    return neighbors;
  };

  const incrementValues = (matrix: ICell[][]) => {
    for (let row = 0; row < matrix.length; row++) {
      for (let col = 0; col < matrix[row].length; col++) {
        if (matrix[row][col].isMine) {
          const neighbors = returnNeighborsCells(row, col, matrix);

          for (const neighbor of neighbors) {
            const [row, col] = neighbor;
            matrix[row][col].value += 1;
          }
        }
      }
    }
  };

  //DFS so we can use stacks

  const expandZeroValueCells = (
    row: number,
    col: number,
    matrix: ICell[][]
  ) => {
    const copyOfBoard = [...gameState];
    const stack = [[row, col]];

    while (stack.length > 0) {
      const [currentRow, currentCol] = stack.pop() || [];
      const neighbors = returnNeighborsCells(currentRow, currentCol, matrix);

      for (let neighbor of neighbors) {
        const [neighborRow, neighborCol] = neighbor;
        if (copyOfBoard[neighborRow][neighborCol].isRevealed) continue;
        if (!copyOfBoard[neighborRow][neighborCol].isMine) {
          copyOfBoard[neighborRow][neighborCol].isRevealed = true;
        }
        if (copyOfBoard[neighborRow][neighborCol].value === 0) {
          stack.push(neighbor);
        }
      }
    }
    setGameState(copyOfBoard);
  };

  const handleLeftClick = (row: number, col: number) => {
    const copyOfBoard = [...gameState];
    if (copyOfBoard[row][col].isMine) {
      setIsGameOver(true);
      expandAllCells();
    }
    if (copyOfBoard[row][col].value > 0) {
      copyOfBoard[row][col].isRevealed = true;
    }
    if (copyOfBoard[row][col].value === 0) {
      expandZeroValueCells(row, col, copyOfBoard);
    }
    setGameState(copyOfBoard);
  };

  const handleRightClick = (row: number, col: number) => {
    const copyOfBoard = [...gameState];
    copyOfBoard[row][col].isFlagged = true;
    setGameState(copyOfBoard);
  };

  const expandAllCells = () => {
    const copyOfBoard = [...gameState];
    const flattenedBoard = copyOfBoard.flat();
    flattenedBoard.forEach((cell, i) => {
      if (!cell.isRevealed) {
        cell.isRevealed = true;
      }
    });
    setGameState(copyOfBoard);
  };

  return (
    <GameContext.Provider
      value={{
        gameState,
        numberOfRows,
        numberOfCols,
        numberOfMines,
        isGameOver,
        setGameState,
        setNumberOfRows,
        setNumberOfCols,
        setNumberOfMines,
        initializeBoard,
        setIsGameOver,
        handleLeftClick,
        handleRightClick,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export default GameProvider;

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    console.log("Context must be used within a GameProvider");
  }
  return context;
};
