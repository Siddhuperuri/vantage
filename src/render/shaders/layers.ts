/* ------------------------------------------------------------------
   shaders/layers.ts - where the laws are actually applied.

   Every layer's deformation happens here, in the vertex shader, driven
   by about ten uniforms. The CPU per frame is therefore O(uniforms),
   not O(points): nothing walks 30,000 samples in JavaScript, nothing
   is allocated, and no attribute is re-uploaded after the world is
   built.

   Two properties of the anamorphic placement are used throughout:
     - scaling a point ALONG its ray (uDepthScale) cannot be seen from
       the vantage, only from off-axis.
     - moving a point ACROSS its ray (uSeparation, uMotionGain) is
       exactly what stops the five layers summing.
   ------------------------------------------------------------------ */

/** shared helpers: the attention point projected onto this vertex's own ray */
const COMMON = /* glsl */ `
  uniform float uTime;
  uniform float uStill;
  uniform float uLock;
  uniform float uMotion;
  uniform float uAttention;
  uniform float uResolution;
  uniform float uDepthScale;
  uniform float uGain;
  uniform float uOpacity;
  uniform float uReveal;
  uniform vec3  uAttn;
  uniform float uAttnStrength;
  uniform float uAttnRadius;
  uniform float uD0;

  // the attention point lives on the word plane; carry it down this
  // vertex's ray so that "near the pointer" means the same thing on
  // every layer, however deep it is.
  vec2 attnAt(float depth) {
    return uAttn.xy * (depth / uD0);
  }

  float nearAttn(vec2 p, float depth) {
    float d = length(p - attnAt(depth));
    return (1.0 - smoothstep(0.0, uAttnRadius, d)) * uAttnStrength;
  }

  // a wave of light that runs across the word, but only once it has resolved
  float resolveWave(float sweep) {
    float head = fract(uTime * 0.075);
    float d = sweep - head;
    d = d - floor(d + 0.5);
    return exp(-d * d * 42.0) * uLock * uStill;
  }
`;

/* ------------------------------------------------------------------
   lines: instrument, design, trace
   ------------------------------------------------------------------ */

export const LINE_VERT = /* glsl */ `
  attribute vec3 aDir;
  attribute vec3 aTangent;
  attribute vec4 aMeta;      // x amp, y arc 0..1, z stroke seed / trace pass, w sweep 0..1

  uniform float uMode;       // 0 instrument, 1 design, 2 trace
  uniform float uMotionGain;
  uniform float uSeparation;
  uniform vec3  uDrift;      // lateral direction: across the ray, so the sum breaks
  uniform vec3  uSmear;      // where the gesture was a moment ago (trace only)

  ${COMMON}

  varying float vAlpha;
  varying float vEmber;

  void main() {
    float amp = aMeta.x;
    float arc = aMeta.y;
    float seed = aMeta.z;
    float sweep = aMeta.w;

    // amp above 1.5 is a mark that only exists while the layer is attended to
    float revealOnly = step(1.5, amp);
    float baseAmp = mix(amp, 1.0, revealOnly);

    vec3 p = position * uDepthScale;
    float depth = abs(position.z);

    if (uMode < 0.5) {
      // INSTRUMENT measures: the guides extend about their own middle
      // rather than scattering. It is the reference frame; it reports
      // the error instead of suffering it.
      p += aTangent * (arc * 2.0 - 1.0) * uMotion * uMotionGain;
    } else if (uMode < 1.5) {
      // DESIGN comes apart into the strokes it was built from
      p += aDir * uMotion * uMotionGain * (0.55 + seed * 0.9);
    } else {
      // TRACE keeps a lagging ghost of the gesture, and its passes
      // separate under motion and converge again when still
      p += uSmear * (0.35 + seed * 1.3);
      p += aDir * uMotion * uMotionGain * (0.3 + seed * 1.4);
      p += aTangent * sin(uTime * 1.1 + seed * 24.0) * 0.012 * (1.0 - uStill);
    }

    // across the ray: the one displacement the vantage cannot forgive
    p += uDrift * uSeparation;

    float attn = nearAttn(p.xy, depth);

    float a = uGain * baseAmp * uOpacity;
    a *= mix(0.6, 1.0, clamp(uResolution, 0.0, 1.0));
    a *= 1.0 + uAttention * 0.85 + attn * 0.5;
    // a reveal-only mark (the measured numerals) is worth nothing until attended to
    a *= mix(1.0, uAttention, revealOnly);
    a += resolveWave(sweep) * 0.42 * uGain;
    a *= uReveal;

    // the only colour in the piece: a mark that has just been measured
    vEmber = clamp(revealOnly * (uAttention * 0.85 + attn * 0.25), 0.0, 1.0);
    vAlpha = clamp(a, 0.0, 1.4);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

export const LINE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uEmber;
  varying float vAlpha;
  varying float vEmber;

  void main() {
    if (vAlpha < 0.004) discard;
    vec3 c = mix(uColor, uEmber, vEmber);
    gl_FragColor = vec4(c, vAlpha);
  }
`;

