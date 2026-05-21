import * as THREE from "three";
import { PALETTE_ROOT } from "../constants.js";

function organicTexture(base, accent, size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#" + base.toString(16).padStart(6, "0");
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = 4 + Math.random() * 20;
    ctx.fillStyle = `rgba(0,0,0,${(0.04 + Math.random() * 0.08).toFixed(2)})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(${accent >> 16 & 0xff},${accent >> 8 & 0xff},${accent & 0xff},${(Math.random() * 0.08).toFixed(2)})`;
    ctx.lineWidth = 0.5 + Math.random();
    ctx.beginPath();
    const sx = Math.random() * size, sy = Math.random() * size;
    ctx.moveTo(sx, sy);
    for (let k = 0; k < 6; k++) {
      ctx.lineTo(sx + (Math.random() - 0.5) * 80, sy + (Math.random() - 0.5) * 80);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export class ChamberRoot {
  constructor(scene3d) {
    this.scene3d = scene3d;
    this.group = new THREE.Group();
    this.candles = [];
    this.build();
    scene3d.add(this.group);
  }

  build() {
    const p = PALETTE_ROOT;
    const W = 10, D = 12, H = 5.5;

    const floorTex = organicTexture(p.floor, p.trim);
    floorTex.repeat.set(3, 3);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(W, D),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    const wallTex = organicTexture(p.wall, p.trim);
    wallTex.repeat.set(2, 1);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 });
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

    const candleSpots = [
      [-3.5, 0, -4.5], [3.5, 0, -4.5], [-3.5, 0, 4.5], [3.5, 0, 4.5], [0, 0, -4.8],
    ];
    candleSpots.forEach(([x, _, z]) => {
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.22, 0.5, 12),
        new THREE.MeshStandardMaterial({ color: 0xeae0c8, roughness: 0.7 })
      );
      base.position.set(x, 0.25, z);
      base.castShadow = true;
      this.group.add(base);
      const wick = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.18, 8),
        new THREE.MeshBasicMaterial({ color: 0xffaa44 })
      );
      wick.position.set(x, 0.6, z);
      this.group.add(wick);
      const light = new THREE.PointLight(0xffaa44, 0.55, 5);
      light.position.set(x, 0.8, z);
      this.group.add(light);
      this.candles.push({ wick, light, base, off: Math.random() * Math.PI * 2 });
    });

    const rootMat = new THREE.MeshStandardMaterial({ color: 0x2a1810, roughness: 0.9 });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const x = Math.cos(a) * 4.2;
      const z = Math.sin(a) * 5.2;
      const root = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.15, 1.2 + Math.random() * 0.8, 6),
        rootMat
      );
      root.position.set(x, 0.5 + Math.random() * 0.4, z);
      root.rotation.set((Math.random() - 0.5) * 0.6, Math.random() * Math.PI, (Math.random() - 0.5) * 0.6);
      this.group.add(root);
    }

    this.unsubTick = this.scene3d.tick((dt, t) => {
      for (const c of this.candles) {
        const flicker = 0.4 + Math.sin(t * 7 + c.off) * 0.18 + Math.sin(t * 13 + c.off * 1.7) * 0.08;
        c.light.intensity = flicker;
        c.wick.scale.y = 0.95 + flicker * 0.15;
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
