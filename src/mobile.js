console.log("[IRON] Android V5.1 Cloud Voice + Conversation geladen");

import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Camera } from '@capacitor/camera';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { SpeechRecognition } from '@capgo/capacitor-speech-recognition';

const IronPhone = registerPlugin('IronPhone');

const state = {
  native: Capacitor.isNativePlatform(),
  voiceIndex: undefined,
};

function log(...args){ console.log('[IRON Mobile]', ...args); }

async function chooseMaleGermanVoice(){
  try{
    const result = await TextToSpeech.getSupportedVoices();
    const voices = result?.voices || [];
    const maleHints = ['conrad','stefan','hans','markus','michael','male','mann','männlich'];
    let bestIndex = -1, bestScore = -1;

    voices.forEach((v, i)=>{
      const name = String(v?.name || '').toLowerCase();
      const lang = String(v?.lang || '').toLowerCase();
      let score = 0;
      if(lang.startsWith('de')) score += 100;
      if(v?.localService) score += 10;
      for(const hint of maleHints) if(name.includes(hint)) score += 40;
      if(score > bestScore){ bestScore = score; bestIndex = i; }
    });

    if(bestIndex >= 0){
      state.voiceIndex = bestIndex;
      log('TTS voice:', voices[bestIndex]?.name, voices[bestIndex]?.lang);
    }
  }catch(e){
    console.warn('[IRON Mobile] voice detection:', e);
  }
}

const CLOUD_BASE = 'https://starter-function-4j4o.fra.appwrite.run';
let activeAudio = null;
let conversationMode = false;
let conversationBusy = false;

async function systemSpeak(value){
  await TextToSpeech.stop().catch(()=>{});
  await TextToSpeech.speak({
    text: value, lang:'de-DE', rate:0.92, pitch:0.78, volume:1.0,
    ...(Number.isInteger(state.voiceIndex) ? { voice: state.voiceIndex } : {})
  });
}

async function cloudSpeak(value){
  const r = await fetch(`${CLOUD_BASE}/api/tts`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({text:value})
  });
  const data = await r.json().catch(()=>({}));
  if(!r.ok || !data?.ok || !data?.audio_base64) throw new Error(data?.error || `TTS HTTP ${r.status}`);
  if(activeAudio){ try{activeAudio.pause();}catch{} activeAudio=null; }
  const audio = new Audio(`data:${data.mime_type || 'audio/mpeg'};base64,${data.audio_base64}`);
  activeAudio=audio;
  await audio.play();
  await new Promise((resolve,reject)=>{ audio.onended=resolve; audio.onerror=()=>reject(new Error('Audio konnte nicht abgespielt werden.')); });
  activeAudio=null;
}

async function speak(text){
  const value=String(text||'').trim(); if(!value) return;
  try{ await cloudSpeak(value); }
  catch(e){ console.warn('[IRON Mobile] Cloud TTS fallback:',e); try{await systemSpeak(value);}catch(err){console.warn('[IRON Mobile] TTS:',err);} }
}

async function stopSpeaking(){
  if(activeAudio){ try{activeAudio.pause(); activeAudio.currentTime=0;}catch{} activeAudio=null; }
  await TextToSpeech.stop().catch(()=>{});
}

async function runConversationTurn(){
  if(!conversationMode || conversationBusy) return;
  conversationBusy=true;
  try{
    const text=await listenOnce();
    if(text && typeof window.command==='function') await window.command(text);
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

async function init(){
  if(!state.native){
    log('Browser mode');
    return;
  }

  log('Android native mode');
  await chooseMaleGermanVoice();
  await requestNotifications().catch(()=>{});
  cloudSelfTest().catch(()=>{});
  setTimeout(installContactVoiceCommands, 500);

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
  startConversation,
  stopConversation,
  stopSpeaking,
  init
};

document.addEventListener('DOMContentLoaded', init);
