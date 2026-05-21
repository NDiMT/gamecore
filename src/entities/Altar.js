import * as THREE from "three";
import { PALETTE_ROOT, SIGIL_DEFS, SIGIL_OPTIONS, ALTAR_SOLUTION } from "../constants.js";

function makeGlyphTexture(glyph, color = "#c9a25c", bg = "#2a1810") {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "rgba(255,200,120,0.4)";
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(128, 128, 110, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = "180px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(glyph, 128, 140);
  return new THREE.CanvasTexture(c);
}

export class Altar {
  constructor(scene3d, state, picker) {
    this.scene3d = scene3d;
    this.state = state;
    this.picker = picker;
    this.group = new THREE.Group();
    this.slotMeshes = [];
    this.optionMeshes = [];
    this.selectedSigil = null;
    this.build();
    scene3d.add(this.group);
    this.refresh();
  }

  build() {
    const p = PALETTE_ROOT;
    const base = new THREE.Group();
    base.position.set(0, 0, 1.2);

    const stone = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.6, 1.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 0.9 })
    );
    stone.position.y = 0.6;
    stone.castShadow = true;
    base.add(stone);

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 0.1, 16),
      new THREE.MeshStandardMaterial({ color: p.metal, metalness: 0.5, roughness: 0.4 })
    );
    top.position.y = 1.25;
    base.add(top);

    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      const slot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 0.05, 16),
        new THREE.MeshStandardMaterial({ color: 0x1a0e08, emissive: 0x000000, emissiveIntensity: 0 })
      );
      slot.position.set(Math.cos(a) * 0.85, 1.3, Math.sin(a) * 0.85);
      base.add(slot);

      const glyphPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.6),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
      );
      glyphPlane.position.copy(slot.position);
      glyphPlane.position.y += 0.04;
      glyphPlane.rotation.x = -Math.PI / 2;
      base.add(glyphPlane);

      const pickPad = new THREE.Mesh(
        new THREE.CircleGeometry(0.5, 16),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
      );
      pickPad.position.copy(slot.position);
      pickPad.position.y += 0.05;
      pickPad.rotation.x = -Math.PI / 2;
      base.add(pickPad);

      const slotIdx = i;
      this.picker.register(pickPad, {
        onTap: () => this.onSlotTap(slotIdx),
        onHover: () => slot.material.emissive = new THREE.Color(0xc9a25c).multiplyScalar(0.5),
        onHoverOut: () => slot.material.emissive = new THREE.Color(0x000000),
      });

      this.slotMeshes.push({ slot, glyph: glyphPlane });
    }

    this.group.add(base);

    SIGIL_OPTIONS.forEach((sig, idx) => {
      const tex = makeGlyphTexture(SIGIL_DEFS[sig].glyph);
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.08),
        [
          new THREE.MeshStandardMaterial({ color: 0x3a2810, roughness: 0.6 }),
          new THREE.MeshStandardMaterial({ color: 0x3a2810, roughness: 0.6 }),
          new THREE.MeshStandardMaterial({ color: 0x3a2810, roughness: 0.6 }),
          new THREE.MeshStandardMaterial({ color: 0x3a2810, roughness: 0.6 }),
          new THREE.MeshStandardMaterial({ map: tex, transparent: true }),
          new THREE.MeshStandardMaterial({ map: tex, transparent: true }),
        ]
      );
      const a = (idx / SIGIL_OPTIONS.length) * Math.PI * 2;
      m.position.set(Math.cos(a) * 3.0, 0.5, Math.sin(a) * 3.0 + 4);
      m.rotation.y = -a;
      m.castShadow = true;
      const pickPad = new THREE.Mesh(
        new THREE.SphereGeometry(0.45),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
      );
      pickPad.position.copy(m.position);
      this.group.add(m);
      this.group.add(pickPad);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.5, 0.6, 24),
        new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0 })
      );
      ring.position.copy(m.position);
      ring.lookAt(this.scene3d.camera.position);
      this.group.add(ring);

      this.picker.register(pickPad, {
        onTap: () => this.onSigilTap(sig),
        onHover: () => ring.material.opacity = 0.6,
        onHoverOut: () => ring.material.opacity = this.selectedSigil === sig ? 0.9 : 0,
      });
      this.optionMeshes.push({ box: m, pad: pickPad, ring, sig });
    });
  }

  onSlotTap(idx) {
    if (!this.state.vaultOpen) return;
    if (this.state.altarSolved) return;
    if (this.selectedSigil) {
      this.state.placeSigil(idx, this.selectedSigil);
      this.selectedSigil = null;
      this.refreshRings();
    } else if (this.state.altarSlots[idx]) {
      this.state.clearSigil(idx);
    }
  }

  onSigilTap(sig) {
    if (!this.state.vaultOpen) return;
    if (this.state.altarSolved) return;
    this.selectedSigil = this.selectedSigil === sig ? null : sig;
    this.refreshRings();
  }

  refreshRings() {
    this.optionMeshes.forEach(({ ring, sig }) => {
      ring.material.opacity = this.selectedSigil === sig ? 0.9 : 0;
    });
  }

  refresh() {
    this.slotMeshes.forEach(({ slot, glyph }, i) => {
      const sig = this.state.altarSlots[i];
      if (sig) {
        const tex = makeGlyphTexture(SIGIL_DEFS[sig].glyph, this.state.altarSolved ? "#ffd76a" : "#c9a25c");
        if (glyph.material.map) glyph.material.map.dispose();
        glyph.material.map = tex;
        glyph.material.opacity = 1;
        glyph.material.needsUpdate = true;
        slot.material.emissive = new THREE.Color(this.state.altarSolved ? 0xffaa44 : 0x441100);
        slot.material.emissiveIntensity = this.state.altarSolved ? 1.5 : 0.4;
      } else {
        glyph.material.opacity = 0;
        slot.material.emissive = new THREE.Color(0x000000);
        slot.material.emissiveIntensity = 0;
      }
    });
  }

  destroy() {
    this.optionMeshes.forEach(({ pad }) => this.picker.unregister(pad));
    this.scene3d.remove(this.group);
  }
}
