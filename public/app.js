// Sistema de Gestão do Estúdio — telas (etapa 1)
'use strict';

// ---------- utilitários ----------
const $ = sel => document.querySelector(sel);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = v => v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = v => `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
const data = d => d ? d.slice(0, 10).split('-').reverse().join('/') : '—';
const hoje = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const classeStatus = s => ({ 'em dia': 'em-dia', 'vencendo': 'vencendo', 'em atraso': 'em-atraso', pausada: 'pausada', cancelada: 'cancelada' }[s] || '');
// situação = cor + ícone + texto (nunca só a cor), para não se confundir com a cor do negócio
const etiqueta = s => `<span class="etiqueta ${classeStatus(s)}" data-st>${esc(s)}</span>`;

async function api(metodo, url, corpo) {
  const token = localStorage.getItem('sid');
  const headers = corpo ? { 'Content-Type': 'application/json' } : {};
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const r = await fetch(url, { method: metodo, headers, credentials: 'include', body: corpo ? JSON.stringify(corpo) : undefined });
  let j = {}; try { j = await r.json(); } catch {}
  if (r.status === 401 && !url.includes('/login')) { localStorage.removeItem('sid'); iniciar(); throw new Error(j.erro || 'Sessão expirada.'); }
  if (!r.ok) throw new Error(j.erro || `Erro ${r.status}`);
  return j;
}
const get = url => api('GET', url);
const post = (url, c) => api('POST', url, c || {});
const put = (url, c) => api('PUT', url, c || {});

function avisar(msg, tipo) {
  const a = $('#aviso'); a.textContent = msg; a.className = 'aviso' + (tipo === 'erro' ? ' erro' : '');
  clearTimeout(avisar.t); avisar.t = setTimeout(() => a.classList.add('escondido'), 4000);
}
function dadosForm(form) {
  const d = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'radio') { if (el.checked) d[el.name] = el.value; }
    else if (el.type === 'checkbox') d[el.name] = el.checked;
    else d[el.name] = el.value;
  }
  return d;
}
// envia um formulário mostrando erro dentro dele
function aoEnviar(form, fn) {
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]'); const caixaErro = form.querySelector('.erro-form');
    if (caixaErro) caixaErro.classList.add('escondido');
    if (btn) btn.disabled = true;
    try { await fn(dadosForm(form)); }
    catch (err) { if (caixaErro) { caixaErro.textContent = err.message; caixaErro.classList.remove('escondido'); } else avisar(err.message, 'erro'); }
    finally { if (btn) btn.disabled = false; }
  });
}
function abrirModal(html) {
  $('#modal-caixa').innerHTML = html; $('#modal').classList.remove('escondido');
  $('#modal-caixa').querySelectorAll('[data-fechar]').forEach(b => b.addEventListener('click', fecharModal));
  const primeiro = $('#modal-caixa').querySelector('input:not([type=hidden]):not([type=radio]), select, textarea'); if (primeiro) primeiro.focus();
  return $('#modal-caixa');
}
function fecharModal() { $('#modal').classList.add('escondido'); $('#modal').classList.remove('modal-busca'); $('#modal-caixa').innerHTML = ''; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharModal(); });
$('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') fecharModal(); });

function mostrarCodigo(titulo, codigo, texto) {
  abrirModal(`
    <div class="imprimivel">
      <h2>${esc(titulo)}</h2>
      <p>${texto}</p>
      <div class="codigo">${esc(codigo)}</div>
      <p class="pequeno mudo">Gerado em ${new Date().toLocaleString('pt-BR')}.</p>
    </div>
    <div class="acoes nao-imprimir">
      <button class="secundario" onclick="window.print()">Imprimir</button>
      <button data-fechar>Já guardei</button>
    </div>`);
}

let estado = {};

// ---------- aparência (modo noturno) ----------
// guardado neste aparelho; "auto" segue o modo do Windows/celular
function temaAtual() { try { return localStorage.getItem('tema') || 'auto'; } catch { return 'auto'; } }
function aplicarTema(t) {
  document.documentElement.dataset.tema = t;
  try { localStorage.setItem('tema', t); } catch {}
  document.querySelectorAll('[data-seletor-tema]').forEach(s => { s.value = t; });
}
function seletorTema(estilo = '') {
  return `<label class="tema-botao" style="${estilo}"><span>Aparência</span>
    <select data-seletor-tema style="width:auto;padding:5px 8px;font-size:13px">
      <option value="auto">Automática</option><option value="claro">Clara</option><option value="escuro">Modo noturno</option></select></label>`;
}
function ligarSeletorTema(raiz = document) {
  raiz.querySelectorAll('[data-seletor-tema]').forEach(s => { s.value = temaAtual(); s.onchange = () => aplicarTema(s.value); });
}
const perfilAdmin = () => estado.usuario?.perfil === 'administrador';

// ---------- telas de entrada ----------
function telaEntrada(titulo, subtitulo, corpo) {
  $('#app').innerHTML = `<div class="centro"><div class="caixa-entrada">${logoLogin()}<div class="cartao">
    <h1>${esc(titulo)}</h1><p class="mudo">${subtitulo}</p>${corpo}</div>
    <div class="pequeno mudo nao-imprimir" style="display:flex;justify-content:center;margin-top:10px">${seletorTema()}</div></div></div>`;
  ligarSeletorTema($('#app'));
}

function telaConfigurarBanco() {
  telaEntrada('Conectar ao banco de dados', 'Isso só é feito uma vez. Informe a senha do PostgreSQL (a mesma que você usa no pgAdmin).', `
    <form id="f">
      <div class="erro-form escondido"></div>
      <div><label>Senha do usuário postgres</label><input name="password" type="password" autocomplete="off" required></div>
      <details class="pequeno" style="margin-bottom:12px"><summary class="mudo">Opções avançadas</summary>
        <div class="campos" style="margin-top:10px">
          <div><label>Servidor</label><input name="host" value="localhost"></div>
          <div><label>Porta</label><input name="port" value="5432"></div>
          <div><label>Usuário</label><input name="user" value="postgres"></div>
          <div><label>Banco</label><input name="database" value="estudio"></div>
        </div>
      </details>
      <button type="submit">Conectar</button>
    </form>`);
  aoEnviar($('#f'), async d => { await post('/api/configurar', d); iniciar(); });
}

function telaPrimeiroUso() {
  telaEntrada('Primeiro uso', 'Crie o usuário administrador. Ele terá acesso a tudo, inclusive preços, usuários e backup.', `
    <form id="f">
      <div class="erro-form escondido"></div>
      <div><label>Nome do negócio</label><input name="nomeEstudio" value="${esc(estado.nomeEstudio || '')}" placeholder="Ex.: Estúdio Victor Hugo"></div>
      <div><label>Slogan <span class="mudo">(opcional)</span></label><input name="slogan" value="${esc(estado.slogan || '')}" maxlength="120" placeholder="Ex.: Treino de verdade, perto de você"></div>
      <div><label>Seu nome</label><input name="nome" required></div>
      <div><label>Login</label><input name="login" required autocomplete="username" placeholder="Ex.: victor"></div>
      <div><label>Senha</label><input name="senha" type="password" required autocomplete="new-password"><div class="ajuda">Pelo menos 6 caracteres.</div></div>
      <div><label>Repita a senha</label><input name="senha2" type="password" required autocomplete="new-password"></div>
      <button type="submit">Criar administrador</button>
    </form>`);
  aoEnviar($('#f'), async d => {
    if (d.senha !== d.senha2) throw new Error('As senhas não conferem.');
    const r = await post('/api/primeiro-uso', d);
    telaEntrada('Código de recuperação', 'Se você esquecer a senha do administrador, este código permite criar uma nova, mesmo sem internet.', `
      <div class="imprimivel"><div class="codigo">${esc(r.codigoRecuperacao)}</div>
      <p class="pequeno">Imprima ou anote e guarde em local seguro. Ele aparece <b>só agora</b>. Login: <b>${esc(d.login)}</b></p></div>
      <div class="acoes nao-imprimir"><button class="secundario" onclick="window.print()">Imprimir</button><button id="seguir">Já guardei, continuar</button></div>`);
    $('#seguir').onclick = () => iniciar();
  });
}

function telaLogin() {
  telaEntrada(estado.nomeEstudio || 'Gestão do Estúdio', `${estado.slogan ? `<i>${esc(estado.slogan)}</i><br>` : ''}Entre com seu login e senha.`, `
    <form id="f">
      <div class="erro-form escondido"></div>
      <div><label>Login</label><input name="login" required autocomplete="username" value="admin"></div>
      <div><label>Senha</label><input name="senha" type="password" required autocomplete="current-password" value="admin123"></div>
      <button type="submit">Entrar</button>
    </form>
    <p class="pequeno" style="margin:14px 0 0;text-align:center"><button class="link" id="esqueci">Esqueci a senha</button></p>`);
  $('input[name=login]').focus();
  aoEnviar($('#f'), async d => { const r = await post('/api/login', d); if (r && r.token) localStorage.setItem('sid', r.token); iniciar(); });
  $('#esqueci').onclick = telaRecuperar;
}

function telaRecuperar() {
  telaEntrada('Esqueci a senha', 'Escolha quem você é:', `
    <div class="abas" style="margin-bottom:14px"><button type="button" class="ativa" data-quem="vend">Sou vendedor</button><button type="button" data-quem="adm">Sou administrador</button></div>
    <div id="q-vend">
      <p class="pequeno">Digite seu login. O administrador vai receber o pedido e gerar uma senha provisória para você.</p>
      <form id="fv"><div class="erro-form escondido"></div>
        <div><label>Seu login</label><input name="login" required autocomplete="username"></div>
        <button type="submit">Pedir nova senha ao administrador</button>
      </form>
    </div>
    <div id="q-adm" class="escondido">
    <p class="pequeno">Use o código de recuperação impresso no primeiro uso.</p>
    <form id="f">
      <div class="erro-form escondido"></div>
      <div><label>Login do administrador</label><input name="login" required></div>
      <div><label>Código de recuperação</label><input name="codigo" required placeholder="XXXX-XXXX-XXXX-XXXX"></div>
      <div><label>Nova senha</label><input name="nova" type="password" required autocomplete="new-password"></div>
      <button type="submit">Criar nova senha</button>
    </form>
    </div>
    <p class="pequeno" style="margin:14px 0 0;text-align:center"><button class="link" id="voltar">Voltar ao login</button></p>`);
  $('#voltar').onclick = telaLogin;
  document.querySelectorAll('[data-quem]').forEach(b => b.onclick = () => {
    document.querySelectorAll('[data-quem]').forEach(x => x.classList.toggle('ativa', x === b));
    $('#q-vend').classList.toggle('escondido', b.dataset.quem !== 'vend'); $('#q-adm').classList.toggle('escondido', b.dataset.quem !== 'adm');
  });
  aoEnviar($('#fv'), async d => {
    await post('/api/pedido-senha', d);
    telaEntrada('Pedido enviado', 'O administrador vai ver o seu pedido na tela <b>Início</b> e em <b>Usuários</b>.', `
      <p>Avise o administrador. Ele vai te entregar uma <b>senha provisória</b>; ao entrar com ela, o sistema pede para você criar a sua senha nova.</p>
      <button id="seguir" style="width:100%">Voltar ao login</button>`);
    $('#seguir').onclick = telaLogin;
  });
  aoEnviar($('#f'), async d => {
    const r = await post('/api/recuperar', d);
    telaEntrada('Senha alterada', 'O código antigo deixou de valer. Este é o seu <b>novo</b> código de recuperação:', `
      <div class="imprimivel"><div class="codigo">${esc(r.codigoRecuperacao)}</div></div>
      <div class="acoes nao-imprimir"><button class="secundario" onclick="window.print()">Imprimir</button><button id="seguir">Ir para o login</button></div>`);
    $('#seguir').onclick = telaLogin;
  });
}

function telaTrocarSenhaObrigatoria() {
  telaEntrada('Troque sua senha', `Olá, ${esc(estado.usuario.nome)}. Você entrou com uma senha provisória; crie a sua senha pessoal.`, `
    <form id="f">
      <div class="erro-form escondido"></div>
      <div><label>Senha provisória</label><input name="atual" type="password" required></div>
      <div><label>Nova senha</label><input name="nova" type="password" required autocomplete="new-password"></div>
      <div><label>Repita a nova senha</label><input name="nova2" type="password" required autocomplete="new-password"></div>
      <button type="submit">Salvar e continuar</button>
    </form>`);
  aoEnviar($('#f'), async d => {
    if (d.nova !== d.nova2) throw new Error('As senhas não conferem.');
    await post('/api/trocar-senha', d); avisar('Senha alterada.'); iniciar();
  });
}

// ---------- estrutura principal ----------
// menu em grupos: [título, [[rota, nome, ícone, só administrador]]]
const MENU = [
  ['Dia a dia', [['inicio', 'Início', 'inicio'], ['whatsapp', 'WhatsApp Pedidos', 'whats'], ['clientes', 'Clientes', 'clientes'], ['pagamentos', 'Pagamentos', 'pagamentos'], ['assinaturas', 'Assinaturas', 'assinaturas']]],
  ['Cadastros', [['produtos', 'Produtos e preços', 'produtos', true], ['planos', 'Planos', 'planos', true], ['estoque', 'Estoque', 'estoque']]],
  ['Gestão', [['relatorios', 'Relatórios', 'relatorios', true], ['despesas', 'Despesas', 'despesas', true], ['unidades', 'Unidades', 'unidades', true]]],
  ['Sistema', [['usuarios', 'Usuários', 'usuarios', true], ['backup', 'Backup', 'backup', true], ['auditoria', 'Auditoria', 'auditoria', true], ['aparencia', 'Aparência', 'aparencia', true]]],
];
const iniciais = nome => String(nome || '?').trim().split(/\s+/).filter(p => p.length > 2 || /^[A-ZÀ-Ú]/.test(p)).map(p => p[0]).slice(0, 2).join('').toUpperCase() || '?';

function montarLayout() {
  const grupos = MENU.map(([titulo, itens]) => {
    const vis = itens.filter(m => !m[3] || perfilAdmin());
    return vis.length ? `<div class="menu-grupo">${esc(titulo)}</div>` + vis.map(([id, nome, icone]) =>
      `<a href="#/${id}" data-menu="${id}">${ic(icone)}<span>${nome}</span><span class="contador escondido" data-contador="${id}"></span></a>`).join('') : '';
  }).join('');
  const dataHoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#app').innerHTML = `<div class="layout">
    <nav class="lateral" id="lateral">
      <button class="fechar-gaveta so-celular" id="fechar-gaveta" aria-label="Fechar menu">${ic('fechar')}</button>
      ${logoMenu()}<div class="marca">${esc(estado.nomeEstudio || 'Gestão do Estúdio')}${estado.slogan ? `<div class="slogan">${esc(estado.slogan)}</div>` : ''}</div>
      <a href="#/venda" class="botao-venda" data-menu="venda">${ic('plus')}<span>Nova venda</span><kbd>F2</kbd></a>
      ${grupos}
      <div class="rodape">
        <div class="quem"><span class="avatar">${esc(iniciais(estado.usuario.nome))}</span><div><b>${esc(estado.usuario.nome)}</b><br><span style="opacity:.75">${estado.usuario.perfil === 'administrador' ? 'Administrador' : 'Vendedor'} · v${esc(estado.versao || '')}</span></div></div>
        ${seletorTema('margin:10px 0 2px;color:var(--lateral-texto);font-weight:400;font-size:13px')}
        <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="secundario" id="minha-senha">Minha senha</button><button class="secundario" id="sair">Sair</button></div>
      </div>
    </nav>
    <div class="fundo-gaveta" id="fundo-gaveta"></div>
    <main class="area-principal">
      <header class="barra-topo nao-imprimir">
        <div class="marca-celular so-celular">${esc(estado.nomeEstudio || 'Gestão do Estúdio')}</div>
        <button type="button" class="campo-busca" id="busca-topo" aria-label="Buscar cliente">${ic('busca')}<span>Buscar cliente, telefone ou CPF…</span><kbd>Ctrl K</kbd></button>
        <div class="data-topo so-pc">${esc(dataHoje)}</div>
      </header>
      ${logoTopo()}<div class="conteudo" id="tela"></div>
    </main>
    <nav class="nav-celular nao-imprimir">
      <a href="#/inicio" data-menu="inicio">${ic('inicio')}<span>Início</span><span class="contador escondido" data-contador="inicio"></span></a>
      <a href="#/clientes" data-menu="clientes">${ic('clientes')}<span>Clientes</span></a>
      <a href="#/venda" data-menu="venda" class="nav-venda"><span class="bola">${ic('plus')}</span><span>Venda</span></a>
      <a href="#/pagamentos" data-menu="pagamentos">${ic('pagamentos')}<span>Pagamentos</span></a>
      <button type="button" id="abrir-gaveta">${ic('mais')}<span>Mais</span></button>
    </nav>
    ${logoFundo()}
  </div>`;
  $('#sair').onclick = async () => { await post('/api/logout'); localStorage.removeItem('sid'); location.hash = ''; iniciar(); };
  $('#minha-senha').onclick = modalMinhaSenha;
  $('#busca-topo').onclick = abrirBusca;
  $('#abrir-gaveta').onclick = () => document.body.classList.add('gaveta-aberta');
  $('#fechar-gaveta').onclick = $('#fundo-gaveta').onclick = fecharGaveta;
  ligarSeletorTema($('.lateral'));
  atualizarContadores(true);
  // tabelas viram cartões no celular: cada célula ganha o nome da coluna
  new MutationObserver(() => { cancelAnimationFrame(rotularTabelas.q); rotularTabelas.q = requestAnimationFrame(() => rotularTabelas($('#tela'))); }).observe($('#tela'), { childList: true, subtree: true });
}
const fecharGaveta = () => document.body.classList.remove('gaveta-aberta');
function rotularTabelas(raiz) {
  if (!raiz) return;
  raiz.querySelectorAll('table').forEach(t => {
    const nomes = [...t.querySelectorAll('thead th')].map(th => th.textContent.trim());
    if (!nomes.length) return;
    t.classList.add('tabela-cartoes');
    t.querySelectorAll('tbody tr').forEach(tr => { let col = 0; [...tr.children].forEach(td => { if (!td.hasAttribute('data-rotulo')) td.setAttribute('data-rotulo', nomes[col] || ''); col += td.colSpan || 1; }); });
  });
}
// bolinhas do menu: atrasados e estoque baixo (no máximo a cada 30 s)
async function atualizarContadores(forcar) {
  if (!forcar && Date.now() - (atualizarContadores.t || 0) < 30000) return;
  atualizarContadores.t = Date.now();
  try {
    const c = await get('/api/contadores');
    document.querySelectorAll('[data-contador]').forEach(el => { const n = c[el.dataset.contador] || 0; el.textContent = n > 99 ? '99+' : n; el.classList.toggle('escondido', !n);
      el.title = el.dataset.contador === 'inicio' ? `${n} cliente(s) em atraso` : `${n} item(ns) com estoque baixo`; });
  } catch {}
}
// busca rápida de cliente (Ctrl+K)
function abrirBusca() {
  const m = abrirModal(`<div class="busca-paleta"><div class="campo-paleta">${ic('busca')}<input id="bq" placeholder="Buscar cliente, telefone ou CPF…" autocomplete="off"><button type="button" class="link" data-fechar>Esc</button></div>
    <div id="br" class="busca-res"><p class="mudo pequeno" style="padding:10px 4px">Digite o nome, telefone ou CPF.</p></div></div>`);
  m.closest('#modal')?.classList.add('modal-busca');
  const inp = m.querySelector('#bq'), res = m.querySelector('#br');
  let sel = 0, itens = [], t;
  const marcar = () => res.querySelectorAll('.res-item').forEach((a, i) => a.classList.toggle('sel', i === sel));
  inp.oninput = () => { clearTimeout(t); t = setTimeout(async () => {
    const termo = inp.value.trim();
    if (termo.length < 2) { res.innerHTML = '<p class="mudo pequeno" style="padding:10px 4px">Digite o nome, telefone ou CPF.</p>'; itens = []; return; }
    itens = (await get(`/api/clientes?busca=${encodeURIComponent(termo)}&mostrar=todos`).catch(() => [])).slice(0, 8); sel = 0;
    res.innerHTML = itens.length ? itens.map(c => `<a class="res-item" href="#/clientes/${c.id}"><span class="avatar-claro">${esc(iniciais(c.nome))}</span>
      <span><b>${esc(c.nome)}</b>${c.ativo ? '' : ' <span class="pequeno mudo">(inativo)</span>'}<br><span class="pequeno mudo">${esc([c.telefone, c.servicos].filter(Boolean).join(' · ') || 'sem serviços')}</span></span>
      <span class="res-acao pequeno">Abrir ficha ↵</span></a>`).join('') : `<p class="mudo pequeno" style="padding:10px 4px">Nenhum cliente encontrado para "${esc(termo)}".</p>`;
    marcar();
  }, 180); };
  inp.onkeydown = e => {
    if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, itens.length - 1); marcar(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); marcar(); e.preventDefault(); }
    else if (e.key === 'Enter' && itens[sel]) { location.hash = `#/clientes/${itens[sel].id}`; fecharModal(); }
  };
  res.onclick = e => { if (e.target.closest('.res-item')) setTimeout(fecharModal, 0); };
}
document.addEventListener('keydown', e => {
  if (!estado?.usuario || estado.usuario.trocar_senha || !$('#tela')) return;
  if (e.key === 'F2') { e.preventDefault(); location.hash = '#/venda'; }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); abrirBusca(); }
  else if (e.key === 'Escape' && document.body.classList.contains('gaveta-aberta')) fecharGaveta();
});

