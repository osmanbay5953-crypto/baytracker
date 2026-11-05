(() => {
  async function status(){
    try {
      const response=await fetch('/api/status',{cache:'no-store'});
      if(!response.ok)return;
      const data=await response.json();
      let note=document.querySelector('.sync-status');
      if(!note){
        note=document.createElement('p');
        note.className='sync-status';
        document.querySelector('main')?.append(note);
      }
      const time=data.lastSuccess?new Date(data.lastSuccess).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):null;
      note.textContent=time?'Son başarılı kontrol '+time+(data.ok?' · Otomatik güncelleme':' · Yeniden denenecek'):data.message;
      note.title=data.message||'';
    }catch{}
  }
  status();
  setInterval(status,60000);
})();
