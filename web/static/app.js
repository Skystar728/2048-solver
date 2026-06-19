const TILE_VALUES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];

const state = {
  board: Solver.emptyBoardGrid(),
  waitingForSpawn: false,
  spawnEmpties: null,
  selectedValue: 2,
};

const currentGrid = document.getElementById("current-grid");
const statusEl = document.getElementById("status");
const solveBtn = document.getElementById("solve-btn");
const resetBtn = document.getElementById("reset-btn");
const recommendationEl = document.getElementById("recommendation");
const tilePickerButtons = document.getElementById("tile-picker-buttons");

function tileClass(value) {
  if (!value) return "empty";
  return `v${value}`;
}

function countTiles() {
  let count = 0;
  for (const row of state.board) {
    for (const value of row) {
      if (value) count += 1;
    }
  }
  return count;
}

function emptyPositionKeys(board) {
  const keys = new Set();
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      if (!board[row][col]) keys.add(`${row},${col}`);
    }
  }
  return keys;
}

function initTilePicker() {
  tilePickerButtons.innerHTML = "";

  for (const value of TILE_VALUES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `value-btn tile-v${value}${value === state.selectedValue ? " active" : ""}`;
    button.dataset.value = String(value);
    button.textContent = String(value);
    tilePickerButtons.appendChild(button);
  }

  const eraseBtn = document.createElement("button");
  eraseBtn.type = "button";
  eraseBtn.className = "value-btn erase-btn";
  eraseBtn.dataset.value = "0";
  eraseBtn.textContent = "지우기";
  tilePickerButtons.appendChild(eraseBtn);
}

function renderGrid(container, board) {
  container.innerHTML = "";
  const spawnHighlight = state.waitingForSpawn && state.spawnEmpties;

  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const value = board[row][col];
      const cell = document.createElement("div");
      cell.className = `cell editable ${tileClass(value)}`;
      cell.textContent = value || "";

      if (spawnHighlight && state.spawnEmpties.has(`${row},${col}`)) {
        cell.classList.add("spawn-target");
      }

      cell.addEventListener("click", () => applyCell(row, col));
      container.appendChild(cell);
    }
  }
}

function clearRecommendation() {
  recommendationEl.textContent = "";
  recommendationEl.hidden = true;
}

function showRecommendation(text) {
  recommendationEl.textContent = text;
  recommendationEl.hidden = false;
}

function refreshBoardState() {
  const built = Solver.buildState(state.board, state.waitingForSpawn ? 1 : 0);
  state.maxTile = built.max_tile;
  state.validMoveCount = built.valid_move_count;
  state.gameOver = built.game_over;
  updateUI();
}

function canSolve() {
  return (
    !state.waitingForSpawn &&
    countTiles() > 0 &&
    state.validMoveCount > 0 &&
    !state.gameOver
  );
}

function updateUI() {
  currentGrid.classList.toggle("spawn-pending", state.waitingForSpawn);
  renderGrid(currentGrid, state.board);
  solveBtn.disabled = !canSolve();
  syncValueButtons();

  if (state.waitingForSpawn) {
    statusEl.textContent = "이동 후 생성된 타일 1개를 빈 칸(강조)에 놓으세요.";
  } else if (state.gameOver) {
    statusEl.textContent = "게임 오버 — 더 이상 이동할 수 없습니다.";
  } else if (countTiles() === 0) {
    statusEl.textContent = "칸을 클릭해 보드를 설정하세요. 중간 상태에서 시작해도 됩니다.";
  } else {
    statusEl.textContent = `준비 완료 (최대 타일: ${state.maxTile}, 가능한 이동 ${state.validMoveCount}개)`;
  }
}

function applyCell(row, col) {
  const board = state.board.map((r) => r.slice());
  const key = `${row},${col}`;
  const current = board[row][col];

  if (state.selectedValue === 0) {
    if (current === 0) return;
    board[row][col] = 0;
  } else {
    board[row][col] = state.selectedValue;
  }

  if (state.waitingForSpawn && state.spawnEmpties?.has(key) && board[row][col] !== 0) {
    state.waitingForSpawn = false;
    state.spawnEmpties = null;
  }

  clearRecommendation();
  Solver.clearCache();
  state.board = board;
  refreshBoardState();
}

async function solve() {
  if (!canSolve()) {
    if (state.waitingForSpawn) {
      statusEl.textContent = "이동 후 생성된 타일 1개를 먼저 놓으세요.";
    } else if (countTiles() === 0) {
      statusEl.textContent = "보드에 타일을 하나 이상 놓으세요.";
    }
    return;
  }

  solveBtn.disabled = true;
  statusEl.textContent = "계산 중...";
  await new Promise((resolve) => setTimeout(resolve, 0));

  try {
    const started = performance.now();
    const board = Solver.gridToBoard(state.board);
    const result = Solver.recommendMove(board);
    const elapsed = Math.round(performance.now() - started);

    Solver.clearCache();
    state.board = result.nextBoard;
    state.spawnEmpties = emptyPositionKeys(result.nextBoard);
    state.waitingForSpawn = true;
    refreshBoardState();

    showRecommendation(
      `추천: ${result.directionKo} (${result.direction}) · 기대 점수 ${result.score} · ${elapsed}ms`
    );
  } catch (error) {
    statusEl.textContent = error.message;
    solveBtn.disabled = !canSolve();
  }
}

function reset() {
  clearRecommendation();
  state.waitingForSpawn = false;
  state.spawnEmpties = null;
  state.board = Solver.emptyBoardGrid();
  state.selectedValue = 2;
  Solver.clearCache();
  syncValueButtons();
  refreshBoardState();
}

function syncValueButtons() {
  tilePickerButtons.querySelectorAll(".value-btn").forEach((btn) => {
    const value = Number(btn.dataset.value);
    btn.classList.toggle("active", value === state.selectedValue);
  });
}

tilePickerButtons.addEventListener("click", (event) => {
  const button = event.target.closest(".value-btn");
  if (!button) return;
  state.selectedValue = Number(button.dataset.value);
  syncValueButtons();
});

solveBtn.addEventListener("click", solve);
resetBtn.addEventListener("click", reset);

initTilePicker();
reset();
