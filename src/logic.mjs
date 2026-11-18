export function land(x,y,i=0){if(x<0||y<0||x>35||y>35)return false;if(x>=25&&x<=33&&y>=25&&y<=33)return true;let dx=(x-17.5)/18,dy=(y-17.5)/18,angle=Math.atan2(dy,dx);return Math.hypot(dx,dy)<1+.07*Math.sin(angle*3+i)+.05*Math.cos(angle*5+i*2)}
export function fertility(i){return [100,115,80,130,90,120,75,110,95,125][i]||100}
const terrainCache=new Map();
export function terrain(x,y,i=0,a=null){
  const override=a?.terrainOverrides?.[x+','+y];
  if(override)return override;
  if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=36||y>=36)return baseTerrain(x,y,i);
  let cells=terrainCache.get(i);
  if(!cells){cells=new Array(1296);terrainCache.set(i,cells);}
  return cells[y*36+x] ??= baseTerrain(x,y,i);
}
function baseTerrain(x,y,i){if(!land(x,y,i))return 'sea';if([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>!land(x+dx,y+dy,i)))return 'coast';if(x>=27&&y>=27&&x<=32&&y<=32)return 'city';let lx=18+(i%3)*3,ly=8+(i%2)*3;if((x-lx)**2/12+(y-ly)**2/6<1)return 'lake';let mx=22-(i%3)*2,my=17+(i%2)*3;if(x>=mx&&x<=mx+5&&y>=my&&y<=my+4)return 'mountain';let fx=5+(i%4)*2,fy=13+(i%3)*3;if(x>=fx&&x<=fx+4&&y>=fy&&y<=fy+5)return 'forest';let rx=14+(i%3),ry=24-(i%2)*2;if(x>=rx&&x<=rx+3&&y>=ry&&y<=ry+2)return 'rock';return 'grass'}
export function capacity(a){return 500+(a.storageLevel||0)*250;}
export function upgradeCost(level){return {wood:40*(level+1),stone:30*(level+1)};}
export const technologies={mining:{name:'Derin madencilik',cost:{wood:50,stone:50,iron:20},requires:[],unlock:'Kömür madeni'},steel:{name:'Çelik işleme',cost:{wood:80,iron:40,coal:30},requires:['mining'],unlock:'Çelik atölyesi ve çelik'},machinery:{name:'Makine mühendisliği',cost:{steel:40,copper:30,wood:100},requires:['steel'],unlock:'Makine atölyesi ve makine'}};
export function occupied(a,x,y){return a.plots.find(b=>x>=b.x&&y>=b.y&&x<b.x+(b.size||1)&&y<b.y+(b.size||1));}
export function resourceTarget(kind,t){return kind==='oduncu'?t==='forest':kind==='tas'?t==='rock':['demir','bakir','komur'].includes(kind)?t==='mountain':false;}
export function workPath(b,island=0,a={plots:[],roads:[]}){if(!['oduncu','tas','demir','bakir','komur'].includes(b.kind))return null;return weightedPath(a,island,{x:b.x,y:b.y},(x,y)=>resourceTarget(b.kind,terrain(x,y,island,a))&&!occupied(a,x,y),[b]);}
export function cycleLength(b){return Math.max(2,Math.ceil((b.path?Math.max(1,b.path.length-1)*2+4:b.kind==='koyun'?Math.max(2,Math.round(4*100/(b.fertility||100))):4)/(1+.25*((b.level||1)-1))*(b.roadFactor||1)));}
export function availableMaterial(island,good){
  return good==='gold'?island.money:island.stock[good]||0;
}
export function pay(island,cost){
  for(const [good,amount] of Object.entries(cost)){
    if(availableMaterial(island,good)<amount)throw Error(good==='gold'?'Yetersiz altın':'Yetersiz malzeme');
  }
  for(const [good,amount] of Object.entries(cost)){
    if(good==='gold')island.money-=amount;
    else island.stock[good]-=amount;
  }
}
export function depotContains(island,x,y){
  const yard=island.depot?.yard??{x:25,y:25};
  return x>=yard.x&&x<yard.x+2&&y>=yard.y&&y<yard.y+2;
}

function prepareDepot(island,index){
  const depot=island.depot;
  if(!depot.yard){
    const candidates=[];
    for(let x=0;x<35;x++)for(let y=0;y<35;y++)candidates.push({x,y});
    candidates.sort((a,b)=>Math.abs(a.x+1-depot.x)+Math.abs(a.y+1-depot.y)-
      Math.abs(b.x+1-depot.x)-Math.abs(b.y+1-depot.y));
    depot.yard=candidates.find(({x,y})=>[[x,y],[x+1,y],[x,y+1],[x+1,y+1]].every(([tx,ty])=>
      ['grass','forest','rock'].includes(terrain(tx,ty,index,island))&&!occupied(island,tx,ty)));
    if(depot.yard){
      depot.x=depot.yard.x+1;
      depot.y=depot.yard.y+1;
    }
  }
  depot.waiting ||= {};
}

export function validBuild(a,kind,x,y,i=0){if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>35||y>35)throw Error('Ada üzerinde bir kare seç.');const size=kind==='koyun'?2:1;for(let dx=0;dx<size;dx++)for(let dy=0;dy<size;dy++){let tx=x+dx,ty=y+dy;if(tx>35||ty>35)throw Error('Çiftlik için 2×2 boş kare gerekli.');if(depotContains(a,tx,ty))throw Error('Bu kare ada deposuna ayrılmış');if(occupied(a,tx,ty))throw Error('Bu alan dolu.');const t=terrain(tx,ty,i,a);if(kind==='balik'){if(['sea','lake','mountain','city'].includes(t)||!nearWater(a,i,tx,ty))throw Error('Balıkçı deniz veya tatlı su kıyısında olmalı');}else if(kind==='liman'){if(t!=='coast')throw Error('Limanı kıyıya kur.');}else if(['sea','lake','mountain','city','coast'].includes(t))throw Error('Bu arazi inşaata uygun değil.');}}
export const goods=['wood','stone','food','wool','yarn','clothes','iron','copper','coal','steel','machines','tools'];
export const recipes={demirci:{out:'tools',inputs:{iron:2,wood:1},tech:'mining'},komur:{out:'coal',tech:'mining'},celik:{out:'steel',inputs:{iron:2,coal:1},tech:'steel'},makine:{out:'machines',inputs:{steel:3,copper:2},tech:'machinery'},liman:{},oduncu:{out:'wood'},tas:{out:'stone'},balik:{out:'food'},koyun:{out:'wool'},iplik:{out:'yarn',input:'wool'},terzi:{out:'clothes',inputs:{yarn:2}},demir:{out:'iron'},bakir:{out:'copper'}};
export const basePrices={wood:3,stone:4,food:4,wool:5,yarn:8,clothes:14,iron:9,copper:10,coal:7,steel:24,machines:65,tools:22};
export function price(a,g,buy=false){return Math.max(1,Math.round(basePrices[g]*(1.3-Math.min(1,(a.stock[g]||0)/200)*.5)*(buy?1.1:.9)))}
const zero=()=>Object.fromEntries(goods.map(g=>[g,0]));
export function order(a){let n=(a.ordersDone||0)+(a.orderChoice||0);return {goods:n%3===0?{food:30,clothes:10}:n%3===1?{clothes:6}:a.tech.includes('mining')?{tools:8,food:20}:{wood:25,stone:15},reward:n%3===0?120:n%3===1?160:170,remaining:600}}
function migrateBase(old){let s=old||{tick:0,players:[],ships:[],islands:['Mercan','Defne','Sedef','Poyraz','Zümrüt','Kum','Çınar','Lale','Mavi','Gümüş'].map((name,i)=>({name,resource:i%2?'copper':'iron',stock:{...zero(),wood:60,stone:60,food:40},plots:[],buildings:[],owner:null}))};let upgrade=s.version!==6;s.islands.forEach((a,i)=>{a.plots ||= (a.buildings||[]).map((kind,j)=>({kind,x:2+j%9,y:2+Math.floor(j/9),size:1}));a.storageLevel ||=0;a.productionLevel ||=0;a.tech ||= [];a.stock={...zero(),...a.stock};a.money ??=400;a.ordersDone ||=0;a.order ||=order(a);a.market ??=false;a.citySupply ??={food:0,clothes:0};a.terrainOverrides ||= {};a.fertility=fertility(i);for(let b of a.plots){b.size ||=b.kind==='koyun'?2:1;b.phase ||=0;b.fertility=a.fertility;if(upgrade){for(let dx=-1;dx<=b.size;dx++)for(let dy=-1;dy<=b.size;dy++){let x=b.x+dx,y=b.y+dy;if(x>=0&&x<36&&y>=0&&y<36&&['sea','lake','mountain','city','coast'].includes(terrain(x,y,i)))a.terrainOverrides[x+','+y]='grass';}if(b.kind==='liman')a.terrainOverrides[b.x+','+b.y]='coast';}b.path=workPath(b,i,a);}});s.trader ||= {name:'Gezgin tüccar',stock:Object.fromEntries(goods.map(g=>[g,200])),money:10000};s.contracts ||= [];s.nextId ||=1;for(let sh of s.ships){if(!sh.load){sh.load=zero();if(sh.cargo>0&&goods.includes(sh.cargoGood||sh.good))sh.load[sh.cargoGood||sh.good]=sh.cargo;sh.stage=sh.back?'return':sh.progress>0?'out':'home';sh.enabled=false;}sh.stage ||= 'home';sh.amount ??=10;sh.buyAmount ??=10;sh.buy ||=s.islands[sh.from].resource==='iron'?'copper':'iron';sh.good ||= 'wood';sh.minStock ??=20;sh.minSell ??=0;sh.maxBuy ??=999;sh.status ||= 'Limanda';sh.progress ||=0;sh.capacity ||=20;for(const good of goods)sh.load[good] ??=0;}s.version=6;return s}
export function loadCount(sh){return Object.values(sh.load).reduce((a,b)=>a+b,0)}
function port(a){return a.plots.some(b=>b.kind==='liman')}
function integer(n,max=9999){if(!Number.isInteger(n)||n<0||n>max)throw Error('Geçersiz miktar');return n}
function unload(a,sh,g,n=Infinity){let q=Math.max(0,Math.min(n,sh.load[g]||0,capacity(a)-a.stock[g]));a.stock[g]+=q;sh.load[g]-=q;return q}
function load(a,sh,g,n){let q=Math.max(0,Math.min(n,a.stock[g],(sh.capacity||20)-loadCount(sh)));a.stock[g]-=q;sh.load[g]+=q;return q}
export const progressionXP = {
  cityOrder:35,
  research:40,
  cityUpgrade:75,
  trade:25
};

export function xpForNextLevel(level){
  return 100+50*(level-1);
}

export function levelReward(level){
  return xpForNextLevel(level-1);
}

function gainXP(world,islandIndex,activity){
  if(!world.players.some(player=>player.island===islandIndex))return;
  const island=world.islands[islandIndex];
  const progress=island.playerProgress ||= {level:1,xp:0,goldEarned:0};
  progress.xp+=progressionXP[activity];
  while(progress.xp>=xpForNextLevel(progress.level)){
    progress.xp-=xpForNextLevel(progress.level);
    progress.level++;
    const reward=levelReward(progress.level);
    progress.goldEarned+=reward;
    island.money+=reward;
  }
}

