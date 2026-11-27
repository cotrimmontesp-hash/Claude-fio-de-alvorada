'use strict';
// tela deitada: no celular em pé, o jogo inteiro gira 90° (ROT) e usa largura/altura trocadas
const IS_TOUCH = matchMedia('(pointer:coarse)').matches;
let ROT = false;
const VW = () => ROT ? innerHeight : innerWidth, VH = () => ROT ? innerWidth : innerHeight;
function checkRot() { ROT = IS_TOUCH && innerHeight > innerWidth; document.documentElement.classList.toggle('rot', ROT); }
checkRot();
// ================= MOTOR 3D (WebGL2) =================
const cv = document.getElementById('cv');
const gl = cv.getContext('webgl2', { antialias: true, powerPreference: 'high-performance' });
if (!gl) { document.getElementById('nogl').style.display = 'flex'; throw new Error('Sem WebGL2'); }

const lin = h => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255].map(x => Math.pow(x, 2.2));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  sc: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)],
  d2: (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]),
};

// ---------- matrizes (coluna-maior) ----------
const M = {
  I() { const o = new Float32Array(16); o[0] = o[5] = o[10] = o[15] = 1; return o; },
  mul(a, b) {
    const o = new Float32Array(16);
    for (let i = 0; i < 4; i++) { const b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
      for (let j = 0; j < 4; j++) o[i * 4 + j] = a[j] * b0 + a[4 + j] * b1 + a[8 + j] * b2 + a[12 + j] * b3; }
    return o;
  },
  T(x, y, z) { const o = M.I(); o[12] = x; o[13] = y; o[14] = z; return o; },
  S(x, y, z) { const o = M.I(); o[0] = x; o[5] = y; o[10] = z; return o; },
  RX(a) { const o = M.I(), c = Math.cos(a), s = Math.sin(a); o[5] = c; o[6] = s; o[9] = -s; o[10] = c; return o; },
  RY(a) { const o = M.I(), c = Math.cos(a), s = Math.sin(a); o[0] = c; o[2] = -s; o[8] = s; o[10] = c; return o; },
  RZ(a) { const o = M.I(), c = Math.cos(a), s = Math.sin(a); o[0] = c; o[1] = s; o[4] = -s; o[5] = c; return o; },
  // T * Ry * Rx * Rz * S
  trs(x, y, z, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    let m = M.T(x, y, z);
    if (ry) m = M.mul(m, M.RY(ry)); if (rx) m = M.mul(m, M.RX(rx)); if (rz) m = M.mul(m, M.RZ(rz));
    if (sx !== 1 || sy !== 1 || sz !== 1) m = M.mul(m, M.S(sx, sy, sz));
    return m;
  },
  xf(m, v) { const x = v[0], y = v[1], z = v[2]; return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]]; },
  persp(f, a, n, fa) { const t = 1 / Math.tan(f / 2), o = new Float32Array(16); o[0] = t / a; o[5] = t; o[10] = (fa + n) / (n - fa); o[11] = -1; o[14] = 2 * fa * n / (n - fa); return o; },
  ortho(l, r, b, t, n, f) { const o = M.I(); o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n); o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); return o; },
  look(e, t, u) {
    const f = V.norm(V.sub(t, e)), s = V.norm(V.cross(f, u)), q = V.cross(s, f), o = M.I();
    o[0] = s[0]; o[4] = s[1]; o[8] = s[2]; o[1] = q[0]; o[5] = q[1]; o[9] = q[2]; o[2] = -f[0]; o[6] = -f[1]; o[10] = -f[2];
    o[12] = -V.dot(s, e); o[13] = -V.dot(q, e); o[14] = V.dot(f, e); return o;
  },
  inv(a) {
    const o = new Float32Array(16);
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let d = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; if (!d) return M.I(); d = 1 / d;
    o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * d; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * d; o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * d; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * d;
    o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * d; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * d; o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * d; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * d;
    o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * d; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * d; o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * d; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * d;
    o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * d; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * d; o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * d; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * d;
    return o;
  },
  nrm(m) { // inversa transposta 3x3
    const a00 = m[0], a01 = m[1], a02 = m[2], a10 = m[4], a11 = m[5], a12 = m[6], a20 = m[8], a21 = m[9], a22 = m[10];
    const b01 = a22 * a11 - a12 * a21, b11 = -a22 * a10 + a12 * a20, b21 = a21 * a10 - a11 * a20;
    let d = a00 * b01 + a01 * b11 + a02 * b21; d = d ? 1 / d : 1;
    const i = [b01 * d, (-a22 * a01 + a02 * a21) * d, (a12 * a01 - a02 * a11) * d, b11 * d, (a22 * a00 - a02 * a20) * d, (-a12 * a00 + a02 * a10) * d, b21 * d, (-a21 * a00 + a01 * a20) * d, (a11 * a00 - a01 * a10) * d];
    return new Float32Array([i[0], i[3], i[6], i[1], i[4], i[7], i[2], i[5], i[8]]);
  }
};

