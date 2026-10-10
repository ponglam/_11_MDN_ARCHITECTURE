/* MDN_ARCHITECTURE · interface
   Canvas layout, the density sparkline, the reading panel and every control's event handler.
 */

/* ---------- layout ---------- */
const stage = document.getElementById('stage');
function layout(){
  const narrow = window.innerWidth <= 820;
  const cs = getComputedStyle(stage);
  const availW = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const availH = narrow ? window.innerHeight*0.74 : stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 30;
  let w = availW, h = w / S.aspect;
  if(h > availH){ h = availH; w = h * S.aspect; }
  w = Math.floor(w); h = Math.floor(h);
  frame.style.width = w+'px'; frame.style.height = h+'px';
  renderer.setSize(w, h, false);
  S.dirty = true;
}

/* ---------- UI ---------- */
const $ = id => document.getElementById(id);
const spark = $('spark');
function drawSpark(){
  const M = S.model, dpr = Math.min(window.devicePixelRatio||1,2);
  const w = spark.clientWidth, h = 44;
  spark.width = w*dpr; spark.height = h*dpr;
  const g = spark.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,w,h);
  const y = v => h-4 - v*(h-8);
  const f = u => clamp(M.profile.f(u,M.phase),0.05,0.97);
  g.beginPath(); g.moveTo(0,h);
  for(let i=0;i<=120;i++){ const u=i/120; g.lineTo(u*w, y(f(u))); }
  g.lineTo(w,h); g.closePath(); g.fillStyle='rgba(20,20,20,.08)'; g.fill();
  g.beginPath();
  for(let i=0;i<=120;i++){ const u=i/120, yy=y(f(u)); i?g.lineTo(u*w,yy):g.moveTo(0,yy); }
  g.strokeStyle=INK; g.lineWidth=1.25; g.stroke();
  const x = S.year/100*w;
  g.strokeStyle='rgba(20,20,20,.35)'; g.lineWidth=1; g.beginPath(); g.moveTo(x,0); g.lineTo(x,h); g.stroke();
  g.fillStyle='#D42A1E'; g.fillRect(x-3.5, y(f(S.year/100))-3.5, 7, 7);
}
function writeStats(){
  const M = S.model;
  $('yr').textContent = Math.floor(S.year);
  $('sComp').textContent = M.mode;
  $('sFlow').textContent = M.profile.name;
  $('sHgt').textContent = M.height;
  $('sLong').textContent = `${Math.round(M.longShare*100)}%`;
  $('sVp').textContent = `x ${Math.round(M.vx/M.W*100)}% · y ${Math.round(100 - M.vy/M.H*100)}%`;
  $('lensv').textContent = S.lens < 4 ? 'flat' : `${fovOf(S.lens).toFixed(0)}°`;
  $('sGrp').textContent = `${stats.gVis} / ${M.G}`;
  $('sLin').textContent = `${stats.lVis} / ${M.lines.length}`;
  $('sCand').textContent = `${stats.live} live · ${M.cands.length} kept`;
  $('sBox').textContent = stats.placed;
  $('sTree').textContent = `${stats.treeMoves} in 100 years`;
  $('sRound').textContent = `${Math.round(M.roundShare*100)}%`;
  { const bx = M.buckets ? M.buckets.box : [], op = bx.filter(c => c.openKind).length;
    $('sOpen').textContent = `${op} / ${bx.length} · rim ${M.rim.toFixed(2)}`; }
  $('sWire').textContent = stats.open;
  $('caption').textContent = `${M.name} · ${$('bd').value || '—'} · year ${Math.floor(S.year)} · ${S.view==='free'?'free 3d':S.view} view`;
}
function regenerate(resetCam){
  S.model = build();
  $('groups').value = S.G; $('gv').textContent = S.G;
  $('gseed').hidden = !S.groupsTouched || S.G === S.model.seedG;
  $('flow').textContent = `${S.model.profile.name}: ${S.model.profile.note}`;
  rebuildScene(); setFrustum(); drawSpark();
  if(resetCam){
    if(S.view==='free') goTo(isoPose(), () => { controls.enabled = true; });
    else { controls.enabled = false; applyPose(viewPose(S.view)); }
  }
  S.dirty = true;
}

function resetToFlatTop(){
  S.tween = null; controls.enabled = false;
  S.view = 'top';
  [...$('view').children].forEach(x => x.setAttribute('aria-pressed', x.dataset.v === 'top'));
  frame.classList.remove('free'); $('resetView').hidden = true;
  S.lens = 0; $('lens').value = 0;
}
$('nm').addEventListener('input', () => { S.groupsTouched = false; resetToFlatTop(); regenerate(true); });
$('bd').addEventListener('change', () => { S.groupsTouched = false; resetToFlatTop(); regenerate(true); });
$('bt').addEventListener('change', () => { S.groupsTouched = false; resetToFlatTop(); regenerate(true); });
$('rnd').addEventListener('click', () => {
  const r = Math.random;
  $('nm').value = NAMES[Math.floor(r()*NAMES.length)];
  const y = 1940 + Math.floor(r()*80), m = 1+Math.floor(r()*12), d = 1+Math.floor(r()*28);
  $('bd').value = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  $('bt').value = `${String(Math.floor(r()*24)).padStart(2,'0')}:${String(Math.floor(r()*60)).padStart(2,'0')}`;
  S.groupsTouched = false; S.year = 0; $('year').value = 0; resetToFlatTop(); regenerate(true);
});
$('year').addEventListener('input', e => { S.year = +e.target.value; S.dirty = true; drawSpark(); });
$('play').addEventListener('click', () => {
  S.playing = !S.playing;
  if(S.playing && S.year >= 100){ S.year = 0; }
  $('play').textContent = S.playing ? 'Pause' : 'Play';
});
$('groups').addEventListener('input', e => { S.G = +e.target.value; S.groupsTouched = true; regenerate(false); });
$('gseed').addEventListener('click', () => { S.groupsTouched = false; regenerate(false); });
$('view').addEventListener('click', e => {
  const b = e.target.closest('button'); if(!b || b.dataset.v === S.view) return;
  S.view = b.dataset.v;
  [...$('view').children].forEach(x => x.setAttribute('aria-pressed', x===b));
  const free = S.view === 'free';
  frame.classList.toggle('free', free);
  $('resetView').hidden = !free;
  goTo(viewPose(S.view), free ? () => { controls.enabled = true; } : null);
});
$('lens').addEventListener('input', e => {
  const oldBase = baseDist();
  S.lens = +e.target.value; camera.fov = fovOf(S.lens);
  const ratio = baseDist() / oldBase;
  if(S.tween){ S.tween.to.dist *= ratio; S.tween.from.dist *= ratio; }
  const dir = camera.position.clone().sub(controls.target);
  camera.position.copy(controls.target).addScaledVector(dir, ratio);
  S.dirty = true;
});
$('resetView').addEventListener('click', () => goTo(isoPose(), () => { controls.enabled = true; }));
$('fmt').addEventListener('click', e => {
  const b = e.target.closest('button'); if(!b) return;
  S.aspect = +b.dataset.f;
  [...$('fmt').children].forEach(x => x.setAttribute('aria-pressed', x===b));
  layout(); regenerate(true);
});
window.addEventListener('resize', () => { layout(); drawSpark(); });
