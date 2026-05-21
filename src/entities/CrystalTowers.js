import * as THREE from "three";
import { TOWER_COUNT, TOWER_SEQUENCE, PALETTE_SKY } from "../constants.js";

export class CrystalTowers {
  constructor(scene3d, state, picker) {
    this.scene3d = scene3d;
    this.state = state;
    this.picker = picker;
    this.group = new THREE.Group();
    this.towers = [];
    this.build();
    scene3d.add(this.group);
    this.refresh();
  }

  positions() {
    return [
      { x: -2.6, y: 0, z: 1.0, label: "αριστερά πλευρά" },
      { x:  2.6, y: 0, z: 1.0, label: "δεξιά πλευρά" },
      { x: -1.6, y: 0, z: 2.4, label: "κάτω αριστερά" },
      { x:  1.6, y: 0, z: 2.4, label: "κάτω δεξιά" },
      { x:  0.0, y: 0, z: 0.0, label: "ψηλή στην κορυφή" },
    ];
  }

  build() {
    const p = PALETTE_SKY;
    const positions = this.positions();
    positions.forEach((pos, i) => {
      const wrap = new THREE.Group();
      wrap.position.set(pos.x, 0, pos.z);

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.55, 0.35, 16),
        new THREE.MeshStandardMaterial({ color: p.metal, metalness: 0.6, roughness: 0.4 })
      );
      base.position.y = 0.175;
      base.castShadow = true;
      wrap.add(base);

      const isCenter = i === 4;
      const height = isCenter ? 2.6 : 1.7;

      const crystalMat = new THREE.MeshPhysicalMaterial({
        color: isCenter ? 0xa8d4ff : 0x6f9be6,
        emissive: 0x223a66,
        emissiveIntensity: 0.6,
        transmission: 0.55,
        thickness: 0.5,
        roughness: 0.15,
        metalness: 0.2,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        ior: 1.8,
        transparent: true,
        opacity: 0.92,
      });
      const crystal = new THREE.Mesh(
        new THREE.ConeGeometry(0.32, height, 6),
        crystalMat
      );
      crystal.position.y = 0.35 + height / 2;
      crystal.castShadow = true;
      wrap.add(crystal);

      const cap = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.22),
        crystalMat.clone()
      );
      cap.position.y = 0.35 + height + 0.08;
      wrap.add(cap);

      const light = new THREE.PointLight(p.glow, 0, 3);
      light.position.set(0, 0.35 + height / 2, 0);
      wrap.add(light);

      const pick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.7, height + 0.6, 8),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
      );
      pick.position.y = 0.35 + height / 2;
      wrap.add(pick);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 0.7, 24),
        new THREE.MeshBasicMaterial({ color: p.glow, transparent: true, opacity: 0, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.36;
      wrap.add(ring);

      this.picker.register(pick, {
        onTap: () => this.state.tapTower(i),
        onHover: () => ring.material.opacity = 0.6,
        onHoverOut: () => ring.material.opacity = 0,
      });

      this.group.add(wrap);
      this.towers.push({ wrap, crystal, cap, light, ring, baseColor: crystalMat.color.clone(), idx: i });
    });

    this.unsubTick = this.scene3d.tick((dt, t) => {
      this.towers.forEach(({ crystal, cap, idx }) => {
        cap.rotation.y += dt * 0.5;
        cap.rotation.x += dt * 0.3;
        const lit = this.state.discsSolved;
        const inProgress = this.state.towerProgress.includes(idx);
        if (lit) {
          const tw = 0.6 + Math.sin(t * 1.5 + idx) * 0.1;
          crystal.material.emissiveIntensity = inProgress ? 1.8 * tw : 0.5 * tw;
        }
      });
    });
  }

  refresh() {
    const active = this.state.discsSolved;
    this.towers.forEach(({ crystal, cap, light, idx }) => {
      const done = this.state.towerProgress.includes(idx) || this.state.towersSolved;
      crystal.material.emissive = new THREE.Color(done ? 0xfff0a0 : (active ? 0x335588 : 0x111122));
      crystal.material.emissiveIntensity = done ? 1.8 : (active ? 0.5 : 0.15);
      cap.material.emissive = crystal.material.emissive;
      cap.material.emissiveIntensity = crystal.material.emissiveIntensity * 1.5;
      light.intensity = done ? 1.4 : (active ? 0.4 : 0);
      light.color = new THREE.Color(done ? 0xfff0a0 : 0x6699ff);
    });
  }

  destroy() {
    if (this.unsubTick) this.unsubTick();
    this.scene3d.remove(this.group);
  }
}
