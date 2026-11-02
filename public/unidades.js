// Sistema de Gestão do Estúdio — despesas, resultado (lucro) e rede de unidades
'use strict';

const CORES_UNIDADES = [1, 2, 3, 4, 5, 6, 7, 8].map(n => `var(--serie-${n})`);
function periodoDoMes(mes, agrupar) {
  const [a, m] = mes.split('-').map(Number);
  if (agrupar === 'trimestre') return `${a}-T${Math.ceil(m / 3)}`;
  if (agrupar === 'semestre') return `${a}-S${m <= 6 ? 1 : 2}`;
  if (agrupar === 'ano') return String(a);
  return mes;
}
function atalhosPeriodo(id, atual, P) {
  return `<div class="atalhos" id="${id}">${[['mes', 'Este mês'], ['anterior', 'Mês passado'], ['ano', 'Este ano'], ['doze', 'Últimos 12 meses'], ['outro', 'Outro período']]
    .map(([v, n]) => `<button type="button" class="secundario ${atual === v ? 'ativa' : ''}" data-p="${v}">${n}</button>`).join('')}</div>`;
}
function periodosPadrao() {
  const P = periodosRel(), h = new Date(), z = n => String(n).padStart(2, '0');
  const pa = new Date(h.getFullYear(), h.getMonth() - 1, 1);
  return { ...P, anterior: [`${pa.getFullYear()}-${z(pa.getMonth() + 1)}-01`, new Date(pa.getFullYear(), pa.getMonth() + 1, 0).toISOString().slice(0, 10)] };
}

