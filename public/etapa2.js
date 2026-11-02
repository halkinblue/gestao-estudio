// Sistema de Gestão do Estúdio — etapa 2: vendas, assinaturas e pagamentos
'use strict';

const somaDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const opcoesClientes = (lista, sel) => `<option value="">Escolha…</option>` + lista.map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.nome)}${c.telefone ? ' — ' + esc(c.telefone) : ''}</option>`).join('');

function taxaParcela(op, n) {
  const t = JSON.parse(op.dataset.taxas || '{}');
  return n > 1 && t[n] != null && t[n] !== '' ? Number(t[n]) : Number(op.dataset.taxa);
}
function camposPagamento(formas, hoje, prefixo = '', semRadios = false) {
  return `
    <div class="radios${semRadios ? ' escondido' : ''}" style="margin-bottom:10px">
      <label><input type="radio" name="${prefixo}receber" value="agora" checked> Pagamento recebido agora</label>
      <label><input type="radio" name="${prefixo}receber" value="depois"> Vai pagar depois (fica pendente)</label>
    </div>
    <div data-pg-campos>
      <div class="campos">
        <div><label>Forma de pagamento</label><select name="${prefixo}forma_pagamento_id">${formas.map(f => `<option value="${f.id}" data-parcela="${f.permite_parcelar}" data-taxa="${f.taxa_percentual}" data-taxas='${esc(JSON.stringify(f.taxas_parcelas || {}))}'>${esc(f.nome)}</option>`).join('')}</select></div>
        <div data-parcelas class="escondido"><label>Parcelas</label><select name="${prefixo}parcelas">${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}x</option>`).join('')}</select></div>
        <div><label>Data do pagamento</label><input type="date" name="${prefixo}data_pagamento" value="${hoje}"></div>
      </div>
      <div data-juros class="escondido" style="margin-top:12px">
        <label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" name="${prefixo}cobrar_juros" style="width:auto" checked> Cobrar juros do parcelamento do cliente</label>
        <div class="campos" data-juros-campos style="margin-top:8px;grid-template-columns:minmax(0,260px)">
          <div><label>Juros (%)</label><input type="number" name="${prefixo}juros_percentual" min="0" max="100" step="0.01">
            <div class="ajuda" data-juros-ajuda></div></div>
        </div>
      </div>
    </div>`;
}
function ligarPagamento(raiz, prefixo = '', aoMudar) {
  const sel = n => raiz.querySelector(`[name="${prefixo}${n}"]`);
  let ultimaChave = null;
  const atualizar = () => {
    const depois = raiz.querySelector(`input[name="${prefixo}receber"]:checked`).value === 'depois';
    raiz.querySelector('[data-pg-campos]').classList.toggle('escondido', depois);
    const op = sel('forma_pagamento_id').selectedOptions[0];
    const parcelavel = !!op && op.dataset.parcela === 'true';
    if (!parcelavel) sel('parcelas').value = '1';
    raiz.querySelector('[data-parcelas]').classList.toggle('escondido', !parcelavel);
    const n = Number(sel('parcelas').value);
    raiz.querySelector('[data-juros]').classList.toggle('escondido', !(parcelavel && n > 1));
    raiz.querySelector('[data-juros-campos]').classList.toggle('escondido', !sel('cobrar_juros').checked);
    // ao trocar forma ou nº de parcelas, sugere os juros = taxa da maquininha para aquele parcelamento
    const chave = `${op?.value}|${n}`;
    if (op && chave !== ultimaChave) {
      ultimaChave = chave;
      const t = taxaParcela(op, n);
      sel('juros_percentual').value = n > 1 ? t : '';
      const cheio = t > 0 && t < 100 ? Math.ceil(t / (1 - t / 100) * 100) / 100 : 0;
      const aj = raiz.querySelector('[data-juros-ajuda]');
      aj.innerHTML = `Taxa da maquininha em ${n}x: ${pct(t)}. Você pode mudar o valor.` +
        (cheio > t ? ` <button type="button" class="link" style="padding:0">Usar ${pct(cheio)} (você recebe o valor cheio)</button>` : '');
      const bt = aj.querySelector('button'); if (bt) bt.onclick = () => { sel('juros_percentual').value = cheio; aoMudar && aoMudar(); };
    }
    if (aoMudar) aoMudar();
  };
  raiz.querySelectorAll(['receber', 'forma_pagamento_id', 'parcelas', 'data_pagamento', 'cobrar_juros'].map(n => `[name="${prefixo}${n}"]`).join(',')).forEach(el => el.addEventListener('change', atualizar));
  sel('juros_percentual').addEventListener('input', () => aoMudar && aoMudar());
  atualizar();
}
function lerPagamento(d, prefixo = '') {
  return { receber: d[prefixo + 'receber'], forma_pagamento_id: d[prefixo + 'forma_pagamento_id'], parcelas: d[prefixo + 'parcelas'], data_pagamento: d[prefixo + 'data_pagamento'],
    cobrar_juros: d[prefixo + 'cobrar_juros'], juros_percentual: d[prefixo + 'juros_percentual'] };
}
// cálculo igual ao do servidor (centavos), para a prévia
function contaPagamento(raiz, total, prefixo = '', partes) {
  const sel = n => raiz.querySelector(`[name="${prefixo}${n}"]`);
  const op = sel('forma_pagamento_id').selectedOptions[0];
  const parc = op && op.dataset.parcela === 'true' ? Number(sel('parcelas').value) : 1;
  const jurosPct = parc > 1 && sel('cobrar_juros').checked ? Number(sel('juros_percentual').value) || 0 : 0;
  const taxaPct = op ? taxaParcela(op, parc) : 0;
  const ps = (partes || [total]).map(v => Math.round(v * 100));
  const juros = ps.reduce((s, v) => s + Math.round(v * jurosPct / 100), 0) / 100;
  const taxa = ps.reduce((s, v) => s + Math.round((v + Math.round(v * jurosPct / 100)) * taxaPct / 100), 0) / 100;
  return { op, parc, jurosPct, taxaPct, juros, taxa, cobrado: total + juros };
}
function textoPagamento(raiz, total, prefixo = '', partes) {
  const depois = raiz.querySelector(`input[name="${prefixo}receber"]:checked`)?.value === 'depois';
  if (depois) return '<span class="mudo">Pendente — aparece em Pagamentos para receber depois.</span>';
  const k = contaPagamento(raiz, total, prefixo, partes);
  if (!k.op) return '';
  let h = `<b>${esc(k.op.textContent)}</b>`;
  if (k.juros > 0) h += `<div class="linha"><span>Juros do parcelamento (${pct(k.jurosPct)})</span><span>+ ${brl(k.juros)}</span></div>
    <div class="linha" style="font-weight:700"><span>Total no cartão</span><span>${brl(k.cobrado)}</span></div>`;
  if (k.parc > 1) h += `<div class="linha"><span>Parcelas</span><span>${k.parc}x de ${brl(k.cobrado / k.parc)}</span></div>`;
  if (k.taxa > 0) h += `<div class="mudo">Taxa da maquininha (${pct(k.taxaPct)}): ${brl(k.taxa)} · você recebe ${brl(k.cobrado - k.taxa)}</div>`;
  return h;
}

