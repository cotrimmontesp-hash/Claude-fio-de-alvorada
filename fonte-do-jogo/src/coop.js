// ================= JOGAR JUNTO (co-op online) =================
// O líder (quem criou a sala) roda a missão e os inimigos; os amigos mandam a posição e os golpes deles.
const NET = { on: false, guest: false, others: {}, ghosts: {}, tp: 0, ts: 0, hostPos: null, obj: '', mode: 'play', lastHit: {}, dlgT: 0 };
function netAtivo() { return !!LOB.sala && (LOB.souHost ? LOB.conns.some(c => c.open) : !!(LOB.host && LOB.host.open)); }
function netEnviar(m) { if (LOB.souHost) { for (const c of LOB.conns) if (c.open) c.send(m); } else if (LOB.host && LOB.host.open) LOB.host.send(m); }
function netPara(id, m) { const c = LOB.conns.find(c => c.peer === id); if (c && c.open) c.send(m); }
// ---------- líder: começar a missão leva todo mundo junto ----------
const _runMission = runMission;
runMission = function (i, retry, chained) {
  if (NET.guest) return; // amigo não começa missão sozinho: segue o líder
  _runMission(i, retry, chained);
  if (LOB.souHost && netAtivo()) { NET.on = true; netEnviar({ t: 'start', i, pos: P.pos }); }
};
const _toLobby = toLobby;
toLobby = function () { if (NET.on && LOB.souHost) netEnviar({ t: 'lobby' }); NET.on = false; NET.guest = false; netLimpa(); _toLobby(); };
function netLimpa() { for (const id in NET.ghosts) { const e = NET.ghosts[id], k = ENEMIES.indexOf(e); if (k >= 0) ENEMIES.splice(k, 1); } NET.ghosts = {}; }
// ---------- mensagens ----------
function netRecebe(from, d) {
  if (d.t === 'p') { // posição/animação de um jogador
    const id = d.id || from; if (LOB.souHost) for (const c of LOB.conns) if (c.open && c.peer !== from) c.send({ ...d, id });
    let o = NET.others[id]; if (!o) o = NET.others[id] = { pos: [...d.pos], yaw: d.yaw };
    const py = o.yaw, pp = o.pos; Object.assign(o, d); o.yaw = py; o.pos = pp; o.tyaw = d.yaw; o.tpos = d.pos; o.seen = performance.now();
    if (!o.rig || o.rk !== d.k) { o.rig = CAST[heroBy(d.k).k](); o.rk = d.k; }
    if (d.host) NET.hostPos = d.pos;
  }
  else if (d.t === 'start' && !LOB.souHost) netEntrarComoAmigo(d);
  else if (d.t === 'lobby' && !LOB.souHost) { NET.on = false; NET.guest = false; netLimpa(); _toLobby(); banner('Esquadrão', 'O líder voltou para o lobby'); }
  else if (d.t === 'snap' && NET.guest) netSnap(d);
  else if (d.t === 'hit' && LOB.souHost) { const e = ENEMIES.find(e => e.id === d.id); if (e && !e.dead) { const sv = [P.hits, P.lume, P.combatT]; hurtEnemy(e, d.base, d.kind, d.post, d.o || {}); [P.hits, P.lume, P.combatT] = sv; } }
  else if (d.t === 'dano' && NET.guest) { const src = NET.ghosts[d.src] || null; hurtPlayer(d.dmg, src); }
  else if (d.t === 'fala' && NET.guest) netFala(d);
}
function netEntrarComoAmigo(d) {
  NET.on = true; NET.guest = true; MIS.token++; MIS.waiters.length = 0; netLimpa();
  stage(d.i); MIS.cur = d.i; P.pos = [d.pos[0] + rnd(-1.5, 1.5), 0, d.pos[2] + 1.5]; P.yaw = Math.PI; camRelease();
  MIS.onDeath = function () { setTimeout(() => { if (!NET.guest) return; P.hp = maxHp(); P.st = 'move'; const h = NET.hostPos || P.pos; P.pos = [h[0] + 1, 0, h[2] + 1]; banner('De pé!', 'Você voltou ao lado do líder'); }, 3000); };
  hideScr(); $('hud').classList.remove('hide', 'dim'); S.mode = 'play'; S.ts = 1; AU.music('calm'); banner('Esquadrão', 'Você entrou na missão do líder');
}
// ---------- líder: foto do mundo para os amigos ----------
function netSnapEnvia() {
  const en = ENEMIES.filter(e => !e.dead || e.deadT < 1).map(e => [e.id, e.type, +e.pos[0].toFixed(2), +e.pos[2].toFixed(2), +e.yaw.toFixed(2), e.st, +(e.t || 0).toFixed(2), e.at == null ? null : +e.at.toFixed(2), Math.round(e.hp), e.maxhp, e.dead ? 1 : 0, +(e.y || 0).toFixed(2), e.fury ? 1 : 0, +(e.baseScale || 1).toFixed(2), +(e.sp || 0).toFixed(2), e.elite ? 1 : 0]);
  const B = W.serra.bridges.map(b => b.ok ? 1 : 0);
  netEnviar({ t: 'snap', en, obj: $('obj').textContent, mode: S.mode, br: W.bridgeOk ? 1 : 0, gate: W.gate.off ? 1 : 0, bar: MIS.barrier ? 1 : 0, B, holes: HOLES.map(h => [+h.p[0].toFixed(2), +h.p[1].toFixed(2), h.r, h.open ? 1 : 0, +h.t.toFixed(2), +h.life.toFixed(1)]), conf: W.confine && W.confine.c ? [W.confine.c[0], W.confine.c[1], +W.confine.r.toFixed(2)] : null, boss: $('bossbar').classList.contains('on') ? $('bossbar').querySelector('.nm').textContent : '' });
}
function netSnap(d) {
  const vivos = new Set();
  for (const s of d.en) { const [id, type, x, z, yaw, st, t, at, hp, maxhp, dead, y, fury, bs, sp, elite] = s; vivos.add(id);
    let e = NET.ghosts[id];
    if (!e) { if (dead) continue; e = spawn(type, x, z, { instant: true }); e.ghost = true; e.id = id; NET.ghosts[id] = e; e.maxhp = maxhp; }
    e.tpos = [x, 0, z]; e.tyaw = yaw; e.st = st; e.t = t; e.at = at; e.hp = hp; e.maxhp = maxhp; e.y = y; e.fury = !!fury; e.baseScale = bs; e.sp = sp; e.elite = !!elite;
    if (dead && !e.dead) { e.dead = true; e.deadT = 0; if (performance.now() - (NET.lastHit[id] || 0) < 6000) gainXP(e.d.xp, V.add(e.pos, [0, 2.6, 0])); if (P.lock === e) P.lock = null; for (let k = 0; k < 20; k++) part(V.add(e.pos, [0, 1, 0]), [rnd(-3, 3), rnd(0, 4), rnd(-3, 3)], rnd(.4, 1), .07, [.95, .35, .6]); } }
  for (const id in NET.ghosts) if (!vivos.has(+id)) { const e = NET.ghosts[id], k = ENEMIES.indexOf(e); if (k >= 0) ENEMIES.splice(k, 1); delete NET.ghosts[id]; }
  $('obj').textContent = d.obj; W.bridgeOk = !!d.br; W.gate.off = !!d.gate; MIS.barrier = !!d.bar; d.B.forEach((v, k) => { if (W.serra.bridges[k]) W.serra.bridges[k].ok = !!v; });
  HOLES.length = 0; for (const h of d.holes) HOLES.push({ p: [h[0], h[1]], r: h[2], open: !!h[3], t: h[4], life: h[5] });
  W.confine = d.conf ? { c: [d.conf[0], d.conf[1]], r: d.conf[2] } : null;
  const bb = $('bossbar'); if (d.boss) { bb.classList.add('on'); bb.querySelector('.nm').textContent = d.boss; } else bb.classList.remove('on');
  $('lb').classList.toggle('on', d.mode === 'cut'); NET.mode = d.mode;
}
// amigo: inimigo "fantasma" só segue o que o líder manda
const _enemyUpdate = enemyUpdate;
enemyUpdate = function (e, dt) {
  if (e.ghost) { e.flash = Math.max(0, e.flash - dt * 5); if (e.dead) { e.deadT += dt; return; } e.spawnT = 0;
    if (e.tpos) { const k = 1 - Math.exp(-12 * dt); e.pos[0] += (e.tpos[0] - e.pos[0]) * k; e.pos[2] += (e.tpos[2] - e.pos[2]) * k; e.yaw += angDiff(e.yaw, e.tyaw) * k; }
    e.ph += dt * (2 + (e.sp || 0) * 7); return; }
  if (!(NET.on && LOB.souHost)) return _enemyUpdate(e, dt);
  // líder: o inimigo persegue o jogador mais perto (você ou um amigo)
  let alvo = null, best = P.st === 'dead' ? 1e9 : V.d2(e.pos, P.pos);
  for (const id in NET.others) { const o = NET.others[id]; if (!o.tpos || o.morto || performance.now() - o.seen > 4000) continue; const d = V.d2(e.pos, o.pos); if (d < best - .5) { best = d; alvo = { id, o }; } }
  if (!alvo) return _enemyUpdate(e, dt);
  const sv = P.pos, ss = P.st, si = P.iframe, sm = P.mercy; P.pos = alvo.o.pos; P.st = 'move'; P.iframe = 0; P.mercy = 0; NET.alvo = alvo;
  try { _enemyUpdate(e, dt); } finally { P.pos = sv; P.st = ss; P.iframe = si; P.mercy = sm; NET.alvo = null; }
};
const _hurtPlayer = hurtPlayer;
hurtPlayer = function (dmg, src) {
  if (NET.alvo) { const a = NET.alvo; if (!(a.o.cd > 0)) { netPara(a.id, { t: 'dano', dmg, src: src ? src.id : null }); a.o.cd = .35; } return true; }
  return _hurtPlayer(dmg, src);
};
const _hurtEnemy = hurtEnemy;
hurtEnemy = function (e, base, kind, post, o = {}) {
  if (!e.ghost) return _hurtEnemy(e, base, kind, post, o);
  if (e.dead) return;
  netEnviar({ t: 'hit', id: e.id, base, kind, post, o: { crit: o.crit, heavy: o.heavy, launch: o.launch, mark: o.mark } }); NET.lastHit[e.id] = performance.now();
  const dmg = Math.round(base * rnd(.92, 1.08)); e.flash = 1; P.hits++; P.hitT = 2; P.combatT = 4; P.lume = Math.min(100, P.lume + (kind === 'p' ? 2 : 5));
  num(V.add(e.pos, [0, 2, 0]), dmg, kind); sparks(V.add(e.pos, [0, 1.1, 0]), [1, .8, .5], 9); AU.hit(o.heavy);
};
// fala do líder aparece para os amigos
let _netFalaT = 0;
function netFala(d) { const box = $('dlg'); if (d.fim) { box.classList.remove('on'); return; } box.classList.add('on'); box.querySelector('.who').textContent = d.who || ''; box.querySelector('.who').style.color = WHO[d.who || ''] || '#ddd'; box.classList.toggle('narr', !d.who); box.querySelector('.tx').textContent = d.tx; _netFalaT = 6; }
const _showLine = showLine;
showLine = function (l, auto) { const p = _showLine(l, auto); if (NET.on && LOB.souHost) { const sl = { ...l, who: swapNome(l.who), t: swapNome(l.t) }; netEnviar({ t: 'fala', who: sl.who, tx: sl.t }); p.then(() => netEnviar({ t: 'fala', fim: true })); } return p; };
// ---------- a cada quadro ----------
function netTick(dt) {
  if (!NET.on) return;
  if (!netAtivo()) { if (NET.guest) { NET.on = false; NET.guest = false; netLimpa(); banner('Esquadrão', 'Conexão com o líder perdida'); _toLobby(); } else NET.on = false; return; }
  NET.tp -= dt; NET.ts -= dt;
  if (NET.tp <= 0) { NET.tp = 1 / 15;
    const actMap = { atk: P.cur && P.cur.pose, charge: 'charge', dodge: 'dodge', hit: 'hit', cast: 'cast', qcast: 's1', ult: 'ult', dead: 'dead' };
    const at = P.st === 'atk' && P.cur ? P.t / P.cur.dur : P.st === 'qcast' ? P.t / .4 : P.st === 'ult' ? P.t / 1.05 : P.t;
    const m = { t: 'p', pos: [+P.pos[0].toFixed(2), 0, +P.pos[2].toFixed(2)], yaw: +P.yaw.toFixed(2), ph: +P.ph.toFixed(2), sp: +P.sp.toFixed(2), act: actMap[P.st] || null, at: +(at || 0).toFixed(2), k: HERO.k, nome: LOB.nome || 'Jogador', hp: Math.round(P.hp), mhp: maxHp(), host: LOB.souHost ? 1 : 0, morto: P.st === 'dead' ? 1 : 0 };
    if (LOB.souHost) m.id = 'host'; netEnviar(m); }
  if (LOB.souHost && NET.ts <= 0) { NET.ts = 1 / 12; netSnapEnvia(); }
  if (NET.guest) { _netFalaT -= dt; if (_netFalaT < 0 && _netFalaT > -1) { $('dlg').classList.remove('on'); _netFalaT = -2; }
    if (NET.hostPos && V.d2(P.pos, NET.hostPos) > 45 && S.mode === 'play') { P.pos = [NET.hostPos[0] + 1, 0, NET.hostPos[2] + 1]; } }
}
function netDraw(dt) {
  if (!NET.on) return; const now = performance.now();
  for (const id in NET.others) { const o = NET.others[id]; if (!o.rig || now - o.seen > 5000) continue;
    const k = 1 - Math.exp(-14 * dt); o.pos[0] += (o.tpos[0] - o.pos[0]) * k; o.pos[2] += (o.tpos[2] - o.pos[2]) * k; o.yaw += angDiff(o.yaw, o.tyaw ?? o.yaw) * k; o.cd = Math.max(0, (o.cd || 0) - dt);
    const r = o.rig; animAny(r, { ph: o.ph, sp: o.sp, act: o.morto ? 'dead' : o.act, t: o.at, ready: true }, dt);
    r.pos = [o.pos[0], r.yOff || 0, o.pos[2]]; r.yaw = (o.yaw ?? 0) + (r.extraYaw || 0); r.pitch = 0; r.update(); r.draw();
    const c = heroBy(o.k).cor; R.ring(o.pos[0], o.pos[2], .55, .05, c, .6);
    if (!o.tag) { o.tag = document.createElement('div'); o.tag.className = 'nettag'; document.body.appendChild(o.tag); }
    const sp = R.project([o.pos[0], 2.25, o.pos[2]]); if (sp && S.mode !== 'lobby') { o.tag.style.display = ''; o.tag.style.left = sp[0] + 'px'; o.tag.style.top = sp[1] + 'px'; o.tag.innerHTML = esc(o.nome || '') + '<i style="width:' + Math.round(100 * clamp((o.hp || 0) / (o.mhp || 100), 0, 1)) + '%"></i>'; } else o.tag.style.display = 'none'; }
}
// amigo apertando JOGAR espera o líder
function netLobbyBotao() { const b = $('lbJogar'); if (!b) return; const amigo = LOB.sala && !LOB.souHost; b.disabled = !!amigo; b.textContent = amigo ? 'ESPERANDO O LÍDER' : 'JOGAR'; }

