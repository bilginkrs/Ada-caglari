import test from 'node:test';import assert from 'node:assert/strict';import {migrate,tick,act} from '../src/logic.mjs';
test('Two AI islands own working settlements and expand during play',()=>{let s=migrate(),ai=s.islands.filter(a=>a.ai);assert.equal(ai.length,2);let before=ai.map(a=>a.plots.length);for(let i=0;i<100;i++)tick(s);assert.ok(ai.every((a,i)=>a.plots.length>before[i]));assert.ok(ai.every(a=>a.market));});
test('Input production reserves goods and waits for physical delivery',()=>{let s=migrate(),a=s.islands[0];a.owner='QA';a.controller=0;a.stock.wool=12;a.plots=[{kind:'koyun',x:7,y:8,size:2,level:1,phase:0},{kind:'iplik',x:17,y:17,size:1,level:1,phase:0}];tick(s);assert.equal(a.stock.yarn,0);assert.equal(a.stock.wool,12);assert.equal(a.deliveries[0].good,'wool');assert.equal(a.deliveries[0].stage,'empty');assert.equal(a.plots[1].inventory.wool||0,0);for(let k=0;k<350;k++)tick(s);assert.ok(a.stock.yarn>0);});
test('Relocating a building is free even with no construction resources',()=>{let s=migrate(),a=s.islands[0];a.owner='QA';a.controller=0;a.plots=[{kind:'oduncu',x:10,y:10,size:1}];a.stock.wood=0;a.stock.stone=0;act(s,{island:0},{type:'move',fromX:10,fromY:10,x:11,y:10});assert.equal(a.stock.wood,0);assert.equal(a.stock.stone,0);assert.equal(a.plots[0].x,11);});

test('AI starters include a local mine and put the tool workshop on the iron island',()=>{
  const world=migrate();
  for(const island of world.islands.filter(a=>a.ai)){
    const buildings=new Set(island.plots.map(b=>b.kind));
    for(const kind of ['liman','oduncu','tas','balik','koyun','iplik','terzi'])assert.ok(buildings.has(kind));
    assert.ok(buildings.has(island.resource==='iron'?'demir':'bakir'));
    assert.equal(buildings.has('demirci'),island.resource==='iron');
  }
  assert.deepEqual(migrate(structuredClone(world)),world);
});

test('A partially loaded carrier collects another matching lot within eight tiles',()=>{
  const world=migrate();
  const island=world.islands[0];
  island.owner='QA';
  island.controller=0;
  island.plots=[
    {kind:'koyun',id:'farm1',x:20,y:25,size:2,phase:0,output:{wool:10}},
    {kind:'koyun',id:'farm2',x:24,y:25,size:2,phase:0,output:{wool:3}},
    {kind:'koyun',id:'farm3',x:9,y:15,size:2,phase:0,output:{wool:3}}
  ];
  let pickup=false,loaded=0;
  for(let i=0;i<80;i++){
    tick(world);
    const delivery=island.deliveries.find(job=>job.extraPickup);
    if(delivery){
      assert.equal(delivery.from,'farm2');
      pickup=true;
      loaded=Math.max(loaded,delivery.amount);
    }
    if(island.stock.wool>0)break;
  }
  assert.ok(pickup);
  assert.ok(loaded>10&&loaded<=20);
  assert.equal(island.stock.wool,loaded);
});

test('A full depot parks cargo without parking the carrier, then transfers it when space clears',()=>{
  const world=migrate();
  const island=world.islands[0];
  island.owner='QA';
  island.controller=0;
  island.stock.wood=500;
  const {x,y}=island.depot;
  island.deliveries.push({from:'removed-producer',to:'depot',good:'wood',amount:15,horseId:'h1',
    stage:'loaded',x,y,path:[[x,y]],progress:0});
  tick(world);
  assert.equal(island.depot.waiting.wood,15);
  assert.equal(island.deliveries[0].stage,'return');
  tick(world);
  assert.equal(island.deliveries.length,0);
  island.stock.wood-=15;
  tick(world);
  assert.equal(island.stock.wood,500);
  assert.equal(island.depot.waiting.wood,undefined);
});