// ---------- Nova venda ----------
async function telaVenda(params) {
  const d = await get('/api/venda/dados');
  const recorrentes = d.produtos.filter(p => p.tipo === 'recorrente');
  const avulsos = d.produtos.filter(p => p.tipo === 'avulso' && p.preco_individual != null);
  $('#tela').innerHTML = `
    <div class="topo"><div><h1>Nova venda</h1><p class="mudo">Plano mensal (Garagem, Consultoria, Ritbox…) ou venda avulsa.</p></div></div>
    <div class="abas"><button class="ativa" data-aba="plano">Plano mensal</button><button data-aba="avulsa">Venda avulsa</button></div>
    <div id="aba-plano"></div><div id="aba-avulsa" class="escondido"></div>`;
  $('#tela').querySelectorAll('[data-aba]').forEach(b => b.onclick = () => {
    $('#tela').querySelectorAll('[data-aba]').forEach(x => x.classList.toggle('ativa', x === b));
    $('#aba-plano').classList.toggle('escondido', b.dataset.aba !== 'plano');
    $('#aba-avulsa').classList.toggle('escondido', b.dataset.aba !== 'avulsa');
  });
  formPlano(d, recorrentes, params);
  formAvulsa(d, avulsos, params);
  if (params.get('aba') === 'avulsa') $('[data-aba=avulsa]').click();
}

