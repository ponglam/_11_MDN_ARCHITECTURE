/* MDN_ARCHITECTURE · camera
   The seven views (top, front, right, back, left, under, free 3D), the lens and vanishing-point shift,
   and the eased camera transitions.
 */

/* ---------- camera poses ---------- */
S.k = 0;            // 0 = top view, 1 = free 3D (blends shading and lens shift)
S.lens = 0;
const fovOf = lens => 1.2 + 60.8*Math.pow(lens/100, 1.2);
const baseDist = () => (S.model.H/0.92/2) / Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
const dummy = new THREE.PerspectiveCamera();
function quatFrom(az, el, up){
  dummy.position.set(Math.cos(el)*Math.sin(az), -Math.cos(el)*Math.cos(az), Math.sin(el));
  dummy.up.copy(up); dummy.lookAt(0,0,0); return dummy.quaternion.clone();
}
const TOP_Q = quatFrom(0, Math.PI/2, new THREE.Vector3(0,1,0));
const ISO_Q = quatFrom(0.78, 34*Math.PI/180, new THREE.Vector3(0,0,1));
const UNDER_Q = quatFrom(0, -Math.PI/2, new THREE.Vector3(0,1,0));
const SIDE_AZ = { front:0, right:Math.PI/2, back:Math.PI, left:-Math.PI/2 };
S.gv = 1;           // shadow-on-paper visibility (off when looking up from underground)
function viewPose(v){
  const M = S.model;
  if(v === 'top') return topPose();
  if(v === 'free') return isoPose();
  const zc = (M.groundZ + M.zTop)/2, span = M.zTop - M.groundZ + 14;
  if(v === 'under') return { target:new THREE.Vector3(M.W/2, M.H/2, zc), q:UNDER_Q.clone(), zoom:1, dist:baseDist(), k:1, gv:0 };
  const horiz = (v === 'front' || v === 'back') ? M.W : M.H;
  const zoom = Math.min(M.W/(0.92*horiz), M.H/(0.92*span)) * 0.95;
  return { target:new THREE.Vector3(M.W/2, M.H/2, zc), q:quatFrom(SIDE_AZ[v], 0, new THREE.Vector3(0,0,1)), zoom, dist:baseDist(), k:1, gv:1 };
}
// top view: camera sits straight above the vanishing point; a lens shift re-centres the canvas
function topPose(){ const M=S.model; return { target:new THREE.Vector3(M.vx, M.vy, M.zMid), q:TOP_Q.clone(), zoom:1, dist:baseDist(), k:0, gv:1 }; }
function isoPose(){ const M=S.model; return { target:new THREE.Vector3(M.W/2, M.H/2, M.zMid*0.8), q:ISO_Q.clone(), zoom: 0.9*M.H/(M.H + M.zTop*0.35), dist:baseDist(), k:1, gv:1 }; }
function currentPose(){ return { target: controls.target.clone(), q: camera.quaternion.clone(), zoom: camera.zoom, dist: camera.position.distanceTo(controls.target), k:S.k, gv:S.gv }; }
function applyPose(p){
  camera.quaternion.copy(p.q);
  camera.position.copy(p.target).addScaledVector(new THREE.Vector3(0,0,1).applyQuaternion(p.q), p.dist);
  camera.zoom = p.zoom; S.k = p.k; S.gv = p.gv ?? 1;
  controls.target.copy(p.target);
}
function setFrustum(){ camera.aspect = S.model.W / S.model.H; camera.fov = fovOf(S.lens); }
function project(){
  const M = S.model, d = camera.position.distanceTo(controls.target);
  const Rs = Math.hypot(M.W*3, M.H*3, M.zTop - M.groundZ + 20) + 60;
  camera.near = Math.max(0.5, d - Rs); camera.far = d + Rs;
  camera.updateProjectionMatrix();
  const shift = 1 - S.k;
  if(shift > 0){
    const halfH = d*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/camera.zoom, halfW = halfH*camera.aspect;
    const e = camera.projectionMatrix.elements;
    const tk = S.tile || {x:1, y:1};
    e[8] += shift * (M.W/2 - controls.target.x)/halfW * tk.x;
    e[9] += shift * (M.H/2 - controls.target.y)/halfH * tk.y;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }
  SU.uShade.value = S.k;
  ground.material.opacity = 0.16*S.k*S.gv;
  edgeMat.opacity = lerp(0.42, 0.2, S.k);
}
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function goTo(pose, then){
  controls.enabled = false;
  if(reduce){ applyPose(pose); then && then(); S.dirty = true; return; }
  S.tween = { from: currentPose(), to: pose, t0: performance.now(), then };
}