// ---------- Despesas ----------
let filtroDesp = null;
async function telaDespesas() {
  const P = periodosPadrao();
  filtroDesp = filtroDesp || { tipo: 'mes', de: P.mes[0], ate: P.mes[1] };
  const [cats, formas] = await Promise.all([get('/api/despesas/categorias'), get('/api/formas-pagamento')]);
  $('#tela').innerHTML = `
    <div class="topo"><div><h1>Despesas</h1><p class="mudo">Contas desta unidade: aluguel, salários, energia, compras… Entram no cálculo do lucro.</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="secundario" id="cats">Categorias</button><button id="nova">+ Nova despesa</button></div></div>
    <div class="cartao">
      <div class="linha-filtros" style="align-items:center;margin:0">${atalhosPeriodo('per', filtroDesp.tipo, P)}
        <span id="datas" class="${filtroDesp.tipo === 'outro' ? '' : 'escondido'}" style="display:flex;gap:6px;align-items:center"><input type="date" id="de" value="${filtroDesp.de}" style="width:auto"> a <input type="date" id="ate" value="${filtroDesp.ate}" style="width:auto"></span></div>
    </div>
    <div id="corpo"><p class="mudo">Carregando…</p></div>`;
  const carregar = async () => {
    const [d, res] = await Promise.all([get(`/api/despesas?de=${filtroDesp.de}&ate=${filtroDesp.ate}`), get(`/api/resultado?de=${filtroDesp.de}&ate=${filtroDesp.ate}&agrupar=ano`)]);
    const tot = res.reduce((s, x) => ({ recebido: s.recebido + x.recebido, taxas: s.taxas + x.taxas, despesas: s.despesas + x.despesas, lucro: s.lucro + x.lucro }), { recebido: 0, taxas: 0, despesas: 0, lucro: 0 });
    const hoje = (await get('/api/venda/dados')).hoje;
    const totalAPagar = d.aPagar.reduce((s, x) => s + x.valor, 0), vencidas = d.aPagar.filter(x => x.vencimento < hoje);
    $('#corpo').innerHTML = `
      <p class="pequeno mudo" style="margin-top:0">Período: ${data(filtroDesp.de)} a ${data(filtroDesp.ate)}</p>
      <div class="grade">
        <div class="indicador"><div class="rotulo">Recebido</div><div class="valor num">${brl(tot.recebido)}</div><div class="pequeno mudo">taxas ${brl(tot.taxas)}</div></div>
        <div class="indicador"><div class="rotulo">Despesas pagas</div><div class="valor num" style="color:var(--perigo)">${brl(tot.despesas)}</div></div>
        <div class="indicador"><div class="rotulo">Lucro</div><div class="valor num" style="color:${tot.lucro >= 0 ? 'var(--ok)' : 'var(--perigo)'}">${brl(tot.lucro)}</div>
          <div class="pequeno mudo">${tot.recebido > 0 ? `margem ${pct(Math.round(tot.lucro / tot.recebido * 1000) / 10)}` : 'recebido − taxas − despesas'}</div></div>
        <div class="indicador"><div class="rotulo">Contas a pagar</div><div class="valor num">${brl(totalAPagar)}</div><div class="pequeno ${vencidas.length ? '' : 'mudo'}" style="${vencidas.length ? 'color:var(--perigo)' : ''}">${d.aPagar.length} conta(s)${vencidas.length ? ` · ${vencidas.length} vencida(s)` : ''}</div></div>
      </div>
      <div class="cartao"><h2>Contas a pagar (${d.aPagar.length})</h2>
        ${d.aPagar.length ? `<div class="tabela-rolagem"><table><thead><tr><th>Vencimento</th><th>Descrição</th><th>Categoria</th><th class="direita">Valor</th><th></th></tr></thead><tbody>
          ${d.aPagar.map(x => `<tr><td class="num">${data(x.vencimento)}${x.vencimento < hoje ? ' <span class="etiqueta em-atraso" data-st>vencida</span>' : ''}</td><td>${esc(x.descricao)}${x.fornecedor ? `<div class="pequeno mudo">${esc(x.fornecedor)}</div>` : ''}</td>
            <td>${esc(x.categoria)}</td><td class="direita num">${brl(x.valor)}</td>
            <td class="direita" style="white-space:nowrap"><button class="link" data-pagar="${x.id}">Pagar</button><button class="link" data-editar="${x.id}">Editar</button><button class="link" style="color:var(--perigo)" data-cancelar="${x.id}">Cancelar</button></td></tr>`).join('')}
        </tbody></table></div>` : '<div class="vazio">Nenhuma conta a pagar.</div>'}</div>
      <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr));align-items:start">
        ${tabelaRel('dcat', 'Despesas por categoria', ['Categoria', 'Lançamentos', 'Total'], d.porCategoria.map(x => [x.categoria, x.qtd, x.total]), { fmt: [esc, v => v, brl] })}
      </div>
      <div class="cartao"><h2>Despesas pagas no período</h2>
        ${d.pagas.length ? `<div class="tabela-rolagem"><table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Forma</th><th class="direita">Valor</th><th></th></tr></thead><tbody>
          ${d.pagas.map(x => `<tr class="${x.situacao === 'cancelada' ? 'inativo' : ''}"><td class="num">${data(x.data_pagamento || x.vencimento)}</td><td>${esc(x.descricao)}${x.fornecedor ? `<div class="pequeno mudo">${esc(x.fornecedor)}</div>` : ''}</td>
            <td>${esc(x.categoria)}</td><td>${esc(x.forma || '—')}</td><td class="direita num">${x.situacao === 'cancelada' ? `<s>${brl(x.valor)}</s>` : brl(x.valor)}</td>
            <td class="direita" style="white-space:nowrap">${x.situacao === 'cancelada' ? `<span class="etiqueta cancelada" data-st title="${esc(x.motivo_cancelamento)}">cancelada</span>` : `<button class="link" data-editar="${x.id}">Editar</button><button class="link" style="color:var(--perigo)" data-cancelar="${x.id}">Cancelar</button>`}</td></tr>`).join('')}
        </tbody></table></div>` : '<div class="vazio">Nenhuma despesa paga no período.</div>'}</div>`;
    const todas = [...d.aPagar, ...d.pagas];
    $('#corpo').querySelectorAll('[data-editar]').forEach(b => b.onclick = () => modalDespesa(todas.find(x => x.id === b.dataset.editar), cats, formas, hoje, carregar));
    $('#corpo').querySelectorAll('[data-cancelar]').forEach(b => b.onclick = () => modalMotivo('Cancelar despesa', 'A despesa fica marcada como cancelada (não é apagada) e sai dos totais.', 'Motivo (ex.: lançada em dobro)',
      m => post(`/api/despesas/${b.dataset.cancelar}/cancelar`, { motivo: m }), carregar));
    $('#corpo').querySelectorAll('[data-pagar]').forEach(b => b.onclick = () => {
      const x = d.aPagar.find(y => y.id === b.dataset.pagar);
      const m = abrirModal(`<h2>Pagar: ${esc(x.descricao)}</h2>
        <form id="fpg"><div class="erro-form escondido"></div><div class="campos">
          <div><label>Valor pago (R$)</label><input name="valor" type="number" step="0.01" min="0.01" value="${x.valor}"></div>
          <div><label>Data do pagamento</label><input name="data_pagamento" type="date" value="${hoje}"></div>
          <div><label>Forma</label><select name="forma_pagamento_id"><option value="">—</option>${formas.filter(f => f.ativa).map(f => `<option value="${f.id}">${esc(f.nome)}</option>`).join('')}</select></div></div>
          <div class="acoes"><button type="button" class="secundario" data-fechar>Cancelar</button><button type="submit">Marcar como paga</button></div></form>`);
      aoEnviar(m.querySelector('#fpg'), async v => { await post(`/api/despesas/${x.id}/pagar`, v); fecharModal(); avisar('Despesa paga.'); carregar(); });
    });
  };
  $('#per').querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
    const t = b.dataset.p; $('#per').querySelectorAll('button').forEach(x => x.classList.toggle('ativa', x === b));
    $('#datas').classList.toggle('escondido', t !== 'outro');
    if (t !== 'outro') { filtroDesp = { tipo: t, de: P[t][0], ate: P[t][1] }; $('#de').value = filtroDesp.de; $('#ate').value = filtroDesp.ate; carregar(); } else filtroDesp.tipo = 'outro';
  });
  ['de', 'ate'].forEach(i => $('#' + i).onchange = () => { filtroDesp = { tipo: 'outro', de: $('#de').value, ate: $('#ate').value }; if (filtroDesp.de && filtroDesp.ate) carregar(); });
  const hoje0 = (await get('/api/venda/dados')).hoje;
  $('#nova').onclick = () => modalDespesa(null, cats, formas, hoje0, carregar);
  $('#cats').onclick = () => modalCategoriasDespesa(cats);
  await carregar();
}

