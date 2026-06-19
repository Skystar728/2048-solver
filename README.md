# 2048 Solver

4x4 2048 보드에서 **Expectimax** 알고리즘으로 다음 수를 추천하는 웹 앱입니다.

## 기능

- 초기 타일 2개 입력 후, 매 턴마다 생성 타일 1개 입력
- 추천 방향(위/아래/왼쪽/오른쪽)과 이동 후 예상 보드 표시
- CLI(`main.py`)와 웹 UI 지원

## 로컬 실행

```bash
cd /Users/mkkim/Documents/2048
python3 -m pip install -r requirements.txt
python3 app.py
```

브라우저에서 http://127.0.0.1:5001 접속

> macOS에서 5000번 포트는 AirPlay가 사용할 수 있습니다. 기본 포트는 5001입니다.  
> 다른 포트: `PORT=8080 python3 app.py`

### CLI

```bash
python3 main.py
```

## 배포 (Render)

1. GitHub에 push
2. [Render](https://render.com) → **New → Blueprint**
3. 저장소 연결 후 `render.yaml` 적용

## Docker

```bash
docker build -t 2048-solver .
docker run -p 8080:8080 2048-solver
```

## 프로젝트 구조

```
board.py        # 보드/이동 로직
heuristics.py   # 평가 휴리스틱
solver.py       # Expectimax 솔버
app.py          # Flask 웹 서버
main.py         # CLI
templates/      # HTML
static/         # CSS, JS
```

## 알고리즘

- **Expectimax**: 이동은 최대화, 타일 스폰(2: 90%, 4: 10%)은 기대값 평가
- **휴리스틱**: 빈 칸 수, 단조성, 인접 타일 차이, 코너 가중치
