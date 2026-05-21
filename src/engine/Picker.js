import * as THREE from "three";

export class Picker {
  constructor(camera) {
    this.camera = camera;
    this.ray = new THREE.Raycaster();
    this.pickables = new Map();
    this.hovered = null;
  }

  register(obj, handlers) {
    this.pickables.set(obj.uuid, { obj, ...handlers });
  }

  unregister(obj) { this.pickables.delete(obj.uuid); }
  clear() { this.pickables.clear(); this.hovered = null; }

  pickAt(ndcX, ndcY) {
    this.ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const targets = [...this.pickables.values()].map(e => e.obj);
    const hits = this.ray.intersectObjects(targets, true);
    if (!hits.length) return null;
    let h = hits[0].object;
    while (h) {
      const entry = this.pickables.get(h.uuid);
      if (entry && entry.onTap) { entry.onTap(hits[0]); return entry; }
      h = h.parent;
    }
    return null;
  }

  hoverAt(ndcX, ndcY) {
    this.ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const targets = [...this.pickables.values()].map(e => e.obj);
    const hits = this.ray.intersectObjects(targets, true);
    let found = null;
    if (hits.length) {
      let h = hits[0].object;
      while (h) {
        if (this.pickables.has(h.uuid)) { found = this.pickables.get(h.uuid); break; }
        h = h.parent;
      }
    }
    if (found !== this.hovered) {
      if (this.hovered && this.hovered.onHoverOut) this.hovered.onHoverOut();
      if (found && found.onHover) found.onHover();
      this.hovered = found;
    }
  }
}
