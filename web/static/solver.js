/** 2048 board + expectimax solver (browser) */

const Solver = (() => {
  const BOARD_SIZE = 4;
  const SPAWN_TWO_PROB = 0.9;
  const SPAWN_FOUR_PROB = 0.1;

  const DIRECTION = {
    UP: "UP",
    DOWN: "DOWN",
    LEFT: "LEFT",
    RIGHT: "RIGHT",
  };

  const DIRECTION_KO = {
    UP: "위",
    DOWN: "아래",
    LEFT: "왼쪽",
    RIGHT: "오른쪽",
  };

  const POSITION_WEIGHTS = [
    65536, 32768, 16384, 8192,
    512, 256, 128, 64,
    8, 4, 2, 1,
    1, 2, 4, 8,
  ];

  const cache = new Map();
  const MAX_CACHE = 300_000;

  function valueToExp(value) {
    if (value <= 0) return 0;
    if (value & (value - 1)) {
      throw new Error(`타일 값은 2의 거듭제곱이어야 합니다: ${value}`);
    }
    let exp = 0;
    while (value > 1) {
      value >>= 1;
      exp += 1;
    }
    return exp;
  }

  function expToValue(exp) {
    return exp <= 0 ? 0 : 1 << exp;
  }

  function gridToBoard(grid) {
    const board = new Array(16);
    let i = 0;
    for (let r = 0; r < BOARD_SIZE; r += 1) {
      for (let c = 0; c < BOARD_SIZE; c += 1) {
        board[i] = valueToExp(grid[r][c]);
        i += 1;
      }
    }
    return board;
  }

  function boardToGrid(board) {
    const grid = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
    for (let r = 0; r < BOARD_SIZE; r += 1) {
      for (let c = 0; c < BOARD_SIZE; c += 1) {
        grid[r][c] = expToValue(board[r * BOARD_SIZE + c]);
      }
    }
    return grid;
  }

  function boardKey(board, depth, isChance) {
    return `${board.join(",")}|${depth}|${isChance ? 1 : 0}`;
  }

  function boardsEqual(a, b) {
    for (let i = 0; i < 16; i += 1) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  function countEmpty(board) {
    let n = 0;
    for (let i = 0; i < 16; i += 1) {
      if (board[i] === 0) n += 1;
    }
    return n;
  }

  function maxTileExp(board) {
    return Math.max(...board);
  }

  function slideLeft(row) {
    const tiles = row.filter((cell) => cell !== 0);
    const merged = [];
    let skip = false;
    for (let i = 0; i < tiles.length; i += 1) {
      if (skip) {
        skip = false;
        continue;
      }
      if (i + 1 < tiles.length && tiles[i + 1] === tiles[i]) {
        merged.push(tiles[i] + 1);
        skip = true;
      } else {
        merged.push(tiles[i]);
      }
    }
    while (merged.length < BOARD_SIZE) merged.push(0);
    return merged;
  }

  function transpose(grid) {
    return Array.from({ length: BOARD_SIZE }, (_, c) =>
      Array.from({ length: BOARD_SIZE }, (_, r) => grid[r][c])
    );
  }

  function gridExponentsToBoard(grid) {
    const board = new Array(16);
    let i = 0;
    for (let r = 0; r < BOARD_SIZE; r += 1) {
      for (let c = 0; c < BOARD_SIZE; c += 1) {
        board[i] = grid[r][c];
        i += 1;
      }
    }
    return board;
  }

  function boardToExponentGrid(board) {
    const grid = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
    for (let r = 0; r < BOARD_SIZE; r += 1) {
      for (let c = 0; c < BOARD_SIZE; c += 1) {
        grid[r][c] = board[r * BOARD_SIZE + c];
      }
    }
    return grid;
  }

  function move(board, direction) {
    const grid = boardToExponentGrid(board);
    let moved;

    if (direction === DIRECTION.LEFT) {
      moved = grid.map((row) => slideLeft(row));
    } else if (direction === DIRECTION.RIGHT) {
      moved = grid.map((row) => slideLeft([...row].reverse()).reverse());
    } else if (direction === DIRECTION.UP) {
      const t = transpose(grid);
      moved = transpose(t.map((row) => slideLeft(row)));
    } else if (direction === DIRECTION.DOWN) {
      const t = transpose(grid);
      moved = transpose(t.map((row) => slideLeft([...row].reverse()).reverse()));
    } else {
      throw new Error(`알 수 없는 방향: ${direction}`);
    }

    const result = gridExponentsToBoard(moved);
    return boardsEqual(result, board) ? null : result;
  }

  function validMoves(board) {
    return Object.values(DIRECTION).filter((d) => move(board, d) !== null);
  }

  function placeTile(board, row, col, value) {
    const idx = row * BOARD_SIZE + col;
    if (board[idx] !== 0) {
      throw new Error(`(${row}, ${col}) 칸은 이미 사용 중입니다.`);
    }
    const next = board.slice();
    next[idx] = valueToExp(value);
    return next;
  }

  function monotonicity(board) {
    const totals = [0, 0, 0, 0];

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE - 1; col += 1) {
        const a = board[row * BOARD_SIZE + col] || 0;
        const b = board[row * BOARD_SIZE + col + 1] || 0;
        if (a > b) totals[0] += b - a;
        else if (b > a) totals[1] += a - b;
      }
    }

    for (let col = 0; col < BOARD_SIZE; col += 1) {
      for (let row = 0; row < BOARD_SIZE - 1; row += 1) {
        const a = board[row * BOARD_SIZE + col] || 0;
        const b = board[(row + 1) * BOARD_SIZE + col] || 0;
        if (a > b) totals[2] += b - a;
        else if (b > a) totals[3] += a - b;
      }
    }

    return Math.max(totals[0], totals[1]) + Math.max(totals[2], totals[3]);
  }

  function smoothness(board) {
    let score = 0;
    for (let idx = 0; idx < 16; idx += 1) {
      const exp = board[idx];
      if (!exp) continue;
      const row = Math.floor(idx / BOARD_SIZE);
      const col = idx % BOARD_SIZE;
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= BOARD_SIZE || nc >= BOARD_SIZE) continue;
        const neighbor = board[nr * BOARD_SIZE + nc];
        if (neighbor) score -= Math.abs(exp - neighbor);
      }
    }
    return score;
  }

  function evaluate(board) {
    if (countEmpty(board) === 0) return -1e9;
    let weighted = 0;
    for (let i = 0; i < 16; i += 1) {
      weighted += board[i] * POSITION_WEIGHTS[i];
    }
    return (
      countEmpty(board) * 2.7 +
      monotonicity(board) * 1.0 +
      smoothness(board) * 0.1 +
      weighted * 1.0
    );
  }

  function searchDepth(board) {
    const empty = countEmpty(board);
    if (empty >= 11) return 4;
    if (empty >= 8) return 3;
    if (empty >= 5) return 3;
    return 2;
  }

  function expectimax(board, depth, isChance) {
    const key = boardKey(board, depth, isChance);
    if (cache.has(key)) return cache.get(key);

    let result;
    if (depth === 0 || countEmpty(board) === 0) {
      result = evaluate(board);
    } else if (isChance) {
      const empties = [];
      for (let i = 0; i < 16; i += 1) {
        if (board[i] === 0) empties.push(i);
      }
      if (empties.length === 0) {
        result = evaluate(board);
      } else {
        let total = 0;
        const cells = board.slice();
        for (const idx of empties) {
          cells[idx] = 1;
          total += SPAWN_TWO_PROB * expectimax(cells, depth - 1, false);
          cells[idx] = 2;
          total += SPAWN_FOUR_PROB * expectimax(cells, depth - 1, false);
          cells[idx] = 0;
        }
        result = total / empties.length;
      }
    } else {
      const moves = validMoves(board);
      if (moves.length === 0) {
        result = evaluate(board);
      } else {
        result = -Infinity;
        for (const direction of moves) {
          const nextBoard = move(board, direction);
          if (!nextBoard) continue;
          const score = expectimax(nextBoard, depth, true);
          if (score > result) result = score;
        }
      }
    }

    if (cache.size >= MAX_CACHE) cache.clear();
    cache.set(key, result);
    return result;
  }

  function recommendMove(board) {
    const moves = validMoves(board);
    if (moves.length === 0) {
      throw new Error("가능한 이동이 없습니다.");
    }

    const depth = searchDepth(board);
    let bestDirection = moves[0];
    let bestScore = -Infinity;
    let bestBoard = move(board, bestDirection);

    for (const direction of moves) {
      const nextBoard = move(board, direction);
      if (!nextBoard) continue;
      const score = expectimax(nextBoard, depth, true);
      if (score > bestScore) {
        bestScore = score;
        bestDirection = direction;
        bestBoard = nextBoard;
      }
    }

    return {
      direction: bestDirection,
      directionKo: DIRECTION_KO[bestDirection],
      score: Math.round(bestScore * 10) / 10,
      nextBoard: boardToGrid(bestBoard),
    };
  }

  function buildState(boardGrid, tilesToPlace) {
    const board = gridToBoard(boardGrid);
    const phase = tilesToPlace === 2 ? "init" : tilesToPlace === 1 ? "spawn" : "solve";
    const validMoveCount = validMoves(board).length;

    return {
      board: boardToGrid(board),
      tiles_to_place: tilesToPlace,
      phase,
      max_tile: expToValue(maxTileExp(board)),
      valid_move_count: validMoveCount,
      can_solve: tilesToPlace === 0 && validMoveCount > 0,
      game_over: tilesToPlace === 0 && validMoveCount === 0,
    };
  }

  function clearCache() {
    cache.clear();
  }

  return {
    gridToBoard,
    boardToGrid,
    placeTile,
    recommendMove,
    buildState,
    clearCache,
    emptyBoardGrid: () => Array.from({ length: 4 }, () => Array(4).fill(0)),
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = Solver;
}