/* ------------------------------------------------------------------
   field: a probability cloud, drawn as points or as halftone
   ------------------------------------------------------------------ */

const FIELD_HEAD = /* glsl */ `
  attribute vec3 aJitter;
  attribute vec4 aMeta;      // x amp, y sweep, z seed, w 1 if prior

  uniform float uDispersion;
  uniform float uSize;
  /** drawing-buffer height in device pixels: makes point size
      resolution- and lens-independent instead of a magic number */
  uniform float uViewportH;
  uniform float uIdle;
  uniform float uSeparation;
  uniform vec3  uDrift;

  ${COMMON}

  varying float vAlpha;
  varying float vSeed;
  varying float vPrior;
`;

const FIELD_BODY = /* glsl */ `
    float amp = aMeta.x;
    float sweep = aMeta.y;
    float seed = aMeta.z;
    float prior = aMeta.w;

    vec3 home = position * uDepthScale;
    float depth = abs(position.z);

    // the cloud widens with motion. The prior never resolves: it is the
    // noise the subject was inferred out of, and it stays noise.
    float spread = uDispersion * (1.0 - uResolution) + prior * 0.55;
    vec3 p = home + aJitter * spread * 6.0;

    // ATTENTION PULLS: near the attended point the distribution
    // collapses onto the stroke, whatever the energy is doing elsewhere.
    float attn = nearAttn(p.xy, depth);
    p = mix(p, home, attn * (1.0 - prior) * 0.92);

    // a private shimmer, only where the layer is probabilistic
    float ph = seed * 6.2831853;
    p += vec3(sin(uTime * 1.3 + ph), cos(uTime * 1.1 + ph * 1.7), sin(uTime * 0.9 + ph * 0.6))
         * uIdle * 0.045 * (1.0 - attn);

    p += uDrift * uSeparation;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);

    float a = uGain * amp * uOpacity;
    a *= mix(0.35, 1.0, uResolution);
    a *= 1.0 + uAttention * 0.7 + attn * 1.2;
    a *= mix(1.0, 0.45, prior);
    a += resolveWave(sweep) * 0.5 * uGain * (1.0 - prior);
    a *= uReveal;

    vAlpha = clamp(a, 0.0, 1.5);
    vSeed = seed;
    vPrior = prior;

    gl_Position = projectionMatrix * mv;
`;

export const FIELD_POINTS_VERT = /* glsl */ `
  ${FIELD_HEAD}
  void main() {
    ${FIELD_BODY}
    // projectionMatrix[1][1] is 1/tan(fov/2): this is the real screen
    // size of a sample of a fixed world radius, at any viewport
    float px = uViewportH * projectionMatrix[1][1] * 0.0042 / max(0.6, -mv.z);
    gl_PointSize = clamp(uSize * px * (0.75 + 0.45 * uAttention), 1.0, 26.0);
  }
`;

