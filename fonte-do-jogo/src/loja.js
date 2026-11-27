// ================= DIFICULDADE, MOEDAS E LOJA DO FERREIRO =================
// mais inimigos e mais fortes
const _spawnD = spawn;
spawn = function (type, x, z, o = {}) {
  const e = _spawnD(type, x, z, o);
  if (e.ghost || (typeof NET !== 'undefined' && NET.guest)) return e;
  if (e.boss) { e.hp = e.maxhp = Math.round(e.maxhp * 1.25); }
  else { e.hp = e.maxhp = Math.round(e.maxhp * 1.3); e.dmgMul = (e.dmgMul || 1) * 1.2; e.cdMul = (e.cdMul || 1) * .9;
    // a cada dois inimigos comuns, vem um a mais
    if (!o.extra && S.mode !== 'lobby') { spawn.n = (spawn.n || 0) + 1; if (spawn.n % 2 === 0) { const a = rnd(0, 6.28); const nx = x + Math.sin(a) * 1.8, nz = z + Math.cos(a) * 1.8; if (walkable(nx, nz)) spawn(type, nx, nz, { ...o, extra: true }); } } }
  return e;
};
// ---------- moedas ----------
const LOJA_K = 'fio_loja';
const LOJA = { moedas: 0, itens: {} };
try { Object.assign(LOJA, JSON.parse(localStorage.getItem(LOJA_K) || '{}')); } catch (e) { }
function lojaSalva() { try { localStorage.setItem(LOJA_K, JSON.stringify(LOJA)); } catch (e) { } }
const MOEDAS = { tecelao: 6, fieira: 7, larva: 2, filhote: 8, bruta: 16, saltador: 10, cao: 150, irma: 220 };
const _killEnemyL = killEnemy;
killEnemy = function (e) {
  const r = _killEnemyL(e); const m = Math.round((MOEDAS[e.type] || 5) * (e.elite ? 2 : 1));
  LOJA.moedas += m; lojaSalva(); num(V.add(e.pos, [0, 3, 0]), '+' + m + ' moedas', 'g'); moedasHUD(); return r;
};
function moedasHUD() { let el = $('moedas'); if (!el) { el = document.createElement('div'); el.id = 'moedas'; $('hud').appendChild(el); } el.innerHTML = '<i></i>' + LOJA.moedas; }
// ---------- itens ----------
const ITENS = [
  { id: 'couro', nome: 'Armadura de couro', txt: '+15% de vida', preco: 60, tipo: 'armadura', vida: 1.15 },
  { id: 'malha', nome: 'Cota de malha', txt: '+30% de vida', preco: 170, tipo: 'armadura', vida: 1.3, req: 'couro' },
  { id: 'placas', nome: 'Armadura de placas', txt: '+50% de vida', preco: 360, tipo: 'armadura', vida: 1.5, req: 'malha' },
  { id: 'afiada', nome: 'Lâmina afiada', txt: '+15% de dano', preco: 80, tipo: 'lamina', dano: 1.15 },
  { id: 'aco', nome: 'Aço do fio', txt: '+30% de dano', preco: 220, tipo: 'lamina', dano: 1.3, req: 'afiada' },
  { id: 'lume', nome: 'Lâmina de lume', txt: '+50% de dano', preco: 420, tipo: 'lamina', dano: 1.5, req: 'aco' },
  { id: 'botas', nome: 'Botas leves', txt: '+8% de velocidade', preco: 90, tipo: 'botas', vel: 1.08 },
  { id: 'pocao', nome: 'Poção de cura', txt: '+1 poção (máx. 6)', preco: 25, tipo: 'pocao', repete: true },
];
function melhor(tipo, campo) { let v = 1; for (const it of ITENS) if (it.tipo === tipo && LOJA.itens[it.id]) v = Math.max(v, it[campo]); return v; }
// aplica nos atributos
const _maxHpL = maxHp; maxHp = function () { return Math.round(_maxHpL() * melhor('armadura', 'vida')); };
const _atkL = atk; atk = function () { return _atkL() * melhor('lamina', 'dano'); };
Object.defineProperty(window, 'BOTAS', { get: () => melhor('botas', 'vel') });
function comprar(it) {
  if (LOJA.moedas < it.preco) { icon('Moedas insuficientes'); return; }
  if (it.req && !LOJA.itens[it.req]) { icon('Compre o item anterior primeiro'); return; }
  if (!it.repete && LOJA.itens[it.id]) return;
  if (it.tipo === 'pocao') { if (P.potions >= 6) { icon('Bolsa de poções cheia'); return; } P.potions++; }
  else LOJA.itens[it.id] = true;
  LOJA.moedas -= it.preco; lojaSalva(); AU.chime(); if (it.tipo === 'armadura') P.hp = maxHp(); lojaUI(); moedasHUD();
  if (typeof grito === 'function' && it.tipo !== 'pocao') falar(HERO.nome, { armadura: 'Agora sim, bem protegida.', lamina: 'Que lâmina boa!', botas: 'Bem mais leve!' }[it.tipo]);
}
function lojaUI() {
  $('ljMoedas').textContent = LOJA.moedas; const box = $('ljItens'); box.innerHTML = '';
  for (const it of ITENS) { const tem = !it.repete && LOJA.itens[it.id], trav = it.req && !LOJA.itens[it.req];
    const b = document.createElement('button'); b.className = 'lji' + (tem ? ' tem' : '') + (trav ? ' trav' : '');
    b.innerHTML = '<b>' + it.nome + '</b><span>' + it.txt + '</span><em>' + (tem ? 'Comprado' : trav ? 'Bloqueado' : it.preco + ' moedas') + '</em>';
    b.onclick = e => { e.stopPropagation(); comprar(it); }; box.appendChild(b); }
}
function abrirLoja(volta) { lojaUI(); $('loja').classList.add('on'); $('loja').dataset.volta = volta || ''; }
function lojaInit() {
  $('ljFechar').onclick = () => $('loja').classList.remove('on');
  const bl = document.createElement('button'); bl.id = 'lbLoja'; bl.textContent = 'Ferreiro'; bl.onclick = () => abrirLoja('lobby'); $('lbMini').insertBefore(bl, $('lbMini').firstChild);
  const bp = document.createElement('button'); bp.id = 'bLoja'; bp.textContent = 'Ferreiro (loja)'; bp.onclick = () => abrirLoja('pause'); const pb = $('bTree'); pb.parentNode.insertBefore(bp, pb.nextSibling);
  moedasHUD();
}
setTimeout(lojaInit, 300);
