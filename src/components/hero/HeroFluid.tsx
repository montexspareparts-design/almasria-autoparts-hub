import { useEffect, useRef } from "react";

/**
 * HeroFluid — Noomo-Labs style fluid metaballs shader.
 *
 * Raw WebGL2 fragment shader (no three.js overhead for a single fullscreen
 * quad). 7 organic metaballs, one anchored to the cursor, the rest orbiting.
 * Gooey threshold + film grain + subtle vignette. Brand palette: deep
 * carbon → toyota red hot core.
 *
 * Guardrails:
 *   - Auto-pauses when the section is off-screen (IntersectionObserver)
 *   - DPR clamped to 1.5 on mobile
 *   - Falls back to a static radial gradient on WebGL failure / reduced-motion
 */

const FRAG = /* glsl */ `#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2  uResolution;
uniform vec2  uMouse;   // -1..1, aspect-corrected outside
uniform float uTime;
uniform float uReveal;  // 0..1 intro reveal

// hash + value noise for grain
float hash(vec2 p){ return fract(sin(dot(p, vec2(41.13, 289.31))) * 43758.5453); }

float metaball(vec2 p, vec2 c, float r){
  float d = length(p - c);
  return (r * r) / dot(p - c, p - c);
}

void main(){
  vec2 res = uResolution;
  vec2 uv  = (gl_FragCoord.xy - 0.5 * res) / min(res.x, res.y);

  float t = uTime * 0.28;

  // Cursor-anchored primary orb (with slight lag baked into JS)
  vec2 mouseOrb = uMouse;
  mouseOrb.x   *= res.x / res.y;

  vec2 b1 = mouseOrb * 0.75;
  vec2 b2 = vec2(sin(t*1.0) * 0.65,  cos(t*1.3) * 0.42);
  vec2 b3 = vec2(cos(t*0.7) * 0.55, -sin(t*0.9) * 0.55);
  vec2 b4 = vec2(sin(t*1.1 + 2.0) * 0.80, cos(t*0.8 + 1.0) * 0.30);
  vec2 b5 = vec2(cos(t*1.4 + 4.0) * 0.45, sin(t*0.6 + 2.0) * 0.65);
  vec2 b6 = vec2(sin(t*0.5 + 1.5) * 0.30, cos(t*1.1 + 3.0) * 0.35);
  vec2 b7 = vec2(cos(t*0.9 + 5.0) * 0.70, sin(t*1.5 + 0.5) * 0.20);

  float f = 0.0;
  f += metaball(uv, b1, 0.30);
  f += metaball(uv, b2, 0.22);
  f += metaball(uv, b3, 0.20);
  f += metaball(uv, b4, 0.18);
  f += metaball(uv, b5, 0.19);
  f += metaball(uv, b6, 0.14);
  f += metaball(uv, b7, 0.12);

  // Gooey threshold
  float edge = smoothstep(0.92, 1.08, f);
  float core = smoothstep(1.15, 1.55, f);
  float halo = smoothstep(0.55, 1.10, f);

  // Brand palette
  vec3 bg     = vec3(0.024, 0.024, 0.030);     // near-black carbon
  vec3 red    = vec3(0.870, 0.080, 0.090);     // toyota red
  vec3 hot    = vec3(1.000, 0.520, 0.180);     // ember/orange hot core
  vec3 gold   = vec3(0.980, 0.780, 0.320);     // gold flicker

  vec3 blob = mix(red, hot, core);
  blob      = mix(blob, gold, core * core * 0.35);

  vec3 color = bg;
  // Outer red halo (soft glow beyond the surface)
  color += halo * red * 0.22;
  // Blob body
  color = mix(color, blob, edge);

  // Rim highlight — thin bright edge just at the surface
  float rim = smoothstep(0.98, 1.05, f) * (1.0 - smoothstep(1.05, 1.12, f));
  color += rim * vec3(1.0, 0.85, 0.6) * 0.35;

  // Vignette
  color *= 1.0 - 0.55 * smoothstep(0.4, 1.2, length(uv));

  // Film grain
  float g = hash(gl_FragCoord.xy + uTime) - 0.5;
  color += g * 0.025;

  // Intro reveal (fade + slight lift)
  color *= smoothstep(0.0, 1.0, uReveal);

  outColor = vec4(color, 1.0);
}`;

const VERT = /* glsl */ `#version 300 es
in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

const compile = (gl: WebGL2RenderingContext, type: number, src: string) => {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error("shader compile", gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
};

const HeroFluid = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const failedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });
    if (!gl) {
      failedRef.current = true;
      canvas.style.display = "none";
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT)!;
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)!;
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("link", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uResolution");
    const uMouse = gl.getUniformLocation(prog, "uMouse");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uReveal = gl.getUniformLocation(prog, "uReveal");

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 1.5);

    const resize = () => {
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Cursor tracking with soft lag
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      target.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    // Pause when off-screen
    let visible = true;
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 }
    );
    io.observe(canvas);

    const start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      // Smooth cursor
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      const t = (now - start) / 1000;

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uMouse, current.x, current.y);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uReveal, Math.min(1, t / 0.9));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      ro.disconnect();
      io.disconnect();
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <div className="absolute inset-0 -z-0 overflow-hidden bg-[#050506]">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        aria-hidden="true"
      />
      {/* Fallback gradient if WebGL fails */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 55%, hsl(0 82% 45% / 0.35), transparent 65%)",
          mixBlendMode: "screen",
          opacity: 0.35,
        }}
      />
    </div>
  );
};

export default HeroFluid;
