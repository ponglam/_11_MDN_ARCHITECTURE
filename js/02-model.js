/* MDN_ARCHITECTURE · model
   build(): from name + birthday + birth time to line groups, candidate rectangles area[n],
   solids (box / quarter / half / pillar / sphere), open faces, and the tree's year-by-year host.
   lineState(): where each line is in a given year (group drift + different pair speeds).
 */

/* ---------- model ---------- */
function build(){
  const name = document.getElementById('nm').value.trim() || 'Anonymous';
  const seedStr = `${name}|${document.getElementById('bd').value}|${document.getElementById('bt').value}`;
  const R = rngOf(seedStr);
  const seedG = 10 + Math.floor(rngOf(seedStr+'|count')() * 41);
  const roundShare = rngOf(seedStr+'|round')() * 0.2;   // circular solids: 0–20% of this person's solids
  const Ro = rngOf(seedStr+'|open');
  const openShare = 0.12 + Ro()*0.38;                    // open-sided boxes: 12–50% of this person's boxes
  const rim = 0.45 + Ro()*1.35;                          // one rim thickness for every open face of this person
  if(!S.groupsTouched) S.G = seedG;
  const G = S.G;
  const W = 100 * S.aspect, H = 100;
  const gauss = () => { let u=0; while(u===0) u=R(); return Math.sqrt(-2*Math.log(u))*Math.cos(TAU*R()); };

  const mode = R() < 0.5 ? 'Spine' : 'Field';
  const profile = PROFILES[Math.floor(R()*PROFILES.length)];
  const phase = R()*TAU;
  const height = HEIGHTS[Math.floor(R()*HEIGHTS.length)];
  const spine = mode === 'Spine';
  // share of lines that run long, past the canvas edge: anywhere from 0% to 100% per person
  const longFrac = Math.pow(R(), 1.3);
  const runLong = (along) => along*(0.75 + R()*0.7);
  // line weight population: super thin 60%, thin 30%, thick 10%
  const thick = () => { const r = R(); return r < 0.6 ? 0.06 + R()*0.04 : r < 0.9 ? 0.15 + R()*0.07 : 0.42 + R()*0.3; };
  const zOf = (grp) => {
    switch(height){
      case 'Level':    return R()*30;
      case 'Terraces': return Math.floor(R()*5)*26 + R()*3;
      case 'Towers':   return 150*Math.pow(R(),2.4);
      case 'Cascade':  return ((grp.cx/W)*0.55 + (1-grp.cy/H)*0.45)*120 + R()*10;
      default:         return grp.gz + R()*12;   // Drift: clusters floating at their own altitude
    }
  };

  const groups = [], all = [];
  for(let g=0; g<50; g++){
    let cx, cy, w, h;
    if(spine){
      w = 4 + Math.pow(R(),1.4)*Math.min(W*0.3,20); h = 4 + Math.pow(R(),1.4)*16;
      cx = W/2 + gauss()*W*0.12; cy = H/2 + gauss()*H*0.15;
    } else {
      w = 3 + Math.pow(R(),2)*W*0.3; h = 3 + Math.pow(R(),2)*H*0.28;
      cx = W*0.06 + R()*W*0.88; cy = H*0.06 + R()*H*0.88;
    }
    cx = clamp(cx, w/2+3, W-w/2-3); cy = clamp(cy, h/2+3, H-h/2-3);
    const axis = R() < 0.5 ? 'x' : 'y';
    const room = axis==='x' ? Math.min(cx-w/2, W-cx-w/2)-3 : Math.min(cy-h/2, H-cy-h/2)-3;
    const grp = {
      cx, cy, w, h, axis, gz: R()*110,
      A: Math.max(0, Math.min(room*0.85, 2 + R()*12)),
      f: 0.4 + R()*1.4, ph: R()*TAU, rank: R(),
      pV: {a: 0.6+R()*3.4, f: 0.5+R()*2.6, ph: R()*TAU},   // vertical pair speed
      pH: {a: 0.6+R()*3.4, f: 0.5+R()*2.6, ph: R()*TAU},   // horizontal pair speed (different)
      v: [], h: []
    };
    const own = dim => ({a: R()*Math.min(2.5, dim*0.28), f: 0.6+R()*3, ph: R()*TAU});
    const mV = grp.pH.a + 2.5 + 1.2, mH = grp.pV.a + 2.5 + 1.2;
    for(const s of [-1,1]){
      const off = (R()-0.5)*h*0.3;
      const isLong = R() < longFrac;
      const e1 = isLong ? runLong(H) : spine ? 1+Math.pow(R(),2.2)*H*0.42 : 1+Math.pow(R(),2)*H*0.12;
      const e2 = isLong ? runLong(H) : spine ? 1+Math.pow(R(),2.2)*H*0.42 : 1+Math.pow(R(),2)*H*0.12;
      const L = Object.assign({axis:'v', g, core:true, long:isLong, rank:0, base: cx+s*w/2, c: cy+off,
        lo: h/2+mV+Math.abs(off)+e1, hi: h/2+mV+Math.abs(off)+e2, z: zOf(grp), t: thick()}, own(w));
      grp.v.push(L); all.push(L);
    }
    for(const s of [-1,1]){
      const off = (R()-0.5)*w*0.3;
      const e1 = spine ? 1+Math.pow(R(),2.5)*W*0.32 : 1+Math.pow(R(),2)*W*0.12;
      const e2 = spine ? 1+Math.pow(R(),2.5)*W*0.32 : 1+Math.pow(R(),2)*W*0.12;
      const L = Object.assign({axis:'h', g, core:true, rank:0, base: cy+s*h/2, c: cx+off,
        lo: w/2+mH+Math.abs(off)+e1, hi: w/2+mH+Math.abs(off)+e2, z: zOf(grp), t: thick()}, own(h));
      grp.h.push(L); all.push(L);
    }
    const nExtra = Math.floor(R()*R()*6);
    for(let i=0;i<nExtra;i++){
      const ax = R()<0.5 ? 'v':'h';
      const tick = R() < 0.25;
      const reach = spine ? (ax==='v' ? H*0.35 : W*0.3) : (ax==='v' ? H*0.15 : W*0.15);
      const lo = tick ? 0.5+R()*2 : 1+Math.pow(R(),2)*reach, hi = tick ? 0.5+R()*2 : 1+Math.pow(R(),2)*reach;
      const L = Object.assign({axis:ax, g, core:false, rank:R(),
        base: ax==='v' ? cx+(R()-0.5)*w*1.8 : cy+(R()-0.5)*h*1.8,
        c: ax==='v' ? cy+(R()-0.5)*h : cx+(R()-0.5)*w,
        lo, hi, z: zOf(grp), t: thick()}, own(ax==='v'?w:h));
      all.push(L);
    }
    groups.push(grp);
  }

  // seeded reach: some lives send a share (0–100%) of their lines far past the canvas edge
  const Rl = rngOf(seedStr+'|reach');
  const reachFrac = Rl() < 0.35 ? 0 : Math.pow(Rl(), 0.8);
  all.forEach(L => {
    const r = Rl(), e1 = Rl(), e2 = Rl(), side = Rl();
    if(r < reachFrac && (L.lo + L.hi) > 6){
      const ext = (L.axis==='v' ? H : W) * (0.7 + e1*0.9);
      if(side < 0.45) L.lo += ext; else if(side < 0.8) L.hi += ext; else { L.lo += ext*0.8; L.hi += ext*(0.6+e2*0.6); }
      L.long = true;
    }
  });
  // seeded vanishing point for the top view
  const Rv = rngOf(seedStr+'|vp');
  const vx = W/2 + (Rv()-0.5)*W*0.6, vy = H/2 + (Rv()-0.5)*H*0.5;

  const lines = all.filter(L => L.g < G);
  lines.forEach((L,i) => L.id = i);

  // ---- candidate rectangles: two verticals x two horizontals whose 4 intersections exist ----
  const V = lines.filter(L=>L.axis==='v'), Hl = lines.filter(L=>L.axis==='h');
  const inSpan = (L, p) => p >= L.cc - L.lo && p <= L.cc + L.hi;
  const found = new Map();
  for(let t=0; t<=100; t+=12.5){
    lines.forEach(L => lineState(groups, L, t));
    const vs = V.slice().sort((a,b)=>a.pos-b.pos), hs = Hl.slice().sort((a,b)=>a.pos-b.pos);
    for(let i=0;i<vs.length;i++) for(let j=i+1;j<Math.min(i+4,vs.length);j++){
      const a=vs[i], b=vs[j]; if(b.pos-a.pos < 1.2) continue;
      for(let k=0;k<hs.length;k++){
        const c=hs[k];
        if(!inSpan(c,a.pos) || !inSpan(c,b.pos) || !inSpan(a,c.pos) || !inSpan(b,c.pos)) continue;
        for(let l=k+1;l<Math.min(k+4,hs.length);l++){
          const d=hs[l]; if(d.pos-c.pos < 1.2) continue;
          if(!inSpan(d,a.pos) || !inSpan(d,b.pos) || !inSpan(a,d.pos) || !inSpan(b,d.pos)) continue;
          const vk = a.id<b.id ? a.id+'-'+b.id : b.id+'-'+a.id, hk = c.id<d.id ? c.id+'-'+d.id : d.id+'-'+c.id;
          const key = vk+'|'+hk;
          if(!found.has(key)) found.set(key, [a,b,c,d]);
        }
      }
    }
  }
  const pickColor = (r) => { const tot = TONES.reduce((s,c)=>s+c[1],0); let x=r*tot; for(const c of TONES){ if((x-=c[1])<=0) return c[0]; } return TONES[0][0]; };
  const PAIRS = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
  const makeCand = (quad, key, core) => {
    const r = rngOf(seedStr+'|'+key);
    const roll = r();
    let type;
    if(core) type = roll < 0.72 ? 'fill' : 'wire';
    else { const pf = spine ? 0.2 : 0.32, pw = spine ? 0.22 : 0.16; type = roll < pf ? 'fill' : roll < pf+pw ? 'wire' : null; }
    if(!type) return null;
    // depth = z difference of one seeded pair of its four lines; if that pair is extreme, use the closest pair
    let pr = PAIRS[Math.floor(r()*6)];
    if(Math.abs(quad[pr[0]].z - quad[pr[1]].z) > MAX_DEPTH)
      pr = PAIRS.slice().sort((p,q)=>Math.abs(quad[p[0]].z-quad[p[1]].z)-Math.abs(quad[q[0]].z-quad[q[1]].z))[0];
    const z1 = quad[pr[0]].z, z2 = quad[pr[1]].z;
    const cd = { a:quad[0], b:quad[1], c:quad[2], d:quad[3], type, core,
      rank: core ? r()*0.6 : r(), order: r(), color: pickColor(r()),
      zlow: Math.min(z1,z2), depth: clamp(Math.abs(z1-z2), 1.4, MAX_DEPTH), s:0 };
    // solid shape: box, quarter circle (right angle on one corner), half circle (diameter = one side), circle (pillar or sphere)
    const sr = r();
    const rt = (sr - (1 - roundShare)) / Math.max(roundShare, 1e-6);
    cd.shape = type !== 'fill' || sr < 1 - roundShare ? 'box' : rt < 1/3 ? 'quarter' : rt < 2/3 ? 'half' : (r() < 0.5 ? 'cyl' : 'sphere');
    cd.corner = Math.floor(r()*4);
    cd.side = Math.floor(r()*4);
    cd.pdepth = r() < 0.5 ? cd.depth : 1.0 + r()*1.4;   // pillars are thick (full depth) or thin slabs
    /* open faces (boxes only): one empty face (any of the six), two opposite side faces, or two adjacent side faces.
       When two faces are open, neither is the top or the bottom. */
    cd.open = [0,0,0,0,0,0]; cd.openKind = '';
    if(cd.shape === 'box' && r() < openShare){
      const k = r();
      if(k < 0.5){ cd.open[Math.floor(r()*6)] = 1; cd.openKind = 'one'; }
      else if(k < 0.75){ if(r() < 0.5){ cd.open[0] = cd.open[3] = 1; } else { cd.open[1] = cd.open[4] = 1; } cd.openKind = 'opposite'; }
      else { const ax = r() < 0.5 ? 0 : 3, ay = r() < 0.5 ? 1 : 4; cd.open[ax] = cd.open[ay] = 1; cd.openKind = 'adjacent'; }
    }
    return cd;
  };
  const cands = [], coreKeys = new Set();
  groups.slice(0,G).forEach((g,i) => {
    coreKeys.add(g.v[0].id+'-'+g.v[1].id+'|'+g.h[0].id+'-'+g.h[1].id);
    const cd = makeCand([g.v[0],g.v[1],g.h[0],g.h[1]], 'core'+i, true); if(cd) cands.push(cd);
  });
  const cross = [];
  for(const [key, quad] of found){ if(coreKeys.has(key)) continue; const cd = makeCand(quad, key, false); if(cd) cross.push(cd); }
  cross.sort((p,q)=>p.order-q.order);
  cands.push(...cross.slice(0, 9*G));
  cands.forEach((c,i) => { c.eps = (i%97)*0.004; c.ins = 0.03 + (i%7)*0.025; c.zlow += (i%5)*0.02 + 0.01; });

  const zs = lines.map(L=>L.z).sort((a,b)=>a-b);
  const groundZ = (zs[0] || 0) - 0.6;
  const fillsAll = cands.filter(c=>c.type==='fill');
  /* Tree rule: a tree is present in every year of the life. Each year it stands under a floating box that is
     present that year; when that box disappears it walks along the grid (first along x, then along y)
     to the nearest present box, over the four years before the change. */
  const boxFills = fillsAll.filter(c=>c.shape==='box');
  const spanAt = (L, p) => Math.min(p - (L.cc - L.lo), (L.cc + L.hi) - p);
  const simAt = t => {
    const dens = clamp(profile.f(t/100, phase), 0.05, 0.97), gd = 0.12 + 0.88*dens;
    const gsx = groups.map((g,i) => i < G ? clamp((gd - g.rank)/0.07, 0, 1) : 0);
    lines.forEach(L => { lineState(groups, L, t); L.s = gsx[L.g] * (L.core ? 1 : clamp((dens*1.15 - L.rank)/0.1, 0, 1)); });
    boxFills.forEach(c => {
      const {a,b,c:h1,d:h2} = c;
      const m = Math.min(spanAt(a,h1.pos), spanAt(a,h2.pos), spanAt(b,h1.pos), spanAt(b,h2.pos), spanAt(h1,a.pos), spanAt(h1,b.pos), spanAt(h2,a.pos), spanAt(h2,b.pos));
      const valid = clamp(m/1.5,0,1) * clamp((Math.abs(b.pos-a.pos)-0.4)/1,0,1) * clamp((Math.abs(h2.pos-h1.pos)-0.4)/1,0,1);
      c.s = clamp((dens - c.rank)/0.06, 0, 1) * Math.min(a.s, b.s, h1.s, h2.s) * valid;
      c.mx = (a.pos + b.pos)/2; c.my = (h1.pos + h2.pos)/2;
    });
  };
  const hostAt = []; let cur = null, since = 0;
  const Rt = rngOf(seedStr+'|tree');
  const bias = new Map(boxFills.map(c => [c, Rt()*6]));
  const stayMin = 8 + Math.floor(Rt()*8), stayVar = 4 + Math.floor(Rt()*10);   // years under one box before walking on
  let stay = stayMin + Math.floor(Rt()*stayVar);
  for(let y=0; y<=100; y++){
    simAt(y);
    const ok = c => c.s > 0.6 && c.zlow - groundZ >= 8;
    if(!cur || !ok(cur) || y - since >= stay){
      const px = cur ? cur.mx : W/2, py = cur ? cur.my : H/2;
      let best = null, bs = -1e9;
      for(const c of boxFills){
        if(!ok(c) || (c === cur && ok(cur) && y - since >= stay)) continue;
        const sc = Math.min(c.zlow - groundZ, 40) - Math.hypot(c.mx-px, c.my-py)*0.25 + Math.hypot(c.mx-W/2, c.my-H/2)*0.45 + (c.core ? 6 : 0) + bias.get(c);
        if(sc > bs){ bs = sc; best = c; }
      }
      if(best && best !== cur){ cur = best; since = y; stay = stayMin + Math.floor(Rt()*stayVar); }
      else if(!cur) cur = boxFills.slice().sort((p,q)=>q.zlow-p.zlow)[0] || fillsAll[0] || null;
    }
    hostAt.push(cur);
  }
  const treeMoves = [];
  for(let y=1; y<=100; y++) if(hostAt[y] !== hostAt[y-1]) treeMoves.push({ y, from: hostAt[y-1], to: hostAt[y] });
  const zMid = zs[Math.floor(zs.length/2)] || 0, zTop = zs[zs.length-1] || 0;

  return { seedStr, name, W, H, G, seedG, mode, profile, phase, height, groups, lines, cands, zMid, zTop, reachFrac, vx, vy,
    longShare: lines.filter(L=>L.long).length / Math.max(1, lines.length), roundShare, openShare, rim, groundZ, treeStart: hostAt[0], treeMoves,
    fills: cands.filter(c=>c.type==='fill'), wires: cands.filter(c=>c.type==='wire') };
}

function lineState(groups, L, t){
  const g = groups[L.g], tau = t/100*TAU;
  const go = g.A*Math.sin(tau*g.f + g.ph);
  const ox = g.axis==='x' ? go : 0, oy = g.axis==='y' ? go : 0;
  const own = L.a*Math.sin(tau*L.f + L.ph);
  if(L.axis==='v'){ const p=g.pV; L.pos = L.base + ox + p.a*Math.sin(tau*p.f+p.ph) + own; L.cc = L.c + oy; }
  else            { const p=g.pH; L.pos = L.base + oy + p.a*Math.sin(tau*p.f+p.ph) + own; L.cc = L.c + ox; }
}
