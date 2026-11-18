const canvas = document.getElementById("flower");
const ctx = canvas.getContext("2d");

canvas.width = 900;
canvas.height = 1000;
canvas.style.touchAction = "none";
canvas.style.cursor = "grab";

const reducedMotion = matchMedia(
  "(prefers-reduced-motion: reduce)"
);

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

function smoothstep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

// --------------------------------------------------
// MUSIC
// --------------------------------------------------

const playlist = [
  {
    file: "WUSYANAME.mp3",
    title: "WUSYANAME",
    artist: "Tyler, The Creator"
  },
  {
    file: "Te Estoy Correteando.mp3",
    title: "Te Estoy Correteando",
    artist: "LATIN MAFIA, Fred again.."
  },
  {
    file: "Secondhand.mp3",
    title: "Secondhand",
    artist: "Don Toliver"
  },
  {
    file: "When I’m Into You.mp3",
    title: "When I’m Into You",
    artist: "GOBAITH"
  }
];

const audio = document.getElementById("audio");
const playButton = document.getElementById("play");
const seek = document.getElementById("seek");
const musicStatus = document.getElementById("music-status");
const reactToggle = document.getElementById("react");
const animationStatus =
  document.getElementById("animation-status");

let trackIndex = 0;
let audioContext;
let analyser;
let spectrum;

let bass = 0;
let bassBaseline = 0;
let previousBassLevel = 0;
let bassPeak = 0.025;

function setupAudio() {
  if (audioContext) return;

  audioContext = new AudioContext();

  const source = audioContext.createMediaElementSource(audio);

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.15;

  spectrum = new Float32Array(analyser.frequencyBinCount);

  source.connect(analyser);
  analyser.connect(audioContext.destination);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";

  return (
    Math.floor(seconds / 60) +
    ":" +
    String(Math.floor(seconds % 60)).padStart(2, "0")
  );
}

function loadTrack(index) {
  trackIndex = (index + playlist.length) % playlist.length;

  const track = playlist[trackIndex];

  bass = 0;
  bassBaseline = 0;
  previousBassLevel = 0;
  bassPeak = 0.025;

  audio.src = `music/${encodeURIComponent(track.file)}`;
  audio.load();

  document.getElementById("track-title").textContent =
    track.title;

  document.getElementById("track-artist").textContent =
    track.artist;

  seek.value = 0;
  seek.disabled = true;

  document.getElementById("current-time").textContent = "0:00";
  document.getElementById("duration").textContent = "0:00";

  musicStatus.textContent = "Ready to play.";
}

async function playMusic() {
  try {
    setupAudio();
    await audioContext.resume();
    await audio.play();
  } catch (error) {
    musicStatus.textContent =
      "Could not play. Check the song filename.";

    console.error(error);
  }
}

playButton.addEventListener("click", () => {
  if (audio.paused) {
    playMusic();
  } else {
    audio.pause();
  }
});

document.getElementById("previous").addEventListener("click", () => {
  loadTrack(trackIndex - 1);
  playMusic();
});

document.getElementById("next").addEventListener("click", () => {
  loadTrack(trackIndex + 1);
  playMusic();
});

audio.addEventListener("play", () => {
  playButton.textContent = "❚❚";
  playButton.setAttribute("aria-label", "Pause music");
  musicStatus.textContent = "Playing";
});

audio.addEventListener("pause", () => {
  playButton.textContent = "▶";
  playButton.setAttribute("aria-label", "Play music");
  musicStatus.textContent = "Music paused";
});

audio.addEventListener("ended", () => {
  loadTrack(trackIndex + 1);
  playMusic();
});

audio.addEventListener("error", () => {
  musicStatus.textContent =
    `Cannot load "${playlist[trackIndex].file}".`;
});

audio.addEventListener("loadedmetadata", () => {
  seek.disabled = !Number.isFinite(audio.duration);

  document.getElementById("duration").textContent =
    formatTime(audio.duration);
});

audio.addEventListener("timeupdate", () => {
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    seek.value = audio.currentTime / audio.duration * 100;
  }

  document.getElementById("current-time").textContent =
    formatTime(audio.currentTime);
});

seek.addEventListener("input", () => {
  if (Number.isFinite(audio.duration)) {
    audio.currentTime =
      Number(seek.value) / 100 * audio.duration;
  }
});

