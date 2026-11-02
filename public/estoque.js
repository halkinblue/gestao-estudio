// Sistema de Gestão do Estúdio — estoque (produtos avulsos: luvas, suplementos, roupas…)
'use strict';

const qtdTxt = n => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
function classeEstoque(v, controla) {
  if (!controla) return '';
  if (Number(v.estoque) <= 0) return 'em-atraso';
  if (Number(v.estoque) <= Number(v.estoque_minimo)) return 'vencendo';
  return 'em-dia';
}

let filtroEstoque = { busca: '', categoria: '', so: '' };
async function telaEstoque() {
  const [produtos, categorias] = await Promise.all([get('/api/estoque'), get('/api/categorias')]);
  const adm = perfilAdmin();
  $('#tela').innerHTML = `
    <div class="topo"><div><h1>Estoque</h1><p class="mudo">Produtos vendidos avulsos: acessórios, suplementos, roupas… Cada tamanho/cor tem seu próprio estoque.</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="secundario" id="movs">Movimentações</button>
        ${adm ? '<button class="secundario" id="cats">Categorias</button><button id="novo">+ Novo produto</button>' : ''}
      </div></div>
    <div class="cartao">
      <div class="linha-filtros"><input id="busca" placeholder="Buscar produto" value="${esc(filtroEstoque.busca)}">
        <select id="cat"><option value="">Todas as categorias</option>${categorias.filter(c => c.ativa).map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('')}</select>
        <select id="so"><option value="">Todos</option><option value="baixo">Acabando ou sem estoque</option></select></div>
      <div id="lista"></div>
    </div>`;
  $('#cat').value = filtroEstoque.categoria; $('#so').value = filtroEstoque.so;
  const desenhar = () => {
    const b = filtroEstoque.busca.toLowerCase();
    const lista = produtos.filter(p => (!b || p.nome.toLowerCase().includes(b)) && (!filtroEstoque.categoria || p.categoria_id === filtroEstoque.categoria)
      && (!filtroEstoque.so || (p.controla_estoque && p.variacoes.some(v => v.ativa && Number(v.estoque) <= Number(v.estoque_minimo)))));
    $('#lista').innerHTML = lista.length ? lista.map(p => `
      <div class="cartao" style="box-shadow:none;margin-bottom:12px${p.ativo ? '' : ';opacity:.6'}">
        <div class="ficha-topo">
          <div><b style="font-size:16px">${esc(p.nome)}</b> ${p.categoria ? `<span class="etiqueta">${esc(p.categoria)}</span>` : ''} ${p.ativo ? '' : '<span class="etiqueta">inativo</span>'}
            <div class="pequeno mudo">Preço ${brl(p.preco)}${p.controla_estoque ? '' : ' · <b>sem controle de estoque</b> (vende sem contar unidades)'}</div></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">${adm ? `<button class="link" data-addvar="${p.id}">+ Tamanho/cor</button><button class="link" data-editprod="${p.id}">Editar produto</button>` : ''}</div>
        </div>
        <div class="tabela-rolagem" style="margin-top:8px"><table>
          <thead><tr><th>Variação</th><th class="direita">Em estoque</th><th class="direita">Mínimo</th><th class="direita">Custo</th><th class="direita">Preço</th><th></th></tr></thead><tbody>
          ${p.variacoes.map(v => `<tr class="${v.ativa ? '' : 'inativo'}"><td>${esc(v.nome)}${v.ativa ? '' : ' <span class="etiqueta">inativa</span>'}</td>
            <td class="direita num">${p.controla_estoque ? `<span class="etiqueta ${classeEstoque(v, true)}">${qtdTxt(v.estoque)}</span>` : '<span class="mudo">—</span>'}</td>
            <td class="direita num">${p.controla_estoque ? qtdTxt(v.estoque_minimo) : '—'}</td>
            <td class="direita num">${v.custo != null ? brl(v.custo) : '—'}</td>
            <td class="direita num">${brl(v.preco ?? p.preco)}${v.preco != null ? ' <span class="pequeno mudo">próprio</span>' : ''}</td>
            <td class="direita" style="white-space:nowrap">
              <button class="link" data-entrada="${v.id}" data-nome="${esc(p.nome + ' — ' + v.nome)}">+ Entrada</button>
              ${adm && p.controla_estoque ? `<button class="link" data-ajuste="${v.id}" data-nome="${esc(p.nome + ' — ' + v.nome)}" data-atual="${v.estoque}">Ajustar</button>` : ''}
              ${adm ? `<button class="link" data-editvar="${v.id}" data-prod="${p.id}">Editar</button>` : ''}</td></tr>`).join('')}
          </tbody></table></div>
      </div>`).join('') : `<div class="vazio">${produtos.length ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado. Clique em "+ Novo produto".'}</div>`;
    const porId = Object.fromEntries(produtos.map(p => [p.id, p]));
    $('#lista').querySelectorAll('[data-entrada]').forEach(b => b.onclick = () => modalEntrada(b.dataset.entrada, b.dataset.nome, telaEstoque));
    $('#lista').querySelectorAll('[data-ajuste]').forEach(b => b.onclick = () => modalAjuste(b.dataset.ajuste, b.dataset.nome, b.dataset.atual));
    $('#lista').querySelectorAll('[data-addvar]').forEach(b => b.onclick = () => modalVariacao(porId[b.dataset.addvar], null));
    $('#lista').querySelectorAll('[data-editvar]').forEach(b => b.onclick = () => modalVariacao(porId[b.dataset.prod], porId[b.dataset.prod].variacoes.find(v => v.id === b.dataset.editvar)));
    $('#lista').querySelectorAll('[data-editprod]').forEach(b => b.onclick = () => modalProdutoEstoque(porId[b.dataset.editprod], categorias));
  };
  let t; $('#busca').oninput = e => { filtroEstoque.busca = e.target.value; clearTimeout(t); t = setTimeout(desenhar, 150); };
  $('#cat').onchange = e => { filtroEstoque.categoria = e.target.value; desenhar(); };
  $('#so').onchange = e => { filtroEstoque.so = e.target.value; desenhar(); };
  $('#movs').onclick = () => modalMovimentos();
  if (adm) { $('#novo').onclick = () => modalProdutoEstoque(null, categorias); $('#cats').onclick = () => modalCategorias(categorias); }
  desenhar();
}

