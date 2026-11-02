// Servico inteligente de interpretacao e automacao do WhatsApp
const { GoogleGenAI } = require("@google/genai");

async function obterCatalogo(pool) {
  const [prodsRes, varsRes, planosRes, configsRes] = await Promise.all([
    pool.query(`
      SELECT p.id, p.nome, p.tipo, p.controla_estoque,
        COALESCE(
          (SELECT valor FROM precos x WHERE x.produto_id=p.id AND x.pessoas=1 AND x.vigente_desde<=current_date ORDER BY vigente_desde DESC, criado_em DESC LIMIT 1),
          0
        ) AS valor
      FROM produtos p
      WHERE p.ativo
      ORDER BY p.nome
    `),
    pool.query(`
      SELECT pv.id, pv.produto_id, pv.tamanho, pv.cor, pv.estoque, pv.preco, p.nome AS produto_nome,
        COALESCE(pv.preco, (SELECT valor FROM precos x WHERE x.produto_id=p.id AND x.pessoas=1 AND x.vigente_desde<=current_date ORDER BY vigente_desde DESC, criado_em DESC LIMIT 1), 0) AS valor_final
      FROM produto_variacoes pv
      JOIN produtos p ON p.id = pv.produto_id
      WHERE pv.ativa AND p.ativo
    `),
    pool.query("SELECT id, nome, meses, desconto_percentual, valor_fixo, produto_id FROM planos WHERE ativo ORDER BY meses"),
    pool.query("SELECT chave, valor FROM configuracoes")
  ]);

  const configs = Object.fromEntries(configsRes.rows.map(r => [r.chave, r.valor]));
  return {
    produtos: prodsRes.rows,
    variacoes: varsRes.rows,
    planos: planosRes.rows,
    configs
  };
}

async function buscarCliente(pool, telefone, nome) {
  if (telefone) {
    const limpo = String(telefone).replace(/\D/g, "");
    if (limpo.length >= 8) {
      const sufixo = limpo.slice(-8);
      const r = await pool.query("SELECT id, nome, telefone, cpf FROM clientes WHERE regexp_replace(telefone, '\\D', '', 'g') LIKE $1 LIMIT 1", [`%${sufixo}`]);
      if (r.rows[0]) return r.rows[0];
    }
  }
  if (nome && String(nome).trim().length >= 3) {
    const r = await pool.query("SELECT id, nome, telefone, cpf FROM clientes WHERE LOWER(nome) LIKE $1 LIMIT 1", [`%${String(nome).trim().toLowerCase()}%`]);
    if (r.rows[0]) return r.rows[0];
  }
  return null;
}

