console.log("[IRON] Android V6 Core Integration geladen");

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
      extra: { source: 'IRON' }
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


async function callContactByName(name){
  if(!isNative) throw new Error('Kontaktanrufe sind nur in der Android-App verfügbar.');
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


async function createCalendarEvent(event){
  if(!state.native) throw new Error("Kalender ist nur in der Android-App verfügbar.");
  return IronCalendar.createEvent({
    title:String(event?.title||"Termin"),
    description:String(event?.description||""),
    location:String(event?.location||""),
    start:String(event?.start||""),
    end:String(event?.end||""),
    timezone:String(Intl.DateTimeFormat().resolvedOptions().timeZone||"Europe/Luxembourg"),
    reminderMinutes:Number.isFinite(Number(event?.reminder_minutes)) ? Number(event.reminder_minutes) : 15
  });
}

async function init(){
  if(!state.native){
    log('Browser mode');
    return;
  }

  log('Android native mode');
  await requestNotifications().catch(()=>{});
  cloudSelfTest().catch(()=>{});
  setTimeout(installContactVoiceCommands, 500);
  App.addListener('appStateChange',({isActive})=>{ if(isActive) window.dispatchEvent(new Event('iron-app-resume')); });

  installHudControls();
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
  cloudSelfTest,
  callContactByName,
  createCalendarEvent,
  startConversation,
  stopConversation,
  stopSpeaking,
  init
};

document.addEventListener('DOMContentLoaded', init);
