const assert=require('assert/strict'),{analyzeRound,aggregate,soloMatch,teamMatch}=require('./build-profiles.cjs');
const players=[{puuid:'a',team_id:'Red'},{puuid:'b',team_id:'Red'},{puuid:'x',team_id:'Blue'},{puuid:'y',team_id:'Blue'}];
const kill=(killer,victim,time)=>({round:0,time_in_round_in_ms:time,killer:{puuid:killer,team:players.find(p=>p.puuid===killer).team_id},victim:{puuid:victim,team:players.find(p=>p.puuid===victim).team_id},assistants:[]});
const m={players,teams:[{team_id:'Red'},{team_id:'Blue'}],kills:[kill('x','a',1000),kill('b','x',6000),kill('b','y',7000)]};
let a=analyzeRound(m,{id:0,winning_team:'Red'});assert(a.traded.has('a'));assert.equal(a.clutches.get('b').against,2);assert.equal(a.clutches.get('b').won,true);
m.kills[1].time_in_round_in_ms=6001;a=analyzeRound(m,{id:0,winning_team:'Red'});assert(!a.traded.has('a'));
m.kills.push(kill('x','b',8000));a=analyzeRound(m,{id:0,winning_team:'Blue'});assert(a.uncertain);assert.equal(a.clutches.size,0);
assert.equal(aggregate([]).kast,null);assert.equal(aggregate([]).clutch,null);
assert.equal(soloMatch({players:[{party_id:'a'},{party_id:'b'}]},{party_id:'a'}),true);
assert.equal(soloMatch({players:[{party_id:'a'},{party_id:'a'}]},{party_id:'a'}),false);
const data=require('../assets/profiles-data.json');
for(const p of data.players)for(const scope of Object.values(p.scopes)){
 for(const k of ['matches','rounds','kills','deaths','assists','wins','fk','fd','kastRounds','clutchWins','clutchAttempts','mvp'])assert.equal(scope.all[k],data.acts.reduce((s,a)=>s+scope[a][k],0),p.name+' '+k);
 for(const g of Object.values(scope)){assert(g.clutchWins<=g.clutchAttempts);assert(g.kastRounds<=g.rounds);assert(g.kast===null||g.kast>=0&&g.kast<=100);}
}
for(const g of Object.values(data.team)){assert.equal(g.maps.reduce((s,m)=>s+m.matches,0),g.matches);assert.equal(g.economy.reduce((s,m)=>s+m.rounds,0),g.rounds);assert(g.sides.attack.rounds+g.sides.defense.rounds<=g.rounds);}
console.log('Passed: trade boundary, clutch, revival exclusion, solo party, empty data, all-act totals and team totals.');