// Analyse bass without displaying its percentage.
function updateBass(dt) {
  let target = 0;

  if (
    analyser &&
    audioContext.state === "running" &&
    !audio.paused &&
    reactToggle.checked
  ) {
    analyser.getFloatFrequencyData(spectrum);

    const binWidth =
      audioContext.sampleRate / analyser.fftSize;

    const first = Math.max(1, Math.ceil(35 / binWidth));
    const last = Math.min(
      spectrum.length - 1,
      Math.floor(220 / binWidth)
    );

    let power = 0;
    let count = 0;

    for (let i = first; i <= last; i++) {
      const decibels = spectrum[i];

      if (Number.isFinite(decibels)) {
        power += Math.pow(10, decibels / 10);
      }

      count++;
    }

    const level = Math.sqrt(power / Math.max(1, count));

    bassBaseline +=
      (level - bassBaseline) * (1 - Math.exp(-dt * 2));

    const surge = Math.max(
      0,
      level - bassBaseline * 0.8
    );

    const rise = Math.max(0, level - previousBassLevel);
    previousBassLevel = level;

    bassPeak = Math.max(
      0.0005,
      bassPeak * Math.exp(-dt * 0.8),
      surge
    );

    const activity =
      surge / bassPeak * 0.65 +
      rise / bassPeak * 1.8;

    target = level > 0.00005
      ? clamp(activity, 0, 1)
      : 0;
  }

  const rate = target > bass ? 35 : 9;

  bass +=
    (target - bass) * (1 - Math.exp(-dt * rate));
}

loadTrack(0);

// --------------------------------------------------
// FLOWER GEOMETRY
// --------------------------------------------------

const goldenAngle = Math.PI * (3 - Math.sqrt(5));
const points = [];

const flowers = [
  { x: -150, y: -205, z: -55, hue: 38, scale: 0.60, delay: 0 },
  { x: 135, y: -190, z: -65, hue: 15, scale: 0.62, delay: 250 },
  { x: 0, y: -280, z: -85, hue: 325, scale: 0.57, delay: 500 },
  { x: -205, y: -55, z: 10, hue: 345, scale: 0.58, delay: 750 },
  { x: 190, y: -35, z: 20, hue: 45, scale: 0.60, delay: 1000 },
  { x: -85, y: 65, z: 75, hue: 22, scale: 0.65, delay: 1250 },
  { x: 85, y: 100, z: 100, hue: 335, scale: 0.63, delay: 1500 }
];

flowers.forEach((flower, flowerIndex) => {
  for (let i = 0; i < 420; i++) {
    const fraction = i / 419;
    const angle = i * goldenAngle;
    const radius = 65 * Math.sqrt(fraction);

    points.push({
      type: "centre",
      flowerIndex,
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
      z: 18 + 22 * (1 - fraction),
      colour: `hsl(38, 85%, ${16 + fraction * 44}%)`
    });
  }

  function addPetal(angle, length, width, layer) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    for (let step = 0; step <= 32; step++) {
      const u = step / 32;

      const halfWidth =
        width * Math.sqrt(
          Math.max(0, 1 - (2 * u - 1) ** 2)
        );

      for (let across = -4; across <= 4; across++) {
        const v = across / 4;

        points.push({
          type: "petal",
          flowerIndex,
          layer,
          cos,
          sin,
          along: length * u,
          sideways: halfWidth * v,
          curve:
            25 * u * u +
            10 * v * v * Math.sin(Math.PI * u),
          colour: `hsl(
            ${flower.hue + layer * 5},
            85%,
            ${
              49 + 20 * u -
              10 * Math.abs(v) +
              3 * Math.cos(u * 25)
            }%
          )`
        });
      }
    }
  }

  for (let i = 0; i < 36; i++) {
    addPetal(i * Math.PI * 2 / 36, 205, 18, 0);
  }

  for (let i = 0; i < 30; i++) {
    addPetal(
      (i + 0.5) * Math.PI * 2 / 30,
      155,
      15,
      1
    );
  }

  for (let step = 0; step <= 140; step++) {
    const t = step / 140;

    for (let side = 0; side < 6; side++) {
      const angle = side / 6 * Math.PI * 2;

      points.push({
        type: "stem",
        x:
          flower.x * (1 - t) +
          (flowerIndex - 3) * 5 * t +
          Math.sin(Math.PI * t) * 20 +
          3 * Math.cos(angle),
        y: flower.y * (1 - t) + 420 * t,
        z:
          (flower.z - 30) * (1 - t) -
          30 * t +
          3 * Math.sin(angle),
        colour: `hsl(
          115,
          50%,
          ${29 + 9 * Math.cos(angle)}%
        )`
      });
    }
  }
});

// --------------------------------------------------
// LEAVES
// --------------------------------------------------

