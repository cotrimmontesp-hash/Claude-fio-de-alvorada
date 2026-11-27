// ================= PERSONAGENS DO MIXAMO (glTF com esqueleto) =================
const PSkinSrc = (shadow) => `#version 300 es
in vec3 aP;in vec3 aN;in vec2 aU;in vec4 aJ;in vec4 aW;uniform mat4 uM,uVP,uL;uniform highp sampler2D uJT;
out vec3 vW,vN;out vec4 vL,vC;out vec2 vU;
mat4 jm(float j){int x=int(j+.5)*4;return mat4(texelFetch(uJT,ivec2(x,0),0),texelFetch(uJT,ivec2(x+1,0),0),texelFetch(uJT,ivec2(x+2,0),0),texelFetch(uJT,ivec2(x+3,0),0));}
void main(){mat4 S=aW.x*jm(aJ.x)+aW.y*jm(aJ.y)+aW.z*jm(aJ.z)+aW.w*jm(aJ.w);vec4 w=uM*S*vec4(aP,1.);
${shadow ? 'gl_Position=uL*w;}' : 'vW=w.xyz;vN=normalize(mat3(uM*S)*aN);vL=uL*w;vC=vec4(1,1,1,0);vU=aU;gl_Position=uVP*w;}'}`;
function progS(vs, fs) {
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  [['aP', 0], ['aN', 1], ['aC', 2], ['aU', 3], ['aJ', 4], ['aW', 5]].forEach(([n, l]) => gl.bindAttribLocation(p, l, n)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let k = 0; k < n; k++) { const inf = gl.getActiveUniform(p, k); u[inf.name.replace('[0]', '')] = gl.getUniformLocation(p, inf.name); }
  return { p, u };
}
// fragmento: o mesmo do motor, com textura opcional
const FS_TEX = PMain.fsSrc.replace('in vec4 vL,vC;', 'in vec4 vL,vC;in vec2 vU;uniform sampler2D uAlb;uniform float uHasTex;')
  .replace('vec3 alb=uCol*vC.rgb;', 'vec3 alb=uCol*vC.rgb;if(uHasTex>.5)alb*=pow(texture(uAlb,vU).rgb,vec3(2.2));');
const PSkin = progS(PSkinSrc(false), FS_TEX);
const PSkinSh = progS(PSkinSrc(true), `#version 300 es
precision mediump float;void main(){}`);

