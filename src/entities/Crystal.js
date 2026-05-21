import * as THREE from "three";
import { PALETTE_SKY } from "../constants.js";

export class Crystal {
  constructor(scene3d, state, picker) {
    this.scene3d = scene3d;
    this.state = state;
    this.picker = picker;
    this.group = new THREE.Group();
    this.facets = [];
    this.build();
    scene3d.add(this.group);
    this.refresh();
  }

  build() {
    const p = PALETTE_SKY;
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.2, 1.0, 8),
      new THREE.MeshStandardMaterial({ color: p.metal, metalness: 0.6, roughness: 0.4 })
    );
    pedestal.position.set(0, 0.5, 1.5);
    pedestal.castShadow = true;
    this.group.add(pedestal);

    this.core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.45),
      new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x4477ff, emissiveIntensity: 1, transparent: true, opacity: 0.95 })
    );
    this.core.position.set(0, 2, 1.5);
    this.group.add(this.core);

    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const facet = new THREE.Group();
      facet.position.set(Math.cos(a) * 0.9, 2, Math.sin(a) * 0.9 + 1.5);

      const shape = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.7, 3),
        new THREE.MeshStandardMaterial({ color: p.glow, emissive: p.glow, emissiveIntensity: 0.6, transparent: true, opacity: 0.85, metalness: 0.4, roughness: 0.3 })
      );
      shape.rotation.x = Math.PI / 2;
      shape.rotation.y = a;
      facet.add(shape);

      const pickPad = new THREE.Mesh(
        new THREE.SphereGeometry(0.4),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
      );
      facet.add(pickPad);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.36, 0.45, 24),
        new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0 })
      );
      ring.position.set(0, 0, 0);
      ring.lookAt(this.scene3d.camera.position);
      facet.add(ring);

      this.picker.register(pickPad, {
        onTap: () => this.state.rotateCrystal(i),
        onHover: () => ring.material.opacity = 0.7,
        onHoverOut: () => ring.material.opacity = 0,
      });

      this.group.add(facet);
      this.facets.push({ facet, shape, pickPad, ring });
    }

    this.unsubTick = this.scene3d.tick((dt, t) => {
      this.core.rotation.y += dt * 0.4;
      this.core.rotation.x += dt * 0.2;
      const pulse = 1 + Math.sin(t * 2) * 0.06;
      this.core.scale.setScalar(pulse);
    });
  }

  refresh() {
    const active = this.state.altarSolved;
    this.facets.forEach(({ facet, shape }, i) => {
      const rot = this.state.crystalRotations[i];
      facet.rotation.z = rot * (Math.PI * 2 / 3);
      shape.material.opacity = active ? 0.9 : 0.15;
      shape.material.emissiveIntensity = active ? (this.state.crystalSolved ? 1.6 : 0.6) : 0.1;
    });
    this.core.visible = active;
    this.core.material.emissiveIntensity = this.state.crystalSolved ? 2.0 : 1.0;
  }

  destroy() {
    if (this.unsubTick) this.unsubTick();
    this.facets.forEach(({ pickPad }) => this.picker.unregister(pickPad));
    this.scene3d.remove(this.group);
  }
}