function addLeaf(baseX, baseY, direction, length, depth) {
  for (let step = 0; step <= 45; step++) {
    const u = step / 45;
    const halfWidth = 27 * Math.sin(Math.PI * u);

    for (let across = -6; across <= 6; across++) {
      const v = across / 6;

      points.push({
        type: "leaf",
        x: baseX + direction * length * u,
        y: baseY - 65 * u + halfWidth * v,
        z:
          depth +
          22 * Math.sin(Math.PI * u) * (1 - v * v),
        colour: `hsl(
          115,
          48%,
          ${27 + 13 * (1 - Math.abs(v))}%
        )`
      });
    }
  }
}

addLeaf(-15, 260, -1, 145, -15);
addLeaf(15, 315, 1, 125, 0);
addLeaf(0, 360, -1, 95, 5);

// --------------------------------------------------
// STARS
// --------------------------------------------------

const stars = Array.from({ length: 450 }, () => {
  const angle = Math.random() * Math.PI * 2;
  const vertical = Math.random() * 2 - 1;
  const horizontal = Math.sqrt(1 - vertical * vertical);

  const radius = Math.cbrt(
    650 ** 3 +
    Math.random() * (1100 ** 3 - 650 ** 3)
  );

  return {
    x: radius * horizontal * Math.cos(angle),
    y: radius * vertical,
    z: radius * horizontal * Math.sin(angle),
    size: 0.7 + Math.random() * 1.1,
    phase: Math.random() * Math.PI * 2
  };
});

// --------------------------------------------------
// BLOOM STATE
// --------------------------------------------------

let bloomTime = 0;
let visualTime = 0;

let paused = false;
let fullyBloomed = false;
let frozenBass = 0;

const closeStart = 7050;
const cycleDuration = 10350;

function showAnimationStatus() {
  animationStatus.textContent = fullyBloomed
    ? "Fully bloomed"
    : paused
      ? "Paused"
      : "Blooming";
}

function toggleBloom() {
  if (fullyBloomed) {
    fullyBloomed = false;
    paused = false;
    bloomTime = 0;
  } else {
    if (!paused) frozenBass = bass;
    paused = !paused;
  }

  showAnimationStatus();
}

function holdFullyBloomed() {
  fullyBloomed = true;
  paused = false;
  showAnimationStatus();
}

function getOpening(flower, layer) {
  if (fullyBloomed) return 1;

  const phase = bloomTime % cycleDuration;
  const delay = flower.delay + layer * 350;

  return phase < closeStart
    ? smoothstep((phase - delay) / 3000)
    : 1 - smoothstep((phase - closeStart) / 2600);
}

// --------------------------------------------------
// ROTATION
// --------------------------------------------------

let orientation = [0, 0, 0, 1];
let zoom = 1;
let lastInteraction = performance.now();

function multiplyQuaternions(a, b) {
  return [
    a[3] * b[0] + a[0] * b[3] +
      a[1] * b[2] - a[2] * b[1],

    a[3] * b[1] - a[0] * b[2] +
      a[1] * b[3] + a[2] * b[0],

    a[3] * b[2] + a[0] * b[1] -
      a[1] * b[0] + a[2] * b[3],

    a[3] * b[3] - a[0] * b[0] -
      a[1] * b[1] - a[2] * b[2]
  ];
}

function rotateOrientation(axisX, axisY, axisZ, angle) {
  const sine = Math.sin(angle / 2);

  orientation = multiplyQuaternions(
    [
      axisX * sine,
      axisY * sine,
      axisZ * sine,
      Math.cos(angle / 2)
    ],
    orientation
  );

  const length = Math.hypot(...orientation);

  orientation = orientation.map(
    value => value / length
  );
}

function getRotationMatrix() {
  const [x, y, z, w] = orientation;

  return [
    1 - 2 * (y * y + z * z),
    2 * (x * y - z * w),
    2 * (x * z + y * w),

    2 * (x * y + z * w),
    1 - 2 * (x * x + z * z),
    2 * (y * z - x * w),

    2 * (x * z - y * w),
    2 * (y * z + x * w),
    1 - 2 * (x * x + y * y)
  ];
}

// --------------------------------------------------
// TAP, DRAG AND PINCH
// --------------------------------------------------

const pointers = new Map();

let gestureMoved = false;
let gestureMultiple = false;
let lastPinch = 0;
let tapTimer = null;
let lastTap = null;

function clearPendingTap() {
  if (tapTimer !== null) {
    clearTimeout(tapTimer);
  }

  tapTimer = null;
  lastTap = null;
}