const IDJT = (() => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 4, 1, 0, gl.RGBA, gl.FLOAT, new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])); return t; })();
// ---------- leitor GLB ----------
function parseGLB(buf) {
  const dv = new DataView(buf); if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('GLB inválido');
  let off = 12, json = null, bin = null;
  while (off < buf.byteLength) { const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true), data = buf.slice(off + 8, off + 8 + len);
    if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(data)); else if (type === 0x004E4942) bin = data; off += 8 + len; }
  return { json, bin };
}
function accData(g, bin, i) {
  const a = g.accessors[i], bv = g.bufferViews[a.bufferView], n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
  const T = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array, 5122: Int16Array, 5120: Int8Array }[a.componentType];
  const base = (bv.byteOffset || 0) + (a.byteOffset || 0), stride = bv.byteStride || 0, es = T.BYTES_PER_ELEMENT;
  let out;
  if (!stride || stride === n * es) out = new T(bin, base, a.count * n);
  else { out = new T(a.count * n); const dv = new DataView(bin); for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) { const o = base + k * stride + c * es; out[k * n + c] = es === 4 ? (T === Float32Array ? dv.getFloat32(o, true) : dv.getUint32(o, true)) : es === 2 ? dv.getUint16(o, true) : dv.getUint8(o); } }
  if (a.normalized && T !== Float32Array) { const m = T === Uint8Array ? 255 : 65535, f = new Float32Array(out.length); for (let k = 0; k < out.length; k++) f[k] = out[k] / m; out = f; }
  return out;
}
const Q = {
  slerp(a, b, t, o) { let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], s = 1; if (d < 0) { d = -d; s = -1; }
    let k0, k1; if (d > .9995) { k0 = 1 - t; k1 = t * s; } else { const th = Math.acos(d), sn = Math.sin(th); k0 = Math.sin((1 - t) * th) / sn; k1 = Math.sin(t * th) / sn * s; }
    for (let i = 0; i < 4; i++) o[i] = a[i] * k0 + b[i] * k1; const l = Math.hypot(o[0], o[1], o[2], o[3]) || 1; for (let i = 0; i < 4; i++) o[i] /= l; return o; },
  trs(t, r, s) { const [x, y, z, w] = r, o = new Float32Array(16), x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
    o[0] = (1 - (yy + zz)) * s[0]; o[1] = (xy + wz) * s[0]; o[2] = (xz - wy) * s[0]; o[4] = (xy - wz) * s[1]; o[5] = (1 - (xx + zz)) * s[1]; o[6] = (yz + wx) * s[1];
    o[8] = (xz + wy) * s[2]; o[9] = (yz - wx) * s[2]; o[10] = (1 - (xx + yy)) * s[2]; o[12] = t[0]; o[13] = t[1]; o[14] = t[2]; o[15] = 1; return o; }
};
// ---------- modelo carregado (compartilhado entre instâncias) ----------
async function loadModel(b64) {
  const raw = /\.glb$/.test(b64) ? await (await fetch(b64)).arrayBuffer() : Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer, { json: g, bin } = parseGLB(raw);
  const texs = await Promise.all((g.textures || []).map(async t => { const im = g.images[t.source], bv = g.bufferViews[im.bufferView];
    const bmp = await createImageBitmap(new Blob([new Uint8Array(bin, bv.byteOffset || 0, bv.byteLength)], { type: im.mimeType }));
    const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bmp);
    gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); return tx; }));
  const nodes = g.nodes.map((n, i) => ({ i, name: n.name || '', ch: n.children || [], t: n.translation || [0, 0, 0], r: n.rotation || [0, 0, 0, 1], s: n.scale || [1, 1, 1], m: n.matrix, mesh: n.mesh, skin: n.skin }));
  const parent = new Int32Array(nodes.length).fill(-1); nodes.forEach(n => n.ch.forEach(c => parent[c] = n.i));
  const order = []; const visit = i => { order.push(i); nodes[i].ch.forEach(visit); }; nodes.forEach((n, i) => { if (parent[i] < 0) visit(i); });
  const prims = [];
  nodes.forEach(n => { if (n.mesh == null) return; for (const p of g.meshes[n.mesh].primitives) {
    const A = p.attributes, vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const put = (data, loc, sz, int) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data instanceof Float32Array ? data : new Float32Array(data), gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, sz, gl.FLOAT, false, 0, 0); };
    put(accData(g, bin, A.POSITION), 0, 3); put(accData(g, bin, A.NORMAL), 1, 3);
    if (A.TEXCOORD_0 != null) put(accData(g, bin, A.TEXCOORD_0), 3, 2);
    if (A.JOINTS_0 != null) { put(Float32Array.from(accData(g, bin, A.JOINTS_0)), 4, 4); put(accData(g, bin, A.WEIGHTS_0), 5, 4); }
    const idx = accData(g, bin, p.indices), ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, Uint32Array.from(idx), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    const mt = g.materials && p.material != null ? g.materials[p.material] : {}, pbr = mt.pbrMetallicRoughness || {};
    const bc = pbr.baseColorFactor || [1, 1, 1, 1], ti = pbr.baseColorTexture ? texs[pbr.baseColorTexture.index] : null;
    prims.push({ hasJ: A.JOINTS_0 != null, vao, count: idx.length, node: n.i, skin: n.skin, col: [bc[0], bc[1], bc[2]], tex: ti, rough: pbr.roughnessFactor ?? .7, alpha: mt.alphaMode === 'BLEND' || mt.alphaMode === 'MASK' }); } });
  const skins = (g.skins || []).map(s => ({ joints: s.joints, ibm: accData(g, bin, s.inverseBindMatrices) }));
  const anims = {};
  for (const a of g.animations || []) { const ch = a.channels.map(c => { const sm = a.samplers[c.sampler]; return { node: c.target.node, path: c.target.path, t: accData(g, bin, sm.input), v: accData(g, bin, sm.output), step: sm.interpolation === 'STEP' }; });
    let dur = 0; ch.forEach(c => dur = Math.max(dur, c.t[c.t.length - 1])); anims[(a.name || 'anim').toLowerCase()] = { ch, dur }; }
  const byName = {}; nodes.forEach(n => byName[n.name.replace(/^mixamorig\d*:/i, '')] = n.i);
  return { nodes, parent, order, prims, skins, anims, byName };
}
function bindAnims(model, lib) {
  const nm = lib.nodes.map(n => n.name.replace(/^mixamorig\d*:/i, '')), hl = lib.byName.Hips, ht = model.byName.Hips;
  model.hipsRatio = (ht != null && hl != null) ? (model.nodes[ht].t[1] || 1) / (lib.nodes[hl].t[1] || 1) : 1;
  const hr = model.hipsRatio; for (const k in lib.anims) { const a = lib.anims[k]; model.anims[k] = { dur: a.dur, hr, ch: a.ch.map(c => ({ ...c, node: model.byName[nm[c.node]] })).filter(c => c.node != null) }; }
}
// amostra um canal no tempo t
function sampleCh(c, t, out) {
  const T = c.t, n = T.length, w = c.path === 'rotation' ? 4 : 3; let i = 0;
  if (t <= T[0]) i = 0; else if (t >= T[n - 1]) i = n - 1; else { let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] <= t) lo = m; else hi = m; } i = lo;
    if (!c.step) { const k = (t - T[lo]) / (T[hi] - T[lo]); if (w === 4) return Q.slerp(c.v.subarray(lo * 4, lo * 4 + 4), c.v.subarray(hi * 4, hi * 4 + 4), k, out);
      for (let j = 0; j < 3; j++) out[j] = c.v[lo * 3 + j] + (c.v[hi * 3 + j] - c.v[lo * 3 + j]) * k; return out; } }
  for (let j = 0; j < w; j++) out[j] = c.v[i * w + j]; return out;
}
// ---------- instância animada ----------
class SkinChar {
  constructor(model, height = 1.7) {
    this.m = model; const N = model.nodes.length;
    this.T = model.nodes.map(n => [...n.t]); this.Rq = model.nodes.map(n => [...n.r]); this.Sc = model.nodes.map(n => [...n.s]);
    this.W = new Array(N); this.pos = [0, 0, 0]; this.yaw = 0; this.flash = 0; this.emAdd = null; this.tint = null;
    this.cur = null; this.prev = null; this.fade = 0; this.fadeT = .15; this.time = 0; this.ptime = 0; this.speed = 1; this.loop = true;
    this.hips = model.byName.Hips; this.jt = model.skins.map(s => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); return { t, data: new Float32Array(s.joints.length * 16) }; });
    this.compute(); // altura na pose de repouso
    let lo = 1e9, hi = -1e9; for (const s of model.skins) for (const j of s.joints) { const y = this.W[j][13]; lo = Math.min(lo, y); hi = Math.max(hi, y); }
    this.base = height / Math.max(.2, (hi - lo) * 1.07); this.scale = this.base; this.foot = lo;
    this.bindHips = model.nodes[this.hips] ? [...model.nodes[this.hips].t] : [0, 0, 0];
  }
  has(n) { return !!this.m.anims[n]; }
  play(name, o = {}) {
    const a = this.m.anims[name]; if (!a) return false;
    if (this.cur === a && !o.restart) { this.speed = o.speed ?? this.speed; return true; }
    this.prev = this.cur; this.ptime = this.time; this.ploop = this.loop; this.cur = a; this.time = o.start || 0; this.loop = o.loop !== false; this.speed = o.speed ?? 1; this.fadeT = o.fade ?? .15; this.fade = this.prev ? 0 : 1; this.name = name; this.manual = !!o.manual; return true;
  }
  get progress() { return this.cur ? clamp(this.time / this.cur.dur, 0, 1) : 0; }
  get done() { return this.cur && !this.loop && this.time >= this.cur.dur; }
  apply(a, t, w) {
    const tmp = [0, 0, 0, 0];
    for (const c of a.ch) { sampleCh(c, t, tmp); const i = c.node;
      if (c.path === 'rotation') { if (w >= 1) this.Rq[i] = [tmp[0], tmp[1], tmp[2], tmp[3]]; else this.Rq[i] = Array.from(Q.slerp(this.Rq[i], tmp, w, [0, 0, 0, 0])); }
      else if (c.path === 'translation') { let v = [tmp[0], tmp[1], tmp[2]]; if (i === this.hips) { v[0] = this.bindHips[0]; v[1] *= a.hr || this.m.hipsRatio || 1; v[2] = this.bindHips[2]; } this.T[i] = w >= 1 ? v : V.lerp(this.T[i], v, w); }
      else if (c.path === 'scale') this.Sc[i] = w >= 1 ? [tmp[0], tmp[1], tmp[2]] : V.lerp(this.Sc[i], [tmp[0], tmp[1], tmp[2]], w); }
  }
  update(dt) {
    if (this.cur && !this.manual) { this.time += dt * this.speed; if (this.loop) this.time %= this.cur.dur; else this.time = Math.min(this.time, this.cur.dur); }
    if (this.prev && this.fade < 1) { this.ptime += dt; if (this.ploop) this.ptime %= this.prev.dur; else this.ptime = Math.min(this.ptime, this.prev.dur); this.apply(this.prev, this.ptime, 1); this.fade = Math.min(1, this.fade + dt / this.fadeT); this.apply(this.cur, this.time, ease(this.fade)); }
    else if (this.cur) this.apply(this.cur, this.time, 1);
    this.compute();
  }
  compute() {
    const m = this.m, root = M.trs(this.pos[0], this.pos[1], this.pos[2], this.yaw, this.pitch || 0, this.roll || 0, this.scale || 1, this.scale || 1, this.scale || 1);
    const r0 = M.mul(root, M.T(0, -(this.foot || 0), 0));
    for (const i of m.order) { const n = m.nodes[i], L = n.m ? new Float32Array(n.m) : Q.trs(this.T[i], this.Rq[i], this.Sc[i]); this.W[i] = m.parent[i] < 0 ? M.mul(r0, L) : M.mul(this.W[m.parent[i]], L); }
  }
  bone(name, off = [0, 0, 0]) { const i = this.m.byName[name]; return i == null ? this.pos : M.xf(this.W[i], off); }
  boneM(name) { const i = this.m.byName[name]; return i == null ? M.I() : this.W[i]; }
  draw(o = {}) {
    const m = this.m;
    m.skins.forEach((s, k) => { const J = this.jt[k];
      for (let j = 0; j < s.joints.length; j++) { const w = M.mul(this.W[s.joints[j]], s.ibm.subarray(j * 16, j * 16 + 16)); J.data.set(w, j * 16); }
      gl.bindTexture(gl.TEXTURE_2D, J.t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, s.joints.length * 4, 1, 0, gl.RGBA, gl.FLOAT, J.data); });
    for (const p of m.prims) {
      let col = p.col; if (this.tint) col = V.lerp(col, this.tint[0], this.tint[1]);
      R.items.push({ skinned: true, mesh: p, jt: p.skin != null ? this.jt[p.skin].t : IDJT, m: p.skin != null ? M.I() : this.W[p.node], col, tex: p.tex, em: this.emAdd && o.glow ? this.emAdd : [0, 0, 0], spec: .25, grain: 0, rim: .2, flash: this.flash || 0, sh: o.sh !== false });
    }
  }
}
// desenho dos itens com esqueleto (chamado pelo motor)
function drawSkinned(items, shadow, L, common) {
  const P = shadow ? PSkinSh : PSkin; gl.useProgram(P.p); const u = P.u;
  if (shadow) gl.uniformMatrix4fv(u.uL, false, L); else common(u);
  gl.activeTexture(gl.TEXTURE1); gl.uniform1i(u.uJT, 1);
  if (!shadow) { gl.uniform1i(u.uAlb, 2); }
  for (const it of items) { if (shadow && !it.sh) continue;
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, it.jt);
    gl.uniformMatrix4fv(u.uM, false, it.m);
    if (!shadow) { gl.uniform3fv(u.uCol, it.col); gl.uniform3fv(u.uEm, it.em); gl.uniform1f(u.uSpec, it.spec); gl.uniform1f(u.uGrain, 0); gl.uniform1f(u.uRim, it.rim); gl.uniform1f(u.uFlash, it.flash);
      gl.uniform1f(u.uHasTex, it.tex ? 1 : 0); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, it.tex || null); }
    gl.bindVertexArray(it.mesh.vao); if (!it.mesh.hasJ) { gl.vertexAttrib4f(4, 0, 0, 0, 0); gl.vertexAttrib4f(5, 1, 0, 0, 0); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, IDJT); }
    gl.drawElements(gl.TRIANGLES, it.mesh.count, gl.UNSIGNED_INT, 0); }
  gl.activeTexture(gl.TEXTURE0);
}