function actBase(s,p,m){let a=s.islands[p.island];
 if(m.type==='build'){let r=recipes[m.kind];if(!r)throw Error('Bilinmeyen bina');if(r.tech&&!a.tech.includes(r.tech))throw Error('Önce teknolojiyi araştır');if(m.kind==='bakir'&&a.resource!=='copper')throw Error('Bu adada bu maden yok');validBuild(a,m.kind,m.x,m.y,p.island);const builtCost=buildingCost(m.kind);pay(a,builtCost);let b={builtCost,kind:m.kind,x:m.x,y:m.y,size:m.kind==='koyun'?2:1,phase:0,fertility:a.fertility};b.path=workPath(b,p.island,a);a.plots.push(b);return;}
 if(m.type==='move'||m.type==='demolish'){let b=a.plots.find(b=>b.x===m.fromX&&b.y===m.fromY);if(!b)throw Error('Bina bulunamadı');if(b.kind==='liman'&&a.plots.filter(b=>b.kind==='liman').length===1&&(s.ships.some(sh=>sh.from===p.island||sh.to===p.island||sh.barterRoute===p.island)||s.contracts.some(c=>c.status==='queued'&&(c.from===p.island||c.to===p.island))))throw Error('Filo veya bekleyen takas bu limanı kullanıyor. Önce ikinci bir liman kur');if(m.type==='move'){let other={...a,plots:a.plots.filter(q=>q!==b)};validBuild(other,b.kind,m.x,m.y,p.island);b.x=m.x;b.y=m.y;b.path=workPath(b,p.island,a);b.phase=0;}else{for(const [good,amount] of Object.entries(demolitionRefund(b)))a.stock[good]+=amount;a.plots=a.plots.filter(q=>q!==b);}return;}
 if(m.type==='storageUpgrade'){if(a.storageLevel>=10)throw Error('En yüksek depo seviyesi');pay(a,upgradeCost(a.storageLevel));a.storageLevel++;return;}
 if(m.type==='productionUpgrade'){if(a.productionLevel>=5)throw Error('En yüksek üretim seviyesi');pay(a,upgradeCost(a.productionLevel+1));a.productionLevel++;return;}
 if(m.type==='research'){let t=technologies[m.id];if(!t||a.research||a.rp<(t.rp||0)||a.tech.includes(m.id)||!t.requires.every(k=>a.tech.includes(k)))throw Error('Araştırma koşulları karşılanmıyor');if((a.universityLevel||0)<(t.university||0))throw Error('Üniversite seviye '+t.university+' gerekli');if(a.cityLevel<t.cityLevel)throw Error('Şehir seviyesi '+(t.cityLevel+1)+' gerekli');pay(a,t.cost);a.research={id:m.id,remaining:t.time||90};a.rp-=t.rp||0;return;}
 if(m.type==='deliverOrder'){pay(a,cityOrderGoods(a));a.money+=cityOrderReward(a);a.rp+=10;a.ordersDone++;a.order=order(a);gainXP(s,p.island,'cityOrder');return;}
 if(m.type==='refreshCityOrder'){
   if(s.tick<(a.cityOrderRefreshAt??180))throw Error('Sipariş değişikliği için süreyi bekle');
   a.orderChoice=(a.orderChoice||0)+1;
   a.order=order(a);
   a.cityOrderRefreshAt=s.tick+180;
   return;
 }
 if(m.type==='market'){a.market=!!m.enabled;return;}
 if(m.type==='trader'){if(s.mode!=='test')throw Error('Gezgin tüccar yalnızca test modunda');let g=m.good,n=integer(m.amount,100);if(!goods.includes(g)||n<1)throw Error('Ürün ve miktar seç');let t=s.trader,u=price(t,g,!!m.buy);if(m.buy){if(t.stock[g]<n||a.money<u*n||a.stock[g]+n>capacity(a))throw Error('Stok, para veya depo kapasitesi yetersiz');t.stock[g]-=n;a.stock[g]+=n;a.money-=u*n;t.money+=u*n;}else{if(a.stock[g]<n||t.money<u*n)throw Error('Stok veya tüccarın parası yetersiz');a.stock[g]-=n;t.stock[g]+=n;a.money+=u*n;t.money-=u*n;}return;}
 if(m.type==='ship'){if(!a.plots.some(b=>b.kind==='liman'&&b.x===m.x&&b.y===m.y))throw Error('Limanı seç');pay(a,{wood:30,stone:10});s.ships.push({owner:p.island,from:p.island,to:1-p.island,good:'wood',buy:a.resource==='iron'?'copper':'iron',amount:10,buyAmount:10,minStock:20,minSell:0,maxBuy:999,load:zero(),stage:'home',progress:0,back:false,capacity:20,enabled:false,status:'Rota bekliyor'});return;}
 if(m.type==='route'){let sh=s.ships[m.id];if(!sh||sh.owner!==p.island||sh.contract)throw Error('Gemi bulunamadı veya takasa ayrıldı');if(sh.stage!=='home'||loadCount(sh))throw Error('Gemi boş olarak limana dönünce rota değiştirilebilir');if(!goods.includes(m.good)||!goods.includes(m.buy)||!s.islands[m.to]||m.to===p.island||!port(s.islands[m.to])||!s.islands[m.to].owner)throw Error('Ürünleri ve yerleşik hedef limanı seç');for(let k of ['amount','buyAmount','minStock','minSell','maxBuy'])integer(m[k],k==='amount'||k==='buyAmount'?20:9999);Object.assign(sh,...['to','good','buy','amount','buyAmount','minStock','minSell','maxBuy'].map(k=>({[k]:m[k]})),{enabled:!!m.enabled});return;}
 if(m.type==='stopShip'){let sh=s.ships[m.id];if(!sh||sh.owner!==p.island)throw Error('Gemi bulunamadı');sh.enabled=false;return;}
 if(m.type==='offer'){let q=s.players.find(q=>q.island===m.to);if(!q||m.to===p.island||!goods.includes(m.give)||!goods.includes(m.receive)||m.give===m.receive)throw Error('Geçersiz takas');integer(m.giveN,20);integer(m.receiveN,20);if(!m.giveN||!m.receiveN)throw Error('Miktar en az 1');if(s.contracts.filter(c=>c.status==='pending').length>=10)throw Error('Bekleyen teklifleri sonuçlandır');s.contracts.push({id:s.nextId++,from:p.island,to:m.to,give:m.give,receive:m.receive,giveN:m.giveN,receiveN:m.receiveN,status:'pending'});return;}
 if(m.type==='reply'){replyToBarter(s,p,m);return;}
 throw Error('Bilinmeyen işlem');}
function replyToBarter(world,player,message){
  const contract=world.contracts.find(c=>c.id===message.id&&c.to===player.island&&c.status==='pending');
  if(!contract)throw Error('Teklif bulunamadı');
  if(message.accept!==true){
    contract.status='rejected';
    return;
  }
  const sender=world.islands[contract.from];
  const receiver=world.islands[contract.to];
  if(!port(sender)||!port(receiver))throw Error('Takas için iki adada da liman gerekli');
  if(sender.stock[contract.give]<contract.giveN||receiver.stock[contract.receive]<contract.receiveN)
    throw Error('Takas için depodaki ürünler yetersiz');
  sender.stock[contract.give]-=contract.giveN;
  receiver.stock[contract.receive]-=contract.receiveN;
  contract.escrow=contract.receiveN;
  contract.status='queued';
  contract.queueOrder=world.nextId++;
  syncLocations(sender);
  syncLocations(receiver);

  const ships=world.ships.filter(ship=>ship.owner===contract.from && ship.stage==='home' && !loadCount(ship));
  ships.sort((a,b)=>Number(a.enabled)-Number(b.enabled));
  ships.some(ship=>dispatchBarter(world,ship));
}

function dispatchBarter(world,ship){
  const queued=world.contracts.filter(c=>c.from===ship.owner&&c.status==='queued');
  queued.sort((a,b)=>(a.queueOrder??a.id)-(b.queueOrder??b.id));
  const contract=queued[0];
  if(!contract || ship.contract || ship.purchase || ship.mission || ship.expedition ||
    Math.max(contract.giveN,contract.receiveN)>(ship.capacity||20))return false;
  ship.barterRoute=ship.to;
  ship.load[contract.give]=contract.giveN;
  ship.contract=contract.id;
  ship.to=contract.to;
  ship.stage='out';
  ship.progress=0;
  ship.back=false;
  ship.cargo=contract.giveN;
  ship.status='Takas için yola çıktı';
  contract.status='shipping';
  return true;
}

