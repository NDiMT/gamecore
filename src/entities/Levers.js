import * as THREE from "three";
import { COLORS_PAST, COLORS_FUTURE } from "../constants.js";

export class Levers {
  constructor(scene3d, state, era, picker) {
    this.scene3d = scene3d;
    this.state = state;
    this.era = era;
    this.picker = picker;
    this.group = new THREE.Group();
    this.leverGroups = [];
    this.build();
    scene3d.add(this.group);
    this.refresh();
  }

  build() {
    const palette = this.era === "past" ? COLORS_PAST : COLORS_FUTURE;
    const spacing = 1.0;
    const wallX = 4.95;
    for (let i = 0; i < 3; i++) {
      const wrap = new THREE.Group();
      wrap.position.set(wallX - 0.05, 1.5 + (i - 1) * spacing, 0);
      wrap.rotation.y = -Math.PI / 2;

      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.45, 0.05),
        new THREE.MeshStandardMaterial({ color: palette.metal, metalness: 0.4, roughness: 0.55 })
      );
      wrap.add(plate);

      const pivot = new THREE.Group();
      pivot.position.z = 0.05;
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.4, 12),
        new THREE.MeshStandardMaterial({ color: palette.trim, metalness: 0.6, roughness: 0.3 })
      );
      handle.position.y = 0.2;
      pivot.add(handle);
      const knob = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 16, 12),
        new THREE.MeshStandardMaterial({ color: palette.trim, metalness: 0.6, roughness: 0.3 })
      );
      knob.position.y = 0.4;
      pivot.add(knob);
      wrap.add(pivot);

      if (this.era === "past") {
        this.picker.register(plate, () => this.state.toggleLever(i));
        this.picker.register(handle, () => this.state.toggleLever(i));
        this.picker.register(knob, () => this.state.toggleLever(i));
      }

      this.group.add(wrap);
      this.leverGroups.push({ wrap, pivot, plate });
    }

    if (this.era === "past") {
      const note = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 0.9),
        new THREE.MeshStandardMaterial({ color: 0xd9c89a, roughness: 0.95 })
      );
      note.position.set(wallX - 0.02, 1.5, -1.6);
      note.rotation.y = -Math.PI / 2;
      this.group.add(note);
    }
  }

  refresh() {
    this.leverGroups.forEach(({ pivot }, i) => {
      const up = this.state.levers[i] === "up";
      pivot.rotation.x = up ? -0.5 : 0.5;
    });
  }

  destroy() {
    this.scene3d.remove(this.group);
  }
}