// ---------- Nera do Mixamo com a mesma interface do esqueleto antigo ----------
class SkinRig {
  constructor(model, height, wpn) {
    this.sk = new SkinChar(model, height); this.isSkin = true; this.scale = 1; this.tint = null; this.noWeapon = wpn === false; if (wpn === false) wpn = null; this.pos = [0, 0, 0]; this.yaw = 0; this.pitch = 0; this.roll = 0; this.flash = 0; this.emAdd = null; this.yOff = 0; this.extraYaw = 0;
    this.bladeLen = .92; this.wpn = wpn || { off: [0, .08, .03], rx: 0, ry: Math.PI, rz: 0 }; this.by = {}; this.dt = 0;
  }
  update() { const s = this.sk; s.pos = [this.pos[0], this.pos[1] - (this.yOff || 0), this.pos[2]]; s.yaw = this.yaw; s.pitch = this.pitch; s.roll = this.roll || 0; s.scale = s.base * (this.scale ?? 1); s.update(this.dt); this.dt = 0;
    const h = s.boneM('RightHand'), w = this.wpn, n3 = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
    const X = n3(h[0], h[1], h[2]), Y0 = n3(h[4], h[5], h[6]), Z = n3(...V.cross(X, Y0)), Y = V.cross(Z, X);
    let m = new Float32Array([X[0], X[1], X[2], 0, Y[0], Y[1], Y[2], 0, Z[0], Z[1], Z[2], 0, h[12], h[13], h[14], 1]);
    m = M.mul(m, M.T(w.off[0], w.off[1], w.off[2])); m = M.mul(m, M.RY(w.ry)); m = M.mul(m, M.RX(w.rx)); m = M.mul(m, M.RZ(w.rz)); this.wm = m; }
  wp(n, off = [0, 0, 0]) { if (n === 'wpn') return M.xf(this.wm, off); const map = { torso: 'Spine2', head: 'Head', handL: 'LeftHand', handR: 'RightHand', body: 'Spine1' }; return this.sk.bone(map[n] || n, off); }
  draw(o = {}) {
    this.sk.flash = this.flash; this.sk.emAdd = this.emAdd; this.sk.tint = this.tint; this.sk.draw(o); if (this.noWeapon || (this.scale ?? 1) < .05) return;
    const g = this.emAdd ? this.emAdd : [0, 0, 0], W = this.wm, P = (mo, s, rr) => M.mul(W, M.mul(M.T(mo[0], mo[1], mo[2]), M.mul(rr ? M.RX(rr) : M.I(), M.S(s[0], s[1], s[2]))));
    R.draw(MESH.cyl, P([0, 0, -.03], [.035, .2, .035], Math.PI / 2), lin(0x3a2416), { sh: o.sh !== false });
    R.draw(MESH.box, P([0, 0, .08], [.2, .035, .045]), lin(0xb08a3e), { spec: .9 });
    R.draw(MESH.box, P([0, 0, .56], [.055, .014, .82]), lin(0xd8d4cc), { spec: 1.2, em: g });
    R.draw(MESH.box, P([0, -.012, .56], [.018, .008, .8]), [1, 1, 1], { spec: 1.5, em: g });
  }
}
const SKANIM = { s1: ['slash1', .1, .75], s2: ['slash5', .1, .8], s3: ['slash3', .1, .75], s4: ['slash4', .08, .8], hv: ['attack1', .15, .75], rup: ['attack2', .2, .85],
  dodge: ['roll', .05, .8], hit: ['impact', 0, .8], cast: ['cast', .1, .8], ult: ['jumpattack', 0, .9], fcast: ['casting', .1, .7], fwind: ['powerup', 0, .6], flunge: ['slash3', .3, .7], bwind: ['attack1', 0, .42], batk: ['attack1', .42, .85], leap: ['jump', .1, .9] };
