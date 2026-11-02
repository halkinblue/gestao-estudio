// Sistema de Gestão do Estúdio — etapa 3: relatórios, backup e auditoria
'use strict';

const COR_CAIXA = 'var(--serie-1)', COR_EQUIV = 'var(--serie-2)';
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
function nomePeriodo(p) {
  let m;
  if ((m = /^(\d{4})-(\d{2})$/.exec(p))) return `${MESES[Number(m[2]) - 1]}/${m[1]}`;
  if ((m = /^(\d{4})-T(\d)$/.exec(p))) return `${m[2]}º tri ${m[1]}`;
  if ((m = /^(\d{4})-S(\d)$/.exec(p))) return `${m[2]}º sem ${m[1]}`;
  return p;
}
const tamanhoTxt = b => b == null ? '—' : b > 1048576 ? `${(b / 1048576).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
const dataHora = d => d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

// exporta uma tabela para o Excel (CSV com ; e vírgula decimal)
function baixarCSV(nome, cab, linhas) {
  const cel = v => {
    if (typeof v === 'number') return String(Math.round(v * 100) / 100).replace('.', ',');
    const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const txt = '\ufeff' + [cab, ...linhas].map(l => l.map(cel).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
  a.download = nome.replace(/[^\w\-]+/g, '_') + '.csv'; document.body.appendChild(a); a.click(); a.remove();
}
// tabela com botão de exportar
function tabelaRel(id, titulo, cab, linhas, opts = {}) {
  const alinhar = opts.alinhar || cab.map((_, i) => (i === 0 ? '' : 'direita'));
  const fmt = opts.fmt || cab.map((_, i) => (i === 0 ? esc : v => (typeof v === 'number' ? brl(v) : esc(v))));
  setTimeout(() => { const b = document.getElementById('exp-' + id); if (b) b.onclick = () => baixarCSV(titulo, cab, opts.csv || linhas); });
  return `<div class="cartao"><div class="ficha-topo"><h2>${esc(titulo)}</h2><button class="link nao-imprimir" id="exp-${id}">Exportar para Excel</button></div>
    ${opts.ajuda ? `<p class="pequeno mudo" style="margin-top:-6px">${opts.ajuda}</p>` : ''}
    ${linhas.length ? `<div class="tabela-rolagem"><table><thead><tr>${cab.map((c, i) => `<th class="${alinhar[i]}">${esc(c)}</th>`).join('')}</tr></thead><tbody>
      ${linhas.map(l => `<tr${l._classe ? ` class="${l._classe}"` : ''}>${l.map((v, i) => `<td class="${alinhar[i]} ${i ? 'num' : ''}">${fmt[i](v)}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div>` : '<div class="vazio">Sem dados no período.</div>'}</div>`;
}

// gráfico de colunas agrupadas (2 séries, mesmo eixo em R$)
function graficoColunas(periodos, series) {
  const W = 760, H = 260, m = { t: 14, r: 10, b: 30, l: 64 };
  const max = Math.max(1, ...series.flatMap(s => s.valores));
  const passo = Math.pow(10, Math.floor(Math.log10(max))), topo = Math.ceil(max / passo) * passo;
  const y = v => m.t + (H - m.t - m.b) * (1 - v / topo);
  const gw = (W - m.l - m.r) / Math.max(periodos.length, 1), bw = Math.min(28, (gw - 10) / series.length - 2);
  const ticks = [0, .25, .5, .75, 1].map(f => topo * f);
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Caixa e receita equivalente por período" style="width:100%;height:auto;display:block">`;
  for (const t of ticks) svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}" style="stroke:var(--grafico-grade)"/><text x="${m.l - 8}" y="${y(t) + 4}" text-anchor="end" font-size="11" style="fill:var(--grafico-texto)">${t >= 1000 ? (t / 1000).toLocaleString('pt-BR') + ' mil' : t.toLocaleString('pt-BR')}</text>`;
  periodos.forEach((p, i) => {
    const x0 = m.l + gw * i + (gw - (bw + 2) * series.length) / 2;
    series.forEach((s, j) => {
      const v = s.valores[i], x = x0 + j * (bw + 2), yy = y(v), h = Math.max(0, y(0) - yy);
      const r = Math.min(4, h, bw / 2);
      svg += `<path d="M${x},${y(0)} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + bw - r} Q${x + bw},${yy} ${x + bw},${yy + r} V${y(0)} Z" style="fill:${s.cor}" data-tip="${esc(nomePeriodo(p))}|${esc(s.nome)}|${brl(v)}"/>`;
    });
    svg += `<rect x="${m.l + gw * i}" y="${m.t}" width="${gw}" height="${H - m.t - m.b}" fill="transparent" data-grupo="${i}"/>`;
    svg += `<text x="${m.l + gw * i + gw / 2}" y="${H - 10}" text-anchor="middle" font-size="11" style="fill:var(--grafico-texto)">${esc(nomePeriodo(p))}</text>`;
  });
  svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}" style="stroke:var(--grafico-eixo)"/></svg>`;
  const legenda = `<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px" class="pequeno">${series.map(s => `<span style="display:flex;align-items:center;gap:6px"><span style="width:12px;height:12px;border-radius:3px;background:${s.cor}"></span>${esc(s.nome)}</span>`).join('')}</div>`;
  return `${legenda}<div class="grafico" style="position:relative">${svg}<div class="dica escondido"></div></div>`;
}
function ligarDicas(raiz, periodos, series) {
  const g = raiz.querySelector('.grafico'); if (!g) return;
  const dica = g.querySelector('.dica');
  g.querySelectorAll('[data-grupo]').forEach(r => {
    r.addEventListener('mousemove', e => {
      const i = Number(r.dataset.grupo), box = g.getBoundingClientRect();
      dica.innerHTML = `<b>${esc(nomePeriodo(periodos[i]))}</b>` + series.map(s => `<div style="display:flex;gap:8px;align-items:center"><span style="width:10px;height:10px;border-radius:2px;background:${s.cor}"></span>${esc(s.nome)}: <b>${brl(s.valores[i])}</b></div>`).join('');
      dica.classList.remove('escondido');
      const x = e.clientX - box.left + 14; dica.style.left = Math.min(x, box.width - 230) + 'px'; dica.style.top = (e.clientY - box.top - 10) + 'px';
    });
    r.addEventListener('mouseleave', () => dica.classList.add('escondido'));
  });
}

