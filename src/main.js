import { network } from "./network/Network.js";
import { roomState } from "./state/RoomState.js";
import { Scene3D } from "./engine/Scene3D.js";
import { Room } from "./world/Room.js";
import { Dials } from "./entities/Dials.js";
import { Plates } from "./entities/Plates.js";
import { Levers } from "./entities/Levers.js";
import { Door } from "./entities/Door.js";
import { HUD } from "./ui/HUD.js";
import { ERA_PAST, ERA_FUTURE } from "./constants.js";

const lobby = document.getElementById("lobby");
const roleScreen = document.getElementById("role");
const game = document.getElementById("game");
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
let room = null;
let dials = null;
let plates = null;
let levers = null;
let door = null;
let hud = null;
let solo = false;

function show(id) {
  lobby.style.display = id === "lobby" ? "flex" : "none";
  roleScreen.style.display = id === "role" ? "flex" : "none";
  game.style.display = id === "game" ? "block" : "none";
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
  roomState.setRole("past");
  startGame();
});

network.on((ev) => {
  if (ev.type === "open") {
    createStatus.textContent = "Συνεργάτης συνδέθηκε!";
    joinStatus.textContent = "Συνδέθηκες!";
    setTimeout(() => show("role"), 600);
  }
  if (ev.type === "data" && ev.msg && ev.msg.type === "role-claim") {
    const theirs = ev.msg.payload;
    const card = document.querySelector(`.role-card[data-role="${theirs}"]`);
    if (card) card.classList.add("taken");
    if (roleHint && !roomState.role) {
      roleHint.textContent = `Σύντροφος στο ${theirs === "past" ? "1872" : "2287"}. Διάλεξε την άλλη.`;
    }
  }
});

roleCards.forEach((card) => {
  card.addEventListener("click", () => {
    if (card.classList.contains("taken")) return;
    const role = card.dataset.role;
    roomState.setRole(role);
    network.send("role-claim", role);
    startGame();
  });
});

function startGame() {
  show("game");
  roomState.attachNetwork();
  requestAnimationFrame(() => {
    const container = document.getElementById("game-canvas");
    scene3d = new Scene3D(container);
    rebuildEra();
    hud = new HUD(roomState);
    hud.setPeer(network.connected);
    if (solo) hud.showToast("Solo mode: 1/2 αλλαγή εποχής");

    roomState.on((ev) => {
      if (ev.type === "era") rebuildEra();
      if (ev.type === "dial") dials.refresh();
      if (ev.type === "plate") plates.refresh();
      if (ev.type === "lever") levers.refresh();
      if (ev.type === "fragment") { door.refresh(); hud.showToast(fragMsg(ev.which)); }
      if (ev.type === "sync") { dials.refresh(); plates.refresh(); levers.refresh(); door.refresh(); }
      if (ev.type === "doorOpen") { door.refresh(); hud.showToast("Η πύλη άνοιξε."); }
      if (ev.type === "doorLocked") hud.showToast("Λείπουν θραύσματα.");
      if (ev.type === "chat") hud.appendChat(ev.text, ev.who === "me" ? "mine" : "them");
    });
    network.on((ev) => {
      if (ev.type === "open") hud.setPeer(true);
      if (ev.type === "close") hud.setPeer(false);
    });

    if (solo) {
      window.addEventListener("keydown", (e) => {
        if (e.key === "1") roomState.setEra(ERA_PAST);
        if (e.key === "2") roomState.setEra(ERA_FUTURE);
      });
    }
  });
}

function rebuildEra() {
  if (!scene3d) return;
  if (room) room.destroy();
  if (dials) dials.destroy();
  if (plates) plates.destroy();
  if (levers) levers.destroy();
  if (door) door.destroy();
  scene3d.setEra(roomState.era);
  scene3d.applyEraLights();
  const era = roomState.era;
  room = new Room(scene3d, era);
  dials = new Dials(scene3d, roomState, era, scene3d.picker);
  plates = new Plates(scene3d, roomState, era, scene3d.picker);
  levers = new Levers(scene3d, roomState, era, scene3d.picker);
  door = new Door(scene3d, roomState, era, scene3d.picker);
  scene3d.tickers.length = 0;
  scene3d.tick((dt) => door.tick(dt));
}

function fragMsg(which) {
  if (which === "dial")  return "✦ Πρώτο θραύσμα ξεκλείδωσε.";
  if (which === "plate") return "✦ Δεύτερο θραύσμα ξεκλείδωσε.";
  if (which === "lever") return "✦ Τρίτο θραύσμα ξεκλείδωσε.";
  return "";
}
