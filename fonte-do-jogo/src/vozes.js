// ================= VOZES DOS HERÓIS (voz sintetizada do aparelho, em português) =================
// Vilões não falam em voz alta. Cada herói tem tom (pitch) e ritmo próprios.
const VOZ = {
  Nera: { f: true, p: 1.12, r: 1.02 }, Lira: { f: true, p: 1.32, r: 1.14 }, Mireia: { f: true, p: 1.05, r: .94 }, 'Tia Brena': { f: true, p: 1.18, r: .96 },
  Iaro: { f: false, p: .68, r: .92 }, Ruan: { f: false, p: .82, r: .97 }, Oren: { f: false, p: .74, r: .9 }, Orven: { f: false, p: .6, r: .86 }, 'Pastor Tomé': { f: false, p: .85, r: .92 },
};
const FALAS = { // frases de luta (originais do jogo)
  nera: { ult: 'Pelo mestre Orven!', contra: 'Agora é comigo!', nivel: 'Estou ficando mais forte.', fraco: 'Ainda não acabou...', furia: 'Vem com tudo, eu aguento!', vitoria: 'O fio aguentou.' },
  iaro: { ult: 'Queime, Brasa!', contra: 'Errou feio!', nivel: 'Minha lâmina pesa mais agora.', fraco: 'Preciso de um segundo...', furia: 'Ótimo. Agora ficou interessante.', vitoria: 'Mais um que cai.' },
  lira: { ult: 'Vento, corta!', contra: 'Rápida demais pra você!', nivel: 'Mais leve, mais rápida!', fraco: 'Ai! Essa doeu.', furia: 'Tá bravo? Me pega então!', vitoria: 'Fácil, fácil.' },
  ruan: { ult: 'Ninguém passa por mim!', contra: 'Bloqueado!', nivel: 'Meu escudo ficou mais firme.', fraco: 'Fiquem atrás de mim...', furia: 'Eu seguro esse monstro!', vitoria: 'Todos de pé? Ótimo.' },
  mireia: { ult: 'Que a maré te leve!', contra: 'Vi você chegando.', nivel: 'Os fios me obedecem melhor.', fraco: 'A maré está baixa...', furia: 'Calma. Respira. Corta.', vitoria: 'Costura fechada.' },
  oren: { ult: 'Tempestade, desça!', contra: 'Velho, mas não lento!', nivel: 'Ainda aprendo, mesmo velho.', fraco: 'Esses ossos já viram coisa pior.', furia: 'Já enfrentei tempestades maiores.', vitoria: 'O céu limpou.' },
};
let VOZES_OK = true; try { VOZES_OK = localStorage.getItem('fio_vozes') !== '0'; } catch (e) { }
let vozesLista = [];
function carregaVozes() { try { vozesLista = speechSynthesis.getVoices().filter(v => /^pt(-|_)?/i.test(v.lang)); } catch (e) { vozesLista = []; } }
if (window.speechSynthesis) { carregaVozes(); speechSynthesis.onvoiceschanged = carregaVozes; }
function escolheVoz(fem) {
  if (!vozesLista.length) carregaVozes(); const br = vozesLista.filter(v => /BR/i.test(v.lang)), L = br.length ? br : vozesLista; if (!L.length) return null;
  const F = /maria|francisca|luciana|vit[oó]ria|female|feminin|thalita|leila|helo|google portugu/i, Mm = /daniel|antonio|ant[oô]nio|male|masculin|julio|donato|fabio|humberto/i;
  return (fem ? L.find(v => F.test(v.name)) : L.find(v => Mm.test(v.name))) || L[fem ? 0 : L.length - 1];
}
function falar(quem, texto, prio) {
  if (!VOZES_OK || !window.speechSynthesis || !texto) return; const cfg = VOZ[quem]; if (!cfg) return; // vilões e narrador ficam sem voz
  try { if (prio !== false) speechSynthesis.cancel(); else if (speechSynthesis.speaking) return;
    const u = new SpeechSynthesisUtterance(texto.replace(/…/g, '...')); u.lang = 'pt-BR'; const v = escolheVoz(cfg.f); if (v) u.voice = v;
    u.pitch = cfg.p; u.rate = cfg.r; u.volume = clamp((typeof OPT !== 'undefined' ? OPT.sfx : 1) * 1.1, 0, 1); speechSynthesis.speak(u); } catch (e) { }
}
function grito(tipo) { const h = typeof HERO !== 'undefined' ? HERO : { k: 'nera', nome: 'Nera' }; const f = FALAS[h.k] && FALAS[h.k][tipo]; if (f) falar(h.nome, f, false); }
// falas da história
const _showLineV = showLine;
showLine = function (l, auto) { const who = swapNome(l.who), t = swapNome(l.t); falar(who, t); return _showLineV(l, auto); };
// gritos de luta
const _ultImpact = typeof ultImpact === 'function' ? ultImpact : null; if (_ultImpact) ultImpact = function () { grito('ult'); return _ultImpact.apply(this, arguments); };
const _perfectDodge = typeof perfectDodge === 'function' ? perfectDodge : null; if (_perfectDodge) perfectDodge = function () { grito('contra'); return _perfectDodge.apply(this, arguments); };
const _bossFury = bossFury; bossFury = function (e) { setTimeout(() => grito('furia'), 1500); return _bossFury(e); };
const _irmaFury = irmaFury; irmaFury = function (e) { setTimeout(() => grito('furia'), 1500); return _irmaFury(e); };
const _killEnemyV = killEnemy; killEnemy = function (e) { const r = _killEnemyV(e); if (e.boss) setTimeout(() => grito('vitoria'), 900); return r; };
const _hurtPlayerV = hurtPlayer; hurtPlayer = function (dmg, src) { const antes = P.hp, r = _hurtPlayerV(dmg, src); if (antes > maxHp() * .25 && P.hp > 0 && P.hp <= maxHp() * .25) grito('fraco'); return r; };
let _nivelV = 1; setInterval(() => { if (typeof P !== 'undefined' && P.level > _nivelV) { if (_nivelV > 0 && S.mode === 'play') grito('nivel'); } if (typeof P !== 'undefined') _nivelV = P.level; }, 700);
// opção liga/desliga no menu de opções
function vozesOpcao() { const op = $('opts'); if (!op || $('oVoz')) return; const row = document.createElement('div'); row.className = 'row';
  row.innerHTML = '<label for="oVoz">Vozes dos personagens</label><input id="oVoz" type="checkbox"' + (VOZES_OK ? ' checked' : '') + '><span></span>';
  const ref = op.querySelector('.row:last-of-type'); (ref ? ref.parentNode : op.querySelector('.panel')).insertBefore(row, ref ? ref.nextSibling : null);
  $('oVoz').onchange = e => { VOZES_OK = e.target.checked; try { localStorage.setItem('fio_vozes', VOZES_OK ? '1' : '0'); } catch (er) { } if (VOZES_OK) falar(HERO.nome, 'Vozes ligadas.'); else speechSynthesis.cancel(); }; }
setTimeout(vozesOpcao, 500);
// ao escolher o herói no lobby, ele se apresenta
const _escolherHeroiV = escolherHeroi; escolherHeroi = function (k) { _escolherHeroiV(k); const h = heroBy(k); falar(h.nome, { nera: 'Eu sou Nera. Vamos recosturar o mundo.', iaro: 'Iaro. A brasa não se apaga.', lira: 'Lira! Tenta me acompanhar.', ruan: 'Ruan. Fico na frente, sempre.', mireia: 'Mireia. A maré sabe o caminho.', oren: 'Oren. Já vi muita tempestade.' }[h.k]); };