// ---------- Relatórios ----------
let filtroRel = null;
function periodosRel() {
  const h = new Date(), a = h.getFullYear(), z = n => String(n).padStart(2, '0'), hoje = `${a}-${z(h.getMonth() + 1)}-${z(h.getDate())}`;
  const doze = new Date(a, h.getMonth() - 11, 1);
  return {
    ano: [`${a}-01-01`, `${a}-12-31`], anterior: [`${a - 1}-01-01`, `${a - 1}-12-31`],
    doze: [`${doze.getFullYear()}-${z(doze.getMonth() + 1)}-01`, hoje],
    mes: [`${a}-${z(h.getMonth() + 1)}-01`, new Date(a, h.getMonth() + 1, 0).toISOString().slice(0, 10)],
  };
}
async function telaRelatorios() {
  const P = periodosRel();
  filtroRel = filtroRel || { tipo: 'ano', de: P.ano[0], ate: P.ano[1], agrupar: 'mes' };
  $('#tela').innerHTML = `
    <div class="topo"><div><h1>Relatórios</h1><p class="mudo">Vendas, receita, clientes e produtos do período escolhido.</p></div>
      <button class="secundario nao-imprimir" id="imprimir">Imprimir / salvar PDF</button></div>
    <div class="cartao nao-imprimir">
      <div class="linha-filtros" style="align-items:center;margin:0">
        <div class="atalhos" id="per">${[['ano', 'Este ano'], ['anterior', 'Ano passado'], ['doze', 'Últimos 12 meses'], ['mes', 'Este mês'], ['outro', 'Outro período']].map(([v, n]) => `<button type="button" class="secundario ${filtroRel.tipo === v ? 'ativa' : ''}" data-p="${v}">${n}</button>`).join('')}</div>
        <span id="datas" class="${filtroRel.tipo === 'outro' ? '' : 'escondido'}" style="display:flex;gap:6px;align-items:center"><input type="date" id="de" value="${filtroRel.de}" style="width:auto"> a <input type="date" id="ate" value="${filtroRel.ate}" style="width:auto"></span>
        <label style="display:flex;gap:6px;align-items:center;margin:0;font-weight:400">Agrupar por <select id="agrupar" style="width:auto"><option value="mes">Mês</option><option value="trimestre">Trimestre</option><option value="semestre">Semestre</option><option value="ano">Ano</option></select></label>
      </div>
    </div>
    <div id="rel"><p class="mudo">Carregando…</p></div>`;
  $('#agrupar').value = filtroRel.agrupar;
  const carregar = async () => {
    $('#rel').innerHTML = '<p class="mudo">Carregando…</p>';
    const [r, resultado] = await Promise.all([get(`/api/relatorios?de=${filtroRel.de}&ate=${filtroRel.ate}&agrupar=${filtroRel.agrupar}`),
      get(`/api/resultado?de=${filtroRel.de}&ate=${filtroRel.ate}&agrupar=${filtroRel.agrupar}`)]);
    desenharRelatorio(r, resultado);
  };
  $('#per').querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
    const t = b.dataset.p; $('#per').querySelectorAll('button').forEach(x => x.classList.toggle('ativa', x === b));
    $('#datas').classList.toggle('escondido', t !== 'outro');
    if (t !== 'outro') { filtroRel = { ...filtroRel, tipo: t, de: P[t][0], ate: P[t][1] }; $('#de').value = filtroRel.de; $('#ate').value = filtroRel.ate; carregar(); }
    else filtroRel.tipo = 'outro';
  });
  ['de', 'ate'].forEach(i => $('#' + i).onchange = () => { filtroRel = { ...filtroRel, tipo: 'outro', de: $('#de').value, ate: $('#ate').value }; if (filtroRel.de && filtroRel.ate) carregar(); });
  $('#agrupar').onchange = e => { filtroRel.agrupar = e.target.value; carregar(); };
  $('#imprimir').onclick = () => { $('#tela').classList.add('imprimivel'); window.print(); $('#tela').classList.remove('imprimivel'); };
  await carregar();
}

