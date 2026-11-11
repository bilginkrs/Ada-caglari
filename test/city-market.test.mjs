import test from 'node:test';
import assert from 'node:assert/strict';
import {migrate,act,tick,cityTier,shipTick,capacity,transportStats,technologies,productionSources} from '../src/logic.mjs';

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
  act(world,players[1],{type:'setListing',good:'wood',quantity:10,gold:5});
  const {id}=seller.listings.wood;
  const cash=buyer.money,sellerCash=seller.money,wood=seller.stock.wood;
  act(world,players[0],{type:'buyListing',target:1,id});
  assert.equal(buyer.money,cash-5);
  assert.equal(seller.money,sellerCash);
  assert.equal(seller.stock.wood,wood-10);
  assert.throws(()=>act(world,players[0],{type:'buyListing',target:1,id}));
  world=migrate(structuredClone(world));
  ({0:buyer,1:seller}=world.islands);
  ship=world.ships[0];
  for(let i=0;i<31;i++)shipTick(world,ship);
  assert.equal(ship.load.wood,10);
  assert.equal(seller.money,sellerCash+5);
  buyer.stock.wood=capacity(buyer);
  for(let i=0;i<40;i++)shipTick(world,ship);
  assert.equal(ship.load.wood,10);
  buyer.stock.wood-=10;
  shipTick(world,ship);
  assert.equal(buyer.stock.wood,capacity(buyer));
  assert.equal(ship.load.wood,0);
  assert.equal(seller.money,sellerCash+5);
});

test('Motor logistics requires late research and its engine has a multi-input recipe',()=>{
  assert.equal(transportStats({tech:['wagons']}).mode,'wagon');
  assert.equal(transportStats({tech:['motorTransport']}).capacity,100);
  assert.ok(technologies.motorTransport.requires.includes('combustion'));
  assert.ok(technologies.combustion.requires.includes('industry'));
  assert.equal(productionSources('engines')[0].inputs.steel,3);
});
