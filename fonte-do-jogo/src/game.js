// ================= JOGO: entrada, áudio, Nera, inimigos =================
const $ = id => document.getElementById(id);
const S = { mode: 'load', time: 0, ts: 1, hitstop: 0, slow: 0, shake: 0, real: 0 };
let OPT = { sens: 1, inv: false, music: .55, sfx: .8, nums: true, quality: 1, economia: false };
try { Object.assign(OPT, JSON.parse(localStorage.getItem('fio_opts') || '{}')); } catch (e) { }
window.QUALITY = OPT.quality * (OPT.economia ? .75 : 1); resize();
const saveOpts = () => { try { localStorage.setItem('fio_opts', JSON.stringify(OPT)); } catch (e) { } };

// ---------- entrada ----------
const K = {}, KP = {}; let mdx = 0, mdy = 0, locked = false;
addEventListener('keydown', e => { if (!K[e.code]) KP[e.code] = 1; K[e.code] = 1; if (['Tab', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault(); AU.init(); });
addEventListener('keyup', e => { K[e.code] = 0; });
addEventListener('blur', () => { for (const k in K) K[k] = 0; });
// câmera no mouse (como antes): clicar no jogo prende o mouse; M solta a seta e pausa o jogo
function grabMouse() { if (TOUCH || locked) return; try { const p = cv.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (er) { } }
cv.addEventListener('mousedown', e => { AU.init(); if (!TOUCH && !locked && S.mode === 'play') grabMouse(); const b = 'M' + e.button; KP[b] = 1; K[b] = 1; });
function toggleMouseCam() { if (TOUCH) return; if (locked) { S.noPauseOnUnlock = true; document.exitPointerLock(); if (typeof openPause === 'function') openPause(); } else if (S.mode === 'play') grabMouse(); }
addEventListener('mouseup', e => { K['M' + e.button] = 0; });
cv.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('mousemove', e => { if (locked) { mdx += e.movementX; mdy += e.movementY; } });
addEventListener('wheel', e => { KP[e.deltaY > 0 ? 'WD' : 'WU'] = 1; }, { passive: true });
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === cv; const b = document.getElementById('mouseBtn'); if (b) { b.classList.toggle('on', locked); b.querySelector('b').textContent = locked ? 'ligada' : 'desligada'; } S.noPauseOnUnlock = false; });
const TOUCH = matchMedia('(pointer:coarse)').matches;
const TI = { mx: 0, mz: 0, lx: 0, ly: 0, b: {} };
let padPrev = {};
function readInput() {
  const I = { mx: 0, mz: 0, run: false, light: false, heavyDown: false, heavyHeld: false, dodge: false, q: false, e: false, r: false, lock: false, potion: false, act: false, pause: false, adv: false, lx: 0, ly: 0, sw: 0 };
  if (K.KeyW) I.mz += 1; if (K.KeyS) I.mz -= 1; if (K.KeyA) I.mx -= 1; if (K.KeyD) I.mx += 1;
  if (KP.KeyM) toggleMouseCam();
  I.run = !!(K.ShiftLeft || K.ShiftRight); I.light = !!KP.M0 || !!KP.KeyJ; I.heavyDown = !!KP.M2 || !!KP.KeyK; I.heavyHeld = !!K.M2 || !!K.KeyK;
  I.dodge = !!KP.Space; I.q = !!KP.KeyQ; I.e = !!KP.KeyE; I.r = !!KP.KeyR; I.lock = !!KP.Tab || !!KP.M1 || !!KP.KeyL; I.potion = !!KP.Digit1 || !!KP.KeyC; I.act = !!KP.KeyF;
  I.pause = !!KP.Escape || !!KP.KeyP; I.adv = !!KP.Enter || !!KP.Space || !!KP.M0 || !!KP.KeyF; I.sw = KP.WD ? 1 : KP.WU ? -1 : 0;
  I.lx = mdx * .0024 * OPT.sens; I.ly = mdy * .0024 * OPT.sens * (OPT.inv ? -1 : 1); mdx = mdy = 0;
  const ks = .035 * OPT.sens; if (K.ArrowLeft) I.lx -= ks; if (K.ArrowRight) I.lx += ks; if (K.ArrowUp) I.ly -= ks * .6 * (OPT.inv ? -1 : 1); if (K.ArrowDown) I.ly += ks * .6 * (OPT.inv ? -1 : 1);
  // controle
  const gp = (navigator.getGamepads ? [...navigator.getGamepads()] : []).find(g => g && g.connected);
  if (gp) { const ax = gp.axes, B = i => gp.buttons[i] && gp.buttons[i].pressed, pr = i => B(i) && !padPrev[i];
    const dz = v => Math.abs(v) < .18 ? 0 : v;
    I.mx += dz(ax[0]); I.mz -= dz(ax[1]); I.lx += dz(ax[2]) * .05 * OPT.sens; I.ly += dz(ax[3]) * .04 * OPT.sens * (OPT.inv ? -1 : 1);
    if (pr(2)) I.light = true; if (pr(3)) I.heavyDown = true; if (B(3)) I.heavyHeld = true; if (pr(0)) { I.dodge = true; I.adv = true; } if (pr(4)) I.q = true; if (pr(5)) I.e = true; if (pr(7)) I.r = true;
    if (B(6) || B(10)) I.run = true; if (pr(11)) I.lock = true; if (pr(13)) I.potion = true; if (pr(1)) { I.act = true; I.adv = true; } if (pr(9)) I.pause = true; if (pr(15)) I.sw = 1; if (pr(14)) I.sw = -1;
    padPrev = {}; gp.buttons.forEach((b, i) => padPrev[i] = b.pressed); }
  if (TOUCH) { I.mx += TI.mx; I.mz += TI.mz; I.lx += TI.lx * .006 * OPT.sens; I.ly += TI.ly * .006 * OPT.sens; TI.lx = TI.ly = 0; const b = TI.b;
    if (b.atk) I.light = I.adv = true; if (b.hv) I.heavyDown = true; if (b.hvH) I.heavyHeld = true; if (b.dg) I.dodge = true; if (b.q) I.q = true; if (b.e) I.e = true; if (b.r) I.r = true; if (b.lk) I.lock = true; if (b.po) I.potion = true; if (b.f) I.act = I.adv = true; if (b.ps) I.pause = true;
    if (Math.hypot(TI.mx, TI.mz) > .92) I.run = true; for (const k in b) if (k !== 'hvH') b[k] = false; }
  const l = Math.hypot(I.mx, I.mz); if (l > 1) { I.mx /= l; I.mz /= l; }
  for (const k in KP) delete KP[k];
  return I;
}

// ---------- áudio sintetizado ----------
const AU = {
  ctx: null, nb: null,
  init() { if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; } try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const c = this.ctx; this.master = c.createGain(); this.master.connect(c.destination); this.mus = c.createGain(); this.mus.connect(this.master); this.fx = c.createGain(); this.fx.connect(this.master); this.vol();
    this.nb = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = this.nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const rv = c.createConvolver(), L = c.sampleRate * 1.8, ir = c.createBuffer(2, L, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const x = ir.getChannelData(ch); for (let i = 0; i < L; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / L, 3); }
    rv.buffer = ir; this.rv = c.createGain(); this.rv.gain.value = .25; this.rv.connect(rv); rv.connect(this.master);
    this.musicTick(); },
  vol() { if (!this.ctx) return; this.mus.gain.value = OPT.music * .5; this.fx.gain.value = OPT.sfx; },
  env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); },
  noise(f, q, peak, d, type = 'bandpass', a = .005, rate = 1, dst) { if (!this.ctx) return; const c = this.ctx, t = c.currentTime, s = c.createBufferSource(); s.buffer = this.nb; s.playbackRate.value = rate; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); this.env(g, t, a, peak, d); s.connect(fl); fl.connect(g); g.connect(dst || this.fx); g.connect(this.rv); s.start(t, Math.random() * .5); s.stop(t + a + d + .05); return fl; },
  tone(f, type, peak, d, a = .005, f2, dst) { if (!this.ctx) return; const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d); this.env(g, t, a, peak, d); o.connect(g); g.connect(dst || this.fx); g.connect(this.rv); o.start(t); o.stop(t + a + d + .05); },
  whoosh(h = 1) { const f = this.noise(900 * h, 1.2, .25, .18, 'bandpass', .03); if (f) f.frequency.exponentialRampToValueAtTime(2600 * h, this.ctx.currentTime + .18); },
  hit(heavy) { this.noise(heavy ? 500 : 1400, .8, heavy ? .7 : .45, heavy ? .22 : .1); this.tone(heavy ? 90 : 160, 'sine', heavy ? .7 : .35, heavy ? .25 : .12, .002, 40); this.tone(2400 + rnd(0, 800), 'triangle', .06, .15); },
  clang() { for (const f of [820, 1230, 1870]) this.tone(f * rnd(.97, 1.03), 'triangle', .18, .9); this.noise(3000, 2, .3, .12); },
  chime() { [880, 1320, 1760].forEach((f, i) => setTimeout(() => this.tone(f, 'sine', .2, .6), i * 60)); },
  heal() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 'sine', .14, .7, .02), i * 90)); },
  roar() { this.tone(70, 'sawtooth', .5, 1.2, .1, 45); this.noise(300, .6, .5, 1.0, 'lowpass', .1); this.tone(140, 'square', .12, 1.0, .1, 90); },
  bite() { this.noise(700, 1, .5, .08); this.tone(120, 'square', .2, .08); },
  stinger() { [110, 165, 220, 330].forEach(f => this.tone(f, 'sawtooth', .18, 2.2, .02)); this.noise(200, .5, .6, 1.6, 'lowpass', .01); this.tone(55, 'sine', .9, 2.5, .01, 40); },
  thread() { this.tone(1500, 'sine', .08, .4, .01, 3000); },
  hurt() { this.noise(300, 1, .5, .15); this.tone(200, 'sawtooth', .15, .15, .002, 80); },
  ui() { this.tone(660, 'sine', .1, .08); },
  step() { this.noise(500, 1, .04, .05, 'lowpass'); },
  // música
  musMode: 'none', chord: 0, beat: 0, next: 0,
  music(m) { this.musMode = m; },
  musicTick() {
    const c = this.ctx; if (!c) return; const look = () => {
      const now = c.currentTime;
      while (this.next < now + .2) { const t = Math.max(this.next, now), m = this.musMode, bpm = m === 'boss' ? 150 : 128, step = 60 / bpm / 2;
        if (m !== 'none' && this.beat % 16 === 0) this.pad(t, m);
        if (m === 'combat' || m === 'boss') { const b = this.beat % 8; if (b === 0 || b === 3 || b === 6) this.kick(t, b === 0 ? 1 : .7); if (b % 2 === 1) this.hat(t); if (b === 4) this.snare(t); if (m === 'boss' && this.beat % 32 === 0) this.choir(t); }
        this.beat++; this.next = t + step; }
    }; setInterval(look, 50);
  },
  pad(t, m) { const c = this.ctx, prog = m === 'calm' ? [[220, 277, 330], [196, 247, 294], [175, 220, 262], [196, 247, 330]] : m === 'boss' ? [[110, 131, 165], [104, 131, 156], [98, 123, 147], [104, 131, 165]] : [[147, 175, 220], [131, 165, 196], [117, 147, 175], [131, 156, 196]];
    const ch = prog[this.chord++ % 4], dur = m === 'calm' ? 3.75 : 3.6, fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = m === 'calm' ? 900 : 1300; fl.connect(this.mus); fl.connect(this.rv);
    for (const f of ch) for (const det of [-6, 6]) { const o = c.createOscillator(), g = c.createGain(); o.type = m === 'calm' ? 'triangle' : 'sawtooth'; o.frequency.value = f; o.detune.value = det; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(m === 'calm' ? .05 : .03, t + .8); g.gain.linearRampToValueAtTime(0, t + dur); o.connect(g); g.connect(fl); o.start(t); o.stop(t + dur + .1); }
    if (m === 'calm') { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = ch[2] * 2; g.gain.setValueAtTime(0, t + 1); g.gain.linearRampToValueAtTime(.04, t + 1.1); g.gain.exponentialRampToValueAtTime(.0001, t + 3); o.connect(g); g.connect(this.mus); g.connect(this.rv); o.start(t + 1); o.stop(t + 3.1); }
  },
  kick(t, v) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + .15); g.gain.setValueAtTime(.55 * v, t); g.gain.exponentialRampToValueAtTime(.0001, t + .28); o.connect(g); g.connect(this.mus); o.start(t); o.stop(t + .3); },
  hat(t) { const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.nb; f.type = 'highpass'; f.frequency.value = 7000; g.gain.setValueAtTime(.06, t); g.gain.exponentialRampToValueAtTime(.0001, t + .05); s.connect(f); f.connect(g); g.connect(this.mus); s.start(t, Math.random()); s.stop(t + .06); },
  snare(t) { const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.nb; f.type = 'bandpass'; f.frequency.value = 1800; g.gain.setValueAtTime(.22, t); g.gain.exponentialRampToValueAtTime(.0001, t + .16); s.connect(f); f.connect(g); g.connect(this.mus); g.connect(this.rv); s.start(t, Math.random()); s.stop(t + .18); },
  choir(t) { const c = this.ctx; for (const f of [220, 262, 330]) { const o = c.createOscillator(), b = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = f; b.type = 'bandpass'; b.frequency.value = 800; b.Q.value = 4; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + .4); g.gain.linearRampToValueAtTime(0, t + 2.6); o.connect(b); b.connect(g); g.connect(this.mus); g.connect(this.rv); o.start(t); o.stop(t + 2.7); } }
};

