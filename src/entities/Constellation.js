import * as THREE from "three";
import { CONSTELLATION_TARGET, PALETTE_SKY } from "../constants.js";

export class Constellation {
  constructor(scene3d, state, picker) {
    this.scene3d = scene3d;
    this.state = state;
    this.picker = picker;
    this.group = new THREE.Group();
    this.starGroups = [];
    this.dragging = -1;
    this.build();
    scene3d.add(this.group);
    this.refresh();
  }

  build() {
    const wallZ = -5.94;
    const p = PALETTE_SKY;
    const ghostMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08 });
    CONSTELLATION_TARGET.forEach((t) => {
      const g = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.22, 16), ghostMat);
      g.position.set(t.x, t.y + 1.5, wallZ + 0.02);
      this.group.add(g);
    });

    for (let i = 0; i < this.state.stars.length; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.22, 0.32, 24),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
      );
      const star = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 16, 12),
        new THREE.MeshStandardMaterial({ color: p.star, emissive: p.star, emissiveIntensity: 1.0 })
      );
      const pickPad = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 0.7),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
      );
      const wrap = new THREE.Group();
      wrap.add(ring); wrap.add(star); wrap.add(pickPad);
      this.group.add(wrap);
      this.starGroups.push({ wrap, ring, star, pad: pickPad });
      this.picker.register(pickPad, {
        onTap: () => this.cycleStar(i),
        onHover: () => ring.material.opacity = 0.35,
        onHoverOut: () => ring.material.opacity = 0,
      });
    }

    this.lines = new THREE.Group();
    this.group.add(this.lines);
  }

  cycleStar(i) {
    if (this.state.constellationSolved) return;
    const t = CONSTELLATION_TARGET[i];
    const s = this.state.stars[i];
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const stepX = Math.max(-0.8, Math.min(0.8, dx * 0.45));
    const stepY = Math.max(-0.6, Math.min(0.6, dy * 0.45));
    this.state.moveStar(i, stepX, stepY);
  }

  refresh() {
    const wallZ = -5.92;
    this.starGroups.forEach(({ wrap, star }, i) => {
      const s = this.state.stars[i];
      wrap.position.set(s.x, s.y + 1.5, wallZ);
      const t = CONSTELLATION_TARGET[i];
      const d = Math.hypot(s.x - t.x, s.y - t.y);
      const near = Math.max(0, 1 - d / 2);
      star.material.emissiveIntensity = 0.7 + near * 1.5;
      star.scale.setScalar(0.9 + near * 0.4);
    });

    while (this.lines.children.length) {
      const c = this.lines.children.pop();
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
    if (this.state.constellationSolved) {
      const pts = this.state.stars.map(s => new THREE.Vector3(s.x, s.y + 1.5, wallZ - 0.05));
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: PALETTE_SKY.glow, transparent: true, opacity: 0.85 });
      const line = new THREE.Line(geo, mat);
      this.lines.add(line);
    }
  }

  destroy() {
    this.starGroups.forEach(({ pad }) => this.picker.unregister(pad));
    this.scene3d.remove(this.group);
  }
}
