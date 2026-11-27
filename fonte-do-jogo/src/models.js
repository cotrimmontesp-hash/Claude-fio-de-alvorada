// ================= PERSONAGENS =================
G.skirt = gCyl(.36, .5, 12); MESH.skirt = mkMesh(G.skirt);
const H = 0x0;
function humanoid(o) {
  const c = k => Array.isArray(o[k]) ? o[k] : lin(o[k]);
  const w = o.build || 1, P = [];
  const A = (n, p, oo, g, mo, s, col, x = {}) => P.push({ n, p, o: oo, g, mo, s, c: col, ...x });
  A('hips', null, [0, .95, 0], 'box', [0, 0, 0], [.3 * w, .18, .19 * w], c('pants'));
  A('torso', 'hips', [0, .08, 0], 'box', [0, .27, 0], [.36 * w, .5, .22 * w], c('top'), { sp: .2 });
  A('belt', 'hips', [0, 0, 0], 'box', [0, .08, 0], [.33 * w, .07, .23 * w], c('leather'), { sp: .5 });
  if (o.coat) A('coat', 'hips', [0, 0, 0], 'skirt', [0, -.2, -.01], [.5 * w, .52, .36 * w], c('coat'), { sp: .15 });
  if (o.cape) A('cape', 'torso', [0, .5, -.12], 'box', [0, -.45, -.02], [.42 * w, .95, .03], c('cape'), { sp: .1 });
  A('neck', 'torso', [0, .54, 0], 'cyl', [0, .04, 0], [.1, .1, .1], c('skin'));
  A('head', 'torso', [0, .6, 0], 'sph', [0, .12, .01], [.19, .24, .21], c('skin'), { sp: .25 });
  A('nose', 'head', [0, 0, 0], 'box', [0, .11, .11], [.03, .05, .04], c('skin'));
  A('eyeL', 'head', [0, 0, 0], 'sph', [.045, .15, .095], [.03, .018, .02], lin(0x1a1410), { sp: 1 });
  A('eyeR', 'head', [0, 0, 0], 'sph', [-.045, .15, .095], [.03, .018, .02], lin(0x1a1410), { sp: 1 });
  if (o.hood) A('hood', 'head', [0, 0, 0], 'sph', [0, .16, -.02], [.25, .29, .27], c('hood'), { sp: .05 });
  else A('hair', 'head', [0, 0, 0], 'sph', [0, .165, -.025], [.205, .2, .225], c('hair'), { sp: .4 });
  if (o.pony) A('pony', 'head', [0, 0, 0], 'cyl', [0, .1, -.14], [.06, .26, .06], c('hair'), { rr: .45 });
  if (o.beard) A('beard', 'head', [0, 0, 0], 'sph', [0, .03, .06], [.16, .16, .13], c('beard'));
  for (const sd of [1, -1]) {
    const S = sd > 0 ? 'L' : 'R';
    A('pad' + S, 'torso', [sd * .2 * w, .5, 0], 'sph', [0, 0, 0], [.15 * w, .12, .16], c('accent'), { sp: .6 });
    A('uArm' + S, 'torso', [sd * .23 * w, .48, 0], 'cyl', [0, -.14, 0], [.085 * w, .29, .085 * w], c('top'));
    A('lArm' + S, 'uArm' + S, [0, -.29, 0], 'cyl', [0, -.13, 0], [.075 * w, .27, .075 * w], c('glove'));
    A('hand' + S, 'lArm' + S, [0, -.28, 0], 'sph', [0, -.02, 0], [.08, .09, .08], c('glove'));
    A('uLeg' + S, 'hips', [sd * .1 * w, -.06, 0], 'cyl', [0, -.22, 0], [.13 * w, .45, .13 * w], c('pants'));
    A('lLeg' + S, 'uLeg' + S, [0, -.44, 0], 'cyl', [0, -.21, 0], [.11 * w, .43, .11 * w], c('boots'), { sp: .5 });
    A('foot' + S, 'lLeg' + S, [0, -.43, 0], 'box', [0, -.02, .05], [.11, .07, .26], c('boots'), { sp: .5 });
  }
  if (o.weapon) {
    A('wpn', 'handR', [0, -.03, 0], null);
    A('grip', 'wpn', [0, 0, 0], 'cyl', [0, 0, -.03], [.035, .2, .035], lin(0x3a2416), { rr: Math.PI / 2 });
    A('guard', 'wpn', [0, 0, 0], 'box', [0, 0, .08], [.2, .035, .045], lin(o.guard || 0xb08a3e), { sp: .9 });
    const bl = o.weapon === 'long' ? 1.15 : .82;
    A('blade', 'wpn', [0, 0, 0], 'box', [0, 0, .1 + bl / 2], [.055, .014, bl], lin(o.steel || 0xd8d4cc), { sp: 1.2, glow: true });
    A('edge', 'wpn', [0, 0, 0], 'box', [0, -.012, .1 + bl / 2], [.018, .008, bl * .98], lin(0xffffff), { sp: 1.5, glow: true });
  }
  const r = new Rig(P); r.scale = o.scale || 1; r.bladeLen = o.weapon === 'long' ? 1.25 : .92;
  r.isH = true; return r;
}
// pose alvo + suavização
function rigTarget(r) { for (const q of r.parts) { if (!q.t) q.t = [0, 0, 0]; q.t[0] = q.t[1] = q.t[2] = 0; } }
function T_(r, n, x = 0, y = 0, z = 0) { const q = r.by[n]; if (q) { q.t[0] = x; q.t[1] = y; q.t[2] = z; } }
function rigSmooth(r, dt, rate) { const k = 1 - Math.exp(-rate * dt); for (const q of r.parts) if (q.t) for (let i = 0; i < 3; i++) q.r[i] += (q.t[i] - q.r[i]) * k; }
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const sw = (t, a, b) => sstep(a, b, t);
// a: {ph, sp, act, t, ready}
function animH(r, a, dt) {
  rigTarget(r); const s = Math.min(a.sp || 0, 1.4), ph = a.ph || 0, S = Math.sin(ph), C = Math.cos(ph), t = a.t || 0;
  let rate = 14; r.yOff = 0; r.extraYaw = 0;
  const breath = Math.sin(performance.now() / 700) * .03;
  // base: andar/correr
  T_(r, 'uLegR', -S * .75 * s); T_(r, 'uLegL', S * .75 * s);
  T_(r, 'lLegR', s * (.15 + .95 * Math.max(0, C))); T_(r, 'lLegL', s * (.15 + .95 * Math.max(0, -C)));
  T_(r, 'footR', -.2 * s * Math.max(0, S)); T_(r, 'footL', -.2 * s * Math.max(0, -S));
  T_(r, 'torso', .12 * s + breath, -S * .12 * s); T_(r, 'head', -.08 * s, S * .08 * s);
  T_(r, 'hips', 0, S * .1 * s);
  r.yOff = Math.abs(C) * .05 * s;
  const ready = a.ready;
  T_(r, 'uArmR', ready ? -.45 + S * .2 * s : S * .65 * s, 0, -.08); T_(r, 'lArmR', ready ? -.75 : -.25 - .35 * s);
  T_(r, 'uArmL', -S * .65 * s, 0, .08); T_(r, 'lArmL', -.25 - .35 * s);
  T_(r, 'wpn', ready ? 1.35 : 1.0 - (-S * .65 * s));
  T_(r, 'coat', .1 * s); T_(r, 'cape', .25 * s + .05);
  const act = a.act;
  const arm = (uA, rz, lA, P, ry = 0) => { T_(r, 'uArmR', uA, ry, rz); T_(r, 'lArmR', lA); T_(r, 'wpn', P - uA - lA); };
  if (act === 's1') { rate = 30; const k = ease(sw(t, .1, .55)); T_(r, 'torso', .1, lerp(.95, -1.0, k)); arm(-1.35, lerp(-.5, .35, k), -.15, .15); T_(r, 'uArmL', -.6, 0, .5); T_(r, 'uLegR', -.4); T_(r, 'uLegL', .3); }
  else if (act === 's2') { rate = 30; const k = ease(sw(t, .1, .55)); T_(r, 'torso', .1, lerp(-.95, 1.0, k)); arm(-1.4, lerp(.45, -.6, k), -.2, .1); T_(r, 'uArmL', -.5, 0, .7); T_(r, 'uLegL', -.4); T_(r, 'uLegR', .3); }
  else if (act === 's3') { rate = 30; const k = ease(sw(t, .12, .55)); T_(r, 'torso', lerp(-.2, .4, k)); arm(lerp(-2.9, -.65, k), -.15, lerp(-.4, 0, k), lerp(-1.6, .7, k)); T_(r, 'uArmL', lerp(-2.6, -.6, k), 0, -.2); T_(r, 'lArmL', -.6); T_(r, 'uLegR', -.7); T_(r, 'lLegR', .4); T_(r, 'uLegL', .4); r.yOff = -.05 * k; }
  else if (act === 's4') { rate = 40; const k = ease(sw(t, .08, .7)); r.extraYaw = -k * Math.PI * 2; T_(r, 'torso', .2); arm(-1.5, -.9, -.1, 0); T_(r, 'uArmL', -1.2, 0, .9); T_(r, 'uLegR', -.5); T_(r, 'uLegL', .5); r.yOff = Math.sin(k * Math.PI) * .25; }
  else if (act === 'hv') { rate = 26; const k = ease(sw(t, .45, .7)); T_(r, 'torso', lerp(-.3, .55, k), lerp(.5, 0, k)); arm(lerp(-3.0, -.55, k), -.1, lerp(-.5, 0, k), lerp(-1.9, .9, k)); T_(r, 'uArmL', lerp(-2.8, -.7, k), 0, -.35); T_(r, 'lArmL', -.5); T_(r, 'uLegR', -.9 * k - .2); T_(r, 'lLegR', .6 * k); T_(r, 'uLegL', .5); T_(r, 'lLegL', .5); r.yOff = -.18 * k; }
  else if (act === 'charge') { rate = 12; T_(r, 'torso', .25, 1.1); arm(-.5, -.9, -.4, .3); T_(r, 'uArmL', -.9, 0, .6); T_(r, 'uLegR', -.7); T_(r, 'lLegR', .9); T_(r, 'uLegL', .5); T_(r, 'lLegL', .6); r.yOff = -.2; }
  else if (act === 'rup') { rate = 40; const k = ease(sw(t, .05, .45)); T_(r, 'torso', lerp(.25, -.2, k), lerp(1.1, -1.1, k)); arm(lerp(-.5, -2.6, k), lerp(-.9, .3, k), -.1, lerp(.4, -1.0, k)); T_(r, 'uArmL', -1.0, 0, .9); T_(r, 'uLegR', -.6); T_(r, 'uLegL', .5); r.yOff = Math.sin(k * Math.PI) * .2; }
  else if (act === 'dodge') { rate = 30; T_(r, 'torso', .7); T_(r, 'head', -.4); T_(r, 'uLegR', -1.2); T_(r, 'lLegR', 1.7); T_(r, 'uLegL', -.4); T_(r, 'lLegL', 1.3); arm(-.9, -.3, -1.0, .4); T_(r, 'uArmL', -1.0, 0, .3); T_(r, 'lArmL', -1.0); r.yOff = -.25; }
  else if (act === 'hit') { rate = 30; T_(r, 'torso', -.4); T_(r, 'head', -.3); T_(r, 'uArmR', -.3, 0, -.7); T_(r, 'uArmL', -.3, 0, .7); }
  else if (act === 'cast') { rate = 16; arm(-1.2, .5, -1.1, -1.5); T_(r, 'uArmL', -1.2, 0, -.5); T_(r, 'lArmL', -1.2); T_(r, 'head', .2); }
  else if (act === 'ult') { rate = 28; const k = ease(sw(t, .35, .65)); arm(lerp(-3.0, -.4, k), -.1, 0, lerp(-1.7, 1.0, k)); T_(r, 'uArmL', lerp(-3, -.5, k), 0, -.3); T_(r, 'torso', lerp(-.4, .6, k)); T_(r, 'uLegR', -.8); T_(r, 'lLegR', 1.0); T_(r, 'uLegL', .3); T_(r, 'lLegL', 1.0); r.yOff = Math.sin(sw(t, .0, .55) * Math.PI) * 1.6 - .2 * k; }
  else if (act === 'kneel') { rate = 6; T_(r, 'uLegR', -1.5); T_(r, 'lLegR', 1.55); T_(r, 'uLegL', .15); T_(r, 'lLegL', 1.65); T_(r, 'torso', .35); T_(r, 'head', .3); T_(r, 'uArmR', -.4); T_(r, 'uArmL', -.4); r.yOff = -.47; }
  else if (act === 'raise') { rate = 8; arm(-2.9, -.25, -.1, -1.5); T_(r, 'uArmL', -2.9, 0, .25); T_(r, 'torso', -.2); T_(r, 'head', -.5); }
  else if (act === 'point') { rate = 8; T_(r, 'uArmL', -1.5, 0, .2); T_(r, 'lArmL', -.1); }
  else if (act === 'dead') { rate = 6; T_(r, 'uArmR', -.2, 0, -1.1); T_(r, 'uArmL', -.3, 0, 1.2); T_(r, 'torso', -.1); T_(r, 'uLegR', -.1); }
  else if (act === 'cross') { rate = 8; T_(r, 'uArmR', -.5, 0, .5); T_(r, 'lArmR', -1.8); T_(r, 'uArmL', -.5, 0, -.5); T_(r, 'lArmL', -1.8); }
  else if (act === 'fcast') { rate = 12; T_(r, 'uArmR', -1.6, 0, -.2); T_(r, 'lArmR', -.1); T_(r, 'uArmL', -1.6, 0, .2); T_(r, 'lArmL', -.1); T_(r, 'torso', -.1); }
  else if (act === 'flunge') { rate = 30; T_(r, 'torso', .6); T_(r, 'uArmR', -1.6, 0, -.1); T_(r, 'uArmL', -1.6, 0, .1); T_(r, 'uLegR', -.8); T_(r, 'uLegL', .6); }
  else if (act === 'fwind') { rate = 14; T_(r, 'torso', -.3, .4); T_(r, 'uArmR', -2.6, 0, -.4); T_(r, 'uArmL', -2.6, 0, .4); }
  rigSmooth(r, dt, rate);
}
function bladeTip(r) { return r.wp('wpn', [0, 0, r.bladeLen]); }
function bladeBase(r) { return r.wp('wpn', [0, 0, .15]); }

