// ================= CENÁRIO COM MODELOS PRONTOS (pacotes Quaternius, CC0) =================
// árvores, pedras, plantas e objetos vêm de cenario.glb e são desenhados em lote (instancing)
const PPropVS = sh => `#version 300 es
in vec3 aP;in vec3 aN;in vec2 aU;in vec4 aI0;in vec4 aI1;in vec4 aI2;in vec4 aI3;uniform mat4 uVP,uL;
out vec3 vW,vN;out vec4 vL,vC;out vec2 vU;
void main(){mat4 M=mat4(aI0,aI1,aI2,aI3);vec4 w=M*vec4(aP,1.);${sh ? 'vU=aU;gl_Position=uL*w;}' : 'vW=w.xyz;vN=normalize(mat3(M)*aN);vL=uL*w;vC=vec4(1,1,1,0);vU=aU;gl_Position=uVP*w;}'}`;
function progP(vs, fs) {
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  [['aP', 0], ['aN', 1], ['aU', 3], ['aI0', 6], ['aI1', 7], ['aI2', 8], ['aI3', 9]].forEach(([n, l]) => gl.bindAttribLocation(p, l, n)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let k = 0; k < n; k++) { const inf = gl.getActiveUniform(p, k); u[inf.name.replace('[0]', '')] = gl.getUniformLocation(p, inf.name); }
  return { p, u };
}
const FS_PROP = FS_TEX.replace('uniform float uHasTex;', 'uniform float uHasTex,uCut;')
  .replace('if(uHasTex>.5)alb*=pow(texture(uAlb,vU).rgb,vec3(2.2));', 'if(uHasTex>.5){vec4 tc=texture(uAlb,vU);if(tc.a<uCut)discard;alb*=pow(tc.rgb,vec3(2.2));}');
let PPROP = null, PPROPSH = null;
try { PPROP = progP(PPropVS(false), FS_PROP); PPROPSH = progP(PPropVS(true), `#version 300 es
precision mediump float;in vec2 vU;uniform sampler2D uAlb;uniform float uCut;void main(){if(uCut>0.&&texture(uAlb,vU).a<uCut)discard;}`); } catch (e) { console.warn('cenário sem modelos prontos:', e); }
const CEN = { ok: false, grupos: [] }; // grupo = um modelo do pacote com suas instâncias, separadas em células de 32 m
function montarCenario() {
  const md = typeof MODELS !== 'undefined' && MODELS.cenario, L = typeof MAPS !== 'undefined' && MAPS.orlavento && MAPS.orlavento.props;
  if (!md || !L || !PPROP) return false;
  const porNome = {}; for (const p of L) (porNome[p[0]] = porNome[p[0]] || []).push(p);
  for (const nome in porNome) {
    const ni = md.byName[nome]; if (ni == null) continue;
    const lista = porNome[nome].map(p => ({ p, c: Math.floor(p[1] / 32) + ',' + Math.floor(p[3] / 32) })).sort((a, b) => a.c < b.c ? -1 : a.c > b.c ? 1 : 0);
    const data = new Float32Array(lista.length * 16), cel = [];
    lista.forEach((it, k) => { const p = it.p; data.set(M.trs(p[1], p[2], p[3], p[4], 0, 0, p[5], p[5], p[5]), k * 16);
      const last = cel[cel.length - 1]; if (last && last.c === it.c) last.n++; else cel.push({ c: it.c, i: k, n: 1, x: (Math.floor(p[1] / 32) + .5) * 32, z: (Math.floor(p[3] / 32) + .5) * 32 }); });
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, ib); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const prims = md.prims.filter(q => q.node === ni);
    for (const q of prims) { gl.bindVertexArray(q.vao); gl.bindBuffer(gl.ARRAY_BUFFER, ib); for (let j = 0; j < 4; j++) { gl.enableVertexAttribArray(6 + j); gl.vertexAttribPointer(6 + j, 4, gl.FLOAT, false, 64, j * 16); gl.vertexAttribDivisor(6 + j, 1); } }
    gl.bindVertexArray(null);
    const alto = /Tree|Pine/.test(nome), miudo = /Grass|Flower|Clover|Pebble|Fern|Mushroom|Plant|Pot|Bucket|Farm/.test(nome);
    CEN.grupos.push({ nome, ib, prims, cel, dist: miudo ? 45 : alto ? 120 : 80, sombra: !miudo });
  }
  CEN.ok = true; return true;
}
function desenharCenario(shadow, L, common) {
  if (!CEN.ok && !montarCenario()) return;
  const PG = shadow ? PPROPSH : PPROP, u = PG.u, cam = R.cam || [0, 0, 0], foco = (typeof P !== 'undefined' && P.pos) ? P.pos : cam;
  gl.useProgram(PG.p); if (shadow) gl.uniformMatrix4fv(u.uL, false, L); else { common(u); gl.uniform1f(u.uSpec, .08); gl.uniform3fv(u.uEm, [0, 0, 0]); gl.uniform1f(u.uGrain, 0); gl.uniform1f(u.uRim, .12); gl.uniform1f(u.uFlash, 0); }
  gl.uniform1i(u.uAlb, 2); gl.activeTexture(gl.TEXTURE2);
  const ox = shadow ? foco[0] : cam[0], oz = shadow ? foco[2] : cam[2];
  for (const g of CEN.grupos) { if (shadow && !g.sombra) continue; const lim = (shadow ? Math.min(g.dist, 40) : g.dist) + 23;
    for (const q of g.prims) { const cut = q.alpha ? .3 : 0; gl.uniform1f(u.uCut, cut);
      if (!shadow) { gl.uniform3fv(u.uCol, q.col); gl.uniform1f(u.uHasTex, q.tex ? 1 : 0); }
      gl.bindTexture(gl.TEXTURE_2D, q.tex || null); gl.bindVertexArray(q.vao); gl.bindBuffer(gl.ARRAY_BUFFER, g.ib);
      if (cut > 0) gl.disable(gl.CULL_FACE);
      for (const c of g.cel) { if (Math.abs(c.x - ox) > lim || Math.abs(c.z - oz) > lim) continue;
        for (let j = 0; j < 4; j++) gl.vertexAttribPointer(6 + j, 4, gl.FLOAT, false, 64, c.i * 64 + j * 16);
        gl.drawElementsInstanced(gl.TRIANGLES, q.count, gl.UNSIGNED_INT, 0, c.n); } } }
  gl.bindVertexArray(null); gl.activeTexture(gl.TEXTURE0);
}
{ const _ds = drawSkinned; drawSkinned = function (items, shadow, L, common) { _ds(items, shadow, L, common); try { desenharCenario(shadow, L, common); } catch (e) { if (!CEN.erro) { CEN.erro = 1; console.warn(e); } } }; }
