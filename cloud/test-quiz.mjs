import assert from 'node:assert/strict';
import {makeQuestions,scoreAnswer,teamQuestions} from './quiz-questions.mjs';
import fs from 'node:fs';
const profiles=JSON.parse(fs.readFileSync('assets/profiles-data.json','utf8'));
for(const topic of ['team','valorant','mixed']){
  const questions=makeQuestions(profiles,topic,20);
  assert.equal(questions.length,20);
  assert.equal(new Set(questions.map(q=>q.id)).size,20);
  for(const q of questions){assert.equal(new Set(q.options).size,q.options.length);assert(q.kind==='pin'||q.kind==='ranking'||q.kind==='multiple'||(q.answer>=0&&q.answer<4));assert(q.explanation);}
}
for(const question of teamQuestions(profiles))assert(question.options[question.answer]);
assert.equal(scoreAnswer(true,0),1000);assert.equal(scoreAnswer(true,3000),900);
assert.equal(scoreAnswer(true,9000),700);assert.equal(scoreAnswer(true,15000),0);
assert.equal(scoreAnswer(false,10),0);assert.equal(scoreAnswer(true,-100),0);
const base=process.env.QUIZ_TEST_BASE||'http://127.0.0.1:4175';
async function request(path,body,cookie,origin=base){
  const response=await fetch(base+'/api/quiz/rooms'+path,{method:body?'POST':'GET',
    headers:{...(body?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{Cookie:cookie}:{})},
    body:body?JSON.stringify(body):undefined});
  const data=await response.json();
  return {status:response.status,data,cookie:response.headers.get('Set-Cookie')?.split(';')[0]||cookie};
}
const host=await request('',{name:'Test Host',mode:'coop',topic:'mixed',categories:['ability'],count:10});
assert.equal(host.status,200);const room=host.data.code,h=host.cookie;
assert.equal(host.data.phase,'lobby');
assert.equal((await request('/'+room+'/state')).status,401);
assert.equal((await request('/'+room+'/start',{},h,'https://example.com')).status,403);
assert.equal((await request('/'+room+'/start',{},h)).status,409);
const guest=await request('/'+room+'/join',{name:'Test Guest'}),g=guest.cookie;
assert.equal(guest.status,200);
assert.equal((await request('/'+room+'/start',{},g)).status,403);
assert.equal((await request('/'+room+'/join',{name:'Test Guest'})).status,409);
let current=(await request('/'+room+'/start',{},h)).data;
assert.equal(current.phase,'question');assert.equal(current.question.correct,undefined);assert.equal(current.question.explanation,undefined);
assert.equal((await request('/'+room+'/join',{name:'Late Guest'})).status,409);
assert.equal((await request('/'+room+'/answer',{index:0,choice:0},h)).status,409);
for(let round=0;round<10;round++){
  assert.equal(current.index,round);
  await new Promise(resolve=>setTimeout(resolve,Math.max(0,current.startsAt-Date.now()+70)));
  const first=await request('/'+room+'/answer',{index:round,choice:0,elapsed:0},h);
  assert.equal(first.status,200);assert.equal(first.data.answer.points,undefined);
  assert.equal((await request('/'+room+'/answer',{index:round,choice:1},h)).status,409);
  const second=await request('/'+room+'/answer',{index:round,choice:0},g);
  assert.equal(second.status,200);assert.equal(second.data.phase,'reveal');
  assert(Number.isInteger(second.data.question.correct));
  assert.equal(second.data.answer.points>0,second.data.question.correct===0);
  await new Promise(resolve=>setTimeout(resolve,Math.max(0,second.data.deadline-Date.now()+150)));
  current=(await request('/'+room+'/state',undefined,h)).data;
  console.log('Round '+(round+1)+' completed');
}
assert.equal(current.phase,'finished');assert.equal(current.players.length,2);
for(const p of current.players){assert(p.score<=p.correct*1000);assert(p.score>=p.correct*500);}
assert.equal((await request('/'+room+'/state',undefined,h)).data.me,host.data.me);
const restarted=await request('/'+room+'/start',{},h);
assert.equal(restarted.status,200);assert(restarted.data.players.every(p=>p.score===0));
console.log('Passed: question validity, score boundaries, private answers, origin, room ownership, duplicate answers, complete multiplayer round, reconnect identity, replay.');
