import test from 'node:test';import assert from 'node:assert/strict';
import {migrate,terrain,act,tick,shipTick,price,goods,capacity,loadCount,cycleLength,validBuild} from '../src/logic.mjs';
const setup=()=>{let s=migrate();s.mode='coop';s.players=[{island:0,name:'K'},{island:1,name:'E'}];s.players.forEach(p=>s.islands[p.island].owner=p.name);return s};
const port=a=>a.plots.push({kind:'liman',x:0,y:17,size:1});
const ship=(s)=>{let a=s.islands[0];port(a);port(s.islands[1]);a.stock.wood=100;act(s,s.players[0],{type:'ship',x:0,y:17});return s.ships[0]};
const zeros=()=>Object.fromEntries(goods.map(g=>[g,0]));
test('Ten different maps with reachable terrain classes and fertility',()=>{let s=setup(),maps=new Set;for(let i=0;i<10;i++){let arr=[];for(let x=0;x<36;x++)for(let y=0;y<36;y++)arr.push(terrain(x,y,i));maps.add(arr.join());for(let t of ['sea','forest','rock','mountain','lake','coast','city'])assert.ok(arr.includes(t),i+':'+t);}assert.equal(maps.size,10);assert.ok(cycleLength({kind:'koyun',fertility:130})<cycleLength({kind:'koyun',fertility:75}));});
test('Old records keep stock, technology, buildings and cargo through idempotent migration',()=>{let old=setup();delete old.version;old.islands[0].plots=[{kind:'oduncu',x:2,y:2,size:1},{kind:'liman',x:0,y:7,size:1}];old.islands[0].stock.copper=71;old.islands[0].tech=['mining'];old.ships=[{owner:0,from:0,to:1,good:'wood',cargo:13,cargoGood:'wood',back:false,progress:7}];let s=migrate(old);assert.equal(s.ships[0].load.wood,13);assert.equal(s.islands[0].stock.copper,71);assert.equal(terrain(2,2,0,s.islands[0]),'grass');assert.equal(terrain(0,7,0,s.islands[0]),'coast');let copy=structuredClone(s);assert.deepEqual(migrate(s),copy);});
test('City consumes only available goods, does not generate passive gold and orders reset',()=>{let s=setup(),a=s.islands[0];s.tick=29;a.stock.food=2;a.stock.clothes=1;tick(s);assert.equal(a.stock.food,0);assert.equal(a.stock.clothes,0);assert.equal(a.money,400);a.stock.food=30;a.stock.clothes=10;act(s,s.players[0],{type:'deliverOrder'});assert.equal(a.money,520);assert.deepEqual(a.order.goods,{clothes:6});a.order.remaining=1;tick(s);assert.equal(a.order.remaining,600);});
test('Test trader buys copper and pays sales with bounded inventory',()=>{let s=setup(),a=s.islands[0];assert.throws(()=>act(s,s.players[0],{type:'trader',good:'copper',amount:5,buy:true}));s.mode='test';let quote=price(s.trader,'copper',true),cash=a.money;act(s,s.players[0],{type:'trader',good:'copper',amount:5,buy:true});assert.equal(a.stock.copper,5);assert.equal(a.money,cash-quote*5);act(s,s.players[0],{type:'trader',good:'copper',amount:5,buy:false});assert.equal(a.stock.copper,0);assert.throws(()=>act(s,s.players[0],{type:'trader',good:'copper',amount:-5,buy:true}));});
test('Full destination returns unsold cargo, full home retains cargo without loss',()=>{let s=setup(),sh=ship(s),a=s.islands[0],b=s.islands[1];b.market=true;b.stock.wood=capacity(b);sh.load.wood=20;sh.stage='dock';sh.progress=3;sh.buyAmount=0;shipTick(s,sh);assert.equal(sh.load.wood,20);assert.equal(sh.stage,'return');a.stock.wood=capacity(a);sh.stage='home';shipTick(s,sh);assert.equal(sh.load.wood,20);assert.match(sh.status,/Depo dolu/);a.stock.wood-=7;shipTick(s,sh);assert.equal(sh.load.wood,13);assert.equal(a.stock.wood,capacity(a));});
test('Two-way trading conserves money and goods, respecting capacity',()=>{let s=setup(),sh=ship(s),a=s.islands[0],b=s.islands[1];b.market=true;b.stock.copper=40;sh.stage='dock';sh.progress=3;sh.load.wood=20;sh.buyAmount=10;let money=a.money+b.money,wood=a.stock.wood+b.stock.wood+20,copper=a.stock.copper+b.stock.copper;shipTick(s,sh);assert.equal(a.money+b.money,money);assert.equal(a.stock.wood+b.stock.wood+sh.load.wood,wood);assert.equal(a.stock.copper+b.stock.copper+sh.load.copper,copper);assert.equal(sh.load.copper,10);assert.ok(loadCount(sh)<=20);});
test('Trade consent and price limits prevent unwanted transactions',()=>{let s=setup(),sh=ship(s),a=s.islands[0],b=s.islands[1];sh.enabled=true;shipTick(s,sh);assert.equal(sh.stage,'home');b.market=true;sh.stage='dock';sh.progress=3;sh.load.wood=10;sh.minSell=999;sh.maxBuy=0;let cash=a.money;shipTick(s,sh);assert.equal(sh.load.wood,10);assert.equal(a.money,cash);});
test('Accepted barter reserves both goods and waits for warehouse space',()=>{let s=setup(),sh=ship(s),a=s.islands[0],b=s.islands[1];a.stock.wood=50;b.stock.copper=20;act(s,s.players[0],{type:'offer',to:1,give:'wood',giveN:10,receive:'copper',receiveN:8});let id=s.contracts[0].id;act(s,s.players[1],{type:'reply',id,accept:true});assert.equal(b.stock.copper,12);assert.equal(a.stock.wood,40);b.stock.wood=500;sh.stage='dock';sh.progress=3;shipTick(s,sh);assert.equal(sh.stage,'dock');assert.equal(sh.load.wood,10);assert.equal(s.contracts[0].escrow,8);b.stock.wood=490;sh.progress=3;shipTick(s,sh);assert.equal(b.stock.wood,500);assert.equal(sh.load.copper,8);sh.stage='home';shipTick(s,sh);assert.equal(a.stock.copper,8);assert.equal(s.contracts[0].status,'done');});
test('Move validates area and is free, demolition refunds without spilling',()=>{let s=setup(),a=s.islands[0],spots=[];for(let y=1;y<34;y++)for(let x=1;x<34;x++)try{validBuild(a,'oduncu',x,y,0);spots.push({x,y})}catch{}let [u,v]=spots;act(s,s.players[0],{type:'build',kind:'oduncu',...u});let before=a.stock.wood;act(s,s.players[0],{type:'move',fromX:u.x,fromY:u.y,...v});assert.equal(a.stock.wood,before);assert.deepEqual([a.plots[0].x,a.plots[0].y],[v.x,v.y]);a.stock.wood=500;assert.throws(()=>act(s,s.players[0],{type:'demolish',fromX:v.x,fromY:v.y}));assert.equal(a.plots.length,1);a.stock.wood=100;act(s,s.players[0],{type:'demolish',fromX:v.x,fromY:v.y});assert.equal(a.stock.wood,105);assert.equal(a.plots.length,0);});