function formPlano(d, produtos, params) {
  const caixa = $('#aba-plano');
  caixa.innerHTML = `
    <form id="fv" class="venda-grade">
      <div class="cartao" style="margin:0">
        <div class="erro-form escondido"></div>
        <div class="secao-titulo">Cliente e serviço</div>
        <div class="campos">
          <div class="campo-largo"><label>Cliente *</label>
            <div style="display:flex;gap:8px"><select name="cliente_id" required>${opcoesClientes(d.clientes, params.get('cliente'))}</select>
            <button type="button" class="secundario" id="novo-cli" title="Cadastrar cliente" style="white-space:nowrap">+ Novo</button></div></div>
          <div><label>Serviço *</label><select name="produto_id">${produtos.map(p => `<option value="${p.id}" ${p.id === params.get('produto') ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select></div>
          <div><label>Modalidade</label><div class="radios" style="padding-top:8px">
            <label><input type="radio" name="pessoas" value="1" checked> Individual</label>
            <label><input type="radio" name="pessoas" value="2"> Dupla</label></div></div>
          <div class="campo-largo escondido" id="c-parceiro"><label>Segunda pessoa da Dupla *</label><select name="parceiro_id">${opcoesClientes(d.clientes)}</select>
            <div class="ajuda">Cada pessoa fica com sua própria assinatura e paga metade do valor.</div></div>
        </div>
        <div id="atual"></div>
        <div class="secao-titulo">Plano</div>
        <div class="campos">
          <div><label>Plano *</label><select name="plano_id"></select></div>
          <div><label>Início</label><input type="date" name="inicio" value="${d.hoje}" required></div>
        </div>
        <div class="secao-titulo">Desconto na hora (opcional)</div>
        <div class="campos">
          <div><label>Desconto (R$)</label><input type="number" name="desconto_manual" min="0" step="0.01" placeholder="0,00">
            ${d.limiteDesconto < 100 ? `<div class="ajuda">Seu limite: ${pct(d.limiteDesconto)} do valor do plano.</div>` : ''}</div>
          <div><label>Motivo do desconto</label><input name="motivo_desconto" placeholder="Ex.: compra especial, indicação…"></div>
        </div>
        <div class="secao-titulo">Pagamento</div>
        ${camposPagamento(d.formas, d.hoje)}
        <div style="margin-top:12px"><label>Observação</label><input name="observacao" placeholder="Opcional"></div>
      </div>
      <div class="cartao resumo" style="margin:0">
        <h2>Resumo</h2><div id="resumo"><p class="mudo">Escolha o cliente, o serviço e o plano.</p></div>
        <button type="submit" style="width:100%;margin-top:14px">Confirmar venda</button>
      </div>
    </form>`;
  const f = caixa.querySelector('#fv');
  let inicioManual = false, ultimo = null, seq = 0;
  f.inicio.addEventListener('input', () => { inicioManual = true; });

  const preencherPlanos = () => {
    const prod = produtos.find(p => p.id === f.produto_id.value);
    const atual = f.plano_id.value;
    const lista = d.planos.filter(p => !p.produto_id || p.produto_id === f.produto_id.value);
    f.plano_id.innerHTML = lista.map(p => `<option value="${p.id}">${esc(p.nome)} — ${p.meses} ${p.meses > 1 ? 'meses' : 'mês'}${p.valor_fixo != null ? ` (valor fixo ${brl(p.valor_fixo)})` : Number(p.desconto_percentual) ? ` (${pct(p.desconto_percentual)} off)` : ''}</option>`).join('');
    if (lista.some(p => p.id === atual)) f.plano_id.value = atual;
    const temDupla = prod && prod.preco_dupla != null;
    f.querySelector('input[name=pessoas][value="2"]').disabled = !temDupla;
    if (!temDupla) f.querySelector('input[name=pessoas][value="1"]').checked = true;
  };
  const ehDupla = () => f.querySelector('input[name=pessoas]:checked').value === '2';

  const verAtual = async () => {
    const ids = [f.cliente_id.value, ehDupla() ? f.parceiro_id.value : ''].filter(Boolean);
    const alvo = caixa.querySelector('#atual');
    if (!ids.length) { alvo.innerHTML = ''; return; }
    const lista = await get(`/api/venda/atual?clientes=${ids.join(',')}&produto=${f.produto_id.value}`).catch(() => []);
    const vivas = lista.filter(a => a.situacao === 'ativa' || a.situacao === 'pausada');
    if (!vivas.length) { alvo.innerHTML = ''; if (!inicioManual) f.inicio.value = d.hoje; return; }
    const venc = vivas.map(a => a.vencimento).sort().pop();
    alvo.innerHTML = `<div class="info-inline">${vivas.map(a => `<b>${esc(a.nome)}</b> tem ${esc(a.plano)} ${a.pessoas === 2 ? '(Dupla) ' : ''}com vencimento em <b>${data(a.vencimento)}</b>${a.situacao === 'pausada' ? ' (pausada)' : ''}.`).join('<br>')}
      Esta venda será a <b>renovação</b>.
      <div class="atalhos" style="margin-top:6px"><button type="button" class="secundario" data-ini="${venc}">Começar no vencimento (${data(venc)})</button><button type="button" class="secundario" data-ini="${d.hoje}">Começar hoje</button></div></div>`;
    alvo.querySelectorAll('[data-ini]').forEach(b => b.onclick = () => { f.inicio.value = b.dataset.ini; inicioManual = true; simular(); });
    // renovação: por padrão começa no vencimento, se o atraso não passar de 30 dias
    if (!inicioManual) f.inicio.value = venc >= somaDias(d.hoje, -30) ? venc : d.hoje;
    simular();
  };

  let t;
  const simular = () => { clearTimeout(t); t = setTimeout(async () => {
    const meu = ++seq;
    const corpo = { produto_id: f.produto_id.value, plano_id: f.plano_id.value, pessoas: ehDupla() ? 2 : 1, inicio: f.inicio.value,
      desconto_manual: f.desconto_manual.value || 0, motivo_desconto: f.motivo_desconto.value || 'simulação' };
    const alvo = caixa.querySelector('#resumo');
    try {
      const r = await post('/api/vendas/assinatura/simular', corpo); if (meu !== seq) return;
      ultimo = r;
      const nomes = [f.cliente_id.selectedOptions[0]?.value ? f.cliente_id.selectedOptions[0].textContent.split(' — ')[0] : null,
        ehDupla() && f.parceiro_id.value ? f.parceiro_id.selectedOptions[0].textContent.split(' — ')[0] : null];
      alvo.innerHTML = `
        <div class="linha"><span>${esc(r.produto)} · ${r.pessoas === 2 ? 'Dupla' : 'Individual'}</span><span>${brl(r.precoMensal)}/mês</span></div>
        <div class="linha"><span>${esc(r.plano)} (${r.meses} ${r.meses > 1 ? 'meses' : 'mês'})</span><span>${brl(r.valorCheio)}</span></div>
        ${r.descontoPlano > 0 ? `<div class="linha desc"><span>Desconto do plano</span><span>− ${brl(r.descontoPlano)}</span></div>` : ''}
        ${r.descontoManual > 0 ? `<div class="linha desc"><span>Desconto na hora</span><span>− ${brl(r.descontoManual)}</span></div>` : ''}
        <div class="linha total"><span>Total</span><span>${brl(r.total)}</span></div>
        ${r.pessoas === 2 ? r.porPessoa.map((v, i) => `<div class="linha"><span>${esc(nomes[i] || (i ? '2ª pessoa' : '1ª pessoa'))}</span><span>${brl(v)}</span></div>`).join('') : ''}
        <div class="linha"><span>Período</span><span>${data(r.inicio)} a ${data(r.vencimento)}</span></div>
        <div class="pequeno" style="margin-top:8px">${textoPagamento(f, r.total, '', r.porPessoa)}</div>`;
    } catch (e) { if (meu === seq) alvo.innerHTML = `<div class="aviso-inline">${esc(e.message)}</div>`; ultimo = null; }
  }, 200); };

  f.produto_id.addEventListener('change', () => { preencherPlanos(); verAtual(); simular(); });
  f.querySelectorAll('input[name=pessoas]').forEach(r => r.addEventListener('change', () => {
    caixa.querySelector('#c-parceiro').classList.toggle('escondido', !ehDupla()); verAtual(); simular();
  }));
  f.cliente_id.addEventListener('change', verAtual);
  f.parceiro_id.addEventListener('change', () => { verAtual(); simular(); });
  ['plano_id', 'inicio', 'desconto_manual'].forEach(n => f[n].addEventListener('input', simular));
  f.plano_id.addEventListener('change', simular);
  ligarPagamento(f, '', simular);
  caixa.querySelector('#novo-cli').onclick = () => modalCliente(null, async id => {
    const dd = await get('/api/venda/dados'); d.clientes = dd.clientes;
    f.cliente_id.innerHTML = opcoesClientes(d.clientes, id); f.parceiro_id.innerHTML = opcoesClientes(d.clientes, f.parceiro_id.value); verAtual();
  });

  preencherPlanos(); verAtual(); simular();

  aoEnviar(f, async v => {
    if (!v.cliente_id) throw new Error('Escolha o cliente.');
    if (Number(v.desconto_manual) > 0 && !v.motivo_desconto.trim()) throw new Error('Informe o motivo do desconto.');
    const corpo = { ...v, pessoas: ehDupla() ? 2 : 1, pagamento: lerPagamento(v) };
    const r = await post('/api/vendas/assinatura', corpo);
    const m = abrirModal(`<h2>Venda registrada</h2>
      <p>${esc(r.resumo.produto)} · ${esc(r.resumo.plano)} ${r.resumo.pessoas === 2 ? '(Dupla)' : ''}<br>
      Período: <b>${data(r.resumo.inicio)}</b> a <b>${data(r.resumo.vencimento)}</b><br>
      Total: <b>${brl(r.resumo.total)}</b>${r.resumo.pessoas === 2 ? ` (${r.resumo.porPessoa.map(brl).join(' + ')})` : ''}<br>
      ${r.pago ? `Recebido em ${esc(r.forma)}${r.parcelas > 1 ? ` (${r.parcelas}x de ${brl(r.totalCobrado / r.parcelas)})` : ''}.${r.juros > 0 ? `<br>Juros do parcelamento: ${brl(r.juros)} · total no cartão <b>${brl(r.totalCobrado)}</b>.` : ''}` : '<span style="color:var(--alerta)">Pagamento pendente.</span>'}</p>
      <div class="acoes">${(r.pagamentos || []).map((pid, i) => `<button class="secundario" data-recibo="${pid}">Recibo${r.pagamentos.length > 1 ? ' ' + (i + 1) : ''}</button>`).join('')}<button class="secundario" id="ficha">Abrir ficha do cliente</button><button id="outra">Nova venda</button></div>`);
    m.querySelectorAll('[data-recibo]').forEach(b => b.onclick = () => abrirRecibo(b.dataset.recibo));
    m.querySelector('#ficha').onclick = () => { fecharModal(); location.hash = `#/clientes/${v.cliente_id}`; };
    m.querySelector('#outra').onclick = () => { fecharModal(); location.hash = '#/venda?n=' + Date.now(); };
  });
}

