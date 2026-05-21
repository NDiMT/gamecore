import * as THREE from "three";
import { COLORS_PAST, COLORS_FUTURE, PLATE_FUTURE_STATUS } from "../constants.js";

export class Plates {
  constructor(scene3d, state, era, picker) {
    this.scene3d = scene3d;
    this.state = state;
    this.era = era;
    this.picker = picker;
    this.group = new THREE.Group();
    this.plateMeshes = [];
    this.build();
    scene3d.add(this.group);
    this.refresh();
  }

  build() {
    const palette = this.era === "past" ? COLORS_PAST : COLORS_FUTURE;
    const spacing = 1.4;
    for (let i = 0; i < 4; i++) {
      const wrap = new THREE.Group();
      wrap.position.set((i - 1.5) * spacing, 0.06, 2.4);

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.1, 1),
        new THREE.MeshStandardMaterial({ color: palette.stone, roughness: 0.95 })
      );
      base.receiveShadow = true;
      base.castShadow = true;
      wrap.add(base);

      const inset = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.06, 0.8),
        new THREE.MeshStandardMaterial({ color: palette.metal, metalness: 0.4, roughness: 0.5 })
      );
      inset.position.y = 0.08;
      wrap.add(inset);

      if (this.era === "future") {
        const isBroken = PLATE_FUTURE_STATUS[i] === "σπασμένη";
        if (isBroken) {
          const crack = new THREE.Mesh(
            new THREE.BoxGeometry(0.85, 0.005, 0.05),
            new THREE.MeshBasicMaterial({ color: 0x000000 })
          );
          crack.position.y = 0.11;
          wrap.add(crack);
          const crack2 = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.005, 0.85),
            new THREE.MeshBasicMaterial({ color: 0x000000 })
          );
          crack2.position.y = 0.11;
          wrap.add(crack2);
        } else {
          const glow = new THREE.Mesh(
            new THREE.RingGeometry(0.25, 0.32, 24),
            new THREE.MeshBasicMaterial({ color: 0x87b8ff, transparent: true, opacity: 0.7 })
          );
          glow.rotation.x = -Math.PI / 2;
          glow.position.y = 0.11;
          wrap.add(glow);
        }
      }

      if (this.era === "past") {
        this.picker.register(base, () => this.state.togglePlate(i));
        this.picker.register(inset, () => this.state.togglePlate(i));
      }

      this.group.add(wrap);
      this.plateMeshes.push({ wrap, inset });
    }
  }

  refresh() {
    this.plateMeshes.forEach(({ wrap, inset }, i) => {
      const pressed = this.state.plates[i];
      const targetY = pressed ? 0.03 : 0.08;
      inset.position.y = targetY;
      const mat = inset.material;
      if (this.state.platesLocked && pressed) {
        mat.emissive = new THREE.Color(this.era === "past" ? 0xffd76a : 0x87b8ff);
        mat.emissiveIntensity = 0.5;
      } else if (pressed) {
        mat.emissive = new THREE.Color(0xffaa44);
        mat.emissiveIntensity = 0.15;
      } else {
        mat.emissive = new THREE.Color(0x000000);
        mat.emissiveIntensity = 0;
      }
    });
  }

  destroy() {
    this.scene3d.remove(this.group);
  }
}
