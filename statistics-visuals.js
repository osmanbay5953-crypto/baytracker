const metricSymbols = [
  'M7 3h10v5c0 4-2 6-5 6s-5-2-5-6z M7 5H3v2c0 3 2 4 5 4 M17 5h4v2c0 3-2 4-5 4 M12 14v5 M8 21h8',
  'M12 2l9 5v7l-9 8-9-8V7z M8 11l3 3 5-6',
  'M3 6h18v5h-8l-3 8H6l2-8H3z M14 11v3h-3',
  'M12 2v5 M12 17v5 M2 12h5 M17 12h5 M19 12a7 7 0 1 1-14 0 7 7 0 1 1 14 0z',
  'M3 9l6 6 4-4 7 7 M15 18h5v-5',
  'M12 2l6 9v7l-6 4-6-4v-7z M12 7v9 M7 12l5 4 5-4'
];

function metricIcon(index) {
  const ns = 'http://www.w3.org/2000/svg';
  const icon = document.createElementNS(ns,'svg');
  icon.setAttribute('viewBox','0 0 24 24');
  icon.setAttribute('aria-hidden','true');
  const path = document.createElementNS(ns,'path');
  path.setAttribute('d',metricSymbols[index]);
  icon.append(path);
  return icon;
}

function mapSpotlight(label,map) {
  const card=el('article','map-spotlight');
  card.append(image('assets/maps/'+key(map.name)+'-bg.png','spotlight-art'));
  const copy=el('div','spotlight-copy');
  copy.append(el('span',null,label),el('h3',null,map.name),
    el('small',null,map.wins+' galibiyet / '+map.matches+' maç'));
  card.append(copy,el('strong',null,percent(100*map.wins/map.matches)));
  return card;
}

function decorateTables(groups,data,act,stats) {
  const sections=groups.querySelectorAll('details');
  sections[0].querySelectorAll('tbody tr').forEach((row,i)=>{
    const player=data.players[i],cell=row.cells[0];
    const link=el('a','player-chip');
    link.href='profiles.html?player='+player.id+'&scope=team&act='+act;
    link.append(image('assets/agents/'+key(player.scopes.team[act].agent)+'-icon.png','chip-art'),el('span',null,player.name));
    cell.replaceChildren(link);
  });
  sections[1].querySelectorAll('tbody tr').forEach((row,i)=>{
    const map=stats.maps[i], name=row.cells[0], rate=row.cells[3];
    const chip=el('span','map-chip');
    chip.append(image('assets/maps/'+key(map.name)+'-bg.png','map-thumb'),el('span',null,map.name));
    name.replaceChildren(chip);
    const track=el('span','win-track'),fill=el('i');
    fill.style.width=(100*map.wins/map.matches)+'%';
    track.append(fill);rate.append(track);
  });
}
