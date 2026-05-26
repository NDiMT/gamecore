import * as THREE from "three";

function noise2D(x, y, seed = 0) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.71);
  return (s - Math.floor(s));
}

function makeCanvas(size) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return c;
}

export function wallpaperTexture() {
  const size = 512;
  const c = makeCanvas(size);
  const ctx = c.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, "#d6b85a");
  grad.addColorStop(1, "#b89c40");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 1.6;
    ctx.fillStyle = Math.random() < 0.5 ? "#8a6e20" : "#e8cc6a";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(110,86,32,0.35)";
  ctx.lineWidth = 1;
  for (let x = 0; x < size; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(70,52,18,0.22)";
  for (let y = 8; y < size; y += 24) {
    for (let x = 0; x < size; x += 16) {
      const ox = (Math.floor(y / 24) % 2) * 8;
      ctx.fillRect(x + ox, y, 3, 3);
    }
  }

  ctx.fillStyle = "rgba(40,28,8,0.10)";
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const w = 20 + Math.random() * 80;
    const h = 8 + Math.random() * 40;
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function carpetTexture() {
  const size = 512;
  const c = makeCanvas(size);
  const ctx = c.getContext("2d");

  ctx.fillStyle = "#3a2a14";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 60000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = Math.random();
    const r = 30 + v * 50;
    const g = 22 + v * 30;
    const b = 10 + v * 18;
    ctx.fillStyle = `rgb(${r|0},${g|0},${b|0})`;
    ctx.fillRect(x, y, 1, 1 + Math.random() * 1.5);
  }

  ctx.fillStyle = "rgba(20,12,4,0.18)";
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 30 + Math.random() * 90;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function ceilingTexture() {
  const size = 512;
  const c = makeCanvas(size);
  const ctx = c.getContext("2d");

  ctx.fillStyle = "#d8d2bc";
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(60,52,40,0.35)";
  ctx.lineWidth = 2;
  const tile = 128;
  for (let x = 0; x <= size; x += tile) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke();
  }
  for (let y = 0; y <= size; y += tile) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
  }

  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 180 + Math.random() * 40;
    ctx.fillStyle = `rgba(${v|0},${(v-8)|0},${(v-24)|0},0.18)`;
    ctx.fillRect(x, y, 1, 1);
  }

  ctx.fillStyle = "rgba(82,58,18,0.10)";
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 8 + Math.random() * 28;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