// ---------- números de dano / textos ----------
const NUMS = [];
function num(p, txt, cls = 'w', big = false) {
  if (!OPT.nums && cls !== 'g' && cls !== 'i') return;
  const el = document.createElement('div'); el.className = 'num ' + cls + (big ? ' big' : ''); el.textContent = txt; $('nums').appendChild(el);
  NUMS.push({ el, p: [p[0] + rnd(-.3, .3), p[1], p[2] + rnd(-.3, .3)], t: 0 });
}
function updNums(dt) {
  for (let i = NUMS.length - 1; i >= 0; i--) { const n = NUMS[i]; n.t += dt; const p = [n.p[0], n.p[1] + n.t * 1.1, n.p[2]], s = R.project(p);
    if (!s || n.t > .95) { if (n.t > .95) { n.el.remove(); NUMS.splice(i, 1); continue; } n.el.style.display = 'none'; continue; }
    n.el.style.display = ''; n.el.style.transform = `translate(${s[0]}px,${s[1]}px) translate(-50%,-50%) scale(${n.t < .1 ? 1.4 - n.t * 4 : 1})`; n.el.style.opacity = n.t > .65 ? (.95 - n.t) / .3 : 1; }
}
function icon(txt, cls = '') { const el = $('flashicon'); el.textContent = txt; el.className = 'show ' + cls; clearTimeout(icon.t); icon.t = setTimeout(() => el.className = '', 900); }

// ---------- partículas ----------
const PART = [];
function part(p, v, life, size, col, o = {}) { if (PART.length > 2500) return; PART.push({ p: [...p], v: [...v], life, max: life, size, col, add: o.add ?? 1, g: o.g ?? 0, drag: o.drag ?? 1.5, al: o.al ?? 1, grow: o.grow ?? 0 }); }
function sparks(p, col, n = 12, sp = 5) { for (let k = 0; k < n; k++) part(p, [rnd(-sp, sp), rnd(0, sp), rnd(-sp, sp)], rnd(.2, .5), rnd(.04, .09), col, { g: -9, drag: 2 }); }
function puff(p, col, n = 8, s = .5, al = .3) { for (let k = 0; k < n; k++) part([p[0] + rnd(-.4, .4), p[1] + rnd(0, .4), p[2] + rnd(-.4, .4)], [rnd(-.6, .6), rnd(.2, 1), rnd(-.6, .6)], rnd(.8, 1.6), s, col, { add: 0, al, grow: .8 }); }
function updParts(dt) {
  for (let i = PART.length - 1; i >= 0; i--) { const q = PART[i]; q.life -= dt; if (q.life <= 0) { PART.splice(i, 1); continue; }
    q.v[1] += q.g * dt; const d = Math.exp(-q.drag * dt); q.v[0] *= d; q.v[1] *= d; q.v[2] *= d; q.p[0] += q.v[0] * dt; q.p[1] += q.v[1] * dt; q.p[2] += q.v[2] * dt; if (q.p[1] < .02 && q.g < 0) { q.p[1] = .02; q.v[1] *= -.3; }
    const k = q.life / q.max; R.pt(q.p, q.size * (1 + (1 - k) * q.grow * 3), q.col, q.al * Math.min(1, k * 2), q.add); }
}

// ---------- câmera ----------
const CAM = { yaw: Math.PI, pitch: .28, dist: 4.4, eye: [0, 3, 10], at: [0, 1.4, 0], zoom: 0, script: null, fov: .95 };
function camUpdate(dt, I) {
  if (CAM.script) { const s = CAM.script; s.t = Math.min(s.t + dt / s.dur, 1); const k = ease(s.t); CAM.eye = V.lerp(s.e0, s.e1, k); CAM.at = V.lerp(s.a0, s.a1, k); }
  else {
    CAM.yaw -= I.lx; CAM.pitch = clamp(CAM.pitch + I.ly, -.3, 1.05);
    const tg = P.lock && !P.lock.dead ? P.lock : null;
    if (tg) { const dy = Math.atan2(tg.pos[0] - P.pos[0], tg.pos[2] - P.pos[2]); CAM.yaw += angDiff(CAM.yaw, dy) * (1 - Math.exp(-6 * dt)); CAM.pitch += (.3 - CAM.pitch) * (1 - Math.exp(-3 * dt)); }
    const bossE = ENEMIES.find(e => e.boss && !e.dead && e.spawnT <= 0), boss = !!bossE;
    // luta de chefe sem alvo travado: a câmera vira devagar para o chefe não sumir atrás dela
    if (bossE && !tg && Math.abs(I.lx) < .002) { const dy = Math.atan2(bossE.pos[0] - P.pos[0], bossE.pos[2] - P.pos[2]), df = angDiff(CAM.yaw, dy); if (Math.abs(df) > .7) CAM.yaw += df * (1 - Math.exp(-2.2 * dt)); }
    const naTrilha = P.pos[0] > 14 && P.pos[0] < SX - 15 && pertoTrilha(P.pos[0], P.pos[2]).d < 6; CAM.trilha = lerp(CAM.trilha || 0, naTrilha ? 1 : 0, 1 - Math.exp(-2 * dt));
    let dist = (boss ? 6.4 : 4.4) + CAM.trilha * 2.6 - CAM.zoom * 1.6;
    CAM.dist += (dist - CAM.dist) * (1 - Math.exp(-4 * dt)); CAM.zoom = Math.max(0, CAM.zoom - dt * 1.5);
    const f = [Math.sin(CAM.yaw), 0, Math.cos(CAM.yaw)], rgt = [-Math.cos(CAM.yaw), 0, Math.sin(CAM.yaw)];
    const at = V.add(P.pos, [0, 1.45 + (P.rig.yOff || 0) * .4, 0]), cp = Math.cos(CAM.pitch), sp = Math.sin(CAM.pitch);
    let eye = V.add(V.add(at, V.sc(f, -CAM.dist * cp)), V.add([0, CAM.dist * sp + (CAM.trilha || 0) * 3.2, 0], V.sc(rgt, .65)));
    if (bossE) { const bd = Math.hypot(eye[0] - bossE.pos[0], eye[2] - bossE.pos[2]), lim = 1.6 * (bossE.baseScale || 1) + .8; if (bd < lim) eye[1] += (lim - bd) * 1.4; } // sobe a câmera se o chefe estiver colado nela
    const gh = groundH(eye[0], eye[2]) + .35; if (eye[1] < gh) eye[1] = gh;
    const k = 1 - Math.exp(-18 * dt); CAM.eye = V.lerp(CAM.eye, eye, k); CAM.at = V.lerp(CAM.at, V.add(at, V.sc(rgt, .65)), k);
  }
  let e = CAM.eye; if (S.shake > 0) { const m = S.shake * .25; e = V.add(e, [rnd(-m, m), rnd(-m, m), rnd(-m, m)]); S.shake = Math.max(0, S.shake - dt * 3); }
  R.setCam(e, CAM.at, CAM.fov + CAM.zoom * -.12);
}
function camShot(e0, e1, a0, a1, dur) { CAM.script = { e0, e1, a0, a1, dur, t: 0 }; }
function camRelease() { CAM.script = null; CAM.yaw = P.yaw; CAM.pitch = .28; }

