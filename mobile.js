console.log("[IRON] Android V7.6 Voice Core + Ideen geladen");

import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import { Camera } from '@capacitor/camera';
import { SpeechRecognition } from '@capgo/capacitor-speech-recognition';

const IronPhone = registerPlugin('IronPhone');
const IronCalendar = registerPlugin('IronCalendar');

const state = {
  native: Capacitor.isNativePlatform(),
};

function log(...args){ console.log('[IRON Mobile]', ...args); }

const CLOUD_BASE = 'https://starter-function-4j4o.fra.appwrite.run';
const IRON_SHARED_CONVERSATION_ID = 'main';
let activeAudio = null;
let conversationMode = false;
let conversationBusy = false;

function cleanSpeechText(value) {
  return String(value ?? "")
    .replace(/https?:\/\/\S+/gi, " Link ")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ")
    .replace(/[*_#>`~|•▪◦●○■□✓✔☐☑→←↑↓]+/g, " ")
    .replace(/[,:;()[\]{}"“”„'’…\/\\]+/g, " ")
    .replace(/\s*[-–—]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function speak(text) {
  text = cleanSpeechText(text);
  if (!text) return;

  // V5.5: IRON has its own cloud voice. Never fall back to the phone's TTS voice.
  try {
    const response = await fetch(`${CLOUD_BASE}/api/tts`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ text })
    });

    let data = null;
    try { data = await response.json(); } catch {}

    if (!response.ok || !data?.ok || !data?.audio_base64) {
      throw new Error(data?.error || `Cloud Voice HTTP ${response.status}`);
    }

    if (activeAudio) { try { activeAudio.pause(); } catch {} activeAudio=null; }

    const audio = new Audio(`data:${data.mime_type || "audio/mpeg"};base64,${data.audio_base64}`);
    activeAudio = audio;

    await new Promise((resolve, reject) => {
      audio.onended = resolve;
      audio.onerror = () => reject(new Error("IRON Cloud Voice konnte nicht abgespielt werden."));
      audio.play().catch(reject);
    });
  } catch (error) {
    console.error("[IRON CLOUD VOICE]", error);
    // Deliberately NO Android/Xiaomi TTS fallback.
    // The answer remains visible as text in the HUD.
    window.dispatchEvent(new CustomEvent("iron-cloud-voice-error", {
      detail: { message: String(error?.message || error) }
    }));
  } finally {
    activeAudio = null;
  }
}

async function stopSpeaking() {
  if(activeAudio){
    try{ activeAudio.pause(); activeAudio.currentTime=0; }catch{}
    activeAudio=null;
  }
}


async function runConversationTurn(){
  if(!conversationMode || conversationBusy) return;
  conversationBusy=true;
  try{
    const text=await listenOnce();
    if(text && typeof window.command==='function') { await window.command(text); if(window.__ironLastSpeechPromise) await window.__ironLastSpeechPromise.catch(()=>{}); }
  }catch(e){ console.warn('[IRON Mobile] conversation:',e); }
  finally{
    conversationBusy=false;
    if(conversationMode) setTimeout(runConversationTurn,700);
  }
}

function startConversation(){ conversationMode=true; runConversationTurn(); return true; }
async function stopConversation(){ conversationMode=false; await stopSpeaking(); return true; }


async function ensureIronNotificationChannel(){
  if(!state.native) return;
  try{
    await LocalNotifications.createChannel({
      id:'iron-important',
      name:'IRON wichtige Hinweise',
      description:'Wichtige Termine, Tasks und Erinnerungen von IRON',
      importance:5,
      visibility:1,
      vibration:true,
      lights:true
    });
  }catch(e){
    console.warn('[IRON Mobile] notification channel:',e);
  }
}

async function requestNotifications(){
  try{
    const current = await LocalNotifications.checkPermissions();
    if(current.display !== 'granted'){
      return await LocalNotifications.requestPermissions();
    }
    return current;
  }catch(e){
    console.warn('[IRON Mobile] notifications:', e);
    return null;
  }
}

async function scheduleNotification({title='IRON TASK', body='Task-Erinnerung', at, id} = {}){
  const perm = await requestNotifications();
  if(perm?.display !== 'granted'){
    throw new Error('Benachrichtigungen wurden nicht erlaubt.');
  }

  const when = at instanceof Date ? at : new Date(at || (Date.now() + 60_000));
  if(Number.isNaN(when.getTime())) throw new Error('Ungültiger Zeitpunkt.');

  const notificationId = Number.isInteger(id) ? id : Math.floor(Date.now()/1000) % 2147483000;

  await LocalNotifications.schedule({
    notifications: [{
      id: notificationId,
      title,
      body,
      schedule: { at: when, allowWhileIdle: true },
      channelId: 'iron-important',
      extra: { source: 'IRON', body, title }
    }]
  });

  return { id: notificationId, at: when.toISOString() };
}

async function listenOnce(){
  let p = await SpeechRecognition.checkPermissions();
  if(p?.speechRecognition !== 'granted') p = await SpeechRecognition.requestPermissions();
  if(p?.speechRecognition !== 'granted') throw new Error('Spracherkennung wurde nicht erlaubt.');

  const available = await SpeechRecognition.available();
  if(!available?.available) throw new Error('Android-Spracherkennung ist nicht verfügbar.');

  try{
    const result = await SpeechRecognition.start({
      language:'de-DE',
      maxResults:5,
      partialResults:false,
      popup:true
    });
    return String((result?.matches || []).find(Boolean) || '').trim();
  }catch(e){
    const msg=String(e?.message || e || '').toLowerCase();
    if(msg.includes('no match') || msg.includes('nomatch')) return '';
    throw e;
  }
}

async function pickHudImage(){
  const result = await Camera.pickImages({ limit: 1, quality: 92 });
  const photo = result?.photos?.[0];
  const src = photo?.webPath || photo?.path;
  if(!src) throw new Error('Kein Bild ausgewählt.');

  const img = document.getElementById('hudImage');
  const empty = document.getElementById('hudImageEmpty');
  if(img){
    img.src = src;
    img.classList.add('active');
  }
  if(empty) empty.hidden = true;
  return src;
}

async function callNumber(number, direct=true){
  const cleaned = String(number || '').replace(/[^\d+]/g,'');
  if(!cleaned) throw new Error('Keine Telefonnummer angegeben.');
  if(direct){
    return IronPhone.call({ number: cleaned });
  }
  return IronPhone.dial({ number: cleaned });
}


function installHomeCoreConversation(){
  const reactor=document.querySelector('.v7-reactor');
  if(!reactor || reactor.dataset.ironTalkInstalled==='1') return;
  reactor.dataset.ironTalkInstalled='1';
  reactor.setAttribute('role','button');
  reactor.setAttribute('tabindex','0');
  reactor.setAttribute('aria-label','Mit IRON sprechen');
  const update=(on)=>{
    reactor.classList.toggle('voice-live',on);
    const st=document.getElementById('voiceStatus');
    if(st) st.textContent=on?'LISTENING':'STANDBY';
  };
  const toggle=async()=>{
    if(conversationMode){
      conversationMode=false;
      await stopConversation().catch(()=>{});
      update(false);
      window.show?.('Sprachgespräch beendet.');
    }else{
      update(true);
      window.show?.('IRON hört zu. Tippe den Kern erneut, um das Gespräch zu beenden.');
      startConversation();
    }
  };
  reactor.addEventListener('click',toggle);
  reactor.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});
}

function installHudControls(){
  if(!state.native) return;

  const uploadBtn = document.getElementById('uploadBtn');
  if(uploadBtn && !document.getElementById('nativeImageBtn')){
    const btn = document.createElement('button');
    btn.id = 'nativeImageBtn';
    btn.textContent = 'KAMERA / GALERIE';
    btn.onclick = async ()=>{
      try{
        await pickHudImage();
        window.show?.('Bild wird im IRON HUD angezeigt.');
      }catch(e){
        window.show?.('Bild-Fehler: ' + (e?.message || e));
      }
    };
    uploadBtn.insertAdjacentElement('afterend', btn);
  }

  const center = document.querySelector('.hud-center');
  if(center && !document.getElementById('ironPhoneBox')){
    const box = document.createElement('div');
    box.id = 'ironPhoneBox';
    box.className = 'iron-phone-box';
    box.innerHTML = `
      <input id="ironPhoneNumber" inputmode="tel" placeholder="Telefonnummer">
      <button id="ironCallBtn">ANRUFEN</button>
      <button id="ironDialBtn">WÄHLFELD</button>
    `;
    center.appendChild(box);

    document.getElementById('ironCallBtn').onclick = async ()=>{
      const n = document.getElementById('ironPhoneNumber').value;
      try{
        await callNumber(n, true);
      }catch(e){
        window.show?.('Anruf: ' + (e?.message || e));
      }
    };
    document.getElementById('ironDialBtn').onclick = async ()=>{
      const n = document.getElementById('ironPhoneNumber').value;
      try{
        await callNumber(n, false);
      }catch(e){
        window.show?.('Wählfeld: ' + (e?.message || e));
      }
    };
  }

  const voiceBtn = document.getElementById('voiceBtn');
  if(voiceBtn){
    voiceBtn.onclick = async ()=>{
      const status = document.getElementById('voiceStatus');
      if(status) status.textContent = 'LISTENING';
      try{
        const text = await listenOnce();
        if(status) status.textContent = text ? 'PROCESSING' : 'STANDBY';
        if(text && typeof window.command === 'function'){
          await window.command(text);
        }else if(!text){
          window.show?.('Ich habe dich nicht verstanden. Versuche es erneut.');
          await speak('Ich habe dich nicht verstanden.');
        }
      }catch(e){
        console.warn('[IRON Mobile] speech:', e);
        window.show?.('Mikrofon-Fehler: ' + (e?.message || e));
      }finally{
        if(status) status.textContent = 'STANDBY';
      }
    };
  }
}

function installTaskReminderUI(){
  if(!state.native || !document.getElementById('tasksList') || document.getElementById('ironReminderBox')) return;

  const host = document.querySelector('.panel-section');
  if(!host) return;

  const box = document.createElement('div');
  box.id = 'ironReminderBox';
  box.className = 'iron-reminder-box';
  box.innerHTML = `
    <h3>IRON ERINNERUNG</h3>
    <input id="ironReminderText" placeholder="Woran soll IRON erinnern?">
    <input id="ironReminderTime" type="datetime-local">
    <button id="ironReminderBtn">BENACHRICHTIGUNG PLANEN</button>
  `;
  host.prepend(box);

  document.getElementById('ironReminderBtn').onclick = async ()=>{
    const body = document.getElementById('ironReminderText').value.trim();
    const raw = document.getElementById('ironReminderTime').value;
    try{
      const result = await scheduleNotification({
        title: 'IRON TASK',
        body: body || 'Task-Erinnerung',
        at: new Date(raw)
      });
      window.show?.('Benachrichtigung geplant.');
      log('notification scheduled', result);
    }catch(e){
      window.show?.('Benachrichtigung: ' + (e?.message || e));
    }
  };
}


async function cloudSelfTest(){
  const base='https://starter-function-4j4o.fra.appwrite.run';
  const paths=['/api/status','/api/news','/api/stocks?symbols=AAPL','/api/weather?city=Luxembourg'];
  const result={};
  for(const path of paths){
    try{
      const r=await fetch(base+path,{cache:'no-store'});
      result[path]={status:r.status,ok:r.ok};
    }catch(e){
      result[path]={ok:false,error:String(e?.message||e)};
    }
  }
  console.log('[IRON Android V2 Cloud Test]',result);
  return result;
}



let pendingSmsDraft = null;
let smsRelayPollBusy = false;

function smsDefaultSlot(){
  const n=Number(localStorage.getItem('iron_sms_sim_slot')||'1');
  return n===2 ? 2 : 1;
}
function setSmsDefaultSlot(slot){
  const n=Number(slot)===2 ? 2 : 1;
  localStorage.setItem('iron_sms_sim_slot',String(n));
  return n;
}

async function listSmsSims(){
  if(!state.native) return [];
  const result=await IronPhone.getSims();
  return Array.isArray(result?.sims) ? result.sims : [];
}

async function sendSms(number,message,simSlot=smsDefaultSlot(),senderNumber=""){
  if(!state.native) throw new Error('SMS-Versand ist nur in der Android-App verfügbar.');
  const cleaned=String(number||'').replace(/[^\d+]/g,'');
  const body=String(message||'').trim();
  if(!cleaned) throw new Error('Keine Zielnummer angegeben.');
  if(!body) throw new Error('SMS-Text ist leer.');
  return IronPhone.sendSms({
    number:cleaned,
    message:body,
    simSlot:Number(simSlot)===2?2:1,
    senderNumber:String(senderNumber||"")
  });
}

function parseSmsVoice(text){
  const raw=String(text||'').trim();
  if(!/\b(sms|textnachricht|kurznachricht)\b/i.test(raw)) return null;

  const simMatch=raw.match(/\bsim\s*([12])\b/i);
  const numberMatch=raw.match(/(\+?\d[\d\s()/-]{5,}\d)/);
  if(!numberMatch) return {error:'Keine Zielnummer erkannt.'};

  const number=numberMatch[1].replace(/[^\d+]/g,'');
  let message=raw.slice(numberMatch.index+numberMatch[0].length).trim().replace(/^[,.:;\-\s]+/,'');
  message=message.replace(/^(?:mit\s+dem\s+text|mit\s+text|nachricht|text|dass|mit)\s*[:,-]?\s*/i,'').trim();
  message=message.replace(/\s+(?:über|ueber|mit)\s+sim\s*[12]\s*$/i,'').trim();

  if(!message) return {error:'Kein SMS-Text erkannt.'};
  return {
    number,
    message,
    simSlot:simMatch?Number(simMatch[1]):smsDefaultSlot()
  };
}

async function registerSmsRelay(){
  if(!state.native || !window.IRONCloud) return false;
  try{
    const user=await window.IRONCloud.currentUser();
    if(!user?.$id) return false;

    const lastUser=localStorage.getItem('iron_sms_relay_user')||'';
    const lastAt=Number(localStorage.getItem('iron_sms_relay_at')||'0');
    if(lastUser===user.$id && Date.now()-lastAt < 6*60*60*1000) return true;

    await window.IRONCloud.create(window.IRONCloud.cfg.tables.pcCommands,{
      command:`SMS_REGISTER::${user.$id}`,
      status:'pending',
      created_at:new Date().toISOString(),
      result:''
    });
    localStorage.setItem('iron_sms_relay_user',user.$id);
    localStorage.setItem('iron_sms_relay_at',String(Date.now()));
    console.log('[IRON SMS] Relay registration queued.');
    return true;
  }catch(e){
    console.warn('[IRON SMS] Relay registration:',e);
    return false;
  }
}

function decodeBase64UrlUtf8(value){
  let s=String(value||'').replace(/-/g,'+').replace(/_/g,'/');
  while(s.length%4) s+='=';
  const bin=atob(s);
  const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function pollSmsRelay(){
  if(!state.native || smsRelayPollBusy || !window.IRONCloud) return;
  smsRelayPollBusy=true;
  try{
    const user=await window.IRONCloud.currentUser().catch(()=>null);
    if(!user) return;

    const rows=await window.IRONCloud.list(
      window.IRONCloud.cfg.tables.pcCommands,
      [window.IRONCloud.Query.orderDesc('$createdAt'),window.IRONCloud.Query.limit(50)]
    );

    const jobs=(rows||[]).filter(r=>{
      const c=String(r?.command||'');
      return r?.status==='pending' && (c.startsWith('SMS::') || c.startsWith('SMSV2::'));
    });

    for(const row of jobs){
      const commandText=String(row.command||'');
      const parts=commandText.split('::');
      let simSlot=1, senderNumber='', number='', encoded='';

      if(commandText.startsWith('SMSV2::')){
        if(parts.length<5) continue;
        simSlot=Number(parts[1])===2?2:1;
        senderNumber=parts[2]||'';
        number=parts[3]||'';
        encoded=parts.slice(4).join('::');
      }else{
        if(parts.length<4) continue;
        simSlot=Number(parts[1])===2?2:1;
        number=parts[2]||'';
        encoded=parts.slice(3).join('::');
      }

      // Claim first. If we cannot update the row, do NOT send and risk duplicates.
      await window.IRONCloud.update(
        window.IRONCloud.cfg.tables.pcCommands,row.$id,
        {status:'running',result:'Android übernimmt SMS'}
      );

      try{
        const message=decodeBase64UrlUtf8(encoded);
        const result=await sendSms(number,message,simSlot,senderNumber);
        await window.IRONCloud.update(
          window.IRONCloud.cfg.tables.pcCommands,row.$id,
          {status:'done',result:`SMS gesendet über SIM ${result?.simSlot||simSlot}`}
        );
        window.show?.(`SMS über SIM ${result?.simSlot||simSlot} gesendet.`);
        await speak(`SMS über SIM ${result?.simSlot||simSlot} gesendet.`);
      }catch(e){
        await window.IRONCloud.update(
          window.IRONCloud.cfg.tables.pcCommands,row.$id,
          {status:'error',result:String(e?.message||e).slice(0,500)}
        ).catch(()=>{});
        window.show?.('SMS-Fehler: '+(e?.message||e));
      }
    }
  }catch(e){
    // Normal while not logged in / no visible jobs.
    console.warn('[IRON SMS] Queue poll:',e);
  }finally{
    smsRelayPollBusy=false;
  }
}

function installSmsVoiceCommands(){
  const original=window.command;
  if(typeof original!=='function') return;

  window.command=async function(text){
    const raw=String(text||'').trim();
    const low=raw.toLowerCase();

    const setSim=low.match(/(?:benutze|verwende|nimm|standard).*sim\s*([12]).*sms|sms.*(?:benutze|verwende|nimm|standard).*sim\s*([12])/i);
    if(setSim){
      const slot=Number(setSim[1]||setSim[2])===2?2:1;
      setSmsDefaultSlot(slot);
      const answer=`Für SMS verwende ich standardmäßig SIM ${slot}.`;
      window.show?.(answer); await speak(answer); return;
    }

    if(pendingSmsDraft){
      if(/^(?:ja|jap|jawohl|okay|ok|senden|schick|abschicken)\b/i.test(low)){
        const draft=pendingSmsDraft; pendingSmsDraft=null;
        try{
          const result=await sendSms(draft.number,draft.message,draft.simSlot);
          const answer=`SMS über SIM ${result?.simSlot||draft.simSlot} gesendet.`;
          window.show?.(answer); await speak(answer);
        }catch(e){
          window.show?.('SMS-Fehler: '+(e?.message||e));
          await speak('Die SMS konnte nicht gesendet werden.');
        }
        return;
      }
      if(/^(?:nein|nee|abbrechen|nicht senden|verwerfen)\b/i.test(low)){
        pendingSmsDraft=null;
        window.show?.('SMS verworfen.'); await speak('SMS verworfen.'); return;
      }
    }

    const parsed=parseSmsVoice(raw);
    if(parsed){
      if(parsed.error){
        window.show?.(parsed.error); await speak(parsed.error); return;
      }
      pendingSmsDraft=parsed;
      const answer=`SMS über SIM ${parsed.simSlot} vorbereitet. Soll ich sie senden?`;
      window.show?.(answer); await speak(answer); return;
    }

    return original(text);
  };
}

async function installSmsHudControls(){
  if(!state.native) return;
  const center=document.querySelector('.hud-center');
  if(!center || document.getElementById('ironSmsBox')) return;

  const box=document.createElement('div');
  box.id='ironSmsBox';
  box.className='iron-phone-box';
  box.innerHTML=`
    <div style="margin-top:8px;font-size:10px;letter-spacing:1px">SMS RELAY</div>
    <select id="ironSmsSim"><option value="1">SIM 1</option><option value="2">SIM 2</option></select>
    <input id="ironSmsNumber" inputmode="tel" placeholder="SMS Zielnummer">
    <input id="ironSmsText" placeholder="SMS Text">
    <button id="ironSmsSendBtn">SMS SENDEN</button>
  `;
  center.appendChild(box);

  const select=document.getElementById('ironSmsSim');
  select.value=String(smsDefaultSlot());
  select.onchange=()=>setSmsDefaultSlot(Number(select.value));

  try{
    const sims=await listSmsSims();
    if(sims.length){
      select.innerHTML=sims.map(s=>
        `<option value="${Number(s.slot)||1}">SIM ${Number(s.slot)||1} · ${String(s.carrier||s.displayName||'')}</option>`
      ).join('');
      select.value=String(smsDefaultSlot());
    }
  }catch(e){
    console.warn('[IRON SMS] SIM list:',e);
  }

  document.getElementById('ironSmsSendBtn').onclick=async()=>{
    const number=document.getElementById('ironSmsNumber').value;
    const message=document.getElementById('ironSmsText').value;
    try{
      const result=await sendSms(number,message,Number(select.value));
      window.show?.(`SMS über SIM ${result?.simSlot||select.value} gesendet.`);
    }catch(e){
      window.show?.('SMS-Fehler: '+(e?.message||e));
    }
  };
}


async function callContactByName(name){
  if(!state.native) throw new Error('Kontaktanrufe sind nur in der Android-App verfügbar.');
  const IronPhone = registerPlugin('IronPhone');
const IronCalendar = registerPlugin('IronCalendar');
  const found = await IronPhone.lookupContact({ name:String(name||'').trim() });
  if(!found?.number) throw new Error('Keine Telefonnummer für diesen Kontakt gefunden.');
  await speak(`Ich rufe ${found.name || name} an.`);
  return IronPhone.call({ number:found.number });
}

function installContactVoiceCommands(){
  const original = window.command;
  if(typeof original !== 'function') return;
  window.command = async function(text){
    const raw=String(text||'').trim();
    const m=raw.match(/^(?:iron[,\s]*)?(?:ruf|rufe)\s+(.+?)(?:\s+an)?$/i);
    if(m){
      try{
        return await callContactByName(m[1].trim());
      }catch(e){
        window.show?.(e?.message || String(e));
        await speak('Ich konnte den Kontakt nicht anrufen.');
        return;
      }
    }
    return original(text);
  };
}


async function listCalendarEvents({start,end} = {}){
  if(!state.native) return {ok:false,events:[]};
  const now=Date.now();
  return IronCalendar.listEvents({
    start: Number(start || (now - 86400000)),
    end: Number(end || (now + 90*86400000))
  });
}

async function scheduleCalendarNotifications(event){
  const startDate=new Date(event?.start);
  const startMs=startDate.getTime();
  if(!Number.isFinite(startMs)) return [];

  const important=!!event?.important;
  const reminder=Number.isFinite(Number(event?.reminder_minutes))
    ? Math.max(0,Number(event.reminder_minutes))
    : 15;

  const results=[];
  const title=String(event?.title||"Termin");
  const timeLabel=startDate.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});

  // Day-of notification: 08:00 on the appointment day.
  const dayReminder=new Date(startDate);
  dayReminder.setHours(8,0,0,0);
  if(dayReminder.getTime() > Date.now()+5000){
    try{
      results.push(await scheduleNotification({
        title:"IRON // TERMIN HEUTE",
        body:`Sir, vergessen Sie Ihren Termin nicht. Heute um ${timeLabel}: ${title}.`,
        at:dayReminder
      }));
    }catch(e){
      console.warn("[IRON Mobile] day reminder:",e);
    }
  } else {
    // If the appointment is today and 08:00 has already passed, send a near-immediate
    // reminder once, as long as the appointment is still in the future.
    const now=new Date();
    if(startDate.toDateString()===now.toDateString() && startMs>Date.now()+60000){
      try{
        results.push(await scheduleNotification({
          title:"IRON // TERMIN HEUTE",
          body:`Sir, vergessen Sie Ihren Termin nicht. Heute um ${timeLabel}: ${title}.`,
          at:new Date(Date.now()+8000)
        }));
      }catch(e){
        console.warn("[IRON Mobile] immediate day reminder:",e);
      }
    }
  }

  // Standard/important pre-event reminders.
  const slots = important
    ? [...new Set([60, reminder, 5])]
    : [...new Set([reminder])];

  for(const minutes of slots){
    const at=new Date(startMs - minutes*60000);
    if(at.getTime() <= Date.now()+5000) continue;
    const prefix=important ? "IRON // WICHTIGER TERMIN" : "IRON // TERMIN";
    const body=minutes===0
      ? `Sir, ${title} beginnt jetzt.`
      : `Sir, vergessen Sie Ihren Termin nicht. In ${minutes} Minuten: ${title}.`;
    try{
      results.push(await scheduleNotification({title:prefix,body,at}));
    }catch(e){
      console.warn("[IRON Mobile] calendar notification:",e);
    }
  }
  return results;
}

