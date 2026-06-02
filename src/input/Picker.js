import * as THREE from 'three';

// Translates clicks into game picks. Distinguishes a click from an orbit-drag
// by measuring pointer travel, then raycasts monsters first (attack) and floor
// tiles second (move). Calls onPick({ type:'monster', id }) or
// ({ type:'tile', x, y }).
export class Picker {
  constructor(renderer, board, tokens, onPick) {
    this.renderer = renderer;
    this.board = board;
    this.tokens = tokens;
    this.onPick = onPick;
    this.ray = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();

    const el = renderer.renderer.domElement;
    let downX = 0;
    let downY = 0;
    el.addEventListener('pointerdown', (e) => {
      downX = e.clientX;
      downY = e.clientY;
    });
    el.addEventListener('pointerup', (e) => {
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moved < 6) this._pick(e);
    });
  }

  _pick(e) {
    const rect = this.renderer.renderer.domElement.getBoundingClientRect();
    this.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.ray.setFromCamera(this.ndc, this.renderer.camera);

    const monsterHits = this.ray.intersectObjects(this.tokens.monsterMeshes, true);
    if (monsterHits.length) {
      const id = findMonsterId(monsterHits[0].object);
      if (id) {
        this.onPick({ type: 'monster', id });
        return;
      }
    }

    const floorHits = this.ray.intersectObjects(this.board.floorMeshes, false);
    for (const hit of floorHits) {
      if (!hit.object.visible) continue;
      const { x, y } = hit.object.userData;
      this.onPick({ type: 'tile', x, y });
      return;
    }
  }
}

function findMonsterId(obj) {
  let cur = obj;
  while (cur) {
    if (cur.userData && cur.userData.monsterId) return cur.userData.monsterId;
    cur = cur.parent;
  }
  return null;
}
