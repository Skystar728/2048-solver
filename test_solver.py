"""Basic tests for board logic and solver."""

from board import Direction, GameState, board_from_grid, format_board, move, place_tile, valid_moves
from solver import recommend_move


def test_slide_and_merge():
    board = board_from_grid([
        [2, 2, 0, 0],
        [4, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ])
    left = move(board, Direction.LEFT)
    assert left is not None
    grid = [
        [4, 0, 0, 0],
        [4, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ]
    assert list(left) == list(board_from_grid(grid))


def test_recommend_move_on_simple_board():
    board = board_from_grid([
        [2, 0, 0, 2],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ])
    direction, _, next_board = recommend_move(board)
    assert direction in valid_moves(board)
    assert next_board is not None


def test_game_flow():
    state = GameState(board=tuple([0] * 16), tiles_to_place=2)
    state = state.place(0, 0, 2)
    state = state.place(3, 3, 2)
    assert state.is_ready()
    direction, _, next_board = recommend_move(state.board)
    state = GameState(board=next_board, tiles_to_place=1)
    state = state.place(0, 1, 2)
    assert state.is_ready()


if __name__ == "__main__":
    test_slide_and_merge()
    test_recommend_move_on_simple_board()
    test_game_flow()
    print("모든 테스트 통과")
