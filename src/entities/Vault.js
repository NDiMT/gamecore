import * as THREE from "three";
import { PALETTE_ROOT, SIGIL_DEFS, ALTAR_SOLUTION } from "../constants.js";

function makeGlyphTexture(glyph, color, bg) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 240, 240);
  ctx.fillStyle = color;
  ctx.font = "180px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(glyph, 128, 138);
  return new THREE.CanvasTexture(c);
}

export class Vault {
  constructor(scene3d, state, picker) {
    this.scene3d = scene3d;
    this.state = state;
    this.picker = picker;
    this.group = new THREE.Group();
    this.build();
    scene3d.add(this.group);
    this.refresh();
  }

  build() {
    const p = PALETTE_ROOT;
    const wallZ = -5.92;
    const wrap = new THREE.Group();
    wrap.position.set(0, 2.2, wallZ);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 2.4, 0.5),
      new THREE.MeshStandardMaterial({ color: p.metal, metalness: 0.6, roughness: 0.4 })
    );
    box.position.z = 0.25;
    box.castShadow = true;
    wrap.add(box);

    this.door = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.2, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.6 })
    );
    this.door.position.z = 0.55;
    wrap.add(this.door);

    this.lock = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.18),
      new THREE.MeshStandardMaterial({ color: 0x222, emissive: 0x000, emissiveIntensity: 0 })
    );
    this.lock.position.set(0, 0, 0.65);
    wrap.add(this.lock);

    this.sigilDisplay = new THREE.Group();
    this.sigilDisplay.position.set(0, 0, 0.62);
    this.sigilMats = [];
    for (let i = 0; i < 3; i++) {
      const tex = makeGlyphTexture(SIGIL_DEFS[ALTAR_SOLUTION[i]].glyph, "#c9a25c", "#3a2418");
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0 });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), mat);
      m.position.set((i - 1) * 0.7, 0, 0);
      this.sigilDisplay.add(m);
      this.sigilMats.push(mat);
    }
    wrap.add(this.sigilDisplay);

    this.glow = new THREE.PointLight(p.glow, 0, 5);
    this.glow.position.set(0, 0, 0.8);
    wrap.add(this.glow);

    this.group.add(wrap);
    this.wrap = wrap;
  }

  refresh() {
    if (this.state.vaultOpen) {
      this.door.position.y = -0.6;
      this.door.rotation.x = -0.6;
      this.door.material.color.set(0x1a0e08);
      this.lock.material.emissive = new THREE.Color(0xffa040);
      this.lock.material.emissiveIntensity = 1.4;
      this.glow.intensity = 1.0;
      this.sigilMats.forEach(m => m.opacity = 1);
    } else {
      this.door.position.y = 0;
      this.door.rotation.x = 0;
      this.lock.material.emissive = new THREE.Color(0x000000);
      this.lock.material.emissiveIntensity = 0;
      this.glow.intensity = 0;
      this.sigilMats.forEach(m => m.opacity = 0);
    }
  }

  destroy() { this.scene3d.remove(this.group); }
}
