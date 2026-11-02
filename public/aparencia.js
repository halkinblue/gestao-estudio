// Sistema de Gestão do Estúdio — aparência: logo do negócio
'use strict';

const urlLogo = () => estado.logo ? `/api/logo?v=${estado.logo.versao}` : null;

// ---------- cores do sistema a partir de uma cor principal ----------
const COR_PADRAO = '#1f6f5c';
function hexParaRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgbParaHex(r, g, b) { return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join(''); }
function rgbParaHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslParaHex(h, s, l) {
  const f = n => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return rgbParaHex(f(0) * 255, f(8) * 255, f(4) * 255);
}
function luminancia(hex) {
  return hexParaRgb(hex).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
}
function contraste(a, b) { const x = luminancia(a), y = luminancia(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
// ajusta a luminosidade até atingir o contraste mínimo com o fundo
function ajustarContraste(h, s, l, fundo, minimo, clarear) {
  for (let i = 0; i < 100; i++) {
    const c = hslParaHex(h, s, l);
    if (contraste(c, fundo) >= minimo) return c;
    l = clarear ? Math.min(.97, l + .01) : Math.max(.03, l - .01);
  }
  return hslParaHex(h, s, l);
}
function gerarPaleta(cor) {
  const [h, s0, l0] = rgbParaHsl(...hexParaRgb(cor));
  const s = Math.min(Math.max(s0, .25), .9);
  const prim = ajustarContraste(h, s, Math.min(l0, .5), '#ffffff', 4.6, false); // botões com texto branco: o mais perto possível da cor original
  const [, , lp] = rgbParaHsl(...hexParaRgb(prim));
  return {
    claro: {
      '--primaria': prim, '--primaria-escura': hslParaHex(h, s, Math.max(.08, lp - .07)), '--primaria-clara': hslParaHex(h, Math.min(s, .6), .93),
      '--primaria-texto': prim, '--lateral': hslParaHex(h, Math.min(s, .45), .14), '--lateral-texto': hslParaHex(h, .3, .86),
      '--aviso-fundo': hslParaHex(h, Math.min(s, .45), .16),
    },
    escuro: {
      '--primaria': prim, '--primaria-escura': hslParaHex(h, s, Math.max(.08, lp - .05)), '--primaria-clara': hslParaHex(h, Math.min(s, .5), .17),
      '--primaria-texto': ajustarContraste(h, Math.min(s, .7), .6, hslParaHex(h, .08, .115), 5, true), '--lateral': hslParaHex(h, Math.min(s, .35), .07),
      '--lateral-texto': hslParaHex(h, .25, .82), '--aviso-fundo': prim,
      // fundos do modo noturno levemente puxados para a cor do negócio
      '--fundo': hslParaHex(h, .08, .08), '--cartao': hslParaHex(h, .08, .115), '--superficie-2': hslParaHex(h, .08, .14), '--borda': hslParaHex(h, .08, .19),
      '--campo': hslParaHex(h, .08, .09), '--campo-borda': hslParaHex(h, .08, .25), '--linha': hslParaHex(h, .08, .16), '--hover': hslParaHex(h, .15, .17),
      '--hover-neutro': hslParaHex(h, .08, .16), '--etiqueta': hslParaHex(h, .08, .18),
    },
  };
}
// matizes das cores de situação: em dia (verde), vencendo (laranja), em atraso (vermelho)
const MATIZES_SITUACAO = [{ nome: 'em dia', h: 152 }, { nome: 'vencendo', h: 26 }, { nome: 'em atraso', h: 4 }];
function situacoesParecidas(cor) {
  const [h, s, l] = rgbParaHsl(...hexParaRgb(cor || COR_PADRAO));
  if (s < .2 || l < .08 || l > .92) return [];
  return MATIZES_SITUACAO.filter(m => { const d = Math.abs(h - m.h); return Math.min(d, 360 - d) < 28; }).map(m => m.nome);
}
function aplicarCor(cor) {
  document.documentElement.classList.toggle('status-reforcado', situacoesParecidas(cor).length > 0);
  let el = document.getElementById('cores-negocio');
  if (!cor || cor === COR_PADRAO) { if (el) el.remove(); try { localStorage.removeItem('cor'); } catch {} return; }
  const p = gerarPaleta(cor), css = o => Object.entries(o).map(([k, v]) => `${k}:${v}`).join(';');
  if (!el) { el = document.createElement('style'); el.id = 'cores-negocio'; document.head.appendChild(el); }
  el.textContent = `:root{${css(p.claro)}} :root[data-tema="escuro"]{${css(p.escuro)}} @media (prefers-color-scheme: dark){:root[data-tema="auto"]{${css(p.escuro)}}}
    @media print{:root,:root[data-tema]{${css(p.claro)}}}`;
  try { localStorage.setItem('cor', cor); } catch {}
}
// aplica a última cor conhecida já no carregamento, para não piscar
try { const c = localStorage.getItem('cor'); if (c) aplicarCor(c); } catch {}

// tira as cores principais da logo (ignora fundo transparente, branco, preto e cinzas)
function coresDaLogo(url) {
  return new Promise(ok => {
    const img = new Image();
    img.onload = () => {
      const t = 80, k = Math.min(1, t / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
      const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
      const px = g.getImageData(0, 0, c.width, c.height).data, baldes = {};
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] < 200) continue;
        const [h, s, l] = rgbParaHsl(px[i], px[i + 1], px[i + 2]);
        if (s < .25 || l < .12 || l > .9) continue;
        const b = Math.round(h / 15) % 24, x = baldes[b] || (baldes[b] = { peso: 0, r: 0, g: 0, bl: 0, n: 0 });
        x.peso += s; x.r += px[i]; x.g += px[i + 1]; x.bl += px[i + 2]; x.n++;
      }
      const lista = [];
      const total = Object.values(baldes).reduce((t, x) => t + x.n, 0);
      for (const x of Object.values(baldes).filter(x => x.n > 3 && x.n >= total * .04).sort((a, b) => b.peso - a.peso)) {
        const cor = rgbParaHex(x.r / x.n, x.g / x.n, x.bl / x.n), h = rgbParaHsl(...hexParaRgb(cor))[0];
        // junta tons quase iguais (ex.: dois roxos parecidos)
        if (lista.some(c => { const d = Math.abs(rgbParaHsl(...hexParaRgb(c))[0] - h); return Math.min(d, 360 - d) < 30; })) continue;
        lista.push(cor); if (lista.length === 4) break;
      }
      ok(lista);
    };
    img.onerror = () => ok([]);
    img.src = url;
  });
}

