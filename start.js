import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const PG_BIN = '/usr/lib/postgresql/15/bin';
const PG_DATA = '/tmp/pgdata';
const PG_SOCK = '/var/run/postgresql';

function runCmd(cmd, args) {
  return spawnSync(cmd, args, { encoding: 'utf8' });
}

function runAsAppUser(cmdStr) {
  return spawnSync('su', ['-', 'appuser', '-c', cmdStr], { encoding: 'utf8' });
}

console.log('[Gestão do Estúdio] Preparando ambiente PostgreSQL...');

// 1. Socket directory
try {
  if (!fs.existsSync(PG_SOCK)) {
    fs.mkdirSync(PG_SOCK, { recursive: true });
    runCmd('chown', ['-R', 'appuser:appuser', PG_SOCK]);
  }
} catch (e) {
  console.warn('[Gestão do Estúdio] Aviso ao criar pasta de socket:', e.message);
}

// 2. Data directory & initdb
if (!fs.existsSync(path.join(PG_DATA, 'PG_VERSION'))) {
  fs.mkdirSync(PG_DATA, { recursive: true });
  runCmd('chown', ['-R', 'appuser:appuser', PG_DATA]);
  console.log('[Gestão do Estúdio] Inicializando cluster PostgreSQL...');
  runAsAppUser(`${PG_BIN}/initdb -D ${PG_DATA} -U postgres -A trust -E UTF8 --locale=C`);
}

// 3. Ensure postgres running
const statusRes = runAsAppUser(`${PG_BIN}/pg_ctl -D ${PG_DATA} status`);
if (statusRes.status !== 0) {
  console.log('[Gestão do Estúdio] Iniciando serviço PostgreSQL...');
  runAsAppUser(`${PG_BIN}/pg_ctl -D ${PG_DATA} -l /tmp/pg.log start`);
  runAsAppUser(`${PG_BIN}/psql -U postgres -c "CREATE DATABASE estudio;"`);
  runAsAppUser(`${PG_BIN}/psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'estudio123';"`);
  runAsAppUser(`${PG_BIN}/psql -d estudio -U postgres -c "CREATE TABLE IF NOT EXISTS pedidos_whatsapp (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), telefone text NOT NULL, cliente_nome text, cliente_id uuid REFERENCES clientes(id), mensagem_original text NOT NULL, tipo text NOT NULL CHECK (tipo IN ('produto', 'plano', 'duvida', 'outro')), dados_itens jsonb NOT NULL DEFAULT '[]'::jsonb, plano_id uuid REFERENCES planos(id), produto_id uuid REFERENCES produtos(id), valor_total numeric(10,2) NOT NULL DEFAULT 0, resposta_sugerida text, situacao text NOT NULL DEFAULT 'pendente' CHECK (situacao IN ('pendente', 'confirmado', 'recusado')), venda_id uuid REFERENCES vendas(id), assinatura_id uuid REFERENCES assinaturas(id), criado_em timestamptz NOT NULL DEFAULT now(), confirmado_em timestamptz, confirmado_por uuid REFERENCES usuarios(id)); CREATE TABLE IF NOT EXISTS conversas_whatsapp (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), telefone text NOT NULL UNIQUE, cliente_nome text, cliente_id uuid REFERENCES clientes(id), atendente_id uuid REFERENCES usuarios(id), status text NOT NULL DEFAULT 'bot' CHECK (status IN ('bot', 'aguardando', 'em_atendimento', 'finalizado')), ultima_mensagem text, ultima_interacao timestamptz NOT NULL DEFAULT now(), criado_em timestamptz NOT NULL DEFAULT now()); CREATE TABLE IF NOT EXISTS mensagens_whatsapp (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversa_id uuid NOT NULL REFERENCES conversas_whatsapp(id) ON DELETE CASCADE, remetente text NOT NULL CHECK (remetente IN ('cliente', 'bot', 'atendente')), usuario_id uuid REFERENCES usuarios(id), texto text NOT NULL, criado_em timestamptz NOT NULL DEFAULT now()); CREATE TABLE IF NOT EXISTS turmas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL, produto_id uuid REFERENCES produtos(id), unidade_id uuid REFERENCES unidades(id), instrutor_id uuid REFERENCES usuarios(id), dias_semana text[] NOT NULL DEFAULT '{\"seg\", \"qua\", \"sex\"}', horario_inicio time NOT NULL, horario_fim time NOT NULL, vagas_maximas integer NOT NULL DEFAULT 15, sala text DEFAULT 'Sala Principal', ativa boolean NOT NULL DEFAULT true, criado_em timestamptz NOT NULL DEFAULT now()); CREATE TABLE IF NOT EXISTS agendamentos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tipo text NOT NULL CHECK (tipo IN ('turma', 'individual')), turma_id uuid REFERENCES turmas(id) ON DELETE SET NULL, produto_id uuid REFERENCES produtos(id), cliente_id uuid NOT NULL REFERENCES clientes(id), profissional_id uuid REFERENCES usuarios(id), unidade_id uuid REFERENCES unidades(id), data date NOT NULL, horario_inicio time NOT NULL, horario_fim time NOT NULL, situacao text NOT NULL DEFAULT 'agendado' CHECK (situacao IN ('agendado', 'concluido', 'cancelado', 'remarcado', 'falta')), motivo_alteracao text, notificado_whatsapp boolean NOT NULL DEFAULT false, observacao text, criado_em timestamptz NOT NULL DEFAULT now(), criado_por uuid REFERENCES usuarios(id));"`);
}

// 4. Ensure config.json points to port 3000
const cfgPath = path.join(process.cwd(), 'config.json');
const cfg = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'estudio123',
  database: 'estudio',
  porta: 3000
};
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));

console.log('[Gestão do Estúdio] Iniciando servidor na porta 3000...');
try {
  runCmd('pkill', ['-9', '-f', 'server.cjs']);
} catch (e) {}

const serverProcess = spawn(process.execPath, ['server.cjs'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: '3000',
    PORTA: '3000',
    NAO_ABRIR_NAVEGADOR: '1'
  }
});

serverProcess.on('exit', (code) => {
  process.exit(code || 0);
});

process.on('SIGTERM', () => {
  serverProcess.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGINT', () => {
  serverProcess.kill('SIGINT');
  process.exit(0);
});