function normalizarTexto(txt) {
  return String(txt || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Interpretador com correspondência semântica e catálogo inteligente (funciona 100% offline ou como fallback do Gemini)
function interpretarLocalmente(msg, catalogo, cliente) {
  const textoNorm = normalizarTexto(msg);
  const nomeNegocio = catalogo.configs.nome_estudio || "Gestão do Estúdio";
  const chavePix = catalogo.configs.chave_pix || "contato@estudio.com.br";

  // 1. Verificar se é pedido de plano/assinatura
  let planoIdentificado = null;
  let produtoPlano = null;

  for (const pl of catalogo.planos) {
    const nomePl = normalizarTexto(pl.nome);
    if (textoNorm.includes(nomePl)) {
      planoIdentificado = pl;
      break;
    }
  }

  // Verifica se citou modalidade/produto de plano (tipo 'recorrente' como Ritbox, Garagem, Consultoria)
  for (const pr of catalogo.produtos.filter(p => p.tipo === "recorrente")) {
    const nomePr = normalizarTexto(pr.nome);
    if (textoNorm.includes(nomePr) || (nomePr.includes("ritbox") && textoNorm.includes("ritbox")) || (nomePr.includes("garagem") && textoNorm.includes("garagem"))) {
      produtoPlano = pr;
      break;
    }
  }

  if (planoIdentificado || produtoPlano || textoNorm.includes("plano") || textoNorm.includes("assinar") || textoNorm.includes("matricula") || textoNorm.includes("mensalidade")) {
    const pl = planoIdentificado || catalogo.planos[0];
    const pr = produtoPlano || catalogo.produtos.find(p => p.tipo === "recorrente") || catalogo.produtos[0];
    const baseValor = pr ? Number(pr.valor || 0) : 100;
    const desconto = pl ? Number(pl.desconto_percentual || 0) : 0;
    const meses = pl ? Number(pl.meses || 1) : 1;
    const valorMes = baseValor * (1 - desconto / 100);
    const total = pl && pl.valor_fixo ? Number(pl.valor_fixo) : (valorMes * meses);

    const saudacao = cliente ? `Olá, ${cliente.nome.split(" ")[0]}!` : "Olá!";
    const resposta = `${saudacao} Que ótimo ter você conosco no *${nomeNegocio}*! 🙌\n\n` +
      `📋 *Resumo da Adesão:*\n` +
      `• Modalidade: *${pr ? pr.nome : "Modalidade Padrão"}*\n` +
      `• Plano: *${pl ? pl.nome : "Mensal"}* (${meses} ${meses > 1 ? "meses" : "mês"})\n` +
      `• Valor: *R$ ${total.toFixed(2).replace(".", ",")}* ${desconto > 0 ? `(${desconto}% de desconto)` : ""}\n\n` +
      `🔑 *Pagamento no PIX:*\n` +
      `Chave: \`${chavePix}\`\n\n` +
      `Envie o comprovante por aqui assim que efetuar o pagamento para confirmarmos sua vaga e liberarmos o acesso! Qualquer dúvida, estamos por aqui.`;

    return {
      tipo: "plano",
      itens: [{
        produto_id: pr ? pr.id : null,
        nome: `${pr ? pr.nome : "Serviço"} - Plano ${pl ? pl.nome : "Padrão"}`,
        quantidade: 1,
        preco_unitario: total,
        total
      }],
      plano_id: pl ? pl.id : null,
      produto_id: pr ? pr.id : null,
      valor_total: total,
      confianca: 0.94,
      resposta_sugerida: resposta
    };
  }

  // 2. Verificar pedidos de produtos físicos (loja, suplementos, acessórios)
  const itens = [];
  let valorTotal = 0;

  for (const pr of catalogo.produtos.filter(p => p.tipo === "avulso")) {
    const nomePr = normalizarTexto(pr.nome);
    const palavras = nomePr.split(" ").filter(w => w.length > 2);
    const match = textoNorm.includes(nomePr) || palavras.some(w => textoNorm.includes(w));

    if (match) {
      // Checar se pediu quantidade
      let qtd = 1;
      const regexQtd = new RegExp(`(\\d+)\\s*(?:unidades?|un|x|garrafas?|potes?)?\\s*(?:de\\s*)?${palavras[0] || nomePr}`, "i");
      const matchQtd = textoNorm.match(regexQtd);
      if (matchQtd && matchQtd[1]) {
        qtd = Math.max(1, parseInt(matchQtd[1], 10));
      }

      // Checa variação
      const varsDoProduto = catalogo.variacoes.filter(v => v.produto_id === pr.id);
      let varEscolhida = null;
      for (const v of varsDoProduto) {
        if (v.tamanho && textoNorm.includes(v.tamanho.toLowerCase())) {
          varEscolhida = v;
          break;
        }
        if (v.cor && textoNorm.includes(v.cor.toLowerCase())) {
          varEscolhida = v;
          break;
        }
      }
      if (!varEscolhida && varsDoProduto.length > 0) {
        varEscolhida = varsDoProduto[0];
      }

      const precoUnit = varEscolhida && varEscolhida.valor_final ? Number(varEscolhida.valor_final) : Number(pr.valor || 0);
      const subtotal = precoUnit * qtd;

      itens.push({
        produto_id: pr.id,
        variacao_id: varEscolhida ? varEscolhida.id : null,
        nome: `${pr.nome}${varEscolhida?.tamanho ? ` (${varEscolhida.tamanho})` : ""}${varEscolhida?.cor ? ` (${varEscolhida.cor})` : ""}`,
        quantidade: qtd,
        preco_unitario: precoUnit,
        total: subtotal
      });
      valorTotal += subtotal;
    }
  }

  if (itens.length > 0) {
    const saudacao = cliente ? `Olá, ${cliente.nome.split(" ")[0]}!` : "Olá!";
    const resumoItens = itens.map(i => `• ${i.quantidade}x *${i.nome}* — R$ ${i.total.toFixed(2).replace(".", ",")}`).join("\n");
    const resposta = `${saudacao} Seu pedido no *${nomeNegocio}* foi anotado! 🛒\n\n` +
      `📦 *Itens do Pedido:*\n${resumoItens}\n\n` +
      `💰 *Total a pagar:* *R$ ${valorTotal.toFixed(2).replace(".", ",")}*\n\n` +
      `🔑 *Pagamento no PIX:*\nChave: \`${chavePix}\`\n\n` +
      `Já separamos seu pedido no balcão! Envie o comprovante por aqui para confirmarmos a retirada.`;

    return {
      tipo: "produto",
      itens,
      plano_id: null,
      produto_id: itens[0].produto_id,
      valor_total: valorTotal,
      confianca: 0.95,
      resposta_sugerida: resposta
    };
  }

  // 3. Dúvida ou mensagem geral
  const saudacao = cliente ? `Olá, ${cliente.nome.split(" ")[0]}!` : "Olá!";
  const modalidades = catalogo.produtos.filter(p => p.tipo === "recorrente").map(p => `• *${p.nome}* (a partir de R$ ${Number(p.valor || 0).toFixed(2).replace(".", ",")}/mês)`).join("\n");
  const resposta = `${saudacao} Obrigado pela mensagem! É um prazer falar com você no *${nomeNegocio}*. 😊\n\n` +
    `Aqui estão nossos serviços e modalidades principais:\n${modalidades || "• Musculação / Funcional / Planos"}\n\n` +
    `Para assinar ou pedir suplementos e roupas, basta mandar sua mensagem informando o que gostaria e preparamos seu pedido na hora!`;

  return {
    tipo: "duvida",
    itens: [],
    plano_id: null,
    produto_id: null,
    valor_total: 0,
    confianca: 0.75,
    resposta_sugerida: resposta
  };
}

async function interpretarComGemini(msg, catalogo, cliente) {
  if (!process.env.GEMINI_API_KEY) return null;
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });

    const catalogoSimplificado = {
      planos: catalogo.planos.map(p => ({ id: p.id, nome: p.nome, meses: p.meses, desconto: p.desconto_percentual })),
      produtos: catalogo.produtos.map(p => ({ id: p.id, nome: p.nome, tipo: p.tipo, valor: p.valor })),
      estudio: catalogo.configs.nome_estudio || "Gestão do Estúdio",
      chave_pix: catalogo.configs.chave_pix || "pix@estudio.com"
    };

    const prompt = `Você é o atendente de WhatsApp do estúdio "${catalogoSimplificado.estudio}".
Analise a seguinte mensagem recebida de um cliente e interprete a intenção de compra ou contratação:

Mensagem do cliente: "${msg}"
Cliente identificado: ${cliente ? cliente.nome : "Desconhecido"}

Catálogo disponível:
${JSON.stringify(catalogoSimplificado, null, 2)}

Responda EXCLUSIVAMENTE em formato JSON com o seguinte formato:
{
  "tipo": "plano" | "produto" | "duvida" | "outro",
  "itens": [
    { "produto_id": "uuid", "nome": "nome do item", "quantidade": 1, "preco_unitario": 0, "total": 0 }
  ],
  "plano_id": "uuid ou null",
  "produto_id": "uuid ou null",
  "valor_total": 0.00,
  "confianca": 0.95,
  "resposta_sugerida": "Mensagem amigável e profissional para enviar no WhatsApp com resumo do pedido e chave PIX"
}`;

    const res = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    if (res.text) {
      return JSON.parse(res.text);
    }
  } catch (e) {
    console.warn("[WhatsApp Service] Gemini fallback:", e.message);
  }
  return null;
}

