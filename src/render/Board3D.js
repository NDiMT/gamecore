import * as THREE from 'three';
import { TILE, WALL_H } from '../config.js';
import { idx, WALL, FLOOR, DOOR, key, inBounds } from '../game/grid.js';
import { tileRevealed, wallVisible } from '../game/visibility.js';

const FLOOR_COLOR = 0x2b2840;
const DOOR_COLOR = 0x6e4a26;
const WALL_COLOR = 0x4a4560;
const REACH_EMISSIVE = 0x2a4cff;

// Builds the dungeon geometry from a map and drives its fog-of-war visibility.
export class Board3D {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.tileMeshes = new Map(); // "x,y" -> floor/door mesh
    this.wallMeshes = new Map(); // "x,y" -> wall mesh
    this._highlighted = new Set();

    this._build();
  }

  worldFromTile(x, y) {
    return new THREE.Vector3(x * TILE + TILE / 2, 0, y * TILE + TILE / 2);
  }

  _build() {
    const { map } = this;
    const tileGeo = new THREE.BoxGeometry(TILE * 0.97, 0.12, TILE * 0.97);
    const wallGeo = new THREE.BoxGeometry(TILE, WALL_H, TILE);
    const wallMat = new THREE.MeshStandardMaterial({ color: WALL_COLOR, roughness: 0.95 });

    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        const t = map.type[idx(map, x, y)];
        const pos = this.worldFromTile(x, y);
        if (t === FLOOR || t === DOOR) {
          const mat = new THREE.MeshStandardMaterial({
            color: t === DOOR ? DOOR_COLOR : FLOOR_COLOR,
            roughness: 0.9,
            emissive: 0x000000,
          });
          const mesh = new THREE.Mesh(tileGeo, mat);
          mesh.position.set(pos.x, 0, pos.z);
          mesh.receiveShadow = true;
          mesh.userData = { x, y, base: mat.color.getHex() };
          mesh.visible = false;
          this.group.add(mesh);
          this.tileMeshes.set(key(x, y), mesh);
        } else if (this._wallBordersFloor(x, y)) {
          const mesh = new THREE.Mesh(wallGeo, wallMat);
          mesh.position.set(pos.x, WALL_H / 2, pos.z);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.visible = false;
          this.group.add(mesh);
          this.wallMeshes.set(key(x, y), mesh);
        }
      }
    }

    // Glowing exit portal.
    const exit = this.worldFromTile(map.exit.x, map.exit.y);
    const portal = new THREE.Mesh(
      new THREE.CylinderGeometry(TILE * 0.32, TILE * 0.4, 0.06, 24),
      new THREE.MeshStandardMaterial({ color: 0x2fe0c0, emissive: 0x1fb89a, emissiveIntensity: 1.2 })
    );
    portal.position.set(exit.x, 0.12, exit.z);
    this.group.add(portal);
    this.exitPortal = portal;
  }

  _wallBordersFloor(x, y) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (!inBounds(this.map, nx, ny)) continue;
        if (this.map.type[idx(this.map, nx, ny)] !== WALL) return true;
      }
    }
    return false;
  }

  get floorMeshes() {
    return [...this.tileMeshes.values()];
  }

  updateFog(snap) {
    for (const [k, mesh] of this.tileMeshes) {
      const [x, y] = k.split(',').map(Number);
      mesh.visible = tileRevealed(this.map, snap, x, y);
    }
    for (const [k, mesh] of this.wallMeshes) {
      const [x, y] = k.split(',').map(Number);
      mesh.visible = wallVisible(this.map, snap, x, y);
    }
    this.exitPortal.visible = tileRevealed(this.map, snap, this.map.exit.x, this.map.exit.y);
  }

  // Highlight the tiles the active hero can reach this turn.
  setReachable(tiles) {
    for (const k of this._highlighted) {
      const mesh = this.tileMeshes.get(k);
      if (mesh) mesh.material.emissive.setHex(0x000000);
    }
    this._highlighted.clear();
    for (const t of tiles) {
      const k = key(t.x, t.y);
      const mesh = this.tileMeshes.get(k);
      if (mesh) {
        mesh.material.emissive.setHex(REACH_EMISSIVE);
        mesh.material.emissiveIntensity = 0.45;
        this._highlighted.add(k);
      }
    }
  }
}
