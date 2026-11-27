(() => {
  'use strict';
  const productionHosts = new Set(['sinecdo.com', 'www.sinecdo.com']);
  const host = String(location.hostname || '').toLowerCase();
  if (productionHosts.has(host)) return;

  // A staging or temporary Hostinger domain must never be indexed as the public site.
  let robots = document.querySelector('meta[name="robots"]');
  if (!robots) {
    robots = document.createElement('meta');
    robots.name = 'robots';
    document.head.appendChild(robots);
  }
  robots.content = 'noindex,nofollow,noarchive';

  const lang = (document.documentElement.lang || 'es').slice(0, 2).toLowerCase();
  const copy = {
    es: 'Entorno de prueba. Formularios, CRM y analítica productiva desactivados.',
    en: 'Test environment. Forms, CRM and production analytics are disabled.',
    it: 'Ambiente di test. Moduli, CRM e analisi di produzione sono disattivati.'
  }[lang] || 'Test environment. Forms, CRM and production analytics are disabled.';

  const banner = document.createElement('aside');
  banner.className = 'sinecdo-staging-banner';
  banner.setAttribute('role', 'status');
  const label = document.createElement('strong');
  label.textContent = 'SINECDO / STAGING';
  const message = document.createElement('span');
  message.textContent = copy;
  banner.append(label, message);

  const style = document.createElement('style');
  style.textContent = `
    .sinecdo-staging-banner{position:relative;z-index:9997;display:flex;align-items:center;gap:12px;padding:10px clamp(14px,4vw,28px);background:#63E6D2;color:#121514;border-bottom:1px solid rgba(18,21,20,.16);font:500 12px/1.45 'JetBrains Mono',monospace;letter-spacing:.02em}
    .sinecdo-staging-banner strong{font-weight:700;white-space:nowrap}
    .sinecdo-staging-banner span{font:400 13px/1.45 'DM Sans',system-ui,sans-serif}
    @media(max-width:620px){.sinecdo-staging-banner{align-items:flex-start;flex-direction:column;gap:3px;padding:9px 14px}.sinecdo-staging-banner span{font-size:12px}}
  `;
  document.head.appendChild(style);

  const mount = () => document.body.prepend(banner);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
