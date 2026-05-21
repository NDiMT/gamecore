import * as THREE from "three";
import { OrbitTouch } from "./Controls.js";
import { Picker } from "./Picker.js";
import { ERA_PAST, COLORS_PAST, COLORS_FUTURE } from "../constants.js";

export class Scene3D {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 100);
    this.camera.position.set(0, 4, 9);
    this.target = new THREE.Vector3(0, 2, 0);
    this.camera.lookAt(this.target);

    this.controls = new OrbitTouch(this.camera, this.renderer.domElement, this.target);
    this.picker = new Picker(this.camera, this.scene);
    this.controls.onTap((nx, ny) => this.picker.pickAt(nx, ny));

    this.setEra(ERA_PAST);
    this.addLights();
    this.tickers = [];

    window.addEventListener("resize", this.onResize);
    this.animate();
  }

  setEra(era) {
    this.era = era;
    const palette = era === ERA_PAST ? COLORS_PAST : COLORS_FUTURE;
    this.palette = palette;
    this.scene.background = new THREE.Color(palette.fog);
    this.scene.fog = new THREE.FogExp2(palette.fog, 0.05);
  }

  addLights() {
    this.ambient = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(this.ambient);

    this.key = new THREE.DirectionalLight(0xffe4b0, 0.95);
    this.key.position.set(4, 7, 5);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.camera.left = -8;
    this.key.shadow.camera.right = 8;
    this.key.shadow.camera.top = 8;
    this.key.shadow.camera.bottom = -8;
    this.scene.add(this.key);

    this.fill = new THREE.PointLight(0xb0c8ff, 0.4, 14);
    this.fill.position.set(-3, 3, -2);
    this.scene.add(this.fill);
  }

  applyEraLights() {
    if (this.era === "past") {
      this.ambient.color.set(0x6a4a30);
      this.key.color.set(0xffe4b0);
      this.fill.color.set(0xb0c8ff);
    } else {
      this.ambient.color.set(0x2a3850);
      this.key.color.set(0xa0c0ff);
      this.fill.color.set(0x4a6090);
    }
  }

  add(obj) { this.scene.add(obj); }
  remove(obj) { this.scene.remove(obj); }
  tick(fn) { this.tickers.push(fn); }

  onResize = () => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  animate = () => {
    requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, this.clockDt());
    for (const fn of this.tickers) fn(dt);
    this.renderer.render(this.scene, this.camera);
  };

  _last = performance.now();
  clockDt() {
    const t = performance.now();
    const d = (t - this._last) / 1000;
    this._last = t;
    return d;
  }
}
