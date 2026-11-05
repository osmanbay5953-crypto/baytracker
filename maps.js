// Yeni haritalar ve rozetler bu listeye eklenebilir.
const maps = [
  { id: 'abyss', name: 'Abyss', color: '#486875' },
  { id: 'ascent', name: 'Ascent', color: '#8c6e78' },
  { id: 'bind', name: 'Bind', color: '#ab875c' },
  { id: 'breeze', name: 'Breeze', color: '#4b9591' },
  { id: 'corrode', name: 'Corrode', color: '#7b7b91' },
  { id: 'fracture', name: 'Fracture', color: '#7c907a' },
  { id: 'haven', name: 'Haven', color: '#a77266' },
  { id: 'icebox', name: 'Icebox', color: '#769aae' },
  { id: 'lotus', name: 'Lotus', color: '#6b876e' },
  { id: 'pearl', name: 'Pearl', color: '#4a8999' },
  { id: 'split', name: 'Split', color: '#698482' },
  { id: 'summit', name: 'Summit', color: '#226b74' },
  { id: 'sunset', name: 'Sunset', color: '#a46782' }
];
const grid = document.querySelector('.map-grid');
const dialog = document.querySelector('#map-dialog');
maps.forEach(map => {
  const card = document.createElement('button');
  card.className = 'map-tile map-' + map.id;
  card.setAttribute('aria-label', `${map.name} kompozisyonlarını aç`);
  card.setAttribute('aria-haspopup', 'dialog');
  card.style.setProperty('--map-color', map.color);
  card.style.setProperty('--badge-clip', `url(#badge-${map.id})`);
  if (map.background !== false) {
    const background = document.createElement('img');
    background.className = 'map-background';
    background.src = `assets/maps/${map.id}-bg.png`;
    background.alt = '';
    background.loading = 'lazy';
    card.append(background);
  }
  const shade = document.createElement('span');
  shade.className = 'map-shade';
  const badge = document.createElement('img');
  badge.className = 'map-badge';
  badge.src = `assets/maps/${map.id}-badge.png`;
  badge.alt = '';
  const name = document.createElement('span');
  name.className = 'map-name';
  name.textContent = map.name.toUpperCase();
  card.append(shade, badge, name);
  card.addEventListener('click', () => {
    document.querySelector('#map-dialog-title').textContent = map.name.toUpperCase();
    document.querySelector('#selected-badge').src = badge.src;
    dialog.style.setProperty('--map-color', map.color);
    dialog.style.setProperty('--badge-clip', `url(#badge-${map.id})`);
    dialog.showModal();
    showCompositions(map.name);
    showVctCompositions(map.name);
  });
  grid.append(card);
});

// Animate only the card under a mouse, with a soft return to its resting state.
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
document.querySelectorAll('.map-tile').forEach(card => {
  let targetX=0, targetY=0, x=0, y=0, frame=0;
  function tick(){
    x+=(targetX-x)*.12; y+=(targetY-y)*.12;
    card.style.setProperty('--pointer-x', x.toFixed(4));
    card.style.setProperty('--pointer-y', y.toFixed(4));
    if(Math.abs(targetX-x)+Math.abs(targetY-y)>.001)frame=requestAnimationFrame(tick);
    else frame=0;
  }
  function start(){if(!frame)frame=requestAnimationFrame(tick);}
  card.addEventListener('pointermove', event => {
    if(event.pointerType!=='mouse'||motionPreference.matches)return;
    const rect=card.getBoundingClientRect();
    targetX=Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1));
    targetY=Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1));
    start();
  });
  function reset(){targetX=0;targetY=0;start();}
  card.addEventListener('pointerleave',reset);
  card.addEventListener('blur',reset);
  motionPreference.addEventListener('change',reset);
});
document.querySelectorAll('.close,.back').forEach(button => button.addEventListener('click', () => dialog.close()));
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
});

