import { ERA_PAST, ERA_FUTURE, DIAL_SOLUTION, PLATE_SOLUTION, LEVER_SOLUTION } from "../constants.js";
import { network } from "../network/Network.js";

export class RoomState {
  constructor() {
    this.role = null;
    this.era = ERA_PAST;
    this.dials = [0, 0, 0];
    this.dialsLocked = false;
    this.plates = [false, false, false, false];
    this.platesLocked = false;
    this.levers = ["down", "down", "down"];
    this.leversLocked = false;
    this.fragments = { dial: false, plate: false, lever: false };
    this.doorOpen = false;
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

  setRole(role) {
    this.role = role;
    this.era = role === "future" ? ERA_FUTURE : ERA_PAST;
    this.emit({ type: "role" });
    this.emit({ type: "era" });
  }

  setEra(era) {
    this.era = era;
    this.emit({ type: "era" });
  }

  rotateDial(idx, broadcast = true) {
    if (this.dialsLocked) return;
    this.dials[idx] = (this.dials[idx] + 1) % 10;
    this.checkDials();
    this.emit({ type: "dial", idx });
    if (broadcast) network.send("dial", { idx });
  }

  checkDials() {
    const ok = DIAL_SOLUTION.every((v, i) => this.dials[i] === v);
    if (ok && !this.dialsLocked) {
      this.dialsLocked = true;
      this.fragments.dial = true;
      this.emit({ type: "fragment", which: "dial" });
    }
  }

  togglePlate(idx, broadcast = true) {
    if (this.platesLocked) return;
    this.plates[idx] = !this.plates[idx];
    this.checkPlates();
    this.emit({ type: "plate", idx });
    if (broadcast) network.send("plate", { idx });
  }

  checkPlates() {
    const ok = PLATE_SOLUTION.every((v, i) => this.plates[i] === v);
    if (ok && !this.platesLocked) {
      this.platesLocked = true;
      this.fragments.plate = true;
      this.emit({ type: "fragment", which: "plate" });
    }
  }

  toggleLever(idx, broadcast = true) {
    if (this.leversLocked) return;
    this.levers[idx] = this.levers[idx] === "up" ? "down" : "up";
    this.checkLevers();
    this.emit({ type: "lever", idx });
    if (broadcast) network.send("lever", { idx });
  }

  checkLevers() {
    const ok = LEVER_SOLUTION.every((v, i) => this.levers[i] === v);
    if (ok && !this.leversLocked) {
      this.leversLocked = true;
      this.fragments.lever = true;
      this.emit({ type: "fragment", which: "lever" });
    }
  }

  tryOpenDoor(broadcast = true) {
    if (this.doorOpen) return;
    const all = this.fragments.dial && this.fragments.plate && this.fragments.lever;
    if (!all) { this.emit({ type: "doorLocked" }); return; }
    this.doorOpen = true;
    this.emit({ type: "doorOpen" });
    if (broadcast) network.send("doorOpen", {});
  }

  escape(broadcast = true) {
    if (!this.doorOpen) return;
    this.escaped = true;
    this.emit({ type: "escaped" });
    if (broadcast) network.send("escape", {});
  }

  applyRemote(msg) {
    if (!msg || !msg.type) return;
    const { type, payload } = msg;
    if (type === "dial")     this.rotateDial(payload.idx, false);
    if (type === "plate")    this.togglePlate(payload.idx, false);
    if (type === "lever")    this.toggleLever(payload.idx, false);
    if (type === "doorOpen") { this.doorOpen = true; this.emit({ type: "doorOpen" }); }
    if (type === "escape")   { this.escaped = true; this.emit({ type: "escaped" }); }
    if (type === "full")     this.applyFull(payload);
    if (type === "chat")     this.emit({ type: "chat", text: payload, who: "them" });
  }

  applyFull(snap) {
    Object.assign(this, snap);
    this.checkDials(); this.checkPlates(); this.checkLevers();
    this.emit({ type: "sync" });
  }

  broadcastFull() {
    network.send("full", {
      dials: this.dials, dialsLocked: this.dialsLocked,
      plates: this.plates, platesLocked: this.platesLocked,
      levers: this.levers, leversLocked: this.leversLocked,
      fragments: this.fragments, doorOpen: this.doorOpen, escaped: this.escaped,
    });
  }

  sendChat(text) {
    network.send("chat", text);
    this.emit({ type: "chat", text, who: "me" });
  }
}

export const roomState = new RoomState();
