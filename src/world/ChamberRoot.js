import * as THREE from "three";
import { PALETTE_ROOT, PAPYRUS_FRAGMENT_ROOT } from "../constants.js";

function organicTexture(base, accent, size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#" + base.toString(16).padStart(6, "0");
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 500; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = 4 + Math.random() * 22;
    ctx.fillStyle = `rgba(0,0,0,${(0.04 + Math.random() * 0.08).toFixed(2)})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 60; i++) {
    ctx.strokeStyle = `rgba(${accent >> 16 & 0xff},${accent >> 8 & 0xff},${accent & 0xff},${(Math.random() * 0.06).toFixed(2)})`;
    ctx.lineWidth = 0.5 + Math.random();
    ctx.beginPath();
    const sx = Math.random() * size, sy = Math.random() * size;
    ctx.moveTo(sx, sy);
    for (let k = 0; k < 8; k++) {
      ctx.lineTo(sx + (Math.random() - 0.5) * 90, sy + (Math.random() - 0.5) * 90);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function papyrusTexture(text) {
  const c = document.createElement("canvas");
  c.width = 768; c.height = 384;
  const ctx = c.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 768, 384);
  grad.addColorStop(0, "#e8d8a8");
  grad.addColorStop(1, "#c8b078");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 768, 384);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(80,40,20,${(Math.random() * 0.12).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(Math.random() * 768, Math.random() * 384, 20 + Math.random() * 50, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#3a2010";
  ctx.font = "italic 52px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(text, 384, 200);
  ctx.strokeStyle = "rgba(80,40,20,0.8)";
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 728, 344);
  return new THREE.CanvasTexture(c);
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

    const candleSpots = [[-3.5, 0, -4.5], [3.5, 0, -4.5], [-3.5, 0, 4.5], [3.5, 0, 4.5], [0, 0, -4.8], [-2, 0, 4], [2, 0, 4]];
    candleSpots.forEach(([x, _, z]) => {
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.17, 0.21, 0.5, 12),
        new THREE.MeshStandardMaterial({ color: 0xead8b0, roughness: 0.7 })
      );
      base.position.set(x, 0.25, z);
      base.castShadow = true;
      this.group.add(base);
      const wick = new THREE.Mesh(
        new THREE.ConeGeometry(0.09, 0.22, 8),
        new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.95 })
      );
      wick.position.set(x, 0.62, z);
      this.group.add(wick);
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xffd070, transparent: true, opacity: 0.5 })
      );
      halo.position.set(x, 0.62, z);
      this.group.add(halo);
      const light = new THREE.PointLight(0xffaa44, 0.5, 5.5);
      light.position.set(x, 0.85, z);
      this.group.add(light);
      this.candles.push({ wick, halo, light, base, off: Math.random() * Math.PI * 2 });
    });

    const rootMat = new THREE.MeshStandardMaterial({ color: 0x2a1810, roughness: 0.9 });
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const r = 4.5 + Math.random() * 0.7;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * (r * 1.05);
      const root = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.16, 1.2 + Math.random() * 1.0, 6),
        rootMat
      );
      root.position.set(x, 0.6 + Math.random() * 0.4, z);
      root.rotation.set((Math.random() - 0.5) * 0.8, Math.random() * Math.PI, (Math.random() - 0.5) * 0.8);
      this.group.add(root);
    }

    const papyrusTex = papyrusTexture(PAPYRUS_FRAGMENT_ROOT);
    const papyrus = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.8),
      new THREE.MeshStandardMaterial({ map: papyrusTex, roughness: 0.95 })
    );
    papyrus.position.set(-4.4, 1.5, -3);
    papyrus.rotation.y = Math.PI / 2;
    this.group.add(papyrus);

    const dustCount = 100;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * (W - 1);
      dustPos[i * 3 + 1] = Math.random() * H;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * (D - 1);
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({ color: 0xffd6a0, size: 0.045, transparent: true, opacity: 0.55, depthWrite: false });
    this.dust = new THREE.Points(dustGeo, dustMat);
    this.group.add(this.dust);

    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffd070, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < 2; i++) {
      const beam = new THREE.Mesh(new THREE.ConeGeometry(2.2, 6.5, 16, 1, true), beamMat);
      beam.position.set(i === 0 ? -2 : 2, 5.5, -1 + i * 1.5);
      beam.rotation.x = Math.PI;
      this.group.add(beam);
    }

    this.unsubTick = this.scene3d.tick((dt, t) => {
      for (const c of this.candles) {
        const flick = 0.4 + Math.sin(t * 7 + c.off) * 0.2 + Math.sin(t * 13 + c.off * 1.7) * 0.1;
        c.light.intensity = flick;
        c.wick.scale.y = 0.9 + flick * 0.2;
        c.halo.material.opacity = 0.35 + flick * 0.25;
        c.halo.scale.setScalar(0.9 + flick * 0.3);
      }
      const positions = this.dust.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += dt * 0.04;
        if (positions[i + 1] > H) positions[i + 1] = 0;
        positions[i] += Math.sin(t * 0.3 + i) * dt * 0.03;
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