// ================= NERA =================
const P = {
  rig: CAST.nera(), pos: [0, 0, 0], yaw: Math.PI, hp: 100, vig: 100, lume: 30, st: 'move', t: 0, combo: 0, comboT: 0, buf: false, iframe: 0, dodgeT: 9, mercy: 0,
  cd: { q: 0, e: 0, r: 0 }, contra: 0, contraTgt: null, ph: 0, sp: 0, slow: 0, lock: null, hitDone: false, level: 1, xp: 0, pts: 0, nodes: {}, potions: 2, wlvl: 0,
  unl: { q: false, e: false, r: false }, trail: [], heal: null, vigT: 0, hits: 0, hitT: 0, dodgeDir: [0, 0, 1], cur: null, combatT: 0, pull: null, stats: { moved: 0, dodges: 0, dummy: 0, dummyHeavy: 0 }
};
const XPT = [0, 60, 150, 270, 420, 600, 820, 1080];
let maxHp = () => Math.round((100 + (P.level - 1) * 14) * (typeof HERO !== 'undefined' ? HERO.hp : 1));
let atk = () => (10 + (P.level - 1) * 2.4) * (1 + P.wlvl * .15) * (typeof HERO !== 'undefined' ? HERO.dmg : 1);
const ATK = [
  { dur: .4, hit: .15, range: 2.5, arc: 1.9, mult: 1, post: 7, step: 1.1, pose: 's1', kind: 'w' },
  { dur: .4, hit: .15, range: 2.5, arc: 1.9, mult: 1.05, post: 7, step: 1.1, pose: 's2', kind: 'w' },
  { dur: .46, hit: .19, range: 2.6, arc: 1.6, mult: 1.2, post: 10, step: 1.3, pose: 's3', kind: 'w' },
  { dur: .62, hit: .26, range: 3.1, arc: 6.3, mult: 1.6, post: 16, step: 1.5, pose: 's4', kind: 'w', cuts: true, fio: true },
];
const HEAVY = { dur: .78, hit: .4, range: 2.9, arc: 1.5, mult: 2.3, post: 28, step: 1.0, pose: 'hv', kind: 'o', launch: true, cuts: true, heavy: true };
const RUP = { dur: .7, hit: .2, range: 3.2, arc: 2.2, mult: 3.4, post: 60, step: 2.2, pose: 'rup', kind: 'o', cuts: true, heavy: true, armor: true };
const CONTRA = { dur: .55, hit: .12, range: 3.4, arc: 6.3, mult: 3.2, post: 40, step: 0, pose: 's4', kind: 'c', cuts: true, crit: true };
function gainXP(n, p) {
  if (P.level >= 8) return; P.xp += n; if (p) num(p, '+' + n + ' XP', 'i');
  while (P.level < 8 && P.xp >= XPT[P.level]) { P.level++; P.pts++; P.hp = maxHp(); banner('Nível ' + P.level, '+1 ponto na árvore de Nera (Esc → Árvore)'); AU.chime(); }
}
function nearestEnemy(maxd = 6, fwdOnly = false) { let b = null, bd = maxd; for (const e of ENEMIES) { if (e.dead || e.spawnT > 0) continue; const d = V.d2(e.pos, P.pos); if (fwdOnly && Math.abs(angDiff(CAM.yaw, Math.atan2(e.pos[0] - P.pos[0], e.pos[2] - P.pos[2]))) > 1.2) continue; if (d < bd) { bd = d; b = e; } } return b; }
function faceTarget() { const t = (P.lock && !P.lock.dead) ? P.lock : nearestEnemy(5.5) || nearDummy(); if (t) P.yaw = Math.atan2(t.pos[0] - P.pos[0], t.pos[2] - P.pos[2]); }
function nearDummy() { if (MIS.cur !== 0) return null; for (const d of W.dummies) if (V.d2(d.pos, P.pos) < 3.5) return d; return null; }
function startAtk(def) { P.st = 'atk'; P.cur = def; P.t = 0; P.hitDone = false; P.buf = false; faceTarget(); AU.whoosh(def.heavy ? .7 : 1 + P.combo * .1); P.trail.length = 0; }
function playerUpdate(dt, I) {
  const r = P.rig; P.iframe -= dt; P.dodgeT += dt; P.mercy -= dt; P.contra -= dt; P.comboT -= dt; P.hitT -= dt; P.slow -= dt; P.combatT -= dt;
  for (const k in P.cd) P.cd[k] = Math.max(0, P.cd[k] - dt);
  if (P.comboT <= 0 && P.st === 'move') P.combo = 0; if (P.hitT <= 0) P.hits = 0;
  if (P.heal) { const h = Math.min(P.heal.amt * dt / P.heal.dur, P.heal.left); P.hp = Math.min(maxHp(), P.hp + h); P.heal.left -= h; if (P.heal.left <= 0) P.heal = null;
    if (Math.random() < .6) { const a = rnd(0, 6.28); part(V.add(P.pos, [Math.sin(a) * .6, rnd(.2, 1.8), Math.cos(a) * .6]), [0, 1.2, 0], .8, .07, [1, .85, .5]); } }
  // vigor
  P.vigT -= dt; if (P.vigT <= 0) P.vig = Math.min(100, P.vig + 28 * dt);
  // movimento
  const f = [Math.sin(CAM.yaw), Math.cos(CAM.yaw)], rg = [-Math.cos(CAM.yaw), Math.sin(CAM.yaw)];
  let mv = [f[0] * I.mz + rg[0] * I.mx, f[1] * I.mz + rg[1] * I.mx]; const ml = Math.hypot(mv[0], mv[1]);
  if (P.pull) { P.pull.t -= dt; const d = V.sub(P.pull.to, P.pos), l = Math.hypot(d[0], d[2]); if (l > 2.2) moveEnt(P.pos, d[0] / l * 14 * dt, d[2] / l * 14 * dt, .35); if (P.pull.t <= 0) P.pull = null; }
  if (I.lock) toggleLock(); if (I.sw && P.lock) switchLock(I.sw);
  const canAct = P.st === 'move' || (P.st === 'atk' && P.hitDone && P.t > P.cur.dur * .5);
  // contracorte
  if (I.light && P.contra > 0 && P.contraTgt && !P.contraTgt.dead && (P.st === 'move' || P.st === 'dodge')) {
    const e = P.contraTgt, a = Math.atan2(P.pos[0] - e.pos[0], P.pos[2] - e.pos[2]), rr = (e.rad || .5) + .9; const np = [e.pos[0] + Math.sin(a) * rr, 0, e.pos[2] + Math.cos(a) * rr];
    if (walkable(np[0], np[2])) { for (let k = 0; k < 8; k++) part(V.lerp(P.pos, np, k / 8), [0, .5, 0], .4, .3, [1, .8, .4], { al: .5 }); P.pos = np; }
    P.contra = 0; startAtk(CONTRA); CAM.zoom = 1; S.slow = .25; S.ts = .4; P.iframe = .4; icon('Contracorte!', 'gold'); I.light = false;
    const red = P.nodes.contra ? .5 : .3; for (const k in P.cd) P.cd[k] *= (1 - red); P.lume = Math.min(100, P.lume + 20);
  }
  if (P.st === 'move') {
    const run = I.run && ml > .1 && P.vig > 1; let spd = (run ? 7.4 : 4.4) * ml * (P.slow > 0 ? .55 : 1) * (typeof HERO !== 'undefined' ? HERO.spd : 1) * (typeof BOTAS !== 'undefined' ? BOTAS : 1);
    if (run) { P.vig -= 14 * dt; P.vigT = .5; }
    // velocidade com aceleração: arranca e freia aos poucos (mais natural)
    const V0 = P.vel || (P.vel = [0, 0]), tv = ml > .05 ? [mv[0] / ml * spd, mv[1] / ml * spd] : [0, 0];
    const rev = ml > .05 && (V0[0] * tv[0] + V0[1] * tv[1]) < 0; // virando para trás: freia mais forte
    const ka = 1 - Math.exp(-(ml > .05 ? (rev ? 12 : 7.5) : 11) * dt); V0[0] += (tv[0] - V0[0]) * ka; V0[1] += (tv[1] - V0[1]) * ka;
    const vl = Math.hypot(V0[0], V0[1]);
    if (vl > .03) { moveEnt(P.pos, V0[0] * dt, V0[1] * dt, .35); P.stats.moved += vl * dt; }
    if (ml > .05) { const ty = (P.lock && !P.lock.dead && !run) ? Math.atan2(P.lock.pos[0] - P.pos[0], P.lock.pos[2] - P.pos[2]) : Math.atan2(mv[0], mv[1]);
      const turn = angDiff(P.yaw, ty); P.yaw += turn * (1 - Math.exp(-(run ? 8 : 10) * dt)); P.lean = lerp(P.lean || 0, clamp(turn * vl * .045, -.16, .16), 1 - Math.exp(-6 * dt)); }
    else P.lean = lerp(P.lean || 0, 0, 1 - Math.exp(-6 * dt));
    P.sp = vl / 4.4; const dph = dt * (2.2 + vl * 1.35); P.ph += dph;
    if (P.sp > .3 && Math.floor(P.ph / Math.PI) !== Math.floor((P.ph - dph) / Math.PI)) AU.step();
  } else { P.sp *= Math.exp(-10 * dt); if (P.vel) { P.vel[0] *= Math.exp(-10 * dt); P.vel[1] *= Math.exp(-10 * dt); } P.lean = lerp(P.lean || 0, 0, 1 - Math.exp(-8 * dt)); }
  // ações
  if (canAct) {
    if (I.dodge && P.vig >= 18) { const dir = ml > .1 ? [mv[0] / ml, 0, mv[1] / ml] : [-Math.sin(P.yaw), 0, -Math.cos(P.yaw)]; P.st = 'dodge'; P.t = 0; P.dodgeDir = dir; P.iframe = .32; P.dodgeT = 0; P.vig -= 18; P.vigT = .6; P.stats.dodges++; P.yaw = ml > .1 ? Math.atan2(dir[0], dir[2]) : P.yaw; AU.whoosh(.6); }
    else if (I.light && P.st === 'move') { P.combo = 0; startAtk(ATK[0]); }
    else if (I.heavyDown && P.vig >= 12) { P.st = 'charge'; P.t = 0; P.vig -= 12; P.vigT = .6; faceTarget(); }
    else if (I.q) useQ(); else if (I.e) useE(); else if (I.r) useR(); else if (I.potion) usePotion();
  }
  if (P.st === 'atk') {
    const d = P.cur; P.t += dt;
    if (I.light && d !== CONTRA) P.buf = true;
    if (P.t < d.hit) { const s = d.step / d.hit * dt; moveEnt(P.pos, Math.sin(P.yaw) * s, Math.cos(P.yaw) * s, .35); }
    if (!P.hitDone && P.t >= d.hit) { P.hitDone = true; doHit(d); }
    if (P.t >= d.dur * .62 && P.buf && P.cur.pose !== 's4' && d !== HEAVY && d !== RUP && d !== CONTRA) { P.combo = (P.combo + 1) % 4; startAtk(ATK[P.combo]); }
    else if (P.t >= d.dur) { P.st = 'move'; P.comboT = .55; if (ATK.includes(d)) { if (d === ATK[3]) P.combo = 0; } }
    if (I.heavyDown && P.hitDone && P.combo >= 1 && P.vig >= 12 && ATK.includes(d)) { P.st = 'charge'; P.t = .0; P.vig -= 12; P.combo = 0; }
  } else if (P.st === 'charge') {
    P.t += dt; if (P.t > .35 && Math.random() < .5) part(bladeTip(r), [rnd(-1, 1), rnd(0, 2), rnd(-1, 1)], .4, .06, [1, .7, .3]);
    if (!I.heavyHeld || P.t > 1.1) { if (P.t >= .5) { startAtk(RUP); CAM.zoom = .6; } else startAtk(HEAVY); }
    if (I.dodge && P.vig >= 18) { P.st = 'move'; }
  } else if (P.st === 'dodge') {
    P.t += dt; const k = 1 - P.t / .38, s = 12 * Math.sqrt(Math.max(k, 0)) * dt; moveEnt(P.pos, P.dodgeDir[0] * s, P.dodgeDir[2] * s, .35);
    if (Math.random() < .7) part(V.add(P.pos, [rnd(-.2, .2), rnd(.3, 1.4), rnd(-.2, .2)]), [0, 0, 0], .3, .25, [1, .8, .5], { al: .25 });
    if (P.t >= .38) { P.st = 'move'; }
  } else if (P.st === 'hit') { P.t += dt; if (P.t > .35) P.st = 'move'; }
  else if (P.st === 'cast') { P.t += dt; if (P.t > .6) P.st = 'move'; }
  else if (P.st === 'qcast') { P.t += dt; if (P.t > .12 && !P.hitDone) { P.hitDone = true; spawnWave(); } if (P.t > .4) P.st = 'move'; }
  else if (P.st === 'ult') { P.t += dt; P.iframe = .1; if (P.t > .55 && !P.hitDone) { P.hitDone = true; ultImpact(); } if (P.t > 1.05) P.st = 'move'; }
  else if (P.st === 'dead') { P.t += dt; }
  // animação
  const actMap = { atk: P.cur && P.cur.pose, charge: 'charge', dodge: 'dodge', hit: 'hit', cast: 'cast', qcast: 's1', ult: 'ult', dead: 'dead' };
  const at = P.st === 'atk' ? P.t / P.cur.dur : P.st === 'qcast' ? P.t / .4 : P.st === 'ult' ? P.t / 1.05 : P.t;
  const VV = P.vel || [0, 0], lk = P.lock && !P.lock.dead && P.st === 'move';
  const fwd = VV[0] * Math.sin(P.yaw) + VV[1] * Math.cos(P.yaw), side = -VV[0] * Math.cos(P.yaw) + VV[1] * Math.sin(P.yaw);
  animAny(r, { ph: P.ph, sp: P.sp, act: actMap[P.st], t: at, ready: P.combatT > 0, side: lk ? side : null, fwd }, dt);
  P.pos[1] += (groundY(P.pos[0], P.pos[2]) - P.pos[1]) * (1 - Math.exp(-20 * dt)); r.pos = [P.pos[0], P.pos[1] + (r.yOff || 0) + (P.st === 'dead' && !r.isSkin ? .12 : 0), P.pos[2]]; r.yaw = P.yaw + (r.extraYaw || 0); r.roll = P.st === 'move' ? -(P.lean || 0) : 0; r.pitch = P.st === 'dead' && !r.isSkin ? lerp(r.pitch, -Math.PI / 2, 1 - Math.exp(-5 * dt)) : 0;
  r.flash = Math.max(0, (r.flash || 0) - dt * 4); r.emAdd = P.unl.q ? V.sc([1, .78, .4], .6 + (P.lume / 100) * 1.6 + (P.st === 'ult' || P.st === 'charge' ? 3 : 0)) : null;
  r.update();
  // rastro da lâmina
  if (['atk', 'ult', 'qcast'].includes(P.st)) { P.trail.push([bladeBase(r), bladeTip(r), .22]); }
  for (const tr of P.trail) tr[2] -= dt; while (P.trail.length && P.trail[0][2] <= 0) P.trail.shift();
  P.lume = clamp(P.lume, 0, 100); P.vig = clamp(P.vig, 0, 100);
  R.light(V.add(P.pos, [0, 1.2, 0]), V.sc([1, .8, .45], .4 + P.lume / 100 * .8), 4);
}
function drawTrail() {
  const T = P.trail; for (let k = 1; k < T.length; k++) { const a = T[k - 1], b = T[k], al = b[2] / .22;
    const col = P.cur && P.cur.kind === 'c' ? [1, .5, .3] : (typeof HERO !== 'undefined' ? HERO.cor : [1, .85, .55]);
    R.quad(a[0], a[1], b[1], b[0], col, .55 * al, 1, 0, [[0, -1], [0, 1], [0, 1], [0, -1]]); }
}
function doHit(d) {
  let any = false; const a = atk() * d.mult;
  for (const e of ENEMIES) { if (e.dead || e.spawnT > 0) continue; const dx = e.pos[0] - P.pos[0], dz = e.pos[2] - P.pos[2], dist = Math.hypot(dx, dz);
    if (dist > d.range + (e.rad || .4)) continue; if (Math.abs(angDiff(P.yaw, Math.atan2(dx, dz))) > d.arc / 2) continue;
    hurtEnemy(e, a, d.kind, d.post, { launch: d.launch, crit: d.crit, heavy: d.heavy }); any = true; }
  const dm = nearDummy();
  if (dm && V.d2(dm.pos, P.pos) < d.range + .4) { dm.shake = 1; num(V.add(dm.pos, [0, 1.8, 0]), Math.round(a), d.heavy ? 'o' : 'w'); sparks(V.add(dm.pos, [0, 1.3, 0]), [1, .8, .5], 8); any = true; P.stats.dummy++; if (d.heavy) P.stats.dummyHeavy++; AU.hit(d.heavy); }
  if (d.cuts) cutProjectiles(P.pos, d.range + .5, d.arc);
  if (d.fio) { for (let k = 0; k < 24; k++) { const an = k / 24 * 6.28; part(V.add(P.pos, [Math.sin(an) * 2.2, 1, Math.cos(an) * 2.2]), [Math.sin(an) * 2, .5, Math.cos(an) * 2], .4, .08, [1, .9, .6]); } }
  if (any) { S.hitstop = d.heavy ? .09 : .045; if (d.heavy) S.shake = .5; P.combatT = 4; }
}
function cutProjectiles(p, range, arc) { for (const pr of PROJ) { const dx = pr.p[0] - p[0], dz = pr.p[2] - p[2]; if (Math.hypot(dx, dz) < range && Math.abs(angDiff(P.yaw, Math.atan2(dx, dz))) <= arc / 2 + .2) { pr.life = 0; num(pr.p, 'Cortado!', 'g'); sparks(pr.p, [1, .85, .5], 10); P.lume += 6; AU.thread(); } } }
function useQ() { if (!P.unl.q) { icon('Corte de Fio ainda bloqueado'); return; } if (P.cd.q > 0 || P.lume < 18) { icon(P.cd.q > 0 ? 'Recarga' : 'Lume insuficiente'); return; } P.lume -= 18; P.cd.q = P.nodes.afiado ? 4.5 : 6; P.st = 'qcast'; P.t = 0; P.hitDone = false; faceTarget(); AU.whoosh(1.4); AU.thread(); }
function useE() { if (!P.unl.e) { icon('Recostura Leve ainda bloqueada'); return; } if (P.cd.e > 0 || P.lume < 25) { icon(P.cd.e > 0 ? 'Recarga' : 'Lume insuficiente'); return; } P.lume -= 25; P.cd.e = 12; P.st = 'cast'; P.t = 0; const a = maxHp() * (P.nodes.recostura ? .4 : .25); P.heal = { amt: a, left: a, dur: 1 }; AU.heal(); }
function useR() { if (!P.unl.r) { icon('Rasgo Dourado ainda bloqueado'); return; } if (P.lume < 100 || P.cd.r > 0) { icon('Precisa da barra de lume cheia'); return; } P.lume = 0; P.cd.r = 8; P.st = 'ult'; P.t = 0; P.hitDone = false; faceTarget(); CAM.zoom = 1.2; AU.whoosh(.5); AU.thread(); }
function usePotion() { if (P.potions <= 0) { icon('Sem poções'); return; } if (P.hp >= maxHp()) { icon('Vida cheia'); return; } P.potions--; P.heal = { amt: maxHp() * .35, left: maxHp() * .35, dur: .5 }; P.st = 'cast'; P.t = .2; AU.heal(); }
const WAVES = [];
function spawnWave() { const d = [Math.sin(P.yaw), 0, Math.cos(P.yaw)]; WAVES.push({ p: V.add(P.pos, [d[0] * .8, 1, d[2] * .8]), d, t: 0, hit: new Set(), dmg: atk() * 2.4 * (P.nodes.afiado ? 1.3 : 1) }); }
function updWaves(dt) {
  for (let i = WAVES.length - 1; i >= 0; i--) { const w = WAVES[i]; w.t += dt; w.p = V.add(w.p, V.sc(w.d, 16 * dt)); if (w.t > .55) { WAVES.splice(i, 1); continue; }
    const side = [w.d[2], 0, -w.d[0]], al = 1 - w.t / .55;
    for (let k = -5; k < 5; k++) { const a = V.add(w.p, V.add(V.sc(side, k * .26), V.sc(w.d, -Math.pow(k / 5, 2) * .6))), b = V.add(w.p, V.add(V.sc(side, (k + 1) * .26), V.sc(w.d, -Math.pow((k + 1) / 5, 2) * .6))); R.beam(a, b, .14, [1, .92, .7], al); R.beam(a, b, .6, [1, .7, .35], .25 * al); }
    for (const e of ENEMIES) { if (e.dead || w.hit.has(e) || e.spawnT > 0) continue; if (V.d2(e.pos, w.p) < 1.4 + (e.rad || .4)) { w.hit.add(e); hurtEnemy(e, w.dmg, 'p', 26, { mark: true }); } }
    for (const pr of PROJ) if (V.d2(pr.p, w.p) < 1.6) { pr.life = 0; num(pr.p, 'Cortado!', 'g'); P.lume += 6; }
    const dm = nearDummy(); if (dm && V.d2(dm.pos, w.p) < 1.5 && !w.hit.has(dm)) { w.hit.add(dm); dm.shake = 1; num(V.add(dm.pos, [0, 1.8, 0]), Math.round(w.dmg), 'p'); }
    R.light(w.p, [2, 1.5, .8], 5); }
}
function ultImpact() {
  const c = V.add(P.pos, [Math.sin(P.yaw) * 1.2, 0, Math.cos(P.yaw) * 1.2]); S.shake = 1.2; S.hitstop = .12; S.slow = .3; S.ts = .35; AU.hit(true); AU.clang();
  for (let k = 0; k < 80; k++) { const a = rnd(0, 6.28), sp = rnd(3, 10); part([c[0], .3, c[2]], [Math.sin(a) * sp, rnd(1, 6), Math.cos(a) * sp], rnd(.4, .9), rnd(.06, .14), [1, .85, .5], { drag: 2.5 }); }
  ULT.push({ p: c, t: 0 });
  for (const e of ENEMIES) { if (e.dead || e.spawnT > 0) continue; if (V.d2(e.pos, c) < 6.5 + (e.rad || 0)) hurtEnemy(e, atk() * 6.5, 'p', 90, { launch: true }); }
  cutProjectiles(c, 7, 6.3);
}
const ULT = [];
function updUlt(dt) { for (let i = ULT.length - 1; i >= 0; i--) { const u = ULT[i]; u.t += dt; if (u.t > 1.2) { ULT.splice(i, 1); continue; } const k = u.t / 1.2;
  R.ring(u.p[0], u.p[2], 6.5 * Math.min(1, u.t * 4), .5, [1, .8, .4], (1 - k)); R.disc(u.p[0], u.p[2], 6.5 * Math.min(1, u.t * 4), [1, .7, .3], .25 * (1 - k));
  for (let j = 0; j < 6; j++) { const a = j / 6 * 6.28 + u.t; R.beam([u.p[0], 0, u.p[2]], [u.p[0] + Math.sin(a) * 2, 8 * (1 - k), u.p[2] + Math.cos(a) * 2], .2, [1, .9, .6], 1 - k); }
  R.light([u.p[0], 2, u.p[2]], V.sc([1, .8, .5], 6 * (1 - k)), 14); } }
