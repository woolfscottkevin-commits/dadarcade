import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import handler from '../../api/scores.js';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('game and catalog scripts parse, and catalog metadata stays consistent',()=>{
 for(const file of ['../index.html','../../index.html','../../games/index.html']){
  for(const m of read(file).matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){if(m[1].includes('application/ld+json'))JSON.parse(m[2]);else new vm.Script(m[2]);}
 }
 const html=read('../../games/index.html');const catalog=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);assert.equal(catalog.numberOfItems,catalog.itemListElement.length);
 const pinball=catalog.itemListElement.find(v=>v.item.url.endsWith('/pinball'));assert.ok(pinball);assert.equal(pinball.item.operatingSystem,undefined,'Device publication requires physical-device testing');assert.ok(/data-genres="arcade"[^>]*data-added="2026-10-19"/.test(html));
 const home=read('../../index.html');assert.equal((home.match(/href="\/pinball"/g)||[]).length,2);assert.ok(home.includes('<option value="Midnight Observatory Pinball">'));assert.ok(read('../../sitemap.xml').includes('<loc>https://dadarcade.com/pinball</loc>'));
});
function response(){return{code:0,data:null,setHeader(){},status(n){this.code=n;return this;},json(v){this.data=v;return this;},end(){return this;}};}
test('leaderboard GET reads the pinball namespace',async t=>{let commands;t.mock.method(globalThis,'fetch',async(url,options)=>{commands=JSON.parse(options.body);return{json:async()=>[{result:[]},{result:[]}]};});const res=response();await handler({method:'GET',url:'/api/scores?game=pinball',headers:{host:'localhost'}},res);assert.equal(res.code,200);assert.equal(commands[0][1],'pinball_leaderboard:alltime');assert.match(commands[1][1],/^pinball_leaderboard:daily:/);assert.deepEqual(res.data,{alltime:[],daily:[]});});
test('leaderboard POST stores a pinball score and returns a rank',async t=>{let stored;t.mock.method(globalThis,'fetch',async(url,options)=>{const command=JSON.parse(options.body);if(command[0]==='INCR')return{json:async()=>({result:1})};if(command[0]==='EXPIRE')return{json:async()=>({result:1})};stored=command;return{json:async()=>[1,1,1,0,0,[],[]].map(result=>({result}))};});const res=response();await handler({method:'POST',url:'/api/scores?game=pinball',headers:{host:'localhost'},body:{initials:'DAD',score:12345}},res);assert.equal(res.code,200);assert.equal(res.data.alltimeRank,1);assert.equal(stored[0][1],'pinball_leaderboard:alltime');assert.ok(stored[0][3].startsWith('DAD|'));});
test('leaderboard rejects invalid initials and scores without storage calls',async t=>{t.mock.method(globalThis,'fetch',()=>{assert.fail('Invalid scores must not be stored');});for(const body of [{initials:'<x>',score:10},{initials:'DAD',score:1000000},{initials:'DAD',score:0},{initials:'DAD',score:1.5}]){const res=response();await handler({method:'POST',url:'/api/scores?game=pinball',headers:{host:'localhost'},body},res);assert.equal(res.code,400);}});
