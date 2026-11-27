// ================= HISTÓRIA, MISSÕES, HUD, MENUS =================
const NPCS = [];
function npc(key, x, z, yaw = 0, o = {}) { const n = { key, rig: CAST[npcKey(key)](), pos: [x, 0, z], yaw, act: o.act || null, sp: 0, ph: rnd(0, 6), to: null, face: null, run: false, name: o.name, show: true, talk: o.talk }; NPCS.push(n); return n; }
function npcBy(k) { return NPCS.find(n => n.key === k); }
function updNpcs(dt) {
  for (const n of NPCS) { if (!n.show) continue;
    if (n.to) { const d = V.sub(n.to, n.pos), l = Math.hypot(d[0], d[2]); const spd = n.run ? 5.5 : 2.4;
      if (l > .15) { const s = Math.min(spd * dt, l); n.pos[0] += d[0] / l * s; n.pos[2] += d[2] / l * s; n.yaw += angDiff(n.yaw, Math.atan2(d[0], d[2])) * (1 - Math.exp(-10 * dt)); n.sp = spd / 4.4; n.ph += dt * (2.2 + spd * 1.35); }
      else { n.to = null; n.sp = 0; if (n.face != null) n.yaw = n.face; } }
    else { n.sp *= .85; if (n.face != null) n.yaw += angDiff(n.yaw, n.face) * (1 - Math.exp(-6 * dt)); }
    animAny(n.rig, { ph: n.ph, sp: n.sp, act: n.act, t: 0, ready: n.ready }, dt);
    n.pos[1] = groundY(n.pos[0], n.pos[2]); n.rig.pos = [n.pos[0], n.pos[1] + (n.rig.yOff || 0), n.pos[2]]; n.rig.yaw = n.yaw; n.rig.pitch = n.act === 'dead' && !n.rig.isSkin ? lerp(n.rig.pitch, -Math.PI / 2, 1 - Math.exp(-3 * dt)) : 0; if (n.act === 'dead' && !n.rig.isSkin) n.rig.pos[1] = .12;
    if (n.glow) n.rig.emAdd = n.glow; n.rig.update(); }
}
function drawNpcs() { for (const n of NPCS) if (n.show && V.d2(n.pos, R.cam) < 70) n.rig.draw(); }
// rasgo no mundo
const RIFT = { p: [0, 7.5, -22], s: 0, ts: 0, col: [1, .82, .5], bind: null, pts: [] };
for (let k = 0; k <= 16; k++) RIFT.pts.push([(Math.random() - .5) * .9 * (1 - Math.abs(k / 8 - 1) * .6), k / 16 * 2 - 1, (Math.random() - .5) * .2]);
function drawRift(dt) {
  RIFT.s += (RIFT.ts - RIFT.s) * (1 - Math.exp(-2.5 * dt)); if (RIFT.s < .02) return; const s = RIFT.s * 4, p = RIFT.p, c = RIFT.col;
  let prev = null; for (const q of RIFT.pts) { const w = [p[0] + q[0] * s * .6 + Math.sin(S.time * 3 + q[1] * 5) * .05 * s, p[1] + q[1] * s, p[2] + q[2] * s]; if (prev) { R.beam(prev, w, .18 * s, [1, .95, .8], 1); R.beam(prev, w, 1.1 * s, c, .35); R.beam(prev, w, 3 * s, V.sc(c, .7), .1); } prev = w; }
  if (Math.random() < .8) part(V.add(p, [rnd(-.5, .5) * s, rnd(-1, 1) * s, 0]), [rnd(-1, 1), rnd(-2, 1), rnd(-1, 1)], 1, .08, c);
  R.light(p, V.sc(c, 5 * RIFT.s), 26);
  if (RIFT.bind) { const tip = bladeTip(RIFT.bind.rig); for (let k = 0; k < 4; k++) { const a = V.add(p, [rnd(-.6, .6) * s, rnd(-.8, .8) * s, 0]); drawThread(tip, a, -.3, [1, .9, .6], .06, S.time + k, false); } R.light(tip, [2, 1.6, .9], 6); }
}

// ---------- utilidades de roteiro ----------
const MIS = { cur: 0, token: 0, waiters: [], bossDead: false, flags: {}, CP: null, skip: false,
  onDeath() { const tok = this.token; setTimeout(() => { if (tok !== this.token) return; showScr('over'); S.mode = 'over'; unlockPtr(); AU.music('none'); }, 2300); } };
function until(cond) { const tok = MIS.token; return new Promise(res => MIS.waiters.push({ cond, res, tok })); }
function wait(s) { const t0 = S.time; return until(() => S.time - t0 >= s); }
function rwait(s) { const t0 = performance.now(); return until(() => MIS.skip || performance.now() - t0 >= s * 1000); }
function tickWaiters() { for (let i = MIS.waiters.length - 1; i >= 0; i--) { const w = MIS.waiters[i]; if (w.tok !== MIS.token) { MIS.waiters.splice(i, 1); continue; } if (w.cond()) { MIS.waiters.splice(i, 1); w.res(); } } }
const WHO = { Orven: '#e8c98a', Nera: '#f1dfb8', Lira: '#a8d48a', Iaro: '#e3a45a', Ruan: '#8fb4ff', Mireia: '#8fd8cf', Oren: '#a9e6ff', 'Tia Brena': '#e0b090', Destrem: '#e77aa8', 'Pastor Tomé': '#d8c090', 'Rasga-Dobra': '#d07ae0', '': '#d8d0c0' };
let DLG = null;
function showLine(l, auto) {
  l = { ...l, who: swapNome(l.who), t: swapNome(l.t) };
  return new Promise(res => { const box = $('dlg'); box.classList.add('on'); box.querySelector('.who').textContent = l.who || ''; box.querySelector('.who').style.color = WHO[l.who || ''] || '#ddd';
    box.classList.toggle('narr', !l.who); box.classList.toggle('voice', !!l.voice);
    DLG = { txt: l.t, shown: 0, res, auto, t0: performance.now(), done: false }; box.querySelector('.tx').textContent = ''; });
}
function dlgTick(I) {
  if (!DLG) return; const box = $('dlg'), d = DLG; d.shown = Math.min(d.txt.length, d.shown + 1.6);
  box.querySelector('.tx').textContent = d.txt.slice(0, Math.floor(d.shown)); const full = d.shown >= d.txt.length; box.querySelector('.more').style.opacity = full ? 1 : 0;
  const readT = 1700 + d.txt.length * 48;
  if (I.adv || MIS.skip || (d.auto && performance.now() - d.t0 > readT)) { if (!full && !MIS.skip && I.adv) { d.shown = d.txt.length; return; } DLG = null; box.classList.remove('on'); d.res(); }
}
async function dialog(lines) { const prev = S.mode; S.mode = 'dialog'; $('hud').classList.add('dim'); for (const l of lines) await showLine(l, false); S.mode = prev === 'dialog' ? 'play' : prev; $('hud').classList.remove('dim'); }
async function cut(shots) {
  S.mode = 'cut'; MIS.skip = false; $('lb').classList.add('on'); $('hud').classList.add('hide'); $('skip').classList.add('on'); unlockPtr();
  for (const sh of shots) { if (sh.on) sh.on(); if (MIS.skip) continue;
    if (sh.cam) { const up = p => p && p[0] > SX - 60 ? [p[0], p[1] + HS, p[2]] : p, c = sh.cam.map(up); camShot(c[0], c[1], c[2], c[3] || c[2], (sh.dur || 4) * 1.15); }
    if (sh.card) card(sh.card, sh.sub);
    const t0 = performance.now(); if (sh.line) await showLine(sh.line, true);
    const rest = (sh.dur || 0) * 1000 - (performance.now() - t0); if (rest > 0) await rwait(rest / 1000); }
  MIS.skip = false; $('lb').classList.remove('on'); $('hud').classList.remove('hide'); $('skip').classList.remove('on'); P.cutAct = null; P.cutTo = null; camRelease(); S.mode = 'play'; $('card').className = '';
}
function card(t, sub) { const c = $('card'); c.innerHTML = `<h1>${t}</h1>${sub ? `<p>${sub}</p>` : ''}`; c.className = 'on'; clearTimeout(card.t); card.t = setTimeout(() => c.className = '', 3800); }
function banner(t, sub = '', cls = '') { const b = $('banner'); b.innerHTML = `<h2>${t}</h2>${sub ? `<p>${sub}</p>` : ''}`; b.className = 'on ' + cls; clearTimeout(banner.t); banner.t = setTimeout(() => b.className = '', 3200); }
function objective(t) { $('obj').textContent = t; $('obj').classList.remove('new'); void $('obj').offsetWidth; $('obj').classList.add('new'); }
function hint(t, ms = 7000) { const h = $('hint'); h.innerHTML = t; h.classList.add('on'); clearTimeout(hint.t); if (ms) hint.t = setTimeout(() => h.classList.remove('on'), ms); }
function hideHint() { $('hint').classList.remove('on'); }
let MARK = null; // marcador de objetivo
function alive() { return ENEMIES.filter(e => !e.dead).length; }
function clearCombat() { HOLES.length = 0; ENEMIES.length = 0; PROJ.length = 0; FOGS.length = 0; WAVES.length = 0; ULT.length = 0; PART.length = 0; P.lock = null; P.pull = null; for (const n of NUMS) n.el.remove(); NUMS.length = 0; W.confine = null; $('bossbar').classList.remove('on', 'fury'); }
function unlockPtr() { if (document.pointerLockElement) { S.noPauseOnUnlock = true; document.exitPointerLock(); } }

