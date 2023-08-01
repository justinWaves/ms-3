const readline = require("readline-sync");
const Minesweeper = require("./minesweeper"); // Adjust the path to your minesweeper.js file

function createMinesweeper() {
  // Get user input for board size and number of mines
  const rows = parseInt(readline.question("Enter the number of rows: "));
  const cols = parseInt(readline.question("Enter the number of columns: "));
  const numberOfMines = parseInt(
    readline.question("Enter the number of mines: ")
  );

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
        return cell.isFlagged ? "F" : "."; // Print 'F' if flagged, '.' if unrevealed
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
    const row = parseInt(readline.question("Enter the row: "));
    const col = parseInt(readline.question("Enter the column: "));
    const isRightClick = readline.keyInYN("Place Flag? ");

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
