import { useCallback, useEffect, useRef, useState } from "react";

export function HybridToolset({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const rafRef = useRef(0);
  const [cageOn, setCageOn] = useState(true);
  const [depth, setDepth] = useState(0.4);

  const paint = useCallback(() => {
    const gl = glRef.current;
    const canvas = canvasRef.current;
    if (!gl || !canvas || !active) return;
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!cageOn) return;

    const cols = 5;
    const rows = 8;
    const pts: number[] = [];
    const yaw =
      (globalThis as { __GASPER_ORBIT_YAW__?: number }).__GASPER_ORBIT_YAW__ ?? 8;
    const rad = ((yaw - 8) * Math.PI) / 180;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const u = (i / (cols - 1)) * 2 - 1;
        const v = 1 - (j / (rows - 1)) * 2;
        const z = Math.sin(rad) * u * depth;
        pts.push(u * (0.28 + z * 0.08), v * 0.48, 0);
      }
    }
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pts), gl.DYNAMIC_DRAW);
    const prog = (gl as WebGLRenderingContext & { __prog?: WebGLProgram }).__prog;
    if (!prog) return;
    gl.useProgram(prog);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
    const uColor = gl.getUniformLocation(prog, "u_color");
    gl.uniform4f(uColor, 0.45, 0.7, 1, 0.35 + depth * 0.25);
    gl.drawArrays(gl.POINTS, 0, pts.length / 3);
  }, [active, cageOn, depth]);

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
    if (!gl) return;
    glRef.current = gl;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(
      vs,
      `attribute vec3 a_pos; void main(){ gl_Position=vec4(a_pos,1.0); gl_PointSize=4.0; }`,
    );
    gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(
      fs,
      `precision mediump float; uniform vec4 u_color; void main(){ gl_FragColor=u_color; }`,
    );
    gl.compileShader(fs);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    (gl as WebGLRenderingContext & { __prog?: WebGLProgram }).__prog = prog;

    const loop = () => {
      paint();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      glRef.current = null;
    };
  }, [active, paint]);

  if (!active) return null;

  return (
    <div className="gasper-hybrid-tools" data-testid="hybrid-toolset">
      <canvas ref={canvasRef} className="gasper-hybrid-gl" data-testid="hybrid-gl" aria-hidden />
      <aside className="gasper-hybrid-rail">
        <header>vWebGL</header>
        <label>
          <input
            type="checkbox"
            checked={cageOn}
            onChange={(e) => setCageOn(e.target.checked)}
            data-testid="hybrid-cage"
          />
          Cage points
        </label>
        <label>
          Depth
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={depth}
            onChange={(e) => setDepth(+e.target.value)}
            data-testid="hybrid-depth"
          />
        </label>
        <p className="gasper-hybrid-note">SVG body · WebGL lights only</p>
      </aside>
    </div>
  );
}