// ---------- progresso / save ----------
const SAVE_K = 'fio_alvorada_save';
function progSnap() { return { level: P.level, xp: P.xp, pts: P.pts, nodes: { ...P.nodes }, potions: P.potions, wlvl: P.wlvl, unl: { ...P.unl } }; }
function progLoad(s) { P.level = s.level; P.xp = s.xp; P.pts = s.pts; P.nodes = { ...s.nodes }; P.potions = s.potions; P.wlvl = s.wlvl; P.unl = { ...s.unl }; }
function readSave() { try { return JSON.parse(localStorage.getItem(SAVE_K) || 'null'); } catch (e) { return null; } }
function writeSave(m, done) { try { localStorage.setItem(SAVE_K, JSON.stringify({ m, done: !!done, t: Date.now(), ...progSnap() })); } catch (e) { } }
function freshProg() { progLoad({ level: 1, xp: 0, pts: 0, nodes: {}, potions: 2, wlvl: 0, unl: { q: false, e: false, r: false } }); }
async function completeMission(i, title) {
  gainXP(80); writeSave(i + 1, i === MISSIONS.length - 1); banner('Missão concluída', title + ' · +80 XP · jogo salvo'); AU.chime(); await wait(2.5);
}

// ---------- montagem de cena por missão ----------
const ENV0 = { ...R.env }, ENV_TRILHA = { ...R.env, sun: V.norm([.3, .88, .38]), sunC: [2.7, 2.2, 1.8], night: .12, fogD: .007 }, ENV_SERRA = { ...R.env, sun: V.norm([.35, .55, .6]), sunC: [2.2, 2.0, 1.8], skyA: lin(0x4f6c8e), skyB: lin(0xd0a890), fog: lin(0x7d8796), fogD: .0085, riftN: V.norm([.6, .3, .7]), night: .2 };
function stage(i) {
  clearCombat(); NPCS.length = 0; RIFT.ts = 0; RIFT.s = 0; RIFT.bind = null; MARK = null; MIS.bossDead = false;
  P.hp = maxHp(); P.vig = 100; P.lume = 30; P.st = 'move'; P.cd = { q: 0, e: 0, r: 0 }; P.heal = null; P.rig.pitch = 0; P.trail.length = 0;
  if (i >= 3) { // Serra das Costuras
    Object.assign(R.env, ENV_SERRA); W.bridgeOk = true; W.gate.off = true;
    const B = W.serra.bridges; B[1].ok = i >= 4 || !!MIS.flags.b2; B[2].ok = i >= 5 || !!MIS.flags.b3;
    const li = npc('lira', SX - 2.5, 4, Math.PI, { name: 'Lira' }), or = npc('oren', SX + 2.5, 4.5, Math.PI, { name: 'Oren' });
    if (i >= 4) { li.pos = [SX - 2.5, 0, -40]; or.pos = [SX + 2.5, 0, -41]; } if (i >= 5) { li.pos = [SX - 3, 0, -60]; or.pos = [SX + 3, 0, -61]; }
    if (i === 4) { const pa = npc('aldeao', SX, -74, 0, { name: 'Pastor Tomé' }); pa.act = 'kneel'; pa.key = 'pastor'; }
    return;
  }
  Object.assign(R.env, ENV0);
  W.bridgeOk = i >= 2 || !!MIS.flags.bridge; W.gate.off = i >= 2;
  const br = npc('brena', 6.2, -8.5, -Math.PI / 2, { name: 'Tia Brena' }); br.act = null;
  npc('aldeao', -3.5, -15, .8).act = 'cross'; npc('aldeao', 7.5, 3, -2.2).face = -2.2; NPCS[NPCS.length - 1].rig = CAST.aldeao(0x3e5a6a);
  npc('aldeao', -7.5, -27, 1.4).act = 'cross'; NPCS[NPCS.length - 1].rig = CAST.aldeao(0x6a3a3a);
  const li = npc('lira', 2.6, -51.5, Math.PI, { name: 'Lira' }); li.face = Math.PI * .9;
  if (i >= 2) { li.pos = [2.4, 0, -69]; li.face = Math.PI; }
  R.env.rift = 1; R.env.night = .3;
}
// recosturar uma ponte da serra (F perto do poste)
async function seamTask(b, flag, tok) {
  objective('Recosture a ponte de lume (F perto do poste dourado)'); MARK = b.seam;
  await until(() => V.d2(P.pos, b.seam) < 2.4 && MIS.act); if (tok !== MIS.token) return;
  MARK = null; P.st = 'cast'; P.t = 0; AU.thread(); AU.heal();
  for (let k = 0; k < 60; k++) part([SX + rnd(-1.4, 1.4), rnd(-.5, .3), rnd(b.rect[3], b.rect[2])], [0, 1.5, 0], rnd(.6, 1.2), .08, [1, .85, .5]);
  b.ok = true; MIS.flags[flag] = true; await wait(.8);
}
// ponto da trilha a "s" metros do começo
function trilhaEm(s) { const T = TRILHA; for (let i = 0; i < T.length - 1; i++) if (T[i + 1].s >= s) { const k = (s - T[i].s) / ((T[i + 1].s - T[i].s) || 1); return [lerp(T[i][0], T[i + 1][0], k), lerp(T[i][2], T[i + 1][2], k), lerp(T[i][1], T[i + 1][1], k)]; } const L = T[T.length - 1]; return [L[0], L[2], L[1]]; }
function trilhaEmT(T, s) { for (let i = 0; i < T.length - 1; i++) if (T[i + 1].s >= s) { const k = (s - T[i].s) / ((T[i + 1].s - T[i].s) || 1); return [lerp(T[i][0], T[i + 1][0], k), lerp(T[i][2], T[i + 1][2], k), lerp(T[i][1], T[i + 1][1], k)]; } const L = T[T.length - 1]; return [L[0], L[2], L[1]]; }
// caminhada longa com emboscadas (uns na frente, outros pulando do alto)
async function jornada(T, tok, o) {
  const TOT = T.total, pontos = o.pontos.filter(v => v < TOT - 8); let k = 0;
  objective(o.texto); if (o.dica) hint(o.dica, 7000);
  while (tok === MIS.token) {
    const me = pertoT(T, P.pos[0], P.pos[2]), s = me.d < 25 ? me.s : 0;
    MARK = trilhaEmT(T, Math.min(TOT, s + 20)); $('obj').textContent = o.texto + ' — faltam ' + Math.max(0, Math.round(TOT - s)) + ' m';
    if (k < pontos.length && s > pontos[k]) {
      const g = o.grupos[k % o.grupos.length]; let j = 0;
      for (const [t, doAlto] of g) { const p = trilhaEmT(T, Math.min(TOT - 2, s + 10 + j * 3.5)), off = (j % 2 ? 1 : -1) * 1.2;
        const e = spawn(t, p[0] + off, p[2] + off * .5, { aggro: 60, instant: !!doAlto }); if (doAlto) { e.y = 9; e.vy = 0; } j++; }
      icon('Emboscada!', 'gold'); AU.roar(); k++;
    }
    if (o.fim ? (o.fim() || s >= TOT - 6) : s >= TOT - 6) break;
    await wait(.25);
  }
  MARK = null;
}
async function subida(tok) {
  await jornada(TRILHA, tok, { texto: 'Suba a trilha da montanha', pontos: [30, 75, 120, 165, 210, 255, 300, 340, 390],
    dica: 'Os Desfiadores atacam na subida — alguns <b>pulam do alto</b>. Siga o losango dourado.',
    grupos: [[['tecelao', 0], ['tecelao', 1], ['larva', 0]], [['fieira', 0], ['tecelao', 1], ['saltador', 1]], [['tecelao', 0], ['tecelao', 0], ['fieira', 1], ['larva', 1]],
      [['bruta', 0], ['saltador', 1], ['saltador', 1]], [['tecelao', 1], ['fieira', 0], ['fieira', 1], ['saltador', 0]], [['bruta', 0], ['tecelao', 1], ['tecelao', 1], ['larva', 0]],
      [['saltador', 1], ['saltador', 1], ['fieira', 0], ['bruta', 0]], [['bruta', 1], ['tecelao', 0], ['fieira', 1], ['saltador', 1], ['tecelao', 0]]],
    fim: () => naSerra(P.pos[0], P.pos[2]) && P.pos[0] > SX - 15 });
  for (const e of ENEMIES) { e.dead = true; e.deadT = 9; }
}
const fight = async (list, tok) => { for (const [t, x, z, o] of list) spawn(t, SX + x, z, o || {}); await until(() => alive() === 0); };

