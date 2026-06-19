const state = {
  board: Array.from({ length: 4 }, () => Array(4).fill(0)),
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

async function api(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "요청 실패");
  }
  return data;
}

function applyServerState(data) {
  state.board = data.board;
  state.tilesToPlace = data.tiles_to_place;
  state.phase = data.phase;
  state.maxTile = data.max_tile;
  state.validMoveCount = data.valid_move_count;
  state.gameOver = data.game_over;
  updateUI();
  return data;
}

async function placeTile(row, col) {
  if (state.tilesToPlace <= 0) return;

  try {
    const data = await api("/api/place", {
      board: state.board,
      row,
      col,
      value: state.selectedValue,
      tiles_to_place: state.tilesToPlace,
    });
    previewPanel.hidden = true;
    applyServerState(data);
  } catch (error) {
    statusEl.textContent = error.message;
  }
}

async function solve() {
  solveBtn.disabled = true;
  statusEl.textContent = "계산 중...";

  try {
    const data = await api("/api/solve", {
      board: state.board,
      tiles_to_place: state.tilesToPlace,
    });

    const rec = data.recommendation;
    recommendationEl.textContent = `추천: ${rec.direction_ko} (${rec.direction}) · 기대 점수 ${rec.score}`;
    renderGrid(previewGrid, data.board, false);
    previewPanel.hidden = false;

    applyServerState(data);
  } catch (error) {
    statusEl.textContent = error.message;
    solveBtn.disabled = false;
  }
}

async function reset() {
  try {
    const data = await api("/api/reset", {});
    previewPanel.hidden = true;
    recommendationEl.textContent = "";
    applyServerState(data);
  } catch (error) {
    statusEl.textContent = error.message;
  }
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
