/**
 * Independent WebGL runtime. No FormMaster, no SVG #body.
 * Body is the frozen Vector 25×40 liveGridXYZ, sewn as (R-1)×S quads.
 */
import * as THREE from "three";
import { buildWispwalkerVolume, disposeWispwalker } from "./wispwalkerVolume";

export type VWebGLParams = {
  autoOrbit: boolean;
  yaw: number;
  pitch: number;
  key: number;
  rim: number;
  fill: number;
  hemi: number;
  roughness: number;
  metalness: number;
  clearcoat: number;
  transmission: number;
  thickness: number;
  depth: number;
};

export type VWebGLEngine = {
  setParams: (p: Partial<VWebGLParams>) => void;
  getParams: () => VWebGLParams;
  setActive: (on: boolean) => void;
  resize: () => void;
  dispose: () => void;
};

export function createVWebGLEngine(
  canvas: HTMLCanvasElement,
  opts: { initial: VWebGLParams; onChange?: (p: VWebGLParams) => void },
): VWebGLEngine {
  const params: VWebGLParams = { ...opts.initial };

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    premultipliedAlpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x0a0812, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.localClippingEnabled = false;
  renderer.autoClear = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.12, 4.4);

  const hemi = new THREE.HemisphereLight(0xddd0ff, 0x1a1028, params.hemi);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff3e4, params.key);
  key.position.set(2.2, 3.4, 3.0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 14;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x88a8ff, params.rim);
  rim.position.set(-2.6, 1.4, -2.0);
  scene.add(rim);
  const fill = new THREE.PointLight(0xc4a6ff, params.fill, 10);
  fill.position.set(0.2, -0.2, 2.6);
  scene.add(fill);

  let gasper = buildWispwalkerVolume(params.depth);
  scene.add(gasper);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(2.4, 48),
    new THREE.ShadowMaterial({ opacity: 0.22 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.28;
  ground.receiveShadow = true;
  scene.add(ground);

  let active = false;
  let raf = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const resize = () => {
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const applyParams = (rebuild = false) => {
    if (rebuild) {
      scene.remove(gasper);
      disposeWispwalker(gasper);
      gasper = buildWispwalkerVolume(params.depth);
      scene.add(gasper);
    }
    const mat = gasper.userData.material as THREE.MeshPhysicalMaterial;
    mat.roughness = params.roughness;
    mat.metalness = params.metalness;
    mat.clearcoat = params.clearcoat;
    mat.transmission = params.transmission;
    mat.thickness = params.thickness;
    key.intensity = params.key;
    rim.intensity = params.rim;
    fill.intensity = params.fill;
    hemi.intensity = params.hemi;
    gasper.rotation.y = (params.yaw * Math.PI) / 180;
    gasper.rotation.x = (params.pitch * Math.PI) / 180;
    const g = globalThis as { __GASPER_WEBGL_YAW__?: number; __GASPER_WEBGL_PITCH__?: number };
    g.__GASPER_WEBGL_YAW__ = params.yaw;
    g.__GASPER_WEBGL_PITCH__ = params.pitch;
  };

  const emit = () => opts.onChange?.({ ...params });

  const tick = () => {
    if (!active) return;
    if (params.autoOrbit && !dragging) {
      params.yaw = (params.yaw + 0.4 + 360) % 360;
      applyParams();
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };

  const onDown = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    params.yaw += (e.clientX - lastX) * 0.5;
    params.pitch = Math.max(-50, Math.min(50, params.pitch + (e.clientY - lastY) * 0.35));
    lastX = e.clientX;
    lastY = e.clientY;
    params.autoOrbit = false;
    applyParams();
    emit();
  };
  const onUp = (e: PointerEvent) => {
    dragging = false;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* */
    }
  };

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointerleave", onUp);
  window.addEventListener("resize", resize);
  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);
  resize();

  return {
    setParams(p) {
      const rebuild = p.depth != null && p.depth !== params.depth;
      Object.assign(params, p);
      applyParams(rebuild);
      emit();
    },
    getParams() {
      return { ...params };
    },
    setActive(on) {
      active = on;
      cancelAnimationFrame(raf);
      if (on) {
        requestAnimationFrame(() => {
          resize();
          applyParams();
          raf = requestAnimationFrame(tick);
        });
      }
    },
    resize,
    dispose() {
      active = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onUp);
      window.removeEventListener("resize", resize);
      ro.disconnect();
      disposeWispwalker(gasper);
      renderer.dispose();
    },
  };
}
