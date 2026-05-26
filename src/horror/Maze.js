import * as THREE from "three";
import { wallpaperTexture, carpetTexture, ceilingTexture } from "./Textures.js";

export const CELL = 5;
export const WALL_H = 3.2;
export const WALL_T = 0.2;

export class Maze {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.size = opts.size || 20;
    this.seed = opts.seed || Math.floor(Math.random() * 1e9);

    this.walls = [];
    this.wallBoxes = [];

    this.playerStart = new THREE.Vector3(0, 1.65, 0);
    this.exitPos = new THREE.Vector3();
    this.lightCells = [];

    this._rng = this._makeRng(this.seed);

    this._build();
  }

  _makeRng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
  }

  _build() {
    const S = this.size;
    const half = (S * CELL) / 2;

    const wallpaper = wallpaperTexture();
    wallpaper.repeat.set(1, WALL_H / 2.5);
    const carpet = carpetTexture();
    carpet.repeat.set(S, S);
    const ceil = ceilingTexture();
    ceil.repeat.set(S / 2, S / 2);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(S * CELL, S * CELL),
      new THREE.MeshStandardMaterial({ map: carpet, roughness: 0.95, metalness: 0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.floorMesh = floor;

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(S * CELL, S * CELL),
      new THREE.MeshStandardMaterial({ map: ceil, roughness: 0.9, metalness: 0 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, WALL_H, 0);
    this.scene.add(ceiling);
    this.ceilingMesh = ceiling;

    const wallMat = new THREE.MeshStandardMaterial({
      map: wallpaper.clone(),
      roughness: 0.85,
      metalness: 0,
    });
    wallMat.map.wrapS = wallMat.map.wrapT = THREE.RepeatWrapping;
    wallMat.map.needsUpdate = true;

    const cellOpen = new Uint8Array(S * S);
    cellOpen.fill(1);

    const idx = (x, y) => y * S + x;
    const rnd = this._rng;

    const blockedCells = new Set();
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        if (x === 0 || y === 0 || x === S - 1 || y === S - 1) continue;
        if (rnd() < 0.10) {
          blockedCells.add(idx(x, y));
          cellOpen[idx(x, y)] = 0;
        }
      }
    }

    const startCell = { x: (S / 2) | 0, y: (S / 2) | 0 };
    cellOpen[idx(startCell.x, startCell.y)] = 1;
    blockedCells.delete(idx(startCell.x, startCell.y));

    const exitCell = { x: S - 2, y: S - 2 };
    cellOpen[idx(exitCell.x, exitCell.y)] = 1;
    blockedCells.delete(idx(exitCell.x, exitCell.y));

    this.playerStart.set(
      (startCell.x - S / 2 + 0.5) * CELL,
      1.65,
      (startCell.y - S / 2 + 0.5) * CELL
    );
    this.exitPos.set(
      (exitCell.x - S / 2 + 0.5) * CELL,
      1.5,
      (exitCell.y - S / 2 + 0.5) * CELL
    );

    const wallSegments = [];

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const here = cellOpen[idx(x, y)];

        if (x + 1 < S) {
          const next = cellOpen[idx(x + 1, y)];
          const place = (!here || !next)
            ? true
            : rnd() < 0.35;
          if (place) {
            wallSegments.push({
              x: (x - S / 2 + 1) * CELL,
              z: (y - S / 2 + 0.5) * CELL,
              w: WALL_T,
              d: CELL,
            });
          }
        } else {
          wallSegments.push({
            x: (x - S / 2 + 1) * CELL,
            z: (y - S / 2 + 0.5) * CELL,
            w: WALL_T,
            d: CELL,
          });
        }

        if (y + 1 < S) {
          const next = cellOpen[idx(x, y + 1)];
          const place = (!here || !next)
            ? true
            : rnd() < 0.35;
          if (place) {
            wallSegments.push({
              x: (x - S / 2 + 0.5) * CELL,
              z: (y - S / 2 + 1) * CELL,
              w: CELL,
              d: WALL_T,
            });
          }
        } else {
          wallSegments.push({
            x: (x - S / 2 + 0.5) * CELL,
            z: (y - S / 2 + 1) * CELL,
            w: CELL,
            d: WALL_T,
          });
        }

        if (x === 0) {
          wallSegments.push({
            x: (x - S / 2) * CELL,
            z: (y - S / 2 + 0.5) * CELL,
            w: WALL_T,
            d: CELL,
          });
        }
        if (y === 0) {
          wallSegments.push({
            x: (x - S / 2 + 0.5) * CELL,
            z: (y - S / 2) * CELL,
            w: CELL,
            d: WALL_T,
          });
        }
      }
    }

    const merged = this._mergeNearDuplicates(wallSegments);

    const sx = startCell.x, sy = startCell.y;
    const exitX = exitCell.x, exitY = exitCell.y;

    const clear = (x1, y1, x2, y2) => {
      const minx = Math.min(x1, x2), maxx = Math.max(x1, x2);
      const miny = Math.min(y1, y2), maxy = Math.max(y1, y2);
      const halfWorld = S * CELL / 2;
      const wx1 = (minx - S / 2) * CELL;
      const wx2 = (maxx - S / 2 + 1) * CELL;
      const wz1 = (miny - S / 2) * CELL;
      const wz2 = (maxy - S / 2 + 1) * CELL;
      for (let i = merged.length - 1; i >= 0; i--) {
        const w = merged[i];
        const wxa = w.x - w.w / 2, wxb = w.x + w.w / 2;
        const wza = w.z - w.d / 2, wzb = w.z + w.d / 2;
        const onPerimeter =
          wxa <= -halfWorld + 0.01 || wxb >= halfWorld - 0.01 ||
          wza <= -halfWorld + 0.01 || wzb >= halfWorld - 0.01;
        if (onPerimeter) continue;
        const insideX = wxa > wx1 + 0.01 && wxb < wx2 - 0.01;
        const insideZ = wza > wz1 + 0.01 && wzb < wz2 - 0.01;
        if (insideX && insideZ) merged.splice(i, 1);
      }
    };

    let cx = sx, cy = sy;
    while (cx !== exitX || cy !== exitY) {
      const nx = cx + Math.sign(exitX - cx);
      const ny = cy + Math.sign(exitY - cy);
      if (cx !== exitX) {
        this._removeWallBetween(merged, cx, cy, nx, cy, S);
        cx = nx;
      } else if (cy !== exitY) {
        this._removeWallBetween(merged, cx, cy, cx, ny, S);
        cy = ny;
      }
    }

    for (let i = 0; i < 8; i++) {
      const ax = ((this._rng() * (S - 2)) | 0) + 1;
      const ay = ((this._rng() * (S - 2)) | 0) + 1;
      const w = 1 + ((this._rng() * 2) | 0);
      const h = 1 + ((this._rng() * 2) | 0);
      clear(ax, ay, Math.min(S - 2, ax + w), Math.min(S - 2, ay + h));
    }

    const wallGeoH = new THREE.BoxGeometry(1, 1, 1);
    const group = new THREE.Group();
    for (const w of merged) {
      const m = new THREE.Mesh(wallGeoH, wallMat);
      m.position.set(w.x, WALL_H / 2, w.z);
      m.scale.set(w.w, WALL_H, w.d);
      m.castShadow = false;
      m.receiveShadow = true;
      group.add(m);
      const box = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(w.x, WALL_H / 2, w.z),
        new THREE.Vector3(w.w, WALL_H, w.d)
      );
      this.wallBoxes.push(box);
      this.walls.push(m);
    }
    this.scene.add(group);
    this.wallGroup = group;

    for (let y = 1; y < S - 1; y += 2) {
      for (let x = 1; x < S - 1; x += 2) {
        if (!cellOpen[idx(x, y)]) continue;
        this.lightCells.push({
          x: (x - S / 2 + 0.5) * CELL,
          z: (y - S / 2 + 0.5) * CELL,
        });
      }
    }

    this._buildExit(wallMat);
  }

  _removeWallBetween(merged, x1, y1, x2, y2, S) {
    const eps = 0.05;
    if (x1 !== x2) {
      const wallX = (Math.max(x1, x2) - S / 2) * CELL;
      const wallZ = (y1 - S / 2 + 0.5) * CELL;
      for (let i = merged.length - 1; i >= 0; i--) {
        const w = merged[i];
        if (w.w < 0.5 &&
            Math.abs(w.x - wallX) < eps &&
            Math.abs(w.z - wallZ) < eps) {
          merged.splice(i, 1);
        }
      }
    } else if (y1 !== y2) {
      const wallX = (x1 - S / 2 + 0.5) * CELL;
      const wallZ = (Math.max(y1, y2) - S / 2) * CELL;
      for (let i = merged.length - 1; i >= 0; i--) {
        const w = merged[i];
        if (w.d < 0.5 &&
            Math.abs(w.x - wallX) < eps &&
            Math.abs(w.z - wallZ) < eps) {
          merged.splice(i, 1);
        }
      }
    }
  }

  _mergeNearDuplicates(segs) {
    const seen = new Map();
    const out = [];
    for (const s of segs) {
      const key = `${s.x.toFixed(3)}|${s.z.toFixed(3)}|${s.w.toFixed(3)}|${s.d.toFixed(3)}`;
      if (seen.has(key)) continue;
      seen.set(key, true);
      out.push(s);
    }
    return out;
  }

  _buildExit(wallMatBase) {
    const exitGeo = new THREE.PlaneGeometry(1.2, 2);
    const exitMat = new THREE.MeshBasicMaterial({ color: 0xffe07a, transparent: true, opacity: 0.85 });
    const exit = new THREE.Mesh(exitGeo, exitMat);
    exit.position.copy(this.exitPos);
    exit.position.y = 1.3;
    this.scene.add(exit);
    this.exitMesh = exit;

    const light = new THREE.PointLight(0xffd070, 1.6, 8, 1.8);
    light.position.copy(this.exitPos);
    light.position.y = 1.8;
    this.scene.add(light);
    this.exitLight = light;
  }

  update(dt, t, cameraPos) {
    if (this.exitMesh) {
      this.exitMesh.lookAt(cameraPos.x, this.exitMesh.position.y, cameraPos.z);
      this.exitMesh.material.opacity = 0.7 + 0.2 * Math.sin(t * 2.4);
    }
  }

  collideAABB(pos, radius = 0.3) {
    const out = pos.clone();
    const minY = pos.y - 0.9;
    const maxY = pos.y + 0.9;
    for (const b of this.wallBoxes) {
      if (b.max.y < minY || b.min.y > maxY) continue;
      const cx = Math.max(b.min.x, Math.min(out.x, b.max.x));
      const cz = Math.max(b.min.z, Math.min(out.z, b.max.z));
      const dx = out.x - cx;
      const dz = out.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        const d = Math.sqrt(d2) || 0.0001;
        const push = (radius - d) / d;
        out.x += dx * push;
        out.z += dz * push;
      }
    }
    const half = (this.size * CELL) / 2 - radius;
    out.x = Math.max(-half, Math.min(half, out.x));
    out.z = Math.max(-half, Math.min(half, out.z));
    return out;
  }
}