function animAny(r, a, dt) {
  if (!r.isSkin) return animH(r, a, dt);
  const s = r.sk, act = a.act; r.dt = dt; r.yOff = 0; r.extraYaw = 0;
  if (act && SKANIM[act]) { const [n, t0, t1] = SKANIM[act]; s.play(n, { manual: true, fade: .08 }); s.time = s.cur ? s.cur.dur * lerp(t0, t1, clamp(act === 'dodge' ? a.t / .38 : act === 'hit' ? a.t / .35 : act === 'cast' ? a.t / .6 : a.t, 0, 1)) : 0; return; }
  if (act === 'charge') return void s.play('powerup', { fade: .15 });
  if (act === 'dead') return void s.play('death', { loop: false, fade: .2 });
  if (act === 'kneel') return void s.play('kneel', { fade: .3 });
  if (act === 'cross') return void s.play('idle2', { fade: .3 });
  if (act === 'raise' || act === 'point') return void s.play('casting', { fade: .3 });
  // passo da animação acompanha a velocidade real (sem pé patinando); troca andar/correr com folga
  const v = (a.sp || 0) * 4.4, A = s.m.anims, RUN = A.run2 ? 'run2' : 'run', WALK = A.walk2 ? 'walk2' : 'walk', correndo = s.name === RUN || s.name === 'strafelr' || s.name === 'straferr';
  // de lado (alvo travado): passos laterais do pacote de locomoção do Mixamo
  if (a.side != null && A.strafel && v > .4 && Math.abs(a.side) > Math.abs(a.fwd || 0) * .9) {
    const dir = a.side > 0 ? 'r' : 'l', nm = v > 3.2 ? 'strafe' + dir + 'r' : 'strafe' + dir; return void s.play(nm, { fade: .25, speed: clamp(v / (v > 3.2 ? 4.2 : 1.6), .7, 1.6) }); }
  if (v > (correndo ? 2.1 : 2.7)) s.play(RUN, { fade: .28, speed: clamp(v / (A.run2 ? 3.9 : 4.3), .78, 1.75) });
  else if (v > (s.name === WALK ? .22 : .4)) s.play(WALK, { fade: .28, speed: clamp(v / (A.walk2 ? 1.45 : 1.7), .65, 1.7) });
  else s.play(a.ready ? 'idle' : (A.idle3 ? 'idle3' : 'idle2'), { fade: .4 });
}