async function processarMensagem(pool, { mensagem, telefone, cliente_nome }) {
  const catalogo = await obterCatalogo(pool);
  const cliente = await buscarCliente(pool, telefone, cliente_nome);

  let interpretacao = await interpretarComGemini(mensagem, catalogo, cliente);
  if (!interpretacao || !interpretacao.tipo) {
    interpretacao = interpretarLocalmente(mensagem, catalogo, cliente);
  }

  const tel = telefone || (cliente ? cliente.telefone : "Não informado");
  const nom = cliente_nome || (cliente ? cliente.nome : null);

  // Registra ou atualiza a conversa no chat ao vivo
  let conversaId = null;
  try {
    let conv = (await pool.query("SELECT * FROM conversas_whatsapp WHERE telefone=$1", [tel])).rows[0];
    if (!conv) {
      const cRes = await pool.query(
        "INSERT INTO conversas_whatsapp (telefone, cliente_nome, cliente_id, status, ultima_mensagem, ultima_interacao) VALUES ($1, $2, $3, 'bot', $4, now()) RETURNING id",
        [tel, nom, cliente ? cliente.id : null, mensagem]
      );
      conversaId = cRes.rows[0].id;
    } else {
      conversaId = conv.id;
      // Se não tiver vendedor atendendo e o cliente mandou pedido, status vira 'aguardando'
      const novoStatus = conv.status === 'em_atendimento' ? 'em_atendimento' : (interpretacao.tipo === 'duvida' ? 'bot' : 'aguardando');
      await pool.query("UPDATE conversas_whatsapp SET ultima_mensagem=$1, ultima_interacao=now(), status=$2 WHERE id=$3", [mensagem, novoStatus, conv.id]);
    }

    // Insere mensagem recebida
    await pool.query("INSERT INTO mensagens_whatsapp (conversa_id, remetente, texto) VALUES ($1, 'cliente', $2)", [conversaId, mensagem]);

    // Se o bot estiver ativo na conversa, insere resposta automática do bot
    if (!conv || conv.status !== 'em_atendimento') {
      await pool.query("INSERT INTO mensagens_whatsapp (conversa_id, remetente, texto) VALUES ($1, 'bot', $2)", [conversaId, interpretacao.resposta_sugerida]);
    }
  } catch (errConv) {
    console.warn("[WhatsApp Service] Aviso ao gravar conversa:", errConv.message);
  }

  const r = await pool.query(`
    INSERT INTO pedidos_whatsapp (
      telefone, cliente_nome, cliente_id, mensagem_original, tipo, dados_itens,
      plano_id, produto_id, valor_total, resposta_sugerida, situacao
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pendente')
    RETURNING *
  `, [
    tel,
    nom,
    cliente ? cliente.id : null,
    mensagem,
    interpretacao.tipo,
    JSON.stringify(interpretacao.itens || []),
    interpretacao.plano_id,
    interpretacao.produto_id,
    interpretacao.valor_total || 0,
    interpretacao.resposta_sugerida
  ]);

  return {
    ...r.rows[0],
    cliente,
    interpretacao
  };
}