async function createCalendarEvent(event){
  if(!state.native) throw new Error("Kalender ist nur in der Android-App verfügbar.");

  // Native calendar entry is created without a second calendar-provider alert.
  // IRON schedules its own notification(s) below.
  const nativeResult=await IronCalendar.createEvent({
    title:String(event?.title||"Termin"),
    description:String(event?.description||""),
    location:String(event?.location||""),
    start:String(event?.start||""),
    end:String(event?.end||""),
    timezone:String(Intl.DateTimeFormat().resolvedOptions().timeZone||"Europe/Luxembourg"),
    reminderMinutes:-1
  });

  const notifications=await scheduleCalendarNotifications(event);
  return {...nativeResult,notifications};
}


async function init(){
  if(!state.native){
    log('Browser mode');
    return;
  }

  log('Android native mode');
  await ensureIronNotificationChannel().catch(()=>{});
  await requestNotifications().catch(()=>{});
  cloudSelfTest().catch(()=>{});
  setTimeout(installContactVoiceCommands, 500);
  setTimeout(installSmsVoiceCommands, 800);
  setTimeout(()=>installSmsHudControls().catch(()=>{}), 1000);
  setTimeout(()=>registerSmsRelay().catch(()=>{}), 1800);
  setInterval(()=>pollSmsRelay().catch(()=>{}), 10000);
  App.addListener('appStateChange',({isActive})=>{ if(isActive){ window.dispatchEvent(new Event('iron-app-resume')); registerSmsRelay().catch(()=>{}); pollSmsRelay().catch(()=>{}); } });
  LocalNotifications.addListener('localNotificationActionPerformed', async (action)=>{
    const n=action?.notification;
    const body=n?.body || n?.extra?.body;
    if(body){
      setTimeout(()=>speak(body).catch(()=>{}),450);
    }
  });


  installHudControls();
  installHomeCoreConversation();
  installTaskReminderUI();
}

window.IRONMobile = {
  isNative: state.native,
  speak,
  listenOnce,
  scheduleNotification,
  requestNotifications,
  pickHudImage,
  callNumber,
  sendSms,
  listSmsSims,
  pollSmsRelay,
  cloudSelfTest,
  callContactByName,
  createCalendarEvent,
  listCalendarEvents,
  startConversation,
  stopConversation,
  stopSpeaking,
  init
};

document.addEventListener('DOMContentLoaded', init);
