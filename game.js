// BOB의 입력, 공 생성·이동, 충돌 판정, 점수를 관리합니다.
const gameArea = document.querySelector("#gameArea");
const player = document.querySelector("#player");
const score = document.querySelector("#score");
const phase = document.querySelector("#phase");
const statusText = document.querySelector("#status");
const startButton = document.querySelector("#startButton");

const PLAYER_SIZE = 44;
const PLAYER_SPEED = 320;
const BALL_SIZE = 32;
const MAX_BALLS = 35;

// 12초마다 다음 단계로 넘어갑니다.
const BALL_TIERS = [
  { className: "ball--white", label: "흰 공 단계", speed: 180 },
  { className: "ball--red", label: "빨간 공 단계", speed: 270 },
  { className: "ball--black", label: "검은 공 단계", speed: 370 },
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

/** 플레이어를 게임 영역 안에 두고 화면 위치를 갱신합니다. */
function movePlayer(x, y) {
  playerX = Math.max(0, Math.min(x, gameArea.clientWidth - PLAYER_SIZE));
  playerY = Math.max(0, Math.min(y, gameArea.clientHeight - PLAYER_SIZE));

  player.style.transform = `translate3d(${playerX}px, ${playerY}px, 0)`;
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

  movePlayer(
    (gameArea.clientWidth - PLAYER_SIZE) / 2,
    gameArea.clientHeight - PLAYER_SIZE - 24
  );

  score.textContent = "0";
  phase.textContent = BALL_TIERS[0].label;
  statusText.textContent = "진행 중";
  startButton.hidden = true;
  isRunning = true;

  frameId = requestAnimationFrame(updateGame);
}

/** 현재 생존 시간에 따른 공 색상과 속도를 선택합니다. */
function getCurrentTier() {
  const tierIndex = Math.min(
    Math.floor(elapsedTime / 12),
    BALL_TIERS.length - 1
  );
  return BALL_TIERS[tierIndex];
}

/** 시간이 지날수록 공 생성 간격을 줄입니다. */
function getSpawnInterval() {
  return Math.max(300, 900 - Math.floor(elapsedTime / 5) * 70);
}

/** 화면의 위·왼쪽·오른쪽 중 한 곳에서 공을 생성합니다. */
function createBall() {
  if (balls.length >= MAX_BALLS) return;

  const tier = getCurrentTier();
  const element = document.createElement("div");
  element.className = `ball ${tier.className}`;
  element.setAttribute("aria-hidden", "true");

  const width = gameArea.clientWidth;
  const height = gameArea.clientHeight;
  const side = Math.floor(Math.random() * 3);
  const leadDistance = BALL_SIZE + tier.speed * 0.35;

  let x;
  let y;
  let velocityX = 0;
  let velocityY = 0;

  if (side === 0) {
    // 위에서 아래로 떨어지는 공
    x = Math.random() * (width - BALL_SIZE);
    y = -leadDistance;
    velocityY = tier.speed;
  } else if (side === 1) {
    // 왼쪽에서 오른쪽으로 날아오는 공
    x = -leadDistance;
    y = Math.random() * (height - BALL_SIZE);
    velocityX = tier.speed;
  } else {
    // 오른쪽에서 왼쪽으로 날아오는 공
    x = width + tier.speed * 0.35;
    y = Math.random() * (height - BALL_SIZE);
    velocityX = -tier.speed;
  }

  const ball = { element, x, y, velocityX, velocityY };
  element.style.transform = `translate3d(${x}px, ${y}px, 0)`;

  gameArea.append(element);
  balls.push(ball);
}

/** 원형 공과 사각형 플레이어가 실제로 닿았는지 확인합니다. */
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

/** 매 프레임 입력과 공의 위치를 갱신합니다. */
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

  score.textContent = String(Math.floor(elapsedTime));
  phase.textContent = getCurrentTier().label;

  const spawnInterval = getSpawnInterval();
  if (spawnTimer >= spawnInterval) {
    createBall();
    spawnTimer -= spawnInterval;
  }

  for (const ball of balls) {
    ball.x += ball.velocityX * deltaTime;
    ball.y += ball.velocityY * deltaTime;
    ball.element.style.transform =
      `translate3d(${ball.x}px, ${ball.y}px, 0)`;

    if (hasCollision(ball)) {
      endGame();
      return;
    }
  }

  // 반대쪽 경계를 완전히 벗어난 공은 화면과 배열에서 제거합니다.
  balls = balls.filter((ball) => {
    const hasExited =
      (ball.velocityX > 0 && ball.x > gameArea.clientWidth) ||
      (ball.velocityX < 0 && ball.x + BALL_SIZE < 0) ||
      (ball.velocityY > 0 && ball.y > gameArea.clientHeight);

    if (hasExited) ball.element.remove();
    return !hasExited;
  });

  frameId = requestAnimationFrame(updateGame);
}

/** 충돌하면 게임을 멈추고 재시작 버튼을 표시합니다. */
function endGame() {
  isRunning = false;
  frameId = null;
  dragPointerId = null;
  pressedKeys.clear();

  statusText.textContent =
    `게임 종료! ${Math.floor(elapsedTime)}초 생존했습니다.`;
  startButton.textContent = "다시 시작";
  startButton.hidden = false;
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

// 태블릿에서는 게임 영역을 누른 채 움직인 거리만큼 플레이어를 이동합니다.
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

// 시작 전에도 플레이어가 화면 안에 보이도록 배치합니다.
movePlayer(
  (gameArea.clientWidth - PLAYER_SIZE) / 2,
  gameArea.clientHeight - PLAYER_SIZE - 24
);
