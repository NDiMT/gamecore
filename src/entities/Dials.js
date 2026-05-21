import * as THREE from "three";
import { COLORS_PAST, COLORS_FUTURE, DIAL_FUTURE_LABELS } from "../constants.js";

function makeNumberTexture(num, color, bg) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(128, 128, 110, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = "bold 160px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(num), 128, 138);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r1 = 100, r2 = 112;
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(a) * r1, 128 + Math.sin(a) * r1);
    ctx.lineTo(128 + Math.cos(a) * r2, 128 + Math.sin(a) * r2);
    ctx.stroke();
  }
  return new THREE.CanvasTexture(c);
}

export class Dials {
  constructor(scene3d, state, era, picker) {
    this.scene3d = scene3d;
    this.state = state;
    this.era = era;
    this.picker = picker;
    this.group = new THREE.Group();
    this.dialMeshes = [];
    this.build();
    scene3d.add(this.group);
    this.refresh();
  }

  build() {
    const palette = this.era === "past" ? COLORS_PAST : COLORS_FUTURE;
    const wallZ = -5.9;
    const wallY = 2.6;
    const spacing = 1.6;
    for (let i = 0; i < 3; i++) {
      const wrap = new THREE.Group();
      wrap.position.set((i - 1) * spacing, wallY, wallZ);

      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 1.1, 0.1),
        new THREE.MeshStandardMaterial({ color: palette.metal, metalness: 0.4, roughness: 0.5 })
      );
      plate.castShadow = true;
      wrap.add(plate);

      const tex = makeNumberTexture(0, this.era === "past" ? "#2a1a08" : "#ffffff", this.era === "past" ? "#d4b074" : "#3a4858");
      const dialMat = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.5, roughness: 0.4 });
      const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.15, 32), dialMat);
      dial.rotation.x = Math.PI / 2;
      dial.position.z = 0.13;
      wrap.add(dial);

      if (this.era === "past") {
        this.picker.register(plate, () => this.rotate(i));
        this.picker.register(dial, () => this.rotate(i));
      }

      const labelTex = makeLabelTexture(this.era === "past" ? String(i + 1) : DIAL_FUTURE_LABELS[i]);
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.6),
        new THREE.MeshBasicMaterial({ map: labelTex, transparent: true })
      );
      label.position.set(0, -0.75, 0.06);
      wrap.add(label);

      this.group.add(wrap);
      this.dialMeshes.push({ wrap, dial, plate, mat: dialMat });
    }

    if (this.era === "past") {
      const note = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 1.1),
        new THREE.MeshStandardMaterial({ color: 0xd9c89a, roughness: 0.95 })
      );
      note.position.set(-4.2, 1.5, -5.9);
      note.rotation.y = 0.05;
      this.group.add(note);
    }
  }

  rotate(idx) {
    this.state.rotateDial(idx);
  }

  refresh() {
    this.dialMeshes.forEach(({ dial, mat }, i) => {
      const val = this.state.dials[i];
      const tex = makeNumberTexture(
        val,
        this.era === "past" ? "#2a1a08" : "#ffffff",
        this.era === "past" ? "#d4b074" : "#3a4858"
      );
      if (mat.map) mat.map.dispose();
      mat.map = tex;
      mat.needsUpdate = true;
      const glow = this.state.dialsLocked ? 0.4 : 0;
      mat.emissive = new THREE.Color(this.era === "past" ? 0xffd76a : 0x87b8ff);
      mat.emissiveIntensity = glow;
    });
  }

  destroy() {
    this.scene3d.remove(this.group);
  }
}

function makeLabelTexture(text) {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 128, 128);
  ctx.font = "80px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f0d9a8";
  ctx.fillText(text, 64, 70);
  return new THREE.CanvasTexture(c);
}