export function shipTick(s,sh){let a=s.islands[sh.from],b=s.islands[sh.to];if(!a||!b)return;let c=s.contracts.find(c=>c.id===sh.contract);sh.back=sh.stage==='return';sh.cargo=loadCount(sh);
 if(sh.stage==='home'){
   for(const good of goods)unload(a,sh,good);
   if(loadCount(sh)){sh.status='Depo dolu · yük gemide bekliyor';return;}
   if(c){
     if(c.status!=='done'){
       c.status='done';
       gainXP(s,c.from,'trade');
       gainXP(s,c.to,'trade');
     }
     delete sh.contract;
     if(Number.isInteger(sh.barterRoute))sh.to=sh.barterRoute;
     delete sh.barterRoute;
   }
   if(sh.portOrder&&!sh.portOrder.delivered){
     sh.portOrder.delivered=true;
     gainXP(s,sh.owner,'trade');
     gainXP(s,sh.portOrder.target,'trade');
   }
   if(dispatchBarter(s,sh))return;
   if(!sh.enabled){sh.status='Limanda';return;}
   const destination=s.islands[sh.to];
   if(!port(a)||!port(destination)||(!destination.market&&(!Number.isInteger(a.controller)||destination.controller!==a.controller))){
     sh.status='Hedef liman / ticaret izni bekleniyor';
     return;
   }
   load(a,sh,sh.good,Math.min(sh.amount,Math.max(0,a.stock[sh.good]-sh.minStock)));
   sh.stage='out';sh.progress=0;sh.status='Yola çıktı';
   return;
 }
 if(sh.stage==='out'||sh.stage==='return'){sh.status=sh.stage==='out'?'Gidiş':'Dönüş';if(++sh.progress>=voyageSeconds(a)){sh.stage=sh.stage==='out'?'dock':'home';sh.progress=0;}return;}
 if(sh.stage==='dock'&&sh.purchase){
   const purchase=sh.purchase;
   if(sh.progress++===0&&sh.portOrder)return;
   b.money+=purchase.gold;
   sh.load[purchase.good]=(sh.load[purchase.good]||0)+purchase.quantity;
   delete sh.purchase;
   sh.stage='return';sh.progress=0;sh.status='Satın alınan yük dönüyor';
   return;
 }
 if(sh.stage==='dock'&&sh.mission){let m=sh.mission;sh.status=m.marketOrder?'Alım ilanı teslim ediliyor':'İhtiyaç siparişi teslim ediliyor';if(b.stock[m.good]+m.amount>capacity(b)){sh.status='Hedef depo dolu · yük gemide';return;}b.stock[m.good]+=m.amount;sh.load[m.good]-=m.amount;a.money+=m.reward;gainXP(s,sh.owner,'trade');if(m.marketOrder)gainXP(s,Number.isInteger(b.controller)?b.controller:sh.to,'trade');delete sh.mission;sh.stage='return';sh.progress=0;return;}if(sh.stage==='dock'){sh.status='Boşaltma / yükleme';if(++sh.progress<4)return;sh.progress=0;if(c){if(b.stock[c.give]+c.giveN>capacity(b)){sh.status='Hedef depo dolu · takas yükü bekliyor';return;}unload(b,sh,c.give,c.giveN);sh.load[c.receive]+=c.escrow;c.escrow=0;c.status='returning';}else if(b.controller===a.controller&&b.controller!==null){for(let g of goods)unload(b,sh,g);load(b,sh,sh.buy,sh.buyAmount);}else if(b.market&&port(b)){let g=sh.good,u=price(b,g,false),n=u>=sh.minSell?Math.min(sh.load[g],Math.max(0,capacity(b)-b.stock[g]),Math.floor(b.money/u)):0;unload(b,sh,g,n);b.money-=n*u;a.money+=n*u;u=price(b,sh.buy,true);if(u<=sh.maxBuy){n=load(b,sh,sh.buy,Math.min(sh.buyAmount,Math.floor(a.money/u)));a.money-=n*u;b.money+=n*u;}}sh.stage='return';sh.back=true;}
}
function tickBase(s){s.tick++;s.islands.forEach(a=>{if(!a.owner)return;productionTick(s,a,s.islands.indexOf(a));if(--a.order.remaining<=0)a.order=order(a);if(s.tick%30===0)consumeCityNeeds(a,s.tick);});for(let sh of s.ships)shipTick(s,sh);if(s.mode==='test'&&s.tick%60===0){for(let g of goods)s.trader.stock[g]=Math.min(300,s.trader.stock[g]+10);s.trader.money=Math.min(15000,s.trader.money+200);}}
export function publicState(s,p,running){return {...s,players:s.players.map(({name,island})=>({name,island})),you:p.island,running}}
Object.assign(technologies,{
 farming:{name:'Tarım bilgisi',cost:{wood:35,stone:20},requires:[],unlock:'Verimli çiftçilik · koyun üretimi %25 hızlı',time:90,rp:0,branch:'Tarım'},
 husbandry:{name:'İleri hayvancılık',cost:{wood:60,clothes:15,tools:10},requires:['farming','mining'],unlock:'Çiftliklerde ilave %25 hız',time:180,rp:20,branch:'Tarım'},
 navigation:{name:'Denizcilik',cost:{wood:60,clothes:10},requires:[],unlock:'Koloni seferleri',time:120,rp:0,branch:'Denizcilik'},
 logistics:{name:'Deniz lojistiği',cost:{steel:20,tools:15},requires:['navigation','steel'],unlock:'Deniz yolculuğu 30 → 20 saniye',time:180,rp:25,branch:'Denizcilik'}
});for(let [id,t] of Object.entries(technologies)){t.branch ||= 'Metalürji';t.time ||= {mining:90,steel:150,machinery:240}[id]||90;t.rp ??=id==='mining'?0:id==='steel'?10:25;}
function migrateDepth(old){let s=migrateBase(old);for(let g of goods)s.trader.stock[g] ??=200;s.players.forEach(p=>{let a=s.islands[p.island];a.controller ??=p.island});s.islands.forEach(a=>{a.controller ??=null;a.roads ||= [];a.rp ??=0;a.research ||=null;for(let b of a.plots)b.level ||=1;});return s}
export function upgradeBuildingCost(b){return {wood:20*(b.level||1),stone:15*(b.level||1),...(b.level>=2?{tools:5*b.level}:{}),...(b.level>=3?{gold:50*(b.level-2)}:{})}}
function owning(s,p,i){return i===p.island||s.islands[i]?.controller===p.island}
function actDepth(s,p,m){let i=Number.isInteger(m.island)?m.island:p.island,a=s.islands[i],home=s.islands[p.island];if(m.type==='colonize'){if(!a||a.owner||i<2)throw Error('Boş bir ada seç');if(!home.tech.includes('navigation'))throw Error('Denizcilik araştırması gerekli');let sh=s.ships.find(sh=>sh.owner===p.island&&sh.stage==='home'&&!sh.enabled&&!sh.contract&&!loadCount(sh));if(!sh||!port(home))throw Error('Ana limanda boş ve durdurulmuş gemi gerekli');if(home.money<200)throw Error('200 altın gerekli');pay(home,{wood:60,stone:40,tools:10});home.money-=200;sh.expedition={to:i,remaining:45};sh.stage='expedition';sh.status='Koloni seferi';return;}
if(!owning(s,p,i))throw Error('Bu ada sana ait değil');if(m.type==='road'){if(!Number.isInteger(m.x)||!Number.isInteger(m.y)||!['grass','forest','rock'].includes(terrain(m.x,m.y,i,a))||occupied(a,m.x,m.y))throw Error('Yola uygun boş kara seç');let k=m.x+','+m.y;if(a.roads.includes(k))throw Error('Yol zaten var');pay(a,{stone:1});a.roads.push(k);return;}
if(m.type==='buildingUpgrade'){let b=a.plots.find(b=>b.x===m.x&&b.y===m.y);if(!b||!recipes[b.kind]?.out||b.level>=5)throw Error('Yükseltilebilir üretim binası seç (en fazla 5)');pay(a,upgradeBuildingCost(b));b.level=(b.level||1)+1;return;}
if(i!==p.island&&['research','deliverOrder','refreshCityOrder','offer','reply','trader'].includes(m.type))throw Error('Bu işlemi ana adadan yap');if(i!==p.island&&['ship','route'].includes(m.type))throw Error('Gemiler ana limandan yönetilir');let ownTech=a.tech;a.tech=home.tech;try{actBase(s,{...p,island:i},m)}finally{if(i!==p.island)a.tech=ownTech;}}
function tickDepth(s){for(let a of s.islands){let home=s.islands[a.controller]||a;for(let b of a.plots){let road=b.path?.length?b.path.filter(p=>a.roads.includes(p.join(','))).length/b.path.length:0;b.roadFactor=1-road*.4;if(b.kind==='koyun')b.roadFactor*=home.tech.includes('husbandry')?.5:home.tech.includes('farming')?.75:1;}if(a.research&&--a.research.remaining<=0){a.tech.push(a.research.id);a.research=null;gainXP(s,s.islands.indexOf(a),'research');}}
let expeditions=s.ships.filter(sh=>sh.expedition);for(let sh of expeditions){sh.status='Koloni seferi · '+sh.expedition.remaining+' sn';if(--sh.expedition.remaining<=0){let a=s.islands[sh.expedition.to];if(!a.owner){a.owner=s.islands[sh.owner].owner+' · Koloni';a.controller=sh.owner;a.market=false;a.stock={...a.stock,wood:40,stone:30,food:20};let found=false;for(let y=0;y<36&&!found;y++)for(let x=0;x<36&&!found;x++)if(terrain(x,y,sh.expedition.to,a)==='coast'){a.plots.push({kind:'liman',x,y,size:1,level:1,phase:0});found=true;}}else{let h=s.islands[sh.owner];for(let [g,n] of Object.entries({wood:60,stone:40,tools:10}))h.stock[g]+=n;h.money+=200;}delete sh.expedition;sh.stage='home';}}
let saved=s.ships;s.ships=saved.filter(sh=>!sh.expedition);tickBase(s);s.ships=saved;
for(const player of s.players){
  const home=s.islands[player.island];
  const university=universityTiers[home.universityLevel];
  if(university&&s.tick>=home.universityNextTick){
    home.rp+=university.points;
    home.universityNextTick=s.tick+60;
  }
}
for(let a of s.islands){for(let b of a.plots){let r=recipes[b.kind];if(!r?.out)continue;b.rate=60*(1+a.productionLevel)/cycleLength(b);b.status=b.path&&b.path.length===0?'Kaynağa yol yok':a.stock[r.out]>=capacity(a)?'Depo dolu':!Object.entries(r.inputs||(r.input?{[r.input]:1}:{})).every(([g,n])=>(b.inventory?.[g]||0)>=n*(1+a.productionLevel))?'Atlı hammadde teslimatı bekleniyor':'Çalışıyor';}}
}
export function transportPath(a,i,from,to){return weightedPath(a,i,from,(x,y)=>x===to.x&&y===to.y,[from,to]);}
function addAI(s){if(s.aiInitialized)return;s.aiInitialized=true;let count=0;for(let i=2;i<10&&count<2;i++){let a=s.islands[i];if(!a||a.owner)continue;a.owner=['Kaptan Leyla','Tüccar Arda'][count++];a.ai=true;a.controller='ai'+i;a.market=true;a.money=800;a.stock.wood=100;a.stock.stone=100;a.tech=['mining'];aiBuild(a,i,'liman');aiBuild(a,i,'oduncu');aiBuild(a,i,'tas');}}
function aiBuild(island,index,kind,{starter=false}={}){
  if(!starter&&(island.stock.wood<10||island.stock.stone<5))return false;
  const depot=island.depot||{x:26,y:26};
  const positions=Array.from({length:36*36},(_,cell)=>({x:cell%36,y:Math.floor(cell/36)}));
  const distance=({x,y})=>Math.abs(x-depot.x)+Math.abs(y-depot.y);
  positions.sort((a,b)=>distance(a)-distance(b));
  for(const {x,y} of positions){
    const size=kind==='koyun'?2:1;
    const touchesDepot=Array.from({length:size*size},(_,cell)=>distance({x:x+cell%size,y:y+Math.floor(cell/size)}))
      .some(steps=>steps<=1);
    if(touchesDepot)continue;
    try{validBuild(island,kind,x,y,index);}catch{continue;}
    const building={kind,x,y,size:kind==='koyun'?2:1,level:1,phase:0,fertility:island.fertility};
    building.path=workPath(building,index,island);
    if(building.path&&!building.path.length)continue;
    if(!keepsAIPlotsReachable(island,index,depot,building))continue;
    if(!starter){island.stock.wood-=10;island.stock.stone-=5;}
    island.plots.push(building);
    return true;
  }
  return false;
}

function keepsAIPlotsReachable(island,index,depot,candidate){
  const plots=[...island.plots,candidate];
  const blocked=new Set();
  const goals=new Map();
  const key=(x,y)=>y*36+x;
  for(const building of plots){
    const size=building.size||1;
    for(let dy=0;dy<size;dy++)for(let dx=0;dx<size;dx++){
      const cell=key(building.x+dx,building.y+dy);
      blocked.add(cell);
      goals.set(cell,building);
    }
  }
  const queue=[[depot.x,depot.y]];
  const visited=new Set([key(depot.x,depot.y)]);
  const reached=new Set();
  for(let head=0;head<queue.length;head++){
    const [x,y]=queue[head];
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy,cell=key(nx,ny);
      if(nx<0||ny<0||nx>=36||ny>=36||visited.has(cell))continue;
      visited.add(cell);
      if(blocked.has(cell)){
        reached.add(goals.get(cell));
        continue;
      }
      if(['sea','lake','mountain','city'].includes(terrain(nx,ny,index,island)))continue;
      queue.push([nx,ny]);
    }
    if(reached.size===plots.length)return true;
  }
  return false;
}

