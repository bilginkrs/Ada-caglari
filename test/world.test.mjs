import test from 'node:test';import assert from 'node:assert/strict';import {World} from '../src/worker.mjs';
function context(seed){let data=new Map(seed?[['world',seed]]:[]);return {data,blockConcurrencyWhile(f){this.ready=f()},storage:{async get(k){return structuredClone(data.get(k))},async put(k,v){data.set(k,structuredClone(v))},async setAlarm(){}}}}
test('Cooperative clock requires both players; solo clock requires only one; offline time is excluded',async()=>{let ctx=context(),w=new World(ctx);await ctx.ready;w.s.mode='coop';w.s.players=[{island:0,token:'a'},{island:1,token:'b'}];let ws={send(){}};w.sockets.set(ws,{island:0,token:'a',last:Date.now()});await w.alarm();assert.equal(w.s.tick,0);let ws2={send(){}};w.sockets.set(ws2,{island:1,token:'b',last:Date.now()});await w.alarm();assert.equal(w.s.tick,1);w.sockets.get(ws2).present=false;await w.alarm();assert.equal(w.s.tick,1);w.sockets.delete(ws2);await w.alarm();assert.equal(w.s.tick,1);w.s.mode='test';w.s.players.pop();await w.alarm();assert.equal(w.s.tick,2);w.sockets.get(ws).last=Date.now()-23000;await w.alarm();assert.equal(w.s.tick,2);});
test('Migration saves untouched pre-update world once',async()=>{let old={tick:9,players:[],ships:[],islands:[]},ctx=context(old),w=new World(ctx);await ctx.ready;assert.deepEqual(ctx.data.get('backup-before-v06'),old);assert.equal(w.s.version,6);});

test('Shared lobby waits for another player, then starts or reopens the same approved world',async()=>{
  class Socket extends EventTarget{
    messages=[];
    accept(){}
    send(data){this.peer.messages.push(JSON.parse(data))}
    receive(data){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(data)}))}
    close(){this.dispatchEvent(new Event('close'))}
  }
  const nativeResponse=globalThis.Response;
  const originalPair=globalThis.WebSocketPair;
  globalThis.Response=class {constructor(_,options){Object.assign(this,options)}};
  globalThis.WebSocketPair=class {
    constructor(){const client=new Socket(),server=new Socket();client.peer=server;server.peer=client;return [client,server];}
  };
  try{
    const ctx=context(),world=new World(ctx);
    await ctx.ready;
    const req=new Request('https://example.test/lobby-api?room=test-lobby',{headers:{Upgrade:'websocket'}});
    async function open(name,token){
      const {webSocket}=await world.fetch(req);
      webSocket.peer.receive({type:'join',name,token});
      await world.tail;
      return webSocket;
    }
    const a=await open('A','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    const send=async(socket,type,options)=>{socket.peer.receive({type,...options});await world.tail;};
    await send(a,'propose',{room:null});
    assert.match(a.messages.at(-1).error,/İki oyuncu/);
    const b=await open('B','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
    assert.deepEqual(a.messages.at(-1).players,['A','B']);
    await send(a,'propose',{room:null});
    const first=a.messages.at(-1).proposal.id;
    await send(a,'approve',{id:first});
    assert.match(a.messages.at(-1).error,/Diğer oyuncunun/);
    await send(b,'approve',{id:first});
    const room=a.messages.at(-1).startRoom;
    assert.equal(room,b.messages.at(-1).startRoom);
    assert.equal(ctx.data.get('lobby').games[0].room,room);
    await send(b,'propose',{room});
    await send(a,'approve',{id:b.messages.at(-1).proposal.id});
    assert.equal(a.messages.at(-1).startRoom,room);
    assert.equal(ctx.data.get('lobby').games.length,1);
    assert.equal(world.s.tick,0);
  }finally{
    globalThis.Response=nativeResponse;
    globalThis.WebSocketPair=originalPair;
  }
});
