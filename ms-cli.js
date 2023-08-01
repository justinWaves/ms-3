const readline = require("readline-sync");
const Minesweeper = require("./minesweeper"); // Adjust the path to your minesweeper.js file

function createMinesweeper() {
  let rows, cols, numberOfMines;

  while (true) {
    rows = parseInt(readline.question("Enter the number of rows (1-50): "));
    if (isNaN(rows) || rows < 1 || rows > 50) {
      console.log("Please enter an integer between 1 and 50.");
      continue;
    }

    cols = parseInt(readline.question("Enter the number of columns (1-50): "));
    if (isNaN(cols) || cols < 1 || cols > 50) {
      console.log("Please enter an integer between 1 and 50.");
      continue;
    }

    numberOfMines = parseInt(readline.question("Enter the number of mines (1-50): "));
    if (isNaN(numberOfMines) || numberOfMines < 1 || numberOfMines > 50) {
      console.log("Please enter an integer between 1 and 50.");
      continue;
    }

    break; // If all inputs are valid, exit the loop
  }

  // Create a new Minesweeper instance
  return new Minesweeper(rows, cols, numberOfMines);
}

function printBoard(board) {
  console.log("Minesweeper Board:");
  console.log(
    "  " + Array.from({ length: board[0].length }, (_, col) => col).join(" ")
  );
  console.log(
    "  " + Array.from({ length: board[0].length }, (_, col) => "-").join("")
  );

  for (let row = 0; row < board.length; row++) {
    const rowData = board[row].map((cell) => {
      if (cell.isRevealed) {
        if (cell.isMine) {
          return "X"; // If it's a revealed mine, print 'X'
        } else {
          return cell.value === 0 ? " " : cell.value; // Print the cell value if it's not a mine
        }
      } else {
        return cell.isFlagged ? "F" : "*"; // Print 'F' if flagged, '.' if unrevealed
      }
    });

    console.log(`${row} | ${rowData.join(" ")}`);
  }
}

const main = () => {
    console.log("Welcome to Minesweeper CLI!");
    let minesweeper = createMinesweeper();
  
    while (!minesweeper.isGameOver && !minesweeper.isGameWon) {
      printBoard(minesweeper.gameState); // Use your existing gameState property
      
      let row, col, isRightClick;
  
      // Get user input for row
      while (true) {
        row = parseInt(readline.question("Enter the row: "));
        if (isNaN(row) || row < 0 || row >= minesweeper.rows) {
          console.log(`Please enter an integer between 0 and ${minesweeper.rows - 1}.`);
          continue;
        }
        break; // If input is valid, exit the loop
      }
  
      // Get user input for column
      while (true) {
        col = parseInt(readline.question("Enter the column: "));
        if (isNaN(col) || col < 0 || col >= minesweeper.cols) {
          console.log(`Please enter an integer between 0 and ${minesweeper.cols - 1}.`);
          continue;
        }
        break; // If input is valid, exit the loop
      }
  
      // Get user input for right-click (place flag)
      while (true) {
        const response = readline.question("Place Flag? (y/n): ");
        if (response.toLowerCase() === 'y') {
          isRightClick = true;
          break;
        } else if (response.toLowerCase() === 'n') {
          isRightClick = false;
          break;
        } else {
          console.log("Please enter 'y' (yes) or 'n' (no).");
        }
      }
  
      if (isRightClick) {
        minesweeper.handleRightClick(row, col);
      } else {
        minesweeper.handleLeftClick(row, col);
      }
    }
  
    if (minesweeper.isGameWon) {
      console.log("Congratulations! You won!");
    } else {
      console.log("Game over! You hit a mine!");
    }
  };
  
  main();