function handleTap(x, y) {
  const now = performance.now();

  if (
    lastTap &&
    now - lastTap.time <= 320 &&
    Math.hypot(x - lastTap.x, y - lastTap.y) < 35
  ) {
    clearPendingTap();
    holdFullyBloomed();
    return;
  }

  if (tapTimer !== null) {
    clearTimeout(tapTimer);
    toggleBloom();
  }

  lastTap = { x, y, time: now };

  tapTimer = setTimeout(() => {
    tapTimer = null;
    lastTap = null;
    toggleBloom();
  }, 320);
}

function pinchDistance() {
  const values = [...pointers.values()];

  return Math.hypot(
    values[0].x - values[1].x,
    values[0].y - values[1].y
  );
}

canvas.addEventListener("pointerdown", event => {
  if (
    event.pointerType === "mouse" &&
    event.button !== 0
  ) return;

  if (pointers.size === 0) {
    gestureMoved = false;
    gestureMultiple = false;
  }

  pointers.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY,
    startX: event.clientX,
    startY: event.clientY,
    time: performance.now()
  });

  canvas.setPointerCapture(event.pointerId);

  if (pointers.size > 1) {
    gestureMultiple = true;
    clearPendingTap();
    lastPinch = pinchDistance();
  }

  canvas.style.cursor = "grabbing";
  lastInteraction = performance.now();
});

canvas.addEventListener("pointermove", event => {
  const pointer = pointers.get(event.pointerId);
  if (!pointer) return;

  const dx = event.clientX - pointer.x;
  const dy = event.clientY - pointer.y;

  pointer.x = event.clientX;
  pointer.y = event.clientY;

  if (
    !gestureMoved &&
    Math.hypot(
      pointer.x - pointer.startX,
      pointer.y - pointer.startY
    ) > 7
  ) {
    gestureMoved = true;
    clearPendingTap();
  }

  if (pointers.size === 1 && gestureMoved) {
    const movement = Math.hypot(dx, dy);
    const bounds = canvas.getBoundingClientRect();

    if (movement > 0) {
      rotateOrientation(
        -dy / movement,
        dx / movement,
        0,
        movement /
          Math.min(bounds.width, bounds.height) *
          Math.PI
      );
    }
  } else if (pointers.size === 2) {
    const distance = pinchDistance();

    if (lastPinch > 0) {
      zoom = clamp(
        zoom * distance / lastPinch,
        0.5,
        1.8
      );
    }

    lastPinch = distance;
  }

  lastInteraction = performance.now();
});

function finishPointer(event, cancelled = false) {
  const pointer = pointers.get(event.pointerId);
  if (!pointer) return;

  const isTap =
    !cancelled &&
    !gestureMoved &&
    !gestureMultiple &&
    performance.now() - pointer.time < 600 &&
    Math.hypot(
      event.clientX - pointer.startX,
      event.clientY - pointer.startY
    ) <= 7;

  pointers.delete(event.pointerId);

  lastPinch = 0;
  lastInteraction = performance.now();

  if (isTap) {
    handleTap(event.clientX, event.clientY);
  }

  if (pointers.size === 0) {
    canvas.style.cursor = "grab";
  }
}

canvas.addEventListener("pointerup", event => {
  finishPointer(event);
});

canvas.addEventListener("pointercancel", event => {
  finishPointer(event, true);
});

canvas.addEventListener("lostpointercapture", event => {
  finishPointer(event, true);
});

canvas.addEventListener("dblclick", event => {
  event.preventDefault();
});

canvas.addEventListener("wheel", event => {
  event.preventDefault();
  clearPendingTap();

  const delta = event.deltaY * (
    event.deltaMode === 1
      ? 16
      : event.deltaMode === 2
        ? canvas.clientHeight
        : 1
  );

  zoom = clamp(
    zoom * Math.exp(-delta * 0.001),
    0.5,
    1.8
  );

  lastInteraction = performance.now();
}, { passive: false });

// --------------------------------------------------
// ASCII RENDERING
// --------------------------------------------------

const cellWidth = 7;
const cellHeight = 10;

const columns = Math.ceil(canvas.width / cellWidth);
const rows = Math.ceil(canvas.height / cellHeight);
const cellCount = columns * rows;

const depths = new Float32Array(cellCount);
const colours = new Array(cellCount);
const characters = ".:+*oO#@";

ctx.font = "10px monospace";
ctx.textAlign = "center";
ctx.textBaseline = "middle";

const cameraDistance = 1800;
let previousTime = null;

