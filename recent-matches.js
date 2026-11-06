(() => {
  const list = document.querySelector('#recent-team-list');
  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  let signature = '';

  async function refresh() {
    try {
      const response = await fetch('assets/profiles-data.json', {cache: 'no-store'});
      if (!response.ok) throw new Error('Maçlar alınamadı.');
      const data = await response.json();
      const histories = data.players.map(player => new Map(
        player.groups.all.history.map(match => [match.date, match])
      ));
      const matches = [...histories[0].values()]
        .filter(match => histories.every(history => {
          const row = history.get(match.date);
          return row && row.map === match.map && row.score === match.score;
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
      const nextSignature = JSON.stringify(matches);
      if (nextSignature === signature) return;
      signature = nextSignature;
      const openDate = list.querySelector('details[open]')?.dataset.date;
      list.replaceChildren();
      if (!matches.length) {
        list.append(make('p', 'recent-note', 'Henüz beşli maç kaydı yok.'));
        return;
      }
      for (const match of matches) {
        const scores = match.score.split(/[–-]/).map(Number);
        const outcome = scores[0] === scores[1] ? 'draw' : match.won ? 'win' : 'loss';
        const card = make('details', 'recent-match ' + outcome);
        card.dataset.date = match.date;
        card.open = openDate === match.date;
        const summary = make('summary', 'recent-summary');
        const art = make('img', 'recent-map');
        art.src = 'assets/maps/' + match.map.toLowerCase() + '-bg.png';
        art.alt = '';
        art.loading = 'lazy';
        const copy = make('div', 'recent-copy');
        copy.append(make('strong', '', match.map), make('span', '',
          outcome === 'win' ? 'Galibiyet' : outcome === 'loss' ? 'Mağlubiyet' : 'Beraberlik'));
        const time = make('time', 'recent-date', new Date(match.date).toLocaleString('tr-TR', {
          timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }));
        time.dateTime = match.date;
        summary.append(art, copy, make('strong', 'recent-score', match.score), time, make('span', 'recent-chevron', '⌄'));
        const table = make('table', 'recent-players');
        const head = table.createTHead().insertRow();
        for (const title of ['Oyuncu', 'Ajan', 'K / D / A']) {
          const cell = document.createElement('th');
          cell.scope = 'col'; cell.textContent = title; head.append(cell);
        }
        const body = table.createTBody();
        const players = data.players.map((player, index) => ({player, row: histories[index].get(match.date)}));
        players.sort((a, b) => b.row.kills - a.row.kills || a.row.deaths - b.row.deaths || b.row.assists - a.row.assists);
        for (const {player, row} of players) {
          const tr = body.insertRow();
          const link = make('a', '', player.name);
          link.href = 'profiles.html?player=' + encodeURIComponent(player.id);
          tr.insertCell().append(link);
          const agent = tr.insertCell();
          const icon = make('img', 'recent-agent');
          icon.src = 'assets/agents/' + row.agent.toLowerCase().replace(/[^a-z0-9-]/g, '-') + '-icon.png';
          icon.alt = ''; icon.loading = 'lazy';
          agent.append(icon, document.createTextNode(row.agent));
          tr.insertCell().textContent = row.kills + ' / ' + row.deaths + ' / ' + row.assists;
        }
        card.append(summary, table); list.append(card);
      }
    } catch {
      if (!signature) list.replaceChildren(make('p', 'recent-note', 'Maçlar şu an yüklenemiyor. Biraz sonra tekrar denenecek.'));
    }
  }
  refresh();
  setInterval(() => { if (!document.hidden) refresh(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
})();
