const state = {
  board: Solver.emptyBoardGrid(),
  tilesToPlace: 2,
  waitingForSpawn: false,
  editMode: false,
  selectedValue: 2,
};

const currentGrid = document.getElementById("current-grid");
const previewGrid = document.getElementById("preview-grid");
const previewPanel = document.getElementById("preview-panel");
const statusEl = document.getElementById("status");
const solveBtn = document.getElementById("solve-btn");
const resetBtn = document.getElementById("reset-btn");
const editBtn = document.getElementById("edit-btn");
const recommendationEl = document.getElementById("recommendation");
const tilePicker = document.getElementById("tile-picker");

function tileClass(value) {
  if (!value) return "empty";
  return `v${value}`;
}

function getPhase() {
  if (state.tilesToPlace === 2) return "init";
  if (state.tilesToPlace === 1) return state.waitingForSpawn ? "spawn" : "init";
  return "solve";
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

function syncTilesToPlace() {
  if (state.waitingForSpawn) {
    state.tilesToPlace = countTiles() === 16 ? 0 : 1;
    return;
  }
  const placed = countTiles();
  state.tilesToPlace = Math.max(0, 2 - placed);
}

function renderGrid(container, board, interactive) {
  container.innerHTML = "";
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const value = board[row][col];
      const cell = document.createElement("div");
      cell.className = `cell ${tileClass(value)}`;
      cell.textContent = value || "";
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);

      const canPlace = interactive && !state.editMode && state.tilesToPlace > 0 && value === 0;
      const canEdit = interactive && state.editMode;

      if (canPlace || canEdit) {
        cell.classList.add("editable");
        cell.addEventListener("click", () => handleCellClick(row, col));
      } else {
        cell.classList.add("disabled");
      }

      container.appendChild(cell);
    }
  }
}

function refreshBoardState() {
  syncTilesToPlace();
  const built = Solver.buildState(state.board, state.tilesToPlace);
  state.maxTile = built.max_tile;
  state.validMoveCount = built.valid_move_count;
  state.gameOver = built.game_over;
  updateUI();
}

function updateUI() {
  currentGrid.classList.toggle("edit-mode", state.editMode);
  editBtn.classList.toggle("active", state.editMode);
  updateEraseButton();

  if (!state.editMode && state.selectedValue === 0) {
    state.selectedValue = 2;
    syncValueButtons();
  }

  renderGrid(currentGrid, state.board, true);
  solveBtn.disabled = !(getPhase() === "solve" && state.tilesToPlace === 0 && !state.gameOver);

  const phase = getPhase();
  if (state.editMode) {
    statusEl.textContent = "수정 모드 — 칸을 클릭해 타일 값을 바꾸거나 지우세요.";
  } else if (phase === "init") {
    statusEl.textContent = `초기 타일 ${state.tilesToPlace}개를 빈 칸에 놓으세요.`;
  } else if (phase === "spawn") {
    statusEl.textContent = "이동 후 생성된 타일 1개를 빈 칸에 놓으세요.";
  } else if (state.gameOver) {
    statusEl.textContent = "게임 오버 — 더 이상 이동할 수 없습니다.";
  } else {
    statusEl.textContent = `준비 완료 (최대 타일: ${state.maxTile}, 가능한 이동 ${state.validMoveCount}개)`;
  }
}

function handleCellClick(row, col) {
  const current = state.board[row][col];

  if (state.editMode) {
    editCell(row, col);
    return;
  }

  if (current === 0 && state.tilesToPlace > 0) {
    placeTile(row, col);
  }
}

function editCell(row, col) {
  const board = state.board.map((r) => r.slice());
  const current = board[row][col];

  if (state.selectedValue === 0) {
    if (current === 0) return;
    board[row][col] = 0;
  } else {
    board[row][col] = state.selectedValue;
  }

  previewPanel.hidden = true;
  recommendationEl.textContent = "";
  Solver.clearCache();
  state.board = board;
  refreshBoardState();
}

function placeTile(row, col) {
  if (state.tilesToPlace <= 0 || state.board[row][col] !== 0) return;
  if (state.selectedValue === 0) return;

  const board = state.board.map((r) => r.slice());
  board[row][col] = state.selectedValue;
  previewPanel.hidden = true;
  recommendationEl.textContent = "";
  Solver.clearCache();
  state.board = board;
  refreshBoardState();
}

async function solve() {
  if (state.tilesToPlace > 0) {
    statusEl.textContent = "타일 배치를 먼저 완료하세요.";
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

    recommendationEl.textContent =
      `추천: ${result.directionKo} (${result.direction}) · 기대 점수 ${result.score} · ${elapsed}ms`;
    renderGrid(previewGrid, result.nextBoard, false);
    previewPanel.hidden = false;

    Solver.clearCache();
    state.waitingForSpawn = true;
    state.board = result.nextBoard;
    state.tilesToPlace = 1;
    refreshBoardState();
  } catch (error) {
    statusEl.textContent = error.message;
    solveBtn.disabled = false;
  }
}

function reset() {
  previewPanel.hidden = true;
  recommendationEl.textContent = "";
  state.waitingForSpawn = false;
  state.editMode = false;
  state.board = Solver.emptyBoardGrid();
  state.tilesToPlace = 2;
  Solver.clearCache();
  refreshBoardState();
}

function toggleEditMode() {
  state.editMode = !state.editMode;
  if (!state.editMode && state.selectedValue === 0) {
    state.selectedValue = 2;
  }
  updateUI();
}

function syncValueButtons() {
  tilePicker.querySelectorAll(".value-btn").forEach((btn) => {
    const value = Number(btn.dataset.value);
    btn.classList.toggle("active", value === state.selectedValue);
  });
}

function updateEraseButton() {
  const eraseBtn = tilePicker.querySelector(".erase-btn");
  if (!eraseBtn) return;
  eraseBtn.disabled = !state.editMode;
  eraseBtn.classList.toggle("disabled", !state.editMode);
}

tilePicker.addEventListener("click", (event) => {
  const button = event.target.closest(".value-btn");
  if (!button || button.disabled) return;
  const value = Number(button.dataset.value);
  if (value === 0 && !state.editMode) return;
  state.selectedValue = value;
  syncValueButtons();
});

editBtn.addEventListener("click", toggleEditMode);
solveBtn.addEventListener("click", solve);
resetBtn.addEventListener("click", reset);

reset();