function desenharRelatorio(r, resultado = []) {
  const cx = r.caixa, re = r.receitaEquivalente, cl = r.clientes;
  const soma = (l, k) => l.reduce((s, x) => s + Number(x[k] || 0), 0);
  const periodos = [...new Set([...cx.porPeriodo.map(x => x.periodo), ...re.porPeriodo.map(x => x.periodo)])].sort();
  const val = (l, p, k) => Number(l.find(x => x.periodo === p)?.[k] || 0);
  const series = [{ nome: 'Caixa (o que entrou)', cor: COR_CAIXA, valores: periodos.map(p => val(cx.porPeriodo, p, 'bruto')) },
                  { nome: 'Receita mensal equivalente (planos)', cor: COR_EQUIV, valores: periodos.map(p => val(re.porPeriodo, p, 'valor')) }];
  const lucroTotal = r.itens.reduce((s, i) => s + (i.custo != null ? i.receita - i.custo : 0), 0);
  const servicos = [...new Set(re.porProduto.map(x => x.nome))];
  const lucroPer = resultado.reduce((s, x) => s + x.lucro, 0), despPer = resultado.reduce((s, x) => s + x.despesas, 0);
  $('#rel').innerHTML = `
    <p class="pequeno mudo" style="margin-top:0">Período: <b>${data(r.de)} a ${data(r.ate)}</b></p>
    <div class="grade">
      <div class="indicador"><div class="rotulo">Recebido (caixa)</div><div class="valor num">${brl(soma(cx.porPeriodo, 'bruto'))}</div><div class="pequeno mudo">${soma(cx.porPeriodo, 'qtd')} pagamento(s)</div></div>
      <div class="indicador"><div class="rotulo">Líquido (sem taxas)</div><div class="valor num">${brl(soma(cx.porPeriodo, 'liquido'))}</div><div class="pequeno mudo">taxas ${brl(soma(cx.porPeriodo, 'taxas'))}</div></div>
      <div class="indicador"><div class="rotulo">Receita equivalente (planos)</div><div class="valor num">${brl(soma(re.porPeriodo, 'valor'))}</div></div>
      <div class="indicador"><div class="rotulo">Alunos com plano em dia</div><div class="valor num">${cl.ativos_fim}</div><div class="pequeno mudo">${cl.novos} novo(s) · ${cl.renovacoes} renovação(ões)</div></div>
      <div class="indicador"><div class="rotulo">Cancelamentos</div><div class="valor num">${cl.cancelamentos}</div><div class="pequeno mudo">${cl.naoRenovaram.length} não renovaram</div></div>
      <div class="indicador"><div class="rotulo">Lucro do período</div><div class="valor num" style="color:${lucroPer >= 0 ? 'var(--ok)' : 'var(--perigo)'}">${brl(lucroPer)}</div><div class="pequeno mudo">despesas ${brl(despPer)}</div></div>
    </div>
    ${tabelaRel('resultado', 'Resultado (lucro)', ['Período', 'Recebido', 'Taxas', 'Despesas', 'Lucro', 'Margem'],
      resultado.map(x => [nomePeriodo(x.periodo), x.recebido, x.taxas, x.despesas, x.lucro, x.recebido > 0 ? Math.round(x.lucro / x.recebido * 1000) / 10 : null]),
      { fmt: [esc, brl, brl, brl, v => `<b style="color:${v >= 0 ? 'var(--ok)' : 'var(--perigo)'}">${brl(v)}</b>`, v => v == null ? '—' : pct(v)],
        ajuda: 'Lucro = recebido (planos, vendas e juros) − taxas da maquininha − despesas pagas. Lance as despesas na tela Despesas. Lucro com produtos (preço − custo) no período: ' + brl(lucroTotal) + '.' })}
    <div class="cartao"><h2>Caixa × receita mensal equivalente</h2>
      <details class="pequeno nao-imprimir" style="margin:-4px 0 12px"><summary class="mudo" style="cursor:pointer">O que é cada um?</summary>
        <p><b>Caixa</b>: o dinheiro que entrou no período (planos + vendas avulsas + juros). Serve para pagar contas.<br>
        <b>Receita mensal equivalente</b>: o valor de cada plano dividido pelos meses que ele cobre (ex.: Anual de R$ 768 = R$ 64 por mês durante 12 meses). Mostra quanto o estúdio "fatura" por mês com os alunos, sem os picos de quando alguém paga vários meses de uma vez. Não é previsão: usa só planos já vendidos.</p></details>
      ${periodos.length ? graficoColunas(periodos, series) : '<div class="vazio">Sem dados no período.</div>'}
      ${periodos.length ? `<div class="tabela-rolagem" style="margin-top:12px"><table><thead><tr><th>Período</th><th class="direita">Caixa</th><th class="direita">Líquido</th><th class="direita">Receita equivalente</th><th class="direita">Alunos com plano</th></tr></thead><tbody>
        ${periodos.map(p => `<tr><td>${esc(nomePeriodo(p))}</td><td class="direita num">${brl(val(cx.porPeriodo, p, 'bruto'))}</td><td class="direita num">${brl(val(cx.porPeriodo, p, 'liquido'))}</td><td class="direita num">${brl(val(re.porPeriodo, p, 'valor'))}</td><td class="direita num">${val(re.porPeriodo, p, 'clientes')}</td></tr>`).join('')}
      </tbody></table></div><p class="nao-imprimir" style="margin-bottom:0"><button class="link" id="exp-serie">Exportar para Excel</button></p>` : ''}
    </div>
    <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr));align-items:start">
      ${tabelaRel('cxprod', 'Caixa por serviço/produto', ['Serviço', 'Pagamentos', 'Bruto', 'Líquido'], cx.porProduto.map(x => [x.nome, x.qtd, x.bruto, x.liquido]), { fmt: [esc, v => v, brl, brl] })}
      ${tabelaRel('cxforma', 'Caixa por forma de pagamento', ['Forma', 'Pagamentos', 'Bruto', 'Juros', 'Taxas', 'Líquido'], cx.porForma.map(x => [x.nome, x.qtd, x.bruto, x.juros, x.taxas, x.liquido]), { fmt: [esc, v => v, brl, brl, brl, brl] })}
      ${tabelaRel('cxvend', 'Caixa por quem recebeu', ['Usuário', 'Pagamentos', 'Bruto'], cx.porVendedor.map(x => [x.nome, x.qtd, x.bruto]), { fmt: [esc, v => v, brl] })}
      ${tabelaRel('remod', 'Receita equivalente: Individual × Dupla', ['Modalidade', 'Alunos', 'Receita equivalente'], re.porModalidade.map(x => [x.nome, x.clientes, x.valor]), { fmt: [esc, v => v, brl] })}
    </div>
    ${tabelaRel('reprod', 'Receita equivalente por serviço', ['Serviço', ...periodos.map(nomePeriodo), 'Total'],
      servicos.map(s => { const vs = periodos.map(p => Number(re.porProduto.find(x => x.nome === s && x.periodo === p)?.valor || 0)); return [s, ...vs, vs.reduce((a, b) => a + b, 0)]; }))}
    ${tabelaRel('planos', 'Planos vendidos no período', ['Plano', 'Modalidade', 'Serviço', 'Assinaturas', 'Valor', 'Descontos na hora'],
      r.planos.map(x => [x.plano, x.modalidade, x.produto, x.assinaturas, x.valor, x.descontos]),
      { alinhar: ['', '', '', 'direita', 'direita', 'direita'], fmt: [esc, esc, esc, v => v, brl, brl], ajuda: 'Assinaturas com início no período (Dupla conta 1 por pessoa). Inclui as migradas da planilha.' })}
    ${tabelaRel('itens', 'Produtos vendidos e lucro', ['Produto', 'Variação', 'Qtd.', 'Receita', 'Custo', 'Lucro', 'Margem'],
      r.itens.map(i => [i.produto, i.variacao, Number(i.qtd), i.receita, i.custo, i.custo != null ? i.receita - i.custo : null, i.custo != null && i.receita > 0 ? Math.round((i.receita - i.custo) / i.receita * 1000) / 10 : null]),
      { alinhar: ['', '', 'direita', 'direita', 'direita', 'direita', 'direita'], fmt: [esc, esc, v => qtdTxt(v), brl, v => v == null ? '<span class="mudo">sem custo</span>' : brl(v), v => v == null ? '—' : brl(v), v => v == null ? '—' : pct(v)],
        ajuda: 'Receita já com o desconto da venda. Lucro = receita − custo de compra (cadastre o custo nas entradas de mercadoria).' })}
    ${tabelaRel('parado', 'Dinheiro parado em estoque (hoje)', ['Produto', 'Unidades', 'Valor de custo', 'Valor de venda'],
      r.estoqueParado.map(x => [x.produto, Number(x.unidades), x.valor_custo, x.valor_venda]), { fmt: [esc, v => qtdTxt(v), v => v == null ? '<span class="mudo">sem custo</span>' : brl(v), brl] })}
    ${tabelaRel('naorenov', 'Venceram no período e não renovaram', ['Cliente', 'Serviço', 'Venceu em'],
      cl.naoRenovaram.map(x => [x.nome, x.produto, x.vencimento]), { fmt: [esc, esc, data], alinhar: ['', '', ''], ajuda: 'Bom para entrar em contato. Desative na ficha quem saiu do estúdio.' })}`;
  ligarDicas($('#rel'), periodos, series);
  const b = $('#exp-serie');
  if (b) b.onclick = () => baixarCSV('caixa_e_receita_equivalente', ['Período', 'Caixa', 'Líquido', 'Receita equivalente', 'Alunos com plano'],
    periodos.map(p => [nomePeriodo(p), val(cx.porPeriodo, p, 'bruto'), val(cx.porPeriodo, p, 'liquido'), val(re.porPeriodo, p, 'valor'), val(re.porPeriodo, p, 'clientes')]));
}

