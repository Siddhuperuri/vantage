/* ------------------------------------------------------------------
   shaders/inside.ts - the five layers, read as five stages.

   A letter on the wall is never "unfinished": it is somewhere on the
   way from a hand pass to a measured drawing, and where it is on that
   way is one number. The five stops are Module I's five layers:

       0.0 sketched   loose, wobbling, drawn by a hand
       0.4 inferred   a cloud of samples around the stroke
       0.65 computed  snapped onto a grid
       0.85 designed  the exact geometry
       1.0 measured   with its registration marks

   Per-letter state arrives as a texture, one texel per letter, so one
   draw call carries a hundred and ten letters each in its own state.
   ------------------------------------------------------------------ */

const STATE = /* glsl */ `
  uniform sampler2D uState;   // r: resolution, g: attention, b: recoil
  uniform float uLetters;
  uniform float uTime;
  uniform float uStill;
  uniform float uReveal;
  uniform float uPresence;    // how present this module is on the journey

  vec3 letterState(float index) {
    return texture2D(uState, vec2((index + 0.5) / uLetters, 0.5)).rgb;
  }

  // cheap deterministic wobble: the same hand every time
  vec2 hand(float seed, float arc) {
    return vec2(
      sin(seed * 31.4 + arc * 9.1 + uTime * 0.21),
      cos(seed * 17.7 + arc * 7.3 + uTime * 0.17)
    );
  }
`;

export const INSIDE_LINE_VERT = /* glsl */ `
  attribute vec4 aMeta;     // x letter, y arc, z seed, w 1 on a registration mark
  attribute vec3 aNormal;   // inward normal of the wall

  ${STATE}

  varying float vAlpha;
  varying float vEmber;

  void main() {
    vec3 st = letterState(aMeta.x);
    float res = st.r;
    float attn = st.g;
    float recoil = st.b;

    float arc = aMeta.y;
    float seed = aMeta.z;
    float isMark = aMeta.w;

    vec3 p = position;
    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 tangent = normalize(cross(up, aNormal));

    // SKETCHED: a hand that has not settled. It is strongest at the
    // bottom of the scale and gone by the time the letter is computed.
    float loose = 1.0 - smoothstep(0.0, 0.46, res);
    vec2 w = hand(seed, arc) * loose * 0.042;
    p += tangent * w.x + up * w.y;

    // a word that has been recoiled from is stirred off its axis
    p += tangent * recoil * 0.12 * sin(seed * 12.0 + uTime * 1.7);

    // COMPUTED: snapped onto a grid, which peaks mid-scale and is gone
    // again once the letter is designed
    float comp = smoothstep(0.48, 0.68, res) * (1.0 - smoothstep(0.68, 0.88, res));
    if (comp > 0.001) {
      float q = 0.07;
      vec3 snapped = floor(p / q + 0.5) * q;
      p = mix(p, snapped, comp);
    }

    // DESIGNED -> MEASURED: the registration marks only exist at the top
    float markAlpha = smoothstep(0.86, 1.0, res);

    float base = mix(0.16, 0.62, smoothstep(0.1, 0.9, res));
    float a = mix(base, markAlpha * 0.9, isMark);
    a *= 1.0 + attn * 0.9;
    a *= uReveal * uPresence;

    vEmber = isMark * markAlpha;
    vAlpha = clamp(a, 0.0, 1.3);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

export const INSIDE_LINE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uEmber;
  varying float vAlpha;
  varying float vEmber;

  void main() {
    if (vAlpha < 0.004) discard;
    gl_FragColor = vec4(mix(uColor, uEmber, vEmber), vAlpha);
  }
`;

export const INSIDE_CLOUD_VERT = /* glsl */ `
  attribute vec3 aJitter;
  attribute vec4 aMeta;

  uniform float uViewportH;
  uniform float uSize;

  ${STATE}

  varying float vAlpha;

  void main() {
    vec3 st = letterState(aMeta.x);
    float res = st.r;
    float attn = st.g;

    // INFERRED: the cloud belongs to one stage only. Below it the
    // letter is a hand drawing; above it, exact geometry. So it
    // appears, says what it is, and goes.
    float band = exp(-pow((res - 0.40) / 0.20, 2.0));

    vec3 p = position + aJitter * (1.4 - res) * 1.6;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);

    float a = band * (0.30 + attn * 0.7) * uReveal * uPresence;
    vAlpha = clamp(a, 0.0, 1.0);

    float px = uViewportH * projectionMatrix[1][1] * 0.0042 / max(0.6, -mv.z);
    gl_PointSize = clamp(uSize * px, 1.0, 20.0);
    gl_Position = projectionMatrix * mv;
  }
`;

export const INSIDE_CLOUD_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    vec2 q = gl_PointCoord - 0.5;
    float f = exp(-dot(q, q) * 12.0);
    float a = vAlpha * f;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;
