/* MDN_ARCHITECTURE · scene
   three.js renderer, lights and shadows, solid materials (shader: flat in top view, lit in 3D,
   open-face rims), the black acacia tree mesh, line/edge buffers and rebuildScene().
 */

/* ---------- three ---------- */
const canvas = document.getElementById('cv');
const frame = document.getElementById('frame');
frame.style.backgroundImage = `url(${makePaper().toDataURL('image/jpeg', 0.9)})`;
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(22, 1, 1, 10000);
camera.up.set(0,0,1);
const controls = new THREE.OrbitControls(camera, canvas);
controls.enabled = false; controls.enableDamping = true; controls.dampingFactor = 0.12;
controls.minDistance = 5; controls.maxDistance = 40000; controls.screenSpacePanning = true;
controls.addEventListener('change', () => { S.dirty = true; });

const boxGeo = new THREE.BoxGeometry(1,1,1);
const lineMat = new THREE.MeshBasicMaterial({color:INK});

/* ---- solid geometries: every solid sits on local z 0..1 so "height within the solid" is just local z ---- */
const cubeGeo = new THREE.BoxGeometry(1,1,1); cubeGeo.translate(0,0,0.5);
const extrude = draw => { const sh = new THREE.Shape(); draw(sh); return new THREE.ExtrudeGeometry(sh, {depth:1, bevelEnabled:false, curveSegments:72}); };
const quarterGeo = extrude(sh => { sh.moveTo(0,0); sh.lineTo(1,0); sh.absarc(0,0,1,0,Math.PI/2,false); sh.lineTo(0,0); });
const halfGeo    = extrude(sh => { sh.moveTo(1,0); sh.absarc(0,0,1,0,Math.PI,false); sh.lineTo(1,0); });
const discGeo    = extrude(sh => { sh.absarc(0,0,1,0,TAU,false); });
const sphereGeo  = new THREE.SphereGeometry(0.5, 48, 32); sphereGeo.translate(0,0,0.5);
[quarterGeo, halfGeo, discGeo].forEach(g => g.computeVertexNormals());

/* ---- light: flat Mondrian colour in the top view; in 3D a sun with cast shadows, sky fill,
        side gradients, edge occlusion and catch-light on boxes, paper grain, haze with altitude ---- */
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
scene.add(new THREE.AmbientLight(0xffffff, 0.36));
const hemi = new THREE.HemisphereLight(0xffffff, 0xd9cfbc, 0.18); hemi.position.set(0,0,1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfffaf0, 0.6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0012; sun.shadow.normalBias = 0.18; sun.shadow.radius = 3;
scene.add(sun, sun.target);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1,1), new THREE.ShadowMaterial({color:0x2a2418, opacity:0}));
ground.receiveShadow = true; scene.add(ground);

const SU = { uShade:{value:0}, uZTop:{value:100}, uPaper:{value:new THREE.Color('#ECE7DA')}, uRim:{value:0.8} };
const OPEN_VERT_DECL = 'attribute vec3 aOpenP; attribute vec3 aOpenN; varying float vOpen; varying vec3 vFaceN;\n';
const OPEN_VERT = `
        vFaceN = normal;
        vOpen = normal.x > 0.5 ? aOpenP.x : normal.x < -0.5 ? aOpenN.x : normal.y > 0.5 ? aOpenP.y :
                normal.y < -0.5 ? aOpenN.y : normal.z > 0.5 ? aOpenP.z : aOpenN.z;`;
const OPEN_FRAG_DECL = 'uniform float uRim; varying float vOpen; varying vec3 vFaceN;\n';
const OPEN_FRAG = `
        if(vOpen > 0.5){
          vec3 od = vec3((0.5-abs(vLocal.x))*vScl.x, (0.5-abs(vLocal.y))*vScl.y, (0.5-abs(vLocal.z-0.5))*vScl.z);
          vec3 an = abs(vFaceN);
          float oe = an.x > 0.5 ? min(od.y,od.z) : (an.y > 0.5 ? min(od.x,od.z) : min(od.x,od.y));
          vec2 ofd = an.x > 0.5 ? vScl.yz : (an.y > 0.5 ? vScl.xz : vScl.xy);
          if(oe > min(uRim, 0.3*min(ofd.x, ofd.y))) discard;
        }`;
