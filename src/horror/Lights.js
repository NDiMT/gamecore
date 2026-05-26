import * as THREE from "three";
import { WALL_H } from "./Maze.js";

export class FluorescentLights {
  constructor(scene, cells) {
    this.scene = scene;
    this.lights = [];
    this.fixtures = [];
    this.globalOn = 1;
    this.flickerScare = 0;

    const fixtureGeo = new THREE.PlaneGeometry(1.6, 0.5);
    const fixtureMat = () => new THREE.MeshBasicMaterial({
      color: 0xfff4d0,
      transparent: true,
      opacity: 0.95,
    });

    for (const c of cells) {
      const mat = fixtureMat();
      const fixture = new THREE.Mesh(fixtureGeo, mat);
      fixture.position.set(c.x, WALL_H - 0.05, c.z);
      fixture.rotation.x = Math.PI / 2;
      scene.add(fixture);

      const light = new THREE.PointLight(0xffe8b0, 1.1, 11, 1.4);
      light.position.set(c.x, WALL_H - 0.2, c.z);
      scene.add(light);

      this.lights.push({
        light,
        fixture,
        mat,
        baseIntensity: 1.1,
        flickerPhase: Math.random() * Math.PI * 2,
        flickerRate: 0.6 + Math.random() * 0.9,
        nextGlitch: 2 + Math.random() * 8,
        glitchTime: 0,
      });
      this.fixtures.push(fixture);
    }
  }

  setGlobal(on) {
    this.globalOn = on;
  }

  triggerScare() {
    this.flickerScare = 1.0;
  }

  update(dt, t) {
    if (this.flickerScare > 0) {
      this.flickerScare -= dt * 0.55;
      if (this.flickerScare < 0) this.flickerScare = 0;
    }

    for (const L of this.lights) {
      L.nextGlitch -= dt;
      if (L.nextGlitch <= 0) {
        L.glitchTime = 0.06 + Math.random() * 0.22;
        L.nextGlitch = 3 + Math.random() * 12;
      }

      let intensity = L.baseIntensity;
      const baseFlicker = 0.92 + 0.08 * Math.sin(t * L.flickerRate * 7 + L.flickerPhase);
      intensity *= baseFlicker;

      if (L.glitchTime > 0) {
        L.glitchTime -= dt;
        const v = Math.random();
        intensity *= v < 0.3 ? 0.1 : (0.5 + Math.random() * 0.5);
      }

      if (this.flickerScare > 0.05) {
        const v = Math.random();
        intensity *= v < this.flickerScare * 0.7 ? 0.05 : intensity;
      }

      intensity *= this.globalOn;

      L.light.intensity = intensity;
      L.mat.opacity = 0.35 + 0.6 * (intensity / L.baseIntensity);
      L.mat.color.setRGB(
        1.0,
        0.95 - (1 - intensity / L.baseIntensity) * 0.3,
        0.82 - (1 - intensity / L.baseIntensity) * 0.4
      );
    }
  }
}
