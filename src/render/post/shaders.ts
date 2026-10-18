/* ------------------------------------------------------------------
   post/shaders.ts - the print room.

   Five of the twenty treatments are ways of PRINTING what the world
   already is, so they belong here rather than in the scene: they take
   the rendered frame and re-state it through a sampling rule. The
   sixth, glitch, is a controlled distortion of the same signal, and
   the seventh, bloom, is selective light.

   All of them read the same scene texture, so switching between them
   never changes what is being looked at, only how it is being said.
   ------------------------------------------------------------------ */

/** the scene is rendered into a linear target; the canvas wants sRGB */
const OUTPUT = /* glsl */ `
  vec3 toSRGB(vec3 c) {
    c = max(c, vec3(0.0));
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
  }
`;

const COMMON = /* glsl */ `
  precision highp float;
  uniform sampler2D uScene;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uAmount;    // 0 .. 1: how far the treatment is applied
  uniform float uOpacity;   // the slot's crossfade
  varying vec2 vUv;

  ${OUTPUT}

  float luma(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
  }

  /**
   * Luminance with the ground subtracted. Every print treatment uses
   * this rather than raw luma: a screen that reads the near-black of
   * an empty frame as "a little bit of light" fills the void with ink,
   * and the void is half of what this world is made of.
   */
  float signalLuma(vec3 c) {
    return max(luma(c) - 0.018, 0.0) * 1.05;
  }

  float hash21(vec2 p) {
    p = fract(p * vec2(443.897, 441.423));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }
`;

export const POST_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    // a clip-space triangle: no camera, nothing to misalign
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/** straight copy, used when a treatment is fading in over nothing */
export const COPY_FRAG = /* glsl */ `
  ${COMMON}
  void main() {
    gl_FragColor = vec4(toSRGB(texture2D(uScene, vUv).rgb), uOpacity);
  }
`;

/* ---- 11. ASCII --------------------------------------------------- */
export const ASCII_FRAG = /* glsl */ `
  ${COMMON}
  uniform sampler2D uAtlas;
  uniform float uGlyphs;
  uniform float uCell;      // cell size in device pixels
  uniform vec3 uInk;

  void main() {
    vec2 cell = vec2(uCell);
    vec2 grid = floor(gl_FragCoord.xy / cell);
    vec2 inCell = fract(gl_FragCoord.xy / cell);

    // one sample per cell, taken at its centre: the structure of the
    // scene survives because the grid is aligned to the frame, not to
    // anything in it
    vec2 centre = (grid + 0.5) * cell / uResolution;
    vec3 src = texture2D(uScene, centre).rgb;
    float l = signalLuma(src);

    // pick the glyph whose ink matches the light at this cell
    float idx = floor(clamp(pow(l * 1.25, 0.9), 0.0, 0.999) * uGlyphs);
    // the canvas texture is already flipped on upload, so the cell
    // coordinate is used as it comes: flipping again stands every
    // glyph on its head
    vec2 auv = vec2((idx + inCell.x) / uGlyphs, inCell.y);
    float glyph = texture2D(uAtlas, auv).r;

    // keep the hue of what was there: the ember stays ember
    vec3 tint = l > 0.001 ? normalize(src + vec3(0.0001)) * 1.5 : uInk;
    vec3 ascii = tint * glyph * clamp(0.35 + l * 1.4, 0.0, 1.6);

    vec3 outc = mix(src, ascii, uAmount);
    gl_FragColor = vec4(toSRGB(outc), uOpacity);
  }
`;

/* ---- 12. DITHERING ----------------------------------------------- */
export const DITHER_FRAG = /* glsl */ `
  ${COMMON}
  uniform float uLevels;
  uniform float uScale;
  uniform float uBlue;      // 0 ordered (Bayer), 1 noise-based

  // the ordered matrix, built recursively from the 2x2 one: this is a
  // real Bayer threshold, not a noise texture pretending to be one
  float bayer2(vec2 a) {
    a = floor(a);
    return fract(a.x / 2.0 + a.y * a.y * 0.75);
  }
  float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
  float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

  void main() {
    vec3 src = texture2D(uScene, vUv).rgb;
    vec2 p = gl_FragCoord.xy / max(1.0, uScale);

    float threshold = mix(bayer8(p) * 0.94, hash21(floor(p)), uBlue);
    threshold = clamp(threshold, 0.0, 1.0) - 0.5;

    // Genuine quantisation: the value is pushed across a level boundary
    // by the threshold, then snapped. The ground is subtracted first,
    // or the dither lifts the blacks and the void stops being void.
    float levels = max(2.0, uLevels);
    vec3 signal = max(src - 0.055, vec3(0.0)) * 1.06;
    vec3 q = floor(signal * levels + threshold * 1.1 + 0.5) / levels;

    vec3 outc = mix(src, clamp(q, 0.0, 1.0), uAmount);
    gl_FragColor = vec4(toSRGB(outc), uOpacity);
  }
`;

