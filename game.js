// BOB의 입력, 공 생성·이동, 충돌 판정, 난이도와 점수를 관리합니다.
const gameArea = document.querySelector("#gameArea");
const player = document.querySelector("#player");
const score = document.querySelector("#score");
const overlay = document.querySelector("#gameOverlay");
const statusText = document.querySelector("#status");
const finalScore = document.querySelector("#finalScore");
const startButton = document.querySelector("#startButton");

const PLAYER_SIZE = 44;
const PLAYER_SPEED = 360;
const BALL_SIZE = 12;

const COUNT_RAMP_SECONDS = 60;
const SPEED_RAMP_SECONDS = 120;
const MAX_SPEED_INCREASE = 0.25;

const BALL_TYPES = [
  { className: "ball--white", speed: 210 },
  { className: "ball--red", speed: 300 },
  { className: "ball--black", speed: 400 },
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

/** 플레이어를 화면 중앙에 배치합니다. */
function centerPlayer() {
  movePlayer(
    (gameArea.clientWidth - PLAYER_SIZE) / 2,
    (gameArea.clientHeight - PLAYER_SIZE) / 2
  );
}

/** 이전 게임을 정리하고 새 게임을 시작합니다. */
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
  statusText.textContent = "";
  finalScore.hidden = true;
  overlay.hidden = true;
  isRunning = true;

  frameId = requestAnimationFrame(updateGame);
}

/** 시간이 지날수록 빨간 공과 검은 공이 뽑힐 확률을 높입니다. */
function pickBallType() {
  const redChance = Math.min(0.45, (elapsedTime / 30) * 0.45);
  const blackChance = Math.min(
    0.45,
    (Math.max(0, elapsedTime - 10) / 50) * 0.45
  );
  const whiteChance = 1 - redChance - blackChance;
  const roll = Math.random();

  if (roll < whiteChance) return BALL_TYPES[0];
  if (roll < whiteChance + redChance) return BALL_TYPES[1];
  return BALL_TYPES[2];
}

/** 화면 크기에 맞춰 공의 최대 개수를 60초까지 늘립니다. */
function getTargetBallCount() {
  const maxCount = gameArea.clientWidth < 800 ? 25 : 40;
  const progress = Math.min(elapsedTime, COUNT_RAMP_SECONDS)
    / COUNT_RAMP_SECONDS;

  return 5 + Math.floor((maxCount - 2) * progress);
}

/** 60초까지 생성 간격을 줄이고 이후에는 유지합니다. */
function getSpawnInterval() {
  const progress = Math.min(elapsedTime, COUNT_RAMP_SECONDS);
  return Math.max(150, 250 - progress * 10);
}

/** 60초 이후 로그 곡선으로 속도를 높여 180초에 1.25배로 고정합니다. */
function getSpeedMultiplier() {
  const speedTime = Math.min(
    Math.max(elapsedTime - COUNT_RAMP_SECONDS, 0),
    SPEED_RAMP_SECONDS
  );

  return 1 + MAX_SPEED_INCREASE
    * Math.log1p(speedTime / 30)
    / Math.log1p(SPEED_RAMP_SECONDS / 30);
}

/** 직선 또는 대각선 각도를 선택합니다. */
function getShotAngle() {
  if (Math.random() < 0.35) return 0;
  return 0.3 + Math.random() * 0.4;
}

/** 위·왼쪽·오른쪽에서 확률에 따라 선택한 공을 생성합니다. */
function createBall() {
  if (balls.length >= getTargetBallCount()) return;

  const type = pickBallType();
  const element = document.createElement("div");
  element.className = `ball ${type.className}`;
  element.setAttribute("aria-hidden", "true");

  const width = gameArea.clientWidth;
  const height = gameArea.clientHeight;
  const side = Math.floor(Math.random() * 3);
  const angle = getShotAngle();
  const leadDistance = BALL_SIZE + type.speed * 0.35;

  let x;
  let y;
  let velocityX;
  let velocityY;

  if (side === 0) {
    // 위에서 아래 또는 대각선 아래로 이동합니다.
    x = Math.random() * (width - BALL_SIZE);
    y = -leadDistance;
    const inward = x < width / 2 ? 1 : -1;
    velocityX = inward * type.speed * Math.sin(angle);
    velocityY = type.speed * Math.cos(angle);
  } else if (side === 1) {
    // 왼쪽에서 오른쪽 또는 대각선으로 이동합니다.
    x = -leadDistance;
    y = Math.random() * (height - BALL_SIZE);
    const inward = y < height / 2 ? 1 : -1;
    velocityX = type.speed * Math.cos(angle);
    velocityY = inward * type.speed * Math.sin(angle);
  } else {
    // 오른쪽에서 왼쪽 또는 대각선으로 이동합니다.
    x = width + type.speed * 0.35;
    y = Math.random() * (height - BALL_SIZE);
    const inward = y < height / 2 ? 1 : -1;
    velocityX = -type.speed * Math.cos(angle);
    velocityY = inward * type.speed * Math.sin(angle);
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

  const spawnInterval = getSpawnInterval();
  if (spawnTimer >= spawnInterval) {
    createBall();
    spawnTimer -= spawnInterval;
  }

  const speedMultiplier = getSpeedMultiplier();

  for (const ball of balls) {
    ball.x += ball.velocityX * speedMultiplier * deltaTime;
    ball.y += ball.velocityY * speedMultiplier * deltaTime;
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

// 태블릿에서는 드래그한 거리만큼 플레이어를 이동합니다.
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

// 게임 시작 전에도 플레이어를 화면 중앙에 표시합니다.
centerPlayer();
