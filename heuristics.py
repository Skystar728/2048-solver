"""Heuristic evaluation for expectimax (Robert Xiao / nneonneo style)."""

from __future__ import annotations

from board import BOARD_SIZE, count_empty
# Corner snake pattern — keep large tiles in top-left corner.
POSITION_WEIGHTS = (
    65536, 32768, 16384, 8192,
    512, 256, 128, 64,
    8, 4, 2, 1,
    1, 2, 4, 8,
)


def monotonicity(board: tuple[int, ...]) -> float:
    totals = [0.0, 0.0, 0.0, 0.0]

    for row in range(BOARD_SIZE):
        for col in range(BOARD_SIZE - 1):
            a = board[row * BOARD_SIZE + col] or 0
            b = board[row * BOARD_SIZE + col + 1] or 0
            if a > b:
                totals[0] += b - a
            elif b > a:
                totals[1] += a - b

    for col in range(BOARD_SIZE):
        for row in range(BOARD_SIZE - 1):
            a = board[row * BOARD_SIZE + col] or 0
            b = board[(row + 1) * BOARD_SIZE + col] or 0
            if a > b:
                totals[2] += b - a
            elif b > a:
                totals[3] += a - b

    return max(totals[0], totals[1]) + max(totals[2], totals[3])


def smoothness(board: tuple[int, ...]) -> float:
  score = 0.0
  for idx, exp in enumerate(board):
    if exp == 0:
      continue
    row, col = divmod(idx, BOARD_SIZE)
    for dr, dc in ((0, 1), (1, 0)):
      nr, nc = row + dr, col + dc
      if nr >= BOARD_SIZE or nc >= BOARD_SIZE:
        continue
      neighbor = board[nr * BOARD_SIZE + nc]
      if neighbor:
        score -= abs(exp - neighbor)
  return score


def weighted_position(board: tuple[int, ...]) -> float:
  return sum(exp * POSITION_WEIGHTS[i] for i, exp in enumerate(board))


def evaluate(board: tuple[int, ...]) -> float:
  if count_empty(board) == 0:
    return -1e9
  return (
      count_empty(board) * 2.7
      + monotonicity(board) * 1.0
      + smoothness(board) * 0.1
      + weighted_position(board) * 1.0
  )
