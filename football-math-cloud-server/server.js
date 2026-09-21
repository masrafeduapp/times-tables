const http=require('http');
const fs=require('fs');
const path=require('path');
const PORT=process.env.PORT||10000;
const SB=process.env.SUPABASE_URL;
const KEY=process.env.SUPABASE_KEY;
const SOURCE='https://times-tables-sara-v2.onrender.com/football-math-quiz-v2/?cloud=proxy';

function out(res,status,body,type='application/json; charset=utf-8'){
  res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store'});res.end(body);
}
function cleanSection(v){return v==='girls'?'girls':'boys'}
function boardId(section){return section==='girls'?'sara-football-math-girls':'sara-football-math'}
function stateFile(section){return path.join('/tmp','sara-football-math-'+section+'-state.json')}
function readLocalState(section){try{return JSON.parse(fs.readFileSync(stateFile(section),'utf8'))}catch{return null}}
function writeLocalState(section,state){fs.writeFileSync(stateFile(section),JSON.stringify({state,updated_at:new Date().toISOString()}),'utf8')}
async function rest(pathname,options={}){
  if(!SB||!KEY)throw new Error('Supabase env missing');
  const headers={apikey:KEY,Authorization:'Bearer '+KEY,...(options.headers||{})};
  return fetch(SB+'/rest/v1/'+pathname,{...options,headers});
}
async function readSupabase(section){
  try{const r=await rest('football_quiz_state?select=state,updated_at&board_id=eq.'+boardId(section));if(!r.ok)return null;const data=await r.json();return data[0]||null}catch{return null}
}
async function saveSupabase(section,state){
  try{
    let r=await rest('football_quiz_state?board_id=eq.'+boardId(section),{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({state,updated_at:new Date().toISOString()})});
    if(r.ok)return true;
    r=await rest('football_quiz_state',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({board_id:boardId(section),state,updated_at:new Date().toISOString()})});
    return r.ok;
  }catch{return false}
}
function bridge(section){
  const store=section==='girls'?'girlsMathQuiz_v1':'mathFootballQuiz_v4';
  return `<script>(function(){const STORE='+JSON.stringify(store)+',SECTION='+JSON.stringify(section)+';let last="",loading=true,saving=false;async function get(){const r=await fetch("/api/state?section="+SECTION+"&t="+Date.now(),{cache:"no-store"});if(!r.ok)throw Error("GET "+r.status);return r.json()}async function put(raw){for(let i=0;i<4;i++){try{const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),10000);const r=await fetch("/api/state?section="+SECTION,{method:"POST",headers:{"Content-Type":"application/json"},body:raw,cache:"no-store",signal:ctl.signal,keepalive:true});clearTimeout(tm);if(r.ok)return true}catch(e){}await new Promise(r=>setTimeout(r,800))}return false}async function sync(){if(loading||saving)return;const raw=localStorage.getItem(STORE)||"";if(!raw||raw===last)return;saving=true;try{if(await put(raw))last=raw}catch(e){}finally{saving=false}}async function boot(){try{const remote=await get(),rr=remote&&remote.state?JSON.stringify(remote.state):"",lr=localStorage.getItem(STORE)||"";if(rr&&lr!==rr){localStorage.setItem(STORE,rr);location.reload();return}if(!rr&&lr)await put(lr);last=localStorage.getItem(STORE)||""}catch(e){}loading=false;setInterval(sync,1500);window.addEventListener("storage",()=>setTimeout(sync,100));document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")sync()});window.addEventListener("pagehide",sync)}boot();(function(){if(document.getElementById("math-timer"))return;const box=document.createElement("div");box.id="math-timer";box.dir="rtl";box.innerHTML='<div style="font-size:14px;font-weight:900;margin-bottom:5px">⏱️ مؤقت المسابقة</div><div id="mt-display" style="font-size:30px;font-weight:900;letter-spacing:2px;line-height:1.1">05:00</div><div style="display:flex;gap:5px;align-items:center;margin-top:7px"><label style="font-size:11px">دقائق <input id="mt-min" type="number" min="0" max="999" value="5" style="width:55px;padding:5px;border-radius:8px;border:1px solid #ccc;text-align:center"></label><label style="font-size:11px">ثوانٍ <input id="mt-sec" type="number" min="0" max="59" value="0" style="width:55px;padding:5px;border-radius:8px;border:1px solid #ccc;text-align:center"></label></div><div style="display:flex;gap:5px;margin-top:7px"><button id="mt-start" type="button">▶ تشغيل</button><button id="mt-pause" type="button">⏸ إيقاف</button><button id="mt-reset" type="button">↺ إعادة</button></div>';
box.style.cssText="position:fixed;bottom:18px;left:18px;z-index:99998;background:rgba(7,25,20,.97);color:#fff;border:2px solid #f3c657;border-radius:16px;padding:10px 12px;width:210px;box-shadow:0 8px 28px #0007;font-family:Tahoma,Arial;text-align:center";document.body.appendChild(box);const style=document.createElement("style");style.textContent="#math-timer button{flex:1;border:0;border-radius:8px;padding:7px 3px;font-weight:800;cursor:pointer;background:#f3c657;color:#142018}#math-timer button:active{transform:scale(.97)}#math-timer input:focus{outline:2px solid #f3c657}#math-timer.mt-finished{border-color:#ff5b6e;animation:mtPulse .7s infinite alternate}@keyframes mtPulse{from{transform:scale(1)}to{transform:scale(1.03)}}";document.head.appendChild(style);let total=300,remaining=300,running=false,tick=null;let audioCtx=null;function beep(freq,duration,volume=.12){try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==="suspended")audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.frequency.value=freq;o.type="sine";g.gain.setValueAtTime(volume,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration)}catch(e){}}function startSound(){beep(880,.16,.16);setTimeout(()=>beep(1175,.2,.16),130)}function finishSound(){[0,220,440,660].forEach((d,i)=>setTimeout(()=>beep(i%2?740:520,.28,.18),d));setTimeout(()=>beep(1040,.5,.18),900)}function read(){let m=Math.max(0,Math.min(999,parseInt(document.getElementById("mt-min").value)||0)),s=Math.max(0,Math.min(59,parseInt(document.getElementById("mt-sec").value)||0));document.getElementById("mt-min").value=m;document.getElementById("mt-sec").value=s;return m*60+s}function show(){const m=Math.floor(remaining/60),s=remaining%60;document.getElementById("mt-display").textContent=String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")}function stop(){running=false;if(tick){clearInterval(tick);tick=null}}function finish(){stop();remaining=0;show();box.classList.add("mt-finished");document.getElementById("mt-display").textContent="00:00 🔔";finishSound()}document.getElementById("mt-start").onclick=()=>{if(running)return;if(remaining<=0){total=read();remaining=total;box.classList.remove("mt-finished")}if(remaining<=0)return;running=true;box.classList.remove("mt-finished");startSound();tick=setInterval(()=>{remaining--;show();if(remaining<=0)finish()},1000)};document.getElementById("mt-pause").onclick=stop;document.getElementById("mt-reset").onclick=()=>{stop();box.classList.remove("mt-finished");total=read();remaining=total;show()};["mt-min","mt-sec"].forEach(id=>document.getElementById(id).addEventListener("change",()=>{if(!running){box.classList.remove("mt-finished");total=read();remaining=total;show()}}));show()})()})();</script>`;
}