function establishAIIndustry(island,index){
  const iron=island.resource==='iron';
  const starters=['liman','oduncu','tas','balik','koyun','iplik','terzi',iron?'demir':'bakir'];
  if(iron){
    if(!island.tech.includes('mining'))island.tech.push('mining');
    starters.push('demirci');
  }
  for(const kind of starters){
    if(!island.plots.some(building=>building.kind===kind))aiBuild(island,index,kind,{starter:true});
  }
  // Give the initial workshops a small fleet to move their inputs and output.
  while(island.horses.length<3){
    const id='ai-industry-'+island.horses.length;
    island.horses.push({id,x:island.depot.x,y:island.depot.y});
  }
  island.basicIndustryReady=true;
}

function expandAI(island,index){
  const sequence=['balik','oduncu','tas',island.resource==='iron'?'demir':'bakir','koyun','iplik','terzi','komur'];
  if(island.resource==='iron')sequence.push('demirci');
  if(island.plots.length<24)aiBuild(island,index,sequence[island.plots.length%sequence.length]);
}
function migratePrevious(old){let s=migrateDepth(old);s.nextBuildingId ||=1;s.islands.forEach(a=>{a.deliveries ||= [];for(let b of a.plots){b.id ||= 'b'+s.nextBuildingId++;b.inventory ||= {};}});addAI(s);return s}
export function tick(s){s.nextBuildingId ||=1;for(let [i,a] of s.islands.entries()){initializeMechanics(s,a,i);economyInit(s,a,i);syncLocations(a);drainDepot(a);advanceDeliveries(s,a,i);dispatchDeliveries(s,a,i);if(a.owner&&s.tick%180===0){a.needs={food:20,clothes:10,tools:8};if(a.ai)seedMarket(s,a);}if(a.ai&&s.tick%30===0)expandAI(a,i);
}tickDepth(s);updateTimedRewards(s);for(let sh of s.ships){let a=s.islands[sh.owner];if(a)sh.capacity=seaCapacity(a);}for(let a of s.islands){syncLocations(a);for(let b of a.plots){if(b.kind==='balik'&&!nearWater(a,s.islands.indexOf(a),b.x,b.y))b.status='Balıkçı su kenarında olmalı';else if(Object.values(b.output||{}).some(n=>n>=50))b.status='Tesis çıkışı dolu · At bekleniyor';b.recent=(b.recent||[]).filter(e=>s.tick-e.tick<60);b.actual=b.recent.reduce((n,e)=>n+e.amount,0);if(b.worker){b.status=stageLabel(b.worker.stage);let walk=(b.path||[]).slice(1).reduce((n,p)=>n+(a.roads.includes(p.join(','))?.5:1),0);b.rate=60*(1+a.productionLevel)/Math.max(1,walk*2+Math.ceil(4/(1+.25*((b.level||1)-1)))+1);}}}}

function actPrevious(s,p,m){let a=s.islands[Number.isInteger(m.island)?m.island:p.island],b=m.type==='demolish'&&a?.plots.find(b=>b.x===m.fromX&&b.y===m.fromY),inv=b?{...b.inventory}:{};if(b)for(let [g,n] of Object.entries(inv))if(a.stock[g]+n+(demolitionRefund(b)[g]||0)>capacity(a))throw Error('Tesisin hammaddelerini iade etmek için depoda yer aç');actDepth(s,p,m);if(b)for(let [g,n] of Object.entries(inv))a.stock[g]+=n;}
const pathSteps=[[1,0],[-1,0],[0,1],[0,-1]];

export function weightedPath(island,index,from,goal,allow=[]){
  const origin=from.y*36+from.x;
  const blocked=new Uint8Array(1296);
  const roadTiles=new Set(island.roads||[]);
  const allowed=new Set(allow.filter(Boolean).map(building=>building.id||building));
  for(const building of island.plots){
    if(allowed.has(building.id||building))continue;
    const size=building.size||1;
    for(let y=building.y;y<building.y+size;y++)
      for(let x=building.x;x<building.x+size;x++)blocked[y*36+x]=1;
  }
  const distance=new Int16Array(1296).fill(32767);
  const previous=new Int16Array(1296).fill(-1);
  const queues=[[origin],[],[]];
  const head=[0,0,0];
  distance[origin]=0;
  let remaining=1;
  for(let cost=0;remaining;cost++){
    const bucket=cost%3;
    const queue=queues[bucket];
    while(head[bucket]<queue.length){
      const tile=queue[head[bucket]++];
      remaining--;
      if(distance[tile]!==cost)continue;
      const x=tile%36,y=Math.floor(tile/36);
      if(goal(x,y)){
        const path=[];
        for(let step=tile;step>=0;step=previous[step])path.push([step%36,Math.floor(step/36)]);
        return path.reverse();
      }
      for(const [dx,dy] of pathSteps){
        const nx=x+dx,ny=y+dy,next=ny*36+nx;
        if(nx<0||nx>=36||ny<0||ny>=36||blocked[next])continue;
        const nextCost=cost+(roadTiles.has(nx+','+ny)?1:2);
        if(distance[next]<=nextCost)continue;
        const land=terrain(nx,ny,index,island);
        if((land==='sea'||land==='lake'||land==='mountain'||land==='city')&&!goal(nx,ny))continue;
        distance[next]=nextCost;
        previous[next]=tile;
        queues[nextCost%3].push(next);
        remaining++;
      }
    }
    queue.length=0;
    head[bucket]=0;
  }
  return [];
}

const inputsOf=b=>recipes[b.kind]?.inputs||(recipes[b.kind]?.input?{[recipes[b.kind].input]:1}:{});
export const stageLabel=stage=>({out:'Kaynağa gidiyor',work:'Kaynakta çalışıyor',back:'Yükle dönüyor',deliver:'Teslim ediyor',blocked:'Yol / kaynak bekliyor',waiting:'Hammadde bekliyor',full:'Depo dolu'}[stage]||stage);
function initializeMechanics(s,a,i){a.deliveries ||= [];a.depot ||= {x:26,y:26,stock:{...a.stock}};if(!a.depot.waiting)prepareDepot(a,i);for(let b of a.plots){b.id ||= 'b'+s.nextBuildingId++;b.inventory ||= {};b.output ||= {};b.recent ||= [];}if(!a.locationReady){a.depot.stock={...a.stock};for(let b of a.plots)b.output={};a.locationReady=true;}}
function sources(a){return [{id:'depot',x:a.depot.x,y:a.depot.y,stock:a.depot.stock},...a.plots.map(b=>({id:b.id,x:b.x,y:b.y,stock:(b.output ||= {}),building:b}))];}
function syncLocations(a){if(a.depot)a.depot.stock={...a.stock};}
function position(entity){let path=entity.path||[],n=Math.min(path.length-1,Math.floor(entity.progress||0));return path[n]||[entity.x||0,entity.y||0];}
function travel(entity,a,speed=1){if(!entity.path?.length)return false;let left=speed;while(left>0&&entity.progress<entity.path.length-1){let n=Math.floor(entity.progress),next=entity.path[n+1],cost=a.roads.includes(next.join(','))?.5:1,need=(n+1-entity.progress)*cost;if(left>=need){entity.progress=n+1;left-=need}else{entity.progress+=left/cost;left=0;}}return entity.progress>=entity.path.length-1;}
function routeWorker(a,i,b,w,back=false){let [x,y]=position(w),from={x,y},path=back?weightedPath(a,i,from,(x,y)=>x===b.x&&y===b.y,[b]):weightedPath(a,i,from,(x,y)=>resourceTarget(b.kind,terrain(x,y,i,a))&&!occupied(a,x,y),[b]);w.x=x;w.y=y;w.path=path;w.progress=0;w.stage=path.length?(back?'back':'out'):'blocked';}
function produced(s,a,b,n){let out=b.extract||recipes[b.kind].out;b.output[out]=(b.output[out]||0)+n;b.recent.push({tick:s.tick,amount:n});}
function productionTick(s,a,i){const home=s.islands[a.controller]||a;for(let b of a.plots){b.inventory ||= {};b.output ||= {};b.recent ||= [];let baseRecipe=recipes[b.kind],r=baseRecipe&&{...baseRecipe,out:b.extract||baseRecipe.out};if(!r?.out)continue;if(b.kind==='balik'&&!nearWater(a,i,b.x,b.y)){b.status='Balıkçı su kenarında olmalı';continue;}let n=1+a.productionLevel,raw=!!resourceTarget(b.kind,'forest')||['tas','demir','bakir','komur'].includes(b.kind);if(raw){let w=b.worker;if(!w){b.path=workPath(b,i,a);w=b.worker={stage:b.path?.length?'out':'blocked',path:b.path||[],progress:0,elapsed:0,carried:0,x:b.x,y:b.y};}if(w.stage==='blocked'){routeWorker(a,i,b,w,!!w.carried);continue;}if(w.stage==='out'){let last=w.path.at(-1);if(!last||!resourceTarget(b.kind,terrain(...last,i,a))){routeWorker(a,i,b,w);continue;}if(travel(w,a)){w.stage='work';w.elapsed=0;}}else if(w.stage==='work'){let last=w.path.at(-1);if(!last||!resourceTarget(b.kind,terrain(...last,i,a))){routeWorker(a,i,b,w);continue;}if(++w.elapsed>=Math.max(1,4/(1+.25*((b.level||1)-1)))){w.carried=n;routeWorker(a,i,b,w,true);}}else if(w.stage==='back'){if(travel(w,a)){w.stage='deliver';w.elapsed=0;}}else if(w.stage==='deliver'){if((b.output[r.out]||0)+w.carried>50)continue;produced(s,a,b,w.carried);w.carried=0;b.path=workPath(b,i,a);w.path=b.path||[];w.progress=0;w.stage=w.path.length?'out':'blocked';}b.phase=0;continue;}
let inp=inputsOf(b);if((b.output[r.out]||0)+n>50){b.status='Tesis çıkışı dolu · At bekleniyor';continue;}if(!Object.entries(inp).every(([g,q])=>(b.inventory[g]||0)>=q*n)){b.status='Atlı teslimat bekleniyor';continue;}const boost=productionSpeed(home,b);b.phase=(b.phase||0)+boost;if(b.phase<cycleLength(b))continue;b.phase=0;for(let [g,q] of Object.entries(inp))b.inventory[g]-=q*n;produced(s,a,b,n);}}
function productionSpeed(home,building){
  const tech=home.tech;
  const kind=building.kind;
  let speed=kind==='balik'?(tech.includes('aquaculture')?1.4:tech.includes('nets')?1.25:tech.includes('fishing')?1.15:1):
    kind==='koyun'?(tech.includes('ranching')?1.3:tech.includes('breeding')?1.15:1):
      tech.includes('industry')?1.35:tech.includes('engineering')?1.2:tech.includes('craft')?1.1:1;
  if(tech.includes('agronomy'))speed*=1.3;
  else if(tech.includes('irrigation'))speed*=1.15;
  const branch=kind==='balik'?'Balıkçılık':kind==='koyun'?'Hayvancılık':
    ['demirci','celik','bronz','gumusisleme','profilAtolyesi','parcaAtolyesi'].includes(kind)?'Metalürji':'Üretim';
  return speed*(1+.07*advancedLevels(home,branch)+(kind==='koyun'?.04*advancedLevels(home,'Tarım'):0));
}

