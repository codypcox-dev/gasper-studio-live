/**
 * vWebGL body = the Vector 25×40 cage, as a mesh.
 * No silhouette rebuild. No SDF. No extrude.
 * Verts: REST_XYZ (1000). Faces: (R-1)×S quads. Same index as liveGridXYZ.
 */
import * as THREE from "three";
import { GRID_R, GRID_S, REST_XYZ } from "./assets/restGrid";

const STOPS = [
  new THREE.Color("#2a1068"),
  new THREE.Color("#3a1a88"),
  new THREE.Color("#4d249c"),
  new THREE.Color("#6230b0"),
  new THREE.Color("#7a44c8"),
  new THREE.Color("#a060e0"),
  new THREE.Color("#d4a8f8"),
];

const PX = 90;

function wellColor(x: number, y: number, z: number): THREE.Color {
  const radial = 1 - Math.min(1, Math.hypot(x, y - 0.05, z * 0.7) / 1.05);
  const t = Math.max(0, Math.min(1, 0.12 + 0.85 * radial)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(t));
  return STOPS[i].clone().lerp(STOPS[i + 1], t - i);
}

function meshFromGrid(xyz: Float32Array, depth: number): THREE.BufferGeometry {
  const R = GRID_R;
  const S = GRID_S;
  const zScale = 0.55 + 0.58 * depth;
  const pos = new Float32Array(R * S * 3);
  const col = new Float32Array(R * S * 3);
  for (let i = 0; i < R * S; i++) {
    const x = xyz[i * 3] / PX;
    const y = -xyz[i * 3 + 1] / PX;
    const z = (xyz[i * 3 + 2] / PX) * zScale;
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;
    const c = wellColor(x, y, z);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }

  const idx: number[] = [];
  const flip: number[] = [];
  for (let r = 0; r < R - 1; r++) {
    for (let s = 0; s < S; s++) {
      const s1 = (s + 1) % S;
      const a = r * S + s;
      const b = r * S + s1;
      const c = (r + 1) * S + s1;
      const d = (r + 1) * S + s;
      const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
      const bx = pos[b * 3], by = pos[b * 3 + 1], bz = pos[b * 3 + 2];
      const dx = pos[d * 3], dy = pos[d * 3 + 1], dz = pos[d * 3 + 2];
      const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
      const e2x = dx - ax, e2y = dy - ay, e2z = dz - az;
      const nx = e1y * e2z - e1z * e2y;
      const ny = e1z * e2x - e1x * e2z;
      const nz = e1x * e2y - e1y * e2x;
      const cx = (ax + bx + pos[c * 3] + dx) * 0.25;
      const cy = (ay + by + pos[c * 3 + 1] + dy) * 0.25;
      const cz = (az + bz + pos[c * 3 + 2] + dz) * 0.25;
      const out = nx * cx + ny * cy + nz * cz;
      if (out >= 0) {
        idx.push(a, b, c, a, c, d);
      } else {
        idx.push(a, d, c, a, c, b);
        flip.push(r);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

export function buildWispwalkerVolume(depth: number): THREE.Group {
  const group = new THREE.Group();
  group.name = "wispwalker-webgl";

  const geo = meshFromGrid(REST_XYZ, depth);
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.32,
    metalness: 0.03,
    clearcoat: 0.62,
    clearcoatRoughness: 0.28,
    sheen: 0.55,
    sheenColor: new THREE.Color(0xf0e4ff),
    transmission: 0.04,
    thickness: 0.65,
    ior: 1.33,
    emissive: new THREE.Color(0x2a1068),
    emissiveIntensity: 0.12,
    side: THREE.FrontSide,
    flatShading: false,
  });
  const body = new THREE.Mesh(geo, mat);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const dark = new THREE.MeshPhysicalMaterial({
    color: 0x100814,
    roughness: 0.6,
    metalness: 0,
  });
  const eyeGeo = new THREE.SphereGeometry(1, 20, 14);
  const eyeL = new THREE.Mesh(eyeGeo, dark);
  eyeL.scale.set(0.075, 0.04, 0.022);
  eyeL.position.set(-0.17, 0.14, 0.72 * (0.55 + 0.58 * depth));
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.17;
  group.add(eyeL, eyeR);

  group.userData.material = mat;
  group.userData.body = body;
  group.userData.extras = [eyeL, eyeR, eyeGeo, dark];
  return group;
}

export function disposeWispwalker(group: THREE.Group) {
  const body = group.userData.body as THREE.Mesh | undefined;
  body?.geometry.dispose();
  (group.userData.material as THREE.Material | undefined)?.dispose();
  const extras = (group.userData.extras as THREE.Object3D[]) || [];
  for (const e of extras) {
    if (e instanceof THREE.Mesh) {
      e.geometry.dispose();
      const m = e.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else (m as THREE.Material | undefined)?.dispose();
    } else if (e instanceof THREE.Material) {
      e.dispose();
    }
  }
}
