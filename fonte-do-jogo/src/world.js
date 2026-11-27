// ================= MUNDO: Orlavento + ravina + arena =================
const W = { walk: [], obst: [], lanterns: [], threads: [], dyn: {} };
const CHASM = [-54.5, -68];
const BOSS_C = [0, -128], BOSS_R = 17;
function hash(x, z) { return Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1; }
function vnoise(x, z) { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return lerp(lerp(hash(ix, iz), hash(ix + 1, iz), u), lerp(hash(ix, iz + 1), hash(ix + 1, iz + 1), u), v); }
function inRect(x, z, r, m = 0) { return x >= r[0] - m && x <= r[1] + m && z <= r[2] + m && z >= r[3] - m; }
// áreas andáveis [x0,x1,zTopo,zBase]
W.walk = [[-20, 20, 16, -42], [-4, 4, -49, -54.6], [-14, 14, -67.9, -96], [-3.5, 3.5, -95, -101]];
W.bridge = [-1.45, 1.45, -54.4, -68.1];
W.bridgeOk = false; W.confine = null;
// ---------- Serra das Costuras (capítulo 2), longe da vila ----------
const SX = 170, HS = 45; // a Serra fica no topo da montanha
// ---------- trilha da montanha (mesmos pontos do Blender) ----------
const TRILHA_P = [[16, -126, 0], [45, -120, 2], [100, -110, 7], [112, -95, 10], [60, -80, 15], [48, -65, 18], [100, -50, 24], [112, -35, 27], [60, -20, 32], [50, -5, 35], [105, 8, 40], [150, 18, 44], [170, 9, 45]];
const TRILHA_L = 6;
function trilhaDensa(P) { const out = [];
  for (let i = 0; i < P.length - 1; i++) { const p0 = P[Math.max(i - 1, 0)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(i + 2, P.length - 1)];
    for (let k = 0; k < 8; k++) { const t = k / 8, t2 = t * t, t3 = t2 * t; out.push([0, 1, 2].map(j => .5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); } }
  out.push(P[P.length - 1]); let acc = 0; out.forEach((p, i) => { if (i) acc += Math.hypot(p[0] - out[i - 1][0], p[1] - out[i - 1][1]); p.s = acc; });
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of out) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
  out.box = [x0 - 6, x1 + 6, z0 - 6, z1 + 6]; out.total = acc; return out; }
const TRILHA = trilhaDensa(TRILHA_P);
const TRILHAS = { monte: TRILHA,
  vila: trilhaDensa([[-8, -42, 0], [-22, -46, 0], [-40, -38, 0], [-52, -22, 0], [-62, -36, 0], [-50, -50, 0], [-25, -51, 0], [-4, -51, 0]]),
  ravina: trilhaDensa([[0, -100, 0], [-15, -104, 0], [-35, -98, 0], [-55, -108, 0], [-50, -128, 0], [-30, -140, 0], [-14, -134, 0]]),
  serra1: trilhaDensa([[170, -9, 45], [188, -22, 46], [206, -13, 48], [223, -30, 49.5], [206, -50, 48], [186, -58, 47], [172, -72, 46], [170, -85, 45]]),
  serra2: trilhaDensa([[170, -117, 45], [192, -126, 46], [211, -145, 48], [196, -161, 47], [176, -168, 46], [170, -179, 45]]),
  serra3: trilhaDensa([[171, -216, 45], [195, -228, 47], [215, -245, 49], [201, -262, 47.5], [180, -267, 46], [172, -278, 45]]) };
const TR_SERRA = [TRILHAS.serra1, TRILHAS.serra2, TRILHAS.serra3];
function naTrilhaSerra(x, z) { if (x < SX - 10) return null; for (const T of TR_SERRA) { const p = pertoT(T, x, z); if (p.d <= TRILHA_L / 2) return p; } return null; }
function pertoT(T, x, z) { const b = T.box; if (x < b[0] || x > b[1] || z < b[2] || z > b[3]) return { d: 1e9, h: 0, s: 0 };
  let bd = 1e9, bh = 0, bs = 0;
  for (let i = 0; i < T.length - 1; i++) { const a = T[i], c = T[i + 1], dx = c[0] - a[0], dz = c[1] - a[1], L = dx * dx + dz * dz || 1;
    const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / L, 0, 1), px = a[0] + dx * t, pz = a[1] + dz * t, d = Math.hypot(x - px, z - pz);
    if (d < bd) { bd = d; bh = a[2] + (c[2] - a[2]) * t; bs = a.s + (c.s - a.s) * t; } }
  return { d: bd, h: bh, s: bs }; }
function pertoTrilha(x, z) { return pertoT(TRILHA, x, z); }
function naTrilhaBaixa(x, z) { return pertoT(TRILHAS.vila, x, z).d <= TRILHA_L / 2 || pertoT(TRILHAS.ravina, x, z).d <= TRILHA_L / 2; }
// mapa de alturas exportado do Blender (para a câmera não entrar no chão)
function alturaMapa(x, z) { const A = typeof MAPS !== 'undefined' && MAPS.orlavento && MAPS.orlavento.alturas; if (!A) return null;
  const fx = (x - A.x0) / A.s, fz = (A.z0 - z) / A.s; if (fx < 0 || fz < 0 || fx > A.nx - 1.001 || fz > A.nz - 1.001) return null;
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, H = A.h, n = A.nx;
  return lerp(lerp(H[j * n + i], H[j * n + i + 1], u), lerp(H[(j + 1) * n + i], H[(j + 1) * n + i + 1], u), v); }
