import { StudioParams } from '../types/studio';
import { MediaElementRef, renderSourceComposition } from './sourceRenderer';

const VERT_SRC = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

// Pass 1: Separable Gaussian Blur + Tilt-Shift + Ink-Melt Metaball Threshold
const BLUR_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_tex;
uniform vec2 u_resolution;
uniform vec2 u_dir;
uniform float u_blurPx;
uniform float u_tiltShift;
uniform float u_meltThreshold;
uniform int u_isSecondPass;

void main() {
  vec2 texel = 1.0 / u_resolution;
  float tiltFactor = 1.0;
  if (u_tiltShift > 0.001) {
    // Diagonal optical focal plane like Persona poster
    float plane = abs((v_uv.x * 0.65 + v_uv.y * 0.75) - 0.72);
    tiltFactor = mix(1.0, smoothstep(0.05, 0.55, plane) * 1.45 + 0.08, u_tiltShift);
  }

  float radius = u_blurPx * tiltFactor;
  if (radius < 0.35) {
    vec4 base = texture(u_tex, v_uv);
    outColor = base;
    return;
  }

  vec4 sum = vec4(0.0);
  float totalW = 0.0;
  // 13-tap smooth Gaussian distribution
  for (int i = -6; i <= 6; i++) {
    float fi = float(i);
    float norm = fi / 6.0;
    float w = exp(-2.5 * norm * norm);
    vec2 offset = u_dir * texel * (fi * radius * 0.45);
    sum += texture(u_tex, clamp(v_uv + offset, 0.001, 0.999)) * w;
    totalW += w;
  }
  vec4 col = sum / totalW;

  if (u_isSecondPass == 1 && u_meltThreshold > 0.01) {
    float luma = dot(col.rgb, vec3(0.299, 0.587, 0.114));
    float edge = mix(0.18, 0.03, u_meltThreshold);
    float thresh = mix(0.55, 0.38, u_meltThreshold);
    float melted = smoothstep(thresh - edge, thresh + edge, luma);
    // Preserve hue while sharpening fused metaball silhouettes
    vec3 darkCol = col.rgb * 0.08;
    vec3 lightCol = max(col.rgb, vec3(melted));
    col.rgb = mix(darkCol, lightCol, melted);
  }

  outColor = col;
}
`;

// Pass 2: Liquid Wave Warp + Liquid Glass Droplet Refraction + Chromatic Dispersion
const OPTICS_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_tex;
uniform vec2 u_resolution;
uniform float u_time;

// Liquid Warp
uniform int u_warpEnabled;
uniform float u_warpAmp;
uniform float u_warpFreq;
uniform float u_warpSpeed;
uniform float u_warpChroma;
uniform float u_warpGloss;
uniform float u_warpPinch;

// Glass Droplet
uniform int u_dropletEnabled;
uniform vec2 u_dropletPos;
uniform float u_dropletRadius;
uniform float u_dropletBlob;
uniform float u_dropletRefract;
uniform float u_dropletDispersion;
uniform float u_dropletSpecular;
uniform float u_dropletTranslucency;
uniform float u_dropletFrost;
uniform int u_dropletOrbit;
uniform int u_dropletCount;

vec2 computeWarpOffset(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * u_warpFreq;
  float w1 = sin(p.x * 2.1 + t * 1.3 + cos(p.y * 1.7 - t * 0.9));
  float w2 = cos(p.y * 2.4 - t * 1.1 + sin(p.x * 1.9 + t * 0.7));
  vec2 disp = vec2(w1, w2) * 0.065 * u_warpAmp;

  // Radial pinch / swell
  vec2 c = uv - 0.5;
  float r2 = dot(c, c);
  disp += c * sin(r2 * 10.0 - t) * u_warpPinch * 0.18;
  return disp;
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float dropletSDF(vec2 p, vec2 center, float radius, float blob, float phase) {
  vec2 d = p - center;
  float angle = atan(d.y, d.x);
  float wobble = 1.0
    + blob * 0.18 * sin(angle * 3.0 + phase * 1.1)
    + blob * 0.11 * cos(angle * 5.0 - phase * 0.85)
    + blob * 0.06 * sin(angle * 2.0 - phase * 0.5);
  return length(d) - radius * wobble;
}

float sceneDropletSDF(vec2 p, float aspect, float t) {
  vec2 c1 = u_dropletPos;
  if (u_dropletOrbit == 1) {
    c1 += vec2(sin(t * 0.65) * 0.035, cos(t * 0.52) * 0.028);
  }
  vec2 pc1 = vec2(c1.x * aspect, c1.y);
  float d = dropletSDF(p, pc1, u_dropletRadius, u_dropletBlob, t);

  if (u_dropletCount >= 2) {
    vec2 c2 = u_dropletPos + vec2(0.18 * cos(t * 0.45 + 1.2), 0.16 * sin(t * 0.55 + 0.5));
    vec2 pc2 = vec2(c2.x * aspect, c2.y);
    float d2 = dropletSDF(p, pc2, u_dropletRadius * 0.62, u_dropletBlob, t + 2.1);
    d = smin(d, d2, 0.09);
  }
  if (u_dropletCount >= 3) {
    vec2 c3 = u_dropletPos + vec2(-0.19 * sin(t * 0.4 + 2.0), 0.15 * cos(t * 0.6 + 1.8));
    vec2 pc3 = vec2(c3.x * aspect, c3.y);
    float d3 = dropletSDF(p, pc3, u_dropletRadius * 0.48, u_dropletBlob, t + 4.3);
    d = smin(d, d3, 0.08);
  }
  return d;
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / max(1.0, u_resolution.y);
  float t = u_time;

  vec3 col = vec3(0.0);
  float warpSpec = 0.0;

  // 1. Liquid Wave Warp
  if (u_warpEnabled == 1) {
    float wt = t * u_warpSpeed;
    vec2 disp = computeWarpOffset(uv, wt);
    float eps = 0.004;
    vec2 dispX = computeWarpOffset(uv + vec2(eps, 0.0), wt);
    vec2 dispY = computeWarpOffset(uv + vec2(0.0, eps), wt);

    // Chromatic split proportional to displacement + slope
    vec2 chromaVec = (disp + (dispX - dispY) * 1.4) * u_warpChroma * 0.38;
    float r = texture(u_tex, clamp(uv + disp + chromaVec, 0.001, 0.999)).r;
    float g = texture(u_tex, clamp(uv + disp, 0.001, 0.999)).g;
    float b = texture(u_tex, clamp(uv + disp - chromaVec, 0.001, 0.999)).b;
    col = vec3(r, g, b);

    // Glossy specular sheen on curved folds
    vec3 n = normalize(vec3((dispX.x - disp.x) * 28.0, (dispY.y - disp.y) * 28.0, 1.0));
    vec3 lightDir = normalize(vec3(-0.45, 0.65, 0.6));
    vec3 halfVec = normalize(lightDir + vec3(0.0, 0.0, 1.0));
    warpSpec = pow(max(dot(n, halfVec), 0.0), 18.0) * u_warpGloss * 0.48;
    uv = uv + disp;
  } else {
    col = texture(u_tex, uv).rgb;
  }

  // 2. Liquid Glass Droplet Lens
  if (u_dropletEnabled == 1) {
    vec2 p = vec2(v_uv.x * aspect, v_uv.y);
    float d = sceneDropletSDF(p, aspect, t);
    float aa = 2.0 / max(1.0, u_resolution.y);
    float mask = 1.0 - smoothstep(-aa, aa, d);

    if (mask > 0.001) {
      float e = 0.003;
      float dx = sceneDropletSDF(p + vec2(e, 0.0), aspect, t) - sceneDropletSDF(p - vec2(e, 0.0), aspect, t);
      float dy = sceneDropletSDF(p + vec2(0.0, e), aspect, t) - sceneDropletSDF(p - vec2(0.0, e), aspect, t);
      vec2 grad = normalize(vec2(dx, dy) + 1e-5);

      // Dome thickness inside SDF
      float depth = clamp(-d / max(0.02, u_dropletRadius), 0.0, 1.0);
      float edgeCurve = pow(1.0 - depth, 0.72);
      vec3 normal = normalize(vec3(grad * edgeCurve * 1.35, sqrt(max(0.02, 1.0 - edgeCurve * edgeCurve * 0.85))));

      // Barrel + edge refraction
      vec2 refractOffset = -normal.xy * (0.08 + u_dropletRefract * 0.24) * (0.45 + edgeCurve * 0.9);
      vec2 baseSampleUV = v_uv;
      if (u_warpEnabled == 1) {
        baseSampleUV = v_uv + computeWarpOffset(v_uv, t * u_warpSpeed);
      }

      // Strong chromatic dispersion along curved glass boundary
      float dispStrength = u_dropletDispersion * (0.014 + edgeCurve * 0.042);
      vec2 dispDir = normal.xy;
      vec2 uvR = clamp(baseSampleUV + refractOffset + dispDir * dispStrength * 1.15, 0.001, 0.999);
      vec2 uvG = clamp(baseSampleUV + refractOffset, 0.001, 0.999);
      vec2 uvB = clamp(baseSampleUV + refractOffset - dispDir * dispStrength * 1.15, 0.001, 0.999);

      vec3 glassCol = vec3(0.0);
      if (u_dropletFrost > 0.005) {
        // 8-tap frosted glass internal scatter for translucent crystal texture
        float frostRad = u_dropletFrost * 0.018 * (0.6 + 0.4 * depth);
        for (int k = 0; k < 8; k++) {
          float ang = float(k) * 0.78539816339;
          vec2 jitter = vec2(cos(ang) / aspect, sin(ang)) * frostRad;
          glassCol.r += texture(u_tex, clamp(uvR + jitter, 0.001, 0.999)).r;
          glassCol.g += texture(u_tex, clamp(uvG + jitter, 0.001, 0.999)).g;
          glassCol.b += texture(u_tex, clamp(uvB + jitter, 0.001, 0.999)).b;
        }
        glassCol /= 8.0;
        // Subtle milky crystal light scatter on frosted glass
        glassCol = mix(glassCol, glassCol * 0.94 + vec3(0.07), u_dropletFrost * 0.35);
      } else {
        glassCol = vec3(
          texture(u_tex, uvR).r,
          texture(u_tex, uvG).g,
          texture(u_tex, uvB).b
        );
      }

      // Fresnel rim & studio softbox specular (screen-blended so glass stays translucent)
      float fresnel = pow(1.0 - max(normal.z, 0.0), 2.8);
      vec3 light1 = normalize(vec3(-0.55, 0.72, 0.58));
      vec3 light2 = normalize(vec3(0.6, -0.45, 0.65));
      float spec1 = pow(max(dot(reflect(vec3(0.0, 0.0, -1.0), normal), light1), 0.0), 30.0);
      float spec2 = pow(max(dot(reflect(vec3(0.0, 0.0, -1.0), normal), light2), 0.0), 16.0);

      // Delicate prismatic rim dispersion tint
      vec3 rimTint = vec3(
        0.55 + 0.45 * sin(atan(grad.y, grad.x) * 2.0 + 0.0),
        0.55 + 0.45 * sin(atan(grad.y, grad.x) * 2.0 + 2.1),
        0.55 + 0.45 * sin(atan(grad.y, grad.x) * 2.0 + 4.2)
      );

      // Blend refracted body with underlying unrefracted layer according to translucency
      vec3 transmitted = mix(col, glassCol, u_dropletTranslucency);

      // Screen-blend specular highlights and Fresnel glass edge so dark backgrounds stay transparent
      vec3 edgeLight = mix(vec3(0.85, 0.92, 1.0), rimTint, u_dropletDispersion * 0.65) * (fresnel * 0.42 * u_dropletSpecular);
      vec3 specLight = vec3(1.0) * ((spec1 * 0.75 + spec2 * 0.22) * u_dropletSpecular);
      vec3 glassResult = 1.0 - (1.0 - transmitted) * (1.0 - clamp(edgeLight + specLight, 0.0, 0.95));

      // Delicate refractive glass outline
      float outerEdge = smoothstep(0.009, 0.0, abs(d)) * 0.28 * u_dropletSpecular;
      glassResult = mix(glassResult, glassResult + rimTint * 0.16, outerEdge);

      col = mix(col, glassResult, mask);
    }
  }

  // Screen-blend warp gloss so dark scenes remain rich & translucent
  col = 1.0 - (1.0 - col) * (1.0 - clamp(vec3(warpSpec), 0.0, 0.85));
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

// Pass 3: Directional Light Streaks ("MAKE SOME NOISE" vertical/angled rays)
const STREAK_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_tex;
uniform vec2 u_resolution;
uniform int u_enabled;
uniform float u_intensity;
uniform float u_length;
uniform float u_angle;
uniform float u_threshold;
uniform int u_bidirectional;

void main() {
  vec4 base = texture(u_tex, v_uv);
  if (u_enabled == 0 || u_intensity <= 0.001) {
    outColor = base;
    return;
  }

  float rad = radians(u_angle);
  vec2 dir = vec2(cos(rad), sin(rad));
  // Normalize step aspect ratio
  vec2 aspectDir = vec2(dir.x * (u_resolution.y / max(1.0, u_resolution.x)), dir.y);

  float maxLen = 0.26 * u_length;
  const int SAMPLES = 24;
  vec3 streakAcc = vec3(0.0);
  float weightSum = 0.0;

  for (int i = 1; i <= SAMPLES; i++) {
    float fi = float(i) / float(SAMPLES);
    float decay = exp(-2.3 * fi);

    vec2 uvPos = v_uv + aspectDir * (fi * maxLen);
    if (uvPos.x >= 0.0 && uvPos.x <= 1.0 && uvPos.y >= 0.0 && uvPos.y <= 1.0) {
      vec3 s = texture(u_tex, uvPos).rgb;
      float luma = dot(s, vec3(0.299, 0.587, 0.114));
      float mask = smoothstep(u_threshold, min(1.0, u_threshold + 0.25), luma);
      streakAcc += s * mask * decay;
    }

    if (u_bidirectional == 1) {
      vec2 uvNeg = v_uv - aspectDir * (fi * maxLen);
      if (uvNeg.x >= 0.0 && uvNeg.x <= 1.0 && uvNeg.y >= 0.0 && uvNeg.y <= 1.0) {
        vec3 s2 = texture(u_tex, uvNeg).rgb;
        float luma2 = dot(s2, vec3(0.299, 0.587, 0.114));
        float mask2 = smoothstep(u_threshold, min(1.0, u_threshold + 0.25), luma2);
        streakAcc += s2 * mask2 * decay;
      }
      weightSum += decay * 2.0;
    } else {
      weightSum += decay;
    }
  }

  vec3 streak = (streakAcc / max(0.001, weightSum)) * u_intensity * 1.85;
  // Screen-like blend so white highlights glow softly without blowing out completely
  vec3 blended = 1.0 - (1.0 - base.rgb) * (1.0 - clamp(streak, 0.0, 1.0));
  outColor = vec4(blended, 1.0);
}
`;

