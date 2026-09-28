// BOB의 입력, 공 생성·이동, 충돌 판정, 점수를 관리합니다.
const gameArea = document.querySelector("#gameArea");
const player = document.querySelector("#player");
const score = document.querySelector("#score");
const phase = document.querySelector("#phase");
const overlay = document.querySelector("#gameOverlay");
const statusText = document.querySelector("#status");
const finalScore = document.querySelector("#finalScore");
const startButton = document.querySelector("#startButton");

const PLAYER_SIZE = 44;
const PLAYER_SPEED = 360;
const BALL_SIZE = 32;
const MAX_BALLS = 50;

// 8초마다 공의 색상과 기본 속도가 바뀝니다.
const BALL_TIERS = [
  { className: "ball--white", label: "흰 공 단계", speed: 210 },
  { className: "ball--red", label: "빨간 공 단계", speed: 300 },
  { className: "ball--black", label: "검은 공 단계", speed: 400 },
];

const pressedKeys = new Set();
const keyDirections = {
  arrowleft: "left",
  a: "left",
  arrowright: "right",
  d: "right",
  arrowup: "up",
  w: "up",
  arrowdown: "down",
  s: "down",
};

let playerX = 0;
let playerY = 0;
let balls = [];
let elapsedTime = 0;
let spawnTimer = 0;
let lastFrameTime = 0;
let frameId = null;
let isRunning = false;

let dragPointerId = null;
let lastPointerX = 0;
let lastPointerY = 0;

/** 플레이어를 게임 영역 안에 두고 위치를 갱신합니다. */
function movePlayer(x, y) {
  playerX = Math.max(0, Math.min(x, gameArea.clientWidth - PLAYER_SIZE));
  playerY = Math.max(0, Math.min(y, gameArea.clientHeight - PLAYER_SIZE));

  player.style.transform = `translate3d(${playerX}px, ${playerY}px, 0)`;
}

/** 플레이어를 정확히 화면 중앙에 배치합니다. */
function centerPlayer() {
  movePlayer(
    (gameArea.clientWidth - PLAYER_SIZE) / 2,
    (gameArea.clientHeight - PLAYER_SIZE) / 2
  );
}

/** 이전 게임을 정리하고 중앙에서 새 게임을 시작합니다. */
function startGame() {
  if (frameId !== null) {
    cancelAnimationFrame(frameId);
  }

  balls.forEach((ball) => ball.element.remove());
  balls = [];
  pressedKeys.clear();
  dragPointerId = null;
  elapsedTime = 0;
  spawnTimer = 0;
  lastFrameTime = 0;

  centerPlayer();
  score.textContent = "0.0";
  phase.textContent = BALL_TIERS[0].label;
  finalScore.hidden = true;
  overlay.hidden = true;
  isRunning = true;

  frameId = requestAnimationFrame(updateGame);
}

/** 현재 생존 시간에 해당하는 공 단계를 반환합니다. */
function getCurrentTier() {
  const index = Math.min(
    Math.floor(elapsedTime / 8),
    BALL_TIERS.length - 1
  );
  return BALL_TIERS[index];
}

/** 3초마다 생성 간격을 줄여 공의 수를 늘립니다. */
function getSpawnInterval() {
  return Math.max(220, 750 - Math.floor(elapsedTime / 3) * 65);
}

/** 직선 또는 대각선 각도를 선택합니다. */
function getShotAngle() {
  if (Math.random() < 0.35) return 0;
  return 0.3 + Math.random() * 0.4;
}

/** 위·왼쪽·오른쪽에서 공을 생성합니다. */
function createBall() {
  if (balls.length >= MAX_BALLS) return;

  const tier = getCurrentTier();
  const element = document.createElement("div");
  element.className = `ball ${tier.className}`;
  element.setAttribute("aria-hidden", "true");

  const width = gameArea.clientWidth;
  const height = gameArea.clientHeight;
  const side = Math.floor(Math.random() * 3);
  const angle = getShotAngle();
  const leadDistance = BALL_SIZE + tier.speed * 0.35;

  let x;
  let y;
  let velocityX;
  let velocityY;

  if (side === 0) {
    // 위에서 출발하며 좌우 또는 대각선 아래로 이동합니다.
    x = Math.random() * (width - BALL_SIZE);
    y = -leadDistance;
    const inward = x < width / 2 ? 1 : -1;
    velocityX = inward * tier.speed * Math.sin(angle);
    velocityY = tier.speed * Math.cos(angle);
  } else if (side === 1) {
    // 왼쪽에서 출발해 오른쪽 또는 대각선으로 이동합니다.
    x = -leadDistance;
    y = Math.random() * (height - BALL_SIZE);
    const inward = y < height / 2 ? 1 : -1;
    velocityX = tier.speed * Math.cos(angle);
    velocityY = inward * tier.speed * Math.sin(angle);
  } else {
    // 오른쪽에서 출발해 왼쪽 또는 대각선으로 이동합니다.
    x = width + tier.speed * 0.35;
    y = Math.random() * (height - BALL_SIZE);
    const inward = y < height / 2 ? 1 : -1;
    velocityX = -tier.speed * Math.cos(angle);
    velocityY = inward * tier.speed * Math.sin(angle);
  }

  const ball = {
    element,
    x,
    y,
    velocityX,
    velocityY,
    hasEntered: false,
    age: 0,
  };

  element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  gameArea.append(element);
  balls.push(ball);
}

