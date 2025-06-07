import React, {
  Dispatch,
  SetStateAction,
  createContext,
  useContext,
  useState,
} from "react";
import { ICell, IGameProvider } from "../types";

interface GameContextType {
  gameState: ICell[][];
  numberOfRows: number;
  numberOfCols: number;
  numberOfMines: number;
  isGameOver: boolean;
  isGameWon: boolean;
  winMessage: { left: string; right: string };
  loseMessage: { left: string; right: string };
  setGameState: Dispatch<SetStateAction<ICell[][]>>;
  setNumberOfRows: Dispatch<SetStateAction<number>>;
  setNumberOfCols: Dispatch<SetStateAction<number>>;
  setNumberOfMines: Dispatch<SetStateAction<number>>;
  setIsGameOver: Dispatch<SetStateAction<boolean>>;
  setIsGameWon: Dispatch<SetStateAction<boolean>>;
  initializeBoard: (rows: number, cols: number, numberOfMines: number) => void;
  handleLeftClick: (rows: number, cols: number) => void;
  handleRightClick: (rows: number, cols: number) => void;
  resetGame: () => void;
  getFaceEmoji: () => JSX.Element;
  shouldShake: boolean;
}

const defaultContext: GameContextType = {
  gameState: [],
  numberOfRows: 10,
  numberOfCols: 10,
  numberOfMines: 10,
  isGameOver: false,
  isGameWon: false,
  winMessage: { left: "", right: "" },
  loseMessage: { left: "", right: "" },
  setGameState: () => {},
  setNumberOfRows: () => {},
  setNumberOfCols: () => {},
  setNumberOfMines: () => {},
  setIsGameOver: () => {},
  setIsGameWon: () => {},
  initializeBoard: () => {},
  handleLeftClick: () => {},
  handleRightClick: () => {},
  resetGame: () => {},
  getFaceEmoji: () => <></>,
  shouldShake: false,
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
  const [winMessage, setWinMessage] = useState({ left: "", right: "" });
  const [loseMessage, setLoseMessage] = useState({ left: "", right: "" });
  const [shouldShake, setShouldShake] = useState(false);

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
    setGameState(matrix);
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

  const handleGameOver = () => {
    const loseMessages = [
      { left: "Wipe", right: "Out!" },
      { left: "Epic", right: "Fail!" },
      { left: "Shark", right: "Attack!" },
      { left: "Wipe", right: "Out!" },
      { left: "Bail", right: "Out!" },
      { left: "Total", right: "Wipeout!" },
      { left: "Rough", right: "Seas!" },
      { left: "Crashed", right: "& Burned!" }
    ];
    const randomMessage = loseMessages[Math.floor(Math.random() * loseMessages.length)];
    setLoseMessage(randomMessage);
    setIsGameOver(true);
    setShouldShake(true);
  };

  const handleLeftClick = (row: number, col: number) => {
    const copyOfBoard = [...gameState];
    
    // Handle first move
    if (copyOfBoard[row][col].isMine) {
      handleGameOver();
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
    if (isGameOver || isGameWon) return;
    
    const copyOfBoard = gameState.map(row => [...row]);
    const cell = copyOfBoard[row][col];
    
    if (!cell.isRevealed) {
      cell.isFlagged = !cell.isFlagged;
      setGameState(copyOfBoard);
      checkForWin();
    }
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
      handleWin();
    }
  }

  const handleWin = () => {
    const winMessages = [
      { left: "Totally", right: "Tubular!" },
      { left: "Shredding", right: "It!" },
      { left: "Epic", right: "Wave!" },
      { left: "Stoked", right: "Dude!" },
      { left: "Perfect", right: "Pipeline!" }
    ];
    const randomMessage = winMessages[Math.floor(Math.random() * winMessages.length)];
    setWinMessage(randomMessage);
    setIsGameWon(true);
    setShouldShake(false);
  };

  const getFaceEmoji = () => {
    if (isGameWon) {
      return (
        <div className="flex items-center gap-2">
          <span>😎</span>
          <span className="text-sm font-medium">{winMessage.left} {winMessage.right}</span>
        </div>
      );
    }
    if (isGameOver) return <span>😵</span>;
    return <span>😊</span>;
  };

  const handleClick = (rows: number, cols: number) => {
    // Implementation of handleClick
  };

  const resetGame = () => {
    setGameState([]);
    setIsGameOver(false);
    setIsGameWon(false);
    setShouldShake(false);
    setWinMessage({ left: "", right: "" });
    // Implementation of resetGame
  };

  return (
    <GameContext.Provider
      value={{
        gameState,
        numberOfRows,
        numberOfCols,
        numberOfMines,
        isGameOver,
        isGameWon,
        winMessage,
        loseMessage,
        setGameState,
        setNumberOfRows,
        setNumberOfCols,
        setNumberOfMines,
        setIsGameOver,
        setIsGameWon,
        initializeBoard,
        handleLeftClick,
        handleRightClick,
        resetGame,
        getFaceEmoji,
        shouldShake,
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