function toggleLock() { if (P.lock) { P.lock = null; return; } P.lock = nearestEnemy(22, true) || nearestEnemy(14); if (P.lock) AU.ui(); }
function switchLock(dir) { const L = ENEMIES.filter(e => !e.dead && e.spawnT <= 0 && V.d2(e.pos, P.pos) < 22).sort((a, b) => Math.atan2(a.pos[0] - P.pos[0], a.pos[2] - P.pos[2]) - Math.atan2(b.pos[0] - P.pos[0], b.pos[2] - P.pos[2])); if (L.length < 2) return; const i = L.indexOf(P.lock); P.lock = L[(i + dir + L.length) % L.length]; }
function hurtPlayer(dmg, src) {
  if (P.st === 'dead' || S.mode !== 'play') return false;
  if (P.iframe > 0) { if (P.dodgeT < .22 && src) { perfectDodge(src); } return false; }
  if (P.mercy > 0) return false;
  dmg = Math.round(dmg * rnd(.92, 1.08)); P.hp -= dmg; P.mercy = .35; P.combatT = 4; num(V.add(P.pos, [0, 1.9, 0]), dmg, 'r'); AU.hurt(); S.shake = .5; $('hurt').style.opacity = .7; setTimeout(() => $('hurt').style.opacity = 0, 120);
  P.rig.flash = .6;
  if (P.hp <= 0) { P.hp = 0; P.st = 'dead'; P.t = 0; S.slow = 1.2; S.ts = .3; MIS.onDeath(); return true; }
  if (!['ult'].includes(P.st) && !(P.st === 'atk' && P.cur.armor)) { P.st = 'hit'; P.t = 0; if (src) { const d = V.norm(V.sub(P.pos, src.pos)); moveEnt(P.pos, d[0] * .5, d[2] * .5, .35); } }
  return true;
}
function perfectDodge(src) { if (P.contra > 0) return; P.contra = 1.1; P.contraTgt = src; S.slow = P.nodes.contra ? .7 : .5; S.ts = .3; P.lume = Math.min(100, P.lume + 15); icon('Esquiva perfeita!', 'gold'); AU.chime(); CAM.zoom = .5;
  for (let k = 0; k < 20; k++) part(V.add(P.pos, [0, 1, 0]), [rnd(-3, 3), rnd(0, 3), rnd(-3, 3)], .5, .07, [1, .9, .6]); }

