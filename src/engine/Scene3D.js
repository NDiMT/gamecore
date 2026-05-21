import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { OrbitTouch } from "./Controls.js";
import { Picker } from "./Picker.js";

export class Scene3D {
  constructor(container, palette) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(palette.fog);
    this.scene.fog = new THREE.FogExp2(palette.fog, 0.075);

    this.camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 60);
    this.camera.position.set(0, 4.0, 8.5);
    this.target = new THREE.Vector3(0, 2.4, 0);
    this.camera.lookAt(this.target);

    this.controls = new OrbitTouch(this.camera, this.renderer.domElement, this.target);
    this.picker = new Picker(this.camera);
    this.controls.onTap((nx, ny) => this.picker.pickAt(nx, ny));
    this.controls.onHover((nx, ny) => this.picker.hoverAt(nx, ny));

    this.ambient = new THREE.AmbientLight(0xffffff, 0.22);
    this.scene.add(this.ambient);

    this.key = new THREE.DirectionalLight(0xffffff, 0.5);
    this.key.position.set(3, 8, 5);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.camera.left = -8;
    this.key.shadow.camera.right = 8;
    this.key.shadow.camera.top = 8;
    this.key.shadow.camera.bottom = -8;
    this.key.shadow.bias = -0.0005;
    this.scene.add(this.key);

    this.rim = new THREE.PointLight(0x6688ff, 0.5, 12);
    this.rim.position.set(-3, 4, -2);
    this.scene.add(this.rim);

    this.setupPostFX();
    this.applyPalette(palette);

    this.tickers = [];
    this._last = performance.now();
    window.addEventListener("resize", this.onResize);
    requestAnimationFrame(this.animate);
  }

  setupPostFX() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.85, 0.5, 0.6);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  applyPalette(palette) {
    this.palette = palette;
    this.scene.background = new THREE.Color(palette.fog);
    this.scene.fog.color = new THREE.Color(palette.fog);
    this.ambient.color = new THREE.Color(palette.ambient);
    this.rim.color = new THREE.Color(palette.glow);
  }

  add(obj) { this.scene.add(obj); }
  remove(obj) { this.scene.remove(obj); }
  tick(fn) { this.tickers.push(fn); return () => { const i = this.tickers.indexOf(fn); if (i >= 0) this.tickers.splice(i, 1); }; }

  onResize = () => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  animate = () => {
    requestAnimationFrame(this.animate);
    const now = performance.now();
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    this.controls.update(dt);
    for (const fn of this.tickers) fn(dt, now / 1000);
    this.composer.render();
  };
}
