// Modulo de Automacao WhatsApp, Atendimento ao Vivo e Interpretacao de Pedidos
async function telaWhatsApp() {
  const container = $('#tela');
  const isAdmin = perfilAdmin();

  container.innerHTML = `
    <div class="cabecalho-tela">
      <div>
        <h2>${ic('whats')} Central de Atendimento & Pedidos WhatsApp</h2>
        <p class="mudo">Atendimento ao vivo, interpretação automática de pedidos com IA e controle de vendedores.</p>
      </div>
      <div class="acoes-cabecalho">
        <button class="secundario" id="btn-atualizar-tudo">${ic('busca')} Atualizar</button>
      </div>
    </div>

    <div class="abas-whatsapp" style="display:flex;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--borda);flex-wrap:wrap;">
      <button class="aba-btn ativo" data-aba="chat">💬 Atendimento ao Vivo <span id="badge-chat" class="badge-contador">0</span></button>
      <button class="aba-btn" data-aba="fila">📋 Fila de Pedidos <span id="badge-pedidos" class="badge-contador">0</span></button>
      <button class="aba-btn" data-aba="simulador">🧪 Testador de Mensagens IA</button>
      ${isAdmin ? '<button class="aba-btn" data-aba="config">⚙️ Configurações & Webhook (Admin)</button>' : ''}
    </div>

    <!-- ABA 1: CHAT AO VIVO / INBOX DO VENDEDOR -->
    <div id="aba-conteudo-chat" class="aba-conteudo">
      <div class="grade-chat" style="display:grid;grid-template-columns:320px 1fr;gap:16px;min-height:550px;border:1px solid var(--borda);border-radius:8px;overflow:hidden;background:var(--fundo-card);">
        
        <!-- Lista de Conversas -->
        <div style="border-right:1px solid var(--borda);display:flex;flex-direction:column;background:var(--fundo);">
          <div style="padding:12px;border-bottom:1px solid var(--borda);">
            <input type="text" id="filtro-conversas" placeholder="Buscar cliente ou telefone…" style="width:100%;font-size:13px;padding:8px;border-radius:6px;border:1px solid var(--borda);">
          </div>
          <div id="lista-conversas" style="flex:1;overflow-y:auto;padding:4px 0;">
            <p class="mudo pequeno" style="text-align:center;padding:20px;">Carregando conversas…</p>
          </div>
        </div>

        <!-- Janela de Chat Aberto -->
        <div id="chat-ativo-painel" style="display:flex;flex-direction:column;background:var(--fundo-card);">
          <div id="chat-selecione" class="mudo" style="text-align:center;margin:auto;padding:40px;">
            <div style="font-size:42px;margin-bottom:12px;">💬</div>
            <b>Selecione uma conversa ao lado</b>
            <p class="pequeno">Veja o histórico de mensagens, assuma o atendimento ou converse com o cliente em tempo real.</p>
          </div>
          <div id="chat-conteudo" class="escondido" style="display:flex;flex-direction:column;height:100%;">
            <!-- Header do Chat -->
            <div id="chat-header" style="padding:12px 16px;border-bottom:1px solid var(--borda);display:flex;justify-content:space-between;align-items:center;background:var(--fundo);"></div>
            <!-- Historico de Mensagens -->
            <div id="chat-mensagens" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:var(--fundo-destaque, rgba(0,0,0,0.02));"></div>
            <!-- Barra de Acoes e Envio -->
            <div id="chat-envio" style="padding:12px 16px;border-top:1px solid var(--borda);background:var(--fundo);"></div>
          </div>
        </div>

      </div>
    </div>

    <!-- ABA 2: FILA DE PEDIDOS -->
    <div id="aba-conteudo-fila" class="aba-conteudo escondido">
      <div class="cartao">
        <h3>Pedidos Recebidos via WhatsApp</h3>
        <p class="mudo pequeno">Histórico de pedidos interpretados automaticamente pela IA prontos para faturamento.</p>
        <div id="tabela-pedidos" style="margin-top:14px;">Carregando pedidos…</div>
      </div>
    </div>

    <!-- ABA 3: SIMULADOR DE MENSAGENS -->
    <div id="aba-conteudo-simulador" class="aba-conteudo escondido">
      <div class="grade-dupla" style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div class="cartao">
          <h3>Simular Mensagem de Cliente</h3>
          <p class="mudo pequeno">Teste como a IA do sistema interpreta qualquer mensagem e cruza com os produtos e planos:</p>
          
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 14px;">
            <button type="button" class="chip-exemplo" data-exemplo="produto">🛒 "Quero 2 garrafas de água e 1 whey 900g, pago no PIX"</button>
            <button type="button" class="chip-exemplo" data-exemplo="plano">📋 "Olá, quero fechar o plano trimestral de Ritbox"</button>
            <button type="button" class="chip-exemplo" data-exemplo="duvida">❓ "Qual o valor da Consultoria e quais planos vocês têm?"</button>
          </div>

          <form id="form-interpretar">
            <div style="margin-bottom:12px;">
              <label>Nome do Cliente (opcional)</label>
              <input type="text" id="sim-nome" placeholder="Ex.: Marcelo Pinto">
            </div>
            <div style="margin-bottom:12px;">
              <label>Telefone / WhatsApp (opcional)</label>
              <input type="text" id="sim-tel" placeholder="Ex.: (75) 99313-4676">
            </div>
            <div style="margin-bottom:14px;">
              <label>Mensagem recebida no WhatsApp</label>
              <textarea id="sim-msg" rows="4" required style="width:100%;font-size:14px;padding:10px;border-radius:6px;border:1px solid var(--borda);background:var(--fundo);" placeholder="Ex: Gostaria de assinar o plano trimestral de Ritbox"></textarea>
            </div>
            <button type="submit" class="destaque" style="width:100%;padding:12px;font-size:15px;display:flex;align-items:center;justify-content:center;gap:8px;">
              ${ic('whats')} Interpretar Mensagem com IA
            </button>
          </form>
        </div>

        <div class="cartao" id="painel-resultado" style="min-height:350px;">
          <h3>Interpretação & Pedido Gerado</h3>
          <div id="resultado-vazio" class="mudo" style="text-align:center;padding:40px 10px;">
            <div style="font-size:36px;margin-bottom:10px;">🤖</div>
            <p>Envie uma mensagem ao lado para ver a IA identificar o cliente, os produtos/planos do catálogo, calcular o valor e gerar a resposta automática do WhatsApp.</p>
          </div>
          <div id="resultado-detalhes" class="escondido"></div>
        </div>
      </div>
    </div>

    <!-- ABA 4: CONFIGURAÇÕES & WEBHOOK (RESTRITO AO ADMIN) -->
    ${isAdmin ? `
    <div id="aba-conteudo-config" class="aba-conteudo escondido">
      <div class="cartao" style="max-width:700px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span style="background:#fee2e2;color:#991b1b;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;">🔒 ACESSO DO ADMINISTRADOR</span>
          <h3>Configurações do WhatsApp & Webhook</h3>
        </div>
        <p class="mudo pequeno">Defina a chave PIX, o número comercial e obtenha a URL de integração com APIs de WhatsApp (Evolution API, Z-API, Meta Cloud API).</p>
        
        <form id="form-config-whats" style="margin-top:16px;">
          <div style="margin-bottom:14px;">
            <label>Chave PIX do Estúdio</label>
            <input type="text" id="cfg-pix" placeholder="Ex.: CNPJ, e-mail ou telefone para receber os pagamentos">
            <span class="mudo pequeno">Enviada automaticamente nas mensagens de fechamento do pedido.</span>
          </div>

          <div style="margin-bottom:14px;">
            <label>WhatsApp Comercial de Atendimento</label>
            <input type="text" id="cfg-whats" placeholder="Ex.: 5575999999999">
          </div>

          <div style="margin-bottom:18px;">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="checkbox" id="cfg-auto" style="width:18px;height:18px;">
              <span><b>Lançamento Automático:</b> Faturar a venda automaticamente assim que confirmada pelo cliente</span>
            </label>
          </div>

          <div style="background:var(--fundo-destaque, rgba(31, 111, 92, 0.08));padding:14px;border-radius:8px;margin-bottom:18px;border:1px solid var(--borda);">
          <div style="background:var(--fundo-destaque, rgba(31, 111, 92, 0.08));padding:16px;border-radius:8px;margin-bottom:20px;border:1px solid var(--borda);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <b style="font-size:14px;display:flex;align-items:center;gap:6px;">📡 URL de Webhook do seu Estúdio</b>
              <button type="button" class="secundario pequeno" id="btn-copiar-webhook" style="font-weight:600;">📋 Copiar URL</button>
            </div>
            <p class="pequeno mudo" style="margin-bottom:8px;">Cole esta URL no painel do seu provedor de WhatsApp para receber mensagens em tempo real:</p>
            <code id="cfg-webhook" style="display:block;padding:10px;background:var(--fundo);border:1px solid var(--borda);border-radius:4px;font-size:12px;word-break:break-all;color:var(--destaque);font-weight:600;"></code>
            
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:10px;border-top:1px dashed var(--borda);">
              <span class="pequeno mudo">Token de Verificação (Meta Cloud): <b id="cfg-token-txt" style="color:inherit;">estudio-whatsapp-token</b></span>
              <div style="display:flex;gap:8px;">
                <button type="button" class="secundario pequeno" id="btn-copiar-token">Copiar Token</button>
                <button type="button" class="destaque pequeno" id="btn-testar-webhook">⚡ Testar Webhook Agora</button>
              </div>
            </div>
            <div id="resultado-teste-webhook" class="escondido" style="margin-top:10px;padding:8px 12px;border-radius:6px;font-size:12px;"></div>
          </div>

          <!-- GUIA PASSO A PASSO DOS PROVEDORES -->
          <div style="border:1px solid var(--borda);border-radius:8px;padding:16px;margin-bottom:20px;background:var(--fundo);">
            <h4 style="margin:0 0 8px;display:flex;align-items:center;gap:6px;">
              📖 Tutorial Passo a Passo: Como Conectar seu Provedor
            </h4>
            <p class="pequeno mudo" style="margin-bottom:14px;">Escolha o provedor de WhatsApp que você utiliza no estúdio para ver o tutorial com as configurações exatas:</p>

            <div class="abas-provedores" style="display:flex;gap:6px;margin-bottom:14px;border-bottom:1px solid var(--borda);padding-bottom:10px;flex-wrap:wrap;">
              <button type="button" class="aba-prov-btn ativo" data-prov="evolution" style="padding:6px 12px;border-radius:6px;border:1px solid var(--borda);cursor:pointer;background:var(--fundo-card);font-size:12px;font-weight:600;">🟢 Evolution API</button>
              <button type="button" class="aba-prov-btn" data-prov="zapi" style="padding:6px 12px;border-radius:6px;border:1px solid var(--borda);cursor:pointer;background:var(--fundo-card);font-size:12px;font-weight:600;">🔵 Z-API</button>
              <button type="button" class="aba-prov-btn" data-prov="meta" style="padding:6px 12px;border-radius:6px;border:1px solid var(--borda);cursor:pointer;background:var(--fundo-card);font-size:12px;font-weight:600;">🟣 Meta Cloud API</button>
              <button type="button" class="aba-prov-btn" data-prov="n8n" style="padding:6px 12px;border-radius:6px;border:1px solid var(--borda);cursor:pointer;background:var(--fundo-card);font-size:12px;font-weight:600;">🟠 N8N / Genérico</button>
            </div>

            <!-- PROVEDOR: EVOLUTION API -->
            <div id="prov-evolution" class="prov-conteudo" style="font-size:13px;line-height:1.6;">
              <div style="background:rgba(34, 197, 94, 0.08);padding:10px 12px;border-radius:6px;margin-bottom:10px;border-left:3px solid #22c55e;">
                <b>Evolution API:</b> Provedor open-source/hospedado mais popular, ideal para usar com QR Code no chip do estúdio.
              </div>
              <ol style="padding-left:20px;margin:0 0 10px;">
                <li>Abra o painel da sua <b>Evolution API</b> (ou acesse a rota <code>/webhook/set/{sua-instancia}</code>);</li>
                <li>No menu da instância, clique na aba <b>"Webhooks"</b>;</li>
                <li>Ative a opção <b>"Habilitar Webhook" (Enabled: ON)</b>;</li>
                <li>No campo <b>URL do Webhook</b>, cole a URL copiada acima;</li>
                <li>Na lista de eventos monitorados, marque <b><code>MESSAGES_UPSERT</code></b> (disparado a cada mensagem que o cliente envia);</li>
                <li>Marque também a opção <b>Webhook por Instância</b> ou <b>Global</b> e clique em <b>Salvar</b>;</li>
                <li>Conecte o WhatsApp do estúdio escaneando o QR Code na aba "Conexão".</li>
              </ol>
            </div>

            <!-- PROVEDOR: Z-API -->
            <div id="prov-zapi" class="prov-conteudo escondido" style="font-size:13px;line-height:1.6;">
              <div style="background:rgba(59, 130, 246, 0.08);padding:10px 12px;border-radius:6px;margin-bottom:10px;border-left:3px solid #3b82f6;">
                <b>Z-API:</b> Plataforma comercial brasileira mais estável e fácil de configurar para WhatsApp comercial.
              </div>
              <ol style="padding-left:20px;margin:0 0 10px;">
                <li>Faça login no painel da <b>Z-API</b> (<code>app.z-api.io</code>);</li>
                <li>Entre na sua <b>Instância</b> ativa e clique em <b>"Webhooks"</b> no menu lateral;</li>
                <li>Procure o campo <b>"Ao receber mensagem" (on-message-received)</b>;</li>
                <li>Cole a <b>URL do Webhook do seu estúdio</b> no campo;</li>
                <li>Marque a caixinha <b>Ativo</b> e clique em <b>Salvar Webhook</b>;</li>
                <li>Envie uma mensagem de teste para o número do WhatsApp da empresa para ver a mensagem ser interpretada instantaneamente na Central de Atendimento!</li>
              </ol>
            </div>

            <!-- PROVEDOR: META CLOUD API -->
            <div id="prov-meta" class="prov-conteudo escondido" style="font-size:13px;line-height:1.6;">
              <div style="background:rgba(168, 85, 247, 0.08);padding:10px 12px;border-radius:6px;margin-bottom:10px;border-left:3px solid #a855f7;">
                <b>Meta Cloud API:</b> API Oficial do WhatsApp Business (sem risco de bloqueio de chip).
              </div>
              <ol style="padding-left:20px;margin:0 0 10px;">
                <li>Acesse o portal <b>Meta for Developers</b> (<code>developers.facebook.com</code>) e selecione seu Aplicativo;</li>
                <li>No menu lateral, vá em <b>WhatsApp &gt; Configuração</b>;</li>
                <li>Na seção <b>Webhook</b>, clique no botão <b>Editar</b>;</li>
                <li>No campo <b>URL de Retorno</b>, cole a URL copiada acima;</li>
                <li>No campo <b>Token de Verificação</b>, cole <code>estudio-whatsapp-token</code>;</li>
                <li>Clique em <b>Verificar e Salvar</b> (o sistema responderá automaticamente validando a assinatura);</li>
                <li>Na tabela de campos do Webhook, clique em <b>Gerenciar</b> e assine o evento <b><code>messages</code></b>.</li>
              </ol>
            </div>

            <!-- PROVEDOR: N8N / GENÉRICO -->
            <div id="prov-n8n" class="prov-conteudo escondido" style="font-size:13px;line-height:1.6;">
              <div style="background:rgba(249, 115, 22, 0.08);padding:10px 12px;border-radius:6px;margin-bottom:10px;border-left:3px solid #f97316;">
                <b>N8N / Make / Baileys / Custom:</b> Conecte qualquer fluxo automatizado via requisição HTTP POST.
              </div>
              <p class="pequeno" style="margin:6px 0;">Configure o nó <b>HTTP Request</b> do N8N ou ferramenta similar:</p>
              <ul style="padding-left:20px;margin:0 0 10px;">
                <li><b>Método:</b> <code>POST</code></li>
                <li><b>URL:</b> URL do Webhook acima</li>
                <li><b>Body / JSON:</b>
                  <pre style="background:var(--fundo-card);padding:8px;border-radius:4px;border:1px solid var(--borda);font-size:11px;margin:6px 0;">{
  "sender": "5575993134676",
  "pushName": "Nome do Cliente",
  "message": "Quero comprar 2 garrafas de água e 1 whey"
}</pre>
                </li>
              </ul>
            </div>
          </div>

          <button type="submit" class="destaque" style="padding:12px 20px;font-size:14px;font-weight:600;">Salvar Configurações</button>
        </form>
      </div>
    </div>
    ` : ''}
  `;

  // Controle de Abas
  container.querySelectorAll('.aba-btn').forEach(btn => {
    btn.onclick = () => {
      container.querySelectorAll('.aba-btn').forEach(b => b.classList.remove('ativo'));
      container.querySelectorAll('.aba-conteudo').forEach(c => c.classList.add('escondido'));
      btn.classList.add('ativo');
      const aba = btn.dataset.aba;
      const elAba = $(`#aba-conteudo-${aba}`);
      if (elAba) elAba.classList.remove('escondido');
      if (aba === 'chat') carregarConversas();
      if (aba === 'fila') carregarFilaPedidos();
      if (aba === 'config' && isAdmin) carregarConfigWhatsApp();
    };
  });

  // Atualizar tudo
  $('#btn-atualizar-tudo').onclick = () => {
    carregarConversas();
    carregarFilaPedidos();
    avisar('Dados do WhatsApp atualizados');
  };

  // Exemplos rápidos do simulador
  const exemplos = {
    produto: {
      msg: 'Oi, gostaria de comprar 2 garrafas de água e um whey protein 900g de chocolate, pago no pix. Sou o Marcelo Pinto.',
      nome: 'Marcelo Pinto',
      tel: '(75) 99313-4676'
    },
    plano: {
      msg: 'Olá, quero fechar o plano trimestral de Ritbox',
      nome: 'Vanessa Araújo',
      tel: '(75) 92143-5571'
    },
    duvida: {
      msg: 'Boa tarde, quanto custa a mensalidade e quais serviços vocês oferecem?',
      nome: '',
      tel: ''
    }
  };

  container.querySelectorAll('.chip-exemplo').forEach(btn => {
    btn.onclick = () => {
      const ex = exemplos[btn.dataset.exemplo];
      if (ex) {
        $('#sim-msg').value = ex.msg;
        $('#sim-nome').value = ex.nome;
        $('#sim-tel').value = ex.tel;
      }
    };
  });

  // Submissão do simulador
  $('#form-interpretar').onsubmit = async (e) => {
    e.preventDefault();
    const msg = $('#sim-msg').value.trim();
    if (!msg) return;

    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Interpretando mensagem...';

    try {
      const resp = await post('/api/whatsapp/interpretar', {
        mensagem: msg,
        cliente_nome: $('#sim-nome').value.trim(),
        telefone: $('#sim-tel').value.trim()
      });

      renderizarResultadoInterpretacao(resp);
      carregarConversas();
      avisar('Mensagem interpretada com sucesso!', 'sucesso');
    } catch (err) {
      avisar('Erro ao interpretar: ' + err.message, 'erro');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `${ic('whats')} Interpretar Mensagem com IA`;
    }
  };

  // Inicia carregando o chat
  carregarConversas();
  carregarFilaPedidos();
}

