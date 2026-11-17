import test from 'node:test';
import assert from 'node:assert/strict';
import {migrate,act,tick,cityTier,cityTiers,recipes,buildingCost,cityOrderGoods,shipTick,capacity,transportStats,technologies,productionSources} from '../src/logic.mjs';

function setup(){
  const world=migrate();
  const players=[{name:'Alıcı',island:0},{name:'Satıcı',island:1}];
  world.players=players;
  for(const p of players){
    const island=world.islands[p.island];
    island.owner=p.name;
    island.controller=p.island;
    island.plots.push({kind:'liman',x:0,y:17});
  }
  act(world,players[0],{type:'ship',x:0,y:17});
  return {world,buyer:world.islands[0],seller:world.islands[1],players,ship:world.ships[0]};
}

test('A stale or unaffordable city upgrade cannot consume materials; the new tier increases demand',()=>{
  const {world,buyer,players}=setup();
  const upgrade={type:'cityUpgrade',level:1};
  const old={...buyer.stock};
  assert.throws(()=>act(world,players[0],upgrade));
  assert.deepEqual(buyer.stock,old);
  Object.assign(buyer.stock,{wood:60,stone:60,food:40,clothes:12});
  act(world,players[0],upgrade);
  assert.equal(cityTier(buyer).population,120);
  assert.equal(buyer.stock.clothes,4);
  assert.throws(()=>act(world,players[0],upgrade));
  world.tick=29;
  tick(world);
  assert.equal(buyer.citySupply.food,9);
  assert.equal(buyer.citySupply.clothes,2);
});

test('Port purchase reserves the advertised lot and total gold, survives a reload, and settles only once',()=>{
  let {world,buyer,seller,players,ship}=setup();
  const wood=seller.stock.wood;
  act(world,players[1],{type:'setListing',good:'wood',quantity:10,gold:5});
  assert.equal(seller.stock.wood,wood-10);
  const {id}=seller.listings.wood;
  const cash=buyer.money,sellerCash=seller.money;
  act(world,players[0],{type:'buyListing',target:1,id});
  assert.equal(buyer.money,cash-5);
  assert.equal(seller.money,sellerCash);
  assert.equal(seller.stock.wood,wood-10);
  assert.throws(()=>act(world,players[0],{type:'buyListing',target:1,id}));
  world=migrate(structuredClone(world));
  ({0:buyer,1:seller}=world.islands);
  ship=world.ships[0];
  for(let i=0;i<31;i++)shipTick(world,ship);
  assert.equal(ship.stage,'dock');
  assert.equal(ship.portOrder.delivered,false);
  assert.equal(seller.money,sellerCash);
  shipTick(world,ship);
  assert.equal(ship.load.wood,10);
  assert.equal(seller.money,sellerCash+5);
  buyer.stock.wood=capacity(buyer);
  for(let i=0;i<40;i++)shipTick(world,ship);
  assert.equal(ship.load.wood,10);
  buyer.stock.wood-=10;
  shipTick(world,ship);
  assert.equal(buyer.stock.wood,capacity(buyer));
  assert.equal(ship.load.wood,0);
  assert.equal(ship.portOrder.delivered,true);
  assert.equal(seller.money,sellerCash+5);
});

test('Motor logistics requires late research and its engine has a multi-input recipe',()=>{
  assert.equal(transportStats({tech:['wagons']}).mode,'wagon');
  assert.equal(transportStats({tech:['motorTransport']}).capacity,100);
  assert.ok(technologies.motorTransport.requires.includes('combustion'));
  assert.ok(technologies.combustion.requires.includes('industry'));
  assert.equal(productionSources('engines')[0].inputs.steel,3);
});