export function productionPerSecond(island,building,home=island,level=building.level||1){
  const output=1+island.productionLevel;
  if(['oduncu','tas','demir','bakir','komur'].includes(building.kind)){
    if(!building.path?.length)return 0;
    const roads=new Set(island.roads||[]);
    const travelTime=path=>Math.max(1,Math.ceil(path.slice(1).reduce((seconds,point)=>seconds+(roads.has(point.join(','))?.5:1),0)));
    const work=Math.ceil(4/(1+.25*(level-1)));
    return output/(travelTime(building.path)+travelTime([...building.path].reverse())+work+1);
  }
  return output/Math.ceil(cycleLength({...building,level})/productionSpeed(home,building));
}

export function nearWater(a,i,x,y){return [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>['sea','lake'].includes(terrain(x+dx,y+dy,i,a)));}
export function horsePrice(a){return 100+75*((a.horses?.length||1)-1);}
function endpoint(a,id){return id==='depot'?{...a.depot,id:'depot'}:a.plots.find(b=>b.id===id);}
function taskRoute(a,i,d,target){let [x,y]=position(d),source=endpoint(a,d.from);let path=weightedPath(a,i,{x,y},(x,y)=>x===target.x&&y===target.y,[source,target]);d.x=x;d.y=y;d.path=path;d.progress=0;d.blocked=!path.length;}
const woolPickupSize=10;
function depotSpace(island,good,except){
  const incoming=island.deliveries.reduce((n,delivery)=>n+(delivery!==except&&delivery.to==='depot'&&delivery.good===good?delivery.amount:0),0);
  return Math.max(0,capacity(island)-island.stock[good]-(island.depot.waiting[good]||0)-incoming);
}

function drainDepot(island){
  for(const [good,waiting] of Object.entries(island.depot.waiting)){
    const quantity=Math.min(waiting,Math.max(0,capacity(island)-island.stock[good]));
    island.stock[good]+=quantity;
    if(quantity===waiting)delete island.depot.waiting[good];
    else island.depot.waiting[good]-=quantity;
  }
}

function dispatchDeliveries(world,island,index){
  const limit=fleetCapacity(world.islands[island.controller]||island);
  const jobs=[];
  for(const building of island.plots){
    for(const [good,quantity] of Object.entries(building.output)){
      const batch=building.kind==='koyun'&&good==='wool'?woolPickupSize:1;
      const reserved=island.deliveries.some(d=>d.from===building.id&&d.good===good&&d.stage==='empty');
      if(quantity>=batch&&!reserved&&depotSpace(island,good)>0)
        jobs.push({from:building.id,to:'depot',good,wanted:batch===1?limit:batch,last:building.lastPickup||0});
    }
    for(const [good,n] of Object.entries(inputsOf(building))){
      const buffer=n*(1+island.productionLevel)*3;
      const wanted=(good==='wool'?Math.max(woolPickupSize,buffer):buffer)-(building.inventory[good]||0);
      const reserved=island.deliveries.some(d=>d.to===building.id&&d.good===good&&d.stage!=='return');
      if(wanted>0&&island.stock[good]>0&&!reserved)
        jobs.push({from:'depot',to:building.id,good,wanted,last:building.lastSupply||0});
    }
  }
  jobs.sort((a,b)=>a.last-b.last||a.from.localeCompare(b.from)||a.to.localeCompare(b.to));
  for(const horse of island.horses){
    if(island.deliveries.some(delivery=>delivery.horseId===horse.id))continue;
    const from={x:horse.x??island.depot.x,y:horse.y??island.depot.y};
    while(jobs.length){
      const job=jobs.shift();
      const source=endpoint(island,job.from);
      if(!source)continue;
      if(job.from==='depot'&&!transportPath(island,index,source,endpoint(island,job.to)).length)continue;
      const path=weightedPath(island,index,from,(x,y)=>x===source.x&&y===source.y,[source]);
      if(!path.length)continue;
      island.deliveries.push({...job,horseId:horse.id,path,progress:0,amount:0,stage:'empty',...from});
      if(job.from==='depot')endpoint(island,job.to).lastSupply=world.tick+1;
      else source.lastPickup=world.tick+1;
      break;
    }
  }
}
function collectNearby(world,island,index,delivery,source,space){
  space=Math.min(space,depotSpace(island,delivery.good));
  if(!space||delivery.extraPickup||delivery.to!=='depot'||delivery.from==='depot')return false;
  const reserved=new Set(island.deliveries.filter(other=>other!==delivery&&other.stage==='empty'&&other.good===delivery.good)
    .map(other=>other.from));
  const nearby=island.plots.filter(building=>building!==source&&building.kind===source.kind&&
    building.output[delivery.good]>0&&!reserved.has(building.id)&&
    Math.abs(building.x-source.x)+Math.abs(building.y-source.y)<=8);
  let closest,path;
  for(const building of nearby){
    const candidate=transportPath(island,index,source,building);
    if(candidate.length&&(!path||candidate.length<path.length)){
      closest=building;
      path=candidate;
    }
  }
  if(!closest)return false;
  delivery.from=closest.id;
  delivery.extraPickup=true;
  delivery.wanted=space;
  delivery.path=path;
  delivery.progress=0;
  delivery.blocked=false;
  closest.lastPickup=world.tick+1;
  return true;
}

function carryToDepot(island,index,delivery){
  delivery.to='depot';
  delivery.stage=delivery.amount?'loaded':'return';
  taskRoute(island,index,delivery,island.depot);
}

function advanceDeliveries(world,island,index){
  const home=world.islands[island.controller]||island;
  const {capacity:limit,speed}=transportStats(home);
  for(const delivery of island.deliveries){
    let horse=island.horses.find(item=>item.id===delivery.horseId);
    if(!horse){
      horse={id:delivery.horseId||'legacy'+island.horses.length};
      island.horses.push(horse);
      delivery.horseId=horse.id;
    }
    const source=endpoint(island,delivery.from);
    const target=endpoint(island,delivery.to);
    if((delivery.stage==='loaded'&&!target)||(delivery.stage==='empty'&&!source)){
      carryToDepot(island,index,delivery);
      continue;
    }
    const goal=delivery.stage==='empty'?source:delivery.stage==='return'?island.depot:target;
    if(!goal)continue;
    if(delivery.blocked||!delivery.path?.length){
      if(delivery.stage==='empty'&&delivery.extraPickup&&delivery.amount)carryToDepot(island,index,delivery);
      else taskRoute(island,index,delivery,goal);
      continue;
    }
    if(!travel(delivery,island,speed))continue;
    [horse.x,horse.y]=position(delivery);
    if(delivery.stage==='empty'){
      const stock=delivery.from==='depot'?island.stock:source.output;
      const quantity=Math.min(Math.max(0,limit-delivery.amount),delivery.wanted,stock[delivery.good]||0,delivery.to==='depot'?Math.max(0,depotSpace(island,delivery.good,delivery)-delivery.amount):Infinity);
      stock[delivery.good]=(stock[delivery.good]||0)-quantity;
      if(delivery.from==='depot')syncLocations(island);
      delivery.amount+=quantity;
      if(collectNearby(world,island,index,delivery,source,limit-delivery.amount))continue;
      delivery.stage=delivery.amount?'loaded':'return';
      taskRoute(island,index,delivery,delivery.amount?target:island.depot);
    }else if(delivery.stage==='loaded'){
      if(delivery.to==='depot'){
        const quantity=Math.min(delivery.amount,Math.max(0,capacity(island)-island.stock[delivery.good]));
        island.stock[delivery.good]+=quantity;
        const overflow=delivery.amount-quantity;
        if(overflow)island.depot.waiting[delivery.good]=(island.depot.waiting[delivery.good]||0)+overflow;
        delivery.amount=0;
        syncLocations(island);
      }else{
        target.inventory ||= {};
        target.inventory[delivery.good]=(target.inventory[delivery.good]||0)+delivery.amount;
        delivery.amount=0;
      }
      delivery.stage='return';
      taskRoute(island,index,delivery,island.depot);
    }else{
      delivery.done=true;
      horse.x=island.depot.x;
      horse.y=island.depot.y;
    }
  }
  island.deliveries=island.deliveries.filter(delivery=>!delivery.done);
}
function reroute(a,i){for(let b of a.plots){b.path=workPath(b,i,a);if(b.worker)routeWorker(a,i,b,b.worker,!!b.worker.carried);}for(let d of a.deliveries){let target=d.stage==='empty'?endpoint(a,d.from):d.stage==='return'?a.depot:endpoint(a,d.to);if(!target){target=a.depot;d.stage=d.amount?'loaded':'return';d.to='depot';}taskRoute(a,i,d,target);}}
function migrateMechanics11(old){let s=migratePrevious(old);s.mechanicsVersion=1;s.islands.forEach((a,i)=>{initializeMechanics(s,a,i);syncLocations(a);for(let b of a.plots)b.path=workPath(b,i,a);reroute(a,i);});return s;}
function actMechanics11(s,p,m){let i=Number.isInteger(m.island)?m.island:p.island,a=s.islands[i];if(a)initializeMechanics(s,a,i);let removed=m.type==='demolish'&&a?.plots.find(b=>b.x===m.fromX&&b.y===m.fromY);if(removed?.worker?.carried){let g=recipes[removed.kind].out;if(a.stock[g]+removed.worker.carried>capacity(a))throw Error('Taşınan yükü depoya koymak için yer aç');}actPrevious(s,p,m);if(removed){for(let [g,n] of Object.entries(removed.output||{})){a.stock[g]=(a.stock[g]||0)+n;}if(removed.worker?.carried)a.stock[removed.extract||recipes[removed.kind].out]+=removed.worker.carried;}if(a){syncLocations(a);if(['build','move','demolish','road'].includes(m.type))reroute(a,i);}}
export const CATEGORIES=['Tarım','Hayvancılık','Balıkçılık','Metalürji','Denizcilik','Lojistik','Üretim','Şehir'];
const techRows=[
['farming','Tarım bilgisi',0,1,[],{wood:35,stone:20},'Çiftlik üretimi %25 hızlanır'],['irrigation','Sulama',0,2,['farming','mining'],{tools:10,stone:50},'Verimlilik +%15'],['agronomy','İleri tarım',0,3,['irrigation','machinery'],{machines:8,tools:25},'Verimlilik +%30'],
['breeding','Koyun yetiştiriciliği',1,1,[],{wood:25,food:20},'Yün üretimi +%15'],['husbandry','İleri hayvancılık',1,2,['breeding','farming'],{tools:10,clothes:15},'Çiftlik döngüsü hızlanır'],['ranching','Büyük çiftlikler',1,3,['husbandry','irrigation'],{steel:20,tools:20},'Yün üretimi +%30'],
['fishing','Balıkçılık bilgisi',2,1,[],{wood:25,stone:15},'Balık üretimi +%15'],['nets','Gelişmiş ağlar',2,2,['fishing','breeding'],{yarn:25,tools:10},'Balık üretimi +%25'],['aquaculture','Su ürünleri',2,3,['nets','machinery'],{machines:10,steel:20},'Balık üretimi +%40'],
['mining','Derin madencilik',3,1,[],{wood:50,stone:50,iron:20},'Kömür ve demirci'],['steel','Metalürji II',3,2,['mining','craft'],{iron:40,coal:30},'Kalay, çelik, seviye 2 maden'],['machinery','Metalürji III',3,3,['steel','engineering'],{steel:40,copper:30},'Gümüş, makine, seviye 3 maden'],
['navigation','Denizcilik',4,1,[],{wood:60,clothes:10},'Koloni seferleri'],['cartography','Haritacılık',4,2,['navigation','mining'],{tools:15,clothes:20},'Tek yön 50 saniye, kapasite 30'],['logistics','Deniz lojistiği',4,3,['cartography','steel'],{steel:20,tools:15},'Tek yön 40 saniye, kapasite 40'],
['hauling','Kara taşımacılığı',5,1,[],{wood:30,stone:20},'At yükü 25'],['wagons','Büyük arabalar',5,2,['hauling','craft'],{tools:20,iron:20},'At yükü 35'],['distribution','Dağıtım ağı',5,3,['wagons','engineering'],{steel:25,machines:5},'At yükü 50'],
['craft','Zanaatkârlık',6,1,[],{wood:30,stone:25},'Atölyeler +%10 hızlı'],['engineering','Mühendislik',6,2,['craft','mining'],{tools:20,copper:20},'Atölyeler +%20 hızlı'],['industry','Sanayi',6,3,['engineering','machinery'],{machines:15,steel:30},'Atölyeler +%35 hızlı'],
['council','Şehir meclisi',7,1,[],{food:30,clothes:10},'Şehir siparişlerinden +%10 altın'],['commerce','Ticaret loncası',7,2,['council','navigation'],{tools:20,clothes:25},'Şehir siparişlerinden +%20 altın'],['academy','Akademi',7,3,['commerce','engineering'],{machines:10,silver:15},'Araştırma süresi %25 kısa']];
for(let id of Object.keys(technologies))delete technologies[id];for(let [id,name,cat,level,requires,cost,unlock] of techRows)technologies[id]={name,branch:CATEGORIES[cat],level,requires,cost,unlock,time:level*90,rp:(level-1)*15};
for(let [g,p] of Object.entries({tin:12,silver:30,bronze:28,silverware:70})){if(!goods.includes(g))goods.push(g);basePrices[g]=p;}
Object.assign(recipes,{bronz:{out:'bronze',inputs:{tin:1,copper:2},tech:'steel'},gumusisleme:{out:'silverware',inputs:{silver:2,coal:1},tech:'machinery'}});
export function mountainDeposits(island,index){
  return [
    {good:'iron'},
    ...(island.resource==='copper'?[{good:'copper'}]:[]),
    {good:'coal',tech:'mining'},
    index%2===0?{good:'tin',tech:'steel',mineLevel:2}:{good:'silver',tech:'machinery',mineLevel:3}
  ];
}

