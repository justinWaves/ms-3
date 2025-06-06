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

  const handleClick = () => {
    if (!isRevealed && !isFlagged) {
      onFirstClick();
      handleLeftClick(row, col);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isRevealed) {
      handleRightClick(row, col);
    }
  };

  const getCellContent = () => {
    if (isFlagged) return "🚩";
    if (!isRevealed) return "";
    if (isMine) return "💣";
    if (value === 0) return "";
    return value.toString();
  };

  const getCellColor = () => {
    if (!isRevealed) return "bg-slate-700";
    if (isMine) return "bg-red-500";
    if (value === 0) return "bg-slate-600";
    return "bg-slate-600";
  };

  const getTextColor = () => {
    if (!isRevealed) return "text-white";
    if (isMine) return "text-white";
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
      `}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {getCellContent()}
    </div>
  );
};

export default Cell