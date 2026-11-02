// Sistema de Gestão do Estúdio — ícones do menu (traço simples, herdam a cor do texto)
'use strict';
const IC = {
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>', fechar:'<path d="M6 6l12 12M18 6 6 18"/>',
  inicio:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
venda:'<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M3 4h2l2.4 11h11.2L21 7H6.2"/>',
clientes:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.9.7 3.1 2.5 3.5 5.2"/>',
pagamentos:'<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
assinaturas:'<path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"/>',
produtos:'<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.5"/>',
planos:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
estoque:'<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
relatorios:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
despesas:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
unidades:'<path d="M4 21V5l8-3v19M12 21h8V9l-8-3"/><path d="M7 8h2M7 12h2M7 16h2M15 12h2M15 16h2"/>',
usuarios:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
backup:'<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 8a4 4 0 0 1 0 10z"/><path d="M12 11v6M9.5 13.5 12 11l2.5 2.5"/>',
auditoria:'<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
aparencia:'<path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
busca:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',mais:'<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
plus:'<path d="M12 5v14M5 12h14"/>',seta:'<path d="m9 6 6 6-6 6"/>',whats:'<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/>',alerta:'<path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17h.01"/>',
cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',dinheiro:'<path d="M12 3v18M17 7.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 2.6 5 3 5 1.1 5 3-2.2 3-5 3-5-1.1-5-3"/>'};
const ic = (n, s = '') => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true" ${s}>${IC[n] || ''}</svg>`;