let conversaAtivaId = null;

async function carregarConversas() {
  const lista = $('#lista-conversas');
  if (!lista) return;

  try {
    const conversas = await get('/api/whatsapp/conversas');
    
    // Atualiza badge de conversas aguardando
    const aguardando = conversas.filter(c => c.status === 'aguardando').length;
    const badge = $('#badge-chat');
    if (badge) {
      badge.textContent = aguardando;
      badge.style.display = aguardando > 0 ? 'inline-block' : 'none';
    }

    if (!conversas || conversas.length === 0) {
      lista.innerHTML = '<p class="mudo pequeno" style="text-align:center;padding:24px;">Nenhuma conversa iniciada.</p>';
      return;
    }

    lista.innerHTML = conversas.map(c => {
      const hora = new Date(c.ultima_interacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const selecionada = c.id === conversaAtivaId ? 'background:var(--fundo-destaque, rgba(31, 111, 92, 0.12));border-left:3px solid var(--destaque);' : '';
      
      const badgeStatus = c.status === 'em_atendimento'
        ? `<span style="font-size:11px;background:#dcfce7;color:#166534;padding:2px 6px;border-radius:4px;font-weight:600;">👤 ${esc(c.atendente_nome || 'Vendedor')}</span>`
        : c.status === 'aguardando'
        ? `<span style="font-size:11px;background:#ffedd5;color:#9a3412;padding:2px 6px;border-radius:4px;font-weight:600;">⏳ Aguardando Vendedor</span>`
        : c.status === 'bot'
        ? `<span style="font-size:11px;background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;">🤖 IA / Bot</span>`
        : `<span style="font-size:11px;background:#f3f4f6;color:#6b7280;padding:2px 6px;border-radius:4px;">✔ Finalizado</span>`;

      return `
        <div class="item-conversa" data-id="${c.id}" style="padding:10px 12px;border-bottom:1px solid var(--borda);cursor:pointer;${selecionada}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <b style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;">${esc(c.cliente_nome || 'Cliente WhatsApp')}</b>
            <span class="mudo" style="font-size:11px;">${hora}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span class="mudo pequeno">${esc(c.telefone)}</span>
            ${badgeStatus}
          </div>
          <p class="mudo pequeno" style="margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(c.ultima_mensagem || '')}</p>
        </div>
      `;
    }).join('');

    lista.querySelectorAll('.item-conversa').forEach(item => {
      item.onclick = () => abrirConversa(item.dataset.id);
    });

  } catch (err) {
    lista.innerHTML = '<p class="erro pequeno" style="padding:12px;">Erro ao carregar conversas: ' + esc(err.message) + '</p>';
  }
}

async function abrirConversa(id) {
  conversaAtivaId = id;
  $('#chat-selecione').classList.add('escondido');
  const chatConteudo = $('#chat-conteudo');
  chatConteudo.classList.remove('escondido');

  // Atualiza seleção visual na lista
  carregarConversas();

  try {
    const { conversa, mensagens } = await get(`/api/whatsapp/conversas/${id}`);
    const usuarioAtual = estado.usuario;
    const souAtendente = conversa.atendente_id === usuarioAtual.id;

    // 1. Header do Chat
    const header = $('#chat-header');
    header.innerHTML = `
      <div>
        <b style="font-size:15px;display:flex;align-items:center;gap:6px;">
          ${esc(conversa.cliente_nome_db || conversa.cliente_nome || 'Cliente WhatsApp')}
          ${conversa.cliente_id ? '<span style="font-size:11px;background:#dcfce7;color:#166534;padding:2px 6px;border-radius:4px;">Cadastrado</span>' : '<span style="font-size:11px;background:#fee2e2;color:#991b1b;padding:2px 6px;border-radius:4px;">Novo Cliente</span>'}
        </b>
        <div class="mudo pequeno" style="display:flex;gap:8px;margin-top:2px;">
          <span>📱 ${esc(conversa.telefone)}</span>
          <span>·</span>
          <span>${conversa.status === 'em_atendimento' ? `👤 Atendido por: <b>${esc(conversa.atendente_nome)}</b>` : '🤖 Atendido pelo Bot IA'}</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        ${conversa.status !== 'em_atendimento' || !souAtendente ? `
          <button class="destaque pequeno" id="btn-assumir-chat" style="padding:6px 12px;display:flex;align-items:center;gap:4px;">
            👤 Assumir Atendimento
          </button>
        ` : `
          <button class="secundario pequeno" id="btn-finalizar-chat" style="padding:6px 12px;">
            ✔ Finalizar Atendimento
          </button>
        `}
        <a href="#/venda?cliente=${encodeURIComponent(conversa.cliente_nome_db || conversa.cliente_nome || '')}" class="secundario pequeno" style="padding:6px 10px;text-decoration:none;display:flex;align-items:center;gap:4px;">
          ${ic('venda')} Nova Venda
        </a>
        <a href="https://wa.me/${conversa.telefone.replace(/\D/g, '')}" target="_blank" class="secundario pequeno" style="padding:6px 8px;" title="Abrir no WhatsApp Web">
          ${ic('whats')}
        </a>
      </div>
    `;

    // 2. Mensagens do Chat
    const containerMsgs = $('#chat-mensagens');
    containerMsgs.innerHTML = mensagens.map(m => {
      const hora = new Date(m.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const ehCliente = m.remetente === 'cliente';
      const ehBot = m.remetente === 'bot';

      const alinhamento = ehCliente ? 'align-self:flex-start;' : 'align-self:flex-end;';
      const fundo = ehCliente 
        ? 'background:var(--fundo);border:1px solid var(--borda);color:inherit;' 
        : ehBot
        ? 'background:#fef3c7;border:1px solid #fde68a;color:#78350f;'
        : 'background:var(--destaque);color:#fff;';

      const autor = ehCliente ? (conversa.cliente_nome || 'Cliente') : ehBot ? '🤖 Assistente Virtual' : (m.autor_nome || 'Vendedor');

      return `
        <div style="max-width:70%;padding:10px 14px;border-radius:10px;${alinhamento}${fundo}box-shadow:0 1px 2px rgba(0,0,0,0.05);">
          <div style="font-size:11px;font-weight:700;margin-bottom:4px;opacity:0.85;">${esc(autor)}</div>
          <div style="font-size:13px;white-space:pre-wrap;line-height:1.4;">${esc(m.texto)}</div>
          <div style="font-size:10px;text-align:right;margin-top:4px;opacity:0.75;">${hora}</div>
        </div>
      `;
    }).join('');

    // Rola até o final das mensagens
    containerMsgs.scrollTop = containerMsgs.scrollHeight;

    // 3. Barra de Envio
    const envio = $('#chat-envio');
    envio.innerHTML = `
      <form id="form-enviar-chat" style="display:flex;gap:8px;">
        <input type="text" id="campo-msg-chat" placeholder="${conversa.status === 'em_atendimento' ? 'Digite uma mensagem para o cliente…' : 'Assuma o atendimento ou digite para responder como vendedor…'}" style="flex:1;padding:10px;border-radius:6px;border:1px solid var(--borda);background:var(--fundo);">
        <button type="submit" class="destaque" style="padding:10px 16px;display:flex;align-items:center;gap:6px;">
          Enviar
        </button>
      </form>
    `;

    // Eventos de Ação
    const btnAssumir = $('#btn-assumir-chat');
    if (btnAssumir) {
      btnAssumir.onclick = async () => {
        try {
          await post(`/api/whatsapp/conversas/${id}/assumir`);
          avisar(`Você assumiu o atendimento de ${conversa.cliente_nome || 'Cliente'}!`, 'sucesso');
          abrirConversa(id);
        } catch (e) {
          avisar('Erro: ' + e.message, 'erro');
        }
      };
    }

    const btnFinalizar = $('#btn-finalizar-chat');
    if (btnFinalizar) {
      btnFinalizar.onclick = async () => {
        try {
          await post(`/api/whatsapp/conversas/${id}/finalizar`);
          avisar('Atendimento finalizado com sucesso.');
          abrirConversa(id);
        } catch (e) {
          avisar('Erro: ' + e.message, 'erro');
        }
      };
    }

    $('#form-enviar-chat').onsubmit = async (e) => {
      e.preventDefault();
      const txt = $('#campo-msg-chat').value.trim();
      if (!txt) return;

      try {
        await post(`/api/whatsapp/conversas/${id}/enviar`, { texto: txt });
        $('#campo-msg-chat').value = '';
        abrirConversa(id);
      } catch (err) {
        avisar('Erro ao enviar: ' + err.message, 'erro');
      }
    };

  } catch (err) {
    avisar('Erro ao abrir conversa: ' + err.message, 'erro');
  }
}

function renderizarResultadoInterpretacao(dados) {
  $('#resultado-vazio').classList.add('escondido');
  const det = $('#resultado-detalhes');
  det.classList.remove('escondido');

  const tipoBadge = dados.tipo === 'produto' 
    ? '<span class="status-badge" style="background:#e0f2fe;color:#0369a1;padding:4px 8px;border-radius:4px;font-weight:600;">📦 Pedido de Produto</span>'
    : dados.tipo === 'plano'
    ? '<span class="status-badge" style="background:#fef3c7;color:#92400e;padding:4px 8px;border-radius:4px;font-weight:600;">📋 Adesão de Plano</span>'
    : '<span class="status-badge" style="background:#f3f4f6;color:#374151;padding:4px 8px;border-radius:4px;font-weight:600;">💬 Dúvida / Informações</span>';

  const clienteTexto = dados.cliente
    ? `<span style="color:#15803d;font-weight:600;">✅ ${esc(dados.cliente.nome)} (${esc(dados.cliente.telefone || 'Sem tel')})</span>`
    : `<span style="color:#6b7280;">Novo cliente (${esc(dados.cliente_nome || dados.telefone || 'Sem contato')})</span>`;

  const itens = Array.isArray(dados.dados_itens) ? dados.dados_itens : JSON.parse(dados.dados_itens || '[]');
  const itensHtml = itens.length > 0 ? `
    <table class="tabela" style="width:100%;font-size:13px;margin:8px 0;">
      <thead>
        <tr><th>Item</th><th style="text-align:center;">Qtd</th><th style="text-align:right;">Unit.</th><th style="text-align:right;">Subtotal</th></tr>
      </thead>
      <tbody>
        ${itens.map(it => `
          <tr>
            <td><b>${esc(it.nome)}</b></td>
            <td style="text-align:center;">${it.quantidade}</td>
            <td style="text-align:right;">R$ ${Number(it.preco_unitario).toFixed(2).replace('.', ',')}</td>
            <td style="text-align:right;"><b>R$ ${Number(it.total).toFixed(2).replace('.', ',')}</b></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '<p class="pequeno mudo">Nenhum item físico detalhado.</p>';

  det.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <div>${tipoBadge}</div>
      <div style="font-size:18px;font-weight:700;color:var(--destaque);">Total: R$ ${Number(dados.valor_total).toFixed(2).replace('.', ',')}</div>
    </div>

    <div style="background:var(--fundo);padding:10px;border-radius:6px;border:1px solid var(--borda);margin-bottom:12px;font-size:13px;">
      <b>Cliente:</b> ${clienteTexto}
    </div>

    <div style="margin-bottom:12px;">
      <b style="font-size:13px;">Itens Identificados no Catálogo:</b>
      ${itensHtml}
    </div>

    <div style="margin-bottom:16px;">
      <b style="font-size:13px;display:flex;justify-content:space-between;align-items:center;">
        <span>Resposta Pronta para o WhatsApp:</span>
        <button type="button" class="secundario pequeno" id="btn-copiar-resposta">Copiar</button>
      </b>
      <div id="texto-resposta" style="white-space:pre-wrap;background:var(--fundo);padding:10px;border-radius:6px;border:1px solid var(--borda);font-size:13px;margin-top:6px;max-height:160px;overflow-y:auto;font-family:inherit;">${esc(dados.resposta_sugerida || '')}</div>
    </div>

    <div style="display:flex;gap:10px;">
      <button class="destaque" id="btn-confirmar-venda-sim" style="flex:1;padding:10px;display:flex;align-items:center;justify-content:center;gap:6px;">
        ✅ Confirmar Pedido & Registrar Venda
      </button>
      <a href="https://wa.me/${(dados.telefone || '').replace(/\D/g, '')}?text=${encodeURIComponent(dados.resposta_sugerida || '')}" target="_blank" class="secundario" style="display:flex;align-items:center;gap:6px;text-decoration:none;padding:10px 14px;">
        ${ic('whats')} Enviar no WhatsApp
      </a>
    </div>
  `;

  $('#btn-copiar-resposta').onclick = () => {
    navigator.clipboard.writeText(dados.resposta_sugerida || '');
    avisar('Resposta copiada!');
  };

  $('#btn-confirmar-venda-sim').onclick = async () => {
    try {
      await post(`/api/whatsapp/pedidos/${dados.id}/confirmar`);
      avisar('Venda registrada com sucesso!', 'sucesso');
      carregarFilaPedidos();
      $('#btn-confirmar-venda-sim').disabled = true;
      $('#btn-confirmar-venda-sim').textContent = '✔ Pedido Faturado!';
    } catch (err) {
      avisar('Erro: ' + err.message, 'erro');
    }
  };
}

async function carregarFilaPedidos() {
  const container = $('#tabela-pedidos');
  if (!container) return;
  container.innerHTML = 'Carregando lista de pedidos…';

  try {
    const pedidos = await get('/api/whatsapp/pedidos');
    const pendentes = pedidos.filter(p => p.situacao === 'pendente').length;
    const badge = $('#badge-pedidos');
    if (badge) {
      badge.textContent = pendentes;
      badge.style.display = pendentes > 0 ? 'inline-block' : 'none';
    }

    if (!pedidos || pedidos.length === 0) {
      container.innerHTML = '<p class="mudo" style="text-align:center;padding:30px;">Nenhum pedido recebido via WhatsApp até o momento.</p>';
      return;
    }

    container.innerHTML = `
      <table class="tabela" style="width:100%;">
        <thead>
          <tr>
            <th>Data/Hora</th>
            <th>Cliente / WhatsApp</th>
            <th>Tipo</th>
            <th>Mensagem Recebida</th>
            <th>Valor</th>
            <th>Situação</th>
            <th style="text-align:right;">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${pedidos.map(p => {
            const itens = Array.isArray(p.dados_itens) ? p.dados_itens : JSON.parse(p.dados_itens || '[]');
            const itensResumo = itens.map(i => `${i.quantidade}x ${i.nome}`).join(', ');
            const dataFmt = new Date(p.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            
            const badgeCor = p.situacao === 'confirmado' ? 'background:#dcfce7;color:#166534;' : p.situacao === 'recusado' ? 'background:#fee2e2;color:#991b1b;' : 'background:#fef3c7;color:#92400e;';

            return `
              <tr>
                <td style="font-size:12px;white-space:nowrap;">${dataFmt}</td>
                <td>
                  <b>${esc(p.cliente_nome_db || p.cliente_nome || 'Cliente WhatsApp')}</b><br>
                  <span class="mudo pequeno">${esc(p.telefone)}</span>
                </td>
                <td><span style="font-size:11px;padding:2px 6px;border-radius:4px;${badgeCor}"><b>${esc(p.tipo)}</b></span></td>
                <td style="max-width:240px;font-size:12px;" title="${esc(p.mensagem_original)}">
                  "${esc(p.mensagem_original)}"
                  ${itensResumo ? `<br><span class="mudo">📦 ${esc(itensResumo)}</span>` : ''}
                </td>
                <td><b>R$ ${Number(p.valor_total).toFixed(2).replace('.', ',')}</b></td>
                <td><span style="font-size:11px;padding:3px 8px;border-radius:4px;${badgeCor};font-weight:600;">${esc(p.situacao)}</span></td>
                <td style="text-align:right;white-space:nowrap;">
                  ${p.situacao === 'pendente' ? `
                    <button class="destaque pequeno btn-acao-confirmar" data-id="${p.id}" title="Confirmar e Lançar Venda">✅ Faturar</button>
                    <button class="secundario pequeno btn-acao-recusar" data-id="${p.id}" title="Recusar">✕</button>
                  ` : `
                    <span class="mudo pequeno">Processado</span>
                  `}
                  <a href="https://wa.me/${p.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(p.resposta_sugerida || '')}" target="_blank" class="secundario pequeno" title="Abrir no WhatsApp">💬</a>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    container.querySelectorAll('.btn-acao-confirmar').forEach(btn => {
      btn.onclick = async () => {
        try {
          await post(`/api/whatsapp/pedidos/${btn.dataset.id}/confirmar`);
          avisar('Pedido confirmado e faturado!', 'sucesso');
          carregarFilaPedidos();
        } catch (e) {
          avisar('Erro: ' + e.message, 'erro');
        }
      };
    });

    container.querySelectorAll('.btn-acao-recusar').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Deseja recusar este pedido?')) return;
        try {
          await post(`/api/whatsapp/pedidos/${btn.dataset.id}/recusar`);
          avisar('Pedido recusado.');
          carregarFilaPedidos();
        } catch (e) {
          avisar('Erro: ' + e.message, 'erro');
        }
      };
    });

  } catch (err) {
    container.innerHTML = '<p class="erro">Erro ao carregar pedidos: ' + esc(err.message) + '</p>';
  }
}

async function carregarConfigWhatsApp() {
  const form = $('#form-config-whats');
  if (!form) return;

  try {
    const cfg = await get('/api/whatsapp/config');
    $('#cfg-pix').value = cfg.chave_pix || '';
    $('#cfg-whats').value = cfg.whatsapp_comercial || '';
    $('#cfg-auto').checked = !!cfg.whatsapp_auto;
    const webhookUrl = cfg.webhook_url || `${location.origin}/api/webhook/whatsapp`;
    $('#cfg-webhook').textContent = webhookUrl;
    $('#cfg-token-txt').textContent = cfg.webhook_token || 'estudio-whatsapp-token';

    // 1. Alternância entre tutoriais de provedores
    document.querySelectorAll('.aba-prov-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.aba-prov-btn').forEach(b => {
          b.classList.remove('ativo');
          b.style.background = 'var(--fundo-card)';
        });
        document.querySelectorAll('.prov-conteudo').forEach(c => c.classList.add('escondido'));
        btn.classList.add('ativo');
        btn.style.background = 'var(--fundo-destaque, rgba(31, 111, 92, 0.15))';
        const prov = btn.dataset.prov;
        $(`#prov-${prov}`).classList.remove('escondido');
      };
    });

    // 2. Copiar URL do Webhook
    $('#btn-copiar-webhook').onclick = () => {
      navigator.clipboard.writeText(webhookUrl);
      avisar('URL do Webhook copiada para a área de transferência!', 'sucesso');
    };

    // 3. Copiar Token
    $('#btn-copiar-token').onclick = () => {
      navigator.clipboard.writeText(cfg.webhook_token || 'estudio-whatsapp-token');
      avisar('Token copiado!');
    };

    // 4. Testar Webhook ao vivo
    $('#btn-testar-webhook').onclick = async () => {
      const box = $('#resultado-teste-webhook');
      box.classList.remove('escondido');
      box.style.background = '#fef3c7';
      box.style.color = '#92400e';
      box.innerHTML = 'Enviando payload de teste simulando mensagem de cliente via webhook…';

      try {
        const payloadTeste = {
          sender: "5575993134676",
          pushName: "Marcelo Pinto (Teste Webhook)",
          message: "Oi, gostaria de comprar 2 garrafas de água no balcão e pagar no PIX"
        };

        const res = await fetch('/api/webhook/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadTeste)
        });

        const j = await res.json();
        if (res.ok && j.status === 'success') {
          box.style.background = '#dcfce7';
          box.style.color = '#166534';
          box.innerHTML = `
            <b>✅ Webhook funcionando perfeitamente!</b><br>
            • Resposta do Servidor: <code>HTTP 200 OK</code><br>
            • Pedido Gerado: <code>#${esc(j.pedido_id?.slice(0, 8))}</code><br>
            • A conversa já apareceu na aba <b>"Atendimento ao Vivo"</b> e na <b>"Fila de Pedidos"</b>!
          `;
          carregarConversas();
          carregarFilaPedidos();
        } else {
          box.style.background = '#fee2e2';
          box.style.color = '#991b1b';
          box.innerHTML = `Erro no webhook: ${esc(j.motivo || 'Resposta inesperada')}`;
        }
      } catch (err) {
        box.style.background = '#fee2e2';
        box.style.color = '#991b1b';
        box.innerHTML = `Erro ao disparar webhook de teste: ${esc(err.message)}`;
      }
    };

    form.onsubmit = async (e) => {
      e.preventDefault();
      try {
        await post('/api/whatsapp/config', {
          chave_pix: $('#cfg-pix').value.trim(),
          whatsapp_comercial: $('#cfg-whats').value.trim(),
          whatsapp_auto: $('#cfg-auto').checked
        });
        avisar('Configurações salvas pelo administrador!', 'sucesso');
      } catch (err) {
        avisar('Erro ao salvar: ' + err.message, 'erro');
      }
    };
  } catch (e) {
    avisar('Erro ao carregar configurações: ' + e.message, 'erro');
  }
}