// ---------- CAPÍTULO 2 · MISSÃO 4: Travessia da Serra ----------
async function M4(retry) {
  const tok = MIS.token; stage(3); P.pos = [SX, 0, 5]; P.yaw = Math.PI; camRelease();
  if (!retry) {
    // a subida: sai da arena do chefe 1 e sobe a trilha em curvas até o topo da montanha
    P.pos = [10, 0, -125]; P.yaw = Math.PI / 2; camRelease(); CAM.yaw = Math.PI / 2;
    banner('A subida', 'A Serra das Costuras fica no topo da montanha'); AU.music('combat');
    await subida(tok); if (tok !== MIS.token) return;
    P.pos = [SX, 0, 5]; P.yaw = Math.PI; camRelease();
    AU.music('calm');
    await cut([
      { on: () => { P.cutAct = null; }, cam: [[SX + 24, 14, 18], [SX + 14, 9, 6], [SX, 0, -40], [SX, 2, -70]], dur: 5, card: 'Capítulo 2', sub: 'Serra das Costuras' },
      { cam: [[SX + 4, 1.8, 1.5], [SX + 3.6, 1.8, 1], [SX + 2.5, 1.6, 4.5]], dur: 3, line: { who: 'Oren', t: 'Serra das Costuras. Eu vigiava estas dobras antes de entrar para o Pacto.' } },
      { cam: [[SX - 4, 1.8, 1.5], [SX - 3.6, 1.8, 1], [SX - 2.5, 1.6, 4]], dur: 3, line: { who: 'Lira', t: 'Os fios estão todos expostos. Dá até pra ouvir eles rangendo.' } },
      { cam: [[SX, 3, -6], [SX, 4, -9], [SX, 0, -30], [SX, 0, -55]], dur: 3.5, line: { who: 'Oren', t: 'As pontes daqui são de lume. Se cortaram as costuras, a travessia caiu junto.' } },
      { cam: [[SX + 1, 1.7, 2.6], [SX + .8, 1.7, 2.2], [SX, 1.6, 5]], dur: 2.5, line: { who: 'Nera', t: 'Então a gente recostura uma por uma.' } },
    ]);
    if (tok !== MIS.token) return;
    P.pos = [SX, 0, 2]; P.yaw = Math.PI; camRelease();
  }
  AU.music('calm'); objective('Atravesse a ponte de lume até o platô'); MARK = [SX, 0, -30];
  await until(() => P.pos[2] < -28); MARK = null; if (tok !== MIS.token) return;
  W.confine = [SX - 7.5, SX + 7.5, -23.6, -49.9]; AU.music('combat'); MIS.barrier = false;
  objective('Emboscada! Derrote os Desfiadores'); hint('A <b>Costura-Bruta</b> não para de atacar quando apanha. Esquive do golpe dela e quebre a postura com o ataque pesado.', 7000);
  await fight([['tecelao', -4, -42], ['tecelao', 4, -44], ['bruta', 0, -47]], tok); if (tok !== MIS.token) return;
  W.confine = null; AU.music('calm');
  for (const n of NPCS) { if (n.key === 'lira') n.pos = [SX - 2.5, 0, -40]; if (n.key === 'oren') n.pos = [SX + 2.5, 0, -41]; }
  await dialog([{ who: 'Oren', t: 'A próxima ponte foi cortada no poste. Nera, é com você.' }]);
  await seamTask(W.serra.bridges[1], 'b2', tok); if (tok !== MIS.token) return;
  await completeMission(3, 'Travessia da Serra'); if (tok !== MIS.token) return;
  runMission(4, false, true);
}
// ---------- MISSÃO 5: Resgate na fenda ----------
async function M5(retry, chained) {
  const tok = MIS.token; stage(4); if (!chained || retry) { P.pos = [SX, 0, -44]; P.yaw = Math.PI; camRelease(); }
  AU.music('calm'); objective('Atravesse até o platô da fenda'); MARK = [SX, 0, -62];
  await until(() => P.pos[2] < -60); MARK = null; if (tok !== MIS.token) return;
  const pa = NPCS.find(n => n.key === 'pastor');
  await dialog([{ who: 'Pastor Tomé', t: 'Moça! Aqui! Uma mulher de lâmina torta prendeu a gente nesses fios. Ela disse que era a Irmã.' }, { who: 'Nera', t: 'Fica quieto aí, eu já te tiro. Primeiro esses dois.' }]);
  W.confine = { c: [SX, -70], r: 12.3 }; AU.music('combat'); objective('Proteja o pastor — onda 1 de 2');
  hint('O <b>Saltador de Fenda</b> pula em cima de você: saia do círculo vermelho ou esquive no momento do pouso.', 7000);
  await fight([['saltador', -6, -76], ['saltador', 6, -64], ['fieira', -8, -66], ['fieira', 8, -78]], tok); if (tok !== MIS.token) return;
  await wait(1.5); objective('Proteja o pastor — onda 2 de 2'); banner('Bruta da Serra', 'Elite: o dobro de vida');
  await fight([['bruta', 0, -79, { elite: true }], ['tecelao', -7, -72], ['tecelao', 7, -68], ['saltador', 0, -61]], tok); if (tok !== MIS.token) return;
  W.confine = null; AU.music('calm'); objective('Solte o pastor (F)'); MARK = pa.pos;
  await until(() => V.d2(P.pos, pa.pos) < 2.6 && MIS.act); if (tok !== MIS.token) return;
  MARK = null; pa.act = null; P.st = 'cast'; P.t = 0; AU.heal();
  await dialog([{ who: 'Pastor Tomé', t: 'Obrigado... Ela levou o rebanho para a fenda grande, lá no alto. Disse que ia rasgar o chão debaixo de quem viesse.' }, { who: 'Lira', t: 'Ótimo. Eu adoro gente que avisa o plano.' }]);
  for (const n of NPCS) { if (n.key === 'lira') n.pos = [SX - 3, 0, -60]; if (n.key === 'oren') n.pos = [SX + 3, 0, -61]; }
  await seamTask(W.serra.bridges[2], 'b3', tok); if (tok !== MIS.token) return;
  await completeMission(4, 'Resgate na fenda'); if (tok !== MIS.token) return;
  runMission(5, false, true);
}
// ---------- MISSÃO 6: Rasga-Dobra ----------
async function M6(retry, chained) {
  const tok = MIS.token; stage(5); if (!chained || retry) { P.pos = [SX, 0, retry ? -95 : -78]; P.yaw = Math.PI; camRelease(); }
  AU.music('calm'); objective('Suba até a fenda grande'); MARK = [SX + 2, 0, -98];
  await until(() => P.pos[2] < -98); MARK = null; if (tok !== MIS.token) return;
  let boss; const C = [SX + 2, -112];
  await cut([
    { on: () => { boss = spawn('irma', C[0], C[1] - 5, { instant: true }); boss.st = 'roar'; boss.inv = true; boss.yaw = 0; P.cutAct = null; }, cam: [[SX + 6, 2, -101], [SX + 4, 1.8, -104], [C[0], 1.6, C[1] - 5]], dur: 3, line: { who: 'Rasga-Dobra', t: 'Recosturadeira... você tem as mãos do velho Orven.' } },
    { cam: [[SX - .6, 1.7, -98.6], [SX - .4, 1.7, -99.2], [SX, 1.6, -100]], dur: 2, line: { who: 'Nera', t: 'E a lâmina dele.' } },
    { on: () => { AU.roar(); S.shake = .8; for (let k = 0; k < 3; k++) openHole(C[0] + rnd(-6, 6), C[1] + rnd(-6, 6), 2, 3); }, cam: [[C[0] + 3, 1.3, C[1]], [C[0] + 2.5, 1.5, C[1] - 1], [C[0], 1.8, C[1] - 5]], dur: 3, line: { who: 'Rasga-Dobra', t: 'Então vamos ver quanto chão sobra embaixo de você.' }, card: 'Rasga-Dobra', sub: 'Desfiadora da Serra' },
  ]);
  if (tok !== MIS.token) return;
  boss.st = 'chase'; boss.inv = false; boss.cd = 1.2; P.pos = [SX + 2, 0, -100]; P.yaw = Math.PI; camRelease();
  W.confine = { c: C, r: 15.2 }; AU.music('boss'); $('bossbar').classList.add('on'); $('bossbar').querySelector('.nm').textContent = 'Rasga-Dobra';
  objective('Derrote a Rasga-Dobra'); hint('Os cortes dela abrem buracos no chão: saia do vermelho. Na fúria a arena encolhe e ela dá um salto mortal — esquive no pouso.', 8000);
  await until(() => MIS.bossDead); if (tok !== MIS.token) return;
  for (const e of ENEMIES) if (!e.dead) killEnemy(e);
  AU.music('none'); S.slow = 1.5; S.ts = .25; $('bossbar').classList.remove('on'); W.confine = null; HOLES.length = 0; P.pts++; P.unl.cap2 = true; await wait(2); if (tok !== MIS.token) return;
  const irm = npc('mireia', C[0], C[1] - 4, 0); irm.rig.tint = [lin(0x3a2040), .55]; irm.act = 'kneel'; irm.rig.scale = 1.12;
  for (const e of ENEMIES) e.deadT = 9;
  for (const n of NPCS) { if (n.key === 'lira') { n.pos = [C[0] - 3, 0, C[1] + 4]; n.face = Math.PI; } if (n.key === 'oren') { n.pos = [C[0] + 3, 0, C[1] + 4]; n.face = Math.PI; } }
  P.pos = [C[0], 0, C[1] + 1]; P.yaw = Math.PI;
  await cut([
    { cam: [[C[0] + 2.4, 1.2, C[1] - 1.5], [C[0] + 2, 1.1, C[1] - 2], [C[0], .9, C[1] - 4]], dur: 3.5, line: { who: 'Rasga-Dobra', t: 'Vocês nem sabem a quem servem... Destrem não foi discípulo de Orven.' } },
    { cam: [[C[0] - 2, 1.1, C[1] - 2], [C[0] - 1.6, 1, C[1] - 2.4], [C[0], .9, C[1] - 4]], dur: 3.5, line: { who: 'Rasga-Dobra', t: 'Foi o mestre dele. Orven aprendeu a costurar com quem hoje quer soltar tudo.' } },
    { on: () => { irm.act = 'dead'; }, cam: [[C[0] - 3.5, 1.7, C[1] + 6], [C[0] - 3.2, 1.7, C[1] + 5.4], [C[0] - 3, 1.6, C[1] + 4]], dur: 2.5, line: { who: 'Lira', t: 'Mentira. O tio nunca...' } },
    { cam: [[C[0] + 3.5, 1.8, C[1] + 6], [C[0] + 3.2, 1.8, C[1] + 5.4], [C[0] + 3, 1.7, C[1] + 4]], dur: 3, line: { who: 'Oren', t: 'Talvez não seja mentira. O Arquivo de Lume guarda o nome de todos os mestres da ordem.' } },
    { cam: [[C[0] + .8, 1.7, C[1] - 1.2], [C[0] + .6, 1.7, C[1] - 1.6], [C[0], 1.6, C[1] + 1]], dur: 2.5, line: { who: 'Nera', t: 'Então vamos atrás da verdade. E do Destrem.' } },
    { on: () => { irm.show = false; }, cam: [[C[0], 4, C[1] + 10], [C[0], 16, C[1] + 22], [C[0], 1, C[1]], [C[0], 4, C[1] - 20]], dur: 4.5, card: 'Fim do Capítulo 2', sub: 'A jornada continua no Cais de Varelle' },
  ]);
  if (tok !== MIS.token) return;
  writeSave(6, true);
  $('endh').textContent = 'Capítulo 2 concluído'; $('bNext').style.display = 'none';
  $('endtxt').innerHTML = `Nível ${P.level} · novo poder na árvore: <b>Fio Elemental</b> (+1 ponto) · jogo salvo.<br>Próximo: Capítulo 3 — Cais de Varelle.`;
  showScr('end'); S.mode = 'end'; AU.music('calm');
}
// ---------- MISSÃO 1: Fios no chão ----------
async function M1(retry) {
  const tok = MIS.token; stage(0); P.pos = [0, 0, -7]; P.yaw = Math.PI; CAM.yaw = Math.PI; camRelease();
  if (!retry) {
    const orv = npc('orven', 0, -13.5, Math.PI, { name: 'Orven' });
    P.pos = [0, 0, -5]; P.yaw = Math.PI; RIFT.p = [0, 8, -24]; RIFT.col = [1, .8, .5];
    NPCS.filter(n => n.key === 'aldeao' || n.key === 'brena').forEach(n => n.show = false);
    AU.music('calm');
    await cut([
      { on: () => { RIFT.ts = .7; }, cam: [[18, 11, 16], [10, 7, 6], [0, 4, -14], [0, 6, -20]], dur: 5, line: { t: 'Tessara é um continente costurado. Fios de lume prendem a matéria, o clima e até instantes curtos do tempo.' } },
      { cam: [[0, 1.5, 1], [0, 2.1, -2.5], [0, 3, -14], [0, 6.5, -22]], dur: 4, line: { t: 'Onde os fios arrebentam, o chão racha, o dia falha… e entra a Noite sem Fio.' } },
      { on: () => { orv.act = 'raise'; RIFT.ts = 1.2; AU.roar(); }, cam: [[3.4, 1.8, -10], [2.8, 1.7, -11], [0, 1.9, -13.5], [0, 2.6, -15]], dur: 3, line: { who: 'Orven', t: 'Nera, fique atrás de mim! Esse rasgo não passa de Orlavento.' } },
      { on: () => { P.cutAct = null; P.combatT = 5; }, cam: [[.9, 1.8, -3.2], [.7, 1.7, -4.2], [0, 1.9, -13], [0, 2.4, -14]], dur: 2.5, line: { who: 'Nera', t: 'Mestre, ele está crescendo! Deixa eu ajudar!' } },
      { on: () => { RIFT.bind = orv; AU.thread(); }, cam: [[-8, 1, -8], [-7, 3, -9.5], [0, 4, -16], [0, 6, -20]], dur: 3, line: { who: 'Orven', t: 'Você ainda não vê os fios inteiros. Mas vai ver. Olhe como se costura.' } },
      { on: () => { RIFT.ts = 0; S.shake = 1.6; AU.stinger(); for (let k = 0; k < 120; k++) part(RIFT.p, [rnd(-8, 8), rnd(-8, 8), rnd(-8, 8)], rnd(.6, 1.4), .1, [1, .85, .5], { drag: 1 }); }, cam: [[0, 1.2, -4], [0, 1.4, -5], [0, 5, -20], [0, 8, -24]], dur: 2.4 },
      { on: () => { RIFT.bind = null; orv.act = 'kneel'; P.cutTo = [0, 0, -12.2]; }, cam: [[2.6, 1.3, -10.6], [2.1, 1.1, -11.2], [0, .9, -13], [0, .9, -13.2]], dur: 3, line: { who: 'Orven', t: 'O Talhador Curto agora é seu. Reúna os seis: Iaro, Lira, Ruan, Mireia e Oren.' } },
      { on: () => { P.cutAct = 'kneel'; }, cam: [[-2, 1.1, -11], [-1.8, 1, -11.6], [0, .9, -13], [0, .8, -13.2]], dur: 3, line: { who: 'Orven', t: 'Não deixe o Destrem soltar as costuras do mundo…' } },
      { on: () => { orv.act = 'dead'; }, cam: [[1.5, 3, -9], [1, 4.5, -8], [0, .6, -13], [0, .5, -13]], dur: 3, line: { who: 'Nera', t: 'Eu prometo, mestre.' } },
      { on: () => { AU.music('none'); }, cam: [[0, 4, -6], [0, 12, 4], [0, 1, -13], [0, 3, -16]], dur: 4, card: 'Capítulo 1', sub: 'O rasgo de Orlavento' },
    ]);
    if (tok !== MIS.token) return;
    NPCS.splice(NPCS.indexOf(orv), 1); NPCS.forEach(n => n.show = true); P.pos = [0, 0, -8]; P.yaw = Math.PI; camRelease();
    banner('Amanhecer', 'Os Desfiadores sentiram o rasgo.');
    // tutorial
    AU.music('calm'); objective('Mova-se pela praça');
    hint(TOUCH ? 'Joystick esquerdo para andar · arraste a direita para olhar' : '<b>WASD</b> para andar · <b>Shift</b> correr · <b>setas</b> giram a câmera · o <b>mouse</b> gira a câmera · aperte <b>M</b> para soltar a seta do mouse e pausar', 0);
    const m0 = P.stats.moved; await until(() => P.stats.moved - m0 > 6);
    objective('Golpeie o boneco de treino (0/4)'); MARK = W.dummies[0].pos; hint(TOUCH ? 'Botão <b>Atacar</b>: combo de 4 golpes' : '<b>Clique esquerdo</b>: ataque leve (combo de 4 golpes; o 4º corta fios)', 0);
    const d0 = P.stats.dummy; await until(() => { const n = P.stats.dummy - d0; $('obj').textContent = `Golpeie o boneco de treino (${Math.min(n, 4)}/4)`; return n >= 4; });
    objective('Use o ataque pesado no boneco'); hint(TOUCH ? 'Botão <b>Pesado</b> (segure para carregar a Ruptura)' : '<b>Clique direito</b>: ataque pesado · <b>segure</b> para carregar a Ruptura · leve, leve, pesado também funciona', 0);
    const h0 = P.stats.dummyHeavy; await until(() => P.stats.dummyHeavy > h0);
    objective('Esquive duas vezes'); hint(TOUCH ? 'Botão <b>Esquiva</b>' : '<b>Espaço</b>: esquiva. Esquivar no instante do golpe inimigo = <b>Esquiva perfeita</b> e <b>Contracorte</b> (clique logo depois)', 0);
    const g0 = P.stats.dodges; await until(() => P.stats.dodges - g0 >= 2); MARK = null;
    hideHint();
    objective('Fale com Tia Brena'); MARK = npcBy('brena').pos;
    await until(() => V.d2(P.pos, npcBy('brena').pos) < 2.6 && MIS.act);
    MARK = null; npcBy('brena').face = Math.atan2(P.pos[0] - 6.2, P.pos[2] + 8.5);
    await dialog([
      { who: 'Tia Brena', t: 'Nera… sinto muito pelo Orven. A vila inteira viu o céu fechar.' },
      { who: 'Nera', t: 'Ele segurou o céu sozinho. Agora é comigo.' },
      { who: 'Tia Brena', t: 'Tecelões estão descendo a rua do mercado. Leve estas poções, menina.' },
      { who: 'Tia Brena', t: 'E a Lira foi até a ponte da ravina. Não deixe ela ir sozinha.' },
    ]);
    P.potions = 5; banner('Poções: 5', TOUCH ? 'Botão de poção cura 35%' : 'Tecla <b>1</b> ou <b>C</b> cura 35% da vida');
    MIS.CP = progSnap();
  }
  if (tok !== MIS.token) return;
  if (retry) { P.potions = Math.max(P.potions, 5); }
  // luta
  P.pos = retry ? [0, 0, -16] : P.pos;
  for (const [x, z] of [[-2, -33], [2.5, -35], [0, -38]]) spawn('tecelao', x, z, { aggro: 40 });
  AU.music('combat'); objective('Defenda a rua do mercado: Tecelões Caídos');
  hint(TOUCH ? 'Botão <b>Travar</b> mantém a câmera no inimigo' : '<b>Tab</b> ou botão do meio: travar alvo · roda do mouse troca', 6000);
  const tot0 = alive(); await until(() => { $('obj').textContent = `Defenda a rua do mercado: Tecelões Caídos (${tot0 - alive()}/${tot0})`; return alive() === 0; });
  if (tok !== MIS.token) return;
  AU.music('calm'); await completeMission(0, 'Fios no chão');
  if (tok !== MIS.token) return;
  runMission(1, false, true);
}

