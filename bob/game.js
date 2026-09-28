// BOB의 입력, 폭탄 이동, 충돌 판정, 점수를 관리합니다.
const gameArea = document.querySelector("#gameArea");
const player = document.querySelector("#player");
const score = document.querySelector("#score");
const statusText = document.querySelector("#status");
const startButton = document.querySelector("#startButton");

const PLAYER_SIZE = 44;
const PLAYER_BOTTOM = 16;
const PLAYER_SPEED = 320;
const BOMB_SIZE = 32;
const BOMB_SPEED = 230;
const BOMB_INTERVAL = 700;

let playerX = 0;
let bombs = [];
let keys = { left: false, right: false };
let elapsedTime = 0;
let bombTimer = 0;
let lastFrameTime = 0;
let frameId = null;
let isRunning = false;

/** 게임을 초기 상태로 되돌리고 새 게임을 시작합니다. */
function startGame() {
  if (frameId !== null) {
    cancelAnimationFrame(frameId);
  }

  bombs.forEach((bomb) => bomb.element.remove());
  bombs = [];
  keys = { left: false, right: false };
  elapsedTime = 0;
  bombTimer = 0;
  lastFrameTime = 0;
  playerX = (gameArea.clientWidth - PLAYER_SIZE) / 2;
  player.style.left = `${playerX}px`;

  score.textContent = "0";
  statusText.textContent = "진행 중";
  startButton.hidden = true;
  isRunning = true;

  frameId = requestAnimationFrame(updateGame);
}

/** 게임 화면 위쪽에 폭탄을 하나 생성합니다. */
function createBomb() {
  const element = document.createElement("div");
  element.className = "bomb";
  element.setAttribute("aria-hidden", "true");

  const x = Math.random() * (gameArea.clientWidth - BOMB_SIZE);
  const bomb = { element, x, y: -BOMB_SIZE };

  element.style.left = `${x}px`;
  gameArea.append(element);
  bombs.push(bomb);
}

/** 플레이어와 폭탄의 사각형 영역이 겹치는지 확인합니다. */
function hasCollision(bomb) {
  const playerY = gameArea.clientHeight - PLAYER_BOTTOM - PLAYER_SIZE;

  return (
    playerX < bomb.x + BOMB_SIZE &&
    playerX + PLAYER_SIZE > bomb.x &&
    playerY < bomb.y + BOMB_SIZE &&
    playerY + PLAYER_SIZE > bomb.y
  );
}

/** 매 프레임 플레이어·폭탄·점수를 갱신합니다. */
function updateGame(timestamp) {
  if (!isRunning) return;

  const deltaTime = lastFrameTime === 0
    ? 0
    : Math.min((timestamp - lastFrameTime) / 1000, 0.05);
  lastFrameTime = timestamp;

  if (keys.left) playerX -= PLAYER_SPEED * deltaTime;
  if (keys.right) playerX += PLAYER_SPEED * deltaTime;

  playerX = Math.max(0, Math.min(playerX, gameArea.clientWidth - PLAYER_SIZE));
  player.style.left = `${playerX}px`;

  elapsedTime += deltaTime;
  bombTimer += deltaTime * 1000;
  score.textContent = String(Math.floor(elapsedTime));

  if (bombTimer >= BOMB_INTERVAL) {
    createBomb();
    bombTimer = 0;
  }

  for (const bomb of bombs) {
    bomb.y += BOMB_SPEED * deltaTime;
    bomb.element.style.top = `${bomb.y}px`;

    if (hasCollision(bomb)) {
      endGame();
      return;
    }
  }

  bombs = bombs.filter((bomb) => {
    if (bomb.y <= gameArea.clientHeight) return true;
    bomb.element.remove();
    return false;
  });

  frameId = requestAnimationFrame(updateGame);
}

/** 충돌 후 게임을 멈추고 재시작 버튼을 표시합니다. */
function endGame() {
  isRunning = false;
  frameId = null;
  statusText.textContent = `게임 종료! ${Math.floor(elapsedTime)}초 생존했습니다.`;
  startButton.textContent = "다시 시작";
  startButton.hidden = false;
}

function setMovementKey(key, pressed) {
  if (key === "ArrowLeft" || key.toLowerCase() === "a") {
    keys.left = pressed;
    return true;
  }

  if (key === "ArrowRight" || key.toLowerCase() === "d") {
    keys.right = pressed;
    return true;
  }

  return false;
}

window.addEventListener("keydown", (event) => {
  if (isRunning && setMovementKey(event.key, true)) {
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  setMovementKey(event.key, false);
});

window.addEventListener("blur", () => {
  keys.left = false;
  keys.right = false;
});

startButton.addEventListener("click", startGame);