// ---------- geometrias unitárias ----------
function gBox() {
  const p = [], n = [], i = [];
  for (const N of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
    const u = Math.abs(N[1]) > 0 ? [1, 0, 0] : [0, 1, 0], v = V.cross(N, u), b = p.length / 3;
    for (const [a, c] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { p.push(N[0] * .5 + u[0] * a * .5 + v[0] * c * .5, N[1] * .5 + u[1] * a * .5 + v[1] * c * .5, N[2] * .5 + u[2] * a * .5 + v[2] * c * .5); n.push(...N); }
    i.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  return { p, n, i };
}
function gSphere(ws = 14, hs = 10) {
  const p = [], n = [], i = [];
  for (let y = 0; y <= hs; y++) { const t = y / hs * Math.PI;
    for (let x = 0; x <= ws; x++) { const f = x / ws * Math.PI * 2, nx = Math.sin(t) * Math.cos(f), ny = Math.cos(t), nz = Math.sin(t) * Math.sin(f); p.push(nx * .5, ny * .5, nz * .5); n.push(nx, ny, nz); } }
  for (let y = 0; y < hs; y++) for (let x = 0; x < ws; x++) { const a = y * (ws + 1) + x, b = a + ws + 1; i.push(a, b, a + 1, b, b + 1, a + 1); }
  return { p, n, i };
}
function gCyl(rt = .5, rb = .5, seg = 12) {
  const p = [], n = [], i = [], sl = rb - rt;
  for (let k = 0; k <= seg; k++) { const f = k / seg * Math.PI * 2, c = Math.cos(f), s = Math.sin(f), nn = V.norm([c, sl, s]);
    p.push(c * rt, .5, s * rt, c * rb, -.5, s * rb); n.push(...nn, ...nn); }
  for (let k = 0; k < seg; k++) { const a = k * 2; i.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  for (const [y, r, ny] of [[.5, rt, 1], [-.5, rb, -1]]) { if (r <= 0) continue; const c0 = p.length / 3; p.push(0, y, 0); n.push(0, ny, 0);
    for (let k = 0; k <= seg; k++) { const f = k / seg * Math.PI * 2; p.push(Math.cos(f) * r, y, Math.sin(f) * r); n.push(0, ny, 0); }
    for (let k = 0; k < seg; k++) i.push(c0, c0 + 1 + k, c0 + 2 + k); }
  return { p, n, i };
}
const G = { box: gBox(), sph: gSphere(), cyl: gCyl(), cone: gCyl(0, .5, 10), blade: gCyl(0, .5, 3), sphL: gSphere(8, 6), cyl6: gCyl(.5, .5, 6), rock: (() => { const g = gSphere(7, 5); for (let k = 0; k < g.p.length; k += 3) { const s = .75 + Math.abs(Math.sin(k * 12.9898) * 43758.5453 % 1) * .5; g.p[k] *= s; g.p[k + 1] *= s; g.p[k + 2] *= s; } return g; })() };

// ---------- construtor de malha estática (cores por vértice, a = emissivo) ----------
class GB {
  constructor() { this.p = []; this.n = []; this.c = []; this.i = []; }
  add(g, m, col, em = 0) {
    const b = this.p.length / 3, nm = M.nrm(m), P = this.p, N = this.n, C = this.c;
    for (let k = 0; k < g.p.length; k += 3) {
      const x = g.p[k], y = g.p[k + 1], z = g.p[k + 2];
      P.push(m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]);
      const a = g.n[k], bb = g.n[k + 1], c = g.n[k + 2];
      let nx = nm[0] * a + nm[3] * bb + nm[6] * c, ny = nm[1] * a + nm[4] * bb + nm[7] * c, nz = nm[2] * a + nm[5] * bb + nm[8] * c; const l = Math.hypot(nx, ny, nz) || 1;
      N.push(nx / l, ny / l, nz / l); C.push(col[0], col[1], col[2], em);
    }
    for (const idx of g.i) this.i.push(b + idx);
    return this;
  }
}
function mkMesh(g) {
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const buf = (data, loc, sz) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, sz, gl.FLOAT, false, 0, 0); };
  buf(g.p, 0, 3); buf(g.n, 1, 3);
  if (g.c) buf(g.c, 2, 4); else { gl.disableVertexAttribArray(2); gl.vertexAttrib4f(2, 1, 1, 1, 0); }
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(g.i), gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return { vao, count: g.i.length, vc: !!g.c };
}
const MESH = {}; for (const k in G) MESH[k] = mkMesh(G[k]);

