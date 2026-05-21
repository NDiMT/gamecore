import * as THREE from "three";
import { STAR_MAP_POSITIONS, PALETTE_SKY } from "../constants.js";

export class StarMap {
  constructor(scene3d, state, picker) {
    this.scene3d = scene3d;
    this.state = state;
    this.picker = picker;
    this.group = new THREE.Group();
    this.starGroups = [];
    this.build();
    scene3d.add(this.group);
    this.refresh();
  }

  build() {
    const wallZ = -5.92;
    const p = PALETTE_SKY;

    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(9.5, 5.5),
      new THREE.MeshStandardMaterial({ color: 0x0a0a1c, roughness: 0.95, metalness: 0.1 })
    );
    plate.position.set(0, 3.3, wallZ + 0.01);
    plate.receiveShadow = true;
    this.group.add(plate);

    const frameMat = new THREE.MeshStandardMaterial({ color: p.metal, metalness: 0.6, roughness: 0.4 });
    const fL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 5.7, 0.2), frameMat); fL.position.set(-4.85, 3.3, wallZ + 0.08); this.group.add(fL);
    const fR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 5.7, 0.2), frameMat); fR.position.set( 4.85, 3.3, wallZ + 0.08); this.group.add(fR);
    const fT = new THREE.Mesh(new THREE.BoxGeometry(9.85, 0.15, 0.2), frameMat); fT.position.set(0, 6.15, wallZ + 0.08); this.group.add(fT);
    const fB = new THREE.Mesh(new THREE.BoxGeometry(9.85, 0.15, 0.2), frameMat); fB.position.set(0, 0.5, wallZ + 0.08); this.group.add(fB);

    STAR_MAP_POSITIONS.forEach((pos, i) => {
      const wrap = new THREE.Group();
      wrap.position.set(pos.x, pos.y + 1.0, wallZ + 0.12);

      const dim = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0x445080, emissive: 0x111830, emissiveIntensity: 0.4 })
      );
      wrap.add(dim);

      const bright = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 16, 12),
        new THREE.MeshStandardMaterial({ color: p.star, emissive: p.star, emissiveIntensity: 2.5, transparent: true, opacity: 0 })
      );
      wrap.add(bright);

      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 16, 12),
        new THREE.MeshBasicMaterial({ color: p.star, transparent: true, opacity: 0 })
      );
      wrap.add(halo);

      const pick = new THREE.Mesh(
        new THREE.PlaneGeometry(0.85, 0.85),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
      );
      wrap.add(pick);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.32, 0.42, 24),
        new THREE.MeshBasicMaterial({ color: p.glow, transparent: true, opacity: 0 })
      );
      ring.position.z = -0.05;
      wrap.add(ring);

      this.picker.register(pick, {
        onTap: () => this.state.toggleStar(i),
        onHover: () => ring.material.opacity = 0.4,
        onHoverOut: () => ring.material.opacity = 0,
      });

      this.group.add(wrap);
      this.starGroups.push({ wrap, dim, bright, halo, idx: i });
    });

    this.unsubTick = this.scene3d.tick((dt, t) => {
      this.starGroups.forEach(({ bright, halo, idx }) => {
        if (!this.state.stars[idx]) return;
        const tw = 0.85 + Math.sin(t * 2.2 + idx) * 0.12;
        bright.material.emissiveIntensity = 2.5 * tw;
        halo.material.opacity = 0.18 * tw;
      });
    });
  }

  refresh() {
    this.starGroups.forEach(({ dim, bright, halo, idx }) => {
      const lit = this.state.stars[idx];
      dim.material.opacity = lit ? 0 : 1;
      bright.material.opacity = lit ? 1 : 0;
      halo.material.opacity = lit ? 0.2 : 0;
    });
    if (this.state.starsSolved) {
      this.starGroups.forEach(({ bright, idx }) => {
        if (this.state.stars[idx]) bright.material.emissive = new THREE.Color(0xffffff);
      });
    }
  }

  destroy() {
    if (this.unsubTick) this.unsubTick();
    this.starGroups.forEach(({ wrap }) => {
      wrap.children.forEach(c => { if (c.userData.pickPad) this.picker.unregister(c); });
    });
    this.picker.clear();
    this.scene3d.remove(this.group);
  }
}
