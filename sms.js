(() => {
 const $=s=>document.querySelector(s);
 const status=(message)=>{ $('#smsStatus').textContent=String(message); };
 const values=()=>{
   const number=$('#smsNumber').value.trim().replace(/[\s()-]/g,'');
   const message=$('#smsMessage').value.trim();
   const slot=Number($('#smsSlot').value);
   if(!/^\+?\d{5,18}$/.test(number)||!message)throw new Error('Bitte gültige Nummer und Nachricht eingeben.');
   return {number,message,slot};
 };
 window.addEventListener('iron-sms-status',e=>status(e.detail));
 $('#smsCompose').onclick=async()=>{
   try{const data=values();await window.IRONMobile.composeSms(data.number,data.message);status('SMS-App geöffnet. Bitte Nachricht dort absenden.');}
   catch(e){status(e?.message||e);}
 };
 $('#smsSend').onclick=async()=>{
   try{
     const data=values();
     if(!confirm(`SMS an ${data.number} über SIM ${data.slot} an Android übergeben?`))return;
     await window.IRONMobile.sendSms(data.number,data.message,data.slot);
     status('SMS an Android übergeben. Zustellung ist noch nicht bestätigt.');
   }catch(e){status(e?.message||e);}
 };
 $('#smsPair').onclick=async()=>{
   try{await window.IRONMobile.pairSms();await window.IRONMobile.pollSms();status('PC-Verbindung geprüft. IRON fragt neue SMS-Aufträge ab.');}
   catch(e){status(e?.message||e);}
 };
 if(!window.IRONMobile?.isNative)status('SMS-Versand und PC-Relay sind nur in der Android-App verfügbar.');
 else status('App bereit. Melde dich an und tippe auf „Mit PC koppeln“.');
})();
