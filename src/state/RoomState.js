import { STAR_MAP_SIZE, STAR_MAP_SOLUTION, COMBO_DISCS, COMBO_SOLUTION, COMBO_SYMBOLS, TOWER_COUNT, TOWER_SEQUENCE, CHAMBER_SKY, CHAMBER_ROOT } from "../constants.js";
import { network } from "../network/Network.js";

export class RoomState {
  constructor() {
    this.chamber = null;
    this.stars = new Array(STAR_MAP_SIZE).fill(false);
    this.starsSolved = false;
    this.discs = new Array(COMBO_DISCS).fill(0);
    this.discsSolved = false;
    this.towerProgress = [];
    this.towersSolved = false;
    this.gateOpen = false;
    this.escaped = false;
    this.listeners = new Set();
  }

  attachNetwork() {
    network.on((ev) => {
      if (ev.type === "data") this.applyRemote(ev.msg);
      if (ev.type === "open") this.broadcastFull();
    });
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(ev) { for (const fn of this.listeners) fn(ev); }

  setChamber(ch) {
    this.chamber = ch;
    this.emit({ type: "chamber" });
  }

  toggleStar(idx, broadcast = true) {
    if (this.starsSolved) return;
    this.stars[idx] = !this.stars[idx];
    this.checkStars();
    this.emit({ type: "star", idx });
    if (broadcast) network.send("star", { idx, value: this.stars[idx] });
  }

  setStar(idx, value) {
    this.stars[idx] = !!value;
    this.checkStars();
    this.emit({ type: "star", idx });
  }

  checkStars() {
    if (this.starsSolved) return;
    const selected = this.stars.map((v, i) => v ? i : -1).filter(i => i >= 0).sort((a, b) => a - b);
    const target = [...STAR_MAP_SOLUTION].sort((a, b) => a - b);
    if (selected.length !== target.length) return;
    const ok = selected.every((v, i) => v === target[i]);
    if (ok) {
      this.starsSolved = true;
      this.emit({ type: "stars-solved" });
      network.send("stars-solved", {});
    }
  }

  rotateDisc(idx, broadcast = true) {
    if (!this.starsSolved) return;
    if (this.discsSolved) return;
    this.discs[idx] = (this.discs[idx] + 1) % COMBO_SYMBOLS.length;
    this.checkDiscs();
    this.emit({ type: "disc", idx });
    if (broadcast) network.send("disc", { idx, value: this.discs[idx] });
  }

  setDisc(idx, value) {
    this.discs[idx] = value;
    this.checkDiscs();
    this.emit({ type: "disc", idx });
  }

  checkDiscs() {
    if (this.discsSolved) return;
    const ok = COMBO_SOLUTION.every((v, i) => this.discs[i] === v);
    if (ok) {
      this.discsSolved = true;
      this.emit({ type: "discs-solved" });
      network.send("discs-solved", {});
    }
  }

  tapTower(idx, broadcast = true) {
    if (!this.discsSolved) return;
    if (this.towersSolved) return;
    const expectedIdx = this.towerProgress.length;
    const expected = TOWER_SEQUENCE[expectedIdx];
    if (idx === expected) {
      this.towerProgress.push(idx);
      this.emit({ type: "tower-correct", idx });
      if (this.towerProgress.length === TOWER_SEQUENCE.length) {
        this.towersSolved = true;
        this.gateOpen = true;
        this.emit({ type: "towers-solved" });
        if (broadcast) network.send("towers-solved", {});
      } else {
        if (broadcast) network.send("tower-correct", { idx, progress: this.towerProgress.length });
      }
    } else {
      this.towerProgress = [];
      this.emit({ type: "tower-wrong", idx });
      if (broadcast) network.send("tower-wrong", { idx });
    }
  }

  setTowerProgress(progress) {
    this.towerProgress = TOWER_SEQUENCE.slice(0, progress);
    this.emit({ type: "tower-correct", idx: -1 });
  }

  tryEscape(broadcast = true) {
    if (!this.gateOpen) { this.emit({ type: "gate-locked" }); return; }
    this.escaped = true;
    this.emit({ type: "escaped" });
    if (broadcast) network.send("escape", {});
  }

  applyRemote(msg) {
    if (!msg || !msg.type) return;
    const { type, payload } = msg;
    if (type === "star") this.setStar(payload.idx, payload.value);
    if (type === "stars-solved") { this.starsSolved = true; this.emit({ type: "stars-solved" }); }
    if (type === "disc") this.setDisc(payload.idx, payload.value);
    if (type === "discs-solved") { this.discsSolved = true; this.emit({ type: "discs-solved" }); }
    if (type === "tower-correct") this.setTowerProgress(payload.progress);
    if (type === "tower-wrong") { this.towerProgress = []; this.emit({ type: "tower-wrong", idx: payload.idx }); }
    if (type === "towers-solved") { this.towersSolved = true; this.gateOpen = true; this.emit({ type: "towers-solved" }); }
    if (type === "escape") { this.escaped = true; this.emit({ type: "escaped" }); }
    if (type === "full") this.applyFull(payload);
    if (type === "chat") this.emit({ type: "chat", text: payload, who: "them" });
  }

  applyFull(snap) {
    Object.assign(this, snap);
    this.emit({ type: "sync" });
  }

  broadcastFull() {
    network.send("full", {
      stars: this.stars,
      starsSolved: this.starsSolved,
      discs: this.discs,
      discsSolved: this.discsSolved,
      towerProgress: this.towerProgress,
      towersSolved: this.towersSolved,
      gateOpen: this.gateOpen,
      escaped: this.escaped,
    });
  }

  sendChat(text) { network.send("chat", text); this.emit({ type: "chat", text, who: "me" }); }
}

export const roomState = new RoomState();
