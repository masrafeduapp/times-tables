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
  return '<script>(function(){const STORE='+JSON.stringify(store)+',SECTION='+JSON.stringify(section)+';let last="",loading=true,saving=false;let b=document.getElementById("cloud");if(!b){b=document.createElement("div");b.id="cloud";b.style.cssText="position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:99999;background:#063d2b;color:white;border:2px solid #e8bd45;border-radius:999px;padding:8px 14px;font-weight:800;box-shadow:0 5px 18px #0006";document.body.appendChild(b)}const set=(t,e=false)=>{b.textContent=t;b.style.background=e?"#a92635":"#063d2b"};async function get(){const r=await fetch("/api/state?section="+SECTION+"&t="+Date.now(),{cache:"no-store"});if(!r.ok)throw Error("GET "+r.status);return r.json()}async function put(raw){for(let i=0;i<3;i++){try{const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),10000);const r=await fetch("/api/state?section="+SECTION,{method:"POST",headers:{"Content-Type":"application/json"},body:raw,cache:"no-store",signal:ctl.signal});clearTimeout(tm);if(r.ok)return true}catch(e){}await new Promise(r=>setTimeout(r,700))}throw Error("save failed")}async function boot(){try{const remote=await get(),rr=remote&&remote.state?JSON.stringify(remote.state):"",lr=localStorage.getItem(STORE)||"",lo=lr?JSON.parse(lr):null;if(rr){if(lr!==rr){localStorage.setItem(STORE,rr);location.reload();return}last=rr}else if(lo){await put(lr);last=lr}else last=lr;set("☁️ متصل بالحفظ السحابي")}catch(e){set("☁️ الحفظ السحابي غير متاح مؤقتًا",true)}loading=false;setInterval(sync,900)}async function sync(){if(loading||saving)return;const raw=localStorage.getItem(STORE)||"";if(!raw||raw===last)return;saving=true;set("☁️ جارٍ الحفظ...");try{await put(raw);last=raw;set("☁️ محفوظ سحابيًا")}catch(e){set("☁️ تعذر الاتصال — سأعيد المحاولة تلقائيًا",true)}finally{saving=false}}boot()})();</script>';
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