export function mineralChoices(island,index,building){
  const output=recipes[building.kind]?.out;
  if(!['demir','bakir','komur'].includes(building.kind))return output?[output]:[];
  return [output,...mountainDeposits(island,index).filter(deposit=>deposit.mineLevel&&
    (building.level||1)>=deposit.mineLevel&&island.tech.includes(deposit.tech)).map(deposit=>deposit.good)];
}
export function fleetCapacity(a){return transportStats(a).capacity;}
function economyInit(s,a,i){a.horses ||= [{id:'h1',x:a.depot.x,y:a.depot.y}];a.buyListings ||= {};a.needs ||= {food:20,clothes:10,tools:8};a.cityLevel ??=0;if(!a.listings){a.listings={};if(a.ai)seedMarket(s,a);}for(let g of goods){a.stock[g] ??=0;a.depot.stock[g] ??=0;}if(a.economyVersion!==2){for(let b of a.plots)for(let [g,n] of Object.entries(b.output||{}))a.stock[g]=Math.max(0,a.stock[g]-n);for(let d of a.deliveries||[])if(d.amount)a.stock[d.good]=(a.stock[d.good]||0)+d.amount;a.deliveries=[];a.economyVersion=2;syncLocations(a);}}
export function migrate(old){
  const world=migrateMechanics11(old);
  world.islands.forEach((island,index)=>{
    economyInit(world,island,index);
    island.playerProgress ??= {level:1,xp:0,goldEarned:0};
    initializeCity(island);
    for(const listing of Object.values(island.listings)){
      if(listing.reserved)listing.autoBuyAt ??=world.tick+180;
    }
    if(!island.cityConsumedAt&&world.tick>=30&&Object.values(island.citySupply).some(amount=>amount>0)){
      island.cityConsumedAt=world.tick-world.tick%30;
    }
    island.universityLevel ??=0;
    if(island.universityLevel)island.universityNextTick ??= world.tick+60;
    if(island.ai && !island.basicIndustryReady){
      establishAIIndustry(island,index);
      initializeMechanics(world,island,index);
      reroute(island,index);
      seedMarket(world,island);
    }
  });
  for(const good of goods)world.trader.stock[good] ??=100;
  return world;
}
export function act(s,p,m){let i=Number.isInteger(m.island)?m.island:p.island,a=s.islands[i],home=s.islands[p.island];if(a){initializeMechanics(s,a,i);economyInit(s,a,i);}if(m.type==='acceptTask'||m.type==='completeTask'){actPlayerTask(s,p,m);return;}
if(m.type==='cityUpgrade'){upgradeCity(s,p,i,m.level);return;}
if(m.type==='universityUpgrade'){upgradeUniversity(s,p,i,m.level);return;}
if(m.type==='setListing'||m.type==='removeListing'){manageListing(s,p,i,m);return;}
if(m.type==='buyListing'){buyListing(s,p,m);return;}
if(m.type==='setBuyListing'||m.type==='removeBuyListing'){manageBuyListing(s,p,i,m);return;}
if(m.type==='fillBuyListing'){fillBuyListing(s,p,m);return;}
if(m.type==='demolish'){let b=a?.plots.find(b=>b.x===m.fromX&&b.y===m.fromY);if(b){if(b.kind==='liman'&&a.plots.filter(plot=>plot.kind==='liman').length===1&&(Object.keys(a.listings).length||Object.keys(a.buyListings||{}).length))throw Error('Son limanı yıkmadan önce pazar ilanlarını kaldır');let refund=demolitionRefund(b);for(let bag of [b.output,b.inventory])for(let [g,n] of Object.entries(bag||{}))refund[g]=(refund[g]||0)+n;if(b.worker?.carried){let g=b.extract||recipes[b.kind].out;refund[g]=(refund[g]||0)+b.worker.carried;}for(let [g,n] of Object.entries(refund))if((a.stock[g]||0)+n>capacity(a))throw Error('İade ürünleri için depoda yer aç');}}if(m.type==='buyHorse'){if(!owning(s,p,i))throw Error('Kendi adanı seç');if(a.horses.length>=20)throw Error('En fazla 20 at');let cost=horsePrice(a);if(a.money<cost)throw Error(cost+' altın gerekli');a.money-=cost;a.horses.push({id:'horse'+s.nextId++,x:a.depot.x,y:a.depot.y});return;}
if(m.type==='extract'){if(!owning(s,p,i))throw Error('Kendi adanı seç');let b=a.plots.find(b=>b.x===m.x&&b.y===m.y),tech={...a,tech:home.tech};if(!b||!mineralChoices(tech,i,b).includes(m.good))throw Error('Teknoloji, maden seviyesi veya yerel kaynak uygun değil');if(b.worker?.carried)throw Error('İşçi yükünü teslim etsin');b.extract=m.good;delete b.worker;return;}
if(m.type==='tradeMission'){let target=s.islands[m.target],g=m.good,n=m.amount;if(!target||target===home||!target.owner||!goods.includes(g)||!Number.isInteger(n)||n<1||n>20)throw Error('Geçersiz ticaret siparişi');if(!port(home)||!port(target))throw Error('İki adada liman gerekli');let sh=s.ships.find(sh=>sh.owner===p.island&&sh.stage==='home'&&!sh.enabled&&!sh.contract&&!sh.mission&&!sh.expedition&&!loadCount(sh));if(!sh)throw Error('Ana limanda boş, durdurulmuş gemi gerekli');if((target.needs[g]||0)<n||home.stock[g]<n)throw Error('İhtiyaç veya depodaki ürün yetersiz');let reward=Math.ceil(basePrices[g]*1.5)*n;if(target.money<reward)throw Error('Alıcı adanın altını yetersiz');home.stock[g]-=n;target.needs[g]-=n;target.money-=reward;sh.load[g]=n;sh.to=m.target;sh.stage='out';sh.progress=0;sh.mission={good:g,amount:n,reward};syncLocations(home);return;}
actMechanics11(s,p,m);if(m.type==='research'&&home.tech.includes('academy'))home.research.remaining=Math.ceil(home.research.remaining*.75);}

export const cityTiers = [
  {name:'Köy', population:50, minimum:10, demand:{food:6, wood:2, stone:1, clothes:1, tools:1}},
  {name:'Kasaba', population:120, minimum:90, demand:{food:9, wood:3, stone:2, clothes:2, tools:1}, cost:{wood:40, stone:30, food:25, clothes:8}},
  {name:'Şehir', population:260, minimum:200, demand:{food:13, wood:5, stone:3, clothes:3, tools:2}, cost:{wood:80, stone:60, food:45, clothes:20, tools:12}},
  {name:'Büyük liman şehri', population:500, minimum:400, demand:{food:18, wood:7, stone:5, clothes:5, tools:3}, cost:{stone:110, food:80, clothes:35, steel:25, machines:10}},
  {name:'Ticaret merkezi',population:750,minimum:640,demand:{food:22,wood:8,stone:6,clothes:6,tools:4},cost:{wood:140,food:110,bronze:30,beams:20}},
  {name:'Sanayi şehri',population:1050,minimum:880,demand:{food:27,wood:10,stone:7,clothes:7,tools:5},cost:{stone:160,clothes:60,machines:25,precisionParts:16}},
  {name:'Bölge merkezi',population:1450,minimum:1220,demand:{food:33,wood:12,stone:9,clothes:9,tools:6},cost:{food:160,beams:40,engines:14,industrialEquipment:12}},
  {name:'Büyükşehir',population:1950,minimum:1650,demand:{food:40,wood:15,stone:12,clothes:11,tools:8},cost:{stone:220,clothes:80,fineTextiles:35,vehicles:8}},
  {name:'Metropol',population:2600,minimum:2200,demand:{food:48,wood:19,stone:14,clothes:13,tools:10},cost:{food:240,steel:120,industrialEquipment:35,powerUnits:12}},
  {name:'Dünya şehri',population:3500,minimum:2900,demand:{food:58,wood:23,stone:18,clothes:16,tools:13},cost:{stone:300,fineTextiles:60,vehicles:30,automation:12}}
];

export function cityTier(island){
  return cityTiers[island.cityLevel] || cityTiers[0];
}

export const cityShortageDuration=300;

