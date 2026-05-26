import * as THREE from "three";
import { Maze, CELL } from "./Maze.js";
import { FluorescentLights } from "./Lights.js";
import { Entity } from "./Entity.js";
import { Player } from "./Player.js";
import { HorrorAudio } from "./Audio.js";
import { PostFX } from "./PostFX.js";
import { HUD } from "./HUD.js";

const titleEl = document.getElementById("title");
const startBtn = document.getElementById("start-btn");
const endingEl = document.getElementById("ending");
const endingTitle = document.getElementById("ending-title");
const endingText = document.getElementById("ending-text");
const restartBtn = document.getElementById("restart-btn");

const canvasHost = document.getElementById("canvas");

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
canvasHost.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0904);
scene.fog = new THREE.FogExp2(0x0e0a04, 0.048);

const ambient = new THREE.AmbientLight(0x3a2e14, 0.18);
scene.add(ambient);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 80);
camera.position.set(0, 1.65, 0);

let maze, lights, entity, audio, postfx, hud, player;
let running = false;
let elapsed = 0;
let tension = 0;
let scareDone = false;
let scareTimer = -1;
let scareState = "none";
let dead = false;
let won = false;
let glitchCooldown = 5;

function init() {
  maze = new Maze(scene, { size: 22 });
  lights = new FluorescentLights(scene, maze.lightCells);
  entity = new Entity(scene);
  audio = new HorrorAudio();
  postfx = new PostFX(renderer, scene, camera);
  postfx.setSize(window.innerWidth, window.innerHeight);
  postfx.setIntensity(0);
  hud = new HUD();
  player = new Player(camera, renderer.domElement, maze);
  player.teleport(maze.playerStart);
}

function startRun() {
  titleEl.classList.add("nodisplay");
  endingEl.classList.remove("show");
  hud.activate();
  hud.setStatus("stable", "#e8d68a");
  hud.setObjective("FIND THE EXIT");
  hud.setDark(0);

  elapsed = 0;
  tension = 0;
  scareDone = false;
  scareTimer = -1;
  scareState = "none";
  dead = false;
  won = false;

  audio.start();
  audio.setTension(0);

  player.teleport(maze.playerStart);
  entity.hide();
  running = true;
  player.lock();

  setTimeout(() => {
    if (running) hud.showSubtitle("the carpet is still wet…", 5);
  }, 1500);
}

function endRun(winFlag) {
  if (!running) return;
  running = false;
  player.unlock();
  hud.deactivate();
  if (winFlag) {
    audio.win();
    endingTitle.textContent = "YOU NOCLIPPED OUT";
    endingText.innerHTML = "The hum is gone. The fluorescent buzz is gone.<br/>You can almost remember your own name.";
  } else {
    audio.death();
    endingTitle.textContent = "FOUND";
    endingText.innerHTML = "You felt its breath on your neck before you saw it.<br/>The lights came back on — but you didn't.";
  }
  setTimeout(() => endingEl.classList.add("show"), 600);
}

startBtn.addEventListener("click", () => {
  if (!maze) init();
  startRun();
});

restartBtn.addEventListener("click", () => {
  endingEl.classList.remove("show");
  scene.remove(maze.wallGroup);
  scene.remove(maze.floorMesh);
  scene.remove(maze.ceilingMesh);
  if (maze.exitMesh) scene.remove(maze.exitMesh);
  if (maze.exitLight) scene.remove(maze.exitLight);
  for (const L of lights.lights) {
    scene.remove(L.light);
    scene.remove(L.fixture);
  }
  scene.remove(entity.group);
  init();
  startRun();
});

window.addEventListener("resize", () => {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (postfx) postfx.setSize(w, h);
});

document.addEventListener("pointerlockchange", () => {
  if (running && !player.isLocked() && !dead && !won) {
    hud.showSubtitle("click to resume", 999);
  } else if (player.isLocked()) {
    hud.hideSubtitle();
  }
});

document.addEventListener("click", () => {
  if (running && !player.isLocked() && !dead && !won) {
    player.lock();
  }
});

let last = performance.now();

function loop(now) {
  const dt = Math.min(0.06, (now - last) / 1000);
  last = now;
  const t = now / 1000;

  if (running) {
    elapsed += dt;
    hud.setTime(elapsed);
    hud.update(dt);

    player.update(dt, (running) => {
      if (audio) audio.footstep();
    });

    const playerPos = player.getPosition();

    if (elapsed > 12 && tension < 0.35) tension = 0.35;
    if (elapsed > 45 && tension < 0.6) tension = 0.6;
    if (elapsed > 90 && tension < 0.85) tension = 0.85;
    if (entity.group.visible && entity.distanceTo(playerPos) < 6) tension = 1.0;
    audio.setTension(tension);

    postfx.setIntensity(tension);

    glitchCooldown -= dt;
    if (glitchCooldown <= 0 && Math.random() < 0.7) {
      audio.flickerBlip();
      glitchCooldown = 3 + Math.random() * 7;
    }

    if (elapsed > 30 && !entity.group.visible && !scareDone) {
      entity.spawnNear(maze, playerPos, 22, 32);
      hud.showSubtitle("you are not alone.", 4);
    }

    if (elapsed > 60 && !scareDone) {
      hud.setStatus("unstable", "#d68a4a");
    }

    if (elapsed > 80 && !scareDone && scareState === "none") {
      scareState = "warmup";
      scareTimer = 0;
      lights.triggerScare();
      hud.showSubtitle("the lights…", 2.5);
    }

    if (scareState === "warmup") {
      scareTimer += dt;
      if (scareTimer > 2.4) {
        scareState = "blackout";
        scareTimer = 0;
        lights.setGlobal(0);
        hud.setDark(0.96);
        audio.scareSting();
      }
    } else if (scareState === "blackout") {
      scareTimer += dt;
      if (scareTimer > 1.6) {
        scareState = "reveal";
        scareTimer = 0;
        entity.teleportBehind(playerPos, player.getYaw(), 4.5);
        lights.setGlobal(1);
        hud.setDark(0);
        hud.flash(0.85, 0.7);
      }
    } else if (scareState === "reveal") {
      scareTimer += dt;
      if (scareTimer > 1.2) {
        scareState = "done";
        scareDone = true;
        entity.spawnNear(maze, playerPos, 16, 22);
        hud.setStatus("compromised", "#d04a3a");
      }
    }

    lights.update(dt, t);
    maze.update(dt, t, playerPos);
    entity.update(dt, t, playerPos, maze);

    if (entity.group.visible) {
      const d = entity.distanceTo(playerPos);
      if (d < 1.3 && !dead && scareDone) {
        dead = true;
        hud.flash(0.95, 0.3);
        endRun(false);
      }
    }

    const exitDist = playerPos.distanceTo(maze.exitPos);
    if (exitDist < 1.4 && !won) {
      won = true;
      hud.flash(0.6, 1.2);
      endRun(true);
    }

    if (elapsed > 8 && Math.random() < dt * 0.18 && !entity.group.visible) {
      audio.distantStep(0.045 + Math.random() * 0.05);
    }
  }

  if (postfx) postfx.render(t);
  else renderer.render(scene, camera);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