function animate(time) {
  const dt = previousTime === null
    ? 0
    : Math.min((time - previousTime) / 1000, 0.05);

  previousTime = time;

  updateBass(dt);

  if (!paused) {
    if (!fullyBloomed) {
      bloomTime =
        (bloomTime + dt * 1000) % cycleDuration;
    }

    visualTime += dt * 1000;
  }

  if (
    !paused &&
    !reducedMotion.matches &&
    pointers.size === 0 &&
    time - lastInteraction > 3000
  ) {
    rotateOrientation(0, 1, 0, dt * 0.10);
  }

  const matrix = getRotationMatrix();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  depths.fill(-Infinity);

  // Stars.
  ctx.save();
  ctx.fillStyle = "#e4eaff";

  for (const star of stars) {
    const x =
      matrix[0] * star.x +
      matrix[1] * star.y +
      matrix[2] * star.z;

    const y =
      matrix[3] * star.x +
      matrix[4] * star.y +
      matrix[5] * star.z;

    const z =
      matrix[6] * star.x +
      matrix[7] * star.y +
      matrix[8] * star.z;

    const perspective =
      cameraDistance / (cameraDistance - z);

    const twinkle = reducedMotion.matches
      ? 0.6
      : 0.6 +
        0.4 * Math.sin(
          visualTime / 1300 + star.phase
        );

    ctx.globalAlpha = 0.15 + twinkle * 0.45;

    ctx.beginPath();

    ctx.arc(
      canvas.width / 2 + x * perspective * zoom,
      canvas.height / 2 + y * perspective * zoom,
      clamp(star.size * perspective, 0.4, 2.5),
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  ctx.restore();

  const pulse = paused ? frozenBass : bass;

  const folds = flowers.map(flower =>
    [0, 1].map(layer => {
      const opening = getOpening(flower, layer);
      const reaction = pulse * opening;

      const angle =
        (1 - opening) * 1.48 -
        reaction * 0.55;

      return {
        opening,
        reaction,
        cos: Math.cos(angle),
        sin: Math.sin(angle)
      };
    })
  );

  for (const point of points) {
    let x;
    let y;
    let z;

    if (point.type === "petal") {
      const fold =
        folds[point.flowerIndex][point.layer];

      const radius =
        48 +
        point.along *
        fold.cos *
        (1 + fold.reaction * 0.35);

      const sideways =
        point.sideways *
        (0.45 + 0.55 * fold.opening) *
        (1 + fold.reaction * 0.12);

      x =
        radius * point.cos -
        sideways * point.sin;

      y =
        radius * point.sin +
        sideways * point.cos;

      z =
        -8 +
        point.along * fold.sin +
        fold.opening * point.curve +
        point.layer * 7;
    } else {
      x = point.x;
      y = point.y;
      z = point.z;
    }

    if (
      point.type === "petal" ||
      point.type === "centre"
    ) {
      const flower = flowers[point.flowerIndex];

      x = flower.x + x * flower.scale;
      y = flower.y + y * flower.scale;
      z = flower.z + z * flower.scale;
    }

    y -= 30;

    const rotatedX =
      matrix[0] * x +
      matrix[1] * y +
      matrix[2] * z;

    const rotatedY =
      matrix[3] * x +
      matrix[4] * y +
      matrix[5] * z;

    const rotatedZ =
      matrix[6] * x +
      matrix[7] * y +
      matrix[8] * z;

    const perspective =
      cameraDistance / (cameraDistance - rotatedZ);

    const column = Math.floor(
      (
        canvas.width / 2 +
        rotatedX * perspective * zoom
      ) / cellWidth
    );

    const row = Math.floor(
      (
        canvas.height / 2 +
        rotatedY * perspective * zoom
      ) / cellHeight
    );

    if (
      column < 0 ||
      column >= columns ||
      row < 0 ||
      row >= rows
    ) continue;

    const index = row * columns + column;

    if (rotatedZ > depths[index]) {
      depths[index] = rotatedZ;
      colours[index] = point.colour;
    }
  }

  // Draw characters.
  for (let index = 0; index < cellCount; index++) {
    if (depths[index] === -Infinity) continue;

    const column = index % columns;
    const row = Math.floor(index / columns);

    const character = characters[
      Math.abs(column * 3 + row * 7) %
      characters.length
    ];

    ctx.fillStyle = "#080c0b";

    ctx.fillRect(
      column * cellWidth,
      row * cellHeight,
      cellWidth,
      cellHeight
    );

    ctx.fillStyle = colours[index];

    ctx.fillText(
      character,
      column * cellWidth + cellWidth / 2,
      row * cellHeight + cellHeight / 2
    );
  }

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);