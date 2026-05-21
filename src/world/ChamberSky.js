import * as THREE from "three";
import { PALETTE_SKY } from "../constants.js";

function noiseTexture(base, accent, size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#" + base.toString(16).padStart(6, "0");
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 1200; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = Math.random() * 3;
    ctx.fillStyle = `rgba(255,255,255,${(Math.random() * 0.04).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 20; i++) {
    ctx.strokeStyle = `rgba(${accent >> 16 & 0xff},${accent >> 8 & 0xff},${accent & 0xff},0.05)`;
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, Math.random() * size);
    ctx.lineTo(Math.random() * size, Math.random() * size);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
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
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.6, metalness: 0.25 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    const wallTex = noiseTexture(p.wall, p.trim);
    wallTex.repeat.set(2, 1);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 });
    const walls = [
      { w: W, h: H, x: 0, y: H/2, z: -D/2, ry: 0 },
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

    this.stars = [];
    for (let i = 0; i < 90; i++) {
      const star = new THREE.Mesh(
        new THREE.SphereGeometry(0.04 + Math.random() * 0.05, 6, 6),
        new THREE.MeshBasicMaterial({ color: p.star, transparent: true, opacity: 0.6 + Math.random() * 0.4 })
      );
      star.position.set(
        (Math.random() - 0.5) * (W - 1),
        H - 0.05 - Math.random() * 0.3,
        (Math.random() - 0.5) * (D - 1)
      );
      star._twinkleOff = Math.random() * Math.PI * 2;
      this.group.add(star);
      this.stars.push(star);
    }

    const moonLight = new THREE.PointLight(p.glow, 0.7, 14);
    moonLight.position.set(0, H - 0.2, 0);
    this.group.add(moonLight);

    const moonDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.6, 32),
      new THREE.MeshBasicMaterial({ color: 0xeef0ff })
    );
    moonDisc.position.set(0, H - 0.04, 0);
    moonDisc.rotation.x = Math.PI / 2;
    this.group.add(moonDisc);

    const colTexL = noiseTexture(p.metal, p.trim);
    colTexL.repeat.set(1, 3);
    const colMat = new THREE.MeshStandardMaterial({ map: colTexL, roughness: 0.5, metalness: 0.6 });
    [[-W/2 + 0.6, -D/2 + 0.6], [W/2 - 0.6, -D/2 + 0.6], [-W/2 + 0.6, D/2 - 0.6], [W/2 - 0.6, D/2 - 0.6]].forEach(([x, z]) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, H, 12), colMat);
      col.position.set(x, H/2, z);
      col.castShadow = true;
      this.group.add(col);
    });

    this.unsubTick = this.scene3d.tick((dt, t) => {
      for (const s of this.stars) {
        const tw = 0.5 + Math.sin(t * 1.3 + s._twinkleOff) * 0.3 + Math.sin(t * 2.7 + s._twinkleOff * 1.3) * 0.2;
        s.material.opacity = tw;
      }
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