/* ---- 13. HALFTONE ------------------------------------------------ */
export const HALFTONE_FRAG = /* glsl */ `
  ${COMMON}
  uniform float uCell;
  uniform float uAngle;

  void main() {
    vec3 src = texture2D(uScene, vUv).rgb;

    float c = cos(uAngle);
    float s = sin(uAngle);
    mat2 rot = mat2(c, -s, s, c);
    vec2 p = rot * gl_FragCoord.xy / max(1.0, uCell);
    vec2 cellCentre = floor(p) + 0.5;

    // the dot is sized by the light measured at the centre of its own
    // cell, which is what makes it a screen and not a texture
    mat2 inv = mat2(c, s, -s, c);
    vec2 sampleAt = (inv * (cellCentre * uCell)) / uResolution;
    float l = signalLuma(texture2D(uScene, clamp(sampleAt, 0.0, 1.0)).rgb);

    float radius = sqrt(clamp(l * 1.1, 0.0, 1.0)) * 0.7;
    float d = length(p - cellCentre);
    // the soft edge must not straddle zero, or every empty cell prints
    // half a dot and the dark half of the frame fills up with ink
    float edge = min(0.08, radius * 0.5);
    float dot_ = (1.0 - smoothstep(radius - edge, radius + edge, d)) * step(0.004, l);

    vec3 at = texture2D(uScene, clamp(sampleAt, 0.0, 1.0)).rgb;
    vec3 tint = l > 0.001 ? normalize(at + vec3(0.0001)) * 1.4 : vec3(1.0);
    vec3 halftone = tint * dot_ * clamp(0.4 + l, 0.0, 1.4);

    gl_FragColor = vec4(toSRGB(mix(src, halftone, uAmount)), uOpacity);
  }
`;

/* ---- 14. RISOGRAPH ----------------------------------------------- */
export const RISO_FRAG = /* glsl */ `
  ${COMMON}
  uniform vec3 uInkA;
  uniform vec3 uInkB;
  uniform float uRegistration;   // how far the plates are out of line, px
  uniform float uGrain;

  // one ink plate: a screened separation of one channel of the image
  float plate(vec2 uv, vec2 offset, float angle, float cell) {
    vec2 px = (uv * uResolution) + offset;
    float c = cos(angle);
    float s = sin(angle);
    vec2 p = mat2(c, -s, s, c) * px / cell;
    vec2 centre = floor(p) + 0.5;
    vec2 back = (mat2(c, s, -s, c) * (centre * cell) - offset) / uResolution;
    float l = signalLuma(texture2D(uScene, clamp(back, 0.0, 1.0)).rgb);
    float r = sqrt(clamp(l * 1.7, 0.0, 1.0)) * 0.8;
    float edge = min(0.1, r * 0.5);
    return (1.0 - smoothstep(r - edge, r + edge, length(p - centre))) * step(0.004, l);
  }

  void main() {
    vec3 src = texture2D(uScene, vUv).rgb;

    // two plates, deliberately out of register, screened at different
    // angles: the overlap is where a third colour appears
    float a = plate(vUv, vec2(uRegistration, -uRegistration * 0.6), 0.26, 4.2);
    float b = plate(vUv, vec2(-uRegistration * 0.8, uRegistration), 1.17, 4.6);

    // The paper of this world is its ground, not a white sheet. If the
    // stock were lighter the empty half of the frame would fill with
    // dots, and the whole point of the edge is that it empties.
    vec3 paper = vec3(0.039, 0.035, 0.031);
    vec3 ink = paper;
    ink += uInkA * a * 0.9;
    ink += uInkB * b * 0.85;
    // where both plates print, the ink builds rather than averages
    ink += uInkA * uInkB * a * b * 0.65;

    // the tooth of the paper, but only where there is ink to catch on
    float coverage = clamp(max(a, b), 0.0, 1.0);
    float g = (hash21(floor(gl_FragCoord.xy * 0.75)) - 0.5) * uGrain * (0.12 + coverage);
    ink += g;

    gl_FragColor = vec4(toSRGB(mix(src, ink, uAmount)), uOpacity);
  }
`;

