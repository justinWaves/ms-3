import React from 'react';
import GameProvider from './providers/GameProvider';
import GameBoard from './components/GameBoard';

function App() {
  return (
    <GameProvider>
      <div className="h-screen flex justify-center flex-col">
        <GameBoard />
      </div>
    </GameProvider>
  );
}

export default App;
