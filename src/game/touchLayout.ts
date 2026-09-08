export function isTouchBoardLayout(width: number, coarsePointer: boolean): boolean {
  return width <= 760 || (coarsePointer && width <= 900)
}
