(() => {
  'use strict';
  const KEY = 'iron_web_ideen_v1';
  const MIGRATED = 'iron_web_ideen_appwrite_migrated_v1';
  const STATUS = {neu:'NEU',arbeit:'IN ARBEIT',fertig:'UMGESETZT'};
  const $ = id => document.getElementById(id);
  let ideas = [];
  let editing = null;
  let cloud = null;
  let user = null;
  let busy = false;

  function notice(message, error=false) {
    $('ideaNotice').textContent = message;
    $('ideaNotice').classList.toggle('error', error);
  }

  function normalise(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const title = String(entry.title || '').trim().slice(0,100);
    if (!title) return null;
    return {
      id: String(entry.id || makeId()).slice(0,36),
      title,
      description: String(entry.description || '').trim().slice(0,1500),
      category: String(entry.category || '').trim().slice(0,40),
      status: Object.hasOwn(STATUS,entry.status) ? entry.status : 'neu',
      updatedAt: Number.isFinite(Number(entry.updatedAt)) ? Number(entry.updatedAt) : Date.now()
    };
  }

  function makeId() {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function loadLocal() {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (!Array.isArray(stored)) throw new Error('Ungültiges Ideenformat');
      ideas = stored.map(normalise).filter(Boolean).slice(0,500);
    } catch (_) {
      ideas = [];
      notice('Ideen konnten nicht gelesen werden. Der Browserspeicher ist möglicherweise gesperrt.',true);
    }
  }

  function persistLocal(next, message) {
    ideas = next;
    render();
    try {
      localStorage.setItem(KEY,JSON.stringify(next));
      notice(message);
      return true;
    } catch (_) {
      notice('Appwrite geladen; lokale Zwischenspeicherung im Browser ist gesperrt.',true);
      return false;
    }
  }

  function rowData(item) {
    return {title:item.title,description:item.description,
      category:item.category,status:item.status};
  }

  function fromRow(row) {
    return normalise({id:row.$id,title:row.title,description:row.description,
      category:row.category,status:row.status,
      updatedAt:Date.parse(row.$updatedAt || row.$createdAt) || Date.now()});
  }

  async function refreshCloud() {
    if (!cloud || busy) return;
    const rows = await cloud.list(cloud.cfg.tables.ideas,[cloud.Query.limit(500)]);
    persistLocal(rows.map(fromRow).filter(Boolean),'Mit Appwrite synchronisiert.');
  }

  async function saveCloud(entry, isEdit=false) {
    if (!cloud || !user) throw new Error('Bitte zuerst auf der IRON-Startseite anmelden.');
    if (isEdit) await cloud.update(cloud.cfg.tables.ideas,entry.id,rowData(entry));
    else await cloud.create(cloud.cfg.tables.ideas,rowData(entry),entry.id,
      cloud.userRowPermissions(user.$id));
  }

  async function withCloud(action, success) {
    if (busy) return false;
    busy = true;
    try {
      await action();
      busy = false;
      await refreshCloud();
      notice(success);
      return true;
    } catch (error) {
      busy = false;
      notice(`Appwrite: ${error.message || error}`,true);
      return false;
    }
  }

  function openEditor(idea=null) {
    editing = idea?.id || null;
    $('ideaEditorTitle').textContent = idea ? 'Idee bearbeiten' : 'Neue Idee';
    $('ideaTitle').value = idea?.title || '';
    $('ideaDescription').value = idea?.description || '';
    $('ideaCategory').value = idea?.category || '';
    $('ideaStatus').value = idea?.status || 'neu';
    $('ideaFormMessage').textContent = '';
    $('ideaEditor').hidden = false;
    $('ideaEditor').scrollIntoView({behavior:'smooth',block:'start'});
    $('ideaTitle').focus({preventScroll:true});
  }

  function closeEditor() { editing = null; $('ideaEditor').hidden = true; }

  function text(tag,className,value) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    el.textContent = value;
    return el;
  }

  function action(label,operation,id) {
    const button = text('button','ideas-action',label);
    button.type = 'button';
    button.dataset.action = operation;
    button.dataset.id = id;
    return button;
  }

  function render() {
    $('ideaCountAll').textContent = ideas.length;
    $('ideaCountNew').textContent = ideas.filter(x=>x.status==='neu').length;
    $('ideaCountActive').textContent = ideas.filter(x=>x.status==='arbeit').length;
    $('ideaCountDone').textContent = ideas.filter(x=>x.status==='fertig').length;
    const term = $('ideaSearch').value.trim().toLocaleLowerCase('de');
    const state = $('ideaFilter').value;
    const matches = ideas.filter(x => (state==='alle'||x.status===state) &&
      (!term||`${x.title} ${x.description} ${x.category}`.toLocaleLowerCase('de').includes(term)))
      .sort((a,b)=>b.updatedAt-a.updatedAt);
    const host = $('ideasList');
    host.replaceChildren();
    if (!matches.length) {
      const empty = text('div','ideas-empty',ideas.length ? 'Keine passenden Ideen gefunden.' : 'Noch keine Idee gespeichert. Halte deinen ersten Gedanken fest.');
      host.appendChild(empty);
      return;
    }
    for (const item of matches) {
      const card = document.createElement('article'); card.className = 'ideas-card';
      const top = document.createElement('div'); top.className = 'ideas-card-top';
      top.appendChild(text('span',`ideas-pill state-${item.status}`,STATUS[item.status]));
      if (item.category) top.appendChild(text('span','ideas-category',item.category));
      card.appendChild(top);
      card.appendChild(text('h3','',item.title));
      if (item.description) card.appendChild(text('p','ideas-description',item.description));
      const updated = new Date(item.updatedAt);
      card.appendChild(text('small','ideas-date',Number.isNaN(updated.getTime()) ? '' :
        `Aktualisiert ${updated.toLocaleDateString('de-LU',{day:'2-digit',month:'2-digit',year:'numeric'})}`));
      const actions = document.createElement('div'); actions.className = 'ideas-card-actions';
      actions.append(action('BEARBEITEN','edit',item.id),action('STATUS WECHSELN','next',item.id),action('LÖSCHEN','delete',item.id));
      card.appendChild(actions);host.appendChild(card);
    }
  }

  $('ideaNew').addEventListener('click',()=>openEditor());
  $('ideaCancel').addEventListener('click',closeEditor);
  $('ideaSearch').addEventListener('input',render);
  $('ideaFilter').addEventListener('change',render);
  $('ideaForm').addEventListener('submit',async event=>{
    event.preventDefault();
    const title = $('ideaTitle').value.trim();
    if (!title) { $('ideaFormMessage').textContent='Bitte gib einen Titel ein.';return; }
    const entry = normalise({id:editing||makeId(),title,
      description:$('ideaDescription').value,category:$('ideaCategory').value,
      status:$('ideaStatus').value,updatedAt:Date.now()});
    if (await withCloud(()=>saveCloud(entry,!!editing),editing?'Idee aktualisiert.':'Idee gespeichert.')) closeEditor();
  });
  $('ideasList').addEventListener('click',async event=>{
    const target = event.target.closest('button[data-action]');
    if (!target) return;
    const idea = ideas.find(x=>x.id===target.dataset.id);
    if (!idea) return;
    if (target.dataset.action==='edit') return openEditor(idea);
    if (target.dataset.action==='delete') {
      if (!confirm(`„${idea.title}“ wirklich löschen?`)) return;
      await withCloud(()=>cloud.remove(cloud.cfg.tables.ideas,idea.id),'Idee gelöscht.');
    }
    if (target.dataset.action==='next') {
      const order = ['neu','arbeit','fertig'];
      const updated = {...idea,status:order[(order.indexOf(idea.status)+1)%order.length],updatedAt:Date.now()};
      await withCloud(()=>saveCloud(updated,true),'Status aktualisiert.');
    }
  });

  $('ideaExport').addEventListener('click',()=>{
    const blob = new Blob([JSON.stringify({format:'IRON-IDEEN-1',ideas},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');
    a.href=url;a.download=`iron-ideen-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    notice('Sicherungsdatei erstellt.');
  });
  $('ideaImport').addEventListener('click',()=>$('ideaImportFile').click());
  $('ideaImportFile').addEventListener('change',async event=>{
    const file=event.target.files?.[0];
    event.target.value='';
    if (!file) return;
    if (file.size>1024*1024) return notice('Datei zu groß (maximal 1 MB).',true);
    try {
      const parsed=JSON.parse(await file.text());
      if (parsed?.format!=='IRON-IDEEN-1' || !Array.isArray(parsed.ideas)) throw new Error('format');
      const imported=parsed.ideas.slice(0,500).map(normalise).filter(Boolean);
      if (!imported.length) throw new Error('empty');
      const existing = new Set(ideas.map(x=>x.id));
      await withCloud(async()=>{
        for (const item of imported) {
          if (existing.has(item.id)) await saveCloud(item,true);
          else { await saveCloud(item,false); existing.add(item.id); }
        }
      },`${imported.length} Ideen importiert.`);
    } catch (_) { notice('Die Datei enthält keine gültige IRON-Ideen-Sicherung.',true); }
  });

  async function start() {
    loadLocal();render();
    cloud=window.IRONCloud;
    if (!cloud) return notice('Appwrite konnte nicht geladen werden. Lokale Ideen bleiben sichtbar.',true);
    try {
      user=await cloud.currentUser();
      if (!user) return notice('Bitte zuerst auf der IRON-Startseite anmelden.',true);
      const previous=[...ideas];
      const rows=await cloud.list(cloud.cfg.tables.ideas,[cloud.Query.limit(500)]);
      const known=new Set(rows.map(x=>x.$id));
      // One-time migration of the browser-only ideas from the previous version.
      if (!localStorage.getItem(MIGRATED)) {
        for (const item of previous) {
          if (!known.has(item.id)) {
            await saveCloud(item,false);
            known.add(item.id);
          }
        }
        localStorage.setItem(MIGRATED,'1');
      }
      await refreshCloud();
      setInterval(()=>refreshCloud().catch(e=>notice(`Appwrite: ${e.message}`,true)),8000);
    } catch (error) {
      notice(`Appwrite nicht bereit: ${error.message || error}. Lokale Ideen bleiben erhalten.`,true);
    }
  }
  start();
})();