function formAvulsa(d, avulsos, params) {
  const caixa = $('#aba-avulsa');
  if (!avulsos.length) {
    caixa.innerHTML = `<div class="cartao"><p>Ainda não há produtos para venda avulsa (luvas, suplementos, roupas, água, aula avulsa…).</p>
      <p class="mudo">${perfilAdmin() ? 'Cadastre em <a href="#/estoque">Estoque</a> → "+ Novo produto".' : 'Peça ao administrador para cadastrar em Estoque.'}</p></div>`;
    return;
  }
  caixa.innerHTML = `
    <form id="fa" class="venda-grade">
      <div class="cartao" style="margin:0">
        <div class="erro-form escondido"></div>
        <div class="secao-titulo">Cliente (opcional)</div>
        <select name="cliente_id"><option value="">Venda sem cliente (balcão)</option>${opcoesClientes(d.clientes, params.get('cliente')).replace('<option value="">Escolha…</option>', '')}</select>
        <div class="secao-titulo">Itens</div>
        <div class="itens-linha pequeno mudo" style="margin-bottom:4px"><span>Produto</span><span>Tamanho / cor</span><span>Qtd.</span><span class="direita">Subtotal</span><span></span></div>
        <div id="itens"></div>
        <button type="button" class="secundario" id="add">+ Adicionar item</button>
        <div class="secao-titulo">Desconto na hora (opcional)</div>
        <div class="campos"><div><label>Desconto (R$)</label><input type="number" name="desconto" min="0" step="0.01" placeholder="0,00"></div>
          <div><label>Motivo do desconto</label><input name="motivo_desconto"></div></div>
        <div class="secao-titulo">Pagamento</div>
        ${camposPagamento(d.formas, d.hoje)}
      </div>
      <div class="cartao resumo" style="margin:0"><h2>Resumo</h2><div id="resumo-av"></div>
        <button type="submit" style="width:100%;margin-top:14px">Confirmar venda</button></div>
    </form>`;
  const f = caixa.querySelector('#fa'), lista = caixa.querySelector('#itens');
  const prod = id => avulsos.find(p => p.id === id);
  const vari = (p, vid) => (p?.variacoes || []).find(v => v.id === vid);
  const precoDe = (p, v) => (v && v.preco != null ? v.preco : p?.preco_individual) || 0;
  const nomeVar = v => v && v.nome !== 'Único' ? ` (${v.nome})` : '';
  const linhas = () => [...lista.querySelectorAll('.itens-linha')].map(l => ({ produto_id: l.querySelector('[data-prod]').value, variacao_id: l.querySelector('[data-var]').value, quantidade: Number(l.querySelector('[data-qtd]').value) || 0 }));
  // confere estoque somando linhas do mesmo item
  const faltas = () => {
    const usado = {}; const r = [];
    for (const it of linhas()) {
      const p = prod(it.produto_id), v = vari(p, it.variacao_id);
      if (!p || !v || !p.controla_estoque) continue;
      usado[v.id] = (usado[v.id] || 0) + it.quantidade;
      if (usado[v.id] > Number(v.estoque) && !r.some(x => x.v.id === v.id)) r.push({ p, v });
    }
    return r;
  };
  const resumir = () => {
    lista.querySelectorAll('.itens-linha').forEach(l => {
      const p = prod(l.querySelector('[data-prod]').value), v = vari(p, l.querySelector('[data-var]').value);
      l.querySelector('[data-sub]').textContent = brl(precoDe(p, v) * (Number(l.querySelector('[data-qtd]').value) || 0));
    });
    const sub = linhas().reduce((s, i) => { const p = prod(i.produto_id); return s + precoDe(p, vari(p, i.variacao_id)) * i.quantidade; }, 0);
    const desc = Math.min(Number(f.desconto.value) || 0, sub);
    const fl = faltas();
    caixa.querySelector('#resumo-av').innerHTML = `
      ${fl.map(({ p, v }) => `<div class="aviso-inline" style="margin:0 0 10px">${Number(v.estoque) <= 0 ? `<b>Não há ${esc(p.nome + nomeVar(v))} em estoque.</b>` : `<b>Só há ${qtdTxt(v.estoque)} de ${esc(p.nome + nomeVar(v))} em estoque.</b>`}
        Registre a entrada da mercadoria para poder vender.<div style="margin-top:6px"><button type="button" class="secundario" data-entrada="${v.id}" data-nome="${esc(p.nome + ' — ' + v.nome)}">Registrar entrada</button></div></div>`).join('')}
      <div class="linha"><span>Subtotal</span><span>${brl(sub)}</span></div>
      ${desc > 0 ? `<div class="linha desc"><span>Desconto</span><span>− ${brl(desc)}</span></div>` : ''}
      <div class="linha total"><span>Total</span><span>${brl(sub - desc)}</span></div><div class="pequeno" style="margin-top:8px">${textoPagamento(f, sub - desc)}</div>`;
    caixa.querySelectorAll('#resumo-av [data-entrada]').forEach(b => b.onclick = () => modalEntrada(b.dataset.entrada, b.dataset.nome, r => {
      for (const p of avulsos) for (const v of p.variacoes || []) if (v.id === b.dataset.entrada) v.estoque = r.estoque;
      lista.querySelectorAll('.itens-linha').forEach(preencherVar); resumir();
    }));
    f.querySelector('button[type=submit]').disabled = fl.length > 0;
  };
  const textoVar = (p, v) => `${esc(v.nome)}${p.controla_estoque ? (Number(v.estoque) > 0 ? ` — ${qtdTxt(v.estoque)} em estoque` : ' — SEM ESTOQUE') : ''}`;
  const preencherVar = l => {
    const p = prod(l.querySelector('[data-prod]').value), sel = l.querySelector('[data-var]'), atual = sel.value;
    const vs = p?.variacoes || [];
    sel.innerHTML = vs.map(v => `<option value="${v.id}">${textoVar(p, v)}</option>`).join('');
    if (vs.some(v => v.id === atual)) sel.value = atual;
    else { const comEstoque = vs.find(v => !p.controla_estoque || Number(v.estoque) > 0); if (comEstoque) sel.value = comEstoque.id; }
    sel.classList.toggle('escondido', vs.length <= 1 && vs[0]?.nome === 'Único' && !p.controla_estoque);
  };
  const addLinha = () => {
    const l = document.createElement('div'); l.className = 'itens-linha';
    let grupo = null, ops = '';
    for (const p of avulsos) {
      if (p.categoria !== grupo) { if (grupo !== null || ops) ops += '</optgroup>'; grupo = p.categoria; ops += `<optgroup label="${esc(grupo || 'Sem categoria')}">`; }
      ops += `<option value="${p.id}">${esc(p.nome)} — ${brl(p.preco_individual)}</option>`;
    }
    ops += '</optgroup>';
    l.innerHTML = `<select data-prod>${ops}</select><select data-var></select>
      <input data-qtd type="number" min="1" step="1" value="1" title="Quantidade"><span class="direita num" data-sub></span><button type="button" class="link" title="Remover">✕</button>`;
    l.querySelector('button').onclick = () => { if (lista.children.length > 1) { l.remove(); resumir(); } };
    l.querySelector('[data-prod]').addEventListener('change', () => preencherVar(l));
    l.addEventListener('input', resumir); l.addEventListener('change', resumir);
    lista.appendChild(l); preencherVar(l); resumir();
  };
  caixa.querySelector('#add').onclick = addLinha;
  f.desconto.addEventListener('input', resumir);
  ligarPagamento(f, '', resumir);
  addLinha();
  aoEnviar(f, async v => {
    if (faltas().length) throw new Error('Há itens sem estoque suficiente. Registre a entrada da mercadoria.');
    const r = await post('/api/vendas/avulsa', { cliente_id: v.cliente_id, itens: linhas(), desconto: v.desconto || 0, motivo_desconto: v.motivo_desconto, pagamento: lerPagamento(v) });
    const m = abrirModal(`<h2>Venda registrada</h2><p>Total: <b>${brl(r.total)}</b>${r.desconto > 0 ? ` (desconto de ${brl(r.desconto)})` : ''}. ${r.pago ? `Pagamento recebido${r.juros > 0 ? ` (juros ${brl(r.juros)}, total no cartão ${brl(r.totalCobrado)} em ${r.parcelas}x)` : ''}.` : '<span style="color:var(--alerta)">Pagamento pendente.</span>'}</p>
      <div class="acoes">${r.pagamento ? `<button class="secundario" id="recibo-av">Recibo</button>` : ''}<button id="outra">Nova venda</button></div>`);
    if (r.pagamento) m.querySelector('#recibo-av').onclick = () => abrirRecibo(r.pagamento);
    m.querySelector('#outra').onclick = () => { fecharModal(); location.hash = '#/venda?aba=avulsa&n=' + Date.now(); };
  });
}