// Pass 4: Halftone Dot Matrix ("TATE") + Coarse Film Grain + Grade
const FINAL_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_tex;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_exportScale;

// Halftone
uniform int u_halftoneEnabled;
uniform float u_halftoneMix;
uniform float u_halftoneSize;
uniform float u_halftoneAngle;
uniform float u_halftoneContrast;
uniform int u_halftoneShape; // 0: circle, 1: diamond, 2: line
uniform int u_halftoneCustomColors;
uniform vec3 u_halftoneFg;
uniform vec3 u_halftoneBg;

// Grain & Grade
uniform float u_grainAmount;
uniform float u_grainSize;
uniform float u_contrast;
uniform float u_brightness;
uniform int u_invert;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec3 col = texture(u_tex, v_uv).rgb;

  // Brightness & Contrast
  col = (col - 0.5) * u_contrast + 0.5 + u_brightness;
  col = clamp(col, 0.0, 1.0);

  if (u_invert == 1) {
    col = 1.0 - col;
  }

  // Halftone Dot Matrix Screen
  if (u_halftoneEnabled == 1 && u_halftoneMix > 0.001) {
    float cellPx = max(3.0, u_halftoneSize * u_exportScale);
    float rad = radians(u_halftoneAngle);
    mat2 rot = mat2(cos(rad), -sin(rad), sin(rad), cos(rad));
    mat2 invRot = mat2(cos(rad), sin(rad), -sin(rad), cos(rad));

    vec2 px = v_uv * u_resolution;
    vec2 rotPx = rot * px;
    vec2 cellIdx = floor(rotPx / cellPx);
    vec2 cellCenterRot = (cellIdx + 0.5) * cellPx;
    vec2 cellCenterPx = invRot * cellCenterRot;
    vec2 sampleUV = clamp(cellCenterPx / u_resolution, 0.001, 0.999);

    vec3 cellCol = texture(u_tex, sampleUV).rgb;
    cellCol = clamp((cellCol - 0.5) * u_contrast + 0.5 + u_brightness, 0.0, 1.0);
    if (u_invert == 1) cellCol = 1.0 - cellCol;

    float luma = dot(cellCol, vec3(0.299, 0.587, 0.114));
    vec2 local = (rotPx - cellCenterRot) / (cellPx * 0.5); // -1..1

    float dist = 0.0;
    if (u_halftoneShape == 0) {
      dist = length(local);
    } else if (u_halftoneShape == 1) {
      dist = (abs(local.x) + abs(local.y)) * 0.72;
    } else {
      dist = abs(local.y);
    }

    float gamma = mix(1.4, 0.55, u_halftoneContrast);
    float dotRadius = clamp(pow(luma, gamma) * 1.12, 0.0, 1.25);
    float aa = 1.6 / cellPx;
    float dotMask = 1.0 - smoothstep(dotRadius - aa, dotRadius + aa, dist);

    vec3 fg = u_halftoneCustomColors == 1 ? u_halftoneFg : max(cellCol, vec3(0.95));
    vec3 bg = u_halftoneCustomColors == 1 ? u_halftoneBg : vec3(0.03);
    vec3 htCol = mix(bg, fg, dotMask);
    col = mix(col, htCol, u_halftoneMix);
  }

  // Coarse Stochastic Film Grain
  if (u_grainAmount > 0.001) {
    float gScale = max(1.0, u_grainSize * u_exportScale);
    vec2 grainCoord = floor((v_uv * u_resolution) / gScale);
    float n1 = hash12(grainCoord + floor(u_time * 24.0) * 17.3);
    float n2 = hash12(grainCoord * 1.37 + 91.7);
    float noise = (mix(n1, n2, 0.5) - 0.5) * 2.0;

    // Tactile print response: stronger in midtones & soft glows
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    float midWeight = 0.45 + 0.55 * (1.0 - abs(luma * 2.0 - 1.0));
    col = clamp(col + noise * u_grainAmount * 0.36 * midWeight, 0.0, 1.0);
  }

  outColor = vec4(col, 1.0);
}
`;

function hexToRgbVec3(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0');
  const num = parseInt(full, 16);
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

interface FramebufferPair {
  fbo: WebGLFramebuffer;
  tex: WebGLTexture;
  width: number;
  height: number;
}

export class ShaderPipeline {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private sourceCanvas: HTMLCanvasElement;
  private sourceCtx: CanvasRenderingContext2D;

  private quadVao: WebGLVertexArrayObject | null = null;
  private sourceTex: WebGLTexture | null = null;

  private blurProg: WebGLProgram | null = null;
  private opticsProg: WebGLProgram | null = null;
  private streakProg: WebGLProgram | null = null;
  private finalProg: WebGLProgram | null = null;

  private fboA: FramebufferPair | null = null;
  private fboB: FramebufferPair | null = null;
  private fboC: FramebufferPair | null = null;
  private fboD: FramebufferPair | null = null;

  private contextLost = false;
  private onContextStatusChange?: (lost: boolean) => void;

  constructor(canvas: HTMLCanvasElement, onContextStatusChange?: (lost: boolean) => void) {
    this.canvas = canvas;
    this.onContextStatusChange = onContextStatusChange;
    this.sourceCanvas = document.createElement('canvas');
    const sCtx = this.sourceCanvas.getContext('2d');
    if (!sCtx) {
      throw new Error('Could not initialize 2D source composition context');
    }
    this.sourceCtx = sCtx;

    this.initGL();

    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    this.contextLost = true;
    this.onContextStatusChange?.(true);
  };

  private handleContextRestored = () => {
    this.contextLost = false;
    this.initGL();
    this.onContextStatusChange?.(false);
  };

  private compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error(`Shader compile error: ${info}`);
    }
    return sh;
  }

  private createProgram(gl: WebGL2RenderingContext, fragSrc: string): WebGLProgram {
    const vs = this.compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = this.compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(prog);
      gl.deleteProgram(prog);
      throw new Error(`Program link error: ${info}`);
    }
    return prog;
  }

  private initGL() {
    const gl = this.canvas.getContext('webgl2', {
      preserveDrawingBuffer: true,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    if (!gl) {
      this.gl = null;
      return;
    }
    this.gl = gl;

    // Fullscreen quad VAO
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    this.quadVao = vao;

    this.blurProg = this.createProgram(gl, BLUR_FRAG);
    this.opticsProg = this.createProgram(gl, OPTICS_FRAG);
    this.streakProg = this.createProgram(gl, STREAK_FRAG);
    this.finalProg = this.createProgram(gl, FINAL_FRAG);

    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.sourceTex = tex;

    this.fboA = null;
    this.fboB = null;
    this.fboC = null;
    this.fboD = null;
  }

  private ensureFbo(pair: FramebufferPair | null, width: number, height: number): FramebufferPair {
    const gl = this.gl!;
    if (pair && pair.width === width && pair.height === height) {
      return pair;
    }
    if (pair) {
      gl.deleteFramebuffer(pair.fbo);
      gl.deleteTexture(pair.tex);
    }
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return { fbo, tex, width, height };
  }

  public isWebGLAvailable(): boolean {
    return this.gl !== null && !this.contextLost;
  }

  public renderFrame(
    width: number,
    height: number,
    params: StudioParams,
    mediaRef: MediaElementRef,
    timeSec: number
  ) {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    if (this.sourceCanvas.width !== width || this.sourceCanvas.height !== height) {
      this.sourceCanvas.width = width;
      this.sourceCanvas.height = height;
    }

    // Draw 2D source composition
    renderSourceComposition(this.sourceCtx, width, height, params, mediaRef, timeSec);

    if (!this.gl || this.contextLost) {
      // Fallback 2D draw if WebGL unavailable
      const ctx2d = this.canvas.getContext('2d');
      ctx2d?.drawImage(this.sourceCanvas, 0, 0);
      return;
    }

    const gl = this.gl;
    const exportScale = width / 900;

    // Upload source canvas to texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.sourceCanvas);

    // Ensure FBOs
    this.fboA = this.ensureFbo(this.fboA, width, height);
    this.fboB = this.ensureFbo(this.fboB, width, height);
    this.fboC = this.ensureFbo(this.fboC, width, height);
    this.fboD = this.ensureFbo(this.fboD, width, height);

    gl.bindVertexArray(this.quadVao);
    gl.viewport(0, 0, width, height);

    // --- PASS 1: Blur + Ink-Melt ---
    const blurPx = params.defocus.enabled
      ? (params.defocus.blurAmount * 22 + params.defocus.inkMelt * 24) * exportScale
      : 0;
    const meltThresh = params.defocus.enabled ? params.defocus.meltThreshold : 0;

    gl.useProgram(this.blurProg!);
    gl.uniform2f(gl.getUniformLocation(this.blurProg!, 'u_resolution'), width, height);
    gl.uniform1f(gl.getUniformLocation(this.blurProg!, 'u_blurPx'), blurPx);
    gl.uniform1f(gl.getUniformLocation(this.blurProg!, 'u_tiltShift'), params.defocus.enabled ? params.defocus.tiltShift : 0);
    gl.uniform1f(gl.getUniformLocation(this.blurProg!, 'u_meltThreshold'), meltThresh);

    // 1A: Horizontal
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboA.fbo);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTex);
    gl.uniform1i(gl.getUniformLocation(this.blurProg!, 'u_tex'), 0);
    gl.uniform2f(gl.getUniformLocation(this.blurProg!, 'u_dir'), 1, 0);
    gl.uniform1i(gl.getUniformLocation(this.blurProg!, 'u_isSecondPass'), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // 1B: Vertical
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboB.fbo);
    gl.bindTexture(gl.TEXTURE_2D, this.fboA.tex);
    gl.uniform2f(gl.getUniformLocation(this.blurProg!, 'u_dir'), 0, 1);
    gl.uniform1i(gl.getUniformLocation(this.blurProg!, 'u_isSecondPass'), 1);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // --- PASS 2: Liquid Warp + Glass Droplet Refraction ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboC.fbo);
    gl.useProgram(this.opticsProg!);
    gl.bindTexture(gl.TEXTURE_2D, this.fboB.tex);
    gl.uniform1i(gl.getUniformLocation(this.opticsProg!, 'u_tex'), 0);
    gl.uniform2f(gl.getUniformLocation(this.opticsProg!, 'u_resolution'), width, height);
    gl.uniform1f(gl.getUniformLocation(this.opticsProg!, 'u_time'), timeSec);

    gl.uniform1i(gl.getUniformLocation(this.opticsProg!, 'u_warpEnabled'), params.warp.enabled ? 1 : 0);
    gl.uniform1f(gl.getUniformLocation(this.opticsProg!, 'u_warpAmp'), params.warp.amplitude);
    gl.uniform1f(gl.getUniformLocation(this.opticsProg!, 'u_warpFreq'), params.warp.frequency);
    gl.uniform1f(gl.getUniformLocation(this.opticsProg!, 'u_warpSpeed'), params.warp.speed);
    gl.uniform1f(gl.getUniformLocation(this.opticsProg!, 'u_warpChroma'), params.warp.chromaticSplit);
    gl.uniform1f(gl.getUniformLocation(this.opticsProg!, 'u_warpGloss'), params.warp.glossHighlight);
    gl.uniform1f(gl.getUniformLocation(this.opticsProg!, 'u_warpPinch'), params.warp.pinch);

    gl.uniform1i(gl.getUniformLocation(this.opticsProg!, 'u_dropletEnabled'), params.droplet.enabled ? 1 : 0);
    gl.uniform2f(gl.getUniformLocation(this.opticsProg!, 'u_dropletPos'), params.droplet.x, 1.0 - params.droplet.y);
    gl.uniform1f(gl.getUniformLocation(this.opticsProg!, 'u_dropletRadius'), params.droplet.radius);
    gl.uniform1f(gl.getUniformLocation(this.opticsProg!, 'u_dropletBlob'), params.droplet.blobiness);
    gl.uniform1f(gl.getUniformLocation(this.opticsProg!, 'u_dropletRefract'), params.droplet.refraction);
    gl.uniform1f(gl.getUniformLocation(this.opticsProg!, 'u_dropletDispersion'), params.droplet.dispersion);
    gl.uniform1f(gl.getUniformLocation(this.opticsProg!, 'u_dropletSpecular'), params.droplet.specular);
    gl.uniform1f(gl.getUniformLocation(this.opticsProg!, 'u_dropletTranslucency'), params.droplet.translucency);
    gl.uniform1f(gl.getUniformLocation(this.opticsProg!, 'u_dropletFrost'), params.droplet.frost);
    gl.uniform1i(gl.getUniformLocation(this.opticsProg!, 'u_dropletOrbit'), params.droplet.animateOrbit ? 1 : 0);
    gl.uniform1i(gl.getUniformLocation(this.opticsProg!, 'u_dropletCount'), params.droplet.count);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // --- PASS 3: Directional Streaks ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboD.fbo);
    gl.useProgram(this.streakProg!);
    gl.bindTexture(gl.TEXTURE_2D, this.fboC.tex);
    gl.uniform1i(gl.getUniformLocation(this.streakProg!, 'u_tex'), 0);
    gl.uniform2f(gl.getUniformLocation(this.streakProg!, 'u_resolution'), width, height);
    gl.uniform1i(gl.getUniformLocation(this.streakProg!, 'u_enabled'), params.streaks.enabled ? 1 : 0);
    gl.uniform1f(gl.getUniformLocation(this.streakProg!, 'u_intensity'), params.streaks.intensity);
    gl.uniform1f(gl.getUniformLocation(this.streakProg!, 'u_length'), params.streaks.length);
    gl.uniform1f(gl.getUniformLocation(this.streakProg!, 'u_angle'), params.streaks.angle);
    gl.uniform1f(gl.getUniformLocation(this.streakProg!, 'u_threshold'), params.streaks.threshold);
    gl.uniform1i(gl.getUniformLocation(this.streakProg!, 'u_bidirectional'), params.streaks.bidirectional ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // --- PASS 4: Halftone + Grain + Grade (Screen) ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(this.finalProg!);
    gl.bindTexture(gl.TEXTURE_2D, this.fboD.tex);
    gl.uniform1i(gl.getUniformLocation(this.finalProg!, 'u_tex'), 0);
    gl.uniform2f(gl.getUniformLocation(this.finalProg!, 'u_resolution'), width, height);
    gl.uniform1f(gl.getUniformLocation(this.finalProg!, 'u_time'), timeSec);
    gl.uniform1f(gl.getUniformLocation(this.finalProg!, 'u_exportScale'), exportScale);

    gl.uniform1i(gl.getUniformLocation(this.finalProg!, 'u_halftoneEnabled'), params.halftone.enabled ? 1 : 0);
    gl.uniform1f(gl.getUniformLocation(this.finalProg!, 'u_halftoneMix'), params.halftone.mix);
    gl.uniform1f(gl.getUniformLocation(this.finalProg!, 'u_halftoneSize'), params.halftone.dotSize);
    gl.uniform1f(gl.getUniformLocation(this.finalProg!, 'u_halftoneAngle'), params.halftone.angle);
    gl.uniform1f(gl.getUniformLocation(this.finalProg!, 'u_halftoneContrast'), params.halftone.contrast);
    const shapeInt = params.halftone.shape === 'circle' ? 0 : params.halftone.shape === 'diamond' ? 1 : 2;
    gl.uniform1i(gl.getUniformLocation(this.finalProg!, 'u_halftoneShape'), shapeInt);
    gl.uniform1i(gl.getUniformLocation(this.finalProg!, 'u_halftoneCustomColors'), params.halftone.useCustomColors ? 1 : 0);
    const fg = hexToRgbVec3(params.halftone.foregroundColor);
    const bg = hexToRgbVec3(params.halftone.backgroundColor);
    gl.uniform3f(gl.getUniformLocation(this.finalProg!, 'u_halftoneFg'), fg[0], fg[1], fg[2]);
    gl.uniform3f(gl.getUniformLocation(this.finalProg!, 'u_halftoneBg'), bg[0], bg[1], bg[2]);

    gl.uniform1f(gl.getUniformLocation(this.finalProg!, 'u_grainAmount'), params.grade.grainAmount);
    gl.uniform1f(gl.getUniformLocation(this.finalProg!, 'u_grainSize'), params.grade.grainSize);
    gl.uniform1f(gl.getUniformLocation(this.finalProg!, 'u_contrast'), params.grade.contrast);
    gl.uniform1f(gl.getUniformLocation(this.finalProg!, 'u_brightness'), params.grade.brightness);
    gl.uniform1i(gl.getUniformLocation(this.finalProg!, 'u_invert'), params.grade.invert ? 1 : 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
  }

  public async exportStaticBlob(
    exportWidth: number,
    exportHeight: number,
    params: StudioParams,
    mediaRef: MediaElementRef,
    timeSec: number,
    mimeType: 'image/png' | 'image/jpeg'
  ): Promise<Blob> {
    const prevW = this.canvas.width;
    const prevH = this.canvas.height;

    this.renderFrame(exportWidth, exportHeight, params, mediaRef, timeSec);

    const blob = await new Promise<Blob>((resolve, reject) => {
      this.canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Falha ao gerar arquivo de imagem.'));
        },
        mimeType,
        0.96
      );
    });

    // Restore preview resolution cleanly
    this.renderFrame(prevW, prevH, params, mediaRef, timeSec);
    return blob;
  }

  public dispose() {
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    const gl = this.gl;
    if (!gl) return;
    [this.fboA, this.fboB, this.fboC, this.fboD].forEach((f) => {
      if (f) {
        gl.deleteFramebuffer(f.fbo);
        gl.deleteTexture(f.tex);
      }
    });
    if (this.sourceTex) gl.deleteTexture(this.sourceTex);
    [this.blurProg, this.opticsProg, this.streakProg, this.finalProg].forEach((p) => {
      if (p) gl.deleteProgram(p);
    });
  }
}
