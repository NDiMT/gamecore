import * as THREE from "three";

export class OrbitTouch {
  constructor(camera, dom, target) {
    this.camera = camera;
    this.dom = dom;
    this.target = target.clone();
    this.smoothTarget = target.clone();

    const offset = camera.position.clone().sub(this.target);
    this.spherical = new THREE.Spherical().setFromVector3(offset);
    this.targetSpherical = this.spherical.clone();

    this.minPolar = 0.35;
    this.maxPolar = Math.PI * 0.48;
    this.minDist = 4.5;
    this.maxDist = 14;
    this.minTheta = -Math.PI * 0.85;
    this.maxTheta = Math.PI * 0.85;

    this.rotateSpeed = 0.0045;
    this.zoomSpeed = 0.012;
    this.damping = 0.12;

    this.tapCallbacks = [];
    this.hoverCallbacks = [];

    this.activeTouches = new Map();
    this.pinch = 0;

    this.startX = 0; this.startY = 0;
    this.dragging = false;
    this.dragMoved = 0;

    dom.addEventListener("pointerdown", this.onDown);
    dom.addEventListener("pointermove", this.onMove);
    dom.addEventListener("pointerup", this.onUp);
    dom.addEventListener("pointercancel", this.onUp);
    dom.addEventListener("touchstart", this.onTouch, { passive: false });
    dom.addEventListener("touchmove", this.onTouchMove, { passive: false });
    dom.addEventListener("touchend", this.onTouchEnd, { passive: false });
    dom.addEventListener("wheel", this.onWheel, { passive: false });

    this.update(1);
  }

  onTap(fn) { this.tapCallbacks.push(fn); }
  onHover(fn) { this.hoverCallbacks.push(fn); }

  setTargetSpherical(theta, phi, radius) {
    if (theta != null) this.targetSpherical.theta = theta;
    if (phi != null) this.targetSpherical.phi = phi;
    if (radius != null) this.targetSpherical.radius = radius;
  }

  setLookTarget(v) {
    this.target.copy(v);
  }

  onDown = (e) => {
    if (e.pointerType === "touch") return;
    this.dragging = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.dragMoved = 0;
    if (this.dom.setPointerCapture) this.dom.setPointerCapture(e.pointerId);
  };

  onMove = (e) => {
    if (e.pointerType === "touch") return;
    if (!this.dragging) {
      this.fireHover(e.clientX, e.clientY);
      return;
    }
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    this.dragMoved += Math.abs(dx) + Math.abs(dy);
    this.targetSpherical.theta = clamp(this.targetSpherical.theta - dx * this.rotateSpeed, this.minTheta, this.maxTheta);
    this.targetSpherical.phi = clamp(this.targetSpherical.phi - dy * this.rotateSpeed, this.minPolar, this.maxPolar);
    this.startX = e.clientX;
    this.startY = e.clientY;
  };

  onUp = (e) => {
    if (e.pointerType === "touch") return;
    if (this.dragging && this.dragMoved < 6) this.fireTap(e.clientX, e.clientY);
    this.dragging = false;
  };

  onTouch = (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      this.activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY, x0: t.clientX, y0: t.clientY, moved: 0 });
    }
    if (this.activeTouches.size === 2) {
      const [a, b] = [...this.activeTouches.values()];
      this.pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };

  onTouchMove = (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const p = this.activeTouches.get(t.identifier);
      if (!p) continue;
      const dx = t.clientX - p.x, dy = t.clientY - p.y;
      p.moved += Math.abs(dx) + Math.abs(dy);
      p.x = t.clientX; p.y = t.clientY;
    }
    if (this.activeTouches.size === 1) {
      const t = [...this.activeTouches.values()][0];
      const dx = t.x - t.x0, dy = t.y - t.y0;
      this.targetSpherical.theta = clamp(this.targetSpherical.theta - dx * this.rotateSpeed, this.minTheta, this.maxTheta);
      this.targetSpherical.phi = clamp(this.targetSpherical.phi - dy * this.rotateSpeed, this.minPolar, this.maxPolar);
      t.x0 = t.x; t.y0 = t.y;
    } else if (this.activeTouches.size === 2) {
      const [a, b] = [...this.activeTouches.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const delta = d - this.pinch;
      this.targetSpherical.radius = clamp(this.targetSpherical.radius - delta * this.zoomSpeed, this.minDist, this.maxDist);
      this.pinch = d;
    }
  };

  onTouchEnd = (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const p = this.activeTouches.get(t.identifier);
      if (p && p.moved < 14 && this.activeTouches.size === 1) this.fireTap(t.clientX, t.clientY);
      this.activeTouches.delete(t.identifier);
    }
  };

  onWheel = (e) => {
    e.preventDefault();
    this.targetSpherical.radius = clamp(this.targetSpherical.radius + e.deltaY * this.zoomSpeed, this.minDist, this.maxDist);
  };

  fireTap(x, y) {
    const r = this.dom.getBoundingClientRect();
    const nx = ((x - r.left) / r.width) * 2 - 1;
    const ny = -((y - r.top) / r.height) * 2 + 1;
    this.tapCallbacks.forEach(fn => fn(nx, ny, x, y));
  }

  fireHover(x, y) {
    const r = this.dom.getBoundingClientRect();
    const nx = ((x - r.left) / r.width) * 2 - 1;
    const ny = -((y - r.top) / r.height) * 2 + 1;
    this.hoverCallbacks.forEach(fn => fn(nx, ny));
  }

  update(dt) {
    const a = 1 - Math.pow(1 - this.damping, dt * 60);
    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * a;
    this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * a;
    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * a;
    this.smoothTarget.lerp(this.target, a);
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.smoothTarget).add(offset);
    this.camera.lookAt(this.smoothTarget);
  }
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
