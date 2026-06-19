# 2048 Solver

4x4 2048 보드에서 **Expectimax** 알고리즘으로 다음 수를 추천하는 앱입니다.

## 기능

- 초기 타일 2개 입력 후, 매 턴마다 생성 타일 1개 입력
- 추천 방향(위/아래/왼쪽/오른쪽)과 이동 후 예상 보드 표시
- **브라우저에서 직접 계산** — 서버 CPU 없이 빠름

## 배포 (Vercel · 추천)

정적 파일만 배포합니다. `web/` 폴더가 루트입니다.

1. GitHub에 push
2. [vercel.com](https://vercel.com) → **Add New Project**
3. 저장소 연결
4. Root Directory: `web` (또는 루트에 `vercel.json`이 있으면 자동)

GitHub Pages도 가능: Settings → Pages → `/web` 폴더

## 로컬 실행 (정적)

```bash
cd web
python3 -m http.server 8080
```

→ http://localhost:8080

## 로컬 실행 (Flask · 선택)

```bash
python3 -m pip install -r requirements.txt
python3 app.py
```

→ http://127.0.0.1:5001

### CLI

```bash
python3 main.py
```

## 프로젝트 구조

```
web/              # 정적 배포용 (Vercel)
  index.html
  static/
    solver.js     # Expectimax (브라우저)
    app.js
board.py          # Python 보드 로직
heuristics.py
solver.py         # Python 솔버
app.py            # Flask 서버 (선택)
main.py           # CLI
```

## 알고리즘

- **Expectimax**: 이동은 최대화, 타일 스폰(2: 90%, 4: 10%)은 기대값 평가
- **휴리스틱**: 빈 칸 수, 단조성, 인접 타일 차이, 코너 가중치

## Render vs Vercel

| | Render (Flask) | Vercel (정적) |
|--|--|--|
| 속도 | 무료 CPU 느림 | 본인 PC 속도 |
| 비용 | 무료 (슬립 있음) | 무료 |
| 추천 | ❌ | ✅ |
