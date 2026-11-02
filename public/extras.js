// Sistema de Gestão do Estúdio — recibo, celular (QR code) e aviso de atualização
'use strict';

// ---------- valor por extenso (reais) ----------
function porExtenso(valor) {
  const u = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const d = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const c = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  const ate999 = n => {
    if (n === 100) return 'cem';
    const partes = []; const ce = Math.floor(n / 100), r = n % 100;
    if (ce) partes.push(c[ce]);
    if (r < 20) { if (r) partes.push(u[r]); } else { partes.push(d[Math.floor(r / 10)] + (r % 10 ? ' e ' + u[r % 10] : '')); }
    return partes.join(' e ');
  };
  const inteiro = n => {
    if (n === 0) return 'zero';
    const mi = Math.floor(n / 1e6), mil = Math.floor((n % 1e6) / 1000), resto = n % 1000, p = [];
    if (mi) p.push(mi === 1 ? 'um milhão' : ate999(mi) + ' milhões');
    if (mil) p.push(mil === 1 ? 'mil' : ate999(mil) + ' mil');
    if (resto) p.push(ate999(resto));
    return p.length > 1 && (resto < 100 || resto % 100 === 0) && resto ? p.slice(0, -1).join(', ') + ' e ' + p[p.length - 1] : p.join(' ');
  };
  const centavos = Math.round(valor * 100), r = Math.floor(centavos / 100), cts = centavos % 100;
  const txt = [];
  if (r) txt.push(inteiro(r) + (r === 1 ? ' real' : (r % 1e6 === 0 ? ' de reais' : ' reais')));
  if (cts) txt.push(inteiro(cts) + (cts === 1 ? ' centavo' : ' centavos'));
  return txt.join(' e ') || 'zero real';
}
const soDigitos = t => String(t || '').replace(/\D/g, '');
function linkWhats(telefone, texto) {
  let n = soDigitos(telefone);
  if (!n) return null;
  if (!n.startsWith('55')) n = '55' + n;
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}

// ---------- recibo ----------
async function abrirRecibo(pagamentoId) {
  let r;
  try { r = await get(`/api/recibo/${pagamentoId}`); } catch (e) { avisar(e.message, 'erro'); return; }
  const p = r.pagamento, n = r.negocio, total = Number(p.valor) + Number(p.juros || 0);
  const numero = String(p.id).slice(0, 8).toUpperCase();
  const referente = p.venda_id
    ? r.itens.map(i => `${Number(i.quantidade)} x ${i.nome}`).join(', ')
    : `${p.produto}${p.pessoas === 2 ? ' (Dupla)' : ''} — plano ${p.plano}, de ${data(p.inicio)} a ${data(p.vencimento)}`;
  const linhasItens = p.venda_id ? r.itens.map(i => `<tr><td>${Number(i.quantidade)} x ${esc(i.nome)}</td><td class="direita">${brl(i.total)}</td></tr>`).join('')
    + (r.venda && Number(r.venda.desconto) > 0 ? `<tr><td>Desconto</td><td class="direita">− ${brl(r.venda.desconto)}</td></tr>` : '')
    : `<tr><td>${esc(p.produto)}${p.pessoas === 2 ? ' (Dupla)' : ''} — ${esc(p.plano)}<div class="pequeno mudo">Período: ${data(p.inicio)} a ${data(p.vencimento)}</div></td><td class="direita">${brl(p.valor)}</td></tr>`;
  const textoWhats = `*Recibo ${numero}* — ${n.nome || 'Gestão do Estúdio'}\n`
    + `Recebemos de ${p.cliente || 'cliente'} o valor de ${brl(total)} (${porExtenso(total)}), referente a ${referente}.\n`
    + `Pago em ${data(p.data_pagamento)} — ${p.forma || ''}${p.total_parcelas > 1 ? ` em ${p.total_parcelas}x` : ''}.\nObrigado!`;
  const whats = linkWhats(p.telefone, textoWhats);
  abrirModal(`
    <div class="imprimivel recibo">
      <div class="recibo-topo">
        ${urlLogo() ? `<img src="${urlLogo()}" alt="" class="recibo-logo">` : ''}
        <div><b style="font-size:17px">${esc(n.nome || 'Gestão do Estúdio')}</b>${n.slogan ? `<div class="pequeno mudo"><i>${esc(n.slogan)}</i></div>` : ''}
          <div class="pequeno">${[n.documento ? 'CNPJ/CPF ' + esc(n.documento) : '', esc(n.endereco || ''), esc(n.telefone || '')].filter(Boolean).join(' · ')}</div></div>
      </div>
      <h2 style="margin:16px 0 4px">Recibo nº ${numero}</h2>
      <p>Recebemos de <b>${esc(p.cliente || 'cliente não identificado')}</b>${p.cpf ? ` (CPF ${esc(p.cpf)})` : ''} a quantia de <b>${brl(total)}</b> (${porExtenso(total)}), referente a:</p>
      <table class="recibo-tabela"><tbody>${linhasItens}
        ${Number(p.juros) > 0 ? `<tr><td>Juros do parcelamento</td><td class="direita">${brl(p.juros)}</td></tr>` : ''}
        <tr class="total"><td>Total pago</td><td class="direita">${brl(total)}</td></tr></tbody></table>
      <p class="pequeno">Forma de pagamento: <b>${esc(p.forma || '—')}${p.total_parcelas > 1 ? ` em ${p.total_parcelas}x` : ''}</b> · Data: <b>${data(p.data_pagamento)}</b>${p.recebido_por_nome ? ` · Recebido por ${esc(p.recebido_por_nome)}` : ''}</p>
      <div class="recibo-assinatura">${esc(n.nome || '')}</div>
    </div>
    <div class="acoes nao-imprimir">
      <button class="secundario" data-fechar>Fechar</button>
      ${whats ? `<a class="botao" style="background:#1f8a4c" href="${whats}" target="_blank" rel="noopener">Enviar pelo WhatsApp</a>` : '<span class="pequeno mudo" style="align-self:center">Cadastre o telefone do cliente para enviar pelo WhatsApp.</span>'}
      <button onclick="window.print()">Imprimir</button>
    </div>`);
}