// ---------- shaders ----------
function prog(vs, fs) {
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'aP'); gl.bindAttribLocation(p, 1, 'aN'); gl.bindAttribLocation(p, 2, 'aC'); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let k = 0; k < n; k++) { const inf = gl.getActiveUniform(p, k); const nm = inf.name.replace('[0]', ''); u[nm] = gl.getUniformLocation(p, inf.name); }
  return { p, u, fsSrc: fs };
}
const NL = 8;
const PMain = prog(`#version 300 es
in vec3 aP;in vec3 aN;in vec4 aC;uniform mat4 uM,uVP,uL;uniform mat3 uN;out vec3 vW,vN;out vec4 vL,vC;
void main(){vec4 w=uM*vec4(aP,1.);vW=w.xyz;vN=normalize(uN*aN);vL=uL*w;vC=aC;gl_Position=uVP*w;}`,
`#version 300 es
precision highp float;precision highp sampler2DShadow;
in vec3 vW,vN;in vec4 vL,vC;out vec4 o;
uniform vec3 uCol,uEm,uSun,uSunC,uCam,uFog,uSkyA,uSkyB;uniform float uSpec,uFogD,uGrain,uRim,uFlash;uniform sampler2DShadow uSh;
uniform vec3 uLP[${NL}];uniform vec3 uLC[${NL}];uniform float uLR[${NL}];
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
float shd(){vec3 c=vL.xyz/vL.w*.5+.5;if(c.x<0.||c.x>1.||c.y<0.||c.y>1.||c.z>1.)return 1.;float s=0.;
for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)s+=texture(uSh,vec3(c.xy+vec2(x,y)/2048.,c.z-.0012));return s/9.;}
void main(){vec3 N=normalize(vN);vec3 V=normalize(uCam-vW);if(dot(N,V)<0.)N=-N;
vec3 alb=uCol*vC.rgb;
if(uGrain>0.){float g=vn(vW.xz*1.7)*.6+vn(vW.xz*6.)*.4;alb*=mix(1.,.72+.56*g,uGrain);}
float d=max(dot(N,uSun),0.);float s=shd();vec3 H=normalize(uSun+V);float sp=pow(max(dot(N,H),0.),48.)*uSpec;
vec3 amb=mix(uSkyB,uSkyA,N.y*.5+.5)*.55;
vec3 c=alb*(amb+uSunC*d*s)+uSunC*sp*s;
for(int k=0;k<${NL};k++){vec3 L=uLP[k]-vW;float dl=length(L);float at=clamp(1.-dl/uLR[k],0.,1.);at*=at;L/=max(dl,.001);
c+=alb*uLC[k]*max(dot(N,L),0.)*at+uLC[k]*pow(max(dot(N,normalize(L+V)),0.),32.)*uSpec*at*.5;}
c+=pow(1.-max(dot(N,V),0.),3.)*uRim*uSkyA;
c+=uEm+vC.rgb*vC.a*uCol+vec3(uFlash);
float f=1.-exp(-length(uCam-vW)*uFogD);float fh=exp(-max(vW.y,0.)*.05);c=mix(c,uFog,f*fh);
c=(c*(2.51*c+.03))/(c*(2.43*c+.59)+.14);o=vec4(pow(clamp(c,0.,1.),vec3(1./2.2)),1.);}`);
const PShadow = prog(`#version 300 es
in vec3 aP;uniform mat4 uM,uL;void main(){gl_Position=uL*uM*vec4(aP,1.);}`, `#version 300 es
precision mediump float;void main(){}`);
const PSky = prog(`#version 300 es
in vec3 aP;out vec2 vU;void main(){vU=aP.xy;gl_Position=vec4(aP.xy,.9999,1.);}`, `#version 300 es
precision highp float;in vec2 vU;out vec4 o;uniform mat4 uIV;uniform vec3 uCam,uSun,uSkyA,uSkyB,uFog,uRiftN;uniform float uRift,uTime,uNight;
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
void main(){vec4 w=uIV*vec4(vU,1.,1.);vec3 d=normalize(w.xyz/w.w-uCam);
float y=d.y;vec3 c=mix(uFog,uSkyA,pow(clamp(y,0.,1.),.55));c=mix(c,uSkyB*1.3,exp(-abs(y)*5.)*.9);
float sd=max(dot(d,uSun),0.);c+=vec3(1.,.62,.35)*pow(sd,8.)*.55+vec3(1.,.85,.6)*pow(sd,400.)*6.;
vec2 cp=d.xz/(d.y+.25)*1.4+vec2(uTime*.01,0.);float cl=vn(cp*1.5)*.55+vn(cp*4.)*.3+vn(cp*9.)*.15;cl=smoothstep(.5,.85,cl)*smoothstep(0.,.25,y);
c=mix(c,mix(uSkyB*1.4,vec3(1.,.7,.5),pow(sd,2.)*.6+.2),cl*.55);
float st=step(.9975,h2(floor(d.xz/(d.y+.01)*300.)))*smoothstep(.15,.5,y)*uNight;c+=vec3(st);
if(uRift>0.){float g=abs(dot(d,uRiftN));float al=atan(d.x,d.z);float j=(vn(vec2(al*14.,uTime*.3))-.5)*.035+(vn(vec2(al*50.,1.))-.5)*.012;
float m=smoothstep(-.05,.35,y)*smoothstep(.95,.55,y);float r=exp(-abs(g+j)*120.)*m;float halo=exp(-abs(g+j)*14.)*m;
c+=(vec3(1.,.86,.55)*r*3.+vec3(1.,.55,.35)*halo*.35)*uRift;}
c=(c*(2.51*c+.03))/(c*(2.43*c+.59)+.14);o=vec4(pow(clamp(c,0.,1.),vec3(1./2.2)),1.);}`);
const PFx = prog(`#version 300 es
in vec3 aP;in vec4 aN;in vec4 aC;uniform mat4 uVP;out vec4 vU,vC;void main(){vU=aN;vC=aC;gl_Position=uVP*vec4(aP,1.);}`, `#version 300 es
precision mediump float;in vec4 vU,vC;out vec4 o;
void main(){float f=vU.w>.5?(1.-smoothstep(.75,1.,max(abs(vU.x),abs(vU.y)))):exp(-(vU.x*vU.x+vU.y*vU.y)*3.2);float a=f*vC.a;o=vec4(vC.rgb*a,vU.z>.5?0.:a);}`);

