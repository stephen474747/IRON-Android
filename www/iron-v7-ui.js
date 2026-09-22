
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
  document.addEventListener("DOMContentLoaded",()=>{initWeek();observeTasks();observePlans();observeShop();photoTools();weather()});
})();