// favicon da aba do navegador com a logo
function aplicarFavicon() {
  let l = document.querySelector('link[rel=icon]');
  if (!urlLogo()) { if (l) l.remove(); return; }
  if (!l) { l = document.createElement('link'); l.rel = 'icon'; document.head.appendChild(l); }
  l.href = urlLogo();
}
function logoLogin() {
  return urlLogo() ? `<div class="logo-login ${estado.logo.fundoClaro ? 'com-fundo' : ''}"><img src="${urlLogo()}" alt="${esc(estado.nomeEstudio || 'Logo')}"></div>` : '';
}
function logoMenu() {
  if (!urlLogo() || estado.logo.posicao !== 'menu') return '';
  return `<div class="logo-menu ${estado.logo.fundoClaro ? 'com-fundo' : ''}"><img src="${urlLogo()}" alt="${esc(estado.nomeEstudio || 'Logo')}"></div>`;
}
function logoTopo() {
  if (!urlLogo() || estado.logo.posicao !== 'topo') return '';
  return `<div class="logo-topo ${estado.logo.fundoClaro ? 'com-fundo' : ''}"><img src="${urlLogo()}" alt="${esc(estado.nomeEstudio || 'Logo')}"></div>`;
}
function logoFundo() {
  return urlLogo() && estado.logo.marcaDagua ? `<div class="marca-dagua" aria-hidden="true" style="background-image:url('${urlLogo()}')"></div>` : '';
}

