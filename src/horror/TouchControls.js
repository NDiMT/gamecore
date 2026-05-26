// On-screen touch controls for mobile: left half = movement joystick,
// right half = drag-to-look. Pushing the stick to the rim triggers run.
// Multitouch via pointer events: move and look can happen simultaneously.

const LOOK_SENS = 0.0026;
const STICK_RADIUS = 60;
const RUN_THRESHOLD = 0.85;

export class TouchControls {
  constructor({ onMove, onLook, onRun }) {
    this.onMove = onMove || (() => {});
    this.onLook = onLook || (() => {});
    this.onRun = onRun || (() => {});

    this._movePointer = null;
    this._lookPointer = null;
    this._moveOrigin = { x: 0, y: 0 };
    this._running = false;

    this._injectStyle();
    this._buildDom();
    this._bind();
  }

  static isTouchDevice() {
    return (navigator.maxTouchPoints || 0) > 0 ||
      window.matchMedia("(pointer: coarse)").matches;
  }

  _injectStyle() {
    const css = `
      #touch { position: fixed; inset: 0; z-index: 22; display: none; touch-action: none; }
      #touch.show { display: block; }
      #touch .zone { position: absolute; top: 0; bottom: 0; }
      #touch .move-zone { left: 0; width: 45%; }
      #touch .look-zone { right: 0; width: 55%; }
      #touch .stick {
        position: absolute; width: ${STICK_RADIUS * 2}px; height: ${STICK_RADIUS * 2}px;
        margin: ${-STICK_RADIUS}px 0 0 ${-STICK_RADIUS}px;
        border: 1px solid rgba(232,214,138,0.35); border-radius: 50%;
        background: radial-gradient(circle, rgba(232,214,138,0.05), transparent 70%);
        opacity: 0; transition: opacity 0.15s; pointer-events: none;
      }
      #touch .stick.active { opacity: 1; }
      #touch .stick.run { border-color: rgba(208,74,58,0.7); }
      #touch .thumb {
        position: absolute; left: 50%; top: 50%; width: 46px; height: 46px;
        margin: -23px 0 0 -23px; border-radius: 50%;
        background: rgba(232,214,138,0.18); border: 1px solid rgba(232,214,138,0.5);
      }
      #touch .stick.run .thumb { background: rgba(208,74,58,0.25); border-color: rgba(208,74,58,0.8); }
      #touch .hint {
        position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%);
        font: 10px "Courier New", monospace; letter-spacing: 0.2em; color: #6a5a2a;
        text-transform: uppercase; pointer-events: none; white-space: nowrap;
      }
    `;
    const el = document.createElement("style");
    el.textContent = css;
    document.head.appendChild(el);
  }

  _buildDom() {
    this.root = document.createElement("div");
    this.root.id = "touch";
    this.root.innerHTML = `
      <div class="zone move-zone"></div>
      <div class="zone look-zone"></div>
      <div class="stick"><div class="thumb"></div></div>
      <div class="hint">left: move · right: look · push to rim: run</div>
    `;
    document.getElementById("app").appendChild(this.root);
    this.moveZone = this.root.querySelector(".move-zone");
    this.lookZone = this.root.querySelector(".look-zone");
    this.stick = this.root.querySelector(".stick");
    this.thumb = this.root.querySelector(".thumb");
  }

  _bind() {
    this.root.addEventListener("pointerdown", (e) => this._down(e), { passive: false });
    this.root.addEventListener("pointermove", (e) => this._move(e), { passive: false });
    this.root.addEventListener("pointerup", (e) => this._up(e), { passive: false });
    this.root.addEventListener("pointercancel", (e) => this._up(e), { passive: false });
  }

  _isLeft(e) {
    return e.clientX < window.innerWidth * 0.45;
  }

  _down(e) {
    e.preventDefault();
    if (this._isLeft(e) && this._movePointer === null) {
      this._movePointer = e.pointerId;
      this._moveOrigin = { x: e.clientX, y: e.clientY };
      this.stick.style.left = `${e.clientX}px`;
      this.stick.style.top = `${e.clientY}px`;
      this.stick.classList.add("active");
      this.thumb.style.transform = "translate(0px, 0px)";
    } else if (!this._isLeft(e) && this._lookPointer === null) {
      this._lookPointer = e.pointerId;
      this._lookLast = { x: e.clientX, y: e.clientY };
    }
  }

  _move(e) {
    e.preventDefault();
    if (e.pointerId === this._movePointer) {
      let dx = e.clientX - this._moveOrigin.x;
      let dy = e.clientY - this._moveOrigin.y;
      const dist = Math.hypot(dx, dy);
      if (dist > STICK_RADIUS) {
        dx = (dx / dist) * STICK_RADIUS;
        dy = (dy / dist) * STICK_RADIUS;
      }
      this.thumb.style.transform = `translate(${dx}px, ${dy}px)`;
      const nx = dx / STICK_RADIUS;
      const ny = -dy / STICK_RADIUS;
      const mag = Math.hypot(nx, ny);
      const run = mag >= RUN_THRESHOLD;
      if (run !== this._running) {
        this._running = run;
        this.stick.classList.toggle("run", run);
        this.onRun(run);
      }
      this.onMove(nx, ny);
    } else if (e.pointerId === this._lookPointer) {
      const dx = e.clientX - this._lookLast.x;
      const dy = e.clientY - this._lookLast.y;
      this._lookLast = { x: e.clientX, y: e.clientY };
      this.onLook(dx * LOOK_SENS, dy * LOOK_SENS);
    }
  }

  _up(e) {
    if (e.pointerId === this._movePointer) {
      this._movePointer = null;
      this.stick.classList.remove("active", "run");
      this.thumb.style.transform = "translate(0px, 0px)";
      this._running = false;
      this.onRun(false);
      this.onMove(0, 0);
    } else if (e.pointerId === this._lookPointer) {
      this._lookPointer = null;
    }
  }

  show() { this.root.classList.add("show"); }

  hide() {
    this.root.classList.remove("show");
    this._movePointer = null;
    this._lookPointer = null;
    this._running = false;
    this.stick.classList.remove("active", "run");
    this.onMove(0, 0);
    this.onRun(false);
  }
}
