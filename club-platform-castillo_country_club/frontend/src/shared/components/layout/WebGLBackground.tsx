// src/shared/components/layout/WebGLBackground.tsx
// ═══════════════════════════════════════════════════════════
// CASTILLO — Argentum Fluid WebGL Background
// Navier-Stokes fluid sim · Silver Tide palette
// Movement-based interaction · No click required
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";
import './WebGLBackground.css';

export default function WebGLBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<ReturnType<typeof initFluid> | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.zIndex = "0";
    canvas.style.pointerEvents = "none";
    el.appendChild(canvas);

    const state = initFluid(canvas);
    if (!state) {
      el.removeChild(canvas);
      return;
    }
    stateRef.current = state;

    return () => {
      state.destroy();
      if (el.contains(canvas)) el.removeChild(canvas);
      stateRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="web-g-l-background fixed inset-0 z-0 pointer-events-none"
    />
  );
}

// ══════════════════════════════════════════════════════════
// FLUID ENGINE
// ══════════════════════════════════════════════════════════

interface FBO {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  attach: (id: number) => number;
}

interface DoubleFBO {
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  read: FBO;
  write: FBO;
  swap: () => void;
}

interface TextureObj {
  texture: WebGLTexture;
  width: number;
  height: number;
  attach: (id: number) => number;
}

interface GLExtensions {
  formatRGBA: { internalFormat: number; format: number } | null;
  formatRG: { internalFormat: number; format: number } | null;
  formatR: { internalFormat: number; format: number } | null;
  halfFloatTexType: number;
  supportLinearFiltering: boolean;
}