// ---------- Receber pagamento pendente ----------
async function modalReceber(id, valor, depois) {
  const formas = (await get('/api/formas-pagamento')).filter(f => f.ativa);
  const hoje = (await get('/api/venda/dados')).hoje;
  const m = abrirModal(`<h2>Receber pagamento — ${brl(valor)}</h2>
    <form id="fr"><div class="erro-form escondido"></div>
      ${camposPagamento(formas, hoje, '', true)}
      <div class="pequeno" id="txt" style="margin-top:10px"></div>
      <div class="acoes"><button type="button" class="secundario" data-fechar>Cancelar</button><button type="submit">Confirmar recebimento</button></div>
    </form>`);
  const f = m.querySelector('#fr');
  ligarPagamento(f, '', () => { m.querySelector('#txt').innerHTML = textoPagamento(f, valor); });
  aoEnviar(f, async v => { await post(`/api/pagamentos/${id}/receber`, lerPagamento(v)); fecharModal(); avisar('Pagamento recebido.'); depois(); });
}

function modalMotivo(titulo, texto, rotulo, acao, depois) {
  const m = abrirModal(`<h2>${esc(titulo)}</h2><p class="mudo">${texto}</p>
    <form id="fm"><div class="erro-form escondido"></div><label>${esc(rotulo)}</label><input name="motivo" required>
      <div class="acoes"><button type="button" class="secundario" data-fechar>Voltar</button><button type="submit">Confirmar</button></div></form>`);
  aoEnviar(m.querySelector('#fm'), async v => { await acao(v.motivo); fecharModal(); avisar('Feito.'); depois(); });
}

