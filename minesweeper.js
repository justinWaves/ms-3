// minesweeper.js

class Minesweeper {
    constructor(rows, cols, numberOfMines) {
      this.rows = rows;
      this.cols = cols;
      this.numberOfMines = numberOfMines;
      this.isGameOver = false;
      this.isGameWon = false;
      this.gameState = this.initializeBoard();
    }
  
    createCell(row, col) {
      return {
        row,
        col,
        value: 0,
        isFlagged: false,
        isMine: false,
        isRevealed: false,
      };
    }
  
    initializeBoard() {
      const matrix = [];
  
      for (let row = 0; row < this.rows; row++) {
        const newRow = [];
        for (let col = 0; col < this.cols; col++) {
          newRow.push(this.createCell(row, col));
        }
        matrix.push(newRow);
      }
  
      this.placeMines(matrix);
      this.incrementValues(matrix);
      return matrix;
    }
  
    placeMines(matrix) {
      let minesToPlace = this.numberOfMines;
  
      while (minesToPlace > 0) {
        const row = Math.floor(Math.random() * this.rows);
        const col = Math.floor(Math.random() * this.cols);
  
        if (!matrix[row][col].isMine) {
          matrix[row][col].isMine = true;
          minesToPlace--;
        }
      }
    }
  
    returnNeighborsCells(row, col, matrix) {
      const neighbors = [];
      const height = matrix.length;
      const width = matrix[0].length;
  
      if (row - 1 >= 0) neighbors.push([row - 1, col]); // UP
      if (row + 1 < height) neighbors.push([row + 1, col]); // Down
      if (col - 1 >= 0) neighbors.push([row, col - 1]); // Left
      if (col + 1 < width) neighbors.push([row, col + 1]); // Right
      if (row - 1 >= 0 && col - 1 >= 0) neighbors.push([row - 1, col - 1]); // Up left
      if (row - 1 >= 0 && col + 1 < width) neighbors.push([row - 1, col + 1]); // Up right
      if (row + 1 < height && col - 1 >= 0) neighbors.push([row + 1, col - 1]); // Down left
      if (row + 1 < height && col + 1 < width) neighbors.push([row + 1, col + 1]); // Down right
  
      return neighbors;
    }
  
    incrementValues(matrix) {
      for (let row = 0; row < matrix.length; row++) {
        for (let col = 0; col < matrix[row].length; col++) {
          if (matrix[row][col].isMine) {
            const neighbors = this.returnNeighborsCells(row, col, matrix);
  
            for (const neighbor of neighbors) {
              const [neighborRow, neighborCol] = neighbor;
              matrix[neighborRow][neighborCol].value += 1;
            }
          }
        }
      }
    }
  
    expandZeroValueCells(row, col) {
      const stack = [[row, col]];
  
      while (stack.length > 0) {
        const [currentRow, currentCol] = stack.pop() || [];
        const neighbors = this.returnNeighborsCells(currentRow, currentCol, this.gameState);
  
        for (let neighbor of neighbors) {
          const [neighborRow, neighborCol] = neighbor;
          if (this.gameState[neighborRow][neighborCol].isRevealed) continue;
          if (!this.gameState[neighborRow][neighborCol].isMine) {
            this.gameState[neighborRow][neighborCol].isRevealed = true;
          }
          if (this.gameState[neighborRow][neighborCol].value === 0) {
            stack.push(neighbor);
          }
        }
      }
    }
  
    handleLeftClick(row, col) {
      if (this.isGameOver || this.isGameWon) return;
  
      if (this.gameState[row][col].isMine) {
        this.isGameOver = true;
        this.expandAllCells();
      }
  
      if (this.gameState[row][col].value > 0) {
        this.gameState[row][col].isRevealed = true;
      }
  
      if (this.gameState[row][col].value === 0) {
        this.expandZeroValueCells(row, col);
      }
  
      this.checkForWin();
    }
  
    handleRightClick(row, col) {
      if (this.isGameOver || this.isGameWon) return;
  
      this.gameState[row][col].isFlagged = !this.gameState[row][col].isFlagged;
  
      this.checkForWin();
    }
  
    expandAllCells() {
      const flattenedBoard = this.gameState.flat();
      flattenedBoard.forEach((cell) => {
        if (!cell.isRevealed) {
          cell.isRevealed = true;
        }
      });
    }
  
    checkForWin() {
      let nonMineCells = 0;
      let revealedNonMineCells = 0;
  
      this.gameState.forEach((row) => {
        row.forEach((cell) => {
          if (!cell.isMine) {
            nonMineCells++;
            if (cell.isRevealed) {
              revealedNonMineCells++;
            }
          }
        });
      });
  
      if (nonMineCells === revealedNonMineCells) {
        this.isGameWon = true;
      }
    }
  
    getBoard() {
      // Return a copy of the game state to avoid direct manipulation
      return this.gameState.map((row) => row.map((cell) => ({ ...cell })));
    }
  }
  
  module.exports = Minesweeper;
  