function makeSolidMat(boxAO){
  const m = new THREE.MeshStandardMaterial({color:0xffffff, roughness:0.78, metalness:0.0,
    polygonOffset:true, polygonOffsetFactor:1, polygonOffsetUnits:1, side: boxAO ? THREE.DoubleSide : THREE.FrontSide});
  m.customProgramCacheKey = () => boxAO ? 'solid-box' : 'solid-round';
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, SU);
    sh.vertexShader = 'varying vec3 vLocal; varying vec3 vScl; varying vec3 vWP; varying vec3 vObjN;\n' + (boxAO ? OPEN_VERT_DECL : '') +
      sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vLocal = position;
        #ifdef USE_INSTANCING
          vScl = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
          vWP = (modelMatrix * instanceMatrix * vec4(position,1.0)).xyz;
          vObjN = mat3(instanceMatrix) * normal;
        #else
          vScl = vec3(1.0); vWP = (modelMatrix * vec4(position,1.0)).xyz; vObjN = normal;
        #endif${boxAO ? OPEN_VERT : ''}`);
    sh.fragmentShader = `uniform float uShade; uniform float uZTop; uniform vec3 uPaper;
      varying vec3 vLocal; varying vec3 vScl; varying vec3 vWP; varying vec3 vObjN;
      ${boxAO ? OPEN_FRAG_DECL : ''}
      float hsh(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      ` + sh.fragmentShader.replace('void main() {', 'void main() {' + (boxAO ? OPEN_FRAG : '')).replace('#include <dithering_fragment>', `
        vec3 base = diffuseColor.rgb;
        vec3 wn = normalize(vObjN);
        float isTop = step(0.5, wn.z);
        float side = 1.0 - abs(wn.z);
        vec3 flatCol = base * mix(0.82, 1.0, isTop) * (gl_FrontFacing ? 1.0 : 0.7);
        vec3 lit = gl_FragColor.rgb;
        lit *= mix(1.0, mix(0.8, 1.06, smoothstep(0.0, 1.0, clamp(vLocal.z, 0.0, 1.0))), side);
        ${boxAO ? `
        vec3 d3 = vec3((0.5-abs(vLocal.x))*vScl.x, (0.5-abs(vLocal.y))*vScl.y, (0.5-abs(vLocal.z-0.5))*vScl.z);
        vec3 on = normalize(normal);
        float e = abs(wn.x) > 0.5 ? min(d3.y,d3.z) : (abs(wn.y) > 0.5 ? min(d3.x,d3.z) : min(d3.x,d3.y));
        vec2 fd = abs(wn.x) > 0.5 ? vScl.yz : (abs(wn.y) > 0.5 ? vScl.xz : vScl.xy);
        lit *= mix(0.86, 1.0, smoothstep(0.0, min(1.8, 0.25*min(fd.x, fd.y)), e));
        lit += (1.0 - smoothstep(0.0, 0.16, e)) * 0.09 * (1.0 - side*0.4);` : ''}
        if(!gl_FrontFacing) lit *= 0.62;
        lit += (hsh(floor(vWP*6.0)) - 0.5) * 0.03;
        lit = mix(lit, uPaper, clamp(vWP.z / max(uZTop, 1.0), 0.0, 1.0) * 0.12);
        gl_FragColor.rgb = mix(flatCol, lit, uShade);
        #include <dithering_fragment>`);
  };
  return m;
}
const boxMat = makeSolidMat(true), roundMat = makeSolidMat(false);
const boxDepthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
boxDepthMat.onBeforeCompile = sh => {
  sh.uniforms.uRim = SU.uRim;
  sh.vertexShader = 'varying vec3 vLocal; varying vec3 vScl;\n' + OPEN_VERT_DECL +
    sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vLocal = position;
      #ifdef USE_INSTANCING
        vScl = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
      #else
        vScl = vec3(1.0);
      #endif` + OPEN_VERT);
  sh.fragmentShader = 'varying vec3 vLocal; varying vec3 vScl;\n' + OPEN_FRAG_DECL +
    sh.fragmentShader.replace('void main() {', 'void main() {' + OPEN_FRAG);
};
const SHAPES = { box:{geo:cubeGeo, mat:boxMat}, quarter:{geo:quarterGeo, mat:roundMat}, half:{geo:halfGeo, mat:roundMat},
                 cyl:{geo:discGeo, mat:roundMat}, sphere:{geo:sphereGeo, mat:roundMat} };

/* black acacia: decoded from the packed model, Z-up, base at 0, height 1 (width 1.96 x 1.52) */
const treeMesh = (() => {
  const T = window.TREE_DATA;
  const dec = b => Uint8Array.from(atob(b), ch => ch.charCodeAt(0)).buffer;
  const q = new Int16Array(dec(T.p)), pos = new Float32Array(q.length);
  for(let i=0;i<q.length;i++) pos[i] = q[i] / T.s;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(T.i32 ? new Uint32Array(dec(T.i)) : new Uint16Array(dec(T.i)), 1));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({color:0x0e0e0e, roughness:0.95, metalness:0, side:THREE.DoubleSide}));
  m.castShadow = true; m.visible = false; m.frustumCulled = false;
  return m;
})();
scene.add(treeMesh);
const edgeMat = new THREE.LineBasicMaterial({color:INK, transparent:true, opacity:0.42});
const wireMat = new THREE.LineBasicMaterial({color:INK, transparent:true, opacity:0.78});
let lineMesh=null, edgeObj=null, wireObj=null, solidMeshes={};
const m4 = new THREE.Matrix4(), qI = new THREE.Quaternion(), qR = new THREE.Quaternion(), vP = new THREE.Vector3(), vS = new THREE.Vector3();
const Z_AXIS = new THREE.Vector3(0,0,1);