// ---------- celular: QR code com o endereço do sistema ----------
function cartaoCelular() {
  const end = (estado.enderecos || []).find(e => /192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\./.test(e)) || (estado.enderecos || [])[0];
  if (!end || typeof qrcode !== 'function') return '';
  const qr = qrcode(0, 'M'); qr.addData(end); qr.make();
  return `<div class="cartao cartao-celular"><div class="qr">${qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true })}</div>
    <div><h2>Abrir no celular</h2>
      <p class="pequeno" style="margin-top:-4px">Com o celular <b>no mesmo Wi-Fi</b>, aponte a câmera para o código (ou digite <b>${esc(end)}</b>).</p>
      <details class="pequeno"><summary class="mudo" style="cursor:pointer">Como colocar um ícone na tela do celular</summary>
        <p><b>Android (Chrome):</b> abra o sistema, toque nos 3 pontinhos ⋮ → <b>Adicionar à tela inicial</b>.<br>
        <b>iPhone (Safari):</b> abra o sistema, toque em Compartilhar → <b>Adicionar à Tela de Início</b>.<br>
        Se não abrir, confira se o computador do sistema está ligado e se o Windows permitiu o acesso pela rede (Firewall).</p></details></div></div>`;
}

// ---------- aviso de atualização (administrador) ----------
async function avisoAtualizacao() {
  try {
    const a = await get('/api/atualizacao');
    if (!a.nova) return '';
    return `<div class="info-inline" style="margin:0 0 16px;display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap">
      <span><b>Nova versão disponível: ${esc(a.nova.versao)}</b> (você usa a ${esc(a.atual)}).${a.nova.novidades.length ? `<br><span class="pequeno">Novidades: ${a.nova.novidades.map(esc).join(' · ')}</span>` : ''}
      <br><span class="pequeno mudo">Baixe e rode o instalador: ele atualiza e <b>mantém todos os dados</b>.</span></span>
      ${a.nova.download ? `<a class="botao" href="${esc(a.nova.download)}" target="_blank" rel="noopener">Baixar atualização</a>` : ''}</div>`;
  } catch { return ''; }
}
