import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

// Exercise the shipping inline engine with a quiet DOM/canvas. Test controls are
// injected only into this VM; the public page exposes read-only diagnostics.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
function game({reducedMotion=true}={}) {
  const elements = new Map();
  const paintCalls=[];
  const paint = new Proxy({}, { get: (_, name) => (...args) => {paintCalls.push([name,...args]);if(name.startsWith('create'))return {addColorStop(){}};} });
  function element(id) {
    if (!elements.has(id)) elements.set(id, {id,clientWidth:400,width:800,height:1312,style:{},dataset:{},value:'',open:false,textContent:'',innerHTML:'',classList:{add(){},remove(){}},getContext:()=>paint,addEventListener(){},setAttribute(){},querySelector(){return element('child');},showModal(){this.open=true;},close(){this.open=false;},blur(){},replaceChildren(){},append(){}});
    return elements.get(id);
  }
  const sandbox = {console,Math:Object.create(Math),document:{getElementById:element,createElement:()=>element(Math.random()),querySelector:sel=>sel==='dialog[open]'?[...elements.values()].find(e=>e.open)||null:null,querySelectorAll:()=>[],addEventListener(){}},localStorage:{getItem:()=>null,setItem(){}},matchMedia:()=>({matches:reducedMotion}),ResizeObserver:class{observe(){}},devicePixelRatio:1,requestAnimationFrame(){},setTimeout(){},performance:{now:()=>0},gtag(){}};
  const listeners={};
  sandbox.window={addEventListener(type,fn){(listeners[type]||=[]).push(fn);}};
  const context=vm.createContext(sandbox);
  vm.runInContext(source.replace('// Read-only state is useful', `window.test = { startGame, step, newBall, prepareBall, beginCharge, launchBall, registerStar, registerBumper, portal, nudge, pauseGame, resumeGame, updateUI, draw,
    set: options => { if('balls' in options)balls=options.balls;if('time' in options)time=options.time;if('saveUntil' in options)saveUntil=options.saveUntil;if('stage' in options)stage=options.stage;if('score' in options)score=options.score;if('skillLane' in options)skillLane=options.skillLane; },
    hold: side => inputs[side].add('test'), release: side=>inputs[side].clear(),
    get:()=>({state,score,time,balls,ballNumber,stage,stars,meteorHits,meteorUntil,saveUntil,tiltUntil,multiplier,flippers,lanes,labels,skillLane}), aimLane
  };
  // Read-only state is useful`),context);
  const api=sandbox.window.test;
  api.startGame();
  api.advance=seconds=>{for(let i=0;i<Math.round(seconds*240);i++)api.step(1/240);};
  api.elements=elements;
  api.paintCalls=paintCalls;
  api.key=(type,code,target='body')=>{const e={code,repeat:false,prevented:false,target:{matches:sel=>sel.split(',').includes(target)},preventDefault(){this.prevented=true;}};for(const fn of listeners[type]||[])fn(e);return e;};
  return api;
}