// ---------- modo de teste local (?teste=1): troca a internet por um canal entre abas do mesmo navegador ----------
if (/[?&]teste=1/.test(location.search)) {
  const BC = new BroadcastChannel('fio-teste'), peers = {};
  const mkConn = (me, other, cid) => { const h = {}, c = { peer: other, open: false, on: (k, f) => (h[k] = f), send: m => BC.postMessage({ k: 'd', to: other, from: me, cid, m }), close: () => { } , _h: h }; return c; };
  window.Peer = function (id) { const me = id || 'p' + Math.random().toString(36).slice(2, 8), h = {}, conns = {}; peers[me] = 1;
    const api = { id: me, on: (k, f) => (h[k] = f), destroy: () => { }, connect: (to) => { const cid = Math.random().toString(36).slice(2); const c = mkConn(me, to, cid); conns[cid] = c; BC.postMessage({ k: 'c', to, from: me, cid }); return c; } };
    BC.addEventListener('message', ev => { const d = ev.data; if (d.to !== me) return;
      if (d.k === 'c') { const c = mkConn(me, d.from, d.cid); conns[d.cid] = c; h.connection && h.connection(c); setTimeout(() => { c.open = true; c._h.open && c._h.open(); BC.postMessage({ k: 'ok', to: d.from, from: me, cid: d.cid }); }, 50); }
      else if (d.k === 'ok') { const c = conns[d.cid]; if (c) { c.open = true; c._h.open && c._h.open(); } }
      else if (d.k === 'd') { const c = conns[d.cid]; if (c && c._h.data) c._h.data(JSON.parse(JSON.stringify(d.m))); } });
    setTimeout(() => h.open && h.open(me), 30); return api; };
}
