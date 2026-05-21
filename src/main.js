import { network } from "./network/Network.js";
import { roomState } from "./state/RoomState.js";
import { Scene3D } from "./engine/Scene3D.js";
import { ChamberSky } from "./world/ChamberSky.js";
import { ChamberRoot } from "./world/ChamberRoot.js";
import { Constellation } from "./entities/Constellation.js";
import { Vault } from "./entities/Vault.js";
import { Altar } from "./entities/Altar.js";
import { Crystal } from "./entities/Crystal.js";
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
let constellation = null;
let vault = null;
let altar = null;
let crystal = null;
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
    scene3d = new Scene3D(container, palette);
    rebuildScene();
    hud = new HUD(roomState);
    hud.setPeer(network.connected);
    if (solo) hud.showToast("Solo: 1=Ουρανός · 2=Ρίζες");

    roomState.on((ev) => {
      if (ev.type === "chamber") rebuildScene();
      if (ev.type === "star") constellation && constellation.refresh();
      if (ev.type === "constellation-solved") {
        constellation && constellation.refresh();
        vault && vault.refresh();
      }
      if (ev.type === "altar") altar && altar.refresh();
      if (ev.type === "altar-solved") {
        altar && altar.refresh();
        crystal && crystal.refresh();
      }
      if (ev.type === "crystal" || ev.type === "crystal-solved") {
        crystal && crystal.refresh();
        gate && gate.refresh();
      }
      if (ev.type === "sync") {
        constellation && constellation.refresh();
        vault && vault.refresh();
        altar && altar.refresh();
        crystal && crystal.refresh();
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
  if (constellation) constellation.destroy();
  if (vault) vault.destroy();
  if (altar) altar.destroy();
  if (crystal) crystal.destroy();
  if (gate) gate.destroy();
  scene3d.picker.clear();
  scene3d.tickers.length = 0;

  const palette = roomState.chamber === CHAMBER_SKY ? PALETTE_SKY : PALETTE_ROOT;
  scene3d.applyPalette(palette);

  if (roomState.chamber === CHAMBER_SKY) {
    chamber = new ChamberSky(scene3d);
    constellation = new Constellation(scene3d, roomState, scene3d.picker);
    crystal = new Crystal(scene3d, roomState, scene3d.picker);
    gate = new Gate(scene3d, roomState, scene3d.picker, CHAMBER_SKY);
  } else {
    chamber = new ChamberRoot(scene3d);
    vault = new Vault(scene3d, roomState, scene3d.picker);
    altar = new Altar(scene3d, roomState, scene3d.picker);
    gate = new Gate(scene3d, roomState, scene3d.picker, CHAMBER_ROOT);
  }
}
