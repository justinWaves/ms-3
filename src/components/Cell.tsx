import React from 'react'
import { ICell } from '../types'
import { useGameContext } from '../providers/GameProvider'

interface CellProps extends ICell {
  onFirstClick?: () => void;
}

function Cell({row, col, value, isFlagged, isMine, isRevealed, onFirstClick}: CellProps) {
const {handleLeftClick, handleRightClick} = useGameContext()

const onLeftClick = () => {
    if (!isRevealed && !isFlagged) {
      onFirstClick?.();
    }
    handleLeftClick(row, col)
}

const onRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    handleRightClick(row, col)
}

let numberColor = '';

switch (value) {
  case 1:
    numberColor = 'text-blue-600';
    break;
  case 2:
    numberColor = 'text-green-600';
    break;
  case 3:
    numberColor = 'text-red-600';
    break;
  case 4:
    numberColor = 'text-yellow-600';
    break;
  case 5:
    numberColor = 'text-orange-600';
    break;
  case 7:
    numberColor = 'text-purple-600';
    break;
}

  return (
    isRevealed ? 
      <div className={`${numberColor} w-10 h-10 border bg-slate-300 flex items-center justify-center text-lg font-bold`}>
        {isMine ? "💣" : value > 0 ? value : ""}
      </div> 
      : 
      <div 
        className='w-10 h-10 border bg-slate-700 hover:bg-slate-600 cursor-pointer flex items-center justify-center'
        onClick={onLeftClick} 
        onContextMenu={onRightClick}
      >
        {isFlagged && "🚩"}
      </div>
  )
}

export default Cell