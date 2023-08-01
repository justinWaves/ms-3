export interface IGameProvider {
    children: React.ReactNode
}

export interface ICell {
    row: number
    col: number
    value: number
    isRevealed: boolean
    isFlagged: boolean
    isMine: boolean
}