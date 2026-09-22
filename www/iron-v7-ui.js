
(() => {
  const $=s=>document.querySelector(s);
  function initWeek(){
    const h=$("#v7WeekStrip"); if(!h)return;
    const now=new Date(),m=new Date(now),day=(now.getDay()+6)%7;m.setDate(now.getDate()-day);
    const fmt=new Intl.DateTimeFormat("de-DE",{weekday:"short"});
    const d=[];for(let i=0;i<7;i++){const x=new Date(m);x.setDate(m.getDate()+i);d.push(`<div class="${x.toDateString()===now.toDateString()?"active":""}"><span>${fmt.format(x).replace(".","").toUpperCase()}</span><b>${x.getDate()}</b></div>`)}
    h.innerHTML=`<strong>WOCHE</strong>${d.join("")}`;
  }
  function observeTasks(){
    const h=$("#tasksList");if(!h)return;const update=()=>{const c=[...h.querySelectorAll(".task-card")],t=c.length,d=c.filter(x=>x.querySelector('input[type="checkbox"]')?.checked||x.classList.contains("done")).length,o=Math.max(0,t-d),p=t?Math.round(d/t*100):0;
      [["#v7TaskTotal",t],["#v7TaskOpen",o],["#v7TaskDone",d],["#v7TaskProgress",`${d}/${t}`],["#v7TaskPercent",`${p}%`]].forEach(([s,v])=>{if($(s))$(s).textContent=v});document.documentElement.style.setProperty("--task-progress",`${p*3.6}deg`)};
    new MutationObserver(update).observe(h,{childList:true,subtree:true,attributes:true});h.addEventListener("change",()=>setTimeout(update,60));update()
  }
  function observePlans(){const h=$("#plansList");if(!h)return;const u=()=>{const n=h.querySelectorAll(".saved-card,.plan-screen-card,.data-card").length;if($("#v7PlanCount"))$("#v7PlanCount").textContent=`${n} PLÄNE`};new MutationObserver(u).observe(h,{childList:true,subtree:true});u()}
  function observeShop(){const h=$("#shoppingList");if(!h)return;const u=()=>{const text=h.innerText||"",lists=h.querySelectorAll(".saved-card,.shopping-card,.data-card").length,items=(text.match(/☐|☑|✓/g)||[]).length;if($("#v7ShopLists"))$("#v7ShopLists").textContent=lists;if($("#v7ShopItems"))$("#v7ShopItems").textContent=items};new MutationObserver(u).observe(h,{childList:true,subtree:true});u()}
  function photoTools(){const g=$("#photoGrid"),q=$("#v7PhotoSearch"),sort=$("#v7PhotoSort");if(!g)return;const count=()=>{if($("#v7PhotoCount"))$("#v7PhotoCount").textContent=g.querySelectorAll(".photo-card").length};const filter=()=>{const x=(q?.value||"").toLowerCase();g.querySelectorAll(".photo-card").forEach(c=>c.style.display=!x||c.innerText.toLowerCase().includes(x)?"":"none")};new MutationObserver(()=>{count();filter()}).observe(g,{childList:true,subtree:true});q?.addEventListener("input",filter);let asc=true;sort?.addEventListener("click",()=>{[...g.querySelectorAll(".photo-card")].sort((a,b)=>asc?a.innerText.localeCompare(b.innerText):b.innerText.localeCompare(a.innerText)).forEach(c=>g.appendChild(c));asc=!asc});count()}
  function weather(){const b=$("#v7WeatherBtn");if(!b||typeof window.loadWeatherV2!=="function")return;b.onclick=async()=>{b.disabled=true;try{const d=await window.loadWeatherV2("Luxembourg"),c=d?.current||{};if($("#v7WeatherTemp"))$("#v7WeatherTemp").textContent=`${c.temperature_2m??"?"}°C`;if($("#v7WeatherText"))$("#v7WeatherText").textContent=d?.location||"Luxembourg"}catch{}finally{b.disabled=false}}}

  function fmtTime(ms){
    return new Date(ms).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
  }
  function fmtDate(ms){
    return new Date(ms).toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"});
  }

  async function loadCalendarScreen(){
    const agenda=$("#calendarAgenda");
    if(!agenda) return;

    const now=new Date();
    const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
    const monthEnd=new Date(now.getFullYear(),now.getMonth()+1,1);
    const monthTitle=$("#calendarMonthTitle");
    if(monthTitle) monthTitle.textContent=now.toLocaleDateString("de-DE",{month:"long",year:"numeric"}).toUpperCase();

    const grid=$("#calendarMonthGrid");
    if(grid){
      const first=(monthStart.getDay()+6)%7;
      const days=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
      const cells=[];
      ["MO","DI","MI","DO","FR","SA","SO"].forEach(d=>cells.push(`<b class="v7-cal-dow">${d}</b>`));
      for(let i=0;i<first;i++) cells.push(`<span class="empty"></span>`);
      for(let d=1;d<=days;d++){
        const active=d===now.getDate();
        cells.push(`<span class="${active?"today":""}">${d}</span>`);
      }
      grid.innerHTML=cells.join("");
    }

    if(!window.IRONMobile?.isNative || typeof window.IRONMobile.listCalendarEvents!=="function"){
      agenda.innerHTML="<p>Der Android-Kalender ist nur in der installierten APK verfügbar.</p>";
      return;
    }

    agenda.innerHTML="<p>Lade Termine...</p>";
    try{
      const result=await window.IRONMobile.listCalendarEvents({
        start:Date.now()-86400000,
        end:Date.now()+90*86400000
      });
      const events=Array.isArray(result?.events)?result.events:[];
      const todayKey=now.toDateString();
      const weekEnd=Date.now()+7*86400000;
      const todayCount=events.filter(e=>new Date(e.start).toDateString()===todayKey).length;
      const weekCount=events.filter(e=>Number(e.start)>=Date.now() && Number(e.start)<=weekEnd).length;
      if($("#calendarTodayCount")) $("#calendarTodayCount").textContent=todayCount;
      if($("#calendarWeekCount")) $("#calendarWeekCount").textContent=weekCount;

      agenda.innerHTML=events.length ? events.slice(0,60).map(e=>`
        <article class="v7-agenda-item">
          <div class="v7-agenda-date"><b>${fmtTime(e.start)}</b><small>${fmtDate(e.start)}</small></div>
          <div class="v7-agenda-main">
            <h3>${escapeHtml(e.title||"Termin")}</h3>
            <p>${escapeHtml(e.location||e.calendar||"Kalender")}</p>
          </div>
          <span class="v7-agenda-dot"></span>
        </article>
      `).join("") : "<p>Keine kommenden Termine gefunden.</p>";
    }catch(e){
      agenda.innerHTML=`<p>Kalender konnte nicht geladen werden: ${escapeHtml(e?.message||String(e))}</p>`;
    }
  }

  function initCalendarForm(){
    const btn=$("#calendarCreateBtn");
    if(!btn) return;
    const now=new Date(Date.now()+3600000);
    if($("#calendarDateInput") && !$("#calendarDateInput").value) $("#calendarDateInput").value=now.toISOString().slice(0,10);
    if($("#calendarTimeInput") && !$("#calendarTimeInput").value) $("#calendarTimeInput").value=now.toTimeString().slice(0,5);

    btn.onclick=async()=>{
      const title=$("#calendarTitleInput")?.value?.trim();
      const date=$("#calendarDateInput")?.value;
      const time=$("#calendarTimeInput")?.value;
      const duration=Number($("#calendarDurationInput")?.value||60);
      const reminder=Number($("#calendarReminderInput")?.value||15);
      const important=!!$("#calendarImportantInput")?.checked;
      if(!title || !date || !time){ window.show?.("Titel, Datum und Uhrzeit fehlen."); return; }
      if(!window.IRONMobile?.isNative){ window.show?.("Kalender ist nur in der Android-App verfügbar."); return; }

      const start=new Date(`${date}T${time}:00`);
      const end=new Date(start.getTime()+duration*60000);
      const event={
        title,
        start:start.toISOString(),
        end:end.toISOString(),
        location:$("#calendarLocationInput")?.value?.trim()||"",
        description:$("#calendarDescriptionInput")?.value?.trim()||"",
        reminder_minutes:reminder,
        important
      };
      try{
        btn.disabled=true;
        await window.IRONMobile.createCalendarEvent(event);
        window.show?.(`Termin ${title} wurde eingetragen.`);
        await window.IRONMobile.speak?.(`Sir, der Termin ${title} wurde eingetragen und die Erinnerung ist geplant.`);
        await loadCalendarScreen();
      }catch(e){
        window.show?.("Kalender-Fehler: "+(e?.message||e));
      }finally{btn.disabled=false}
    };

    $("#calendarRefreshBtn")?.addEventListener("click",loadCalendarScreen);
    $("#calendarTodayBtn")?.addEventListener("click",loadCalendarScreen);
    window.addEventListener("iron-calendar-updated",loadCalendarScreen);
  }

  function initTaskQuickAdd(){
    const btn=$("#v7TaskAddBtn");
    if(!btn) return;
    btn.onclick=async()=>{
      const text=$("#v7TaskTextInput")?.value?.trim();
      const date=$("#v7TaskDateInput")?.value;
      const time=$("#v7TaskTimeInput")?.value;
      const important=!!$("#v7TaskImportantInput")?.checked;
      if(!text){ window.show?.("Bitte zuerst eine Aufgabe eingeben."); return; }

      let datum="Offen";
      let at=null;
      if(date && time){
        at=new Date(`${date}T${time}:00`);
        datum=at.toLocaleString("de-DE");
      }

      try{
        btn.disabled=true;
        if(typeof window.createTask==="function") await window.createTask(text,datum);
        if(at && window.IRONMobile?.scheduleNotification){
          const remindAt=new Date(at.getTime()-(important?30:10)*60000);
          if(remindAt.getTime()>Date.now()){
            await window.IRONMobile.scheduleNotification({
              title:important?"IRON // WICHTIGE TASK":"IRON // TASK",
              body:important
                ? `Sir, wichtige Aufgabe: ${text}.`
                : `Sir, Erinnerung: ${text}.`,
              at:remindAt
            });
          }
        }
        window.show?.("Task gespeichert"+(at?" und Erinnerung geplant.":"."));
        if(typeof window.renderTasksScreen==="function") await window.renderTasksScreen();
        $("#v7TaskTextInput").value="";
      }catch(e){
        window.show?.("Task-Fehler: "+(e?.message||e));
      }finally{btn.disabled=false}
    };
  }

  async function initPhotoViewer(){
    const img=$("#viewerPhoto");
    if(!img) return;
    const id=new URLSearchParams(location.search).get("id");
    if(!id){ window.show?.("Keine Foto-ID angegeben."); return; }

    let meta=null,originalDataUrl="",scale=1,rotation=0,brightness=100,contrast=100;
    const apply=()=>{
      img.style.transform=`scale(${scale}) rotate(${rotation}deg)`;
      img.style.filter=`brightness(${brightness}%) contrast(${contrast}%)`;
      if($("#viewerZoomText")) $("#viewerZoomText").textContent=`${Math.round(scale*100)}%`;
    };

    try{
      const data=await ironImageGet(id,false);
      meta=data.image;
      originalDataUrl=meta.data_url;
      img.src=originalDataUrl;
      $("#viewerPhotoName").textContent=meta.name||"IRON Foto";
      $("#viewerNameInput").value=meta.name||"";
      $("#viewerDescription").value=meta.description||"";
    }catch(e){
      window.show?.("Foto konnte nicht geladen werden: "+(e?.message||e));
      return;
    }

    $("#viewerZoomIn").onclick=()=>{scale=Math.min(5,scale+.25);apply()};
    $("#viewerZoomOut").onclick=()=>{scale=Math.max(.4,scale-.25);apply()};
    $("#viewerFit").onclick=()=>{scale=1;rotation=0;brightness=100;contrast=100;apply()};
    $("#viewerRotate").onclick=()=>{rotation=(rotation+90)%360;apply()};
    $("#viewerBright").onclick=()=>{brightness=Math.min(180,brightness+10);apply()};
    $("#viewerContrast").onclick=()=>{contrast=Math.min(180,contrast+10);apply()};

    $("#viewerAnalyzeBtn").onclick=async()=>{
      const state=$("#viewerAnalysisState");
      if(state) state.innerHTML="<p>● IRON ANALYSIERT...</p>";
      try{
        const d=await postIronJSON("/api/vision",{data_url:originalDataUrl,prompt:"Beschreibe dieses Bild präzise und nützlich für meine IRON-Bildbibliothek."});
        $("#viewerDescription").value=d.description||"";
        if(state) state.innerHTML="<p>● OBJEKTE ERKANNT</p><p>● SZENE ANALYSIERT</p><p>● BESCHREIBUNG FERTIG</p>";
        window.show?.(d.description||"Analyse fertig.");
        await window.IRONMobile?.speak?.(d.description||"Analyse fertig.");
      }catch(e){
        if(state) state.innerHTML="<p>○ ANALYSE FEHLGESCHLAGEN</p>";
        window.show?.("Analyse-Fehler: "+(e?.message||e));
      }
    };

    $("#viewerSaveMeta").onclick=async()=>{
      try{
        const name=$("#viewerNameInput").value.trim()||meta.name||"IRON Bild";
        const description=$("#viewerDescription").value.trim();
        await postIronJSON("/api/images/update",{id:meta.id,name,description});
        meta.name=name;meta.description=description;
        $("#viewerPhotoName").textContent=name;
        window.show?.("Name und Beschreibung wurden in Appwrite gespeichert.");
      }catch(e){window.show?.("Speichern fehlgeschlagen: "+(e?.message||e))}
    };

    $("#viewerSaveCopy").onclick=async()=>{
      try{
        const edited=await renderEditedImageDataURL(originalDataUrl,{rotation,brightness,contrast});
        const name=($("#viewerNameInput").value.trim()||meta.name||"IRON Bild")+" – bearbeitet";
        const description=$("#viewerDescription").value.trim();
        await postIronJSON("/api/images/upload",{name,description,data_url:edited});
        window.show?.("Bearbeitete Kopie wurde in Appwrite gespeichert.");
      }catch(e){window.show?.("Bearbeitete Kopie konnte nicht gespeichert werden: "+(e?.message||e))}
    };
  }


  async function loadSimpleGallery(){
    const grid=$("#simpleImageGrid");
    if(!grid) return;
    grid.innerHTML="<p>Lade Bilder aus Appwrite...</p>";
    try{
      const data=await fetchIronJSON("/api/images/list");
      const images=Array.isArray(data?.images)?data.images:[];
      if($("#simpleImageCount")) $("#simpleImageCount").textContent=images.length;

      grid.innerHTML=images.length ? images.map(img=>`
        <article class="v7-simple-image-card" data-name="${escapeHtml(img.name||"")}">
          <button data-simple-image="${escapeHtml(img.id)}">
            <div class="v7-simple-thumb" data-simple-thumb="${escapeHtml(img.id)}"><span>LOADING</span></div>
            <h3>${escapeHtml(img.name||"IRON Bild")}</h3>
          </button>
        </article>
      `).join("") : "<p>Keine Bilder in Appwrite gefunden.</p>";

      const queue=[...images];
      const workers=Array.from({length:Math.min(4,queue.length)},async()=>{
        while(queue.length){
          const img=queue.shift();
          try{
            const d=await ironImageGet(img.id,true);
            const host=grid.querySelector(`[data-simple-thumb="${CSS.escape(img.id)}"]`);
            if(host && d?.image?.data_url){
              host.innerHTML=`<img src="${d.image.data_url}" alt="${escapeHtml(img.name||"IRON Bild")}">`;
            }
          }catch{}
        }
      });
      await Promise.all(workers);

      grid.querySelectorAll("[data-simple-image]").forEach(btn=>{
        btn.onclick=()=>location.href=`bild-viewer.html?id=${encodeURIComponent(btn.dataset.simpleImage)}`;
      });

      const search=$("#simpleImageSearch");
      const apply=()=>{
        const q=(search?.value||"").trim().toLowerCase();
        grid.querySelectorAll(".v7-simple-image-card").forEach(card=>{
          card.style.display=!q || card.dataset.name.toLowerCase().includes(q) ? "" : "none";
        });
      };
      search?.addEventListener("input",apply);
    }catch(e){
      grid.innerHTML=`<p>Bilder konnten nicht geladen werden: ${escapeHtml(e?.message||String(e))}</p>`;
    }
  }

  async function initSimpleImageViewer(){
    const img=$("#simpleViewerImage");
    if(!img) return;
    const id=new URLSearchParams(location.search).get("id");
    if(!id){ window.show?.("Keine Bild-ID angegeben."); return; }
    let scale=1;
    const apply=()=>{
      img.style.transform=`scale(${scale})`;
      if($("#simpleViewerZoom")) $("#simpleViewerZoom").textContent=`${Math.round(scale*100)}%`;
    };
    try{
      const data=await ironImageGet(id,false);
      img.src=data?.image?.data_url||"";
      if($("#simpleViewerName")) $("#simpleViewerName").textContent=data?.image?.name||"IRON Bild";
    }catch(e){
      window.show?.("Bild konnte nicht geladen werden: "+(e?.message||e));
    }
    $("#simpleZoomIn").onclick=()=>{scale=Math.min(5,scale+.25);apply()};
    $("#simpleZoomOut").onclick=()=>{scale=Math.max(.4,scale-.25);apply()};
    $("#simpleZoomFit").onclick=()=>{scale=1;apply()};
  }


  const taskReminderKey="iron_task_reminders";
  function getTaskReminders(){
    try{return JSON.parse(localStorage.getItem(taskReminderKey)||"{}")||{}}catch{return {}}
  }
  function setTaskReminders(v){localStorage.setItem(taskReminderKey,JSON.stringify(v||{}))}

  function updateTaskReminderPanel(){
    const host=$("#v73NextReminders"); if(!host) return;
    const all=Object.entries(getTaskReminders())
      .map(([taskId,r])=>({taskId,...r}))
      .filter(r=>new Date(r.at).getTime()>Date.now())
      .sort((a,b)=>new Date(a.at)-new Date(b.at))
      .slice(0,3);
    host.innerHTML=all.length?all.map(r=>{
      const d=new Date(r.at);
      return `<div class="v73-reminder-item">
        <span class="v73-reminder-icon">♧</span>
        <b>${d.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}</b>
        <p>${escapeHtml(r.text||"Task")}<small>${d.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"})}</small></p>
      </div>`;
    }).join(""):`<p class="muted">Keine Erinnerungen aktiviert.</p>`;
  }

  function initExistingTaskReminders(){
    const list=$("#tasksList"), modal=$("#v73TaskReminderModal");
    if(!list || !modal) return;
    let currentId="",currentText="";

    const open=(id,text)=>{
      currentId=id; currentText=text||"Task";
      $("#v73ReminderTaskName").textContent=currentText;
      const stored=getTaskReminders()[id];
      const dt=stored?.at?new Date(stored.at):new Date(Date.now()+3600000);
      const local=new Date(dt.getTime()-dt.getTimezoneOffset()*60000);
      $("#v73ReminderDate").value=local.toISOString().slice(0,10);
      $("#v73ReminderTime").value=local.toISOString().slice(11,16);
      $("#v73ReminderImportant").checked=!!stored?.important;
      $("#v73ReminderCancel").style.display=stored?"block":"none";
      modal.hidden=false;
    };
    const close=()=>{modal.hidden=true;currentId="";currentText=""};

    list.addEventListener("click",e=>{
      const btn=e.target.closest("[data-task-reminder]");
      if(btn){e.preventDefault();open(btn.dataset.taskReminder,btn.dataset.taskText)}
    });
    $("#v73ReminderClose").onclick=close;
    modal.addEventListener("click",e=>{if(e.target===modal)close()});

    $("#v73ReminderSave").onclick=async()=>{
      const date=$("#v73ReminderDate").value,time=$("#v73ReminderTime").value;
      if(!currentId||!date||!time){window.show?.("Datum und Uhrzeit fehlen.");return}
      const at=new Date(`${date}T${time}:00`);
      if(at.getTime()<=Date.now()+5000){window.show?.("Die Erinnerungszeit muss in der Zukunft liegen.");return}
      if(!window.IRONMobile?.scheduleNotification){window.show?.("Benachrichtigungen sind nur in der Android-App verfügbar.");return}
      const map=getTaskReminders(), old=map[currentId];
      try{
        if(old?.notificationId && window.IRONMobile.cancelNotification){
          await window.IRONMobile.cancelNotification(old.notificationId).catch(()=>{});
        }
        const important=$("#v73ReminderImportant").checked;
        const res=await window.IRONMobile.scheduleNotification({
          title:important?"IRON // WICHTIGE AUFGABE":"IRON // TASK",
          body:important?`Sir, vergessen Sie Ihre wichtige Aufgabe nicht: ${currentText}.`:`Sir, Erinnerung: ${currentText}.`,
          at
        });
        map[currentId]={notificationId:res.id,at:res.at,text:currentText,important};
        setTaskReminders(map);
        window.show?.("Benachrichtigung wurde eingeschaltet.");
        close();
        updateTaskReminderPanel();
        await window.renderTasksScreen?.();
      }catch(err){window.show?.("Benachrichtigung konnte nicht aktiviert werden: "+(err?.message||err))}
    };

    $("#v73ReminderCancel").onclick=async()=>{
      if(!currentId)return;
      const map=getTaskReminders(),old=map[currentId];
      try{
        if(old?.notificationId && window.IRONMobile?.cancelNotification){
          await window.IRONMobile.cancelNotification(old.notificationId);
        }
        delete map[currentId];setTaskReminders(map);
        window.show?.("Benachrichtigung wurde ausgeschaltet.");
        close();updateTaskReminderPanel();await window.renderTasksScreen?.();
      }catch(err){window.show?.("Benachrichtigung konnte nicht ausgeschaltet werden: "+(err?.message||err))}
    };

    window.addEventListener("iron-tasks-rendered",()=>setTimeout(updateTaskReminderPanel,20));
    updateTaskReminderPanel();
  }

  function initPlanReferenceLayout(){
    if(!document.body.classList.contains("v73-plans")) return;
    if($("#v73TodayDate")) $("#v73TodayDate").textContent=new Date().toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"short"}).toUpperCase();
    document.querySelectorAll("[data-plan-filter]").forEach(card=>{
      card.addEventListener("click",e=>{
        if(e.target.closest("button"))return;
        const cat=card.dataset.planFilter;
        const target=cat==="education"?$("#educationPlans"):cat==="body"?$("#bodyPlans"):$("#nutritionPlans");
        target?.closest(".v7-panel")?.scrollIntoView({behavior:"smooth",block:"start"});
      });
    });
  }

  document.addEventListener("DOMContentLoaded",()=>{initWeek();observeTasks();observePlans();observeShop();photoTools();weather();initCalendarForm();loadCalendarScreen();initTaskQuickAdd();initPhotoViewer();loadSimpleGallery();initSimpleImageViewer();initExistingTaskReminders();initPlanReferenceLayout()});
})();
