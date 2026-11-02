// Modulo de Agenda, Turmas e Remarcacao de Horarios com Aviso WhatsApp
async function telaAgenda() {
  const container = $('#tela');
  let dataAtual = new Date().toISOString().slice(0, 10);

  container.innerHTML = `
    <div class="cabecalho-tela">
      <div>
        <h2>${ic('cal')} Agenda & Gestão de Turmas</h2>
        <p class="mudo">Controle de horários de aulas, turmas de alunos, atendimentos individuais e avisos de remarcação.</p>
      </div>
      <div class="acoes-cabecalho" style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="destaque" id="btn-novo-agendamento">${ic('plus')} Novo Agendamento</button>
        <button class="secundario" id="btn-nova-turma">${ic('mais')} Nova Turma</button>
      </div>
    </div>

    <!-- Barra de Navegacao por Data -->
    <div class="cartao" style="margin-bottom:16px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <button class="secundario pequeno" id="btn-data-ant">‹ Anterior</button>
        <input type="date" id="seletor-data-agenda" value="${dataAtual}" style="padding:6px 10px;border-radius:6px;border:1px solid var(--borda);font-weight:600;font-size:14px;background:var(--fundo);">
        <button class="secundario pequeno" id="btn-data-prox">Próximo ›</button>
        <button class="secundario pequeno" id="btn-data-hoje">Hoje</button>
      </div>
      <div id="data-extenso" style="font-weight:600;color:var(--destaque);font-size:15px;"></div>
    </div>

    <!-- Indicadores Rápidos do Dia -->
    <div class="grade-tres" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin-bottom:18px;">
      <div class="cartao" style="padding:14px;">
        <span class="mudo pequeno">Turmas Programadas</span>
        <div id="ind-turmas" style="font-size:24px;font-weight:700;margin-top:4px;">0</div>
      </div>
      <div class="cartao" style="padding:14px;">
        <span class="mudo pequeno">Alunos Agendados Hoje</span>
        <div id="ind-alunos" style="font-size:24px;font-weight:700;color:var(--destaque);margin-top:4px;">0</div>
      </div>
      <div class="cartao" style="padding:14px;">
        <span class="mudo pequeno">Atendimentos Individuais</span>
        <div id="ind-individuais" style="font-size:24px;font-weight:700;margin-top:4px;">0</div>
      </div>
    </div>

    <!-- Abas da Agenda -->
    <div class="abas-agenda" style="display:flex;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--borda);">
      <button class="aba-btn ativo" data-aba="dia">📅 Grade do Dia</button>
      <button class="aba-btn" data-aba="turmas">👥 Todas as Turmas</button>
    </div>

    <!-- CONTEUDO: GRADE DO DIA -->
    <div id="conteudo-aba-dia">
      <div id="lista-agenda-dia">Carregando agenda…</div>
    </div>

    <!-- CONTEUDO: TODAS AS TURMAS -->
    <div id="conteudo-aba-turmas" class="escondido">
      <div class="cartao">
        <h3>Turmas Cadastradas no Estúdio</h3>
        <p class="mudo pequeno">Configuração de modalidades coletivas (Ritbox, Musculação, Funcional, Pilates).</p>
        <div id="lista-todas-turmas" style="margin-top:14px;">Carregando turmas…</div>
      </div>
    </div>
  `;

  // Navegacao por abas
  container.querySelectorAll('.aba-btn').forEach(btn => {
    btn.onclick = () => {
      container.querySelectorAll('.aba-btn').forEach(b => b.classList.remove('ativo'));
      btn.classList.add('ativo');
      const aba = btn.dataset.aba;
      if (aba === 'dia') {
        $('#conteudo-aba-dia').classList.remove('escondido');
        $('#conteudo-aba-turmas').classList.add('escondido');
        carregarAgendaDia();
      } else {
        $('#conteudo-aba-dia').classList.add('escondido');
        $('#conteudo-aba-turmas').classList.remove('escondido');
        carregarTodasTurmas();
      }
    };
  });

  // Controle de Data
  const seletorData = $('#seletor-data-agenda');
  seletorData.onchange = () => {
    dataAtual = seletorData.value;
    carregarAgendaDia();
  };

  $('#btn-data-ant').onclick = () => {
    const d = new Date(dataAtual + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    dataAtual = d.toISOString().slice(0, 10);
    seletorData.value = dataAtual;
    carregarAgendaDia();
  };

  $('#btn-data-prox').onclick = () => {
    const d = new Date(dataAtual + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    dataAtual = d.toISOString().slice(0, 10);
    seletorData.value = dataAtual;
    carregarAgendaDia();
  };

  $('#btn-data-hoje').onclick = () => {
    dataAtual = new Date().toISOString().slice(0, 10);
    seletorData.value = dataAtual;
    carregarAgendaDia();
  };

  $('#btn-novo-agendamento').onclick = modalNovoAgendamento;
  $('#btn-nova-turma').onclick = modalNovaTurma;

  async function carregarAgendaDia() {
    const lista = $('#lista-agenda-dia');
    lista.innerHTML = '<p class="mudo pequeno" style="padding:20px;text-align:center;">Carregando horários do dia…</p>';

    // Atualiza texto extenso da data
    const dObj = new Date(dataAtual + 'T12:00:00');
    $('#data-extenso').textContent = dObj.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    try {
      const resp = await get(`/api/agenda?data=${dataAtual}`);
      const turmas = resp.turmas || [];
      const agendamentos = resp.agendamentos || [];

      // Atualiza contadores
      $('#ind-turmas').textContent = turmas.length;
      $('#ind-alunos').textContent = agendamentos.filter(a => a.situacao !== 'cancelado').length;
      $('#ind-individuais').textContent = agendamentos.filter(a => a.tipo === 'individual').length;

      if (turmas.length === 0 && agendamentos.length === 0) {
        lista.innerHTML = `
          <div class="cartao" style="text-align:center;padding:40px;">
            <div style="font-size:36px;margin-bottom:10px;">📅</div>
            <b>Nenhum agendamento ou turma programada para esta data.</b>
            <p class="mudo pequeno">Clique em "+ Novo Agendamento" acima para marcar um horário ou aluno.</p>
          </div>
        `;
        return;
      }

      let html = '';

      // 1. SESSÕES EM TURMAS
      if (turmas.length > 0) {
        html += `<h3 style="margin:16px 0 10px;">Aulas em Turma</h3><div style="display:flex;flex-direction:column;gap:14px;margin-bottom:24px;">`;
        turmas.forEach(t => {
          const alunosNaTurma = agendamentos.filter(a => a.turma_id === t.id);
          const totalAtivos = alunosNaTurma.filter(a => a.situacao !== 'cancelado').length;
          const vagasRestantes = Math.max(0, t.vagas_maximas - totalAtivos);
          const percentOcupado = Math.min(100, Math.round((totalAtivos / t.vagas_maximas) * 100));

          html += `
            <div class="cartao" style="border-left:4px solid var(--destaque);padding:16px;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
                <div>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <b style="font-size:16px;">${esc(t.nome)}</b>
                    <span style="font-size:12px;background:var(--fundo-destaque, rgba(31, 111, 92, 0.1));color:var(--destaque);padding:2px 8px;border-radius:4px;font-weight:600;">
                      ${t.horario_inicio.slice(0, 5)} - ${t.horario_fim.slice(0, 5)}
                    </span>
                  </div>
                  <div class="mudo pequeno" style="margin-top:4px;">
                    <span>📍 ${esc(t.sala || 'Sala Principal')}</span>
                    ${t.instrutor_nome ? ` · <span>👤 Instrutor: <b>${esc(t.instrutor_nome)}</b></span>` : ''}
                    ${t.produto_nome ? ` · <span>🏷️ ${esc(t.produto_nome)}</span>` : ''}
                  </div>
                </div>

                <div style="display:flex;gap:8px;align-items:center;">
                  <span style="font-size:13px;font-weight:600;color:${vagasRestantes === 0 ? '#dc2626' : 'inherit'};">
                    ${totalAtivos} / ${t.vagas_maximas} vagas ocupadas
                  </span>
                  <button class="destaque pequeno btn-add-aluno-turma" data-turma="${t.id}" data-nome="${esc(t.nome)}" data-inicio="${t.horario_inicio}" data-fim="${t.horario_fim}">
                    ${ic('plus')} Adicionar Aluno
                  </button>
                  <button class="secundario pequeno btn-intercorrencia-turma" data-turma="${t.id}" data-nome="${esc(t.nome)}" style="color:#b91c1c;">
                    📢 Avisar Alunos (Intercorrência)
                  </button>
                </div>
              </div>

              <!-- Barra de Ocupacao -->
              <div style="width:100%;height:6px;background:var(--borda);border-radius:3px;overflow:hidden;margin-bottom:12px;">
                <div style="width:${percentOcupado}%;height:100%;background:${percentOcupado >= 100 ? '#ef4444' : 'var(--destaque)'};"></div>
              </div>

              <!-- Lista de Alunos da Turma -->
              ${alunosNaTurma.length > 0 ? `
                <div style="background:var(--fundo);padding:10px;border-radius:6px;border:1px solid var(--borda);">
                  <b style="font-size:12px;text-transform:uppercase;color:var(--mudo);">Lista de Alunos nesta Aula:</b>
                  <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;">
                    ${alunosNaTurma.map(a => {
                      const badgeSit = a.situacao === 'concluido' ? '<span style="font-size:11px;background:#dcfce7;color:#166534;padding:2px 6px;border-radius:4px;">Presente</span>'
                        : a.situacao === 'falta' ? '<span style="font-size:11px;background:#fee2e2;color:#991b1b;padding:2px 6px;border-radius:4px;">Falta</span>'
                        : a.situacao === 'remarcado' ? '<span style="font-size:11px;background:#ffedd5;color:#9a3412;padding:2px 6px;border-radius:4px;">Remarcado</span>'
                        : '<span style="font-size:11px;background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:4px;">Agendado</span>';

                      return `
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-radius:4px;background:var(--fundo-card);border:1px solid var(--borda);font-size:13px;">
                          <div>
                            <b>${esc(a.cliente_nome)}</b>
                            <span class="mudo pequeno" style="margin-left:6px;">${esc(a.cliente_telefone || '')}</span>
                            ${a.motivo_alteracao ? `<span class="pequeno" style="color:#b45309;margin-left:8px;">(${esc(a.motivo_alteracao)})</span>` : ''}
                          </div>
                          <div style="display:flex;align-items:center;gap:6px;">
                            ${badgeSit}
                            <button class="secundario pequeno btn-presenca" data-id="${a.id}" data-sit="concluido" title="Marcar Presença">✔ Presença</button>
                            <button class="secundario pequeno btn-presenca" data-id="${a.id}" data-sit="falta" title="Marcar Falta">✕ Falta</button>
                            <button class="destaque pequeno btn-remarcar" data-id="${a.id}" data-nome="${esc(a.cliente_nome)}" data-servico="${esc(t.nome)}" data-data="${a.data}" data-inicio="${a.horario_inicio}">🕒 Remarcar</button>
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              ` : '<p class="mudo pequeno" style="margin:0;">Nenhum aluno matriculado para esta aula hoje.</p>'}
            </div>
          `;
        });
        html += `</div>`;
      }

      // 2. ATENDIMENTOS INDIVIDUAIS (PSICOLOGO, CONSULTORIA, PERSONAL)
      const individuais = agendamentos.filter(a => a.tipo === 'individual');
      if (individuais.length > 0) {
        html += `<h3 style="margin:16px 0 10px;">Atendimentos Individuais (Consultas & Sessões)</h3><div style="display:flex;flex-direction:column;gap:10px;">`;
        individuais.forEach(a => {
          const badgeSit = a.situacao === 'concluido' ? '<span style="font-size:11px;background:#dcfce7;color:#166534;padding:2px 6px;border-radius:4px;">Concluído</span>'
            : a.situacao === 'falta' ? '<span style="font-size:11px;background:#fee2e2;color:#991b1b;padding:2px 6px;border-radius:4px;">Falta</span>'
            : a.situacao === 'remarcado' ? '<span style="font-size:11px;background:#ffedd5;color:#9a3412;padding:2px 6px;border-radius:4px;">Remarcado</span>'
            : '<span style="font-size:11px;background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:4px;">Agendado</span>';

          html += `
            <div class="cartao" style="border-left:4px solid #3b82f6;padding:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
              <div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-weight:700;font-size:14px;background:#eff6ff;color:#1d4ed8;padding:2px 8px;border-radius:4px;">
                    ${a.horario_inicio.slice(0, 5)} - ${a.horario_fim.slice(0, 5)}
                  </span>
                  <b style="font-size:15px;">${esc(a.cliente_nome)}</b>
                  <span class="mudo pequeno">📱 ${esc(a.cliente_telefone || '')}</span>
                </div>
                <div class="mudo pequeno" style="margin-top:4px;">
                  <span>🏷️ Serviço: <b>${esc(a.produto_nome || 'Atendimento Individual')}</b></span>
                  ${a.profissional_nome ? ` · <span>👤 Profissional: <b>${esc(a.profissional_nome)}</b></span>` : ''}
                  ${a.motivo_alteracao ? ` · <span style="color:#b45309;">(${esc(a.motivo_alteracao)})</span>` : ''}
                </div>
              </div>

              <div style="display:flex;align-items:center;gap:6px;">
                ${badgeSit}
                <button class="secundario pequeno btn-presenca" data-id="${a.id}" data-sit="concluido">✔ Concluir</button>
                <button class="destaque pequeno btn-remarcar" data-id="${a.id}" data-nome="${esc(a.cliente_nome)}" data-servico="${esc(a.produto_nome || 'Atendimento')}" data-data="${a.data}" data-inicio="${a.horario_inicio}">🕒 Remarcar</button>
              </div>
            </div>
          `;
        });
        html += `</div>`;
      }

      lista.innerHTML = html;

      // Eventos de presenca
      lista.querySelectorAll('.btn-presenca').forEach(btn => {
        btn.onclick = async () => {
          try {
            await post(`/api/agenda/${btn.dataset.id}/situacao`, { situacao: btn.dataset.sit });
            avisar('Presença atualizada com sucesso!');
            carregarAgendaDia();
          } catch (e) {
            avisar('Erro: ' + e.message, 'erro');
          }
        };
      });

      // Eventos de remarcar
      lista.querySelectorAll('.btn-remarcar').forEach(btn => {
        btn.onclick = () => modalRemarcarAgendamento(btn.dataset);
      });

      // Evento adicionar aluno direto na turma
      lista.querySelectorAll('.btn-add-aluno-turma').forEach(btn => {
        btn.onclick = () => modalNovoAgendamento({ turma_id: btn.dataset.turma, horario_inicio: btn.dataset.inicio, horario_fim: btn.dataset.fim });
      });

      // Evento de intercorrencia na turma
      lista.querySelectorAll('.btn-intercorrencia-turma').forEach(btn => {
        btn.onclick = () => modalIntercorrenciaTurma(btn.dataset.turma, btn.dataset.nome, dataAtual);
      });

    } catch (err) {
      lista.innerHTML = '<p class="erro">Erro ao carregar agenda: ' + esc(err.message) + '</p>';
    }
  }

  async function carregarTodasTurmas() {
    const lista = $('#lista-todas-turmas');
    lista.innerHTML = 'Carregando lista de turmas…';

    try {
      const turmas = await get('/api/turmas');
      if (!turmas || turmas.length === 0) {
        lista.innerHTML = '<p class="mudo">Nenhuma turma cadastrada no estúdio.</p>';
        return;
      }

      lista.innerHTML = `
        <table class="tabela" style="width:100%;">
          <thead>
            <tr>
              <th>Nome da Turma</th>
              <th>Modalidade</th>
              <th>Horário</th>
              <th>Dias</th>
              <th>Capacidade</th>
              <th>Espaço / Sala</th>
              <th>Instrutor</th>
            </tr>
          </thead>
          <tbody>
            ${turmas.map(t => `
              <tr>
                <td><b>${esc(t.nome)}</b></td>
                <td>${esc(t.produto_nome || 'Geral')}</td>
                <td><span style="font-weight:600;color:var(--destaque);">${t.horario_inicio.slice(0, 5)} às ${t.horario_fim.slice(0, 5)}</span></td>
                <td>${Array.isArray(t.dias_semana) ? t.dias_semana.join(', ').toUpperCase() : esc(t.dias_semana || '')}</td>
                <td><b>${t.vagas_maximas} vagas</b></td>
                <td>${esc(t.sala || 'Sala Principal')}</td>
                <td>${esc(t.instrutor_nome || 'Não definido')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (e) {
      lista.innerHTML = '<p class="erro">Erro ao carregar turmas: ' + esc(e.message) + '</p>';
    }
  }

  // Inicia carregando agenda de hoje
  carregarAgendaDia();
}

// MODAL DE REMARCACAO COM GERADOR DE MENSAGEM WHATSAPP
async function modalRemarcarAgendamento(dados) {
  abrirModal(`
    <h3>🕒 Remarcar Agendamento</h3>
    <p class="mudo pequeno">Altere a data ou horário para o aluno <b>${esc(dados.nome)}</b> (${esc(dados.servico)}):</p>

    <form id="form-remarcar" style="margin-top:14px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
        <div>
          <label>Nova Data</label>
          <input type="date" id="rem-data" value="${dados.data}" required>
        </div>
        <div>
          <label>Novo Horário</label>
          <input type="time" id="rem-hora" value="${dados.inicio?.slice(0, 5) || '08:00'}" required>
        </div>
      </div>

      <div style="margin-bottom:14px;">
        <label>Motivo da Alteração / Imprevisto (opcional)</label>
        <input type="text" id="rem-motivo" placeholder="Ex: Professor gripado, Manutenção na sala, Pedido do aluno">
      </div>

      <div id="resultado-remarcacao" class="escondido" style="margin-bottom:14px;background:var(--fundo-destaque, rgba(31,111,92,0.1));padding:12px;border-radius:6px;border:1px solid var(--borda);">
        <b style="font-size:13px;display:block;margin-bottom:6px;">📱 Mensagem Pronta para Enviar no WhatsApp do Aluno:</b>
        <div id="txt-msg-remarcacao" style="white-space:pre-wrap;font-size:12px;background:var(--fundo);padding:8px;border-radius:4px;border:1px solid var(--borda);"></div>
        <div style="display:flex;gap:8px;margin-top:10px;">
          <button type="button" class="secundario pequeno" id="btn-copiar-remarcacao">Copiar Mensagem</button>
          <a id="link-whats-remarcacao" target="_blank" class="destaque pequeno" style="text-decoration:none;display:flex;align-items:center;gap:4px;">
            ${ic('whats')} Abrir WhatsApp
          </a>
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:8px;">
        <button type="button" class="secundario" onclick="fecharModal()">Fechar</button>
        <button type="submit" class="destaque" id="btn-salvar-remarcacao">Salvar e Gerar Aviso</button>
      </div>
    </form>
  `);

  $('#form-remarcar').onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('#btn-salvar-remarcacao');
    btn.disabled = true;

    try {
      const resp = await post(`/api/agenda/${dados.id}/remarcar`, {
        nova_data: $('#rem-data').value,
        novo_horario_inicio: $('#rem-hora').value,
        novo_horario_fim: $('#rem-hora').value,
        motivo: $('#rem-motivo').value.trim()
      }, 'PUT');

      avisar('Horário remarcado com sucesso!', 'sucesso');
      
      // Exibe caixa de envio WhatsApp
      const box = $('#resultado-remarcacao');
      box.classList.remove('escondido');
      $('#txt-msg-remarcacao').textContent = resp.mensagem_whatsapp;
      $('#link-whats-remarcacao').href = `https://wa.me/${(resp.telefone || '').replace(/\D/g, '')}?text=${encodeURIComponent(resp.mensagem_whatsapp)}`;

      $('#btn-copiar-remarcacao').onclick = () => {
        navigator.clipboard.writeText(resp.mensagem_whatsapp);
        avisar('Mensagem copiada para a área de transferência!');
      };

      btn.textContent = '✔ Horário Atualizado!';
    } catch (err) {
      avisar('Erro ao remarcar: ' + err.message, 'erro');
      btn.disabled = false;
    }
  };
}

// MODAL DE AVISO DE INTERCORRENCIA NA TURMA INTEIRA
async function modalIntercorrenciaTurma(turmaId, nomeTurma, dataAtual) {
  abrirModal(`
    <h3>📢 Comunicar Intercorrência na Turma</h3>
    <p class="mudo pequeno">Envie um aviso para todos os alunos matriculados na <b>${esc(nomeTurma)}</b> do dia de hoje:</p>

    <form id="form-intercorrencia" style="margin-top:14px;">
      <div style="margin-bottom:12px;">
        <label>Tipo de Intercorrência</label>
        <select id="int-tipo" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--borda);background:var(--fundo);">
          <option value="cancelar">❌ Cancelar a aula de hoje (imprevisto/manutenção/doença)</option>
          <option value="adiar">🕒 Alterar horário da aula de hoje</option>
        </select>
      </div>

      <div id="campo-novo-horario" class="escondido" style="margin-bottom:12px;">
        <label>Novo Horário da Aula</label>
        <input type="time" id="int-novo-horario" value="19:00">
      </div>

      <div style="margin-bottom:14px;">
        <label>Motivo da Intercorrência</label>
        <input type="text" id="int-motivo" placeholder="Ex.: Manutenção elétrica no estúdio, Professor gripado" required>
      </div>

      <div id="resultado-intercorrencia" class="escondido" style="margin-bottom:14px;">
        <b style="font-size:13px;display:block;margin-bottom:8px;">Lista de Alunos Notificados:</b>
        <div id="lista-alunos-notif" style="max-height:180px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;"></div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:8px;">
        <button type="button" class="secundario" onclick="fecharModal()">Fechar</button>
        <button type="submit" class="destaque" id="btn-disparar-aviso">Gerar Avisos WhatsApp</button>
      </div>
    </form>
  `);

  $('#int-tipo').onchange = (e) => {
    $('#campo-novo-horario').classList.toggle('escondido', e.target.value !== 'adiar');
  };

  $('#form-intercorrencia').onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('#btn-disparar-aviso');
    btn.disabled = true;

    try {
      const resp = await post(`/api/agenda/turma/${turmaId}/notificar-intercorrencia`, {
        data: dataAtual,
        motivo: $('#int-motivo').value.trim(),
        cancelada: $('#int-tipo').value === 'cancelar',
        novo_horario: $('#int-tipo').value === 'adiar' ? $('#int-novo-horario').value : null
      });

      avisar(`${resp.total_alunos} alunos processados!`, 'sucesso');
      
      const box = $('#resultado-intercorrencia');
      box.classList.remove('escondido');
      const containerAlunos = $('#lista-alunos-notif');

      if (!resp.notificacoes || resp.notificacoes.length === 0) {
        containerAlunos.innerHTML = '<p class="mudo pequeno">Nenhum aluno inscrito nesta turma hoje.</p>';
      } else {
        containerAlunos.innerHTML = resp.notificacoes.map(n => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-radius:4px;background:var(--fundo);border:1px solid var(--borda);font-size:13px;">
            <div>
              <b>${esc(n.cliente_nome)}</b>
              <span class="mudo pequeno">(${esc(n.telefone)})</span>
            </div>
            <a href="${n.link_whatsapp}" target="_blank" class="destaque pequeno" style="text-decoration:none;display:flex;align-items:center;gap:4px;">
              ${ic('whats')} Enviar WhatsApp
            </a>
          </div>
        `).join('');
      }

      btn.textContent = '✔ Avisos Prontos!';
    } catch (err) {
      avisar('Erro: ' + err.message, 'erro');
      btn.disabled = false;
    }
  };
}

// MODAL DE NOVO AGENDAMENTO
async function modalNovoAgendamento(padrao = {}) {
  const [clientes, turmas, prods] = await Promise.all([
    get('/api/clientes'),
    get('/api/turmas'),
    get('/api/produtos')
  ]);

  abrirModal(`
    <h3>${ic('plus')} Novo Agendamento</h3>
    <form id="form-novo-agendamento" style="margin-top:14px;">
      <div style="margin-bottom:12px;">
        <label>Aluno / Cliente</label>
        <select id="ag-cliente" required style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--borda);background:var(--fundo);">
          <option value="">Selecione um aluno…</option>
          ${clientes.map(c => `<option value="${c.id}">${esc(c.nome)} - ${esc(c.telefone || 'Sem tel')}</option>`).join('')}
        </select>
      </div>

      <div style="margin-bottom:12px;">
        <label>Tipo de Agendamento</label>
        <select id="ag-tipo" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--borda);background:var(--fundo);">
          <option value="turma" ${!padrao.tipo || padrao.tipo === 'turma' ? 'selected' : ''}>Aula em Turma (Grupo)</option>
          <option value="individual" ${padrao.tipo === 'individual' ? 'selected' : ''}>Atendimento Individual (Consulta/Psicólogo/Personal)</option>
        </select>
      </div>

      <!-- Campo de Turma -->
      <div id="campo-turma-sel" style="margin-bottom:12px;">
        <label>Turma / Aula Coletiva</label>
        <select id="ag-turma" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--borda);background:var(--fundo);">
          <option value="">Selecione a turma…</option>
          ${turmas.map(t => `<option value="${t.id}" ${padrao.turma_id === t.id ? 'selected' : ''}>${esc(t.nome)} (${t.horario_inicio.slice(0, 5)} - ${t.horario_fim.slice(0, 5)})</option>`).join('')}
        </select>
      </div>

      <!-- Campo de Servico Individual -->
      <div id="campo-prod-sel" class="escondido" style="margin-bottom:12px;">
        <label>Serviço / Atendimento</label>
        <select id="ag-prod" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--borda);background:var(--fundo);">
          ${prods.map(p => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}
        </select>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
        <div>
          <label>Data</label>
          <input type="date" id="ag-data" value="${new Date().toISOString().slice(0, 10)}" required>
        </div>
        <div>
          <label>Horário</label>
          <input type="time" id="ag-hora-inicio" value="${padrao.horario_inicio?.slice(0, 5) || '08:00'}" required>
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <label>Observação (opcional)</label>
        <input type="text" id="ag-obs" placeholder="Ex: Primeira aula experimental, Reabilitação joelho">
      </div>

      <div style="display:flex;justify-content:flex-end;gap:8px;">
        <button type="button" class="secundario" onclick="fecharModal()">Cancelar</button>
        <button type="submit" class="destaque">Confirmar Agendamento</button>
      </div>
    </form>
  `);

  $('#ag-tipo').onchange = (e) => {
    const ehTurma = e.target.value === 'turma';
    $('#campo-turma-sel').classList.toggle('escondido', !ehTurma);
    $('#campo-prod-sel').classList.toggle('escondido', ehTurma);
  };

  $('#form-novo-agendamento').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const tipo = $('#ag-tipo').value;
      await post('/api/agenda/agendar', {
        tipo,
        cliente_id: $('#ag-cliente').value,
        turma_id: tipo === 'turma' ? $('#ag-turma').value : null,
        produto_id: tipo === 'individual' ? $('#ag-prod').value : null,
        data: $('#ag-data').value,
        horario_inicio: $('#ag-hora-inicio').value,
        horario_fim: $('#ag-hora-inicio').value,
        observacao: $('#ag-obs').value.trim()
      });
      avisar('Agendamento realizado com sucesso!', 'sucesso');
      fecharModal();
      telaAgenda();
    } catch (err) {
      avisar('Erro ao agendar: ' + err.message, 'erro');
    }
  };
}

// MODAL DE NOVA TURMA
async function modalNovaTurma() {
  const [prods, usuarios] = await Promise.all([
    get('/api/produtos'),
    get('/api/usuarios')
  ]);

  abrirModal(`
    <h3>${ic('mais')} Criar Nova Turma</h3>
    <form id="form-nova-turma" style="margin-top:14px;">
      <div style="margin-bottom:12px;">
        <label>Nome da Turma</label>
        <input type="text" id="turma-nome" placeholder="Ex: Ritbox Manhã A, Turma Garagem Noite" required>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
        <div>
          <label>Modalidade / Serviço</label>
          <select id="turma-prod" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--borda);background:var(--fundo);">
            <option value="">Selecione…</option>
            ${prods.map(p => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label>Instrutor / Professor</label>
          <select id="turma-instrutor" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--borda);background:var(--fundo);">
            <option value="">Selecione…</option>
            ${usuarios.map(u => `<option value="${u.id}">${esc(u.nome)} (${esc(u.perfil)})</option>`).join('')}
          </select>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
        <div>
          <label>Horário Início</label>
          <input type="time" id="turma-inicio" value="08:00" required>
        </div>
        <div>
          <label>Horário Fim</label>
          <input type="time" id="turma-fim" value="09:00" required>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
        <div>
          <label>Vagas Máximas</label>
          <input type="number" id="turma-vagas" value="15" min="1" max="100" required>
        </div>
        <div>
          <label>Sala / Espaço</label>
          <input type="text" id="turma-sala" value="Sala Principal" placeholder="Ex: Sala 1, Garagem, Tatame">
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:8px;">
        <button type="button" class="secundario" onclick="fecharModal()">Cancelar</button>
        <button type="submit" class="destaque">Salvar Turma</button>
      </div>
    </form>
  `);

  $('#form-nova-turma').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await post('/api/turmas', {
        nome: $('#turma-nome').value.trim(),
        produto_id: $('#turma-prod').value || null,
        instrutor_id: $('#turma-instrutor').value || null,
        horario_inicio: $('#turma-inicio').value,
        horario_fim: $('#turma-fim').value,
        vagas_maximas: parseInt($('#turma-vagas').value, 10),
        sala: $('#turma-sala').value.trim()
      });
      avisar('Turma criada com sucesso!', 'sucesso');
      fecharModal();
      telaAgenda();
    } catch (err) {
      avisar('Erro ao criar turma: ' + err.message, 'erro');
    }
  };
}
