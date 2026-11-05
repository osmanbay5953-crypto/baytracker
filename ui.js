(() => {
  const paths = {
    team:'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M16 4a4 4 0 0 1 0 7 M18 15a4 4 0 0 1 3 4',
    map:'M3 5l6-2 6 3 6-2v15l-6 2-6-3-6 2z M9 3v15 M15 6v15',
    chart:'M3 3v17h18 M7 15v-4 M12 15V6 M17 15v-7',
    lock:'M5 10h14v11H5z M8 10V7a4 4 0 0 1 8 0v3 M12 14v3',
    cross:'M2 12h5m10 0h5M12 2v5m0 10v5 M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
    shield:'M12 2l8 4v6c0 5-5 8-8 10-3-2-8-5-8-10V6z M8 12l3 3 5-6',
    clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 6v6l4 2',
    trophy:'M7 3h10v5a5 5 0 0 1-10 0z M7 5H3v2c0 3 2 4 5 4 M17 5h4v2c0 3-2 4-5 4 M12 14v5 M8 21h8',
    coins:'M3 8l8-4 9 4-9 4z M3 12l8 4 9-4 M3 16l8 4 9-4',
    trade:'M3 8h17l-4-4 M21 16H4l4 4',
    info:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 11v6 M12 7v.2',
    sound:'M3 9h4l5-4v14l-5-4H3z M16 8a6 6 0 0 1 0 8 M19 5a10 10 0 0 1 0 14',
    muted:'M3 9h4l5-4v14l-5-4H3z M16 9l6 6 M22 9l-6 6'
  };
  function icon(type) {
    const ns='http://www.w3.org/2000/svg', svg=document.createElementNS(ns,'svg');
    const path=document.createElementNS(ns,'path');
    svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('class','ui-icon');
    svg.setAttribute('aria-hidden','true'); path.setAttribute('d',paths[type]); svg.append(path);
    return svg;
  }
  function prefix(node,type) {
    if(node && !node.querySelector('svg'))node.prepend(icon(type));
  }
  function decorate(root=document) {
    for(const [selector,type] of Object.entries({
      '.profiles .card-title':'team','.maps .card-title':'map','.statistics .card-title':'chart',
      '.mystery .card-title':'trophy','.map-heading h1':'map','.profiles-heading h1':'team',
      '.profile-toolbar h2':'chart','.favorite-agent h3':'team','.best-map h3':'map',
      '.performance h3':'chart','.weapons h3':'cross','#comp-list summary b':'trophy'
    }))root.querySelectorAll(selector).forEach(node=>prefix(node,type));
    for(const summary of root.querySelectorAll('.data-section summary')){
      const label=summary.textContent;
      const rules=[[/Harita/,'map'],[/Oyuncu|Ajan/,'team'],[/Raund/,'shield'],[/Ekonomi/,'coins'],[/trade/,'trade'],[/geçmiş|Arşiv/,'clock'],[/notları/,'info']];
      prefix(summary,rules.find(([test])=>test.test(label))?.[1]||'chart');
    }
  }
  window.BayUI={decorate};
  let enabled=true, audio, last=0;
  try{enabled=localStorage.getItem('baytracker.sound')!=='off';}catch{}
  async function tone(frequency){
    if(!enabled||performance.now()-last<85)return;
    last=performance.now();
    try{
      const Engine=window.AudioContext||window.webkitAudioContext;
      if(!Engine)return;
      audio??=new Engine();
      if(audio.state==='suspended')await audio.resume();
      if(!enabled||audio.state!=='running')return;
      const t=audio.currentTime, oscillator=audio.createOscillator(), volume=audio.createGain();
      oscillator.frequency.setValueAtTime(frequency,t);
      oscillator.frequency.exponentialRampToValueAtTime(frequency*.8,t+.07);
      volume.gain.setValueAtTime(.0001,t);volume.gain.exponentialRampToValueAtTime(.026,t+.008);
      volume.gain.exponentialRampToValueAtTime(.0001,t+.075);
      oscillator.connect(volume).connect(audio.destination);oscillator.start(t);oscillator.stop(t+.08);
      oscillator.onended=()=>{oscillator.disconnect();volume.disconnect();};
    }catch{}
  }
  window.BayUI.quizSound=async function(type){
    if(!enabled||!audio)return;
    const patterns={move:[[480,.035,0]],question:[[380,.07,0],[570,.08,.07]],correct:[[660,.1,0],[880,.13,.1]],partial:[[490,.1,0],[620,.1,.09]],wrong:[[190,.14,0]],tick:[[720,.035,0]],finish:[[440,.12,0],[660,.12,.12],[880,.2,.24]]};
    try{
      if(audio.state!=='running')return;
      const now=audio.currentTime;
      for(const [hz,duration,delay]of patterns[type]||[]){
        const oscillator=audio.createOscillator(),gain=audio.createGain(),t=now+delay;
        oscillator.type='sine';oscillator.frequency.setValueAtTime(hz,t);
        gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(type==='tick'?.009:.018,t+.006);
        gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
        oscillator.connect(gain).connect(audio.destination);oscillator.start(t);oscillator.stop(t+duration+.01);
        oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
      }
    }catch{}
  };
  document.addEventListener('DOMContentLoaded',()=>{
    decorate();
    const toggle=document.createElement('button');
    toggle.className='sound-switch';toggle.type='button';toggle.setAttribute('aria-label','Ses efektleri');
    function sync(){toggle.setAttribute('aria-pressed',String(enabled));toggle.title=enabled?'Ses efektlerini kapat':'Ses efektlerini aç';toggle.replaceChildren(icon(enabled?'sound':'muted'));}
    sync();toggle.onclick=()=>{enabled=!enabled;try{localStorage.setItem('baytracker.sound',enabled?'on':'off');}catch{}sync();if(enabled)tone(465);};
    const brand=document.querySelector('nav .bay-brand');
    if(brand){const tools=document.createElement('div');tools.className='brand-tools';brand.before(tools);tools.append(toggle,brand);}
    else {toggle.classList.add('home-sound');document.body.append(toggle);}
    window.addEventListener('pageshow',()=>{try{enabled=localStorage.getItem('baytracker.sound')!=='off';}catch{}sync();});
  });
  const selector='a[href],button:not(.sound-switch),summary';
  document.addEventListener('pointerdown',e=>{if(e.isTrusted&&e.button===0&&e.target.closest(selector))tone(410);});
  document.addEventListener('click',e=>{if(e.isTrusted&&e.detail===0&&e.target.closest(selector))tone(410);});
  document.addEventListener('change',e=>{if(e.isTrusted&&e.target.matches('select'))tone(510);},true);
})();
