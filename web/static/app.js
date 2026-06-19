const state = {
  board: Solver.emptyBoardGrid(),
  tilesToPlace: 2,
  phase: "init",
  selectedValue: 2,
};

const currentGrid = document.getElementById("current-grid");
const previewGrid = document.getElementById("preview-grid");
const previewPanel = document.getElementById("preview-panel");
const statusEl = document.getElementById("status");
const solveBtn = document.getElementById("solve-btn");
const resetBtn = document.getElementById("reset-btn");
const recommendationEl = document.getElementById("recommendation");
const tilePicker = document.getElementById("tile-picker");

function tileClass(value) {
  if (!value) return "empty";
  return `v${value}`;
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

      const canPlace = interactive && state.tilesToPlace > 0 && value === 0;
      if (!canPlace) {
        cell.classList.add("disabled");
      } else {
        cell.addEventListener("click", () => placeTile(row, col));
      }

      container.appendChild(cell);
    }
  }
}

function applyState(data) {
  state.board = data.board;
  state.tilesToPlace = data.tiles_to_place;
  state.phase = data.phase;
  state.maxTile = data.max_tile;
  state.validMoveCount = data.valid_move_count;
  state.gameOver = data.game_over;
  updateUI();
}

function updateUI() {
  renderGrid(currentGrid, state.board, true);
  solveBtn.disabled = !(state.phase === "solve" && state.tilesToPlace === 0);

  if (state.phase === "init") {
    statusEl.textContent = `초기 타일 ${state.tilesToPlace}개를 빈 칸에 놓으세요.`;
  } else if (state.phase === "spawn") {
    statusEl.textContent = "이동 후 생성된 타일 1개를 빈 칸에 놓으세요.";
  } else if (state.gameOver) {
    statusEl.textContent = "게임 오버 — 더 이상 이동할 수 없습니다.";
  } else {
    statusEl.textContent = `준비 완료 (최대 타일: ${state.maxTile}, 가능한 이동 ${state.validMoveCount}개)`;
  }
}

function placeTile(row, col) {
  if (state.tilesToPlace <= 0) return;

  try {
    const board = Solver.gridToBoard(state.board);
    const next = Solver.placeTile(board, row, col, state.selectedValue);
    const tilesToPlace = state.tilesToPlace - 1;
    previewPanel.hidden = true;
    Solver.clearCache();
    applyState(Solver.buildState(Solver.boardToGrid(next), tilesToPlace));
  } catch (error) {
    statusEl.textContent = error.message;
  }
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
    applyState(Solver.buildState(result.nextBoard, 1));
  } catch (error) {
    statusEl.textContent = error.message;
    solveBtn.disabled = false;
  }
}

function reset() {
  previewPanel.hidden = true;
  recommendationEl.textContent = "";
  Solver.clearCache();
  applyState(Solver.buildState(Solver.emptyBoardGrid(), 2));
}

tilePicker.addEventListener("click", (event) => {
  const button = event.target.closest(".value-btn");
  if (!button) return;
  state.selectedValue = Number(button.dataset.value);
  tilePicker.querySelectorAll(".value-btn").forEach((btn) => {
    btn.classList.toggle("active", btn === button);
  });
});

solveBtn.addEventListener("click", solve);
resetBtn.addEventListener("click", reset);

reset();
