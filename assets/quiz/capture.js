/* Shared first-party capture. No analytics vendor or PII in URLs. */
(() => {
'use strict';
const VERSION='2026-09-16.1';
const safe={get:k=>{try{return sessionStorage.getItem(k);}catch(_){return null;}},set:(k,v)=>{try{sessionStorage.setItem(k,v);}catch(_){}},del:k=>{try{sessionStorage.removeItem(k);}catch(_){}}};
const uuid=()=>{if(crypto.randomUUID)return crypto.randomUUID();const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=[...b].map(v=>v.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);};
const labels={
 es:{title:'¿Querés compartir tu resultado con Sinecdo?',copy:'Dejanos tus datos para registrar tu caso. Podés indicar si también querés que conversemos.',name:'Nombre y apellido',email:'Email',company:'Empresa / marca',web:'Web (opcional)',whatsapp:'WhatsApp (opcional)',accept:'Acepto que Sinecdo guarde mis datos y respuestas para registrar y comprender mi caso, según el aviso de privacidad.',contact:'Quiero que Sinecdo me contacte para conversar sobre mi caso.',submit:'Compartir mi resultado',diagnostic:'Solicitar una sesión de diagnóstico',note:'No crea una cuenta ni agenda una reunión. No te suscribe a campañas.',privacy:'Aviso de privacidad',invalid:'Revisá los campos obligatorios y el email. Para registrar el caso, aceptá el uso de los datos.',sending:'Guardando tu registro…',ok:'Tu resultado quedó registrado. No solicitaste contacto ni se abrió una agenda.',contactOk:'Recibimos tus datos y tu resultado. Revisaremos tu caso para responderte.',diagnosticOk:'Recibimos tu solicitud. Revisaremos el contexto y te pediremos los materiales que falten antes de habilitar agenda.',error:'No pudimos confirmar el registro. Tus datos siguen acá: podés reintentar.',disabled:'El registro todavía no está habilitado en este entorno. No se enviaron datos.',receipt:'Comprobante',test:'ENTORNO DE PRUEBA · No representa una solicitud comercial.',revoked:'La solicitud se revisa antes de cualquier contacto.'},
 en:{title:'Would you like to share your result with Sinecdo?',copy:'Leave your details so we can record your case. You can also let us know if you would like to talk.',name:'Full name',email:'Email',company:'Company / brand',web:'Website (optional)',whatsapp:'WhatsApp (optional)',accept:'I agree that Sinecdo may store my details and answers to record and understand my case, as described in the privacy notice.',contact:'I would like Sinecdo to contact me to discuss my case.',submit:'Share my result',diagnostic:'Request a diagnostic session',note:'This does not create an account, book a meeting or subscribe you to campaigns.',privacy:'Privacy notice',invalid:'Check the required fields and email address. Accept the use of your data to submit.',sending:'Saving your submission…',ok:'Your result has been recorded. You have not requested contact or booked a meeting.',contactOk:'We received your details and result. We will review your case and get back to you.',diagnosticOk:'We received your request. We will review your case and ask for any missing materials before sharing a booking link.',error:'We could not confirm the submission. Your details are still here: you can retry.',disabled:'Registration has not been enabled in this environment. No data was sent.',receipt:'Receipt',test:'TEST ENVIRONMENT · Not a commercial request.',revoked:'Requests are reviewed before any contact.'},
 it:{title:'Vuoi condividere il tuo risultato con Sinecdo?',copy:'Lasciaci i tuoi dati per registrare il tuo caso. Puoi anche indicarci se desideri parlarne con noi.',name:'Nome e cognome',email:'Email',company:'Azienda / brand',web:'Sito web (facoltativo)',whatsapp:'WhatsApp (facoltativo)',accept:'Acconsento alla conservazione dei miei dati e delle mie risposte da parte di Sinecdo per registrare e comprendere il mio caso, come descritto nell’informativa sulla privacy.',contact:'Desidero essere contattato da Sinecdo per parlare del mio caso.',submit:'Condividi il mio risultato',diagnostic:'Richiedi una sessione di diagnosi',note:'Non crea un account, non prenota un incontro e non ti iscrive a campagne.',privacy:'Informativa sulla privacy',invalid:'Controlla i campi obbligatori e l’email. Per inviare, accetta l’uso dei tuoi dati.',sending:'Registrazione in corso…',ok:'Il tuo risultato è stato registrato. Non hai richiesto di essere contattato né prenotato un incontro.',contactOk:'Abbiamo ricevuto i tuoi dati e il tuo risultato. Esamineremo il tuo caso e ti risponderemo.',diagnosticOk:'Abbiamo ricevuto la richiesta. Esamineremo il contesto e chiederemo i materiali mancanti prima di condividere il calendario.',error:'Non abbiamo potuto confermare la registrazione. I tuoi dati sono ancora qui: puoi riprovare.',disabled:'La registrazione non è ancora attiva in questo ambiente. Nessun dato è stato inviato.',receipt:'Ricevuta',test:'AMBIENTE DI TEST · Non è una richiesta commerciale.',revoked:'Le richieste vengono esaminate prima di qualsiasi contatto.'}
};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const channels={linkedin:'LinkedIn',instagram:'Instagram',email:'Email',whatsapp:'WhatsApp',referral:'Referido',referido:'Referido',ens:'ENS'};
function attribution(entry) {
 const p=new URLSearchParams(location.search);const ch=channels[(p.get('utm_source')||'').toLowerCase()]||'Directo/no identificado';
 let prev;try{prev=JSON.parse(safe.get('sinecdo.attribution.v1'));}catch(_){}
 const a=prev&&Date.now()-prev.at<1800000?prev:{at:Date.now(),initial_channel:ch,recent_channel:ch,medium:'',campaign:'',content:''};
 if(p.has('utm_source')){a.recent_channel=ch;for(const k of ['medium','campaign','content']){const v=p.get('utm_'+k)||'';a[k]=/^[a-zA-Z0-9_-]{0,100}$/.test(v)?v:'';}}
 safe.set('sinecdo.attribution.v1',JSON.stringify(a));return {initial_channel:a.initial_channel,recent_channel:a.recent_channel,medium:a.medium,campaign:a.campaign,content:a.content,entry,path:location.pathname};
}
function event(name,meta={}) {
 const allowed=['need','role','timing','locale','entry','step'];const value={name};for(const k of allowed)if(typeof meta[k]==='string')value[k]=meta[k];
 window.dispatchEvent(new CustomEvent('sinecdo:metric',{detail:value}));
}
async function submit(payload) {
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
 try {
  const r=await fetch('/api/intake.php',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(payload),signal:controller.signal});
  let d;try{d=await r.json();}catch(_){throw new Error('unconfirmed');}
  if(!r.ok||d.ok!==true||d.request_id!==payload.request_id||!/^REG-[a-zA-Z0-9-]{16,80}$/.test(d.receipt||''))throw new Error(d.code||'unconfirmed');
  return d;
 }finally{clearTimeout(timer);}
}
let draft={},attempt=null,receipt=null,busy=false;
function reset(){draft={};attempt=null;receipt=null;busy=false;}
function mount(host,ctx){
 const t=labels[ctx.lang];const section=document.createElement('section');section.className='q-register';section.id='q-register';
 const fields=[['name',t.name,'text','name'],['email',t.email,'email','email'],['company',t.company,'text','organization'],['web',t.web,'text','url'],['whatsapp',t.whatsapp,'tel','tel']];
 if(!draft.name && ctx.answers.name)draft.name=ctx.answers.name;
 section.innerHTML=`<h2>${esc(t.title)}</h2><p>${esc(t.copy)}</p><form id="quiz-register" novalidate><div class="q-reg-fields">${fields.map(([k,label,type,autocomplete])=>`<div class="q-field"><label for="reg-${k}">${esc(label)}${['name','email','company'].includes(k)?' *':''}</label><input id="reg-${k}" name="${k}" type="${type}" autocomplete="${autocomplete}" ${['name','email','company'].includes(k)?'required':''} maxlength="${k==='name'?120:k==='email'?180:k==='company'?160:k==='web'?500:80}" value="${esc(draft[k]||'')}"></div>`).join('')}</div><label class="q-check"><input name="accepted" type="checkbox" required ${draft.accepted?'checked':''}><span>${esc(t.accept)} <a href="/privacy/${ctx.lang}/" target="_blank" rel="noopener">${esc(t.privacy)}</a></span></label><label class="q-check"><input name="contact_requested" type="checkbox" ${draft.contact_requested?'checked':''}><span>${esc(t.contact)}</span></label><div hidden aria-hidden="true"><input name="website_check" tabindex="-1" autocomplete="off"></div><div class="q-reg-actions"><button class="q-primary" type="submit">${esc(t.submit)}</button><button class="q-secondary" type="submit" name="diagnostic" value="yes">${esc(t.diagnostic)}</button></div><p class="q-reg-note">${esc(t.note)}</p><p id="reg-status" tabindex="-1" role="status" hidden></p></form>`;
 host.querySelector('.q-main').append(section);
 const form=section.querySelector('form'),status=section.querySelector('#reg-status');
 function show(text,error=false){status.textContent=text;status.hidden=false;status.className=error?'q-error':'q-receipt';status.focus();}
 function read(){for(const e of form.elements)if(e.name&&e.type!=='submit')draft[e.name]=e.type==='checkbox'?e.checked:e.value;}
 form.addEventListener('input',()=>{read();form.querySelectorAll('[aria-invalid]').forEach(e=>e.removeAttribute('aria-invalid'));});
 if(receipt){form.querySelectorAll('input,button').forEach(el=>el.disabled=true);show((receipt.intent==='solo_registro'?t.ok:receipt.intent==='solicito_diagnostico'?t.diagnosticOk:t.contactOk)+' '+t.receipt+': '+receipt.id);}
 if(busy)form.querySelectorAll('input,button').forEach(el=>el.disabled=true);
 form.addEventListener('submit',async ev=>{
  ev.preventDefault();if(busy||receipt)return;read();let invalid=null;
  for(const el of form.querySelectorAll('input[required]'))if(!el.checkValidity()||(el.type!=='checkbox'&&!el.value.trim())){el.setAttribute('aria-invalid','true');invalid=invalid||el;}
  if(invalid){show(t.invalid,true);invalid.focus();return;}
  const intent=ev.submitter?.name==='diagnostic'?'solicito_diagnostico':draft.contact_requested?'quiero_contacto':'solo_registro';
  const payload={type:'quiz',locale:ctx.lang,quiz_version:VERSION,privacy_version:VERSION,consent_version:VERSION,accepted:true,contact_requested:intent!=='solo_registro',intent,...Object.fromEntries(['name','email','company','web','whatsapp','website_check'].map(k=>[k,draft[k]||''])),need:ctx.answers.need,role:ctx.answers.role,timing:ctx.answers.timing,industry:ctx.answers.industry||'',quiz_run_id:ctx.runId,attribution:attribution('hero_quiz')};
  const fingerprint=JSON.stringify(payload);if(!attempt||attempt.fingerprint!==fingerprint)attempt={fingerprint,id:uuid()};payload.request_id=attempt.id;
  busy=true;form.querySelectorAll('input,button').forEach(el=>el.disabled=true);show(t.sending);event('registration_submit',{locale:ctx.lang,entry:'quiz'});
  try{const response=await submit(payload);receipt={id:response.receipt,intent};show((intent==='solo_registro'?t.ok:intent==='solicito_diagnostico'?t.diagnosticOk:t.contactOk)+' '+t.receipt+': '+response.receipt);event('registration_saved',{locale:ctx.lang,entry:'quiz'});}
  catch(err){show(err.message==='not_configured'?t.disabled:t.error,true);event('registration_error',{locale:ctx.lang,entry:'quiz'});}
  finally{busy=false;if(!receipt)form.querySelectorAll('input,button').forEach(el=>el.disabled=false);}
 });
}
window.SinecdoCapture={VERSION,safe,uuid,labels,attribution,event,submit,mount,reset};
attribution('landing');
})();