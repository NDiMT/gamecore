import * as THREE from "three";

export class Picker {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;
    this.ray = new THREE.Raycaster();
    this.pickables = new Map();
  }

  register(obj, onTap) {
    this.pickables.set(obj.uuid, { obj, onTap });
    obj.userData.pickable = true;
  }

  unregister(obj) {
    this.pickables.delete(obj.uuid);
  }

  pickAt(ndcX, ndcY) {
    this.ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const targets = [];
    for (const { obj } of this.pickables.values()) targets.push(obj);
    const hits = this.ray.intersectObjects(targets, true);
    if (!hits.length) return null;
    let h = hits[0].object;
    while (h) {
      const entry = this.pickables.get(h.uuid);
      if (entry) { entry.onTap(hits[0]); return h; }
      h = h.parent;
    }
    return null;
  }
}
