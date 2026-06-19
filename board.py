"""2048 board logic. Tile values are stored as exponents (2 -> 1, 4 -> 2, ...)."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Iterable

BOARD_SIZE = 4
CELL_COUNT = BOARD_SIZE * BOARD_SIZE


class Direction(Enum):
    UP = "UP"
    DOWN = "DOWN"
    LEFT = "LEFT"
    RIGHT = "RIGHT"

    def label_ko(self) -> str:
        return {
            Direction.UP: "위",
            Direction.DOWN: "아래",
            Direction.LEFT: "왼쪽",
            Direction.RIGHT: "오른쪽",
        }[self]


def value_to_exp(value: int) -> int:
    if value <= 0:
        return 0
    if value & (value - 1):
        raise ValueError(f"타일 값은 2의 거듭제곱이어야 합니다: {value}")
    exp = 0
    while value > 1:
        value >>= 1
        exp += 1
    return exp


def exp_to_value(exp: int) -> int:
    if exp <= 0:
        return 0
    return 1 << exp


def empty_board() -> tuple[int, ...]:
    return (0,) * CELL_COUNT


def board_from_grid(grid: list[list[int]]) -> tuple[int, ...]:
    if len(grid) != BOARD_SIZE or any(len(row) != BOARD_SIZE for row in grid):
        raise ValueError("보드는 4x4여야 합니다.")
    return tuple(value_to_exp(v) for row in grid for v in row)


def board_to_grid(board: tuple[int, ...]) -> list[list[int]]:
    return [
        [exp_to_value(board[r * BOARD_SIZE + c]) for c in range(BOARD_SIZE)]
        for r in range(BOARD_SIZE)
    ]


def format_board(board: tuple[int, ...]) -> str:
    lines: list[str] = []
    border = "+" + ("------+" * BOARD_SIZE)
    for row in range(BOARD_SIZE):
        lines.append(border)
        cells: list[str] = []
        for col in range(BOARD_SIZE):
            exp = board[row * BOARD_SIZE + col]
            cells.append(f"{exp_to_value(exp):>4}" if exp else "    .")
        lines.append("|" + "|".join(cells) + "|")
    lines.append(border)
    return "\n".join(lines)


def count_empty(board: tuple[int, ...]) -> int:
    return sum(1 for cell in board if cell == 0)


def max_tile_exp(board: tuple[int, ...]) -> int:
    return max(board) if board else 0


def _slide_left(row: list[int]) -> list[int]:
    tiles = [cell for cell in row if cell]
    merged: list[int] = []
    skip = False
    for i, cell in enumerate(tiles):
        if skip:
            skip = False
            continue
        if i + 1 < len(tiles) and tiles[i + 1] == cell:
            merged.append(cell + 1)
            skip = True
        else:
            merged.append(cell)
    merged.extend([0] * (BOARD_SIZE - len(merged)))
    return merged


def _transform(board: tuple[int, ...], fn) -> tuple[int, ...]:
    grid = board_to_grid(board)
    transformed = [fn(row) for row in grid]
    return board_from_grid(transformed)


def _transpose(grid: list[list[int]]) -> list[list[int]]:
    return [[grid[r][c] for r in range(BOARD_SIZE)] for c in range(BOARD_SIZE)]


def _reverse_rows(grid: list[list[int]]) -> list[list[int]]:
    return [list(reversed(row)) for row in grid]


def move(board: tuple[int, ...], direction: Direction) -> tuple[int, ...] | None:
    grid = [
        [board[r * BOARD_SIZE + c] for c in range(BOARD_SIZE)]
        for r in range(BOARD_SIZE)
    ]

    if direction == Direction.LEFT:
        moved = [_slide_left(row) for row in grid]
    elif direction == Direction.RIGHT:
        moved = [_slide_left(list(reversed(row))) for row in grid]
        moved = [list(reversed(row)) for row in moved]
    elif direction == Direction.UP:
        transposed = _transpose(grid)
        moved = _transpose([_slide_left(row) for row in transposed])
    elif direction == Direction.DOWN:
        transposed = _transpose(grid)
        slid = [_slide_left(list(reversed(row))) for row in transposed]
        slid = [list(reversed(row)) for row in slid]
        moved = _transpose(slid)
    else:
        raise ValueError(f"알 수 없는 방향: {direction}")

    result = tuple(exp for row in moved for exp in row)
    if result == board:
        return None
    return result


def valid_moves(board: tuple[int, ...]) -> list[Direction]:
    return [d for d in Direction if move(board, d) is not None]


def place_tile(board: tuple[int, ...], row: int, col: int, value: int) -> tuple[int, ...]:
    if not (0 <= row < BOARD_SIZE and 0 <= col < BOARD_SIZE):
        raise ValueError("행/열은 0~3 범위여야 합니다.")
    idx = row * BOARD_SIZE + col
    if board[idx] != 0:
        raise ValueError(f"({row}, {col}) 칸은 이미 사용 중입니다.")
    exp = value_to_exp(value)
    cells = list(board)
    cells[idx] = exp
    return tuple(cells)


def empty_positions(board: tuple[int, ...]) -> list[tuple[int, int]]:
    return [
        (r, c)
        for r in range(BOARD_SIZE)
        for c in range(BOARD_SIZE)
        if board[r * BOARD_SIZE + c] == 0
    ]


@dataclass(frozen=True)
class GameState:
    board: tuple[int, ...]
    tiles_to_place: int = 2

    def is_ready(self) -> bool:
        return self.tiles_to_place == 0

    def place(self, row: int, col: int, value: int) -> GameState:
        if self.tiles_to_place <= 0:
            raise ValueError("지금은 타일을 추가할 단계가 아닙니다.")
        board = place_tile(self.board, row, col, value)
        return GameState(board=board, tiles_to_place=self.tiles_to_place - 1)

    def after_move(self) -> GameState:
        if self.tiles_to_place != 0:
            raise ValueError("초기 타일 배치를 먼저 완료하세요.")
        if count_empty(self.board) == 0:
            raise ValueError("빈 칸이 없어 새 타일을 놓을 수 없습니다.")
        return GameState(board=self.board, tiles_to_place=1)

    def apply_move(self, direction: Direction) -> GameState:
        moved = move(self.board, direction)
        if moved is None:
            raise ValueError(f"{direction.label_ko()} 이동은 불가능합니다.")
        return GameState(board=moved, tiles_to_place=1)