// ================= INIMIGOS =================
const ENEMIES = [], PROJ = [], FOGS = [];
const EDEF = {
  tecelao: { hp: 62, post: 40, dmg: 12, spd: 2.9, rad: .45, xp: 30, name: 'Tecelão Caído' },
  fieira: { hp: 44, post: 28, dmg: 10, spd: 2.8, rad: .4, xp: 35, name: 'Fieira' },
  larva: { hp: 18, post: 8, dmg: 5, spd: 4.4, rad: .35, xp: 10, name: 'Larva de Névoa' },
  filhote: { hp: 150, post: 60, dmg: 9, spd: 5.4, rad: .6, xp: 40, name: 'Cão menor' },
  bruta: { hp: 170, post: 90, dmg: 20, spd: 2.1, rad: .7, xp: 70, name: 'Costura-Bruta', scale: 1.38 },
  saltador: { hp: 52, post: 30, dmg: 14, spd: 4.4, rad: .45, xp: 45, name: 'Saltador de Fenda', scale: .92 },
  irma: { hp: 1280, post: 260, dmg: 17, spd: 4.4, rad: 1.1, xp: 450, name: 'Rasga-Dobra', boss: true, scale: 1.12 },
  cao: { hp: 950, post: 220, dmg: 14, spd: 4.2, rad: 1.2, xp: 300, name: 'Fera de Fios Rotos', boss: true },
};
let EID = 0;
function spawn(type, x, z, o = {}) {
  const d = EDEF[type]; const e = { id: EID++, type, d, pos: [x, 0, z], yaw: Math.atan2(P.pos[0] - x, P.pos[2] - z), hp: d.hp, maxhp: d.hp, post: d.post, maxpost: d.post, st: 'chase', t: 0, cd: rnd(.6, 1.6), ph: rnd(0, 6), sp: 0,
    flash: 0, stun: 0, y: 0, vy: 0, dead: false, deadT: 0, rad: d.rad, boss: !!d.boss, spawnT: o.instant ? 0 : .8, aggro: o.aggro || 30, seg: [] };
  if (type === 'tecelao') e.rig = CAST.tecelao(); else if (type === 'fieira') e.rig = CAST.fieira(); else if (type === 'cao') e.rig = MODELS.warrok ? CAST.warrok() : dogRig(1.7); else if (type === 'filhote') e.rig = MODELS.parasita ? CAST.parasita() : dogRig(.78);
  else if (type === 'bruta') { e.rig = CAST.tecelao(); e.rig.tint = [lin(0x7a756c), .5]; } else if (type === 'saltador') { e.rig = MODELS.parasita ? CAST.parasita() : CAST.fieira(); if (!MODELS.parasita) e.rig.tint = [lin(0x6a7a58), .4]; } else if (type === 'irma') { e.rig = MODELS.mutante ? CAST.mutante() : CAST.mireia(); if (!MODELS.mutante) e.rig.tint = [lin(0x3a2040), .55]; }
  e.baseScale = d.scale || 1; e.human = ['tecelao', 'fieira', 'bruta', 'saltador', 'irma'].includes(type) || (e.rig && e.rig.isSkin);
  if (type === 'irma' && MODELS.mutante) e.baseScale = 1; if (type === 'cao' && e.rig.isSkin) e.baseScale = 1.15; if (type === 'filhote' && e.rig.isSkin) e.baseScale = .72; if (type === 'saltador' && MODELS.parasita) e.baseScale = .95;
  if (MIS.cur >= 3 && !d.boss) { const k = ['tecelao', 'fieira', 'larva'].includes(type) ? 1.25 : 1; e.hp = e.maxhp = Math.round(d.hp * k); e.dmgMul = 1.15; e.cdMul = .85; }
  if (o.elite) { e.hp = e.maxhp = e.maxhp * 2; e.post = e.maxpost = e.maxpost * 1.6; e.baseScale *= 1.18; e.elite = true; e.dmgMul = (e.dmgMul || 1) * 1.2; }
  if (e.rig) e.rig.yaw = e.yaw;
  if (e.boss) { e.fury = false; e.nextSummon = 14; e.rad = 1.3; }
  e.pos[1] = groundY(x, z); const gy0 = e.pos[1]; ENEMIES.push(e); puff([x, gy0 + .2, z], [.5, .3, .55], 10, .6, .35); for (let k = 0; k < 14; k++) part([x, gy0 + rnd(0, 2), z], [rnd(-1, 1), rnd(1, 3), rnd(-1, 1)], .8, .06, [.95, .3, .6]);
  return e;
}
function hurtEnemy(e, base, kind, post, o = {}) {
  if (e.dead || e.spawnT > 0) return;
  if (e.inv) { num(V.add(e.pos, [0, 2.2, 0]), 'Imune', 'i'); return; }
  const crit = o.crit || Math.random() < .1, broken = e.stun > 0;
  const dmg = Math.max(1, Math.round(base * (crit ? 1.8 : 1) * (broken ? 1.5 : 1) * rnd(.92, 1.08)));
  e.hp -= dmg; e.flash = 1; P.hits++; P.hitT = 2; P.combatT = 4; P.lume = Math.min(100, P.lume + (kind === 'p' ? 2 : 5));
  const h = e.boss ? 2.6 * (e.rig.scale / 1.7) : e.type === 'larva' ? .7 : 2;
  num(V.add(e.pos, [0, h, 0]), dmg, crit ? 'c' : kind, crit || kind === 'p');
  sparks(V.add(e.pos, [0, h * .55, 0]), crit ? [1, .4, .3] : [1, .8, .5], crit ? 16 : 9); AU.hit(o.heavy || crit);
  if (!broken) { e.post -= post; if (e.post <= 0) { e.stun = e.boss ? 3.2 : 2.5; e.post = e.maxpost; e.st = 'stun'; e.t = 0; num(V.add(e.pos, [0, h + .5, 0]), 'Quebra de postura', 'g', true); icon('Postura quebrada!', 'gold'); S.hitstop = .12; AU.clang(); CAM.zoom = .4; } }
  const armor = (e.type === 'bruta' && (e.st === 'wind' || e.st === 'atk')) || (e.type === 'saltador' && (e.st === 'leap' || e.st === 'leapW'));
  if (e.markT > 0) e.hp -= Math.round(dmg * .25);
  if (o.mark && P.nodes.elemental) e.markT = 5;
  if (!e.boss && !broken && e.type !== 'filhote' && !armor) { e.st = 'hurt'; e.t = 0; const d = V.norm(V.sub(e.pos, P.pos)); moveEnt(e.pos, d[0] * (o.heavy ? 1.2 : .35), d[2] * (o.heavy ? 1.2 : .35), e.rad); }
  if (o.launch && !e.boss && e.type !== 'filhote' && e.type !== 'bruta' && !armor) { e.vy = 6.5; e.y = Math.max(e.y, .01); }
  if (e.boss && !e.fury && e.hp <= e.maxhp * .5) { e.hp = Math.ceil(e.maxhp * .5); if (e.type === 'irma') irmaFury(e); else bossFury(e); }
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  e.dead = true; e.deadT = 0; e.hp = 0; gainXP(e.d.xp, V.add(e.pos, [0, 2.6, 0])); if (P.lock === e) P.lock = null;
  for (let k = 0; k < 30; k++) part(V.add(e.pos, [0, 1, 0]), [rnd(-3, 3), rnd(0, 4), rnd(-3, 3)], rnd(.4, 1), .07, [.95, .35, .6]);
  if (e.type === 'larva') { FOGS.push({ p: [...e.pos], r: 2.2, t: 2.6 }); puff(e.pos, [.6, .6, .68], 14, .9, .35); }
  if (e.boss) MIS.bossDead = true;
}
function meleeTokens() { return ENEMIES.filter(e => !e.dead && (e.st === 'wind' || e.st === 'atk') && e.type !== 'fieira').length; }
function enemyHitCheck(e, range, arc, dmg) { const dx = P.pos[0] - e.pos[0], dz = P.pos[2] - e.pos[2], d = Math.hypot(dx, dz); if (d > range + .35) return false; if (Math.abs(angDiff(e.yaw, Math.atan2(dx, dz))) > arc / 2) return false; return hurtPlayer(dmg, e) || true; }
function faceP(e, dt, rate = 6) { const ty = Math.atan2(P.pos[0] - e.pos[0], P.pos[2] - e.pos[2]); e.yaw += angDiff(e.yaw, ty) * (1 - Math.exp(-rate * dt)); }
function enemyUpdate(e, dt) {
  e.pos[1] = groundY(e.pos[0], e.pos[2]);
  e.flash = Math.max(0, e.flash - dt * 5);
  if (e.dead) { e.deadT += dt; return; }
  if (e.spawnT > 0) { e.spawnT -= dt; return; }
  const d = V.d2(e.pos, P.pos), pd = P.st === 'dead';
  if (e.y > 0 || e.vy > 0) { e.vy -= 18 * dt; e.y += e.vy * dt; if (e.y <= 0) { e.y = 0; e.vy = 0; if (e.st !== 'stun') { e.st = 'hurt'; e.t = -.3; } puff(e.pos, [.5, .45, .4], 4, .4, .2); } }
  if (e.stun > 0) { e.stun -= dt; e.st = 'stun'; if (e.stun <= 0) { e.st = 'chase'; e.cd = .5; } }
  // proteções do chefe: nunca fica imune fora do rugido, nunca sai da arena nem fica preso no ar
  if (e.inv && e.st !== 'roar' && S.mode === 'play') e.inv = false;
  if (e.boss) { if (!isFinite(e.pos[0]) || !isFinite(e.pos[2])) { const c = W.confine && W.confine.c ? W.confine.c : [P.pos[0], P.pos[2] - 4]; e.pos[0] = c[0]; e.pos[2] = c[1]; }
    if (W.confine && W.confine.c) { const c = W.confine.c, dd = Math.hypot(e.pos[0] - c[0], e.pos[2] - c[1]); if (dd > W.confine.r + 2.5) { e.pos[0] = c[0] + (e.pos[0] - c[0]) / dd * (W.confine.r - 2); e.pos[2] = c[1] + (e.pos[2] - c[1]) / dd * (W.confine.r - 2); } }
    e.airT = e.y > .05 ? (e.airT || 0) + dt : 0; if (e.airT > 4 && e.st !== 'jump') { e.y = 0; e.vy = 0; e.airT = 0; } }
  e.t += dt; e.cd -= dt;
  e.markT = (e.markT || 0) - dt;
  if (e.type === 'cao' || e.type === 'filhote') return dogAI(e, dt, d, pd);
  if (e.type === 'bruta') return bruteAI(e, dt, d, pd);
  if (e.type === 'saltador') return saltAI(e, dt, d, pd);
  if (e.type === 'irma') return irmaAI(e, dt, d, pd);
  const D = e.d; let mv = 0;
  if (e.st === 'hurt') { if (e.t > .32) e.st = 'chase'; }
  else if (e.st === 'stun') { }
  else if (pd) { mv = 0; }
  else if (e.type === 'tecelao' || e.type === 'larva') {
    const R0 = e.type === 'larva' ? 1.0 : 1.8;
    if (e.st === 'chase') {
      faceP(e, dt, 7);
      if (d > R0) { const sp = D.spd * (d > e.aggro ? 0 : 1); e.mv = sp; mv = sp; }
      else if (e.cd <= 0 && meleeTokens() < 2) { e.st = 'wind'; e.t = 0; }
      else { // rodeia
        const side = (e.id % 2 ? 1 : -1), a = e.yaw + Math.PI / 2 * side; moveEnt(e.pos, Math.sin(a) * 1.2 * dt, Math.cos(a) * 1.2 * dt, e.rad); e.sp = .3; }
    } else if (e.st === 'wind') { faceP(e, dt, 4); const wd = e.type === 'larva' ? .35 : .6;
      if (Math.random() < .5) { const tp = e.rig ? bladeTip(e.rig) : V.add(e.pos, [0, .5, 0]); part(tp, [0, .3, 0], .2, .12, [1, .35, .2]); }
      if (e.t > wd) { e.st = 'atk'; e.t = 0; e.hit = false; AU.whoosh(.8); } }
    else if (e.st === 'atk') { const ad = e.type === 'larva' ? .3 : .45; if (e.t < .15) { const s = (e.type === 'larva' ? 6 : 12) * dt; moveEnt(e.pos, Math.sin(e.yaw) * s, Math.cos(e.yaw) * s, e.rad); }
      if (!e.hit && e.t > .12) { e.hit = true; enemyHitCheck(e, e.type === 'larva' ? 1.1 : 2.0, 1.6, D.dmg * (e.dmgMul || 1)); if (e.type === 'larva') AU.bite(); }
      if (e.t > ad + .4) { e.st = 'chase'; e.cd = e.type === 'larva' ? rnd(.9, 1.5) : rnd(1.3, 2.3); } }
  } else if (e.type === 'fieira') {
    faceP(e, dt, 6);
    if (e.st === 'chase') { if (d > 10) mv = D.spd; else if (d < 6) mv = -D.spd * .8; else { const a = e.yaw + Math.PI / 2 * (e.id % 2 ? 1 : -1); moveEnt(e.pos, Math.sin(a) * dt, Math.cos(a) * dt, e.rad); }
      if (e.cd <= 0 && d < 15) { e.st = 'wind'; e.t = 0; } }
    else if (e.st === 'wind') { for (const h of ['handL', 'handR']) part(e.rig.wp(h), [0, .5, 0], .25, .12, [.95, .3, .65]); if (e.t > .65) { e.st = 'atk'; e.t = 0;
      const o = V.lerp(e.rig.wp('handL'), e.rig.wp('handR'), .5), dir = V.norm(V.sub(V.add(P.pos, [0, 1.1, 0]), o)); PROJ.push({ p: o, v: V.sc(dir, 7.5), dmg: D.dmg * (e.dmgMul || 1), life: 3, src: e, tr: [] }); AU.thread(); } }
    else if (e.st === 'atk') { if (e.t > .5) { e.st = 'chase'; e.cd = rnd(2.2, 3.2); } }
  }
  if (mv) { const s = mv * dt; moveEnt(e.pos, Math.sin(e.yaw) * s, Math.cos(e.yaw) * s, e.rad); e.sp = Math.abs(mv) / 4; } else if (e.st !== 'chase') e.sp *= .8; else if (!mv) e.sp *= .9;
  e.ph += dt * (2 + Math.abs(mv) * 1.8);
}
function separate() { for (let i = 0; i < ENEMIES.length; i++) { const a = ENEMIES[i]; if (a.dead) continue; for (let j = i + 1; j < ENEMIES.length; j++) { const b = ENEMIES[j]; if (b.dead) continue; const dx = b.pos[0] - a.pos[0], dz = b.pos[2] - a.pos[2], d = Math.hypot(dx, dz), m = a.rad + b.rad;
  if (d < m && d > 0) { const p = (m - d) / 2; a.pos[0] -= dx / d * p; a.pos[2] -= dz / d * p; b.pos[0] += dx / d * p; b.pos[2] += dz / d * p; } }
  const dx = P.pos[0] - a.pos[0], dz = P.pos[2] - a.pos[2], d = Math.hypot(dx, dz), m = a.rad + .35; if (d < m && d > 0 && P.st !== 'dodge') { const p = m - d, ox = P.pos[0], oz = P.pos[2]; P.pos[0] += dx / d * p * .5; P.pos[2] += dz / d * p * .5; if (!walkable(P.pos[0], P.pos[2])) { P.pos[0] = ox; P.pos[2] = oz; } a.pos[0] -= dx / d * p * .5; a.pos[2] -= dz / d * p * .5; } } }
