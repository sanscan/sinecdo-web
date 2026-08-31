(() => {
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbzM62i0CqEVCqH7oxFj3wBsjqB0Ry2Pza6Zi9e5jUiUGwi4OD-S_pArMURvk62qdxQL1A/exec';
  const SESSION_KEY = 'sinecdoLeadSubmitted';
  const RESPONSE_SOURCE = 'sinecdo-lead';
  const RESPONSE_TIMEOUT_MS = 25000;
  const form = document.querySelector('#lead-form');

  if (!form) return;

  // Cloudflare Turnstile is intentionally removed from the active lead flow.
  document.querySelectorAll('.turnstile-wrap, .cf-turnstile').forEach((node) => node.remove());

  const status = document.querySelector('#lead-form-status');
  const submit = form.querySelector('button[type="submit"]');
  const submitLabel = submit.querySelector('[data-submit-label]');
  const params = new URLSearchParams(window.location.search);
  const webInput = form.elements.namedItem('web');
  const linkedinInput = form.elements.namedItem('linkedin');

  let submitted = false;
  let pendingRequestId = '';
  let responseTimer = null;

  const responseFrame = document.createElement('iframe');
  responseFrame.name = 'sinecdo-lead-response-frame';
  responseFrame.title = 'Respuesta del formulario';
  responseFrame.hidden = true;
  responseFrame.setAttribute('aria-hidden', 'true');
  document.body.appendChild(responseFrame);

  form.action = ENDPOINT;
  form.method = 'POST';
  form.target = responseFrame.name;

  const requestInput = document.createElement('input');
  requestInput.type = 'hidden';
  requestInput.name = 'request_id';
  form.appendChild(requestInput);

  const setHidden = (name, value) => {
    const input = form.elements.namedItem(name);
    if (input) input.value = value || '';
  };

  const normalizeUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) return raw;
    if (/^www\./i.test(raw) || /^[^/\s]+\.[^/\s]+(?:\/.*)?$/i.test(raw)) return `https://${raw}`;
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

  const setBusy = (busy) => {
    submit.disabled = busy;
    if (busy) {
      submit.setAttribute('aria-busy', 'true');
      submitLabel.textContent = 'Enviando…';
    } else {
      submit.removeAttribute('aria-busy');
      submitLabel.textContent = 'Enviar solicitud';
    }
  };

  const showError = (message) => {
    status.textContent = message;
    status.className = 'form-status error';
    status.hidden = false;
    status.focus();
  };

  const showSubmittedState = () => {
    submitted = true;
    form.classList.add('is-submitted');
    Array.from(form.elements).forEach((control) => {
      control.disabled = true;
    });
    status.innerHTML = `
      <span class="form-status-kicker">Solicitud recibida</span>
      <strong>Gracias. Ya tenemos tu solicitud.</strong>
      <span>Vamos a revisarla y te vamos a responder por email o WhatsApp para contarte el próximo paso.</span>
    `;
    status.className = 'form-status success';
    status.hidden = false;
    status.focus();
  };

  const finishWithError = () => {
    pendingRequestId = '';
    if (responseTimer) {
      clearTimeout(responseTimer);
      responseTimer = null;
    }
    setBusy(false);
    showError('No pudimos registrar la solicitud. Probá nuevamente o escribinos a diagnostico@sinecdo.com.');
  };

  const makeRequestId = () => {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  };

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.source !== RESPONSE_SOURCE) return;
    if (!pendingRequestId || data.requestId !== pendingRequestId) return;

    if (responseTimer) {
      clearTimeout(responseTimer);
      responseTimer = null;
    }

    if (data.ok === true) {
      pendingRequestId = '';
      sessionStorage.setItem(SESSION_KEY, '1');
      showSubmittedState();
      return;
    }

    finishWithError();
  });

  populateTracking();

  if (sessionStorage.getItem(SESSION_KEY) === '1') {
    showSubmittedState();
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (submitted || pendingRequestId || !form.reportValidity()) return;

    if (webInput) webInput.value = normalizeUrl(webInput.value);
    if (linkedinInput) linkedinInput.value = normalizeUrl(linkedinInput.value);

    pendingRequestId = makeRequestId();
    requestInput.value = pendingRequestId;
    setBusy(true);
    status.textContent = 'Enviando solicitud…';
    status.className = 'form-status';
    status.hidden = false;

    responseTimer = window.setTimeout(() => {
      if (!pendingRequestId) return;
      finishWithError();
    }, RESPONSE_TIMEOUT_MS);

    HTMLFormElement.prototype.submit.call(form);
  });
})();