import React from 'react'
import { ICell } from '../types'
import { useGameContext } from '../providers/GameProvider'

interface CellProps extends ICell {
  onFirstClick: () => void;
}

const Cell: React.FC<CellProps> = ({
  row,
  col,
  value,
  isRevealed,
  isMine,
  isFlagged,
  onFirstClick,
}) => {
  const { handleLeftClick, handleRightClick } = useGameContext();

  const handleCellClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isRevealed && !isFlagged) {
      handleLeftClick(row, col);
      onFirstClick();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isRevealed) {
      handleRightClick(row, col);
    }
  };

  const getCellColor = () => {
    if (!isRevealed) return "bg-slate-700";
    if (isMine) return "bg-red-500";
    if (value === 0) return "bg-slate-600";
    return "bg-slate-600";
  };

  const getTextColor = () => {
    if (!isRevealed && !isFlagged) return "text-transparent";
    if (isMine) return "text-white";
    if (value === 0) return "text-transparent";
    
    // Add color based on number value
    switch (value) {
      case 1: return "text-blue-400";
      case 2: return "text-green-400";
      case 3: return "text-red-400";
      case 4: return "text-purple-400";
      case 5: return "text-yellow-400";
      case 6: return "text-cyan-400";
      case 7: return "text-orange-400";
      case 8: return "text-pink-400";
      default: return "text-white";
    }
  };

  return (
    <div
      className={`
        w-8 h-8 sm:w-10 sm:h-10
        flex items-center justify-center
        border border-slate-500
        ${getCellColor()}
        ${getTextColor()}
        font-bold text-lg sm:text-xl
        cursor-pointer
        select-none
        transition-colors duration-200
        hover:bg-slate-600
        active:bg-slate-500
        water-ripple
      `}
      onClick={handleCellClick}
      onContextMenu={handleContextMenu}
    >
      {isRevealed && isMine && (
        <div className="flex items-center justify-center h-full w-full text-2xl">
          🦈
        </div>
      )}
      {isRevealed && !isMine && (
        <div className="flex items-center justify-center h-full w-full text-2xl">
          {value > 0 ? value : ''}
        </div>
      )}
      {!isRevealed && isFlagged && (
        <div className="flex items-center justify-center h-full w-full text-2xl text-white">
          🌊
        </div>
      )}
    </div>
  );
};

export default Cell