function modalMinhaSenha() {
  const m = abrirModal(`<h2>Trocar minha senha</h2>
    <form id="fs"><div class="erro-form escondido"></div>
      <div class="campos">
        <div class="campo-largo"><label>Senha atual</label><input name="atual" type="password" required></div>
        <div><label>Nova senha</label><input name="nova" type="password" required></div>
        <div><label>Repita a nova senha</label><input name="nova2" type="password" required></div>
      </div>
      <div class="acoes"><button type="button" class="secundario" data-fechar>Cancelar</button><button type="submit">Salvar</button></div>
    </form>`);
  aoEnviar(m.querySelector('#fs'), async d => {
    if (d.nova !== d.nova2) throw new Error('As senhas não conferem.');
    await post('/api/trocar-senha', d); fecharModal(); avisar('Senha alterada.');
  });
}

async function rotear() {
  if (!estado.usuario || estado.usuario.trocar_senha) return;
  fecharModal(); fecharGaveta();
  if (!$('#tela')) montarLayout(); else atualizarContadores();
  const [caminho, busca] = (location.hash.replace(/^#\/?/, '') || 'inicio').split('?');
  const [rota, id] = caminho.split('/');
  const params = new URLSearchParams(busca || '');
  document.querySelectorAll('[data-menu]').forEach(a => a.classList.toggle('ativo', a.dataset.menu === rota));
  const telas = { inicio: telaInicio, whatsapp: telaWhatsApp, clientes: id ? () => telaFicha(id) : telaClientes, produtos: telaProdutos, planos: telaPlanos, usuarios: telaUsuarios,
    venda: () => telaVenda(params), assinaturas: telaAssinaturas, pagamentos: telaPagamentos, estoque: telaEstoque,
    relatorios: telaRelatorios, backup: telaBackup, auditoria: telaAuditoria, aparencia: telaAparencia, despesas: telaDespesas, unidades: () => telaUnidades() };
  const fn = telas[rota] || telaInicio;
  $('#tela').innerHTML = '<p class="mudo">Carregando…</p>';
  try { await fn(); } catch (e) { $('#tela').innerHTML = `<div class="cartao"><div class="erro-form">${esc(e.message)}</div></div>`; }
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', rotear);

async function iniciar() {
  fecharModal();
  try { estado = await get('/api/estado'); }
  catch (e) { telaEntrada('Sem conexão', 'Não foi possível falar com o sistema. Verifique se a janela "Iniciar Sistema" está aberta no computador do estúdio.', ''); return; }
  if (estado.iniciando) { telaEntrada('Iniciando…', 'O sistema está ligando o banco de dados. Só um instante.', '<p class="mudo pequeno">Esta tela atualiza sozinha.</p>'); setTimeout(iniciar, 1500); return; }
  aplicarFavicon();
  if (estado.configurado && !estado.bancoVazio) aplicarCor(estado.corPrincipal);
  document.title = (estado.nomeEstudio || 'Gestão do Estúdio');
  if (!estado.configurado) return telaConfigurarBanco();
  if (estado.bancoVazio) return telaBancoVazio();
  if (!estado.temAdmin) return telaPrimeiroUso();
  if (!estado.usuario) return telaLogin();
  if (estado.usuario.trocar_senha) return telaTrocarSenhaObrigatoria();
  document.title = (estado.nomeEstudio || 'Gestão do Estúdio');
  montarLayout(); rotear();
}

// ---------- Início ----------
let filtroCobrar = 'todos';
function textoCobranca(r) {
  const nome = String(r.cliente).split(' ')[0];
  const quando = r.status === 'em atraso' ? `venceu em ${data(r.vencimento)}` : Number(r.dias) === 0 ? 'vence hoje' : `vence em ${data(r.vencimento)}`;
  return `Olá, ${nome}! Tudo bem? Passando para lembrar que o seu plano ${r.produto}${Number(r.pessoas) === 2 ? ' (Dupla)' : ''} ${quando}. `
    + `Valor para renovar: ${brl(r.valor)}. Qualquer dúvida, é só chamar!${estado.nomeEstudio ? `\n${estado.nomeEstudio}` : ''}`;
}
function chipCobrar(r) {
  const d = Number(r.dias);
  if (r.status === 'em atraso') return `<span class="etiqueta em-atraso" data-st>atrasado ${d} dia${d === 1 ? '' : 's'}</span>`;
  const txt = d === 0 ? 'vence hoje' : d === -1 ? 'vence amanhã' : `vence ${new Date(r.vencimento.slice(0, 10) + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long' })}`;
  return `<span class="etiqueta vencendo" data-st>${txt}</span>`;
}
async function telaInicio() {
  const [d, alertas, avisoBkp, pedidosSenha, avisoVersao, avisoRede] = await Promise.all([get('/api/inicio'), get('/api/estoque/alertas').catch(() => []), perfilAdmin() ? avisoBackupInicio() : '',
    perfilAdmin() ? get('/api/pedidos-senha').catch(() => []) : [], perfilAdmin() ? avisoAtualizacao() : '', perfilAdmin() ? avisoRedeInicio() : '']);
  const h = new Date().getHours(), saudacao = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const primeiro = String(estado.usuario.nome || '').split(' ')[0];
  const varia = d.recebidoMesAnterior > 0 ? Math.round((d.recebidoMes / d.recebidoMesAnterior - 1) * 100) : null;
  const kpi = (alvo, icone, rotulo, valor, sub, cor) => `<button type="button" class="indicador kpi-link" data-kpi="${alvo}"><span class="kpi-seta">${ic('seta')}</span>
    <div class="rotulo">${ic(icone)} ${rotulo}</div><div class="valor num" ${cor ? `style="color:var(--${cor})"` : ''}>${valor}</div><div class="pequeno mudo">${sub}</div></button>`;
  $('#tela').innerHTML = `
    <div class="topo"><div><h1>${saudacao}, ${esc(primeiro)}</h1><p class="mudo">Resumo de hoje · ${d.clientesAtivos} clientes ativos. Clique em um número para ver a lista.</p></div></div>
    ${avisoVersao}${avisoRede}${avisoBkp}
    ${pedidosSenha.length ? `<div class="aviso-inline" style="margin:0 0 16px;display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><span><b>Senha:</b> ${pedidosSenha.map(p => esc(p.nome)).join(', ')} ${pedidosSenha.length > 1 ? 'pediram' : 'pediu'} uma nova senha.</span><a class="botao" href="#/usuarios">Criar nova senha</a></div>` : ''}
    <div class="grade grade-kpi">
      ${kpi('hoje', 'dinheiro', 'Recebido hoje', brl(d.recebidoHoje), `${d.pagamentosHoje} pagamento(s)`, 'ok')}
      ${kpi('mes', 'relatorios', 'Recebido no mês', brl(d.recebidoMes), varia === null ? `${d.pagamentosMes} pagamento(s)` : `<span style="color:var(--${varia >= 0 ? 'ok' : 'perigo'})">${varia >= 0 ? '▲' : '▼'} ${Math.abs(varia)}% sobre o mês passado</span>`)}
      ${kpi('vencendo', 'cal', 'Vencendo esta semana', d.vencendo.n, `${brl(d.vencendo.valor)} a receber`, 'alerta')}
      ${kpi('atraso', 'alerta', 'Em atraso', d.atraso.n, `${brl(d.atraso.valor)} parados`, 'perigo')}
    </div>
    <div class="inicio-duas">
      <div class="cartao" id="cobrar"></div>
      <div class="inicio-lado">
        <div class="cartao"><h2>Atalhos</h2><div class="atalhos-inicio">
          <button type="button" class="secundario" id="at-cliente">${ic('clientes')} Novo cliente</button>
          <a class="botao secundario" href="#/pagamentos">${ic('pagamentos')} Receber</a>
          <a class="botao secundario" href="#/estoque">${ic('estoque')} Entrada estoque</a>
          ${perfilAdmin() ? `<a class="botao secundario" href="#/despesas">${ic('despesas')} Nova despesa</a>` : `<a class="botao secundario" href="#/assinaturas">${ic('assinaturas')} Assinaturas</a>`}</div></div>
        <div class="cartao"><h2>Últimas vendas</h2>
          ${d.ultimas.length ? d.ultimas.map(v => `<div class="linha-lista"><div><div class="nome-linha">${esc(v.descricao || 'Venda')}</div><div class="pequeno mudo">${esc([v.cliente || 'sem cliente', v.forma].filter(Boolean).join(' · '))} · ${data(v.data)}</div></div><div class="valor-linha num">${brl(v.valor)}</div></div>`).join('')
            : '<div class="vazio">Nenhuma venda ainda. <a href="#/venda">Fazer a primeira venda</a></div>'}</div>
        ${alertas.length ? `<a class="cartao cartao-alerta" href="#/estoque">${ic('estoque')}<div><b>Estoque baixo:</b> ${alertas.slice(0, 4).map(a => `${esc(a.produto)}${a.variacao && a.variacao !== 'Única' ? ' ' + esc(a.variacao) : ''} (${Number(a.estoque)})`).join(', ')}${alertas.length > 4 ? ` e mais ${alertas.length - 4}` : ''}</div></a>` : ''}
      </div>
    </div>`;
  $('#tela').insertAdjacentHTML('beforeend', cartaoCelular());
  $('#at-cliente').onclick = () => modalCliente(null, id => location.hash = `#/clientes/${id}`);
  const desenharCobrar = () => {
    const lista = d.lista.filter(r => filtroCobrar === 'todos' || (filtroCobrar === 'atraso' ? r.status === 'em atraso' : r.status === 'vencendo'));
    const aba = (v, t, n) => `<button type="button" class="${filtroCobrar === v ? 'ativa' : ''}" data-f="${v}">${t}${n !== undefined ? ` (${n})` : ''}</button>`;
    $('#cobrar').innerHTML = `<div class="ficha-topo"><h2>Para cobrar</h2><div class="abas-mini">${aba('todos', 'Todos', d.lista.length)}${aba('atraso', 'Atrasados', d.atraso.n)}${aba('vencendo', 'Vencendo', d.vencendo.n)}</div></div>
      ${lista.length ? lista.map((r, i) => { const w = linkWhats(r.telefone, textoCobranca(r)); return `<div class="linha-cobrar">
        <a class="avatar-claro" href="#/clientes/${r.cliente_id}">${esc(iniciais(r.cliente))}</a>
        <a class="quem-cobrar" href="#/clientes/${r.cliente_id}"><b>${esc(r.cliente)}</b><span class="pequeno mudo">${esc(r.produto)}${Number(r.pessoas) === 2 ? ' Dupla' : ''} · ${esc(r.plano)}</span></a>
        <div class="valor-cobrar"><b class="num">${brl(r.valor)}</b>${chipCobrar(r)}</div>
        <div class="acoes-cobrar">${w ? `<a class="botao botao-whats" href="${w}" target="_blank" rel="noopener">${ic('whats')} Cobrar</a>` : `<span class="botao secundario desativado" title="Cadastre o telefone do cliente para cobrar pelo WhatsApp">${ic('whats')} Cobrar</span>`}
          <a class="botao" href="#/venda?cliente=${r.cliente_id}&produto=${r.produto_id}">Receber</a></div></div>`; }).join('')
      : `<div class="vazio">${filtroCobrar === 'todos' ? 'Ninguém vencendo nos próximos 7 dias nem em atraso. Tudo em dia!' : 'Nenhum cliente nesta lista.'}</div>`}`;
    $('#cobrar').querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filtroCobrar = b.dataset.f; desenharCobrar(); });
  };
  desenharCobrar();
  $('#tela').querySelectorAll('[data-kpi]').forEach(b => b.onclick = () => {
    const k = b.dataset.kpi;
    if (k === 'hoje') location.hash = '#/pagamentos';
    else if (k === 'mes') location.hash = perfilAdmin() ? '#/relatorios' : '#/pagamentos';
    else { filtroCobrar = k; desenharCobrar(); $('#cobrar').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
}

// ---------- Clientes ----------
let filtroClientes = { busca: '', mostrar: 'ativos' };
async function telaClientes() {
  $('#tela').innerHTML = `
    <div class="topo"><div><h1>Clientes</h1><p class="mudo">Clique em um cliente para abrir a ficha.</p></div><button id="novo">+ Novo cliente</button></div>
    <div class="cartao">
      <div class="linha-filtros">
        <input id="busca" placeholder="Buscar por nome, telefone ou CPF" value="${esc(filtroClientes.busca)}">
        <select id="mostrar"><option value="ativos">Ativos</option><option value="inativos">Inativos</option><option value="todos">Todos</option></select>
      </div>
      <div id="lista"></div>
    </div>`;
  $('#mostrar').value = filtroClientes.mostrar;
  const carregar = async () => {
    const lista = await get(`/api/clientes?busca=${encodeURIComponent(filtroClientes.busca)}&mostrar=${filtroClientes.mostrar}`);
    $('#lista').innerHTML = lista.length ? `<div class="pequeno mudo" style="margin-bottom:6px">${lista.length} cliente(s)</div><div class="tabela-rolagem"><table>
      <thead><tr><th>Nome</th><th>Telefone</th><th>Serviços</th></tr></thead><tbody>
      ${lista.map(c => `<tr class="clicavel ${c.ativo ? '' : 'inativo'}" data-id="${c.id}"><td>${esc(c.nome)}${c.ativo ? '' : ' <span class="etiqueta">inativo</span>'}</td><td>${esc(c.telefone || '—')}</td>
        <td>${(c.servicos || '').split(' · ').filter(Boolean).map(s => { const [p, st] = s.split(': '); return `${esc(p)} ${etiqueta(st)}`; }).join('<br>') || '<span class="mudo">—</span>'}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="vazio">Nenhum cliente encontrado.</div>';
    $('#lista').querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => location.hash = `#/clientes/${tr.dataset.id}`);
  };
  let t; $('#busca').oninput = e => { filtroClientes.busca = e.target.value; clearTimeout(t); t = setTimeout(carregar, 250); };
  $('#mostrar').onchange = e => { filtroClientes.mostrar = e.target.value; carregar(); };
  $('#novo').onclick = () => modalCliente(null, id => location.hash = `#/clientes/${id}`);
  await carregar();
}

function modalCliente(c, depois) {
  c = c || {};
  const m = abrirModal(`<h2>${c.id ? 'Editar cliente' : 'Novo cliente'}</h2>
    <form id="fc"><div class="erro-form escondido"></div>
      <div class="campos">
        <div class="campo-largo"><label>Nome *</label><input name="nome" required value="${esc(c.nome)}"></div>
        <div><label>Telefone / WhatsApp</label><input name="telefone" value="${esc(c.telefone)}" placeholder="(75) 9 0000-0000"></div>
        <div><label>E-mail</label><input name="email" type="email" value="${esc(c.email)}"></div>
        <div><label>CPF</label><input name="cpf" value="${esc(c.cpf)}"></div>
        <div><label>Data de nascimento</label><input name="data_nascimento" type="date" value="${esc(c.data_nascimento)}"></div>
        <div class="campo-largo"><label>Observações</label><textarea name="observacoes">${esc(c.observacoes)}</textarea></div>
      </div>
      <div class="acoes"><button type="button" class="secundario" data-fechar>Cancelar</button><button type="submit">Salvar</button></div>
    </form>`);
  aoEnviar(m.querySelector('#fc'), async d => {
    const r = c.id ? await put(`/api/clientes/${c.id}`, d) : await post('/api/clientes', d);
    fecharModal(); avisar('Cliente salvo.'); depois(c.id || r.id);
  });
}

async function telaFicha(id) {
  const f = await get(`/api/clientes/${id}`);
  const c = f.cliente;
  $('#tela').innerHTML = `
    <p><a href="#/clientes">← Clientes</a></p>
    <div class="cartao">
      <div class="ficha-topo">
        <div><h1>${esc(c.nome)} ${c.ativo ? '' : '<span class="etiqueta">inativo</span>'}</h1>
          <div>${f.situacao.map(s => `${esc(s.produto)} ${etiqueta(s.status)} <span class="pequeno mudo">vence ${data(s.vencimento)}</span>`).join(' &nbsp; ') || '<span class="mudo">Sem serviços</span>'}</div></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${c.ativo ? `<a class="botao" href="#/venda?cliente=${c.id}">Nova venda</a>` : ''}
          <button class="secundario" id="editar">Editar</button>
          ${perfilAdmin() ? `<button class="${c.ativo ? 'perigo' : 'secundario'}" id="ativo">${c.ativo ? 'Desativar' : 'Reativar'}</button>` : ''}
        </div>
      </div>
      <div class="dados-lista">
        <div><span>Telefone</span>${esc(c.telefone || '—')}</div>
        <div><span>E-mail</span>${esc(c.email || '—')}</div>
        <div><span>CPF</span>${esc(c.cpf || '—')}</div>
        <div><span>Nascimento</span>${data(c.data_nascimento)}</div>
        <div><span>Cliente desde</span>${data(c.criado_em)}</div>
        <div><span>Total já pago</span><b>${brl(f.totalPago)}</b></div>
      </div>
      ${c.observacoes ? `<p class="pequeno" style="margin-bottom:0"><b>Observações:</b> ${esc(c.observacoes)}</p>` : ''}
    </div>
    <div class="cartao"><h2>Assinaturas</h2>
      ${f.assinaturas.length ? `<div class="tabela-rolagem"><table><thead><tr><th>Serviço</th><th>Plano</th><th>Início</th><th>Vencimento</th><th class="direita">Valor</th><th>Situação</th></tr></thead><tbody>
      ${f.assinaturas.map(a => `<tr><td>${esc(a.produto)}${a.pessoas === 2 ? ` <span class="etiqueta">Dupla${a.parceira ? ' com ' + esc(a.parceira) : ''}</span>` : ''}</td><td>${esc(a.plano)}</td>
        <td class="num">${data(a.inicio)}</td><td class="num">${data(a.vencimento)}</td>
        <td class="direita num">${brl(a.valor_final)}${a.desconto_manual > 0 ? `<div class="pequeno mudo" title="${esc(a.motivo_desconto)}">desc. ${brl(a.desconto_manual)}</div>` : ''}</td><td>${esc(a.situacao)}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="vazio">Nenhuma assinatura.</div>'}
    </div>
    <div class="cartao"><h2>Pagamentos</h2>
      ${f.pagamentos.length ? `<div class="tabela-rolagem"><table><thead><tr><th>Data</th><th>Serviço</th><th>Forma</th><th class="direita">Valor</th><th>Situação</th></tr></thead><tbody>
      ${f.pagamentos.map(p => `<tr><td class="num">${data(p.data_pagamento || p.vencimento)}</td><td>${esc(p.produto)}</td><td>${esc(p.forma || '—')}${p.total_parcelas > 1 ? ` ${p.total_parcelas}x` : ''}</td><td class="direita num">${brl(p.valor + (p.juros || 0))}${p.juros > 0 ? `<div class="pequeno mudo">inclui juros ${brl(p.juros)}</div>` : ''}</td>
        <td>${p.situacao === 'pendente' ? `<span class="etiqueta vencendo">pendente</span> <button class="link" data-receber="${p.id}" data-valor="${p.valor}">Receber</button>` : esc(p.situacao)}${p.situacao === 'pago' ? ` <button class="link" data-recibo="${p.id}">Recibo</button>` : ''}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="vazio">Nenhum pagamento.</div>'}
    </div>`;
  $('#editar').onclick = () => modalCliente(c, () => telaFicha(id));
  $('#tela').querySelectorAll('[data-receber]').forEach(b => b.onclick = () => modalReceber(b.dataset.receber, Number(b.dataset.valor), () => telaFicha(id)));
  $('#tela').querySelectorAll('[data-recibo]').forEach(b => b.onclick = () => abrirRecibo(b.dataset.recibo));
  const b = $('#ativo');
  if (b) b.onclick = () => {
    const m = abrirModal(`<h2>${c.ativo ? 'Desativar' : 'Reativar'} ${esc(c.nome)}</h2>
      <p class="mudo">${c.ativo ? 'O cliente some da lista de ativos, mas todo o histórico continua guardado.' : 'O cliente volta para a lista de ativos.'}</p>
      <form id="fa"><div class="erro-form escondido"></div>
        <label>Motivo ${c.ativo ? '(ex.: saiu do estúdio)' : ''}</label><input name="motivo">
        <div class="acoes"><button type="button" class="secundario" data-fechar>Cancelar</button><button type="submit">Confirmar</button></div></form>`);
    aoEnviar(m.querySelector('#fa'), async d => { await post(`/api/clientes/${id}/ativo`, { ativo: !c.ativo, motivo: d.motivo }); fecharModal(); avisar('Feito.'); telaFicha(id); });
  };
}

// ---------- Produtos e preços ----------
async function telaProdutos() {
  const lista = await get('/api/produtos');
  const adm = perfilAdmin();
  $('#tela').innerHTML = `
    <div class="topo"><div><h1>Produtos e preços</h1><p class="mudo">Mudar um preço cria um novo registro com data de início; vendas antigas não mudam.</p></div>
      ${adm ? '<button id="novo">+ Novo produto</button>' : ''}</div>
    <div class="cartao"><div class="tabela-rolagem"><table>
      <thead><tr><th>Produto</th><th>Tipo</th><th class="direita">Individual</th><th class="direita">Dupla</th><th></th></tr></thead><tbody>
      ${lista.map(p => `<tr class="${p.ativo ? '' : 'inativo'}">
        <td><b>${esc(p.nome)}</b>${p.ativo ? '' : ' <span class="etiqueta">inativo</span>'}<div class="pequeno mudo">${esc(p.descricao || '')}</div>
          ${(p.agendados || []).map(a => `<div class="pequeno" style="color:var(--alerta)">A partir de ${data(a.vigente_desde)}: ${a.pessoas === 2 ? 'Dupla' : 'Individual'} ${brl(a.valor)}</div>`).join('')}</td>
        <td>${p.tipo === 'recorrente' ? 'Mensal' : 'Avulso'}</td>
        <td class="direita num">${brl(p.preco_individual)}</td>
        <td class="direita num">${p.tipo === 'recorrente' ? brl(p.preco_dupla) : '—'}</td>
        <td class="direita" style="white-space:nowrap">
          ${adm ? `<button class="link" data-preco="${p.id}">Alterar preço</button><button class="link" data-editar="${p.id}">Editar</button>` : ''}
          <button class="link" data-hist="${p.id}">Histórico</button></td></tr>`).join('')}
      </tbody></table></div>
      <p class="pequeno mudo" style="margin-bottom:0">Dupla = valor mensal total para duas pessoas (cada uma paga a metade).</p>
    </div>`;
  const porId = Object.fromEntries(lista.map(p => [p.id, p]));
  $('#tela').querySelectorAll('[data-hist]').forEach(b => b.onclick = () => modalHistorico(porId[b.dataset.hist]));
  $('#tela').querySelectorAll('[data-preco]').forEach(b => b.onclick = () => modalPreco(porId[b.dataset.preco]));
  $('#tela').querySelectorAll('[data-editar]').forEach(b => b.onclick = () => modalProduto(porId[b.dataset.editar]));
  if (adm) $('#novo').onclick = () => modalProduto(null);
}

async function modalHistorico(p) {
  const h = await get(`/api/produtos/${p.id}/precos`);
  abrirModal(`<h2>Histórico de preços — ${esc(p.nome)}</h2>
    <div class="tabela-rolagem"><table><thead><tr><th>Vale desde</th><th>Modalidade</th><th class="direita">Valor</th><th>Registrado por</th></tr></thead><tbody>
    ${h.map(x => `<tr><td class="num">${data(x.vigente_desde)}</td><td>${x.pessoas === 2 ? 'Dupla' : 'Individual'}</td><td class="direita num">${brl(x.valor)}</td><td class="pequeno">${esc(x.usuario || 'Configuração inicial')}<br><span class="mudo">${new Date(x.criado_em).toLocaleString('pt-BR')}</span></td></tr>`).join('')}
    </tbody></table></div>
    <div class="acoes"><button data-fechar>Fechar</button></div>`);
}

function modalPreco(p) {
  const m = abrirModal(`<h2>Alterar preço — ${esc(p.nome)}</h2>
    <p class="mudo pequeno">Atual: Individual ${brl(p.preco_individual)}${p.tipo === 'recorrente' ? ` · Dupla ${brl(p.preco_dupla)}` : ''}. O novo valor vale para vendas a partir da data escolhida.</p>
    <form id="fp"><div class="erro-form escondido"></div>
      <div class="campos">
        ${p.tipo === 'recorrente' ? `<div class="campo-largo"><label>Modalidade</label><div class="radios">
          <label><input type="radio" name="pessoas" value="1" checked> Individual</label><label><input type="radio" name="pessoas" value="2"> Dupla (total das 2 pessoas)</label></div></div>` : '<input type="hidden" name="pessoas" value="1">'}
        <div><label>Novo valor mensal (R$)</label><input name="valor" type="number" step="0.01" min="0" required></div>
        <div><label>Vale a partir de</label><input name="vigente_desde" type="date" required value="${hoje()}"></div>
      </div>
      <div class="acoes"><button type="button" class="secundario" data-fechar>Cancelar</button><button type="submit">Salvar novo preço</button></div>
    </form>`);
  aoEnviar(m.querySelector('#fp'), async d => { await post(`/api/produtos/${p.id}/precos`, d); fecharModal(); avisar('Preço registrado.'); telaProdutos(); });
}

function modalProduto(p) {
  const novo = !p; p = p || { tipo: 'recorrente', ativo: true };
  const m = abrirModal(`<h2>${novo ? 'Novo produto ou serviço' : 'Editar ' + esc(p.nome)}</h2>
    <form id="fpr"><div class="erro-form escondido"></div>
      <div class="campos">
        <div class="campo-largo"><label>Nome *</label><input name="nome" required value="${esc(p.nome)}"></div>
        ${novo ? `<div class="campo-largo"><label>Tipo</label><div class="radios">
          <label><input type="radio" name="tipo" value="recorrente" checked> Mensal (com planos)</label>
          <label><input type="radio" name="tipo" value="avulso"> Avulso (venda única)</label></div>
          <div class="ajuda">Produtos com estoque, tamanho e cor (luvas, suplementos, roupas) ficam melhor cadastrados na tela <a href="#/estoque" data-fechar>Estoque</a>.</div></div>
          <div><label>Preço individual (R$) *</label><input name="preco_individual" type="number" step="0.01" min="0" required></div>
          <div id="campo-dupla"><label>Preço Dupla (R$)</label><input name="preco_dupla" type="number" step="0.01" min="0"><div class="ajuda" id="sugestao-dupla">Total das 2 pessoas. Deixe vazio se não houver Dupla.</div></div>
          <div><label>Preços valem a partir de</label><input name="vigente_desde" type="date" value="${hoje()}"></div>` : ''}
        <div class="campo-largo"><label>Descrição</label><input name="descricao" value="${esc(p.descricao)}"></div>
        ${novo ? '' : `<div class="campo-largo"><label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" name="ativo" style="width:auto" ${p.ativo ? 'checked' : ''}> Produto ativo (aparece nas vendas)</label></div>`}
      </div>
      <div class="acoes"><button type="button" class="secundario" data-fechar>Cancelar</button><button type="submit">Salvar</button></div>
    </form>`);
  if (novo) {
    const f = m.querySelector('#fpr');
    const atualizar = () => {
      const rec = f.querySelector('input[name=tipo]:checked').value === 'recorrente';
      m.querySelector('#campo-dupla').classList.toggle('escondido', !rec);
      const v = Number(f.preco_individual.value);
      m.querySelector('#sugestao-dupla').textContent = v > 0 ? `Total das 2 pessoas. Pela regra atual (25% off): ${brl(v * 2 * 0.75)}.` : 'Total das 2 pessoas. Deixe vazio se não houver Dupla.';
    };
    f.addEventListener('input', atualizar); f.addEventListener('change', atualizar);
  }
  aoEnviar(m.querySelector('#fpr'), async d => {
    if (novo) await post('/api/produtos', d); else await put(`/api/produtos/${p.id}`, d);
    fecharModal(); avisar('Produto salvo.'); telaProdutos();
  });
}

// ---------- Planos ----------
async function telaPlanos() {
  const [planos, produtos, tabela] = await Promise.all([get('/api/planos'), get('/api/produtos'), get('/api/tabela-planos')]);
  const adm = perfilAdmin();
  const recorrentes = produtos.filter(p => p.tipo === 'recorrente' && p.ativo);
  $('#tela').innerHTML = `
    <div class="topo"><div><h1>Planos</h1><p class="mudo">Valor do plano = preço mensal × meses × (1 − desconto). Vale para Individual e Dupla.</p></div>
      ${adm ? '<button id="novo">+ Novo plano</button>' : ''}</div>
    <div class="cartao"><div class="tabela-rolagem"><table>
      <thead><tr><th>Plano</th><th class="direita">Meses</th><th>Regra de valor</th><th>Vale para</th><th></th></tr></thead><tbody>
      ${planos.map(p => `<tr class="${p.ativo ? '' : 'inativo'}"><td><b>${esc(p.nome)}</b>${p.ativo ? '' : ' <span class="etiqueta">inativo</span>'}</td>
        <td class="direita num">${p.meses}</td>
        <td>${p.valor_fixo != null ? `Valor fixo ${brl(p.valor_fixo)}` : `${pct(p.desconto_percentual)} de desconto`}</td>
        <td>${esc(p.produto || 'Todos os mensais')}</td>
        <td class="direita" style="white-space:nowrap">${adm ? `<button class="link" data-editar="${p.id}">Editar</button><button class="link" data-ativo="${p.id}">${p.ativo ? 'Desativar' : 'Ativar'}</button>` : ''}</td></tr>`).join('')}
      </tbody></table></div></div>
    <div class="cartao"><h2>Tabela de valores</h2>
      <div class="linha-filtros"><select id="filtro-prod"><option value="">Todos os produtos</option>${recorrentes.map(p => `<option>${esc(p.nome)}</option>`).join('')}</select>
        <select id="filtro-mod"><option value="">Individual e Dupla</option><option>Individual</option><option>Dupla</option></select></div>
      <div id="tabela"></div></div>`;
  const desenharTabela = () => {
    const fp = $('#filtro-prod').value, fm = $('#filtro-mod').value;
    const linhas = tabela.filter(t => (!fp || t.produto === fp) && (!fm || t.modalidade === fm));
    $('#tabela').innerHTML = `<div class="tabela-rolagem"><table><thead><tr><th>Produto</th><th>Modalidade</th><th>Plano</th><th class="direita">Total do plano</th><th class="direita">Por pessoa</th><th class="direita">Equivale por mês</th></tr></thead><tbody>
      ${linhas.map(t => `<tr><td>${esc(t.produto)}</td><td>${esc(t.modalidade)}</td><td>${esc(t.plano)}</td><td class="direita num"><b>${brl(t.valor_total)}</b></td><td class="direita num">${brl(t.valor_por_pessoa)}</td><td class="direita num mudo">${brl(t.valor_total / t.meses)}</td></tr>`).join('')}
      </tbody></table></div>`;
  };
  $('#filtro-prod').onchange = desenharTabela; $('#filtro-mod').onchange = desenharTabela; desenharTabela();
  const porId = Object.fromEntries(planos.map(p => [p.id, p]));
  $('#tela').querySelectorAll('[data-editar]').forEach(b => b.onclick = () => modalPlano(porId[b.dataset.editar], recorrentes));
  $('#tela').querySelectorAll('[data-ativo]').forEach(b => b.onclick = async () => {
    const p = porId[b.dataset.ativo];
    try { await put(`/api/planos/${p.id}`, { somenteAtivo: true, ativo: !p.ativo }); avisar(p.ativo ? 'Plano desativado.' : 'Plano ativado.'); telaPlanos(); } catch (e) { avisar(e.message, 'erro'); }
  });
  if (adm) $('#novo').onclick = () => modalPlano(null, recorrentes);
}

function modalPlano(p, produtos) {
  const novo = !p; p = p || { meses: 1, desconto_percentual: 0 };
  const fixo = p.valor_fixo != null;
  const m = abrirModal(`<h2>${novo ? 'Novo plano' : 'Editar plano ' + esc(p.nome)}</h2>
    ${novo ? '' : '<p class="pequeno mudo">Mudanças valem para as próximas vendas; assinaturas já feitas mantêm o valor da época.</p>'}
    <form id="fpl"><div class="erro-form escondido"></div>
      <div class="campos">
        <div><label>Nome do plano *</label><input name="nome" required value="${esc(p.nome)}" placeholder="Ex.: Quadrimestral"></div>
        <div><label>Quantidade de meses *</label><input name="meses" type="number" min="1" max="60" required value="${esc(p.meses)}"></div>
        <div class="campo-largo"><label>Como calcular o valor</label><div class="radios">
          <label><input type="radio" name="regra" value="desconto" ${fixo ? '' : 'checked'}> Desconto em % sobre o preço mensal</label>
          <label><input type="radio" name="regra" value="fixo" ${fixo ? 'checked' : ''}> Valor fixo (promoção)</label></div></div>
        <div id="c-desc"><label>Desconto (%)</label><input name="desconto_percentual" type="number" step="0.01" min="0" max="100" value="${esc(p.desconto_percentual)}"></div>
        <div id="c-fixo"><label>Valor fixo do plano (R$)</label><input name="valor_fixo" type="number" step="0.01" min="0" value="${esc(p.valor_fixo ?? '')}"><div class="ajuda">Total do período inteiro.</div></div>
        <div><label>Vale para</label><select name="produto_id"><option value="">Todos os mensais</option>${produtos.map(x => `<option value="${x.id}" ${x.id === p.produto_id ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</select></div>
      </div>
      <div class="cartao" style="margin:16px 0 0;background:var(--superficie-2)"><b class="pequeno">Prévia</b><div id="previa" class="pequeno"></div></div>
      <div class="acoes"><button type="button" class="secundario" data-fechar>Cancelar</button><button type="submit">Salvar plano</button></div>
    </form>`);
  const f = m.querySelector('#fpl');
  const atualizar = () => {
    const regra = f.querySelector('input[name=regra]:checked').value;
    m.querySelector('#c-desc').classList.toggle('escondido', regra !== 'desconto');
    m.querySelector('#c-fixo').classList.toggle('escondido', regra !== 'fixo');
    const meses = Number(f.meses.value) || 0, desc = Number(f.desconto_percentual.value) || 0, vfixo = Number(f.valor_fixo.value);
    const alvo = produtos.filter(x => !f.produto_id.value || x.id === f.produto_id.value);
    if (regra === 'fixo') {
      m.querySelector('#previa').innerHTML = f.produto_id.value && f.valor_fixo.value !== ''
        ? `Total ${brl(vfixo)} por ${meses} mês(es) = ${brl(vfixo / (meses || 1))} por mês.` : '<span class="mudo">Escolha um produto e informe o valor.</span>';
      return;
    }
    m.querySelector('#previa').innerHTML = alvo.map(x => {
      const ind = x.preco_individual * meses * (1 - desc / 100), dup = x.preco_dupla != null ? x.preco_dupla * meses * (1 - desc / 100) : null;
      return `${esc(x.nome)}: Individual <b>${brl(ind)}</b>${dup != null ? ` · Dupla <b>${brl(dup)}</b> (${brl(dup / 2)} cada)` : ''}`;
    }).join('<br>') || '<span class="mudo">Sem produtos mensais ativos.</span>';
  };
  f.addEventListener('input', atualizar); f.addEventListener('change', atualizar); atualizar();
  aoEnviar(f, async d => {
    if (d.regra === 'fixo') d.desconto_percentual = 0; else d.valor_fixo = '';
    if (novo) await post('/api/planos', d); else await put(`/api/planos/${p.id}`, { ...d, ativo: p.ativo });
    fecharModal(); avisar('Plano salvo.'); telaPlanos();
  });
}

// ---------- Usuários ----------
async function telaUsuarios() {
  const [lista, pedidos] = await Promise.all([get('/api/usuarios'), get('/api/pedidos-senha')]);
  const pediu = Object.fromEntries(pedidos.map(p => [p.usuario_id, p]));
  $('#tela').innerHTML = `
    <div class="topo"><div><h1>Usuários</h1><p class="mudo">Usuários nunca são apagados, só desativados.</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="secundario" id="codigo">Gerar novo código de recuperação</button><button id="novo">+ Novo usuário</button></div></div>
    ${pedidos.length ? `<div class="cartao" style="border-color:var(--alerta-borda);background:var(--alerta-claro)"><h2>Pedidos de nova senha (${pedidos.length})</h2>
      ${pedidos.map(p => `<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;padding:6px 0">
        <span><b>${esc(p.nome)}</b> (login ${esc(p.login)}) pediu uma nova senha em ${new Date(p.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.</span>
        <span style="display:flex;gap:6px"><button data-reset="${p.usuario_id}">Criar nova senha</button><button class="secundario" data-descartar="${p.id}" title="Não foi essa pessoa que pediu">Descartar</button></span></div>`).join('')}</div>` : ''}
    <div class="cartao"><div class="tabela-rolagem"><table>
      <thead><tr><th>Nome</th><th>Login</th><th>Perfil</th><th>Situação</th><th></th></tr></thead><tbody>
      ${lista.map(u => `<tr class="${u.ativo ? '' : 'inativo'}"><td><b>${esc(u.nome)}</b>${u.id === estado.usuario.id ? ' <span class="pequeno mudo">(você)</span>' : ''}</td><td>${esc(u.login)}</td>
        <td>${u.perfil === 'administrador' ? 'Administrador' : 'Vendedor'}</td>
        <td>${u.ativo ? (u.trocar_senha ? '<span class="etiqueta vencendo">aguardando 1º acesso</span>' : '<span class="etiqueta ok">ativo</span>') : '<span class="etiqueta">desativado</span>'}</td>
        <td class="direita" style="white-space:nowrap"><button class="link" data-editar="${u.id}">Editar</button>${u.id !== estado.usuario.id ? `<button class="link" data-reset="${u.id}">${pediu[u.id] ? '<b>Criar nova senha</b> (pediu)' : 'Redefinir senha'}</button>` : ''}</td></tr>`).join('')}
      </tbody></table></div></div>
    <div class="cartao"><h2>O que cada perfil pode fazer</h2><div class="tabela-rolagem"><table>
      <thead><tr><th>Função</th><th>Administrador</th><th>Vendedor</th></tr></thead><tbody>
      <tr><td>Cadastrar e editar clientes</td><td>Sim</td><td>Sim</td></tr>
      <tr><td>Registrar vendas, assinaturas e pagamentos (etapa 2)</td><td>Sim</td><td>Sim</td></tr>
      <tr><td>Dar desconto na hora da venda (com motivo)</td><td>Sim</td><td>Sim</td></tr>
      <tr><td>Ver preços, planos e tabela de valores</td><td>Sim</td><td>Sim</td></tr>
      <tr><td>Alterar preços, produtos e planos</td><td>Sim</td><td>Não</td></tr>
      <tr><td>Desativar clientes, cancelar vendas</td><td>Sim</td><td>Não</td></tr>
      <tr><td>Usuários, backup, configurações e auditoria</td><td>Sim</td><td>Não</td></tr>
      </tbody></table></div></div>`;
  const porId = Object.fromEntries(lista.map(u => [u.id, u]));
  $('#novo').onclick = () => modalUsuario(null);
  $('#tela').querySelectorAll('[data-editar]').forEach(b => b.onclick = () => modalUsuario(porId[b.dataset.editar]));
  $('#tela').querySelectorAll('[data-descartar]').forEach(b => b.onclick = async () => { await post(`/api/pedidos-senha/${b.dataset.descartar}/descartar`); avisar('Pedido descartado.'); telaUsuarios(); });
  $('#tela').querySelectorAll('[data-reset]').forEach(b => b.onclick = () => {
    const u = porId[b.dataset.reset];
    const m = abrirModal(`<h2>Nova senha para ${esc(u.nome)}</h2>
      <p class="mudo">A senha antiga deixa de funcionar. ${esc(u.nome)} entra com a senha provisória e o sistema pede para criar a senha pessoal.</p>
      <form id="frs"><div class="erro-form escondido"></div>
        <div class="radios" style="margin-bottom:10px">
          <label><input type="radio" name="como" value="gerar" checked> Gerar uma senha provisória automaticamente</label>
          <label><input type="radio" name="como" value="digitar"> Eu digito a senha provisória</label></div>
        <div id="c-dig" class="escondido"><label>Senha provisória</label><input name="senha" type="text" autocomplete="off" placeholder="Pelo menos 6 caracteres"></div>
        <div class="acoes"><button type="button" class="secundario" data-fechar>Cancelar</button><button type="submit">Criar nova senha</button></div></form>`);
    const f = m.querySelector('#frs');
    f.querySelectorAll('input[name=como]').forEach(r => r.onchange = () => m.querySelector('#c-dig').classList.toggle('escondido', f.como.value !== 'digitar'));
    aoEnviar(f, async d => {
      const r = await post(`/api/usuarios/${u.id}/resetar-senha`, d.como === 'digitar' ? { senha: d.senha } : {});
      mostrarCodigo(`Senha provisória de ${u.nome}`, r.senhaProvisoria, `Entregue esta senha para <b>${esc(u.nome)}</b> (login <b>${esc(u.login)}</b>). No primeiro acesso, o sistema vai pedir para criar uma senha nova.`);
      telaUsuarios();
    });
  });
  $('#codigo').onclick = () => {
    const m = abrirModal(`<h2>Novo código de recuperação</h2><p class="mudo">O código impresso anteriormente deixará de valer. Use se perdeu o papel ou acha que alguém viu.</p>
      <div class="acoes"><button class="secundario" data-fechar>Cancelar</button><button id="ok">Gerar novo código</button></div>`);
    m.querySelector('#ok').onclick = async () => {
      try { const r = await post('/api/novo-codigo-recuperacao'); mostrarCodigo('Seu novo código de recuperação', r.codigoRecuperacao, `Login: <b>${esc(estado.usuario.login)}</b>. Imprima e guarde em local seguro.`); }
      catch (e) { avisar(e.message, 'erro'); }
    };
  };
}

function modalUsuario(u) {
  const novo = !u; u = u || { perfil: 'vendedor', ativo: true };
  const m = abrirModal(`<h2>${novo ? 'Novo usuário' : 'Editar ' + esc(u.nome)}</h2>
    <form id="fu"><div class="erro-form escondido"></div>
      <div class="campos">
        <div><label>Nome *</label><input name="nome" required value="${esc(u.nome)}"></div>
        <div><label>Login *</label><input name="login" required value="${esc(u.login)}" ${novo ? '' : 'disabled'}></div>
        <div class="campo-largo"><label>Perfil</label><div class="radios">
          <label><input type="radio" name="perfil" value="vendedor" ${u.perfil !== 'administrador' ? 'checked' : ''}> Vendedor</label>
          <label><input type="radio" name="perfil" value="administrador" ${u.perfil === 'administrador' ? 'checked' : ''}> Administrador</label></div></div>
        ${novo ? '' : `<div class="campo-largo"><label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" name="ativo" style="width:auto" ${u.ativo ? 'checked' : ''}> Usuário ativo (pode entrar no sistema)</label></div>`}
      </div>
      ${novo ? '<p class="pequeno mudo">Uma senha provisória será gerada; no primeiro acesso a pessoa cria a própria senha.</p>' : ''}
      <div class="acoes"><button type="button" class="secundario" data-fechar>Cancelar</button><button type="submit">Salvar</button></div>
    </form>`);
  aoEnviar(m.querySelector('#fu'), async d => {
    if (novo) {
      const r = await post('/api/usuarios', d);
      mostrarCodigo(`Senha provisória de ${d.nome}`, r.senhaProvisoria, `Entregue para <b>${esc(d.nome)}</b>. Login: <b>${esc(d.login.toLowerCase())}</b>.`);
    } else { await put(`/api/usuarios/${u.id}`, d); fecharModal(); avisar('Usuário salvo.'); }
    telaUsuarios();
  });
}

iniciar();