// ---------- quadrúpede (Cão de Fios Rotos) ----------
function dogRig(sc) {
  const fur = lin(0x2b2420), fur2 = lin(0x463a31), bone = lin(0xb9ad97), eye = lin(0xff3a7a), P = [];
  const A = (n, p, o, g, mo, s, c, x = {}) => P.push({ n, p, o, g, mo, s, c, ...x });
  A('body', null, [0, .95, 0], 'box', [0, 0, -.05], [.72, .62, 1.45], fur, { sp: .15 });
  A('chest', 'body', [0, .06, .5], 'sph', [0, 0, 0], [.85, .8, .75], fur2, { sp: .15 });
  A('spine', 'body', [0, .33, 0], 'box', [0, 0, 0], [.18, .1, 1.3], bone, { sp: .5, glow: true });
  A('neck', 'body', [0, .25, .75], 'cyl', [0, .1, .12], [.36, .55, .36], fur, { rr: .9 });
  A('head', 'body', [0, .5, 1.05], 'box', [0, 0, .08], [.44, .4, .5], fur2);
  A('snout', 'head', [0, 0, 0], 'box', [0, -.05, .42], [.27, .2, .4], fur);
  A('teeth', 'head', [0, 0, 0], 'box', [0, -.16, .45], [.24, .04, .34], bone, { sp: .6 });
  A('jaw', 'head', [0, -.14, .2], 'box', [0, -.04, .2], [.25, .09, .38], fur2);
  A('earL', 'head', [0, 0, 0], 'cone', [.15, .27, -.08], [.11, .24, .09], fur);
  A('earR', 'head', [0, 0, 0], 'cone', [-.15, .27, -.08], [.11, .24, .09], fur);
  A('eyeL', 'head', [0, 0, 0], 'sph', [.13, .06, .3], [.08, .05, .05], eye, { em: [3, .4, 1.2], glow: true });
  A('eyeR', 'head', [0, 0, 0], 'sph', [-.13, .06, .3], [.08, .05, .05], eye, { em: [3, .4, 1.2], glow: true });
  for (const [n, x, z] of [['FL', .27, .55], ['FR', -.27, .55], ['BL', .25, -.6], ['BR', -.25, -.6]]) {
    A('u' + n, 'body', [x, -.12, z], 'cyl', [0, -.25, 0], [.19, .52, .19], fur);
    A('l' + n, 'u' + n, [0, -.5, 0], 'cyl', [0, -.2, 0], [.14, .42, .14], fur2);
    A('p' + n, 'l' + n, [0, -.42, 0], 'box', [0, -.02, .06], [.17, .08, .24], bone);
  }
  A('t1', 'body', [0, .2, -.72], 'cyl', [0, 0, -.25], [.11, .5, .11], fur, { rr: Math.PI / 2 });
  A('t2', 't1', [0, 0, -.5], 'cyl', [0, 0, -.22], [.08, .45, .08], fur2, { rr: Math.PI / 2 });
  const r = new Rig(P); r.scale = sc; return r;
}
function animDog(r, a, dt) {
  rigTarget(r); const ph = a.ph || 0, s = Math.min(a.sp || 0, 1.6), S = Math.sin(ph), C = Math.cos(ph); let rate = 14;
  T_(r, 'uFL', S * .8 * s); T_(r, 'uBR', S * .8 * s); T_(r, 'uFR', -S * .8 * s); T_(r, 'uBL', -S * .8 * s);
  T_(r, 'lFL', -Math.max(0, C) * .9 * s); T_(r, 'lFR', -Math.max(0, -C) * .9 * s); T_(r, 'lBL', Math.max(0, C) * .9 * s); T_(r, 'lBR', Math.max(0, -C) * .9 * s);
  T_(r, 'body', Math.sin(ph * 2) * .05 * s); T_(r, 'head', -.1 + Math.sin(ph * 2) * .06 * s);
  T_(r, 't1', -.4 + Math.sin(performance.now() / 300) * .3, Math.sin(performance.now() / 420) * .4); T_(r, 't2', -.2, Math.sin(performance.now() / 260) * .4);
  T_(r, 'jaw', .1); r.yOff = Math.abs(Math.sin(ph)) * .08 * s;
  const t = a.t || 0, act = a.act;
  if (act === 'bite') { rate = 30; const k = sw(t, .35, .55); T_(r, 'head', lerp(-.45, .35, k)); T_(r, 'jaw', lerp(.8, 0, k)); T_(r, 'body', lerp(-.12, .15, k)); }
  else if (act === 'wind') { rate = 10; T_(r, 'body', .18); T_(r, 'head', .3); T_(r, 'jaw', .5); T_(r, 'uFL', -.5); T_(r, 'uFR', -.5); T_(r, 'uBL', .6); T_(r, 'uBR', .6); T_(r, 'lBL', 1); T_(r, 'lBR', 1); r.yOff = -.2; }
  else if (act === 'howl') { rate = 8; T_(r, 'head', -.9); T_(r, 'jaw', .9); T_(r, 'body', -.25); T_(r, 'uFL', -.3); T_(r, 'uFR', -.3); }
  else if (act === 'whip') { rate = 20; T_(r, 'body', 0, 0, Math.sin(t * 20) * .2); T_(r, 't1', -.2, Math.sin(t * 30) * 1.2); T_(r, 'jaw', .7); }
  else if (act === 'stun') { rate = 6; T_(r, 'head', .5); T_(r, 'body', .2); T_(r, 'jaw', .5); T_(r, 'uFL', -.8); T_(r, 'uFR', -.8); T_(r, 'lFL', 1.2); T_(r, 'lFR', 1.2); r.yOff = -.3; }
  else if (act === 'dead') { rate = 4; T_(r, 'head', .4); T_(r, 'jaw', .6); T_(r, 'uFL', -1.2); T_(r, 'uFR', -.9); T_(r, 'uBL', 1); T_(r, 'uBR', .8); }
  rigSmooth(r, dt, rate);
}

