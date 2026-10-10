/* MDN_ARCHITECTURE · per-frame update
   update(): moves every line, sizes every solid, walks the tree for the current year, fills the stats.
 */

let stats = {};
function update(){
  const M = S.model, t = S.year, u = t/100;
  const dens = clamp(M.profile.f(u, M.phase), 0.05, 0.97);
  const gd = 0.12 + 0.88*dens;
  const gs = M.groups.map((g,i) => i < M.G ? clamp((gd - g.rank)/0.07, 0, 1) : 0);
  let gVis = 0; gs.forEach(s => { if(s>0.5) gVis++; });

  let lVis = 0;
  M.lines.forEach((L,i) => {
    lineState(M.groups, L, t);
    L.s = gs[L.g] * (L.core ? 1 : clamp((dens*1.15 - L.rank)/0.1, 0, 1));
    if(L.s > 0.5) lVis++;
    const len = (L.lo + L.hi) * L.s, mid = L.cc + (L.hi - L.lo)/2;
    if(L.s <= 0.001) vS.set(0,0,0); else if(L.axis==='v') vS.set(L.t, len, L.t); else vS.set(len, L.t, L.t);
    if(L.axis==='v') vP.set(L.pos, mid, L.z); else vP.set(mid, L.pos, L.z);
    m4.compose(vP, qI, vS); lineMesh.setMatrixAt(i, m4);
  });
  lineMesh.instanceMatrix.needsUpdate = true;

  const span = (L, p) => Math.min(p - (L.cc - L.lo), (L.cc + L.hi) - p);
  let live = 0;
  const evalC = c => {
    const {a,b,c:h1,d:h2} = c;
    const m = Math.min(span(a,h1.pos), span(a,h2.pos), span(b,h1.pos), span(b,h2.pos),
                       span(h1,a.pos), span(h1,b.pos), span(h2,a.pos), span(h2,b.pos));
    const dx = Math.abs(b.pos-a.pos), dy = Math.abs(h2.pos-h1.pos);
    const valid = clamp(m/1.5,0,1) * clamp((dx-0.4)/1,0,1) * clamp((dy-0.4)/1,0,1);
    const ls = Math.min(a.s, b.s, h1.s, h2.s);
    if(valid > 0 && ls > 0.5) live++;
    c.s = clamp((dens - c.rank)/0.06, 0, 1) * ls * valid;
    c.x0 = Math.min(a.pos,b.pos); c.x1 = Math.max(a.pos,b.pos);
    c.y0 = Math.min(h1.pos,h2.pos); c.y1 = Math.max(h1.pos,h2.pos);
    if(c.x1 - c.x0 > 3*c.ins){ c.x0 += c.ins; c.x1 -= c.ins; }
    if(c.y1 - c.y0 > 3*c.ins){ c.y0 += c.ins; c.y1 -= c.ins; }
  };
  let placed = 0, open = 0;
  const ep = edgeObj.geometry.attributes.position.array; let eo = 0;
  const QUARTER = [[0,0,0],[1,0,Math.PI/2],[1,1,Math.PI],[0,1,Math.PI*1.5]];   // corner (x1?, y1?) + rotation
  for(const k of Object.keys(SHAPES)){
    const mesh = solidMeshes[k];
    M.buckets[k].forEach((c,i) => {
      evalC(c);
      const s = c.s;
      let rot = 0;
      if(s <= 0.001){ vS.set(0,0,0); vP.set(0,0,0); }
      else {
        if(s > 0.5) placed++;
        const w = c.x1-c.x0, h = c.y1-c.y0, cx = (c.x0+c.x1)/2, cy = (c.y0+c.y1)/2;
        if(k === 'box'){
          const ww=w*s, hh=h*s, dep=(c.depth+c.eps)*s;
          vS.set(ww,hh,dep); vP.set(cx,cy,c.zlow);
          eo = pushBox(ep, eo, cx-ww/2,cx+ww/2, cy-hh/2,cy+hh/2, c.zlow, c.zlow+dep);
          if(c.openKind) eo = pushRims(ep, eo, c.open, cx-ww/2,cx+ww/2, cy-hh/2,cy+hh/2, c.zlow, c.zlow+dep, M.rim);
        } else if(k === 'quarter'){
          // right angle sits on one intersection corner; radius = the rect's shorter side
          const q = QUARTER[c.corner], r = Math.min(w,h)*s, dep = (c.pdepth+c.eps)*s;
          vS.set(r,r,dep); vP.set(q[0] ? c.x1 : c.x0, q[1] ? c.y1 : c.y0, c.zlow); rot = q[2];
        } else if(k === 'half'){
          // diameter = the distance between one pair of lines, lying on that side of the rect
          const dep = (c.pdepth+c.eps)*s;
          if(c.side === 0){ const r=w/2*s; vS.set(r,r,dep); vP.set(cx, c.y0, c.zlow); rot = 0; }
          else if(c.side === 1){ const r=h/2*s; vS.set(r,r,dep); vP.set(c.x1, cy, c.zlow); rot = Math.PI/2; }
          else if(c.side === 2){ const r=w/2*s; vS.set(r,r,dep); vP.set(cx, c.y1, c.zlow); rot = Math.PI; }
          else { const r=h/2*s; vS.set(r,r,dep); vP.set(c.x0, cy, c.zlow); rot = Math.PI*1.5; }
        } else if(k === 'cyl'){
          const r = Math.min(w,h)/2*s; vS.set(r,r,(c.pdepth+c.eps)*s); vP.set(cx,cy,c.zlow);
        } else {
          const d = Math.min(w,h)*s; vS.set(d,d,d); vP.set(cx,cy,c.zlow);
        }
      }
      qR.setFromAxisAngle(Z_AXIS, rot);
      m4.compose(vP, qR, vS); mesh.setMatrixAt(i, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
  edgeObj.geometry.setDrawRange(0, eo/3); edgeObj.geometry.attributes.position.needsUpdate = true;

  // tree: under its host this year, walking along the grid (x first, then y) when the host changes
  const TRAVEL = 4;
  let from = M.treeStart, to = M.treeStart, p = 1;
  for(const mv of M.treeMoves){ if(t >= mv.y - TRAVEL){ from = mv.from; to = mv.to; p = clamp((t - (mv.y - TRAVEL))/TRAVEL, 0, 1); } else break; }
  if(to && S.k > 0.05){
    [from, to].forEach(c => { if(c && c.x0 === undefined) evalC(c); });
    const fx = (from.x0+from.x1)/2, fy = (from.y0+from.y1)/2, tx = (to.x0+to.x1)/2, ty = (to.y0+to.y1)/2;
    const x = p < 0.5 ? lerp(fx, tx, ss(0,1,p*2)) : tx;
    const y = p < 0.5 ? fy : lerp(fy, ty, ss(0,1,(p-0.5)*2));
    // tree size: at most 30% of the earlier size; each host box sets it between 50% and 100% of that maximum
    const hOf = c => clamp((c.zlow - M.groundZ)*0.95, 22, 70) * 0.3 * (0.5 + 0.5*c.order);
    const sc = lerp(hOf(from), hOf(to), ss(0,1,p)) * ss(0.05, 0.6, S.k);
    const wide = c => (c.x1-c.x0) >= (c.y1-c.y0);
    treeMesh.position.set(x, y, M.groundZ);
    treeMesh.rotation.set(0, 0, lerp(wide(from) ? 0 : Math.PI/2, wide(to) ? 0 : Math.PI/2, ss(0,1,p)));
    treeMesh.scale.setScalar(Math.max(0.01, sc));
    treeMesh.visible = true;
  } else treeMesh.visible = false;

  const wp = wireObj.geometry.attributes.position.array; let wo = 0;
  M.wires.forEach(c => {
    evalC(c);
    const s = c.s; if(s <= 0.001) return;
    if(s > 0.5) open++;
    const cx=(c.x0+c.x1)/2, cy=(c.y0+c.y1)/2, w=(c.x1-c.x0)*s, h=(c.y1-c.y0)*s, dep=c.depth*s;
    wo = pushBox(wp, wo, cx-w/2,cx+w/2, cy-h/2,cy+h/2, c.zlow, c.zlow+dep);
  });
  wireObj.geometry.setDrawRange(0, wo/3); wireObj.geometry.attributes.position.needsUpdate = true;

  stats = {gVis, lVis, live, placed, open, treeMoves: M.treeMoves.length};
}
