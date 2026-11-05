function mapCompositions(lineups) {
  const maps = new Map();
  for (const lineup of lineups) {
    if (!maps.has(lineup.map)) maps.set(lineup.map, new Map());
    const groups = maps.get(lineup.map);
    const agents = [...lineup.agents].sort();
    const key = agents.join('|');
    if (!groups.has(key)) groups.set(key, { agents, matches: 0, wins: 0, lineups: [] });
    const comp = groups.get(key);
    comp.matches += lineup.matches;
    comp.wins += lineup.wins;
    comp.lineups.push({ agents: lineup.agents, matches: lineup.matches, wins: lineup.wins });
  }
  return Object.fromEntries([...maps].map(([map, groups]) => [map, [...groups.values()].sort(
    (a, b) => b.wins * a.matches - a.wins * b.matches || b.matches - a.matches || a.agents.join().localeCompare(b.agents.join())
  )]));
}
module.exports = mapCompositions;