function naSerra(x, z) { if (x < SX - 40) return false; for (const i of W.serra.islands) { if (i.c ? Math.hypot(x - i.c[0], z - i.c[1]) <= i.r : inRect(x, z, i.rect)) return true; }
  for (const b of W.serra.bridges) if (b.ok && inRect(x, z, b.rect)) return true; return false; }
// altura do chão onde as pessoas pisam
function groundY(x, z) { if (x > SX - 40 && naSerra(x, z)) return HS; { const ts = naTrilhaSerra(x, z); if (ts) return ts.h; } const t = pertoTrilha(x, z); if (t.d <= TRILHA_L / 2 + .6) return t.h; return 0; }
function SZ(z) { return z > -12 ? z : z > -58.25 ? z - 60 : z > -97.25 ? z - 120 : z - 180; }
// Serra das Costuras: as partes ficaram longe umas das outras, ligadas por trilhas de crista
W.serra = {
  islands: [{ c: [SX, 0], r: 11 }, { rect: [SX - 7.5, SX + 7.5, -83.5, -110] }, { c: [SX, -190], r: 12.5 }, { c: [SX + 2, -292], r: 15.5 }],
  bridges: [{ rect: [9990, 9991, 9990, 9989], ok: true, fake: true }, { rect: [SX - 1.45, SX + 1.45, -109.5, -118], ok: false, seam: [SX - 3.4, 0, -107.6] }, { rect: [SX - 1.45, SX + 1.45, -202, -217], ok: false, seam: [SX + 3.2, 0, -200.8] }],
};
const HOLES = [];
function walkable(x, z) {
  for (const h of HOLES) if (h.open && Math.hypot(x - h.p[0], z - h.p[1]) < h.r) return false;
  if (W.confine) { const c = W.confine; if (c.c) return Math.hypot(x - c.c[0], z - c.c[1]) <= c.r; return inRect(x, z, c); }
  if (naSerra(x, z)) return true;
  if (pertoTrilha(x, z).d <= TRILHA_L / 2 || naTrilhaBaixa(x, z) || naTrilhaSerra(x, z)) return true;
  for (const r of W.walk) if (inRect(x, z, r)) return true;
  if (W.bridgeOk && inRect(x, z, W.bridge)) return true;
  if (Math.hypot(x - BOSS_C[0], z - BOSS_C[1]) <= BOSS_R) return true;
  return false;
}
function onBridge(x, z) { return inRect(x, z, [-1.6, 1.6, -54.5, -68]); }
function distWalk(x, z) { // distância aproximada até a área andável (para relevo)
  let d = 1e9; for (const r of W.walk) { const dx = Math.max(r[0] - x, 0, x - r[1]), dz = Math.max(r[3] - z, 0, z - r[2]); d = Math.min(d, Math.hypot(dx, dz)); }
  d = Math.min(d, Math.max(0, Math.hypot(x - BOSS_C[0], z - BOSS_C[1]) - BOSS_R)); return d;
}
function groundH(x, z) { if (x > 158) { let best = -70; for (const T of TR_SERRA) { const p = pertoT(T, x, z); if (p.d < 40) best = Math.max(best, p.h - Math.max(0, p.d - TRILHA_L / 2) * 1.3); } if (naSerra(x, z)) best = Math.max(best, HS); return best; } { const am = alturaMapa(x, z); if (am != null && !(x > SX - 20 && naSerra(x, z))) return am; } if (x > 26) { const t = pertoTrilha(x, z); if (t.d < 1e8) { if (t.d <= TRILHA_L / 2) return t.h; if (x > 152 && t.d > TRILHA_L / 2 + 1) return naSerra(x, z) ? HS : -70; return t.h + Math.min(6.5, (t.d - TRILHA_L / 2) * 1.5); } if (naSerra(x, z)) return HS; } const d = distWalk(x, z); return sstep(2, 26, d) * (4 + vnoise(x * .06, z * .06) * 10) + (d > 1 ? vnoise(x * .3, z * .3) * .5 * sstep(1, 6, d) : 0); }
function pushOut(e, rad) { // empurra para fora de obstáculos (círculos e caixas)
  for (const o of W.obst) {
    if (o.off) continue;
    if (o.r) { const dx = e[0] - o.x, dz = e[2] - o.z, d = Math.hypot(dx, dz), m = o.r + rad; if (d < m && d > 0) { e[0] = o.x + dx / d * m; e[2] = o.z + dz / d * m; } }
    else { const cx = clamp(e[0], o.b[0], o.b[1]), cz = clamp(e[2], o.b[3], o.b[2]); const dx = e[0] - cx, dz = e[2] - cz, d = Math.hypot(dx, dz);
      if (d < rad) { if (d > 0.0001) { e[0] = cx + dx / d * rad; e[2] = cz + dz / d * rad; } else { // dentro: sai pelo lado mais perto
        const l = [e[0] - o.b[0], o.b[1] - e[0], o.b[2] - e[2], e[2] - o.b[3]], k = l.indexOf(Math.min(...l)); if (k === 0) e[0] = o.b[0] - rad; else if (k === 1) e[0] = o.b[1] + rad; else if (k === 2) e[2] = o.b[2] + rad; else e[2] = o.b[3] - rad; } } }
  }
}
function moveEnt(p, dx, dz, rad) {
  const nx = p[0] + dx, nz = p[2] + dz;
  if (walkable(nx, nz)) { p[0] = nx; p[2] = nz; } else if (walkable(nx, p[2])) p[0] = nx; else if (walkable(p[0], nz)) p[2] = nz;
  pushOut(p, rad);
  if (!walkable(p[0], p[2])) { p[0] -= dx; p[2] -= dz; }
}

