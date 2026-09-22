console.log("[IRON] APP.JS Android V3 geladen");
/* =========================================================
   IRON v19.8 – DATE DISPLAY FIX
   ========================================================= */
function formatDate(value) {
  if (!value) return "";

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString("de-LU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (error) {
    console.warn("[IRON] Datum konnte nicht formatiert werden:", error);
    return String(value);
  }
}

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const cloud = window.IRONCloud;
if (!cloud) {
  const why = window.IRON_APPWRITE_LOAD_ERROR || "IRON Appwrite Bridge wurde nicht geladen.";
  console.error("IRON Cloud startup:", why);
  window.addEventListener("DOMContentLoaded", () => {
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;inset:20px;z-index:99999;background:#12080a;color:#ff8290;border:1px solid #ff5265;padding:18px;font:14px monospace;overflow:auto";
    box.innerHTML = "<b>IRON APPWRITE STARTFEHLER</b><br><br>" + String(why) +
      "<br><br>Prüfe, ob <b>iron-appwrite.js</b> auf GitHub hochgeladen wurde.";
    document.body.appendChild(box);
  });
  throw new Error(why);
}
const response = $("#response");
const input = $("#commandInput");
let currentUser = null;
let pcOnline = false;
let pcLastSeen = null;

function show(text) {
  const msg = String(text ?? "");
  if (response) response.textContent = "IRON // " + msg;
  const answer = $("#answerText");
  if (answer) {
    answer.textContent = msg;
    answer.classList.add("has-answer");
  }
  const hudAnswer = $("#hudAnswer");
  if (hudAnswer) hudAnswer.textContent = msg;
}

/* =========================================================
   IRON v20 – MALE VOICE PREFERENCE
   Uses browser SpeechSynthesis. Exact voices depend on OS/browser.
   ========================================================= */
let ironPreferredVoice = null;

function scoreIronVoice(v){
  const name=(v?.name||"").toLowerCase();
  const lang=(v?.lang||"").toLowerCase();
  let score=0;

  if(lang.startsWith("de")) score+=100;

  // Common masculine German voice names across Windows / browser engines.
  const maleHints=[
    "conrad","stefan","hans","markus","michael","male","männlich","mann",
    "de-de male","german male"
  ];
  for(const hint of maleHints){
    if(name.includes(hint)) score+=40;
  }

  // Prefer local OS voices when available.
  if(v?.localService) score+=10;

  return score;
}

function selectIronVoice(){
  if(!("speechSynthesis" in window)) return null;

  const voices=window.speechSynthesis.getVoices() || [];
  if(!voices.length) return null;

  const german=voices.filter(v=>(v.lang||"").toLowerCase().startsWith("de"));
  const pool=german.length ? german : voices;

  pool.sort((a,b)=>scoreIronVoice(b)-scoreIronVoice(a));
  ironPreferredVoice=pool[0] || null;

  if(ironPreferredVoice){
    console.log("[IRON Voice]", ironPreferredVoice.name, ironPreferredVoice.lang);
  }
  return ironPreferredVoice;
}

if("speechSynthesis" in window){
  selectIronVoice();
  window.speechSynthesis.onvoiceschanged=selectIronVoice;
}


