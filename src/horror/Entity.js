import * as THREE from "three";

export class Entity {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x080604,
      roughness: 1,
      metalness: 0,
      emissive: 0x000000,
    });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.4, 0.4), bodyMat);
    torso.position.y = 1.0;
    this.group.add(torso);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.32), bodyMat);
    head.position.y = 1.9;
    this.group.add(head);

    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.5, 0.14), bodyMat);
    armL.position.set(-0.4, 0.95, 0);
    this.group.add(armL);

    const armR = armL.clone();
    armR.position.x = 0.4;
    this.group.add(armR);

    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.05, 0.18), bodyMat);
    legL.position.set(-0.15, 0.0, 0);
    this.group.add(legL);

    const legR = legL.clone();
    legR.position.x = 0.15;
    this.group.add(legR);

    const eyeGeo = new THREE.PlaneGeometry(0.06, 0.06);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.08, 1.93, 0.17);
    this.group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.08, 1.93, 0.17);
    this.group.add(eyeR);
    this.eyes = [eyeL, eyeR];

    this.group.position.set(0, 0, 0);
    this.group.visible = false;
    scene.add(this.group);

    this.state = "idle";
    this.speed = 0;
    this.maxSpeed = 1.4;
    this.armSwing = 0;

    this.parts = { torso, head, armL, armR, legL, legR };
  }

  spawnNear(maze, playerPos, minDist = 18, maxDist = 28) {
    const S = maze.size;
    const half = (S * 5) / 2 - 1;
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = minDist + Math.random() * (maxDist - minDist);
      const x = playerPos.x + Math.cos(angle) * r;
      const z = playerPos.z + Math.sin(angle) * r;
      if (Math.abs(x) > half || Math.abs(z) > half) continue;
      this.group.position.set(x, 0, z);
      this.group.visible = true;
      this.state = "stalk";
      this.speed = 0.6;
      return true;
    }
    this.group.position.set(playerPos.x + 12, 0, playerPos.z + 12);
    this.group.visible = true;
    this.state = "stalk";
    return true;
  }

  teleportBehind(playerPos, playerYaw, dist = 5) {
    const x = playerPos.x - Math.sin(playerYaw) * dist;
    const z = playerPos.z - Math.cos(playerYaw) * dist;
    this.group.position.set(x, 0, z);
    this.group.visible = true;
    this.state = "loom";
    this.speed = 0;
    this.eyes.forEach((e) => { e.material.opacity = 1; });
  }

  hide() {
    this.group.visible = false;
    this.state = "idle";
    this.eyes.forEach((e) => { e.material.opacity = 0; });
  }

  distanceTo(pos) {
    return this.group.position.distanceTo(pos);
  }

  update(dt, t, playerPos, maze) {
    if (!this.group.visible) return;

    const dir = new THREE.Vector3().subVectors(playerPos, this.group.position);
    dir.y = 0;
    const dist = dir.length();
    if (dist > 0.001) dir.normalize();

    this.group.lookAt(playerPos.x, this.group.position.y + 1, playerPos.z);

    if (this.state === "stalk") {
      this.speed = Math.min(this.maxSpeed, this.speed + dt * 0.5);
      if (dist < 18) this.speed = Math.min(this.maxSpeed * 1.3, this.speed + dt * 0.6);
      const step = this.speed * dt;
      const next = this.group.position.clone();
      next.x += dir.x * step;
      next.z += dir.z * step;
      const collided = maze.collideAABB(new THREE.Vector3(next.x, 1, next.z), 0.4);
      next.x = collided.x;
      next.z = collided.z;
      this.group.position.copy(next);

      this.armSwing += dt * this.speed * 2.8;
      const sw = Math.sin(this.armSwing);
      this.parts.armL.rotation.x = sw * 0.5;
      this.parts.armR.rotation.x = -sw * 0.5;
      this.parts.legL.rotation.x = -sw * 0.4;
      this.parts.legR.rotation.x = sw * 0.4;

      this.eyes.forEach((e) => {
        const close = Math.max(0, 1 - dist / 14);
        e.material.opacity = close * 0.9;
      });
    } else if (this.state === "loom") {
      this.armSwing = 0;
      this.parts.armL.rotation.x = 0;
      this.parts.armR.rotation.x = 0;
      this.parts.legL.rotation.x = 0;
      this.parts.legR.rotation.x = 0;
    }
  }
}
