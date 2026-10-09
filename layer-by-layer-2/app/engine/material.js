// All GLSL lives in this file. One shared vertex "placed()" rule drives every mode:
// assembly, tiers, layer slicing, explode, ghost layer and the sun's shadow pass.
import * as THREE from './three.js';

const COMMON = /* glsl */`
uniform float uReveal, uMinY, uCut, uTierA, uDrop, uExplode;
in vec4 aBlk;   // block x, y, z, stagger inside its layer (0..1)
in vec4 aNb;    // covering neighbour: y, stagger + 2 x ground bits, tier from, tier to (y < -9000 = none)
in vec4 aTier;  // tier from, tier to, palette index, -
in vec4 aLit;   // ambient occlusion, sky light, block light, flags (1 glow, 2 ground, 4 glass/water)
float easeOutBack(float t){ float c1 = 1.5, c3 = c1 + 1.; float u = t - 1.; return 1. + c3*u*u*u + c1*u*u; }
float tierT(float s, float t0, float t1){
  float tin = clamp(((uTierA - t0 + 1.) - s * .35) / .65, 0., 1.);
  float tout = clamp(((t1 - uTierA) - s * .35) / .65, 0., 1.);
  return min(tin, tout);
}
float layerT(float y, float s){
  float layer = y - uMinY;
  if (layer > uCut + .5) return 0.;
  return clamp(((uReveal - layer) - s * .55) / .45, 0., 1.);
}
float placedT(float y, float s, float t0, float t1){ return min(layerT(y, s), tierT(s, t0, t1)); }
bool isGround(){ return mod(floor(aLit.w / 2.), 2.) > .5; }
float nbS(){ return mod(aNb.y, 2.); }   // the covering block's stagger
// ground next door at the tier on show (bit k-1 = there at tier k). Like a ground cell itself it is
// there from .35 before its tier until its tier ends, and it needs no layer to be built first
bool nbGround(){
  int m = int(aNb.y * .5);
  if (m == 0) return false;
  int k0 = clamp(int(floor(uTierA)), 1, 31) - 1, k1 = clamp(int(floor(uTierA + .35)), 1, 31) - 1;
  return ((m >> k0) & 1) == 1 || ((m >> k1) & 1) == 1;
}
// returns the animated position, or w = 0 when the face must vanish
// a face is hidden by its neighbour only once that neighbour has landed, and not when the
// exploded view pulls the two layers apart
bool covered(){
  if (aNb.x < -9000.) return false;
  if (uExplode > .001 && abs(aNb.x - aBlk.y) > .5) return false;
  if (nbGround()) return true;
  return aNb.w > aNb.z && placedT(aNb.x, nbS(), aNb.z, aNb.w) >= 1.;
}
vec4 animate(vec3 p, out float t){
  if (isGround()) {
    // ground is there for tiers [aTier.x, aTier.y) (0..99 = always): it gives way to a block that
    // lands at a later tier (a pond, a path) and comes back when that block leaves
    t = 1.;
    if (covered() || uTierA < aTier.x - .35 || uTierA >= aTier.y) return vec4(0.);
    return vec4(p, 1.);
  }
  t = placedT(aBlk.y, aBlk.w, aTier.x, aTier.y);
  bool hide = t <= 0. || covered();
  if (hide) return vec4(0.);
  float e = easeOutBack(t);
  vec3 c = aBlk.xyz + .5;
  p = c + (p - c) * mix(.45, 1., clamp(t * 2.2, 0., 1.));
  p.y += (1. - e) * uDrop + (aBlk.y - uMinY) * uExplode;
  return vec4(p, 1.);
}
`;