// ---------- MISSÃO 2: A dobra da ravina ----------
async function M2(retry, chained) {
  const tok = MIS.token; stage(1); if (!chained) { P.pos = [0, 0, -36]; P.yaw = Math.PI; camRelease(); } AU.music('calm');
  if (!MIS.flags.bridge) {
    if (!retry) { await jornada(TRILHAS.vila, tok, { texto: 'Siga a trilha das colinas até a ponte', pontos: [25, 60, 95, 125],
      dica: 'O caminho até a ponte dá a volta pelas colinas. Cuidado: os Desfiadores fecharam a estrada.',
      grupos: [[['tecelao', 0], ['tecelao', 1]], [['fieira', 0], ['tecelao', 1], ['larva', 0]], [['tecelao', 1], ['tecelao', 0], ['larva', 1], ['larva', 0]], [['fieira', 1], ['tecelao', 0], ['tecelao', 1]]] });
      if (tok !== MIS.token) return; await until(() => alive() === 0); if (tok !== MIS.token) return; }
    objective('Encontre Lira na ponte da ravina'); MARK = npcBy('lira').pos;
    await until(() => V.d2(P.pos, npcBy('lira').pos) < 4); MARK = null; if (tok !== MIS.token) return;
    const li = npcBy('lira'); li.face = Math.atan2(P.pos[0] - li.pos[0], P.pos[2] - li.pos[2]);
    await dialog([
      { who: 'Lira', t: 'Você demorou. Achei que ia chorar a manhã inteira.' },
      { who: 'Nera', t: 'Chorei. Terminei. E você saiu sem avisar ninguém.' },
      { who: 'Lira', t: 'Alguém precisava ver para onde os Tecelões fugiram. A ponte caiu — cortaram a costura dela.' },
      { who: 'Lira', t: 'Meu tio dizia que você via os fios melhor que todos nós. Prova.' },
    ]);
    if (tok !== MIS.token) return;
    await cut([
      { on: () => { P.cutAct = null; }, cam: [[-1, 2.2, -50], [-1.6, 1.8, -51.5], [-2.6, 1.8, -53.6], [-2.6, 1.6, -53.6]], dur: 2.2, line: { who: 'Nera', t: 'Ali… a costura está solta. Eu consigo ver o fio.' } },
      { cam: [[0, 2.5, -51], [0, 3, -52], [0, 0, -60], [0, 0, -63]], dur: 2.5, line: { who: 'Nera', t: 'Se eu cortar o nó podre, o lume volta a correr.' } },
    ]);
    if (tok !== MIS.token) return;
    P.unl.q = true; banner('Corte de Fio desbloqueado', TOUCH ? 'Botão Q: onda de lume que corta inimigos e projéteis' : '<b>Q</b>: onda de lume que corta inimigos e projéteis (custa lume)');
    objective('Recosture a ponte (F perto do poste dourado)'); MARK = W.seam;
    await until(() => V.d2(P.pos, W.seam) < 2.4 && MIS.act); if (tok !== MIS.token) return;
    MARK = null; P.st = 'cast'; P.t = 0; AU.thread(); AU.heal();
    for (let k = 0; k < 60; k++) { const z = rnd(-58.5, -64); part([rnd(-1.4, 1.4), rnd(-.5, .3), z], [0, 1.5, 0], rnd(.6, 1.2), .08, [1, .85, .5]); }
    W.threads.push({ a: [-2.6, 2.3, -53.6], b: [-1.6, 1.15, -54.8], sag: .1, col: [1, .85, .5], w: .04 }, { a: [-1.6, 1.15, -54.8], b: [-1.6, 1.15, -67.7], sag: .25, col: [1, .85, .5], w: .035 }, { a: [1.6, 1.15, -54.8], b: [1.6, 1.15, -67.7], sag: .25, col: [1, .85, .5], w: .035 });
    W.bridgeOk = true; MIS.flags.bridge = true; await wait(.8);
    await dialog([{ who: 'Lira', t: 'Ha! Ainda tem o toque do velho. A ravina está cheia deles. Eu seguro a ponte — vai!' }]);
    MIS.CP = progSnap();
  }
  if (tok !== MIS.token) return;
  if (retry) { P.pos = [0, 0, -66.5]; P.yaw = Math.PI; camRelease(); }
  objective('Atravesse a ponte até a ravina');
  await until(() => P.pos[2] < -71); if (tok !== MIS.token) return;
  W.confine = [-14, 14, -68.5, -95.5]; AU.music('combat'); MIS.barrier = true;
  objective('Ravina — onda 1 de 2');
  for (const [t, x, z] of [['tecelao', -5, -84], ['tecelao', 5, -86], ['fieira', 0, -92], ['larva', -3, -79], ['larva', 3, -80], ['larva', 0, -82]]) spawn(t, x, z);
  hint('Fieira atira fios lentos: corte com o 4º golpe, o pesado ou o <b>Corte de Fio</b>.', 6000);
  await until(() => alive() === 0); if (tok !== MIS.token) return;
  P.unl.e = true; banner('Recostura Leve desbloqueada', TOUCH ? 'Botão E: recostura as próprias feridas' : '<b>E</b>: recostura feridas leves (cura 25%, custa lume)'); await wait(2.5); if (tok !== MIS.token) return;
  objective('Ravina — onda 2 de 2');
  for (const [t, x, z] of [['tecelao', -8, -90], ['tecelao', 8, -90], ['tecelao', 0, -74], ['fieira', -10, -80], ['fieira', 10, -82], ['larva', -4, -86], ['larva', 4, -86], ['larva', -6, -76], ['larva', 6, -76]]) spawn(t, x, z);
  await until(() => alive() === 0); if (tok !== MIS.token) return;
  W.confine = null; MIS.barrier = false; W.gate.off = true; AU.music('calm');
  await completeMission(1, 'A dobra da ravina'); if (tok !== MIS.token) return;
  runMission(2, false, true);
}

