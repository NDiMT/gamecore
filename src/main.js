import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "./constants.js";
import { BootScene } from "./scenes/BootScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { roomState } from "./state/RoomState.js";
import { network } from "./network/Network.js";

const lobby = document.getElementById("lobby");
const roleScreen = document.getElementById("role");
const gameMount = document.getElementById("app");
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

let phaserGame = null;

function show(id) {
  ["lobby", "role", "game"].forEach((x) => {
    const el = document.getElementById(x);
    if (el) el.style.display = (x === id) ? "" : "none";
  });
}

createBtn.addEventListener("click", () => {
  createBtn.style.display = "none";
  createdInfo.style.display = "block";
  network.host((code) => {
    myCodeEl.textContent = code;
    createStatus.textContent = "Αναμονή συνεργάτη… κωδικός: " + code;
  });
});

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(myCodeEl.textContent);
    createStatus.textContent = "Κωδικός αντιγράφηκε";
  } catch (e) {
    createStatus.textContent = "Πάτα παρατεταμένα τον κωδικό για αντιγραφή";
  }
});

joinInput.addEventListener("input", (e) => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
});

joinBtn.addEventListener("click", () => {
  const code = joinInput.value.trim().toUpperCase();
  if (code.length < 4) { joinStatus.textContent = "Άκυρος κωδικός"; return; }
  network.join(code, (s) => joinStatus.innerHTML = s);
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
      roleHint.textContent = `Ο σύντροφος ξύπνησε στο ${theirs === "past" ? "1872" : "2287"}. Διάλεξε την άλλη εποχή.`;
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
  if (!phaserGame) {
    phaserGame = new Phaser.Game({
      type: Phaser.AUTO,
      parent: gameMount,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: "#06040c",
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [BootScene, GameScene],
      render: { antialias: true, pixelArt: false },
    });
  }
}
