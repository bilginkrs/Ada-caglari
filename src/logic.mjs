export function land(x,y,i=0){if(x<0||y<0||x>35||y>35)return false;if(x>=25&&x<=33&&y>=25&&y<=33)return true;let dx=(x-17.5)/18,dy=(y-17.5)/18,angle=Math.atan2(dy,dx);return Math.hypot(dx,dy)<1+.07*Math.sin(angle*3+i)+.05*Math.cos(angle*5+i*2)}
export function fertility(i){return [100,115,80,130,90,120,75,110,95,125][i]||100}
export function terrain(x,y,i=0,a=null){const override=a?.terrainOverrides?.[x+','+y];if(override)return override;if(!land(x,y,i))return 'sea';if([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>!land(x+dx,y+dy,i)))return 'coast';if(x>=27&&y>=27&&x<=32&&y<=32)return 'city';let lx=18+(i%3)*3,ly=8+(i%2)*3;if((x-lx)**2/12+(y-ly)**2/6<1)return 'lake';let mx=22-(i%3)*2,my=17+(i%2)*3;if(x>=mx&&x<=mx+5&&y>=my&&y<=my+4)return 'mountain';let fx=5+(i%4)*2,fy=13+(i%3)*3;if(x>=fx&&x<=fx+4&&y>=fy&&y<=fy+5)return 'forest';let rx=14+(i%3),ry=24-(i%2)*2;if(x>=rx&&x<=rx+3&&y>=ry&&y<=ry+2)return 'rock';return 'grass'}
export function capacity(a){return 500+(a.storageLevel||0)*250;}
export function upgradeCost(level){return {wood:40*(level+1),stone:30*(level+1)};}
export const technologies={mining:{name:'Derin madencilik',cost:{wood:50,stone:50,iron:20},requires:[],unlock:'Kömür madeni'},steel:{name:'Çelik işleme',cost:{wood:80,iron:40,coal:30},requires:['mining'],unlock:'Çelik atölyesi ve çelik'},machinery:{name:'Makine mühendisliği',cost:{steel:40,copper:30,wood:100},requires:['steel'],unlock:'Makine atölyesi ve makine'}};
export function occupied(a,x,y){return a.plots.find(b=>x>=b.x&&y>=b.y&&x<b.x+(b.size||1)&&y<b.y+(b.size||1));}
export function resourceTarget(kind,t){return kind==='oduncu'?t==='forest':kind==='tas'?t==='rock':['demir','bakir','komur'].includes(kind)?t==='mountain':false;}
export function workPath(b,island=0,a={plots:[],roads:[]}){if(!['oduncu','tas','demir','bakir','komur'].includes(b.kind))return null;return weightedPath(a,island,{x:b.x,y:b.y},(x,y)=>resourceTarget(b.kind,terrain(x,y,island,a))&&!occupied(a,x,y),[b]);}
export function cycleLength(b){return Math.max(2,Math.ceil((b.path?Math.max(1,b.path.length-1)*2+4:b.kind==='koyun'?Math.max(2,Math.round(4*100/(b.fertility||100))):4)/(1+.25*((b.level||1)-1))*(b.roadFactor||1)));}
export function pay(a,cost){for(let [g,n] of Object.entries(cost))if((a.stock[g]||0)<n)throw Error('Yetersiz malzeme');for(let [g,n] of Object.entries(cost))a.stock[g]-=n;}
export function validBuild(a,kind,x,y,i=0){if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>35||y>35)throw Error('Ada üzerinde bir kare seç.');const size=kind==='koyun'?2:1;for(let dx=0;dx<size;dx++)for(let dy=0;dy<size;dy++){let tx=x+dx,ty=y+dy;if(tx>35||ty>35)throw Error('Çiftlik için 2×2 boş kare gerekli.');if(tx===26&&ty===26)throw Error('Bu kare ada deposuna ayrılmış');if(occupied(a,tx,ty))throw Error('Bu alan dolu.');const t=terrain(tx,ty,i,a);if(kind==='balik'){if(['sea','lake','mountain','city'].includes(t)||!nearWater(a,i,tx,ty))throw Error('Balıkçı deniz veya tatlı su kıyısında olmalı');}else if(kind==='liman'){if(t!=='coast')throw Error('Limanı kıyıya kur.');}else if(['sea','lake','mountain','city','coast'].includes(t))throw Error('Bu arazi inşaata uygun değil.');}}
export const goods=['wood','stone','food','wool','yarn','clothes','iron','copper','coal','steel','machines','tools'];
export const recipes={demirci:{out:'tools',inputs:{iron:2,wood:1},tech:'mining'},komur:{out:'coal',tech:'mining'},celik:{out:'steel',inputs:{iron:2,coal:1},tech:'steel'},makine:{out:'machines',inputs:{steel:2,copper:1},tech:'machinery'},liman:{},oduncu:{out:'wood'},tas:{out:'stone'},balik:{out:'food'},koyun:{out:'wool'},iplik:{out:'yarn',input:'wool'},terzi:{out:'clothes',input:'yarn'},demir:{out:'iron'},bakir:{out:'copper'}};
export const basePrices={wood:3,stone:4,food:4,wool:5,yarn:8,clothes:14,iron:9,copper:10,coal:7,steel:24,machines:65,tools:22};
export function price(a,g,buy=false){return Math.max(1,Math.round(basePrices[g]*(1.3-Math.min(1,(a.stock[g]||0)/200)*.5)*(buy?1.1:.9)))}
const zero=()=>Object.fromEntries(goods.map(g=>[g,0]));
export function order(a){let n=a.ordersDone||0;return {goods:n%3===0?{food:30,clothes:10}:n%3===1?{clothes:6}:a.tech.includes('mining')?{tools:8,food:20}:{wood:25,stone:15},reward:n%3===0?120:n%3===1?160:170,remaining:600}}
function migrateBase(old){let s=old||{tick:0,players:[],ships:[],islands:['Mercan','Defne','Sedef','Poyraz','Zümrüt','Kum','Çınar','Lale','Mavi','Gümüş'].map((name,i)=>({name,resource:i%2?'copper':'iron',stock:{...zero(),wood:60,stone:60,food:40},plots:[],buildings:[],owner:null}))};let upgrade=s.version!==6;s.islands.forEach((a,i)=>{a.plots ||= (a.buildings||[]).map((kind,j)=>({kind,x:2+j%9,y:2+Math.floor(j/9),size:1}));a.storageLevel ||=0;a.productionLevel ||=0;a.tech ||= [];a.stock={...zero(),...a.stock};a.money ??=400;a.ordersDone ||=0;a.order ||=order(a);a.market ??=false;a.citySupply ??={food:0,clothes:0};a.terrainOverrides ||= {};a.fertility=fertility(i);for(let b of a.plots){b.size ||=b.kind==='koyun'?2:1;b.phase ||=0;b.fertility=a.fertility;if(upgrade){for(let dx=-1;dx<=b.size;dx++)for(let dy=-1;dy<=b.size;dy++){let x=b.x+dx,y=b.y+dy;if(x>=0&&x<36&&y>=0&&y<36&&['sea','lake','mountain','city','coast'].includes(terrain(x,y,i)))a.terrainOverrides[x+','+y]='grass';}if(b.kind==='liman')a.terrainOverrides[b.x+','+b.y]='coast';}b.path=workPath(b,i,a);}});s.trader ||= {name:'Gezgin tüccar',stock:Object.fromEntries(goods.map(g=>[g,200])),money:10000};s.contracts ||= [];s.nextId ||=1;for(let sh of s.ships){if(!sh.load){sh.load=zero();if(sh.cargo>0&&goods.includes(sh.cargoGood||sh.good))sh.load[sh.cargoGood||sh.good]=sh.cargo;sh.stage=sh.back?'return':sh.progress>0?'out':'home';sh.enabled=false;}sh.stage ||= 'home';sh.amount ??=10;sh.buyAmount ??=10;sh.buy ||=s.islands[sh.from].resource==='iron'?'copper':'iron';sh.good ||= 'wood';sh.minStock ??=20;sh.minSell ??=0;sh.maxBuy ??=999;sh.status ||= 'Limanda';sh.progress ||=0;sh.capacity ||=20;for(const good of goods)sh.load[good] ??=0;}s.version=6;return s}
export function loadCount(sh){return Object.values(sh.load).reduce((a,b)=>a+b,0)}
function port(a){return a.plots.some(b=>b.kind==='liman')}
function integer(n,max=9999){if(!Number.isInteger(n)||n<0||n>max)throw Error('Geçersiz miktar');return n}
function unload(a,sh,g,n=Infinity){let q=Math.max(0,Math.min(n,sh.load[g]||0,capacity(a)-a.stock[g]));a.stock[g]+=q;sh.load[g]-=q;return q}
function load(a,sh,g,n){let q=Math.max(0,Math.min(n,a.stock[g],(sh.capacity||20)-loadCount(sh)));a.stock[g]-=q;sh.load[g]+=q;return q}
function actBase(s,p,m){let a=s.islands[p.island];
 if(m.type==='build'){let r=recipes[m.kind];if(!r)throw Error('Bilinmeyen bina');if(r.tech&&!a.tech.includes(r.tech))throw Error('Önce teknolojiyi araştır');if(['demir','bakir'].includes(m.kind)&&r.out!==a.resource)throw Error('Bu adada bu maden yok');validBuild(a,m.kind,m.x,m.y,p.island);pay(a,{wood:10,stone:5});let b={kind:m.kind,x:m.x,y:m.y,size:m.kind==='koyun'?2:1,phase:0,fertility:a.fertility};b.path=workPath(b,p.island,a);a.plots.push(b);return;}
 if(m.type==='move'||m.type==='demolish'){let b=a.plots.find(b=>b.x===m.fromX&&b.y===m.fromY);if(!b)throw Error('Bina bulunamadı');if(b.kind==='liman'&&a.plots.filter(b=>b.kind==='liman').length===1&&s.ships.some(sh=>sh.from===p.island||sh.to===p.island))throw Error('Filo bu limanı kullanıyor. Önce ikinci bir liman kur');if(m.type==='move'){let other={...a,plots:a.plots.filter(q=>q!==b)};validBuild(other,b.kind,m.x,m.y,p.island);b.x=m.x;b.y=m.y;b.path=workPath(b,p.island,a);b.phase=0;}else{if(a.stock.wood+5>capacity(a)||a.stock.stone+2>capacity(a))throw Error('İade için depoda 5 odun ve 2 taş yeri aç');a.stock.wood+=5;a.stock.stone+=2;a.plots=a.plots.filter(q=>q!==b);}return;}
 if(m.type==='storageUpgrade'){if(a.storageLevel>=10)throw Error('En yüksek depo seviyesi');pay(a,upgradeCost(a.storageLevel));a.storageLevel++;return;}
 if(m.type==='productionUpgrade'){if(a.productionLevel>=5)throw Error('En yüksek üretim seviyesi');pay(a,upgradeCost(a.productionLevel+1));a.productionLevel++;return;}
 if(m.type==='research'){let t=technologies[m.id];if(!t||a.research||a.rp<(t.rp||0)||a.tech.includes(m.id)||!t.requires.every(k=>a.tech.includes(k)))throw Error('Araştırma koşulları karşılanmıyor');pay(a,t.cost);a.research={id:m.id,remaining:t.time||90};a.rp-=t.rp||0;return;}
 if(m.type==='deliverOrder'){pay(a,a.order.goods);a.money+=a.order.reward;a.rp+=10;a.ordersDone++;a.order=order(a);return;}
 if(m.type==='market'){a.market=!!m.enabled;return;}
 if(m.type==='trader'){if(s.mode!=='test')throw Error('Gezgin tüccar yalnızca test modunda');let g=m.good,n=integer(m.amount,100);if(!goods.includes(g)||n<1)throw Error('Ürün ve miktar seç');let t=s.trader,u=price(t,g,!!m.buy);if(m.buy){if(t.stock[g]<n||a.money<u*n||a.stock[g]+n>capacity(a))throw Error('Stok, para veya depo kapasitesi yetersiz');t.stock[g]-=n;a.stock[g]+=n;a.money-=u*n;t.money+=u*n;}else{if(a.stock[g]<n||t.money<u*n)throw Error('Stok veya tüccarın parası yetersiz');a.stock[g]-=n;t.stock[g]+=n;a.money+=u*n;t.money-=u*n;}return;}
 if(m.type==='ship'){if(!a.plots.some(b=>b.kind==='liman'&&b.x===m.x&&b.y===m.y))throw Error('Limanı seç');pay(a,{wood:30,stone:10});s.ships.push({owner:p.island,from:p.island,to:1-p.island,good:'wood',buy:a.resource==='iron'?'copper':'iron',amount:10,buyAmount:10,minStock:20,minSell:0,maxBuy:999,load:zero(),stage:'home',progress:0,back:false,capacity:20,enabled:false,status:'Rota bekliyor'});return;}
 if(m.type==='route'){let sh=s.ships[m.id];if(!sh||sh.owner!==p.island||sh.contract)throw Error('Gemi bulunamadı veya takasa ayrıldı');if(sh.stage!=='home'||loadCount(sh))throw Error('Gemi boş olarak limana dönünce rota değiştirilebilir');if(!goods.includes(m.good)||!goods.includes(m.buy)||!s.islands[m.to]||m.to===p.island||!port(s.islands[m.to])||!s.islands[m.to].owner)throw Error('Ürünleri ve yerleşik hedef limanı seç');for(let k of ['amount','buyAmount','minStock','minSell','maxBuy'])integer(m[k],k==='amount'||k==='buyAmount'?20:9999);Object.assign(sh,...['to','good','buy','amount','buyAmount','minStock','minSell','maxBuy'].map(k=>({[k]:m[k]})),{enabled:!!m.enabled});return;}
 if(m.type==='stopShip'){let sh=s.ships[m.id];if(!sh||sh.owner!==p.island)throw Error('Gemi bulunamadı');sh.enabled=false;return;}
 if(m.type==='offer'){let q=s.players.find(q=>q.island===m.to);if(!q||m.to===p.island||!goods.includes(m.give)||!goods.includes(m.receive)||m.give===m.receive)throw Error('Geçersiz takas');integer(m.giveN,20);integer(m.receiveN,20);if(!m.giveN||!m.receiveN)throw Error('Miktar en az 1');if(s.contracts.filter(c=>c.status==='pending').length>=10)throw Error('Bekleyen teklifleri sonuçlandır');s.contracts.push({id:s.nextId++,from:p.island,to:m.to,give:m.give,receive:m.receive,giveN:m.giveN,receiveN:m.receiveN,status:'pending'});return;}
 if(m.type==='reply'){let c=s.contracts.find(c=>c.id===m.id&&c.to===p.island&&c.status==='pending');if(!c)throw Error('Teklif bulunamadı');if(!m.accept){c.status='rejected';return;}let src=s.islands[c.from],sh=s.ships.find(sh=>sh.owner===c.from&&!sh.contract&&!sh.enabled&&sh.stage==='home'&&!loadCount(sh));if(!sh||!port(a)||!port(src))throw Error('İki liman ve teklif sahibinin boş, durdurulmuş gemisi gerekli');if(a.stock[c.receive]<c.receiveN||src.stock[c.give]<c.giveN)throw Error('Takas ürünleri yetersiz');a.stock[c.receive]-=c.receiveN;c.escrow=c.receiveN;src.stock[c.give]-=c.giveN;sh.load[c.give]=c.giveN;sh.contract=c.id;sh.to=c.to;sh.stage='out';sh.progress=0;sh.enabled=false;c.status='shipping';return;}
 throw Error('Bilinmeyen işlem');}