// ---------- MISSÃO 3: O Fera de Fios Rotos ----------
async function M3(retry, chained) {
  const tok = MIS.token; stage(2); if (!chained) { P.pos = [0, 0, -98]; P.yaw = Math.PI; camRelease(); }
  AU.music('calm');
  if (!P.unl.r) { P.unl.r = true; banner('Rasgo Dourado desbloqueado', TOUCH ? 'Botão R com a barra de lume cheia' : '<b>R</b> com a barra de lume cheia: golpe final em área'); }
  RIFT.p = [0, 10, -134]; RIFT.col = [1, .35, .6]; RIFT.ts = .5;
  await jornada(TRILHAS.ravina, tok, { texto: 'Siga a trilha até a clareira do rasgo', pontos: [20, 50, 80, 105],
    dica: 'O rasgo no céu fica depois da floresta. A trilha é longa e cheia de Desfiadores.',
    grupos: [[['tecelao', 0], ['fieira', 1], ['larva', 0]], [['tecelao', 1], ['tecelao', 0], ['fieira', 0]], [['fieira', 1], ['fieira', 0], ['larva', 1], ['larva', 0]], [['tecelao', 1], ['tecelao', 1], ['fieira', 0], ['tecelao', 0]]],
    fim: () => Math.hypot(P.pos[0] - BOSS_C[0], P.pos[2] - BOSS_C[1]) < BOSS_R - 1 }); if (tok !== MIS.token) return;
  await until(() => alive() === 0 || true); for (const e of ENEMIES) { e.dead = true; e.deadT = 9; }
  let boss;
  await cut([
    { on: () => { RIFT.ts = 1.3; AU.roar(); P.cutAct = null; }, cam: [[2, 1.6, -112], [1, 2.2, -115], [0, 8, -132], [0, 9, -134]], dur: 2.4 },
    { on: () => { boss = spawn('cao', 0, -132, { instant: true }); boss.y = 9; boss.st = 'roar'; boss.t = 0; boss.inv = true; S.shake = 1; }, cam: [[5, 2, -122], [4, 1.5, -124], [0, 3, -132], [0, 2, -132]], dur: 2.6 },
    { on: () => { AU.roar(); RIFT.ts = .5; }, cam: [[3, 1.2, -126], [2.5, 1.4, -127], [0, 2.4, -131.5], [0, 2.6, -131]], dur: 2.6, card: 'Fera de Fios Rotos', sub: 'Primeiro dos Desfiadores' },
  ]);
  if (tok !== MIS.token) return;
  boss.st = 'chase'; boss.inv = false; boss.cd = 1.5; P.pos = [0, 0, -116]; P.yaw = Math.PI; camRelease();
  W.confine = { c: BOSS_C, r: BOSS_R }; AU.music('boss'); $('bossbar').classList.add('on'); $('bossbar').querySelector('.nm').textContent = 'Fera de Fios Rotos';
  objective('Derrote a Fera de Fios Rotos'); hint('Fique atento ao chão vermelho (investida) e ao fio que puxa — esquive no tempo certo.', 6000);
  await until(() => MIS.bossDead); if (tok !== MIS.token) return;
  for (const e of ENEMIES) if (!e.dead) killEnemy(e);
  AU.music('none'); S.slow = 1.5; S.ts = .25; $('bossbar').classList.remove('on'); W.confine = null; P.pts++; await wait(2.2); if (tok !== MIS.token) return;
  // cutscene final do capítulo
  const H = [['iaro', -2.4, -123.2], ['ruan', 2.4, -123.2], ['mireia', -1.3, -122], ['oren', 1.3, -122], ['lira', 0, -121.6]];
  const heroes = {}; P.pos = [0, 0, -126.5]; P.yaw = 0; P.hp = Math.max(P.hp, 1); for (const e of ENEMIES) e.deadT = 9;
  await cut([
    { on: () => { for (const [k, x, z] of H) { const n = npc(k, x + rnd(-1, 1), -110 - rnd(0, 3), Math.PI); n.to = [x, 0, z]; n.run = true; n.face = Math.PI; heroes[k] = n; } NPCS.filter(n => n.key === 'lira' && !Object.values(heroes).includes(n)).forEach(n => n.show = false); },
      cam: [[8, 4, -131], [6.5, 3, -129], [0, 1.5, -122], [0, 1.4, -123]], dur: 4 },
    { on: () => heroCam(heroes.iaro), dur: 2, line: { who: 'Iaro', t: 'Chegamos tarde.' } },
    { on: () => heroCam(P, heroes.lira), dur: 2.5, line: { who: 'Nera', t: 'Chegaram na hora. O mestre se foi… e o céu continua rasgado.' } },
    { on: () => heroCam(heroes.mireia), dur: 2.5, line: { who: 'Mireia', t: 'Então ninguém mais fica para trás. Nem você, Nera.' } },
    { on: () => heroCam(heroes.ruan), dur: 2, line: { who: 'Ruan', t: 'Seis lâminas. Contei duas vezes.' } },
    { on: () => heroCam(heroes.oren), dur: 2.5, line: { who: 'Oren', t: 'A serra também está cedendo. Os fios das bordas estão frouxos.' } },
    { on: () => heroCam(heroes.lira), dur: 2.2, line: { who: 'Lira', t: 'Então a gente costura. Golpe a golpe.' } },
    { on: () => { P.cutAct = 'raise'; for (const k in heroes) heroes[k].act = 'raise'; AU.chime(); }, cam: [[0, 1.2, -131], [0, 1.8, -132], [0, 2.2, -124], [0, 2.6, -123]], dur: 3, line: { who: 'Nera', t: 'A partir de hoje, somos o Pacto do Fio.' } },
    { on: () => { RIFT.p = [0, 12, -136]; RIFT.col = [1, .3, .55]; RIFT.ts = 1.4; S.shake = 1.2; AU.stinger(); P.cutAct = null; for (const k in heroes) { heroes[k].act = null; heroes[k].ready = true; heroes[k].face = Math.PI; } },
      cam: [[0, 1, -120], [0, 1.2, -121], [0, 8, -134], [0, 11, -136]], dur: 3, line: { who: 'Destrem', voice: true, t: 'Costurar é prender, criança. Orven sabia disso… e morreu segurando a agulha.' } },
    { cam: [[4, .8, -128], [3.6, 1, -128.5], [0, 10, -136]], dur: 3, line: { who: 'Destrem', voice: true, t: 'Vou soltar Tessara. Fio por fio.' } },
    { on: () => { P.yaw = Math.PI; heroCam(P, { pos: [0, 0, -136] }); }, dur: 2.5, line: { who: 'Nera', t: 'Então venha cortar o meu primeiro.' } },
    { on: () => { RIFT.ts = 0; }, cam: [[0, 3, -118], [0, 14, -110], [0, 2, -126], [0, 6, -134]], dur: 4.5, card: 'Fim do Capítulo 1', sub: 'A jornada continua na Serra das Costuras' },
  ]);
  if (tok !== MIS.token) return;
  P.wlvl = Math.max(P.wlvl, 1); writeSave(3, false);
  $('endh').textContent = 'Capítulo 1 concluído'; $('bNext').style.display = '';
  $('endtxt').innerHTML = `Nível ${P.level} · Talhador Curto +1 (dano +15%) · jogo salvo.<br>Próximo: Capítulo 2 — Serra das Costuras.`;
  showScr('end'); S.mode = 'end'; AU.music('calm');
}

