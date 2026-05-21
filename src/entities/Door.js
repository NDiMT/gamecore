import * as THREE from "three";
import { COLORS_PAST, COLORS_FUTURE } from "../constants.js";

export class Door {
  constructor(scene3d, state, era, picker) {
    this.scene3d = scene3d;
    this.state = state;
    this.era = era;
    this.picker = picker;
    this.group = new THREE.Group();
    this.build();
    scene3d.add(this.group);
    this.refresh();
  }

  build() {
    const palette = this.era === "past" ? COLORS_PAST : COLORS_FUTURE;
    const frontZ = 5.95;

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 3.6, 0.2),
      new THREE.MeshStandardMaterial({ color: palette.metal, metalness: 0.4, roughness: 0.6 })
    );
    frame.position.set(0, 1.8, frontZ);
    this.group.add(frame);

    this.panel = new THREE.Mesh(
      new THREE.BoxGeometry(2, 3.2, 0.15),
      new THREE.MeshStandardMaterial({ color: this.era === "past" ? 0x3a2010 : 0x2a3040, roughness: 0.7, metalness: 0.2 })
    );
    this.panel.position.set(0, 1.7, frontZ - 0.05);
    this.group.add(this.panel);

    this.slot = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.3),
      new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x000000, emissiveIntensity: 0 })
    );
    this.slot.position.set(0, 1.7, frontZ - 0.15);
    this.group.add(this.slot);

    this.fragMeshes = [];
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.18),
        new THREE.MeshStandardMaterial({ color: 0x444444, transparent: true, opacity: 0.0 })
      );
      const a = (i / 3) * Math.PI * 2;
      m.position.set(Math.cos(a) * 0.7, 1.7 + Math.sin(a) * 0.7, frontZ - 0.18);
      this.group.add(m);
      this.fragMeshes.push(m);
    }

    this.glow = new THREE.PointLight(0xffd76a, 0, 4);
    this.glow.position.set(0, 1.7, frontZ - 0.4);
    this.group.add(this.glow);

    this.picker.register(this.panel, () => this.state.tryOpenDoor());
    this.picker.register(this.slot, () => {
      if (this.state.doorOpen) this.state.escape();
      else this.state.tryOpenDoor();
    });
  }

  refresh() {
    const f = this.state.fragments;
    const colors = [0xc94f4f, 0x4fc97a, 0x4f7fc9];
    const keys = ["dial", "plate", "lever"];
    this.fragMeshes.forEach((m, i) => {
      const have = f[keys[i]];
      m.material.color.set(have ? colors[i] : 0x444444);
      m.material.opacity = have ? 1 : 0.25;
      m.material.emissive = new THREE.Color(have ? colors[i] : 0x000000);
      m.material.emissiveIntensity = have ? 0.6 : 0;
    });
    if (this.state.doorOpen) {
      this.slot.material.emissive = new THREE.Color(0xffe080);
      this.slot.material.emissiveIntensity = 1.5;
      this.glow.intensity = 1.6;
    } else {
      const ready = f.dial && f.plate && f.lever;
      this.slot.material.emissive = new THREE.Color(ready ? 0xffaa44 : 0x000000);
      this.slot.material.emissiveIntensity = ready ? 0.6 : 0;
      this.glow.intensity = ready ? 0.5 : 0;
    }
  }

  tick(dt) {
    this.fragMeshes.forEach((m, i) => {
      m.rotation.y += dt * (0.6 + i * 0.2);
      m.rotation.x += dt * 0.3;
    });
    this.slot.rotation.y += dt * 0.4;
    this.slot.rotation.x += dt * 0.2;
  }

  destroy() {
    this.scene3d.remove(this.group);
  }
}
