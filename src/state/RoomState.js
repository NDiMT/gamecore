import { POTS, SOLUTION, ERA_PAST, ERA_FUTURE } from "../constants.js";
import { network } from "../network/Network.js";

export class RoomState {
  constructor() {
    this.role = null;
    this.era = ERA_PAST;
    this.plantings = {};
    this.watered = {};
    this.selectedSeed = null;
    this.solved = false;
    this.listeners = new Set();
    this.suppressEmit = false;
  }

  attachNetwork() {
    network.on((ev) => {
      if (ev.type === "data") this.applyRemote(ev.msg);
      if (ev.type === "open") this.broadcastFull();
    });
  }

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(ev) {
    if (this.suppressEmit) return;
    for (const fn of this.listeners) fn(ev);
  }

  setRole(role) {
    this.role = role;
    if (role === "future") this.era = ERA_FUTURE; else this.era = ERA_PAST;
    this.emit({ type: "role", role });
    this.emit({ type: "era", era: this.era });
  }

  setEra(era) {
    this.era = era;
    this.emit({ type: "era", era });
  }

  selectSeed(seedType) {
    this.selectedSeed = this.selectedSeed === seedType ? null : seedType;
    this.emit({ type: "select", seedType: this.selectedSeed });
  }

  clearSelection() {
    this.selectedSeed = null;
    this.emit({ type: "select", seedType: null });
  }

  plantedAt(potId) {
    return this.plantings[potId] || null;
  }

  isWatered(potId) {
    return !!this.watered[potId];
  }

  potOfSeed(seedType) {
    for (const k in this.plantings) if (this.plantings[k] === seedType) return parseInt(k);
    return null;
  }

  plant(potId, seedType, broadcast = true) {
    const prev = this.potOfSeed(seedType);
    if (prev !== null) {
      delete this.plantings[prev];
      delete this.watered[prev];
    }
    this.plantings[potId] = seedType;
    this.watered[potId] = false;
    this.checkSolved();
    this.emit({ type: "plant", potId, seedType });
    if (broadcast) network.send("plant", { potId, seedType });
  }

  uproot(potId, broadcast = true) {
    if (!this.plantings[potId]) return;
    delete this.plantings[potId];
    delete this.watered[potId];
    this.checkSolved();
    this.emit({ type: "uproot", potId });
    if (broadcast) network.send("uproot", { potId });
  }

  water(potId, broadcast = true) {
    if (!this.plantings[potId]) return;
    this.watered[potId] = true;
    this.checkSolved();
    this.emit({ type: "water", potId });
    if (broadcast) network.send("water", { potId });
  }

  checkSolved() {
    const wasSolved = this.solved;
    const ok = Object.entries(SOLUTION).every(([placement, seedType]) => {
      const pot = POTS.find((p) => p.placement === placement);
      return pot && this.plantings[pot.id] === seedType && this.watered[pot.id];
    });
    this.solved = ok;
    if (ok && !wasSolved) this.emit({ type: "solved" });
    if (!ok && wasSolved) this.emit({ type: "unsolved" });
  }

  reset(broadcast = true) {
    this.plantings = {};
    this.watered = {};
    this.selectedSeed = null;
    this.solved = false;
    this.emit({ type: "reset" });
    if (broadcast) network.send("reset", {});
  }

  applyRemote(msg) {
    if (!msg || !msg.type) return;
    const { type, payload } = msg;
    if (type === "plant")  this.plant(payload.potId, payload.seedType, false);
    if (type === "uproot") this.uproot(payload.potId, false);
    if (type === "water")  this.water(payload.potId, false);
    if (type === "reset")  this.reset(false);
    if (type === "full")   this.applyFull(payload);
    if (type === "chat")   this.emit({ type: "chat", text: payload, who: "them" });
  }

  applyFull(snap) {
    this.plantings = snap.plantings || {};
    this.watered = snap.watered || {};
    this.checkSolved();
    this.emit({ type: "sync" });
  }

  broadcastFull() {
    network.send("full", { plantings: this.plantings, watered: this.watered });
  }

  sendChat(text) {
    network.send("chat", text);
    this.emit({ type: "chat", text, who: "me" });
  }
}

export const roomState = new RoomState();