function heroCam(n, look) {
  const p = n.pos, t = look ? look.pos : P.pos, d = V.norm([t[0] - p[0], 0, t[2] - p[2]]), sd = [d[2], 0, -d[0]];
  const e = V.add(p, V.add(V.add(V.sc(d, 1.9), V.sc(sd, .55)), [0, 1.7, 0])), a = V.add(p, [0, 1.55, 0]);
  camShot(e, V.add(e, V.sc(d, -.25)), a, a, 3);
}
const MISSIONS = [M1, M2, M3, M4, M5, M6];
function runMission(i, retry, chained) {
  MIS.token++; MIS.waiters.length = 0; MIS.cur = i; MIS.skip = false; DLG = null; $('dlg').classList.remove('on');
  if (!chained) { if (retry && MIS.CP) progLoad(MIS.CP); if (!retry) MIS.flags = {}; }
  if (!retry || !MIS.CP) MIS.CP = progSnap();
  hideScr(); hideHint(); S.mode = 'play'; S.ts = 1; S.slow = 0; $('hud').classList.remove('hide', 'dim');
  MISSIONS[i](retry, chained);
}

// ---------- HUD ----------
function setW(sel, v) { $(sel).style.width = clamp(v, 0, 1) * 100 + '%'; }
function hud(dt) {
  const mh = maxHp(); setW('hpI', P.hp / mh); setW('vgI', P.vig / 100); setW('luI', P.lume / 100);
  $('hpT').textContent = `${Math.ceil(P.hp)} / ${mh}`; $('lv').textContent = `Nv ${P.level}`; setW('xpI', P.level >= 8 ? 1 : (P.xp - XPT[P.level - 1]) / (XPT[P.level] - XPT[P.level - 1]));
  $('luI').parentNode.classList.toggle('full', P.lume >= 100);
  const sk = (id, unl, cd, max, ok) => { const el = $(id); el.classList.toggle('lock', !unl); el.classList.toggle('ready', unl && cd <= 0 && ok); el.querySelector('.cd').style.background = cd > 0 ? `conic-gradient(rgba(10,8,6,.72) ${cd / max * 360}deg, transparent 0)` : 'none'; el.querySelector('.t').textContent = cd > 0 ? Math.ceil(cd) : ''; };
  sk('skQ', P.unl.q, P.cd.q, P.nodes.afiado ? 4.5 : 6, P.lume >= 18); sk('skE', P.unl.e, P.cd.e, 12, P.lume >= 25); sk('skR', P.unl.r, P.cd.r, 8, P.lume >= 100);
  $('skP').querySelector('.t').textContent = P.potions; $('skP').classList.toggle('lock', P.potions <= 0);
  $('combo').textContent = P.hits >= 2 ? P.hits + ' golpes' : ''; $('combo').style.opacity = P.hitT > 0 ? 1 : 0;
  const boss = ENEMIES.find(e => e.boss); if (boss) { setW('bossI', boss.hp / boss.maxhp); $('bossP').style.width = (1 - boss.post / boss.maxpost) * 100 + '%'; }
  // trava de alvo
  const lm = $('lockm'); if (P.lock && !P.lock.dead) { const h = P.lock.boss ? 2.2 : P.lock.type === 'larva' ? .5 : 1.3; const s = R.project(V.add(P.lock.pos, [0, h, 0])); if (s) { lm.style.display = 'block'; lm.style.transform = `translate(${s[0]}px,${s[1]}px)`; } else lm.style.display = 'none'; } else lm.style.display = 'none';
  // marcador de objetivo
  const mk = $('mark'); if (MARK && S.mode === 'play') { const s = R.project([MARK[0], (MARK[1] || 0) + 2.6, MARK[2]]); if (s) { mk.style.display = 'block'; mk.style.transform = `translate(${clamp(s[0], 30, VW() - 30)}px,${clamp(s[1], 60, VH() - 60)}px)`; mk.querySelector('span').textContent = Math.round(V.d2(MARK, P.pos)) + ' m'; } else mk.style.display = 'none'; } else mk.style.display = 'none';
  // prompt de interação
  let pr = ''; if (S.mode === 'play') { const br = npcBy('brena'); if (MIS.cur === 0 && MARK === (br && br.pos) && V.d2(P.pos, br.pos) < 2.6) pr = 'Falar com Tia Brena'; if (MARK === W.seam && V.d2(P.pos, W.seam) < 2.4) pr = 'Recosturar a ponte'; }
  $('prompt').innerHTML = pr ? `<b>${TOUCH ? 'F' : 'F'}</b> ${pr}` : ''; $('prompt').style.opacity = pr ? 1 : 0;
  // HUD some fora de combate
  const inCombat = P.combatT > 0 || alive() > 0 || P.hp < mh * .99; $('hud').classList.toggle('calm', !inCombat);
}

