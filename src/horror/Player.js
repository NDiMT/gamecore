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

  teleport(pos) {
    this.controls.getObject().position.set(pos.x, this.eyeHeight, pos.z);
    this.velocity.set(0, 0, 0);
  }

  getPosition() {
    return this.controls.getObject().position.clone();
  }

  getYaw() {
    const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, "YXZ");
    return e.y;
  }

  update(dt, onFootstep) {
    const obj = this.controls.getObject();
    if (!this.controls.isLocked) {
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
    if (this.input.fwd) wish.add(forward);
    if (this.input.back) wish.sub(forward);
    if (this.input.left) wish.add(right);
    if (this.input.right) wish.sub(right);
    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed);

    const dv = wish.clone().sub(this.velocity);
    const a = wish.lengthSq() > 0 ? acc : dec;
    const step = Math.min(1, a * dt / Math.max(0.001, dv.length() / (a * dt)));
    this.velocity.x += dv.x * Math.min(1, a * dt);
    this.velocity.z += dv.z * Math.min(1, a * dt);

    if (wish.lengthSq() === 0) {
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
