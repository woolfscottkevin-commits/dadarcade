import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

// Exercise the shipping inline engine with a quiet DOM/canvas. Test controls are
// injected only into this VM; the public page exposes read-only diagnostics.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
function game() {
  const elements = new Map();
  const paint = new Proxy({}, { get: (_, name) => name.startsWith('create') ? () => ({addColorStop(){}}) : () => {} });
  function element(id) {
    if (!elements.has(id)) elements.set(id, {id,clientWidth:400,width:800,height:1312,style:{},dataset:{},value:'',open:false,textContent:'',innerHTML:'',classList:{add(){},remove(){}},getContext:()=>paint,addEventListener(){},setAttribute(){},querySelector(){return element('child');},showModal(){this.open=true;},close(){this.open=false;},blur(){},replaceChildren(){},append(){}});
    return elements.get(id);
  }
  const sandbox = {console,Math:Object.create(Math),document:{getElementById:element,createElement:()=>element(Math.random()),querySelectorAll:()=>[],addEventListener(){}},localStorage:{getItem:()=>null,setItem(){}},matchMedia:()=>({matches:true}),ResizeObserver:class{observe(){}},devicePixelRatio:1,requestAnimationFrame(){},setTimeout(){},performance:{now:()=>0},gtag(){}};
  sandbox.window={addEventListener(){}};
  const context=vm.createContext(sandbox);
  vm.runInContext(source.replace('// Read-only state is useful', `window.test = { startGame, step, newBall, prepareBall, beginCharge, launchBall, registerStar, registerBumper, portal, nudge, pauseGame, resumeGame, updateUI, draw,
    set: options => { if('balls' in options)balls=options.balls;if('time' in options)time=options.time;if('saveUntil' in options)saveUntil=options.saveUntil;if('stage' in options)stage=options.stage;if('score' in options)score=options.score; },
    hold: side => inputs[side].add('test'), release: side=>inputs[side].clear(),
    get:()=>({state,score,time,balls,ballNumber,stage,stars,meteorHits,meteorUntil,saveUntil,tiltUntil,multiplier,flippers,lanes})
  };
  // Read-only state is useful`),context);
  const api=sandbox.window.test;
  api.startGame();
  api.advance=seconds=>{for(let i=0;i<Math.round(seconds*240);i++)api.step(1/240);};
  api.elements=elements;
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
