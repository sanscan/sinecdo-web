(() => {
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbzM62i0CqEVCqH7oxFj3wBsjqB0Ry2Pza6Zi9e5jUiUGwi4OD-S_pArMURvk62qdxQL1A/exec';
  const SESSION_KEY = 'sinecdoLeadSubmitted';
  const form = document.querySelector('#lead-form');

  if (!form) return;

  const status = document.querySelector('#lead-form-status');
  const submit = form.querySelector('button[type="submit"]');
  const submitLabel = submit.querySelector('[data-submit-label]');
  const params = new URLSearchParams(window.location.search);
  const webInput = form.elements.namedItem('web');
  const linkedinInput = form.elements.namedItem('linkedin');
  let submitted = false;

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

  const makeRequestId = () => {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

  const showSubmittedState = () => {
    submitted = true;
    form.classList.add('is-submitted');
    Array.from(form.elements).forEach((control) => {
      control.disabled = true;
    });

    status.innerHTML = `
      <span class="form-status-kicker">Solicitud recibida</span>
      <strong>Gracias. Recibimos tu solicitud.</strong>
      <span>La vamos a revisar y te responderemos por email o WhatsApp con el próximo paso.</span>
    `;
    status.className = 'form-status success';
    status.hidden = false;
    status.focus();
  };

  const showError = () => {
    status.textContent = 'No pudimos enviar la solicitud. Probá nuevamente o escribinos a diagnostico@sinecdo.com.';
    status.className = 'form-status error';
    status.hidden = false;
    status.focus();
  };

  populateTracking();

  if (sessionStorage.getItem(SESSION_KEY) === '1') {
    showSubmittedState();
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitted || !form.reportValidity()) return;

    if (webInput) webInput.value = normalizeUrl(webInput.value);
    if (linkedinInput) linkedinInput.value = normalizeUrl(linkedinInput.value);

    requestInput.value = makeRequestId();
    const data = new FormData(form);
    const body = new URLSearchParams();
    data.forEach((value, key) => body.append(key, String(value)));

    setBusy(true);
    status.textContent = 'Enviando solicitud…';
    status.className = 'form-status';
    status.hidden = false;

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
      setBusy(false);
      showError();
    }
  });
})();