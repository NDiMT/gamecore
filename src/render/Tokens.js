import * as THREE from 'three';
import { tileRevealed } from '../game/visibility.js';

// Manages hero and monster figures: creates/updates/removes them from
// snapshots, hides monsters still hidden by fog, and marks the active hero.
export class Tokens {
  constructor(scene, board, map) {
    this.board = board;
    this.map = map;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.tokens = new Map(); // id -> { group, target:Vector3 }

    const ringGeo = new THREE.TorusGeometry(0.42, 0.05, 8, 28);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xe6b450, emissive: 0xe6b450, emissiveIntensity: 0.8 });
    this.activeRing = new THREE.Mesh(ringGeo, ringMat);
    this.activeRing.rotation.x = -Math.PI / 2;
    this.activeRing.visible = false;
    scene.add(this.activeRing);

    this.monsterMeshes = []; // for raycasting attacks
    this.heroMeshes = []; //   for raycasting heal-spell targets
  }

  _heroMesh(hero) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.38, 0.08, 20),
      new THREE.MeshStandardMaterial({ color: 0x1a1626, roughness: 1 })
    );
    base.position.y = 0.1;
    base.receiveShadow = true;
    g.add(base);
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.22, 0.34, 6, 14),
      new THREE.MeshStandardMaterial({ color: hero.color, roughness: 0.6, metalness: 0.15 })
    );
    body.position.y = 0.5;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xe8c9a0, roughness: 0.8 })
    );
    head.position.y = 0.86;
    head.castShadow = true;
    g.add(head);
    g.userData = { heroId: hero.id };
    body.userData = { heroId: hero.id };
    head.userData = { heroId: hero.id };
    base.userData = { heroId: hero.id };
    return g;
  }

  _monsterMesh(m) {
    const g = new THREE.Group();
    const scale = m.boss ? 1.5 : 1;
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34 * scale, 0.38 * scale, 0.08, 20),
      new THREE.MeshStandardMaterial({ color: 0x140f1c, roughness: 1 })
    );
    base.position.y = 0.1;
    g.add(base);
    const bodyGeo = m.boss
      ? new THREE.IcosahedronGeometry(0.42, 0)
      : new THREE.ConeGeometry(0.28, 0.7, 7);
    const body = new THREE.Mesh(
      bodyGeo,
      new THREE.MeshStandardMaterial({
        color: m.color,
        roughness: 0.5,
        emissive: m.boss ? 0x551122 : 0x000000,
        emissiveIntensity: 0.6,
      })
    );
    body.position.y = m.boss ? 0.6 : 0.5;
    body.castShadow = true;
    g.add(body);
    g.userData = { monsterId: m.id };
    body.userData = { monsterId: m.id };
    base.userData = { monsterId: m.id };
    return g;
  }

  _place(g, x, y) {
    const w = this.board.worldFromTile(x, y);
    g.position.set(w.x, 0, w.z);
  }

  sync(snap) {
    const seen = new Set();
    this.monsterMeshes = [];
    this.heroMeshes = [];

    for (const hero of snap.heroes) {
      if (!hero.alive) continue;
      seen.add(hero.id);
      let entry = this.tokens.get(hero.id);
      if (!entry) {
        const g = this._heroMesh(hero);
        this._place(g, hero.x, hero.y);
        this.group.add(g);
        entry = { group: g, target: g.position.clone() };
        this.tokens.set(hero.id, entry);
      }
      const w = this.board.worldFromTile(hero.x, hero.y);
      entry.target.set(w.x, 0, w.z);
      this.heroMeshes.push(entry.group);
    }

    for (const m of snap.monsters) {
      const visible = m.alive && tileRevealed(this.map, snap, m.x, m.y);
      if (!visible) continue;
      seen.add(m.id);
      let entry = this.tokens.get(m.id);
      if (!entry) {
        const g = this._monsterMesh(m);
        this._place(g, m.x, m.y);
        this.group.add(g);
        entry = { group: g, target: g.position.clone() };
        this.tokens.set(m.id, entry);
      }
      const w = this.board.worldFromTile(m.x, m.y);
      entry.target.set(w.x, 0, w.z);
      this.monsterMeshes.push(entry.group);
    }

    // Remove tokens that died or slipped back into fog.
    for (const [id, entry] of this.tokens) {
      if (!seen.has(id)) {
        this.group.remove(entry.group);
        this.tokens.delete(id);
      }
    }

    // Active-hero marker.
    const activeHero = snap.heroes.find((h) => h.id === snap.turn.order[snap.turn.idx]);
    if (activeHero && activeHero.alive && snap.phase === 'playing') {
      const w = this.board.worldFromTile(activeHero.x, activeHero.y);
      this.activeRing.position.set(w.x, 0.16, w.z);
      this.activeRing.visible = true;
    } else {
      this.activeRing.visible = false;
    }
  }

  update(dt) {
    const k = Math.min(1, dt * 12);
    for (const { group, target } of this.tokens.values()) {
      group.position.lerp(target, k);
    }
    this.activeRing.rotation.z += dt * 1.5;
  }
}
