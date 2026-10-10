/* MDN_ARCHITECTURE · configuration
   Palette (five tones), density flows, height modes, sample names, constants and the shared state S.
   Edit here to change the look or the rules without touching the engine.
 */

const INK = '#141414';
const TONES = [['#D42A1E',20],['#F5C80A',17],['#1D3F8F',17],['#141414',10],['#F8F6F0',36]];
const PROFILES = [
  {name:'Bloom',      note:'sparse at first, dense later',  f:(u)=>0.10+0.82*ss(0,1,u)},
  {name:'Erode',      note:'dense at first, clearing later', f:(u)=>0.92-0.78*ss(0,1,u)},
  {name:'Tide',       note:'density comes and goes in waves', f:(u,p)=>0.52+0.36*Math.sin(TAU*u*1.6+p)},
  {name:'Late Bloom', note:'quiet for decades, then full',    f:(u)=>0.12+0.80*ss(0.5,0.95,u)},
  {name:'Arc',        note:'fills toward mid-life, then clears', f:(u)=>0.12+0.80*Math.pow(Math.sin(Math.PI*u),1.4)},
  {name:'Early Fire', note:'dense early, then settles',       f:(u)=>0.36+0.56*Math.exp(-Math.pow((u-0.12)/0.2,2))},
];
// density floor: even the sparsest year of a life keeps some solids (sparse never means empty)
PROFILES.forEach(p => { const f0 = p.f; p.f = (u, ph) => 0.24 + 0.76*f0(u, ph); });
const HEIGHTS = ['Level','Terraces','Towers','Cascade','Drift'];
const NAMES = ['Mei Chen','Arjun Rao','Lena Fischer','Tomás Ortega','Yuki Sato','Ines Duarte','Kofi Mensah','Hana Lee','Oskar Nyberg','Lin Wei','Sofia Rossi','Noah Park','Amara Obi','Ruth Klein','Kai Huang','Elif Kaya'];
const MAX_DEPTH = 48;

const S = { year:0, playing:false, view:'top', aspect:0.75, G:null, groupsTouched:false, model:null, dirty:true, tween:null };