/* ---- 15. PIXEL --------------------------------------------------- */
export const PIXEL_FRAG = /* glsl */ `
  ${COMMON}
  uniform float uSize;     // pixel size in device pixels
  uniform float uLevels;

  void main() {
    vec2 cell = vec2(max(1.0, uSize));
    // nearest-neighbour: one sample per block, no smoothing anywhere
    vec2 snapped = (floor(gl_FragCoord.xy / cell) + 0.5) * cell / uResolution;
    vec3 src = texture2D(uScene, vUv).rgb;
    vec3 block = texture2D(uScene, clamp(snapped, 0.0, 1.0)).rgb;

    float levels = max(2.0, uLevels);
    block = floor(block * levels + 0.5) / levels;

    gl_FragColor = vec4(toSRGB(mix(src, block, uAmount)), uOpacity);
  }
`;

/* ---- 19. GLITCH -------------------------------------------------- */
export const GLITCH_FRAG = /* glsl */ `
  ${COMMON}
  uniform float uShift;    // chromatic displacement, px
  uniform float uBlocks;   // how much of the frame is displaced

  void main() {
    float t = floor(uTime * 18.0);

    // bands: a few horizontal slices, chosen deterministically per
    // tick, displaced sideways. Nothing is displaced when uAmount is 0.
    float band = floor(gl_FragCoord.y / max(2.0, uResolution.y * 0.045));
    float pick = hash21(vec2(band, t));
    // 'active' is a reserved word in GLSL ES: naming a variable that
    // stops the whole shader compiling
    float onBand = step(1.0 - uBlocks * uAmount, pick);
    float dir = hash21(vec2(band, t + 7.0)) > 0.5 ? 1.0 : -1.0;
    vec2 off = vec2(onBand * dir * (0.01 + 0.05 * pick) * uAmount, 0.0);

    vec2 uv = clamp(vUv + off, 0.0, 1.0);

    // the channels are sampled a little apart, which is what a broken
    // signal actually does
    float s = uShift * uAmount / uResolution.x;
    vec3 c;
    c.r = texture2D(uScene, clamp(uv + vec2(s, 0.0), 0.0, 1.0)).r;
    c.g = texture2D(uScene, uv).g;
    c.b = texture2D(uScene, clamp(uv - vec2(s, 0.0), 0.0, 1.0)).b;

    // one bright scan line while it is happening
    float line = step(0.996, hash21(vec2(t, band * 0.3))) * uAmount * 0.25;
    c += line;

    gl_FragColor = vec4(toSRGB(c), uOpacity);
  }
`;

/* ---- 8. NEON GLOW: bright pass, blur, composite ------------------- */
export const BRIGHT_FRAG = /* glsl */ `
  ${COMMON}
  uniform float uThreshold;
  void main() {
    vec3 c = texture2D(uScene, vUv).rgb;
    float l = luma(c);
    float k = smoothstep(uThreshold, uThreshold + 0.25, l);
    gl_FragColor = vec4(c * k, 1.0);
  }
`;

export const BLUR_FRAG = /* glsl */ `
  ${COMMON}
  uniform vec2 uDirection;
  void main() {
    // five taps, separable: enough for a glow, cheap enough to keep
    vec2 d = uDirection / uResolution;
    vec3 c = texture2D(uScene, vUv).rgb * 0.227;
    c += texture2D(uScene, vUv + d * 1.385).rgb * 0.316;
    c += texture2D(uScene, vUv - d * 1.385).rgb * 0.316;
    c += texture2D(uScene, vUv + d * 3.231).rgb * 0.070;
    c += texture2D(uScene, vUv - d * 3.231).rgb * 0.070;
    gl_FragColor = vec4(c, 1.0);
  }
`;

export const COMPOSITE_FRAG = /* glsl */ `
  ${COMMON}
  uniform sampler2D uGlow;
  uniform float uStrength;
  void main() {
    vec3 base = texture2D(uScene, vUv).rgb;
    vec3 glow = texture2D(uGlow, vUv).rgb;
    gl_FragColor = vec4(toSRGB(base + glow * uStrength), uOpacity);
  }
`;