export function shipTick(s,sh){let a=s.islands[sh.from],b=s.islands[sh.to];if(!a||!b)return;let c=s.contracts.find(c=>c.id===sh.contract);sh.back=sh.stage==='return';sh.cargo=loadCount(sh);
 if(sh.stage==='home'){for(let g of goods)unload(a,sh,g);if(loadCount(sh)){sh.status='Depo dolu · yük gemide bekliyor';return;}if(c){c.status='done';delete sh.contract;}if(!sh.enabled){sh.status='Limanda';return;}if(!port(a)||!port(b)||(!b.market&&(!Number.isInteger(a.controller)||b.controller!==a.controller))){sh.status='Hedef liman / ticaret izni bekleniyor';return;}load(a,sh,sh.good,Math.min(sh.amount,Math.max(0,a.stock[sh.good]-sh.minStock)));sh.stage='out';sh.progress=0;sh.status='Yola çıktı';return;}
 if(sh.stage==='out'||sh.stage==='return'){sh.status=sh.stage==='out'?'Gidiş':'Dönüş';if(++sh.progress>=(a.tech.includes('logistics')?20:30)){sh.stage=sh.stage==='out'?'dock':'home';sh.progress=0;}return;}
 if(sh.stage==='dock'&&sh.purchase){
   const purchase=sh.purchase;
   b.money+=purchase.gold;
   sh.load[purchase.good]=(sh.load[purchase.good]||0)+purchase.quantity;
   delete sh.purchase;
   sh.stage='return';sh.progress=0;sh.status='Satın alınan yük dönüyor';
   return;
 }
 if(sh.stage==='dock'&&sh.mission){let m=sh.mission;sh.status='İhtiyaç siparişi teslim ediliyor';if(b.stock[m.good]+m.amount>capacity(b))return;b.stock[m.good]+=m.amount;sh.load[m.good]-=m.amount;a.money+=m.reward;delete sh.mission;sh.stage='return';sh.progress=0;return;}if(sh.stage==='dock'){sh.status='Boşaltma / yükleme';if(++sh.progress<4)return;sh.progress=0;if(c){if(b.stock[c.give]+c.giveN>capacity(b)){sh.status='Hedef depo dolu · takas yükü bekliyor';return;}unload(b,sh,c.give,c.giveN);sh.load[c.receive]+=c.escrow;c.escrow=0;c.status='returning';}else if(b.controller===a.controller&&b.controller!==null){for(let g of goods)unload(b,sh,g);load(b,sh,sh.buy,sh.buyAmount);}else if(b.market&&port(b)){let g=sh.good,u=price(b,g,false),n=u>=sh.minSell?Math.min(sh.load[g],Math.max(0,capacity(b)-b.stock[g]),Math.floor(b.money/u)):0;unload(b,sh,g,n);b.money-=n*u;a.money+=n*u;u=price(b,sh.buy,true);if(u<=sh.maxBuy){n=load(b,sh,sh.buy,Math.min(sh.buyAmount,Math.floor(a.money/u)));a.money-=n*u;b.money+=n*u;}}sh.stage='return';sh.back=true;}
}
function tickBase(s){s.tick++;s.islands.forEach(a=>{if(!a.owner)return;productionTick(s,a,s.islands.indexOf(a));if(--a.order.remaining<=0)a.order=order(a);if(s.tick%30===0){const demand=cityTier(a).demand;let food=Math.min(demand.food,a.stock.food),clothes=Math.min(demand.clothes,a.stock.clothes);a.stock.food-=food;a.stock.clothes-=clothes;a.citySupply={food,clothes};a.money+=Math.floor((food*3+clothes*12)*(a.tech.includes('commerce')?1.2:a.tech.includes('council')?1.1:1));}});for(let sh of s.ships)shipTick(s,sh);if(s.mode==='test'&&s.tick%60===0){for(let g of goods)s.trader.stock[g]=Math.min(300,s.trader.stock[g]+10);s.trader.money=Math.min(15000,s.trader.money+200);}}
export function publicState(s,p,running){return {...s,players:s.players.map(({name,island})=>({name,island})),you:p.island,running}}
Object.assign(technologies,{
 farming:{name:'Tarım bilgisi',cost:{wood:35,stone:20},requires:[],unlock:'Verimli çiftçilik · koyun üretimi %25 hızlı',time:90,rp:0,branch:'Tarım'},
 husbandry:{name:'İleri hayvancılık',cost:{wood:60,clothes:15,tools:10},requires:['farming','mining'],unlock:'Çiftliklerde ilave %25 hız',time:180,rp:20,branch:'Tarım'},
 navigation:{name:'Denizcilik',cost:{wood:60,clothes:10},requires:[],unlock:'Koloni seferleri',time:120,rp:0,branch:'Denizcilik'},
 logistics:{name:'Deniz lojistiği',cost:{steel:20,tools:15},requires:['navigation','steel'],unlock:'Deniz yolculuğu 30 → 20 saniye',time:180,rp:25,branch:'Denizcilik'}
});for(let [id,t] of Object.entries(technologies)){t.branch ||= 'Metalürji';t.time ||= {mining:90,steel:150,machinery:240}[id]||90;t.rp ??=id==='mining'?0:id==='steel'?10:25;}
function migrateDepth(old){let s=migrateBase(old);for(let g of goods)s.trader.stock[g] ??=200;s.players.forEach(p=>{let a=s.islands[p.island];a.controller ??=p.island});s.islands.forEach(a=>{a.controller ??=null;a.roads ||= [];a.rp ??=0;a.research ||=null;for(let b of a.plots)b.level ||=1;});return s}
export function upgradeBuildingCost(b){return {wood:20*(b.level||1),stone:15*(b.level||1),...(b.level>=2?{tools:5*b.level}:{})}}
function owning(s,p,i){return i===p.island||s.islands[i]?.controller===p.island}
function actDepth(s,p,m){let i=Number.isInteger(m.island)?m.island:p.island,a=s.islands[i],home=s.islands[p.island];if(m.type==='colonize'){if(!a||a.owner||i<2)throw Error('Boş bir ada seç');if(!home.tech.includes('navigation'))throw Error('Denizcilik araştırması gerekli');let sh=s.ships.find(sh=>sh.owner===p.island&&sh.stage==='home'&&!sh.enabled&&!sh.contract&&!loadCount(sh));if(!sh||!port(home))throw Error('Ana limanda boş ve durdurulmuş gemi gerekli');if(home.money<200)throw Error('200 altın gerekli');pay(home,{wood:60,stone:40,tools:10});home.money-=200;sh.expedition={to:i,remaining:45};sh.stage='expedition';sh.status='Koloni seferi';return;}
if(!owning(s,p,i))throw Error('Bu ada sana ait değil');if(m.type==='road'){if(!Number.isInteger(m.x)||!Number.isInteger(m.y)||!['grass','forest','rock'].includes(terrain(m.x,m.y,i,a))||occupied(a,m.x,m.y))throw Error('Yola uygun boş kara seç');let k=m.x+','+m.y;if(a.roads.includes(k))throw Error('Yol zaten var');pay(a,{stone:1});a.roads.push(k);return;}
if(m.type==='buildingUpgrade'){let b=a.plots.find(b=>b.x===m.x&&b.y===m.y);if(!b||!recipes[b.kind]?.out||b.level>=5)throw Error('Yükseltilebilir üretim binası seç (en fazla 5)');pay(a,upgradeBuildingCost(b));b.level=(b.level||1)+1;return;}
if(i!==p.island&&['research','deliverOrder','offer','reply','trader'].includes(m.type))throw Error('Bu işlemi ana adadan yap');if(i!==p.island&&['ship','route'].includes(m.type))throw Error('Gemiler ana limandan yönetilir');let ownTech=a.tech;a.tech=home.tech;try{actBase(s,{...p,island:i},m)}finally{if(i!==p.island)a.tech=ownTech;}}
function tickDepth(s){for(let a of s.islands){let home=s.islands[a.controller]||a;for(let b of a.plots){let road=b.path?.length?b.path.filter(p=>a.roads.includes(p.join(','))).length/b.path.length:0;b.roadFactor=1-road*.4;if(b.kind==='koyun')b.roadFactor*=home.tech.includes('husbandry')?.5:home.tech.includes('farming')?.75:1;}if(a.research&&--a.research.remaining<=0){a.tech.push(a.research.id);a.research=null;}}
let expeditions=s.ships.filter(sh=>sh.expedition);for(let sh of expeditions){sh.status='Koloni seferi · '+sh.expedition.remaining+' sn';if(--sh.expedition.remaining<=0){let a=s.islands[sh.expedition.to];if(!a.owner){a.owner=s.islands[sh.owner].owner+' · Koloni';a.controller=sh.owner;a.market=false;a.stock={...a.stock,wood:40,stone:30,food:20};let found=false;for(let y=0;y<36&&!found;y++)for(let x=0;x<36&&!found;x++)if(terrain(x,y,sh.expedition.to,a)==='coast'){a.plots.push({kind:'liman',x,y,size:1,level:1,phase:0});found=true;}}else{let h=s.islands[sh.owner];for(let [g,n] of Object.entries({wood:60,stone:40,tools:10}))h.stock[g]+=n;h.money+=200;}delete sh.expedition;sh.stage='home';}}
let saved=s.ships;s.ships=saved.filter(sh=>!sh.expedition);tickBase(s);s.ships=saved;for(let a of s.islands){if(a.owner&&s.tick%30===0){let tool=Math.min(cityTier(a).demand.tools,a.stock.tools);a.stock.tools-=tool;a.money+=tool*18;if(a.citySupply.food===cityTier(a).demand.food)a.rp++;a.citySupply.tools=tool;}for(let b of a.plots){let r=recipes[b.kind];if(!r?.out)continue;b.rate=60*(1+a.productionLevel)/cycleLength(b);b.status=b.path&&b.path.length===0?'Kaynağa yol yok':a.stock[r.out]>=capacity(a)?'Depo dolu':!Object.entries(r.inputs||(r.input?{[r.input]:1}:{})).every(([g,n])=>(b.inventory?.[g]||0)>=n*(1+a.productionLevel))?'Atlı hammadde teslimatı bekleniyor':'Çalışıyor';}}
}
export function transportPath(a,i,from,to){return weightedPath(a,i,from,(x,y)=>x===to.x&&y===to.y,[from,to]);}
function addAI(s){if(s.aiInitialized)return;s.aiInitialized=true;let count=0;for(let i=2;i<10&&count<2;i++){let a=s.islands[i];if(!a||a.owner)continue;a.owner=['Kaptan Leyla','Tüccar Arda'][count++];a.ai=true;a.controller='ai'+i;a.market=true;a.money=800;a.stock.wood=100;a.stock.stone=100;a.tech=['mining'];aiBuild(s,a,i,'liman');aiBuild(s,a,i,'oduncu');aiBuild(s,a,i,'tas');}}
function aiBuild(s,a,i,kind){if(a.stock.wood<10||a.stock.stone<5)return false;for(let y=1;y<35;y++)for(let x=1;x<35;x++)try{validBuild(a,kind,x,y,i);a.stock.wood-=10;a.stock.stone-=5;let b={kind,x,y,size:kind==='koyun'?2:1,level:1,phase:0,fertility:a.fertility};b.path=workPath(b,i,a);a.plots.push(b);return true}catch{}return false}
function migratePrevious(old){let s=migrateDepth(old);s.nextBuildingId ||=1;s.islands.forEach(a=>{a.deliveries ||= [];for(let b of a.plots){b.id ||= 'b'+s.nextBuildingId++;b.inventory ||= {};}});addAI(s);return s}
export function tick(s){s.nextBuildingId ||=1;for(let [i,a] of s.islands.entries()){initializeMechanics(s,a,i);economyInit(s,a,i);syncLocations(a);advanceDeliveries(s,a,i);dispatchDeliveries(s,a,i);if(a.owner&&s.tick%180===0){a.needs={food:20,clothes:10,tools:8};if(a.ai)seedMarket(s,a);}if(a.ai&&s.tick%30===0){let sequence=['balik',i%2?'bakir':'demir','koyun','iplik','terzi','komur','demirci','oduncu','tas'];if(a.plots.length<24)aiBuild(s,a,i,sequence[Math.max(0,a.plots.length-3)%sequence.length]);}}tickDepth(s);for(let sh of s.ships){let a=s.islands[sh.owner];if(a)sh.capacity=a.tech.includes('logistics')?40:a.tech.includes('cartography')?30:20;}for(let a of s.islands){syncLocations(a);for(let b of a.plots){if(b.kind==='balik'&&!nearWater(a,s.islands.indexOf(a),b.x,b.y))b.status='Balıkçı su kenarında olmalı';else if(Object.values(b.output||{}).some(n=>n>=50))b.status='Tesis çıkışı dolu · At bekleniyor';b.recent=(b.recent||[]).filter(e=>s.tick-e.tick<60);b.actual=b.recent.reduce((n,e)=>n+e.amount,0);if(b.worker){b.status=stageLabel(b.worker.stage);let walk=(b.path||[]).slice(1).reduce((n,p)=>n+(a.roads.includes(p.join(','))?.5:1),0);b.rate=60*(1+a.productionLevel)/Math.max(1,walk*2+Math.ceil(4/(1+.25*((b.level||1)-1)))+1);}}}}

