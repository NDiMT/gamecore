import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

const VHSShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    grainAmt: { value: 0.18 },
    vignette: { value: 1.05 },
    chroma: { value: 0.0028 },
    scanlines: { value: 0.10 },
    desaturate: { value: 0.18 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float grainAmt;
    uniform float vignette;
    uniform float chroma;
    uniform float scanlines;
    uniform float desaturate;
    varying vec2 vUv;

    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      vec2 center = uv - 0.5;

      float aberr = chroma * (0.6 + length(center) * 1.4);
      float r = texture2D(tDiffuse, uv + vec2(aberr, 0.0)).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - vec2(aberr, 0.0)).b;
      vec3 col = vec3(r, g, b);

      float luma = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col, vec3(luma), desaturate);

      float scan = sin(uv.y * 800.0 + time * 4.0) * 0.5 + 0.5;
      col *= mix(1.0, 0.85 + scan * 0.15, scanlines);

      float n = rand(uv * 800.0 + vec2(time * 13.0, time * 7.0));
      col += (n - 0.5) * grainAmt;

      float vd = length(center * vec2(1.2, 1.0));
      float vfac = smoothstep(0.85, 0.35, vd);
      col *= mix(0.25, 1.0, vfac * vignette);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export class PostFX {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.vhs = new ShaderPass(VHSShader);
    this.composer.addPass(this.vhs);
  }

  setSize(w, h) {
    this.composer.setSize(w, h);
  }

  setIntensity(level) {
    const u = this.vhs.uniforms;
    u.grainAmt.value = 0.14 + level * 0.10;
    u.chroma.value = 0.0022 + level * 0.0030;
    u.scanlines.value = 0.10 + level * 0.10;
    u.desaturate.value = 0.18 + level * 0.18;
  }

  render(t) {
    this.vhs.uniforms.time.value = t;
    this.composer.render();
  }
}