// ---------- elenco ----------
const MODELS = {};
const SK = (k, h, w) => MODELS[k] ? new SkinRig(MODELS[k], h, w) : null;
const CAST0 = {
  nera: () => humanoid({ skin: 0xc99a7a, hair: 0x1c1512, top: 0x2f4a4c, pants: 0x3b2f26, boots: 0x2a1e16, accent: 0x8b6b3c, glove: 0x4a3426, leather: 0x5a3b24, coat: 0x253a3d, pony: true, coat_: 1, coat: 0x243a3c, weapon: 'short', scale: .93, build: .92 }),
  orven: () => humanoid({ skin: 0xb88a6c, hair: 0xb8b2a8, beard: 0xc9c3b8, top: 0x4a3f36, pants: 0x332a22, boots: 0x22190f, accent: 0x9a8a6a, glove: 0x3a2c20, leather: 0x4d3420, coat: 0x3f352c, beard_: 1, weapon: 'long', scale: 1.0, build: 1.0, cape: 0x5b2c22 }),
  lira: () => humanoid({ skin: 0xd2a487, hair: 0x6a3a1e, top: 0x3f5a35, pants: 0x3a3226, boots: 0x2b2016, accent: 0x6f8a4a, glove: 0x4f3a28, leather: 0x5b3e25, cape: 0x557a3d, weapon: 'short', scale: .91, build: .88 }),
  iaro: () => humanoid({ skin: 0x9c6a4a, hair: 0x231a14, beard: 0x231a14, top: 0x6b4a2a, pants: 0x3a2e24, boots: 0x261c14, accent: 0x9a6a2a, glove: 0x3b2a1c, leather: 0x4f3520, weapon: 'long', scale: 1.08, build: 1.25 }),
  ruan: () => humanoid({ skin: 0xc49272, hair: 0x2a2018, top: 0x2c3a5c, pants: 0x2b2a30, boots: 0x1c1a20, accent: 0x5a72a8, glove: 0x2c2a36, leather: 0x3a3040, weapon: 'long', steel: 0xcfd8e8, scale: 1.0, build: .95 }),
  mireia: () => humanoid({ skin: 0xa8765a, hair: 0x14100e, top: 0x2f5a5a, pants: 0x3a3a3e, boots: 0x22222a, accent: 0xa8b0b4, glove: 0x34383c, leather: 0x4a4648, coat: 0x2a4c4e, pony: true, weapon: 'short', scale: .92, build: .9 }),
  oren: () => humanoid({ skin: 0xd8b49a, hair: 0x8a8070, top: 0x3c5a68, pants: 0x30363a, boots: 0x20262a, accent: 0x9ac4d4, glove: 0x30383e, leather: 0x3e4448, cape: 0x2e4a58, weapon: 'long', steel: 0xd8f0ff, scale: 1.02, build: 1.0 }),
  brena: () => humanoid({ skin: 0xc89a80, hair: 0x7a7068, top: 0x6a4a3a, pants: 0x4a3a30, boots: 0x2a1e16, accent: 0x7a5a40, glove: 0xc89a80, leather: 0x5a4030, coat: 0x6a4a3a, pony: true, scale: .88, build: 1.05 }),
  aldeao: (c) => humanoid({ skin: 0xc0906e, hair: 0x3a2a1e, top: c || 0x5a5040, pants: 0x3e3428, boots: 0x2a2016, accent: 0x5a4a38, glove: 0xc0906e, leather: 0x4a3a28, scale: .95 }),
  tecelao: () => humanoid({ skin: 0x5e5a62, hair: 0x2a262c, top: 0x3e3a3c, pants: 0x2c2a2c, boots: 0x1e1c1e, accent: 0x4a2a3a, glove: 0x2a2428, leather: 0x3a2a30, hood: 0x353034, coat: 0x2f2a2e, weapon: 'short', steel: 0x6a6670, guard: 0x3a3236, scale: 1.0, build: 1.05 }),
  fieira: () => humanoid({ skin: 0x6a6070, hair: 0x2a262c, top: 0x4a3a52, pants: 0x2e2834, boots: 0x1e1a22, accent: 0x6a3a6a, glove: 0x3a2e40, leather: 0x3a2e40, hood: 0x3e3248, coat: 0x3a2e44, scale: 1.02, build: .78 }),
};

const CAST = {
  nera: () => SK('nera', 1.68) || CAST0.nera(), orven: () => SK('orven', 1.82) || CAST0.orven(), lira: () => SK('lira', 1.66) || CAST0.lira(),
  iaro: () => SK('iaro', 1.92) || CAST0.iaro(), ruan: () => SK('ruan', 1.8) || CAST0.ruan(), mireia: () => SK('mireia', 1.66) || CAST0.mireia(),
  oren: () => SK('oren', 1.83) || CAST0.oren(), brena: () => SK('brena', 1.6, false) || CAST0.brena(), aldeao: (c) => SK('aldeao', 1.74, false) || CAST0.aldeao(c),
  tecelao: () => SK('tecelao', 1.9) || CAST0.tecelao(), fieira: () => SK('fieira', 1.86, false) || CAST0.fieira(),
};
