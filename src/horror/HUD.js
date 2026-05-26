export class HUD {
  constructor() {
    this.root = document.getElementById("hud");
    this.subtitle = document.getElementById("subtitle");
    this.timeVal = document.getElementById("time-val");
    this.statusVal = document.getElementById("status-val");
    this.objVal = document.getElementById("obj-val");
    this.darkOverlay = document.getElementById("darkOverlay");
    this.flashOverlay = document.getElementById("flashOverlay");

    this._subTimer = 0;
    this._darkLevel = 0;
  }

  activate() { this.root.classList.add("active"); }
  deactivate() { this.root.classList.remove("active"); }

  setTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    this.timeVal.textContent = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  setStatus(text, color) {
    this.statusVal.textContent = text;
    this.statusVal.style.color = color || "#e8d68a";
  }

  setObjective(text) {
    this.objVal.textContent = text;
  }

  showSubtitle(text, duration = 4) {
    this.subtitle.textContent = text;
    this.subtitle.classList.add("show");
    this._subTimer = duration;
  }

  hideSubtitle() {
    this.subtitle.classList.remove("show");
    this._subTimer = 0;
  }

  setDark(level) {
    this._darkLevel = level;
    this.darkOverlay.style.opacity = level;
  }

  flash(amount = 0.7, duration = 0.6) {
    this.flashOverlay.style.transition = "none";
    this.flashOverlay.style.opacity = amount;
    requestAnimationFrame(() => {
      this.flashOverlay.style.transition = `opacity ${duration}s ease-out`;
      this.flashOverlay.style.opacity = 0;
    });
  }

  update(dt) {
    if (this._subTimer > 0) {
      this._subTimer -= dt;
      if (this._subTimer <= 0) this.hideSubtitle();
    }
  }
}