// ---------- Backup ----------
const LINK_DRIVE = 'https://www.google.com/drive/download/';
function passoAPasso(e) {
  const ok = c => c ? '<span class="etiqueta ok">feito</span>' : '<span class="etiqueta vencendo">pendente</span>';
  const fezBackup = e.historico.some(h => h.situacao === 'sucesso' && h.enviado_drive);
  return `
    <ol class="passos">
      <li><div class="passo-topo"><b>Instale o Google Drive para computador</b> ${ok(e.pastaOk)}</div>
        Abra <a href="${LINK_DRIVE}" target="_blank" rel="noopener">${LINK_DRIVE}</a>, clique em <b>"Baixar o Google Drive para computador"</b> e instale (avançar, avançar, concluir). É gratuito.</li>
      <li><div class="passo-topo"><b>Entre com a conta Google do estúdio</b> ${ok(e.pastaOk)}</div>
        Quando o Drive abrir, clique em <b>"Fazer login com o navegador"</b> e entre com a conta Google que vai guardar os backups (de preferência uma conta só do estúdio).
        Depois disso aparece no Explorador de Arquivos a unidade <b>"Google Drive (G:)"</b> com a pasta <b>"Meu Drive"</b>.
        <div class="ajuda">Deixe o Google Drive abrindo junto com o Windows (é o padrão). Ele precisa estar aberto para enviar os arquivos.</div></li>
      <li><div class="passo-topo"><b>Escolha a pasta do backup</b> ${ok(e.pastaOk)}</div>
        Clique em <b>"Procurar Google Drive"</b> abaixo. O sistema encontra o "Meu Drive" e sugere a pasta <b>Backup Estudio</b> (ele mesmo cria). Clique em <b>"Usar esta pasta"</b> e depois em <b>"Salvar configurações"</b>.</li>
      <li><div class="passo-topo"><b>Crie a senha do backup</b> ${ok(e.senhaDefinida)}</div>
        Os backups ficam protegidos por essa senha: mesmo que alguém acesse o Drive, não consegue abrir os dados dos clientes.
        <b>Anote a senha no mesmo papel do código de recuperação.</b> Sem ela não dá para restaurar o backup.</li>
      <li><div class="passo-topo"><b>Faça o primeiro backup</b> ${ok(fezBackup)}</div>
        Clique em <b>"Fazer backup agora"</b>. Depois abra <a href="https://drive.google.com" target="_blank" rel="noopener">drive.google.com</a> e confira o arquivo na pasta <b>Backup Estudio</b> (pode levar alguns minutos para aparecer).</li>
      <li><div class="passo-topo"><b>Pronto</b></div>
        Daqui em diante o backup é automático (${e.frequencia === 'semanal' ? 'toda semana' : e.frequencia === 'desligado' ? 'desligado' : 'todo dia'} às ${esc(e.horario)}), com o sistema aberto. Se o computador estiver desligado no horário, o backup é feito quando o sistema abrir.
        Se a internet cair, o Google Drive envia quando ela voltar.</li>
    </ol>`;
}
function passosRestaurar() {
  return `<ol class="passos">
    <li><div class="passo-topo"><b>No computador antigo</b></div>Abra a tela <b>Backup</b> e clique em <b>Fazer backup agora</b>. Confira se aparece "ok" no histórico (o arquivo vai para a pasta <b>Backup Estudio</b> do Google Drive).</li>
    <li><div class="passo-topo"><b>No computador novo: Google Drive</b></div>Instale o <a href="https://www.google.com/intl/pt-BR/drive/download/" target="_blank" rel="noopener">Google Drive para computador</a> e entre com a <b>mesma conta Google</b> do negócio. Espere a pasta <b>Backup Estudio</b> aparecer no "Meu Drive".</li>
    <li><div class="passo-topo"><b>No computador novo: instalador</b></div>Rode o instalador e, em "Como você quer começar?", escolha <b>Trazer meus dados de outro computador</b>. Digite a <b>senha do backup</b>: o instalador acha o backup mais recente e traz tudo (clientes, vendas, logo, usuários, rede de unidades).</li>
    <li><div class="passo-topo"><b>Pronto</b></div>Entre com o <b>mesmo login</b> de sempre. Depois, desinstale o sistema do computador antigo (ou pelo menos não use mais): se ele continuar ligado, o sistema avisa.</li>
  </ol>
  <p class="pequeno mudo">Se o instalador não conseguir trazer os dados, o sistema abre na tela "Como você quer começar?": clique em <b>Restaurar um backup</b> → <b>Procurar Google Drive</b> → escolha o mais recente → senha → RESTAURAR.</p>`;
}
async function telaBackup() {
  const e = await get('/api/backup/estado');
  const configurado = e.senhaDefinida && e.pastaOk;
  const ultimoOk = e.historico.find(h => h.situacao === 'sucesso');
  const sit = { sucesso: '<span class="etiqueta ok">ok</span>', aguardando_envio: '<span class="etiqueta vencendo">só neste PC</span>', erro: '<span class="etiqueta em-atraso">erro</span>' };
  $('#tela').innerHTML = `
    <div class="topo"><div><h1>Backup</h1><p class="mudo">Cópia de segurança de todos os dados, guardada no Google Drive.</p></div>
      <button id="agora" ${e.senhaDefinida ? '' : 'disabled title="Defina a senha do backup primeiro"'}>Fazer backup agora</button></div>
    ${!e.pgDump ? '<div class="cartao"><div class="erro-form">Não encontrei o pg_dump do PostgreSQL neste computador. O backup precisa do PostgreSQL instalado aqui.</div></div>' : ''}
    <div class="grade">
      <div class="indicador"><div class="rotulo">Último backup completo</div><div class="valor" style="font-size:18px">${ultimoOk ? dataHora(ultimoOk.data) : 'nenhum ainda'}</div></div>
      <div class="indicador"><div class="rotulo">Automático</div><div class="valor" style="font-size:18px">${e.frequencia === 'desligado' ? 'desligado' : `${e.frequencia === 'semanal' ? 'semanal' : 'diário'} às ${esc(e.horario)}`}</div></div>
      <div class="indicador"><div class="rotulo">Pasta do Google Drive</div><div class="valor" style="font-size:14px;word-break:break-all">${e.pasta ? esc(e.pasta) : 'não configurada'}</div>${e.pasta && !e.pastaOk ? '<div class="pequeno" style="color:var(--perigo)">indisponível agora</div>' : ''}</div>
      <div class="indicador"><div class="rotulo">Senha do backup</div><div class="valor" style="font-size:18px">${e.senhaDefinida ? 'definida' : 'não definida'}</div></div>
    </div>
    <div class="cartao"><details ${configurado ? '' : 'open'}><summary style="cursor:pointer"><h2 style="display:inline">Passo a passo: configurar o backup no Google Drive</h2></summary>${passoAPasso(e)}</details></div>
    <div class="cartao"><h2>Configurações</h2>
      <form id="fb"><div class="erro-form escondido"></div>
        <div class="campos">
          <div class="campo-largo"><label>Pasta do backup no Google Drive</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap"><input name="pasta" value="${esc(e.pasta || '')}" placeholder="Ex.: G:\\Meu Drive\\Backup Estudio" style="flex:1 1 280px">
              <button type="button" class="secundario" id="procurar">Procurar Google Drive</button><button type="button" class="secundario" id="testar">Testar pasta</button></div>
            <div id="achados" class="pequeno" style="margin-top:6px"></div></div>
          <div><label>Frequência</label><select name="frequencia"><option value="diaria">Todo dia</option><option value="semanal">Toda semana</option><option value="desligado">Desligado</option></select></div>
          <div><label>Horário</label><input name="horario" type="time" value="${esc(e.horario)}"></div>
          <div><label>Quantas cópias manter</label><input name="copias" type="number" min="3" max="365" value="${e.copias}"><div class="ajuda">As mais antigas são apagadas automaticamente.</div></div>
        </div>
        <div class="acoes"><button type="submit">Salvar configurações</button></div>
      </form>
      <h3>Senha do backup</h3>
      <form id="fs2" class="linha-filtros"><div class="erro-form escondido" style="width:100%"></div>
        <input name="senha" type="password" placeholder="${e.senhaDefinida ? 'Nova senha do backup' : 'Crie a senha do backup'}" autocomplete="new-password" required>
        <input name="senha2" type="password" placeholder="Repita a senha" autocomplete="new-password" required>
        <button type="submit" class="secundario">${e.senhaDefinida ? 'Trocar senha' : 'Salvar senha'}</button></form>
      ${e.senhaDefinida ? '<p class="pequeno mudo" style="margin:0">Se trocar a senha, os backups antigos continuam abrindo só com a senha antiga.</p>' : ''}
    </div>
    <div class="cartao"><div class="ficha-topo"><h2>Histórico</h2><button class="secundario" id="restaurar">Restaurar um backup…</button></div>
      ${e.historico.length ? `<div class="tabela-rolagem"><table><thead><tr><th>Data</th><th>Tipo</th><th>Arquivo</th><th class="direita">Tamanho</th><th>Situação</th><th>Observação</th></tr></thead><tbody>
        ${e.historico.map(h => `<tr><td class="num">${dataHora(h.data)}</td><td>${h.tipo === 'manual' ? 'Manual' : 'Automático'}${h.usuario ? `<div class="pequeno mudo">${esc(h.usuario)}</div>` : ''}</td><td class="pequeno">${esc(h.arquivo || '—')}</td>
          <td class="direita num">${tamanhoTxt(h.tamanho)}</td><td>${sit[h.situacao] || esc(h.situacao)}${h.enviado_drive ? ' <span class="pequeno mudo">no Drive</span>' : ''}</td><td class="pequeno">${esc(h.mensagem || '')}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="vazio">Nenhum backup ainda.</div>'}
      <p class="pequeno mudo" style="margin-bottom:0">Uma cópia de cada backup também fica neste computador em: ${esc(e.pastaLocal)}</p>
    </div>
    <div class="cartao"><details><summary style="cursor:pointer"><h2 style="display:inline">Vai trocar de computador? (mudar o sistema de máquina)</h2></summary>${passosRestaurar()}
      ${e.senhaDefinida ? '<div class="acoes" style="justify-content:flex-start"><button class="secundario" id="agora-mudanca">Fazer o backup para a mudança agora</button></div>' : ''}</details></div>
    <div class="cartao" style="border-color:var(--perigo-borda)"><details><summary style="cursor:pointer"><h2 style="display:inline;color:var(--perigo)">Apagar tudo e começar do zero</h2></summary>
      <p class="pequeno">Use quando terminar de conhecer o sistema com os <b>dados de exemplo</b> e quiser começar a usar de verdade. Apaga clientes, vendas, estoque, usuários, logo e configurações.
      ${e.senhaDefinida ? 'Antes, o sistema faz um backup automático.' : '<b>Atenção:</b> a senha do backup não está definida, então <b>não</b> será feita cópia de segurança antes.'}</p>
      <button class="perigo" id="zerar">Apagar tudo…</button></details></div>`;
  const f = $('#fb'); f.frequencia.value = e.frequencia;
  aoEnviar(f, async d => { await put('/api/backup/config', d); avisar('Configurações salvas.'); telaBackup(); });
  $('#procurar').onclick = async () => {
    const r = await post('/api/backup/procurar-drive').catch(err => ({ erro: err.message }));
    const alvo = $('#achados');
    if (r.erro) { alvo.innerHTML = `<span style="color:var(--perigo)">${esc(r.erro)}</span>`; return; }
    alvo.innerHTML = r.pastas.length ? r.pastas.map((p, i) => `<div>Encontrei: <b>${esc(p.drive)}</b> → <button type="button" class="link" data-i="${i}">Usar ${esc(p.sugestao)}</button></div>`).join('')
      : '<span style="color:var(--alerta)">Não encontrei o Google Drive. Confira os passos 1 e 2 (o Drive precisa estar instalado e com login feito). Se ele estiver em outro lugar, digite o caminho da pasta.</span>';
    alvo.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { f.pasta.value = r.pastas[b.dataset.i].sugestao; avisar('Pasta escolhida. Clique em "Salvar configurações".'); });
  };
  $('#testar').onclick = async () => { try { await post('/api/backup/testar-pasta', { pasta: f.pasta.value }); avisar('Pasta OK: o sistema consegue gravar nela.'); } catch (err) { avisar(err.message, 'erro'); } };
  aoEnviar($('#fs2'), async d => {
    if (d.senha !== d.senha2) throw new Error('As senhas não conferem.');
    await post('/api/backup/senha', { senha: d.senha }); avisar('Senha do backup salva. Anote no papel do código de recuperação!'); telaBackup();
  });
  $('#agora').onclick = async () => {
    const b = $('#agora'); b.disabled = true; b.textContent = 'Fazendo backup…';
    try { const r = await post('/api/backup/agora'); avisar(r.backup.enviado_drive ? 'Backup feito e copiado para o Google Drive.' : 'Backup feito, mas ficou só neste computador (confira a pasta do Drive).'); }
    catch (err) { avisar(err.message, 'erro'); }
    telaBackup();
  };
  if ($('#agora-mudanca')) $('#agora-mudanca').onclick = async () => {
    const b = $('#agora-mudanca'); b.disabled = true; b.textContent = 'Fazendo backup…';
    try {
      const r = await post('/api/backup/agora');
      if (r.backup.enviado_drive) abrirModal(`<h2>Backup pronto para a mudança</h2><p>O backup <b>${esc(r.backup.arquivo)}</b> foi copiado para o Google Drive.</p>
        <p>Agora, no computador novo: instale o Google Drive (mesma conta Google), rode o instalador e escolha <b>Trazer meus dados de outro computador</b>. Tenha em mãos a <b>senha do backup</b>.</p>
        <p class="pequeno mudo">Dica: de agora até terminar a mudança, evite registrar vendas aqui — o que for lançado depois deste backup não vai junto.</p><div class="acoes"><button data-fechar>Entendi</button></div>`);
      else avisar('O backup foi feito, mas não chegou ao Google Drive. Confira a pasta do Drive antes de mudar de computador.', 'erro');
    } catch (err) { avisar(err.message, 'erro'); }
    telaBackup();
  };
  $('#restaurar').onclick = () => modalRestaurar(e.pasta, () => { avisar('Backup restaurado. Entre novamente.'); iniciar(); });
  $('#zerar').onclick = () => {
    const m = abrirModal(`<h2 style="color:var(--perigo)">Apagar tudo e começar do zero</h2>
      <p>Todos os dados serão apagados. Depois, o sistema volta para a tela de <b>primeiro uso</b>.</p>
      <form id="fz"><div class="erro-form escondido"></div>
        <div class="campos"><div><label>Sua senha *</label><input name="senha" type="password" required autocomplete="current-password"></div>
          <div><label>Digite APAGAR TUDO *</label><input name="confirmacao" required autocomplete="off"></div></div>
        <div class="acoes"><button type="button" class="secundario" data-fechar>Cancelar</button><button type="submit" class="perigo">Apagar tudo</button></div></form>`);
    aoEnviar(m.querySelector('#fz'), async d => {
      await post('/api/sistema/zerar', { senha: d.senha, confirmacao: d.confirmacao.trim().toUpperCase() });
      fecharModal(); try { localStorage.removeItem('cor'); } catch {} aplicarCor(null); avisar('Tudo apagado. Vamos começar!'); location.hash = ''; iniciar();
    });
  };
}

async function modalRestaurar(pastaPadrao, depois) {
  const m = abrirModal(`<h2>Restaurar um backup</h2>
    <p class="mudo pequeno">Todos os dados atuais serão substituídos pelos do backup escolhido. ${estado.bancoVazio ? '' : 'Antes, o sistema faz uma cópia de segurança do estado atual.'}</p>
    <form id="fr2"><div class="erro-form escondido"></div>
      <label>Pasta onde estão os backups</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><input name="pasta_busca" value="${esc(pastaPadrao || '')}" placeholder="Ex.: G:\\Meu Drive\\Backup Estudio" style="flex:1 1 260px">
        <button type="button" class="secundario" id="drv">Procurar Google Drive</button><button type="button" class="secundario" id="listar">Listar arquivos</button></div>
      <div id="arqs" style="max-height:240px;overflow:auto;margin-bottom:10px"></div>
      <div class="campos">
        <div><label>Senha do backup *</label><input name="senha" type="password" required autocomplete="off"></div>
        <div><label>Digite RESTAURAR para confirmar *</label><input name="confirmacao" required autocomplete="off"></div>
      </div>
      <div class="acoes"><button type="button" class="secundario" data-fechar>Cancelar</button><button type="submit" class="perigo">Restaurar</button></div>
    </form>`);
  const f = m.querySelector('#fr2');
  const listar = async () => {
    const alvo = m.querySelector('#arqs'); alvo.innerHTML = '<p class="mudo pequeno">Procurando…</p>';
    try {
      const grupos = await get(`/api/backup/arquivos?pasta=${encodeURIComponent(f.pasta_busca.value)}`);
      const total = grupos.reduce((s, g) => s + g.arquivos.length, 0);
      alvo.innerHTML = total ? grupos.filter(g => g.arquivos.length).map((g, gi) => `<div class="pequeno mudo" style="margin:6px 0 4px">${esc(g.pasta)}</div>` +
        g.arquivos.map((a, ai) => `<label style="display:flex;gap:8px;align-items:center;font-weight:400;padding:4px 0"><input type="radio" name="escolha" value="${gi}|${ai}" style="width:auto" ${gi === 0 && ai === 0 ? 'checked' : ''}>
          ${esc(a.arquivo)} <span class="mudo pequeno">${dataHora(a.data)} · ${tamanhoTxt(a.tamanho)}</span></label>`).join('')).join('')
        : '<p class="pequeno" style="color:var(--alerta)">Nenhum arquivo de backup (.vhb) encontrado. Confira a pasta (no Google Drive pode levar alguns minutos para os arquivos aparecerem).</p>';
      f._grupos = grupos.filter(g => g.arquivos.length);
    } catch (err) { alvo.innerHTML = `<p class="pequeno" style="color:var(--perigo)">${esc(err.message)}</p>`; }
  };
  m.querySelector('#listar').onclick = listar;
  m.querySelector('#drv').onclick = async () => {
    try { const r = await post('/api/backup/procurar-drive'); if (r.pastas.length) { f.pasta_busca.value = r.pastas[0].sugestao; listar(); } else avisar('Não encontrei o Google Drive neste computador.', 'erro'); }
    catch (err) { avisar(err.message, 'erro'); }
  };
  listar();
  aoEnviar(f, async d => {
    const esc1 = f.querySelector('input[name=escolha]:checked');
    if (!esc1 || !f._grupos) throw new Error('Escolha o arquivo de backup.');
    const [gi, ai] = esc1.value.split('|').map(Number), g = f._grupos[gi];
    f.querySelector('button[type=submit]').textContent = 'Restaurando… (pode levar alguns minutos)';
    await post('/api/backup/restaurar', { pasta: g.pasta, arquivo: g.arquivos[ai].arquivo, senha: d.senha, confirmacao: d.confirmacao.trim().toUpperCase() });
    fecharModal(); depois();
  });
}

function telaBancoVazio() {
  telaEntrada('Como você quer começar?', 'O banco de dados está vazio. Escolha uma opção:', `
    <div class="opcoes-inicio">
      <button class="secundario opcao-inicio" data-modo="zero"><b>Começar do zero</b><span>Sistema vazio, pronto para cadastrar seus clientes, serviços e preços.</span></button>
      <button class="secundario opcao-inicio" data-modo="exemplo"><b>Começar com dados de exemplo</b><span>Clientes, vendas e estoque fictícios para conhecer o sistema. Dá para apagar depois começando do zero.</span></button>
      <button class="secundario opcao-inicio" id="rest"><b>Restaurar um backup</b><span>Para trazer os dados de outro computador (backup do Google Drive).</span></button>
    </div>
    <details class="pequeno" style="margin-top:12px"><summary style="cursor:pointer">Passo a passo para restaurar em um computador novo</summary>${passosRestaurar()}</details>
    <div class="erro-form escondido" id="erro-inicio" style="margin-top:10px"></div>`);
  $('#rest').onclick = () => modalRestaurar('', () => { avisar('Backup restaurado! Entre com seu login.'); iniciar(); });
  document.querySelectorAll('[data-modo]').forEach(b => b.onclick = async () => {
    document.querySelectorAll('.opcao-inicio').forEach(x => x.disabled = true);
    b.querySelector('b').textContent = 'Preparando…';
    try { await post('/api/instalacao/criar', { modo: b.dataset.modo }); iniciar(); }
    catch (e) { const el = $('#erro-inicio'); el.textContent = e.message; el.classList.remove('escondido'); document.querySelectorAll('.opcao-inicio').forEach(x => x.disabled = false); }
  });
}

// ---------- Auditoria ----------
const NOMES_CAMPOS = { valor: 'Valor', vigente_desde: 'Vale desde', pessoas: 'Pessoas', motivo: 'Motivo', desconto: 'Desconto', nome: 'Nome', perfil: 'Perfil', ativo: 'Ativo', ativa: 'Ativa',
  taxa_percentual: 'Taxa (%)', permite_parcelar: 'Parcela', meses: 'Meses', desconto_percentual: 'Desconto (%)', valor_fixo: 'Valor fixo', nova_quantidade: 'Nova quantidade',
  arquivo: 'Arquivo', situacao: 'Situação', cliente: 'Cliente', login: 'Login', preco: 'Preço', custo: 'Custo', estoque_minimo: 'Estoque mínimo', novo_vencimento: 'Novo vencimento',
  pasta: 'Pasta', frequencia: 'Frequência', horario: 'Horário', copias: 'Cópias', por: 'Por', preco_individual: 'Preço individual', preco_dupla: 'Preço Dupla', tipo: 'Tipo' };
function fmtValorAud(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'sim' : 'não';
  if (Array.isArray(v)) return v.join(', ') || '—';
  if (typeof v === 'object') return Object.entries(v).map(([k, x]) => `${k}: ${x}`).join(', ');
  if (/^\d{4}-\d{2}-\d{2}/.test(String(v))) return data(String(v));
  return String(v);
}
function detalheAud(a) {
  const antes = a.antes || {}, depois = a.depois || {};
  const chaves = [...new Set([...Object.keys(antes), ...Object.keys(depois)])].filter(k => !['produto_id', 'categoria_id', 'tamanhos', 'cores'].includes(k) || depois[k]?.length);
  if (!chaves.length) return '';
  return chaves.map(k => {
    const ant = k in antes ? fmtValorAud(antes[k]) : null, dep = k in depois ? fmtValorAud(depois[k]) : null;
    const nome = NOMES_CAMPOS[k] || k;
    if (ant !== null && dep !== null && ant !== dep) return `<div>${esc(nome)}: <s class="mudo">${esc(ant)}</s> → <b>${esc(dep)}</b></div>`;
    if (ant !== null && dep !== null) return '';
    return `<div>${esc(nome)}: ${esc(dep ?? ant)}</div>`;
  }).join('');
}
let filtroAud = null;
async function telaAuditoria() {
  const h = new Date(), z = n => String(n).padStart(2, '0'), fmt = d => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  filtroAud = filtroAud || { de: fmt(new Date(h.getFullYear(), h.getMonth(), h.getDate() - 30)), ate: fmt(h), usuario: '', acao: '', busca: '' };
  const fl = await get('/api/auditoria/filtros');
  $('#tela').innerHTML = `
    <div class="topo"><div><h1>Auditoria</h1><p class="mudo">Tudo o que foi alterado no sistema: preços, descontos, cancelamentos, estoque, usuários e backups.</p></div></div>
    <div class="cartao">
      <div class="linha-filtros" style="align-items:center">
        <input type="date" id="de" value="${filtroAud.de}" style="width:auto"> a <input type="date" id="ate" value="${filtroAud.ate}" style="width:auto">
        <select id="usuario" style="width:auto"><option value="">Todos os usuários</option>${fl.usuarios.map(u => `<option value="${u.id}">${esc(u.nome)}</option>`).join('')}</select>
        <select id="acao" style="width:auto"><option value="">Todas as ações</option>${fl.acoes.map(a => `<option>${esc(a)}</option>`).join('')}</select>
        <input id="busca" placeholder="Buscar (ex.: nome, motivo)" value="${esc(filtroAud.busca)}" style="flex:1 1 180px">
      </div>
      <div id="lista"></div>
    </div>`;
  $('#usuario').value = filtroAud.usuario; $('#acao').value = filtroAud.acao;
  const carregar = async () => {
    const l = await get(`/api/auditoria?de=${filtroAud.de}&ate=${filtroAud.ate}&usuario=${filtroAud.usuario}&acao=${encodeURIComponent(filtroAud.acao)}&busca=${encodeURIComponent(filtroAud.busca)}`);
    $('#lista').innerHTML = l.length ? `<div class="ficha-topo pequeno mudo" style="margin-bottom:6px"><span>${l.length} registro(s)${l.length >= 1000 ? ' (mostrando os 1000 mais recentes)' : ''}</span><button class="link" id="exp-aud">Exportar para Excel</button></div>
      <div class="tabela-rolagem"><table><thead><tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Sobre</th><th>Detalhes</th></tr></thead><tbody>
      ${l.map(a => `<tr><td class="num pequeno" style="white-space:nowrap">${dataHora(a.data)}</td><td>${esc(a.usuario || 'Sistema')}</td><td><b>${esc(a.acao)}</b></td>
        <td class="pequeno">${esc(a.registro || '')}</td><td class="pequeno">${detalheAud(a)}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="vazio">Nenhum registro com esses filtros.</div>';
    const b = $('#exp-aud');
    if (b) b.onclick = () => baixarCSV('auditoria', ['Data', 'Usuário', 'Ação', 'Sobre', 'Antes', 'Depois'],
      l.map(a => [dataHora(a.data), a.usuario || 'Sistema', a.acao, a.registro || '', a.antes ? JSON.stringify(a.antes) : '', a.depois ? JSON.stringify(a.depois) : '']));
  };
  const mudar = () => { filtroAud = { de: $('#de').value, ate: $('#ate').value, usuario: $('#usuario').value, acao: $('#acao').value, busca: $('#busca').value }; carregar(); };
  ['de', 'ate', 'usuario', 'acao'].forEach(i => $('#' + i).onchange = mudar);
  let t; $('#busca').oninput = () => { clearTimeout(t); t = setTimeout(mudar, 300); };
  await carregar();
}

// aviso de backup na tela Início (só administrador)
async function avisoBackupInicio() {
  try {
    const a = await get('/api/backup/aviso');
    if (!a.mostrar) return '';
    const txt = !a.configurado ? 'O backup no Google Drive ainda não está configurado. Sem backup, se o computador quebrar, os dados se perdem.'
      : a.ultimaSituacao === 'erro' ? 'O último backup deu erro. Confira a tela Backup.'
      : a.ultimoOk ? `O último backup completo foi em ${dataHora(a.ultimoOk)} (mais de 24 horas).` : 'Nenhum backup completo foi feito ainda.';
    return `<div class="aviso-inline" style="margin:0 0 16px;display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><span><b>Backup:</b> ${txt}</span><a class="botao" href="#/backup">${a.configurado ? 'Ver backup' : 'Configurar agora'}</a></div>`;
  } catch { return ''; }
}
