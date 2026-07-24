const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const scoreEl = document.querySelector('#score');
const bestScoreEl = document.querySelector('#best-score');
const levelEl = document.querySelector('#level');
const overlay = document.querySelector('#overlay');
const startButton = document.querySelector('#start-button');

const keys = new Set();
const bestScoreKey = 'meteor-dodge-best-score';
let bestScore = Number(localStorage.getItem(bestScoreKey) || 0);
let animationId;
let lastTime = 0;
let spawnTimer = 0;
let score = 0;
let running = false;

const player = {
  x: canvas.width / 2 - 24,
  y: canvas.height - 78,
  width: 48,
  height: 48,
  speed: 330,
};

const meteors = [];
const stars = Array.from({ length: 70 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  radius: Math.random() * 1.8 + 0.4,
  speed: Math.random() * 28 + 12,
}));

bestScoreEl.textContent = bestScore;

function resetGame() {
  player.x = canvas.width / 2 - player.width / 2;
  meteors.length = 0;
  spawnTimer = 0;
  score = 0;
  lastTime = performance.now();
  running = true;
  overlay.classList.add('hidden');
  updateHud();
  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(loop);
}

function updateHud() {
  scoreEl.textContent = Math.floor(score);
  bestScoreEl.textContent = bestScore;
  levelEl.textContent = Math.floor(score / 400) + 1;
}

function spawnMeteor() {
  const size = Math.random() * 28 + 22;
  const level = Math.floor(score / 400);
  meteors.push({
    x: Math.random() * (canvas.width - size),
    y: -size,
    size,
    speed: Math.random() * 100 + 170 + level * 18,
    rotation: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 4,
  });
}

function movePlayer(delta) {
  const movingLeft = keys.has('ArrowLeft') || keys.has('a');
  const movingRight = keys.has('ArrowRight') || keys.has('d');

  if (movingLeft) player.x -= player.speed * delta;
  if (movingRight) player.x += player.speed * delta;
  player.x = Math.max(10, Math.min(canvas.width - player.width - 10, player.x));
}

function update(delta) {
  score += delta * 100;
  spawnTimer -= delta;

  if (spawnTimer <= 0) {
    spawnMeteor();
    spawnTimer = Math.max(0.24, 0.8 - score / 2200);
  }

  movePlayer(delta);

  for (let i = meteors.length - 1; i >= 0; i -= 1) {
    const meteor = meteors[i];
    meteor.y += meteor.speed * delta;
    meteor.rotation += meteor.spin * delta;

    if (meteor.y > canvas.height + meteor.size) {
      meteors.splice(i, 1);
      continue;
    }

    if (isColliding(player, meteor)) {
      endGame();
      return;
    }
  }

  for (const star of stars) {
    star.y += star.speed * delta;
    if (star.y > canvas.height) {
      star.y = 0;
      star.x = Math.random() * canvas.width;
    }
  }

  updateHud();
}

function isColliding(rect, circle) {
  const closestX = Math.max(rect.x, Math.min(circle.x + circle.size / 2, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.y + circle.size / 2, rect.y + rect.height));
  const distanceX = circle.x + circle.size / 2 - closestX;
  const distanceY = circle.y + circle.size / 2 - closestY;
  return distanceX * distanceX + distanceY * distanceY < (circle.size / 2) ** 2;
}

function endGame() {
  running = false;
  cancelAnimationFrame(animationId);
  bestScore = Math.max(bestScore, Math.floor(score));
  localStorage.setItem(bestScoreKey, bestScore);
  updateHud();
  overlay.querySelector('h2').textContent = '게임 오버!';
  overlay.querySelector('p').textContent = `점수 ${Math.floor(score)}점입니다. 다시 도전해 보세요.`;
  startButton.textContent = '다시 시작';
  overlay.classList.remove('hidden');
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  for (const star of stars) {
    ctx.globalAlpha = 0.25 + star.radius / 2.4;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPlayer() {
  const centerX = player.x + player.width / 2;
  ctx.save();
  ctx.translate(centerX, player.y + player.height / 2);
  ctx.fillStyle = '#7df9ff';
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.lineTo(25, 24);
  ctx.lineTo(0, 12);
  ctx.lineTo(-25, 24);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffe66d';
  ctx.beginPath();
  ctx.moveTo(-8, 18);
  ctx.lineTo(0, 36 + Math.sin(performance.now() / 80) * 5);
  ctx.lineTo(8, 18);
  ctx.fill();
  ctx.restore();
}

function drawMeteor(meteor) {
  ctx.save();
  ctx.translate(meteor.x + meteor.size / 2, meteor.y + meteor.size / 2);
  ctx.rotate(meteor.rotation);
  const gradient = ctx.createRadialGradient(0, 0, 4, 0, 0, meteor.size / 2);
  gradient.addColorStop(0, '#fff3bf');
  gradient.addColorStop(0.45, '#ff7a45');
  gradient.addColorStop(1, '#7c2d12');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, meteor.size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.beginPath();
  ctx.arc(-meteor.size * 0.12, -meteor.size * 0.14, meteor.size * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function draw() {
  drawBackground();
  for (const meteor of meteors) drawMeteor(meteor);
  drawPlayer();
}

function loop(timestamp) {
  if (!running) return;
  const delta = Math.min((timestamp - lastTime) / 1000, 0.033);
  lastTime = timestamp;
  update(delta);
  draw();
  animationId = requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(event.key)) {
    keys.add(event.key);
  }

  if (event.code === 'Space' && !running) {
    resetGame();
  }
});

window.addEventListener('keyup', (event) => keys.delete(event.key));
startButton.addEventListener('click', resetGame);
draw();
