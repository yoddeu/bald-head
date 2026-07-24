const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const joystick = document.querySelector('#joystick');
const joystickKnob = document.querySelector('#joystick-knob');
const message = document.querySelector('#message');
const goalStatus = document.querySelector('#goal-status');
const stepCounter = document.querySelector('#step-counter');
const resetButton = document.querySelector('#reset-button');

const tile = 30;
const map = [
  '#############',
  '#.....E.....#',
  '#.###...###.#',
  '#...#...#...#',
  '#...#...#...#',
  '#...........#',
  '#..##...##..#',
  '#...........#',
  '#.....S.....#',
  '#...........#',
  '#..###.###..#',
  '#...........#',
  '#....B......#',
  '#...........#',
  '#.....P.....#',
  '#############',
];

const state = {
  player: { col: 6, row: 14, x: 6 * tile, y: 14 * tile, targetX: 6 * tile, targetY: 14 * tile },
  boulder: { col: 5, row: 12, x: 5 * tile, y: 12 * tile, targetX: 5 * tile, targetY: 12 * tile },
  exit: { col: 6, row: 1 },
  switch: { col: 6, row: 8 },
  steps: 0,
  won: false,
  moveCooldown: 0,
};

const input = { x: 0, y: 0 };
const joystickInput = { x: 0, y: 0 };
const keys = new Set();
let activePointerId = null;
let joystickCenter = { x: 0, y: 0 };
let lastTime = performance.now();

function resetGame() {
  Object.assign(state.player, { col: 6, row: 14, x: 6 * tile, y: 14 * tile, targetX: 6 * tile, targetY: 14 * tile });
  Object.assign(state.boulder, { col: 5, row: 12, x: 5 * tile, y: 12 * tile, targetX: 5 * tile, targetY: 12 * tile });
  state.steps = 0;
  state.won = false;
  state.moveCooldown = 0;
  message.classList.add('hidden');
  updateStatus();
}

function updateStatus() {
  const switchPressed = isSwitchPressed();
  goalStatus.textContent = switchPressed ? '출구가 열렸습니다. 맨 위쪽으로 탈출하세요!' : '돌을 스위치 위로 밀어 출구를 여세요.';
  stepCounter.textContent = `${state.steps} 걸음`;
}

function isWall(col, row) {
  return map[row]?.[col] === '#';
}

function isSwitchPressed() {
  return state.boulder.col === state.switch.col && state.boulder.row === state.switch.row;
}

function isExitOpen() {
  return isSwitchPressed();
}

function canEnter(col, row) {
  if (isWall(col, row)) return false;
  if (col === state.exit.col && row === state.exit.row) return isExitOpen();
  return true;
}

function tryMove(dx, dy) {
  if (state.won) return;

  const nextCol = state.player.col + dx;
  const nextRow = state.player.row + dy;
  const pushingBoulder = nextCol === state.boulder.col && nextRow === state.boulder.row;

  if (pushingBoulder) {
    const boulderCol = state.boulder.col + dx;
    const boulderRow = state.boulder.row + dy;
    if (!canEnter(boulderCol, boulderRow)) return;
    state.boulder.col = boulderCol;
    state.boulder.row = boulderRow;
    state.boulder.targetX = boulderCol * tile;
    state.boulder.targetY = boulderRow * tile;
  } else if (!canEnter(nextCol, nextRow)) {
    return;
  }

  state.player.col = nextCol;
  state.player.row = nextRow;
  state.player.targetX = nextCol * tile;
  state.player.targetY = nextRow * tile;
  state.steps += 1;

  if (state.player.col === state.exit.col && state.player.row === state.exit.row && isExitOpen()) {
    state.won = true;
    message.classList.remove('hidden');
  }

  updateStatus();
}

function updateInput() {
  const keyboardX = Number(keys.has('ArrowRight') || keys.has('d')) - Number(keys.has('ArrowLeft') || keys.has('a'));
  const keyboardY = Number(keys.has('ArrowDown') || keys.has('s')) - Number(keys.has('ArrowUp') || keys.has('w'));
  input.x = keyboardX || joystickInput.x;
  input.y = keyboardY || joystickInput.y;
}

function update(delta) {
  state.moveCooldown = Math.max(0, state.moveCooldown - delta);
  updateInput();

  if (state.moveCooldown === 0 && (input.x !== 0 || input.y !== 0)) {
    const horizontal = Math.abs(input.x) >= Math.abs(input.y);
    tryMove(horizontal ? Math.sign(input.x) : 0, horizontal ? 0 : Math.sign(input.y));
    state.moveCooldown = 0.16;
  }

  smoothMove(state.player, delta);
  smoothMove(state.boulder, delta);
}