// ---------- Assinaturas ----------
let filtroAss = { busca: '', produto: '', status: '' };
async function telaAssinaturas() {
  const produtos = (await get('/api/produtos')).filter(p => p.tipo === 'recorrente');
  const adm = perfilAdmin();
  $('#tela').innerHTML = `
    <div class="topo"><div><h1>Assinaturas</h1><p class="mudo">Situação atual de cada cliente em cada serviço.</p></div><a class="botao" href="#/venda">+ Nova venda</a></div>
    <div class="cartao">
      <div class="linha-filtros"><input id="busca" placeholder="Buscar cliente" value="${esc(filtroAss.busca)}">
        <select id="prod"><option value="">Todos os serviços</option>${produtos.map(p => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}</select></div>
      <div class="atalhos" id="status" style="margin-bottom:12px">${[['', 'Todas'], ['em dia', 'Em dia'], ['vencendo', 'Vencendo'], ['em atraso', 'Em atraso'], ['pausada', 'Pausadas'], ['cancelada', 'Canceladas']]
        .map(([v, n]) => `<button type="button" class="secundario ${filtroAss.status === v ? 'ativa' : ''}" data-st="${v}">${n}</button>`).join('')}</div>
      <div id="lista"></div>
    </div>`;
  $('#prod').value = filtroAss.produto;
  const carregar = async () => {
    const l = await get(`/api/assinaturas?busca=${encodeURIComponent(filtroAss.busca)}&produto=${filtroAss.produto}&status=${encodeURIComponent(filtroAss.status)}`);
    const total = l.filter(a => !['cancelada', 'pausada'].includes(a.status));
    $('#lista').innerHTML = l.length ? `<div class="pequeno mudo" style="margin-bottom:6px">${l.length} assinatura(s)</div><div class="tabela-rolagem"><table>
      <thead><tr><th>Cliente</th><th>Serviço</th><th>Plano</th><th>Vencimento</th><th class="direita">Valor</th><th>Situação</th><th></th></tr></thead><tbody>
      ${l.map(a => `<tr><td><a href="#/clientes/${a.cliente_id}">${esc(a.cliente)}</a>${a.pendentes ? ` <span class="etiqueta vencendo" title="Pagamento pendente">pendente</span>` : ''}</td>
        <td>${esc(a.produto)}${a.pessoas === 2 ? ` <span class="etiqueta">Dupla${a.parceira ? ' com ' + esc(a.parceira) : ''}</span>` : ''}</td><td>${esc(a.plano)}</td>
        <td class="num">${data(a.vencimento)}${a.status === 'pausada' ? `<div class="pequeno mudo">pausada em ${data(a.pausada_em)}</div>` : ''}</td>
        <td class="direita num">${brl(a.valor_final)}</td><td>${etiqueta(a.status)}</td>
        <td class="direita" style="white-space:nowrap">
          ${a.status !== 'cancelada' ? `<a class="botao-link" href="#/venda?cliente=${a.cliente_id}&produto=${a.produto_id}">Renovar</a>` : ''}
          ${adm && a.situacao === 'ativa' ? `<button class="link" data-pausar="${a.id}">Pausar</button>` : ''}
          ${adm && a.situacao === 'pausada' ? `<button class="link" data-reativar="${a.id}">Reativar</button>` : ''}
          ${adm && a.situacao !== 'cancelada' && a.situacao !== 'encerrada' ? `<button class="link" style="color:var(--perigo)" data-cancelar="${a.id}" data-nome="${esc(a.cliente)}">Cancelar</button>` : ''}
        </td></tr>`).join('')}
      </tbody></table></div>` : '<div class="vazio">Nenhuma assinatura encontrada.</div>';
    $('#lista').querySelectorAll('[data-pausar]').forEach(b => b.onclick = () => modalMotivo('Pausar assinatura', 'Enquanto estiver pausada, o vencimento fica congelado. Ao reativar, os dias pausados são somados ao vencimento.', 'Motivo (ex.: viagem, lesão)',
      m => post(`/api/assinaturas/${b.dataset.pausar}/pausar`, { motivo: m }), carregar));
    $('#lista').querySelectorAll('[data-reativar]').forEach(b => b.onclick = async () => {
      try { const r = await post(`/api/assinaturas/${b.dataset.reativar}/reativar`); avisar(`Reativada. Novo vencimento: ${data(r.vencimento)}.`); carregar(); } catch (e) { avisar(e.message, 'erro'); }
    });
    $('#lista').querySelectorAll('[data-cancelar]').forEach(b => b.onclick = () => modalMotivo(`Cancelar assinatura de ${b.dataset.nome}`, 'A assinatura fica como cancelada (nada é apagado). Pagamentos pendentes dela também são cancelados.', 'Motivo do cancelamento',
      m => post(`/api/assinaturas/${b.dataset.cancelar}/cancelar`, { motivo: m }), carregar));
  };
  let t; $('#busca').oninput = e => { filtroAss.busca = e.target.value; clearTimeout(t); t = setTimeout(carregar, 250); };
  $('#prod').onchange = e => { filtroAss.produto = e.target.value; carregar(); };
  $('#status').querySelectorAll('[data-st]').forEach(b => b.onclick = () => {
    filtroAss.status = b.dataset.st; $('#status').querySelectorAll('button').forEach(x => x.classList.toggle('ativa', x === b)); carregar();
  });
  await carregar();
}

