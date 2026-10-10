/* MDN_ARCHITECTURE · save image
   2K / 4K / 8K PNG export, rendered in 1024 px tiles so no GPU size limit can crop the frame.
 */

/* ---------- save image ---------- */
const dlReady = (window.claude && typeof window.claude.use === 'function')
  ? window.claude.use('downloads').catch(() => null) : Promise.resolve(null);
function grainTile(){
  const n = 256, c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d'), img = g.createImageData(n, n), R = rngOf('grain');
  for(let i=0;i<img.data.length;i+=4){ const v = R(); img.data[i]=img.data[i+1]=img.data[i+2]=0; img.data[i+3]=Math.round(v*v*150); }
  g.putImageData(img, 0, 0); return c;
}
let exporting = false;
async function exportImage(hpx){
  if(exporting) return;
  const M = S.model, wpx = Math.round(hpx * S.aspect), status = $('expStatus');
  const btns = [...$('exp').children];
  exporting = true; btns.forEach(b => b.disabled = true);
  status.textContent = `Rendering ${wpx} × ${hpx} px…`;
  await new Promise(r => setTimeout(r, 30));
  const prevPR = renderer.getPixelRatio(), prevSize = renderer.getSize(new THREE.Vector2());
  const setShadow = n => { sun.shadow.mapSize.set(n, n); if(sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map = null; } };
  let out;
  try{
    if(hpx >= 4096) setShadow(4096);
    out = document.createElement('canvas'); out.width = wpx; out.height = hpx;
    const g = out.getContext('2d');
    g.drawImage(makePaper(wpx, hpx), 0, 0);
    const T = 1024;
    renderer.setPixelRatio(1);
    update();
    for(let ty = 0; ty < hpx; ty += T){
      for(let tx = 0; tx < wpx; tx += T){
        const tw = Math.min(T, wpx - tx), th = Math.min(T, hpx - ty);
        renderer.setSize(tw, th, false);
        camera.setViewOffset(wpx, hpx, tx, ty, tw, th);
        S.tile = { x: wpx / tw, y: hpx / th };
        project(); renderer.render(scene, camera);
        g.drawImage(renderer.domElement, 0, 0, tw, th, tx, ty, tw, th);
      }
      status.textContent = `Rendering ${wpx} × ${hpx} px… ${Math.min(100, Math.round((ty + T) / hpx * 100))}%`;
      await new Promise(r => setTimeout(r, 0));
    }
    camera.clearViewOffset(); S.tile = null;
    const pat = g.createPattern(grainTile(), 'repeat');
    const f = Math.max(1, hpx / frame.clientHeight * 0.6);
    if(pat.setTransform) pat.setTransform(new DOMMatrix().scale(f));
    g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.14; g.fillStyle = pat; g.fillRect(0, 0, wpx, hpx);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  } catch(err){
    status.textContent = `Rendering failed at this size (${err.message || 'out of memory'}). Try a smaller size.`;
  } finally {
    if(hpx >= 4096) setShadow(2048);
    camera.clearViewOffset(); S.tile = null;
    renderer.setPixelRatio(prevPR); renderer.setSize(prevSize.x, prevSize.y, false);
    S.dirty = true;
  }
  if(out){
    status.textContent = 'Encoding PNG…';
    const blob = await new Promise(r => out.toBlob(r, 'image/png'));
    const slug = M.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'life';
    const filename = `life-grid_${slug}_y${Math.floor(S.year)}_${S.view}_${hpx}h.png`;
    const dl = await dlReady;
    if(!blob){ status.textContent = 'The image was too large to encode on this device. Try a smaller size.'; }
    else if(dl){
      try{ await dl.save({ filename, data: blob }); status.textContent = `Saved ${filename}`; }
      catch(e){ status.textContent = e && e.code === 'declined' ? 'Save cancelled.' : `Couldn't save here (${e && e.code || 'unavailable'}). Open the HTML file in Chrome to save.`; }
    } else {
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      status.textContent = `Saved ${filename} (${wpx} × ${hpx} px).`;
    }
  }
  exporting = false; btns.forEach(b => b.disabled = false);
}
$('exp').addEventListener('click', e => { const b = e.target.closest('button'); if(b) exportImage(+b.dataset.h); });
