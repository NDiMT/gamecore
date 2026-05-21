import * as THREE from "three";
import { ROOM, COLORS_PAST, COLORS_FUTURE } from "../constants.js";

function plankTexture(baseColor, era) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 512;
  const ctx = c.getContext("2d");
  ctx.fillStyle = `#${baseColor.toString(16).padStart(6, "0")}`;
  ctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) {
    const shade = era === "past" ? Math.random() * 30 - 15 : Math.random() * 20 - 30;
    ctx.fillStyle = `rgba(0,0,0,${(0.08 + Math.random() * 0.12).toFixed(2)})`;
    ctx.fillRect(0, y, 512, 4);
    for (let x = 0; x < 512; x += 96 + Math.random() * 64) {
      ctx.fillStyle = `rgba(${shade < 0 ? 0 : 255},0,0,0.04)`;
      ctx.fillRect(x, y, 1, 64);
    }
  }
  if (era === "future") {
    for (let i = 0; i < 60; i++) {
      ctx.strokeStyle = "rgba(60,80,120,0.2)";
      ctx.beginPath();
      ctx.moveTo(Math.random() * 512, Math.random() * 512);
      ctx.lineTo(Math.random() * 512, Math.random() * 512);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function stoneTexture(baseColor, era) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 512;
  const ctx = c.getContext("2d");
  ctx.fillStyle = `#${baseColor.toString(16).padStart(6, "0")}`;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 800; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 18;
    ctx.fillStyle = `rgba(0,0,0,${(Math.random() * 0.08).toFixed(2)})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  if (era === "future") {
    for (let i = 0; i < 16; i++) {
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      const sx = Math.random() * 512, sy = Math.random() * 512;
      ctx.moveTo(sx, sy);
      for (let k = 0; k < 5; k++) {
        ctx.lineTo(sx + (Math.random() - 0.5) * 200, sy + (Math.random() - 0.5) * 200);
      }
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export class Room {
  constructor(scene3d, era) {
    this.scene3d = scene3d;
    this.era = era;
    this.palette = era === "past" ? COLORS_PAST : COLORS_FUTURE;
    this.group = new THREE.Group();
    this.build();
    scene3d.add(this.group);
  }

  build() {
    const W = ROOM.width, D = ROOM.depth, H = ROOM.height;
    const floorTex = plankTexture(this.palette.floor, this.era);
    floorTex.repeat.set(2, 2);
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    const ceilMat = new THREE.MeshStandardMaterial({ color: this.palette.ceil, roughness: 0.9 });
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = H;
    this.group.add(ceil);

    const wallTex = stoneTexture(this.palette.wall, this.era);
    wallTex.repeat.set(2, 1);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 });

    const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat);
    back.position.set(0, H / 2, -D / 2);
    back.receiveShadow = true;
    this.group.add(back);

    const front = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat);
    front.position.set(0, H / 2, D / 2);
    front.rotation.y = Math.PI;
    front.receiveShadow = true;
    this.group.add(front);

    const left = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wallMat);
    left.position.set(-W / 2, H / 2, 0);
    left.rotation.y = Math.PI / 2;
    left.receiveShadow = true;
    this.group.add(left);

    const right = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wallMat);
    right.position.set(W / 2, H / 2, 0);
    right.rotation.y = -Math.PI / 2;
    right.receiveShadow = true;
    this.group.add(right);

    if (this.era === "past") this.decorPast(); else this.decorFuture();
  }

  decorPast() {
    const W = ROOM.width;
    for (let i = -1; i <= 1; i++) {
      const sconce = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.4, 8),
        new THREE.MeshStandardMaterial({ color: this.palette.metal, roughness: 0.6 })
      );
      sconce.position.set(i * (W * 0.35), 3.6, -ROOM.depth / 2 + 0.05);
      this.group.add(sconce);
      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffaa44 })
      );
      flame.position.copy(sconce.position);
      flame.position.y += 0.2;
      this.group.add(flame);
      const light = new THREE.PointLight(0xffaa44, 0.7, 6);
      light.position.copy(flame.position);
      this.group.add(light);
    }
  }

  decorFuture() {
    const W = ROOM.width;
    for (let i = -1; i <= 1; i++) {
      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.05, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x202830, roughness: 0.8 })
      );
      lamp.position.set(i * (W * 0.35), ROOM.height - 0.1, -ROOM.depth / 2 + 0.3);
      this.group.add(lamp);
      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(0.35, 0.35),
        new THREE.MeshBasicMaterial({ color: 0x87b8ff, transparent: true, opacity: 0.85 })
      );
      glow.position.copy(lamp.position);
      glow.position.y -= 0.05;
      glow.rotation.x = -Math.PI / 2;
      this.group.add(glow);
      const light = new THREE.PointLight(0x87b8ff, 0.6, 7);
      light.position.copy(lamp.position);
      this.group.add(light);
    }
  }

  destroy() {
    this.scene3d.remove(this.group);
    this.group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    });
  }
}
