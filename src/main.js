import { network } from "./network/Network.js";
import { roomState } from "./state/RoomState.js";
import { Scene3D } from "./engine/Scene3D.js";
import { ChamberSky } from "./world/ChamberSky.js";
import { ChamberRoot } from "./world/ChamberRoot.js";
import { StarMap } from "./entities/StarMap.js";
import { CombinationLock } from "./entities/CombinationLock.js";
import { CrystalTowers } from "./entities/CrystalTowers.js";
import { Gate } from "./entities/Gate.js";
import { HUD } from "./ui/HUD.js";
import { CHAMBER_SKY, CHAMBER_ROOT, PALETTE_SKY, PALETTE_ROOT } from "./constants.js";

const lobby = document.getElementById("lobby");
const roleScreen = document.getElementById("role");
const gameScreen = document.getElementById("game");
const createBtn = document.getElementById("create-btn");
const createdInfo = document.getElementById("created-info");
const myCodeEl = document.getElementById("my-code");
const createStatus = document.getElementById("create-status");
const copyBtn = document.getElementById("copy-btn");
const joinInput = document.getElementById("join-input");
const joinBtn = document.getElementById("join-btn");
const joinStatus = document.getElementById("join-status");
const roleHint = document.getElementById("role-hint");
const roleCards = document.querySelectorAll(".role-card");
const soloBtn = document.getElementById("solo-btn");

let scene3d = null;
let chamber = null;
let starMap = null;
let combo = null;
let towers = null;
let gate = null;
let hud = null;
let solo = false;

function showScreen(id) {
  lobby.style.display = id === "lobby" ? "flex" : "none";
  roleScreen.style.display = id === "role" ? "flex" : "none";
  gameScreen.style.display = id === "game" ? "block" : "none";
}

createBtn.addEventListener("click", () => {
  createBtn.style.display = "none";
  createdInfo.style.display = "block";
  network.host((code) => {
    myCodeEl.textContent = code;
    createStatus.textContent = "Αναμονή… κωδικός: " + code;
  });
});

copyBtn.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(myCodeEl.textContent); createStatus.textContent = "Αντιγράφηκε"; }
  catch (e) { createStatus.textContent = "Πάτα παρατεταμένα τον κωδικό για αντιγραφή"; }
});

joinInput.addEventListener("input", (e) => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
});

joinBtn.addEventListener("click", () => {
  const code = joinInput.value.trim().toUpperCase();
  if (code.length < 4) { joinStatus.textContent = "Άκυρος κωδικός"; return; }
  network.join(code, (s) => joinStatus.innerHTML = s);
});

soloBtn.addEventListener("click", () => {
  solo = true;
  roomState.setChamber(CHAMBER_SKY);
  startGame();
});

network.on((ev) => {
  if (ev.type === "open") {
    createStatus.textContent = "Σύντροφος συνδέθηκε!";
    joinStatus.textContent = "Συνδέθηκες!";
    setTimeout(() => showScreen("role"), 600);
  }
  if (ev.type === "data" && ev.msg && ev.msg.type === "chamber-claim") {
    const theirs = ev.msg.payload;
    const card = document.querySelector(`.role-card[data-chamber="${theirs}"]`);
    if (card) card.classList.add("taken");
    if (roleHint && !roomState.chamber) {
      const other = theirs === CHAMBER_SKY ? "Ριζών" : "Ουρανού";
      roleHint.textContent = `Ο σύντροφος ξύπνησε αλλού. Διάλεξε την Αίθουσα ${other}.`;
    }
  }
});

roleCards.forEach((card) => {
  card.addEventListener("click", () => {
    if (card.classList.contains("taken")) return;
    const ch = card.dataset.chamber;
    roomState.setChamber(ch);
    network.send("chamber-claim", ch);
    startGame();
  });
});

function startGame() {
  showScreen("game");
  roomState.attachNetwork();
  requestAnimationFrame(() => {
    const container = document.getElementById("game-canvas");
    const palette = roomState.chamber === CHAMBER_SKY ? PALETTE_SKY : PALETTE_ROOT;
    try {
      scene3d = new Scene3D(container, palette);
    } catch (e) {
      const err = document.getElementById("err");
      err.style.display = "block";
      err.textContent = "Scene3D init error: " + (e.stack || e.message);
      return;
    }
    rebuildScene();
    hud = new HUD(roomState);
    hud.setPeer(network.connected);
    if (solo) hud.showToast("Solo: 1=Ουρανός · 2=Ρίζες");

    roomState.on((ev) => {
      if (ev.type === "chamber") rebuildScene();
      if (ev.type === "star") starMap && starMap.refresh();
      if (ev.type === "stars-solved") { starMap && starMap.refresh(); combo && combo.refresh(); }
      if (ev.type === "disc") combo && combo.refresh();
      if (ev.type === "discs-solved") { combo && combo.refresh(); towers && towers.refresh(); }
      if (ev.type === "tower-correct" || ev.type === "tower-wrong") towers && towers.refresh();
      if (ev.type === "towers-solved") { towers && towers.refresh(); gate && gate.refresh(); }
      if (ev.type === "sync") {
        starMap && starMap.refresh();
        combo && combo.refresh();
        towers && towers.refresh();
        gate && gate.refresh();
      }
    });

    network.on((ev) => {
      if (ev.type === "open") hud.setPeer(true);
      if (ev.type === "close") hud.setPeer(false);
    });

    if (solo) {
      window.addEventListener("keydown", (e) => {
        if (e.key === "1") roomState.setChamber(CHAMBER_SKY);
        if (e.key === "2") roomState.setChamber(CHAMBER_ROOT);
      });
    }
  });
}

function rebuildScene() {
  if (!scene3d) return;
  if (chamber) chamber.destroy();
  if (starMap) starMap.destroy();
  if (combo) combo.destroy();
  if (towers) towers.destroy();
  if (gate) gate.destroy();
  scene3d.picker.clear();
  scene3d.tickers.length = 0;

  const palette = roomState.chamber === CHAMBER_SKY ? PALETTE_SKY : PALETTE_ROOT;
  scene3d.applyPalette(palette);
  if (scene3d.bloom) {
    scene3d.bloom.strength = roomState.chamber === CHAMBER_SKY ? 1.0 : 0.7;
    scene3d.bloom.radius = roomState.chamber === CHAMBER_SKY ? 0.65 : 0.45;
    scene3d.bloom.threshold = 0.55;
  }

  if (roomState.chamber === CHAMBER_SKY) {
    chamber = new ChamberSky(scene3d);
    starMap = new StarMap(scene3d, roomState, scene3d.picker);
    towers = new CrystalTowers(scene3d, roomState, scene3d.picker);
    gate = new Gate(scene3d, roomState, scene3d.picker, CHAMBER_SKY);
  } else {
    chamber = new ChamberRoot(scene3d);
    combo = new CombinationLock(scene3d, roomState, scene3d.picker);
    gate = new Gate(scene3d, roomState, scene3d.picker, CHAMBER_ROOT);
  }
}