// tela cheia
const fsVao = gl.createVertexArray(); gl.bindVertexArray(fsVao); { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); } gl.bindVertexArray(null);

// mapa de sombra
const SH = 2048, shTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, shTex);
gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SH, SH);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
const shFb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, shFb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shTex, 0);
gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE); gl.bindFramebuffer(gl.FRAMEBUFFER, null);

// efeitos (quads dinâmicos): pos3, uv4 (u,v,aditivo,duro), cor4
const FXMAX = 24000, fxData = new Float32Array(FXMAX * 4 * 11); let fxN = 0;
const fxVao = gl.createVertexArray(), fxBuf = gl.createBuffer(); gl.bindVertexArray(fxVao); gl.bindBuffer(gl.ARRAY_BUFFER, fxBuf); gl.bufferData(gl.ARRAY_BUFFER, fxData.byteLength, gl.DYNAMIC_DRAW);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 44, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 44, 12); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 44, 28);
{ const ix = new Uint32Array(FXMAX * 6); for (let q = 0; q < FXMAX; q++) { const b = q * 4; ix.set([b, b + 1, b + 2, b, b + 2, b + 3], q * 6); } const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ix, gl.STATIC_DRAW); }
gl.bindVertexArray(null);

const R = {
  items: [], lights: [], view: M.I(), proj: M.I(), vp: M.I(), cam: [0, 5, 10], camR: [1, 0, 0], camU: [0, 1, 0],
  env: { sun: V.norm([.55, .42, .35]), sunC: [2.6, 1.9, 1.35], skyA: lin(0x4d6fa0), skyB: lin(0xe9a07a), fog: lin(0xc3a08d), fogD: .011, rift: 1, riftN: V.norm([.25, .35, 1]), night: .35 },
  draw(mesh, m, col = [1, 1, 1], o = {}) { this.items.push({ mesh, m, col, em: o.em || [0, 0, 0], spec: o.spec ?? .35, grain: o.grain || 0, rim: o.rim ?? .15, flash: o.flash || 0, sh: o.sh !== false }); },
  light(p, c, r) { this.lights.push({ p, c, r }); },
  quad(a, b, c, d, col, al, add = 1, hard = 0, uvs) {
    if (fxN >= FXMAX) return; const o = fxN * 44, U = uvs || [[-1, -1], [1, -1], [1, 1], [-1, 1]]; let k = o;
    for (let q = 0; q < 4; q++) { const P = [a, b, c, d][q]; fxData[k++] = P[0]; fxData[k++] = P[1]; fxData[k++] = P[2]; fxData[k++] = U[q][0]; fxData[k++] = U[q][1]; fxData[k++] = add; fxData[k++] = hard; fxData[k++] = col[0]; fxData[k++] = col[1]; fxData[k++] = col[2]; fxData[k++] = al; }
    fxN++;
  },
  pt(p, s, col, al = 1, add = 1) { const r = V.sc(this.camR, s), u = V.sc(this.camU, s); this.quad(V.sub(V.sub(p, r), u), V.sub(V.add(p, r), u), V.add(V.add(p, r), u), V.add(V.sub(p, r), u), col, al, add); },
  beam(a, b, w, col, al = 1, add = 1) {
    const d = V.sub(b, a), mid = V.lerp(a, b, .5), sd = V.sc(V.norm(V.cross(d, V.sub(this.cam, mid))), w * .5);
    const U = [[0, -1], [0, -1], [0, 1], [0, 1]];
    this.quad(V.sub(a, sd), V.sub(b, sd), V.add(b, sd), V.add(a, sd), col, al, add, 0, [[0, -1], [0, -1], [0, 1], [0, 1]]);
  },
  flat(cx, cz, ang, len, w, col, al = 1, y = .04) { // retângulo no chão (aviso)
    const f = [Math.sin(ang) * len * .5, 0, Math.cos(ang) * len * .5], s = [Math.cos(ang) * w * .5, 0, -Math.sin(ang) * w * .5], c = [cx, y, cz];
    this.quad(V.sub(V.sub(c, f), s), V.sub(V.add(c, f), s), V.add(V.add(c, f), s), V.add(V.sub(c, f), s), col, al, 1, 1);
  },
  ring(cx, cz, r, w, col, al = 1, seg = 40) { for (let k = 0; k < seg; k++) { const a0 = k / seg * Math.PI * 2, a1 = (k + 1) / seg * Math.PI * 2; const p = (a, rr) => [cx + Math.sin(a) * rr, .05, cz + Math.cos(a) * rr];
    this.quad(p(a0, r - w), p(a1, r - w), p(a1, r), p(a0, r), col, al, 1, 0, [[0, -1], [0, -1], [0, 1], [0, 1]]); } },
  disc(cx, cz, r, col, al = 1, seg = 32) { for (let k = 0; k < seg; k++) { const a0 = k / seg * Math.PI * 2, a1 = (k + 1) / seg * Math.PI * 2; const p = (a) => [cx + Math.sin(a) * r, .045, cz + Math.cos(a) * r];
    this.quad([cx, .045, cz], p(a0), p(a1), [cx, .045, cz], col, al, 1, 1, [[0, 0], [.7, 0], [.7, 0], [0, 0]]); } },
  setCam(eye, tgt, fov = .95) {
    const a = cv.width / cv.height; this.cam = eye; this.view = M.look(eye, tgt, [0, 1, 0]); this.proj = M.persp(fov, a, .1, 600); this.vp = M.mul(this.proj, this.view);
    this.camR = [this.view[0], this.view[4], this.view[8]]; this.camU = [this.view[1], this.view[5], this.view[9]];
  },
  project(p) { const m = this.vp, x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
    if (w <= .1) return null; return [(x / w * .5 + .5) * VW(), (1 - (y / w * .5 + .5)) * VH()]; },
  render(focus, time) {
    const E = this.env;
    // sombra
    const c = [Math.round(focus[0]), 0, Math.round(focus[2])], le = V.add(c, V.sc(E.sun, 70));
    const L = M.mul(M.ortho(-34, 34, -34, 34, 1, 160), M.look(le, c, [0, 1, 0]));
    gl.bindFramebuffer(gl.FRAMEBUFFER, shFb); gl.viewport(0, 0, SH, SH); gl.clear(gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.5, 3);
    gl.useProgram(PShadow.p); gl.uniformMatrix4fv(PShadow.u.uL, false, L);
    const SK = this.items.filter(i => i.skinned), ST = this.items.filter(i => !i.skinned);
    for (const it of ST) if (it.sh) { gl.uniformMatrix4fv(PShadow.u.uM, false, it.m); gl.bindVertexArray(it.mesh.vao); gl.drawElements(gl.TRIANGLES, it.mesh.count, gl.UNSIGNED_INT, 0); }
    if (SK.length) drawSkinned(SK, true, L);
    gl.disable(gl.POLYGON_OFFSET_FILL);
    // principal
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(PSky.p); gl.depthMask(false); const u0 = PSky.u;
    gl.uniformMatrix4fv(u0.uIV, false, M.inv(this.vp)); gl.uniform3fv(u0.uCam, this.cam); gl.uniform3fv(u0.uSun, E.sun); gl.uniform3fv(u0.uSkyA, E.skyA); gl.uniform3fv(u0.uSkyB, E.skyB); gl.uniform3fv(u0.uFog, E.fog);
    gl.uniform3fv(u0.uRiftN, E.riftN); gl.uniform1f(u0.uRift, E.rift); gl.uniform1f(u0.uTime, time); gl.uniform1f(u0.uNight, E.night);
    gl.bindVertexArray(fsVao); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.depthMask(true);
    const ls = this.lights.map(l => [l, V.d2(l.p, focus)]).sort((a, b) => a[1] - b[1]).slice(0, NL).map(x => x[0]);
    const lp = new Float32Array(NL * 3), lc = new Float32Array(NL * 3), lr = new Float32Array(NL).fill(1);
    ls.forEach((l, k) => { lp.set(l.p, k * 3); lc.set(l.c, k * 3); lr[k] = l.r; });
    const common = u => { gl.uniformMatrix4fv(u.uVP, false, this.vp); gl.uniformMatrix4fv(u.uL, false, L); gl.uniform3fv(u.uSun, E.sun); gl.uniform3fv(u.uSunC, E.sunC); gl.uniform3fv(u.uCam, this.cam);
      gl.uniform3fv(u.uFog, E.fog); gl.uniform1f(u.uFogD, E.fogD); gl.uniform3fv(u.uSkyA, E.skyA); gl.uniform3fv(u.uSkyB, E.skyB);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, shTex); gl.uniform1i(u.uSh, 0);
      gl.uniform3fv(u.uLP, lp); gl.uniform3fv(u.uLC, lc); gl.uniform1fv(u.uLR, lr); };
    const u = PMain.u; gl.useProgram(PMain.p); common(u);
    for (const it of ST) {
      gl.uniformMatrix4fv(u.uM, false, it.m); gl.uniformMatrix3fv(u.uN, false, M.nrm(it.m)); gl.uniform3fv(u.uCol, it.col); gl.uniform3fv(u.uEm, it.em);
      gl.uniform1f(u.uSpec, it.spec); gl.uniform1f(u.uGrain, it.grain); gl.uniform1f(u.uRim, it.rim); gl.uniform1f(u.uFlash, it.flash);
      gl.bindVertexArray(it.mesh.vao); if (!it.mesh.vc) gl.vertexAttrib4f(2, 1, 1, 1, 0); gl.drawElements(gl.TRIANGLES, it.mesh.count, gl.UNSIGNED_INT, 0);
    }
    if (SK.length) drawSkinned(SK, false, L, common);
    // efeitos
    if (fxN) { gl.useProgram(PFx.p); gl.uniformMatrix4fv(PFx.u.uVP, false, this.vp); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
      gl.bindVertexArray(fxVao); gl.bindBuffer(gl.ARRAY_BUFFER, fxBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, fxData, 0, fxN * 44); gl.drawElements(gl.TRIANGLES, fxN * 6, gl.UNSIGNED_INT, 0);
      gl.depthMask(true); gl.disable(gl.BLEND); }
    gl.bindVertexArray(null);
    this.items.length = 0; this.lights.length = 0; fxN = 0;
  }
};
function resize() { checkRot(); const d = Math.min(devicePixelRatio || 1, 1.5) * (window.QUALITY || 1); cv.width = Math.floor(VW() * d); cv.height = Math.floor(VH() * d); }
addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 200)); resize();