// ---------- telas ----------
function showScr(id) { document.querySelectorAll('.scr').forEach(s => s.classList.toggle('on', s.id === id)); $('hud').classList.add('hide'); }
function hideScr() { document.querySelectorAll('.scr').forEach(s => s.classList.remove('on')); }
let PREV = 'menu';
function openPause() { if (S.mode !== 'play') return; S.mode = 'pause'; showScr('pause'); unlockPtr(); }
function bindMouseBtn() { const b = $('mouseBtn'); if (!b) return; if (TOUCH) { b.style.display = 'none'; return; } b.addEventListener('click', e => { e.stopPropagation(); toggleMouseCam(); }); }
function closePause() { hideScr(); S.mode = 'play'; $('hud').classList.remove('hide'); grabMouse(); }
function toMenu() { return toLobbyFull(); }
function toLobbyFull() { MIS.token++; MIS.waiters.length = 0; clearCombat(); DLG = null; $('dlg').classList.remove('on'); $('lb').classList.remove('on'); $('skip').classList.remove('on'); CAM.script = null; P.pos = [0, 0, -9]; refreshMenu(); toLobby(); }
function refreshMenu() { const s = readSave(); const b = $('bCont'); b.disabled = !s; $('saveInfo').textContent = s ? `Save solo · ${s.done ? 'Capítulos 1 e 2 concluídos' : 'Capítulo ' + (s.m < 3 ? 1 : 2) + ' · missão ' + (s.m % 3 + 1) + ' de 3'} · nível ${s.level} · ${new Date(s.t).toLocaleDateString('pt-BR')}` : 'Nenhuma jornada salva'; }
const TREE = [
  { k: 'afiado', n: 'Corte Afiado', c: 1, d: 'Corte de Fio causa +30% de dano e recarrega 1,5 s mais rápido.' },
  { k: 'recostura', n: 'Recostura Profunda', c: 1, d: 'Recostura Leve cura 40% da vida em vez de 25%.' },
  { k: 'contra', n: 'Contracorte Dourado', c: 2, d: 'Câmera lenta maior na esquiva perfeita e contracorte devolve 50% das recargas.' },
  { k: 'elemental', n: 'Fio Elemental', c: 1, req: 'cap2', d: 'Corte de Fio marca os inimigos: eles levam +25% de dano por 5 s. (Liberado no Capítulo 2)' },
];
function renderTree() { $('ptsN').textContent = P.pts; $('treeL').innerHTML = TREE.map(t => { const lock = t.req && !P.unl[t.req]; return `<div class="node ${P.nodes[t.k] ? 'have' : ''}"><div><h3>${t.n}</h3><p>${t.d}</p></div><button data-k="${t.k}" ${P.nodes[t.k] || P.pts < t.c || lock ? 'disabled' : ''}>${P.nodes[t.k] ? 'Aprendido' : lock ? 'Bloqueado' : 'Aprender · ' + t.c + ' pt' + (t.c > 1 ? 's' : '')}</button></div>`; }).join('');
  $('wInfo').textContent = `Talhador Curto ${P.wlvl ? '+' + P.wlvl : '(base)'} · ataque ${atk().toFixed(1)} · vida ${maxHp()}`; }
function bindUI() {
  const on = (id, f) => $(id).addEventListener('click', e => { AU.init(); AU.ui(); f(e); });
  on('bNew', () => { if (readSave()) { showScr('confirm'); } else startNew(); });
  on('bYes', () => startNew()); on('bNo', () => { refreshMenu(); toLobby(); });
  on('bCont', () => { const s = readSave(); if (!s) return; progLoad(s); MIS.flags = {}; MIS.CP = null; runMission(Math.min(s.m, MISSIONS.length - 1), s.m >= MISSIONS.length, false); });
  on('bOpt', () => { PREV = S.mode === 'pause' ? 'pause' : 'menu'; fillOpts(); showScr('opts'); });
  on('bQuit', () => showScr('bye')); on('bBye', () => { refreshMenu(); toLobby(); });
  on('bRes', closePause); on('bTree', () => { renderTree(); showScr('tree'); }); on('bOpt2', () => { PREV = 'pause'; fillOpts(); showScr('opts'); }); on('bMenu', toMenu);
  on('bTreeBack', () => showScr('pause')); on('bOptBack', () => { saveOpts(); showScr(PREV); });
  on('bRetry', () => { runMission(MIS.cur, true); }); on('bOverMenu', toMenu); on('bEndMenu', toMenu); on('bNext', () => { runMission(3, false); });
  $('treeL').addEventListener('click', e => { const k = e.target.dataset && e.target.dataset.k; if (!k) return; const t = TREE.find(x => x.k === k); if (P.pts >= t.c && !P.nodes[k] && !(t.req && !P.unl[t.req])) { P.pts -= t.c; P.nodes[k] = true; AU.chime(); renderTree(); } });
  $('skip').addEventListener('click', () => { MIS.skip = true; });
  for (const id of ['oSens', 'oMus', 'oSfx', 'oQual']) $(id).addEventListener('input', readOpts);
  for (const id of ['oInv', 'oNums', 'oEco']) $(id).addEventListener('change', readOpts);
}
function startNew() { localStorage.removeItem(SAVE_K); freshProg(); MIS.flags = {}; MIS.CP = null; writeSave(0, false); runMission(0, false); }
function fillOpts() { $('oSens').value = OPT.sens; $('oMus').value = OPT.music; $('oSfx').value = OPT.sfx; $('oQual').value = OPT.quality; $('oInv').checked = OPT.inv; $('oNums').checked = OPT.nums; $('oEco').checked = OPT.economia; readOpts(); }
function readOpts() { OPT.sens = +$('oSens').value; OPT.music = +$('oMus').value; OPT.sfx = +$('oSfx').value; OPT.quality = +$('oQual').value; OPT.inv = $('oInv').checked; OPT.nums = $('oNums').checked; OPT.economia = $('oEco').checked;
  $('vSens').textContent = OPT.sens.toFixed(1) + 'x'; $('vMus').textContent = Math.round(OPT.music * 100) + '%'; $('vSfx').textContent = Math.round(OPT.sfx * 100) + '%'; $('vQual').textContent = OPT.quality >= 1 ? 'Alta' : OPT.quality >= .75 ? 'Média' : 'Baixa';
  AU.vol(); const q = OPT.quality * (OPT.economia ? .75 : 1); if (window.QUALITY !== q) { window.QUALITY = q; resize(); } saveOpts(); }
// ---------- toque ----------
function bindTouch() {
  if (!TOUCH) return; $('touch').classList.add('on'); document.documentElement.classList.add('touchui'); const js = $('joy'), kn = js.querySelector('i'); let jid = null, jc = [0, 0], lid = null, lp = [0, 0];
  const tp = t => ROT ? [t.clientY, innerWidth - t.clientX] : [t.clientX, t.clientY];
  let tried = false; const goLand = () => { if (tried) return; tried = true; try { const el = document.documentElement, rf = el.requestFullscreen || el.webkitRequestFullscreen;
    const p = rf && rf.call(el); const lock = () => { try { const q = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); if (q && q.catch) q.catch(() => { }); } catch (e) { } };
    if (p && p.then) p.then(lock).catch(() => { }); else lock(); } catch (e) { } };
  addEventListener('touchend', goLand, { once: true });
  addEventListener('touchstart', e => { for (const t of e.changedTouches) { if (t.target.closest('.scr,#dlg,#skip')) continue; if (t.target.closest('.tb')) continue; const [x, y] = tp(t);
    if (x < VW() * .4 && jid === null) { jid = t.identifier; jc = [x, y]; js.style.left = (x - 60) + 'px'; js.style.top = (y - 60) + 'px'; js.classList.add('on'); }
    else if (lid === null) { lid = t.identifier; lp = [x, y]; } } }, { passive: true });
  addEventListener('touchmove', e => { for (const t of e.changedTouches) { const [x, y] = tp(t); if (t.identifier === jid) { let dx = (x - jc[0]) / 55, dy = (y - jc[1]) / 55; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } TI.mx = dx; TI.mz = -dy; kn.style.transform = `translate(${dx * 40}px,${dy * 40}px)`; }
    if (t.identifier === lid) { TI.lx += x - lp[0]; TI.ly += y - lp[1]; lp = [x, y]; } } }, { passive: true });
  const end = e => { for (const t of e.changedTouches) { if (t.identifier === jid) { jid = null; TI.mx = TI.mz = 0; kn.style.transform = ''; js.classList.remove('on'); } if (t.identifier === lid) lid = null; } };
  addEventListener('touchend', end); addEventListener('touchcancel', end);
  document.querySelectorAll('.tb').forEach(b => { const k = b.dataset.b; b.addEventListener('touchstart', e => { e.preventDefault(); AU.init(); TI.b[k] = true; if (k === 'hv') TI.b.hvH = true; }, { passive: false }); b.addEventListener('touchend', e => { e.preventDefault(); if (k === 'hv') TI.b.hvH = false; }, { passive: false }); });
}