function modalEntrada(variacaoId, nome, depois) {
  const m = abrirModal(`<h2>Entrada de mercadoria</h2><p><b>${esc(nome)}</b></p>
    <form id="fe"><div class="erro-form escondido"></div>
      <div class="campos">
        <div><label>Quantidade que chegou *</label><input name="quantidade" type="number" min="1" step="1" required></div>
        <div><label>Custo por unidade (R$)</label><input name="custo_unitario" type="number" min="0" step="0.01"><div class="ajuda">Quanto o estúdio pagou em cada um. Serve para o relatório de lucro.</div></div>
        <div class="campo-largo"><label>Observação</label><input name="motivo" placeholder="Ex.: fornecedor, nota fiscal"></div>
        <div class="campo-largo"><label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" name="lancar_despesa" style="width:auto" checked> Lançar a compra em Despesas (categoria "Compra de mercadoria"), se o custo for informado</label></div>
      </div>
      <div class="acoes"><button type="button" class="secundario" data-fechar>Cancelar</button><button type="submit">Registrar entrada</button></div></form>`);
  aoEnviar(m.querySelector('#fe'), async v => {
    const r = await post('/api/estoque/entrada', { ...v, variacao_id: variacaoId });
    fecharModal(); avisar(`Entrada registrada. Estoque agora: ${qtdTxt(r.estoque)}.`); depois(r);
  });
}

function modalAjuste(variacaoId, nome, atual) {
  const m = abrirModal(`<h2>Ajustar estoque</h2><p><b>${esc(nome)}</b> · no sistema: ${qtdTxt(atual)}</p>
    <form id="fj"><div class="erro-form escondido"></div>
      <div class="campos">
        <div><label>Quantidade correta *</label><input name="nova_quantidade" type="number" min="0" step="1" required value="${esc(atual)}"></div>
        <div><label>Motivo *</label><select name="motivo"><option>Contagem do estoque</option><option>Perda / avaria</option><option>Brinde</option><option>Uso interno</option><option>Devolução ao fornecedor</option></select></div>
      </div>
      <div class="acoes"><button type="button" class="secundario" data-fechar>Cancelar</button><button type="submit">Salvar ajuste</button></div></form>`);
  aoEnviar(m.querySelector('#fj'), async v => { await post('/api/estoque/ajuste', { ...v, variacao_id: variacaoId }); fecharModal(); avisar('Estoque ajustado.'); telaEstoque(); });
}