const VERT = /* glsl */`
${COMMON}
in vec3 uvl;
in vec4 aLT;    // light per tier, packed: 12 bits a tier (ao 0..3, sky 0..30, block 0..30), two tiers a float
uniform mat4 uSunMat;
uniform float uGhostLayer, uGhost, uLT, uNT;
// ao (as a brightness), sky light and block light (0..1) at tier k (1..8)
vec3 tierLight(float k){
  float i = k - 1.;
  float f = i < 2. ? aLT.x : i < 4. ? aLT.y : i < 6. ? aLT.z : aLT.w;
  float v = mod(i, 2.) < .5 ? mod(f, 4096.) : floor(f / 4096.);
  float a = floor(v / 1024.);
  float ao = a < .5 ? .47 : a < 1.5 ? .66 : a < 2.5 ? .83 : 1.;
  return vec3(ao, floor(mod(v, 1024.) / 32.) / 30., mod(v, 32.) / 30.);
}
out vec2 vUv; flat out float vLayer; out vec4 vLit; out vec3 vN; out vec4 vSun; flat out vec4 vBlk; flat out float vItem; out float vT;
void main(){
  float t;
  vec4 a;
  if (uGhost > .5) {
    // the blueprint: blocks of the next layer that haven't landed yet, drawn where they will go
    float ly = aBlk.y - uMinY;
    bool show = !isGround() && abs(ly - uGhostLayer) < .5 && layerT(aBlk.y, aBlk.w) <= 0. && tierT(aBlk.w, aTier.x, aTier.y) >= 1.;
    if (aNb.x > -9000. && aNb.w > aNb.z && abs(aNb.x - uMinY - uGhostLayer) < .5 && tierT(nbS(), aNb.z, aNb.w) >= 1.) show = false;
    if (aNb.x > -9000. && (nbGround() || (aNb.w > aNb.z && placedT(aNb.x, nbS(), aNb.z, aNb.w) >= 1.))) show = false;
    a = show ? vec4(position + vec3(0., (aBlk.y - uMinY) * uExplode, 0.), 1.) : vec4(0.);
    t = 1.;
  } else a = animate(position, t);
  vT = t;
  vUv = uvl.xy; vLayer = uvl.z; vLit = aLit; vN = normal; vBlk = aBlk; vItem = aTier.w;
  if (uLT > .5) {
    // the light of the tier on show, blended while one tier turns into the next
    float k = clamp(uTierA, 1., uNT), k0 = floor(k), k1 = min(k0 + 1., uNT);
    vec3 L = mix(tierLight(k0), tierLight(k1), k - k0);
    float shade = normal.y > .5 ? 1. : normal.y < -.5 ? .5 : abs(normal.z) > .5 ? .8 : .62;
    vLit.xyz = vec3(shade * L.x, L.y, L.z);
  }
  vec4 wp = modelMatrix * vec4(a.xyz, 1.);
  vSun = uSunMat * wp;
  gl_Position = a.w > 0. ? projectionMatrix * viewMatrix * wp : vec4(2., 2., 2., 1.);
}`;

const FRAG = /* glsl */`
precision highp float;
precision highp sampler2DArray;
uniform sampler2DArray uTex;
uniform sampler2D uShadowMap;
uniform float uDay, uShadowOn, uTime, uCutout, uGhost, uHi, uNight, uSunUp, uOpen;
uniform vec3 uSunDir, uSunCol, uSkyCol, uBlockCol;
uniform vec4 uSel;
uniform vec2 uCur;  // current layer range (absolute y); y > x means none
in vec2 vUv; flat in float vLayer; in vec4 vLit; in vec3 vN; in vec4 vSun; flat in vec4 vBlk; flat in float vItem; in float vT;
out vec4 outColor;
float curve(float l){ return l * l * (3. - 2. * l) * .82 + l * .18; }
float shadowAt(){
  if (uShadowOn < .5) return 1.;
  vec3 sc = vSun.xyz / vSun.w * .5 + .5;
  if (sc.x < 0. || sc.x > 1. || sc.y < 0. || sc.y > 1. || sc.z > 1.) return 1.;
  float bias = .0025;
  vec2 ts = 1. / vec2(textureSize(uShadowMap, 0));
  float s = 0.;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++)
    s += (sc.z - bias <= texture(uShadowMap, sc.xy + vec2(i, j) * ts).r) ? 1. : 0.;
  return s / 9.;
}
void main(){
  // sharp-bilinear: crisp texels inside, antialiased texel edges, no shimmer from far away
  vec2 px = vUv * 16.;
  vec2 dx = dFdx(px), dy = dFdy(px);
  vec2 fw = max(abs(dx) + abs(dy), vec2(1e-4));
  vec2 s = floor(px + .5);
  vec2 q = s + clamp((px - s) / fw, -.5, .5);
  vec4 tex = textureGrad(uTex, vec3(q / 16., vLayer), dx / 16., dy / 16.);
  if (tex.a < uCutout) discard;
  if (uGhost > .5) {
    vec2 e = min(vUv, 1. - vUv);
    float edge = 1. - smoothstep(.0, .07, min(e.x, e.y));
    float pulse = .5 + .5 * sin(uTime * 3.2);
    vec3 c = mix(vec3(.35, .75, 1.), vec3(1.), edge * .8);
    outColor = vec4(mix(tex.rgb * .5 + c * .5, c, .35), (.32 + .18 * pulse) + edge * .45);
    return;
  }
  // uOpen: while a build is half done or sliced, light it as if the roof were not there yet
  float ao = vLit.x, sky = curve(max(vLit.y, uOpen * .92)), bl = curve(vLit.z);
  float fl = floor(vLit.w + .5);   // the flags are whole numbers, but interpolation can leave 1.9999
  bool glow = mod(fl, 2.) > .5;
  vec3 n = normalize(vN);
  float classic = n.y > .5 ? 1. : n.y < -.5 ? .5 : abs(n.z) > .5 ? .8 : .62;
  float ndl = max(dot(n, uSunDir), 0.);
  float sh = ndl > 0. ? shadowAt() : 0.;
  vec3 amb = uSkyCol * sky * ao * (.42 + .3 * classic);
  vec3 sun = uSunCol * sky * ndl * sh * mix(1., ao, .5) * .62 * uSunUp;
  vec3 light = (amb + sun) * uDay + uBlockCol * bl * mix(1., ao, .6) * (1.15 - .55 * uDay);
  light = max(light, vec3(.045, .05, .085) * ao);
  vec3 col = tex.rgb * light;
  if (glow) col = tex.rgb * (.95 + .25 * uNight);
  // tap highlight
  if (uSel.w > .5 && all(lessThan(abs(vBlk.xyz - uSel.xyz), vec3(.5)))) {
    vec2 e = min(vUv, 1. - vUv);
    float edge = 1. - smoothstep(.0, .06, min(e.x, e.y));
    col = mix(col * 1.15 + .08, vec3(1., .85, .2), edge);
  }
  // the layer you are building now: a gold rim on every block in it
  if (uCur.y >= uCur.x && vBlk.y >= uCur.x - .5 && vBlk.y <= uCur.y + .5 && mod(fl, 4.) < 2.) {
    vec2 e = min(vUv, 1. - vUv);
    float edge = 1. - smoothstep(.0, .05, min(e.x, e.y));
    col = mix(col * 1.06, vec3(1., .82, .18), edge * .85);
  }
  if (uHi > -.5) {
    if (abs(vItem - uHi) < .5) col = mix(col, vec3(1., .86, .25), .3 + .2 * sin(uTime * 4.));
    else if (mod(fl, 4.) < 2.) col = mix(col, vec3(dot(col, vec3(.3, .55, .15))), .7) * .55;
  }
  // water: clear enough to see a build inside it, with a little blue. A sea used as the ground is
  // bluer and less see-through, so it reads as water and not as pale sand (a hull still shows in it)
  if (mod(floor(fl / 8.), 2.) > .5) {
    if (mod(floor(fl / 2.), 2.) > .5) { outColor = vec4(mix(col, vec3(.16, .42, .9) * light, .5), .64); return; }
    outColor = vec4(mix(col, vec3(.25, .55, .95) * light, .25), .3); return;
  }
  outColor = vec4(col, tex.a < 1. ? max(tex.a, .35) : 1.);
}`;