// ================= LAÇO PRINCIPAL =================
let last = performance.now(), fpsA = 60;
function frame(now) {
  requestAnimationFrame(frame);
  if (OPT.economianomia && now - last < 1000 / 30 - 2) return;
  const raw = (now - last) / 1000; let rdt = Math.min(raw, 1 / 20); last = now; fpsA = lerp(fpsA, 1 / Math.max(raw, .001), .05); if (window.FIXDT) rdt = window.FIXDT;
  const I = readInput(); MIS.act = I.act;
  if (S.slow > 0) { S.slow -= rdt; if (S.slow <= 0) S.ts = 1; }
  let dt = rdt * S.ts; if (S.hitstop > 0) { S.hitstop -= rdt; dt *= .05; }
  if (S.mode === 'play') {
    if (I.pause) { openPause(); }
    else { S.time += dt; playerUpdate(dt, I); for (const e of ENEMIES) enemyUpdate(e, dt); separate(); updProj(dt); updHoles(dt);
      for (let i = ENEMIES.length - 1; i >= 0; i--) if (ENEMIES[i].dead && ENEMIES[i].deadT > 2.5) ENEMIES.splice(i, 1); }
    camUpdate(dt, I);
  } else if (S.mode === 'cut') {
    if (KP_skip(I)) MIS.skip = true;
    S.time += dt; cutPlayer(dt); for (const e of ENEMIES) { if (e.y > 0 || e.vy > 0) { e.vy -= 18 * dt; e.y += e.vy * dt; if (e.y <= 0) { e.y = 0; e.vy = 0; S.shake = 1.2; AU.hit(true); puff(e.pos, [.5, .45, .4], 20, 1.2, .35); } } e.t += dt; }
    camUpdate(dt, { lx: 0, ly: 0 });
  } else if (S.mode === 'dialog') { cutPlayer(0); camUpdate(rdt, { lx: 0, ly: 0 }); }
  else if (S.mode === 'pause' && I.pause) { closePause(); camUpdate(0, { lx: 0, ly: 0 }); }
  else if (S.mode === 'lobby') { S.time += rdt; lobbyFrame(rdt); }
  else if (S.mode === 'menu') { const t = now / 1000 * .06; CAM.script = null; R.setCam([Math.sin(t) * 22, 7 + Math.sin(t * 2) * 1.5, -10 + Math.cos(t) * 22], [0, 3, -12]); S.time += rdt; RIFT.ts = 0; }
  else { camUpdate(0, { lx: 0, ly: 0 }); }
  { const tr = P.pos[0] > 14 && P.pos[0] < SX - 25 && pertoTrilha(P.pos[0], P.pos[2]).d < 8, alto = P.pos[0] > SX - 25 ? 2 : tr ? 1 : 0;
    if (S.mode !== 'lobby' && S.mode !== 'menu' && frame.alto !== alto) { frame.alto = alto; Object.assign(R.env, alto === 2 ? ENV_SERRA : alto === 1 ? ENV_TRILHA : ENV0); } }
  if (S.mode === 'play' && !window.FIXDT) { frame.acc = (frame.acc || 0) + raw; if (frame.acc > 5) { frame.acc = 0; if (fpsA < (OPT.economia ? 24 : 32) && OPT.quality > .5) { OPT.quality = Math.max(.5, OPT.quality - .25); window.QUALITY = OPT.quality; resize(); saveOpts(); } } }
  { const mb = $('mouseBtn'); if (mb && !TOUCH) { const v = S.mode === 'play' ? '' : 'none'; if (mb.style.display !== v) mb.style.display = v; } }
  if (TOUCH) { const v = S.mode === 'play' ? '' : 'hidden'; if ($('touch').style.visibility !== v) $('touch').style.visibility = v; }
  if (S.mode === 'play') { const nearBroken = (!W.bridgeOk && Math.abs(P.pos[0]) < 6 && P.pos[2] < -48 && P.pos[2] > -72 && !/trilha/.test($('obj').textContent)) || (P.pos[0] > 200 && W.serra.bridges.some(b => !b.ok && V.d2(P.pos, [SX, 0, b.rect[2]]) < 4) && P.pos[0] > SX - 20);
    if (nearBroken && !(frame.bt > 0)) { frame.bt = 8; hint('A ponte está <b>quebrada</b>. Para atravessar, siga o objetivo lá em cima: <b>' + $('obj').textContent + '</b>. O losango dourado mostra o caminho.', 6000); } frame.bt = (frame.bt || 0) - rdt; }
  dlgTick(I); tickWaiters(); if (typeof netTick === 'function') netTick(rdt);
  // desenhar
  const vdt = S.mode === 'play' || S.mode === 'cut' ? dt : rdt * .3;
  drawWorld(S.time);
  if (S.mode !== 'menu') P.rig.draw(); if (S.mode !== 'lobby') { updNpcs(vdt); drawNpcs(); }
  for (const e of ENEMIES) enemyDraw(e, (S.mode === 'play' || S.mode === 'cut') ? dt : 0);
  if (typeof netDraw === 'function') netDraw(rdt);
  drawTrail(); updWaves(S.mode === 'play' ? dt : 0); updUlt(S.mode === 'play' ? dt : 0); drawRift(vdt); updParts(S.mode === 'pause' || S.mode === 'over' ? 0 : vdt);
  if (MIS.barrier) { for (const [z, w] of [[-68.4, 3.2], [-95.6, 4]]) for (let k = 0; k < 5; k++) { const y = .3 + k * .45; drawThread([-w, y, z], [w, y + .1, z], .05, [1, .3, .5], .05, S.time + k, false); } }
  if (!W.gate.off && !MIS.barrier) for (let k = 0; k < 4; k++) { const y = .4 + k * .5; drawThread([-3.6, y, -96], [3.6, y, -96], .1, [.9, .3, .5], .04, S.time + k, false); }
  { const pa = MIS.cur === 4 && NPCS.find(n => n.key === 'pastor' && n.act === 'kneel'); if (pa) for (let k = 0; k < 8; k++) { const an = k / 8 * 6.28 + S.time * .2; drawThread([pa.pos[0] + Math.sin(an) * 1.1, 0, pa.pos[2] + Math.cos(an) * 1.1], [pa.pos[0] + Math.sin(an + .6) * .4, 2.2, pa.pos[2] + Math.cos(an + .6) * .4], .05, [.95, .3, .6], .05, S.time + k, false); } }
  if (MARK && S.mode === 'play') { R.ring(MARK[0], MARK[2], 1.1 + Math.sin(S.time * 3) * .1, .12, [1, .85, .5], .7); R.light([MARK[0], 1.5, MARK[2]], [1, .8, .4], 4); }
  if (window.NORENDER) { R.items.length = 0; R.lights.length = 0; fxN = 0; } else R.render(S.mode === 'menu' ? [0, 0, -12] : S.mode === 'lobby' ? LP : P.pos, S.time);
  updNums(S.mode === 'play' || S.mode === 'cut' ? rdt : 0);
  if (S.mode !== 'menu' && S.mode !== 'load' && S.mode !== 'lobby') hud(rdt);
}
function KP_skip(I) { return I.pause; }
function cutPlayer(dt) {
  if (P.cutTo) { const d = V.sub(P.cutTo, P.pos), l = Math.hypot(d[0], d[2]); if (l > .15) { const s = Math.min(4 * dt, l); P.pos[0] += d[0] / l * s; P.pos[2] += d[2] / l * s; P.yaw = Math.atan2(d[0], d[2]); P.sp = 1; P.ph += dt * 7; } else { P.cutTo = null; P.sp = 0; } } else P.sp *= .85;
  animAny(P.rig, { ph: P.ph, sp: P.sp, act: P.cutAct || null, t: 0, ready: false }, Math.max(dt, .016));
  P.pos[1] = groundY(P.pos[0], P.pos[2]); P.rig.pos = [P.pos[0], P.pos[1] + (P.rig.yOff || 0), P.pos[2]]; P.rig.yaw = P.yaw; P.rig.pitch = 0; P.rig.update();
}
async function loadMaps() {
  if (typeof MAPZ === 'undefined') return;
  for (const k in MAPZ) { try {
    const bin = /\.gz$/.test(MAPZ[k]) ? new Uint8Array(await (await fetch(MAPZ[k])).arrayBuffer()) : Uint8Array.from(atob(MAPZ[k]), c => c.charCodeAt(0));
    const txt = bin[0] === 0x1f && bin[1] === 0x8b ? await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).text() : new TextDecoder().decode(bin);
    MAPS[k] = JSON.parse(txt);
  } catch (e) { console.error('mapa ' + k, e); } }
}
async function loadAssets() {
  await loadMaps();
  if (typeof ASSETS === 'undefined' || !ASSETS.anims) return;
  try {
    const lib = await loadModel(ASSETS.anims);
    const loco = ASSETS.loco ? await loadModel(ASSETS.loco).catch(() => null) : null;
    for (const k in ASSETS) { if (k === 'anims' || k === 'loco') continue; try { const m = await loadModel(ASSETS[k]); bindAnims(m, lib); if (loco) bindAnims(m, loco); MODELS[k] = m; $('load').textContent = 'Costurando Orlavento… ' + Object.keys(MODELS).length; } catch (e) { console.error('modelo ' + k, e); } }
    window.NERA_MODEL = MODELS.nera; lobLoad(); P.rig = CAST[HERO.k](); P.rig.pos = [...P.pos]; P.rig.update();
  } catch (e) { console.error('Falha ao carregar os personagens do Mixamo:', e); }
}
async function boot() {
  await loadAssets();
  buildWorld(); W.gate = { b: [-3.6, 3.6, -95.6, -96.6], off: false }; W.obst.push(W.gate);
  bindUI(); bindTouch(); bindMouseBtn(); stage(0); P.pos = [0, 0, -9]; P.rig.update(); refreshMenu();
  $('load').style.display = 'none'; lobLoad(); buildLobby(); toLobby(); requestAnimationFrame(frame);
  window.DBG = { get fps() { return fpsA; }, TRILHAS, trilhaEmT: (T, s) => trilhaEmT(T, s), trilhaEm: s => trilhaEm(s), get NET() { return typeof NET !== 'undefined' ? NET : null; }, HEROIS, LOB, escolherHeroi, get HERO() { return HERO; }, SKANIM, P, MIS, ENEMIES, runMission, S, spawn, W, CAM, NPCS, hurtEnemy };
}
setTimeout(() => { try { boot(); } catch (e) { $('load').textContent = 'Erro ao carregar: ' + e.message; throw e; } }, 30);
