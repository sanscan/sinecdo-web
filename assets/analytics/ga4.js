/* Sinecdo / GA4 v1 — basic consent: no Google tag before opt-in.
   Does not change CRM registration, email permissions, or third-party marketing. */
(() => {
  'use strict';
  const MEASUREMENT_ID = 'G-L9VZZXF0ZW';
  const KEY = 'sinecdo.ga4.consent.v1';
  const lang = (document.documentElement.lang || 'es').slice(0, 2).toLowerCase();
  const i18n = {
    es: {title:'Analítica del sitio',copy:'Usamos Google Analytics para conocer qué funciona en la web. Es opcional y no afecta tu solicitud ni el quiz.',accept:'Aceptar analítica',reject:'Rechazar',settings:'Privacidad y analítica',policy:'Aviso de privacidad'},
    en: {title:'Website analytics',copy:'We use Google Analytics to understand how the website works. It is optional and does not affect your request or quiz.',accept:'Accept analytics',reject:'Reject',settings:'Privacy and analytics',policy:'Privacy notice'},
    it: {title:'Analisi del sito',copy:'Utilizziamo Google Analytics per capire come funziona il sito. È facoltativo e non influisce sulla richiesta o sul quiz.',accept:'Accetta analisi',reject:'Rifiuta',settings:'Privacy e analisi',policy:'Informativa sulla privacy'}
  };
  const t = i18n[lang] || i18n.es;
  let decision = null, initialized = false;
  try { const value = localStorage.getItem(KEY); if (value === 'granted' || value === 'denied') decision = value; } catch (_) {}
  const denied = {analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'};
  const analyticsGranted = {...denied, analytics_storage:'granted'};

  // Do not pass arbitrary URL parameters or referrer queries to Analytics.
  function safeLocation() {
    const params = new URLSearchParams(location.search);
    const kept = new URLSearchParams();
    for (const k of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']) {
      const value = params.get(k);
      if (value && /^[A-Za-z0-9_.~-]{1,100}$/.test(value)) kept.set(k,value);
    }
    const q = kept.toString();
    return location.origin + location.pathname + (q ? '?' + q : '');
  }
  function safeReferrer() {
    if (!document.referrer) return '';
    try { const ref = new URL(document.referrer); return ref.origin + ref.pathname; }
    catch (_) { return ''; }
  }
  function loadGA4() {
    if (initialized || decision !== 'granted') return;
    initialized = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    window.gtag('consent','default',denied);
    window.gtag('consent','update',analyticsGranted);
    window.gtag('js',new Date());
    window.gtag('config',MEASUREMENT_ID,{
      page_location:safeLocation(),
      page_referrer:safeReferrer(),
      send_page_view:true,
      allow_google_signals:false,
      allow_ad_personalization_signals:false
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MEASUREMENT_ID);
    document.head.appendChild(script);
  }
  function storeChoice(next) {
    decision = next;
    try { localStorage.setItem(KEY,next); } catch (_) {}
    if (next === 'granted') loadGA4();
    else if (initialized) {
      // Stop further collection immediately, then unload the previously injected tag.
      window.gtag('consent','update',denied);
      for (const pair of document.cookie.split(';')) {
        const name = pair.trim().split('=')[0];
        if (!/^_ga(?:$|_)/.test(name)) continue;
        document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax';
        document.cookie = name + '=; Max-Age=0; Domain=.sinecdo.com; Path=/; SameSite=Lax';
      }
      location.reload();
    }
  }
  function sendEvent(name,detail) {
    if (decision !== 'granted' || !initialized || typeof window.gtag !== 'function') return;
    const data = {};
    if (['es','en','it'].includes(detail.locale)) data.site_locale = detail.locale;
    if (['quiz','form_direct','hero_quiz'].includes(detail.entry)) data.entry_point = detail.entry;
    if (['perception','consistency','launch'].includes(detail.need)) data.quiz_need = detail.need;
    if (['owner','marketing','other'].includes(detail.role)) data.quiz_role = detail.role;
    if (detail.step && /^[1-4]$/.test(detail.step)) data.quiz_step = Number(detail.step);
    if (name === 'registration_saved') {
      if (detail.entry === 'form_direct' || detail.intent === 'solicito_diagnostico' || detail.intent === 'quiero_contacto') {
        window.gtag('event','generate_lead',{...data, lead_source:detail.entry === 'form_direct' ? 'direct_form' : 'quiz'});
      } else window.gtag('event','quiz_registration_saved',data);
      return;
    }
    const known = {
      quiz_start:'quiz_start',
      quiz_step:'quiz_step',
      quiz_result:'quiz_complete',
      registration_submit:'registration_submit',
      registration_error:'registration_error'
    };
    if (known[name]) window.gtag('event',known[name],data);
  }
  window.addEventListener('sinecdo:metric',ev => {
    if (!ev.detail || typeof ev.detail.name !== 'string') return;
    sendEvent(ev.detail.name,ev.detail);
  });
  function mount() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sc-analytics-settings';
    button.textContent = t.settings;
    document.body.appendChild(button);
    const panel = document.createElement('section');
    panel.className = 'sc-analytics-panel';
    panel.setAttribute('role','region');
    panel.setAttribute('aria-label',t.title);
    const title = document.createElement('h2'); title.textContent = t.title;
    const copy = document.createElement('p'); copy.textContent = t.copy;
    const link = document.createElement('a');
    link.href = '/privacy/' + (i18n[lang] ? lang : 'es') + '/';
    link.textContent = t.policy;
    const actions = document.createElement('div'); actions.className = 'sc-analytics-actions';
    const reject = document.createElement('button'); reject.type='button'; reject.textContent=t.reject; reject.className='sc-analytics-reject';
    const accept = document.createElement('button'); accept.type='button'; accept.textContent=t.accept; accept.className='sc-analytics-accept';
    actions.append(reject,accept);
    panel.append(title,copy,link,actions);
    document.body.appendChild(panel);
    function show(){ panel.hidden=false; button.setAttribute('aria-expanded','true'); }
    function hide(){ panel.hidden=true; button.setAttribute('aria-expanded','false'); }
    button.setAttribute('aria-controls','sc-analytics-dialog');
    panel.id='sc-analytics-dialog';
    button.addEventListener('click',()=>{ if(panel.hidden) show(); else hide(); });
    accept.addEventListener('click',()=>{storeChoice('granted');hide();button.focus();});
    reject.addEventListener('click',()=>{storeChoice('denied');hide();button.focus();});
    if (decision) hide(); else show();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
  if (decision === 'granted') loadGA4();
})();