/* MDN_ARCHITECTURE · utilities
   Math helpers and the seeded random generator (cyrb128 hash -> sfc32).
   Every random choice in the piece comes from rngOf(seedString), so a person always gets the same life.
 */

const TAU = Math.PI * 2;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const ss = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;

function cyrb128(str){let h1=1779033703,h2=3144134277,h3=1013904242,h4=2773480762;for(let i=0,k;i<str.length;i++){k=str.charCodeAt(i);h1=h2^Math.imul(h1^k,597399067);h2=h3^Math.imul(h2^k,2869860233);h3=h4^Math.imul(h3^k,951274213);h4=h1^Math.imul(h4^k,2716044179);}h1=Math.imul(h3^(h1>>>18),597399067);h2=Math.imul(h4^(h2>>>22),2869860233);h3=Math.imul(h1^(h3>>>17),951274213);h4=Math.imul(h2^(h4>>>19),2716044179);return[(h1^h2^h3^h4)>>>0,(h2^h1)>>>0,(h3^h1)>>>0,(h4^h1)>>>0];}
function sfc32(a,b,c,d){return function(){a>>>=0;b>>>=0;c>>>=0;d>>>=0;let t=(a+b)|0;a=b^b>>>9;b=c+(c<<3)|0;c=(c<<21|c>>>11);d=d+1|0;t=t+d|0;c=c+t|0;return(t>>>0)/4294967296;};}
const rngOf = s => sfc32(...cyrb128(s));

/* Classic Mondrian: five tones on paper */