const home=`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>بطولات الرياضيات</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:Tahoma,Arial;background:radial-gradient(circle at top,#174d3e,#071914 55%,#050b09);color:white;padding:24px}.wrap{width:min(100%,980px);text-align:center}.wrap h1{font-size:clamp(34px,6vw,70px);margin:0;color:#f3c657}.sub{color:#d8e8e1;font-size:18px;margin:10px 0 28px}.cards{display:grid;grid-template-columns:1fr 1fr;gap:22px}.card{display:block;text-decoration:none;color:white;border:2px solid #ffffff2c;border-radius:30px;padding:38px 22px;background:linear-gradient(145deg,#ffffff18,#ffffff08);box-shadow:0 22px 55px #0007;transition:.2s}.card:hover{transform:translateY(-5px);border-color:#f3c657}.ico{font-size:78px}.card h2{font-size:32px;margin:10px 0}.card p{color:#dce7e2;line-height:1.8}.boys{background:linear-gradient(145deg,#0b573d,#05291d)}.girls{background:linear-gradient(145deg,#60217e,#281037)}.name{margin-top:30px;color:#f7dfa0;font-weight:900}@media(max-width:700px){.cards{grid-template-columns:1fr}.card{padding:25px 16px}.ico{font-size:58px}}</style></head><body><div class="wrap"><h1>🏆 بطولات الرياضيات</h1><div class="sub">اختاري القسم لبدء المسابقة</div><div class="cards"><a class="card boys" href="/boys"><div class="ico">⚽</div><h2>قسم البنين</h2><p>بطولة كرة القدم الرياضية<br>سالم الدوسري • رونالدو • مبابي</p></a><a class="card girls" href="/girls"><div class="ico">👑</div><h2>قسم البنات</h2><p>بطولة نجمات الرياضيات<br>الألماس • الملكات • النجمات • الإبداع</p></a></div><div class="name">معلمة الرياضيات: أ. سارة حقوي</div></div></body></html>`;

http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,'http://local');
    if(u.pathname==='/health')return out(res,200,'ok','text/plain; charset=utf-8');
    if(u.pathname==='/api/state'&&req.method==='GET'){
      const section=cleanSection(u.searchParams.get('section'));let data=readLocalState(section);
      if(!data){data=await readSupabase(section);if(data&&data.state){try{fs.writeFileSync(stateFile(section),JSON.stringify(data),'utf8')}catch{}}}
      return out(res,200,JSON.stringify(data||{state:null}));
    }
    if(u.pathname==='/api/state'&&req.method==='POST'){
      const section=cleanSection(u.searchParams.get('section'));let raw='';for await(const c of req)raw+=c;let state;try{state=JSON.parse(raw)}catch{return out(res,400,JSON.stringify({error:'json'}))}
      writeLocalState(section,state);saveSupabase(section,state).then(ok=>console.log('supabase_backup',section,ok?'ok':'failed')).catch(()=>{});return out(res,200,JSON.stringify({ok:true,stored:'server',section}));
    }
    if(req.method!=='GET')return out(res,405,'Method not allowed','text/plain; charset=utf-8');
    if(u.pathname==='/'||u.pathname==='/index.html')return out(res,200,home,'text/html; charset=utf-8');
    if(u.pathname==='/girls'||u.pathname==='/girls/'){
      let html=fs.readFileSync(path.join(__dirname,'girls.html'),'utf8');html=html.replace('</body>',bridge('girls')+'</body>');return out(res,200,html,'text/html; charset=utf-8');
    }
    if(u.pathname==='/boys'||u.pathname==='/boys/'){
      const r=await fetch(SOURCE,{cache:'no-store'});let html=await r.text();html=html.replace('</body>',bridge('boys')+'</body>');return out(res,200,html,'text/html; charset=utf-8');
    }
    return out(res,404,'Not found','text/plain; charset=utf-8');
  }catch(e){console.error(e);return out(res,500,'Server error','text/plain; charset=utf-8')}
}).listen(PORT,()=>console.log('running '+PORT));