import {migrate,act,tick,publicState} from './logic.mjs';
import {HTML,LOGIC} from './assets.mjs';
const validRoom=room=>typeof room==='string'&&/^[a-zA-Z0-9-]{6,64}$/.test(room);
export default {async fetch(req,env){const u=new URL(req.url);if(u.pathname==='/api'||u.pathname==='/lobby-api'){const room=u.searchParams.get('room');if(!validRoom(room))return new Response('Geçersiz oda',{status:400});return env.WORLD.get(env.WORLD.idFromName(u.pathname==='/lobby-api'?'lobby:'+room:u.searchParams.get('mode')==='test'?'solo-test:'+room:room)).fetch(req)}const assets={'/':HTML,'/logic.js':LOGIC};if(!(u.pathname in assets))return new Response('Not found',{status:404});return new Response(assets[u.pathname],{headers:{'content-type':u.pathname==='/'?'text/html;charset=utf-8':'text/javascript;charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}};
export class World{
 constructor(ctx){this.ctx=ctx;this.sockets=new Map;this.lobbySockets=new Map;this.tail=Promise.resolve();ctx.blockConcurrencyWhile(async()=>{let old=await ctx.storage.get('world');if(old&&old.version!==6&&!await ctx.storage.get('backup-before-v06'))await ctx.storage.put('backup-before-v06',old);if(old&&!old.mechanicsVersion&&!await ctx.storage.get('backup-before-mechanics11'))await ctx.storage.put('backup-before-mechanics11',old);if(old&&old.islands?.some(a=>a.economyVersion!==2)&&!await ctx.storage.get('backup-before-warehouse12'))await ctx.storage.put('backup-before-warehouse12',old);this.lobby=await ctx.storage.get('lobby')||{members:[],games:[]};this.s=migrate(old);this.initialized=!!old;});}
 queue(fn){const p=this.tail.then(fn);this.tail=p.catch(()=>{});return p;}
 active(){return this.s.players.length===(this.s.mode==='test'?1:2)&&this.s.players.every(p=>[...this.sockets.values()].some(v=>v.token===p.token&&v.present!==false&&Date.now()-v.last<22000));}
 send(){for(const [ws,p] of this.sockets)try{ws.send(JSON.stringify(publicState(this.s,p,this.active())))}catch{this.sockets.delete(ws)}}
 async fetch(req){if(req.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});if(new URL(req.url).pathname==='/lobby-api')return this.fetchLobby();const mode=new URL(req.url).searchParams.get('mode')==='test'?'test':'coop';if(this.initialized&&this.s.mode&&this.s.mode!==mode)return new Response('Oda modu uyuşmuyor',{status:409});this.s.mode=mode;this.initialized=true;const pair=new WebSocketPair,ws=pair[1];ws.accept();ws.addEventListener('message',e=>{
 const peer=this.sockets.get(ws);
 if(peer&&e.data==='{"type":"ping"}'){peer.last=Date.now();return;}
 this.queue(async()=>{try{if(typeof e.data!=='string'||e.data.length>8192)throw Error('Geçersiz mesaj');const m=JSON.parse(e.data);if(m.type==='join'){if(!/^[a-f0-9-]{36}$/.test(m.token))throw Error('Geçersiz kimlik');let p=this.s.players.find(p=>p.token===m.token);if(!p){if(this.s.players.length>=(this.s.mode==='test'?1:2))throw Error('Oda dolu');p={token:m.token,name:String(m.name||'Oyuncu').trim().slice(0,24)||'Oyuncu',island:this.s.players.length};this.s.players.push(p);this.s.islands[p.island].owner=p.name;this.s.islands[p.island].ownerId=p.island;this.s.islands[p.island].controller=p.island;}for(let [other,v] of this.sockets)if(v.token===p.token&&other!==ws){this.sockets.delete(other);other.close(1000,'Başka sekmede açıldı');}this.sockets.set(ws,{...p,present:true,last:Date.now()});await this.ctx.storage.put('world',this.s);await this.ctx.storage.setAlarm(Date.now()+1000);}
 else{let p=this.sockets.get(ws);if(!p)throw Error('Önce katılın');if(m.type==='ping'){p.last=Date.now();return;}if(m.type==='presence'){p.present=m.visible===true;p.last=Date.now();this.send();return;}if(m.type==='save'){this.s.savedAt=Date.now();await this.ctx.storage.put('savedCheckpoint',this.s);await this.ctx.storage.put('world',this.s);ws.send(JSON.stringify({ack:'save',savedAt:this.s.savedAt}));this.send();return;}if(!this.active()&&m.type!=='configureAI')throw Error('Dünya duraklatıldı; tüm oyuncular bağlı olmalı');const next=structuredClone(this.s);act(next,p,m);await this.ctx.storage.put('world',next);this.s=next;ws.send(JSON.stringify({ack:m.type}));}this.send();}catch(err){try{ws.send(JSON.stringify({error:err.message}))}catch{}}});});const close=()=>{this.sockets.delete(ws);this.send()};ws.addEventListener('close',close);ws.addEventListener('error',close);return new Response(null,{status:101,webSocket:pair[0]});}
 lobbySend(message){
   for(const [socket] of this.lobbySockets)try{socket.send(JSON.stringify(message));}catch{this.lobbySockets.delete(socket);}
 }
 lobbyState(){
   for(const [socket,peer] of this.lobbySockets){
     const proposal=this.lobbyProposal;
     try{socket.send(JSON.stringify({lobby:true,players:[...this.lobbySockets.values()].map(({name})=>name),
       games:this.lobby.games,proposal:proposal&&{id:proposal.id,room:proposal.room,name:proposal.name,
         own:proposal.token===peer.token}}));}catch{this.lobbySockets.delete(socket);}
   }
 }
 fetchLobby(){
   const pair=new WebSocketPair();
   const socket=pair[1];
   socket.accept();
   socket.addEventListener('message',event=>{
     const peer=this.lobbySockets.get(socket);
     if(peer&&event.data==='{"type":"ping"}'){peer.last=Date.now();return;}
     this.queue(async()=>{
       try{
         if(typeof event.data!=='string'||event.data.length>8192)throw Error('Geçersiz mesaj');
         const message=JSON.parse(event.data);
         if(message.type==='join'){
           if(!/^[a-f0-9-]{36}$/.test(message.token))throw Error('Geçersiz kimlik');
           if(this.lobbySockets.has(socket))throw Error('Bu bağlantı zaten lobide');
           const token=message.token;
           if(!this.lobby.members.includes(token)){
             if(this.lobby.members.length>=2)throw Error('Bu lobi iki oyuncuya ayrılmış');
             const next={...this.lobby,members:[...this.lobby.members,token]};
             await this.ctx.storage.put('lobby',next);
             this.lobby=next;
           }
           for(const [other,member] of this.lobbySockets)if(member.token===token){
             this.lobbySockets.delete(other);
             other.close(1000,'Başka sekmede açıldı');
           }
           this.lobbySockets.set(socket,{token,name:String(message.name||'Oyuncu').trim().slice(0,24)||'Oyuncu',last:Date.now()});
           await this.ctx.storage.setAlarm(Date.now()+1000);
         }else{
           if(!peer)throw Error('Önce lobiye katıl');
           if(this.lobbySockets.size!==2||[...this.lobbySockets.values()].some(member=>Date.now()-member.last>=12000))
             throw Error('İki oyuncu da lobide olmalı');
           if(message.type==='propose'){
             if(this.lobbyProposal)throw Error('Önce mevcut seçimi sonuçlandır');
             const room=message.room;
             if(room!==null&&!validRoom(room))throw Error('Geçersiz kayıt kodu');
             this.lobbyProposal={id:crypto.randomUUID(),token:peer.token,name:peer.name,room};
           }else if(message.type==='approve'||message.type==='reject'){
             const proposal=this.lobbyProposal;
             if(!proposal||proposal.id!==message.id)throw Error('Lobideki seçim değişti');
             if(message.type==='approve'){
               if(proposal.token===peer.token)throw Error('Diğer oyuncunun onayı gerekli');
               const room=proposal.room||crypto.randomUUID();
               const next={...this.lobby,games:[{room,at:Date.now()},
                 ...this.lobby.games.filter(game=>game.room!==room)].slice(0,30)};
               await this.ctx.storage.put('lobby',next);
               this.lobby=next;
               this.lobbyProposal=null;
               this.lobbySend({startRoom:room});
               return;
             }
             this.lobbyProposal=null;
           }else throw Error('Geçersiz lobi işlemi');
         }
         this.lobbyState();
       }catch(error){try{socket.send(JSON.stringify({error:error.message}));}catch{}}
     });
   });
   const close=()=>{
     if(!this.lobbySockets.delete(socket))return;
     this.lobbyProposal=null;
     this.lobbyState();
   };
   socket.addEventListener('close',close);
   socket.addEventListener('error',close);
   return new Response(null,{status:101,webSocket:pair[0]});
 }

 async alarm(){
   const started=Date.now();
   await this.queue(async()=>{
     for(const [ws,peer] of this.sockets){
       if(Date.now()-peer.last<=45000)continue;
       this.sockets.delete(ws);
       try{ws.close(1000,'Bağlantı zaman aşımı')}catch{}
     }
     for(const [socket,peer] of this.lobbySockets){
       if(Date.now()-peer.last>20000)try{socket.close(1000,'Bağlantı zaman aşımı');}catch{}
     }
     const running=this.active();
     if(running){
       const next=structuredClone(this.s);
       tick(next);
       await this.ctx.storage.put('world',next);
       this.s=next;
     }
     if(running||running!==this.lastAlarmRunning)this.send();
     this.lastAlarmRunning=running;
     if(this.sockets.size||this.lobbySockets.size)await this.ctx.storage.setAlarm(Math.max(started+1000,Date.now()+50));
   });
 }
}