test('Each five-minute shortage loses population, can shrink the city, and ends when all needs are met',()=>{
  const {world,buyer}=setup();
  buyer.cityLevel=1;
  buyer.cityPopulation=120;
  const funded=buyer.money;
  function advanceTo(target, supply) {
    while(world.tick<target){
      if((world.tick+1)%30===0)Object.assign(buyer.stock,supply);
      tick(world);
    }
  }
  const shortage={food:9,wood:3,stone:2,clothes:2,tools:0};
  advanceTo(30,shortage);
  assert.equal(buyer.cityShortageUntil,330);
  assert.equal(buyer.citySupply.wood,3);
  assert.equal(buyer.citySupply.stone,2);
  assert.equal(buyer.stock.wood,0);
  assert.equal(buyer.stock.stone,0);
  advanceTo(329,shortage);
  assert.equal(buyer.cityPopulation,120);
  advanceTo(330,shortage);
  assert.equal(buyer.cityPopulation,108);
  assert.equal(buyer.cityShortageUntil,630);
  advanceTo(930,shortage);
  assert.equal(buyer.cityLevel,0);
  assert.equal(buyer.cityPopulation,50);
  advanceTo(960,{...shortage,tools:1});
  assert.equal(buyer.cityShortageUntil,null);
  assert.equal(buyer.money,funded);
});

test('Updating a listing retains its reserved stock and cancelling returns the lot',()=>{
  let {world,seller,players}=setup();
  const wood=seller.stock.wood;
  const listing={type:'setListing',good:'wood',quantity:10,gold:5};
  act(world,players[1],listing);
  assert.equal(seller.stock.wood,wood-10);
  act(world,players[1],{...listing,quantity:15});
  assert.equal(seller.stock.wood,wood-15);
  assert.throws(()=>act(world,players[1],{...listing,quantity:41}));
  assert.equal(seller.listings.wood.quantity,15);
  world=migrate(structuredClone(world));
  seller=world.islands[1];
  act(world,players[1],{type:'removeListing',good:'wood'});
  assert.equal(seller.stock.wood,wood);
  assert.equal(seller.listings.wood,undefined);
});

test('A buy request escrows gold, survives reload, and pays the seller only on delivery',()=>{
  let {world,buyer,seller,players}=setup();
  const sellerPort=seller.plots.find(plot=>plot.kind==='liman');
  act(world,players[1],{type:'ship',x:sellerPort.x,y:sellerPort.y});
  const buyerGold=buyer.money,sellerGold=seller.money;
  act(world,players[0],{type:'setBuyListing',good:'wood',quantity:10,gold:45});
  assert.equal(buyer.money,buyerGold-45);
  act(world,players[0],{type:'setBuyListing',good:'wood',quantity:10,gold:50});
  assert.equal(buyer.money,buyerGold-50);
  act(world,players[0],{type:'removeBuyListing',good:'wood'});
  assert.equal(buyer.money,buyerGold);
  act(world,players[0],{type:'setBuyListing',good:'wood',quantity:10,gold:45});
  const fill={type:'fillBuyListing',target:0,id:buyer.buyListings.wood.id};
  act(world,players[1],fill);
  assert.throws(()=>act(world,players[1],fill),/değişti veya karşılandı/);
  world=migrate(structuredClone(world));
  const ship=world.ships[1];
  [buyer,seller]=world.islands;
  for(let step=0;step<30;step++)shipTick(world,ship);
  assert.equal(seller.money,sellerGold);
  assert.equal(ship.stage,'dock');
  buyer.stock.wood=capacity(buyer);
  shipTick(world,ship);
  assert.equal(ship.load.wood,10);
  assert.equal(seller.money,sellerGold);
  buyer.stock.wood-=10;
  shipTick(world,ship);
  assert.equal(ship.load.wood,0);
  assert.equal(seller.money,sellerGold+45);
  assert.equal(buyer.money,buyerGold-45);
  shipTick(world,ship);
  assert.equal(seller.money,sellerGold+45);
});