// reduz a imagem no navegador (máx. 800 px) mantendo a transparência
function prepararImagem(arquivo) {
  return new Promise((ok, falha) => {
    if (!/^image\/(png|jpeg|webp)$/.test(arquivo.type)) return falha(new Error('Use uma imagem PNG, JPG ou WEBP. (PNG com fundo transparente fica melhor.)'));
    const leitor = new FileReader();
    leitor.onerror = () => falha(new Error('Não consegui ler o arquivo.'));
    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => falha(new Error('Esse arquivo não é uma imagem válida.'));
      img.onload = () => {
        const max = 800, k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        const tipo = arquivo.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
        ok(c.toDataURL(tipo, 0.9));
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

async function telaAparencia() {
  const lg = estado.logo || { posicao: 'menu', marcaDagua: false, fundoClaro: true };
  $('#tela').innerHTML = `
    <div class="topo"><div><h1>Aparência</h1><p class="mudo">Logo e nome do seu negócio. Valem para todos os usuários e aparelhos.</p></div></div>
    <div class="cartao"><h2>Logo do negócio</h2>
      <div class="ficha-topo" style="align-items:center">
        <div class="logo-previa">${urlLogo() ? `<img src="${urlLogo()}" alt="Logo atual">` : '<span class="mudo pequeno">Nenhuma logo</span>'}</div>
        <div style="flex:1 1 260px">
          <p class="pequeno" style="margin-top:0">Use de preferência um <b>PNG com fundo transparente</b>. A imagem é reduzida automaticamente.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <label class="botao" style="margin:0;cursor:pointer">${urlLogo() ? 'Trocar logo' : 'Enviar logo'}<input type="file" id="arquivo" accept="image/png,image/jpeg,image/webp" style="display:none"></label>
            ${urlLogo() ? '<button class="perigo" id="remover">Remover logo</button>' : ''}
          </div>
          <div class="erro-form escondido" id="erro-logo" style="margin-top:10px"></div>
        </div>
      </div>
    </div>
    <form id="fa" class="cartao"><h2>Onde a logo aparece</h2>
      <p class="pequeno mudo" style="margin-top:-6px">Na tela de login ela aparece sempre, em cima do quadro de entrada.</p>
      <div class="opcoes-logo">
        <label class="opcao-logo"><input type="radio" name="posicao" value="menu" ${lg.posicao !== 'topo' ? 'checked' : ''}>
          <span class="mini"><span class="mini-lat"><span class="mini-logo"></span><i></i><i></i><i></i></span><span class="mini-corpo"><i></i><i></i></span></span>
          <b>Canto superior esquerdo</b><span class="pequeno mudo">No alto do menu lateral.</span></label>
        <label class="opcao-logo"><input type="radio" name="posicao" value="topo" ${lg.posicao === 'topo' ? 'checked' : ''}>
          <span class="mini"><span class="mini-lat"><i></i><i></i><i></i></span><span class="mini-corpo"><span class="mini-logo centro"></span><i></i><i></i></span></span>
          <b>Centro, no topo</b><span class="pequeno mudo">Faixa pequena em cima de cada tela.</span></label>
      </div>
      <label style="display:flex;gap:8px;align-items:center;font-weight:400;margin-top:14px"><input type="checkbox" name="marcaDagua" style="width:auto" ${lg.marcaDagua ? 'checked' : ''}> Mostrar também a logo transparente no fundo das telas (marca d'água bem clarinha)</label>
      <label style="display:flex;gap:8px;align-items:center;font-weight:400;margin-top:8px"><input type="checkbox" name="fundoClaro" style="width:auto" ${lg.fundoClaro ? 'checked' : ''}> Colocar um fundo branco atrás da logo <span class="mudo pequeno">(use se a logo tiver letras escuras, para não sumir no menu escuro ou no modo noturno)</span></label>
      <h2 style="margin-top:22px">Cores do sistema</h2>
      <p class="pequeno mudo" style="margin-top:-6px">Muda a cor do menu, dos botões e dos destaques. O sistema ajusta os tons sozinho para o texto continuar fácil de ler (no modo claro e no noturno).</p>
      <input type="hidden" name="corPrincipal" value="${esc(estado.corPrincipal || '')}">
      <div class="cores-opcoes">
        <button type="button" class="cor-op" data-cor="" title="Verde padrão do sistema"><span class="amostra" style="background:${COR_PADRAO}"></span>Padrão</button>
        <span id="cores-logo" class="cores-logo">${urlLogo() ? '<span class="pequeno mudo">Lendo as cores da logo…</span>' : '<span class="pequeno mudo">Envie a logo para ver as cores dela aqui.</span>'}</span>
        <label class="cor-op" title="Escolher qualquer cor"><input type="color" id="cor-livre" value="${esc(estado.corPrincipal || COR_PADRAO)}"><span>Outra cor…</span></label>
      </div>
      <div class="previa-cores" id="previa-cores"></div>
      <h2 style="margin-top:22px">Contato do negócio <span class="pequeno mudo" style="font-weight:400">(aparece nos recibos)</span></h2>
      <div class="campos" id="contato">
        <div><label>Telefone / WhatsApp</label><input name="telefone" placeholder="(75) 9 0000-0000"></div>
        <div><label>CNPJ ou CPF</label><input name="documento"></div>
        <div class="campo-largo"><label>Endereço</label><input name="endereco" placeholder="Rua, número, bairro, cidade"></div>
      </div>
      <h2 style="margin-top:22px">Nome do negócio</h2>
      <input name="nomeEstudio" value="${esc(estado.nomeEstudio || '')}" placeholder="Ex.: Estúdio Victor Hugo" style="max-width:420px">
      <label style="margin-top:12px">Slogan <span class="mudo">(opcional)</span></label>
      <input name="slogan" value="${esc(estado.slogan || '')}" maxlength="120" placeholder="Ex.: Treino de verdade, perto de você" style="max-width:420px">
      <div class="ajuda">Aparece no menu, na tela de login e na aba do navegador.</div>
      <div class="acoes"><button type="submit">Salvar aparência</button></div>
    </form>
    <div class="cartao"><h2>Modo noturno</h2>
      <p class="pequeno mudo" style="margin-top:-6px">O modo claro/noturno é escolhido em cada aparelho (no rodapé do menu), porque cada pessoa pode preferir um.</p>
      ${seletorTema()}</div>`;
  ligarSeletorTema($('#tela'));
  get('/api/negocio').then(n => { const f = $('#fa'); if (!f) return; f.telefone.value = n.telefone; f.documento.value = n.documento; f.endereco.value = n.endereco; }).catch(() => {});
  // ----- cores -----
  const campoCor = $('#fa input[name=corPrincipal]');
  const marcar = () => {
    const atual = campoCor.value;
    document.querySelectorAll('.cor-op[data-cor]').forEach(b => b.classList.toggle('ativa', (b.dataset.cor || '') === atual));
    const p = gerarPaleta(atual || COR_PADRAO);
    $('#previa-cores').innerHTML = `<span class="pequeno mudo">Prévia:</span>
      <span class="chip-prev" style="background:${p.claro['--lateral']};color:${p.claro['--lateral-texto']}">Menu</span>
      <span class="chip-prev" style="background:${p.claro['--primaria']};color:#fff">Botão</span>
      <span class="chip-prev" style="background:${p.claro['--primaria-clara']};color:${p.claro['--primaria-texto']}">Destaque</span>
      <span class="chip-prev" style="background:${p.escuro['--cartao']};color:${p.escuro['--primaria-texto']}">Link no modo noturno</span>
      <span class="pequeno mudo" style="margin-left:6px">Situações:</span> ${etiqueta('em dia')} ${etiqueta('vencendo')} ${etiqueta('em atraso')}
      ${situacoesParecidas(atual).length ? `<div class="info-inline" style="width:100%">Essa cor é parecida com a cor usada para <b>${situacoesParecidas(atual).join(' e ')}</b>. Para não confundir, as situações passam a aparecer em <b>cor forte, com ícone</b> (como na prévia acima).</div>` : ''}`;
  };
  const escolher = cor => { campoCor.value = cor; aplicarCor(cor || null); marcar(); };
  const ligarBotoes = () => document.querySelectorAll('.cor-op[data-cor]').forEach(b => b.onclick = () => escolher(b.dataset.cor));
  $('#cor-livre').oninput = e => escolher(e.target.value.toLowerCase());
  ligarBotoes(); marcar();
  if (urlLogo()) coresDaLogo(urlLogo()).then(cores => {
    const alvo = $('#cores-logo'); if (!alvo) return;
    alvo.innerHTML = cores.length ? '<span class="pequeno mudo">Cores da logo:</span>' + cores.map(c => `<button type="button" class="cor-op" data-cor="${c}" title="${c}"><span class="amostra" style="background:${c}"></span></button>`).join('')
      : '<span class="pequeno mudo">A logo não tem cores fortes (é preto/branco/cinza). Use "Outra cor".</span>';
    ligarBotoes(); marcar();
  });
  const erroLogo = $('#erro-logo');
  $('#arquivo').onchange = async e => {
    const arq = e.target.files[0]; if (!arq) return;
    erroLogo.classList.add('escondido');
    try {
      const imagem = await prepararImagem(arq);
      const r = await post('/api/logo', { imagem });
      estado.logo = r.logo; avisar('Logo salva.'); recarregarMarca();
    } catch (err) { erroLogo.textContent = err.message; erroLogo.classList.remove('escondido'); }
  };
  const rem = $('#remover');
  if (rem) rem.onclick = async () => { await api('DELETE', '/api/logo'); estado.logo = null; avisar('Logo removida.'); recarregarMarca(); };
  aoEnviar($('#fa'), async d => {
    await put('/api/aparencia', d);
    estado = await get('/api/estado'); aplicarCor(estado.corPrincipal); avisar('Aparência salva.'); recarregarMarca();
  });
}
// redesenha menu/topo com a logo nova, mantendo a tela de Aparência aberta
function recarregarMarca() { montarLayout(); rotear(); }