// ---------- mapa feito no Blender (orlavento.json) ----------
function blenderMap(J, skip) {
  const cache = {}, out = new GB(); let ground = null;
  const geo = name => cache[name] || (cache[name] = (() => {
    const m = J.malhas[name], P = m.p, I = m.i;
    if (m.liso) { const N = new Array(P.length).fill(0);
      for (let t = 0; t < I.length; t += 3) { const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
        const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; for (const q of [a, b, c]) { N[q] += nx; N[q + 1] += ny; N[q + 2] += nz; } }
      for (let k = 0; k < N.length; k += 3) { const l = Math.hypot(N[k], N[k + 1], N[k + 2]) || 1; N[k] /= l; N[k + 1] /= l; N[k + 2] /= l; }
      return { p: P, n: N, i: I, c: m.c }; }
    const p = [], n = [], i = [];
    for (let t = 0; t < I.length; t += 3) { const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      for (const q of [a, b, c]) { i.push(p.length / 3); p.push(P[q], P[q + 1], P[q + 2]); n.push(nx, ny, nz); } }
    return { p, n, i };
  })());
  for (const [name, R, cor, em] of J.objetos) {
    const base = name.split('.')[0]; if (skip(base)) continue;
    const g = geo(name), m = [R[0], R[4], R[8], 0, R[1], R[5], R[9], 0, R[2], R[6], R[10], 0, R[3], R[7], R[11], 1];
    if (g.c) { // chão com cor por vértice (terreno da vila e encosta da montanha)
      const c = []; for (let k = 0; k < g.c.length; k += 3) c.push(g.c[k], g.c[k + 1], g.c[k + 2], 0);
      const p = []; for (let k = 0; k < g.p.length; k += 3) { const x = g.p[k], y = g.p[k + 1], z = g.p[k + 2]; p.push(m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]); }
      (ground = ground || []).push(mkMesh({ p, n: g.n, c, i: g.i })); continue; }
    out.add(g, m, cor, em ? 3 : base === 'Nevoa' ? .8 : 0);
  }
  return { mesh: out, ground };
}
function buildWorld() {
  const C = lin, MAPA = typeof MAPS !== 'undefined' && MAPS.orlavento, gReal = new GB(); let g = MAPA ? new GB() : gReal;
  const box = (x, y, z, w, h, d, col, ry = 0, em = 0, rx = 0, rz = 0) => g.add(G.box, M.trs(x, y, z, ry, rx, rz, w, h, d), col, em);
  const ob = (x0, x1, z0, z1) => W.obst.push({ b: [x0, x1, z0, z1] });
  const oc = (x, z, r) => W.obst.push({ x, z, r });
  // ---- terreno ----
  const S = 1.5, X0 = -66, X1 = 66, Z0 = 34, Z1 = -170, nx = Math.round((X1 - X0) / S), nz = Math.round((Z0 - Z1) / S);
  const gp = [], gn = [], gc = [], gi = [], idx = {};
  const gcol = (x, z) => {
    const n = vnoise(x * .15, z * .15), n2 = vnoise(x * .9, z * .9);
    let c = V.lerp(C(0x56602f), C(0x7a7038), n); c = V.lerp(c, C(0x3d4a24), n2 * .4);
    const street = (Math.abs(x + Math.sin(z * .12) * .6) < 3.1 && z < 15 && z > -112) || Math.hypot(x, z + 12) < 7.5;
    if (street) c = V.lerp(C(0x7a6248), C(0x5e4a38), n2);
    if (z < -66 && z > -97 && Math.abs(x) < 15) c = V.lerp(C(0x6b5a48), C(0x4e4438), n2 * .8 + n * .2);
    if (Math.hypot(x - BOSS_C[0], z - BOSS_C[1]) < BOSS_R + 2) c = V.lerp(C(0x5b5048), C(0x3e3632), n2);
    return c;
  };
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = X0 + i * S, z = Z0 - j * S, y = groundH(x, z) + (z < CHASM[0] - .01 && z > CHASM[1] + .01 ? -30 : 0);
    idx[j * (nx + 1) + i] = gp.length / 3; gp.push(x, y, z); gn.push(0, 1, 0); gc.push(...gcol(x, z), 0);
  }
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { // normais
    const k = idx[j * (nx + 1) + i], hl = gp[(idx[j * (nx + 1) + Math.max(i - 1, 0)]) * 3 + 1], hr = gp[(idx[j * (nx + 1) + Math.min(i + 1, nx)]) * 3 + 1], hu = gp[(idx[Math.max(j - 1, 0) * (nx + 1) + i]) * 3 + 1], hd = gp[(idx[Math.min(j + 1, nz) * (nx + 1) + i]) * 3 + 1];
    const n = V.norm([hl - hr, 2 * S, hd - hu]); gn[k * 3] = n[0]; gn[k * 3 + 1] = n[1]; gn[k * 3 + 2] = n[2];
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const za = Z0 - j * S, zb = Z0 - (j + 1) * S; if ((za < CHASM[0] - .01 && za > CHASM[1] + .01) || (zb < CHASM[0] - .01 && zb > CHASM[1] + .01)) continue;
    const a = idx[j * (nx + 1) + i], b = a + 1, c = idx[(j + 1) * (nx + 1) + i], d = c + 1; gi.push(a, c, b, b, c, d);
  }
  W.ground = mkMesh({ p: gp, n: gn, c: gc, i: gi });
  // ---- fenda (abismo) ----
  for (let x = -64; x < 64; x += 4) {
    const h0 = groundH(x, CHASM[0]), h1 = groundH(x, CHASM[1]);
    box(x + 2, h0 - 15, CHASM[0] - .6, 4.2, 30 + rnd(0, 1), 1.4 + rnd(0, 1.2), C(0x4a4038), rnd(-.1, .1));
    box(x + 2, h1 - 15, CHASM[1] + .6, 4.2, 30, 1.4 + rnd(0, 1.2), C(0x433a33), rnd(-.1, .1));
    if (Math.abs(x) > 3) { g.add(G.rock, M.trs(x + rnd(0, 4), h0 + .1, CHASM[0] + rnd(-.3, .6), rnd(0, 6), 0, 0, rnd(1, 2.4), rnd(.5, 1.1), rnd(1, 1.8)), C(0x6a5e52)); g.add(G.rock, M.trs(x + rnd(0, 4), h1 + .1, CHASM[1] - rnd(-.3, .6), rnd(0, 6), 0, 0, rnd(1, 2.4), rnd(.5, 1.1), rnd(1, 1.8)), C(0x655a4e)); }
  }
  box(0, -24, -61, 140, 1, 12, C(0x120e18), 0, 0); // fundo escuro
  // ---- ponte ----
  for (let z = -54.5; z > -68; z -= .5) { if (z < -58.4 && z > -64.1) continue; box(rnd(-.05, .05), -.06, z - .25, 3 + rnd(0, .3), .12, .44, C(z % 1 ? 0x6e5236 : 0x5e4630), rnd(-.04, .04)); }
  for (const sx of [-1.6, 1.6]) { for (const z of [-54.8, -58.3, -64.2, -67.7]) box(sx, .5, z, .18, 1.4, .18, C(0x4a3420)); }
  { const m = new GB(); for (let z = -58.5; z > -64.1; z -= .5) m.add(G.box, M.trs(rnd(-.05, .05), -.06, z - .25, rnd(-.04, .04), 0, 0, 3 + rnd(0, .3), .12, .44), C(0x8a6a42)); W.dyn.bridgeMid = mkMesh(m); }
  // poste-costura (puzzle)
  box(-2.6, 1.1, -53.6, .32, 2.2, .32, C(0x5a4a3a)); box(-2.6, 2.25, -53.6, .5, .15, .5, C(0xb08a3e), 0, .0);
  W.seam = [-2.6, 0, -53.6];
  oc(-2.6, -53.6, .4);
  // ---- casas da vila ----
  const houses = [[-10.5, 9, 0], [10.5, 8, 1], [-10.5, -3, 2], [10.5, -4.5, 3], [-11, -24, 4], [10.5, -23, 5], [-10, -35, 6], [11, -34.5, 7], [-16.5, 3, 8], [17, -14, 9]];
  for (const [x, z, k] of houses) {
    const w = 5.6 + hash(k, 1) * 1.5, d = 4.6 + hash(k, 2) * 1.2, h = 2.6 + hash(k, 3) * .8, face = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    const stone = V.lerp(C(0x8a8070), C(0x6e665a), hash(k, 4)), wood = V.lerp(C(0x6a4a30), C(0x50382a), hash(k, 5)), roof = V.lerp(C(0x5a3a2a), C(0x3e3a38), hash(k, 6));
    // base de pedra + andar de madeira + telhado em duas águas
    box(x, h * .5, z, d, h, w, stone, 0); box(x, h + .12, z, d + .2, .24, w + .2, wood);
    box(x, h + .9, z, d - .1, 1.4, w - .1, V.lerp(C(0xcfc2a6), C(0xb8a888), hash(k, 7)));
    for (const s of [-1, 1]) box(x, h + 2.0, z + s * (w * .25 + .02), d + .8, .18, w * .58, roof, 0, 0, s * .58);
    box(x, h + 2.55, z, d + .8, .2, .3, wood);
    for (const s of [-1, 1]) for (const t of [-.5, .5]) box(x + s * d * .5 - s * .02, h + .9, z + t * (w - .6), .12, 1.4, .14, wood);
    const fx = x - Math.sign(x) * (d * .5 + .03);
    box(fx, 1.05, z, .1, 2.1, 1.1, C(0x3a2618)); box(fx - Math.sign(x) * .05, 2.2, z, .14, .14, 1.3, wood);
    for (const t of [-1, 1]) { box(fx, 1.6, z + t * w * .3, .08, .7, .7, C(0xffb060), 2.2); box(fx - Math.sign(x) * .05, 1.6, z + t * w * .3, .1, .78, .08, wood); }
    box(fx, h + .9, z, .08, .55, .6, C(0xffa850), 1.6);
    W.lights.push({ p: [fx - Math.sign(x) * 1.0, 1.7, z], c: V.sc(C(0xff9a50), 2.2), r: 6 });
    ob(x - d / 2, x + d / 2, z + w / 2, z - w / 2);
    // chaminé
    if (hash(k, 8) > .4) box(x + d * .2, h + 2.4, z - w * .25, .6, 1.6, .6, C(0x6a5e52));
  }
  // ---- postes de lume e fios ----
  const posts = [];
  for (let z = 12; z > -42; z -= 9) for (const s of [-1, 1]) {
    const x = s * 4.2 + (hash(z, s) - .5) * .4; box(x, 1.4, z, .18, 2.8, .18, C(0x3e2c1c)); box(x, 2.85, z, .5, .1, .5, C(0x8a6a3a));
    box(x, 2.6, z, .22, .32, .22, C(0xffd890), 4); W.lights.push({ p: [x, 2.6, z], c: V.sc(C(0xffc070), 2.6), r: 7 }); oc(x, z, .25); posts.push([x, 2.8, z]);
  }
  for (let k = 0; k + 1 < posts.length; k += 2) W.threads.push({ a: posts[k], b: posts[k + 1], sag: .5, col: [1, .82, .45], w: .05 });
  for (let k = 0; k + 2 < posts.length; k += 2) W.threads.push({ a: posts[k], b: posts[k + 2], sag: .35, col: [1, .8, .4], w: .04 });
  // ---- poço e praça ----
  g.add(G.cyl, M.trs(5, .45, -18, 0, 0, 0, 1.8, .9, 1.8), C(0x7a7064)); g.add(G.cyl, M.trs(5, .92, -18, 0, 0, 0, 1.4, .06, 1.4), C(0x1a2a30), 0);
  for (const s of [-1, 1]) box(5 + s * .8, 1.6, -18, .14, 1.5, .14, C(0x4a3420)); box(5, 2.4, -18, 2.2, .14, .3, C(0x4a3420)); oc(5, -18, 1.1);
  // barracas e caixotes
  for (const [x, z, ry] of [[-6, -10, .3], [-6.5, -15, -.2], [6.5, -7, .1]]) { box(x, .45, z, 1.8, .9, 1.0, C(0x5e4630), ry); for (const s of [-1, 1]) box(x + s * .8, 1.2, z, .1, 2.4, .1, C(0x3e2c1c), ry); box(x, 2.4, z, 2.2, .08, 1.5, C(0x8a3a2a), ry, 0, .15); oc(x, z, 1.0); }
  for (let k = 0; k < 14; k++) { const x = (hash(k, 9) > .5 ? 1 : -1) * (6 + hash(k, 10) * 2), z = 12 - hash(k, 11) * 52; if (Math.abs(x) < 5.5) continue; box(x, .3, z, .6, .6, .6, C(0x6e5434), hash(k, 12) * 3); oc(x, z, .45); }
  // cercas
  for (let z = 15; z > -41; z -= 2.2) for (const s of [-1, 1]) { box(s * 19.8, .5, z, .12, 1, .12, C(0x4a3a2a)); box(s * 19.8, .75, z - 1.1, .06, .08, 2.2, C(0x5a4632)); }
  // ---- árvores ----
  const tree = (x, z, s = 1) => { const y = groundH(x, z); g.add(G.cyl, M.trs(x, y + 1.6 * s, z, 0, 0, 0, .35 * s, 3.2 * s, .35 * s), C(0x3e2e22));
    for (let k = 0; k < 4; k++) g.add(G.sphL, M.trs(x + rnd(-.8, .8) * s, y + (3.2 + k * .5) * s, z + rnd(-.8, .8) * s, 0, 0, 0, rnd(2, 2.8) * s, rnd(1.6, 2.2) * s, rnd(2, 2.8) * s), V.lerp(C(0x3a4a22), C(0x5a5a28), rnd()));
    if (distWalk(x, z) < .1) oc(x, z, .5 * s); };
  for (let k = 0; k < 140; k++) { const x = rnd(-64, 64), z = rnd(-168, 32); if (z < CHASM[0] + 2 && z > CHASM[1] - 2) continue; const d = distWalk(x, z); if (d < 1.5) continue; if (d < 6 && Math.abs(x) < 15 && z < -66 && z > -97) continue; tree(x, z, rnd(.8, 1.4)); }
  for (const [x, z] of [[-15, 12], [15, 12], [-14, -16], [15, -30], [-16, -38]]) tree(x, z, 1.1);
  // pedras e capim
  for (let k = 0; k < 160; k++) { const x = rnd(-60, 60), z = rnd(-165, 30); if (z < CHASM[0] + 1 && z > CHASM[1] - 1) continue; const d = distWalk(x, z); if (d < 2) continue; g.add(G.rock, M.trs(x, groundH(x, z), z, rnd(0, 6), 0, 0, rnd(.6, 2.5), rnd(.4, 1.4), rnd(.6, 2.2)), V.lerp(C(0x7a7064), C(0x5a544c), rnd())); }
  for (let k = 0; k < 1700; k++) { const x = rnd(-50, 50), z = rnd(-160, 28); if (z < CHASM[0] + .8 && z > CHASM[1] - .8) continue; if (Math.abs(x) < 3.4 && z > -112) continue; if (Math.hypot(x, z + 12) < 7.5) continue;
    const y = groundH(x, z); for (let q = 0; q < 3; q++) { const h = rnd(.22, .45); g.add(G.blade, M.trs(x + rnd(-.12, .12), y + h * .5, z + rnd(-.12, .12), rnd(0, 6), rnd(-.35, .35), rnd(-.35, .35), .05, h, .05), V.lerp(C(0x4a5a22), C(0x7a7434), rnd())); } }
  // ---- montanhas ao fundo ----
  for (let k = 0; k < 26; k++) { const a = k / 26 * Math.PI * 2, r = 150 + rnd(0, 60), x = Math.sin(a) * r, z = -60 + Math.cos(a) * r, h = rnd(40, 90);
    g.add(G.cone, M.trs(x, h * .5 - 4, z, rnd(0, 6), 0, 0, rnd(60, 110), h, rnd(60, 110)), V.lerp(C(0x5a5a68), C(0x6a6058), rnd())); g.add(G.cone, M.trs(x, h * .85 - 4, z, 0, 0, 0, rnd(16, 24), h * .3, rnd(16, 24)), C(0xd8d4d0)); }
  // ---- ravina: penhascos ----
  for (let z = -67; z > -97; z -= 3) for (const s of [-1, 1]) {
    const h = rnd(6, 11); g.add(G.rock, M.trs(s * rnd(15.5, 17), h * .4, z + rnd(-1, 1), rnd(0, 6), 0, 0, rnd(4, 6), h, rnd(4, 5.5)), V.lerp(C(0x7a6a58), C(0x5a5048), rnd()));
  }
  for (const [x, z] of [[-9, -76], [8, -85], [-6, -90], [10, -72]]) { g.add(G.rock, M.trs(x, .3, z, rnd(0, 6), 0, 0, 1.8, 1.4, 1.6), C(0x6a5e50)); oc(x, z, .9); }
  // fios rompidos pendurados na ravina
  for (let k = 0; k < 8; k++) { const z = -70 - k * 3.5, s = k % 2 ? 1 : -1; W.threads.push({ a: [s * 14, 6 + rnd(0, 3), z], b: [s * rnd(5, 10), rnd(.5, 2), z + rnd(-2, 2)], sag: .8, col: [1, .75, .4], w: .035, broken: true }); }
  // ---- arena do chefe: pedras em pé ----
  for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; if (Math.abs(angDiff(a, 0)) < .35) continue; const x = BOSS_C[0] + Math.sin(a) * (BOSS_R + 1.2), z = BOSS_C[1] + Math.cos(a) * (BOSS_R + 1.2), h = rnd(3, 5.5);
    box(x, h / 2, z, 1.2, h, .8, V.lerp(C(0x6a6460), C(0x524c48), rnd()), a + rnd(-.2, .2), 0, rnd(-.08, .08)); box(x, h + .05, z, .3, .1, .3, C(0xffd890), 3); }
  W.threads.push({ a: [-6, 9, BOSS_C[1] - 4], b: [6, 11, BOSS_C[1] + 2], sag: -1, col: [1, .4, .6], w: .2, broken: true });
  for (let k = 0; k < 6; k++) W.threads.push({ a: [rnd(-2, 2), 10, BOSS_C[1] + rnd(-2, 2)], b: [rnd(-14, 14), 0, BOSS_C[1] + rnd(-14, 14)], sag: .3, col: [.9, .3, .55], w: .05, broken: true });
  // trilha final
  for (let z = -97; z > -110; z -= 3) for (const s of [-1, 1]) { g.add(G.rock, M.trs(s * rnd(4.5, 6), .6, z, rnd(0, 6), 0, 0, rnd(1.5, 2.5), rnd(1.2, 2.5), rnd(1.5, 2.5)), C(0x6a6056)); }
  g = gReal; // daqui pra frente vai para o mapa de verdade
  // tochas da ravina e da trilha
  for (const [x, z] of [[-12, -70], [12, -70], [-12, -93], [12, -93], [-3.3, -103], [3.3, -103]]) { box(x, 1, z, .15, 2, .15, C(0x3e2c1c)); box(x, 2.1, z, .25, .25, .25, C(0xffa040), 4); W.lights.push({ p: [x, 2.3, z], c: V.sc(C(0xff8a40), 3), r: 8 }); oc(x, z, .25); W.torches.push([x, 2.25, z]); }
  { const gs = new GB(), boxS = (x, y, z, ww, h, d, col, ry = 0, em = 0, rx = 0, rz = 0) => gs.add(G.box, M.trs(x, y, z, ry, rx, rz, ww, h, d), col, em);
    const n0 = { th: W.threads.length, li: W.lights.length, to: W.torches.length };
    buildSerra(gs, boxS); W.serraMesh = mkMesh(gs);
    for (const th of W.threads.slice(n0.th)) { th.a = [th.a[0], th.a[1] + HS, th.a[2]]; th.b = [th.b[0], th.b[1] + HS, th.b[2]]; }
    for (const l of W.lights.slice(n0.li)) l.p = [l.p[0], l.p[1] + HS, l.p[2]];
    for (let k = n0.to; k < W.torches.length; k++) W.torches[k] = [W.torches[k][0], W.torches[k][1] + HS, W.torches[k][2]]; }
  if (MAPA) { const bm = blenderMap(MAPA, b => b === 'Boneco' || b === 'Palha'); if (bm.ground) { W.ground = bm.ground[0]; W.grounds = bm.ground.slice(1); } W.blender = mkMesh(bm.mesh); }
  W.mesh = mkMesh(g); W.vc = g.p.length / 3;
  // bonecos de treino
  W.dummies = [[-6.2, 0, 2.2], [-6.2, 0, -0.2]].map(p => ({ pos: p, hp: 1, shake: 0, hits: 0 }));
  for (const d of W.dummies) oc(d.pos[0], d.pos[2], .35);
}
W.lights = []; W.torches = [];
function drawWorld(time) {
  if (W.serraMesh) R.draw(W.serraMesh, M.T(0, HS, 0), [1, 1, 1], { spec: .15, grain: .35, rim: .03 }); if (R.cam[0] > 20) drawSerra(time);
  R.draw(W.ground, M.I(), [1, 1, 1], { spec: .05, grain: .5, rim: 0 }); if (W.grounds) for (const gm of W.grounds) R.draw(gm, M.I(), [1, 1, 1], { spec: .05, grain: .5, rim: 0 });
  R.draw(W.mesh, M.I(), [1, 1, 1], { spec: .15, grain: .35, rim: .03 });
  if (W.blender) R.draw(W.blender, M.I(), [1, 1, 1], { spec: .12, grain: .35, rim: .03 });
  if (W.bridgeOk) R.draw(W.dyn.bridgeMid, M.I(), [1, 1, 1], { spec: .1, grain: .3 });
  for (const l of W.lights) R.light(l.p, V.sc(l.c, .9 + Math.sin(time * 9 + l.p[2]) * .08), l.r);
  for (const t of W.torches) { for (let k = 0; k < 2; k++) R.pt([t[0] + rnd(-.08, .08), t[1] + .15 + rnd(0, .25), t[2] + rnd(-.08, .08)], rnd(.15, .3), [1, .55, .2], .7); }
  for (const d of W.dummies) { const s = Math.sin(d.shake * 30) * d.shake * .3, p = d.pos;
    R.draw(MESH.cyl, M.trs(p[0], .8, p[2], 0, s, 0, .14, 1.6, .14), lin(0x4a3420));
    R.draw(MESH.cyl, M.trs(p[0], 1.25, p[2], 0, s, 0, .5, .8, .5), lin(0xb8a060), { spec: .02 });
    R.draw(MESH.sph, M.trs(p[0] + Math.sin(s) * .9, 1.85, p[2], 0, s, 0, .38, .4, .38), lin(0xc4ac6a), { spec: .02 });
    R.draw(MESH.box, M.trs(p[0], 1.35, p[2], 0, s, 0, 1.3, .12, .12), lin(0x4a3420)); d.shake = Math.max(0, d.shake - .016); }
  // fios de lume
  for (const th of W.threads) drawThread(th.a, th.b, th.sag, th.col, th.w, time, th.broken);
}
function drawThread(a, b, sag, col, w, time, broken) {
  const n = 10; let prev = a;
  for (let k = 1; k <= n; k++) { const t = k / n; if (broken && t > .85) break;
    const p = V.lerp(a, b, t); p[1] -= Math.sin(t * Math.PI) * sag; p[0] += Math.sin(time * 2 + t * 9 + a[2]) * .03; p[1] += Math.sin(time * 3 + t * 7) * .03 * (broken ? 4 : 1);
    R.beam(prev, p, w, col, .75); R.beam(prev, p, w * 3.5, col, .09); prev = p; }
  if (broken && Math.random() < .3) R.pt(prev, .12, col, .8);
}

