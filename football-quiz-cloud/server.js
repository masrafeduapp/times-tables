const http=require('http');
const BASE='https://times-tables-sara-v2.onrender.com/football-math-quiz-v2/';
const SYNC='https://eydxburozlqoxuvavuzi.supabase.co/functions/v1/football-quiz-sync';
const PORT=process.env.PORT||10000;

const syncScript=`<script>(function(){
const STORE='mathFootballQuiz_v4';let last='';let ready=false;
function badge(t,e){let b=document.getElementById('cloudSaveBadge');if(!b){b=document.createElement('div');b.id='cloudSaveBadge';b.style.cssText='position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:9999;background:#063d2b;color:#fff;border:2px solid #e8bd45;border-radius:999px;padding:8px 14px;font-weight:800;box-shadow:0 5px 18px #0006';document.body.appendChild(b)}b.textContent=t;b.style.background=e?'#a92635':'#063d2b'}
async function api(method,state){const r=await fetch('/api/state',{method,headers:{'Content-Type':'application/json'},body:method==='POST'?JSON.stringify({state}):undefined,cache:'no-store'});if(!r.ok)throw new Error(String(r.status));return r.json()}
async function boot(){try{const d=await api('GET');const remote=d&&d.state?d.state:null;const localRaw=localStorage.getItem(STORE)||'';let local=null;try{local=localRaw?JSON.parse(localRaw):null}catch{}const localHas=!!(local&&local.questions&&Object.keys(local.questions).length);const remoteHas=!!(remote&&remote.questions&&Object.keys(remote.questions).length);if(remoteHas){localStorage.setItem(STORE,JSON.stringify(remote));last=JSON.stringify(remote);location.reload();return}else if(localHas){await api('POST',local);last=localRaw}else{last=localRaw}ready=true;badge('☁️ متصل بالحفظ السحابي');setTimeout(()=>{const b=document.getElementById('cloudSaveBadge');if(b)b.style.opacity='.72'},1800)}catch(e){ready=true;badge('تعذر الاتصال بالسحابة — سيعمل الحفظ المحلي',true)}setInterval(sync,1200)}
async function sync(){if(!ready)return;const raw=localStorage.getItem(STORE)||'';if(!raw||raw===last)return;badge('☁️ جارٍ الحفظ...');try{const state=JSON.parse(raw);await api('POST',state);last=raw;badge('☁️ محفوظ سحابيًا')}catch(e){badge('تعذر الحفظ السحابي',true)}}
window.addEventListener('storage',sync);window.addEventListener('load',boot);
})();</script>`;

function send(res,status,body,type='text/plain; charset=utf-8'){res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store'});res.end(body)}
const server=http.createServer(async(req,res)=>{
 try{
  if(req.url.startsWith('/api/state')){
   if(req.method==='GET'){
    const r=await fetch(SYNC,{headers:{'Accept':'application/json'}});const txt=await r.text();res.writeHead(r.status,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(txt);
   }
   if(req.method==='POST'){
    let chunks=[],size=0;for await(const c of req){size+=c.length;if(size>15*1024*1024)return send(res,413,JSON.stringify({error:'too large'}),'application/json');chunks.push(c)}
    const body=Buffer.concat(chunks);
    const r=await fetch(SYNC,{method:'POST',headers:{'Content-Type':'application/json'},body});const txt=await r.text();res.writeHead(r.status,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(txt);
   }
   return send(res,405,JSON.stringify({error:'method'}),'application/json');
  }
  if(req.url==='/'||req.url.startsWith('/?')){
   const r=await fetch(BASE,{headers:{'User-Agent':'Mozilla/5.0'}});let html=await r.text();html=html.replace('</body>',syncScript+'</body>');return send(res,200,html,'text/html; charset=utf-8');
  }
  return send(res,404,'Not found');
 }catch(e){return send(res,500,'Server error: '+e.message)}
});
server.listen(PORT,()=>console.log('listening',PORT));