function cleanTextForSpeech(value){
  return String(value ?? "")
    .replace(/https?:\/\/\S+/gi," Link ")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu," ")
    .replace(/[*_#>`~|•▪◦●○■□✓✔☐☑→←↑↓]+/g," ")
    .replace(/[,:;()[\]{}"“”„'’…\/\\]+/g," ")
    .replace(/\s*[-–—]\s*/g," ")
    .replace(/\s+/g," ")
    .trim();
}

function speak(text){
  if(window.IRONMobile?.isNative && typeof window.IRONMobile.speak === "function"){
    const p=Promise.resolve(window.IRONMobile.speak(cleanTextForSpeech(text)));
    window.__ironLastSpeechPromise=p;
    return p;
  }
  const msg=String(text||"").trim();
  if(!msg) return;

  if(!("speechSynthesis" in window)){
    const state=document.querySelector("#voiceState");
    if(state) state.textContent="TEXT ONLY";
    return;
  }

  try{
    window.speechSynthesis.cancel();

    const utterance=new SpeechSynthesisUtterance(msg);
    utterance.lang="de-DE";
    utterance.rate=0.93;
    utterance.pitch=0.82;
    utterance.volume=1;

    const voice=ironPreferredVoice || selectIronVoice();
    if(voice) utterance.voice=voice;

    const state=document.querySelector("#voiceState");
    if(state) state.textContent="SPEAKING";

    utterance.onend=()=>{
      const el=document.querySelector("#voiceState");
      if(el) el.textContent="READY";
    };

    utterance.onerror=()=>{
      const el=document.querySelector("#voiceState");
      if(el) el.textContent="TEXT ONLY";
    };

    window.speechSynthesis.speak(utterance);
  }catch(e){
    console.warn("[IRON Voice]",e);
  }
}

function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
}
function nowISO(){ return new Date().toISOString(); }

// ---------- AUTH ----------
function ensureAuthUI() {
  if ($("#ironAuth")) return;
  document.body.insertAdjacentHTML("beforeend", `
    <section class="auth-overlay" id="ironAuth">
      <div class="auth-card">
        <div class="eyebrow">IRON CLOUD // SECURE ACCESS</div>
        <h2>ACCESS REQUIRED</h2>
        <p>Mit deinem Appwrite-IRON-Konto anmelden.</p>
        <input id="authEmail" type="email" placeholder="E-Mail" autocomplete="username">
        <input id="authPassword" type="password" placeholder="Passwort" autocomplete="current-password">
        <button id="authLogin">LOGIN</button>
        <div id="authError"></div>
      </div>
    </section>`);
  $("#authLogin").onclick = async () => {
    const email = $("#authEmail").value.trim();
    const password = $("#authPassword").value;
    const err = $("#authError");
    err.textContent = "";
    try {
      currentUser = await cloud.login(email,password);
      $("#ironAuth").classList.remove("open");
      await afterLogin();
    } catch(e) {
      err.textContent = e?.message || "Login fehlgeschlagen.";
    }
  };
  $("#authPassword").addEventListener("keydown", e=>{ if(e.key==="Enter") $("#authLogin").click(); });
}
async function initAuth(){
  ensureAuthUI();
  try {
    currentUser = await cloud.currentUser();
  } catch(e) {
    setCloudStatus(false);
    $("#ironAuth").classList.add("open");
    const err = $("#authError");
    if (err) err.textContent = `Appwrite-Verbindung fehlgeschlagen [${e?.code || "NET"}]: ${e?.message || e}`;
    return false;
  }
  if (!currentUser) { $("#ironAuth").classList.add("open"); return false; }
  await afterLogin(); return true;
}
async function afterLogin(){
  await checkCloud();
  await Promise.allSettled([checkPC(), renderTasksScreen(), renderPlansScreen(), renderShoppingScreen(), updateHudMetrics()]);
}
window.ironLogout = async()=>{ await cloud.logout(); location.reload(); };

// ---------- STATUS ----------
function setCloudStatus(ok){
  const el = $("#cloudStatus");
  if(el){
    el.textContent = ok ? "ONLINE" : "OFFLINE";
    el.classList.toggle("offline", !ok);
  }
  const hud = $("#hudCloud");
  if(hud) hud.textContent = ok ? "ONLINE" : "OFFLINE";
}

async function checkCloud(){
  try{
    const ok = typeof cloud.pingCloud === "function" ? await cloud.pingCloud() : false;
    setCloudStatus(ok);
    return ok;
  }catch{
    setCloudStatus(false);
    return false;
  }
}

function setPCStatus(ok, lastSeen){
  pcOnline = ok;
  pcLastSeen = lastSeen || null;

  // IMPORTANT: never use a generic ".offline" selector here.
  // It could accidentally overwrite the cloud-status element.
  const el = $("#pcStatus");
  if(el){
    el.textContent = ok ? "ONLINE" : "OFFLINE";
    el.classList.toggle("offline", !ok);
  }

  const hud = $("#hudPC");
  if(hud) hud.textContent = ok ? "ONLINE" : "OFFLINE";
}

async function checkPC(){
  if(!currentUser) return;
  try {
    const row = await cloud.get(cloud.cfg.tables.pcStatus, cloud.cfg.pcStatusRowId);
    const seen = row.last_seen ? new Date(row.last_seen).getTime() : 0;
    const fresh = !!row.online && Date.now()-seen < 45000;
    setPCStatus(fresh,row.last_seen);
  } catch { setPCStatus(false,null); }
}

// ---------- CLOUD DATA ----------
async function createTask(text, datum="Offen"){
  const perms = cloud.userRowPermissions(currentUser?.$id);
  return cloud.create(cloud.cfg.tables.tasks, {
    text, datum, erledigt:false, erstellt:nowISO()
  }, cloud.ID.unique(), perms);
}
async function createPlan(name, inhalt){
  const payload={
    name:String(name||"Plan").trim(),
    inhalt:String(inhalt||"").trim(),
    erstellt:new Date().toISOString(),
    typ:"plan"
  };

  if(!payload.inhalt) throw new Error("Plan-Inhalt ist leer.");

  const row = await cloud.create(cloud.cfg.tables.plans, payload);

  // Keep a local browser copy too, so the page updates instantly even before
  // the next Appwrite read finishes.
  try{
    const cached=JSON.parse(localStorage.getItem("iron_plans_cache")||"[]");
    cached.unshift({...payload,$id:row?.$id||("local_"+Date.now())});
    localStorage.setItem("iron_plans_cache",JSON.stringify(cached.slice(0,100)));
  }catch{}

  // Immediately refresh both plan-related views from the database.
  try{ await renderPlansScreen(); }catch(e){ console.warn("Plan refresh:",e); }
  try{ await renderShoppingScreen(); }catch(e){ console.warn("Shopping refresh:",e); }

  return row;
}
async function loadTasks(){ return renderTasksScreen(); }
async function renderTasksScreen(){
  const el=$("#tasksList"); if(!el || !currentUser) return;
  el.innerHTML="<p class='muted'>Lade Cloud-Tasks...</p>";
  try{
    const tasks=await cloud.list(cloud.cfg.tables.tasks,[cloud.Query.orderDesc("$createdAt"), cloud.Query.limit(100)]);
    el.innerHTML=tasks.length?tasks.map(t=>`<article class="data-card task-card screen-task ${t.erledigt?"done":""}">
      <label><input type="checkbox" ${t.erledigt?"checked":""} onchange="toggleTaskAndRefresh('${t.$id}',this.checked)"><span>${escapeHtml(t.text)}</span></label>
      <small>${escapeHtml(t.datum||"Offen")}</small></article>`).join(""):
      `<div class="empty-screen"><div>✓</div><strong>NO TASKS</strong><p>Zum Beispiel: „Erstelle eine Task Zimmer aufräumen.“</p></div>`;
  }catch(e){ el.innerHTML=`<p class='muted'>Cloud-Tasks konnten nicht geladen werden: ${escapeHtml(e.message)}</p>`; }
}
async function toggleTaskAndRefresh(id,done){ await cloud.update(cloud.cfg.tables.tasks,id,{erledigt:done}); renderTasksScreen(); }
async function deleteTask(id){ await cloud.remove(cloud.cfg.tables.tasks,id); renderTasksScreen(); }

async function renderPlans(){ return renderPlansScreen(); }
async function renderPlansScreen(){
  const host=$("#plansList") || $("#planList") || $("#plansContainer");
  if(!host) return;

  host.innerHTML="<p>Lade Pläne…</p>";

  let rows=[];
  try{
    const data=await cloud.list(cloud.cfg.tables.plans);
    rows=Array.isArray(data) ? data : (data?.rows || data?.documents || []);
  }catch(e){
    console.warn("Appwrite plans read:",e);
  }

  // Fallback/instant cache: useful directly after save and if a read is delayed.
  try{
    const cached=JSON.parse(localStorage.getItem("iron_plans_cache")||"[]");
    const ids=new Set(rows.map(r=>r.$id).filter(Boolean));
    for(const r of cached){
      if(!r.$id || !ids.has(r.$id)) rows.push(r);
    }
  }catch{}

  rows=rows
    .filter(r=>String(r.typ||"").toLowerCase()!=="einkauf" && !String(r.name||"").startsWith("EINKAUF // "))
    .sort((a,b)=>String(b.erstellt||"").localeCompare(String(a.erstellt||"")));

  if(!rows.length){
    host.innerHTML="<p>Noch keine Pläne gespeichert.</p>";
    return;
  }

  host.innerHTML=rows.map(r=>`
    <article class="saved-card">
      <header>
        <h3>${escapeHtml(r.name||"Plan")}</h3>
        <small>${escapeHtml(formatDate(r.erstellt))}</small>
      </header>
      <pre>${escapeHtml(r.inhalt||"")}</pre>
      ${r.$id && !String(r.$id).startsWith("local_")
        ? `<button data-delete-plan="${escapeHtml(r.$id)}">LÖSCHEN</button>` : ""}
    </article>
  `).join("");

  host.querySelectorAll("[data-delete-plan]").forEach(btn=>{
    btn.onclick=async()=>{
      try{
        await cloud.remove(cloud.cfg.tables.plans,btn.dataset.deletePlan);
        await renderPlansScreen();
        await renderShoppingScreen();
      }catch(e){ show(`Löschen fehlgeschlagen: ${e.message}`); }
    };
  });
}
async function deletePlanAndRefresh(id){ await cloud.remove(cloud.cfg.tables.plans,id); renderPlansScreen(); }

const SHOP_PREFIX = "EINKAUF // ";

async function createShoppingList(name, inhalt){
  const cleanName=String(name||"Einkaufsliste").replace(/^EINKAUF\s*\/\/\s*/i,"").trim() || "Einkaufsliste";
  const payload={
    name:`EINKAUF // ${cleanName}`,
    inhalt:String(inhalt||"").trim(),
    erstellt:new Date().toISOString(),
    typ:"einkauf"
  };
  if(!payload.inhalt) throw new Error("Einkaufsliste ist leer.");
  const row=await cloud.create(cloud.cfg.tables.plans,payload);
  try{
    const cached=JSON.parse(localStorage.getItem("iron_plans_cache")||"[]");
    cached.unshift({...payload,$id:row?.$id||("local_"+Date.now())});
    localStorage.setItem("iron_plans_cache",JSON.stringify(cached.slice(0,150)));
  }catch{}
  try{ await renderShoppingScreen(); }catch(e){ console.warn("Shopping render:",e); }
  return row;
}

async function renderShoppingScreen(){
  const host=$("#shoppingList") || $("#shoppingLists") || $("#einkaufList") || $("#einkaufsliste");
  if(!host) return;

  host.innerHTML="<p>Lade Einkaufslisten…</p>";

  let rows=[];
  try{
    const data=await cloud.list(cloud.cfg.tables.plans);
    rows=Array.isArray(data) ? data : (data?.rows || data?.documents || []);
    console.log("IRON shopping rows:", rows);
  }catch(e){
    console.error("Appwrite shopping read:",e);
    host.innerHTML=`<article class="saved-card"><h3>APPWRITE READ FEHLER</h3><p>${escapeHtml(e?.message || String(e))}</p><small>Prüfe plans → Settings → Permissions → READ für deinen angemeldeten Benutzer/Users.</small></article>`;
    return;
  }

  try{
    const cached=JSON.parse(localStorage.getItem("iron_plans_cache")||"[]");
    const ids=new Set(rows.map(r=>r.$id).filter(Boolean));
    for(const r of cached){
      if(!r.$id || !ids.has(r.$id)) rows.push(r);
    }
  }catch{}

  const allRows = rows.slice();
  rows=rows
    .filter(r=>String(r.typ||"").trim().toLowerCase()==="einkauf" || String(r.name||"").trim().toUpperCase().startsWith("EINKAUF //"))
    .sort((a,b)=>String(b.erstellt||"").localeCompare(String(a.erstellt||"")));

  if(!rows.length){
    const preview=allRows.slice(0,5).map(r=>`name=${escapeHtml(r.name||"")} | typ=${escapeHtml(r.typ||"(leer)")}`).join("<br>");
    host.innerHTML=`<article class="saved-card"><h3>Keine Einkaufs-Row erkannt</h3><p>Appwrite READ funktioniert. Gelesene Rows: ${allRows.length}</p><small>${preview || "Keine Rows aus plans erhalten."}</small></article>`;
    return;
  }

  host.innerHTML=rows.map(r=>`
    <article class="saved-card">
      <header>
        <h3>${escapeHtml(String(r.name||"Einkaufsliste").replace(/^EINKAUF\s*\/\/\s*/,"") || "Einkaufsliste")}</h3>
        <small>${escapeHtml(formatDate(r.erstellt))}</small>
      </header>
      <pre>${escapeHtml(r.inhalt||"")}</pre>
      ${r.$id && !String(r.$id).startsWith("local_")
        ? `<button data-delete-shop="${escapeHtml(r.$id)}">LÖSCHEN</button>` : ""}
    </article>
  `).join("");

  host.querySelectorAll("[data-delete-shop]").forEach(btn=>{
    btn.onclick=async()=>{
      try{
        await cloud.remove(cloud.cfg.tables.plans,btn.dataset.deleteShop);
        await renderShoppingScreen();
        await renderPlansScreen();
      }catch(e){ show(`Löschen fehlgeschlagen: ${e.message}`); }
    };
  });
}

async function deleteShoppingAndRefresh(id){
  await cloud.remove(cloud.cfg.tables.plans,id);
  renderShoppingScreen();
}

function shoppingRequested(t){
  return /(einkaufsliste|einkaufs\\s*liste|shopping\\s*list)/i.test(t);
}

function shoppingTitleFromCommand(t){
  const raw=t.replace(/^iron[, ]*/i,"").trim();
  const forMatch=raw.match(/(?:für|fuer)\s+(.+)$/i);
  if(forMatch && forMatch[1]) return `Einkauf – ${forMatch[1].trim().slice(0,120)}`;
  return `Einkaufsliste ${new Date().toLocaleDateString("de-DE")}`;
}

async function buildShoppingList(t){
  const raw=t.replace(/^iron[, ]*/i,"").trim();
  const prompt=`Erstelle aus diesem Wunsch eine übersichtliche Einkaufsliste auf Deutsch:
"${raw}"

Regeln:
- Nur sinnvolle Einkaufsartikel, keine langen Erklärungen.
- Gruppiere nach Kategorien, wenn das hilfreich ist.
- Wenn ein Gericht/Anlass genannt wird, nenne die üblichen Zutaten.
- Verwende Checkbox-Zeilen im Format "☐ Artikel".
- Keine Preise erfinden.`;
  try{
    return await cloud.askAI(prompt);
  }catch(e){
    // Useful recipe fallback if the AI function is temporarily unavailable.
    const low=raw.toLowerCase();
    const recipes=[
      {
        test:/waffel/i,
        items:["Mehl","Milch","Eier","Butter","Zucker","Backpulver","Vanillezucker","1 Prise Salz","etwas Öl oder Butter fürs Waffeleisen"]
      },
      {
        test:/pfannkuchen|pancake/i,
        items:["Mehl","Milch","Eier","1 Prise Salz","Butter oder Öl zum Backen"]
      },
      {
        test:/lasagne/i,
        items:["Lasagneplatten","Hackfleisch oder vegetarische Alternative","Tomaten","Tomatenmark","Zwiebel","Knoblauch","Milch","Butter","Mehl","Käse","Salz","Pfeffer","italienische Kräuter"]
      }
    ];
    const found=recipes.find(r=>r.test.test(low));
    if(found) return found.items.map(x=>`☐ ${x}`).join("\n");

    const cleaned=raw
      .replace(/^(erstelle|erstell|mach|mache)\s+(mir\s+)?(eine\s+)?einkaufs?\s*liste\s*(mit|für|fuer)?\s*/i,"")
      .trim();
    if(cleaned){
      const items=cleaned.split(/,| und /i).map(x=>x.trim()).filter(Boolean);
      if(items.length) return items.map(x=>`☐ ${x}`).join("\n");
    }
    throw e;
  }
}



// ---------- GMAIL READONLY ----------
const GOOGLE_CLIENT_ID = "881990901270-tbc86vea22nb1a3ev6t7ck9cdkbq5avl.apps.googleusercontent.com";
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
let gmailTokenClient = null;
let gmailAccessToken = null;
let gmailLastMails = [];

function gmailSetState(text){
  const el=$("#gmailState");
  if(el) el.textContent=text;
}

function initGmailOAuth(){
  if(!window.google?.accounts?.oauth2){
    gmailSetState("GMAIL: GOOGLE OAUTH LÄDT…");
    return false;
  }
  if(gmailTokenClient) return true;

  gmailTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GMAIL_SCOPE,
    callback: async (resp)=>{
      if(resp?.error){
        gmailSetState("GMAIL: VERBINDUNG FEHLGESCHLAGEN");
        show(`Gmail OAuth Fehler: ${resp.error}`);
        return;
      }
      gmailAccessToken = resp.access_token;
      gmailSetState("GMAIL: VERBUNDEN (NUR LESEN)");
      await loadGmailInbox();
    }
  });
  return true;
}

