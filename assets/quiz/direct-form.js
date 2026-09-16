(() => {'use strict';
const form=document.getElementById('lead-form'),cap=window.SinecdoCapture;if(!form||!cap)return;
const lang=document.documentElement.lang.split('-')[0],t=cap.labels[lang]||cap.labels.es;
const status=document.getElementById('lead-form-status');let busy=false,receipt=null,attempt=null;
function show(s){status.textContent=s;status.hidden=false;status.focus();}
form.addEventListener('submit',async ev=>{
 ev.preventDefault();if(busy||receipt)return;
 const fields=Object.fromEntries(new FormData(form));let first=null;
 for(const e of form.elements){if(e.required&&(!e.checkValidity()||(e.type!=='checkbox'&&!e.value.trim()))){e.setAttribute('aria-invalid','true');first=first||e;}}
 if(first){show(t.invalid);first.focus();return;}
 const p={type:'direct',locale:lang,name:fields.nombre,email:fields.email,company:fields.empresa,role:fields.rol,industry:fields.rubro,web:fields.web,whatsapp:fields.whatsapp,linkedin:fields.linkedin,problem:fields.problema,accepted:!!fields.consentimiento,contact_requested:true,intent:'solicito_diagnostico',privacy_version:cap.VERSION,consent_version:cap.VERSION,website_check:fields.website_check||'',attribution:cap.attribution('form_direct')};
 const fingerprint=JSON.stringify(p);if(!attempt||attempt.fingerprint!==fingerprint)attempt={fingerprint,id:cap.uuid()};p.request_id=attempt.id;
 busy=true;const controls=[...form.querySelectorAll('input,textarea,button')];controls.forEach(e=>e.disabled=true);show(t.sending);
 try{const r=await cap.submit(p);receipt=r.receipt;show(t.diagnosticOk+' '+t.receipt+': '+receipt);cap.event('registration_saved',{locale:lang,entry:'form_direct'});}
 catch(e){show(e.message==='not_configured'?t.disabled:t.error);cap.event('registration_error',{locale:lang,entry:'form_direct'});}
 finally{busy=false;if(!receipt)controls.forEach(e=>e.disabled=false);}
});
})();