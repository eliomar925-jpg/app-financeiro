const ALLOWED=new Set(['entes','dca','rreo','rgf','extrato_entregas']);
const PARAMS=new Set(['an_exercicio','nr_periodo','co_tipo_demonstrativo','no_anexo','co_esfera','co_poder','in_periodicidade','id_ente','offset']);
export default async function handler(req,res){
  const endpoint=String(req.query.endpoint||'entes');
  if(!ALLOWED.has(endpoint))return res.status(400).json({error:'endpoint invalido',allowed:[...ALLOWED]});
  const q=new URLSearchParams();
  for(const [k,v] of Object.entries(req.query)){
    if(PARAMS.has(k)&&v!=null&&String(v)!=='')q.set(k,String(v));
  }
  try{
    const url='https://apidatalake.tesouro.gov.br/ords/siconfi/tt/'+endpoint+(q.toString()?'?'+q.toString():'');
    const r=await fetch(url,{headers:{'user-agent':'nem-direita-nem-esquerda/1.2'}});
    const body=await r.text();
    if(!r.ok)return res.status(r.status).json({error:'Siconfi '+r.status,source:url});
    res.setHeader('Cache-Control','s-maxage=3600, stale-while-revalidate=21600');
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.status(200).send(body);
  }catch(e){res.status(502).json({error:'Siconfi indisponivel',detail:String(e)})}
}