export function cityOrderGoods(island){
  return Object.fromEntries(Object.entries(island.order.goods)
    .map(([good,amount])=>[good,Math.ceil(amount*(5+island.cityLevel)/5)]));
}

export function cityOrderReward(island){
  const bonus=(island.tech.includes('commerce')?20:island.tech.includes('council')?10:0)+3*advancedLevels(island,'Şehir');
  return Math.floor(island.order.reward*(100+bonus)*(5+island.cityLevel)/500);
}

function initializeCity(island){
  island.cityPopulation ??= cityTier(island).population;
  island.cityShortageUntil ??= null;
}

function consumeCityNeeds(island,tick){
  initializeCity(island);
  const tier=cityTier(island);
  island.cityConsumedAt=tick;
  island.citySupply={};
  let satisfied=true;
  for(const [good,demand] of Object.entries(tier.demand)){
    const amount=Math.min(demand,island.stock[good]);
    island.stock[good]-=amount;
    island.citySupply[good]=amount;
    if(amount<demand)satisfied=false;
  }
  if(satisfied){
    island.cityShortageUntil=null;
    island.cityPopulation=Math.min(tier.population,island.cityPopulation+Math.ceil(tier.population*.05));
    return;
  }
  island.cityShortageUntil ??= tick+cityShortageDuration;
  if(tick<island.cityShortageUntil)return;
  island.cityShortageUntil=tick+cityShortageDuration;
  island.cityPopulation=Math.max(cityTiers[0].minimum,island.cityPopulation-Math.ceil(tier.population*.10));
  if(island.cityLevel>0&&island.cityPopulation<tier.minimum){
    island.cityLevel--;
    island.cityPopulation=Math.min(island.cityPopulation,cityTier(island).population);
  }
}

function upgradeCity(world, player, index, level){
  if(!owning(world,player,index))throw Error('Kendi şehrini seç');
  const island=world.islands[index];
  const next=cityTiers[island.cityLevel+1];
  if(!next || level!==island.cityLevel+1)throw Error('Şehir kademesi değişti');
  pay(island,next.cost);
  island.cityLevel++;
  island.cityPopulation=next.population;
  gainXP(world,player.island,'cityUpgrade');
  syncLocations(island);
}

function manageListing(world,player,index,message){
  const island=world.islands[index];
  if(!island || !owning(world,player,index) || !port(island))throw Error('Kendi limanını seç');
  const good=message.good;
  if(!goods.includes(good))throw Error('Geçerli bir ürün seç');
  const previous=island.listings[good];
  const available=island.stock[good]+(previous?.reserved?previous.quantity:0);
  if(message.type==='removeListing'){
    if(previous?.reserved&&available>capacity(island))throw Error('İlan stoğunu geri almak için depoda yer aç');
    if(previous?.reserved)island.stock[good]=available;
    delete island.listings[good];
    syncLocations(island);
    return;
  }
  const quantity=integer(message.quantity,40);
  const gold=integer(message.gold,9999);
  if(!quantity || !gold)throw Error('Miktar ve toplam fiyat en az 1 olmalı');
  if(available<quantity)throw Error('İlan için depoda yeterli ürün yok');
  if(available-quantity>capacity(island))throw Error('Fazla ürünleri geri almak için depoda yer aç');
  island.stock[good]=available-quantity;
  island.listings[good]={id:world.nextId++,good,quantity,gold,reserved:true,autoBuyAt:world.tick+180};
  syncLocations(island);
}

function seedMarket(world,island){
  if(!port(island))return;
  for(const good of new Set(['wood','stone','iron',island.resource])){
    if(island.listings[good] || island.stock[good]<10)continue;
    island.listings[good]={id:world.nextId++,good,quantity:10,gold:price(island,good,true)*10};
  }
}

function buyListing(world,player,message){
  const buyer=world.islands[player.island];
  const seller=Number.isInteger(message.target) && world.islands[message.target];
  if(!seller?.owner || owning(world,player,message.target) || !port(buyer) || !port(seller))
    throw Error('Satın almak için iki ayrı adada liman gerekli');
  const listing=Object.values(seller.listings).find(offer=>offer.id===message.id);
  if(!listing)throw Error('İlan değişti veya satıldı');
  if(buyer.money<listing.gold)throw Error('Yeterli altın yok');
  if(!listing.reserved&&seller.stock[listing.good]<listing.quantity)throw Error('Satıcının deposunda yeterli ürün yok');
  const ship=marketShip(world,player.island,listing.quantity);
  if(!ship)throw Error('Ana limanda bu yüke uygun boş ve durdurulmuş gemi gerekli');

  // Ayırılan yük ve altın seferle birlikte kaydedilir. Satıcı limanına varınca takas tamamlanır.
  buyer.money-=listing.gold;
  if(!listing.reserved)seller.stock[listing.good]-=listing.quantity;
  delete seller.listings[listing.good];
  ship.purchase={...listing};
  ship.portOrder={offerId:listing.id,target:message.target,good:listing.good,quantity:listing.quantity,delivered:false};
  ship.to=message.target;
  ship.stage='out';
  ship.progress=0;
  ship.status='Satıcı limanına gidiyor';
  syncLocations(seller);
}

function manageBuyListing(world,player,index,message){
  const island=world.islands[index];
  if(!island||!owning(world,player,index)||!port(island))throw Error('Kendi limanını seç');
  const good=message.good;
  if(!goods.includes(good))throw Error('Geçerli bir ürün seç');
  const available=island.money+(island.buyListings[good]?.gold||0);
  if(message.type==='removeBuyListing'){
    island.money=available;
    delete island.buyListings[good];
    return;
  }
  const quantity=integer(message.quantity,40);
  const gold=integer(message.gold,9999);
  if(!quantity||!gold)throw Error('Miktar ve toplam fiyat en az 1 olmalı');
  if(available<gold)throw Error('İlan için yeterli altın yok');
  island.money=available-gold;
  island.buyListings[good]={id:world.nextId++,good,quantity,gold};
}

function fillBuyListing(world,player,message){
  const seller=world.islands[player.island];
  const buyer=Number.isInteger(message.target)&&world.islands[message.target];
  if(!buyer?.owner||owning(world,player,message.target)||!port(seller)||!port(buyer))
    throw Error('Satış için iki ayrı adada liman gerekli');
  const listing=Object.values(buyer.buyListings).find(offer=>offer.id===message.id);
  if(!listing)throw Error('Alım ilanı değişti veya karşılandı');
  if(seller.stock[listing.good]<listing.quantity)throw Error('Depoda yeterli ürün yok');
  const ship=marketShip(world,player.island,listing.quantity);
  if(!ship)throw Error('Ana limanda yüke uygun boş ve durdurulmuş gemi gerekli');
  seller.stock[listing.good]-=listing.quantity;
  ship.load[listing.good]=listing.quantity;
  ship.to=message.target;
  ship.stage='out';
  ship.progress=0;
  ship.status='Alım ilanının limanına gidiyor';
  ship.mission={good:listing.good,amount:listing.quantity,reward:listing.gold,marketOrder:true};
  delete buyer.buyListings[listing.good];
  syncLocations(seller);
}

function marketShip(world,owner,quantity){
  return world.ships.find(ship=>ship.owner===owner&&ship.stage==='home'&&!ship.enabled&&
    !ship.contract&&!ship.mission&&!ship.purchase&&!ship.expedition&&!loadCount(ship)&&
    (ship.capacity||20)>=quantity);
}

export function transportStats(island){
  const tech=island.tech;
  const advanced=advancedLevels(island,'Lojistik');
  if(tech.includes('motorTransport'))return {name:'Motorlu yük aracı',capacity:100+10*advanced,speed:2.5+.12*advanced,mode:'motor'};
  if(tech.includes('distribution'))return {name:'Ağır at arabası',capacity:50,speed:1.6,mode:'wagon'};
  if(tech.includes('wagons'))return {name:'At arabası',capacity:35,speed:1.35,mode:'wagon'};
  if(tech.includes('hauling'))return {name:'Yük atı',capacity:25,speed:1.15,mode:'horse'};
  return {name:'Yük atı',capacity:20,speed:1,mode:'horse'};
}

Object.assign(technologies,{
  combustion:{name:'İçten yanmalı motor',branch:'Lojistik',level:4,requires:['distribution','industry','machinery'],cost:{machines:30,steel:60,copper:40},rp:60,time:480,unlock:'Motor tasarımı ve motor atölyesi'},
  motorTransport:{name:'Motorlu taşımacılık',branch:'Lojistik',level:5,requires:['combustion','logistics','academy'],cost:{engines:8,steel:90,tools:60},rp:90,time:600,unlock:'Filo motorlu yük araçlarına geçer · 100 ürün, 2,5× hız'}
});
technologies.hauling.unlock='Yük atı · 25 ürün, 1,15× hız';
technologies.wagons.unlock='At arabası · 35 ürün, 1,35× hız';
technologies.distribution.unlock='Ağır at arabası · 50 ürün, 1,6× hız';
goods.push('engines');
basePrices.engines=130;
recipes.motorAtolyesi={out:'engines',inputs:{machines:2,steel:3,copper:2},tech:'combustion'};

export function productionSources(good){
  const sources=Object.entries(recipes).filter(([,recipe])=>recipe.out===good)
    .map(([kind,recipe])=>({kind,inputs:recipe.inputs || (recipe.input?{[recipe.input]:1}:{}),tech:recipe.tech}));
  if(good==='tin')sources.push({kind:'mine',inputs:{},tech:'steel',note:'Seviye 2 maden ve kalay yatağı olan ada gerekir.'});
  if(good==='silver')sources.push({kind:'mine',inputs:{},tech:'machinery',note:'Seviye 3 maden ve gümüş yatağı olan ada gerekir.'});
  return sources;
}

export const universityTiers = [
  null,
  {name:'Üniversite',cityLevel:1,points:3,cost:{wood:60,stone:50,clothes:10}},
  {name:'Araştırma üniversitesi',cityLevel:2,points:6,cost:{wood:80,stone:75,tools:18,copper:15}},
  {name:'İleri araştırma üniversitesi',cityLevel:3,points:10,cost:{stone:110,steel:30,machines:12}}
];

function upgradeUniversity(world,player,index,level){
  if(index!==player.island)throw Error('Üniversite ana şehirde kurulabilir');
  const island=world.islands[index];
  const next=universityTiers[level];
  if(!next||level!==(island.universityLevel||0)+1)throw Error('Üniversite seviyesi değişti');
  if(island.cityLevel<next.cityLevel)throw Error(cityTiers[next.cityLevel].name+' seviyesine ulaş');
  pay(island,next.cost);
  if(!island.universityLevel)island.universityNextTick=world.tick+60;
  island.universityLevel=level;
  syncLocations(island);
}

// Metal and machine production remains reachable before the materials needed for higher university tiers.
for(const id of ['agronomy','ranching','aquaculture','machinery','logistics','distribution','industry','academy']){
  technologies[id].university=1;
}
technologies.combustion.university=2;
technologies.motorTransport.university=3;

