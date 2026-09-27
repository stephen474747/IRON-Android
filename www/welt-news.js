(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const select=$('worldCountryInput'), status=$('worldNewsStatus'), mapStatus=$('worldMapStatus');
  const articles=$('worldArticles'), summary=$('worldSummary'), label=$('worldCountryLabel');
  const COUNTRY_URL='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
  const aliases={luxemburg:'Luxembourg',deutschland:'Germany',osterreich:'Austria',oesterreich:'Austria',schweiz:'Switzerland',frankreich:'France',spanien:'Spain',italien:'Italy',portugal:'Portugal',belgien:'Belgium',niederlande:'Netherlands',großbritannien:'United Kingdom',grossbritannien:'United Kingdom','vereinigte staaten':'United States of America',usa:'United States of America'};
  let globe=null, features=[], country='', rows=[], requestId=0, idleTimer;
  const name=f=>String(f?.properties?.ADMIN||f?.properties?.NAME||f?.properties?.name||'').trim();
  const normalized=s=>String(s||'').toLocaleLowerCase('de').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  const canonical=s=>aliases[normalized(s)]||String(s||'').trim();
  const text=(node,value)=>{node.textContent=String(value||'');};
  const safeUrl=s=>{try{const u=new URL(s);return /^https?:$/.test(u.protocol)?u.href:null}catch{return null}};
  const paused=()=>{if(globe?.pauseAnimation)globe.pauseAnimation()};
  const active=()=>{if(!globe)return;globe.resumeAnimation?.();clearTimeout(idleTimer);idleTimer=setTimeout(paused,1700)};
  function centroid(f){
    const ring=f?.geometry?.type==='MultiPolygon'?f.geometry.coordinates?.[0]?.[0]:f?.geometry?.coordinates?.[0];
    const coords=(ring||[]).filter(c=>Array.isArray(c)&&Number.isFinite(c[0])&&Number.isFinite(c[1]));
    if(!coords.length)return {lat:0,lng:0};
    const step=Math.max(1,Math.ceil(coords.length/200));let x=0,y=0,z=0,n=0;
    for(let i=0;i<coords.length;i+=step){const [lon,lat]=coords[i],a=lat*Math.PI/180,b=lon*Math.PI/180;x+=Math.cos(a)*Math.cos(b);y+=Math.cos(a)*Math.sin(b);z+=Math.sin(a);n++}
    return {lng:Math.atan2(y,x)*180/Math.PI,lat:Math.atan2(z,Math.hypot(x,y))*180/Math.PI};
  }
  function featureFor(raw){const search=normalized(canonical(raw));return features.find(f=>normalized(name(f))===search)||features.find(f=>normalized(name(f)).includes(search)&&search.length>=4)}
  async function choose(raw){
    const chosen=canonical(raw);
    if(!chosen){text(status,'Bitte zuerst ein Land auswählen.');return}
    const f=featureFor(chosen), target=f?name(f):chosen;
    country=target;select.value=target;text(label,target.toUpperCase());summary.replaceChildren();articles.replaceChildren();
    $('worldRead').disabled=true;$('worldSummarize').disabled=true;rows=[];
    if(f&&globe){const c=centroid(f);active();globe.pointOfView({...c,altitude:1.55},850);setTimeout(active,900)}
    const id=++requestId;text(status,`Aktuelle Meldungen für ${target} werden geladen…`);
    try{
      const data=await fetchIronJSON('/api/world-news?country='+encodeURIComponent(target));
      if(id!==requestId)return;
      rows=Array.isArray(data.articles)?data.articles:[];
      text(status,rows.length?`${rows.length} aktuelle Meldungen für ${target} aus ausgewählten Nachrichtenquellen.`:`Für ${target} sind derzeit keine verifizierten Meldungen verfügbar.`);
      for(const a of rows){
        const card=document.createElement('article');card.className='v7-world-article';
        const href=safeUrl(a.url),title=document.createElement(href?'a':'strong');
        text(title,a.title||'Meldung');if(href){title.href=href;title.target='_blank';title.rel='noopener noreferrer'}
        const meta=document.createElement('small');text(meta,[a.source,a.published?new Date(a.published).toLocaleString('de-LU'):null].filter(Boolean).join(' · '));
        card.append(title,meta);if(a.summary){const p=document.createElement('p');text(p,a.summary);card.append(p)}articles.append(card);
      }
      $('worldRead').disabled=!rows.length;$('worldSummarize').disabled=!rows.length;
    }catch(e){if(id===requestId)text(status,`News für ${target} nicht erreichbar: ${e?.message||e}. Die Appwrite-Funktion muss /api/world-news anbieten.`)}
  }
  async function summarize(){
    if(!country||!rows.length)return;const target=country;
    text(summary,'IRON fasst die Meldungen zusammen…');$('worldSummarize').disabled=true;
    try{
      const response=await fetch(window.IRONCloud.cfg.functionDomain+'/api/world-news/summary',{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({country:target})});
      const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||`HTTP ${response.status}`);
      if(country===target)text(summary,data.summary||'Keine Zusammenfassung verfügbar.');
    }catch(e){if(country===target)text(summary,`Zusammenfassung nicht verfügbar: ${e?.message||e}`)}
    finally{$('worldSummarize').disabled=!rows.length}
  }
  function read(){if(!rows.length)return;const spoken=`Nachrichten aus ${country}. `+rows.slice(0,8).map((a,i)=>`${i+1}. ${a.title}.`).join(' ');window.speak?.(spoken)}
  function reset(){requestId++;country='';rows=[];select.value='';text(label,'LAND WÄHLEN');text(status,'Wähle ein Land aus. Nachrichten werden nur für dieses Land geladen.');articles.replaceChildren();summary.replaceChildren();$('worldRead').disabled=true;$('worldSummarize').disabled=true;if(globe){active();globe.pointOfView({lat:19,lng:10,altitude:2.8},850);setTimeout(active,900)}}
  async function initGlobe(){
    if(typeof Globe!=='function'){text(mapStatus,'3D-Renderer nicht geladen. Du kannst ein Land unten eingeben.');const preset=new URLSearchParams(location.search).get('country');if(preset)choose(preset);return}
    try{
      globe=Globe()($('worldGlobe')).backgroundColor('#020b11').showAtmosphere(true).atmosphereColor('#38dbf8').atmosphereAltitude(.12);
      globe.controls().autoRotate=false;globe.controls().enableDamping=true;
      globe.renderer().setPixelRatio(Math.min(1,Math.max(.5,(window.devicePixelRatio||1)*.7)));
      const mat=globe.globeMaterial();if(mat){mat.color.set('#061821');mat.emissive.set('#082835');mat.emissiveIntensity=.35}
      const resize=()=>{const box=$('worldGlobe');globe.width(box.clientWidth).height(box.clientHeight);active()};
      window.addEventListener('resize',resize);resize();
      for(const event of ['pointerdown','pointermove','touchstart','wheel'])$('worldGlobe').addEventListener(event,active,{passive:true});
      const response=await fetch(COUNTRY_URL);if(!response.ok)throw new Error('Länderdaten nicht erreichbar');
      const geo=await response.json();features=(geo.features||[]).filter(f=>name(f));
      globe.polygonsData(features).polygonAltitude(.003).polygonCapColor(()=>'rgba(4,30,44,.13)').polygonSideColor(()=>'rgba(16,106,129,.09)').polygonStrokeColor(()=>'#42dbf4').onPolygonClick(f=>choose(name(f)));
      globe.pointOfView({lat:19,lng:10,altitude:2.8});
      const list=$('worldCountryList');for(const f of features){const option=document.createElement('option');option.value=name(f);list.append(option)}
      text(mapStatus,'Land antippen, ziehen oder unten eingeben.');active();
      const preset=new URLSearchParams(location.search).get('country');if(preset)choose(preset);
    }catch(e){text(mapStatus,'Karte konnte nicht vollständig geladen werden. Land kann unten eingegeben werden.');const preset=new URLSearchParams(location.search).get('country');if(preset)choose(preset)}
  }
  $('worldChoose').onclick=()=>choose(select.value);
  select.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();choose(select.value)}});
  $('worldReset').onclick=reset;$('worldSummarize').onclick=summarize;$('worldRead').onclick=read;
  window.ironWorldChoose=choose;window.ironWorldSummarize=summarize;window.ironWorldRead=read;
  window.ironWorldVoice=t=>{
    const s=String(t||'').trim();
    if(/zusammenfass|fass.*zusammen|sag mir die nachrichten|lies.*nachrichten|lies.*vor|vorlesen/i.test(s)){
      if(/zusammenfass|fass.*zusammen/i.test(s))summarize();else read();return true;
    }
    const match=s.match(/\b(?:nachrichten|news)\s+(?:aus|von|für|fuer)\s+([\p{L} .'-]+)/iu);
    if(match){choose(match[1]);return true}
    const countryCommand=s.match(/^(?:iron[, ]*)?(?:(?:zeig|zeige)(?:\s+mir)?|öffne|oeffne|land|geh(?:e)?\s+zu)\s+([\p{L} .'-]+)$/iu);
    if(countryCommand){choose(countryCommand[1]);return true}
    const f=featureFor(s);
    if(f){choose(name(f));return true}return false;
  };
  document.addEventListener('visibilitychange',()=>{if(document.hidden)paused();else active()});
  initGlobe();
})();
