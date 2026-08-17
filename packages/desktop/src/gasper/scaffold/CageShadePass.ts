/**
 * Additive cage light. GGX already lives on the verts.
 * This pass only interpolates those verts — no flat SVG cells, no ribbons.
 * Dark is the pearl. This layer only adds light.
 */
export const CAGE_SHADE_LAW = "add-light-only" as const;

export function cageTriangles(rings: number, sectors: number, skipPole = 1): Uint16Array {
  const start = Math.max(1, skipPole);
  const faces = Math.max(0, rings - 1 - start) * sectors * 2;
  const out = new Uint16Array(faces * 3);
  let o = 0;
  for (let r = start; r < rings - 1; r++) {
    for (let s = 0; s < sectors; s++) {
      const i00 = r * sectors + s;
      const i10 = r * sectors + ((s + 1) % sectors);
      const i01 = (r + 1) * sectors + s;
      const i11 = (r + 1) * sectors + ((s + 1) % sectors);
      out[o++] = i00;
      out[o++] = i10;
      out[o++] = i11;
      out[o++] = i00;
      out[o++] = i11;
      out[o++] = i01;
    }
  }
  return out;
}

type Host = {
  __GASPER_CAGE_SHADE__?: { draw: typeof drawCageShade; canvas: () => HTMLCanvasElement | null };
};

const VERT = `
attribute vec2 a_pos;
attribute vec2 a_lit;
uniform vec2 u_view;
varying vec2 v_lit;
void main() {
  vec2 ndc = vec2(a_pos.x / u_view.x * 2.0 - 1.0, 1.0 - a_pos.y / u_view.y * 2.0);
  gl_Position = vec4(ndc, 0.0, 1.0);
  v_lit = a_lit;
}
`;

const FRAG = `
precision mediump float;
varying vec2 v_lit;
void main() {
  float lam = clamp(v_lit.x, 0.0, 1.2);
  float spec = clamp(v_lit.y, 0.0, 1.6);
  float island = pow(spec, 2.4);
  float wrap = lam * 0.16;
  vec3 cream = vec3(0.98, 0.99, 1.0);
  vec3 limb = vec3(0.78, 0.72, 0.92);
  float a = clamp(island * 0.88 + wrap * 0.22, 0.0, 0.9);
  vec3 rgb = cream * island + limb * wrap;
  gl_FragColor = vec4(rgb * a, a);
}
`;

let gl: WebGLRenderingContext | null = null;
let canvas: HTMLCanvasElement | null = null;
let prog: WebGLProgram | null = null;
let posBuf: WebGLBuffer | null = null;
let litBuf: WebGLBuffer | null = null;
let idxBuf: WebGLBuffer | null = null;
let idxCount = 0;
let aPos = 0;
let aLit = 0;
let uView: WebGLUniformLocation | null = null;

function compile(ctx: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = ctx.createShader(type);
  if (!sh) return null;
  ctx.shaderSource(sh, src);
  ctx.compileShader(sh);
  if (!ctx.getShaderParameter(sh, ctx.COMPILE_STATUS)) {
    ctx.deleteShader(sh);
    return null;
  }
  return sh;
}

function ensure(viewW = 240, viewH = 220): boolean {
  if (gl && canvas && prog) return true;
  if (typeof document === "undefined") return false;
  canvas = document.createElement("canvas");
  canvas.width = viewW * 2;
  canvas.height = viewH * 2;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  canvas.setAttribute("data-cage-shade", "1");
  const ctx = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
  });
  if (!ctx) return false;
  const vs = compile(ctx, ctx.VERTEX_SHADER, VERT);
  const fs = compile(ctx, ctx.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return false;
  const p = ctx.createProgram();
  if (!p) return false;
  ctx.attachShader(p, vs);
  ctx.attachShader(p, fs);
  ctx.linkProgram(p);
  if (!ctx.getProgramParameter(p, ctx.LINK_STATUS)) return false;
  gl = ctx;
  prog = p;
  posBuf = ctx.createBuffer();
  litBuf = ctx.createBuffer();
  idxBuf = ctx.createBuffer();
  aPos = ctx.getAttribLocation(p, "a_pos");
  aLit = ctx.getAttribLocation(p, "a_lit");
  uView = ctx.getUniformLocation(p, "u_view");
  ctx.enable(ctx.BLEND);
  ctx.blendFunc(ctx.ONE, ctx.ONE_MINUS_SRC_ALPHA);
  ctx.clearColor(0, 0, 0, 0);
  (globalThis as Host).__GASPER_CAGE_SHADE__ = { draw: drawCageShade, canvas: () => canvas };
  return true;
}

export function cageShadeCanvas(): HTMLCanvasElement | null {
  return ensure() ? canvas : null;
}

export function drawCageShade(
  xy: Float32Array,
  lam: Float32Array,
  spec: Float32Array,
  rings: number,
  sectors: number,
  viewW = 240,
  viewH = 220,
): boolean {
  if (!ensure(viewW, viewH) || !gl || !prog || !canvas || !posBuf || !litBuf || !idxBuf) return false;
  const n = rings * sectors;
  if (xy.length < n * 2 || spec.length < n) return false;
  const live =
    ((globalThis as { __GASPER_LIVE_COEFFS__?: { cageLight?: Record<string, number> } }).__GASPER_LIVE_COEFFS__
      ?.cageLight) || {};
  const specGain = Math.max(0.35, Math.min(2.2, 1 + 0.85 * (Number(live.light_spec) || 0)));
  const wrapGain = Math.max(0.4, Math.min(1.8, 1 + 0.55 * (Number(live.light_wrap) || 0)));
  const idx = cageTriangles(rings, sectors, Math.max(1, Math.floor(rings * 0.08)));
  const lit = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    lit[i * 2] = (lam[i] ?? 0) * wrapGain;
    lit[i * 2 + 1] = (spec[i] ?? 0) * specGain;
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(prog);
  gl.uniform2f(uView, viewW, viewH);
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, xy, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, litBuf);
  gl.bufferData(gl.ARRAY_BUFFER, lit, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(aLit);
  gl.vertexAttribPointer(aLit, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.DYNAMIC_DRAW);
  idxCount = idx.length;
  gl.drawElements(gl.TRIANGLES, idxCount, gl.UNSIGNED_SHORT, 0);
  return true;
}
