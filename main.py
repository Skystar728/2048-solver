#!/usr/bin/env python3
"""Interactive 2048 solver CLI."""

from __future__ import annotations

import sys

from board import (
    Direction,
    GameState,
    board_to_grid,
    empty_positions,
    exp_to_value,
    format_board,
    max_tile_exp,
    valid_moves,
)
from solver import clear_cache, recommend_move


def _print_help() -> None:
    print(
        """
명령어:
  <행> <열> <값>   타일 배치 (예: 0 0 2)
  <값>             빈 칸이 1개일 때 값만 입력 (예: 2)
  solve / s        다음 추천 이동 계산
  board / b        현재 보드 출력
  undo             마지막 이동 취소 (타일 배치 전 단계로)
  quit / q         종료

흐름:
  1) 처음 2개 타일 입력
  2) solve 로 추천 이동 확인
  3) 이동 후 생성된 타일 1개 입력
  4) 2~3 반복
""".strip()
    )


def _parse_tile_input(raw: str, state: GameState) -> tuple[int, int, int]:
    parts = raw.split()
    if len(parts) == 1:
        value = int(parts[0])
        empties = empty_positions(state.board)
        if len(empties) == 1:
            row, col = empties[0]
            return row, col, value
        raise ValueError(
            f"빈 칸이 {len(empties)}개입니다. 위치를 함께 입력하세요: <행> <열> <값>"
        )
    if len(parts) != 3:
        raise ValueError("형식: <행> <열> <값>  또는 빈 칸이 하나일 때 <값>만")
    row, col, value = (int(p) for p in parts)
    return row, col, value


def _status_line(state: GameState) -> str:
    if state.tiles_to_place == 2:
        return "초기 설정: 타일 2개를 입력하세요."
    if state.tiles_to_place == 1:
        empties = empty_positions(state.board)
        hint = ", ".join(f"({r},{c})" for r, c in empties)
        return f"이동 후 생성된 타일 1개를 입력하세요. 빈 칸: {hint}"
    max_tile = exp_to_value(max_tile_exp(state.board))
    move_count = len(valid_moves(state.board))
    return f"준비 완료 — solve 입력 시 다음 이동을 계산합니다. (최대 타일: {max_tile}, 가능 이동: {move_count}개)"


def run() -> None:
    state = GameState(board=tuple([0] * 16), tiles_to_place=2)
    history: list[GameState] = []
    pending_after_move: tuple[int, ...] | None = None

    print("=== 2048 Solver (Expectimax) ===")
    _print_help()
    print()

    while True:
        print(_status_line(state))
        print(format_board(state.board))
        print()

        try:
            raw = input("> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n종료합니다.")
            break

        if not raw:
            continue

        cmd = raw.lower()
        if cmd in {"q", "quit", "exit"}:
            print("종료합니다.")
            break
        if cmd in {"h", "help", "?"}:
            _print_help()
            continue
        if cmd in {"b", "board"}:
            continue
        if cmd == "undo":
            if not history:
                print("되돌릴 단계가 없습니다.")
                continue
            state = history.pop()
            pending_after_move = None
            clear_cache()
            print("이전 단계로 되돌렸습니다.")
            continue

        if cmd in {"solve", "s"}:
            if state.tiles_to_place > 0:
                print("타일 배치를 먼저 완료하세요.")
                continue
            if not valid_moves(state.board):
                print("게임 오버: 가능한 이동이 없습니다.")
                continue

            history.append(state)
            direction, score, next_board = recommend_move(state.board)
            pending_after_move = next_board

            print()
            print(f"추천 이동: {direction.name} ({direction.label_ko()})")
            print(f"기대 점수: {score:.1f}")
            print("이동 후 보드:")
            print(format_board(next_board))
            print()
            print("실제 게임에서 위 이동을 적용한 뒤, 생성된 타일을 입력하세요.")
            state = GameState(board=next_board, tiles_to_place=1)
            clear_cache()
            continue

        try:
            row, col, value = _parse_tile_input(raw, state)
            prev = state
            state = state.place(row, col, value)
            if pending_after_move is not None and state.board != pending_after_move:
                placed_idx = row * 4 + col
                expected = pending_after_move[placed_idx]
                if expected == 0:
                    print("경고: 추천 이동 후 보드와 다른 위치에 타일을 놓았습니다.")
            pending_after_move = None
            if state.tiles_to_place == 0 and prev.tiles_to_place == 1:
                history.append(prev)
            clear_cache()
        except ValueError as exc:
            print(f"오류: {exc}")


if __name__ == "__main__":
    run()
