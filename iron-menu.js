(()=>{const ITEMS=[
["index.html","⌂","HOME","Start"],
["hud.html","◎","HUD","Live System"],
["calendar.html","▦","KALENDER","Termine"],
["task.html","✓","TASKS","Aufgaben"],
["plans.html","◫","PLÄNE","Planung"],
["ideas.html","✦","IDEEN","PC & Android"],
["einkaufsliste.html","□","EINKAUF","Listen"],
["bilder.html","▧","BILDER","Galerie"],
["photos.html","▣","FOTO-ANALYSE","Vision"],
["diagnostics.html","⚙","DIAGNOSE","Setup"]];
function currentName(){return(location.pathname.split('/').pop()||'index.html').toLowerCase();}
function install(){if(document.getElementById('ironHamburger'))return;document.querySelectorAll('body > nav, nav.nav-six,.hud-links').forEach(n=>n.remove());const b=document.createElement('button');b.id='ironHamburger';b.className='iron-hamburger';b.innerHTML='<span></span><span></span><span></span>';const o=document.createElement('div');o.id='ironMenuOverlay';o.className='iron-menu-overlay iron-menu-overview';o.innerHTML=`<aside class="iron-menu-drawer"><header><div><b>IRON</b><small>ALL SYSTEM SCREENS</small></div><button class="iron-menu-close">×</button></header><nav class="iron-menu-links iron-menu-grid">${ITEMS.map(([h,i,l,s])=>`<a href="${h}" class="${currentName()===h?'active':''}"><span>${i}</span><div><b>${l}</b><small>${s}</small></div></a>`).join('')}</nav><footer>ALLE BILDSCHIRME AUF EINEN BLICK</footer></aside>`;const close=()=>{o.classList.remove('open');b.classList.remove('open');document.body.classList.remove('iron-menu-open')};const open=()=>{o.classList.add('open');b.classList.add('open');document.body.classList.add('iron-menu-open')};b.onclick=()=>o.classList.contains('open')?close():open();o.onclick=e=>{if(e.target===o)close()};o.querySelector('.iron-menu-close').onclick=close;document.body.append(b,o)}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();})();