for(const power of [0,.5,1])test(`launch at ${power*100}% reaches the playfield`,()=>{
 const g=game();g.beginCharge();g.advance(power/0.8);g.launchBall();let entered=false;
 for(let i=0;i<720;i++){g.step(1/240);const b=g.get().balls[0];if(b.x<410&&b.y<650)entered=true;assert.ok(Number.isFinite(b.x)&&Number.isFinite(b.y));}
 assert.ok(entered,'Ball must leave the launch channel');
});
test('moving flipper sends a falling ball upward',()=>{const g=game();g.set({balls:[g.newBall(191,706,0,250,false)],saveUntil:0});g.hold('left');g.advance(.1);assert.ok(g.get().balls[0].vy < -400);});
test('held flippers return to their resting angle on pause',()=>{const g=game();g.hold('left');g.advance(.1);g.pauseGame(false);const before=g.get().time;g.advance(2);assert.equal(g.get().time,before);g.resumeGame();g.advance(.1);assert.equal(g.get().flippers[0].a,g.get().flippers[0].rest);});
test('six unique stars start the timed meteor mission',()=>{const g=game(),b=g.newBall();for(let i=0;i<6;i++)g.registerStar(i,b);assert.equal(g.get().stage,1);assert.equal(g.get().stars.size,6);assert.equal(g.get().meteorUntil,30);});
test('eight bumper hits unlock the portal; portal releases multiball',()=>{const g=game(),b=g.newBall();for(let i=0;i<6;i++)g.registerStar(i,b);for(let i=0;i<8;i++){g.set({time:i*.2});g.registerBumper(i%3,b);}assert.equal(g.get().stage,2);g.portal(b);assert.equal(g.get().stage,3);assert.equal(g.get().balls.length,3);assert.ok(g.get().saveUntil>g.get().time);});
test('meteor timeout resets constellation without losing score',()=>{const g=game(),b=g.newBall();for(let i=0;i<6;i++)g.registerStar(i,b);const score=g.get().score;g.advance(30.1);assert.equal(g.get().stage,0);assert.equal(g.get().stars.size,0);assert.equal(g.get().score,score);});
test('ball save relaunches without consuming a ball',()=>{const g=game();g.set({balls:[g.newBall(240,840,0,300,false)],saveUntil:8});g.advance(.02);assert.equal(g.get().ballNumber,1);assert.equal(g.get().balls.length,1);assert.equal(g.get().balls[0].waiting,false);assert.ok(g.get().balls[0].vy<0);});
test('three drains end a game and a restart clears progress',()=>{const g=game();for(let i=0;i<3;i++){g.set({balls:[g.newBall(240,840,0,300,false)],saveUntil:0});g.advance(.01);}assert.equal(g.get().state,'over');assert.equal(g.get().ballNumber,3);g.startGame();assert.equal(g.get().score,0);assert.equal(g.get().ballNumber,1);assert.equal(g.get().state,'playing');});
test('multiball returns to constellation after two unsaved drains',()=>{const g=game();g.set({stage:3,saveUntil:0,balls:[g.newBall(240,840,0,300,false),g.newBall(250,840,0,300,false),g.newBall(220,450,0,0,false)]});g.advance(.01);assert.equal(g.get().stage,0);assert.equal(g.get().balls.length,1);assert.equal(g.get().ballNumber,1);});
test('rapid nudges tilt, disable scoring and expire after three seconds',()=>{const g=game();g.set({balls:[g.newBall(240,500,0,100,false)]});g.nudge();g.nudge();g.nudge();assert.equal(g.get().tiltUntil,3);const before=g.get().score;g.registerStar(1,g.get().balls[0]);assert.equal(g.get().score,before);g.set({balls:[g.newBall()]});g.advance(3.1);assert.ok(g.get().time>g.get().tiltUntil);});
test('score respects the existing leaderboard maximum',()=>{const g=game();g.set({score:999990});g.registerStar(0,g.newBall());assert.equal(g.get().score,999999);});
test('both flippers survive repeated long rallies with finite coordinates',()=>{const g=game();g.beginCharge();g.launchBall();for(let i=0;i<240*120;i++){if(i%130===0){g.release('left');g.release('right');}if(i%130===12){g.hold('left');g.hold('right');}g.step(1/240);for(const b of g.get().balls){assert.ok(Number.isFinite(b.x)&&Number.isFinite(b.y)&&Number.isFinite(b.vx)&&Number.isFinite(b.vy));assert.ok(b.x>0&&b.x<500,'Ball remains inside cabinet sides');}if(g.get().balls.some(b=>b.waiting)){g.beginCharge();g.launchBall();}if(g.get().state==='over')break;}g.updateUI();g.draw(1000);});
test('right flipper also sends a falling ball upward',()=>{const g=game();g.set({balls:[g.newBall(289,706,0,250,false)],saveUntil:0});g.hold('right');g.advance(.1);assert.ok(g.get().balls[0].vy < -400);});
test('left orbit has enough clearance for the ball to pass all targets',()=>{const g=game();g.set({balls:[g.newBall(85,310,0,200,false)],saveUntil:0});let exited=false;for(let i=0;i<240*6;i++){g.step(1/240);if(g.get().balls[0].y>540)exited=true;}assert.ok(exited,'Ball must be able to leave the lower orbit');});
test('a multiball collision separates two approaching balls',()=>{const g=game();g.set({balls:[g.newBall(230,480,100,0,false),g.newBall(245,480,-100,0,false)]});g.step(1/240);const [a,b]=g.get().balls;assert.ok(b.x-a.x>=16);assert.ok(a.vx<0&&b.vx>0);});
test('each fresh ball labels the launch control correctly',()=>{const g=game();g.set({balls:[g.newBall(240,840,0,300,false)],saveUntil:0});g.advance(.01);assert.equal(g.elements.get('start').textContent,'LAUNCH BALL');});
// Skill shot: plunger power picks the rollover the lob drops into; only that first lob rollover can pay.
function plunge(g,power,lit,seconds=2.5){g.set({skillLane:lit});g.beginCharge();g.advance(power/.8);g.launchBall();const seen=new Set(),first=[];let skill=0;for(let i=0;i<240*seconds;i++){const before=new Set(g.get().lanes);g.step(1/240);for(const l of g.get().lanes)if(!before.has(l))first.push(l);for(const l of g.get().labels)if(!seen.has(l)){seen.add(l);if(l.text==='SKILL SHOT')skill++;}}return{first:first[0],skill};}
for(const [power,lane] of [[.25,2],[.58,1],[.86,0]])test(`a ${Math.round(power*100)}% launch lobs into lane 0${lane+1} and pays the skill shot when it is lit`,()=>{const g=game();assert.equal(g.aimLane(power),lane,'On-screen aim matches the lane');const hit=plunge(g,power,lane);assert.equal(hit.first,lane);assert.equal(hit.skill,1);const g2=game(),miss=plunge(g2,power,(lane+1)%3);assert.equal(miss.first,lane,'The lob still rolls through its lane');assert.equal(miss.skill,0,'Landing in an unlit lane misses the skill shot');});
test('full power sails over the rollovers and misses the skill shot',()=>{const g=game();assert.equal(g.aimLane(1),3);for(const lit of [0,1,2]){const r=plunge(game(),1,lit,1.6);assert.equal(r.first,undefined);assert.equal(r.skill,0);}});
test('a later flipper-shot rollover through the lit lane is ordinary, not a skill shot',()=>{const g=game();plunge(g,1,1,3);const b=g.get().balls[0];assert.equal(b.skill,false,'The skill attempt ends with the lob');const lanes=g.get().lanes.size;g.set({balls:[b]});Object.assign(b,{x:201,y:110,vx:0,vy:200});const seen=new Set(g.get().labels);g.advance(.1);assert.equal(g.get().lanes.size,lanes+1,'The rollover still scores');assert.ok(!g.get().labels.some(l=>!seen.has(l)&&l.text==='SKILL SHOT'));});
test('a ball-save relaunch gets no free skill attempt',()=>{const g=game();g.set({balls:[g.newBall(240,840,0,300,false)],saveUntil:8});g.advance(.02);assert.equal(g.get().balls[0].skill,false);});
// Each of these spots used to wedge a ball forever: the side pockets beside the lane posts, and the inlane floor beside each flipper pivot.
for(const [x,y] of [[50,560],[430,560],[80,600],[400,600]])test(`a ball dropped at ${x},${y} rolls to the flippers instead of wedging`,()=>{const g=game();g.set({balls:[g.newBall(x,y,0,0,false)],saveUntil:0});g.advance(6);assert.equal(g.get().ballNumber,2,'With no flipper input the ball must reach the drain');});
test('a ball that falls back down the shooter lane waits on the plunger without a fresh ball save',()=>{const g=game();g.set({balls:[g.newBall(420,40,300,0,false)],saveUntil:0});g.advance(3);const b=g.get().balls[0];assert.equal(b.waiting,true);assert.equal(g.elements.get('start').textContent,'LAUNCH BALL');g.beginCharge();g.launchBall();assert.equal(b.waiting,false);assert.equal(g.get().saveUntil,0);});
test('a motionless ball low on the table is nudged free unless a flipper is held',()=>{const pin=(g,b)=>{let kicked=false;for(let i=0;i<240*2.1&&!kicked;i++){b.x=240;b.y=650;b.vx=0;b.vy=0;g.step(1/240);kicked=b.vy<-100;}return kicked;};const g=game();const b=g.newBall(240,650,0,0,false);g.set({balls:[b],saveUntil:0});assert.ok(pin(g,b),'Recovery kicks the ball back into play');const c=g.newBall(240,650,0,0,false);g.set({balls:[c]});g.hold('left');assert.equal(pin(g,c),false,'A cradled ball is left alone');});
test('Space launches even when a header button kept focus after a dialog',()=>{const g=game();const down=g.key('keydown','Space','button');assert.ok(down.prevented,'The browser must not also click the focused button');g.key('keyup','Space','button');assert.equal(g.get().balls[0].waiting,false);});
test('Escape is left to the browser so help and leaderboard dialogs close',()=>{const g=game();g.elements.get('help-dialog').open=true;assert.equal(g.key('keydown','Escape').prevented,false);g.elements.get('help-dialog').open=false;g.elements.get('pause-dialog').open=true;g.pauseGame(false);assert.ok(g.key('keydown','Escape').prevented);assert.equal(g.get().state,'playing');});
// Recorded from play: a fast ball crossing under the raised left flipper used to leave the table past the left cabinet edge (outer wall ends at y=625)
// while still above the drain, drawn over the frame. The right case mirrors it to keep the guards symmetric.
for(const [side,x,y,vx,vy] of [['left',282,702.4,-299.3,450.3],['right',198,702.4,299.3,450.3]])test(`a ball slipping under the raised ${side} flipper stays inside the cabinet and drains under the apron`,()=>{const g=game();g.hold(side);g.advance(.1);const b=g.newBall(x,y,vx,vy,false);g.set({balls:[b],saveUntil:0});const floor=x=>x<59?600+(x-31)*64/28:x<99?664+(x-59)*20/40:684+(x-99)*8/41,guard=x=>692+(140-x)/3;for(let i=0;i<240*2&&g.get().ballNumber===1;i++){g.step(1/240);const sx=side==='left'?b.x:480-b.x;assert.ok(!(sx<140&&sx>31&&b.y>floor(sx)&&b.y<guard(sx)),`ball at ${Math.round(b.x)},${Math.round(b.y)} is beneath the ${side} inlane`);assert.ok(!(sx<33&&b.y<786+8),`ball at ${Math.round(b.x)},${Math.round(b.y)} is outside the cabinet above the apron`);}assert.equal(g.get().ballNumber,2,'The ball drains');});
for(const reducedMotion of [false,true])test(`the drain apron hides lost balls${reducedMotion?' with reduced motion':' and their trails'}`,()=>{
 const g=game({reducedMotion}),b=g.newBall(64,815,0,250,false);b.trail.push({x:75,y:805});g.set({balls:[b],saveUntil:8});g.paintCalls.length=0;g.draw(1000);
 const body=g.paintCalls.findIndex(([op,x,y,r])=>op==='arc'&&x===64&&y===815&&r===8);
 const apron=g.paintCalls.findIndex(([op,x,y,w,h])=>op==='fillRect'&&x<=56&&y<=797&&x+w>=83&&y+h>=820);
 assert.ok(body>=0&&apron>body,'Opaque apron must cover the lost ball after it is drawn');
 if(!reducedMotion){const trail=g.paintCalls.findIndex(([op,x,y])=>op==='arc'&&x===75&&y===805);assert.ok(trail>=0&&trail<apron,'Trail must disappear beneath the same apron');}
 const [,x,,width]=g.paintCalls[apron];assert.ok(x+width<466-8,'Apron must leave the shooter lane visible');
 assert.equal(g.get().balls[0],b,'Drawing must not consume the ball or change ball-save timing');assert.equal(g.get().ballNumber,1);assert.equal(g.get().saveUntil,8);
});
