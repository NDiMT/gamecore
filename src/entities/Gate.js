import * as THREE from "three";
import { PALETTE_SKY, PALETTE_ROOT } from "../constants.js";

export class Gate {
  constructor(scene3d, state, picker, chamber) {
    this.scene3d = scene3d;
    this.state = state;
    this.picker = picker;
    this.chamber = chamber;
    this.group = new THREE.Group();
    this.build();
    scene3d.add(this.group);
    this.refresh();
  }

  build() {
    const p = this.chamber === "sky" ? PALETTE_SKY : PALETTE_ROOT;
    const frontZ = 5.93;

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 4.2, 0.4),
      new THREE.MeshStandardMaterial({ color: p.metal, metalness: 0.5, roughness: 0.5 })
    );
    frame.position.set(0, 2.1, frontZ);
    frame.castShadow = true;
    this.group.add(frame);

    this.leafL = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 3.8, 0.16),
      new THREE.MeshStandardMaterial({ color: this.chamber === "sky" ? 0x121826 : 0x2a1808, roughness: 0.7 })
    );
    this.leafL.position.set(-0.7, 2.0, frontZ - 0.1);
    this.group.add(this.leafL);

    this.leafR = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 3.8, 0.16),
      new THREE.MeshStandardMaterial({ color: this.chamber === "sky" ? 0x121826 : 0x2a1808, roughness: 0.7 })
    );
    this.leafR.position.set(0.7, 2.0, frontZ - 0.1);
    this.group.add(this.leafR);

    this.glow = new THREE.PointLight(p.glow, 0, 6);
    this.glow.position.set(0, 2, frontZ - 0.5);
    this.group.add(this.glow);

    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 4.2, 0.3),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    );
    pad.position.set(0, 2.1, frontZ - 0.1);
    this.group.add(pad);
    this.pad = pad;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 1.85, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0 })
    );
    ring.position.set(0, 2.1, frontZ - 0.2);
    this.group.add(ring);
    this.ring = ring;

    this.picker.register(pad, {
      onTap: () => this.state.tryEscape(),
      onHover: () => { if (this.state.gateOpen) ring.material.opacity = 0.6; },
      onHoverOut: () => ring.material.opacity = 0,
    });
  }

  refresh() {
    if (this.state.gateOpen) {
      this.leafL.position.x = -1.5;
      this.leafR.position.x = 1.5;
      this.glow.intensity = 2.5;
      this.ring.material.color.set(this.chamber === "sky" ? 0x88aaff : 0xffaa44);
    } else {
      this.leafL.position.x = -0.7;
      this.leafR.position.x = 0.7;
      this.glow.intensity = 0;
    }
  }

  destroy() {
    this.picker.unregister(this.pad);
    this.scene3d.remove(this.group);
  }
}
