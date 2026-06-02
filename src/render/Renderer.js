import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TILE } from '../config.js';

// Owns the Three.js scene, camera, lights and render loop. Knows nothing about
// game rules — other modules add meshes to `scene` and register frame callbacks.
export class Renderer {
  constructor(container) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07060d);
    this.scene.fog = new THREE.Fog(0x07060d, 22, 46);

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.46; // stay above the floor
    this.controls.minDistance = 6;
    this.controls.maxDistance = 40;

    this._setupLights();

    this.frameCbs = [];
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    this.resize();
    this._loop();
  }

  _setupLights() {
    this.scene.add(new THREE.AmbientLight(0x4a4668, 0.7));
    const hemi = new THREE.HemisphereLight(0x8899ff, 0x251c12, 0.5);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffe9c0, 1.1);
    key.position.set(8, 18, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 60;
    const s = 26;
    Object.assign(key.shadow.camera, { left: -s, right: s, top: s, bottom: -s });
    this.scene.add(key);
    this.keyLight = key;
  }

  // Frame the camera/controls on a generated map.
  focusMap(map) {
    const cx = (map.w * TILE) / 2;
    const cz = (map.h * TILE) / 2;
    this.controls.target.set(cx, 0, cz);
    this.camera.position.set(cx, Math.max(map.w, map.h) * 0.9 + 6, cz + map.h * 0.75);
    this.keyLight.target.position.set(cx, 0, cz);
    this.scene.add(this.keyLight.target);
    this.controls.update();
  }

  onFrame(cb) {
    this.frameCbs.push(cb);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _loop() {
    const clock = new THREE.Clock();
    const tick = () => {
      this._raf = requestAnimationFrame(tick);
      const dt = clock.getDelta();
      this.controls.update();
      for (const cb of this.frameCbs) cb(dt);
      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }
}