// ---------- chefe ----------
function bossFury(e) {
  e.stun = 0; e.fury = true; e.st = 'roar'; e.t = 0; e.inv = true; AU.stinger(); AU.roar(); S.shake = 1.5; CAM.zoom = 1; banner('FÚRIA', 'O Cão de Fios Rotos se rasga por dentro', 'fury');
  $('bossbar').classList.add('fury');
  setTimeout(() => { if (!e.dead) { spawn('filhote', e.pos[0] + 4, e.pos[2] + 2); spawn('filhote', e.pos[0] - 4, e.pos[2] + 2); } }, 900);
}
function dogAI(e, dt, d, pd) {
  const fm = e.fury ? 1.28 : 1, D = e.d, boss = e.boss; let mv = 0;
  if (e.boss && !e.rig.isSkin) { const ts = e.fury ? 2.2 : 1.7; e.rig.scale += (ts - e.rig.scale) * (1 - Math.exp(-2 * dt)); }
  if (e.boss && e.rig.isSkin) e.baseScale += ((e.fury ? 1.4 : 1.15) - e.baseScale) * (1 - Math.exp(-2 * dt));
  if (e.st === 'stun' || e.st === 'hurt') { if (e.st === 'hurt' && e.t > .3) e.st = 'chase'; }
  else if (e.st === 'roar') { if (e.t > 1.7) { e.st = 'chase'; e.inv = false; e.cd = .5; } if (Math.random() < .8) part(V.add(e.pos, [rnd(-1, 1), rnd(1, 3), rnd(-1, 1)]), [rnd(-4, 4), rnd(1, 5), rnd(-4, 4)], .7, .1, [1, .35, .5]); }
  else if (pd) { }
  else if (e.st === 'chase') {
    faceP(e, dt, 5 * fm);
    if (d > (boss ? 3.0 : 1.6)) mv = D.spd * fm * (boss && d > 9 ? 1.3 : 1);
    if (boss) { e.nextSummon -= dt; }
    if (e.cd <= 0) {
      if (boss && e.fury && Math.random() < .35 && d < 9) { e.st = 'whipW'; e.t = 0; AU.roar(); }
      else if (boss && d > 6.5 && Math.random() < .6) { e.st = 'chargeW'; e.t = 0; e.cdir = Math.atan2(P.pos[0] - e.pos[0], P.pos[2] - e.pos[2]); }
      else if (boss && d > 4 && d < 11 && Math.random() < .45) { e.st = 'pullW'; e.t = 0; }
      else if (boss && e.nextSummon <= 0 && !e.fury) { e.st = 'howl'; e.t = 0; e.nextSummon = 16; AU.roar(); }
      else if (d < (boss ? 3.6 : 1.9)) { e.st = 'biteW'; e.t = 0; e.bites = boss ? 2 : 1; }
    }
  }
  else if (e.st === 'biteW') { faceP(e, dt, 8); if (e.t > (boss ? .5 : .4) / fm) { e.st = 'bite'; e.t = 0; e.hit = false; AU.bite(); } if (Math.random() < .5) part(e.rig.wp('head', [0, 0, .6]), [0, .5, 0], .2, .15, [1, .3, .3]); }
  else if (e.st === 'bite') { if (e.t < .18) { const s = (boss ? 14 : 9) * dt; moveEnt(e.pos, Math.sin(e.yaw) * s, Math.cos(e.yaw) * s, e.rad); }
    if (!e.hit && e.t > .14) { e.hit = true; enemyHitCheck(e, boss ? (e.rig.isSkin ? 2.6 * e.baseScale : 3.0 * e.rig.scale / 1.7) : 1.6, 1.8, D.dmg * (e.fury ? 1.15 : 1)); }
    if (e.t > .55) { e.bites--; if (e.bites > 0) { e.st = 'biteW'; e.t = .25; } else { e.st = 'chase'; e.cd = rnd(.9, 1.6) / fm; } } }
  else if (e.st === 'chargeW') { const tel = (e.fury ? .7 : .95); e.yaw += angDiff(e.yaw, e.cdir) * .3; if (e.t < tel * .6) e.cdir = Math.atan2(P.pos[0] - e.pos[0], P.pos[2] - e.pos[2]);
    R.flat(e.pos[0] + Math.sin(e.cdir) * 9, e.pos[2] + Math.cos(e.cdir) * 9, e.cdir, 18, 3.2, [1, .15, .1], .35 + .3 * Math.sin(e.t * 30));
    if (e.t > tel) { e.st = 'charge'; e.t = 0; e.hit = false; AU.roar(); } }
  else if (e.st === 'charge') { const s = 19 * dt; const ox = e.pos[0], oz = e.pos[2]; moveEnt(e.pos, Math.sin(e.cdir) * s, Math.cos(e.cdir) * s, e.rad); e.yaw = e.cdir; e.sp = 2;
    if (Math.random() < .7) puff(e.pos, [.5, .42, .36], 1, .7, .3);
    if (!e.hit && V.d2(e.pos, P.pos) < 2.2) { e.hit = true; if (hurtPlayer(19 * (e.fury ? 1.15 : 1), e) && P.st !== 'dead') { const dd = V.norm(V.sub(P.pos, e.pos)); moveEnt(P.pos, dd[0] * 2.5, dd[2] * 2.5, .35); } }
    const stuck = Math.hypot(e.pos[0] - ox, e.pos[2] - oz) < s * .3;
    if (e.t > 1.0 || stuck) { e.st = 'chase'; e.cd = rnd(1, 1.8) / fm; if (stuck) { S.shake = .6; puff(e.pos, [.5, .45, .4], 10, 1, .3); } } }
  else if (e.st === 'pullW') { faceP(e, dt, 6); const m = e.rig.wp('head', [0, -.1, .7]);
    R.beam(m, V.add(P.pos, [0, 1.1, 0]), .05 + e.t * .05, [1, .3, .55], .3 + e.t * .5);
    if (e.t > .75 / fm) { e.st = 'pull'; e.t = 0; if (P.iframe > 0) { if (P.dodgeT < .25) perfectDodge(e); } else if (P.st !== 'dead') { P.pull = { to: [...e.pos], t: .4 }; hurtPlayer(6, e); e.cd = 0; } } }
  else if (e.st === 'pull') { R.beam(e.rig.wp('head', [0, -.1, .7]), V.add(P.pos, [0, 1.1, 0]), .12, [1, .4, .6], 1 - e.t * 2); if (e.t > .4) { e.st = P.pull ? 'biteW' : 'chase'; e.t = 0; e.bites = 1; e.cd = .8; } }
  else if (e.st === 'howl') { if (e.t > 1.2) { e.st = 'chase'; e.cd = 1; spawn('larva', e.pos[0] + 3, e.pos[2] + 2); spawn('larva', e.pos[0] - 3, e.pos[2] + 2); } }
  else if (e.st === 'whipW') { const rr = 6.8; R.ring(e.pos[0], e.pos[2], rr, .35, [1, .15, .1], .6); R.disc(e.pos[0], e.pos[2], rr * Math.min(1, e.t / .9), [1, .1, .1], .2);
    if (e.t > .9) { e.st = 'whip'; e.t = 0; S.shake = .9; AU.hit(true); if (V.d2(P.pos, e.pos) < rr) hurtPlayer(20, e);
      for (let k = 0; k < 40; k++) { const a = k / 40 * 6.28; part([e.pos[0] + Math.sin(a) * rr, .5, e.pos[2] + Math.cos(a) * rr], [Math.sin(a) * 2, 2, Math.cos(a) * 2], .5, .1, [1, .4, .55]); } } }
  else if (e.st === 'whip') { if (e.t > .7) { e.st = 'chase'; e.cd = rnd(.8, 1.4); } }
  if (mv) { const s = mv * dt; moveEnt(e.pos, Math.sin(e.yaw) * s, Math.cos(e.yaw) * s, e.rad); }
  e.sp += ((e.st === 'charge' ? 2 : mv / 4) - e.sp) * (1 - Math.exp(-8 * dt)); e.ph += dt * (3 + (e.st === 'charge' ? 22 : mv * 2.2));
}
function enemyDraw(e, dt) {
  const fade = e.dead ? clamp(1 - e.deadT / 2, 0, 1) : 1; if (fade <= 0) return;
  const sc = e.spawnT > 0 ? 1 - e.spawnT / .8 : 1;
  if (e.type === 'larva') {
    const segs = 6, wig = e.ph * 3; let p = [...e.pos]; const f = [Math.sin(e.yaw), Math.cos(e.yaw)];
    for (let k = 0; k < segs; k++) { const s = (.42 - k * .045) * sc * (e.dead ? fade : 1), off = Math.sin(wig - k * .9) * .12, lift = e.st === 'wind' && k < 2 ? .3 - k * .1 : 0;
      const q = [e.pos[0] - f[0] * k * .25 + f[1] * off, (e.pos[1] || 0) + s * .45 + lift + (e.dead ? -e.deadT * .2 : 0), e.pos[2] - f[1] * k * .25 - f[0] * off];
      R.draw(MESH.sph, M.trs(q[0], q[1], q[2], e.yaw, 0, 0, s, s * .8, s * 1.1), V.lerp(lin(0x8a8a96), lin(0xc8a8c8), k / segs), { flash: e.flash * .6, spec: .8, em: k === 0 ? [.4, .1, .25] : [0, 0, 0] }); }
    return;
  }
  const r = e.rig; if (!r) return;
  if (e.human) {
    const AM = { tecelao: { wind: 'fwind', atk: 'hv' }, fieira: { wind: 'fcast', atk: 'fcast' }, bruta: { wind: 'bwind', atk: 'batk' }, saltador: { leapW: 'fwind', leap: 'leap', atk: 'hv' },
      irma: { comboW: 's1', combo: 's3', rasgoW: 's4', dashW: 'charge', dash: 's2', roar: 'fwind', jumpW: 'fwind', jump: 'leap', land: 'hv' },
      cao: { biteW: 'bwind', bite: 'batk', chargeW: 'fwind', howl: 'fwind', pullW: 'fcast', pull: 'fcast', whipW: 'bwind', whip: 'batk', roar: 'fwind' },
      filhote: { biteW: 'bwind', bite: 'batk', chargeW: 'fwind', pullW: 'fcast', pull: 'fcast' } }[e.type] || {};
    const actM = { hurt: 'hit', stun: 'kneel', ...AM };
    animAny(r, { ph: e.ph, sp: e.sp, act: e.dead ? 'dead' : actM[e.st], t: e.at != null ? e.at : e.st === 'atk' ? .45 + e.t * 1.2 : e.t, ready: true }, dt);
    r.pos = [e.pos[0], (e.pos[1] || 0) + (r.yOff || 0) + e.y + (e.dead ? (r.isSkin ? (e.deadT > 1.5 ? -(e.deadT - 1.5) * .5 : 0) : .1 - e.deadT * .3) : 0), e.pos[2]]; r.yaw = e.yaw; r.pitch = e.dead && !r.isSkin ? lerp(r.pitch, -Math.PI / 2, 1 - Math.exp(-6 * dt)) : 0;
    r.scale = sc * (e.baseScale || 1); r.flash = e.flash * .5; r.emAdd = e.markT > 0 ? [1.4, 1.1, .5] : [.8, .15, .4]; r.update(); r.draw();
    if (e.markT > 0) R.ring(e.pos[0], e.pos[2], .9, .08, [1, .85, .5], .8);
    // fios rompidos
    const ch = r.wp('torso', [0, .4, 0]); for (let k = 0; k < 3; k++) { const a = k * 2.1 + S.time; R.beam(ch, V.add(ch, [Math.sin(a) * .5, -.4 - k * .2, Math.cos(a) * .5]), .03, [.95, .3, .6], .8 * fade); }
  } else {
    const actM = { biteW: 'wind', bite: 'bite', chargeW: 'wind', howl: 'howl', pullW: 'bite', pull: 'bite', whipW: 'whip', whip: 'whip', stun: 'stun', roar: 'howl' };
    animDog(r, { ph: e.ph, sp: e.sp, act: e.dead ? 'dead' : actM[e.st], t: e.st === 'bite' ? .35 + e.t : e.t }, dt);
    const baseS = e.boss ? r.scale : .78; r.pos = [e.pos[0], (e.pos[1] || 0) + (r.yOff || 0) * baseS + (e.dead ? -e.deadT * .25 : 0), e.pos[2]]; r.yaw = e.yaw; r.roll = e.dead ? lerp(r.roll, 1.5, 1 - Math.exp(-3 * dt)) : 0;
    if (!e.boss) r.scale = .78 * sc; r.flash = e.flash * .5; r.emAdd = e.fury ? [1.5, .3, .6] : [.5, .1, .3]; r.update(); r.draw();
    const body = r.wp('body', [0, .3, 0]); const n = e.boss ? 7 : 3;
    for (let k = 0; k < n; k++) { const a = k * .9 + S.time * 1.3, z0 = (k / n - .5) * 1.2; const s = r.by.body.W; const p0 = M.xf(s, [0, .3, z0]); R.beam(p0, V.add(p0, [Math.sin(a) * .9 * baseS, .6 + Math.sin(a * 2) * .4, Math.cos(a) * .9 * baseS]), .04 * baseS, e.fury ? [1, .3, .4] : [.95, .35, .6], .9 * fade); }
    if (e.fury && !e.dead) { for (let k = 0; k < 2; k++) part(V.add(body, [rnd(-1.5, 1.5), rnd(-.5, 1), rnd(-1.5, 1.5)]), [0, 1.5, 0], .6, .12, [1, .3, .35], { al: .7 }); R.light(body, [2.5, .5, .9], 9); }
    else if (!e.dead) R.light(body, [1, .25, .55], 6);
  }
}
function updProj(dt) {
  for (let i = PROJ.length - 1; i >= 0; i--) { const q = PROJ[i]; q.life -= dt; if (q.life <= 0) { PROJ.splice(i, 1); continue; }
    const to = V.norm(V.sub(V.add(P.pos, [0, 1.1, 0]), q.p)), sp = V.len(q.v); q.v = V.sc(V.norm(V.lerp(V.norm(q.v), to, 1.2 * dt)), sp);
    q.tr.push([...q.p]); if (q.tr.length > 8) q.tr.shift(); q.p = V.add(q.p, V.sc(q.v, dt));
    if (V.len(V.sub(q.p, V.add(P.pos, [0, 1.1, 0]))) < .7) { q.life = 0; if (hurtPlayer(q.dmg, q.src)) { } else if (P.iframe > 0) { } }
    R.pt(q.p, .22, [1, .35, .7], 1); R.pt(q.p, .6, [.9, .2, .5], .3); for (let k = 1; k < q.tr.length; k++) R.beam(q.tr[k - 1], q.tr[k], .07, [1, .4, .7], k / q.tr.length);
    R.light(q.p, [1.2, .3, .7], 4); }
  for (let i = FOGS.length - 1; i >= 0; i--) { const f = FOGS[i]; f.t -= dt; if (f.t <= 0) { FOGS.splice(i, 1); continue; } if (Math.random() < .4) puff(f.p, [.62, .62, .7], 1, .9, .22 * Math.min(1, f.t)); if (V.d2(P.pos, f.p) < f.r) { P.slow = .25; } }
}