async function confirmarPedido(pool, pedidoId, usuarioId) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const pedRes = await c.query("SELECT * FROM pedidos_whatsapp WHERE id=$1", [pedidoId]);
    const ped = pedRes.rows[0];
    if (!ped) throw new Error("Pedido não encontrado.");
    if (ped.situacao !== "pendente") throw new Error("Este pedido já foi " + ped.situacao);

    // Identificar forma de pagamento PIX
    const formaPixRes = await c.query("SELECT id FROM formas_pagamento WHERE LOWER(nome) LIKE '%pix%' LIMIT 1");
    const formaPixId = formaPixRes.rows[0]?.id || (await c.query("SELECT id FROM formas_pagamento LIMIT 1")).rows[0].id;
    const unidadeId = (await c.query("SELECT id FROM unidades WHERE ativa ORDER BY criado_em LIMIT 1")).rows[0].id;

    let vendaId = null;
    let assinaturaId = null;

    if (ped.tipo === "produto") {
      // Cria venda
      const vRes = await c.query(
        "INSERT INTO vendas (cliente_id, unidade_id, vendedor_id, criado_por, data, subtotal, desconto, total, situacao, observacao) VALUES ($1, $2, $3, $3, current_date, $4, 0, $4, 'concluida', 'Pedido via WhatsApp') RETURNING id",
        [ped.cliente_id, unidadeId, usuarioId, ped.valor_total]
      );
      vendaId = vRes.rows[0].id;

      // Itens da venda
      const itens = Array.isArray(ped.dados_itens) ? ped.dados_itens : JSON.parse(ped.dados_itens || "[]");
      for (const item of itens) {
        await c.query(
          "INSERT INTO venda_itens (venda_id, produto_id, variacao_id, quantidade, preco_unitario, subtotal) VALUES ($1, $2, $3, $4, $5, $6)",
          [vendaId, item.produto_id, item.variacao_id || null, item.quantidade || 1, item.preco_unitario, item.total]
        );
        // Atualiza estoque se tiver variacao
        if (item.variacao_id) {
          await c.query("UPDATE produto_variacoes SET estoque = GREATEST(0, estoque - $1) WHERE id=$2", [item.quantidade || 1, item.variacao_id]);
        }
      }

      // Registra pagamento
      await c.query(
        "INSERT INTO pagamentos (venda_id, unidade_id, forma_pagamento_id, valor, vencimento, data_pagamento, situacao, taxa, juros, recebido_por, observacao) VALUES ($1, $2, $3, $4, current_date, current_date, 'pago', 0, 0, $5, 'Pago via WhatsApp (PIX)')",
        [vendaId, unidadeId, formaPixId, ped.valor_total, usuarioId]
      );
    } else if (ped.tipo === "plano") {
      // Se não tiver cliente_id cadastrado, busca ou cria cliente rápido
      let cliId = ped.cliente_id;
      if (!cliId) {
        const novoCli = await c.query(
          "INSERT INTO clientes (nome, telefone, unidade_id, criado_por) VALUES ($1, $2, $3, $4) RETURNING id",
          [ped.cliente_nome || "Cliente WhatsApp", ped.telefone || "(00) 00000-0000", unidadeId, usuarioId]
        );
        cliId = novoCli.rows[0].id;
      }

      // Assinatura de plano
      const assRes = await c.query(
        "INSERT INTO assinaturas (cliente_id, produto_id, plano_id, unidade_id, inicio, vencimento, valor_cheio, desconto_plano, desconto_manual, valor_final, situacao, criado_por) VALUES ($1, $2, $3, $4, current_date, current_date + interval '30 days', $5, 0, 0, $5, 'ativa', $6) RETURNING id",
        [cliId, ped.produto_id, ped.plano_id, unidadeId, ped.valor_total, usuarioId]
      );
      assinaturaId = assRes.rows[0].id;

      await c.query(
        "INSERT INTO pagamentos (assinatura_id, unidade_id, forma_pagamento_id, valor, vencimento, data_pagamento, situacao, taxa, juros, recebido_por, observacao) VALUES ($1, $2, $3, $4, current_date, current_date, 'pago', 0, 0, $5, 'Pago via WhatsApp (PIX)')",
        [assinaturaId, unidadeId, formaPixId, ped.valor_total, usuarioId]
      );
    }

    // Atualiza status do pedido
    await c.query(
      "UPDATE pedidos_whatsapp SET situacao='confirmado', confirmado_em=now(), confirmado_por=$1, venda_id=$2, assinatura_id=$3 WHERE id=$4",
      [usuarioId, vendaId, assinaturaId, pedidoId]
    );

    await c.query("COMMIT");
    return { ok: true, vendaId, assinaturaId, pedidoId };
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}

module.exports = {
  obterCatalogo,
  buscarCliente,
  processarMensagem,
  confirmarPedido
};
