import * as THREE from "three";
import { COMBO_DISCS, COMBO_SYMBOLS, PALETTE_ROOT } from "../constants.js";

function makeDiscTexture(symbols, accent = "#c9a25c", bg = "#1a0e08") {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 1024);
  ctx.translate(512, 512);
  for (let i = 0; i < symbols.length; i++) {
    const a = (i / symbols.length) * Math.PI * 2;
    const x = Math.cos(a) * 380;
    const y = Math.sin(a) * 380;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = accent;
    ctx.font = "200px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(symbols[i], 0, 0);
    ctx.restore();
  }
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(0, 0, 480, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 240, 0, Math.PI * 2); ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  return tex;
}

export class CombinationLock {
  constructor(scene3d, state, picker) {
    this.scene3d = scene3d;
    this.state = state;
    this.picker = picker;
    this.group = new THREE.Group();
    this.discMeshes = [];
    this.build();
    scene3d.add(this.group);
    this.refresh();
  }

  build() {
    const p = PALETTE_ROOT;
    const wallZ = -5.9;
    const wrap = new THREE.Group();
    wrap.position.set(0, 2.4, wallZ);

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 3.6, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x1a0e08, roughness: 0.7, metalness: 0.3 })
    );
    back.position.z = 0.2;
    back.castShadow = true;
    wrap.add(back);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(5.4, 3.8, 0.2),
      new THREE.MeshStandardMaterial({ color: p.metal, metalness: 0.6, roughness: 0.4 })
    );
    frame.position.z = 0.1;
    wrap.add(frame);

    const tex = makeDiscTexture(COMBO_SYMBOLS, "#d4a060");
    const discMat = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide });

    for (let i = 0; i < COMBO_DISCS; i++) {
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 0.18, 32),
        [discMat, discMat, discMat]
      );
      disc.position.set((i - 1.5) * 1.2, 0, 0.5);
      disc.rotation.x = Math.PI / 2;
      disc.castShadow = true;
      wrap.add(disc);

      const arrow = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.18, 8),
        new THREE.MeshStandardMaterial({ color: 0xffd76a, emissive: 0xffd76a, emissiveIntensity: 1.5 })
      );
      arrow.position.set((i - 1.5) * 1.2, 0.85, 0.5);
      arrow.rotation.z = Math.PI;
      wrap.add(arrow);

      const pick = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1.2),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
      );
      pick.position.set((i - 1.5) * 1.2, 0, 0.7);
      wrap.add(pick);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.62, 0.72, 32),
        new THREE.MeshBasicMaterial({ color: p.glow, transparent: true, opacity: 0 })
      );
      ring.position.set((i - 1.5) * 1.2, 0, 0.72);
      wrap.add(ring);

      const idx = i;
      this.picker.register(pick, {
        onTap: () => this.state.rotateDisc(idx),
        onHover: () => ring.material.opacity = 0.5,
        onHoverOut: () => ring.material.opacity = 0,
      });

      this.discMeshes.push({ disc, targetRot: 0, currentRot: 0, idx });
    }

    this.glow = new THREE.PointLight(p.glow, 0, 4);
    this.glow.position.set(0, 0, 0.6);
    wrap.add(this.glow);

    this.unsubTick = this.scene3d.tick((dt) => {
      this.discMeshes.forEach(d => {
        const delta = d.targetRot - d.currentRot;
        d.currentRot += delta * Math.min(1, dt * 8);
        d.disc.rotation.y = d.currentRot;
      });
    });

    this.group.add(wrap);
  }

  refresh() {
    this.discMeshes.forEach((d) => {
      const val = this.state.discs[d.idx];
      d.targetRot = -(val / COMBO_SYMBOLS.length) * Math.PI * 2;
    });
    this.glow.intensity = this.state.discsSolved ? 1.6 : (this.state.starsSolved ? 0.2 : 0);
  }

  destroy() {
    if (this.unsubTick) this.unsubTick();
    this.scene3d.remove(this.group);
  }
}