// ================= CAPÍTULO 2: novos inimigos e a Irmã Rasga-Dobra =================
function bruteAI(e, dt, d, pd) {
  const D = e.d, dm = e.dmgMul || 1; e.at = null; let mv = 0;
  if (e.st === 'hurt') { if (e.t > .3) e.st = 'chase'; }
  else if (e.st === 'stun' || pd) { }
  else if (e.st === 'chase') { faceP(e, dt, 3); if (d > 2.4) mv = D.spd; else if (e.cd <= 0 && meleeTokens() < 2) { e.st = 'wind'; e.t = 0; AU.roar(); } }
  else if (e.st === 'wind') { faceP(e, dt, 2); e.at = e.t / .9; const c = V.add(e.pos, [Math.sin(e.yaw) * 1.6, 0, Math.cos(e.yaw) * 1.6]); R.disc(c[0], c[2], 2.8 * Math.min(1, e.t / .9), [1, .2, .1], .22); R.ring(c[0], c[2], 2.8, .2, [1, .25, .1], .6);
    if (e.t > .9) { e.st = 'atk'; e.t = 0; e.hit = false; } }
  else if (e.st === 'atk') { e.at = Math.min(1, e.t / .5);
    if (!e.hit && e.t > .12) { e.hit = true; const c = V.add(e.pos, [Math.sin(e.yaw) * 1.6, 0, Math.cos(e.yaw) * 1.6]); S.shake = .7; AU.hit(true); puff(c, [.55, .5, .45], 12, .9, .35);
      if (V.d2(P.pos, c) < 2.8) hurtPlayer(D.dmg * dm, e); }
    if (e.t > 1.3) { e.st = 'chase'; e.cd = rnd(1.8, 2.8) * (e.cdMul || 1); } }
  if (mv) { const s = mv * dt; moveEnt(e.pos, Math.sin(e.yaw) * s, Math.cos(e.yaw) * s, e.rad); }
  e.sp += ((mv ? mv / 4.4 : 0) - e.sp) * (1 - Math.exp(-8 * dt)); e.ph += dt * (2 + mv * 1.6);
}
function saltAI(e, dt, d, pd) {
  const D = e.d, dm = e.dmgMul || 1; e.at = null; let mv = 0, dir = e.yaw;
  if (e.st === 'hurt') { if (e.t > .3) e.st = 'chase'; }
  else if (e.st === 'stun' || pd) { }
  else if (e.st === 'chase') { faceP(e, dt, 6); if (d > 8) mv = D.spd; else if (d < 4.5) { mv = -D.spd * .7; } else { dir = e.yaw + Math.PI / 2 * (e.id % 2 ? 1 : -1); mv = D.spd * .4; }
    if (e.cd <= 0 && d < 11) { e.st = 'leapW'; e.t = 0; e.to = [...P.pos]; e.from = [...e.pos]; } }
  else if (e.st === 'leapW') { faceP(e, dt, 8); if (e.t < .5) e.to = [...P.pos]; e.at = e.t / .8; R.disc(e.to[0], e.to[2], 2.2, [1, .25, .1], .25); R.ring(e.to[0], e.to[2], 2.2, .18, [1, .3, .1], .7);
    if (e.t > .8) { e.st = 'leap'; e.t = 0; e.from = [...e.pos]; AU.whoosh(.6); } }
  else if (e.st === 'leap') { const k = Math.min(1, e.t / .7); e.at = k; R.disc(e.to[0], e.to[2], 2.2, [1, .2, .1], .3);
    const np = V.lerp(e.from, e.to, k); if (walkable(np[0], np[2])) { e.pos[0] = np[0]; e.pos[2] = np[2]; } e.y = Math.sin(k * Math.PI) * 3;
    if (k >= 1) { e.y = 0; S.shake = .5; AU.hit(true); puff(e.pos, [.55, .5, .45], 10, .8, .3); if (V.d2(P.pos, e.pos) < 2.2) hurtPlayer(D.dmg * dm, e); e.st = 'flee'; e.t = 0; } }
  else if (e.st === 'flee') { dir = Math.atan2(e.pos[0] - P.pos[0], e.pos[2] - P.pos[2]); e.yaw += angDiff(e.yaw, dir) * .2; mv = D.spd; if (e.t > 1.6) { e.st = 'chase'; e.cd = rnd(2.2, 3.4) * (e.cdMul || 1); } }
  if (mv) { const s = mv * dt; moveEnt(e.pos, Math.sin(dir) * s, Math.cos(dir) * s, e.rad); }
  e.sp += ((mv ? Math.abs(mv) / 4.4 : 0) - e.sp) * (1 - Math.exp(-8 * dt)); e.ph += dt * (2 + Math.abs(mv) * 1.6);
}
// buracos abertos pela Irmã
function openHole(x, z, r = 2.3, life = 8) { HOLES.push({ p: [x, z], r, t: 1.0, life, open: false }); }
function updHoles(dt) {
  const boss = ENEMIES.find(e => e.type === 'irma' && !e.dead);
  for (let i = HOLES.length - 1; i >= 0; i--) { const h = HOLES[i];
    if (!h.open) { h.t -= dt; R.disc(h.p[0], h.p[1], h.r * (1 - Math.max(0, h.t)), [1, .15, .1], .25); R.ring(h.p[0], h.p[1], h.r, .15, [1, .2, .1], .7);
      if (h.t <= 0) { h.open = true; AU.hit(true); S.shake = Math.max(S.shake, .4); for (let k = 0; k < 14; k++) part([h.p[0] + rnd(-h.r, h.r), .2, h.p[1] + rnd(-h.r, h.r)], [0, rnd(1, 3), 0], .6, .1, [.9, .3, .55]);
        const d = Math.hypot(P.pos[0] - h.p[0], P.pos[2] - h.p[1]);
        if (d < h.r && P.st !== 'dead') { const hurt = hurtPlayer(22 * (boss && boss.fury ? 1.15 : 1), boss); const a = Math.atan2(P.pos[0] - h.p[0], P.pos[2] - h.p[1]); const np = [h.p[0] + Math.sin(a) * (h.r + .5), 0, h.p[1] + Math.cos(a) * (h.r + .5)]; if (walkable(np[0], np[2])) P.pos = np; } } }
    else { h.life -= dt; if (boss && boss.fury) { const dx = P.pos[0] - h.p[0], dz = P.pos[2] - h.p[1], l = Math.hypot(dx, dz) || 1; h.p[0] += dx / l * .9 * dt; h.p[1] += dz / l * .9 * dt;
        if (l < h.r) { const a = Math.atan2(dx, dz); const np = [h.p[0] + Math.sin(a) * (h.r + .3), 0, h.p[1] + Math.cos(a) * (h.r + .3)]; if (W.confine && W.confine.c && Math.hypot(np[0] - W.confine.c[0], np[2] - W.confine.c[1]) < W.confine.r) P.pos = np; } }
      const k = Math.min(1, h.life * 2);
      for (let s = 0; s < 18; s++) { const a0 = s / 18 * 6.28, a1 = (s + 1) / 18 * 6.28, gyh = groundY(h.p[0], h.p[1]) + .06, p = (a, rr) => [h.p[0] + Math.sin(a) * rr, gyh, h.p[1] + Math.cos(a) * rr]; R.quad([h.p[0], gyh, h.p[1]], p(a0, h.r), p(a1, h.r), [h.p[0], gyh, h.p[1]], [0, 0, 0], .92 * k, 0, 1, [[0, 0], [.7, 0], [.7, 0], [0, 0]]); }
      R.ring(h.p[0], h.p[1], h.r + .05, .12, [.9, .3, .6], .8 * k);
      if (h.life <= 0) HOLES.splice(i, 1); } }
  if (W.confine && W.confine.c && W.confine.shrink) { const c = W.confine; c.r += (c.to - c.r) * (1 - Math.exp(-.8 * dt)); R.ring(c.c[0], c.c[1], c.r + .2, .35, [1, .2, .1], .6);
    if (Math.random() < .5) { const a = rnd(0, 6.28); part([c.c[0] + Math.sin(a) * (c.r + .6), .1, c.c[1] + Math.cos(a) * (c.r + .6)], [0, -2, 0], .8, .14, [.5, .45, .42], { add: 0, al: .5, g: -6 }); }
    const d = Math.hypot(P.pos[0] - c.c[0], P.pos[2] - c.c[1]); if (d > c.r - .2) { P.pos[0] = c.c[0] + (P.pos[0] - c.c[0]) / d * (c.r - .3); P.pos[2] = c.c[1] + (P.pos[2] - c.c[1]) / d * (c.r - .3); } }
}
function irmaFury(e) {
  e.stun = 0; e.fury = true; e.st = 'roar'; e.t = 0; e.inv = true; AU.stinger(); S.shake = 1.4; CAM.zoom = 1; banner('FÚRIA', 'O chão da arena começa a ruir', 'fury'); $('bossbar').classList.add('fury');
  if (W.confine && W.confine.c) { W.confine.shrink = true; W.confine.to = 10.5; }
}
function irmaAI(e, dt, d, pd) {
  const D = e.d, fm = e.fury ? 1.25 : 1, dm = e.fury ? 1.15 : 1; e.at = null; let mv = 0;
  const lunge = (sp) => { const s = sp * dt; moveEnt(e.pos, Math.sin(e.yaw) * s, Math.cos(e.yaw) * s, e.rad); };
  if (e.st === 'stun') { }
  else if (e.st === 'roar') { e.at = Math.min(1, e.t / 1.6); if (Math.random() < .8) part(V.add(e.pos, [rnd(-1, 1), rnd(.5, 2.5), rnd(-1, 1)]), [rnd(-3, 3), rnd(1, 4), rnd(-3, 3)], .7, .1, [.95, .3, .6]); if (e.t > 1.6) { e.st = 'chase'; e.inv = false; e.cd = .6; } }
  else if (pd) { }
  else if (e.st === 'chase') { faceP(e, dt, 6 * fm); if (d > 2.6) mv = D.spd * fm;
    if (e.cd <= 0) { const r = Math.random();
      if (e.fury && r < .3) { e.st = 'jumpW'; e.t = 0; e.to = [...P.pos]; AU.roar(); }
      else if (r < .55) { e.st = 'rasgoW'; e.t = 0; }
      else if (d > 5 && r < .8) { e.st = 'dashW'; e.t = 0; }
      else if (d < 3.4) { e.st = 'comboW'; e.t = 0; e.n = 2; } } }
  else if (e.st === 'comboW') { faceP(e, dt, 10); e.at = e.t / .4; if (Math.random() < .5) part(bladeTip(e.rig), [0, .4, 0], .2, .14, [1, .3, .3]); if (e.t > .4 / fm) { e.st = 'combo'; e.t = 0; e.hit = false; AU.whoosh(1); } }
  else if (e.st === 'combo') { e.at = Math.min(1, e.t / .5); if (e.t < .15) lunge(10); if (!e.hit && e.t > .14) { e.hit = true; enemyHitCheck(e, 2.6, 2, D.dmg * dm); }
    if (e.t > .55) { e.n--; if (e.n > 0) { e.st = 'comboW'; e.t = .15; } else { e.st = 'chase'; e.cd = rnd(.8, 1.4) / fm; } } }
  else if (e.st === 'rasgoW') { faceP(e, dt, 6); e.at = e.t / .7; if (e.t > .7 / fm) { e.st = 'rasgo'; e.t = 0; AU.whoosh(.7);
      const n = e.fury ? 4 : 3; for (let k = 1; k <= n; k++) { const dd = k * 2.6 + 1, x = e.pos[0] + Math.sin(e.yaw) * dd, z = e.pos[2] + Math.cos(e.yaw) * dd; if (W.confine && Math.hypot(x - W.confine.c[0], z - W.confine.c[1]) < W.confine.r - 1) openHole(x, z, 2.1 + (e.fury ? .3 : 0), e.fury ? 10 : 8); }
      openHole(P.pos[0], P.pos[2], 1.9, 7); } }
  else if (e.st === 'rasgo') { e.at = .6 + Math.min(.4, e.t); if (e.t > .7) { e.st = 'chase'; e.cd = rnd(1, 1.6) / fm; } }
  else if (e.st === 'dashW') { faceP(e, dt, 8); e.at = e.t; R.flat(e.pos[0] + Math.sin(e.yaw) * 4.5, e.pos[2] + Math.cos(e.yaw) * 4.5, e.yaw, 9, 2, [1, .15, .1], .35 + .25 * Math.sin(e.t * 30)); if (e.t > .65 / fm) { e.st = 'dash'; e.t = 0; e.hit = false; AU.whoosh(.8); } }
  else if (e.st === 'dash') { e.at = Math.min(1, e.t / .4); if (e.t < .35) lunge(24); if (!e.hit && V.d2(e.pos, P.pos) < 2) { e.hit = true; hurtPlayer(D.dmg * 1.2 * dm, e); } if (e.t > .7) { e.st = 'chase'; e.cd = rnd(.9, 1.5) / fm; } }
  else if (e.st === 'jumpW') { faceP(e, dt, 6); if (e.t < .7) e.to = [...P.pos]; e.at = e.t / 1.4; R.disc(e.to[0], e.to[2], 3.2 * Math.min(1, e.t / 1.4), [1, .05, .05], .3); R.ring(e.to[0], e.to[2], 3.2, .3, [1, .1, .05], .8);
    if (e.t > 1.4) { e.st = 'jump'; e.t = 0; e.from = [...e.pos]; AU.whoosh(.5); } }
  else if (e.st === 'jump') { const k = Math.min(1, e.t / .55); e.at = k; R.disc(e.to[0], e.to[2], 3.2, [1, .05, .05], .35); const np = V.lerp(e.from, e.to, k); e.pos[0] = np[0]; e.pos[2] = np[2]; e.y = Math.sin(k * Math.PI) * 5;
    if (k >= 1) { e.y = 0; e.st = 'land'; e.t = 0; S.shake = 1.3; AU.hit(true); AU.clang(); for (let q = 0; q < 40; q++) { const a = q / 40 * 6.28; part([e.pos[0] + Math.sin(a) * 3, .3, e.pos[2] + Math.cos(a) * 3], [Math.sin(a) * 3, 2, Math.cos(a) * 3], .6, .12, [1, .4, .5]); }
      if (V.d2(P.pos, e.pos) < 3.2) hurtPlayer(48, e); } }
  else if (e.st === 'land') { e.at = .5 + Math.min(.5, e.t); if (e.t > .9) { e.st = 'chase'; e.cd = 1.2; } }
  if (mv) { const s = mv * dt; moveEnt(e.pos, Math.sin(e.yaw) * s, Math.cos(e.yaw) * s, e.rad); }
  e.sp += ((mv ? mv / 4.4 : 0) - e.sp) * (1 - Math.exp(-8 * dt)); e.ph += dt * (2 + mv * 1.6);
}
