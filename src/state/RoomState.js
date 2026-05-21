import { CONSTELLATION_TARGET, CONSTELLATION_TOLERANCE, ALTAR_SOLUTION, CRYSTAL_SOLUTION, CHAMBER_SKY, CHAMBER_ROOT } from "../constants.js";
import { network } from "../network/Network.js";

export class RoomState {
  constructor() {
    this.chamber = null;
    this.stars = CONSTELLATION_TARGET.map((t) => ({
      x: t.x + (Math.random() - 0.5) * 4,
      y: t.y + (Math.random() - 0.5) * 2.5,
    }));
    this.constellationSolved = false;
    this.vaultOpen = false;
    this.altarSlots = [null, null, null];
    this.altarSolved = false;
    this.crystalRotations = [0, 0, 0];
    this.crystalSolved = false;
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

  moveStar(idx, dx, dy, broadcast = true) {
    if (this.constellationSolved) return;
    this.stars[idx].x += dx;
    this.stars[idx].y += dy;
    this.checkConstellation();
    this.emit({ type: "star", idx });
    if (broadcast) network.send("star", { idx, x: this.stars[idx].x, y: this.stars[idx].y });
  }

  setStar(idx, x, y) {
    this.stars[idx].x = x;
    this.stars[idx].y = y;
    this.checkConstellation();
    this.emit({ type: "star", idx });
  }

  checkConstellation() {
    if (this.constellationSolved) return;
    const ok = CONSTELLATION_TARGET.every((t, i) => {
      const s = this.stars[i];
      return Math.hypot(s.x - t.x, s.y - t.y) < CONSTELLATION_TOLERANCE;
    });
    if (ok) {
      this.constellationSolved = true;
      this.vaultOpen = true;
      this.emit({ type: "constellation-solved" });
      network.send("constellation-solved", {});
    }
  }

  placeSigil(slot, sigil, broadcast = true) {
    if (this.altarSolved) return;
    if (!this.vaultOpen) return;
    this.altarSlots[slot] = sigil;
    this.checkAltar();
    this.emit({ type: "altar", slot });
    if (broadcast) network.send("altar", { slot, sigil });
  }

  clearSigil(slot, broadcast = true) {
    if (this.altarSolved) return;
    this.altarSlots[slot] = null;
    this.emit({ type: "altar", slot });
    if (broadcast) network.send("altar", { slot, sigil: null });
  }

  checkAltar() {
    if (this.altarSolved) return;
    const ok = ALTAR_SOLUTION.every((s, i) => this.altarSlots[i] === s);
    if (ok) {
      this.altarSolved = true;
      this.emit({ type: "altar-solved" });
      network.send("altar-solved", {});
    }
  }

  rotateCrystal(idx, broadcast = true) {
    if (!this.altarSolved) return;
    if (this.crystalSolved) return;
    this.crystalRotations[idx] = (this.crystalRotations[idx] + 1) % 3;
    this.checkCrystal();
    this.emit({ type: "crystal", idx });
    if (broadcast) network.send("crystal", { idx });
  }

  checkCrystal() {
    if (this.crystalSolved) return;
    const ok = CRYSTAL_SOLUTION.every((v, i) => this.crystalRotations[i] === v);
    if (ok) {
      this.crystalSolved = true;
      this.gateOpen = true;
      this.emit({ type: "crystal-solved" });
      network.send("crystal-solved", {});
    }
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
    if (type === "star") this.setStar(payload.idx, payload.x, payload.y);
    if (type === "constellation-solved") {
      this.constellationSolved = true;
      this.vaultOpen = true;
      this.emit({ type: "constellation-solved" });
    }
    if (type === "altar") {
      this.altarSlots[payload.slot] = payload.sigil;
      this.checkAltar();
      this.emit({ type: "altar", slot: payload.slot });
    }
    if (type === "altar-solved") {
      this.altarSolved = true;
      this.emit({ type: "altar-solved" });
    }
    if (type === "crystal") {
      this.crystalRotations[payload.idx] = (this.crystalRotations[payload.idx] + 1) % 3;
      this.checkCrystal();
      this.emit({ type: "crystal", idx: payload.idx });
    }
    if (type === "crystal-solved") {
      this.crystalSolved = true;
      this.gateOpen = true;
      this.emit({ type: "crystal-solved" });
    }
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
      constellationSolved: this.constellationSolved,
      vaultOpen: this.vaultOpen,
      altarSlots: this.altarSlots,
      altarSolved: this.altarSolved,
      crystalRotations: this.crystalRotations,
      crystalSolved: this.crystalSolved,
      gateOpen: this.gateOpen,
      escaped: this.escaped,
    });
  }

  sendChat(text) { network.send("chat", text); this.emit({ type: "chat", text, who: "me" }); }
}

export const roomState = new RoomState();
