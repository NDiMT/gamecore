import * as THREE from "three";
import { PALETTE_SKY, PAPYRUS_FRAGMENT_SKY_WALL } from "../constants.js";

function noiseTexture(base, accent, size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#" + base.toString(16).padStart(6, "0");
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = Math.random() * 3;
    ctx.fillStyle = `rgba(255,255,255,${(Math.random() * 0.04).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(${accent >> 16 & 0xff},${accent >> 8 & 0xff},${accent & 0xff},0.04)`;
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, Math.random() * size);
    ctx.lineTo(Math.random() * size, Math.random() * size);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function symbolTexture(symbol, size = 512) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "rgba(180,200,255,0.45)";
  ctx.font = `${size * 0.7}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(symbol, size / 2, size / 2 + size * 0.05);
  return new THREE.CanvasTexture(c);
}

export class ChamberSky {
  constructor(scene3d) {
    this.scene3d = scene3d;
    this.group = new THREE.Group();
    this.build();
    scene3d.add(this.group);
  }

  build() {
    const p = PALETTE_SKY;
    const W = 10, D = 12, H = 6;

    const floorTex = noiseTexture(p.floor, p.trim);
    floorTex.repeat.set(3, 3);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(W, D),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.5, metalness: 0.3 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    const wallTex = noiseTexture(p.wall, p.trim);
    wallTex.repeat.set(2, 1);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 });
    const walls = [
      { w: W, h: H, x: 0, y: H/2, z:  D/2, ry: Math.PI },
      { w: D, h: H, x: -W/2, y: H/2, z: 0, ry: Math.PI/2 },
      { w: D, h: H, x:  W/2, y: H/2, z: 0, ry: -Math.PI/2 },
    ];
    walls.forEach(({ w, h, x, y, z, ry }) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
      m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true;
      this.group.add(m);
    });

    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(W, D),
      new THREE.MeshStandardMaterial({ color: p.ceil, roughness: 0.95 })
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = H;
    this.group.add(ceil);

    this.bgStars = [];
    for (let i = 0; i < 140; i++) {
      const star = new THREE.Mesh(
        new THREE.SphereGeometry(0.03 + Math.random() * 0.045, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffe5b0, transparent: true, opacity: 0.4 + Math.random() * 0.5 })
      );
      const isLeft = i % 4 === 0;
      const isRight = i % 4 === 1;
      const isCeil = i % 4 === 2;
      const isFloorEdge = i % 4 === 3;
      if (isLeft) star.position.set(-W/2 + 0.1, 1 + Math.random() * (H - 1.5), (Math.random() - 0.5) * (D - 1));
      else if (isRight) star.position.set(W/2 - 0.1, 1 + Math.random() * (H - 1.5), (Math.random() - 0.5) * (D - 1));
      else if (isCeil) star.position.set((Math.random() - 0.5) * (W - 1), H - 0.08, (Math.random() - 0.5) * (D - 1));
      else star.position.set((Math.random() - 0.5) * (W - 1), 0.5 + Math.random() * 4, D / 2 - 0.15);
      star._twk = Math.random() * Math.PI * 2;
      this.group.add(star);
      this.bgStars.push(star);
    }

    PAPYRUS_FRAGMENT_SKY_WALL.forEach(({ wall, symbol }) => {
      const tex = symbolTexture(symbol);
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 1.2),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9 })
      );
      if (wall === "north") { plane.position.set(0, 5.0, -D/2 + 0.05); }
      if (wall === "east")  { plane.position.set(W/2 - 0.05, 4.4, 2.0); plane.rotation.y = -Math.PI/2; }
      if (wall === "west")  { plane.position.set(-W/2 + 0.05, 4.4, -2.0); plane.rotation.y = Math.PI/2; }
      this.group.add(plane);
    });

    const dustCount = 80;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * (W - 1);
      dustPos[i * 3 + 1] = Math.random() * H;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * (D - 1);
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({ color: 0xa0c8ff, size: 0.04, transparent: true, opacity: 0.5, depthWrite: false });
    this.dust = new THREE.Points(dustGeo, dustMat);
    this.group.add(this.dust);

    const colMat = new THREE.MeshStandardMaterial({ color: p.metal, metalness: 0.7, roughness: 0.25 });
    [[-W/2 + 0.55, -D/2 + 0.55], [W/2 - 0.55, -D/2 + 0.55], [-W/2 + 0.55, D/2 - 0.55], [W/2 - 0.55, D/2 - 0.55]].forEach(([x, z]) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, H, 16), colMat);
      col.position.set(x, H/2, z);
      col.castShadow = true;
      this.group.add(col);
    });

    const moonLight = new THREE.PointLight(p.glow, 0.6, 14);
    moonLight.position.set(0, H - 0.2, 0);
    this.group.add(moonLight);

    this.unsubTick = this.scene3d.tick((dt, t) => {
      for (const s of this.bgStars) {
        s.material.opacity = 0.45 + Math.sin(t * 1.2 + s._twk) * 0.3 + Math.sin(t * 3.1 + s._twk * 1.4) * 0.15;
      }
      const positions = this.dust.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += dt * 0.05;
        if (positions[i + 1] > H) positions[i + 1] = 0;
        positions[i] += Math.sin(t * 0.4 + i) * dt * 0.04;
      }
      this.dust.geometry.attributes.position.needsUpdate = true;
    });
  }

  destroy() {
    if (this.unsubTick) this.unsubTick();
    this.scene3d.remove(this.group);
    this.group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
    });
  }
}
