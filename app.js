const dialog = document.querySelector('#section-dialog');
const sections = {
  profiles: { title: 'BEŞ OYUNCU. TEK TAKIM.', description: 'Burada ekran beş oyuncuya bölünecek. Oyuncu seçildiğinde act filtresi ve genel performans verileri açılacak.', players: ['7Bay', 'Lain', 'OnlyHerif', 'SARIŞINSEVDALISI', 'burak6541'] },
  maps: { title: 'HER HARİTAYA BİR PLAN.', description: 'Harita seçiminin ardından oynadığınız ajan kompozisyonları, maç sayıları ve galibiyet oranları burada yer alacak.' },
  statistics: { title: 'OYUNUN DETAYLARDA.', description: 'Takım, oyuncu, harita ve raund istatistiklerini bu bölümde inceleyebileceksiniz. Bu ana menü denemesinde henüz canlı veri bağlantısı bulunmuyor.' },
  mystery: { title: 'BU HAMLE ŞİMDİLİK GİZLİ.', description: 'Bu bölüm gelecek bir fikir için ayrıldı. Şimdilik takımın en iyi saklanan sırrı.' }
};
document.querySelectorAll('[data-section]').forEach(card => card.addEventListener('click', () => {
  const section = sections[card.dataset.section];
  document.querySelector('#dialog-title').textContent = section.title;
  document.querySelector('#dialog-description').textContent = section.description;
  const content = document.querySelector('#dialog-content');
  content.replaceChildren();
  if (section.players) {
    const list = document.createElement('div');
    list.className = 'player-list';
    section.players.forEach(name => { const player = document.createElement('span'); player.textContent = name; list.append(player); });
    content.append(list);
  }
  dialog.showModal();
}));
document.querySelectorAll('.close,.back').forEach(button => button.addEventListener('click', () => dialog.close()));
dialog.addEventListener('click', event => { if (event.target === dialog) { const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close(); } });