function initFluid(canvas: HTMLCanvasElement) {
  const reduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const config = {
    SIM_RESOLUTION: 128,
    DYE_RESOLUTION: 1024,
    DENSITY_DISSIPATION: 1.0,       // ← original
    VELOCITY_DISSIPATION: 0.2,      // ← original
    PRESSURE: 0.8,
    PRESSURE_ITERATIONS: 20,
    CURL: 30,                       // ← original — formas mas coherentes
    SPLAT_RADIUS: 0.25,             // ← original — figuras mas grandes
    SPLAT_FORCE: 6000,              // ← original — mas potencia
    SHADING: true,
    BLOOM: true,
    BLOOM_ITERATIONS: 8,
    BLOOM_RESOLUTION: 256,
    BLOOM_INTENSITY: 0.8,           // ← original
    BLOOM_THRESHOLD: 0.6,           // ← original
    BLOOM_SOFT_KNEE: 0.7,
    SUNRAYS: true,
    SUNRAYS_RESOLUTION: 196,
    SUNRAYS_WEIGHT: 1.0,            // ← original
    PAUSED: false,
    BACK_COLOR: { r: 0, g: 0, b: 0 }, // ← negro puro como el original
    TRANSPARENT: false,
  };

  interface Pointer {
    id: number;
    texcoordX: number;
    texcoordY: number;
    prevTexcoordX: number;
    prevTexcoordY: number;
    deltaX: number;
    deltaY: number;
    down: boolean;
    moved: boolean;
    color: { r: number; g: number; b: number };
  }

  function createPointer(): Pointer {
    return {
      id: -1,
      texcoordX: 0, texcoordY: 0,
      prevTexcoordX: 0, prevTexcoordY: 0,
      deltaX: 0, deltaY: 0,
      down: false, moved: false,
      color: { r: 0.15, g: 0.15, b: 0.2 },
    };
  }

  const pointers: Pointer[] = [createPointer()];
  const splatStack: number[] = [];

  // ── WebGL Context ──────────────────────────────────────
  const glContext = getWebGLContext(canvas);
  if (!glContext) return null;
  const { gl, ext } = glContext;

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  if (isMobile) config.DYE_RESOLUTION = 512;
  if (!ext.supportLinearFiltering) {
    config.DYE_RESOLUTION = 512;
    config.SHADING = false;
    config.BLOOM = false;
    config.SUNRAYS = false;
  }

  function getWebGLContext(cvs: HTMLCanvasElement): { gl: WebGLRenderingContext; ext: GLExtensions } | null {
    const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
    let rawGl = cvs.getContext("webgl2", params) as WebGLRenderingContext | null;
    const isWebGL2 = !!rawGl;
    if (!rawGl) rawGl = (cvs.getContext("webgl", params) || cvs.getContext("experimental-webgl", params)) as WebGLRenderingContext | null;
    if (!rawGl) return null;

    let halfFloat: any;
    let supportLinearFiltering: boolean;
    if (isWebGL2) {
      rawGl.getExtension("EXT_color_buffer_float");
      supportLinearFiltering = !!rawGl.getExtension("OES_texture_float_linear");
    } else {
      halfFloat = rawGl.getExtension("OES_texture_half_float");
      supportLinearFiltering = !!rawGl.getExtension("OES_texture_half_float_linear");
    }
    rawGl.clearColor(0.0, 0.0, 0.0, 1.0);

    const halfFloatTexType = isWebGL2 ? (rawGl as any).HALF_FLOAT : halfFloat.HALF_FLOAT_OES;

    let formatRGBA, formatRG, formatR;
    if (isWebGL2) {
      formatRGBA = getSupportedFormat(rawGl, (rawGl as any).RGBA16F, rawGl.RGBA, halfFloatTexType);
      formatRG = getSupportedFormat(rawGl, (rawGl as any).RG16F, (rawGl as any).RG, halfFloatTexType);
      formatR = getSupportedFormat(rawGl, (rawGl as any).R16F, (rawGl as any).RED, halfFloatTexType);
    } else {
      formatRGBA = getSupportedFormat(rawGl, rawGl.RGBA, rawGl.RGBA, halfFloatTexType);
      formatRG = getSupportedFormat(rawGl, rawGl.RGBA, rawGl.RGBA, halfFloatTexType);
      formatR = getSupportedFormat(rawGl, rawGl.RGBA, rawGl.RGBA, halfFloatTexType);
    }
    return { gl: rawGl, ext: { formatRGBA, formatRG, formatR, halfFloatTexType, supportLinearFiltering } };
  }

  function getSupportedFormat(g: WebGLRenderingContext, internalFormat: number, format: number, type: number): { internalFormat: number; format: number } | null {
    if (!supportRenderTextureFormat(g, internalFormat, format, type)) {
      switch (internalFormat) {
        case (g as any).R16F: return getSupportedFormat(g, (g as any).RG16F, (g as any).RG, type);
        case (g as any).RG16F: return getSupportedFormat(g, (g as any).RGBA16F, g.RGBA, type);
        default: return null;
      }
    }
    return { internalFormat, format };
  }

  function supportRenderTextureFormat(g: WebGLRenderingContext, internalFormat: number, format: number, type: number): boolean {
    const tex = g.createTexture()!;
    g.bindTexture(g.TEXTURE_2D, tex);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
    g.texImage2D(g.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
    const fbo = g.createFramebuffer()!;
    g.bindFramebuffer(g.FRAMEBUFFER, fbo);
    g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, tex, 0);
    return g.checkFramebufferStatus(g.FRAMEBUFFER) === g.FRAMEBUFFER_COMPLETE;
  }

  function resizeCanvas(): boolean {
    const w = Math.floor(canvas.clientWidth * (window.devicePixelRatio || 1));
    const h = Math.floor(canvas.clientHeight * (window.devicePixelRatio || 1));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      return true;
    }
    return false;
  }

  function getResolution(res: number): { width: number; height: number } {
    let ar = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (ar < 1) ar = 1.0 / ar;
    const min = Math.round(res);
    const max = Math.round(res * ar);
    return gl.drawingBufferWidth > gl.drawingBufferHeight
      ? { width: max, height: min }
      : { width: min, height: max };
  }

  function getTextureScale(tex: { width: number; height: number }, w: number, h: number) {
    return { x: w / tex.width, y: h / tex.height };
  }

  function HSVtoRGB(h: number, s: number, v: number): { r: number; g: number; b: number } {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let r = 0, g = 0, b = 0;
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    return { r, g, b };
  }

  function normalizeColor(c: { r: number; g: number; b: number }) {
    return { r: c.r / 255, g: c.g / 255, b: c.b / 255 };
  }

  function wrap(v: number, min: number, max: number) {
    const range = max - min;
    if (range === 0) return min;
    return ((v - min) % range) + min;
  }

  function hashCode(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = (hash << 5) - hash + s.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  // ══════════════════════════════════════════════════════
  // SHADERS — Properly formatted, no minification
  // ══════════════════════════════════════════════════════

  const baseVertexShader = compileShader(gl.VERTEX_SHADER, `
    precision highp float;
    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform vec2 texelSize;

    void main () {
      vUv = aPosition * 0.5 + 0.5;
      vL = vUv - vec2(texelSize.x, 0.0);
      vR = vUv + vec2(texelSize.x, 0.0);
      vT = vUv + vec2(0.0, texelSize.y);
      vB = vUv - vec2(0.0, texelSize.y);
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `);

  const blurVertexShader = compileShader(gl.VERTEX_SHADER, `
    precision highp float;
    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    uniform vec2 texelSize;

    void main () {
      vUv = aPosition * 0.5 + 0.5;
      float offset = 1.33333333;
      vL = vUv - texelSize * offset;
      vR = vUv + texelSize * offset;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `);

  const blurShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    uniform sampler2D uTexture;

    void main () {
      vec4 sum = texture2D(uTexture, vUv) * 0.29411764;
      sum += texture2D(uTexture, vL) * 0.35294117;
      sum += texture2D(uTexture, vR) * 0.35294117;
      gl_FragColor = sum;
    }
  `);

  const copyShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    uniform sampler2D uTexture;

    void main () {
      gl_FragColor = texture2D(uTexture, vUv);
    }
  `);

  const clearShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    uniform sampler2D uTexture;
    uniform float value;

    void main () {
      gl_FragColor = value * texture2D(uTexture, vUv);
    }
  `);

  const colorShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    uniform vec4 color;

    void main () {
      gl_FragColor = color;
    }
  `);

  const checkerboardShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform float aspectRatio;
    #define SCALE 25.0

    void main () {
      vec2 uv = floor(vUv * SCALE * vec2(aspectRatio, 1.0));
      float v = mod(uv.x + uv.y, 2.0);
      v = v * 0.1 + 0.8;
      gl_FragColor = vec4(vec3(v), 1.0);
    }
  `);

  const displayShaderSource = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    uniform sampler2D uBloom;
    uniform sampler2D uSunrays;
    uniform sampler2D uDithering;
    uniform vec2 ditherScale;
    uniform vec2 texelSize;

    vec3 linearToGamma (vec3 color) {
      color = max(color, vec3(0));
      return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
    }

    void main () {
      vec3 c = texture2D(uTexture, vUv).rgb;

      #ifdef SHADING
        vec3 lc = texture2D(uTexture, vL).rgb;
        vec3 rc = texture2D(uTexture, vR).rgb;
        vec3 tc = texture2D(uTexture, vT).rgb;
        vec3 bc = texture2D(uTexture, vB).rgb;
        float dx = length(rc) - length(lc);
        float dy = length(tc) - length(bc);
        vec3 n = normalize(vec3(dx, dy, length(texelSize)));
        vec3 l = vec3(0.0, 0.0, 1.0);
        float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
        c *= diffuse;
      #endif

      #ifdef BLOOM
        vec3 bloom = texture2D(uBloom, vUv).rgb;
      #endif

      #ifdef SUNRAYS
        float sunrays = texture2D(uSunrays, vUv).r;
        c *= sunrays;
        #ifdef BLOOM
          bloom *= sunrays;
        #endif
      #endif

      #ifdef BLOOM
        float noise = texture2D(uDithering, vUv * ditherScale).r;
        noise = noise * 2.0 - 1.0;
        bloom += noise / 255.0;
        bloom = linearToGamma(bloom);
        c += bloom;
      #endif

      float a = max(c.r, max(c.g, c.b));
      gl_FragColor = vec4(c, a);
    }
  `;

  const bloomPrefilterShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform vec3 curve;
    uniform float threshold;

    void main () {
      vec3 c = texture2D(uTexture, vUv).rgb;
      float br = max(c.r, max(c.g, c.b));
      float rq = clamp(br - curve.x, 0.0, curve.y);
      rq = curve.z * rq * rq;
      c *= max(rq, br - threshold) / max(br, 0.0001);
      gl_FragColor = vec4(c, 0.0);
    }
  `);

  const bloomBlurShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;

    void main () {
      vec4 sum = vec4(0.0);
      sum += texture2D(uTexture, vL);
      sum += texture2D(uTexture, vR);
      sum += texture2D(uTexture, vT);
      sum += texture2D(uTexture, vB);
      sum *= 0.25;
      gl_FragColor = sum;
    }
  `);

  const bloomFinalShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    uniform float intensity;

    void main () {
      vec4 sum = vec4(0.0);
      sum += texture2D(uTexture, vL);
      sum += texture2D(uTexture, vR);
      sum += texture2D(uTexture, vT);
      sum += texture2D(uTexture, vB);
      sum *= 0.25;
      gl_FragColor = sum * intensity;
    }
  `);

  const sunraysMaskShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTexture;

    void main () {
      vec4 c = texture2D(uTexture, vUv);
      float br = max(c.r, max(c.g, c.b));
      c.a = 1.0 - min(max(br * 20.0, 0.0), 0.8);
      gl_FragColor = c;
    }
  `);

  const sunraysShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float weight;

    #define ITERATIONS 16

    void main () {
      float Density = 0.3;
      float Decay = 0.95;
      float Exposure = 0.7;

      vec2 coord = vUv;
      vec2 dir = vUv - 0.5;
      dir *= 1.0 / float(ITERATIONS) * Density;
      float illuminationDecay = 1.0;
      float color = texture2D(uTexture, vUv).a;

      for (int i = 0; i < ITERATIONS; i++) {
        coord -= dir;
        float col = texture2D(uTexture, coord).a;
        color += col * illuminationDecay * weight;
        illuminationDecay *= Decay;
      }

      gl_FragColor = vec4(color * Exposure, 0.0, 0.0, 1.0);
    }
  `);

  const splatShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;

    void main () {
      vec2 p = vUv - point.xy;
      p.x *= aspectRatio;
      vec3 splat = exp(-dot(p, p) / radius) * color;
      vec3 base = texture2D(uTarget, vUv).xyz;
      gl_FragColor = vec4(base + splat, 1.0);
    }
  `);

  const advectionShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform vec2 dyeTexelSize;
    uniform float dt;
    uniform float dissipation;

    vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
      vec2 st = uv / tsize - 0.5;
      vec2 iuv = floor(st);
      vec2 fuv = fract(st);
      vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
      vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
      vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
      vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
      return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
    }

    void main () {
      #ifdef MANUAL_FILTERING
        vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
        vec4 result = bilerp(uSource, coord, dyeTexelSize);
      #else
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        vec4 result = texture2D(uSource, coord);
      #endif
      float decay = 1.0 + dissipation * dt;
      gl_FragColor = result / decay;
    }
  `, ext.supportLinearFiltering ? null : ["MANUAL_FILTERING"]);

  const divergenceShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
      float L = texture2D(uVelocity, vL).x;
      float R = texture2D(uVelocity, vR).x;
      float T = texture2D(uVelocity, vT).y;
      float B = texture2D(uVelocity, vB).y;
      vec2 C = texture2D(uVelocity, vUv).xy;
      if (vL.x < 0.0) { L = -C.x; }
      if (vR.x > 1.0) { R = -C.x; }
      if (vT.y > 1.0) { T = -C.y; }
      if (vB.y < 0.0) { B = -C.y; }
      float div = 0.5 * (R - L + T - B);
      gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }
  `);

  const curlShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
      float L = texture2D(uVelocity, vL).y;
      float R = texture2D(uVelocity, vR).y;
      float T = texture2D(uVelocity, vT).x;
      float B = texture2D(uVelocity, vB).x;
      float vorticity = R - L - T + B;
      gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
    }
  `);

  const vorticityShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uVelocity;
    uniform sampler2D uCurl;
    uniform float curl;
    uniform float dt;

    void main () {
      float L = texture2D(uCurl, vL).x;
      float R = texture2D(uCurl, vR).x;
      float T = texture2D(uCurl, vT).x;
      float B = texture2D(uCurl, vB).x;
      float C = texture2D(uCurl, vUv).x;
      vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
      force /= length(force) + 0.0001;
      force *= curl * C;
      force.y *= -1.0;
      vec2 velocity = texture2D(uVelocity, vUv).xy;
      velocity += force * dt;
      velocity = min(max(velocity, -1000.0), 1000.0);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
  `);

  const pressureShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;

    void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      float divergence = texture2D(uDivergence, vUv).x;
      float pressure = (L + R + B + T - divergence) * 0.25;
      gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
    }
  `);

  const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;

    void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      vec2 velocity = texture2D(uVelocity, vUv).xy;
      velocity.xy -= vec2(R - L, T - B);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
  `);

  // ── Program & Material ─────────────────────────────────
  class Material {
    vertexShader: WebGLShader;
    fragmentShaderSource: string;
    programs: Record<number, WebGLProgram> = {};
    activeProgram: WebGLProgram | null = null;
    uniforms: any = {};
    constructor(vs: WebGLShader, fss: string) {
      this.vertexShader = vs;
      this.fragmentShaderSource = fss;
    }
    setKeywords(kw: string[]) {
      let h = 0;
      for (const k of kw) h += hashCode(k);
      if (!this.programs[h]) {
        const fs = compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource, kw);
        this.programs[h] = createProgram(this.vertexShader, fs);
      }
      if (this.programs[h] === this.activeProgram) return;
      this.uniforms = getUniforms(this.programs[h]);
      this.activeProgram = this.programs[h];
    }
    bind() {
      gl.useProgram(this.activeProgram);
    }
  }

  class Program {
    program: WebGLProgram;
    uniforms: any;
    constructor(vs: WebGLShader, fs: WebGLShader) {
      this.program = createProgram(vs, fs);
      this.uniforms = getUniforms(this.program);
    }
    bind() {
      gl.useProgram(this.program);
    }
  }

  function createProgram(vs: WebGLShader, fs: WebGLShader): WebGLProgram {
    const p = gl.createProgram()!;
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(p));
    }
    return p;
  }

  function getUniforms(p: WebGLProgram): any {
    const u: any = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      if (info) u[info.name] = gl.getUniformLocation(p, info.name);
    }
    return u;
  }

  function compileShader(type: number, source: string, keywords?: string[] | null): WebGLShader {
    if (keywords) {
      let kw = "";
      for (const k of keywords) kw += "#define " + k + "\n";
      source = kw + source;
    }
    const s = gl.createShader(type)!;
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(s));
    }
    return s;
  }

  // ── Blit ───────────────────────────────────────────────
  const blit = (() => {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    return (target: FBO | null, clear?: boolean) => {
      if (!target) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      } else {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      }
      if (clear) {
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };
  })();

  // ── Framebuffers ───────────────────────────────────────
  let dye: DoubleFBO;
  let velocity: DoubleFBO;
  let divFBO: FBO;
  let curlFBO: FBO;
  let pressure: DoubleFBO;
  let bloom: FBO;
  let bloomFBs: FBO[] = [];
  let sunrays: FBO;
  let sunraysTemp: FBO;

  // Procedural dithering texture
  function createDitheringTexture(): TextureObj {
    const size = 128;
    const data = new Uint8Array(size * size * 3);
    for (let i = 0; i < size * size; i++) {
      const v = Math.floor(Math.random() * 255);
      data[i * 3] = v;
      data[i * 3 + 1] = v;
      data[i * 3 + 2] = v;
    }
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, size, size, 0, gl.RGB, gl.UNSIGNED_BYTE, data);
    return {
      texture: tex, width: size, height: size,
      attach(id: number) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, tex); return id; },
    };
  }

  const ditheringTex = createDitheringTexture();

  const blurProg = new Program(blurVertexShader, blurShader);
  const copyProg = new Program(baseVertexShader, copyShader);
  const clearProg = new Program(baseVertexShader, clearShader);
  const colorProg = new Program(baseVertexShader, colorShader);
  new Program(baseVertexShader, checkerboardShader);
  const bloomPreProg = new Program(baseVertexShader, bloomPrefilterShader);
  const bloomBlurProg = new Program(baseVertexShader, bloomBlurShader);
  const bloomFinProg = new Program(baseVertexShader, bloomFinalShader);
  const srmProg = new Program(baseVertexShader, sunraysMaskShader);
  const srProg = new Program(baseVertexShader, sunraysShader);
  const splatProg = new Program(baseVertexShader, splatShader);
  const advProg = new Program(baseVertexShader, advectionShader);
  const divProg = new Program(baseVertexShader, divergenceShader);
  const curlProg = new Program(baseVertexShader, curlShader);
  const vortProg = new Program(baseVertexShader, vorticityShader);
  const presProg = new Program(baseVertexShader, pressureShader);
  const gradProg = new Program(baseVertexShader, gradientSubtractShader);

  const displayMat = new Material(baseVertexShader, displayShaderSource);

  function initFBs() {
    const sim = getResolution(config.SIM_RESOLUTION);
    const dyeR = getResolution(config.DYE_RESOLUTION);
    const tt = ext.halfFloatTexType;
    const rgba = ext.formatRGBA!;
    const rg = ext.formatRG!;
    const r = ext.formatR!;
    const f = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
    gl.disable(gl.BLEND);

    if (!dye) dye = createDFBO(dyeR.width, dyeR.height, rgba.internalFormat, rgba.format, tt, f);
    else dye = resizeDFBO(dye, dyeR.width, dyeR.height, rgba.internalFormat, rgba.format, tt, f);

    if (!velocity) velocity = createDFBO(sim.width, sim.height, rg.internalFormat, rg.format, tt, f);
    else velocity = resizeDFBO(velocity, sim.width, sim.height, rg.internalFormat, rg.format, tt, f);

    divFBO = createFBO(sim.width, sim.height, r.internalFormat, r.format, tt, gl.NEAREST);
    curlFBO = createFBO(sim.width, sim.height, r.internalFormat, r.format, tt, gl.NEAREST);
    pressure = createDFBO(sim.width, sim.height, r.internalFormat, r.format, tt, gl.NEAREST);

    const br = getResolution(config.BLOOM_RESOLUTION);
    bloom = createFBO(br.width, br.height, rgba.internalFormat, rgba.format, tt, f);
    bloomFBs = [];
    for (let i = 0; i < config.BLOOM_ITERATIONS; i++) {
      const bw = br.width >> (i + 1);
      const bh = br.height >> (i + 1);
      if (bw < 2 || bh < 2) break;
      bloomFBs.push(createFBO(bw, bh, rgba.internalFormat, rgba.format, tt, f));
    }

    const sr = getResolution(config.SUNRAYS_RESOLUTION);
    sunrays = createFBO(sr.width, sr.height, r.internalFormat, r.format, tt, f);
    sunraysTemp = createFBO(sr.width, sr.height, r.internalFormat, r.format, tt, f);
  }

  function createFBO(w: number, h: number, ifmt: number, fmt: number, type: number, param: number): FBO {
    gl.activeTexture(gl.TEXTURE0);
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, null);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return {
      texture: tex, fbo, width: w, height: h,
      texelSizeX: 1 / w, texelSizeY: 1 / h,
      attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, tex); return id; },
    };
  }

  function createDFBO(w: number, h: number, ifmt: number, fmt: number, type: number, param: number): DoubleFBO {
    let a = createFBO(w, h, ifmt, fmt, type, param);
    let b = createFBO(w, h, ifmt, fmt, type, param);
    return {
      width: w, height: h, texelSizeX: a.texelSizeX, texelSizeY: a.texelSizeY,
      get read() { return a; },
      set read(v: FBO) { a = v; },
      get write() { return b; },
      set write(v: FBO) { b = v; },
      swap() { const t = a; a = b; b = t; },
    };
  }

  function resizeFBO(t: FBO, w: number, h: number, ifmt: number, fmt: number, type: number, param: number): FBO {
    const n = createFBO(w, h, ifmt, fmt, type, param);
    copyProg.bind();
    gl.uniform1i(copyProg.uniforms.uTexture, t.attach(0));
    blit(n);
    return n;
  }

  function resizeDFBO(t: DoubleFBO, w: number, h: number, ifmt: number, fmt: number, type: number, param: number): DoubleFBO {
    if (t.width === w && t.height === h) return t;
    t.read = resizeFBO(t.read, w, h, ifmt, fmt, type, param);
    t.write = createFBO(w, h, ifmt, fmt, type, param);
    t.width = w; t.height = h;
    t.texelSizeX = 1 / w; t.texelSizeY = 1 / h;
    return t;
  }

  // ── Color — Silver Tide ────────────────────────────────
  function generateColor() {
    let h, s, v;

    if (Math.random() < 0.12) {
      // Gold accent
      h = 0.08 + Math.random() * 0.07;
      s = 0.6 + Math.random() * 0.3;
      v = 0.85 + Math.random() * 0.15;
    } else {
      // Silver / steel blue
      h = 0.55 + Math.random() * 0.1;
      s = 0.3 + Math.random() * 0.4;
      v = 0.8 + Math.random() * 0.2;
    }

    const c = HSVtoRGB(h, s, v);
    c.r *= 0.15;
    c.g *= 0.15;
    c.b *= 0.15;
    return c;
  }
  // ── Keywords ───────────────────────────────────────────
  function updateKW() {
    const kw: string[] = [];
    if (config.SHADING) kw.push("SHADING");
    if (config.BLOOM) kw.push("BLOOM");
    if (config.SUNRAYS) kw.push("SUNRAYS");
    displayMat.setKeywords(kw);
  }

  updateKW();
  resizeCanvas();
  initFBs();
  multipleSplats(parseInt(String(Math.random() * 20)) + 5);

  // ── Ambient Splats ─────────────────────────────────────
  let ambTimer = 0;
  let nextAmb = 3 + Math.random() * 3;

  function updateAmbient(dt: number) {
    if (reduced) return;
    ambTimer += dt;
    if (ambTimer >= nextAmb) {
      ambTimer = 0;
      nextAmb = 3 + Math.random() * 3;
      const count = parseInt(String(Math.random() * 20)) + 5;
      for (let i = 0; i < count; i++) {
        const c = generateColor();
        c.r *= 10.0;
        c.g *= 10.0;
        c.b *= 10.0;
        splat(
          Math.random(),
          Math.random(),
          1000 * (Math.random() - 0.5),
          1000 * (Math.random() - 0.5),
          c
        );
      }
    }
  }
  // ── Loop ───────────────────────────────────────────────
  let lastTime = Date.now();
  let colorTimer = 0;
  let frameId: number;

  function update() {
    frameId = requestAnimationFrame(update);
    const now = Date.now();
    let dt = (now - lastTime) / 1000;
    dt = Math.min(dt, 0.016666);
    lastTime = now;

    if (resizeCanvas()) initFBs();

    colorTimer += dt * 10;
    if (colorTimer >= 1) {
      colorTimer = wrap(colorTimer, 0, 1);
      for (const p of pointers) p.color = generateColor();
    }

    updateAmbient(dt);
    if (splatStack.length) multipleSplats(splatStack.pop()!);
    for (const p of pointers) if (p.moved) { p.moved = false; splatPointer(p); }

    if (!config.PAUSED) step(dt);
    render(null);
  }

  // ── Physics ────────────────────────────────────────────
  function step(dt: number) {
    gl.disable(gl.BLEND);

    curlProg.bind();
    gl.uniform2f(curlProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(curlProg.uniforms.uVelocity, velocity.read.attach(0));
    blit(curlFBO);

    vortProg.bind();
    gl.uniform2f(vortProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(vortProg.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(vortProg.uniforms.uCurl, curlFBO.attach(1));
    gl.uniform1f(vortProg.uniforms.curl, config.CURL);
    gl.uniform1f(vortProg.uniforms.dt, dt);
    blit(velocity.write);
    velocity.swap();

    divProg.bind();
    gl.uniform2f(divProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(divProg.uniforms.uVelocity, velocity.read.attach(0));
    blit(divFBO);

    clearProg.bind();
    gl.uniform1i(clearProg.uniforms.uTexture, pressure.read.attach(0));
    gl.uniform1f(clearProg.uniforms.value, config.PRESSURE);
    blit(pressure.write);
    pressure.swap();

    presProg.bind();
    gl.uniform2f(presProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(presProg.uniforms.uDivergence, divFBO.attach(0));
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(presProg.uniforms.uPressure, pressure.read.attach(1));
      blit(pressure.write);
      pressure.swap();
    }

    gradProg.bind();
    gl.uniform2f(gradProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(gradProg.uniforms.uPressure, pressure.read.attach(0));
    gl.uniform1i(gradProg.uniforms.uVelocity, velocity.read.attach(1));
    blit(velocity.write);
    velocity.swap();

    advProg.bind();
    gl.uniform2f(advProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    if (!ext.supportLinearFiltering)
      gl.uniform2f(advProg.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
    const vid = velocity.read.attach(0);
    gl.uniform1i(advProg.uniforms.uVelocity, vid);
    gl.uniform1i(advProg.uniforms.uSource, vid);
    gl.uniform1f(advProg.uniforms.dt, dt);
    gl.uniform1f(advProg.uniforms.dissipation, config.VELOCITY_DISSIPATION);
    blit(velocity.write);
    velocity.swap();

    if (!ext.supportLinearFiltering)
      gl.uniform2f(advProg.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
    gl.uniform1i(advProg.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(advProg.uniforms.uSource, dye.read.attach(1));
    gl.uniform1f(advProg.uniforms.dissipation, config.DENSITY_DISSIPATION);
    blit(dye.write);
    dye.swap();
  }

  // ── Render ─────────────────────────────────────────────
  function render(target: FBO | null) {
    if (config.BLOOM) applyBloom(dye.read, bloom);
    if (config.SUNRAYS) {
      applySunrays(dye.read, sunrays);
      applyBlur(sunrays, sunraysTemp, 1);
    }

    if (!target || !config.TRANSPARENT) {
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.BLEND);
    } else {
      gl.disable(gl.BLEND);
    }

    if (!config.TRANSPARENT) {
      colorProg.bind();
      const bg = normalizeColor(config.BACK_COLOR);
      gl.uniform4f(colorProg.uniforms.color, bg.r, bg.g, bg.b, 1);
      blit(target);
    }

    const w = !target ? gl.drawingBufferWidth : target!.width;
    const h = !target ? gl.drawingBufferHeight : target!.height;
    displayMat.bind();
    if (config.SHADING) gl.uniform2f(displayMat.uniforms.texelSize, 1 / w, 1 / h);
    gl.uniform1i(displayMat.uniforms.uTexture, dye.read.attach(0));
    if (config.BLOOM) {
      gl.uniform1i(displayMat.uniforms.uBloom, bloom.attach(1));
      gl.uniform1i(displayMat.uniforms.uDithering, ditheringTex.attach(2));
      const sc = getTextureScale(ditheringTex, w, h);
      gl.uniform2f(displayMat.uniforms.ditherScale, sc.x, sc.y);
    }
    if (config.SUNRAYS) gl.uniform1i(displayMat.uniforms.uSunrays, sunrays.attach(3));
    blit(target);
  }

  function applyBloom(src: FBO, dst: FBO) {
    if (bloomFBs.length < 2) return;
    let last = dst;
    gl.disable(gl.BLEND);

    bloomPreProg.bind();
    const knee = config.BLOOM_THRESHOLD * config.BLOOM_SOFT_KNEE + 0.0001;
    gl.uniform3f(bloomPreProg.uniforms.curve, config.BLOOM_THRESHOLD - knee, knee * 2, 0.25 / knee);
    gl.uniform1f(bloomPreProg.uniforms.threshold, config.BLOOM_THRESHOLD);
    gl.uniform1i(bloomPreProg.uniforms.uTexture, src.attach(0));
    blit(last);

    bloomBlurProg.bind();
    for (const fb of bloomFBs) {
      gl.uniform2f(bloomBlurProg.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
      gl.uniform1i(bloomBlurProg.uniforms.uTexture, last.attach(0));
      blit(fb);
      last = fb;
    }

    gl.blendFunc(gl.ONE, gl.ONE);
    gl.enable(gl.BLEND);
    for (let i = bloomFBs.length - 2; i >= 0; i--) {
      const b = bloomFBs[i];
      gl.uniform2f(bloomBlurProg.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
      gl.uniform1i(bloomBlurProg.uniforms.uTexture, last.attach(0));
      gl.viewport(0, 0, b.width, b.height);
      blit(b);
      last = b;
    }

    gl.disable(gl.BLEND);
    bloomFinProg.bind();
    gl.uniform2f(bloomFinProg.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
    gl.uniform1i(bloomFinProg.uniforms.uTexture, last.attach(0));
    gl.uniform1f(bloomFinProg.uniforms.intensity, config.BLOOM_INTENSITY);
    blit(dst);
  }

  function applySunrays(src: FBO, dst: FBO) {
    gl.disable(gl.BLEND);
    srmProg.bind();
    gl.uniform1i(srmProg.uniforms.uTexture, src.attach(0));
    blit(dst);
    srProg.bind();
    gl.uniform1f(srProg.uniforms.weight, config.SUNRAYS_WEIGHT);
    gl.uniform1i(srProg.uniforms.uTexture, dst.attach(0));
    blit(dst);
  }

  function applyBlur(t: FBO, tmp: FBO, n: number) {
    blurProg.bind();
    for (let i = 0; i < n; i++) {
      gl.uniform2f(blurProg.uniforms.texelSize, t.texelSizeX, 0);
      gl.uniform1i(blurProg.uniforms.uTexture, t.attach(0));
      blit(tmp);
      gl.uniform2f(blurProg.uniforms.texelSize, 0, t.texelSizeY);
      gl.uniform1i(blurProg.uniforms.uTexture, tmp.attach(0));
      blit(t);
    }
  }

  // ── Splat ──────────────────────────────────────────────
  function splatPointer(p: Pointer) {
    splat(p.texcoordX, p.texcoordY, p.deltaX * config.SPLAT_FORCE, p.deltaY * config.SPLAT_FORCE, p.color);
  }

  function multipleSplats(n: number) {
    for (let i = 0; i < n; i++) {
      const c = generateColor();
      c.r *= 10.0;
      c.g *= 10.0;
      c.b *= 10.0;
      splat(
        Math.random(),
        Math.random(),
        1000 * (Math.random() - 0.5),
        1000 * (Math.random() - 0.5),
        c
      );
    }
  }

  function splat(x: number, y: number, dx: number, dy: number, c: { r: number; g: number; b: number }) {
    splatProg.bind();
    gl.uniform1i(splatProg.uniforms.uTarget, velocity.read.attach(0));
    gl.uniform1f(splatProg.uniforms.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(splatProg.uniforms.point, x, y);
    gl.uniform3f(splatProg.uniforms.color, dx, dy, 0);
    let rad = config.SPLAT_RADIUS / 100;
    if (canvas.width / canvas.height > 1) rad *= canvas.width / canvas.height;
    gl.uniform1f(splatProg.uniforms.radius, rad);
    blit(velocity.write);
    velocity.swap();
    gl.uniform1i(splatProg.uniforms.uTarget, dye.read.attach(0));
    gl.uniform3f(splatProg.uniforms.color, c.r, c.g, c.b);
    blit(dye.write);
    dye.swap();
  }

  // ── Events — movement based, no click required ────────
  function onMove(e: MouseEvent) {
    const p = pointers[0];
    const px = Math.floor(e.clientX * (devicePixelRatio || 1));
    const py = Math.floor(e.clientY * (devicePixelRatio || 1));
    p.prevTexcoordX = p.texcoordX;
    p.prevTexcoordY = p.texcoordY;
    p.texcoordX = px / canvas.width;
    p.texcoordY = 1 - py / canvas.height;
    p.deltaX = p.texcoordX - p.prevTexcoordX;
    p.deltaY = p.texcoordY - p.prevTexcoordY;
    const ar = canvas.width / canvas.height;
    if (ar < 1) p.deltaX *= ar;
    if (ar > 1) p.deltaY /= ar;
    p.moved = Math.abs(p.deltaX) + Math.abs(p.deltaY) > 0.0003;
    if (p.moved) p.color = generateColor();
  }

  function onDown() { pointers[0].down = true; }
  function onUp()   { pointers[0].down = false; }

  function onTouchM(e: TouchEvent) {
    e.preventDefault();
    const t = e.touches[0];
    if (!t) return;
    const p = pointers[0];
    const px = Math.floor(t.clientX * (devicePixelRatio || 1));
    const py = Math.floor(t.clientY * (devicePixelRatio || 1));
    p.prevTexcoordX = p.texcoordX;
    p.prevTexcoordY = p.texcoordY;
    p.texcoordX = px / canvas.width;
    p.texcoordY = 1 - py / canvas.height;
    p.deltaX = p.texcoordX - p.prevTexcoordX;
    p.deltaY = p.texcoordY - p.prevTexcoordY;
    const ar = canvas.width / canvas.height;
    if (ar < 1) p.deltaX *= ar;
    if (ar > 1) p.deltaY /= ar;
    p.moved = Math.abs(p.deltaX) + Math.abs(p.deltaY) > 0.0003;
    if (p.moved) p.color = generateColor();
  }

  function onTouchE() {
    pointers[0].down = false;
    pointers[0].moved = false;
  }

  function onVis() {
    config.PAUSED = !!document.hidden;
    if (!document.hidden) lastTime = Date.now();
  }

  window.addEventListener("mousemove", onMove, { passive: true });
  window.addEventListener("mousedown", onDown);
  window.addEventListener("mouseup", onUp);
  window.addEventListener("touchmove", onTouchM, { passive: false });
  window.addEventListener("touchend", onTouchE);
  document.addEventListener("visibilitychange", onVis);

  update();

  function destroy() {
    cancelAnimationFrame(frameId);
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mousedown", onDown);
    window.removeEventListener("mouseup", onUp);
    window.removeEventListener("touchmove", onTouchM);
    window.removeEventListener("touchend", onTouchE);
    document.removeEventListener("visibilitychange", onVis);
    const lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
  }

  return { destroy };
}