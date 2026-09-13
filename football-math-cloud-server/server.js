const http=require('http');
const PORT=process.env.PORT||10000;
const SB=process.env.SUPABASE_URL;
const KEY=process.env.SUPABASE_KEY;
const BOARD='sara-football-math';
const SOURCE='https://times-tables-sara-v2.onrender.com/football-math-quiz-v2/?cloud=proxy';

function out(res,status,body,type='application/json; charset=utf-8'){
  res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store'});res.end(body);
}
async function rest(path,options={}){
  const headers={apikey:KEY,Authorization:'Bearer '+KEY,...(options.headers||{})};
  return fetch(SB+'/rest/v1/'+path,{...options,headers});
}
const bridge=`<script>(function(){const STORE='mathFootballQuiz_v4';let last='';let loading=true;const b=document.createElement('div');b.style.cssText='position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:99999;background:#063d2b;color:white;border:2px solid #e8bd45;border-radius:999px;padding:8px 14px;font-weight:800;box-shadow:0 5px 18px #0006';b.textContent='☁️ جارٍ الاتصال...';document.body.appendChild(b);const set=(t,e=false)=>{b.textContent=t;b.style.background=e?'#a92635':'#063d2b'};async function get(){const r=await fetch('/api/state',{cache:'no-store'});if(!r.ok)throw Error(r.status);return r.json()}async function put(raw){const r=await fetch('/api/state',{method:'POST',headers:{'Content-Type':'application/json'},body:raw});if(!r.ok)throw Error(r.status)}async function boot(){try{const remote=await get();const rr=remote&&remote.state?JSON.stringify(remote.state):'';const lr=localStorage.getItem(STORE)||'';const lo=lr?JSON.parse(lr):null;const rh=!!(remote&&remote.state&&remote.state.questions&&Object.keys(remote.state.questions).length);const lh=!!(lo&&lo.questions&&Object.keys(lo.questions).length);if(rh){if(lr!==rr){localStorage.setItem(STORE,rr);location.reload();return}last=rr}else if(lh){await put(lr);last=lr}else last=lr;set('☁️ متصل بالحفظ السحابي')}catch(e){set('تعذر الاتصال بالسحابة — الحفظ محلي',true)}loading=false;setInterval(sync,900)}async function sync(){if(loading)return;const raw=localStorage.getItem(STORE)||'';if(!raw||raw===last)return;set('☁️ جارٍ الحفظ...');try{await put(raw);last=raw;set('☁️ محفوظ سحابيًا')}catch(e){set('تعذر الحفظ السحابي',true)}}boot()})();</script>`;

http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,'http://local');
    if(u.pathname==='/health')return out(res,200,'ok','text/plain; charset=utf-8');
    if(u.pathname==='/api/state'&&req.method==='GET'){
      const r=await rest('football_quiz_state?select=state,updated_at&board_id=eq.'+BOARD);
      if(!r.ok)return out(res,r.status,JSON.stringify({error:'read'}));
      const data=await r.json();return out(res,200,JSON.stringify(data[0]||{state:null}));
    }
    if(u.pathname==='/api/state'&&req.method==='POST'){
      let raw='';for await(const c of req)raw+=c;let state;try{state=JSON.parse(raw)}catch{return out(res,400,JSON.stringify({error:'json'}))}
      const r=await rest('football_quiz_state?board_id=eq.'+BOARD,{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({state,updated_at:new Date().toISOString()})});
      if(!r.ok)return out(res,r.status,JSON.stringify({error:await r.text()}));
      return out(res,200,JSON.stringify({ok:true}));
    }
    if(req.method!=='GET')return out(res,405,'Method not allowed','text/plain; charset=utf-8');
    const r=await fetch(SOURCE,{cache:'no-store'});let html=await r.text();html=html.replace('</body>',bridge+'</body>');return out(res,200,html,'text/html; charset=utf-8');
  }catch(e){return out(res,500,'Server error','text/plain; charset=utf-8')}
}).listen(PORT,()=>console.log('running '+PORT));