// ---------- Pagamentos ----------
let periodoPg = null;
function periodos(hoje) {
  const [a, m] = hoje.split('-').map(Number);
  const ini = (y, mm) => `${y}-${String(mm).padStart(2, '0')}-01`;
  const fim = (y, mm) => new Date(Date.UTC(y, mm, 0)).toISOString().slice(0, 10);
  const pa = m === 1 ? [a - 1, 12] : [a, m - 1];
  return { hoje: [hoje, hoje], mes: [ini(a, m), fim(a, m)], anterior: [ini(...pa), fim(...pa)] };
}
async function telaPagamentos() {
  const hoje = (await get('/api/venda/dados')).hoje;
  const P = periodos(hoje);
  periodoPg = periodoPg || { tipo: 'mes', de: P.mes[0], ate: P.mes[1] };
  const adm = perfilAdmin();
  $('#tela').innerHTML = `
    <div class="topo"><div><h1>Pagamentos</h1><p class="mudo">Recebimentos, pendências e fechamento de caixa por forma de pagamento.</p></div></div>
    <div class="cartao">
      <div class="linha-filtros" style="align-items:center">
        <div class="atalhos" id="per">${[['hoje', 'Hoje'], ['mes', 'Este mês'], ['anterior', 'Mês passado'], ['outro', 'Outro período']].map(([v, n]) => `<button type="button" class="secundario ${periodoPg.tipo === v ? 'ativa' : ''}" data-p="${v}">${n}</button>`).join('')}</div>
        <span id="datas" class="${periodoPg.tipo === 'outro' ? '' : 'escondido'}" style="display:flex;gap:6px;align-items:center"><input type="date" id="de" value="${periodoPg.de}" style="width:auto"> a <input type="date" id="ate" value="${periodoPg.ate}" style="width:auto"></span>
      </div>
      <div id="corpo"></div>
    </div>
    <div id="pendentes"></div>
    <div id="recebidos"></div>
    ${adm ? '<div id="formas"></div>' : ''}`;
  const carregar = async () => {
    const r = await get(`/api/pagamentos?de=${periodoPg.de}&ate=${periodoPg.ate}`);
    const tot = r.porForma.reduce((s, x) => ({ bruto: s.bruto + x.bruto, taxas: s.taxas + x.taxas, liq: s.liq + x.liquido, qtd: s.qtd + x.qtd }), { bruto: 0, taxas: 0, liq: 0, qtd: 0 });
    $('#corpo').innerHTML = `
      <p class="pequeno mudo" style="margin-top:0">Período: ${data(periodoPg.de)} a ${data(periodoPg.ate)}${r.soMeus ? ' · mostrando só os pagamentos que você recebeu' : ''}</p>
      <div class="grade" style="margin-bottom:12px">
        <div class="indicador"><div class="rotulo">Recebido (bruto)</div><div class="valor num">${brl(tot.bruto)}</div><div class="pequeno mudo">${tot.qtd} pagamento(s)</div></div>
        <div class="indicador"><div class="rotulo">Taxas da maquininha</div><div class="valor num" style="color:var(--perigo)">${brl(tot.taxas)}</div></div>
        <div class="indicador"><div class="rotulo">Líquido</div><div class="valor num" style="color:var(--ok)">${brl(tot.liq)}</div></div>
      </div>
      <h2>Fechamento por forma de pagamento</h2>
      ${r.porForma.length ? `<div class="tabela-rolagem"><table><thead><tr><th>Forma</th><th class="direita">Qtd.</th><th class="direita">Bruto</th><th class="direita">Juros cobrados</th><th class="direita">Taxas</th><th class="direita">Líquido</th></tr></thead><tbody>
        ${r.porForma.map(x => `<tr><td>${esc(x.forma)}</td><td class="direita num">${x.qtd}</td><td class="direita num">${brl(x.bruto)}</td><td class="direita num">${x.juros > 0 ? brl(x.juros) : '—'}</td><td class="direita num">${brl(x.taxas)}</td><td class="direita num"><b>${brl(x.liquido)}</b></td></tr>`).join('')}
        </tbody></table></div>` : '<div class="vazio">Nenhum recebimento no período.</div>'}`;
    $('#pendentes').innerHTML = `<div class="cartao"><h2>Pendentes (${r.pendentes.length})</h2>
      ${r.pendentes.length ? `<div class="tabela-rolagem"><table><thead><tr><th>Vencimento</th><th>Cliente</th><th>Serviço</th><th class="direita">Valor</th><th></th></tr></thead><tbody>
        ${r.pendentes.map(p => `<tr><td class="num">${data(p.vencimento)}${p.vencimento < hoje ? ' <span class="etiqueta em-atraso">atrasado</span>' : ''}</td>
          <td>${p.cliente_id ? `<a href="#/clientes/${p.cliente_id}">${esc(p.cliente)}</a>` : esc(p.cliente)}</td><td>${esc(p.produto)}</td><td class="direita num">${brl(p.valor)}</td>
          <td class="direita" style="white-space:nowrap"><button class="link" data-receber="${p.id}" data-valor="${p.valor}">Receber</button>
          ${adm ? `<button class="link" style="color:var(--perigo)" data-cancelar="${p.id}">Cancelar</button>` : ''}</td></tr>`).join('')}
        </tbody></table></div>` : '<div class="vazio">Nenhum pagamento pendente.</div>'}</div>`;
    $('#recebidos').innerHTML = `<div class="cartao"><h2>Recebidos no período</h2>
      ${r.recebidos.length ? `<div class="tabela-rolagem"><table><thead><tr><th>Data</th><th>Cliente</th><th>Serviço</th><th>Forma</th><th class="direita">Valor</th><th>Recebido por</th><th></th></tr></thead><tbody>
        ${r.recebidos.map(p => `<tr class="${p.situacao === 'cancelado' ? 'inativo' : ''}"><td class="num">${data(p.data_pagamento || p.vencimento)}</td>
          <td>${p.cliente_id ? `<a href="#/clientes/${p.cliente_id}">${esc(p.cliente)}</a>` : esc(p.cliente)}</td><td>${esc(p.produto)}</td>
          <td>${esc(p.forma || '—')}${p.total_parcelas > 1 ? ` ${p.total_parcelas}x` : ''}</td>
          <td class="direita num">${p.situacao === 'cancelado' ? `<s>${brl(p.valor + p.juros)}</s>` : brl(p.valor + p.juros)}${p.juros > 0 ? `<div class="pequeno mudo">inclui juros ${brl(p.juros)}</div>` : ''}${p.taxa > 0 ? `<div class="pequeno mudo">taxa ${brl(p.taxa)}</div>` : ''}</td>
          <td class="pequeno">${esc(p.recebido_por || '—')}</td>
          <td class="direita" style="white-space:nowrap">${p.situacao === 'pago' ? `<button class="link" data-recibo="${p.id}">Recibo</button>` : ''}${p.situacao === 'cancelado' ? `<span class="etiqueta" title="${esc(p.motivo_cancelamento)}">cancelado</span>` : adm ? (p.venda_id ? `<button class="link" style="color:var(--perigo)" data-cancelar-venda="${p.venda_id}">Cancelar venda</button>` : `<button class="link" style="color:var(--perigo)" data-cancelar="${p.id}">Cancelar</button>`) : ''}</td></tr>`).join('')}
        </tbody></table></div>` : '<div class="vazio">Nenhum pagamento no período.</div>'}</div>`;
    document.querySelectorAll('#pendentes [data-receber]').forEach(b => b.onclick = () => modalReceber(b.dataset.receber, Number(b.dataset.valor), carregar));
    document.querySelectorAll('#recebidos [data-recibo]').forEach(b => b.onclick = () => abrirRecibo(b.dataset.recibo));
    document.querySelectorAll('#pendentes [data-cancelar], #recebidos [data-cancelar]').forEach(b => b.onclick = () => modalMotivo('Cancelar pagamento', 'O pagamento fica marcado como cancelado (não é apagado) e sai dos totais.', 'Motivo (ex.: lançado errado, estorno)',
      m => post(`/api/pagamentos/${b.dataset.cancelar}/cancelar`, { motivo: m }), carregar));
    document.querySelectorAll('#recebidos [data-cancelar-venda]').forEach(b => b.onclick = () => modalMotivo('Cancelar venda avulsa', 'A venda e o pagamento ficam como cancelados e os itens voltam para o estoque.', 'Motivo (ex.: troca, devolução, lançado errado)',
      m => post(`/api/vendas/${b.dataset.cancelarVenda}/cancelar`, { motivo: m }), carregar));
  };
  $('#per').querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
    const t = b.dataset.p; $('#per').querySelectorAll('button').forEach(x => x.classList.toggle('ativa', x === b));
    $('#datas').classList.toggle('escondido', t !== 'outro');
    periodoPg = t === 'outro' ? { tipo: t, de: $('#de').value, ate: $('#ate').value } : { tipo: t, de: P[t][0], ate: P[t][1] };
    $('#de').value = periodoPg.de; $('#ate').value = periodoPg.ate; carregar();
  });
  ['de', 'ate'].forEach(i => $('#' + i).onchange = () => { periodoPg = { tipo: 'outro', de: $('#de').value, ate: $('#ate').value }; if (periodoPg.de && periodoPg.ate) carregar(); });
  await carregar();
  if (adm) await cartaoFormas();
}

