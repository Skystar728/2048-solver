#!/usr/bin/env python3
"""2048 solver web server."""

from __future__ import annotations

from flask import Flask, jsonify, render_template, request

from board import (
    GameState,
    board_from_grid,
    board_to_grid,
    empty_positions,
    exp_to_value,
    max_tile_exp,
    valid_moves,
)
from solver import clear_cache, recommend_move

app = Flask(__name__)


def _grid_from_request(data: dict) -> list[list[int]]:
    grid = data.get("board")
    if not grid or len(grid) != 4 or any(len(row) != 4 for row in grid):
        raise ValueError("board는 4x4 배열이어야 합니다.")
    return grid


def _state_payload(state: GameState) -> dict:
    board = board_to_grid(state.board)
    empties = [{"row": r, "col": c} for r, c in empty_positions(state.board)]
    phase = "init" if state.tiles_to_place == 2 else "spawn" if state.tiles_to_place == 1 else "solve"

    return {
        "board": board,
        "tiles_to_place": state.tiles_to_place,
        "phase": phase,
        "empty_cells": empties,
        "max_tile": exp_to_value(max_tile_exp(state.board)),
        "valid_move_count": len(valid_moves(state.board)),
        "can_solve": state.tiles_to_place == 0 and len(valid_moves(state.board)) > 0,
        "game_over": state.tiles_to_place == 0 and len(valid_moves(state.board)) == 0,
    }


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/api/reset")
def api_reset():
    clear_cache()
    state = GameState(board=tuple([0] * 16), tiles_to_place=2)
    return jsonify(_state_payload(state))


@app.post("/api/place")
def api_place():
    data = request.get_json(silent=True) or {}
    try:
        grid = _grid_from_request(data)
        row = int(data["row"])
        col = int(data["col"])
        value = int(data["value"])
        tiles_to_place = int(data.get("tiles_to_place", 0))
    except (KeyError, TypeError, ValueError) as exc:
        return jsonify({"error": str(exc)}), 400

    if tiles_to_place <= 0:
        return jsonify({"error": "지금은 타일을 놓을 단계가 아닙니다."}), 400

    try:
        state = GameState(board=board_from_grid(grid), tiles_to_place=tiles_to_place)
        state = state.place(row, col, value)
        clear_cache()
        return jsonify(_state_payload(state))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@app.post("/api/solve")
def api_solve():
    data = request.get_json(silent=True) or {}
    try:
        grid = _grid_from_request(data)
        tiles_to_place = int(data.get("tiles_to_place", 0))
    except (KeyError, TypeError, ValueError) as exc:
        return jsonify({"error": str(exc)}), 400

    if tiles_to_place > 0:
        return jsonify({"error": "타일 배치를 먼저 완료하세요."}), 400

    board = board_from_grid(grid)
    if not valid_moves(board):
        return jsonify({"error": "게임 오버: 가능한 이동이 없습니다."}), 400

    try:
        direction, score, next_board = recommend_move(board)
        next_state = GameState(board=next_board, tiles_to_place=1)
        payload = _state_payload(next_state)
        payload["recommendation"] = {
            "direction": direction.name,
            "direction_ko": direction.label_ko(),
            "score": round(score, 1),
        }
        clear_cache()
        return jsonify(payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


if __name__ == "__main__":
    import os

    port = int(os.environ.get("PORT", 5001))
    debug = os.environ.get("FLASK_DEBUG", "1") == "1"
    host = "127.0.0.1" if debug else "0.0.0.0"
    print(f"2048 Solver 웹 서버: http://{host}:{port}")
    app.run(host=host, port=port, debug=debug)