// New technologies extend each branch in order while retaining IDs in existing saves.
const advancedBranches={
  'Tarım':[
    ['fieldRotation','Ekim nöbeti'],['soilAnalysis','Toprak analizi'],['greenhouses','Seralar'],
    ['precisionIrrigation','Hassas sulama'],['seedLab','Tohum laboratuvarı'],
    ['managedEnvironment','Kontrollü iklim'],['smartFarming','Akıllı tarım']
  ],
  'Hayvancılık':[
    ['feedPlanning','Yem planlaması'],['breedingRecords','Sürü kayıtları'],['animalHealth','Hayvan sağlığı'],
    ['woolGrading','Yün sınıflandırma'],['managedHerds','Sürü yönetimi'],
    ['fiberLab','Lif laboratuvarı'],['advancedBreeding','İleri ıslah']
  ],
  'Balıkçılık':[
    ['stockMonitoring','Balık stoku takibi'],['deepFishing','Açık deniz balıkçılığı'],['coldHandling','Soğuk muhafaza'],
    ['marineNursery','Balık kuluçkahaneleri'],['waterQuality','Su kalitesi yönetimi'],
    ['marineLab','Deniz araştırmaları'],['smartFishery','Akıllı balıkçılık']
  ],
  'Metalürji':[
    ['structuralMetals','Yapısal metal işleme','profilAtolyesi'],['precisionCasting','Hassas döküm','parcaAtolyesi'],
    ['heatTreatment','Isıl işlem'],['industrialAlloys','Endüstriyel alaşımlar'],
    ['materialTesting','Malzeme testleri'],['powderMetallurgy','Toz metalürjisi'],['advancedMaterials','İleri malzemeler']
  ],
  'Denizcilik':[
    ['harborSignals','Liman işaretleri'],['cargoPlanning','Yük planlaması'],['reinforcedHull','Güçlendirilmiş gövdeler'],
    ['portCranes','Liman vinçleri'],['marineNavigation','Deniz seyrüseferi'],
    ['containerFleet','Konteyner filosu'],['smartPorts','Akıllı limanlar']
  ],
  'Lojistik':[
    ['loadPlanning','Yük dağıtım planı'],['motorFleet','Motorlu filo yönetimi'],['freightHubs','Aktarma merkezleri'],
    ['routePlanning','Güzergâh planlama'],['smartFleet','Akıllı yük filosu']
  ],
  'Üretim':[
    ['textileFinishing','Kumaş terbiyesi','kumasAtolyesi'],['mechanizedProduction','Mekanize üretim','ekipmanFabrikasi'],
    ['assemblyLines','Montaj hatları','aracFabrikasi'],['electromechanics','Elektromekanik','gucFabrikasi'],
    ['industrialControl','Endüstriyel kontrol','otomasyonFabrikasi'],['qualitySystems','Kalite sistemleri'],
    ['smartFactory','Akıllı fabrikalar']
  ],
  'Şehir':[
    ['publicWorks','Bayındırlık'],['urbanPlanning','Kent planlaması'],['municipalServices','Belediye hizmetleri'],
    ['regionalMarkets','Bölgesel pazarlar'],['researchNetworks','Araştırma ağları'],
    ['metropolitanGovernance','Metropol yönetimi'],['worldCityNetwork','Dünya kentleri ağı']
  ]
};

export const advancedProducts={
  beams:{name:'Yapı profili',building:'profilAtolyesi',label:'Profil atölyesi',color:'#5e8491',price:85,inputs:{iron:2,steel:2,tools:1}},
  precisionParts:{name:'Hassas parça',building:'parcaAtolyesi',label:'Hassas parça atölyesi',color:'#7a829d',price:110,inputs:{copper:2,coal:1,steel:2,bronze:1}},
  fineTextiles:{name:'İşlenmiş kumaş',building:'kumasAtolyesi',label:'Kumaş atölyesi',color:'#965f85',price:55,inputs:{wool:2,yarn:2,clothes:1}},
  industrialEquipment:{name:'Sanayi ekipmanı',building:'ekipmanFabrikasi',label:'Ekipman fabrikası',color:'#6f8059',price:145,inputs:{wood:2,tools:2,machines:1,beams:1}},
  vehicles:{name:'Yük aracı',building:'aracFabrikasi',label:'Araç fabrikası',color:'#976447',price:220,inputs:{iron:2,engines:1,precisionParts:2,beams:1}},
  powerUnits:{name:'Güç ünitesi',building:'gucFabrikasi',label:'Güç ünitesi fabrikası',color:'#91834c',price:260,inputs:{copper:2,coal:1,engines:1,industrialEquipment:1}},
  automation:{name:'Otomasyon sistemi',building:'otomasyonFabrikasi',label:'Otomasyon fabrikası',color:'#507e77',price:320,inputs:{silver:1,copper:2,powerUnits:1,precisionParts:2}}
};

const advancedEffects={
  'Tarım':'Çiftlik üretim hızı +4 puan',
  'Hayvancılık':'Yün üretim hızı +7 puan',
  'Balıkçılık':'Balık üretim hızı +7 puan',
  'Metalürji':'Metal atölyelerinin üretim hızı +7 puan',
  'Denizcilik':'Gemi kapasitesi +5 · Tek yön yolculuk −2 sn',
  'Lojistik':'Araç kapasitesi +10 · Hız +0,12×',
  'Üretim':'Atölyelerin üretim hızı +7 puan',
  'Şehir':'Sipariş altın bonusu +3 puan · Araştırma süresi kısalır'
};
for(const [good,product] of Object.entries(advancedProducts)){
  goods.push(good);
  basePrices[good]=product.price;
}
const researchMaterials=[
  {steel:35,tools:20},{steel:45,bronze:15},{beams:20,tools:25},
  {precisionParts:16,beams:20},{precisionParts:24,machines:20},
  {industrialEquipment:20,precisionParts:24},{vehicles:10,industrialEquipment:20}
];
for(const [branch,nodes] of Object.entries(advancedBranches)){
  let [previous,base]=Object.entries(technologies).filter(([,tech])=>tech.branch===branch).at(-1);
  for(const [id,name,building] of nodes){
    const level=base.level+1;
    const unlock=building&&Object.entries(advancedProducts).find(([,product])=>product.building===building);
    const requires=[previous];
    if(id==='mechanizedProduction')requires.push('structuralMetals');
    if(id==='assemblyLines')requires.push('precisionCasting','combustion');
    if(id==='electromechanics')requires.push('assemblyLines');
    if(id==='industrialControl')requires.push('electromechanics');
    if(unlock){
      const [good,product]=unlock;
      recipes[building]={out:good,inputs:product.inputs,tech:id};
    }
    technologies[id]=base={name,branch,level,requires,extension:true,
      cost:{...researchMaterials[level-4]},time:level*100,rp:level*15,
      university:Math.min(3,Math.floor((level-1)/2)),
      unlock:(unlock?unlock[1].label+' açılır · ':'')+advancedEffects[branch]};
    previous=id;
  }
}
for(const tech of Object.values(technologies)){
  tech.cityLevel=Math.max(0,tech.level-(tech.level>=9?1:2));
  if(tech.level>=3)tech.cost.gold=60*(tech.level-2);
}
for(const [level,tier] of cityTiers.entries())if(level>=3)tier.cost.gold=100*(level-2);
universityTiers[2].cost.gold=120;
universityTiers[3].cost.gold=250;

function advancedLevels(island,branch){
  return island.tech.reduce((count,id)=>count+Number(technologies[id]?.branch===branch&&!!technologies[id].extension),0);
}

export function voyageSeconds(island){
  return island.tech.includes('logistics')?40-2*advancedLevels(island,'Denizcilik'):island.tech.includes('cartography')?50:60;
}

function seaCapacity(island){
  return island.tech.includes('logistics')?40+5*advancedLevels(island,'Denizcilik'):
    island.tech.includes('cartography')?30:20;
}


const constructionCosts={
  oduncu:{wood:10,stone:4},tas:{wood:8,stone:6},balik:{wood:12,stone:3},
  koyun:{wood:16,stone:6},iplik:{wood:12,stone:8},terzi:{wood:14,stone:8,yarn:4},
  liman:{wood:18,stone:12},demir:{wood:14,stone:10},bakir:{wood:16,stone:12},
  demirci:{wood:18,stone:14,iron:6},komur:{wood:16,stone:12,tools:3},
  celik:{wood:24,stone:28,iron:16},makine:{wood:24,stone:24,steel:14,tools:8},
  bronz:{wood:18,stone:22,tools:6},gumusisleme:{wood:20,stone:24,tools:8,steel:6},
  motorAtolyesi:{wood:30,stone:30,steel:20,machines:8},
  profilAtolyesi:{wood:24,stone:26,steel:12,tools:6},
  parcaAtolyesi:{wood:25,stone:28,steel:14,bronze:8},
  kumasAtolyesi:{wood:24,stone:18,tools:6,clothes:8},
  ekipmanFabrikasi:{wood:36,stone:34,beams:8,machines:6},
  aracFabrikasi:{wood:42,stone:40,beams:12,precisionParts:6},
  gucFabrikasi:{wood:44,stone:42,steel:24,industrialEquipment:6},
  otomasyonFabrikasi:{wood:48,stone:48,beams:14,powerUnits:5}
};

export function buildingCost(kind){return constructionCosts[kind]||{wood:10,stone:5};}

export function demolitionRefund(building){
  const original=building.builtCost||{wood:10,stone:5};
  return Object.fromEntries(Object.entries(original).filter(([,amount])=>amount>=2)
    .map(([good,amount])=>[good,Math.floor(amount/2)]));
}


export function systemSaleGold(offer){
  return Math.min(offer.gold,offer.quantity);
}

function updateTimedRewards(world){
  for(const island of world.islands){
    if(!Number.isInteger(island.controller))continue;
    for(const [good,offer] of Object.entries(island.listings)){
      if(!offer.reserved||offer.autoBuyAt===undefined||world.tick<offer.autoBuyAt)continue;
      const gold=systemSaleGold(offer);
      delete island.listings[good];
      island.money+=gold;
      island.systemSale={id:offer.id,good,quantity:offer.quantity,gold};
    }
  }
  for(const player of world.players){
    const island=world.islands[player.island];
    if(island.playerTask?.expiresAt<=world.tick)delete island.playerTask;
    if(world.tick%300!==0||island.playerTask)continue;
    const sequence=Math.floor(world.tick/300)+player.island;
    const good=['wood','stone','food','iron','wool','clothes','tools']
      .filter(g=>['wood','stone','food'].includes(g)||island.stock[g]>=6||
        island.plots.some(building=>(building.extract||recipes[building.kind]?.out)===g));
    const product=good[(sequence-1)%good.length];
    const amount=8+island.cityLevel*2+sequence%5;
    island.playerTask={id:world.nextId++,good:product,amount,
      gold:Math.ceil(basePrices[product]*amount*1.5),expiresAt:world.tick+300};
  }
}

function actPlayerTask(world,player,message){
  const island=world.islands[player.island];
  const task=island?.playerTask;
  if(!task||task.id!==message.id||world.tick>=task.expiresAt)throw Error('Görev sona erdi');
  if(message.type==='acceptTask'){
    if(task.accepted)throw Error('Görev zaten kabul edildi');
    task.accepted=true;
    task.expiresAt=world.tick+180;
    return;
  }
  if(!task.accepted)throw Error('Önce görevi kabul et');
  pay(island,{[task.good]:task.amount});
  island.money+=task.gold;
  delete island.playerTask;
}