async function cartaoFormas() {
  const formas = await get('/api/formas-pagamento');
  $('#formas').innerHTML = `<div class="cartao"><h2>Formas de pagamento e taxas</h2>
    <p class="pequeno mudo" style="margin-top:-6px">A taxa é a porcentagem que a maquininha cobra; ela é descontada para mostrar o valor líquido.</p>
    <div class="tabela-rolagem"><table><thead><tr><th>Forma</th><th style="width:140px">Taxa (%)</th><th>Parcelar</th><th>Ativa</th><th></th></tr></thead><tbody>
    ${formas.map(f => `<tr data-id="${f.id}"><td>${esc(f.nome)}</td><td><input type="number" step="0.01" min="0" max="100" value="${f.taxa_percentual}" data-taxa></td>
      <td><input type="checkbox" style="width:auto" data-parc ${f.permite_parcelar ? 'checked' : ''}></td><td><input type="checkbox" style="width:auto" data-ativa ${f.ativa ? 'checked' : ''}></td>
      <td class="direita" style="white-space:nowrap">${f.permite_parcelar ? `<button class="link" data-tabela="${f.id}">Taxas por parcela</button>` : ''}<button class="link" data-salvar>Salvar</button></td></tr>`).join('')}
    </tbody></table></div>
    <form id="nova-forma" class="linha-filtros" style="margin-top:12px"><input name="nome" placeholder="Nova forma (ex.: Crédito - outra maquininha)" required>
      <input name="taxa_percentual" type="number" step="0.01" min="0" placeholder="Taxa %" style="flex:0 0 110px"><button type="submit" class="secundario">Adicionar</button></form></div>`;
  $('#formas').querySelectorAll('[data-salvar]').forEach(b => b.onclick = async () => {
    const tr = b.closest('tr');
    try { await put(`/api/formas-pagamento/${tr.dataset.id}`, { taxa_percentual: tr.querySelector('[data-taxa]').value, permite_parcelar: tr.querySelector('[data-parc]').checked, ativa: tr.querySelector('[data-ativa]').checked }); avisar('Forma de pagamento salva.'); }
    catch (e) { avisar(e.message, 'erro'); }
  });
  aoEnviar($('#nova-forma'), async v => { await post('/api/formas-pagamento', v); avisar('Forma adicionada.'); cartaoFormas(); });
  $('#formas').querySelectorAll('[data-tabela]').forEach(b => b.onclick = () => {
    const f = formas.find(x => x.id === b.dataset.tabela), t = f.taxas_parcelas || {};
    const m = abrirModal(`<h2>Taxas por parcela — ${esc(f.nome)}</h2>
      <p class="pequeno mudo">Copie da tabela da sua maquininha a taxa (%) de cada parcelamento. Na venda, o sistema sugere essa porcentagem como juros para o cliente (dá para mudar na hora). À vista (1x) usa a taxa da tabela anterior: ${pct(f.taxa_percentual)}.</p>
      <form id="ft"><div class="erro-form escondido"></div>
        <div class="campos" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr))">
          ${Array.from({ length: 11 }, (_, i) => i + 2).map(n => `<div><label>${n}x (%)</label><input type="number" step="0.01" min="0" max="100" name="t${n}" value="${t[n] ?? ''}" placeholder="${f.taxa_percentual}"></div>`).join('')}
        </div>
        <div class="acoes"><button type="button" class="secundario" data-fechar>Cancelar</button><button type="submit">Salvar taxas</button></div></form>`);
    aoEnviar(m.querySelector('#ft'), async v => {
      const taxas = {}; for (let n = 2; n <= 12; n++) taxas[n] = v['t' + n];
      await put(`/api/formas-pagamento/${f.id}`, { taxas_parcelas: taxas }); fecharModal(); avisar('Taxas salvas.'); cartaoFormas();
    });
  });
}
