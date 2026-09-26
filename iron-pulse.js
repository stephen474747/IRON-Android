(() => {
  const labels={ready:'BEREIT',listening:'ICH HÖRE ZU',thinking:'VERARBEITE',speaking:'IRON SPRICHT'};
  window.ironSetActivity=(state)=>{
    if(!labels[state]) state='ready';
    document.body.dataset.ironActivity=state;
    const label=document.getElementById('ironActivityLabel');
    if(label) label.textContent=labels[state];
  };
  window.ironSetActivity('ready');
})();
