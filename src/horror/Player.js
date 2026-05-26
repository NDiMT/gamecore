import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

export class Player {
  constructor(camera, domElement, maze) {
    this.camera = camera;
    this.maze = maze;
    this.controls = new PointerLockControls(camera, domElement);
    this.velocity = new THREE.Vector3();
    this.input = { fwd: false, back: false, left: false, right: false, run: false };
    this.eyeHeight = 1.65;
    this.bobT = 0;
    this.moving = false;

    this.touchEnabled = false;
    this.touchActive = false;
    this.touchMove = { x: 0, y: 0 };
    this._lookEuler = new THREE.Euler(0, 0, 0, "YXZ");

    this._onKey = (e, down) => {
      switch (e.code) {
        case "KeyW": case "ArrowUp": this.input.fwd = down; break;
        case "KeyS": case "ArrowDown": this.input.back = down; break;
        case "KeyA": case "ArrowLeft": this.input.left = down; break;
        case "KeyD": case "ArrowRight": this.input.right = down; break;
        case "ShiftLeft": case "ShiftRight": this.input.run = down; break;
      }
    };
    document.addEventListener("keydown", (e) => this._onKey(e, true));
    document.addEventListener("keyup", (e) => this._onKey(e, false));
  }

  lock() { this.controls.lock(); }
  unlock() { this.controls.unlock(); }
  isLocked() { return this.controls.isLocked; }

  enableTouchMode() { this.touchEnabled = true; }
  setActive(b) {
    this.touchActive = b;
    if (!b) { this.touchMove.x = 0; this.touchMove.y = 0; this.input.run = false; }
  }
  isActive() { return this.touchEnabled ? this.touchActive : this.controls.isLocked; }

  setMove(x, y) {
    this.touchMove.x = x;
    this.touchMove.y = y;
  }

  applyLook(dx, dy) {
    const PI_2 = Math.PI / 2;
    this._lookEuler.setFromQuaternion(this.camera.quaternion);
    this._lookEuler.y -= dx;
    this._lookEuler.x -= dy;
    this._lookEuler.x = Math.max(-PI_2 + 0.02, Math.min(PI_2 - 0.02, this._lookEuler.x));
    this.camera.quaternion.setFromEuler(this._lookEuler);
  }

  teleport(pos) {
    this.camera.position.set(pos.x, this.eyeHeight, pos.z);
    this.velocity.set(0, 0, 0);
  }

  getPosition() {
    return this.camera.position.clone();
  }

  getYaw() {
    const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, "YXZ");
    return e.y;
  }

  update(dt, onFootstep) {
    const obj = this.camera;
    if (!this.isActive()) {
      this.moving = false;
      return;
    }

    const speed = (this.input.run ? 4.6 : 2.6);
    const acc = 18;
    const dec = 14;

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3(forward.z, 0, -forward.x);

    const wish = new THREE.Vector3();
    if (this.touchEnabled) {
      wish.addScaledVector(forward, this.touchMove.y);
      wish.addScaledVector(right, -this.touchMove.x);
    } else {
      if (this.input.fwd) wish.add(forward);
      if (this.input.back) wish.sub(forward);
      if (this.input.left) wish.add(right);
      if (this.input.right) wish.sub(right);
    }
    const mag = Math.min(1, wish.length());
    const hasWish = mag > 0.001;
    if (hasWish) wish.normalize().multiplyScalar(speed * mag);
    else wish.set(0, 0, 0);

    const dv = wish.clone().sub(this.velocity);
    const a = hasWish ? acc : dec;
    this.velocity.x += dv.x * Math.min(1, a * dt);
    this.velocity.z += dv.z * Math.min(1, a * dt);

    if (!hasWish) {
      this.velocity.multiplyScalar(Math.max(0, 1 - dec * dt));
    }

    const next = new THREE.Vector3(
      obj.position.x + this.velocity.x * dt,
      obj.position.y,
      obj.position.z + this.velocity.z * dt
    );

    const tryX = new THREE.Vector3(next.x, obj.position.y, obj.position.z);
    const cX = this.maze.collideAABB(tryX, 0.32);
    obj.position.x = cX.x;

    const tryZ = new THREE.Vector3(obj.position.x, obj.position.y, next.z);
    const cZ = this.maze.collideAABB(tryZ, 0.32);
    obj.position.z = cZ.z;

    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    this.moving = horizSpeed > 0.4;

    if (this.moving) {
      this.bobT += dt * (this.input.run ? 9.5 : 6.5);
      const bob = Math.sin(this.bobT) * (this.input.run ? 0.06 : 0.04);
      obj.position.y = this.eyeHeight + bob;
      if (Math.sin(this.bobT) > 0.95 && onFootstep) {
        onFootstep(this.input.run);
      }
    } else {
      this.bobT = 0;
      obj.position.y += (this.eyeHeight - obj.position.y) * Math.min(1, dt * 6);
    }
  }
}
