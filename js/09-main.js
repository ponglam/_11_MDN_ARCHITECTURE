/* MDN_ARCHITECTURE · main loop
   Animation loop and start-up. Loaded last.
 */

let last = performance.now();
function loop(now){
  const dt = Math.min(0.05, (now-last)/1000); last = now;
  if(S.playing){
    S.year = Math.min(100, S.year + dt*5);
    $('year').value = S.year; drawSpark(); S.dirty = true;
    if(S.year >= 100){ S.playing = false; $('play').textContent = 'Play'; }
  }
  if(S.tween){
    const T = S.tween, p = clamp((now - T.t0)/950, 0, 1), e = p<0.5 ? 4*p*p*p : 1-Math.pow(-2*p+2,3)/2;
    applyPose({ target: T.from.target.clone().lerp(T.to.target, e), q: T.from.q.clone().slerp(T.to.q, e),
      zoom: lerp(T.from.zoom, T.to.zoom, e), dist: lerp(T.from.dist, T.to.dist, e), k: lerp(T.from.k, T.to.k, e), gv: lerp(T.from.gv, T.to.gv, e) });
    if(p >= 1){ S.tween = null; T.then && T.then(); }
    S.dirty = true;
  } else if(controls.enabled){
    controls.update();
  }
  if(S.dirty){ update(); project(); renderer.render(scene, camera); writeStats(); S.dirty = false; }
  requestAnimationFrame(loop);
}

layout(); regenerate(true); requestAnimationFrame(loop);