test('Barter can be accepted without a ship and resumes from the saved queue',()=>{
  let world=setup();
  const [sender,receiver]=world.players;
  const [origin,destination]=world.islands;
  port(origin);
  port(destination);
  destination.stock.copper=15;
  act(world,sender,{type:'offer',to:1,give:'wood',giveN:10,receive:'copper',receiveN:5});
  const contract=world.contracts[0];
  act(world,receiver,{type:'reply',id:contract.id,accept:true});
  assert.equal(contract.status,'queued');
  assert.equal(origin.stock.wood,50);
  assert.equal(destination.stock.copper,10);
  assert.throws(()=>act(world,receiver,{type:'reply',id:contract.id,accept:true}));
  assert.throws(()=>act(world,sender,{type:'demolish',fromX:0,fromY:17}),/bekleyen takas/);
  world=migrate(structuredClone(world));
  act(world,sender,{type:'ship',x:0,y:17});
  tick(world);
  assert.equal(world.ships[0].load.wood,10);
  assert.equal(world.contracts[0].status,'shipping');
  assert.equal(world.islands[0].stock.wood,20);
});

test('A busy ship serves accepted barters in acceptance order and then resumes its route',()=>{
  const world=setup(),boat=ship(world);
  const [sender,receiver]=world.players;
  world.islands[1].stock.copper=30;
  const offer={type:'offer',to:1,give:'wood',giveN:10,receive:'copper',receiveN:5};
  act(world,sender,offer);
  act(world,sender,offer);
  const [first,second]=world.contracts;
  Object.assign(boat,{to:2,enabled:true,stage:'return',progress:29});
  act(world,receiver,{type:'reply',id:second.id,accept:true});
  act(world,receiver,{type:'reply',id:first.id,accept:true});
  assert.equal(first.status,'queued');
  assert.equal(second.status,'queued');
  for(let i=0;i<2;i++)shipTick(world,boat);
  assert.equal(boat.contract,second.id);
  for(let i=0;i<65;i++)shipTick(world,boat);
  assert.equal(second.status,'done');
  assert.equal(boat.contract,first.id);
  for(let i=0;i<65;i++)shipTick(world,boat);
  assert.equal(first.status,'done');
  assert.equal(boat.to,2);
  assert.equal(boat.enabled,true);
  assert.equal(world.islands[0].stock.copper,10);
});

