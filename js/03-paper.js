/* MDN_ARCHITECTURE · paper
   makePaper(w, h): the paper stock, drawn procedurally at any size (screen or export).
 */

/* ---------- paper ---------- */
function makePaper(PW = 1024, PH = 1024){
  const c = document.createElement('canvas'); c.width = PW; c.height = PH;
  const g = c.getContext('2d'), R = rngOf('paper-stock');
  const k = Math.min(PW, PH)/1024, area = PW*PH/(1024*1024);
  g.fillStyle = '#F1EDE3'; g.fillRect(0,0,PW,PH);
  for(let i=0;i<90;i++){
    const x=R()*PW, y=R()*PH, r=(60+R()*260)*k, dark=R()<0.5;
    const gr=g.createRadialGradient(x,y,0,x,y,r);
    gr.addColorStop(0, dark ? 'rgba(140,118,80,0.022)' : 'rgba(255,253,246,0.08)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle=gr; g.fillRect(x-r,y-r,2*r,2*r);
  }
  g.lineCap='round';
  const fk = k;
  for(let i=0;i<2200;i++){
    const x=R()*PW, y=R()*PH, l=(5+R()*26)*fk, a=R()*Math.PI;
    g.strokeStyle = R()<0.7 ? `rgba(115,98,70,${0.03+R()*0.07})` : `rgba(255,255,250,${0.08+R()*0.12})`;
    g.lineWidth = (0.4+R()*0.9)*fk;
    g.beginPath(); g.moveTo(x,y);
    g.quadraticCurveTo(x+Math.cos(a)*l/2+(R()-0.5)*5*fk, y+Math.sin(a)*l/2+(R()-0.5)*5*fk, x+Math.cos(a)*l, y+Math.sin(a)*l);
    g.stroke();
  }
  const img=g.getImageData(0,0,PW,PH), d=img.data;
  for(let i=0;i<d.length;i+=4){ const n=(R()-0.5)*12; d[i]+=n; d[i+1]+=n; d[i+2]+=n*0.9; }
  g.putImageData(img,0,0);
  for(let i=0;i<260;i++){ g.fillStyle=`rgba(70,58,40,${0.12+R()*0.3})`; const s=(0.6+R()*1.4)*Math.max(1,k); g.fillRect(R()*PW,R()*PH,s,s); }
  return c;
}