// ---------- esqueleto (rig) ----------
// parte: {n:nome, p:pai, o:[x,y,z] junta, g:malha, mo:[off], s:[escala], c:cor, em:emissivo, r:[rx,ry,rz]}
class Rig {
  constructor(parts) { this.parts = parts.map(q => ({ ...q, r: [0, 0, 0], W: null })); this.by = {}; for (const q of this.parts) this.by[q.n] = q; this.pos = [0, 0, 0]; this.yaw = 0; this.pitch = 0; this.roll = 0; this.scale = 1; this.flash = 0; this.tint = null; this.emAdd = null; }
  pose(n, x = 0, y = 0, z = 0) { const q = this.by[n]; if (q) { q.r[0] = x; q.r[1] = y; q.r[2] = z; } }
  reset() { for (const q of this.parts) q.r[0] = q.r[1] = q.r[2] = 0; }
  update() {
    const root = M.trs(this.pos[0], this.pos[1], this.pos[2], this.yaw, this.pitch, this.roll, this.scale, this.scale, this.scale);
    for (const q of this.parts) {
      const par = q.p ? this.by[q.p].W : root;
      let w = M.mul(par, M.T(q.o[0], q.o[1], q.o[2]));
      if (q.r[1]) w = M.mul(w, M.RY(q.r[1])); if (q.r[0]) w = M.mul(w, M.RX(q.r[0])); if (q.r[2]) w = M.mul(w, M.RZ(q.r[2]));
      q.W = w;
    }
  }
  wp(n, off = [0, 0, 0]) { return M.xf(this.by[n].W, off); }
  draw(o = {}) {
    for (const q of this.parts) {
      if (!q.g) continue; if (q.hide) continue;
      const m = M.mul(q.W, M.mul(M.T(q.mo[0], q.mo[1], q.mo[2]), M.mul(q.rr ? M.RX(q.rr) : M.I(), M.S(q.s[0], q.s[1], q.s[2]))));
      let col = q.c; if (this.tint) col = V.lerp(col, this.tint[0], this.tint[1]);
      let em = q.em || [0, 0, 0]; if (this.emAdd && q.glow) em = V.add(em, this.emAdd);
      R.draw(MESH[q.g], m, col, { em, spec: q.sp ?? .3, flash: this.flash, rim: .25, sh: o.sh !== false });
    }
  }
}
