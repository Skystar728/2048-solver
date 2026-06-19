"""Expectimax solver with transposition caching."""

from __future__ import annotations

from functools import lru_cache

from board import Direction, count_empty, move, valid_moves
from heuristics import evaluate

SPAWN_TWO_PROB = 0.9
SPAWN_FOUR_PROB = 0.1


def _search_depth(board: tuple[int, ...]) -> int:
    empty = count_empty(board)
    if empty >= 11:
        return 4
    if empty >= 8:
        return 3
    if empty >= 5:
        return 3
    return 2


@lru_cache(maxsize=300_000)
def _expectimax(board: tuple[int, ...], depth: int, is_chance: bool) -> float:
    if depth == 0 or count_empty(board) == 0:
        return evaluate(board)

    if is_chance:
        empties = [i for i, cell in enumerate(board) if cell == 0]
        if not empties:
            return evaluate(board)

        total = 0.0
        cells = list(board)
        for idx in empties:
            cells[idx] = 1
            total += SPAWN_TWO_PROB * _expectimax(tuple(cells), depth - 1, False)
            cells[idx] = 2
            total += SPAWN_FOUR_PROB * _expectimax(tuple(cells), depth - 1, False)
            cells[idx] = 0
        return total / len(empties)

    moves = valid_moves(board)
    if not moves:
        return evaluate(board)

    best = float("-inf")
    for direction in moves:
        next_board = move(board, direction)
        if next_board is None:
            continue
        score = _expectimax(next_board, depth, True)
        if score > best:
            best = score
    return best


def recommend_move(board: tuple[int, ...]) -> tuple[Direction, float, tuple[int, ...]]:
    moves = valid_moves(board)
    if not moves:
        raise ValueError("가능한 이동이 없습니다.")

    depth = _search_depth(board)
    best_direction = moves[0]
    best_score = float("-inf")
    best_board = move(board, best_direction)
    assert best_board is not None

    for direction in moves:
        next_board = move(board, direction)
        if next_board is None:
            continue
        score = _expectimax(next_board, depth, True)
        if score > best_score:
            best_score = score
            best_direction = direction
            best_board = next_board

    assert best_board is not None
    return best_direction, best_score, best_board


def clear_cache() -> None:
    _expectimax.cache_clear()