function modalVariacao(p, v) {
  const novo = !v; v = v || {};
  const m = abrirModal(`<h2>${novo ? 'Novo tamanho/cor' : 'Editar variação'} — ${esc(p.nome)}</h2>
    <form id="fvar"><div class="erro-form escondido"></div>
      <div class="campos">
        <div><label>Tamanho</label><input name="tamanho" value="${esc(v.tamanho)}" placeholder="Ex.: M, 42, 900g"></div>
        <div><label>Cor / sabor</label><input name="cor" value="${esc(v.cor)}" placeholder="Ex.: Preta, Chocolate"></div>
        <div><label>Estoque mínimo (aviso)</label><input name="estoque_minimo" type="number" min="0" step="1" value="${esc(v.estoque_minimo ?? 0)}"></div>
        <div><label>Custo por unidade (R$)</label><input name="custo" type="number" min="0" step="0.01" value="${esc(v.custo ?? '')}"></div>
        <div><label>Preço próprio (R$)</label><input name="preco" type="number" min="0" step="0.01" value="${esc(v.preco ?? '')}" placeholder="${p.preco}"><div class="ajuda">Vazio = usa o preço do produto (${brl(p.preco)}).</div></div>
        ${novo ? '' : `<div class="campo-largo"><label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" name="ativa" style="width:auto" ${v.ativa ? 'checked' : ''}> Ativa (aparece na venda)</label></div>`}
      </div>
      ${novo ? '<p class="pequeno mudo">O estoque começa em 0. Depois de salvar, use "+ Entrada" para lançar as unidades.</p>' : ''}
      <div class="acoes"><button type="button" class="secundario" data-fechar>Cancelar</button><button type="submit">Salvar</button></div></form>`);
  aoEnviar(m.querySelector('#fvar'), async d => {
    if (novo) await post('/api/estoque/variacoes', { ...d, produto_id: p.id }); else await put(`/api/estoque/variacoes/${v.id}`, d);
    fecharModal(); avisar('Salvo.'); telaEstoque();
  });
}

function modalProdutoEstoque(p, categorias) {
  const novo = !p; p = p || { controla_estoque: true, ativo: true };
  const m = abrirModal(`<h2>${novo ? 'Novo produto' : 'Editar ' + esc(p.nome)}</h2>
    <form id="fpe"><div class="erro-form escondido"></div>
      <div class="campos">
        <div class="campo-largo"><label>Nome *</label><input name="nome" required value="${esc(p.nome)}" placeholder="Ex.: Luva de treino, Whey protein, Camiseta do estúdio"></div>
        <div><label>Categoria</label><select name="categoria_id"><option value="">Sem categoria</option>${categorias.filter(c => c.ativa || c.id === p.categoria_id).map(c => `<option value="${c.id}" ${c.id === p.categoria_id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></div>
        ${novo ? `<div><label>Preço de venda (R$) *</label><input name="preco_individual" type="number" min="0" step="0.01" required></div>
          <div class="campo-largo"><label>Tamanhos <span class="mudo">(opcional, separados por vírgula)</span></label><input name="tamanhos" placeholder="Ex.: P, M, G, GG"></div>
          <div class="campo-largo"><label>Cores ou sabores <span class="mudo">(opcional, separados por vírgula)</span></label><input name="cores" placeholder="Ex.: Preta, Rosa"></div>
          <div><label>Custo por unidade (R$)</label><input name="custo" type="number" min="0" step="0.01"></div>
          <div><label>Estoque mínimo (aviso)</label><input name="estoque_minimo" type="number" min="0" step="1" value="2"></div>
          <div class="campo-largo pequeno mudo" id="combos"></div>` : ''}
        <div class="campo-largo"><label>Descrição</label><input name="descricao" value="${esc(p.descricao)}"></div>
        <div class="campo-largo"><label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" name="controla_estoque" style="width:auto" ${p.controla_estoque ? 'checked' : ''}> Controlar estoque (não deixa vender sem unidade em estoque)</label>
          <div class="ajuda">Desmarque para serviços sem estoque, como aula avulsa.</div></div>
        ${novo ? '' : `<div class="campo-largo"><label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" name="ativo" style="width:auto" ${p.ativo ? 'checked' : ''}> Produto ativo</label>
          <div class="ajuda">Para mudar o preço, use Produtos e preços → Alterar preço (fica no histórico).</div></div>`}
      </div>
      <div class="acoes"><button type="button" class="secundario" data-fechar>Cancelar</button><button type="submit">Salvar</button></div></form>`);
  const f = m.querySelector('#fpe');
  if (novo) {
    const prev = () => {
      const l = s => s.split(/[,;]/).map(x => x.trim()).filter(Boolean);
      const t = l(f.tamanhos.value), c = l(f.cores.value), n = Math.max(t.length, 1) * Math.max(c.length, 1);
      m.querySelector('#combos').textContent = n > 1 ? `Serão criadas ${n} variações, cada uma com seu estoque (ex.: ${[t[0], c[0]].filter(Boolean).join(' / ')}).` : '';
    };
    f.addEventListener('input', prev);
  }
  aoEnviar(f, async d => {
    if (novo) { await post('/api/produtos', { ...d, tipo: 'avulso' }); fecharModal(); avisar('Produto criado. Agora lance o estoque em "+ Entrada".'); }
    else { await put(`/api/produtos/${p.id}`, d); fecharModal(); avisar('Produto salvo.'); }
    telaEstoque();
  });
}

function modalCategorias(categorias) {
  const m = abrirModal(`<h2>Categorias</h2>
    <div class="tabela-rolagem"><table><thead><tr><th>Nome</th><th class="direita">Produtos</th><th>Ativa</th><th></th></tr></thead><tbody>
    ${categorias.map(c => `<tr data-id="${c.id}"><td><input value="${esc(c.nome)}" data-nome></td><td class="direita num">${c.produtos}</td><td><input type="checkbox" style="width:auto" data-ativa ${c.ativa ? 'checked' : ''}></td>
      <td class="direita"><button class="link" data-salvar>Salvar</button></td></tr>`).join('')}
    </tbody></table></div>
    <form id="fcat" class="linha-filtros" style="margin-top:12px"><div class="erro-form escondido" style="width:100%"></div><input name="nome" placeholder="Nova categoria" required><button type="submit" class="secundario">Adicionar</button></form>
    <div class="acoes"><button data-fechar>Fechar</button></div>`);
  m.querySelectorAll('[data-salvar]').forEach(b => b.onclick = async () => {
    const tr = b.closest('tr');
    try { await put(`/api/categorias/${tr.dataset.id}`, { nome: tr.querySelector('[data-nome]').value, ativa: tr.querySelector('[data-ativa]').checked }); avisar('Categoria salva.'); } catch (e) { avisar(e.message, 'erro'); }
  });
  aoEnviar(m.querySelector('#fcat'), async v => { await post('/api/categorias', v); modalCategorias(await get('/api/categorias')); });
  m.querySelector('[data-fechar]:last-child').addEventListener('click', () => { if (location.hash.startsWith('#/estoque')) telaEstoque(); });
}

async function modalMovimentos() {
  const l = await get('/api/estoque/movimentos');
  const nomes = { entrada: 'Entrada', venda: 'Venda', cancelamento: 'Venda cancelada', ajuste: 'Ajuste' };
  abrirModal(`<h2>Movimentações de estoque</h2><p class="pequeno mudo">Últimas 300.</p>
    ${l.length ? `<div class="tabela-rolagem" style="max-height:60vh;overflow:auto"><table><thead><tr><th>Data</th><th>Produto</th><th>Tipo</th><th class="direita">Qtd.</th><th class="direita">Saldo</th><th>Quem / detalhe</th></tr></thead><tbody>
    ${l.map(x => `<tr><td class="num pequeno">${new Date(x.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</td><td>${esc(x.produto)}<div class="pequeno mudo">${esc(x.variacao)}</div></td>
      <td>${nomes[x.tipo] || esc(x.tipo)}</td><td class="direita num" style="color:${x.quantidade > 0 ? 'var(--ok)' : 'var(--perigo)'}">${x.quantidade > 0 ? '+' : ''}${qtdTxt(x.quantidade)}</td>
      <td class="direita num">${qtdTxt(x.saldo)}</td><td class="pequeno">${esc(x.usuario || '')}${x.cliente ? ' · ' + esc(x.cliente) : ''}${x.motivo ? `<div class="mudo">${esc(x.motivo)}</div>` : ''}${x.custo_unitario != null ? `<div class="mudo">custo ${brl(x.custo_unitario)}</div>` : ''}</td></tr>`).join('')}
    </tbody></table></div>` : '<div class="vazio">Nenhuma movimentação ainda.</div>'}
    <div class="acoes"><button data-fechar>Fechar</button></div>`);
}
