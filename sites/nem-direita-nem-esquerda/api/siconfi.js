const ALLOWED=new Set(['entes','dca','rreo','rgf','extrato_entregas']);
const PARAMS=new Set(['an_exercicio','nr_periodo','co_tipo_demonstrativo','no_anexo','co_esfera','co_poder','in_periodicidade','id_ente','offset']);
export default async function handler(req,res){
  const endpoint=String(req.query.endpoint||'entes');
  if(!ALLOWED.has(endpoint))return res.status(400).json({error:'endpoint invalido',allowed:[...ALLOWED]});
  const q=new URLSearchParams();
  for(const [k,v] of Object.entries(req.query)){
    if(k!=='endpoint'&&!PARAMS.has(k))return res.status(400).json({error:'parametro invalido'});
    if(Array.isArray(v)||String(v).length>100||/[<>\x00-\x1f]/.test(String(v)))return res.status(400).json({error:'valor invalido'});
  }
  for(const k of ['an_exercicio','nr_periodo','id_ente','offset'])if(req.query[k]!=null&&!/^\d{1,9}$/.test(String(req.query[k])))return res.status(400).json({error:'parametro numerico invalido'});
  for(const [k,v] of Object.entries(req.query)){
    if(PARAMS.has(k)&&v!=null&&String(v)!=='')q.set(k,String(v));
  }
  try{
    const url='https://apidatalake.tesouro.gov.br/ords/siconfi/tt/'+endpoint+(q.toString()?'?'+q.toString():'');
    const r=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{'user-agent':'nem-direita-nem-esquerda/1.2'}});
    const body=await r.text();
    if(!r.ok)return res.status(r.status).json({error:'Siconfi '+r.status,source:url});
    res.setHeader('Cache-Control','s-maxage=3600, stale-while-revalidate=21600');
    res.setHeader('Content-Type','application/json; charset=utf-8');
    const payload=JSON.parse(body);if(!Array.isArray(payload.items))throw new Error('Resposta invalida');res.status(200).json(payload);
  }catch(e){res.status(502).json({error:'Siconfi indisponivel',detail:String(e)})}
}