test('All ten city tiers can unlock the preceding technologies and goods without a dependency cycle',()=>{
  const traceTechnology=(id,visited)=>{
    if(visited.has(id))return false;
    const tech=technologies[id];
    if(!tech)return false;
    const next=new Set([...visited,id]);
    return tech.requires.every(key=>traceTechnology(key,next));
  };
  for(const id of Object.keys(technologies))assert.ok(traceTechnology(id,new Set()),id);
  const researched=new Set();
  const producible=new Set(['tin','silver','wood','stone']);
  for(let index=0;index<cityTiers.length;index++){
    for(let n=0;n<Object.keys(technologies).length;n++){
      for(const [id,tech] of Object.entries(technologies)){
        if(tech.cityLevel<=index&&tech.requires.every(id=>researched.has(id))&&
            Object.keys(tech.cost).every(good=>producible.has(good)))researched.add(id);
      }
      for(const [kind,recipe] of Object.entries(recipes)){
        if(recipe.out&&(!recipe.tech||researched.has(recipe.tech))&&
            Object.keys(buildingCost(kind)).every(good=>producible.has(good))&&
            Object.keys(recipe.inputs||(recipe.input?{[recipe.input]:1}:{})).every(good=>producible.has(good)))
          producible.add(recipe.out);
      }
    }
    for(const good of Object.keys(cityTiers[index+1]?.cost||{}))
      assert.ok(producible.has(good),cityTiers[index+1].name+' · '+good);
  }
  assert.equal(cityTiers.length,10);
  assert.equal(researched.size,80);
});

test('City orders scale per city tier and can only be switched once per three active minutes',()=>{
  const {world,buyer,players}=setup();
  buyer.cityLevel=2;
  assert.deepEqual(cityOrderGoods(buyer),{food:42,clothes:14});
  assert.throws(()=>act(world,players[0],{type:'refreshCityOrder'}));
  world.tick=180;
  act(world,players[0],{type:'refreshCityOrder'});
  assert.deepEqual(cityOrderGoods(buyer),{clothes:9});
  assert.equal(buyer.cityOrderRefreshAt,360);
  world.tick=359;
  assert.throws(()=>act(world,players[0],{type:'refreshCityOrder'}));
  world.tick=360;
  act(world,players[0],{type:'refreshCityOrder'});
  assert.deepEqual(cityOrderGoods(buyer),{wood:35,stone:21});
});

test('A reserved lot is bought by the system after exactly 180 ticks at no more than base value',()=>{
  let {world,seller,players}=setup();
  const gold=seller.money;
  act(world,players[1],{type:'setListing',good:'wood',quantity:10,gold:9999});
  for(let i=0;i<179;i++)tick(world);
  assert.equal(seller.money,gold);
  assert.ok(seller.listings.wood);
  world=migrate(structuredClone(world));
  seller=world.islands[1];
  tick(world);
  assert.equal(seller.money,gold+30);
  assert.equal(seller.listings.wood,undefined);
  tick(world);
  assert.equal(seller.money,gold+30);
  assert.ok(world.islands.filter(island=>island.ai).some(island=>Object.keys(island.listings).length));
});

test('Periodic player tasks only pay once and expire three minutes after acceptance',()=>{
  const {world,buyer,players}=setup();
  world.tick=299;
  tick(world);
  const task=buyer.playerTask;
  assert.ok(task);
  const gold=buyer.money;
  const complete={type:'completeTask',id:task.id};
  assert.throws(()=>act(world,players[0],complete));
  act(world,players[0],{type:'acceptTask',id:task.id});
  assert.equal(task.expiresAt,480);
  buyer.stock[task.good]=task.amount;
  act(world,players[0],complete);
  assert.equal(buyer.stock[task.good],0);
  assert.equal(buyer.money,gold+task.gold);
  assert.throws(()=>act(world,players[0],complete));
  world.tick=599;
  tick(world);
  const second=buyer.playerTask;
  act(world,players[0],{type:'acceptTask',id:second.id});
  world.tick=779;
  tick(world);
  assert.equal(buyer.playerTask,undefined);
});
