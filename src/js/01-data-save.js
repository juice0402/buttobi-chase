(() => {
'use strict';
const $ = id => document.getElementById(id);
const cvs = $('game');
let ctx = cvs.getContext('2d'); // let: the shop borrows the car drawing for its pictures
const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- constants (world units: 10px = 1m) ---------- */
const M = 10, LANE = 46;
let ANCHOR = 0.64;  // where the player's car sits on screen (share of the height); tablets sit a little lower
/* road pieces: each town strings 3-4 of these together. style = how the roadside is drawn */
const AREA_BASE = {
  alley:   {half:46,  road:'#6a6f7b', side:'#a8c49a', opp:{kei:4,car:5,van:1},           same:{kei:5,car:4,van:1},                          gap:84, per:1, oppRate:0.35, tv:[45,70],  ov:[60,90]},
  avenue:  {half:92,  road:'#5b6271', side:'#b6c1cd', opp:{car:4,van:2,bus:1.5,truck:1},  same:{kei:2,car:4,van:2,bus:1.5,truck:1},          gap:62, per:1, oppRate:0.45, tv:[55,90],  ov:[70,110]},
  highway: {half:138, road:'#4c5260', side:'#7dac69', opp:null,                           same:{car:3,van:1.5,bus:1.5,truck:2.5,tanker:1.2}, gap:58, per:2, oppRate:0,    tv:[80,120], ov:[0,0]},
  dirt:    {half:120, road:'#a47c53', side:'#dbbf89', opp:{car:2,truck:3,tanker:2},       same:{car:2,truck:3,tanker:2},                     gap:72, per:1, oppRate:0.5,  tv:[55,85],  ov:[80,120]},
};
const area = (base, o) => Object.assign({}, AREA_BASE[base], o);
/* the four towns. Clear one to open the next. d = metres from the start */
const TOWNS = [
  {name:'はじまりの街', goal:3600, heat:1.1, cap:3, start:1, goalBonus:1500, ranks:[11000, 7000, 3500, 1400],
   boss:{name:'装甲車', color:'#3b4a5e'}, song:'town0',
   areas:[area('alley', {name:'路地', from:0, style:'town'}), area('avenue', {name:'大通り', from:700, style:'avenue'}), area('highway', {name:'高速', from:1900, style:'highway'})],
   isec:[260, 560, 860, 1120, 1380, 1680], rail:[430, 1500], station:[[1000, 1], [1580, -1], [2600, 1], [3250, -1]], crane:[], ice:false,
   bosses:[{from:1450, to:1850, hp:340, money:700, rel:90, every:6.6}, {from:3150, to:3600, hp:560, money:1100, rel:110, every:5.4}]},  // 21回目: heat 0.9→1.1, bosses tougher (しょーくん「適当に走っても1面ボスまでクリアできてしまう」)
  {name:'港の街', goal:4600, heat:1.15, cap:5, start:1, goalBonus:2500, ranks:[25500, 16000, 8500, 3600],
   boss:{name:'装甲トラック', color:'#2d5f86'}, song:'town1',
   areas:[area('avenue', {name:'倉庫街', from:0, half:70, side:'#c3ccd4', style:'port', same:{car:2,van:3,truck:3}, opp:{car:2,van:2,truck:3}}),
          area('avenue', {name:'港通り', from:1200, side:'#b9c2ca', style:'dock'}),
          area('highway', {name:'湾岸の橋', from:2500, road:'#555c69', side:'#3b8ec4', style:'bridge'}),
          area('avenue', {name:'埠頭', from:3700, half:100, side:'#b9c2ca', style:'dock', same:{car:2,van:2,truck:4,tanker:1}, opp:{car:2,truck:3,tanker:1}})],
   isec:[300, 650, 950, 1450, 1950], rail:[800, 3950], station:[[2150, -1], [4250, 1]], crane:[1350, 1700, 2050, 2350, 3850, 4150, 4450], ice:false,
   bosses:[{from:1000, to:1300, hp:300, money:800, rel:90, every:7.0}, {from:2250, to:2600, hp:460, money:1100, rel:100, every:6.2}, {from:4150, to:4600, hp:620, money:1500, rel:115, every:5.4}]},
  {name:'雪の峠', goal:5000, heat:1.25, cap:5, start:1, goalBonus:3500, ranks:[38000, 25000, 14000, 6500],
   boss:{name:'雪上装甲車', color:'#5c7f99'}, song:'town2',
   areas:[area('alley', {name:'ふもとの村', from:0, half:70, road:'#7d838e', side:'#eef3f7', style:'snowtown'}),
          area('alley', {name:'峠道', from:1100, half:52, road:'#767c87', side:'#f2f6f9', style:'pass', tv:[50,75], ov:[60,95], gap:90}),
          area('highway', {name:'雪原の高速', from:2700, half:128, road:'#6a707b', side:'#f0f4f7', style:'snowhw'}),
          area('alley', {name:'山頂', from:4000, half:74, road:'#767c87', side:'#f2f6f9', style:'pass', tv:[50,80], ov:[60,95]})],
   isec:[280, 600, 900], rail:[1800, 3300], station:[[650, 1], [3000, -1], [3600, 1], [4500, -1]], crane:[], ice:true,
   bosses:[{from:780, to:1100, hp:300, money:900, rel:95, every:6.8}, {from:2330, to:2700, hp:450, money:1300, rel:108, every:6.0}, {from:4480, to:5000, hp:640, money:1800, rel:120, every:5.2}]},
  {name:'国境の荒れ地', goal:5600, heat:1.3, cap:5, start:2, goalBonus:5000, ranks:[48000, 33000, 18500, 9000],
   boss:{name:'砂漠の装甲車', color:'#7a6038'}, song:'town3',
   areas:[area('dirt', {name:'荒れ地', from:0, style:'dirt'}),
          area('dirt', {name:'峡谷', from:1500, half:70, road:'#9c7450', side:'#c4683c', style:'canyon'}),
          area('highway', {name:'砂の高速', from:3000, road:'#57524c', side:'#e2c58f', style:'deserthw', same:{car:2,van:1,truck:3,tanker:2.5,bus:1}}),
          area('dirt', {name:'国境', from:4600, half:100, road:'#8e7a62', style:'border'})],
   isec:[], rail:[950, 2650], station:[[700, 1], [1300, -1], [2300, 1], [3450, -1], [3950, 1], [5050, -1]], depot:true, crane:[], ice:false, drums:110,
   bosses:[{from:1250, to:1500, hp:380, money:1000, rel:100, every:6.4}, {from:2750, to:3000, hp:560, money:1400, rel:110, every:5.8}, {from:4300, to:4600, hp:740, money:1900, rel:120, every:5.2},
           {from:5000, to:5600, hp:640, money:3000, rel:128, every:4.6, final:true, name:'要塞トレーラー', w:40, h:96, color:'#4b3f35'}]},
];
let TOWN = TOWNS[0], townI = 0, AREAS = TOWN.areas, BOSSES = TOWN.bosses, GOAL = TOWN.goal;
let ISEC_D = [], RAIL_D = [], STATION_D = [], CRANE_D = [];
function setTown(i){
  townI = clamp(i | 0, 0, TOWNS.length - 1); TOWN = TOWNS[townI];
  AREAS = TOWN.areas; BOSSES = TOWN.bosses; GOAL = TOWN.goal;
  ISEC_D = TOWN.isec; RAIL_D = TOWN.rail; STATION_D = TOWN.station; CRANE_D = TOWN.crane;
}
const TRAFFIC = {
  kei:   {w:16, h:26, m:0.8, tough:80,  colors:['#ffd23f','#9be3c9','#f7f7f2','#f7a1c4']},
  car:   {w:18, h:32, m:1.0, tough:95,  colors:['#4aa3df','#e94f37','#eef0f2','#2d3142','#7bd389']},
  van:   {w:20, h:38, m:1.3, tough:110, colors:['#f5f5f5','#c9d6df','#ffb703']},
  bus:   {w:24, h:62, m:3.0, tough:180, colors:['#2a9d8f','#f4a261','#e76f51']},
  truck: {w:26, h:70, m:3.5, tough:200, colors:['#8d99ae','#ef476f','#06b88a']},
  tanker:{w:28, h:78, m:4.0, tough:200, colors:['#5c7cfa','#e0a030']},
};
const CHASERS = {
  police:{label:'パトカー', w:18, h:32, m:1.3, tough:130, env:85,  wall:70,   rel:60, lat:150, look:70, money:60},
  bike:  {label:'白バイ',   w:10, h:22, m:0.5, tough:60,  env:50,  wall:40,   rel:90, lat:200, look:45, money:40},
  tank:  {label:'戦車',     w:32, h:52, m:5.0, tough:320, env:260, wall:9999, rel:40, lat:70,  look:0,  money:300},
  armor: {label:'装甲車',   w:34, h:66, m:6.0, tough:1e9, env:1e9, wall:1e9,  rel:80, lat:110, look:0,  money:0},
};
/* bosses live in each town (TOWNS[i].bosses): one armored truck near the end of an area; it gives up when you cross into the next area */
const SPIKE_EVERY = [0, 0, 11, 9, 8, 7];   // seconds between spike drops, by ★
const PINCH_EVERY = [0, 0, 0, 15, 12, 10]; // seconds between pincers, by ★ (from ★3)
const HEAT = [
  {max:2, every:6.0, pool:['police']},
  {max:3, every:5.0, pool:['police','bike']},
  {max:4, every:4.2, pool:['police','police','bike']},
  {max:5, every:3.6, pool:['police','bike','police'], heli:true},
  {max:6, every:3.2, pool:['police','bike','tank'], heli:true},
];
/* cars you can own: sp / hd are the shop's 5-step meters; need = a title that has to be earned before it can be bought.
   The order is the save order (save.owned / save.up / save.carBest are indexed by it), so new cars go at the end.
   (11/17 21回目: the kei car became the free first car and swapped places with the sports car; older saves are swapped in useSave, carV) */
const CARS = [
  {name:'軽自動車',           key:'pkei',    w:15, h:27, m:0.8, hp:85,  speed:145, color:'#f7a1c4', price:0,     sp:4, hd:1, short:'小さくて すりぬけ上手'},
  {name:'マッスルカー',       key:'muscle',  w:22, h:38, m:1.7, hp:150, speed:140, color:'#ffc83d', price:1000,   sp:3, hd:3, short:'体当たりが 強い'},
  {name:'ピックアップ',       key:'pickup',  w:24, h:44, m:2.6, hp:210, speed:125, color:'#38c79a', price:3000,  sp:2, hd:4, short:'後ろに ドラム缶をポイ'},
  {name:'スポーツカー',       key:'sports',  w:19, h:34, m:1.0, hp:100, speed:150, color:'#ff5a36', price:5000,  sp:4, hd:1, short:'ニアミスで ニトロ1.5倍'},
  {name:'タクシー',           key:'taxi',    w:19, h:34, m:1.1, hp:120, speed:144, color:'#ffd23f', price:8000,  sp:4, hd:2, short:'コンボが 切れにくい'},
  {name:'現金輸送車',         key:'cash',    w:21, h:40, m:2.0, hp:190, speed:128, color:'#2f6b5a', price:12000,  sp:2, hd:4, short:'クラッシュの コイン+30%'},
  {name:'救急車',             key:'amb',     w:21, h:42, m:1.8, hp:160, speed:136, color:'#f4f6f8', price:18000,  sp:3, hd:3, short:'ボディが 少しずつ回復'},
  {name:'路線バス',           key:'pbus',    w:24, h:60, m:3.2, hp:270, speed:118, color:'#2a9d8f', price:25000, sp:1, hd:4, short:'はさみうちを はじき返す'},
  {name:'消防車',             key:'fire',    w:23, h:54, m:2.8, hp:220, speed:128, color:'#e3261b', price:35000, sp:2, hd:4, short:'爆発が へっちゃら'},
  {name:'ゴミ収集車',         key:'gomi',    w:23, h:50, m:2.8, hp:220, speed:124, color:'#3f9e5a', price:45000, sp:1, hd:4, short:'残骸を すいこんでコインに'},
  {name:'スーパーカー',       key:'super',   w:20, h:36, m:1.0, hp:140, speed:178, color:'#8b5cf6', price:60000, sp:5, hd:1, short:'いちばん 速い'},
  {name:'モンスタートラック', key:'monster', w:28, h:44, m:3.0, hp:260, speed:134, color:'#ff7a1a', price:80000, sp:3, hd:4, short:'小さい車を ペシャンコ'},
  {name:'ロケットカー',       key:'rocket',  w:18, h:44, m:1.2, hp:170, speed:150, color:'#7fd3ff', price:100000, sp:4, hd:2, short:'ニトロが 2倍長い'},
  {name:'ひみつのパトカー',   key:'ppolice', w:18, h:32, m:1.4, hp:190, speed:150, color:'#20242c', price:130000, sp:4, hd:3, short:'パトカーが 気づかない', need:'ram'},
  {name:'戦車',               key:'ptank',   w:32, h:52, m:6.0, hp:360, speed:118, color:'#c8a24a', price:160000, sp:1, hd:5, short:'タックルで びくともしない', need:'boss'},
];
const isSmall = b => b.w <= 22 && b.h <= 40;  // what the monster truck can roll over
const COMBO_T = () => P && P.key === 'taxi' ? 6 : 4;
const CASH_K = () => P && P.key === 'cash' ? 1.3 : 1;
const NITRO_DRAIN = () => P && P.key === 'rocket' ? 14 : 28;
const undercover = () => P && P.key === 'ppolice' && noticeT <= 0;
const DRUM_EVERY = 4.0; // pickup: seconds between drum drops
/* nitro is still invincible, but no longer both the best shield and the best income */
const NITRO_GAIN = 0.75;  // every source of nitro charge is scaled by this (with a 3 s overheat: strong cars clear about half their runs)
const OVERHEAT_T = 3;     // after a nitro ends the gauge stays cold this long (no charging) — the owner chose 3 s
const NITRO_PAY = 0.4;    // coins for whatever nitro itself smashes (ニトロドーン, traffic) — still counted for missions and titles
/* only crashes you cause pay in full: police crashing on their own, far from you, pay a share */
const SELF_K = 0.3, LURE_R = 100; // a crash into traffic / wrecks / road works within LURE_R of you counts as yours
const CAMP_T = 6;         // seconds in about the same lane before the police get pushy
/* how a chaser went down: label and coin multiplier (flashier = more coins) */
const KO = {
  hit:  {l:'テイクダウン！',     k:1.0},
  maki: {l:'まきこみ！',         k:1.3},
  wall: {l:'かべドーン！',       k:1.4},
  spike:{l:'トゲでパンク！',     k:1.4},
  boom: {l:'ドッカーン！',       k:1.6},
  drum: {l:'ドラムかんドーン！', k:1.6},
  pinch:{l:'ごっつんこ！',       k:1.6},
  train:{l:'でんしゃドーン！',   k:2.0},
  cont: {l:'コンテナドーン！',   k:2.0},
  nitro:{l:'ニトロドーン！',     k:NITRO_PAY},
};
/* score = coins earned in the run; rank by score */
const RANK_L = ['S', 'A', 'B', 'C', 'D'];
const ranksOf = ti => TOWNS[ti].ranks.map((min, k) => ({r:RANK_L[k], min})).concat([{r:'D', min:0}]);
const rankOf = (sc, ti) => ranksOf(ti === undefined ? townI : ti).find(r => sc >= r.min);
const RANK_ORDER = {S:5, A:4, B:3, C:2, D:1, '':0};
/* titles: the run's most striking feat wins (ratio >= 1, biggest ratio); base titles are the fallback */
const TITLES = [
  {id:'legend', name:'伝説の逃がし屋', hint:'ボスを4台たおして にげきる',      v:s => s.clear && s.boss >= 4 ? 99 : 0},
  {id:'clean',  name:'無傷の逃がし屋', hint:'ほとんど ぶつからずに にげきる',    v:s => s.clear && s.dmgR < 0.15 ? 50 : 0},
  {id:'boss',   name:'装甲車ハンター', hint:'ボスを2台たおす',                 v:s => s.boss / 2},
  {id:'town',   name:'街のこわし屋',   hint:'一般車を60台まきこむ',            v:s => s.traf / 60},
  {id:'train',  name:'ふみきりの魔王', hint:'電車で追っ手を3台',               v:s => s.ko.train / 3},
  {id:'boom',   name:'爆破職人',       hint:'爆発で追っ手を8台',               v:s => s.ko.boom / 8},
  {id:'wall',   name:'かべドン名人',   hint:'かべで追っ手を8台',               v:s => s.ko.wall / 8},
  {id:'near',   name:'すれすれ職人',   hint:'ニアミス30回',                   v:s => s.near / 30},
  {id:'wrong',  name:'逆走ライダー',   hint:'逆走ですれすれ12回',              v:s => s.nearOpp / 12},
  {id:'spike',  name:'トゲがえし',     hint:'トゲで追っ手を3台',               v:s => s.ko.spike / 3},
  {id:'pinch',  name:'ごっつんこ係',   hint:'はさみうちを2回やりかえす',        v:s => s.ko.pinch / 4},
  {id:'maki',   name:'まきこみ上手',   hint:'追っ手を一般車に15台まきこむ',     v:s => s.ko.maki / 15},
  {id:'ram',    name:'体当たり番長',   hint:'体当たりで追っ手を20台',           v:s => s.ko.hit / 20},
  {id:'nitro',  name:'ニトロの暴れ牛', hint:'ニトロ中に12台はね飛ばす',         v:s => s.ko.nitro / 12},
  {id:'drum',   name:'ドラム缶配達人', hint:'荷台のドラム缶で追っ手を12台',     v:s => s.ko.drum / 12},
  {id:'combo',  name:'コンボの鬼',     hint:'コンボ×5を出す',                  v:s => s.maxCombo >= 9 ? 1.5 : 0},
  {id:'run',    name:'にげきり屋',     hint:'ゴールまで にげきる',              base:true},
  {id:'rookie', name:'まだまだ見習い', hint:'とちゅうでクラッシュする',        base:true},
];
const kmh = pxs => Math.round(pxs / M * 3.6);
/* tuning (11/17 しょーくん「ポイントを購入して、ステータスを振り分ける楽しさをメインに」): each car buys up to PT_MAX points and spreads them
   over four stats of STAT_MAX steps — one stat full plus 2 more, never everything. Points can be moved again any time for free.
   21回目 (しょーくん「1ゲームでフルカスタムまで到達できてしまう」): 3 times the first prices — 33,150 for the first car, about 4〜5 runs of the first town */
const STAT_MAX = 5, PT_MAX = STAT_MAX + 2, PT_PRICES = [1200, 2100, 3300, 4500, 6000, 7200, 8850];
const UPGRADES = [
  {key:'eng',   name:'はやさ',   desc:lv => `+${kmh(16*lv)}km/h`},
  {key:'body',  name:'かたさ',   desc:lv => `+${lv*25}%`},
  {key:'boost', name:'ニトロ',   desc:lv => `たまり +${lv*18}%`},
  {key:'ram',   name:'体当たり', desc:lv => `+${lv*10}%`},
];
const OLD_UP_PRICES = {eng:[150,350,700,1200,1900], body:[150,350,700,1200,1900], boost:[250,700,1500]};

/* ---------- save ---------- */
const SAVE_KEY = 'butto-chase-v1';
const freshTown = () => ({clear:false, rank:'', best:0, mis:[false, false, false]});
const freshSave = () => ({money:0, best:0, car:0, owned:CARS.map((c, i) => i === 0), up:CARS.map(() => ({eng:0, body:0, boost:0, ram:0})), pts:CARS.map(() => 0), upV:2, carV:2, carBest:CARS.map(() => 0), clears:0, hiScore:0, titles:{}, plays:0, tips:{},
  town:0, towns:TOWNS.map(freshTown), daily:{day:'', done:{}}, gold:CARS.map(() => false), carRank:CARS.map(() => ''), se:true, bgm:true, tutDone:false});
let save = freshSave();
function loadSave(){
  let s = null;
  try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch(e){}
  useSave(s);
}
function useSave(s){
  if (!s || typeof s !== 'object') return;
  save = Object.assign(freshSave(), s);
  // a damaged save (cut short, hand-edited) must never stop the game: every field is put back to the type the game expects
  const obj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const num = v => { const n = +v; return Number.isFinite(n) && n > 0 ? n : 0; };
  for (const k of ['money', 'best', 'clears', 'hiScore', 'plays']) save[k] = num(save[k]);
  if (!obj(save.titles)) save.titles = {};
  if (!obj(save.tips)) save.tips = {};
  if (!Array.isArray(save.owned)) save.owned = [];
  if (!Array.isArray(save.carBest)) save.carBest = [];
  // saves from before 11/17 (21回目): the sports car (was 0) and the kei car (was 3) swap places, so each car keeps its own levels, records and marks
  if (s.carV !== 2){
    for (const k of ['owned', 'up', 'pts', 'carBest', 'gold', 'carRank']) if (Array.isArray(save[k])){ const A = save[k].slice(); while (A.length < 4) A.push(undefined); [A[0], A[3]] = [A[3], A[0]]; save[k] = A; }
    if (save.car === 0) save.car = 3; else if (save.car === 3) save.car = 0;
  }
  // older saves: one set of upgrades for every car → each car you already had keeps those levels
  if (!Array.isArray(s.up)){
    const old = {eng:s.eng || 0, body:s.body || 0, boost:s.boost || 0};
    save.up = CARS.map((c, i) => save.owned[i] ? Object.assign({}, old) : {eng:0, body:0, boost:0});
  }
  if (!Array.isArray(save.pts)) save.pts = [];
  const oldUp = s.upV !== 2;   // the stored save is from before 11/17: levels bought per stat (engine 5, body 5, nitro 3)
  for (let i = 0; i < CARS.length; i++){
    if (typeof save.owned[i] !== 'boolean') save.owned[i] = i === 0;
    const U = obj(save.up[i]) ? save.up[i] : {}, lv = k => Math.max(0, Math.floor(num(U[k])));
    let A = {eng:Math.min(STAT_MAX, lv('eng')), body:Math.min(STAT_MAX, lv('body')), boost:Math.min(STAT_MAX, lv('boost')), ram:Math.min(STAT_MAX, lv('ram'))};
    let pts = Math.min(PT_MAX, Math.max(0, Math.floor(num(save.pts[i]))));
    if (oldUp){
      const e = Math.min(5, lv('eng')), b = Math.min(5, lv('body')), n = Math.min(3, lv('boost')), f = 1 + i * 0.25;
      let spent = 0; for (const [k, L] of [['eng', e], ['body', b], ['boost', n]]) for (let q = 0; q < L; q++) spent += Math.round(OLD_UP_PRICES[k][q] * f / 10) * 10;
      pts = Math.min(PT_MAX, e + b + n);
      A = {eng:0, body:0, boost:0, ram:0};   // the points come back unspread (yellow), ready to be spread the new way
      let cost = 0; for (let q = 0; q < pts; q++) cost += ptPrice(q, i);
      if (spent > cost) save.money = num(save.money) + spent - cost;   // coins back for levels the new cap no longer holds
    }
    // the spread never holds more than the points: take from the smallest stat first, so a specialty stays
    while (UPGRADES.reduce((a, it) => a + A[it.key], 0) > pts){ const k = UPGRADES.map(it => it.key).filter(k => A[k] > 0).sort((x, y) => A[x] - A[y])[0]; A[k]--; }
    save.up[i] = A; save.pts[i] = pts;
    save.carBest[i] = num(save.carBest[i]);
  }
  save.upV = 2; save.carV = 2; save.owned[0] = true;   // the first car is always yours
  if (!(Number.isInteger(save.car) && save.car >= 0 && save.car < CARS.length && save.owned[save.car])) save.car = 0;
  delete save.eng; delete save.body; delete save.boost;
  // towns, stars and gold marks arrived in test build 10: a cleared old course opens the harbor town
  if (!Array.isArray(save.towns)) save.towns = [];
  for (let i = 0; i < TOWNS.length; i++){ const T = obj(save.towns[i]) ? save.towns[i] : {};
    save.towns[i] = {clear:T.clear === true, rank:RANK_L.includes(T.rank) ? T.rank : '', best:num(T.best), mis:[0, 1, 2].map(k => Array.isArray(T.mis) && T.mis[k] === true)}; }
  save.towns.length = TOWNS.length;
  if (!Array.isArray(s.towns) && save.clears > 0) save.towns[0].clear = true;
  if (!Array.isArray(s.gold)) save.gold = CARS.map((c, i) => (save.carBest[i] || 0) >= 13000);
  for (let i = 0; i < CARS.length; i++) if (typeof save.gold[i] !== 'boolean') save.gold[i] = false;
  if (!Array.isArray(s.carRank)) save.carRank = CARS.map((c, i) => { const b = save.carBest[i] || 0; return b >= 13000 ? 'S' : b >= 8000 ? 'A' : b >= 4000 ? 'B' : b >= 1500 ? 'C' : b > 0 ? 'D' : ''; });
  for (let i = 0; i < CARS.length; i++) if (!RANK_L.includes(save.carRank[i])) save.carRank[i] = '';
  if (!(Number.isInteger(save.town) && save.town >= 0 && save.town < TOWNS.length)) save.town = 0;
  if (!obj(save.daily) || typeof save.daily.day !== 'string' || !obj(save.daily.done)) save.daily = {day:'', done:{}};
  if (typeof save.se !== 'boolean') save.se = true;
  if (typeof s.tutDone !== 'boolean') save.tutDone = (save.plays || 0) > 0;
  if (typeof save.bgm !== 'boolean') save.bgm = true;
}
const upLv = k => save.up[save.car][k] || 0;  // upgrades belong to the car you ride
function ptPrice(n, ci){ return n < PT_MAX ? Math.round(PT_PRICES[n] * (1 + ci * 0.25) / 10) * 10 : null; }  // the n-th point of car ci (pricier cars, pricier points)
const ptUsed = ci => UPGRADES.reduce((a, it) => a + (save.up[ci][it.key] || 0), 0);
const ramK = () => 1 + 0.1 * upLv('ram');   // 体当たり: how hard your car shoves (mass in collisions)
/* town missions: 3 per town, each pays once (fixed coins). All 3 done = the town's third star */
const TOWN_MIS = [
  [{t:'電車で追っ手を1台', v:s => s.ko.train >= 1, c:600}, {t:'ニアミス15回', v:s => s.near >= 15, c:500}, {t:'ボスを1台たおす', v:s => s.boss >= 1, c:1000}],
  [{t:'コンテナで追っ手を2台', v:s => s.ko.cont >= 2, c:2500}, {t:'かべで追っ手を3台', v:s => s.ko.wall >= 3, c:2000}, {t:'一般車を20台まきこむ', v:s => s.traf >= 20, c:2000}],
  [{t:'凍った道で追っ手を3台', v:s => s.ice >= 3, c:4000}, {t:'逆走すれすれ8回', v:s => s.nearOpp >= 8, c:3000}, {t:'ボスを2台たおす', v:s => s.boss >= 2, c:5000}],
  [{t:'爆発で追っ手を6台', v:s => s.ko.boom + s.ko.drum >= 6, c:6000}, {t:'コンボ×4を出す', v:s => s.maxCombo >= 7, c:6000}, {t:'要塞トレーラーをたおす', v:s => s.final, c:10000}],
];
/* today's missions: 3 a day, picked from the date (the same 3 all day). Fixed coins, nothing left to luck */
const DAILY = [
  {id:'near20',  t:'ニアミス20回',           v:s => s.near >= 20,                c:1500},
  {id:'take15',  t:'追っ手を15台たおす',      v:s => s.takes >= 15,               c:1800},
  {id:'boss1',   t:'ボスを1台たおす',         v:s => s.boss >= 1,                 c:2100},
  {id:'combo3',  t:'コンボ×3を出す',          v:s => s.maxCombo >= 5,             c:1500},
  {id:'traf30',  t:'一般車を30台まきこむ',     v:s => s.traf >= 30,                c:1500},
  {id:'nitro5',  t:'ニトロで5台はね飛ばす',    v:s => s.ko.nitro >= 5,             c:1500},
  {id:'wall4',   t:'かべで追っ手を4台',        v:s => s.ko.wall >= 4,              c:1800},
  {id:'boom4',   t:'爆発で追っ手を4台',        v:s => s.ko.boom + s.ko.drum >= 4,  c:1800},
  {id:'score5k', t:'1回で4,000コイン',        v:s => s.score >= 4000,             c:2100},
  {id:'clear',   t:'どこかの街でにげきる',     v:s => s.clear,                     c:2400},
  {id:'dist3k',  t:'3,000m 走る',             v:s => s.dist >= 3000,              c:1500},
  {id:'spike2',  t:'トゲで追っ手を2台',        v:s => s.ko.spike >= 2,             c:1800},
  {id:'maki6',   t:'まきこみで追っ手を6台',    v:s => s.ko.maki >= 6,              c:1800},
  {id:'wrong6',  t:'逆走すれすれ6回',          v:s => s.nearOpp >= 6,              c:1500},
  {id:'star5',   t:'手配度★5になる',          v:s => s.star >= 5,                 c:1800},
  {id:'train2',  t:'電車で追っ手を2台',        v:s => s.ko.train >= 2,             c:2100},
];
const dayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function todayMis(){
  let h = 2166136261; for (const ch of dayKey()){ h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const idx = DAILY.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--){ h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; const j = h % (i + 1); const tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp; }
  return idx.slice(0, 3).map(i => DAILY[i]);
}
function dailyState(){ const k = dayKey(); if (!save.daily || save.daily.day !== k) save.daily = {day:k, done:{}}; return save.daily; }
const townStars = i => { const T = save.towns[i]; return (T.clear ? 1 : 0) + (RANK_ORDER[T.rank] >= 4 ? 1 : 0) + (T.mis.every(Boolean) ? 1 : 0); };
const townOpen = i => i === 0 || !!save.towns[i - 1].clear;
let shotOn = false;   // App Store screenshot scenes (#shot=… in 10-input-boot) play on a demo save that is never written
function writeSave(){ if (shotOn) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch(e){} }