function smoothMove(entity, delta) {
  const easing = Math.min(1, delta * 14);
  entity.x += (entity.targetX - entity.x) * easing;
  entity.y += (entity.targetY - entity.y) * easing;
}

function drawTile(col, row, symbol) {
  const x = col * tile;
  const y = row * tile + 88;

  if (symbol === '#') {
    ctx.fillStyle = '#263247';
    ctx.fillRect(x, y, tile, tile);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x + 3, y + 3, tile - 6, 4);
    return;
  }

  ctx.fillStyle = (col + row) % 2 ? '#172033' : '#141c2d';
  ctx.fillRect(x, y, tile, tile);
}

function drawDungeon() {
  ctx.fillStyle = '#07111f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, 88);
  ctx.fillStyle = '#d9f99d';
  ctx.font = '700 18px system-ui';
  ctx.fillText('High Top View Dungeon', 18, 34);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px system-ui';
  ctx.fillText('스위치 → 출구 순서로 퍼즐을 해결하세요', 18, 58);

  for (let row = 0; row < map.length; row += 1) {
    for (let col = 0; col < map[row].length; col += 1) {
      drawTile(col, row, map[row][col]);
    }
  }
}

function drawSwitchAndExit() {
  const switchX = state.switch.col * tile;
  const switchY = state.switch.row * tile + 88;
  ctx.fillStyle = isSwitchPressed() ? '#bef264' : '#64748b';
  ctx.beginPath();
  ctx.roundRect(switchX + 6, switchY + 6, tile - 12, tile - 12, 6);
  ctx.fill();

  const exitX = state.exit.col * tile;
  const exitY = state.exit.row * tile + 88;
  ctx.fillStyle = isExitOpen() ? '#22c55e' : '#7f1d1d';
  ctx.fillRect(exitX + 4, exitY + 2, tile - 8, tile - 4);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 12px system-ui';
  ctx.fillText('EXIT', exitX + 2, exitY + 20);
}

function drawBoulder() {
  const x = state.boulder.x + tile / 2;
  const y = state.boulder.y + tile / 2 + 88;
  ctx.fillStyle = '#8b7355';
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.arc(x - 4, y - 5, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer() {
  const x = state.player.x + tile / 2;
  const y = state.player.y + tile / 2 + 88;
  ctx.fillStyle = '#60a5fa';
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#bfdbfe';
  ctx.beginPath();
  ctx.arc(x, y - 5, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawGridOverlay() {
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  for (let x = 0; x <= canvas.width; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, 88);
    ctx.lineTo(x, 88 + map.length * tile);
    ctx.stroke();
  }
  for (let y = 88; y <= 88 + map.length * tile; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function draw() {
  drawDungeon();
  drawSwitchAndExit();
  drawBoulder();
  drawPlayer();
  drawGridOverlay();
}

function loop(now) {
  const delta = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;
  update(delta);
  draw();
  requestAnimationFrame(loop);
}

function setJoystickVector(clientX, clientY) {
  const dx = clientX - joystickCenter.x;
  const dy = clientY - joystickCenter.y;
  const distance = Math.hypot(dx, dy);
  const maxDistance = joystick.clientWidth * 0.34;
  const clamped = Math.min(distance, maxDistance);
  const angle = Math.atan2(dy, dx);
  const knobX = Math.cos(angle) * clamped;
  const knobY = Math.sin(angle) * clamped;

  joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
  joystickInput.x = maxDistance ? knobX / maxDistance : 0;
  joystickInput.y = maxDistance ? knobY / maxDistance : 0;
}

function resetJoystick() {
  activePointerId = null;
  joystickInput.x = 0;
  joystickInput.y = 0;
  input.x = 0;
  input.y = 0;
  joystickKnob.style.transform = 'translate(-50%, -50%)';
}

joystick.addEventListener('pointerdown', (event) => {
  activePointerId = event.pointerId;
  joystick.setPointerCapture(activePointerId);
  const rect = joystick.getBoundingClientRect();
  joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  setJoystickVector(event.clientX, event.clientY);
});

joystick.addEventListener('pointermove', (event) => {
  if (event.pointerId === activePointerId) setJoystickVector(event.clientX, event.clientY);
});

joystick.addEventListener('pointerup', resetJoystick);
joystick.addEventListener('pointercancel', resetJoystick);
window.addEventListener('keydown', (event) => keys.add(event.key));
window.addEventListener('keyup', (event) => keys.delete(event.key));
resetButton.addEventListener('click', resetGame);

resetGame();
requestAnimationFrame(loop);
