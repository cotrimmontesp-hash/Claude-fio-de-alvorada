// ================= LOBBY (escolha do personagem e esquadrão) =================
const HEROIS = [
  { k: 'nera', nome: 'Nera', papel: 'Recosturadeira', txt: 'Equilibrada: golpes rápidos e cura de fio.', dmg: 1, hp: 1, spd: 1, cor: [1, .85, .55], css: '#f3d9a0' },
  { k: 'iaro', nome: 'Iaro', papel: 'Paladino da Brasa', txt: 'Lâmina pesada: bate forte, anda devagar.', dmg: 1.22, hp: 1.15, spd: .9, cor: [1, .55, .25], css: '#e3a45a' },
  { k: 'lira', nome: 'Lira', papel: 'Lâmina do Vento', txt: 'A mais veloz: entra e sai das lutas.', dmg: .92, hp: .9, spd: 1.16, cor: [.65, 1, .5], css: '#a8d48a' },
  { k: 'ruan', nome: 'Ruan', papel: 'Guarda de Ferro', txt: 'Muita vida: aguenta a pancada pelo grupo.', dmg: .95, hp: 1.32, spd: .95, cor: [.55, .7, 1], css: '#8fb4ff' },
  { k: 'mireia', nome: 'Mireia', papel: 'Fiandeira da Maré', txt: 'Golpes que cortam fundo, mas é frágil.', dmg: 1.12, hp: .9, spd: 1.05, cor: [.5, 1, .9], css: '#8fd8cf' },
  { k: 'oren', nome: 'Oren', papel: 'Mestre da Tempestade', txt: 'Veterano: forte e resistente.', dmg: 1.15, hp: 1.06, spd: 1, cor: [.7, .9, 1], css: '#a9e6ff' },
];
let HERO = HEROIS[0];
const LOB = { yaw: 0, drag: null, amigos: [], rigs: {}, nome: '', peer: null, conns: [], host: null, sala: null, souHost: false };
const LP = [0, 0, -15]; // onde o personagem fica em pé no lobby (praça de Orlavento)
const SLOTS = [[-1.55, 0, -15.9], [1.55, 0, -15.9], [-3, 0, -17], [3, 0, -17]];
function heroBy(k) { return HEROIS.find(h => h.k === k) || HEROIS[0]; }
function lobSave() { try { localStorage.setItem('fio_lobby', JSON.stringify({ k: HERO.k, nome: LOB.nome })); } catch (e) { } }
function lobLoad() { try { const s = JSON.parse(localStorage.getItem('fio_lobby') || '{}'); if (s.k) HERO = heroBy(s.k); if (s.nome) LOB.nome = s.nome; } catch (e) { } }
// troca de nomes na história: quem você escolhe vira o protagonista e a Nera assume o lugar dele
function swapNome(t) {
  if (!t || HERO.k === 'nera') return t;
  return t.replace(new RegExp('\\b(Nera|' + HERO.nome + ')\\b', 'g'), m => m === 'Nera' ? HERO.nome : 'Nera');
}
function npcKey(k) { return HERO.k !== 'nera' && k === HERO.k ? 'nera' : k; }
function escolherHeroi(k) {
  HERO = heroBy(k); P.rig = CAST[HERO.k](); P.rig.pos = [...LP]; P.rig.update(); lobSave(); lobUI(); lobSend({ t: 'eu', nome: LOB.nome, k: HERO.k });
  AU.chime && AU.chime(); for (let q = 0; q < 26; q++) part([LP[0] + rnd(-.5, .5), rnd(0, 2), LP[2] + rnd(-.5, .5)], [rnd(-1, 1), rnd(1, 3), rnd(-1, 1)], .8, .08, HERO.cor);
}
function lobUI() {
  const h = HERO; $('lbNome').textContent = h.nome; $('lbNome').style.color = h.css; $('lbPapel').textContent = h.papel; $('lbTxt').textContent = h.txt;
  const bar = (id, v) => { $(id).style.width = Math.round(clamp(v, 0, 1.4) / 1.4 * 100) + '%'; };
  bar('lbF', h.dmg); bar('lbV', h.hp); bar('lbR', h.spd);
  document.querySelectorAll('#lbHerois .hc').forEach(b => b.classList.toggle('on', b.dataset.k === h.k));
  const sv = readSave(); $('lbJogar').textContent = sv ? 'JOGAR' : 'JOGAR'; $('lbSub').textContent = sv ? (sv.done ? 'Capítulos 1 e 2 concluídos' : 'Continuar: Capítulo ' + (sv.m < 3 ? 1 : 2) + ' · missão ' + (sv.m % 3 + 1)) : 'Nova jornada · Capítulo 1';
  // esquadrão
  const sl = $('lbSlots'); sl.innerHTML = '';
  const eu = document.createElement('div'); eu.className = 'slot eu'; eu.innerHTML = '<b>' + esc(LOB.nome || 'Você') + '</b><span>' + h.nome + (LOB.souHost || !LOB.sala ? ' · líder' : '') + '</span>'; sl.appendChild(eu);
  for (let i = 0; i < 4; i++) { const a = LOB.amigos[i], d = document.createElement('div');
    if (a) { d.className = 'slot'; d.innerHTML = '<b>' + esc(a.nome || 'Amigo') + '</b><span>' + heroBy(a.k).nome + (a.host ? ' · líder' : '') + '</span>'; }
    else { d.className = 'slot vazio'; d.innerHTML = '<i>+</i><span>Chamar amigo</span>'; d.onclick = abrirConvite; }
    sl.appendChild(d); }
  $('lbSala').textContent = LOB.sala ? 'Sala ' + LOB.sala + ' · ' + (1 + LOB.amigos.length) + '/5' : 'Esquadrão 1/5';
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function buildLobby() {
  const box = $('lbHerois'); box.innerHTML = '';
  for (const h of HEROIS) { const b = document.createElement('button'); b.className = 'hc'; b.dataset.k = h.k; b.style.setProperty('--c', h.css);
    b.innerHTML = '<b>' + h.nome + '</b><span>' + h.papel + '</span>'; b.onclick = e => { e.stopPropagation(); escolherHeroi(h.k); }; box.appendChild(b); }
  $('lbNomeIn').value = LOB.nome; $('lbNomeIn').oninput = e => { LOB.nome = e.target.value.slice(0, 16); lobSave(); lobUI(); lobSend({ t: 'eu', nome: LOB.nome, k: HERO.k }); };
  $('lbJogar').onclick = () => { const s = readSave(); if (s) { progLoad(s); MIS.flags = {}; MIS.CP = null; runMission(Math.min(s.m, MISSIONS.length - 1), s.m >= MISSIONS.length, false); } else startNew(); };
  $('lbNova').onclick = () => { if (readSave()) showScr('confirm'); else startNew(); };
  $('lbOpt').onclick = () => { PREV = 'lobby'; fillOpts(); showScr('opts'); };
  $('lbSair').onclick = () => showScr('bye');
  $('lbConv').onclick = abrirConvite; $('cvFechar').onclick = () => $('conv').classList.remove('on');
  $('cvCopiar').onclick = async () => { const l = linkSala(); try { await navigator.clipboard.writeText(l); $('cvMsg').textContent = 'Link copiado! Mande pros seus amigos.'; } catch (e) { $('cvMsg').textContent = l; } };
  $('cvZap').onclick = () => { const l = linkSala(), t = 'Bora jogar Fio de Alvorada comigo! Entra na minha sala: ' + l; if (navigator.share) navigator.share({ title: 'Fio de Alvorada', text: t, url: l }).catch(() => { }); else open('https://wa.me/?text=' + encodeURIComponent(t), '_blank'); };
  $('cvEntrar').onclick = () => { const c = $('cvCod').value.trim().toUpperCase(); if (c.length >= 4) entrarSala(c); };
  // girar o personagem arrastando
  const sc = $('lobby');
  sc.addEventListener('pointerdown', e => { if (e.target === sc || e.target.id === 'lbPalco') LOB.drag = lobTp(e).x; });
  addEventListener('pointermove', e => { if (LOB.drag != null) { const x = lobTp(e).x; LOB.yaw += (x - LOB.drag) * .012; LOB.drag = x; } });
  addEventListener('pointerup', () => { LOB.drag = null; });
  const q = new URLSearchParams(location.search).get('sala') || (() => { try { return new URLSearchParams(parent.location.search).get('sala'); } catch (e) { return null; } })();
  if (q) setTimeout(() => entrarSala(q.toUpperCase()), 400);
}
function lobTp(e) { return ROT ? { x: e.clientY, y: innerWidth - e.clientX } : { x: e.clientX, y: e.clientY }; }
function toLobby() { S.mode = 'lobby'; P.rig = CAST[HERO.k](); P.rig.pos = [...LP]; P.rig.update(); stage(0); lobUI(); showScr('lobby'); AU.music('calm'); }
function lobbyFrame(dt) {
  // câmera de vitrine: personagem à direita do centro, um pouco de baixo pra cima
  const t = S.time; R.setCam([LP[0] - 1.0, 1.45, LP[2] + 4.3], [LP[0] - .55, 1.05, LP[2]], .9);
  LOB.yaw *= 1 - Math.min(1, dt * .2);
  animAny(P.rig, { ph: t * 2, sp: 0, act: null, t: 0, ready: true }, dt);
  P.rig.pos = [...LP]; P.rig.yaw = Math.PI + LOB.yaw + Math.sin(t * .5) * .08; P.rig.pitch = 0; P.rig.update();
  R.ring(LP[0], LP[2], .95, .08, HERO.cor, .8); R.ring(LP[0], LP[2], 1.25 + Math.sin(t * 2) * .05, .03, HERO.cor, .5); R.light([LP[0], 2.2, LP[2] + 1.2], V.sc(HERO.cor, 2.2), 6);
  if (Math.random() < .3) part([LP[0] + rnd(-.8, .8), 0, LP[2] + rnd(-.8, .8)], [0, rnd(.5, 1.5), 0], 1.4, .05, HERO.cor);
  LOB.amigos.forEach((a, i) => { if (i >= SLOTS.length) return; let r = LOB.rigs[a.id]; if (!r || r.k !== a.k) { r = LOB.rigs[a.id] = CAST[a.k](); r.k = a.k; }
    const s = SLOTS[i]; animAny(r, { ph: t * 2 + i, sp: 0, act: null, t: 0, ready: false }, dt); r.pos = [...s]; r.yaw = Math.PI + (s[0] < 0 ? .35 : -.35); r.pitch = 0; r.scale = .97; r.update(); r.draw();
    R.ring(s[0], s[2], .75, .05, heroBy(a.k).cor, .5); });
}
// ---------- esquadrão online (PeerJS: conexão direta entre os aparelhos) ----------
function linkSala() { let base = location.href.split('?')[0]; try { if (parent !== window) base = parent.location.href.split('?')[0]; } catch (e) { } return base + '?sala=' + LOB.sala; }
function carregaPeer() { return window.Peer ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
function novoCodigo() { const L = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let c = ''; for (let i = 0; i < 5; i++) c += L[Math.floor(Math.random() * L.length)]; return c; }
async function abrirConvite() {
  $('conv').classList.add('on'); $('cvMsg').textContent = '';
  if (LOB.sala) { $('cvCode').textContent = LOB.sala; return; }
  $('cvCode').textContent = '…'; $('cvMsg').textContent = 'Criando sua sala…';
  try { await carregaPeer(); } catch (e) { $('cvMsg').textContent = 'Sem internet para criar a sala.'; return; }
  const cod = novoCodigo(); const peer = new Peer('fioalv-' + cod); LOB.peer = peer;
  peer.on('open', () => { LOB.sala = cod; LOB.souHost = true; $('cvCode').textContent = cod; $('cvMsg').textContent = 'Sala criada! Mande o link ou o código pros amigos.'; lobUI(); });
  peer.on('error', e => { $('cvMsg').textContent = 'Não deu para criar a sala (' + e.type + '). Tente de novo.'; LOB.peer = null; });
  peer.on('connection', c => { if (LOB.conns.length >= 4) { c.on('open', () => { c.send({ t: 'cheia' }); setTimeout(() => c.close(), 300); }); return; }
    c.on('open', () => { LOB.conns.push(c); }); c.on('data', d => hostRecebe(c, d)); c.on('close', () => { LOB.conns = LOB.conns.filter(x => x !== c); LOB.amigos = LOB.amigos.filter(a => a.id !== c.peer); delete LOB.rigs[c.peer]; hostParty(); lobUI(); }); });
}
function hostRecebe(c, d) {
  if (d.t === 'eu') { let a = LOB.amigos.find(a => a.id === c.peer); if (!a) { a = { id: c.peer }; LOB.amigos.push(a); banner('Chegou no esquadrão', esc(d.nome || 'Amigo')); } a.nome = d.nome; a.k = heroBy(d.k).k; hostParty(); lobUI(); }
}
function hostParty() { const lista = [{ id: 'host', nome: LOB.nome || 'Líder', k: HERO.k, host: true }, ...LOB.amigos.map(a => ({ id: a.id, nome: a.nome, k: a.k }))];
  for (const c of LOB.conns) if (c.open) c.send({ t: 'party', lista }); }
function lobSend(m) { if (LOB.souHost) hostParty(); else if (LOB.host && LOB.host.open) LOB.host.send(m); }
async function entrarSala(cod) {
  $('conv').classList.add('on'); $('cvCode').textContent = cod; $('cvMsg').textContent = 'Entrando na sala ' + cod + '…';
  try { await carregaPeer(); } catch (e) { $('cvMsg').textContent = 'Sem internet para entrar na sala.'; return; }
  if (LOB.peer) { try { LOB.peer.destroy(); } catch (e) { } } LOB.amigos = []; LOB.conns = []; LOB.souHost = false;
  const peer = new Peer(); LOB.peer = peer;
  peer.on('open', id => { const c = peer.connect('fioalv-' + cod, { reliable: true }); LOB.host = c;
    c.on('open', () => { LOB.sala = cod; c.send({ t: 'eu', nome: LOB.nome, k: HERO.k }); $('cvMsg').textContent = 'Você entrou no esquadrão!'; lobUI(); setTimeout(() => $('conv').classList.remove('on'), 1200); });
    c.on('data', d => { if (d.t === 'party') { LOB.amigos = d.lista.filter(a => a.id !== id).map(a => ({ ...a, k: heroBy(a.k).k })); lobUI(); } if (d.t === 'cheia') $('cvMsg').textContent = 'Essa sala já está cheia (5 de 5).'; });
    c.on('close', () => { LOB.sala = null; LOB.amigos = []; LOB.host = null; lobUI(); banner('Esquadrão', 'O líder fechou a sala'); }); });
  peer.on('error', e => { $('cvMsg').textContent = e.type === 'peer-unavailable' ? 'Sala ' + cod + ' não encontrada. Confira o código.' : 'Não deu para entrar (' + e.type + ').'; });
}
