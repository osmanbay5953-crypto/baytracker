import assert from 'node:assert/strict';
import {answerQuality,scoreAnswer} from './quiz-questions.mjs';
const base=process.env.QUIZ_TEST_BASE||'http://127.0.0.1:4175';
async function request(path,body,cookie){const r=await fetch(base+'/api/quiz/rooms'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:base}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||cookie};}
assert.equal((await request('',{name:'Invalid',mode:'solo',categories:[],count:5})).status,400);
assert.equal((await request('',{name:'Invalid',mode:'solo',categories:['map'],count:40})).status,400);
assert.equal((await request('',{name:'Invalid',mode:'solo',categories:['lore'],count:4})).status,400);
const host=await request('',{name:'Rank Host',mode:'coop',categories:['ranking'],count:5});assert.equal(host.status,200);
const code=host.data.code,h=host.cookie,guest=await request('/'+code+'/join',{name:'Rank Guest'}),g=guest.cookie;
let current=(await request('/'+code+'/start',{},h)).data;assert.equal(current.question.kind,'ranking');assert.equal(current.question.options.length,5);assert.equal(current.duration,35000);assert.equal(current.question.values,undefined);assert.equal(current.question.correct,undefined);
await new Promise(r=>setTimeout(r,Math.max(0,current.startsAt-Date.now()+60)));
assert.equal((await request('/'+code+'/answer',{index:0,order:[0,0,1,2,3]},h)).status,400);
assert.equal((await request('/'+code+'/answer',{index:0,order:[0,1,2,3]},h)).status,400);
const first=await request('/'+code+'/answer',{index:0,order:[0,1,2,3,4]},h);assert.equal(first.status,200);assert.equal(first.data.answer.quality,undefined);assert.equal(first.data.answer.points,undefined);assert.equal(first.data.players[0].score,0);
assert.equal((await request('/'+code+'/answer',{index:0,order:[0,1,2,3,4]},h)).status,409);
const reveal=await request('/'+code+'/answer',{index:0,order:[4,3,2,1,0]},g);assert.equal(reveal.data.phase,'reveal');assert(Array.isArray(reveal.data.question.correct));
const expected=answerQuality({...reveal.data.question,rankValues:reveal.data.question.values},{order:[4,3,2,1,0]}).quality;assert.equal(reveal.data.answer.quality,expected);assert.equal(reveal.data.answer.points,Math.round(scoreAnswer(true,reveal.data.answer.elapsed,35000)*expected));assert.equal(reveal.data.players.reduce((n,p)=>n+p.score,0)>0,true);
let multiple;
for(let i=0;i<35;i++){const r=await request('',{name:'Multi Test',mode:'solo',categories:['agent'],count:5});assert.equal(r.status,200);if(r.data.question.kind==='multiple'){multiple=r;break;}}
assert(multiple,'Multiple-choice question must be available');
await new Promise(r=>setTimeout(r,Math.max(0,multiple.data.startsAt-Date.now()+60)));
const mcode=multiple.data.code,m=multiple.cookie;
assert.equal((await request('/'+mcode+'/answer',{index:0,choices:[0,0]},m)).status,400);
const selected=await request('/'+mcode+'/answer',{index:0,choices:[0,1,2,3]},m);assert.equal(selected.status,200);assert.equal(selected.data.phase,'reveal');assert.equal(selected.data.answer.quality,0);assert.equal(selected.data.answer.points,0);assert(Array.isArray(selected.data.question.correct));
console.log('Passed server category/count validation, five-player ranking format, private answer/score, invalid/duplicate answers, partial grading and multiple-selection penalty.');
