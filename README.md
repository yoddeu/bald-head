# 던전 탈출 퍼즐

Phaser 3 기반의 모바일 세로형 high top view 자유 이동 던전 퍼즐 프로토타입입니다.

## 게임 컨셉

- 주인공을 가상 조이스틱, 방향키, 또는 WASD로 자유롭게 조종합니다.
- 타일 격자에 묶이지 않고 벡터 기반 던전 공간을 탐험합니다.
- 물리 기반으로 돌을 밀어 스위치 위에 올리면 화면 위쪽 출구가 열립니다.
- 출구로 이동하면 스테이지를 클리어합니다.

## 실행 방식

`index.html`에서 Phaser 3 CDN 스크립트를 먼저 로드하고, `src/main.js`는 `window.Phaser` 전역 객체를 사용합니다. 브라우저에서 정적 파일 서버로 `index.html`을 열면 실행할 수 있습니다.

```bash
python3 -m http.server 4173
```

그 다음 브라우저에서 `http://localhost:4173`에 접속하세요.

## 향후 하이브리드 앱 전환

나중에 npm registry 접근이 가능한 환경에서는 `package.json`의 Vite 구성을 사용해 번들링하고, Capacitor 같은 도구로 iOS/Android 앱으로 감싸는 흐름을 추천합니다.
