const SPREADSHEET_ID = '1G3h35WQv7IM0IjOAz7WTQYo_3kocd8GwqNzYBru9Gv4';
const SHEET_NAME = 'Leads';
const NOTIFY_TO = 'diagnostico@sinecdo.com';
const TIMEZONE = 'America/Argentina/Buenos_Aires';
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const ALLOWED_HOSTNAMES = ['sinecdo.com', 'www.sinecdo.com'];

function doGet() {
  return ContentService.createTextOutput('Sinecdo lead capture endpoint OK');
}

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};

    // Honeypot: bots often fill hidden fields. Return success silently without storing anything.
    if (String(p.website_check || '').trim()) {
      return ContentService.createTextOutput('ok');
    }

    const nombre = clean_(p.nombre);
    const empresa = clean_(p.empresa);
    const rol = clean_(p.rol);
    const rubro = clean_(p.rubro);
    const email = clean_(p.email).toLowerCase();
    const whatsapp = clean_(p.whatsapp);
    const web = clean_(p.web);
    const problema = clean_(p.problema);
    const consentimiento = clean_(p.consentimiento);
    const turnstileToken = clean_(p['cf-turnstile-response']);

    if (!nombre || !empresa || !rol || !rubro || !email || !whatsapp || !web || !problema || consentimiento !== 'si') {
      throw new Error('Faltan campos obligatorios o consentimiento.');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Email inválido.');
    }

    verifyTurnstile_(turnstileToken);

    const now = new Date();
    const leadId = 'LEAD-' + Utilities.formatDate(now, TIMEZONE, 'yyyyMMdd-HHmmss') + '-' + Math.floor(100 + Math.random() * 900);
    const source = normalizeSource_(p.origen, p.utm_source);
    const campaign = clean_(p.campania || p.utm_campaign);
    const notes = buildNotes_(p);

    const row = [
      leadId,                              // A ID
      now,                                 // B Fecha ingreso
      source,                              // C Origen
      campaign,                            // D Evento / campaña
      nombre,                              // E Nombre y apellido
      empresa,                             // F Empresa / marca
      rol,                                 // G Rol / cargo
      rubro,                               // H Rubro / vertical
      email,                               // I Email
      whatsapp,                            // J WhatsApp
      clean_(p.pais),                      // K País
      web,                                 // L Web
      clean_(p.linkedin),                  // M LinkedIn
      '',                                  // N Qué vende
      problema,                            // O Problema / señal
      '',                                  // P Objetivo 3–6 meses
      '',                                  // Q Autoridad
      '',                                  // R Disposición a invertir
      '',                                  // S Fit
      'Contacto obtenido',                 // T Estado
      'Revisar fit',                       // U Próximo paso
      '',                                  // V Fecha seguimiento
      'Solicitar diagnóstico',             // W Motivo de contacto
      'Sí',                                // X Consentimiento
      notes                                // Y Notas
    ];

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('No se encontró la hoja Leads.');
    sheet.appendRow(row);

    notify_(leadId, row);

    return ContentService.createTextOutput('ok');
  } catch (err) {
    console.error(err);
    return ContentService.createTextOutput('error');
  }
}

function verifyTurnstile_(token) {
  if (!token) throw new Error('Falta verificación anti-spam.');

  const secret = PropertiesService.getScriptProperties().getProperty('TURNSTILE_SECRET_KEY');
  if (!secret) throw new Error('TURNSTILE_SECRET_KEY no está configurada.');

  const response = UrlFetchApp.fetch(TURNSTILE_VERIFY_URL, {
    method: 'post',
    payload: {
      secret: secret,
      response: token
    },
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  let result = {};
  try {
    result = JSON.parse(response.getContentText() || '{}');
  } catch (parseError) {
    throw new Error('Respuesta inválida de Turnstile.');
  }

  if (status !== 200 || result.success !== true) {
    const codes = Array.isArray(result['error-codes']) ? result['error-codes'].join(',') : 'unknown';
    throw new Error('Turnstile rechazó la solicitud: ' + codes);
  }

  if (result.hostname && ALLOWED_HOSTNAMES.indexOf(String(result.hostname).toLowerCase()) === -1) {
    throw new Error('Hostname de Turnstile no autorizado.');
  }
}

function notify_(leadId, row) {
  const nombre = row[4];
  const empresa = row[5];
  const rol = row[6];
  const rubro = row[7];
  const email = row[8];
  const whatsapp = row[9];
  const web = row[11];
  const linkedin = row[12];
  const problema = row[14];
  const origen = row[2];
  const campania = row[3];

  const subject = `Nuevo lead web — ${empresa} — ${nombre}`;
  const text = [
    'Nueva solicitud recibida desde sinecdo.com',
    '',
    `ID: ${leadId}`,
    `Nombre: ${nombre}`,
    `Empresa: ${empresa}`,
    `Rol: ${rol || '-'}`,
    `Rubro: ${rubro || '-'}`,
    `Email: ${email}`,
    `WhatsApp: ${whatsapp || '-'}`,
    `Web: ${web || '-'}`,
    `LinkedIn: ${linkedin || '-'}`,
    `Origen: ${origen}`,
    `Campaña: ${campania || '-'}`,
    '',
    'Qué quiere resolver:',
    problema,
    '',
    'Próximo paso interno: revisar fit en SINECDO_CRM_LEADS.'
  ].join('\n');

  MailApp.sendEmail({
    to: NOTIFY_TO,
    replyTo: email,
    subject: subject,
    body: text,
    name: 'Sinecdo Web'
  });
}

function normalizeSource_(origin, utmSource) {
  const raw = clean_(utmSource || origin).toLowerCase();
  if (raw === 'ens') return 'ENS';
  if (raw === 'linkedin') return 'LinkedIn';
  if (raw === 'whatsapp') return 'WhatsApp';
  if (raw === 'email') return 'Email';
  if (raw === 'instagram') return 'Instagram';
  if (raw === 'referido' || raw === 'referral') return 'Referido';
  return 'Web';
}

function buildNotes_(p) {
  const parts = [];
  if (p.utm_medium) parts.push(`utm_medium=${clean_(p.utm_medium)}`);
  if (p.utm_content) parts.push(`utm_content=${clean_(p.utm_content)}`);
  if (p.page_url) parts.push(`page=${clean_(p.page_url)}`);
  return parts.join(' | ');
}

function clean_(value) {
  return String(value || '').trim().slice(0, 2000);
}