function makeSegs(maxBoxes, mat){
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(Math.max(1,maxBoxes)*120), 3));
  const o = new THREE.LineSegments(geo, mat); o.frustumCulled = false; return o;
}
function rebuildScene(){
  const M = S.model;
  [lineMesh, edgeObj, wireObj, ...Object.values(solidMeshes)].forEach(o => { if(o){ scene.remove(o); if(o.isLineSegments) o.geometry.dispose(); }});
  SU.uZTop.value = Math.max(30, M.zTop + 20);
  SU.uRim.value = M.rim;
  lineMesh = new THREE.InstancedMesh(boxGeo, lineMat, Math.max(1,M.lines.length));
  lineMesh.frustumCulled = false; lineMesh.castShadow = true;
  solidMeshes = {};
  M.buckets = {};
  Object.keys(SHAPES).forEach(k => M.buckets[k] = M.fills.filter(c => c.shape === k));
  const col = new THREE.Color();
  for(const k of Object.keys(SHAPES)){
    const list = M.buckets[k], n = Math.max(1, list.length);
    const mesh = new THREE.InstancedMesh(SHAPES[k].geo, SHAPES[k].mat, n);
    mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
    for(let i=0;i<n;i++){ col.set(list[i] ? list[i].color : '#ffffff'); mesh.setColorAt(i, col); m4.makeScale(0,0,0); mesh.setMatrixAt(i, m4); }
    mesh.instanceColor.needsUpdate = true;
    if(k === 'box'){
      const P = new Float32Array(n*3), N = new Float32Array(n*3);
      list.forEach((c,i) => { for(let a=0;a<3;a++){ P[i*3+a] = c.open[a]; N[i*3+a] = c.open[a+3]; } });
      SHAPES.box.geo.setAttribute('aOpenP', new THREE.InstancedBufferAttribute(P, 3));
      SHAPES.box.geo.setAttribute('aOpenN', new THREE.InstancedBufferAttribute(N, 3));
      mesh.customDepthMaterial = boxDepthMat;
    }
    solidMeshes[k] = mesh; scene.add(mesh);
  }
  edgeObj = makeSegs(M.buckets.box.length, edgeMat);
  wireObj = makeSegs(M.wires.length, wireMat);
  scene.add(lineMesh, edgeObj, wireObj);

  // sun and shadow catcher sized to this composition
  const c = new THREE.Vector3(M.W/2, M.H/2, M.zMid);
  sun.target.position.copy(c);
  sun.position.copy(c).addScaledVector(new THREE.Vector3(0.45,-0.62,1).normalize(), 600);
  const half = Math.max(M.W, M.H)*0.8 + M.zTop*0.5;
  Object.assign(sun.shadow.camera, {left:-half, right:half, top:half, bottom:-half, near:1, far:1400});
  sun.shadow.camera.updateProjectionMatrix();
  ground.position.set(M.W/2, M.H/2, M.groundZ);
  ground.scale.set(M.W*6, M.H*6, 1);
}

// inner outline of each open face, inset by the rim (capped at 30% of the face's short side, as in the shader)
function pushRims(arr, o, open, x0,x1,y0,y1,z0,z1, rim){
  const sq = (a,b,c,d) => { for(const [p,q] of [[a,b],[b,c],[c,d],[d,a]]){ arr[o++]=p[0]; arr[o++]=p[1]; arr[o++]=p[2]; arr[o++]=q[0]; arr[o++]=q[1]; arr[o++]=q[2]; } };
  const W = x1-x0, H = y1-y0, D = z1-z0;
  for(let f=0; f<6; f++){
    if(!open[f]) continue;
    const ax = f % 3, pos = f < 3;
    if(ax === 0){ const b = Math.min(rim, 0.3*Math.min(H,D)), x = pos ? x1 : x0;
      sq([x,y0+b,z0+b],[x,y1-b,z0+b],[x,y1-b,z1-b],[x,y0+b,z1-b]); }
    else if(ax === 1){ const b = Math.min(rim, 0.3*Math.min(W,D)), y = pos ? y1 : y0;
      sq([x0+b,y,z0+b],[x1-b,y,z0+b],[x1-b,y,z1-b],[x0+b,y,z1-b]); }
    else { const b = Math.min(rim, 0.3*Math.min(W,H)), z = pos ? z1 : z0;
      sq([x0+b,y0+b,z],[x1-b,y0+b,z],[x1-b,y1-b,z],[x0+b,y1-b,z]); }
  }
  return o;
}
function pushBox(arr, o, x0,x1,y0,y1,z0,z1){
  const P = [[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
  const E = [0,1,1,2,2,3,3,0,4,5,5,6,6,7,7,4,0,4,1,5,2,6,3,7];
  for(const e of E){ arr[o++]=P[e][0]; arr[o++]=P[e][1]; arr[o++]=P[e][2]; }
  return o;
}