const DEPTH_VERT = /* glsl */`
${COMMON}
void main(){
  float t; vec4 a = animate(position, t);
  gl_Position = a.w > 0. ? projectionMatrix * viewMatrix * modelMatrix * vec4(a.xyz, 1.) : vec4(2., 2., 2., 1.);
}`;
// WebGL 2 refuses to draw into a render target whose colour buffer has no shader output
const DEPTH_FRAG = /* glsl */`out vec4 outColor; void main(){ outColor = vec4(1.); }`;

export function makeUniforms(tex) {
  return {
    uTex: { value: tex }, uShadowMap: { value: null }, uShadowOn: { value: 0 }, uSunMat: { value: new THREE.Matrix4() },
    uReveal: { value: 999 }, uMinY: { value: 0 }, uCut: { value: 999 }, uTierA: { value: 1 }, uDrop: { value: 6 }, uExplode: { value: 0 },
    uGhostLayer: { value: -1 }, uTime: { value: 0 }, uSel: { value: new THREE.Vector4(0, 0, 0, 0) }, uHi: { value: -1 }, uCur: { value: new THREE.Vector2(1, 0) },
    uDay: { value: 1 }, uNight: { value: 0 }, uSunUp: { value: 1 }, uOpen: { value: 0 }, uLT: { value: 0 }, uNT: { value: 1 },
    uSunDir: { value: new THREE.Vector3(.45, .8, .38).normalize() }, uSunCol: { value: new THREE.Color(1, .97, .9) },
    uSkyCol: { value: new THREE.Color(1, 1, 1.04) }, uBlockCol: { value: new THREE.Color(1.15, .86, .55) },
  };
}

export function voxelMaterial(U, kind) {
  const u = { ...U, uCutout: { value: kind === 'trans' ? 0.02 : 0.5 }, uGhost: { value: kind === 'ghost' ? 1 : 0 } };
  const m = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: FRAG, uniforms: u,
    transparent: kind !== 'opaque', depthWrite: kind === 'opaque',
  });
  if (kind === 'ghost') { m.depthWrite = false; m.blending = THREE.NormalBlending; }
  if (kind === 'opaque') m.alphaToCoverage = true;
  return m;
}

export function depthMaterial(U) {
  return new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: DEPTH_VERT, fragmentShader: DEPTH_FRAG, uniforms: U });
}