test('Player progression grants gold once at each level and persists per player',()=>{
  const world=setup();
  const [a,b]=world.islands;
  const [player]=world.players;
  const nextOrders=(count)=>{
    for(let i=0;i<count;i++){
      for(const [good,n] of Object.entries(a.order.goods))a.stock[good]=n;
      const orderGold=a.order.reward;
      const gold=a.money;
      const previous=a.playerProgress.goldEarned;
      act(world,player,{type:'deliverOrder'});
      assert.equal(a.money-gold,orderGold+a.playerProgress.goldEarned-previous);
    }
  };
  nextOrders(3);
  assert.deepEqual(a.playerProgress,{level:2,xp:5,goldEarned:100});
  nextOrders(5);
  assert.deepEqual(a.playerProgress,{level:3,xp:30,goldEarned:250});
  assert.deepEqual(b.playerProgress,{level:1,xp:0,goldEarned:0});
  const saved=migrate(structuredClone(world));
  assert.deepEqual(saved.islands[0].playerProgress,a.playerProgress);
  assert.equal(saved.islands[0].money,a.money);
});

test('Kept research gives experience once at completion, not when started',()=>{
  const world=setup();
  const [a]=world.islands;
  const [player]=world.players;
  act(world,player,{type:'research',id:'hauling'});
  assert.equal(a.playerProgress.xp,0);
  a.research.remaining=1;
  tick(world);
  tick(world);
  assert.equal(a.playerProgress.xp,40);
});

test('University requires the city tier and only awards points on its saved minute schedule',()=>{
  let world=setup();
  const [player]=world.players;
  const island=world.islands[0];
  const upgrade={type:'universityUpgrade',level:1};
  assert.throws(()=>act(world,player,upgrade),/Kasaba/);
  island.cityLevel=1;
  island.stock.clothes=10;
  act(world,player,upgrade);
  assert.equal(island.universityLevel,1);
  assert.equal(island.rp,0);
  assert.equal(island.universityNextTick,60);
  world.tick=58;
  world=migrate(structuredClone(world));
  tick(world);
  assert.equal(world.islands[0].rp,0);
  tick(world);
  assert.equal(world.islands[0].rp,3);
  tick(world);
  assert.equal(world.islands[0].rp,3);
});

test('Advanced technologies enforce university tier before charging research points',()=>{
  const world=setup();
  const [player]=world.players;
  const island=world.islands[0];
  island.tech=['distribution','industry','machinery'];
  island.rp=100;
  Object.assign(island.stock,{machines:50,steel:100,copper:100});
  island.universityLevel=1;
  const research={type:'research',id:'combustion'};
  assert.throws(()=>act(world,player,research),/Üniversite seviye 2/);
  assert.equal(island.rp,100);
  island.universityLevel=2;
  assert.throws(()=>act(world,player,research),/Şehir seviyesi 3/);
  assert.equal(island.rp,100);
  island.cityLevel=2;
  act(world,player,research);
  assert.equal(island.research.id,'combustion');
  assert.equal(island.rp,40);
});
