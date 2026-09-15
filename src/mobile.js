
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

async function speak(text){
  const value = String(text || '').trim();
  if(!value) return;

  try{
    await TextToSpeech.stop().catch(()=>{});
    await TextToSpeech.speak({
      text: value,
      lang: 'de-DE',
      rate: 0.92,
      pitch: 0.78,
      volume: 1.0,
      ...(Number.isInteger(state.voiceIndex) ? { voice: state.voiceIndex } : {})
    });
  }catch(e){
    console.warn('[IRON Mobile] TTS:', e);
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
      extra: { source: 'IRON' }
    }]
  });

  return { id: notificationId, at: when.toISOString() };
}

async function listenOnce(){
  const p = await SpeechRecognition.checkPermissions();
  if(p?.speechRecognition !== 'granted'){
    await SpeechRecognition.requestPermissions();
  }

  const available = await SpeechRecognition.available();
  if(!available?.available) throw new Error('Spracherkennung ist auf diesem Gerät nicht verfügbar.');

  const result = await SpeechRecognition.start({
    language: 'de-DE',
    maxResults: 3,
    partialResults: false,
    popup: false
  });

  const text = result?.matches?.[0] || '';
  if(text) log('heard:', text);
  return text;
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

async function init(){
  if(!state.native){
    log('Browser mode');
    return;
  }

  log('Android native mode');
  await chooseMaleGermanVoice();
  await requestNotifications().catch(()=>{});

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
  init
};

document.addEventListener('DOMContentLoaded', init);
