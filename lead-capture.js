(() => {
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbzM62i0CqEVCqH7oxFj3wBsjqB0Ry2Pza6Zi9e5jUiUGwi4OD-S_pArMURvk62qdxQL1A/exec';
  const form = document.querySelector('#lead-form');

  if (!form) return;

  const status = document.querySelector('#lead-form-status');
  const submit = form.querySelector('button[type="submit"]');
  const submitLabel = submit.querySelector('[data-submit-label]');
  const params = new URLSearchParams(window.location.search);

  const setHidden = (name, value) => {
    const input = form.elements.namedItem(name);
    if (input) input.value = value || '';
  };

  setHidden('utm_source', params.get('utm_source'));
  setHidden('utm_medium', params.get('utm_medium'));
  setHidden('utm_campaign', params.get('utm_campaign'));
  setHidden('utm_content', params.get('utm_content'));
  setHidden('campania', params.get('utm_campaign'));
  setHidden('origen', (params.get('utm_source') || '').toLowerCase() === 'ens' ? 'ENS' : 'Web');
  setHidden('page_url', window.location.href);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

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

      form.reset();
      setHidden('utm_source', params.get('utm_source'));
      setHidden('utm_medium', params.get('utm_medium'));
      setHidden('utm_campaign', params.get('utm_campaign'));
      setHidden('utm_content', params.get('utm_content'));
      setHidden('campania', params.get('utm_campaign'));
      setHidden('origen', (params.get('utm_source') || '').toLowerCase() === 'ens' ? 'ENS' : 'Web');
      setHidden('page_url', window.location.href);

      status.textContent = 'Solicitud enviada. La revisamos antes de abrir agenda y te respondemos por email o WhatsApp.';
      status.classList.add('success');
      status.hidden = false;
      status.focus();
    } catch (error) {
      console.error(error);
      status.textContent = 'No pudimos enviar la solicitud. Probá de nuevo o escribinos a diagnostico@sinecdo.com.';
      status.classList.add('error');
      status.hidden = false;
      status.focus();
    } finally {
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
      submitLabel.textContent = 'Enviar solicitud';
    }
  });
})();
