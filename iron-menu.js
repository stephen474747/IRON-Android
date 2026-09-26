(() => {
  const ITEMS=[
    ["index.html","⌂","HOME"],
    ["hud.html","◎","HUD"],
    ["world.html","◉","WELT / NEWS"],
    ["photos.html","▣","FOTOS"],
    ["plans.html","◫","PLÄNE"],
    ["einkaufsliste.html","□","EINKAUF"],
    ["task.html","✓","TASKS"],
    ["sms.html","✉","SMS"],
    ["diagnostics.html","⚙","DIAGNOSE"]
  ];

  function currentName(){
    const n=(location.pathname.split("/").pop()||"index.html").toLowerCase();
    return n||"index.html";
  }

  function install(){
    // Remove old bottom/inline navigation systems. Feature cards/buttons remain usable.
    document.querySelectorAll("body > nav, nav.nav-six").forEach(n=>n.remove());
    document.querySelectorAll(".hud-links").forEach(n=>n.remove());

    if(document.getElementById("ironHamburger")) return;

    const button=document.createElement("button");
    button.id="ironHamburger";
    button.className="iron-hamburger";
    button.setAttribute("aria-label","IRON Menü öffnen");
    button.setAttribute("aria-expanded","false");
    button.setAttribute("aria-controls","ironMenuOverlay");
    button.innerHTML="<span></span><span></span><span></span>";

    const overlay=document.createElement("div");
    overlay.id="ironMenuOverlay";
    overlay.className="iron-menu-overlay";
    overlay.innerHTML=`
      <aside class="iron-menu-drawer" role="dialog" aria-modal="true" aria-label="Alle IRON Bildschirme">
        <header>
          <div><b>IRON</b><small>ALLE BILDSCHIRME</small></div>
          <button class="iron-menu-close" aria-label="Menü schließen">×</button>
        </header>
        <nav class="iron-menu-links">
          ${ITEMS.map(([href,icon,label])=>`
            <a href="${href}" class="${currentName()===href?"active":""}" ${currentName()===href?'aria-current="page"':''}>
              <span>${icon}</span><b>${label}</b>
            </a>`).join("")}
        </nav>
        <footer>Tippe auf einen Bildschirm</footer>
      </aside>`;

    const close=()=>{
      overlay.classList.remove("open");
      button.classList.remove("open");
      button.setAttribute("aria-expanded","false");
      document.body.classList.remove("iron-menu-open");
      button.focus();
    };
    const open=()=>{
      overlay.classList.add("open");
      button.classList.add("open");
      button.setAttribute("aria-expanded","true");
      document.body.classList.add("iron-menu-open");
      if(document.activeElement?.blur) document.activeElement.blur();
      overlay.querySelector(".iron-menu-links a")?.focus();
    };

    button.onclick=()=>overlay.classList.contains("open")?close():open();
    overlay.addEventListener("click",e=>{if(e.target===overlay)close();});
    overlay.querySelector(".iron-menu-close").onclick=close;
    document.addEventListener("keydown",e=>{if(e.key==="Escape")close();});

    document.body.appendChild(button);
    document.body.appendChild(overlay);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",install);
  else install();
})();
