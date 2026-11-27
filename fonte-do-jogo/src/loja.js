// ================= DIFICULDADE, MOEDAS E LOJA DO FERREIRO =================
// níveis de dificuldade: cada jogador escolhe (fica salvo no aparelho)
const DIFS = [
  { nome: 'Fácil', vida: .8, dano: .7, cd: 1.1, extra: 0, chefeVida: .9, chefeDano: .8, fura: 1.1, resiste: 1, resisteFuria: .85 },
  { nome: 'Normal', vida: 1.3, dano: 1.2, cd: .9, extra: 3, chefeVida: 1.25, chefeDano: 1, fura: 1.15, resiste: 1, resisteFuria: .75 },
  { nome: 'Difícil', vida: 1.75, dano: 1.5, cd: .82, extra: 2, chefeVida: 1.7, chefeDano: 1.3, fura: 1.4, resiste: .8, resisteFuria: .5 },
  { nome: 'Muito difícil', vida: 2.3, dano: 1.9, cd: .72, extra: 1, chefeVida: 2.2, chefeDano: 1.6, fura: 1.6, resiste: .7, resisteFuria: .4 },
];
let DIF_I = 2; try { const v = +localStorage.getItem('fio_dif'); if (v >= 0 && v < DIFS.length && localStorage.getItem('fio_dif') !== null) DIF_I = v; } catch (e) {}
const DIF = () => DIFS[DIF_I];
function trocarDif() { DIF_I = (DIF_I + 1) % DIFS.length; try { localStorage.setItem('fio_dif', DIF_I); } catch (e) {} difBotoes(); if (typeof hint === 'function') hint('Dificuldade: <b>' + DIF().nome + '</b> (vale para os próximos inimigos)', 3000); }
function difBotoes() { for (const id of ['lbDif', 'bDif']) { const b = document.getElementById(id); if (b) b.textContent = 'Dificuldade: ' + DIF().nome; } }
const _spawnD = spawn;
spawn = function (type, x, z, o = {}) {
  const e = _spawnD(type, x, z, o);
  if (e.ghost || (typeof NET !== 'undefined' && NET.guest)) return e;
  const D = DIF();
  if (e.boss) { e.hp = e.maxhp = Math.round(e.maxhp * D.chefeVida); }
  else { e.hp = e.maxhp = Math.round(e.maxhp * D.vida); e.dmgMul = (e.dmgMul || 1) * D.dano; e.cdMul = (e.cdMul || 1) * D.cd;
    // inimigos a mais (no Difícil, 1 a cada 2; no Muito difícil, 1 a cada 1)
    if (D.extra && !o.extra && S.mode !== 'lobby') { spawn.n = (spawn.n || 0) + 1; if (spawn.n % D.extra === 0) { const a = rnd(0, 6.28); const nx = x + Math.sin(a) * 1.8, nz = z + Math.cos(a) * 1.8; if (walkable(nx, nz)) spawn(type, nx, nz, { ...o, extra: true }); } } }
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
  const dl = document.createElement('button'); dl.id = 'lbDif'; dl.onclick = trocarDif; $('lbMini').insertBefore(dl, bl.nextSibling);
  const dp = document.createElement('button'); dp.id = 'bDif'; dp.onclick = trocarDif; pb.parentNode.insertBefore(dp, bp.nextSibling); difBotoes();
  moedasHUD();
}
setTimeout(lojaInit, 300);

// chefes mais fortes: batem mais forte e, na fúria, batem ainda mais e aguentam mais golpes
{ const _hp = hurtPlayer; hurtPlayer = function (a, src, ...r) { const D = DIF(); if (src && src.boss) a *= D.chefeDano * (src.fury ? D.fura : 1); return _hp.call(this, a, src, ...r); };
  const _he = hurtEnemy; hurtEnemy = function (e, base, ...r) { const D = DIF(); if (e && e.boss) base *= e.fury ? D.resisteFuria : D.resiste; return _he.call(this, e, base, ...r); }; }