let archiveRequest;
let selection = 0;
async function showCompositions(mapName) {
  const current = ++selection;
  const summary = document.querySelector('#comp-summary');
  const list = document.querySelector('#comp-list');
  list.replaceChildren();
  dialog.scrollTop = 0;
  summary.textContent = 'Maçlar yükleniyor…';
  try {
    archiveRequest ??= fetch('assets/map-compositions.json').then(response => {
      if (!response.ok) throw Error('Archive unavailable');
      return response.json();
    }).catch(error => { archiveRequest = null; throw error; });
    const { maps, players } = await archiveRequest;
    if (current !== selection) return;
    const comps = maps[mapName] || [];
    if (!comps.length) {
      summary.textContent = 'Bu haritada kayıtlı beşli maçınız yok.';
      return;
    }
    const total = comps.reduce((sum, comp) => sum + comp.matches, 0);
    summary.textContent = total + ' beşli maç · ' + comps.length + ' farklı comp';
    for (const comp of comps) {
      const item = document.createElement('details');
      const row = document.createElement('summary');
      const portraits = document.createElement('span');
      portraits.className = 'comp-portraits';
      for (const agent of comp.agents) {
        const tile = document.createElement('span');
        tile.className = 'comp-agent';
        tile.title = agent;
        const img = document.createElement('img');
        img.src = 'assets/agents/' + agent.toLowerCase().replace(/[^a-z0-9-]/g, '-') + '-icon.png';
        img.alt = '';
        const label = document.createElement('span');
        label.textContent = agent;
        tile.append(img, label);
        portraits.append(tile);
      }
      const count = document.createElement('small');
      count.textContent = comp.wins + ' galibiyet / ' + comp.matches + ' maç';
      const rate = document.createElement('b');
      rate.textContent = (comp.wins / comp.matches).toLocaleString('tr-TR', {style:'percent', maximumFractionDigits:1});
      row.append(portraits, count, rate);
      item.append(row);
      for (const lineup of comp.lineups) {
        const detail = document.createElement('p');
        detail.textContent = players.map((player, index) => player + ' — ' + lineup.agents[index]).join(' · ');
        if (comp.lineups.length > 1) detail.textContent += ' (' + lineup.wins + '/' + lineup.matches + ' galibiyet)';
        item.append(detail);
      }
      list.append(item);
      window.BayUI?.decorate(item.parentElement.lastElementChild);
    }
  } catch {
    if (current === selection) summary.textContent = 'Maçlar yüklenemedi. Haritayı tekrar açmayı dene.';
  }
}

let vctRequest;
let vctSelection = 0;
async function showVctCompositions(mapName) {
  const current = ++vctSelection;
  const list = document.querySelector('#vct-list');
  list.textContent = 'VCT maçları yükleniyor…';
  try {
    vctRequest ??= fetch('assets/vct-compositions.json').then(response => {
      if (!response.ok) throw Error('VCT data unavailable');
      return response.json();
    }).catch(error => { vctRequest = null; throw error; });
    const data = await vctRequest;
    if (current !== vctSelection) return;
    list.replaceChildren();
    const comps = data.maps[mapName] || [];
    if (!comps.length) {
      list.textContent = 'Bu turnuvada ilk dört takımın bu haritada kaydı yok.';
      return;
    }
    for (const comp of comps) {
      const card = document.createElement('article');
      card.className = 'vct-comp';
      const heading = document.createElement('div');
      heading.className = 'vct-comp-heading';
      const team = document.createElement('strong');
      team.textContent = comp.team;
      const rate = document.createElement('b');
      rate.textContent = (comp.wins / comp.matches).toLocaleString('tr-TR', {style:'percent', maximumFractionDigits:1});
      heading.append(team, rate);
      const portraits = document.createElement('div');
      portraits.className = 'comp-portraits';
      for (const agent of comp.agents) {
        const tile = document.createElement('span');
        tile.className = 'comp-agent';
        const img = document.createElement('img');
        img.src = 'assets/agents/' + agent.toLowerCase().replace(/[^a-z0-9-]/g, '-') + '-icon.png';
        img.alt = '';
        const name = document.createElement('span');
        name.textContent = agent;
        tile.append(img, name);
        portraits.append(tile);
      }
      const count = document.createElement('small');
      count.textContent = comp.wins + ' galibiyet / ' + comp.matches + ' maç';
      const sources = document.createElement('details');
      const label = document.createElement('summary');
      label.textContent = 'Maç kaynakları';
      sources.append(label);
      for (const [index, url] of comp.sources.entries()) {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.textContent = 'Maç ' + (index + 1) + ' ↗';
        sources.append(link);
      }
      card.append(heading, portraits, count, sources);
      list.append(card);
    }
  } catch {
    if (current === vctSelection) list.textContent = 'VCT maçları yüklenemedi. Haritayı tekrar açmayı dene.';
  }
}