function modalDespesa(x, cats, formas, hoje, depois) {
  const novo = !x; x = x || { situacao: 'paga', vencimento: hoje };
  const paga = x.situacao === 'paga';
  const m = abrirModal(`<h2>${novo ? 'Nova despesa' : 'Editar despesa'}</h2>
    <form id="fd"><div class="erro-form escondido"></div>
      <div class="campos">
        <div class="campo-largo"><label>Descrição *</label><input name="descricao" required value="${esc(x.descricao)}" placeholder="Ex.: Aluguel, Conta de luz, Salário da recepcionista"></div>
        <div><label>Categoria *</label><select name="categoria_id" required><option value="">Escolha…</option>${cats.filter(c => c.ativa || c.id === x.categoria_id).map(c => `<option value="${c.id}" ${c.id === x.categoria_id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></div>
        <div><label>Valor (R$) *</label><input name="valor" type="number" step="0.01" min="0.01" required value="${esc(x.valor ?? '')}"></div>
        <div class="campo-largo"><label>Situação</label><div class="radios">
          <label><input type="radio" name="paga" value="sim" ${paga ? 'checked' : ''}> Já foi paga</label>
          <label><input type="radio" name="paga" value="nao" ${paga ? '' : 'checked'}> Ainda vou pagar (conta a pagar)</label></div></div>
        <div><label id="rot-venc">${paga ? 'Data' : 'Vencimento'}</label><input name="vencimento" type="date" required value="${esc(x.vencimento)}"></div>
        <div id="c-forma"><label>Forma de pagamento</label><select name="forma_pagamento_id"><option value="">—</option>${formas.filter(f => f.ativa || f.id === x.forma_pagamento_id).map(f => `<option value="${f.id}" ${f.id === x.forma_pagamento_id ? 'selected' : ''}>${esc(f.nome)}</option>`).join('')}</select></div>
        <div><label>Fornecedor / a quem pagou</label><input name="fornecedor" value="${esc(x.fornecedor)}"></div>
        ${novo ? `<div><label>Repetir</label><select name="repetir"><option value="1">Só esta vez</option>${[3, 6, 12].map(n => `<option value="${n}">Todo mês, por ${n} meses</option>`).join('')}</select>
          <div class="ajuda">Para contas fixas (aluguel, internet). Os próximos meses ficam como "a pagar".</div></div>` : ''}
        <div class="campo-largo"><label>Observação</label><input name="observacao" value="${esc(x.observacao)}"></div>
      </div>
      <div class="acoes"><button type="button" class="secundario" data-fechar>Cancelar</button><button type="submit">Salvar</button></div></form>`);
  const f = m.querySelector('#fd');
  const atualizar = () => { const p = f.querySelector('input[name=paga]:checked').value === 'sim'; m.querySelector('#rot-venc').textContent = p ? 'Data do pagamento' : 'Vencimento'; m.querySelector('#c-forma').classList.toggle('escondido', !p); };
  f.querySelectorAll('input[name=paga]').forEach(r => r.onchange = atualizar); atualizar();
  aoEnviar(f, async d => {
    const corpo = { ...d, paga: d.paga === 'sim', data_pagamento: d.vencimento };
    if (novo) { const r = await post('/api/despesas', corpo); avisar(r.criadas > 1 ? `${r.criadas} despesas lançadas (uma por mês).` : 'Despesa lançada.'); }
    else { await put(`/api/despesas/${x.id}`, corpo); avisar('Despesa salva.'); }
    fecharModal(); depois();
  });
}
function modalCategoriasDespesa(cats) {
  const m = abrirModal(`<h2>Categorias de despesa</h2>
    <div class="tabela-rolagem" style="max-height:50vh;overflow:auto"><table><thead><tr><th>Nome</th><th class="direita">Usos</th><th>Ativa</th><th></th></tr></thead><tbody>
    ${cats.map(c => `<tr data-id="${c.id}"><td><input value="${esc(c.nome)}" data-nome></td><td class="direita num">${c.usos}</td><td><input type="checkbox" style="width:auto" data-ativa ${c.ativa ? 'checked' : ''}></td>
      <td class="direita"><button class="link" data-salvar>Salvar</button></td></tr>`).join('')}
    </tbody></table></div>
    <form id="fcd" class="linha-filtros" style="margin-top:12px"><div class="erro-form escondido" style="width:100%"></div><input name="nome" placeholder="Nova categoria" required><button type="submit" class="secundario">Adicionar</button></form>
    <div class="acoes"><button id="fechar-cats">Fechar</button></div>`);
  m.querySelectorAll('[data-salvar]').forEach(b => b.onclick = async () => {
    const tr = b.closest('tr');
    try { await put(`/api/despesas/categorias/${tr.dataset.id}`, { nome: tr.querySelector('[data-nome]').value, ativa: tr.querySelector('[data-ativa]').checked }); avisar('Categoria salva.'); } catch (e) { avisar(e.message, 'erro'); }
  });
  aoEnviar(m.querySelector('#fcd'), async v => { await post('/api/despesas/categorias', v); modalCategoriasDespesa(await get('/api/despesas/categorias')); });
  m.querySelector('#fechar-cats').onclick = () => { fecharModal(); telaDespesas(); };
}

// ---------- Rede de unidades ----------
function passosRede() {
  return `<ol class="passos">
    <li><div class="passo-topo"><b>Cada unidade usa o próprio sistema</b></div>
      Clientes, vendas e caixa ficam separados. Só um <b>resumo</b> (vendas, despesas e lucro por mês, sem dados de clientes) vai para uma pasta do Google Drive compartilhada entre as unidades.</li>
    <li><div class="passo-topo"><b>A matriz cria a rede</b></div>
      No computador da matriz: <b>Este computador é a MATRIZ</b> → <b>Criar a rede</b>. O sistema cria a pasta <b>Rede de Unidades</b> no Google Drive e um <b>código</b>. Depois é só mandar o <b>convite</b> para cada filial e compartilhar a pasta com o e-mail Google dela.</li>
    <li><div class="passo-topo"><b>A filial entra na rede</b></div>
      No computador da filial: <b>Este computador é uma FILIAL</b> → cole o convite → <b>Conectar</b>. O sistema procura a pasta sozinho e confere o código.</li>
    <li><div class="passo-topo"><b>Como saber que funcionou</b></div>
      No painel <b>Situação da rede</b>, o nome das outras unidades aparece com a hora do último envio. Se só aparecer esta unidade, a pasta ainda não está compartilhada.</li>
  </ol>`;
}
const quandoFoi = iso => {
  if (!iso) return 'nunca';
  const min = Math.round((Date.now() - new Date(iso)) / 6e4);
  if (min < 2) return 'agora há pouco';
  if (min < 60) return `há ${min} min`;
  if (min < 48 * 60) return `há ${Math.round(min / 60)} h`;
  return `em ${new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`;
};
const item = (ok, texto, nivel) => `<li class="check ${ok ? 'ok' : nivel || 'erro'}"><span class="marca">${ok ? '✓' : nivel === 'alerta' ? '!' : '✕'}</span><span>${texto}</span></li>`;
let filtroRede = { de: null, ate: null, agrupar: 'mes', tipo: 'ano' };
async function telaUnidades(passo) {
  const r = await get('/api/rede');
  const P = periodosPadrao();
  if (!filtroRede.de) { filtroRede.de = P.ano[0]; filtroRede.ate = P.ano[1]; }
  const configurado = r.pasta && r.chaveDefinida;
  $('#tela').innerHTML = `
    <div class="topo"><div><h1>Unidades</h1><p class="mudo">Cada unidade usa o próprio sistema. Aqui você junta os números de todas num relatório geral.</p></div>
      ${configurado && !r.conflito ? '<button id="enviar">Enviar resumo agora</button>' : ''}</div>
    ${r.conflito ? `<div class="cartao" style="border-color:var(--perigo)"><h2 style="color:var(--perigo)">Esta unidade está sendo usada em outro computador</h2>
      <p>O computador <b>${esc(r.conflito.computador || 'outro')}</b> enviou o resumo de <b>${esc(r.nome)}</b> ${quandoFoi(r.conflito.quando)}. Para não misturar os números, <b>este computador (${esc(r.computador)}) parou de enviar</b>.</p>
      <p class="pequeno">Se você <b>mudou de computador</b>, use só o novo: este aqui pode ser desinstalado. Se <b>este</b> é o computador certo (o outro foi um engano), clique abaixo.</p>
      <div class="acoes" style="justify-content:flex-start"><button class="secundario" id="assumir">Este é o computador certo</button></div></div>` : ''}
    ${configurado ? '<div class="cartao" id="situacao"><h2>Situação da rede</h2><p class="mudo">Conferindo…</p></div>' : `<div class="cartao" id="assistente">${assistenteRede(r, passo)}</div>`}
    <div class="cartao"><h2>Relatório geral (todas as unidades)</h2>
      <div class="linha-filtros" style="align-items:center">${atalhosPeriodo('per', filtroRede.tipo, P)}
        <span id="datas" class="${filtroRede.tipo === 'outro' ? '' : 'escondido'}" style="display:flex;gap:6px;align-items:center"><input type="date" id="de" value="${filtroRede.de}" style="width:auto"> a <input type="date" id="ate" value="${filtroRede.ate}" style="width:auto"></span>
        <label style="display:flex;gap:6px;align-items:center;margin:0;font-weight:400">Agrupar por <select id="agrupar" style="width:auto"><option value="mes">Mês</option><option value="trimestre">Trimestre</option><option value="semestre">Semestre</option><option value="ano">Ano</option></select></label></div>
      <div id="geral"><p class="mudo">Carregando…</p></div></div>
    <div class="cartao"><details><summary style="cursor:pointer"><h2 style="display:inline">Como funciona a rede de unidades</h2></summary>${passosRede()}</details></div>
    <div class="cartao"><details><summary style="cursor:pointer"><h2 style="display:inline">Configuração manual (avançado)</h2></summary>
      <form id="fr" style="margin-top:12px"><div class="erro-form escondido"></div>
        <div class="campos">
          <div><label>Nome desta unidade *</label><input name="nome" required value="${esc(r.nome)}" placeholder="Ex.: Matriz, Filial Centro"></div>
          <div><label>Código da rede ${r.chaveDefinida ? '(já definido)' : ''}</label><input name="codigo" autocomplete="off" placeholder="${r.chaveDefinida ? 'Deixe vazio para manter' : 'Mesmo código em todas as unidades'}"></div>
          <div class="campo-largo"><label>Pasta da rede no Google Drive</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap"><input name="pasta" value="${esc(r.pasta || '')}" placeholder="Ex.: G:\\Meu Drive\\Rede de Unidades" style="flex:1 1 280px"><button type="button" class="secundario" id="procurar">Procurar Google Drive</button></div>
            <div id="achados" class="pequeno" style="margin-top:6px"></div></div>
          <div class="campo-largo"><label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" name="auto" style="width:auto" ${r.auto ? 'checked' : ''}> Enviar o resumo automaticamente (a cada 6 horas, com o sistema aberto)</label></div>
        </div>
        <div class="acoes"><button type="submit">Salvar configuração</button></div></form></details></div>`;
  $('#agrupar').value = filtroRede.agrupar;
  const f = $('#fr');
  aoEnviar(f, async d => { await put('/api/rede', d); avisar('Configuração salva.'); telaUnidades(); });
  $('#procurar').onclick = async () => {
    const x = await post('/api/backup/procurar-drive').catch(e => ({ erro: e.message })), alvo = $('#achados');
    if (x.erro) { alvo.innerHTML = `<span style="color:var(--perigo)">${esc(x.erro)}</span>`; return; }
    alvo.innerHTML = x.pastas.length ? x.pastas.map((p, i) => `<div>Encontrei <b>${esc(p.drive)}</b> → <button type="button" class="link" data-i="${i}">Usar ${esc(p.drive)}\\Rede de Unidades</button></div>`).join('')
      : '<span style="color:var(--alerta)">Não encontrei o Google Drive neste computador.</span>';
    alvo.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { f.pasta.value = x.pastas[b.dataset.i].drive + (x.pastas[b.dataset.i].drive.includes('/') ? '/' : '\\') + 'Rede de Unidades'; });
  };
  if ($('#enviar')) $('#enviar').onclick = async () => { try { await post('/api/rede/enviar'); avisar('Resumo enviado para a pasta da rede.'); telaUnidades(); } catch (e) { avisar(e.message, 'erro'); telaUnidades(); } };
  if ($('#assumir')) $('#assumir').onclick = async () => {
    if (!confirm(`Confirmar que ${r.computador} é o computador desta unidade? O outro computador deixará de valer.`)) return;
    try { await post('/api/rede/assumir'); avisar('Pronto: esta unidade voltou a ser enviada por este computador.'); telaUnidades(); } catch (e) { avisar(e.message, 'erro'); }
  };
  if (configurado) painelSituacao(r); else ligarAssistente(r);
  const carregar = async () => desenharGeral(await get('/api/rede/geral'));
  $('#per').querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
    const t = b.dataset.p; $('#per').querySelectorAll('button').forEach(x => x.classList.toggle('ativa', x === b));
    $('#datas').classList.toggle('escondido', t !== 'outro');
    if (t !== 'outro') { filtroRede = { ...filtroRede, tipo: t, de: P[t][0], ate: P[t][1] }; carregar(); } else filtroRede.tipo = 'outro';
  });
  ['de', 'ate'].forEach(i => $('#' + i).onchange = () => { filtroRede = { ...filtroRede, tipo: 'outro', de: $('#de').value, ate: $('#ate').value }; if (filtroRede.de && filtroRede.ate) carregar(); });
  $('#agrupar').onchange = e => { filtroRede.agrupar = e.target.value; carregar(); };
  await carregar();
}

// ---------- assistente: matriz ou filial ----------
function assistenteRede(r, passo) {
  const semDrive = !r.driveEncontrado ? `<div class="aviso-inline" style="margin:12px 0 0"><b>O Google Drive não foi encontrado neste computador.</b> Antes de continuar, instale o
    <a href="https://www.google.com/intl/pt-BR/drive/download/" target="_blank" rel="noopener">Google Drive para computador</a> e entre com a conta Google ${passo === 'filial' ? 'desta unidade' : 'do negócio'}. Depois volte aqui.</div>` : '';
  if (passo === 'matriz') return `<h2>Criar a rede (este computador é a MATRIZ)</h2>
    <p class="mudo" style="margin-top:-4px">O sistema cria a pasta <b>Rede de Unidades</b> no seu Google Drive e um código que só as suas unidades vão ter.</p>
    <form id="fa"><div class="erro-form escondido"></div><div class="campos"><div><label>Nome desta unidade</label><input name="nome" required value="${esc(r.nome === 'Unidade' ? 'Matriz' : r.nome)}" placeholder="Ex.: Matriz"></div></div>${semDrive}
    <div class="acoes"><button type="button" class="secundario" data-passo="">Voltar</button><button type="submit">Criar a rede</button></div></form>`;
  if (passo === 'filial') return `<h2>Entrar na rede (este computador é uma FILIAL)</h2>
    <ol class="passos" style="margin-top:4px">
      <li><div class="passo-topo"><b>Peça o convite à matriz</b></div>A matriz abre <b>Unidades → Convite para filial</b> e manda pelo WhatsApp. Mande para ela o <b>e-mail Google</b> desta unidade, para ela compartilhar a pasta.</li>
      <li><div class="passo-topo"><b>Aceite a pasta no Google Drive</b></div>Quando chegar o e-mail "compartilhou a pasta Rede de Unidades", abra <a href="https://drive.google.com/drive/shared-with-me" target="_blank" rel="noopener">drive.google.com → Compartilhados comigo</a>, clique com o botão direito na pasta → <b>Organizar</b> → <b>Adicionar atalho</b> → <b>Meu Drive</b>.</li>
      <li><div class="passo-topo"><b>Cole o convite aqui e conecte</b></div>
        <form id="fa"><div class="erro-form escondido"></div><div class="campos">
          <div><label>Nome desta unidade</label><input name="nome" required value="${esc(r.nome === 'Unidade' || r.nome === r.negocio ? '' : r.nome)}" placeholder="Ex.: Filial Centro"></div>
          <div class="campo-largo"><label>Convite ou código da rede</label><textarea name="codigo" rows="3" required placeholder="Cole aqui a mensagem que a matriz mandou (ou só o código, ex.: ABCD-23EF-GH45)"></textarea></div></div>${semDrive}
        <div id="resultado"></div>
        <div class="acoes"><button type="button" class="secundario" data-passo="">Voltar</button><button type="submit">Conectar</button></div></form></li></ol>`;
  return `<h2>Ligar as unidades</h2>
    <p class="mudo" style="margin-top:-4px">Tem mais de um endereço (matriz e filiais)? Ligue os sistemas para ver o lucro de todos num relatório só. Comece pela matriz.</p>
    <div class="opcoes-inicio">
      <button class="secundario opcao-inicio" data-passo="matriz"><b>Este computador é a MATRIZ</b><span>Cria a rede e gera o convite para as filiais.</span></button>
      <button class="secundario opcao-inicio" data-passo="filial"><b>Este computador é uma FILIAL</b><span>Entra na rede usando o convite que a matriz mandou.</span></button>
    </div>`;
}
function ligarAssistente(r) {
  const caixa = $('#assistente');
  caixa.querySelectorAll('[data-passo]').forEach(b => b.onclick = () => { caixa.innerHTML = assistenteRede(r, b.dataset.passo); ligarAssistente(r); });
  const fa = $('#fa');
  if (!fa) return;
  const ehFilial = !!fa.codigo;
  fa.onsubmit = async ev => {
    ev.preventDefault();
    const btn = fa.querySelector('[type=submit]'), errEl = fa.querySelector('.erro-form');
    errEl.classList.add('escondido'); btn.disabled = true; btn.textContent = ehFilial ? 'Procurando a pasta…' : 'Criando…';
    try {
      if (!ehFilial) {
        const x = await post('/api/rede/criar', { nome: fa.nome.value });
        avisar('Rede criada!'); await telaUnidades(); mostrarConvite({ ...r, codigo: x.codigo, nome: fa.nome.value, pasta: x.pasta, papel: 'matriz' }, true);
        return;
      }
      await conectarFilial(fa, false);
    } catch (e) { errEl.textContent = e.message; errEl.classList.remove('escondido'); }
    btn.disabled = false; btn.textContent = ehFilial ? 'Conectar' : 'Criar a rede';
  };
}
async function conectarFilial(fa, forcar) {
  const x = await post('/api/rede/conectar', { nome: fa.nome.value, codigo: fa.codigo.value, forcar, pasta: forcar || undefined });
  const res = $('#resultado');
  if (x.ok) {
    avisar(x.unidades?.length ? `Conectado! Encontrei: ${x.unidades.join(', ')}.` : 'Conectado à pasta da rede.');
    return telaUnidades();
  }
  const msg = {
    nao_achei: x.drive
      ? `<b>Ainda não encontrei a pasta "Rede de Unidades" no Google Drive deste computador.</b><br>Confira: (1) a matriz já compartilhou a pasta com o e-mail Google desta unidade? (2) você fez o passo 2 (Adicionar atalho ao Meu Drive)? Depois disso, espere 1 ou 2 minutos para o Google Drive sincronizar e clique em <b>Conectar</b> de novo.`
      : '<b>O Google Drive para computador não foi encontrado.</b> Instale, entre com a conta Google desta unidade e clique em <b>Conectar</b> de novo.',
    codigo: `<b>Achei a pasta, mas o código não confere com o da matriz.</b><br>Cole de novo o convite exatamente como a matriz mandou (o código tem o formato ABCD-23EF-GH45).`,
    vazia: `<b>Achei a pasta (${esc(x.pasta)}), mas nenhuma outra unidade enviou dados para ela ainda.</b><br>Se a matriz acabou de criar a rede, peça para ela abrir o sistema e clicar em <b>Enviar resumo agora</b>, espere 1 minuto e conecte de novo.
      Cuidado: se foi você quem criou esta pasta, ela <b>não</b> é a da matriz — apague-a e siga o passo 2.
      <div style="margin-top:8px"><button type="button" class="link" id="forcar">Usar esta pasta mesmo assim</button></div>`,
  }[x.motivo];
  res.innerHTML = `<div class="aviso-inline" style="margin:12px 0 0">${msg}</div>`;
  if ($('#forcar')) $('#forcar').onclick = async () => { try { await post('/api/rede/conectar', { nome: fa.nome.value, codigo: fa.codigo.value, forcar: true, pasta: x.pasta }); avisar('Conectado à pasta da rede.'); telaUnidades(); } catch (e) { avisar(e.message, 'erro'); } };
}

// ---------- painel de situação ----------
async function painelSituacao(r) {
  const s = await get('/api/rede/situacao').catch(() => null), caixa = $('#situacao');
  if (!s || !caixa) return;
  const outras = s.unidades.filter(u => u.ok && !u.estaUnidade), ruins = s.unidades.filter(u => !u.ok);
  const esta = s.unidades.find(u => u.ok && u.estaUnidade);
  const linhas = [
    item(s.pastaOk, s.pastaOk ? `Pasta da rede acessível no Google Drive <span class="mudo pequeno">(${esc(r.pasta)})</span>` : `Não consigo acessar a pasta da rede (${esc(r.pasta)}). Confira se o Google Drive está aberto e conectado.`),
    r.conflito ? item(false, 'Este computador parou de enviar o resumo (veja o aviso acima).') : item(!!esta, esta ? `Resumo desta unidade (<b>${esc(r.nome)}</b>) enviado ${quandoFoi(r.ultimoEnvio || esta.gerado_em)}` : 'O resumo desta unidade ainda não foi enviado. Clique em "Enviar resumo agora".', esta ? 'erro' : 'alerta'),
    outras.length
      ? item(true, `<b>Unidades conectadas (${outras.length}):</b> ${outras.map(u => `${esc(u.nome)} <span class="mudo pequeno">(${quandoFoi(u.gerado_em)})</span>${(Date.now() - new Date(u.gerado_em)) / 36e5 > 24 ? ' <span class="etiqueta vencendo" data-st>desatualizada</span>' : ''}`).join(' · ')}`)
      : item(false, r.papel === 'matriz'
        ? 'Nenhuma filial conectada ainda. Mande o <b>convite</b> e compartilhe a pasta com o e-mail Google de cada filial.'
        : 'Nenhuma outra unidade apareceu na pasta. A matriz já compartilhou a pasta com esta unidade? Se você mesmo criou a pasta, ela não é a da matriz: use "Refazer a configuração".', 'alerta'),
    ...(ruins.length ? [item(false, `${ruins.length} arquivo(s) na pasta não abriram: alguma unidade está com o <b>código diferente</b>.`, 'alerta')] : []),
  ];
  caixa.innerHTML = `<h2>Situação da rede</h2>
    <p class="pequeno mudo" style="margin-top:-6px">Este computador: <b>${esc(r.computador)}</b> · ${r.papel === 'matriz' ? 'matriz' : r.papel === 'filial' ? 'filial' : 'unidade'} <b>${esc(r.nome)}</b></p>
    <ul class="lista-check">${linhas.join('')}</ul>
    <div class="acoes" style="justify-content:flex-start;flex-wrap:wrap">
      ${r.codigo ? '<button id="convite">Convite para filial</button>' : ''}
      ${r.windows ? '<button class="secundario" id="abrir-pasta">Abrir a pasta da rede</button>' : ''}
      <button class="secundario" id="reconferir">Conferir de novo</button>
      <button class="link" style="color:var(--perigo)" id="refazer">Refazer a configuração</button></div>`;
  if ($('#convite')) $('#convite').onclick = () => mostrarConvite(r);
  if ($('#abrir-pasta')) $('#abrir-pasta').onclick = () => post('/api/rede/abrir-pasta').then(() => avisar('A pasta foi aberta no computador do sistema.')).catch(e => avisar(e.message, 'erro'));
  $('#reconferir').onclick = () => telaUnidades();
  $('#refazer').onclick = async () => {
    if (!confirm('Desligar a rede neste computador para configurar de novo? Os dados desta unidade não são apagados.')) return;
    await post('/api/rede/desligar'); telaUnidades();
  };
}
function mostrarConvite(r, recemCriada) {
  const texto = `Convite para a rede de unidades${r.negocio ? ' do ' + r.negocio : ''}:\n\n`
    + `1) Instale o sistema Gestão do Estúdio: ${r.download}\n`
    + `2) Instale o Google Drive para computador e entre com a sua conta Google.\n`
    + `3) Me mande o seu e-mail Google para eu compartilhar a pasta "Rede de Unidades".\n`
    + `4) No sistema, abra Unidades > "Este computador é uma FILIAL" e cole esta mensagem.\n\n`
    + `Código da rede: ${r.codigo}`;
  const m = abrirModal(`<h2>${recemCriada ? 'Rede criada! Agora convide as filiais' : 'Convite para filial'}</h2>
    <p>Código da rede: <b style="font-size:20px;letter-spacing:1px">${esc(r.codigo)}</b></p>
    <ol class="passos">
      <li><div class="passo-topo"><b>Mande o convite</b></div>
        <textarea readonly rows="11" style="width:100%;font-size:13px">${esc(texto)}</textarea>
        <div class="acoes" style="justify-content:flex-start;margin-top:6px"><button type="button" id="copiar" class="secundario">Copiar</button>
          <a class="botao" style="background:#1f8a4c" href="https://wa.me/?text=${encodeURIComponent(texto)}" target="_blank" rel="noopener">Enviar pelo WhatsApp</a></div></li>
      <li><div class="passo-topo"><b>Compartilhe a pasta com o e-mail Google da filial</b></div>
        ${r.windows ? 'Clique em <b>Abrir a pasta</b>: o Windows mostra a pasta <b>Rede de Unidades</b> selecionada. Clique nela com o botão direito → <b>Compartilhar</b> (ícone do Google Drive) → digite o e-mail da filial → permissão <b>Editor</b> → <b>Enviar</b>.' : ''}
        Ou pelo site: <a href="https://drive.google.com/drive/my-drive" target="_blank" rel="noopener">drive.google.com</a> → botão direito em <b>Rede de Unidades</b> → <b>Compartilhar</b> → e-mail da filial como <b>Editor</b>.
        ${r.windows ? '<div style="margin-top:6px"><button type="button" class="secundario" id="abrir">Abrir a pasta</button></div>' : ''}</li>
      <li><div class="passo-topo"><b>Confira</b></div>Quando a filial conectar, o nome dela aparece em <b>Situação da rede</b>.</li>
    </ol>
    <div class="acoes"><button data-fechar>Fechar</button></div>`);
  m.querySelector('#copiar').onclick = async () => { try { await navigator.clipboard.writeText(texto); avisar('Convite copiado.'); } catch { m.querySelector('textarea').select(); document.execCommand('copy'); avisar('Convite copiado.'); } };
  if (m.querySelector('#abrir')) m.querySelector('#abrir').onclick = () => post('/api/rede/abrir-pasta').then(() => avisar('A pasta foi aberta no computador do sistema.')).catch(e => avisar(e.message, 'erro'));
}

// aviso no Início (administrador) quando a unidade foi assumida por outro computador
async function avisoRedeInicio() {
  try {
    const r = await get('/api/rede');
    if (!r.conflito) return '';
    return `<div class="aviso-inline" style="margin:0 0 16px"><b>Atenção:</b> esta unidade (${esc(r.nome)}) passou a ser usada no computador <b>${esc(r.conflito.computador || 'outro')}</b>. Se você mudou de computador, use só o novo. <a href="#/unidades">Ver detalhes</a></div>`;
  } catch { return ''; }
}

function desenharGeral(g) {
  const de = filtroRede.de.slice(0, 7), ate = filtroRede.ate.slice(0, 7), ag = filtroRede.agrupar;
  const agora = Date.now();
  const unis = g.unidades.map((u, i) => {
    const meses = (u.meses || []).filter(m => m.periodo >= de && m.periodo <= ate);
    const soma = k => meses.reduce((s, m) => s + Number(m[k] || 0), 0);
    const porPer = {};
    for (const m of meses) { const p = periodoDoMes(m.periodo, ag); porPer[p] = (porPer[p] || 0) + Number(m.lucro); }
    return { nome: u.unidade.nome + (u.estaUnidade ? ' (esta)' : ''), cor: CORES_UNIDADES[i % 8], recebido: soma('recebido'), taxas: soma('taxas'), despesas: soma('despesas'), lucro: soma('lucro'),
      alunos: u.atual?.alunosComPlano ?? 0, estoque: u.atual?.valorEstoque ?? 0, aPagar: u.atual?.despesasAPagar ?? 0, gerado: u.gerado_em, estaUnidade: u.estaUnidade, porPer };
  });
  const tot = unis.reduce((s, u) => ({ recebido: s.recebido + u.recebido, taxas: s.taxas + u.taxas, despesas: s.despesas + u.despesas, lucro: s.lucro + u.lucro, alunos: s.alunos + u.alunos, aPagar: s.aPagar + u.aPagar }),
    { recebido: 0, taxas: 0, despesas: 0, lucro: 0, alunos: 0, aPagar: 0 });
  const periodos = [...new Set(unis.flatMap(u => Object.keys(u.porPer)))].sort();
  const series = unis.map(u => ({ nome: u.nome, cor: u.cor, valores: periodos.map(p => Math.max(0, u.porPer[p] || 0)) }));
  const margem = (l, r) => r > 0 ? pct(Math.round(l / r * 1000) / 10) : '—';
  $('#geral').innerHTML = `
    ${!g.pastaConfigurada || !g.codigoDefinido ? '<div class="info-inline" style="margin:0 0 12px">Por enquanto só aparece esta unidade. Ligue as unidades no quadro acima para ver as outras.</div>' : ''}
    ${g.problemas.map(p => `<div class="aviso-inline" style="margin:0 0 8px">${esc(p)}</div>`).join('')}
    <div class="grade">
      <div class="indicador"><div class="rotulo">Recebido (todas)</div><div class="valor num">${brl(tot.recebido)}</div></div>
      <div class="indicador"><div class="rotulo">Despesas (todas)</div><div class="valor num" style="color:var(--perigo)">${brl(tot.despesas)}</div><div class="pequeno mudo">taxas ${brl(tot.taxas)}</div></div>
      <div class="indicador"><div class="rotulo">Lucro da rede</div><div class="valor num" style="color:${tot.lucro >= 0 ? 'var(--ok)' : 'var(--perigo)'}">${brl(tot.lucro)}</div><div class="pequeno mudo">margem ${margem(tot.lucro, tot.recebido)}</div></div>
      <div class="indicador"><div class="rotulo">Alunos com plano (hoje)</div><div class="valor num">${tot.alunos}</div><div class="pequeno mudo">${unis.length} unidade(s)</div></div>
    </div>
    <div class="tabela-rolagem"><table><thead><tr><th>Unidade</th><th class="direita">Recebido</th><th class="direita">Taxas</th><th class="direita">Despesas</th><th class="direita">Lucro</th><th class="direita">Margem</th><th class="direita">Alunos</th><th class="direita">A pagar</th><th>Atualizado</th></tr></thead><tbody>
      ${unis.map(u => { const horas = (agora - new Date(u.gerado)) / 36e5; return `<tr><td><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${u.cor};margin-right:6px"></span><b>${esc(u.nome)}</b></td>
        <td class="direita num">${brl(u.recebido)}</td><td class="direita num">${brl(u.taxas)}</td><td class="direita num">${brl(u.despesas)}</td>
        <td class="direita num" style="color:${u.lucro >= 0 ? 'var(--ok)' : 'var(--perigo)'}"><b>${brl(u.lucro)}</b></td><td class="direita num">${margem(u.lucro, u.recebido)}</td>
        <td class="direita num">${u.alunos}</td><td class="direita num">${brl(u.aPagar)}</td>
        <td class="pequeno">${u.estaUnidade ? 'agora' : new Date(u.gerado).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}${!u.estaUnidade && horas > 24 ? ' <span class="etiqueta vencendo" data-st>desatualizado</span>' : ''}</td></tr>`; }).join('')}
      <tr><td><b>Total</b></td><td class="direita num"><b>${brl(tot.recebido)}</b></td><td class="direita num">${brl(tot.taxas)}</td><td class="direita num">${brl(tot.despesas)}</td>
        <td class="direita num"><b>${brl(tot.lucro)}</b></td><td class="direita num">${margem(tot.lucro, tot.recebido)}</td><td class="direita num">${tot.alunos}</td><td class="direita num">${brl(tot.aPagar)}</td><td></td></tr>
    </tbody></table></div>
    <h3>Lucro por unidade</h3>
    ${periodos.length ? graficoColunas(periodos, series) : '<div class="vazio">Sem dados no período.</div>'}
    <p class="pequeno mudo" style="margin-bottom:0">Lucro = recebido (planos, vendas e juros) − taxas da maquininha − despesas pagas. Meses com prejuízo aparecem como zero no gráfico e em vermelho na tabela.
      <button class="link" id="exp-rede">Exportar para Excel</button></p>`;
  ligarDicas($('#geral'), periodos, series);
  $('#exp-rede').onclick = () => baixarCSV('relatorio_geral_unidades', ['Unidade', 'Recebido', 'Taxas', 'Despesas', 'Lucro', 'Alunos com plano', 'Despesas a pagar', ...periodos.map(p => 'Lucro ' + nomePeriodo(p))],
    unis.map(u => [u.nome, u.recebido, u.taxas, u.despesas, u.lucro, u.alunos, u.aPagar, ...periodos.map(p => u.porPer[p] || 0)]));
}
