const SPREADSHEET_ID = '1G3h35WQv7IM0IjOAz7WTQYo_3kocd8GwqNzYBru9Gv4';
const SHEET_NAME = 'Leads';
const NOTIFY_TO = 'diagnostico@sinecdo.com';
const TIMEZONE = 'America/Argentina/Buenos_Aires';

function doGet() {
  return ContentService.createTextOutput('Sinecdo lead capture endpoint OK');
}

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};

    // Honeypot: bots often fill hidden fields. Return success silently.
    if (String(p.website_check || '').trim()) {
      return ContentService.createTextOutput('ok');
    }

    const nombre = clean_(p.nombre);
    const empresa = clean_(p.empresa);
    const email = clean_(p.email).toLowerCase();
    const problema = clean_(p.problema);
    const consentimiento = clean_(p.consentimiento);

    if (!nombre || !empresa || !email || !problema || consentimiento !== 'si') {
      throw new Error('Faltan campos obligatorios o consentimiento.');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Email inválido.');
    }

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
      clean_(p.rol),                       // G Rol / cargo
      clean_(p.rubro),                     // H Rubro / vertical
      email,                               // I Email
      clean_(p.whatsapp),                  // J WhatsApp
      clean_(p.pais),                      // K País
      clean_(p.web),                       // L Web
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
