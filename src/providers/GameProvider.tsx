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
  isGameWon: boolean;
  setGameState: Dispatch<SetStateAction<ICell[][]>>;
  setNumberOfRows: Dispatch<SetStateAction<number>>;
  setNumberOfCols: Dispatch<SetStateAction<number>>;
  setNumberOfMines: Dispatch<SetStateAction<number>>;
  setIsGameOver: Dispatch<SetStateAction<boolean>>;
  setIsGameWon:Dispatch<SetStateAction<boolean>>;
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
  isGameWon:false,
  setGameState: () => {},
  setNumberOfRows: () => {},
  setNumberOfCols: () => {},
  setNumberOfMines: () => {},
  initializeBoard: () => {},
  setIsGameOver: () => {},
  setIsGameWon:() => {},
  handleLeftClick: () => {},
  handleRightClick: () => {},
};

const GameContext = createContext(defaultContext);

function GameProvider({ children }: IGameProvider) {
  //define state variables
  const [gameState, setGameState] = useState<ICell[][]>(defaultContext.gameState);
  const [numberOfRows, setNumberOfRows] = useState(defaultContext.numberOfRows);
  const [numberOfCols, setNumberOfCols] = useState(defaultContext.numberOfCols);
  const [numberOfMines, setNumberOfMines] = useState(defaultContext.numberOfMines);
  const [isGameOver, setIsGameOver] = useState(defaultContext.isGameOver);
  const [isGameWon, setIsGameWon] = useState(defaultContext.isGameWon);

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
    const totalCells = matrix.length * matrix[0].length;
    const availablePositions = Array.from({ length: totalCells }, (_, i) => i);
    
    // Shuffle the available positions
    for (let i = availablePositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availablePositions[i], availablePositions[j]] = [availablePositions[j], availablePositions[i]];
    }
    
    // Place mines in the first numberOfMines positions
    for (let i = 0; i < numberOfMines; i++) {
      const position = availablePositions[i];
      const row = Math.floor(position / matrix[0].length);
      const col = position % matrix[0].length;
      matrix[row][col].isMine = true;
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
    // First reveal the clicked cell
    matrix[row][col].isRevealed = true;
    
    // If it's not a zero, we're done
    if (matrix[row][col].value !== 0) return;
    
    const stack = [[row, col]];
    const visited = new Set([`${row},${col}`]);

    while (stack.length > 0) {
      const [currentRow, currentCol] = stack.pop() || [];
      const neighbors = returnNeighborsCells(currentRow, currentCol, matrix);

      for (const [neighborRow, neighborCol] of neighbors) {
        const key = `${neighborRow},${neighborCol}`;
        if (visited.has(key)) continue;
        visited.add(key);

        const neighbor = matrix[neighborRow][neighborCol];
        if (!neighbor.isRevealed && !neighbor.isFlagged && !neighbor.isMine) {
          neighbor.isRevealed = true;
          if (neighbor.value === 0) {
            stack.push([neighborRow, neighborCol]);
          }
        }
      }
    }
  };

  const handleLeftClick = (row: number, col: number) => {
    const copyOfBoard = [...gameState];
    
    // Handle first move
    if (copyOfBoard[row][col].isMine) {
      setIsGameOver(true);
      expandAllCells();
      return;
    }

    // Always reveal the clicked cell first
    copyOfBoard[row][col].isRevealed = true;
    
    // Then handle expansion if needed
    if (copyOfBoard[row][col].value === 0) {
      expandZeroValueCells(row, col, copyOfBoard);
    }
    
    setGameState(copyOfBoard);
    checkForWin();
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

  const checkForWin = () => {
    const copyOfBoard = [...gameState];
    const flattenedBoard = copyOfBoard.flat();
    
    // Get all cells
    const allCells = flattenedBoard.length;
    const mineCells = flattenedBoard.filter(cell => cell.isMine);
    const nonMineCells = flattenedBoard.filter(cell => !cell.isMine);
    
    // Get revealed cells
    const revealedMineCells = mineCells.filter(cell => cell.isRevealed);
    const revealedNonMineCells = nonMineCells.filter(cell => cell.isRevealed);
    
    // Win condition: All non-mine cells are revealed AND no mines are revealed
    const hasWon = revealedNonMineCells.length === nonMineCells.length && revealedMineCells.length === 0;
    
    if (hasWon) {
      setIsGameWon(true);
    }
  }

  return (
    <GameContext.Provider
      value={{
        gameState,
        numberOfRows,
        numberOfCols,
        numberOfMines,
        isGameOver,
        isGameWon,
        setIsGameWon,
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