export const FIELD_POINTS_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  varying float vPrior;

  void main() {
    vec2 q = gl_PointCoord - 0.5;
    float r = dot(q, q) * 4.0;
    // a soft sample, slightly softer for the prior: it was never certain
    float f = exp(-r * mix(3.4, 1.9, vPrior));
    float a = vAlpha * f;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

export const FIELD_HALFTONE_VERT = /* glsl */ `
  ${FIELD_HEAD}
  uniform float uCell;
  void main() {
    ${FIELD_BODY}
    // a halftone dot is sized by how much light it stands for
    float px = uViewportH * projectionMatrix[1][1] * 0.0042 / max(0.6, -mv.z);
    gl_PointSize = clamp(uCell * px * (0.3 + 1.3 * clamp(vAlpha, 0.0, 1.0)), 1.0, 30.0);
  }
`;

export const FIELD_HALFTONE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uGamma;
  varying float vAlpha;
  varying float vSeed;

  void main() {
    vec2 q = gl_PointCoord - 0.5;
    // a hard-edged dot: the mark of a screen, not of a light
    float d = length(q);
    float f = 1.0 - smoothstep(0.33, 0.42, d);
    float a = pow(clamp(vAlpha, 0.0, 1.0), uGamma) * f;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

/* ------------------------------------------------------------------
   lattice: instanced cells whose pitch is the layer's resolution
   ------------------------------------------------------------------ */

export const LATTICE_VERT = /* glsl */ `
  attribute vec3 aCenter;
  attribute vec4 aMeta;      // x amp, y sweep, z seed, w glyph index

  uniform float uPitch;
  uniform float uSeparation;
  uniform vec3  uDrift;
  uniform float uPitchScale;

  ${COMMON}

  varying float vAlpha;
  varying vec2 vLocal;

  void main() {
    float amp = aMeta.x;
    float sweep = aMeta.y;
    float seed = aMeta.z;

    vec3 c = aCenter * uDepthScale;
    float depth = abs(aCenter.z);
    float attn = nearAttn(c.xy, depth);

    // COMPUTES: motion costs resolution. The grid it is held on gets
    // cruder, so the subject survives as blocks before it survives as
    // letters. Attention refines the grid below its resting pitch.
    float res = max(0.07, uResolution + attn * 0.45);
    float pitch = (uPitch * uPitchScale) / res;

    vec2 snapped = floor(c.xy / pitch + 0.5) * pitch;
    vec3 world = vec3(snapped, c.z);
    world += uDrift * uSeparation;

    // the cell drifts a little while energy is high, in whole cells only
    float jig = step(0.5, fract(seed + floor(uTime * 6.0) * 0.37)) * uMotion;
    world.xy += vec2(jig * pitch * 0.5, -jig * pitch * 0.25);

    world += vec3(position.xy * pitch * 0.62, 0.0);

    float a = uGain * amp * uOpacity;
    a *= 1.0 + uAttention * 0.8 + attn * 0.9;
    a *= mix(0.75, 1.0, clamp(res, 0.0, 1.0));
    a += resolveWave(sweep) * 0.4 * uGain;
    a *= uReveal;

    vAlpha = clamp(a, 0.0, 1.4);
    vLocal = position.xy;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
  }
`;

export const LATTICE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  varying vec2 vLocal;

  void main() {
    // a cell is a cell: square, with a slightly brighter edge, so the
    // grid reads as computed rather than painted
    vec2 q = abs(vLocal) * 2.0;
    float m = max(q.x, q.y);
    float edge = smoothstep(0.78, 1.0, m) * 0.5;
    float a = vAlpha * (0.72 + edge);
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

/* ------------------------------------------------------------------
   atmosphere: grain and vignette, as two full-screen draws
   ------------------------------------------------------------------ */

export const FULLSCREEN_VERT = /* glsl */ `
  void main() {
    // position is already in clip space: no camera involved, so this
    // quad cannot be knocked out of alignment by the camera system
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const GRAIN_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uAmount;
  uniform vec2  uResolution;

  float h21(vec2 p) {
    p = fract(p * vec2(443.897, 441.423));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }

  void main() {
    // stepped like film frames, never smooth
    float frame = floor(uTime * 14.0);
    vec2 uv = gl_FragCoord.xy + frame * 73.17;
    float g = h21(uv) - 0.5;
    float a = abs(g) * uAmount;
    gl_FragColor = vec4(vec3(0.95, 0.92, 0.86) * sign(max(g, 0.0)), a);
  }
`;

export const VIGNETTE_FRAG = /* glsl */ `
  precision highp float;
  uniform vec2 uResolution;
  uniform float uAmount;

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    vec2 d = uv - 0.5;
    d.x *= 1.18;
    float r = length(d) * 1.42;
    float v = 1.0 - smoothstep(0.52, 1.0, r) * uAmount;
    // multiply blending: this darkens the corners of what is already drawn
    gl_FragColor = vec4(vec3(v), 1.0);
  }
`;
