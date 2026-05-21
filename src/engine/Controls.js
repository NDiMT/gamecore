import * as THREE from "three";

export class OrbitTouch {
  constructor(camera, dom, target) {
    this.camera = camera;
    this.dom = dom;
    this.target = target.clone();
    this.spherical = new THREE.Spherical();
    this.spherical.setFromVector3(camera.position.clone().sub(this.target));
    this.minPolar = 0.25;
    this.maxPolar = Math.PI * 0.49;
    this.minDist = 5;
    this.maxDist = 16;
    this.minTheta = -Math.PI * 0.7;
    this.maxTheta = Math.PI * 0.7;
    this.rotateSpeed = 0.005;
    this.zoomSpeed = 0.01;
    this.startX = 0;
    this.startY = 0;
    this.dragging = false;
    this.pinch = 0;
    this.dragMoved = 0;
    this.tapCallbacks = [];

    this.dom.addEventListener("pointerdown", this.onDown);
    this.dom.addEventListener("pointermove", this.onMove);
    this.dom.addEventListener("pointerup", this.onUp);
    this.dom.addEventListener("pointercancel", this.onUp);
    this.dom.addEventListener("touchstart", this.onTouch, { passive: false });
    this.dom.addEventListener("touchmove", this.onTouchMove, { passive: false });
    this.dom.addEventListener("touchend", this.onTouchEnd, { passive: false });
    this.dom.addEventListener("wheel", this.onWheel, { passive: false });

    this.activeTouches = new Map();
    this.update();
  }

  onTap(fn) { this.tapCallbacks.push(fn); }

  onDown = (e) => {
    if (e.pointerType === "touch") return;
    this.dragging = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.dragMoved = 0;
    this.dom.setPointerCapture && this.dom.setPointerCapture(e.pointerId);
  };

  onMove = (e) => {
    if (!this.dragging || e.pointerType === "touch") return;
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    this.dragMoved += Math.abs(dx) + Math.abs(dy);
    this.spherical.theta = Math.max(this.minTheta, Math.min(this.maxTheta, this.spherical.theta - dx * this.rotateSpeed));
    this.spherical.phi = Math.max(this.minPolar, Math.min(this.maxPolar, this.spherical.phi - dy * this.rotateSpeed));
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.update();
  };

  onUp = (e) => {
    if (e.pointerType === "touch") return;
    if (this.dragging && this.dragMoved < 6) {
      this.fireTap(e.clientX, e.clientY);
    }
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
      const prev = this.activeTouches.get(t.identifier);
      if (!prev) continue;
      const dx = t.clientX - prev.x;
      const dy = t.clientY - prev.y;
      prev.moved += Math.abs(dx) + Math.abs(dy);
      prev.x = t.clientX;
      prev.y = t.clientY;
    }
    if (this.activeTouches.size === 1) {
      const t = [...this.activeTouches.values()][0];
      const dx = t.x - t.x0;
      const dy = t.y - t.y0;
      this.spherical.theta = Math.max(this.minTheta, Math.min(this.maxTheta, this.spherical.theta - dx * this.rotateSpeed));
      this.spherical.phi = Math.max(this.minPolar, Math.min(this.maxPolar, this.spherical.phi - dy * this.rotateSpeed));
      t.x0 = t.x;
      t.y0 = t.y;
      this.update();
    } else if (this.activeTouches.size === 2) {
      const [a, b] = [...this.activeTouches.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const delta = d - this.pinch;
      this.spherical.radius = Math.max(this.minDist, Math.min(this.maxDist, this.spherical.radius - delta * this.zoomSpeed));
      this.pinch = d;
      this.update();
    }
  };

  onTouchEnd = (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const prev = this.activeTouches.get(t.identifier);
      if (prev && prev.moved < 12 && this.activeTouches.size === 1) {
        this.fireTap(t.clientX, t.clientY);
      }
      this.activeTouches.delete(t.identifier);
    }
  };

  onWheel = (e) => {
    e.preventDefault();
    this.spherical.radius = Math.max(this.minDist, Math.min(this.maxDist, this.spherical.radius + e.deltaY * this.zoomSpeed));
    this.update();
  };

  fireTap(x, y) {
    const rect = this.dom.getBoundingClientRect();
    const ndcX = ((x - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((y - rect.top) / rect.height) * 2 + 1;
    this.tapCallbacks.forEach(fn => fn(ndcX, ndcY));
  }

  setTarget(v) { this.target.copy(v); this.update(); }

  update() {
    const offset = new THREE.Vector3();
    offset.setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }
}