async function gmailConnect(){
  if(!initGmailOAuth()){
    show("Google OAuth ist noch nicht geladen. Seite kurz neu laden.");
    return;
  }
  gmailTokenClient.requestAccessToken({prompt:"consent"});
}

async function gmailFetch(path){
  if(!gmailAccessToken) throw new Error("Gmail ist nicht verbunden.");
  const r=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/" + path,{
    headers:{Authorization:`Bearer ${gmailAccessToken}`},
    cache:"no-store"
  });
  const j=await r.json().catch(()=>null);
  if(!r.ok) throw new Error(j?.error?.message || `Gmail HTTP ${r.status}`);
  return j;
}

function gmailHeader(headers,name){
  return (headers||[]).find(h=>String(h.name||"").toLowerCase()===name.toLowerCase())?.value || "";
}

async function loadGmailInbox(){
  const box=$("#hudNews");
  if(box) box.innerHTML="<p>Lade Gmail…</p>";
  try{
    const list=await gmailFetch("messages?maxResults=20&q=in:inbox newer_than:14d");
    const ids=(list.messages||[]).slice(0,20);
    const mails=[];
    for(const m of ids){
      const msg=await gmailFetch(`messages/${encodeURIComponent(m.id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);
      mails.push({
        id:msg.id,
        threadId:msg.threadId,
        from:gmailHeader(msg.payload?.headers,"From"),
        subject:gmailHeader(msg.payload?.headers,"Subject") || "(Kein Betreff)",
        date:gmailHeader(msg.payload?.headers,"Date"),
        snippet:msg.snippet || "",
        unread:(msg.labelIds||[]).includes("UNREAD"),
        important:(msg.labelIds||[]).includes("IMPORTANT")
      });
    }
    gmailLastMails=mails;
    if(box){
      box.innerHTML=mails.slice(0,10).map(m=>`
        <div class="hud-live-item">
          <b>${m.unread?"● ":""}${escapeHtml(m.subject)}</b>
          <small>${escapeHtml(m.from)}</small>
          <small>${escapeHtml(m.snippet)}</small>
        </div>
      `).join("") || "<p>Keine Mails im Posteingang.</p>";
    }
    gmailSetState("GMAIL: VERBUNDEN (NUR LESEN)");
    await notifyImportantLoadedMails(mails);
    return mails;
  }catch(e){
    gmailSetState("GMAIL: FEHLER");
    if(box) box.innerHTML=`<p>Gmail Fehler: ${escapeHtml(e.message)}</p>`;
    show(`Gmail Fehler: ${e.message}`);
    throw e;
  }
}

async function summarizeImportantMails(){
  if(!gmailAccessToken){
    show("Gmail ist noch nicht verbunden. Öffne zuerst Gmail im IRON HUD und melde dich an.");
    throw new Error("Gmail ist nicht verbunden.");
  }
  const mails=gmailLastMails.length ? gmailLastMails : await loadGmailInbox();
  const compact=mails.slice(0,20).map((m,i)=>({
    nr:i+1,from:m.from,subject:m.subject,snippet:m.snippet,unread:m.unread,important:m.important,date:m.date
  }));
  const prompt=`Fasse die wichtigsten E-Mails dieses Posteingangs für Sir kurz zusammen.
Priorisiere ungelesene, als IMPORTANT markierte, Termine, Rechnungen, Schule/Arbeit, Bestellungen,
Chevalier & Roth und Dinge, die eine Antwort oder Handlung brauchen.
Ignoriere Newsletter/Werbung wenn sie nicht wichtig sind.
Maximal 6 Mails. Nenne Absender, Betreff und in 1-2 Sätzen was wichtig ist.
E-Mails: ${JSON.stringify(compact)}`;
  const summary=await cloud.askAI(prompt);
  show(summary);
  await speak(summary);
  return summary;
}

async function notifyImportantLoadedMails(mails){
  if(!window.IRONMobile?.isNative || typeof window.IRONMobile.scheduleNotification!=="function") return;
  const candidates=(mails||[]).filter(m=>m.unread && m.important).slice(0,3);
  let seen=[];
  try{ seen=JSON.parse(localStorage.getItem("iron_notified_mail_ids")||"[]"); }catch{}
  const seenSet=new Set(seen);
  for(const m of candidates){
    if(seenSet.has(m.id)) continue;
    const short=`${m.from}: ${m.subject}. ${m.snippet}`.slice(0,350);
    await window.IRONMobile.scheduleNotification({
      title:"IRON // WICHTIGE MAIL",
      body:`Sir, kontrollieren Sie Ihre Mails. ${short}`,
      at:new Date(Date.now()+1500)
    }).catch(()=>{});
    seenSet.add(m.id);
  }
  localStorage.setItem("iron_notified_mail_ids",JSON.stringify([...seenSet].slice(-100)));
}

function gmailDisconnect(){
  try{
    if(gmailAccessToken && window.google?.accounts?.oauth2){
      google.accounts.oauth2.revoke(gmailAccessToken,()=>{});
    }
  }catch{}
  gmailAccessToken=null;
  gmailSetState("GMAIL: NICHT VERBUNDEN");
  show("Gmail wurde von IRON getrennt.");
}

// ---------- LIVE HUD DATA ----------
async function fetchIronJSON(path){
  const call=async p=>{
    const r=await fetch(cloud.cfg.functionDomain+p,{method:"GET",cache:"no-store"});
    const j=await r.json().catch(()=>null);
    return {r,j,p};
  };

  let {r,j,p}=await call(path);

  // Compatibility fallbacks. These avoid a raw 404 when an older function is still active.
  if(r.status===404 && path==="/api/news/important"){
    ({r,j,p}=await call("/api/news"));
  }
  if(r.status===404 && path==="/api/images/list"){
    ({r,j,p}=await call("/api/images/status"));
  }

  if(!r.ok || !j?.ok){
    if(r.status===404){
      throw new Error(`IRON Cloud Route fehlt (${path}). Deploye die Appwrite Function V3.2.`);
    }
    throw new Error(j?.error || `IRON Cloud HTTP ${r.status}`);
  }
  return j;
}

async function postIronJSON(path,body){
  const call=async p=>{
    const r=await fetch(cloud.cfg.functionDomain+p,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=UTF-8"},
      body:JSON.stringify(body||{}),
      cache:"no-store"
    });
    const j=await r.json().catch(()=>null);
    return {r,j,p};
  };

  let {r,j,p}=await call(path);

  if(r.status===404 && path==="/api/research-plan"){
    ({r,j,p}=await call("/api/recipes/research"));
  }

  if(!r.ok || !j?.ok){
    if(r.status===404){
      throw new Error(`IRON Cloud Route fehlt (${path}). Deploye die Appwrite Function V3.2.`);
    }
    throw new Error(j?.error || `IRON Cloud HTTP ${r.status}`);
  }
  return j;
}

async function loadNews(){
  const box=$("#hudNews");
  if(box) box.innerHTML="<p>IRON recherchiert die wichtigsten Weltnachrichten…</p>";
  try{
    const data=await fetchIronJSON("/api/news/important");
    if(box){
      box.innerHTML=(data.items||[]).slice(0,8).map(n=>
        `<a class="hud-live-item" href="${escapeHtml(n.url||"#")}" ${n.url?'target="_blank" rel="noopener"':""}>
          <b>${escapeHtml(n.title||"News")}</b>
          <small>${escapeHtml(n.summary||"")}</small>
          <small>${escapeHtml(n.why_important||"")}</small>
        </a>`
      ).join("") || "<p>Keine wichtigen News gefunden.</p>";
    }
    const spoken=(data.items||[]).slice(0,6).map((n,i)=>`${i+1}. ${n.title}. ${n.summary}`).join(" ");
    const text=data.summary ? `${data.summary}\n\n${spoken}` : spoken;
    show(text || "Keine wichtigen Weltnachrichten gefunden.");
    if(text) speak(text);
    return data;
  }catch(e){
    if(box) box.innerHTML=`<p>News nicht erreichbar: ${escapeHtml(e.message)}</p>`;
    show(`News-Fehler: ${e.message}`);
    throw e;
  }
}

async function loadStocks(){
  const box=$("#hudStocks");
  if(box) box.innerHTML="<p>Lade Kurse…</p>";
  try{
    const data=await fetchIronJSON("/api/stocks?symbols=AAPL,MSFT,NVDA,TSLA");
    if(box){
      box.innerHTML=(data.stocks||[]).map(s=>
        `<div class="hud-live-item"><b>${escapeHtml(s.symbol)}</b>
          <span>${s.price==null?"–":escapeHtml(String(s.price))} ${escapeHtml(s.currency||"")}</span>
          <small>${escapeHtml(s.note||"letzter verfügbarer Kurs")}</small>
        </div>`
      ).join("") || "<p>Keine Kurse gefunden.</p>";
    }
    show("Aktienkurse aktualisiert.");
  }catch(e){
    if(box) box.innerHTML=`<p>Kurse nicht erreichbar: ${escapeHtml(e.message)}</p>`;
    show(`Aktien-Fehler: ${e.message}`);
  }
}

function initHudImage(){
  const uploadBtn=$("#uploadBtn"), imageInput=$("#imageInput"), img=$("#hudImage");
  const empty=$("#hudImageEmpty"), clear=$("#clearImageBtn");
  if(uploadBtn&&imageInput) uploadBtn.onclick=()=>imageInput.click();

  if(imageInput) imageInput.onchange=e=>{
    const file=e.target.files?.[0];
    if(!file) return;
    if(!file.type.startsWith("image/")){
      show("Bitte eine Bilddatei auswählen.");
      return;
    }
    const reader=new FileReader();
    reader.onload=()=>{
      if(img){
        img.src=String(reader.result);
        img.classList.add("active");
      }
      if(empty) empty.hidden=true;
      show(`Bild ${file.name} wird jetzt im IRON HUD angezeigt.`);
    };
    reader.readAsDataURL(file);
    e.target.value="";
  };

  if(clear) clear.onclick=()=>{
    if(img){img.removeAttribute("src");img.classList.remove("active");}
    if(empty) empty.hidden=false;
    show("HUD-Bild entfernt.");
  };

  if(img) img.onclick=()=>{
    if(!img.src) return;
    openImageStudio(img.src,currentCloudImage);
  };
}



function renderEditedImageDataURL(src,{rotation=0,brightness=100,contrast=100}={}){
  return new Promise((resolve,reject)=>{
    const im=new Image();
    im.onload=()=>{
      const swap=Math.abs(rotation%180)===90;
      const canvas=document.createElement("canvas");
      canvas.width=swap?im.naturalHeight:im.naturalWidth;
      canvas.height=swap?im.naturalWidth:im.naturalHeight;
      const ctx=canvas.getContext("2d");
      ctx.filter=`brightness(${brightness}%) contrast(${contrast}%)`;
      ctx.translate(canvas.width/2,canvas.height/2);
      ctx.rotate(rotation*Math.PI/180);
      ctx.drawImage(im,-im.naturalWidth/2,-im.naturalHeight/2);
      resolve(canvas.toDataURL("image/jpeg",0.92));
    };
    im.onerror=()=>reject(new Error("Bild konnte nicht bearbeitet werden."));
    im.src=src;
  });
}

function openImageStudio(src,meta=null){
  const overlay=document.createElement("div");
  overlay.className="hud-image-fullscreen iron-studio-overlay";
  overlay.innerHTML=`
    <div class="iron-image-viewer iron-studio">
      <img src="${src}" alt="IRON Vision">
      <div class="iron-image-tools">
        <button data-zout>−</button><button data-zin>+</button>
        <button data-rl>↶</button><button data-rr>↷</button>
        <button data-bright>☀+</button><button data-dark>☀−</button>
        <button data-contrast>◐+</button><button data-reset>RESET</button>
        <button data-describe>BESCHREIBEN</button><button data-save>SPEICHERN</button>
        <button data-close>×</button>
      </div>
      <div class="iron-image-description-box">
        <input data-name value="${escapeHtml(meta?.name||"IRON Bild")}" placeholder="Bildname">
        <textarea data-desc placeholder="Beschreibung">${escapeHtml(meta?.description||"")}</textarea>
        <button data-save-desc>BESCHREIBUNG SPEICHERN</button>
      </div>
    </div>`;
  const full=overlay.querySelector("img");
  let scale=1,rotation=0,brightness=100,contrast=100;
  const apply=()=>{
    full.style.transform=`scale(${scale}) rotate(${rotation}deg)`;
    full.style.filter=`brightness(${brightness}%) contrast(${contrast}%)`;
  };
  const stop=fn=>e=>{e.stopPropagation();fn(e);};
  overlay.querySelector("[data-zin]").onclick=stop(()=>{scale=Math.min(5,scale+.25);apply();});
  overlay.querySelector("[data-zout]").onclick=stop(()=>{scale=Math.max(.4,scale-.25);apply();});
  overlay.querySelector("[data-rl]").onclick=stop(()=>{rotation-=90;apply();});
  overlay.querySelector("[data-rr]").onclick=stop(()=>{rotation+=90;apply();});
  overlay.querySelector("[data-bright]").onclick=stop(()=>{brightness=Math.min(180,brightness+10);apply();});
  overlay.querySelector("[data-dark]").onclick=stop(()=>{brightness=Math.max(40,brightness-10);apply();});
  overlay.querySelector("[data-contrast]").onclick=stop(()=>{contrast=Math.min(180,contrast+10);apply();});
  overlay.querySelector("[data-reset]").onclick=stop(()=>{scale=1;rotation=0;brightness=100;contrast=100;apply();});
  overlay.querySelector("[data-close]").onclick=stop(()=>overlay.remove());

  overlay.querySelector("[data-describe]").onclick=stop(async()=>{
    try{
      const data=await postIronJSON("/api/vision",{data_url:src,prompt:"Beschreibe dieses Bild knapp und nützlich für meine IRON-Bildbibliothek."});
      overlay.querySelector("[data-desc]").value=data.description||"";
      show(data.description||"Keine Beschreibung erhalten.");
      await speak(data.description||"");
    }catch(e){show("Bildbeschreibung fehlgeschlagen: "+e.message);}
  });

  overlay.querySelector("[data-save-desc]").onclick=stop(async()=>{
    if(!meta?.id){show("Dieses Bild ist noch nicht als Appwrite-Bild gespeichert.");return;}
    try{
      const name=overlay.querySelector("[data-name]").value.trim()||meta.name;
      const description=overlay.querySelector("[data-desc]").value.trim();
      await postIronJSON("/api/images/update",{id:meta.id,name,description});
      meta.name=name; meta.description=description; currentCloudImage=meta;
      show("Bildname und Beschreibung wurden in Appwrite gespeichert.");
    }catch(e){show("Speichern fehlgeschlagen: "+e.message);}
  });

  overlay.querySelector("[data-save]").onclick=stop(async()=>{
    try{
      show("IRON speichert die bearbeitete Version in Appwrite...");
      const edited=await renderEditedImageDataURL(src,{rotation,brightness,contrast});
      const name=(overlay.querySelector("[data-name]").value.trim()||meta?.name||"IRON Bild")+" – bearbeitet";
      const description=overlay.querySelector("[data-desc]").value.trim();
      const data=await postIronJSON("/api/images/upload",{name,description,data_url:edited});
      currentCloudImage=data.image;
      displayCloudImage(edited,name);
      show("Bearbeitete Bildversion wurde in Appwrite gespeichert.");
    }catch(e){show("Bild konnte nicht gespeichert werden: "+e.message);}
  });
  document.body.appendChild(overlay);
}

// ---------- APPWRITE IMAGE LIBRARY ----------
const IRON_IMAGE_API = "https://starter-function-4j4o.fra.appwrite.run";
let currentCloudImage = null;

function extractImageRequest(text){
  let t=String(text||"").replace(/^iron[\s,.:;-]*/i,"").trim();
  if(!/\b(zeig|zeige|öffne|oeffne|lade)\b/i.test(t)) return null;
  if(!/\b(bild|foto|image|logo)\b/i.test(t)) return null;
  t=t.replace(/^.*?\b(?:zeig|zeige|öffne|oeffne|lade)\b/i,"");
  t=t.replace(/^\s*(?:mir\s+)?(?:bitte\s+)?(?:das|den|die|ein|eine)?\s*/i,"");
  t=t.replace(/^\s*(?:bild|foto|image|logo)\s*(?:von|vom|für|fuer)?\s*/i,"");
  t=t.replace(/\s+(?:im|in meinem)\s+hud.*$/i,"").replace(/[.!?]+$/,"").trim();
  return t || null;
}

function displayCloudImage(dataUrl, name="IRON Bild"){
  const img=$("#hudImage"), empty=$("#hudImageEmpty");
  if(!img) throw new Error("HUD-Bildbereich wurde nicht gefunden.");
  img.src=dataUrl;
  img.alt=name;
  img.classList.add("active");
  if(empty) empty.hidden=true;
  img.scrollIntoView({behavior:"smooth",block:"center"});
}

async function showAppwriteImage(name){
  // Dedicated photo screen: do not use HUD for cloud photos anymore.
  const target=`photos.html?name=${encodeURIComponent(name)}`;
  sessionStorage.setItem("iron_photo_open_name",name);
  location.href=target;
  return {ok:true,name};
}

function smartPlanAndShoppingRequested(t){
  const x=String(t||"").toLowerCase();
  const food=/\b(gericht|gerichte|rezept|rezepte|mahlzeit|mahlzeiten|kochen|zubereiten|zutaten)\b/i.test(x);
  const plan=/\b(plan|wochenplan|tagesplan|woche|tage|mal pro woche|pro woche|ablauf)\b/i.test(x);
  const shopping=/\b(einkauf|einkaufsliste|einkaufslisten|zutatenliste|zutaten|materialliste|materialien)\b/i.test(x);
  const multi=/\b([2-9]|10|11|12)\b.*\b(gericht|gerichte|mahlzeit|mahlzeiten|rezept|rezepte)\b/i.test(x);
  // Recipe requests with schedule/list intent always use the researched combined mode.
  if(food && (plan || shopping || multi)) return true;
  return plan && shopping;
}

function parseIronJson(raw){
  const txt=String(raw||"").trim()
    .replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");
  const a=txt.indexOf("{"), b=txt.lastIndexOf("}");
  if(a<0 || b<a) throw new Error("IRON konnte den kombinierten Plan nicht strukturieren.");
  return JSON.parse(txt.slice(a,b+1));
}

async function buildSmartPlanAndShopping(raw){
  const data=await postIronJSON("/api/research-plan",{request:raw});
  if(!data.plan || !Array.isArray(data.shopping_lists)) throw new Error("Unvollständige Web-Recherche.");
  return data;
}

function formatRecipeShopping(recipe){
  const rows=(recipe.ingredients||[]).map(x=>{
    const amount=String(x.amount||"").trim();
    const item=String(x.item||"").trim();
    return `☐ ${amount ? amount+" " : ""}${item}`.trim();
  }).filter(Boolean);
  const source=recipe.source_url ? `\n\nQuelle: ${recipe.source_title||recipe.source_url}\n${recipe.source_url}` : "";
  return `${recipe.name}${recipe.servings?`\nPortionen: ${recipe.servings}`:""}\n\n${rows.join("\n")}${source}`;
}

function formatRecipePlan(data){
  const schedule=(data.schedule||[]).map(x=>`• ${x.slot}: ${x.recipe_name}`).join("\n");
  const recipes=(data.recipes||[]).map((r,idx)=>{
    const steps=(r.steps||[]).map((s,i)=>`${i+1}. ${s}`).join("\n");
    const source=r.source_url?`\nQuelle: ${r.source_title||r.source_url}\n${r.source_url}`:"";
    return `${idx+1}. ${r.name}${r.servings?` (${r.servings})`:""}\n\nZubereitung:\n${steps}${source}`;
  }).join("\n\n────────────────────\n\n");
  return `${data.plan_summary||""}${schedule?`\n\nWOCHEN-/ABLAUFPLAN\n${schedule}`:""}\n\n${recipes}`.trim();
}

async function saveSmartPlanAndShopping(raw){
  show("IRON sucht passende Rezepte/Ideen online und erstellt Plan + Einkaufslisten...");
  const data=await buildSmartPlanAndShopping(raw);

  if(Array.isArray(data.recipes) && data.recipes.length){
    const planName=String(data.plan_name||"IRON Rezeptplan").slice(0,180);
    const planText=formatRecipePlan(data);
    await createPlan(planName,planText);

    let savedLists=0;
    for(const recipe of data.recipes){
      const content=formatRecipeShopping(recipe);
      if(content.trim()){
        await createShoppingList(recipe.name,content);
        savedLists++;
      }
    }
    try{ await renderPlansScreen(); }catch{}
    try{ await renderShoppingScreen(); }catch{}
    const msg=`Online-Recherche fertig. ${data.recipes.length} Gerichte gefunden, Plan gespeichert und ${savedLists} Einkaufslisten gespeichert.`;
    show(msg); await speak(msg);
    return data;
  }

  // General non-food project fallback.
  const planName=String(data.plan_name||"IRON Plan").slice(0,180);
  const planText=String(data.plan||data.plan_summary||"").trim();
  if(planText) await createPlan(planName,planText);
  let savedLists=0;
  for(const list of (data.shopping_lists||[])){
    if(String(list?.content||"").trim()){
      await createShoppingList(list.name||"Einkauf",list.content);
      savedLists++;
    }
  }
  const msg=`Plan und ${savedLists} Einkaufs-/Materiallisten wurden gespeichert.`;
  show(msg); await speak(msg);
  return data;
}

function calendarCommandRequested(t){
  const x=String(t||"").toLowerCase();
  return /\b(termin|kalender|kalendereintrag|meeting|verabredung)\b/.test(x)
    && /\b(mach|mache|erstell|erstelle|trag|trage|eintragen|plane|plan)\b/.test(x);
}
async function createCalendarFromCommand(raw){
  if(!window.IRONMobile?.isNative || typeof window.IRONMobile.createCalendarEvent!=="function"){
    throw new Error("Kalendereinträge sind in der Android-App verfügbar.");
  }
  const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Luxembourg";
  const parsed=await postIronJSON("/api/calendar/parse",{text:raw,now:new Date().toISOString(),timezone});
  await window.IRONMobile.createCalendarEvent(parsed.event);
  const when=new Date(parsed.event.start).toLocaleString("de-DE");
  const msg=`Termin ${parsed.event.title} wurde für ${when} in deinen Kalender eingetragen.`;
  show(msg); await speak(msg);
  return parsed.event;
}

function mailSummaryRequested(t){
  return /\b(mail|mails|email|e-mail)\b/i.test(t) && /\b(wichtig|wichtigste|zusammen|zusammenfass|posteingang|neueste)\b/i.test(t);
}


// ---------- DEDICATED PHOTO LIBRARY ----------
async function ironImageGet(id,preview=false){
  return fetchIronJSON(`/api/images/get?id=${encodeURIComponent(id)}${preview?"&preview=1":""}`);
}

async function renderPhotoLibrary(){
  const grid=$("#photoGrid");
  const state=$("#photoLibraryState");
  if(!grid) return;
  grid.innerHTML="<p>Lade alle Appwrite-Fotos…</p>";
  if(state) state.textContent="APPWRITE // SYNC";

  try{
    const data=await fetchIronJSON("/api/images/list");
    const images=Array.isArray(data.images)?data.images:[];
    if(state) state.textContent=`${images.length} FOTOS`;
    if(!images.length){
      grid.innerHTML="<article class='saved-card'><h3>NO PHOTOS</h3><p>In iron_images wurden keine Bilder gefunden.</p></article>";
      return;
    }

    grid.innerHTML=images.map(img=>`
      <article class="photo-card" data-photo-id="${escapeHtml(img.id)}">
        <div class="photo-thumb" data-thumb="${escapeHtml(img.id)}"><span>LOADING</span></div>
        <div class="photo-meta">
          <h3>${escapeHtml(img.name||"IRON Bild")}</h3>
          <p>${escapeHtml(img.description||"Keine Beschreibung")}</p>
          <small>${escapeHtml(formatDate(img.created_at))}</small>
          <button data-open-photo="${escapeHtml(img.id)}">ÖFFNEN / BEARBEITEN</button>
        </div>
      </article>
    `).join("");

    // Load thumbnails in small batches so the screen stays responsive.
    const queue=[...images];
    const workers=Array.from({length:Math.min(4,queue.length)},async()=>{
      while(queue.length){
        const img=queue.shift();
        try{
          const d=await ironImageGet(img.id,true);
          const host=grid.querySelector(`[data-thumb="${CSS.escape(img.id)}"]`);
          if(host && d?.image?.data_url){
            host.innerHTML=`<img src="${d.image.data_url}" alt="${escapeHtml(img.name||"IRON Bild")}">`;
          }
        }catch(e){
          const host=grid.querySelector(`[data-thumb="${CSS.escape(img.id)}"]`);
          if(host) host.innerHTML="<span>PREVIEW ERROR</span>";
        }
      }
    });
    await Promise.all(workers);

    grid.querySelectorAll("[data-open-photo]").forEach(btn=>{
      btn.onclick=()=>openPhotoLibraryItem(btn.dataset.openPhoto);
    });

    const wanted=new URLSearchParams(location.search).get("name") || sessionStorage.getItem("iron_photo_open_name");
    if(wanted){
      sessionStorage.removeItem("iron_photo_open_name");
      const hit=images
        .map(x=>({x,score:imageNameScore(x.name,wanted)}))
        .sort((p,q)=>q.score-p.score)[0];
      if(hit?.score>0) await openPhotoLibraryItem(hit.x.id);
      else show(`Bild „${wanted}“ wurde in Appwrite nicht gefunden.`);
    }
  }catch(e){
    if(state) state.textContent="ERROR";
    grid.innerHTML=`<article class="saved-card"><h3>APPWRITE FOTO-FEHLER</h3><p>${escapeHtml(e.message)}</p></article>`;
  }
}

function imageNameScore(name,q){
  const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
  const a=norm(name),b=norm(q);
  if(a===b)return 100;
  if(a.includes(b)||b.includes(a))return 70;
  const aw=new Set(a.split(/\s+/)), bw=b.split(/\s+/);
  return bw.reduce((n,w)=>n+(aw.has(w)?10:0),0);
}

async function openPhotoLibraryItem(id){
  show("IRON lädt das Foto aus Appwrite...");
  const data=await ironImageGet(id,false);
  if(!data?.image?.data_url) throw new Error("Bilddaten fehlen.");
  currentCloudImage=data.image;
  openImageStudio(data.image.data_url,data.image);
}

async function uploadPhotoLibraryFile(){
  const file=$("#photoUploadFile")?.files?.[0];
  const name=$("#photoUploadName")?.value?.trim() || file?.name?.replace(/\.[^.]+$/,"") || "IRON Bild";
  const description=$("#photoUploadDescription")?.value?.trim() || "";
  if(!file){ show("Wähle zuerst ein Bild aus."); return; }
  if(!/^image\/(jpeg|png|webp)$/i.test(file.type)){ show("Erlaubt sind JPG, PNG und WEBP."); return; }
  if(file.size>10*1024*1024){ show("Das Bild darf maximal 10 MB groß sein."); return; }

  const dataUrl=await new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(r.result);
    r.onerror=()=>reject(new Error("Bild konnte nicht gelesen werden."));
    r.readAsDataURL(file);
  });
  show("IRON lädt das Bild zu Appwrite hoch...");
  await postIronJSON("/api/images/upload",{name,description,data_url:dataUrl});
  if($("#photoUploadFile")) $("#photoUploadFile").value="";
  if($("#photoUploadName")) $("#photoUploadName").value="";
  if($("#photoUploadDescription")) $("#photoUploadDescription").value="";
  await renderPhotoLibrary();
  show("Bild wurde in Appwrite gespeichert.");
}


async function ironRouteSelfCheck(){
  const required=[
    "/api/status",
    "/api/news/important",
    "/api/images/list"
  ];
  const out=[];
  for(const path of required){
    try{
      const r=await fetch(cloud.cfg.functionDomain+path,{method:"GET",cache:"no-store"});
      const j=await r.json().catch(()=>null);
      out.push({path,status:r.status,ok:r.ok&&!!j?.ok,version:j?.version||null,error:j?.error||null});
    }catch(e){out.push({path,status:0,ok:false,error:e.message});}
  }
  return out;
}
window.ironRouteSelfCheck=ironRouteSelfCheck;

// ---------- COMMAND ROUTER ----------
function cleanTaskText(t){
  return t.replace(/^iron[, ]*/i,"")
    .replace(/^(erstelle|erstell|mach)\s+(mir\s+)?(eine[n]?\s+)?(task|aufgabe)\s*(für\s*)?/i,"")
    .trim() || t;
}
function planRequested(t){ return /(erstelle|erstell|mach).{0,15}(plan|tagesplan|wochenplan)/i.test(t); }

function buildLocalPlanFallback(raw, sport=false, days=null){
  if(sport){
    const n = days || 3;
    const entries = [];
    for(let i=1;i<=n;i++){
      entries.push(
`Tag ${i}
• 5–10 Min. lockeres Aufwärmen
• 20–30 Min. ausgewogene Ganzkörper-Aktivität
• Kurze Pausen nach Bedarf
• 5–10 Min. lockeres Cool-down / Mobilität`
      );
    }
    return `SPORTPLAN – ${n} TAGE

${entries.join("\\n\\n")}

Erholung:
• Zwischen anstrengenden Einheiten ausreichend Pause lassen.
• Intensität an Erfahrung und Wohlbefinden anpassen.`;
  }

  return `IRON PLAN

Ziel:
${raw}

Schritte:
1. Ziel und gewünschtes Ergebnis festlegen.
2. Die wichtigsten Aufgaben in kleine Schritte aufteilen.
3. Reihenfolge und passende Termine festlegen.
4. Fortschritt regelmäßig prüfen.
5. Plan bei Bedarf anpassen.`;
}
function taskRequested(t){ return /(erstelle|erstell|mach).{0,15}(task|aufgabe)/i.test(t); }
function localPCCommand(t){
  return /(öffne|oeffne|starte|schließe|schliesse|bildschirm|desktop|hud|spotify|programm|datei|ordner|zoom|beschreib.*bild|bild.*beschreib)/i.test(t);
}
async function queuePCCommand(t){
  const row=await cloud.create(cloud.cfg.tables.pcCommands,{
    command:t,status:"pending",created_at:nowISO(),result:""
  });
  return row;
}
async function command(t){
  t=(t||"").trim(); if(!t || !currentUser) return;
  if(input) input.value="";
  show("Befehl wird verarbeitet...");
  try{
    if(calendarCommandRequested(t)){
      await createCalendarFromCommand(t);
      return;
    }
    if(mailSummaryRequested(t)){
      await summarizeImportantMails();
      return;
    }
    // Pure navigation/read requests must never call an API route.
    if(/\b(öffne|oeffne|zeig|zeige|anzeigen|geh|gehe)\b.*\b(einkaufsliste|einkaufs\s*liste|einkauf)\b/i.test(t)){
      location.href="einkaufsliste.html"; return;
    }
    if(/\b(öffne|oeffne|zeig|zeige|anzeigen|geh|gehe)\b.*\b(pläne|plaene|planseite|meine pläne|meine plaene)\b/i.test(t)){
      location.href="plans.html"; return;
    }
    if(/\b(öffne|oeffne|zeig|zeige|anzeigen|geh|gehe)\b.*\b(fotos|bilder|fotobibliothek|bildbibliothek)\b/i.test(t)){
      location.href="photos.html"; return;
    }
    const requestedImage=extractImageRequest(t);
    if(requestedImage){
      await showAppwriteImage(requestedImage);
      return;
    }
    if(smartPlanAndShoppingRequested(t)){
      await saveSmartPlanAndShopping(t);
      renderPlansScreen();
      return;
    }
    if(/\b(nachrichten|news|schlagzeilen)\b/i.test(t) && !/(plan|einkauf)/i.test(t)){
      await loadNews(); return;
    }
    if(/\b(aktien|aktienkurse|börse|boerse|kurse)\b/i.test(t) && !/(plan|einkauf)/i.test(t)){
      await loadStocks(); return;
    }
    if(/\b(wetter|temperatur)\b/i.test(t) && !/(plan|einkauf)/i.test(t)){
      const cityMatch=t.match(/(?:in|für|fuer)\s+([A-Za-zÀ-ÿ .'-]{2,60})/i);
      await loadWeatherV2(cityMatch?.[1]?.trim() || "Luxembourg"); return;
    }
    if(/(öffne|oeffne|zeige).{0,20}(einkaufsliste|einkaufs\s*liste)/i.test(t)){
      location.href="einkaufsliste.html"; return;
    }
    if(shoppingRequested(t)){
      const title=shoppingTitleFromCommand(t);
      show("IRON erstellt die Einkaufsliste...");
      const list=await buildShoppingList(t);
      await createShoppingList(title,list);
      const a=`Einkaufsliste gespeichert: ${title}`;
      show(a); speak(a); renderShoppingScreen(); return;
    }
    if(taskRequested(t)){
      const txt=cleanTaskText(t);
      await createTask(txt,"Offen");
      const a=`Task gespeichert: ${txt}`; show(a); speak(a); renderTasksScreen(); return;
    }
    if(planRequested(t)){
      const raw = t.replace(/^iron[, ]*/i,"").trim();
      const sport = /(sport|fitness|training|trainingsplan)/i.test(raw);
      const numberMatch = raw.match(/\b([1-7])\b/);
      const days = numberMatch ? Number(numberMatch[1]) : null;

      let name = sport
        ? (days ? `Sportplan – ${days} Tage` : "Sportplan")
        : raw.replace(/^(erstelle|erstell|mach|mache)\s+(mir\s+)?(einen?\s+)?/i,"").slice(0,180);

      if(!name) name = "IRON Plan";

      const prompt = sport
        ? `Erstelle einen vollständigen, sicheren und ausgewogenen Sportplan${days ? ` für ${days} Trainingstage pro Woche` : ""}.
Der Nutzerbefehl lautet: "${raw}".
Der Plan soll für allgemeine Fitness und Gesundheit geeignet sein, mit Aufwärmen, Hauptteil, Pausen/Erholung und kurzem Cool-down.
Keine extremen Belastungen, kein Übertraining und keine restriktiven Ernährungsregeln.
Schreibe den Plan übersichtlich auf Deutsch mit Tagen/Einheiten, Übungen bzw. Aktivitäten, Sätzen/Wiederholungen oder Zeitangaben und Erholungshinweisen.`
        : `Erstelle aus diesem Wunsch einen vollständigen, direkt nutzbaren Plan auf Deutsch:
"${raw}"
Nutze klare Abschnitte, sinnvolle Schritte und – falls passend – Tage oder Termine.`;

      show("IRON erstellt den vollständigen Plan...");
      let fullPlan;
      let usedFallback = false;
      try{
        fullPlan = await cloud.askAI(prompt);
      }catch(aiError){
        console.warn("IRON AI plan fallback:", aiError);
        fullPlan = buildLocalPlanFallback(raw, sport, days);
        usedFallback = true;
      }

      await createPlan(name, fullPlan);
      const a = usedFallback
        ? `Plan gespeichert: ${name}. Die AI-Function war nicht erreichbar, deshalb wurde ein lokaler IRON-Plan erstellt.`
        : `Plan gespeichert: ${name}`;
      show(a); speak(a); renderPlansScreen(); return;
    }
    if(localPCCommand(t)){
      await checkPC();
      if(!pcOnline){
        const a="IRON Cloud ist online, aber dein PC-Agent ist offline. Der PC-Befehl wurde nicht ausgeführt.";
        show(a); speak(a); return;
      }
      await queuePCCommand(t);
      const a="Befehl wurde an deinen PC-Agenten gesendet."; show(a); speak(a); return;
    }
    // Cloud AI fallback: works even when the PC is off.
    show("IRON Cloud denkt...");
    const answer = await cloud.askAI(t);
    show(answer);
    speak(answer);
  }catch(e){
    const code = e?.code ? ` [${e.code}]` : "";
    show("Cloud-Fehler" + code + ": " + (e?.message||e));
    console.error("IRON cloud error", e);
  }
}

// ---------- UI ----------
const sendBtn=$("#sendBtn"); if(sendBtn&&input) sendBtn.onclick=()=>command(input.value);
if(input) input.onkeydown=e=>{if(e.key==="Enter")command(input.value)};
$$('[data-command]').forEach(x=>x.onclick=()=>command(x.dataset.command));
$$('nav button').forEach(btn=>{
  const label=btn.querySelector('small')?.textContent;
  if(label==='HUD') btn.onclick=()=>location.href='hud.html';
  if(label==='PLANS') btn.onclick=()=>location.href='plans.html';
  if(label==='TASKS') btn.onclick=()=>location.href='task.html';
  if(label==='SHOP') btn.onclick=()=>location.href='einkaufsliste.html';
  if(label==='SETUP') btn.onclick=()=>location.href='diagnostics.html';
});

const newsBtn=$("#newsBtn");
if(newsBtn) newsBtn.onclick=loadNews;
const stocksBtn=$("#stocksBtn");
if(stocksBtn) stocksBtn.onclick=loadStocks;

const gmailBtn=$("#gmailBtn"), gmailModal=$("#gmailModal"), gmailClose=$("#gmailClose");
if(gmailBtn) gmailBtn.onclick=async()=>{
  if(gmailAccessToken){
    await loadGmailInbox();
  }else{
    await gmailConnect();
  }
};
if(gmailClose&&gmailModal) gmailClose.onclick=()=>{gmailModal.hidden=true;};
if(gmailModal) gmailModal.addEventListener("click",e=>{if(e.target===gmailModal) gmailModal.hidden=true;});

initHudImage();

function initHUDClock(){
  const dateEl=$("#hudDate");
  const timeEl=$("#hudTime");
  if(!dateEl && !timeEl) return;
  const tick=()=>{
    const d=new Date();
    if(dateEl) dateEl.textContent=d.toLocaleDateString("de-DE");
    if(timeEl) timeEl.textContent=d.toLocaleTimeString("de-DE");
  };
  tick(); setInterval(tick,1000);
}

async function updateHudMetrics(){
  if(!currentUser) return;
  try{
    const [tasks,plans]=await Promise.all([
      cloud.list(cloud.cfg.tables.tasks,[cloud.Query.limit(100)]),
      cloud.list(cloud.cfg.tables.plans,[cloud.Query.limit(100)])
    ]);
    const normalPlans=plans.filter(p=>!String(p.name||"").startsWith(SHOP_PREFIX));
    const shopping=plans.filter(p=>String(p.name||"").startsWith(SHOP_PREFIX));
    const openTasks=tasks.filter(t=>!t.erledigt);
    const map={
      hudTaskCount:openTasks.length,
      hudPlanCount:normalPlans.length,
      hudShoppingCount:shopping.length
    };
    Object.entries(map).forEach(([id,v])=>{const el=$("#"+id);if(el)el.textContent=String(v)});
  }catch{}
  const pc=$("#hudPC");
  if(pc) pc.textContent=pcOnline?"ONLINE":"OFFLINE";
  // Cloud status is controlled by checkCloud(); login alone does not prove the Function is reachable.
}

initHUDClock();
setInterval(()=>{ if(currentUser){ Promise.allSettled([checkCloud(), checkPC()]).then(updateHudMetrics); } },15000);

const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const voiceBtn=$("#voiceBtn"), voiceStatus=$("#voiceStatus");
let recognition=null;
if(SR&&voiceBtn){
  recognition=new SR();
  recognition.lang='de-DE';
  recognition.continuous=false;
  recognition.interimResults=true;
  recognition.maxAlternatives=1;

  recognition.onstart=()=>{
    voiceBtn.classList.add('listening');
    if(voiceStatus) voiceStatus.textContent='LISTENING';
    show('Ich höre zu...');
  };

  recognition.onspeechend=()=>{
    try{recognition.stop()}catch{}
  };

  recognition.onend=()=>{
    voiceBtn.classList.remove('listening');
    if(voiceStatus) voiceStatus.textContent='STANDBY';
  };

  recognition.onerror=e=>{
    voiceBtn.classList.remove('listening');
    if(voiceStatus) voiceStatus.textContent='ERROR';
    const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);

    const messages={
      "not-allowed":"Mikrofon-/Spracherkennungszugriff wurde nicht erlaubt. Erlaube Mikrofon für diese Seite.",
      "service-not-allowed":isIOS
        ? "iPhone/iPad: Dieser Browser erlaubt den Spracherkennungsdienst nicht. Öffne IRON direkt in Safari und erlaube dort Mikrofon/Spracherkennung. In anderen iOS-Browsern kann Web Speech blockiert sein."
        : "Der Browser hat den Spracherkennungsdienst blockiert. Prüfe Sprach- und Mikrofonberechtigungen.",
      "audio-capture":"Kein Mikrofon verfügbar.",
      "no-speech":"Ich habe keine Sprache gehört. Tippe erneut auf TALK TO IRON.",
      "network":"Spracherkennung konnte den Netzwerkdienst nicht erreichen."
    };
    show(messages[e.error] || `Spracherkennung: ${e.error||"Fehler"}`);
  };

  recognition.onresult=e=>{
    let transcript="";
    let finalText="";
    for(let i=e.resultIndex;i<e.results.length;i++){
      const text=e.results[i][0].transcript;
      transcript+=text;
      if(e.results[i].isFinal) finalText+=text;
    }
    if(input) input.value=transcript.trim();
    if(finalText.trim()){
      show(`Gehört: ${finalText.trim()}`);
      command(finalText.trim());
    }
  };

  voiceBtn.onclick=async()=>{
    try{
      if(navigator.mediaDevices?.getUserMedia){
        const stream=await navigator.mediaDevices.getUserMedia({audio:true});
        stream.getTracks().forEach(track=>track.stop());
      }
      recognition.start();
    }catch(e){
      show("Mikrofon konnte nicht gestartet werden. Prüfe die Browser-Berechtigung.");
    }
  };
}else if(voiceBtn){
  voiceBtn.onclick=()=>show('Dieser Browser unterstützt die Web-Spracherkennung nicht. Nutze Chrome/Edge oder gib den Befehl ein.');
}

window.command=command;
window.renderPlansScreen=renderPlansScreen; window.renderTasksScreen=renderTasksScreen;
window.deletePlanAndRefresh=deletePlanAndRefresh; window.toggleTaskAndRefresh=toggleTaskAndRefresh;

initAuth().catch(e=>{
  console.error("IRON startup error", e);
  setCloudStatus(false);
  show("Startfehler: " + (e?.message || e));
});
setInterval(()=>{if(currentUser&&!document.hidden){checkCloud();checkPC();}},15000);


window.addEventListener("DOMContentLoaded",()=>{
  const path=location.pathname.toLowerCase();
  if(path.includes("plans")) renderPlansScreen().catch(console.warn);
  if(path.includes("einkauf")) renderShoppingScreen().catch(console.warn);
});

window.addEventListener("pageshow",()=>{
  const path=location.pathname.toLowerCase();
  if(path.includes("einkauf")) renderShoppingScreen().catch(console.warn);
  if(path.includes("plans")) renderPlansScreen().catch(console.warn);
});


window.addEventListener("error",(event)=>{
  console.error("[IRON/Web] Unbehandelter Fehler:", event.error || event.message);
});

window.command = command;

async function loadWeatherV2(city="Luxembourg"){
  try{
    const data=await fetchIronJSON(`/api/weather?city=${encodeURIComponent(city)}`);
    const c=data.current||{};
    const text=`${data.location||city}: ${c.temperature_2m ?? "?"}°C, gefühlt ${c.apparent_temperature ?? "?"}°C, Luftfeuchtigkeit ${c.relative_humidity_2m ?? "?"}%`;
    if(typeof show==="function") show(text);
    if(typeof speak==="function") speak(text);
    return data;
  }catch(e){
    if(typeof show==="function") show("Wetter konnte nicht geladen werden: "+(e?.message||e));
    throw e;
  }
}
window.loadWeatherV2=loadWeatherV2;


/* IRON Android V3: dedicated public-data loaders.
   Shopping/Appwrite AI is intentionally untouched. */
const IRON_V3_CLOUD = 'https://starter-function-4j4o.fra.appwrite.run';

async function ironV3Get(path){
  const r = await fetch(IRON_V3_CLOUD + path, {
    method:'GET',
    headers:{'Accept':'application/json'},
    cache:'no-store'
  });
  const raw = await r.text();
  let data;
  try { data = JSON.parse(raw); }
  catch { throw new Error(`Cloud-Antwort ist kein JSON (HTTP ${r.status}).`); }
  if(!r.ok || data?.ok === false) throw new Error(data?.error || `HTTP ${r.status}`);
  return data;
}

async function ironV3News(){
  const data=await ironV3Get('/api/news');
  console.log('[IRON V3 NEWS]',data);
  return data;
}
async function ironV3Stocks(symbols='AAPL,MSFT,NVDA,TSLA'){
  const data=await ironV3Get('/api/stocks?symbols='+encodeURIComponent(symbols));
  console.log('[IRON V3 STOCKS]',data);
  return data;
}
async function ironV3Weather(city='Luxembourg'){
  const data=await ironV3Get('/api/weather?city='+encodeURIComponent(city));
  console.log('[IRON V3 WEATHER]',data);
  return data;
}
window.ironV3News=ironV3News;
window.ironV3Stocks=ironV3Stocks;
window.ironV3Weather=ironV3Weather;


window.addEventListener("iron-cloud-voice-error", (event) => {
  const msg = event?.detail?.message || "Cloud Voice nicht verfügbar";
  console.error("[IRON] Eigene Stimme nicht verfügbar:", msg);
  // Do not replace the AI answer: it remains visible in the HUD.
  const status = document.querySelector("#statusText, #status, .status-text");
  if (status) status.textContent = "IRON Voice momentan nicht verfügbar – Antwort bleibt als Text sichtbar.";
});

window.addEventListener("iron-app-resume",()=>{
  if(gmailAccessToken) loadGmailInbox().catch(()=>{});
});

document.addEventListener("DOMContentLoaded",()=>{
  const path=(location.pathname||"").toLowerCase();
  if(path.includes("photos")){
    renderPhotoLibrary().catch(e=>show("Foto-Bibliothek: "+e.message));
    const refresh=$("#photoRefreshBtn"); if(refresh) refresh.onclick=()=>renderPhotoLibrary();
    const upload=$("#photoUploadBtn"); if(upload) upload.onclick=()=>uploadPhotoLibraryFile().catch(e=>show("Upload-Fehler: "+e.message));
  }
});
