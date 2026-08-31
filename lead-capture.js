(() => {
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbzM62i0CqEVCqH7oxFj3wBsjqB0Ry2Pza6Zi9e5jUiUGwi4OD-S_pArMURvk62qdxQL1A/exec';
  const TURNSTILE_SITE_KEY = '0x4AAAAAAEjGqVTYV872l_KA';
  const SESSION_KEY = 'sinecdoLeadSubmitted';
  const form = document.querySelector('#lead-form');

  if (!form) return;

  const status = document.querySelector('#lead-form-status');
  const submit = form.querySelector('button[type="submit"]');
  const submitLabel = submit.querySelector('[data-submit-label]');
  const params = new URLSearchParams(window.location.search);
  const webInput = form.elements.namedItem('web');
  const linkedinInput = form.elements.namedItem('linkedin');
  const consent = form.querySelector('.form-consent');
  let submitted = false;
  let turnstileWidgetId = null;

  const setHidden = (name, value) => {
    const input = form.elements.namedItem(name);
    if (input) input.value = value || '';
  };

  const normalizeUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) return raw;
    if (/^www\./i.test(raw) || /^[^/\s]+\.[^/\s]+(?:\/.*)?$/i.test(raw)) {
      return `https://${raw}`;
    }
    return raw;
  };

  const populateTracking = () => {
    setHidden('utm_source', params.get('utm_source'));
    setHidden('utm_medium', params.get('utm_medium'));
    setHidden('utm_campaign', params.get('utm_campaign'));
    setHidden('utm_content', params.get('utm_content'));
    setHidden('campania', params.get('utm_campaign'));
    setHidden('origen', (params.get('utm_source') || '').toLowerCase() === 'ens' ? 'ENS' : 'Web');
    setHidden('page_url', window.location.href);
  };

  const showSubmittedState = () => {
    submitted = true;
    form.classList.add('is-submitted');
    Array.from(form.elements).forEach((control) => {
      control.disabled = true;
    });
    status.innerHTML = `
      <span class="form-status-kicker">Solicitud recibida</span>
      <strong>Ya recibimos tu mensaje.</strong>
      <span>Vamos a revisar tu solicitud y te responderemos por email o WhatsApp.</span>
    `;
    status.className = 'form-status success';
    status.hidden = false;
    status.focus();
  };

  const showTurnstileMessage = (message) => {
    status.textContent = message;
    status.className = 'form-status error';
    status.hidden = false;
    status.focus();
  };

  const mountTurnstile = () => {
    if (!consent || form.querySelector('.turnstile-wrap')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'turnstile-wrap';
    wrapper.setAttribute('aria-label', 'Verificación anti-spam');
    consent.before(wrapper);

    const render = () => {
      if (!window.turnstile || turnstileWidgetId !== null) return;
      turnstileWidgetId = window.turnstile.render(wrapper, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'dark',
        size: 'flexible',
        'response-field': true,
        'response-field-name': 'cf-turnstile-response',
        callback: () => {
          if (!submitted) {
            status.hidden = true;
            status.className = 'form-status';
          }
        },
        'expired-callback': () => {
          if (!submitted) showTurnstileMessage('La verificación anti-spam venció. Completala nuevamente para enviar la solicitud.');
        },
        'error-callback': () => {
          if (!submitted) showTurnstileMessage('No pudimos cargar la verificación anti-spam. Recargá la página e intentá nuevamente.');
        }
      });
    };

    if (window.turnstile) {
      render();
      return;
    }

    const existing = document.querySelector('script[data-sinecdo-turnstile]');
    if (existing) {
      existing.addEventListener('load', render, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.sinecdoTurnstile = 'true';
    script.addEventListener('load', render, { once: true });
    script.addEventListener('error', () => {
      showTurnstileMessage('No pudimos cargar la verificación anti-spam. Recargá la página e intentá nuevamente.');
    }, { once: true });
    document.head.appendChild(script);
  };

  // Accept domains without protocol. Web is required for this short diagnostic request.
  if (webInput) {
    webInput.type = 'text';
    webInput.inputMode = 'url';
    webInput.required = true;
    webInput.placeholder = 'www.empresa.com';
  }

  if (linkedinInput) {
    linkedinInput.type = 'text';
    linkedinInput.inputMode = 'url';
    linkedinInput.placeholder = 'linkedin.com/in/usuario';
  }

  populateTracking();

  if (sessionStorage.getItem(SESSION_KEY) === '1') {
    showSubmittedState();
    return;
  }

  mountTurnstile();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (submitted || !form.reportValidity()) return;

    const turnstileResponse = form.elements.namedItem('cf-turnstile-response');
    if (!turnstileResponse || !String(turnstileResponse.value || '').trim()) {
      showTurnstileMessage('Completá la verificación anti-spam antes de enviar la solicitud.');
      return;
    }

    if (webInput) webInput.value = normalizeUrl(webInput.value);
    if (linkedinInput) linkedinInput.value = normalizeUrl(linkedinInput.value);

    const data = new FormData(form);
    const body = new URLSearchParams();
    data.forEach((value, key) => body.append(key, String(value)));

    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    submitLabel.textContent = 'Enviando…';
    status.hidden = true;
    status.className = 'form-status';

    try {
      await fetch(ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: body.toString()
      });

      sessionStorage.setItem(SESSION_KEY, '1');
      showSubmittedState();
    } catch (error) {
      console.error(error);
      status.textContent = 'No pudimos enviar la solicitud. Probá de nuevo o escribinos a diagnostico@sinecdo.com.';
      status.classList.add('error');
      status.hidden = false;
      status.focus();
      if (window.turnstile && turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
    } finally {
      if (!submitted) {
        submit.disabled = false;
        submit.removeAttribute('aria-busy');
        submitLabel.textContent = 'Enviar solicitud';
      }
    }
  });
})();