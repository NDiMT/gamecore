import { POTS, SOLUTION, ERA_PAST, ERA_FUTURE } from "../constants.js";

export class RoomState {
  constructor() {
    this.era = ERA_PAST;
    this.plantings = new Map();
    this.selectedSeed = null;
    this.solved = false;
    this.listeners = new Set();
  }

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(event) {
    for (const fn of this.listeners) fn(event);
  }

  setEra(era) {
    if (era !== ERA_PAST && era !== ERA_FUTURE) return;
    this.era = era;
    this.emit({ type: "era", era });
  }

  toggleEra() {
    this.setEra(this.era === ERA_PAST ? ERA_FUTURE : ERA_PAST);
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
    return this.plantings.get(potId) || null;
  }

  potOfSeed(seedType) {
    for (const [potId, type] of this.plantings) if (type === seedType) return potId;
    return null;
  }

  plant(potId, seedType) {
    const prevPotOfSeed = this.potOfSeed(seedType);
    if (prevPotOfSeed !== null) this.plantings.delete(prevPotOfSeed);
    this.plantings.set(potId, seedType);
    this.checkSolved();
    this.emit({ type: "plant", potId, seedType });
  }

  removeFromPot(potId) {
    if (!this.plantings.has(potId)) return;
    this.plantings.delete(potId);
    this.checkSolved();
    this.emit({ type: "uproot", potId });
  }

  checkSolved() {
    const wasSolved = this.solved;
    const ok = Object.entries(SOLUTION).every(([placement, seedType]) => {
      const pot = POTS.find((p) => p.placement === placement);
      return pot && this.plantings.get(pot.id) === seedType;
    });
    this.solved = ok;
    if (ok && !wasSolved) this.emit({ type: "solved" });
    if (!ok && wasSolved) this.emit({ type: "unsolved" });
  }

  reset() {
    this.plantings.clear();
    this.selectedSeed = null;
    this.solved = false;
    this.era = ERA_PAST;
    this.emit({ type: "reset" });
  }
}

export const roomState = new RoomState();