function actPrevious(s,p,m){let a=s.islands[Number.isInteger(m.island)?m.island:p.island],b=m.type==='demolish'&&a?.plots.find(b=>b.x===m.fromX&&b.y===m.fromY),inv=b?{...b.inventory}:{};if(b)for(let [g,n] of Object.entries(inv))if(a.stock[g]+n+(g==='wood'?5:g==='stone'?2:0)>capacity(a))throw Error('Tesisin hammaddelerini iade etmek için depoda yer aç');actDepth(s,p,m);if(b)for(let [g,n] of Object.entries(inv))a.stock[g]+=n;}
export function weightedPath(a,i,from,goal,allow=[]){let open=[[from.x,from.y]],dist=new Map([[from.x+','+from.y,0]]),prev=new Map,closed=new Set;const allowed=new Set(allow.filter(Boolean).map(b=>b.id||b));while(open.length){open.sort((u,v)=>dist.get(u.join(','))-dist.get(v.join(',')));let [x,y]=open.shift(),key=x+','+y;if(closed.has(key))continue;closed.add(key);if(goal(x,y)){let path=[[x,y]];while(prev.has(key)){let p=prev.get(key);path.unshift(p);key=p.join(',')}return path;}for(let [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){let nx=x+dx,ny=y+dy,k=nx+','+ny;if(nx<0||ny<0||nx>35||ny>35)continue;let t=terrain(nx,ny,i,a),building=occupied(a,nx,ny);if(building&&!allowed.has(building.id||building))continue;if(['sea','lake','mountain','city'].includes(t)&&!goal(nx,ny))continue;let cost=(a.roads||[]).includes(k)?.5:1,d=dist.get(key)+cost;if(d<(dist.get(k)??Infinity)){dist.set(k,d);prev.set(k,[x,y]);open.push([nx,ny]);}}}return [];}
const inputsOf=b=>recipes[b.kind]?.inputs||(recipes[b.kind]?.input?{[recipes[b.kind].input]:1}:{});
export const stageLabel=stage=>({out:'Kaynağa gidiyor',work:'Kaynakta çalışıyor',back:'Yükle dönüyor',deliver:'Teslim ediyor',blocked:'Yol / kaynak bekliyor',waiting:'Hammadde bekliyor',full:'Depo dolu'}[stage]||stage);
function initializeMechanics(s,a,i){a.deliveries ||= [];a.depot ||= {x:26,y:26,stock:{...a.stock}};for(let b of a.plots){b.id ||= 'b'+s.nextBuildingId++;b.inventory ||= {};b.output ||= {};b.recent ||= [];}if(!a.locationReady){a.depot.stock={...a.stock};for(let b of a.plots)b.output={};a.locationReady=true;}}
function sources(a){return [{id:'depot',x:a.depot.x,y:a.depot.y,stock:a.depot.stock},...a.plots.map(b=>({id:b.id,x:b.x,y:b.y,stock:(b.output ||= {}),building:b}))];}
function syncLocations(a){if(a.depot)a.depot.stock={...a.stock};}
function position(entity){let path=entity.path||[],n=Math.min(path.length-1,Math.floor(entity.progress||0));return path[n]||[entity.x||0,entity.y||0];}
function travel(entity,a,speed=1){if(!entity.path?.length)return false;let left=speed;while(left>0&&entity.progress<entity.path.length-1){let n=Math.floor(entity.progress),next=entity.path[n+1],cost=a.roads.includes(next.join(','))?.5:1,need=(n+1-entity.progress)*cost;if(left>=need){entity.progress=n+1;left-=need}else{entity.progress+=left/cost;left=0;}}return entity.progress>=entity.path.length-1;}
function routeWorker(a,i,b,w,back=false){let [x,y]=position(w),from={x,y},path=back?weightedPath(a,i,from,(x,y)=>x===b.x&&y===b.y,[b]):weightedPath(a,i,from,(x,y)=>resourceTarget(b.kind,terrain(x,y,i,a))&&!occupied(a,x,y),[b]);w.x=x;w.y=y;w.path=path;w.progress=0;w.stage=path.length?(back?'back':'out'):'blocked';}
function produced(s,a,b,n){let out=b.extract||recipes[b.kind].out;b.output[out]=(b.output[out]||0)+n;b.recent.push({tick:s.tick,amount:n});}
function productionTick(s,a,i){for(let b of a.plots){b.inventory ||= {};b.output ||= {};b.recent ||= [];let baseRecipe=recipes[b.kind],r=baseRecipe&&{...baseRecipe,out:b.extract||baseRecipe.out};if(!r?.out)continue;if(b.kind==='balik'&&!nearWater(a,i,b.x,b.y)){b.status='Balıkçı su kenarında olmalı';continue;}let n=1+a.productionLevel,raw=!!resourceTarget(b.kind,'forest')||['tas','demir','bakir','komur'].includes(b.kind);if(raw){let w=b.worker;if(!w){b.path=workPath(b,i,a);w=b.worker={stage:b.path?.length?'out':'blocked',path:b.path||[],progress:0,elapsed:0,carried:0,x:b.x,y:b.y};}if(w.stage==='blocked'){routeWorker(a,i,b,w,!!w.carried);continue;}if(w.stage==='out'){let last=w.path.at(-1);if(!last||!resourceTarget(b.kind,terrain(...last,i,a))){routeWorker(a,i,b,w);continue;}if(travel(w,a)){w.stage='work';w.elapsed=0;}}else if(w.stage==='work'){let last=w.path.at(-1);if(!last||!resourceTarget(b.kind,terrain(...last,i,a))){routeWorker(a,i,b,w);continue;}if(++w.elapsed>=Math.max(1,4/(1+.25*((b.level||1)-1)))){w.carried=n;routeWorker(a,i,b,w,true);}}else if(w.stage==='back'){if(travel(w,a)){w.stage='deliver';w.elapsed=0;}}else if(w.stage==='deliver'){if((b.output[r.out]||0)+w.carried>50)continue;produced(s,a,b,w.carried);w.carried=0;b.path=workPath(b,i,a);w.path=b.path||[];w.progress=0;w.stage=w.path.length?'out':'blocked';}b.phase=0;continue;}
let inp=inputsOf(b);if((b.output[r.out]||0)+n>50){b.status='Tesis çıkışı dolu · At bekleniyor';continue;}if(!Object.entries(inp).every(([g,q])=>(b.inventory[g]||0)>=q*n)){b.status='Atlı teslimat bekleniyor';continue;}let boost=b.kind==='balik'?(a.tech.includes('aquaculture')?1.4:a.tech.includes('nets')?1.25:a.tech.includes('fishing')?1.15:1):b.kind==='koyun'?(a.tech.includes('ranching')?1.3:a.tech.includes('breeding')?1.15:1):(a.tech.includes('industry')?1.35:a.tech.includes('engineering')?1.2:a.tech.includes('craft')?1.1:1);if(a.tech.includes('agronomy'))boost*=1.3;else if(a.tech.includes('irrigation'))boost*=1.15;b.phase=(b.phase||0)+boost;if(b.phase<cycleLength(b))continue;b.phase=0;for(let [g,q] of Object.entries(inp))b.inventory[g]-=q*n;produced(s,a,b,n);}}
export function nearWater(a,i,x,y){return [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>['sea','lake'].includes(terrain(x+dx,y+dy,i,a)));}
export function horsePrice(a){return 100+75*((a.horses?.length||1)-1);}
function endpoint(a,id){return id==='depot'?{...a.depot,id:'depot'}:a.plots.find(b=>b.id===id);}
function taskRoute(a,i,d,target){let [x,y]=position(d),source=endpoint(a,d.from);let path=weightedPath(a,i,{x,y},(x,y)=>x===target.x&&y===target.y,[source,target]);d.x=x;d.y=y;d.path=path;d.progress=0;d.blocked=!path.length;}
function dispatchDeliveries(s,a,i){a.horses ||= [{id:'h1',x:a.depot.x,y:a.depot.y}];let jobs=[];for(let b of a.plots){for(let [g,n] of Object.entries(b.output||{}))if(n>0&&!a.deliveries.some(d=>d.from===b.id&&d.good===g&&d.stage!=='return'))jobs.push({from:b.id,to:'depot',good:g,wanted:fleetCapacity(s.islands[a.controller]||a),last:b.lastPickup||0});for(let [g,n] of Object.entries(inputsOf(b))){let wanted=n*(1+a.productionLevel)*3-(b.inventory[g]||0);if(wanted>0&&a.stock[g]>0&&!a.deliveries.some(d=>d.to===b.id&&d.good===g&&d.stage!=='return'))jobs.push({from:'depot',to:b.id,good:g,wanted,last:b.lastSupply||0});}}jobs.sort((u,v)=>u.last-v.last||u.from.localeCompare(v.from)||u.to.localeCompare(v.to));for(let horse of a.horses){if(a.deliveries.some(d=>d.horseId===horse.id))continue;let job=jobs.shift();if(!job)break;let source=endpoint(a,job.from);if(!source)continue;let from={x:horse.x??a.depot.x,y:horse.y??a.depot.y};let path=weightedPath(a,i,from,(x,y)=>x===source.x&&y===source.y,[source]);if(!path.length)continue;let d={...job,horseId:horse.id,path,progress:0,amount:0,stage:'empty',x:from.x,y:from.y};a.deliveries.push(d);let b=endpoint(a,job.from==='depot'?job.to:job.from);if(b){if(job.from==='depot')b.lastSupply=s.tick+1;else b.lastPickup=s.tick+1;}}}
function advanceDeliveries(s,a,i){for(let d of a.deliveries){let horse=a.horses.find(h=>h.id===d.horseId);if(!horse){a.horses.push({id:d.horseId||'legacy'+a.horses.length});d.horseId=a.horses.at(-1).id;}let source=endpoint(a,d.from),target=endpoint(a,d.to);if(!target&&d.stage==='loaded'){d.to='depot';target=endpoint(a,'depot');taskRoute(a,i,d,target);}if(d.stage==='empty'&&!source){d.stage='return';taskRoute(a,i,d,a.depot);}let goal=d.stage==='empty'?source:d.stage==='return'?a.depot:target;if(!goal)continue;if(d.blocked||!d.path?.length){taskRoute(a,i,d,goal);continue;}if(!travel(d,a,transportStats(s.islands[a.controller]||a).speed))continue;let [x,y]=position(d);let h=a.horses.find(h=>h.id===d.horseId);h.x=x;h.y=y;if(d.stage==='empty'){let stock=d.from==='depot'?a.stock:source.output;let qty=Math.min(fleetCapacity(s.islands[a.controller]||a),d.wanted,stock[d.good]||0);stock[d.good]=(stock[d.good]||0)-qty;if(d.from==='depot')syncLocations(a);d.amount=qty;d.stage=qty?'loaded':'return';taskRoute(a,i,d,qty?target:a.depot);}else if(d.stage==='loaded'){if(d.to==='depot'){let qty=Math.min(d.amount,Math.max(0,capacity(a)-a.stock[d.good]));a.stock[d.good]+=qty;d.amount-=qty;if(d.amount)continue;syncLocations(a);}else{target.inventory ||= {};target.inventory[d.good]=(target.inventory[d.good]||0)+d.amount;d.amount=0;}d.stage='return';taskRoute(a,i,d,a.depot);}else{d.done=true;h.x=a.depot.x;h.y=a.depot.y;}}a.deliveries=a.deliveries.filter(d=>!d.done);}
function reroute(a,i){for(let b of a.plots){b.path=workPath(b,i,a);if(b.worker)routeWorker(a,i,b,b.worker,!!b.worker.carried);}for(let d of a.deliveries){let target=d.stage==='empty'?endpoint(a,d.from):d.stage==='return'?a.depot:endpoint(a,d.to);if(!target){target=a.depot;d.stage=d.amount?'loaded':'return';d.to='depot';}taskRoute(a,i,d,target);}}
function migrateMechanics11(old){let s=migratePrevious(old);s.mechanicsVersion=1;s.islands.forEach((a,i)=>{initializeMechanics(s,a,i);syncLocations(a);for(let b of a.plots)b.path=workPath(b,i,a);reroute(a,i);});return s;}
function actMechanics11(s,p,m){let i=Number.isInteger(m.island)?m.island:p.island,a=s.islands[i];if(a)initializeMechanics(s,a,i);let removed=m.type==='demolish'&&a?.plots.find(b=>b.x===m.fromX&&b.y===m.fromY);if(removed?.worker?.carried){let g=recipes[removed.kind].out;if(a.stock[g]+removed.worker.carried>capacity(a))throw Error('Taşınan yükü depoya koymak için yer aç');}actPrevious(s,p,m);if(removed){for(let [g,n] of Object.entries(removed.output||{})){a.stock[g]=(a.stock[g]||0)+n;}if(removed.worker?.carried)a.stock[removed.extract||recipes[removed.kind].out]+=removed.worker.carried;}if(a){syncLocations(a);if(['build','move','demolish','road'].includes(m.type))reroute(a,i);}}
export const CATEGORIES=['Tarım','Hayvancılık','Balıkçılık','Metalürji','Denizcilik','Lojistik','Üretim','Şehir'];
const techRows=[
['farming','Tarım bilgisi',0,1,[],{wood:35,stone:20},'Çiftlik üretimi %25 hızlanır'],['irrigation','Sulama',0,2,['farming','mining'],{tools:10,stone:50},'Verimlilik +%15'],['agronomy','İleri tarım',0,3,['irrigation','machinery'],{machines:8,tools:25},'Verimlilik +%30'],
['breeding','Koyun yetiştiriciliği',1,1,[],{wood:25,food:20},'Yün üretimi +%15'],['husbandry','İleri hayvancılık',1,2,['breeding','farming'],{tools:10,clothes:15},'Çiftlik döngüsü hızlanır'],['ranching','Büyük çiftlikler',1,3,['husbandry','irrigation'],{steel:20,tools:20},'Yün üretimi +%30'],
['fishing','Balıkçılık bilgisi',2,1,[],{wood:25,stone:15},'Balık üretimi +%15'],['nets','Gelişmiş ağlar',2,2,['fishing','breeding'],{yarn:25,tools:10},'Balık üretimi +%25'],['aquaculture','Su ürünleri',2,3,['nets','machinery'],{machines:10,steel:20},'Balık üretimi +%40'],
['mining','Derin madencilik',3,1,[],{wood:50,stone:50,iron:20},'Kömür ve demirci'],['steel','Metalürji II',3,2,['mining','craft'],{iron:40,coal:30},'Kalay, çelik, seviye 2 maden'],['machinery','Metalürji III',3,3,['steel','engineering'],{steel:40,copper:30},'Gümüş, makine, seviye 3 maden'],
['navigation','Denizcilik',4,1,[],{wood:60,clothes:10},'Koloni seferleri'],['cartography','Haritacılık',4,2,['navigation','mining'],{tools:15,clothes:20},'Gemi kapasitesi 30'],['logistics','Deniz lojistiği',4,3,['cartography','steel'],{steel:20,tools:15},'Yolculuk 20 saniye, kapasite 40'],
['hauling','Kara taşımacılığı',5,1,[],{wood:30,stone:20},'At yükü 25'],['wagons','Büyük arabalar',5,2,['hauling','craft'],{tools:20,iron:20},'At yükü 35'],['distribution','Dağıtım ağı',5,3,['wagons','engineering'],{steel:25,machines:5},'At yükü 50'],
['craft','Zanaatkârlık',6,1,[],{wood:30,stone:25},'Atölyeler +%10 hızlı'],['engineering','Mühendislik',6,2,['craft','mining'],{tools:20,copper:20},'Atölyeler +%20 hızlı'],['industry','Sanayi',6,3,['engineering','machinery'],{machines:15,steel:30},'Atölyeler +%35 hızlı'],
['council','Şehir meclisi',7,1,[],{food:30,clothes:10},'Şehir geliri +%10'],['commerce','Ticaret loncası',7,2,['council','navigation'],{tools:20,clothes:25},'Şehir geliri +%20'],['academy','Akademi',7,3,['commerce','engineering'],{machines:10,silver:15},'Araştırma süresi %25 kısa']];
for(let id of Object.keys(technologies))delete technologies[id];for(let [id,name,cat,level,requires,cost,unlock] of techRows)technologies[id]={name,branch:CATEGORIES[cat],level,requires,cost,unlock,time:level*90,rp:(level-1)*15};
for(let [g,p] of Object.entries({tin:12,silver:30,bronze:28,silverware:70})){if(!goods.includes(g))goods.push(g);basePrices[g]=p;}
Object.assign(recipes,{bronz:{out:'bronze',inputs:{tin:1,copper:2},tech:'steel'},gumusisleme:{out:'silverware',inputs:{silver:2,coal:1},tech:'machinery'}});
export function mineralChoices(a,i,b){let home=a;let out=[recipes[b.kind]?.out];if(['demir','bakir','komur'].includes(b.kind)){if(a.tech.includes('steel')&&(b.level||1)>=2&&i%2===0)out.push('tin');if(a.tech.includes('machinery')&&(b.level||1)>=3&&i%2===1)out.push('silver');}return out.filter(Boolean);}
export function fleetCapacity(a){return transportStats(a).capacity;}
function economyInit(s,a,i){a.horses ||= [{id:'h1',x:a.depot.x,y:a.depot.y}];a.needs ||= {food:20,clothes:10,tools:8};a.cityLevel ??=0;if(!a.listings){a.listings={};if(a.ai)seedMarket(s,a);}for(let g of goods){a.stock[g] ??=0;a.depot.stock[g] ??=0;}if(a.economyVersion!==2){for(let b of a.plots)for(let [g,n] of Object.entries(b.output||{}))a.stock[g]=Math.max(0,a.stock[g]-n);for(let d of a.deliveries||[])if(d.amount)a.stock[d.good]=(a.stock[d.good]||0)+d.amount;a.deliveries=[];a.economyVersion=2;syncLocations(a);}}
export function migrate(old){let s=migrateMechanics11(old);s.islands.forEach((a,i)=>economyInit(s,a,i));for(let g of goods)s.trader.stock[g] ??=100;return s;}
export function act(s,p,m){let i=Number.isInteger(m.island)?m.island:p.island,a=s.islands[i],home=s.islands[p.island];if(a){initializeMechanics(s,a,i);economyInit(s,a,i);}if(m.type==='cityUpgrade'){upgradeCity(s,p,i,m.level);return;}
if(m.type==='setListing'||m.type==='removeListing'){manageListing(s,p,i,m);return;}
if(m.type==='buyListing'){buyListing(s,p,m);return;}
if(m.type==='demolish'){let b=a?.plots.find(b=>b.x===m.fromX&&b.y===m.fromY);if(b){let refund={wood:5,stone:2};for(let bag of [b.output,b.inventory])for(let [g,n] of Object.entries(bag||{}))refund[g]=(refund[g]||0)+n;if(b.worker?.carried){let g=b.extract||recipes[b.kind].out;refund[g]=(refund[g]||0)+b.worker.carried;}for(let [g,n] of Object.entries(refund))if((a.stock[g]||0)+n>capacity(a))throw Error('İade ürünleri için depoda yer aç');}}if(m.type==='buyHorse'){if(!owning(s,p,i))throw Error('Kendi adanı seç');if(a.horses.length>=20)throw Error('En fazla 20 at');let cost=horsePrice(a);if(a.money<cost)throw Error(cost+' altın gerekli');a.money-=cost;a.horses.push({id:'horse'+s.nextId++,x:a.depot.x,y:a.depot.y});return;}
if(m.type==='extract'){if(!owning(s,p,i))throw Error('Kendi adanı seç');let b=a.plots.find(b=>b.x===m.x&&b.y===m.y),tech={...a,tech:home.tech};if(!b||!mineralChoices(tech,i,b).includes(m.good))throw Error('Teknoloji, maden seviyesi veya yerel kaynak uygun değil');if(b.worker?.carried)throw Error('İşçi yükünü teslim etsin');b.extract=m.good;delete b.worker;return;}
if(m.type==='tradeMission'){let target=s.islands[m.target],g=m.good,n=m.amount;if(!target||target===home||!target.owner||!goods.includes(g)||!Number.isInteger(n)||n<1||n>20)throw Error('Geçersiz ticaret siparişi');if(!port(home)||!port(target))throw Error('İki adada liman gerekli');let sh=s.ships.find(sh=>sh.owner===p.island&&sh.stage==='home'&&!sh.enabled&&!sh.contract&&!sh.mission&&!sh.expedition&&!loadCount(sh));if(!sh)throw Error('Ana limanda boş, durdurulmuş gemi gerekli');if((target.needs[g]||0)<n||home.stock[g]<n)throw Error('İhtiyaç veya depodaki ürün yetersiz');let reward=Math.ceil(basePrices[g]*1.5)*n;if(target.money<reward)throw Error('Alıcı adanın altını yetersiz');home.stock[g]-=n;target.needs[g]-=n;target.money-=reward;sh.load[g]=n;sh.to=m.target;sh.stage='out';sh.progress=0;sh.mission={good:g,amount:n,reward};syncLocations(home);return;}
actMechanics11(s,p,m);if(m.type==='research'&&home.tech.includes('academy'))home.research.remaining=Math.ceil(home.research.remaining*.75);}

export const cityTiers = [
  {name:'Köy', population:50, demand:{food:6, clothes:1, tools:1}},
  {name:'Kasaba', population:120, demand:{food:9, clothes:2, tools:1}, cost:{wood:40, stone:30, food:25, clothes:8}},
  {name:'Şehir', population:260, demand:{food:13, clothes:3, tools:2}, cost:{wood:80, stone:60, food:45, clothes:20, tools:12}},
  {name:'Büyük liman şehri', population:500, demand:{food:18, clothes:5, tools:3}, cost:{stone:110, food:80, clothes:35, steel:25, machines:10}}
];

export function cityTier(island){
  return cityTiers[island.cityLevel] || cityTiers[0];
}

function upgradeCity(world, player, index, level){
  if(!owning(world,player,index))throw Error('Kendi şehrini seç');
  const island=world.islands[index];
  const next=cityTiers[island.cityLevel+1];
  if(!next || level!==island.cityLevel+1)throw Error('Şehir kademesi değişti');
  pay(island,next.cost);
  island.cityLevel++;
  syncLocations(island);
}

function manageListing(world,player,index,message){
  const island=world.islands[index];
  if(!island || !owning(world,player,index) || !port(island))throw Error('Kendi limanını seç');
  const good=message.good;
  if(!goods.includes(good))throw Error('Geçerli bir ürün seç');
  if(message.type==='removeListing'){
    delete island.listings[good];
    return;
  }
  const quantity=integer(message.quantity,40);
  const gold=integer(message.gold,9999);
  if(!quantity || !gold)throw Error('Miktar ve toplam fiyat en az 1 olmalı');
  if(island.stock[good]<quantity)throw Error('İlan için depoda yeterli ürün yok');
  island.listings[good]={id:world.nextId++,good,quantity,gold};
}

function seedMarket(world,island){
  if(!port(island))return;
  for(const good of ['wood','stone',island.resource]){
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
  if(seller.stock[listing.good]<listing.quantity)throw Error('Satıcının deposunda yeterli ürün yok');
  const ship=world.ships.find(ship=>ship.owner===player.island && ship.stage==='home' &&
    !ship.enabled && !ship.contract && !ship.mission && !ship.purchase && !ship.expedition &&
    loadCount(ship)===0 && (ship.capacity||20)>=listing.quantity);
  if(!ship)throw Error('Ana limanda bu yüke uygun boş ve durdurulmuş gemi gerekli');

  // Ayırılan yük ve altın seferle birlikte kaydedilir. Satıcı limanına varınca takas tamamlanır.
  buyer.money-=listing.gold;
  seller.stock[listing.good]-=listing.quantity;
  delete seller.listings[listing.good];
  ship.purchase={...listing};
  ship.to=message.target;
  ship.stage='out';
  ship.progress=0;
  ship.status='Satıcı limanına gidiyor';
  syncLocations(seller);
}

export function transportStats(island){
  const tech=island.tech;
  if(tech.includes('motorTransport'))return {name:'Motorlu yük aracı',capacity:100,speed:2.5,mode:'motor'};
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