/** 원형 공과 사각형 플레이어가 닿았는지 확인합니다. */
function hasCollision(ball) {
  const radius = BALL_SIZE / 2;
  const centerX = ball.x + radius;
  const centerY = ball.y + radius;

  const nearestX = Math.max(
    playerX,
    Math.min(centerX, playerX + PLAYER_SIZE)
  );
  const nearestY = Math.max(
    playerY,
    Math.min(centerY, playerY + PLAYER_SIZE)
  );

  const distanceX = centerX - nearestX;
  const distanceY = centerY - nearestY;

  return distanceX * distanceX + distanceY * distanceY <= radius * radius;
}

/** 공이 게임 영역에 들어왔다가 완전히 벗어났는지 확인합니다. */
function hasExited(ball) {
  const isInside =
    ball.x + BALL_SIZE >= 0 &&
    ball.x <= gameArea.clientWidth &&
    ball.y + BALL_SIZE >= 0 &&
    ball.y <= gameArea.clientHeight;

  if (isInside) ball.hasEntered = true;

  // 영역을 스치지 못한 대각선 공도 일정 시간이 지나면 정리합니다.
  return (!isInside && ball.hasEntered) || ball.age > 10;
}

/** 매 프레임 플레이어, 공, 난이도와 시간을 갱신합니다. */
function updateGame(timestamp) {
  if (!isRunning) return;

  const deltaTime = lastFrameTime === 0
    ? 0
    : Math.min((timestamp - lastFrameTime) / 1000, 0.05);
  lastFrameTime = timestamp;

  const directionX =
    Number(pressedKeys.has("right")) - Number(pressedKeys.has("left"));
  const directionY =
    Number(pressedKeys.has("down")) - Number(pressedKeys.has("up"));
  const directionLength = Math.hypot(directionX, directionY) || 1;

  movePlayer(
    playerX + (directionX / directionLength) * PLAYER_SPEED * deltaTime,
    playerY + (directionY / directionLength) * PLAYER_SPEED * deltaTime
  );

  elapsedTime += deltaTime;
  spawnTimer += deltaTime * 1000;

  score.textContent = elapsedTime.toFixed(1);
  phase.textContent = getCurrentTier().label;

  const spawnInterval = getSpawnInterval();
  if (spawnTimer >= spawnInterval) {
    createBall();
    spawnTimer -= spawnInterval;
  }

  for (const ball of balls) {
    ball.x += ball.velocityX * deltaTime;
    ball.y += ball.velocityY * deltaTime;
    ball.age += deltaTime;
    ball.element.style.transform =
      `translate3d(${ball.x}px, ${ball.y}px, 0)`;

    if (hasCollision(ball)) {
      endGame();
      return;
    }
  }

  balls = balls.filter((ball) => {
    if (!hasExited(ball)) return true;
    ball.element.remove();
    return false;
  });

  frameId = requestAnimationFrame(updateGame);
}

/** 게임을 멈추고 중앙에 생존 기록과 재시작 버튼을 표시합니다. */
function endGame() {
  isRunning = false;
  frameId = null;
  dragPointerId = null;
  pressedKeys.clear();

  statusText.textContent = "게임 종료";
  finalScore.textContent = `${elapsedTime.toFixed(1)}초 생존`;
  finalScore.hidden = false;
  startButton.textContent = "다시 시작";
  overlay.hidden = false;
  startButton.focus();
}

window.addEventListener("keydown", (event) => {
  const direction = keyDirections[event.key.toLowerCase()];
  if (!isRunning || !direction) return;

  event.preventDefault();
  pressedKeys.add(direction);
});

window.addEventListener("keyup", (event) => {
  const direction = keyDirections[event.key.toLowerCase()];
  if (direction) pressedKeys.delete(direction);
});

window.addEventListener("blur", () => {
  pressedKeys.clear();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pressedKeys.clear();
    lastFrameTime = 0;
  }
});

// 태블릿에서는 게임 영역을 드래그한 거리만큼 플레이어를 이동합니다.
gameArea.addEventListener("pointerdown", (event) => {
  if (!isRunning) return;

  dragPointerId = event.pointerId;
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
  gameArea.setPointerCapture(event.pointerId);
});

gameArea.addEventListener("pointermove", (event) => {
  if (event.pointerId !== dragPointerId) return;

  movePlayer(
    playerX + event.clientX - lastPointerX,
    playerY + event.clientY - lastPointerY
  );
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
});

function stopDragging(event) {
  if (event.pointerId === dragPointerId) {
    dragPointerId = null;
  }
}

gameArea.addEventListener("pointerup", stopDragging);
gameArea.addEventListener("pointercancel", stopDragging);

window.addEventListener("resize", () => {
  movePlayer(playerX, playerY);
});

startButton.addEventListener("click", startGame);

// 게임 시작 전에도 플레이어가 화면 중앙에 보이도록 배치합니다.
centerPlayer();