function buildSerra(g, box) {
  const C = lin, rk = () => V.lerp(C(0x5a5650), C(0x46464c), rnd());
  for (const i of W.serra.islands) {
    if (i.c) { const [x, z] = i.c;
      g.add(G.cyl, M.trs(x, -.7, z, 0, 0, 0, i.r * 2, 1.4, i.r * 2), V.lerp(C(0x6e6a52), C(0x5c5a48), rnd()));
      for (let k = 0; k < 220; k++) { const a = rnd(0, 6.28), rr = Math.sqrt(rnd()) * (i.r - .6); g.add(G.blade, M.trs(x + Math.sin(a) * rr, .15, z + Math.cos(a) * rr, rnd(0, 6), rnd(-.3, .3), rnd(-.3, .3), .05, rnd(.2, .4), .05), V.lerp(C(0x5a6a3a), C(0x8a8a5a), rnd())); }
      g.add(G.cone, M.trs(x, -14, z, 0, Math.PI, 0, i.r * 2.05, 26, i.r * 2.05), C(0x4c4e56));
      for (let k = 0; k < 18; k++) { const a = k / 18 * 6.28 + rnd(-.1, .1), rr = i.r + rnd(-.3, .4); g.add(G.rock, M.trs(x + Math.sin(a) * rr, rnd(-.6, .1), z + Math.cos(a) * rr, rnd(0, 6), 0, 0, rnd(1.2, 2.6), rnd(.6, 1.4), rnd(1.2, 2.4)), rk()); }
    } else { const [x0, x1, z0, z1] = i.rect, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z0 - z1;
      box(cx, -.7, cz, w + .6, 1.4, d + .6, C(0x77736a)); g.add(G.cone, M.trs(cx, -12, cz, 0, Math.PI, 0, w * 1.5, 22, d * 1.1), C(0x4c4e56));
      for (let k = 0; k < 16; k++) { const side = k % 2 ? 1 : -1, z = z1 + rnd(0, d); g.add(G.rock, M.trs(cx + side * (w / 2 + rnd(0, .5)), rnd(-.5, .2), z, rnd(0, 6), 0, 0, rnd(1, 2.2), rnd(.6, 1.6), rnd(1, 2.2)), rk()); } }
  }
  // agulhas de pedra com fios expostos
  const spires = [];
  for (let k = 0; k < 26; k++) { const z = rnd(-300, 15), x = SX + (k % 2 ? rnd(75, 110) : -rnd(30, 60)), h = rnd(10, 30);
    g.add(G.cone, M.trs(x, h / 2 - 22, z, rnd(0, 6), 0, 0, rnd(4, 8), h + 22, rnd(4, 8)), rk()); spires.push([x, h - 2, z]); }
  for (let k = 0; k + 1 < spires.length; k += 2) W.threads.push({ a: spires[k], b: spires[k + 1], sag: 2, col: [1, .82, .5], w: .06 });
  for (const i of W.serra.islands) { const c = i.c || [(i.rect[0] + i.rect[1]) / 2, (i.rect[2] + i.rect[3]) / 2], s = spires[Math.floor(rnd(0, spires.length))]; W.threads.push({ a: [c[0], .2, c[1]], b: s, sag: 1, col: [1, .8, .45], w: .045 }); }
  // ponte 1 (já costurada) e postes
  const bridgeM = (b) => { const m = new GB(); for (let z = b.rect[2] - .25; z > b.rect[3]; z -= .5) m.add(G.box, M.trs(SX + rnd(-.05, .05), -.06, z, rnd(-.04, .04), 0, 0, 3 + rnd(0, .3), .12, .44), V.lerp(C(0x8a6a42), C(0x6e5236), rnd())); return mkMesh(m); };
  W.serra.bridges.forEach((b, k) => { b.mesh = bridgeM(b); for (const sx of [-1.6, 1.6]) for (const z of [b.rect[2] - .3, b.rect[3] + .3]) box(SX + sx, .5, z, .18, 1.4, .18, C(0x4a3420));
    b.rails = [[[SX - 1.6, HS + 1.15, b.rect[2] - .3], [SX - 1.6, HS + 1.15, b.rect[3] + .3]], [[SX + 1.6, HS + 1.15, b.rect[2] - .3], [SX + 1.6, HS + 1.15, b.rect[3] + .3]]];
    if (b.seam) { box(b.seam[0], 1.1, b.seam[2], .32, 2.2, .32, C(0x5a4a3a)); box(b.seam[0], 2.25, b.seam[2], .5, .15, .5, C(0xb08a3e)); W.obst.push({ x: b.seam[0], z: b.seam[2], r: .4 }); } });
  // gaiola do pastor e tochas
  for (const [x, z0] of [[SX - 9, -64], [SX + 9, -76], [SX - 6, -3], [SX + 6, -3], [SX - 11, -106], [SX + 14, -116]]) { const z = SZ(z0); box(x, 1, z, .15, 2, .15, C(0x3e2c1c)); box(x, 2.1, z, .25, .25, .25, C(0xffa040), 4); W.lights.push({ p: [x, 2.3, z], c: V.sc(C(0xff8a40), 3), r: 8 }); W.obst.push({ x, z, r: .25 }); W.torches.push([x, 2.25, z]); }
  // pedras em pé na arena da chefe
  for (let k = 0; k < 12; k++) { const a = k / 12 * 6.28; if (Math.abs(angDiff(a, 0)) < .4) continue; const x = SX + 2 + Math.sin(a) * 16.5, z = SZ(-112) + Math.cos(a) * 16.5, h = rnd(3, 6); box(x, h / 2 - .5, z, 1.2, h, .9, rk(), a); }
}
function drawSerra(time) {
  for (const b of W.serra.bridges) {
    if (b.ok) { R.draw(b.mesh, M.T(0, HS, 0), [1, 1, 1], { spec: .1, grain: .3 }); for (const r of b.rails) drawThread(r[0], r[1], .25, [1, .85, .5], .035, time, false); }
    else { for (const r of b.rails) { const m = V.lerp(r[0], r[1], .3); drawThread(r[0], [m[0], m[1] - .8, m[2]], .1, [1, .7, .4], .03, time, true); } }
    if (b.seam && !b.ok) { const s = b.seam; for (let k = 0; k < 3; k++) drawThread([s[0], HS + 2.3, s[2]], [s[0] + Math.sin(time * 2 + k) * .9, HS + 1.2 + k * .3, s[2] - 1 + Math.cos(time + k)], .1, [1, .85, .5], .04, time + k, true); R.light([s[0], HS + 2, s[2]], [1.4, 1.1, .6], 4); }
  }
  for (let k = 0; k < 3; k++) R.pt([SX + rnd(-30, 30), HS + rnd(-14, -4), rnd(-130, 10)], rnd(3, 6), [.75, .78, .85], .05, 0);
}
